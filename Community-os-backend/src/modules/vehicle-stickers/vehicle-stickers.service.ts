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
  StickerStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FeaturesService } from '../features/features.service';
import { NotificationsService } from '../notifications/notifications.service';

import { CreateStickerDto } from './dto/create-sticker.dto';
import { UpdateStickerDto } from './dto/update-sticker.dto';
import { VerifyStickerDto } from './dto/verify-sticker.dto';
import { StickerQueryDto } from './dto/sticker-query.dto';

import { VEHICLE_STICKERS_FEATURE } from '../features/feature.constants';

const STICKER_CHARGE_CODE = 'vehicle-sticker';
const STICKER_CHARGE_NAME = 'Vehicle Sticker / Gate Pass Fee';
const VALIDITY_DAYS = 365;

@Injectable()
export class VehicleStickersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  private async isVerificationRequired(communityId: string): Promise<boolean> {
    const config = await this.featuresService.getConfig(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );
    const mode = (config as { verificationMode?: string }).verificationMode;
    return mode === 'approval';
  }

  // ==========================================
  // Sticker Request Options (fee preview)
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

    return {
      success: true,
      message: 'Sticker options retrieved.',
      data: { price, validityDays: VALIDITY_DAYS },
    };
  }

  // ==========================================
  // Request Sticker (resident self-service)
  // ==========================================

  async request(
    communityId: string,
    user: any,
    dto: { vehicleId: string; notes?: string },
  ) {
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

    const activeRequest = await this.prisma.vehicleSticker.findFirst({
      where: {
        communityId,
        vehicleId: dto.vehicleId,
        deletedAt: null,
        status: { in: [StickerStatus.PENDING, StickerStatus.ACTIVE] },
      },
    });

    if (activeRequest) {
      throw new ConflictException(
        activeRequest.status === StickerStatus.PENDING
          ? 'A sticker request is already pending for this vehicle.'
          : 'This vehicle already has an active sticker.',
      );
    }

    const sticker = await this.prisma.vehicleSticker.create({
      data: {
        communityId,
        vehicleId: dto.vehicleId,
        status: StickerStatus.PENDING,
        notes: dto.notes?.trim(),
        createdById: user.id,
      },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true },
        },
      },
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
      `Plate ${vehicle.plateNumber} is requesting a vehicle sticker.`,
      `/stickers/${sticker.id}`,
    );

    return {
      success: true,
      message: 'Sticker request submitted. You will be notified once reviewed.',
      data: sticker,
    };
  }

  // ==========================================
  // Create Sticker (officer direct issue)
  // ==========================================

  async create(communityId: string, user: any, dto: CreateStickerDto) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    dto.stickerNumber = dto.stickerNumber.trim();
    dto.notes = dto.notes?.trim();

    const issueDate = new Date(dto.issueDate);
    const expirationDate = new Date(dto.expirationDate);

    if (isNaN(issueDate.getTime())) {
      throw new BadRequestException('Invalid issue date.');
    }

    if (isNaN(expirationDate.getTime())) {
      throw new BadRequestException('Invalid expiration date.');
    }

    if (expirationDate <= issueDate) {
      throw new BadRequestException(
        'Expiration date must be after issue date.',
      );
    }

    const permissions = this.getPermissionCodes(user);
    const isOfficer = permissions.includes('sticker.verify');

    if (!isOfficer) {
      const ownVehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: dto.vehicleId,
          communityId,
          residentId: user?.resident?.id,
          deletedAt: null,
        },
      });

      if (!ownVehicle) {
        throw new ForbiddenException(
          'You can only apply for stickers on your own vehicles.',
        );
      }
    } else {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: dto.vehicleId,
          communityId,
          deletedAt: null,
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found.');
      }
    }

    const verificationRequired = await this.isVerificationRequired(communityId);
    const stickerStatus = verificationRequired
      ? StickerStatus.PENDING
      : StickerStatus.ACTIVE;

    const sticker = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.vehicleSticker.findFirst({
        where: { communityId, stickerNumber: dto.stickerNumber },
      });

      if (duplicate) {
        throw new ConflictException('Sticker number already exists.');
      }

      return tx.vehicleSticker.create({
        data: {
          communityId,
          vehicleId: dto.vehicleId,
          stickerNumber: dto.stickerNumber,
          issueDate,
          expirationDate,
          photoUrl: dto.photoUrl,
          status: stickerStatus,
          notes: dto.notes,
          createdById: user.id,
        },
        include: {
          vehicle: { select: { plateNumber: true, make: true, model: true } },
          createdBy: {
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
    });

    return {
      success: true,
      message: verificationRequired
        ? 'Sticker application submitted for review.'
        : 'Sticker registered successfully.',
      data: sticker,
    };
  }

  // ==========================================
  // Find All Stickers
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

    const permissions = this.getPermissionCodes(user);
    const isOfficer = permissions.includes('sticker.verify');

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

  // ==========================================
  // Find One Sticker
  // ==========================================

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

    const permissions = this.getPermissionCodes(user);
    const isOfficer = permissions.includes('sticker.verify');

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

  // ==========================================
  // Update Sticker
  // ==========================================

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

  // ==========================================
  // Remove Sticker
  // ==========================================

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

  // ==========================================
  // Verify Sticker (approve / reject)
  // ==========================================

  async verify(
    communityId: string,
    user: any,
    id: string,
    dto: VerifyStickerDto,
  ) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const sticker = await this.prisma.vehicleSticker.findFirst({
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
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!sticker) {
      throw new NotFoundException('Sticker not found.');
    }

    if (sticker.status !== StickerStatus.PENDING) {
      throw new BadRequestException('Only pending stickers can be verified.');
    }

    let updated;

    if (dto.approved) {
      updated = await this.prisma.$transaction(async (tx) => {
        const stickerNumber =
          sticker.stickerNumber ??
          (await this.nextStickerNumber(tx, communityId));

        const now = new Date();
        const expirationDate = new Date(now);
        expirationDate.setDate(expirationDate.getDate() + VALIDITY_DAYS);

        const assessmentId = await this.chargeHousehold(
          tx,
          communityId,
          sticker,
        );

        const record = await tx.vehicleSticker.update({
          where: { id },
          data: {
            stickerNumber,
            issueDate: sticker.issueDate ?? now,
            expirationDate: sticker.expirationDate ?? expirationDate,
            status: StickerStatus.ACTIVE,
            verifiedById: user.id,
            verifiedAt: now,
            verificationRemarks: dto.remarks,
            assessmentId,
          },
          include: {
            vehicle: { select: { plateNumber: true, make: true, model: true } },
            createdBy: { select: { firstName: true, lastName: true } },
            verifiedBy: { select: { firstName: true, lastName: true } },
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

        await tx.vehicle.update({
          where: { id: sticker.vehicle.id },
          data: { hasSticker: true, parkingStickerNumber: stickerNumber },
        });

        return record;
      });

      const feeText = updated.assessment
        ? ` A fee of ₱${Number(updated.assessment.amount).toLocaleString()} was billed to your household.`
        : '';

      await this.notificationsService.notify(
        communityId,
        sticker.createdById,
        NotificationType.VEHICLE_STICKER,
        'Sticker approved',
        `Your sticker for ${sticker.vehicle.plateNumber} was approved.${feeText}`,
        `/stickers/${id}`,
      );
    } else {
      updated = await this.prisma.vehicleSticker.update({
        where: { id },
        data: {
          status: StickerStatus.REVOKED,
          verifiedById: user.id,
          verifiedAt: new Date(),
          verificationRemarks: dto.remarks,
        },
        include: {
          vehicle: { select: { plateNumber: true, make: true, model: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          verifiedBy: { select: { firstName: true, lastName: true } },
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

      await this.notificationsService.notify(
        communityId,
        sticker.createdById,
        NotificationType.VEHICLE_STICKER,
        'Sticker rejected',
        `Your sticker request for ${sticker.vehicle.plateNumber} was rejected.${dto.remarks ? ` Reason: ${dto.remarks}` : ''}`,
        `/stickers/${id}`,
      );
    }

    return {
      success: true,
      message: dto.approved
        ? 'Sticker approved successfully.'
        : 'Sticker rejected.',
      data: updated,
    };
  }

  // ==========================================
  // Renew Sticker
  // ==========================================

  async renew(
    communityId: string,
    user: any,
    id: string,
    dto: { expirationDate: Date; notes?: string },
  ) {
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

    if (
      sticker.status !== StickerStatus.ACTIVE &&
      sticker.status !== StickerStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'Only active or expired stickers can be renewed.',
      );
    }

    const newExpiration = new Date(dto.expirationDate);

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

  // ==========================================
  // Get Stickers By Vehicle
  // ==========================================

  async findByVehicle(communityId: string, user: any, vehicleId: string) {
    await this.featuresService.assertEnabled(
      communityId,
      VEHICLE_STICKERS_FEATURE,
    );

    const permissions = this.getPermissionCodes(user);
    const isOfficer = permissions.includes('sticker.verify');

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

  private async nextStickerNumber(
    tx: Prisma.TransactionClient,
    communityId: string,
  ) {
    const year = new Date().getFullYear();
    const prefix = `STK-${year}-`;

    const existing = await tx.vehicleSticker.findMany({
      where: {
        communityId,
        stickerNumber: { startsWith: prefix },
      },
      select: { stickerNumber: true },
    });

    let maxSeq = 0;
    for (const s of existing) {
      if (s.stickerNumber) {
        const num = parseInt(s.stickerNumber.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }

    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
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
   * Creates an ISSUED assessment on the vehicle owner's household
   * so the sticker fee flows into the regular dues/payments ledger.
   * Returns the assessment id, or null when the owner has no household
   * or the charge type amount is 0.
   */
  private async chargeHousehold(
    tx: Prisma.TransactionClient,
    communityId: string,
    sticker: any,
  ) {
    if (sticker.assessmentId) return sticker.assessmentId;

    const householdId = sticker.vehicle?.resident?.householdId;
    if (!householdId) return null;

    const chargeType = await this.ensureStickerChargeType(tx, communityId);
    const amount =
      chargeType.amount?.toNumber?.() ?? Number(chargeType.amount ?? 0);
    if (amount <= 0) return null;

    const nextNumber = (await this.nextAssessmentNumber(tx, communityId)) + 1;

    const assessment = await tx.assessment.create({
      data: {
        communityId,
        householdId,
        chargeTypeId: chargeType.id,
        assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
        title: `${STICKER_CHARGE_NAME} — ${sticker.vehicle.plateNumber}`,
        description: `Auto-charged for vehicle sticker request.`,
        amount: chargeType.amount ?? 0,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: AssessmentStatus.ISSUED,
      },
    });

    return assessment.id;
  }
}
