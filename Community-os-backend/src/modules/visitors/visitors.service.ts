import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { VisitorStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';

@Injectable()
export class VisitorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Visitor
  // ==========================================

  async create(communityId: string, dto: CreateVisitorDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.name = dto.name.trim();
    dto.phoneNumber = dto.phoneNumber?.trim();
    dto.purpose = dto.purpose?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Validate Host Resident
    // ==========================================

    if (dto.hostResidentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.hostResidentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // ==========================================
    // Validate Vehicle
    // ==========================================

    if (dto.vehicleId) {
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

    // ==========================================
    // Parse Dates
    // ==========================================

    let entryAt: Date | undefined;
    let exitAt: Date | undefined;

    if (dto.entryAt) entryAt = new Date(dto.entryAt);

    if (dto.exitAt) exitAt = new Date(dto.exitAt);

    if (entryAt && exitAt && entryAt >= exitAt) {
      throw new BadRequestException('Exit time must be after entry time.');
    }

    // ==========================================
    // Auto-Approve Guest Passes
    // ==========================================

    const autoApproveSetting = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key: 'guestPassAutoApprove',
        },
      },
    });

    const autoApprove =
      (autoApproveSetting?.value as boolean | undefined) ?? false;

    const status = autoApprove
      ? VisitorStatus.CHECKED_IN
      : (dto.status ?? VisitorStatus.EXPECTED);

    const effectiveEntryAt = autoApprove ? (entryAt ?? new Date()) : entryAt;

    // ==========================================
    // Create Visitor
    // ==========================================

    const visitor = await this.prisma.visitor.create({
      data: {
        communityId,

        name: dto.name,
        phoneNumber: dto.phoneNumber,
        purpose: dto.purpose,
        remarks: dto.remarks,

        hostResidentId: dto.hostResidentId,
        vehicleId: dto.vehicleId,

        entryAt: effectiveEntryAt,
        exitAt,

        status,
      },

      include: {
        hostResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Visitor created successfully.',
      data: visitor,
    };
  }

  // ==========================================
  // Get All Visitors
  // ==========================================

  async findAll(communityId: string, query: VisitorQueryDto) {
    const { page, limit, search, status, hostResidentId, sortBy, order } =
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
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          purpose: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          hostResident: {
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

    if (status) {
      where.status = status;
    }

    if (hostResidentId) {
      where.hostResidentId = hostResidentId;
    }

    const [visitors, total] = await this.prisma.$transaction([
      this.prisma.visitor.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          hostResident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
            },
          },
        },
      }),

      this.prisma.visitor.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Visitors retrieved successfully.',
      data: visitors,

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
  // Get Visitor By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const visitor = await this.prisma.visitor.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        hostResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
          },
        },
      },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found.');
    }

    return {
      success: true,
      message: 'Visitor retrieved successfully.',
      data: visitor,
    };
  }

  // ==========================================
  // Update Visitor
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateVisitorDto) {
    const visitor = await this.prisma.visitor.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.name) dto.name = dto.name.trim();

    if (dto.phoneNumber) dto.phoneNumber = dto.phoneNumber.trim();

    if (dto.purpose) dto.purpose = dto.purpose.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Validate Host Resident
    // ==========================================

    if (dto.hostResidentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.hostResidentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // ==========================================
    // Validate Vehicle
    // ==========================================

    if (dto.vehicleId) {
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

    // ==========================================
    // Parse Dates
    // ==========================================

    const entryAt = dto.entryAt ? new Date(dto.entryAt) : visitor.entryAt;

    const exitAt = dto.exitAt ? new Date(dto.exitAt) : visitor.exitAt;

    if (entryAt && exitAt && entryAt >= exitAt) {
      throw new BadRequestException('Exit time must be after entry time.');
    }

    // ==========================================
    // Update Visitor
    // ==========================================

    const updatedVisitor = await this.prisma.visitor.update({
      where: {
        id,
      },

      data: {
        ...(dto.name && { name: dto.name }),

        ...(dto.phoneNumber !== undefined && {
          phoneNumber: dto.phoneNumber,
        }),

        ...(dto.purpose !== undefined && {
          purpose: dto.purpose,
        }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),

        ...(dto.hostResidentId !== undefined && {
          hostResidentId: dto.hostResidentId,
        }),

        ...(dto.vehicleId !== undefined && {
          vehicleId: dto.vehicleId,
        }),

        ...(dto.entryAt && { entryAt }),

        ...(dto.exitAt && { exitAt }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        hostResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Visitor updated successfully.',
      data: updatedVisitor,
    };
  }

  // ==========================================
  // Delete Visitor (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const visitor = await this.prisma.visitor.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found.');
    }

    await this.prisma.visitor.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Visitor deleted successfully.',
    };
  }

  // ==========================================
  // Check In Visitor
  // ==========================================

  async checkIn(communityId: string, id: string) {
    const visitor = await this.findScoped(communityId, id);

    if (
      visitor.status === VisitorStatus.CHECKED_OUT ||
      visitor.status === VisitorStatus.CANCELLED
    ) {
      throw new ConflictException('Visitor cannot be checked in.');
    }

    const updatedVisitor = await this.prisma.visitor.update({
      where: {
        id,
      },

      data: {
        status: VisitorStatus.CHECKED_IN,
        entryAt: visitor.entryAt ?? new Date(),
      },

      include: {
        hostResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Visitor checked in successfully.',
      data: updatedVisitor,
    };
  }

  // ==========================================
  // Check Out Visitor
  // ==========================================

  async checkOut(communityId: string, id: string) {
    const visitor = await this.findScoped(communityId, id);

    if (visitor.status !== VisitorStatus.CHECKED_IN) {
      throw new BadRequestException(
        'Only CHECKED_IN visitors can be checked out.',
      );
    }

    const updatedVisitor = await this.prisma.visitor.update({
      where: {
        id,
      },

      data: {
        status: VisitorStatus.CHECKED_OUT,
        exitAt: visitor.exitAt ?? new Date(),
      },

      include: {
        hostResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Visitor checked out successfully.',
      data: updatedVisitor,
    };
  }

  // ==========================================
  // Cancel Visitor
  // ==========================================

  async cancel(communityId: string, id: string) {
    const visitor = await this.findScoped(communityId, id);

    if (
      visitor.status === VisitorStatus.CHECKED_OUT ||
      visitor.status === VisitorStatus.CANCELLED
    ) {
      throw new ConflictException('Visitor cannot be cancelled.');
    }

    return this.updateStatus(communityId, id, VisitorStatus.CANCELLED);
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const visitor = await this.prisma.visitor.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found.');
    }

    return visitor;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: VisitorStatus,
  ) {
    const visitor = await this.prisma.visitor.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        hostResident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Visitor ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: visitor,
    };
  }
}
