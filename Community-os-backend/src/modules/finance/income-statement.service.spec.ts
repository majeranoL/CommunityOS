import { AssessmentStatus, PaymentStatus } from '@prisma/client';

import { FinanceTransactionsService } from './finance-transactions.service';

const amount = (value: number) => ({ toNumber: () => value }) as any;

describe('FinanceTransactionsService.incomeStatement', () => {
  const payment = { findMany: jest.fn() };
  const expense = { findMany: jest.fn() };
  const assessment = { aggregate: jest.fn() };

  const prismaMock = {
    payment,
    expense,
    assessment,
  };

  const service = new FinanceTransactionsService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes income, expenses, fund balance, breakdowns and billed totals', async () => {
    payment.findMany.mockResolvedValue([
      {
        paymentDate: new Date('2026-07-05T00:00:00.000Z'),
        amount: amount(8000),
      },
      {
        paymentDate: new Date('2026-08-05T00:00:00.000Z'),
        amount: amount(5000),
      },
    ]);
    expense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        expenseNumber: 'EXP-000001',
        title: 'Water bill',
        category: 'UTILITIES',
        amount: amount(3000),
        expenseDate: new Date('2026-07-10T00:00:00.000Z'),
        paymentMethod: 'BANK_TRANSFER',
        payee: 'WaterCo',
        referenceNumber: 'WTR-1',
        notes: null,
      },
      {
        id: 'exp-2',
        expenseNumber: 'EXP-000002',
        title: 'Security wages',
        category: 'SECURITY',
        amount: amount(2000),
        expenseDate: new Date('2026-08-02T00:00:00.000Z'),
        paymentMethod: 'CASH',
        payee: 'Guard Co',
        referenceNumber: null,
        notes: null,
      },
    ]);
    assessment.aggregate.mockResolvedValue({
      _sum: { amount: amount(15000) },
    });

    const result = await service.incomeStatement(
      'community-1',
      '2026-07-01',
      '2026-08-31',
    );

    expect(result.data.summary).toEqual({
      income: 13000,
      expenses: 5000,
      fundBalance: 8000,
      billed: 15000,
    });

    expect(result.data.categories).toEqual([
      { category: 'UTILITIES', amount: 3000, count: 1 },
      { category: 'SECURITY', amount: 2000, count: 1 },
    ]);

    expect(result.data.monthly).toEqual([
      { month: '2026-07', income: 8000, expenses: 3000 },
      { month: '2026-08', income: 5000, expenses: 2000 },
    ]);

    expect(result.data.expenses).toHaveLength(2);
  });

  it('applies date filters to payments and expenses', async () => {
    payment.findMany.mockResolvedValue([]);
    expense.findMany.mockResolvedValue([]);
    assessment.aggregate.mockResolvedValue({ _sum: { amount: null } });

    await service.incomeStatement('community-1', '2026-08-01', '2026-08-31');

    expect(payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          communityId: 'community-1',
          status: PaymentStatus.VERIFIED,
          paymentDate: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31'),
          },
        }),
      }),
    );
    expect(expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          communityId: 'community-1',
          expenseDate: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31'),
          },
        }),
      }),
    );
    expect(assessment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              AssessmentStatus.ISSUED,
              AssessmentStatus.PARTIALLY_PAID,
              AssessmentStatus.OVERDUE,
              AssessmentStatus.PAID,
            ],
          },
        }),
      }),
    );
  });
});
