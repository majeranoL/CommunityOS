import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ComplaintQueryDto } from './dto/complaint-query.dto';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // Create Complaint
  // ==========================================

  async create(
    communityId: string,
    dto: CreateComplaintDto,
  ) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.title = dto.title.trim();
    dto.description = dto.description.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Validate Resident
    // ==========================================

    const resident =
      await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

    if (!resident) {
      throw new NotFoundException(
        'Resident not found.',
      );
    }

    // ==========================================
    // Generate Complaint Number
    // ==========================================

    const totalComplaints =
      await this.prisma.complaint.count({
        where: {
          communityId,
        },
      });

    const complaintNumber = `CMP-${String(
      totalComplaints + 1,
    ).padStart(6, '0')}`;

    // ==========================================
    // Create Complaint
    // ==========================================

    const complaint =
      await this.prisma.complaint.create({
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

    return {
      success: true,
      message: 'Complaint created successfully.',
      data: complaint,
    };
  }

  // ==========================================
  // Temporary Stubs
  // ==========================================

  async findAll(
    communityId: string,
    query: ComplaintQueryDto,
  ) {

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

    const [complaints, total] =
      await this.prisma.$transaction([

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
          fullName:
            `${complaint.resident.firstName} ${complaint.resident.lastName}`,
        },

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


  async findOne(
    communityId: string,
    id: string,
  ) {

    // ==========================================
    // Find Complaint
    // ==========================================

    const complaint =
      await this.prisma.complaint.findFirst({
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
        },
      });

    // ==========================================
    // Validate Complaint
    // ==========================================

    if (!complaint) {
      throw new NotFoundException(
        'Complaint not found.',
      );
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

        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      },
    };
  }


  // ==========================================
  // Update Complaint
  // ==========================================

  async update(
    communityId: string,
    id: string,
    dto: UpdateComplaintDto,
  ) {

    // ==========================================
    // Find Complaint
    // ==========================================

    const complaint =
      await this.prisma.complaint.findFirst({
        where: {
          id,
          communityId,
          deletedAt: null,
        },
      });

    if (!complaint) {
      throw new NotFoundException(
        'Complaint not found.',
      );
    }

    // ==========================================
    // Validate Resident
    // ==========================================

    if (
      dto.residentId &&
      dto.residentId !== complaint.residentId
    ) {
      const resident =
        await this.prisma.resident.findFirst({
          where: {
            id: dto.residentId,
            communityId,
            deletedAt: null,
          },
        });

      if (!resident) {
        throw new NotFoundException(
          'Resident not found.',
        );
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

    const updatedComplaint =
      await this.prisma.complaint.update({
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

  async remove(
    communityId: string,
    id: string,
  ) {

    // ==========================================
    // Validate Complaint
    // ==========================================

    const complaint =
      await this.prisma.complaint.findFirst({
        where: {
          id,
          communityId,
          deletedAt: null,
        },
      });

    if (!complaint) {
      throw new NotFoundException(
        'Complaint not found.',
      );
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
}