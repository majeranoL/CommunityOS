import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AssessmentStatus, HouseholdStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceSyncService } from './finance-sync.service';

import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import { GenerateAssessmentsDto } from './dto/generate-assessments.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

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
  // Generate Assessments (bulk monthly dues)
  // One assessment per ACTIVE household
  // ==========================================

  async generate(communityId: string, dto: GenerateAssessmentsDto) {
    const { title, amount, dueDate, period, householdIds } = dto;

    const where: any = {
      communityId,
      deletedAt: null,
      status: HouseholdStatus.ACTIVE,
    };

    if (householdIds?.length) {
      where.id = { in: householdIds };
    }

    const households = await this.prisma.household.findMany({
      where,
      select: { id: true },
    });

    if (households.length === 0) {
      throw new BadRequestException('No active households to bill.');
    }

    let eligibleIds = households.map((household) => household.id);
    let skippedCount = 0;

    // Dedupe: households that already carry a non-cancelled assessment
    // for this period are skipped so re-running doesn't double-bill
    if (period) {
      const existing = await this.prisma.assessment.findMany({
        where: {
          communityId,
          deletedAt: null,
          period,
          householdId: { in: eligibleIds },
          status: { not: AssessmentStatus.CANCELLED },
        },
        select: { householdId: true },
      });

      const claimed = new Set(
        existing.map((assessment) => assessment.householdId),
      );
      const before = eligibleIds.length;
      eligibleIds = eligibleIds.filter((id) => !claimed.has(id));
      skippedCount = before - eligibleIds.length;
    }

    if (eligibleIds.length === 0) {
      throw new ConflictException(
        'All selected households already have an assessment for this period.',
      );
    }

    // Next assessment numbers
    const latest = await this.prisma.assessment.findFirst({
      where: { communityId },
      orderBy: { assessmentNumber: 'desc' },
      select: { assessmentNumber: true },
    });

    let nextNumber = 0;
    if (latest) {
      const parsed = parseInt(latest.assessmentNumber.replace(/^ASS-/, ''), 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed;
    }

    const due = new Date(dueDate);
    const created: Prisma.AssessmentGetPayload<{
      include: {
        household: {
          select: {
            id: true;
            block: true;
            lot: true;
            unit: true;
          };
        };
      };
    }>[] = [];

    for (const householdId of eligibleIds) {
      nextNumber += 1;

      const assessment = await this.prisma.assessment.create({
        data: {
          communityId,
          assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
          title: title.trim(),
          description: dto.description?.trim(),
          householdId,
          amount,
          dueDate: due,
          period: period?.trim(),
          remarks: dto.remarks?.trim(),
          status: AssessmentStatus.ISSUED,
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

      created.push(assessment);
    }

    return {
      success: true,
      message: `Generated ${created.length} assessment${
        created.length === 1 ? '' : 's'
      }.`,
      data: {
        created,
        createdCount: created.length,
        skippedCount,
      },
    };
  }

  // ==========================================
  // Get All Assessments
  // ==========================================

  async findAll(
    communityId: string,
    query: AssessmentQueryDto,
    scopeHouseholdId?: string,
  ) {
    await this.financeSyncService.sweepOverdue(communityId);

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

    // Household scoping: a forced scope (member sees only their own
    // household) overrides any client-supplied household filter
    if (scopeHouseholdId) {
      where.householdId = scopeHouseholdId;
    } else if (householdId) {
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
    await this.financeSyncService.sweepOverdue(communityId);

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

    // ==========================================
    // Recompute paidAmount / status when the
    // amount changes (stored paidAmount would drift)
    // ==========================================

    if (dto.amount !== undefined) {
      await this.financeSyncService.syncAssessment(communityId, id);
    }

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
