import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  HouseholdMembershipStatus,
  HouseholdStatus,
  HouseholdAcquisitionRequestStatus,
  HouseholdRelationshipType,
  PaymentStatus,
  ResidentStatus,
  ResidentType,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';
import { AuditLogsService } from '../auditlogs/audit-logs.service';
import {
  DEFAULT_DELINQUENCY_THRESHOLD_MONTHS,
  GOOD_BAD_STANDING_FEATURE,
} from '../features/feature.constants';

import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { HouseholdQueryDto } from './dto/household-query.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { HouseholdSearchQueryDto } from './dto/household-search-query.dto';
import { CreateHouseholdAcquisitionRequestDto } from './dto/create-household-acquisition-request.dto';
import { ReviewHouseholdAcquisitionRequestDto } from './dto/review-household-acquisition-request.dto';

type HouseholdStanding = 'GOOD' | 'BAD';

export interface HouseholdFinanceSummary {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  monthsBehind: number;
  standing: HouseholdStanding;
}

export interface FinanceAssessmentInput {
  householdId: string;
  amount: number;
  discountAmount?: number;
  dueDate: Date;
  status: AssessmentStatus;
}

/**
 * Pure computation of the per-household finance summary. The caller feeds
 * billed (non-DRAFT / non-CANCELLED) assessments and the CONFIRMED payments
 * (keyed by household) fetched from the database; this function derives the
 * outstanding balance, months-behind count and GOOD/BAD standing.
 *
 * A household is BAD standing once it reaches the configured balance threshold
 * of unpaid balance across any billed assessments (default ₱10,000), or once
 * it has unpaid assessments in the configured delinquency threshold of distinct
 * calendar months (default 4; year-month buckets of their due dates).
 */
