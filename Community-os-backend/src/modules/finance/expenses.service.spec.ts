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

describe('ExpensesService createSubscriptionExpense', () => {
  const expiryDb = {
    expense: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  const service = new ExpensesService(expiryDb as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a SUBSCRIPTION expense and resolves a fallback creator', async () => {
    expiryDb.expense.findUnique.mockResolvedValue(null);
    expiryDb.expense.findFirst.mockResolvedValue(null);
    expiryDb.user.findFirst.mockResolvedValue({ id: 'finance-user' });
    expiryDb.expense.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'exp-9', ...data }),
    );

    const result = await service.createSubscriptionExpense({
      communityId: 'community-1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-000001',
      amount: 1000,
      paidAt: new Date('2026-09-01T00:00:00Z'),
      paymentMethod: 'ONLINE',
    });

    expect(expiryDb.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ communityId: 'community-1' }),
      }),
    );
    expect(expiryDb.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          category: 'SUBSCRIPTION',
          title: 'CommunityOS subscription INV-000001',
          payee: 'CommunityOS',
          referenceNumber: 'INV-000001',
          subscriptionInvoiceId: 'inv-1',
          expenseNumber: 'EXP-000001',
          paymentMethod: 'ONLINE',
          createdById: 'finance-user',
        }),
      }),
    );
    expect(result.success).toBe(true);
  });

  it('deduplicates when an expense already exists for the invoice', async () => {
    expiryDb.expense.findUnique.mockResolvedValue({ id: 'exp-existing' });

    const result = await service.createSubscriptionExpense({
      communityId: 'community-1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-000001',
      amount: 1000,
      paidAt: new Date(),
      paymentMethod: 'GCASH',
    });

    expect(result.deduplicated).toBe(true);
    expect(expiryDb.expense.create).not.toHaveBeenCalled();
  });

  it('falls back to ONLINE method for unknown payment methods', async () => {
    expiryDb.expense.findUnique.mockResolvedValue(null);
    expiryDb.expense.findFirst.mockResolvedValue(null);
    expiryDb.user.findFirst.mockResolvedValue({ id: 'user-1' });
    expiryDb.expense.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'exp-10', ...data }),
    );

    await service.createSubscriptionExpense({
      communityId: 'community-1',
      invoiceId: 'inv-2',
      invoiceNumber: 'INV-000002',
      amount: 500,
      paidAt: new Date(),
      paymentMethod: 'SOME_ODD_METHOD',
    });

    const createCall = expiryDb.expense.create.mock.calls[0][0];
    expect(createCall.data.paymentMethod).toBe('ONLINE');
  });
});
