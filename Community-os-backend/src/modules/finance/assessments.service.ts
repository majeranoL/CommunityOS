import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AssessmentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentQueryDto } from './dto/assessment-query.dto';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Assessment
  // ==========================================

  async create(communityId: string, dto: CreateAssessmentDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.assessmentNumber = dto.assessmentNumber.trim();
    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();
    dto.period = dto.period?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Duplicate Assessment Number
    // ==========================================

    const existing = await this.prisma.assessment.findFirst({
      where: {
        communityId,
        assessmentNumber: dto.assessmentNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Assessment already exists.');
    }

    // ==========================================
    // Validate Household
    // ==========================================

    const household = await this.prisma.household.findFirst({
      where: {
        id: dto.householdId,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    // ==========================================
    // Create Assessment
    // ==========================================

    const assessment = await this.prisma.assessment.create({
      data: {
        communityId,

        assessmentNumber: dto.assessmentNumber,
        title: dto.title,
        description: dto.description,
        householdId: dto.householdId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        period: dto.period,
        remarks: dto.remarks,

        status: dto.status ?? AssessmentStatus.DRAFT,
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Assessment created successfully.',
      data: assessment,
    };
  }

  // ==========================================
  // Get All Assessments
  // ==========================================

  async findAll(communityId: string, query: AssessmentQueryDto) {
    const { page, limit, search, status, householdId, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          assessmentNumber: {
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
          period: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (householdId) {
      where.householdId = householdId;
    }

    const [assessments, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          household: {
            select: {
              id: true,
              block: true,
              lot: true,
              unit: true,
            },
          },
        },
      }),

      this.prisma.assessment.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Assessments retrieved successfully.',
      data: assessments,

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
  // Get Assessment By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            method: true,
            status: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    return {
      success: true,
      message: 'Assessment retrieved successfully.',
      data: assessment,
    };
  }

  // ==========================================
  // Update Assessment
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateAssessmentDto) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.assessmentNumber)
      dto.assessmentNumber = dto.assessmentNumber.trim();

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.period) dto.period = dto.period.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Duplicate Assessment Number
    // ==========================================

    if (dto.assessmentNumber) {
      const existing = await this.prisma.assessment.findFirst({
        where: {
          communityId,
          assessmentNumber: dto.assessmentNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Assessment already exists.');
      }
    }

    // ==========================================
    // Validate Household
    // ==========================================

    if (dto.householdId) {
      const household = await this.prisma.household.findFirst({
        where: {
          id: dto.householdId,
          communityId,
          deletedAt: null,
        },
      });

      if (!household) {
        throw new NotFoundException('Household not found.');
      }
    }

    // ==========================================
    // Update Assessment
    // ==========================================

    const updatedAssessment = await this.prisma.assessment.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentNumber && {
          assessmentNumber: dto.assessmentNumber,
        }),

        ...(dto.title && { title: dto.title }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.householdId && {
          householdId: dto.householdId,
        }),

        ...(dto.amount !== undefined && {
          amount: dto.amount,
        }),

        ...(dto.dueDate && {
          dueDate: new Date(dto.dueDate),
        }),

        ...(dto.period !== undefined && {
          period: dto.period,
        }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Assessment updated successfully.',
      data: updatedAssessment,
    };
  }

  // ==========================================
  // Delete Assessment (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    await this.prisma.assessment.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Assessment deleted successfully.',
    };
  }

  // ==========================================
  // Issue Assessment
  // ==========================================

  async issue(communityId: string, id: string) {
    const assessment = await this.findScoped(communityId, id);

    if (
      assessment.status !== AssessmentStatus.DRAFT &&
      assessment.status !== AssessmentStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Only DRAFT or CANCELLED assessments can be issued.',
      );
    }

    return this.updateStatus(communityId, id, AssessmentStatus.ISSUED);
  }

  // ==========================================
  // Cancel Assessment
  // ==========================================

  async cancel(communityId: string, id: string) {
    const assessment = await this.findScoped(communityId, id);

    if (
      assessment.status === AssessmentStatus.PAID ||
      assessment.status === AssessmentStatus.CANCELLED
    ) {
      throw new ConflictException('Assessment cannot be cancelled.');
    }

    return this.updateStatus(communityId, id, AssessmentStatus.CANCELLED);
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    return assessment;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: AssessmentStatus,
  ) {
    const assessment = await this.prisma.assessment.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Assessment ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: assessment,
    };
  }
}
