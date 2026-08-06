import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MaintenanceStatus, NotificationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // Create Maintenance
  // ==========================================

  async create(communityId: string, dto: CreateMaintenanceDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.maintenanceNumber = dto.maintenanceNumber.trim();
    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Duplicate Maintenance Number
    // ==========================================

    const existing = await this.prisma.maintenance.findFirst({
      where: {
        communityId,
        maintenanceNumber: dto.maintenanceNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Maintenance request already exists.');
    }

    // ==========================================
    // Validate Facility
    // ==========================================

    if (dto.facilityId) {
      const facility = await this.prisma.facility.findFirst({
        where: {
          id: dto.facilityId,
          communityId,
          deletedAt: null,
        },
      });

      if (!facility) {
        throw new NotFoundException('Facility not found.');
      }
    }

    // ==========================================
    // Validate Assigned Staff
    // ==========================================

    if (dto.assignedToId) {
      const staff = await this.prisma.staff.findFirst({
        where: {
          id: dto.assignedToId,
          communityId,
          deletedAt: null,
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff member not found.');
      }
    }

    // ==========================================
    // Create Maintenance
    // ==========================================

    const maintenance = await this.prisma.maintenance.create({
      data: {
        communityId,

        maintenanceNumber: dto.maintenanceNumber,
        title: dto.title,
        description: dto.description,

        category: dto.category,
        priority: dto.priority ?? 'MEDIUM',

        facilityId: dto.facilityId,
        assignedToId: dto.assignedToId,

        cost: dto.cost,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        remarks: dto.remarks,

        status: dto.status ?? MaintenanceStatus.OPEN,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // ==========================================
    // Notify Staff
    // ==========================================

    const staffUserIds = await this.notificationsService.userIdsWithPermission(
      communityId,
      'maintenance.assign',
    );

    await this.notificationsService.notifyMany(
      communityId,
      staffUserIds,
      NotificationType.MAINTENANCE,
      `New maintenance request ${maintenance.maintenanceNumber}`,
      maintenance.title,
      `/maintenance/${maintenance.id}`,
    );

    return {
      success: true,
      message: 'Maintenance request created successfully.',
      data: maintenance,
    };
  }

  // ==========================================
  // Get All Maintenance
  // ==========================================

  async findAll(communityId: string, query: MaintenanceQueryDto) {
    const {
      page,
      limit,
      search,
      category,
      priority,
      status,
      facilityId,
      assignedToId,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          maintenanceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const [maintenances, total] = await this.prisma.$transaction([
      this.prisma.maintenance.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          facility: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.maintenance.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Maintenance requests retrieved successfully.',
      data: maintenances,

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
  // Get Maintenance By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance request not found.');
    }

    return {
      success: true,
      message: 'Maintenance request retrieved successfully.',
      data: maintenance,
    };
  }

  // ==========================================
  // Update Maintenance
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateMaintenanceDto) {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance request not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.maintenanceNumber)
      dto.maintenanceNumber = dto.maintenanceNumber.trim();

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Duplicate Maintenance Number
    // ==========================================

    if (dto.maintenanceNumber) {
      const existing = await this.prisma.maintenance.findFirst({
        where: {
          communityId,
          maintenanceNumber: dto.maintenanceNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Maintenance request already exists.');
      }
    }

    // ==========================================
    // Validate Facility
    // ==========================================

    if (dto.facilityId) {
      const facility = await this.prisma.facility.findFirst({
        where: {
          id: dto.facilityId,
          communityId,
          deletedAt: null,
        },
      });

      if (!facility) {
        throw new NotFoundException('Facility not found.');
      }
    }

    // ==========================================
    // Validate Assigned Staff
    // ==========================================

    if (dto.assignedToId) {
      const staff = await this.prisma.staff.findFirst({
        where: {
          id: dto.assignedToId,
          communityId,
          deletedAt: null,
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff member not found.');
      }
    }

    // ==========================================
    // Update Maintenance
    // ==========================================

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: {
        id,
      },

      data: {
        ...(dto.maintenanceNumber && {
          maintenanceNumber: dto.maintenanceNumber,
        }),

        ...(dto.title && { title: dto.title }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.category && { category: dto.category }),

        ...(dto.priority && { priority: dto.priority }),

        ...(dto.facilityId !== undefined && {
          facilityId: dto.facilityId,
        }),

        ...(dto.assignedToId !== undefined && {
          assignedToId: dto.assignedToId,
        }),

        ...(dto.cost !== undefined && { cost: dto.cost }),

        ...(dto.scheduledAt && {
          scheduledAt: new Date(dto.scheduledAt),
        }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
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
      message: 'Maintenance request updated successfully.',
      data: updatedMaintenance,
    };
  }

  // ==========================================
  // Delete Maintenance (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance request not found.');
    }

    await this.prisma.maintenance.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Maintenance request deleted successfully.',
    };
  }

  // ==========================================
  // Assign Maintenance
  // ==========================================

  async assign(communityId: string, id: string, staffId: string) {
    const maintenance = await this.findScoped(communityId, id);

    if (
      maintenance.status === MaintenanceStatus.RESOLVED ||
      maintenance.status === MaintenanceStatus.CANCELLED
    ) {
      throw new ConflictException('Maintenance request cannot be assigned.');
    }

    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        communityId,
        deletedAt: null,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found.');
    }

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: {
        id,
      },

      data: {
        assignedToId: staffId,
        status: MaintenanceStatus.ASSIGNED,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // ==========================================
    // Notify Staff
    // ==========================================

    const staffUserIds = await this.notificationsService.userIdsWithPermission(
      communityId,
      'maintenance.assign',
    );

    await this.notificationsService.notifyMany(
      communityId,
      staffUserIds,
      NotificationType.MAINTENANCE,
      `Maintenance request ${maintenance.maintenanceNumber} assigned`,
      `${maintenance.title} was assigned to ${staff.firstName} ${staff.lastName}.`,
      `/maintenance/${maintenance.id}`,
    );

    return {
      success: true,
      message: 'Maintenance request assigned successfully.',
      data: updatedMaintenance,
    };
  }

  // ==========================================
  // Mark In Progress
  // ==========================================

  async start(communityId: string, id: string) {
    const maintenance = await this.findScoped(communityId, id);

    if (
      maintenance.status !== MaintenanceStatus.ASSIGNED &&
      maintenance.status !== MaintenanceStatus.OPEN
    ) {
      throw new BadRequestException(
        'Only OPEN or ASSIGNED requests can be started.',
      );
    }

    return this.updateStatus(communityId, id, MaintenanceStatus.IN_PROGRESS);
  }

  // ==========================================
  // Mark Resolved
  // ==========================================

  async resolve(communityId: string, id: string) {
    const maintenance = await this.findScoped(communityId, id);

    if (
      maintenance.status !== MaintenanceStatus.IN_PROGRESS &&
      maintenance.status !== MaintenanceStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        'Only IN_PROGRESS or ASSIGNED requests can be resolved.',
      );
    }

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: {
        id,
      },

      data: {
        status: MaintenanceStatus.RESOLVED,
        completedAt: new Date(),
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
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
      message: 'Maintenance request resolved successfully.',
      data: updatedMaintenance,
    };
  }

  // ==========================================
  // Cancel Maintenance
  // ==========================================

  async cancel(communityId: string, id: string) {
    const maintenance = await this.findScoped(communityId, id);

    if (
      maintenance.status === MaintenanceStatus.RESOLVED ||
      maintenance.status === MaintenanceStatus.CANCELLED
    ) {
      throw new ConflictException('Maintenance request cannot be cancelled.');
    }

    return this.updateStatus(communityId, id, MaintenanceStatus.CANCELLED);
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance request not found.');
    }

    return maintenance;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: MaintenanceStatus,
  ) {
    const maintenance = await this.prisma.maintenance.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
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
      message: `Maintenance request ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: maintenance,
    };
  }
}
