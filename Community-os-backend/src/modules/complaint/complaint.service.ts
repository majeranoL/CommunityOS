import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { ComplaintStatus, NotificationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ComplaintQueryDto } from './dto/complaint-query.dto';
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // Create Complaint
  // ==========================================

  async create(communityId: string, dto: CreateComplaintDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.title = dto.title.trim();
    dto.description = dto.description.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Validate Resident
    // ==========================================

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

    // ==========================================
    // Generate Complaint Number
    // ==========================================

    const totalComplaints = await this.prisma.complaint.count({
      where: {
        communityId,
      },
    });

    const complaintNumber = `CMP-${String(totalComplaints + 1).padStart(
      6,
      '0',
    )}`;

    // ==========================================
    // Create Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.create({
      data: {
        communityId,
        residentId: dto.residentId,

        complaintNumber,

        title: dto.title,
        description: dto.description,

        category: dto.category,

        priority: dto.priority ?? 'MEDIUM',

        remarks: dto.remarks,
      },

      include: {
        resident: {
          select: {
            id: true,
            residentNumber: true,
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
      'complaint.assign',
    );

    await this.notificationsService.notifyMany(
      communityId,
      staffUserIds,
      NotificationType.COMPLAINT,
      `New complaint ${complaint.complaintNumber}`,
      `${complaint.title} was filed by ${complaint.resident.firstName} ${complaint.resident.lastName}.`,
      `/complaints/${complaint.id}`,
    );

    return {
      success: true,
      message: 'Complaint created successfully.',
      data: complaint,
    };
  }

  async findAll(communityId: string, query: ComplaintQueryDto) {
    // ==========================================
    // Extract Query Parameters
    // ==========================================

    const {
      page,
      limit,
      search,
      status,
      priority,
      category,
      residentId,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    // ==========================================
    // Build Filters
    // ==========================================

    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    if (residentId) {
      where.residentId = residentId;
    }

    if (search) {
      where.OR = [
        {
          complaintNumber: {
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

    // ==========================================
    // Fetch Complaints
    // ==========================================

    const [complaints, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
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

          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.complaint.count({
        where,
      }),
    ]);

    // ==========================================
    // Return Response
    // ==========================================

    return {
      success: true,

      data: complaints.map((complaint) => ({
        id: complaint.id,
        complaintNumber: complaint.complaintNumber,

        title: complaint.title,

        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,

        resident: {
          id: complaint.resident.id,
          fullName: `${complaint.resident.firstName} ${complaint.resident.lastName}`,
        },

        assignedTo: complaint.assignedTo
          ? {
              id: complaint.assignedTo.id,
              fullName: `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}`,
            }
          : null,

        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      })),

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
  // Get Complaint By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    // ==========================================
    // Find Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.findFirst({
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
            middleName: true,
            lastName: true,
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
    // Validate Complaint
    // ==========================================

    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    // ==========================================
    // Return Response
    // ==========================================

    return {
      success: true,
      message: 'Complaint retrieved successfully.',
      data: {
        id: complaint.id,

        complaintNumber: complaint.complaintNumber,

        title: complaint.title,
        description: complaint.description,

        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,

        remarks: complaint.remarks,

        resident: {
          id: complaint.resident.id,
          firstName: complaint.resident.firstName,
          middleName: complaint.resident.middleName,
          lastName: complaint.resident.lastName,
          fullName: `${complaint.resident.firstName} ${
            complaint.resident.middleName
              ? complaint.resident.middleName + ' '
              : ''
          }${complaint.resident.lastName}`,
        },

        assignedTo: complaint.assignedTo
          ? {
              id: complaint.assignedTo.id,
              fullName: `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}`,
            }
          : null,

        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      },
    };
  }

  // ==========================================
  // Update Complaint
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateComplaintDto) {
    // ==========================================
    // Find Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    // ==========================================
    // Validate Resident
    // ==========================================

    if (dto.residentId && dto.residentId !== complaint.residentId) {
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
    // Clean Inputs
    // ==========================================

    if (dto.title) {
      dto.title = dto.title.trim();
    }

    if (dto.description) {
      dto.description = dto.description.trim();
    }

    if (dto.remarks !== undefined) {
      dto.remarks = dto.remarks?.trim();
    }

    // ==========================================
    // Update Complaint
    // ==========================================

    const updatedComplaint = await this.prisma.complaint.update({
      where: {
        id,
      },

      data: {
        ...(dto.residentId && {
          residentId: dto.residentId,
        }),

        ...(dto.title && {
          title: dto.title,
        }),

        ...(dto.description && {
          description: dto.description,
        }),

        ...(dto.category && {
          category: dto.category,
        }),

        ...(dto.priority && {
          priority: dto.priority,
        }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),
      },

      include: {
        resident: {
          select: {
            id: true,
            residentNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // ==========================================
    // Return Response
    // ==========================================

    return {
      success: true,
      message: 'Complaint updated successfully.',
      data: updatedComplaint,
    };
  }

  // ==========================================
  // Delete Complaint (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    // ==========================================
    // Validate Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    // ==========================================
    // Soft Delete Complaint
    // ==========================================

    await this.prisma.complaint.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    // ==========================================
    // Return Response
    // ==========================================

    return {
      success: true,
      message: 'Complaint deleted successfully.',
    };
  }

  // ==========================================
  // Assign Complaint
  // ==========================================

  async assign(communityId: string, id: string, dto: AssignComplaintDto) {
    // ==========================================
    // Validate Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    // ==========================================
    // Ensure Complaint is OPEN
    // ==========================================

    if (complaint.status !== ComplaintStatus.OPEN) {
      throw new BadRequestException('Only OPEN complaints can be assigned.');
    }

    // ==========================================
    // Validate User
    // ==========================================

    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.assignedToId,
        communityId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Assigned user not found.');
    }

    // ==========================================
    // Assign Complaint
    // ==========================================

    const updatedComplaint = await this.prisma.complaint.update({
      where: {
        id,
      },

      data: {
        assignedToId: dto.assignedToId,
        status: ComplaintStatus.IN_PROGRESS,
      },

      include: {
        resident: {
          select: {
            id: true,
            residentNumber: true,
            firstName: true,
            lastName: true,
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
    // Notify Assigned User
    // ==========================================

    await this.notificationsService.notify(
      communityId,
      dto.assignedToId,
      NotificationType.COMPLAINT,
      `Complaint ${complaint.complaintNumber} assigned to you`,
      `${complaint.title} has been assigned to you.`,
      `/complaints/${complaint.id}`,
    );

    // ==========================================
    // Notify Resident
    // ==========================================

    const residentUser = await this.prisma.resident.findFirst({
      where: { id: complaint.residentId, communityId, deletedAt: null },
      include: { user: { select: { id: true } } },
    });

    if (residentUser?.user?.id) {
      await this.notificationsService.notify(
        communityId,
        residentUser.user.id,
        NotificationType.COMPLAINT,
        `Your complaint ${complaint.complaintNumber} is being handled`,
        `Your complaint "${complaint.title}" has been assigned to a staff member.`,
        `/complaints/${complaint.id}`,
      );
    }

    // ==========================================
    // Response
    // ==========================================

    return {
      success: true,
      message: 'Complaint assigned successfully.',
      data: updatedComplaint,
    };
  }

  // ==========================================
  // Resolve Complaint
  // ==========================================

  async resolve(communityId: string, id: string, dto: ResolveComplaintDto) {
    // ==========================================
    // Validate Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    if (complaint.status === ComplaintStatus.RESOLVED) {
      throw new BadRequestException('Complaint is already resolved.');
    }

    if (complaint.status === ComplaintStatus.CLOSED) {
      throw new BadRequestException('CLOSED complaints cannot be resolved.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    const resolutionRemarks = dto.resolutionRemarks?.trim();

    // ==========================================
    // Resolve Complaint
    // ==========================================

    const resolvedComplaint = await this.prisma.complaint.update({
      where: {
        id,
      },

      data: {
        status: ComplaintStatus.RESOLVED,
        resolutionRemarks,
        resolvedAt: new Date(),
      },

      include: {
        resident: {
          select: {
            id: true,
            residentNumber: true,
            firstName: true,
            lastName: true,
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
    // Notify Assigned User
    // ==========================================

    if (complaint.assignedToId) {
      await this.notificationsService.notify(
        communityId,
        complaint.assignedToId,
        NotificationType.COMPLAINT,
        `Complaint ${complaint.complaintNumber} resolved`,
        `${complaint.title} has been resolved.`,
        `/complaints/${complaint.id}`,
      );
    }

    // ==========================================
    // Notify Resident
    // ==========================================

    const resolveResidentUser = await this.prisma.resident.findFirst({
      where: { id: complaint.residentId, communityId, deletedAt: null },
      include: { user: { select: { id: true } } },
    });

    if (resolveResidentUser?.user?.id) {
      await this.notificationsService.notify(
        communityId,
        resolveResidentUser.user.id,
        NotificationType.COMPLAINT,
        `Your complaint ${complaint.complaintNumber} has been resolved`,
        `Your complaint "${complaint.title}" has been resolved.`,
        `/complaints/${complaint.id}`,
      );
    }

    // ==========================================
    // Response
    // ==========================================

    return {
      success: true,
      message: 'Complaint resolved successfully.',
      data: resolvedComplaint,
    };
  }

  // ==========================================
  // Close Complaint
  // ==========================================

  async close(communityId: string, id: string) {
    // ==========================================
    // Validate Complaint
    // ==========================================

    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    if (complaint.status === ComplaintStatus.CLOSED) {
      throw new BadRequestException('Complaint is already closed.');
    }

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      throw new BadRequestException('Only RESOLVED complaints can be closed.');
    }

    // ==========================================
    // Close Complaint
    // ==========================================

    const closedComplaint = await this.prisma.complaint.update({
      where: {
        id,
      },

      data: {
        status: ComplaintStatus.CLOSED,
      },

      include: {
        resident: {
          select: {
            id: true,
            residentNumber: true,
            firstName: true,
            lastName: true,
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
    // Notify Assigned User
    // ==========================================

    if (complaint.assignedToId) {
      await this.notificationsService.notify(
        communityId,
        complaint.assignedToId,
        NotificationType.COMPLAINT,
        `Complaint ${complaint.complaintNumber} closed`,
        `${complaint.title} has been closed.`,
        `/complaints/${complaint.id}`,
      );
    }

    // ==========================================
    // Notify Resident
    // ==========================================

    const closeResidentUser = await this.prisma.resident.findFirst({
      where: { id: complaint.residentId, communityId, deletedAt: null },
      include: { user: { select: { id: true } } },
    });

    if (closeResidentUser?.user?.id) {
      await this.notificationsService.notify(
        communityId,
        closeResidentUser.user.id,
        NotificationType.COMPLAINT,
        `Your complaint ${complaint.complaintNumber} has been closed`,
        `Your complaint "${complaint.title}" has been closed.`,
        `/complaints/${complaint.id}`,
      );
    }

    // ==========================================
    // Response
    // ==========================================

    return {
      success: true,
      message: 'Complaint closed successfully.',
      data: closedComplaint,
    };
  }
}
