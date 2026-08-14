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
import { VerifyVehicleDto } from './dto/verify-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { TransferVehicleDto } from './dto/transfer-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async getVerificationMode(communityId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key: 'vehicleVerification',
        },
      },
    });

    return (setting?.value as string | undefined) ?? 'auto';
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
    dto.parkingStickerNumber = dto.parkingStickerNumber?.trim();

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

    // ==========================================
    // Self-Service Scope
    // ==========================================

    const permissions = this.getPermissionCodes(user);

    const isOfficer = permissions.includes('vehicle.verify');

    let vehicleStatus = dto.status ?? VehicleStatus.ACTIVE;

    if (!isOfficer) {
      const ownResidentId = user?.resident?.id;

      if (!ownResidentId) {
        throw new ForbiddenException(
          'You must be linked to a resident to register a vehicle.',
        );
      }

      dto.residentId = ownResidentId;

      const verificationMode = await this.getVerificationMode(communityId);

      if (verificationMode === 'approval') {
        vehicleStatus = VehicleStatus.PENDING;
      }
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
        parkingStickerNumber: dto.parkingStickerNumber,

        residentId: dto.residentId,

        status: vehicleStatus,
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

  async update(communityId: string, id: string, dto: UpdateVehicleDto) {
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
    // Clean Inputs
    // ==========================================

    if (dto.plateNumber) dto.plateNumber = dto.plateNumber.trim().toUpperCase();

    if (dto.make) dto.make = dto.make.trim();

    if (dto.model) dto.model = dto.model.trim();

    if (dto.color) dto.color = dto.color.trim();

    if (dto.parkingStickerNumber)
      dto.parkingStickerNumber = dto.parkingStickerNumber.trim();

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

        ...(dto.parkingStickerNumber !== undefined && {
          parkingStickerNumber: dto.parkingStickerNumber,
        }),

        ...(dto.residentId !== undefined && {
          residentId: dto.residentId,
        }),

        ...(dto.status && { status: dto.status }),
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
  // Verify Pending Vehicle
  // ==========================================

  async verify(
    communityId: string,
    verifierId: string,
    id: string,
    dto: VerifyVehicleDto,
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

    if (vehicle.status !== VehicleStatus.PENDING) {
      throw new BadRequestException('Only pending vehicles can be verified.');
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        status: dto.approved ? VehicleStatus.APPROVED : VehicleStatus.REJECTED,
        verifiedById: verifierId,
        verifiedAt: new Date(),
        verificationRemarks: dto.remarks,
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
      message: dto.approved
        ? 'Vehicle approved successfully.'
        : 'Vehicle rejected successfully.',
      data: updatedVehicle,
    };
  }

  // ==========================================
  // Transfer Vehicle
  // ==========================================

  async transfer(communityId: string, id: string, dto: TransferVehicleDto) {
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

    const activeStatuses: VehicleStatus[] = [
      VehicleStatus.ACTIVE,
      VehicleStatus.APPROVED,
    ];

    if (!activeStatuses.includes(vehicle.status)) {
      throw new BadRequestException('Only active vehicles can be transferred.');
    }

    const resident = await this.prisma.resident.findFirst({
      where: {
        id: dto.newResidentId,
        communityId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        residentId: resident.id,
        status: VehicleStatus.TRANSFERRED,
        verifiedById: null,
        verifiedAt: null,
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
      message: `Vehicle transferred to ${resident.firstName} ${resident.lastName}.`,
      data: updatedVehicle,
    };
  }

  // ==========================================
  // Deactivate Vehicle
  // ==========================================

  async deactivate(communityId: string, id: string) {
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

  async revalidate(communityId: string, id: string) {
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
  // Delete Vehicle (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
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
      message: 'Vehicle deleted successfully.',
    };
  }
}
