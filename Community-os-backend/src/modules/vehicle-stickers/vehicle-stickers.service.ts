import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { StickerStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FeaturesService } from '../features/features.service';

import { CreateStickerDto } from './dto/create-sticker.dto';
import { UpdateStickerDto } from './dto/update-sticker.dto';
import { VerifyStickerDto } from './dto/verify-sticker.dto';
import { StickerQueryDto } from './dto/sticker-query.dto';

import { VEHICLE_STICKERS_FEATURE } from '../features/feature.constants';

@Injectable()
export class VehicleStickersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
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
  // Create Sticker
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
      const latestSticker = await tx.vehicleSticker.findFirst({
        where: { communityId },
        orderBy: { stickerNumber: 'desc' },
        select: { stickerNumber: true },
      });

      let stickerNumber = 'STK-000001';

      if (latestSticker) {
        const latestNum = Number(
          latestSticker.stickerNumber.replace('STK-', ''),
        );
        stickerNumber = `STK-${String(latestNum + 1).padStart(6, '0')}`;
      }

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
    if (dto.stickerNumber !== undefined) data.stickerNumber = dto.stickerNumber.trim();
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
  // Verify Sticker
  // ==========================================

  async verify(communityId: string, id: string, dto: VerifyStickerDto) {
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

    if (sticker.status !== StickerStatus.PENDING) {
      throw new BadRequestException(
        'Only pending stickers can be verified.',
      );
    }

    const newStatus = dto.approved
      ? StickerStatus.ACTIVE
      : StickerStatus.REVOKED;

    const updated = await this.prisma.vehicleSticker.update({
      where: { id },
      data: {
        status: newStatus,
        verifiedById: undefined,
        verifiedAt: new Date(),
        verificationRemarks: dto.remarks,
      },
      include: {
        vehicle: { select: { plateNumber: true, make: true, model: true } },
        verifiedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

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
      },
    });

    return {
      success: true,
      message: 'Vehicle stickers retrieved successfully.',
      data: stickers,
    };
  }
}
