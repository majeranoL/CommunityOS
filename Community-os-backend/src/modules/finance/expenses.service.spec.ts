import { ExpenseCategory, PaymentMethod } from '@prisma/client';

import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const expense = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const prismaMock = {
    expense,
    $transaction: jest.fn((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    ),
  };

  const service = new ExpensesService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
    expense.findFirst.mockReset();
    expense.findMany.mockReset();
    expense.count.mockReset();
    expense.create.mockReset();
    expense.update.mockReset();
  });

  it('creates an expense with a generated expense number', async () => {
    expense.findFirst.mockResolvedValue(null);
    expense.create.mockResolvedValue({
      id: 'exp-1',
      expenseNumber: 'EXP-000001',
      title: 'Repaint fence',
      category: 'MAINTENANCE',
      amount: 5000,
    });

    const result = await service.create(
      'community-1',
      {
        title: 'Repaint fence',
        category: ExpenseCategory.MAINTENANCE,
        amount: 5000,
        expenseDate: '2026-08-01',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        payee: 'Mark Builders',
      },
      'user-1',
    );

    expect(expense.findFirst).toHaveBeenCalledWith({
      where: { communityId: 'community-1' },
      orderBy: { expenseNumber: 'desc' },
      select: { expenseNumber: true },
    });
    expect(expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          expenseNumber: 'EXP-000001',
          title: 'Repaint fence',
          createdById: 'user-1',
        }),
      }),
    );
    expect(result.success).toBe(true);
  });

  it('increments the expense number from the latest record', async () => {
    expense.findFirst.mockResolvedValue({
      expenseNumber: 'EXP-000005',
    });
    expense.create.mockResolvedValue({
      id: 'exp-6',
      expenseNumber: 'EXP-000006',
    });

    await service.create(
      'community-1',
      {
        title: 'Water bill',
        amount: 1200,
        expenseDate: '2026-08-05',
      },
      'user-1',
    );

    expect(expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expenseNumber: 'EXP-000006' }),
      }),
    );
  });

  it('lists expenses with pagination and filters', async () => {
    expense.findMany.mockResolvedValue([
      { id: 'exp-1', expenseNumber: 'EXP-000001', title: 'Water bill' },
    ]);
    expense.count.mockResolvedValue(1);

    const result = await service.findAll('community-1', {
      page: 1,
      limit: 10,
      search: 'water',
      category: ExpenseCategory.UTILITIES,
      sortBy: 'expenseDate',
      order: 'desc',
    } as any);

    expect(expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          communityId: 'community-1',
          category: ExpenseCategory.UTILITIES,
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: expect.objectContaining({ contains: 'water' }),
            }),
          ]),
        }),
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('soft deletes an expense', async () => {
    expense.findFirst.mockResolvedValue({ id: 'exp-1' });
    expense.update.mockResolvedValue({ id: 'exp-1', deletedAt: new Date() });

    const result = await service.remove('community-1', 'exp-1');

    expect(expense.update).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result.message).toBe('Expense deleted successfully.');
  });
});
