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

  // ==========================================
  // HOA income statement (fund transparency):
  // income = verified payments, expenses =
  // recorded expenses, fund balance = net.
  // ==========================================

  async incomeStatement(communityId: string, from?: string, to?: string) {
    const dateFilter =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const [payments, expenses, billed] = await Promise.all([
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
    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + expense.amount.toNumber(),
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

    const monthly = [...monthlyMap.entries()]
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => a.month.localeCompare(b.month));

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
        expenses,
      },
    };
  }
}
