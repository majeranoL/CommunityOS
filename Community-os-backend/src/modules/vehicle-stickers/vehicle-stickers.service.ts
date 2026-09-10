import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  FinanceCategory,
  NotificationType,
  Prisma,
  StickerRequestStatus,
  StickerStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FeaturesService } from '../features/features.service';
import {
  NotificationsService,
  NotificationEmailVariant,
} from '../notifications/notifications.service';

import { CreateStickerDto } from './dto/create-sticker.dto';
import { UpdateStickerDto } from './dto/update-sticker.dto';
import { VerifyStickerDto } from './dto/verify-sticker.dto';
import { StickerQueryDto } from './dto/sticker-query.dto';
import { RequestStickerDto } from './dto/request-sticker.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { UpdateStickerSettingsDto } from './dto/update-sticker-settings.dto';

import { VEHICLE_STICKERS_FEATURE } from '../features/feature.constants';

const STICKER_CHARGE_CODE = 'vehicle-sticker';
const STICKER_CHARGE_NAME = 'Vehicle Sticker / Gate Pass Fee';
const VALIDITY_DAYS = 365;

const SEQUENCE_CONFIGS = {
  'vehicle-sticker': { prefix: 'STK', digits: 6 },
  'sticker-request': { prefix: 'SR', digits: 6 },
} as const;

