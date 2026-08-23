import { Injectable } from '@nestjs/common';

import {
  AssessmentStatus,
  HouseholdStatus,
  PaymentStatus,
} from '@prisma/client';

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

  // ==========================================
  // HOA income statement (fund transparency):
  // income = verified payments, expenses =
  // recorded expenses + utility provider
  // expenses, fund balance = net.
  // ==========================================

  async incomeStatement(communityId: string, from?: string, to?: string) {
    const dateFilter =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const [payments, expenses, utilityExpenses, billed] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          communityId,
          deletedAt: null,
          status: PaymentStatus.VERIFIED,
          ...(dateFilter ? { paymentDate: dateFilter } : {}),
        },
        select: { amount: true, paymentDate: true },
      }),
      this.prisma.expense.findMany({
        where: {
          communityId,
          deletedAt: null,
          ...(dateFilter ? { expenseDate: dateFilter } : {}),
        },
        select: {
          id: true,
          expenseNumber: true,
          title: true,
          description: true,
          category: true,
          amount: true,
          expenseDate: true,
          paymentMethod: true,
          payee: true,
          referenceNumber: true,
          notes: true,
        },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.utilityExpense.findMany({
        where: {
          communityId,
          deletedAt: null,
          ...(dateFilter ? { expenseDate: dateFilter } : {}),
        },
        select: {
          id: true,
          utilityNumber: true,
          providerName: true,
          utilityType: true,
          amount: true,
          expenseDate: true,
          paymentMethod: true,
          billingPeriod: true,
          invoiceNumber: true,
          description: true,
        },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.assessment.aggregate({
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
          ...(dateFilter ? { dueDate: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const income = payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0,
    );
    const expenseTotal =
      expenses.reduce((sum, expense) => sum + expense.amount.toNumber(), 0) +
      utilityExpenses.reduce(
        (sum, utility) => sum + utility.amount.toNumber(),
        0,
      );
    const fundBalance = income - expenseTotal;

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const expense of expenses) {
      const current = categoryMap.get(expense.category) ?? {
        amount: 0,
        count: 0,
      };
      current.amount += expense.amount.toNumber();
      current.count += 1;
      categoryMap.set(expense.category, current);
    }
    for (const utility of utilityExpenses) {
      const current = categoryMap.get(utility.utilityType) ?? {
        amount: 0,
        count: 0,
      };
      current.amount += utility.amount.toNumber();
      current.count += 1;
      categoryMap.set(utility.utilityType, current);
    }

    const categories = [...categoryMap.entries()]
      .map(([category, value]) => ({
        category,
        amount: value.amount,
        count: value.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyMap = new Map<string, { income: number; expenses: number }>();
    const monthKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    for (const payment of payments) {
      const key = monthKey(payment.paymentDate);
      const current = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
      current.income += payment.amount.toNumber();
      monthlyMap.set(key, current);
    }

    for (const expense of expenses) {
      const key = monthKey(expense.expenseDate);
      const current = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
      current.expenses += expense.amount.toNumber();
      monthlyMap.set(key, current);
    }

    for (const utility of utilityExpenses) {
      const key = monthKey(utility.expenseDate);
      const current = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
      current.expenses += utility.amount.toNumber();
      monthlyMap.set(key, current);
    }

    const monthly = [...monthlyMap.entries()]
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Utility provider expenses embedded as read-only rows so the
    // statement stays a single transparency view
    const utilityExpenseRows = utilityExpenses.map((utility) => ({
      id: utility.id,
      expenseNumber: utility.utilityNumber,
      title: `${utility.providerName} (${utility.utilityType})`,
      description: utility.description,
      category: utility.utilityType,
      amount: utility.amount,
      expenseDate: utility.expenseDate,
      paymentMethod: utility.paymentMethod,
      payee: utility.providerName,
      referenceNumber: utility.invoiceNumber,
      notes: utility.billingPeriod
        ? `Billing period: ${utility.billingPeriod}`
        : null,
      isUtility: true,
    }));

    return {
      success: true,
      message: 'Income statement retrieved successfully.',
      data: {
        from: from ?? null,
        to: to ?? null,
        summary: {
          income,
          expenses: expenseTotal,
          fundBalance,
          billed: billed._sum.amount?.toNumber() ?? 0,
        },
        categories,
        monthly,
        expenses: [
          ...expenses.map((expense) => ({ ...expense, isUtility: false })),
          ...utilityExpenseRows,
        ],
      },
    };
  }

  // ==========================================
  // Finance overview: the officer-facing
  // financial dashboard. Collected = verified
  // payments; Expenses = recorded HOA spending
  // (expenses + utility provider bills);
  // Available Funds = collected - expenses;
  // Billed/Unpaid = assessment receivables.
  // ==========================================

  async overview(communityId: string, scopeHouseholdId?: string) {
    const activeStatuses = [
      AssessmentStatus.ISSUED,
      AssessmentStatus.PARTIALLY_PAID,
      AssessmentStatus.OVERDUE,
      AssessmentStatus.PAID,
    ];

    const unpaidStatuses = [
      AssessmentStatus.ISSUED,
      AssessmentStatus.PARTIALLY_PAID,
      AssessmentStatus.OVERDUE,
    ];

    const paymentWhere: any = {
      communityId,
      deletedAt: null,
      status: PaymentStatus.VERIFIED,
      ...(scopeHouseholdId
        ? { resident: { householdId: scopeHouseholdId } }
        : {}),
    };

    const assessmentWhere: any = {
      communityId,
      deletedAt: null,
      status: { in: activeStatuses },
      ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
    };

    const expenseWhere: any = { communityId, deletedAt: null };

    const [
      collectedAgg,
      expensesAgg,
      utilityExpensesAgg,
      billedAgg,
      paidAgg,
      recentPayments,
      recentExpenses,
      recentUtilityExpenses,
      pendingVerificationAgg,
      unpaidHouseholds,
      overdueCount,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.utilityExpense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.assessment.aggregate({
        where: assessmentWhere,
        _sum: { amount: true },
      }),
      this.prisma.assessment.aggregate({
        where: assessmentWhere,
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.findMany({
        where: paymentWhere,
        include: {
          chargeType: { select: { name: true, category: true } },
          allocations: {
            take: 1,
            include: {
              assessment: {
                select: {
                  title: true,
                  chargeType: { select: { category: true } },
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
        take: 8,
      }),
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: {
          id: true,
          title: true,
          category: true,
          amount: true,
          expenseDate: true,
          paymentMethod: true,
          payee: true,
          expenseNumber: true,
        },
        orderBy: { expenseDate: 'desc' },
        take: 8,
      }),
      this.prisma.utilityExpense.findMany({
        where: expenseWhere,
        select: {
          id: true,
          providerName: true,
          utilityType: true,
          amount: true,
          expenseDate: true,
          paymentMethod: true,
          utilityNumber: true,
        },
        orderBy: { expenseDate: 'desc' },
        take: 8,
      }),
      this.prisma.payment.aggregate({
        where: {
          communityId,
          deletedAt: null,
          status: PaymentStatus.PENDING_VERIFICATION,
          ...(scopeHouseholdId
            ? { resident: { householdId: scopeHouseholdId } }
            : {}),
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.assessment.groupBy({
        by: ['householdId'],
        where: {
          communityId,
          deletedAt: null,
          status: { in: unpaidStatuses },
          ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
        },
      }),
      this.prisma.assessment.count({
        where: {
          communityId,
          deletedAt: null,
          status: AssessmentStatus.OVERDUE,
          ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
        },
      }),
    ]);

    const collected = collectedAgg._sum.amount?.toNumber() ?? 0;
    const expenses =
      (expensesAgg._sum.amount?.toNumber() ?? 0) +
      (utilityExpensesAgg._sum.amount?.toNumber() ?? 0);
    const billed = billedAgg._sum.amount?.toNumber() ?? 0;
    const paid = paidAgg._sum.paidAmount?.toNumber() ?? 0;

    const recentMoneyIn = recentPayments.map((payment) => ({
      id: payment.id,
      date: payment.paymentDate,
      description:
        payment.chargeType?.name ??
        payment.allocations[0]?.assessment?.title ??
        'Payment',
      category:
        payment.chargeType?.category ??
        payment.allocations[0]?.assessment?.chargeType?.category ??
        'OTHER',
      method: payment.method,
      amount: payment.amount.toNumber(),
      payer: `${payment.resident.firstName} ${payment.resident.lastName}`,
      household: payment.resident.household,
      reference: payment.paymentNumber,
    }));

    const recentMoneyOut = [
      ...recentExpenses.map((expense) => ({
        id: expense.id,
        kind: 'expense' as const,
        date: expense.expenseDate,
        description: expense.title,
        category: expense.category,
        method: expense.paymentMethod,
        amount: expense.amount.toNumber(),
        payee: expense.payee,
        reference: expense.expenseNumber,
      })),
      ...recentUtilityExpenses.map((utility) => ({
        id: utility.id,
        kind: 'utility' as const,
        date: utility.expenseDate,
        description: `${utility.providerName} (${utility.utilityType})`,
        category: utility.utilityType,
        method: utility.paymentMethod,
        amount: utility.amount.toNumber(),
        payee: utility.providerName,
        reference: utility.utilityNumber,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    const missingMeterReadings = await this.countMissingMeterReadings(
      communityId,
      scopeHouseholdId,
    );

    return {
      success: true,
      message: 'Finance overview retrieved successfully.',
      data: {
        summary: {
          collected,
          expenses,
          availableFunds: collected - expenses,
          billed,
          unpaid: Math.max(billed - paid, 0),
        },
        recentMoneyIn,
        recentMoneyOut,
        needsAttention: {
          pendingVerificationPayments: pendingVerificationAgg._count,
          pendingVerificationAmount:
            pendingVerificationAgg._sum.amount?.toNumber() ?? 0,
          householdsWithUnpaidDues: unpaidHouseholds.length,
          overdueAssessments: overdueCount,
          missingMeterReadings,
        },
      },
    };
  }

  // ==========================================
  // Households without a meter reading for the
  // current period across all active METERED
  // utility configs.
  // ==========================================

  private async countMissingMeterReadings(
    communityId: string,
    scopeHouseholdId?: string,
  ): Promise<number> {
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const configs = await this.prisma.utilityConfig.findMany({
      where: {
        communityId,
        deletedAt: null,
        isActive: true,
        rateMode: 'METERED',
      },
      select: { id: true },
    });

    if (configs.length === 0) return 0;

    const households = await this.prisma.household.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: HouseholdStatus.ACTIVE,
        ...(scopeHouseholdId ? { id: scopeHouseholdId } : {}),
      },
      select: { id: true },
    });

    if (households.length === 0) return 0;

    const readings = await this.prisma.utilityReading.findMany({
      where: {
        communityId,
        periodKey,
        utilityConfigId: { in: configs.map((config) => config.id) },
        householdId: { in: households.map((household) => household.id) },
      },
      select: { utilityConfigId: true, householdId: true },
    });

    const readPairs = new Set(
      readings.map(
        (reading) => `${reading.utilityConfigId}:${reading.householdId}`,
      ),
    );

    return configs.length * households.length - readPairs.size;
  }
}
