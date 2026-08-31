import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomBytes } from 'crypto';

import { AssessmentStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';

import {
  DEFAULT_DELINQUENCY_THRESHOLD_MONTHS,
  GOOD_BAD_STANDING_FEATURE,
} from '../features/feature.constants';

import { summarizeFinance } from '../households/households.service';

const QR_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class GoodStandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

  async generate(communityId: string, householdId: string) {
    const household = await this.prisma.household.findFirst({
      where: { id: householdId, communityId, deletedAt: null },
      select: { id: true },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    const standing = await this.currentStanding(communityId, householdId);

    if (standing === 'BAD') {
      throw new ForbiddenException(
        'Your household is in bad standing. Please pay your dues first.',
      );
    }

    const expiresAt = new Date(Date.now() + QR_TOKEN_TTL_MS);

    const qr = await this.prisma.goodStandingQR.create({
      data: {
        communityId,
        householdId,
        token: randomBytes(18).toString('hex'),
        standing,
        expiresAt,
      },
      select: {
        token: true,
        standing: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return { ...qr, householdId };
  }

  async verify(communityId: string, token: string, verifiedById: string) {
    const qr = await this.prisma.goodStandingQR.findFirst({
      where: { communityId, token },
      include: {
        household: {
          include: {
            residents: {
              where: { status: 'ACTIVE' },
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                suffix: true,
              },
            },
          },
        },
      },
    });

    if (!qr || qr.expiresAt <= new Date()) {
      throw new NotFoundException('QR code not found or has expired.');
    }

    const standing = await this.currentStanding(communityId, qr.householdId);

    await this.prisma.goodStandingQR.update({
      where: { id: qr.id },
      data: { verifiedAt: new Date(), verifiedById },
    });

    const household = qr.household;

    return {
      token: qr.token,
      standing,
      issuedStanding: qr.standing,
      expiresAt: qr.expiresAt,
      household: {
        id: household.id,
        block: household.block,
        lot: household.lot,
        unit: household.unit,
        address: household.address,
        residents: household.residents.map((resident) => ({
          fullName: [
            resident.firstName,
            resident.middleName,
            resident.lastName,
            resident.suffix,
          ]
            .filter(Boolean)
            .join(' '),
        })),
      },
    };
  }

  private async currentStanding(
    communityId: string,
    householdId: string,
  ): Promise<'GOOD' | 'BAD'> {
    const [assessments, payments] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where: {
          communityId,
          householdId,
          deletedAt: null,
          status: {
            notIn: [AssessmentStatus.DRAFT, AssessmentStatus.CANCELLED],
          },
        },
        select: {
          householdId: true,
          amount: true,
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
                householdId,
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
              assessment: { select: { householdId: true } },
            },
          },
        },
      }),
    ]);

    const paidByHousehold = new Map<string, number>();

    for (const payment of payments) {
      for (const allocation of payment.allocations) {
        const allocationHouseholdId = allocation.assessment.householdId;
        paidByHousehold.set(
          allocationHouseholdId,
          (paidByHousehold.get(allocationHouseholdId) ?? 0) +
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

    const summary = summarizeFinance(
      [householdId],
      assessments.map((assessment) => ({
        householdId: assessment.householdId,
        amount: assessment.amount.toNumber(),
        dueDate: assessment.dueDate,
        status: assessment.status,
      })),
      paidByHousehold,
      new Date(),
      delinquencyThresholdMonths,
    );

    return summary.get(householdId)!.standing;
  }
}
