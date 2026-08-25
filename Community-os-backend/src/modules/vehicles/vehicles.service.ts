import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { VehicleStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Ownership Validation
  // ==========================================

  private assertVehicleOwner(user: any, vehicle: any) {
    const ownResidentId = user?.resident?.id;

    if (!ownResidentId || vehicle.residentId !== ownResidentId) {
      throw new ForbiddenException(
        'You can only manage vehicles registered under your household.',
      );
    }
  }

  // ==========================================
  // Sticker Uniqueness (first come, first served)
  // ==========================================

  private async assertStickerAvailable(
    communityId: string,
    stickerNumber: string,
    excludeVehicleId?: string,
  ) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        communityId,
        parkingStickerNumber: stickerNumber,
        deletedAt: null,
        NOT: excludeVehicleId ? { id: excludeVehicleId } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Sticker number is already registered to another vehicle.',
      );
    }
  }

  // ==========================================
  // Create Vehicle
  // ==========================================

  async create(communityId: string, user: any, dto: CreateVehicleDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.plateNumber = dto.plateNumber.trim().toUpperCase();
    dto.make = dto.make?.trim();
    dto.model = dto.model?.trim();
    dto.color = dto.color?.trim();

    const hasSticker = dto.hasSticker ?? false;
    const parkingStickerNumber =
      hasSticker && dto.parkingStickerNumber
        ? dto.parkingStickerNumber.trim().toUpperCase()
        : null;

    // ==========================================
    // Duplicate Plate Number
    // ==========================================

    const existing = await this.prisma.vehicle.findFirst({
      where: {
        communityId,
        plateNumber: dto.plateNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Vehicle already exists.');
    }

    if (parkingStickerNumber) {
      await this.assertStickerAvailable(communityId, parkingStickerNumber);
    }

    // ==========================================
    // Self-Service Scope
    // ==========================================

    // Only members (users linked to a resident) can create vehicles.
    // Officers are view-only.
    const ownResidentId = user?.resident?.id;

    if (!ownResidentId) {
      throw new ForbiddenException(
        'You must be linked to a resident to register a vehicle.',
      );
    }

    dto.residentId = ownResidentId;

    // ==========================================
    // Validate Resident
    // ==========================================

    if (dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // ==========================================
    // Create Vehicle
    // ==========================================

    const vehicle = await this.prisma.vehicle.create({
      data: {
        communityId,

        plateNumber: dto.plateNumber,
        make: dto.make,
        model: dto.model,
        color: dto.color,
        type: dto.type ?? 'CAR',
        hasSticker,
        parkingStickerNumber,
        photoUrl: dto.photoUrl,

        residentId: dto.residentId,

        status: VehicleStatus.ACTIVE,
      },

      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Vehicle created successfully.',
      data: vehicle,
    };
  }

  // ==========================================
  // Get All Vehicles
  // ==========================================

  async findAll(communityId: string, query: VehicleQueryDto) {
    const { page, limit, search, type, status, residentId, sortBy, order } =
      query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          plateNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          make: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          model: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          color: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          resident: {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (residentId) {
      where.residentId = residentId;
    }

    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.vehicle.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Vehicles retrieved successfully.',
      data: vehicles,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // ==========================================
  // Get Vehicle By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return {
      success: true,
      message: 'Vehicle retrieved successfully.',
      data: vehicle,
    };
  }

  // ==========================================
  // Update Vehicle
  // ==========================================

  async update(
    communityId: string,
    user: any,
    id: string,
    dto: UpdateVehicleDto,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // ==========================================
    // Ownership Check
    // ==========================================

    this.assertVehicleOwner(user, vehicle);

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.plateNumber) dto.plateNumber = dto.plateNumber.trim().toUpperCase();

    if (dto.make) dto.make = dto.make.trim();

    if (dto.model) dto.model = dto.model.trim();

    if (dto.color) dto.color = dto.color.trim();

    if (dto.parkingStickerNumber)
      dto.parkingStickerNumber = dto.parkingStickerNumber.trim().toUpperCase();

    // Sticker handling:
    // - hasSticker=true  + new number  -> set/replace number
    // - hasSticker=true  + no number   -> keep existing number
    // - hasSticker=false               -> clear number
    // - neither field sent             -> leave untouched
    let hasSticker: boolean | undefined = undefined;
    let parkingStickerNumber: string | null | undefined = undefined;

    if (dto.hasSticker !== undefined) {
      hasSticker = dto.hasSticker;

      if (dto.hasSticker) {
        parkingStickerNumber =
          dto.parkingStickerNumber !== undefined
            ? dto.parkingStickerNumber || null
            : vehicle.parkingStickerNumber;
      } else {
        parkingStickerNumber = null;
      }
    }

    // ==========================================
    // Duplicate Plate Number
    // ==========================================

    if (dto.plateNumber) {
      const existing = await this.prisma.vehicle.findFirst({
        where: {
          communityId,
          plateNumber: dto.plateNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Vehicle already exists.');
      }
    }

    if (parkingStickerNumber) {
      await this.assertStickerAvailable(communityId, parkingStickerNumber, id);
    }

    // ==========================================
    // Validate Resident
    // ==========================================

    if (dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // ==========================================
    // Update Vehicle
    // ==========================================

    const updatedVehicle = await this.prisma.vehicle.update({
      where: {
        id,
      },

      data: {
        ...(dto.plateNumber && {
          plateNumber: dto.plateNumber,
        }),

        ...(dto.make !== undefined && {
          make: dto.make,
        }),

        ...(dto.model !== undefined && {
          model: dto.model,
        }),

        ...(dto.color !== undefined && {
          color: dto.color,
        }),

        ...(dto.type && { type: dto.type }),

        ...(hasSticker !== undefined && { hasSticker }),

        ...(parkingStickerNumber !== undefined && {
          parkingStickerNumber,
        }),

        ...(dto.photoUrl !== undefined && {
          photoUrl: dto.photoUrl,
        }),
      },

      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Vehicle updated successfully.',
      data: updatedVehicle,
    };
  }

  // ==========================================
  // Deactivate Vehicle
  // ==========================================

  async deactivate(communityId: string, user: any, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // ==========================================
    // Ownership Check
    // ==========================================

    this.assertVehicleOwner(user, vehicle);

    const activeStatuses: VehicleStatus[] = [
      VehicleStatus.ACTIVE,
      VehicleStatus.APPROVED,
    ];

    if (!activeStatuses.includes(vehicle.status)) {
      throw new BadRequestException('Only active vehicles can be deactivated.');
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        status: VehicleStatus.DEACTIVATED,
      },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Vehicle deactivated successfully.',
      data: updatedVehicle,
    };
  }

  // ==========================================
  // Revalidate Vehicle (re-activate)
  // ==========================================

  async revalidate(communityId: string, user: any, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // ==========================================
    // Ownership Check
    // ==========================================

    this.assertVehicleOwner(user, vehicle);

    const inactiveStatuses: VehicleStatus[] = [
      VehicleStatus.DEACTIVATED,
      VehicleStatus.TRANSFERRED,
    ];

    if (!inactiveStatuses.includes(vehicle.status)) {
      throw new BadRequestException(
        'Only deactivated or transferred vehicles can be revalidated.',
      );
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        status: VehicleStatus.ACTIVE,
      },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Vehicle revalidated successfully.',
      data: updatedVehicle,
    };
  }

  // ==========================================
  // Unregister Vehicle (Soft Delete)
  // ==========================================

  async remove(communityId: string, user: any, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // ==========================================
    // Ownership Check
    // ==========================================

    this.assertVehicleOwner(user, vehicle);

    await this.prisma.vehicle.update({
      where: {
        id,
      },

      data: {
        status: VehicleStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Vehicle unregistered successfully.',
    };
  }
}
