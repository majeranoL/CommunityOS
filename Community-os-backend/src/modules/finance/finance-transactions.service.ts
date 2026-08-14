import { Injectable } from '@nestjs/common';

import { AssessmentStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceTransactionQueryDto } from './dto/finance-transaction-query.dto';

export interface TransactionEntry {
  id: string;
  type: 'payment' | 'charge';
  date: Date;
  description: string;
  category: string;
  amount: number;
  status: string;
  reference?: string;
  household?: { id: string; block: string; lot: string; unit: string } | null;
}

@Injectable()
export class FinanceTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Unified finance ledger: verified payments
  // (cash in) + active assessments (charges out)
  // ==========================================

  async findAll(
    communityId: string,
    query: FinanceTransactionQueryDto,
    scopeHouseholdId?: string,
  ) {
    const { page, limit, category, type, from, to, search } = query;

    const dateFilter =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const [payments, assessments] = await Promise.all([
      type !== 'charge'
        ? this.prisma.payment.findMany({
            where: {
              communityId,
              deletedAt: null,
              status: PaymentStatus.VERIFIED,
              ...(scopeHouseholdId
                ? { resident: { householdId: scopeHouseholdId } }
                : {}),
              ...(query.householdId
                ? { resident: { householdId: query.householdId } }
                : {}),
              ...(dateFilter ? { paymentDate: dateFilter } : {}),
              ...(category
                ? {
                    OR: [
                      { chargeType: { category } },
                      {
                        allocations: {
                          some: {
                            assessment: {
                              chargeType: { category },
                            },
                          },
                        },
                      },
                    ],
                  }
                : {}),
            },
            include: {
              chargeType: { select: { id: true, name: true, category: true } },
              allocations: {
                include: {
                  assessment: {
                    select: {
                      id: true,
                      assessmentNumber: true,
                      title: true,
                      chargeType: {
                        select: { id: true, name: true, category: true },
                      },
                    },
                  },
                },
              },
              resident: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  household: {
                    select: { id: true, block: true, lot: true, unit: true },
                  },
                },
              },
            },
            orderBy: { paymentDate: 'desc' },
            take: 1000,
          })
        : Promise.resolve([]),

      type !== 'payment'
        ? this.prisma.assessment.findMany({
            where: {
              communityId,
              deletedAt: null,
              status: {
                in: [
                  AssessmentStatus.ISSUED,
                  AssessmentStatus.PARTIALLY_PAID,
                  AssessmentStatus.OVERDUE,
                  AssessmentStatus.PAID,
                ],
              },
              ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
              ...(query.householdId ? { householdId: query.householdId } : {}),
              ...(dateFilter ? { dueDate: dateFilter } : {}),
              ...(category ? { chargeType: { category } } : {}),
            },
            include: {
              chargeType: { select: { id: true, name: true, category: true } },
              household: {
                select: { id: true, block: true, lot: true, unit: true },
              },
            },
            orderBy: { dueDate: 'desc' },
            take: 1000,
          })
        : Promise.resolve([]),
    ]);

    const entries: TransactionEntry[] = [
      ...payments.map((payment) => ({
        id: payment.id,
        type: 'payment' as const,
        date: payment.paymentDate,
        description:
          payment.chargeType?.name ??
          payment.allocations[0]?.assessment?.chargeType?.name ??
          'Payment',
        category:
          payment.chargeType?.category ??
          payment.allocations[0]?.assessment?.chargeType?.category ??
          'OTHER',
        amount: payment.amount.toNumber(),
        status: payment.status,
        reference: payment.paymentNumber,
        household: payment.resident.household,
      })),
      ...assessments.map((assessment) => ({
        id: assessment.id,
        type: 'charge' as const,
        date: assessment.dueDate,
        description: assessment.title,
        category: assessment.chargeType?.category ?? 'DUES',
        amount: -assessment.amount.toNumber(),
        status: assessment.status,
        reference: assessment.assessmentNumber,
        household: assessment.household,
      })),
    ];

    const filtered = search
      ? entries.filter(
          (entry) =>
            entry.description.toLowerCase().includes(search.toLowerCase()) ||
            (entry.reference ?? '')
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
      : entries;

    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    const total = filtered.length;

    const income = entries
      .filter((entry) => entry.type === 'payment')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const expenses = entries
      .filter((entry) => entry.type === 'charge')
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    return {
      success: true,
      message: 'Finance transactions retrieved successfully.',
      data,
      summary: {
        income,
        expenses,
        balance: income - expenses,
      },
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
}