export function summarizeFinance(
  householdIds: string[],
  assessments: FinanceAssessmentInput[],
  paidByHousehold: Map<string, number>,
  now: Date = new Date(),
  delinquencyThresholdMonths: number = 3,
): Map<string, HouseholdFinanceSummary> {
  const summary = new Map<string, HouseholdFinanceSummary>();

  for (const id of householdIds) {
    summary.set(id, {
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
      monthsBehind: 0,
      standing: 'GOOD',
    });
  }

  const overdueMonths = new Map<string, Set<string>>();

  for (const assessment of assessments) {
    const entry = summary.get(assessment.householdId);
    if (!entry) continue;

    entry.totalBilled += Math.max(
      assessment.amount - (assessment.discountAmount ?? 0),
      0,
    );

    const isUnpaid =
      assessment.status === AssessmentStatus.ISSUED ||
      assessment.status === AssessmentStatus.PARTIALLY_PAID ||
      assessment.status === AssessmentStatus.OVERDUE;

    if (isUnpaid && assessment.dueDate < now) {
      const key = `${assessment.dueDate.getFullYear()}-${assessment.dueDate.getMonth()}`;

      if (!overdueMonths.has(assessment.householdId)) {
        overdueMonths.set(assessment.householdId, new Set());
      }

      overdueMonths.get(assessment.householdId)!.add(key);
    }
  }

  for (const [householdId, paid] of paidByHousehold) {
    const entry = summary.get(householdId);
    if (entry) {
      entry.totalPaid += paid;
    }
  }

  for (const [householdId, entry] of summary) {
    entry.outstanding = entry.totalBilled - entry.totalPaid;
    entry.monthsBehind = overdueMonths.get(householdId)?.size ?? 0;

    entry.standing =
      entry.monthsBehind >= delinquencyThresholdMonths ? 'BAD' : 'GOOD';
  }

  return summary;
}

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // ==========================================
  // Deactivate Linked Account (User status)
  // ==========================================

  private async deactivateLinkedAccounts(householdId: string) {
    const linkedUsers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
        resident: {
          householdId,
        },
      },
      select: { id: true },
    });

    if (linkedUsers.length === 0) return;

    await this.prisma.user.updateMany({
      where: {
        id: { in: linkedUsers.map((user) => user.id) },
      },
      data: {
        status: UserStatus.INACTIVE,
      },
    });
  }

  // ==========================================
  // Finance summary per household
  // (billed / paid / outstanding / standing)
  // ==========================================

  private async financeSummary(
    communityId: string,
    householdIds: string[],
  ): Promise<Map<string, HouseholdFinanceSummary>> {
    const [assessments, payments] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where: {
          communityId,
          householdId: { in: householdIds },
          deletedAt: null,
          status: {
            notIn: [AssessmentStatus.DRAFT, AssessmentStatus.CANCELLED],
          },
        },
        select: {
          householdId: true,
          amount: true,
          discountAmount: true,
          dueDate: true,
          status: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          communityId,
          deletedAt: null,
          status: PaymentStatus.VERIFIED,
          allocations: {
            some: {
              reversedAt: null,
              assessment: {
                householdId: { in: householdIds },
                deletedAt: null,
              },
            },
          },
        },
        select: {
          allocations: {
            where: { reversedAt: null },
            select: {
              allocatedAmount: true,
              assessment: {
                select: {
                  householdId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const paidByHousehold = new Map<string, number>();

    for (const payment of payments) {
      for (const allocation of payment.allocations) {
        const householdId = allocation.assessment.householdId;
        paidByHousehold.set(
          householdId,
          (paidByHousehold.get(householdId) ?? 0) +
            allocation.allocatedAmount.toNumber(),
        );
      }
    }

    const config = await this.featuresService.getConfig(
      communityId,
      GOOD_BAD_STANDING_FEATURE,
    );

    const delinquencyThresholdMonths =
      typeof config.delinquencyThresholdMonths === 'number' &&
      Number.isFinite(config.delinquencyThresholdMonths) &&
      config.delinquencyThresholdMonths > 0
        ? config.delinquencyThresholdMonths
        : DEFAULT_DELINQUENCY_THRESHOLD_MONTHS;

    return summarizeFinance(
      householdIds,
      assessments.map((assessment) => ({
        householdId: assessment.householdId,
        amount: assessment.amount.toNumber(),
        discountAmount: assessment.discountAmount.toNumber(),
        dueDate: assessment.dueDate,
        status: assessment.status,
      })),
      paidByHousehold,
      new Date(),
      delinquencyThresholdMonths,
    );
  }

  // ==========================================
  // Good/Bad Standing (feature-aware helper)
  // ==========================================

  async getHouseholdStanding(communityId: string, householdId: string) {
    const finance = await this.financeSummary(communityId, [householdId]);
    return finance.get(householdId) ?? null;
  }

  // ==========================================
  // Create Household
  // ==========================================

  async create(communityId: string, dto: CreateHouseholdDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.block = dto.block?.trim();
    dto.lot = dto.lot?.trim();
    dto.unit = dto.unit?.trim();
    dto.address = dto.address?.trim();

    // ==========================================
    // Duplicate Block/Lot
    // ==========================================

    if (dto.block && dto.lot) {
      const existing = await this.prisma.household.findFirst({
        where: {
          communityId,
          block: dto.block,
          lot: dto.lot,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException('Household already exists.');
      }
    }

    // ==========================================
    // Create Household
    // ==========================================

    const household = await this.prisma.household.create({
      data: {
        communityId,

        block: dto.block,
        lot: dto.lot,
        unit: dto.unit,
        address: dto.address,

        status: dto.status ?? HouseholdStatus.ACTIVE,
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Household created successfully.',
      data: household,
    };
  }

  // ==========================================
  // Get All Households
  // ==========================================

  async findAll(communityId: string, query: HouseholdQueryDto) {
    const { page, limit, search, block, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          block: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lot: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          unit: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          address: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (block) {
      where.block = block;
    }

    const [households, total] = await this.prisma.$transaction([
      this.prisma.household.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          block: true,
          lot: true,
          unit: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              residents: true,
            },
          },
        },
      }),

      this.prisma.household.count({
        where,
      }),
    ]);

    const finance = await this.financeSummary(
      communityId,
      households.map((household) => household.id),
    );

    return {
      success: true,
      message: 'Households retrieved successfully.',
      data: households.map((household) => ({
        ...household,
        residentCount: household._count.residents,
        _count: undefined,
        finance: finance.get(household.id),
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
  // Get Distinct Block Options (for filters)
  // ==========================================

  async getBlockOptions(communityId: string) {
    const blocks = await this.prisma.household.findMany({
      where: {
        communityId,
        deletedAt: null,
        NOT: {
          OR: [{ block: null }, { block: '' }],
        },
      },
      distinct: ['block'],
      select: {
        block: true,
      },
      orderBy: {
        block: 'asc',
      },
    });

    return {
      success: true,
      message: 'Household blocks retrieved successfully.',
      data: blocks
        .map((row) => row.block)
        .filter((value): value is string => value !== null),
    };
  }

  // ==========================================
  // Get Household By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        residents: {
          select: {
            id: true,
            residentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            status: true,
            residentType: true,
            movedOutAt: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                referenceNumber: true,
                firstName: true,
                lastName: true,
                status: true,
                account: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },

        assessments: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
            period: true,
            amount: true,
            discountAmount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
            payments: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                paymentNumber: true,
                amount: true,
                paymentDate: true,
                method: true,
                referenceNumber: true,
                status: true,
              },
              orderBy: {
                paymentDate: 'desc',
              },
            },
          },
          orderBy: {
            dueDate: 'desc',
          },
        },
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    // ==========================================
    // Derived Occupancy History
    // ==========================================

    const residents = household.residents;

    const occupancyHistory = {
      current: residents.filter((resident) => resident.status === 'ACTIVE'),
      former: residents.filter((resident) => resident.status !== 'ACTIVE'),
      total: residents.length,
      owner: residents.find(
        (resident) =>
          resident.status === 'ACTIVE' && resident.residentType === 'OWNER',
      ),
    };

    const finance = (await this.financeSummary(communityId, [id])).get(id);

    return {
      success: true,
      message: 'Household retrieved successfully.',
      data: {
        ...household,
        occupancyHistory,
        finance,
      },
    };
  }

  // ==========================================
  // Switch Active Household (self-service)
  // The user's Resident.householdId becomes the
  // default app context (session) for the next request.
  // Only ACTIVE memberships on ACTIVE households.
  // ==========================================

  async switchHousehold(
    communityId: string,
    userId: string,
    householdId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        communityId,
        deletedAt: null,
      },
      select: {
        id: true,
        residentId: true,
      },
    });

    if (!user?.residentId) {
      throw new ForbiddenException('No resident is linked to your account.');
    }

    const membership = await this.prisma.residentHousehold.findFirst({
      where: {
        communityId,
        residentId: user.residentId,
        householdId,
        status: HouseholdMembershipStatus.ACTIVE,
        household: {
          deletedAt: null,
        },
      },
      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
            status: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not an active member of this household.',
      );
    }

    if (membership.household.status !== HouseholdStatus.ACTIVE) {
      throw new ConflictException(
        'This household is inactive and cannot be selected.',
      );
    }

    await this.prisma.resident.update({
      where: {
        id: user.residentId,
      },
      data: {
        householdId,
      },
    });

    return {
      success: true,
      message: 'Household switched successfully.',
      data: {
        id: membership.household.id,
        block: membership.household.block,
        lot: membership.household.lot,
        unit: membership.household.unit,
        address: membership.household.address,
      },
    };
  }

  async searchMemberHouseholds(
    communityId: string,
    query: HouseholdSearchQueryDto,
  ) {
    const search = query.search.trim();
    const households = await this.prisma.household.findMany({
      where: {
        communityId,
        status: HouseholdStatus.ACTIVE,
        deletedAt: null,
        OR: [
          { block: { contains: search, mode: 'insensitive' } },
          { lot: { contains: search, mode: 'insensitive' } },
          { unit: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true, block: true, lot: true, unit: true, address: true },
      take: 20,
      orderBy: [{ block: 'asc' }, { lot: 'asc' }],
    });
    return { success: true, data: households };
  }

  async acquisitionRequests(communityId: string, userId: string, includeAll: boolean) {
    const requests = await this.prisma.householdAcquisitionRequest.findMany({
      where: { communityId, ...(includeAll ? {} : { requestedById: userId }) },
      include: {
        household: { select: { id: true, block: true, lot: true, unit: true, address: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: requests };
  }

  async createAcquisitionRequest(
    communityId: string,
    userId: string,
    dto: CreateHouseholdAcquisitionRequestDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, communityId, deletedAt: null },
      select: { residentId: true },
    });
    if (!user?.residentId) throw new ForbiddenException('Only resident accounts can request a household.');
    if (!dto.householdId && !dto.requestedAddress && !dto.requestedBlock && !dto.requestedLot && !dto.requestedUnit) {
      throw new BadRequestException('Select an existing household or provide the new property details.');
    }
    if (dto.householdId) {
      const household = await this.prisma.household.findFirst({
        where: { id: dto.householdId, communityId, status: HouseholdStatus.ACTIVE, deletedAt: null },
      });
      if (!household) throw new NotFoundException('Household not found.');
      const existing = await this.prisma.residentHousehold.findUnique({
        where: { communityId_residentId_householdId: { communityId, residentId: user.residentId, householdId: dto.householdId } },
      });
      if (existing?.status === HouseholdMembershipStatus.ACTIVE) throw new ConflictException('You are already linked to this household.');
    }
    const pending = await this.prisma.householdAcquisitionRequest.findFirst({
      where: { communityId, requestedById: userId, status: HouseholdAcquisitionRequestStatus.PENDING, householdId: dto.householdId ?? null },
    });
    if (pending) throw new ConflictException('You already have a pending request for this household.');
    const request = await this.prisma.householdAcquisitionRequest.create({
      data: {
        communityId,
        requestedById: userId,
        residentId: user.residentId,
        householdId: dto.householdId,
        requestedBlock: dto.requestedBlock?.trim(),
        requestedLot: dto.requestedLot?.trim(),
        requestedUnit: dto.requestedUnit?.trim(),
        requestedAddress: dto.requestedAddress?.trim(),
        notes: dto.notes?.trim(),
      },
    });
    await this.auditLogs.log({ communityId, actorId: userId, action: 'HOUSEHOLD_ACQUISITION_REQUESTED', entity: 'HouseholdAcquisitionRequest', entityId: request.id, after: request as any });
    return { success: true, data: request };
  }

  async reviewAcquisitionRequest(
    communityId: string,
    requestId: string,
    reviewerId: string,
    dto: ReviewHouseholdAcquisitionRequestDto,
  ) {
    const request = await this.prisma.householdAcquisitionRequest.findFirst({
      where: { id: requestId, communityId, status: HouseholdAcquisitionRequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Pending household request not found.');
    if (![HouseholdAcquisitionRequestStatus.APPROVED, HouseholdAcquisitionRequestStatus.REJECTED].includes(dto.status)) {
      throw new BadRequestException('Request must be approved or rejected.');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      let householdId = request.householdId;
      if (dto.status === HouseholdAcquisitionRequestStatus.APPROVED) {
        if (!householdId) {
          const created = await tx.household.create({
            data: {
              communityId,
              block: request.requestedBlock,
              lot: request.requestedLot,
              unit: request.requestedUnit,
              address: request.requestedAddress,
            },
          });
          householdId = created.id;
        }
        const resident = await tx.resident.findUnique({ where: { id: request.residentId }, select: { householdId: true, primaryHouseholdId: true } });
        const existing = await tx.residentHousehold.findUnique({ where: { communityId_residentId_householdId: { communityId, residentId: request.residentId, householdId } } });
        if (!existing) {
          await tx.residentHousehold.create({
            data: {
              communityId,
              residentId: request.residentId,
              householdId,
              relationshipType: HouseholdRelationshipType.OWNER,
              isPrimary: !resident?.primaryHouseholdId,
              status: HouseholdMembershipStatus.ACTIVE,
            },
          });
        } else {
          await tx.residentHousehold.update({ where: { id: existing.id }, data: { status: HouseholdMembershipStatus.ACTIVE } });
        }
        if (!resident?.householdId) {
          await tx.resident.update({ where: { id: request.residentId }, data: { householdId, primaryHouseholdId: householdId } });
        }
      }
      return tx.householdAcquisitionRequest.update({ where: { id: requestId }, data: { status: dto.status, reviewedById: reviewerId, reviewedAt: new Date(), reviewNotes: dto.reviewNotes?.trim(), householdId } });
    });
    await this.auditLogs.log({ communityId, actorId: reviewerId, action: `HOUSEHOLD_ACQUISITION_${dto.status}`, entity: 'HouseholdAcquisitionRequest', entityId: requestId, after: result as any });
    return { success: true, data: result };
  }

  // ==========================================
  // Transfer Ownership
  // ==========================================

  async transferOwnership(
    communityId: string,
    id: string,
    dto: TransferOwnershipDto,
  ) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    const newOwner = await this.prisma.resident.findFirst({
      where: {
        id: dto.newOwnerResidentId,
        communityId,
        householdId: id,
        deletedAt: null,
      },
    });

    if (!newOwner) {
      throw new NotFoundException(
        'The selected resident is not part of this household.',
      );
    }

    if (newOwner.status !== ResidentStatus.ACTIVE) {
      throw new ConflictException(
        'Ownership can only be transferred to an active resident.',
      );
    }

    // ==========================================
    // Transaction: current owner(s) → RENTER, new owner → OWNER
    // ==========================================

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.resident.updateMany({
        where: {
          communityId,
          householdId: id,
          status: ResidentStatus.ACTIVE,
          residentType: ResidentType.OWNER,
        },
        data: {
          residentType: ResidentType.RENTER,
        },
      });

      return tx.resident.update({
        where: {
          id: newOwner.id,
        },
        data: {
          residentType: ResidentType.OWNER,
        },
        select: {
          id: true,
          residentNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          residentType: true,
        },
      });
    });

    return {
      success: true,
      message: `Ownership transferred to ${updated.firstName} ${updated.lastName}.`,
      data: updated,
    };
  }

  // ==========================================
  // Update Household
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateHouseholdDto) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.block) dto.block = dto.block.trim();

    if (dto.lot) dto.lot = dto.lot.trim();

    if (dto.unit) dto.unit = dto.unit.trim();

    if (dto.address) dto.address = dto.address.trim();

    // ==========================================
    // Duplicate Block/Lot
    // ==========================================

    if (dto.block && dto.lot) {
      const existing = await this.prisma.household.findFirst({
        where: {
          communityId,
          block: dto.block,
          lot: dto.lot,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Household already exists.');
      }
    }

    // ==========================================
    // Status Transition: ACTIVE → INACTIVE
    // auto-deactivates the linked account
    // ==========================================

    const previousStatus = household.status;
    const nextStatus = dto.status ?? previousStatus;

    if (
      previousStatus === HouseholdStatus.ACTIVE &&
      nextStatus === HouseholdStatus.INACTIVE
    ) {
      await this.deactivateLinkedAccounts(id);
    }

    // ==========================================
    // Update Household
    // ==========================================

    const updatedHousehold = await this.prisma.household.update({
      where: {
        id,
      },

      data: {
        ...(dto.block !== undefined && {
          block: dto.block,
        }),

        ...(dto.lot !== undefined && {
          lot: dto.lot,
        }),

        ...(dto.unit !== undefined && {
          unit: dto.unit,
        }),

        ...(dto.address !== undefined && {
          address: dto.address,
        }),

        ...(dto.status && { status: dto.status }),
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Household updated successfully.',
      data: updatedHousehold,
    };
  }

  // ==========================================
  // Deactivate Household
  // An inactive household will no longer be
  // included in recurring dues, utility billing,
  // or any automated payment generation.
  // ==========================================

  async deactivate(communityId: string, id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    if (household.status === HouseholdStatus.INACTIVE) {
      throw new BadRequestException('Household is already inactive.');
    }

    // ==========================================
    // Deactivate linked member accounts
    // ==========================================

    await this.deactivateLinkedAccounts(id);

    // ==========================================
    // Update Household status
    // ==========================================

    const updatedHousehold = await this.prisma.household.update({
      where: {
        id,
      },

      data: {
        status: HouseholdStatus.INACTIVE,
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message:
        'Household deactivated. It will no longer be included in recurring payments or other assessments.',
      data: updatedHousehold,
    };
  }

  // ==========================================
  // Reactivate Household
  // Restores an inactive household so it will
  // be included again in recurring payments.
  // ==========================================

  async reactivate(communityId: string, id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    if (household.status === HouseholdStatus.ACTIVE) {
      throw new BadRequestException('Household is already active.');
    }

    const updatedHousehold = await this.prisma.household.update({
      where: {
        id,
      },

      data: {
        status: HouseholdStatus.ACTIVE,
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message:
        'Household reactivated. It will be included again in recurring payments.',
      data: updatedHousehold,
    };
  }

  // ==========================================
  // Delete Household (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    if (household.status === HouseholdStatus.ACTIVE) {
      await this.deactivateLinkedAccounts(id);
    }

    await this.prisma.household.update({
      where: {
        id,
      },

      data: {
        status: HouseholdStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Household deleted successfully.',
    };
  }
}