type SequenceKey = keyof typeof SEQUENCE_CONFIGS;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class VehicleStickersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly requestInclude = {
    vehicle: {
      select: {
        id: true,
        plateNumber: true,
        make: true,
        model: true,
        color: true,
        residentId: true,
      },
    },
    requestedBy: {
      select: { id: true, firstName: true, lastName: true },
    },
    approvedBy: {
      select: { id: true, firstName: true, lastName: true },
    },
    assessment: {
      select: {
        id: true,
        assessmentNumber: true,
        amount: true,
        status: true,
        dueDate: true,
      },
    },
    stickers: {
      where: { deletedAt: null },
      orderBy: { stickerNumber: 'asc' },
      select: {
        id: true,
        stickerNumber: true,
        status: true,
        issueDate: true,
        expirationDate: true,
      },
    },
  } satisfies Prisma.StickerRequestInclude;

  // ==========================================
  // Permissions + settings helpers
  // ==========================================

  private getPermissionCodes(user: any): string[] {
    const codes: string[] = [];

    for (const userRole of user?.roles ?? []) {
      for (const rp of userRole.role?.permissions ?? []) {
        const code = rp.permission?.code as string;
        if (code) codes.push(code);
      }
    }

    return [...new Set(codes)];
  }

  private isOfficer(user: any): boolean {
    return this.getPermissionCodes(user).includes('sticker.verify');
  }

  private async getStickerSettings(communityId: string) {
    const keys = [
      'stickerCycleEnabled',
      'stickerCycleStart',
      'stickerCycleEnd',
      'stickerMaxQuantity',
    ];

    const rows = await this.prisma.setting.findMany({
      where: { communityId, key: { in: keys } },
      select: { key: true, value: true },
    });

    const values = new Map(rows.map((row) => [row.key, row.value]));

    const rawMax = Number(values.get('stickerMaxQuantity') ?? 1);
    const maxQuantity =
      Number.isFinite(rawMax) && rawMax >= 1 ? Math.floor(rawMax) : 1;

    return {
      cycleEnabled:
        values.get('stickerCycleEnabled') === true ||
        values.get('stickerCycleEnabled') === 'true',
      cycleStart:
        typeof values.get('stickerCycleStart') === 'string'
          ? (values.get('stickerCycleStart') as string)
          : null,
      cycleEnd:
        typeof values.get('stickerCycleEnd') === 'string'
          ? (values.get('stickerCycleEnd') as string)
          : null,
      maxQuantity,
    };
  }

  private parseMonthDay(
    value: string | null,
  ): { month: number; day: number } | null {
    if (!value) return null;

    const match = /^(\d{1,2})-(\d{1,2})$/.exec(value);
    if (!match) return null;

    const month = Number(match[1]);
    const day = Number(match[2]);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return { month, day };
  }

  private cycleStart(
    settings: { cycleEnabled: boolean; cycleStart: string | null },
    date: Date,
  ): Date | null {
    const md = this.parseMonthDay(settings.cycleStart);
    if (!settings.cycleEnabled || !md) return null;

    const year = date.getFullYear();
    const start = new Date(year, md.month - 1, md.day, 0, 0, 0, 0);

    if (start > date) {
      return new Date(year - 1, md.month - 1, md.day, 0, 0, 0, 0);
    }

    return start;
  }

  private cycleExpiration(
    settings: { cycleEnabled: boolean; cycleEnd: string | null },
    date: Date,
  ): Date {
    const md = this.parseMonthDay(settings.cycleEnd);
    if (!settings.cycleEnabled || !md) {
      return addDays(new Date(date), VALIDITY_DAYS);
    }

    const year = date.getFullYear();
    const end = new Date(year, md.month - 1, md.day, 23, 59, 59, 999);

    if (end < date) {
      return new Date(year + 1, md.month - 1, md.day, 23, 59, 59, 999);
    }

    return end;
  }

  // ==========================================
  // Sticker Request Options (fee + cycle preview)
  // ==========================================

  async options(communityId: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const chargeType = await this.prisma.chargeType.findFirst({
      where: { communityId, code: STICKER_CHARGE_CODE, deletedAt: null },
      select: { amount: true },
    });

    const price = chargeType?.amount?.toNumber() ?? 0;

    const settings = await this.getStickerSettings(communityId);
    const now = new Date();

    return {
      success: true,
      message: 'Sticker options retrieved.',
      data: {
        price,
        validityDays: VALIDITY_DAYS,
        maxQuantity: settings.maxQuantity,
        quantityEnabled: settings.maxQuantity >= 2,
        cycle: {
          enabled: settings.cycleEnabled,
          start: settings.cycleStart,
          end: settings.cycleEnd,
          activeFrom: this.cycleStart(settings, now)?.toISOString() ?? null,
          activeExpiration: this.cycleExpiration(settings, now).toISOString(),
        },
      },
    };
  }

  // ==========================================
  // Request Sticker (resident self-service)
  // ==========================================

  async request(communityId: string, user: any, dto: RequestStickerDto) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, communityId, deletedAt: null },
      include: { resident: { select: { id: true } } },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    if (vehicle.residentId !== user?.resident?.id) {
      throw new ForbiddenException(
        'You can only request stickers for your own vehicles.',
      );
    }

    const settings = await this.getStickerSettings(communityId);
    const quantity = dto.quantity ?? 1;

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new BadRequestException('Quantity must be between 1 and 100.');
    }

    if (settings.maxQuantity < 2 && quantity > 1) {
      throw new BadRequestException(
        'Multiple stickers are not allowed in this community.',
      );
    }

    const requestedStickerNumber = dto.stickerNumber?.trim();

    if (requestedStickerNumber) {
      const taken = await this.prisma.vehicleSticker.findFirst({
        where: { communityId, stickerNumber: requestedStickerNumber },
        select: { id: true },
      });

      if (taken) {
        throw new ConflictException(
          'That sticker number is already taken. Leave it blank to have an officer assign one.',
        );
      }
    }

    const pendingRequest = await this.prisma.stickerRequest.findFirst({
      where: {
        communityId,
        vehicleId: dto.vehicleId,
        deletedAt: null,
        status: StickerRequestStatus.PENDING,
      },
    });

    if (pendingRequest) {
      throw new ConflictException(
        'A sticker request is already pending for this vehicle.',
      );
    }

    const chargeType = await this.prisma.chargeType.findFirst({
      where: { communityId, code: STICKER_CHARGE_CODE, deletedAt: null },
      select: { amount: true },
    });

    const unitPrice = chargeType?.amount?.toNumber() ?? 0;

    const request = await this.prisma.$transaction(async (tx) => {
      const requestNumber = (
        await this.allocateNumbers(tx, communityId, 'sticker-request', 1)
      )[0];

      return tx.stickerRequest.create({
        data: {
          communityId,
          vehicleId: dto.vehicleId,
          requestNumber,
          quantity,
          feeTotal: new Prisma.Decimal(unitPrice * quantity),
          notes: dto.notes?.trim(),
          requestedStickerNumber,
          requestedById: user.id,
        },
        include: this.requestInclude,
      });
    });

    const officerIds = await this.notificationsService.userIdsWithPermission(
      communityId,
      'sticker.verify',
    );

    await this.notificationsService.notifyMany(
      communityId,
      officerIds,
      NotificationType.VEHICLE_STICKER,
      'New sticker request',
      `Plate ${vehicle.plateNumber} is requesting ${quantity} vehicle sticker${quantity > 1 ? 's' : ''}.`,
      `/stickers/${request.id}`,
    );

    return {
      success: true,
      message: 'Sticker request submitted. You will be notified once reviewed.',
      data: request,
    };
  }

  // ==========================================
  // Get All Sticker Requests
  // ==========================================

  async requests(communityId: string, user: any, query: RequestQueryDto) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const {
      page = 1,
      limit = 10,
      search,
      status,
      vehicleId,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const isOfficer = this.isOfficer(user);

    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    if (status) {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const allowedSorts = ['requestNumber', 'createdAt', 'updatedAt'];
    const orderBy = {
      [allowedSorts.includes(sortBy) ? sortBy : 'createdAt']: order,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stickerRequest.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: this.requestInclude,
      }),
      this.prisma.stickerRequest.count({ where }),
    ]);

    return {
      success: true,
      message: 'Sticker requests retrieved successfully.',
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ==========================================
  // Get One Sticker Request
  // ==========================================

  async requestFindOne(communityId: string, user: any, id: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const isOfficer = this.isOfficer(user);

    const where: any = {
      id,
      communityId,
      deletedAt: null,
    };

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    const request = await this.prisma.stickerRequest.findFirst({
      where,
      include: this.requestInclude,
    });

    if (!request) {
      throw new NotFoundException('Sticker request not found.');
    }

    return {
      success: true,
      message: 'Sticker request retrieved successfully.',
      data: request,
    };
  }

  // ==========================================
  // Delete / Cancel Sticker Request
  // ==========================================

  async requestDelete(communityId: string, user: any, id: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const isOfficer = this.isOfficer(user);

    const where: any = {
      id,
      communityId,
      deletedAt: null,
    };

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    const request = await this.prisma.stickerRequest.findFirst({ where });

    if (!request) {
      throw new NotFoundException('Sticker request not found.');
    }

    if (request.status === StickerRequestStatus.APPROVED) {
      throw new BadRequestException('An approved request cannot be cancelled.');
    }

    await this.prisma.stickerRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Sticker request cancelled.',
      data: null,
    };
  }

  // ==========================================
  // Verify Sticker Request (approve issues stickers)
  // ==========================================

  async requestVerify(
    communityId: string,
    user: any,
    id: string,
    dto: VerifyStickerDto,
  ) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const request = await this.prisma.stickerRequest.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            residentId: true,
            resident: {
              select: {
                id: true,
                householdId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Sticker request not found.');
    }

    if (request.status !== StickerRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending sticker requests can be verified.',
      );
    }

    if (dto.approved) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const issueDate = new Date();
        const settings = await this.getStickerSettings(communityId);
        const expirationDate = this.cycleExpiration(settings, issueDate);

        const numbers = await this.resolveStickerNumbers(tx, communityId, {
          count: request.quantity,
          requestedNumber: request.requestedStickerNumber,
          customNumber: dto.stickerNumber?.trim(),
        });

        const created: Array<{
          id: string;
          stickerNumber: string | null;
          issueDate: Date | null;
          expirationDate: Date | null;
          status: StickerStatus;
        }> = [];

        for (const stickerNumber of numbers) {
          created.push(
            await tx.vehicleSticker.create({
              data: {
                communityId,
                vehicleId: request.vehicleId,
                requestId: request.id,
                stickerNumber,
                issueDate,
                expirationDate,
                status: StickerStatus.ACTIVE,
                notes: request.notes,
                createdById: user.id,
                verifiedById: user.id,
                verifiedAt: new Date(),
                verificationRemarks: dto.remarks,
              },
              select: {
                id: true,
                stickerNumber: true,
                issueDate: true,
                expirationDate: true,
                status: true,
              },
            }),
          );
        }

        const assessmentId = await this.chargeHousehold(tx, communityId, {
          householdId: request.vehicle?.resident?.householdId,
          amount: request.feeTotal.toNumber(),
          plateNumber: request.vehicle.plateNumber,
          quantity: request.quantity,
        });

        await tx.vehicle.update({
          where: { id: request.vehicleId },
          data: { hasSticker: true, parkingStickerNumber: numbers[0] },
        });

        const record = await tx.stickerRequest.update({
          where: { id: request.id },
          data: {
            status: StickerRequestStatus.APPROVED,
            approvedById: user.id,
            approvedAt: new Date(),
            reviewRemarks: dto.remarks,
            assessmentId,
          },
          include: this.requestInclude,
        });

        return { record, created };
      });

      const feeText = updated.record.assessment
        ? ` A fee of ${updated.record.assessment.amount.toNumber().toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })} was billed to your household.`
        : '';

      await this.notificationsService.notify(
        communityId,
        request.requestedById,
        NotificationType.VEHICLE_STICKER,
        'Sticker request approved',
        `Your sticker request for ${request.vehicle.plateNumber} was approved.${feeText}`,
        `/stickers/${id}`,
      );

      const chargeHouseholdId = request.vehicle?.resident?.householdId;

      if (updated.record.assessment?.id && chargeHouseholdId) {
        const chargeAmount = updated.record.assessment.amount
          .toNumber()
          .toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

        await this.notificationsService.dispatchToHousehold(
          communityId,
          chargeHouseholdId,
          NotificationType.ASSESSMENT,
          `${STICKER_CHARGE_NAME} billed to your household`,
          `A ${STICKER_CHARGE_NAME} of ${chargeAmount} was billed for ${request.quantity} sticker(s) for vehicle ${request.vehicle.plateNumber}.`,
          '/finance/my-dues',
          {
            emailVariant: NotificationEmailVariant.DUES,
            emailData: {
              periodLabel: `${STICKER_CHARGE_NAME} — ${request.vehicle.plateNumber}`,
              amount: chargeAmount,
              dueDate: new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
              }).format(updated.record.assessment.dueDate ?? new Date()),
            },
          },
        );
      }

      return {
        success: true,
        message: 'Sticker request approved.',
        data: updated.record,
      };
    }

    const updated = await this.prisma.stickerRequest.update({
      where: { id: request.id },
      data: {
        status: StickerRequestStatus.REJECTED,
        approvedById: user.id,
        approvedAt: new Date(),
        reviewRemarks: dto.remarks,
      },
      include: this.requestInclude,
    });

    await this.notificationsService.notify(
      communityId,
      request.requestedById,
      NotificationType.VEHICLE_STICKER,
      'Sticker request rejected',
      `Your sticker request for ${request.vehicle.plateNumber} was rejected.${dto.remarks ? ` Reason: ${dto.remarks}` : ''}`,
      `/stickers/${id}`,
    );

    return {
      success: true,
      message: 'Sticker request rejected.',
      data: updated,
    };
  }

  // ==========================================
  // Issue Sticker(s) (officer direct issue)
  // ==========================================

  async create(communityId: string, user: any, dto: CreateStickerDto) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    if (!this.isOfficer(user)) {
      throw new ForbiddenException(
        'Only officers can issue stickers directly. Use "Request a sticker" instead.',
      );
    }

    dto.notes = dto.notes?.trim();
    dto.stickerNumber = dto.stickerNumber?.trim();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, communityId, deletedAt: null },
      include: {
        resident: { select: { id: true, householdId: true } },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const quantity = dto.quantity ?? 1;

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new BadRequestException('Quantity must be between 1 and 100.');
    }

    if (dto.stickerNumber && quantity > 1) {
      throw new BadRequestException(
        'Sticker numbers are generated automatically when issuing multiple stickers.',
      );
    }

    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();

    if (isNaN(issueDate.getTime())) {
      throw new BadRequestException('Invalid issue date.');
    }

    const settings = await this.getStickerSettings(communityId);
    const expirationDate = dto.expirationDate
      ? new Date(dto.expirationDate)
      : this.cycleExpiration(settings, issueDate);

    if (isNaN(expirationDate.getTime())) {
      throw new BadRequestException('Invalid expiration date.');
    }

    if (expirationDate <= issueDate) {
      throw new BadRequestException(
        'Expiration date must be after issue date.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const numbers = await this.resolveStickerNumbers(tx, communityId, {
        count: quantity,
        customNumber: dto.stickerNumber?.trim(),
        requestedNumber: null,
      });

      const stickerRows: Array<{
        id: string;
        stickerNumber: string | null;
        status: StickerStatus;
        issueDate: Date | null;
        expirationDate: Date | null;
        vehicle: {
          id: string;
          plateNumber: string;
          make: string | null;
          model: string | null;
        };
        assessment: {
          id: string;
          assessmentNumber: string;
          amount: Prisma.Decimal;
          status: AssessmentStatus;
        } | null;
      }> = [];

      for (const stickerNumber of numbers) {
        const row = await tx.vehicleSticker.create({
          data: {
            communityId,
            vehicleId: dto.vehicleId,
            stickerNumber,
            issueDate,
            expirationDate,
            photoUrl: dto.photoUrl,
            status: StickerStatus.ACTIVE,
            notes: dto.notes,
            createdById: user.id,
            verifiedById: user.id,
            verifiedAt: new Date(),
          },
          include: {
            vehicle: {
              select: { id: true, plateNumber: true, make: true, model: true },
            },
            assessment: {
              select: {
                id: true,
                assessmentNumber: true,
                amount: true,
                status: true,
              },
            },
          },
        });

        stickerRows.push(row);
      }

      const chargeType = await tx.chargeType.findFirst({
        where: { communityId, code: STICKER_CHARGE_CODE, deletedAt: null },
        select: { amount: true },
      });

      const unitPrice = chargeType?.amount?.toNumber() ?? 0;

      const assessmentId = await this.chargeHousehold(tx, communityId, {
        householdId: vehicle.resident?.householdId,
        amount: unitPrice * quantity,
        plateNumber: vehicle.plateNumber,
        quantity,
      });

      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { hasSticker: true, parkingStickerNumber: numbers[0] },
      });

      return { stickerRows, assessmentId };
    });

    return {
      success: true,
      message: 'Sticker issued successfully.',
      data: {
        stickers: result.stickerRows,
        assessmentId: result.assessmentId,
      },
    };
  }

  // ==========================================
  // Sticker Settings (annual cycle + quantity rules)
  // ==========================================

  async updateSettings(
    communityId: string,
    user: any,
    dto: UpdateStickerSettingsDto,
  ) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const values: Record<string, Prisma.InputJsonValue> = {};

    if (dto.cycleEnabled !== undefined) {
      values.stickerCycleEnabled = dto.cycleEnabled;
    }

    if (dto.cycleStart) values.stickerCycleStart = dto.cycleStart;
    if (dto.cycleEnd) values.stickerCycleEnd = dto.cycleEnd;

    if (dto.maxQuantity !== undefined) {
      values.stickerMaxQuantity = dto.maxQuantity;
    }

    await this.prisma.$transaction(
      Object.entries(values).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { communityId_key: { communityId, key } },
          update: { value, updatedById: user.id },
          create: {
            communityId,
            key,
            value,
            group: 'vehicle',
            updatedById: user.id,
          },
        }),
      ),
    );

    if (dto.price !== undefined) {
      await this.prisma.chargeType
        .findFirst({
          where: { communityId, code: STICKER_CHARGE_CODE, deletedAt: null },
          select: { id: true },
        })
        .then((chargeType) =>
          chargeType
            ? this.prisma.chargeType.update({
                where: { id: chargeType.id },
                data: { amount: dto.price, isActive: true },
              })
            : this.prisma.chargeType.create({
                data: {
                  communityId,
                  code: STICKER_CHARGE_CODE,
                  name: STICKER_CHARGE_NAME,
                  category: FinanceCategory.VEHICLE_STICKER,
                  isActive: true,
                  autoGenerate: false,
                  amount: dto.price,
                },
              }),
        );
    }

    const updated = await this.getStickerSettings(communityId);

    return {
      success: true,
      message: 'Sticker settings updated.',
      data: updated,
    };
  }

  // ==========================================
  // Issued sticker records (legacy record endpoints)
  // ==========================================

  async findAll(communityId: string, user: any, query: StickerQueryDto) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const {
      page = 1,
      limit = 10,
      search,
      status,
      vehicleId,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const isOfficer = this.isOfficer(user);

    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    if (status) {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (search) {
      where.OR = [
        { stickerNumber: { contains: search, mode: 'insensitive' } },
        { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const allowedSorts: Record<string, string> = {
      stickerNumber: 'stickerNumber',
      issueDate: 'issueDate',
      expirationDate: 'expirationDate',
      createdAt: 'createdAt',
    };

    const orderBy = { [allowedSorts[sortBy] ?? 'createdAt']: order };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicleSticker.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              make: true,
              model: true,
              color: true,
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          verifiedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.vehicleSticker.count({ where }),
    ]);

    return {
      success: true,
      message: 'Stickers retrieved successfully.',
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(communityId: string, user: any, id: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const where: any = {
      id,
      communityId,
      deletedAt: null,
    };

    const isOfficer = this.isOfficer(user);

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    const sticker = await this.prisma.vehicleSticker.findFirst({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            color: true,
            type: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!sticker) {
      throw new NotFoundException('Sticker not found.');
    }

    return {
      success: true,
      message: 'Sticker retrieved successfully.',
      data: sticker,
    };
  }

  async update(communityId: string, id: string, dto: UpdateStickerDto) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const sticker = await this.prisma.vehicleSticker.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!sticker) {
      throw new NotFoundException('Sticker not found.');
    }

    if (dto.stickerNumber && dto.stickerNumber !== sticker.stickerNumber) {
      const duplicate = await this.prisma.vehicleSticker.findFirst({
        where: {
          communityId,
          stickerNumber: dto.stickerNumber,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('Sticker number already exists.');
      }
    }

    const data: any = {};
    if (dto.stickerNumber !== undefined)
      data.stickerNumber = dto.stickerNumber.trim();
    if (dto.vehicleId !== undefined) data.vehicleId = dto.vehicleId;
    if (dto.issueDate !== undefined) data.issueDate = new Date(dto.issueDate);
    if (dto.expirationDate !== undefined)
      data.expirationDate = new Date(dto.expirationDate);
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim();
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.vehicleSticker.update({
      where: { id },
      data,
      include: {
        vehicle: { select: { plateNumber: true, make: true, model: true } },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { firstName: true, lastName: true },
        },
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Sticker updated successfully.',
      data: updated,
    };
  }

  async remove(communityId: string, id: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const sticker = await this.prisma.vehicleSticker.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!sticker) {
      throw new NotFoundException('Sticker not found.');
    }

    await this.prisma.vehicleSticker.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Sticker deleted successfully.',
      data: null,
    };
  }

  async renew(
    communityId: string,
    user: any,
    id: string,
    dto: { expirationDate?: Date; notes?: string },
  ) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const where: any = {
      id,
      communityId,
      deletedAt: null,
    };

    const isOfficer = this.isOfficer(user);

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    const sticker = await this.prisma.vehicleSticker.findFirst({
      where,
    });

    if (!sticker) {
      throw new NotFoundException('Sticker not found.');
    }

    if (
      sticker.status !== StickerStatus.ACTIVE &&
      sticker.status !== StickerStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'Only active or expired stickers can be renewed.',
      );
    }

    const settings = await this.getStickerSettings(communityId);
    const newExpiration = dto.expirationDate
      ? new Date(dto.expirationDate)
      : this.cycleExpiration(settings, new Date());

    if (isNaN(newExpiration.getTime())) {
      throw new BadRequestException('Invalid expiration date.');
    }

    if (newExpiration <= new Date()) {
      throw new BadRequestException(
        'New expiration date must be in the future.',
      );
    }

    const updated = await this.prisma.vehicleSticker.update({
      where: { id },
      data: {
        expirationDate: newExpiration,
        notes: dto.notes?.trim() ?? sticker.notes,
      },
      include: {
        vehicle: { select: { plateNumber: true, make: true, model: true } },
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Sticker renewed successfully.',
      data: updated,
    };
  }

  async findByVehicle(communityId: string, user: any, vehicleId: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const isOfficer = this.isOfficer(user);

    const where: any = {
      communityId,
      vehicleId,
      deletedAt: null,
    };

    if (!isOfficer) {
      where.vehicle = { residentId: user?.resident?.id };
    }

    const stickers = await this.prisma.vehicleSticker.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Vehicle stickers retrieved successfully.',
      data: stickers,
    };
  }

  // ==========================================
  // Billing Helpers
  // ==========================================

  private async ensureStickerChargeType(
    tx: Prisma.TransactionClient,
    communityId: string,
  ) {
    const existing = await tx.chargeType.findFirst({
      where: { communityId, code: STICKER_CHARGE_CODE, deletedAt: null },
    });

    if (existing) return existing;

    return tx.chargeType.create({
      data: {
        communityId,
        code: STICKER_CHARGE_CODE,
        name: STICKER_CHARGE_NAME,
        category: FinanceCategory.VEHICLE_STICKER,
        recurrence: 'ONE_TIME' as any,
        isActive: true,
        autoGenerate: false,
      },
    });
  }

  private async nextAssessmentNumber(
    tx: Prisma.TransactionClient,
    communityId: string,
  ) {
    const latest = await tx.assessment.findFirst({
      where: { communityId },
      orderBy: { assessmentNumber: 'desc' },
      select: { assessmentNumber: true },
    });

    if (!latest) return 0;

    const parsed = parseInt(latest.assessmentNumber.replace(/^ASS-/, ''), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Creates an ISSUED assessment on the vehicle owner's household so the
   * sticker fee flows into the regular dues/payments ledger. Returns the
   * assessment id, or null when the owner has no household or the fee is 0.
   */
  private async chargeHousehold(
    tx: Prisma.TransactionClient,
    communityId: string,
    opts: {
      householdId?: string | null;
      amount: number;
      plateNumber: string;
      quantity?: number;
    },
  ) {
    if (!opts.householdId || opts.amount <= 0) return null;

    await this.ensureStickerChargeType(tx, communityId);

    const nextNumber = (await this.nextAssessmentNumber(tx, communityId)) + 1;
    const quantityText =
      opts.quantity && opts.quantity > 1 ? ` (×${opts.quantity})` : '';

    const assessment = await tx.assessment.create({
      data: {
        communityId,
        householdId: opts.householdId,
        chargeTypeId: (
          await tx.chargeType.findFirst({
            where: { communityId, code: STICKER_CHARGE_CODE, deletedAt: null },
            select: { id: true },
          })
        )?.id,
        assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
        title: `${STICKER_CHARGE_NAME} — ${opts.plateNumber}${quantityText}`,
        description: 'Auto-charged for vehicle sticker.',
        amount: new Prisma.Decimal(opts.amount),
        dueDate: addDays(new Date(), 14),
        status: AssessmentStatus.ISSUED,
      },
    });

    return assessment.id;
  }

  // ==========================================
  // Atomic per-community number generation
  // ==========================================

  /**
   * Resolves the full set of sticker numbers for an issuance, honouring an
   * officer-provided override first, then a resident's preferred number (when
   * it is still free), and finally auto-generated sequence numbers. Custom /
   * preferred numbers are written back to the sequence so auto-numbering stays
   * based on the last sticker used.
   */
  private async resolveStickerNumbers(
    tx: Prisma.TransactionClient,
    communityId: string,
    opts: {
      count: number;
      requestedNumber?: string | null;
      customNumber?: string | null;
    },
  ): Promise<string[]> {
    const firstNumber =
      opts.customNumber?.trim() || opts.requestedNumber?.trim();

    const useAuto = async () => {
      const numbers = await this.allocateNumbers(
        tx,
        communityId,
        'vehicle-sticker',
        opts.count,
      );
      await this.syncSequence(tx, communityId, 'vehicle-sticker', numbers);
      return numbers;
    };

    if (!firstNumber) {
      return useAuto();
    }

    const taken = await tx.vehicleSticker.findFirst({
      where: { communityId, stickerNumber: firstNumber },
      select: { id: true },
    });

    if (taken) {
      if (opts.customNumber) {
        throw new ConflictException('Sticker number already exists.');
      }
      return useAuto();
    }

    const numbers = [firstNumber];
    if (opts.count > 1) {
      numbers.push(
        ...(await this.allocateNumbers(
          tx,
          communityId,
          'vehicle-sticker',
          opts.count - 1,
        )),
      );
    }
    await this.syncSequence(tx, communityId, 'vehicle-sticker', numbers);
    return numbers;
  }

  /**
   * Keeps a community's sequence tracker aligned with the highest sticker
   * number actually in use (including custom / resident-preferred numbers and
   * any previously issued stickers), so the next auto-generated number is
   * always based on the last sticker allocated.
   */
  private async syncSequence(
    tx: Prisma.TransactionClient,
    communityId: string,
    key: SequenceKey,
    usedNumbers: string[],
  ) {
    const cfg = SEQUENCE_CONFIGS[key];
    const matcher = new RegExp(`^${cfg.prefix}-(\\d{${cfg.digits}})$`);
    const parse = (value: string | null | undefined): number | null => {
      if (!value) return null;
      const match = matcher.exec(value);
      return match ? Number(match[1]) : null;
    };

    let maxSuffix = 0;
    for (const value of usedNumbers) {
      const parsed = parse(value);
      if (parsed !== null && parsed > maxSuffix) maxSuffix = parsed;
    }

    if (key === 'vehicle-sticker') {
      const existing = await tx.vehicleSticker.findMany({
        where: { communityId },
        select: { stickerNumber: true },
      });
      for (const row of existing) {
        const parsed = parse(row.stickerNumber);
        if (parsed !== null && parsed > maxSuffix) maxSuffix = parsed;
      }
    }

    await tx.sequence.upsert({
      where: { communityId_key: { communityId, key } },
      update: {},
      create: {
        communityId,
        key,
        prefix: cfg.prefix,
        digits: cfg.digits,
      },
    });

    const rows = await tx.$queryRaw<{ next_value: bigint }[]>`
      SELECT "nextValue" AS next_value
      FROM "Sequence"
      WHERE "communityId" = ${communityId}::uuid AND "key" = ${key}
      FOR UPDATE
    `;

    const nextValue = rows[0] ? Number(rows[0].next_value) : 1;
    const minNext = maxSuffix + 1;

    if (minNext > nextValue) {
      await tx.$queryRaw`
        UPDATE "Sequence"
        SET "nextValue" = ${minNext}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "communityId" = ${communityId}::uuid AND "key" = ${key}
      `;
    }
  }

  private async allocateNumbers(
    tx: Prisma.TransactionClient,
    communityId: string,
    key: SequenceKey,
    count: number,
  ): Promise<string[]> {
    const cfg = SEQUENCE_CONFIGS[key];

    await tx.sequence.upsert({
      where: { communityId_key: { communityId, key } },
      update: {},
      create: {
        communityId,
        key,
        prefix: cfg.prefix,
        digits: cfg.digits,
      },
    });

    const rows = await tx.$queryRaw<{ next_value: bigint }[]>`
      SELECT "nextValue" AS next_value
      FROM "Sequence"
      WHERE "communityId" = ${communityId}::uuid AND "key" = ${key}
      FOR UPDATE
    `;

    const current = rows[0] ? Number(rows[0].next_value) : 1;

    await tx.$queryRaw`
      UPDATE "Sequence"
      SET "nextValue" = "nextValue" + ${count}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "communityId" = ${communityId}::uuid AND "key" = ${key}
    `;

    return Array.from(
      { length: count },
      (_, i) =>
        `${cfg.prefix}-${String(current + i).padStart(cfg.digits, '0')}`,
    );
  }
}
