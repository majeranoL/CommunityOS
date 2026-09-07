import { AssessmentStatus } from '@prisma/client';

import { ConflictException, ForbiddenException } from '@nestjs/common';

import {
  summarizeFinance,
  type HouseholdFinanceSummary,
  HouseholdsService,
} from './households.service';

const GOOD = 'GOOD';
const BAD = 'BAD';

function assessment(
  householdId: string,
  amount: number,
  dueDate: Date,
  status: AssessmentStatus,
) {
  return { householdId, amount, dueDate, status };
}

describe('summarizeFinance', () => {
  const now = new Date('2026-07-15T00:00:00.000Z');

  it('sums billed amounts and outstanding after confirmed payments', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment('h1', 1000, new Date('2026-01-05'), AssessmentStatus.PAID),
        assessment('h1', 500, new Date('2026-02-05'), AssessmentStatus.ISSUED),
      ],
      new Map([['h1', 1000]]),
      now,
    );

    expect(summary.get('h1')).toMatchObject<Partial<HouseholdFinanceSummary>>({
      totalBilled: 1500,
      totalPaid: 1000,
      outstanding: 500,
    });
  });

  it('marks GOOD standing with fewer than the delinquency threshold of overdue months', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment(
          'h1',
          1000,
          new Date('2026-06-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-05-05'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({
      monthsBehind: 2,
      standing: GOOD,
    });
  });

  it('marks BAD standing with unpaid assessments across 4 distinct months', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment(
          'h1',
          1000,
          new Date('2026-04-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-05-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-06-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-07-05'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({ monthsBehind: 4, standing: BAD });
  });

  it('does not count assessments that are not yet due', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment('h1', 1000, new Date('2026-09-05'), AssessmentStatus.ISSUED),
        assessment(
          'h1',
          1000,
          new Date('2026-01-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-02-05'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({
      monthsBehind: 2,
      standing: GOOD,
    });
  });

  it('counts overdue months only once per calendar month', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment(
          'h1',
          1000,
          new Date('2026-06-01'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-06-30'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({ monthsBehind: 1 });
  });

  it('does not count fully paid assessments but counts unpaid partials', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment('h1', 1000, new Date('2026-06-05'), AssessmentStatus.PAID),
        assessment(
          'h1',
          1000,
          new Date('2026-07-05'),
          AssessmentStatus.PARTIALLY_PAID,
        ),
      ],
      new Map([['h1', 1400]]),
      now,
    );

    expect(summary.get('h1')).toMatchObject({
      monthsBehind: 1,
      standing: GOOD,
    });
  });

  it('returns an entry for every requested household id', () => {
    const summary = summarizeFinance(['h1', 'h2'], [], new Map(), now);

    expect(summary.get('h1')).toBeDefined();
    expect(summary.get('h2')).toBeDefined();
    expect(summary.get('h1')).toMatchObject({
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
      monthsBehind: 0,
      standing: GOOD,
    });
  });

  it('respects a custom delinquency threshold (default 3)', () => {
    const overdue = [
      assessment('h1', 1000, new Date('2026-05-05'), AssessmentStatus.OVERDUE),
      assessment('h1', 1000, new Date('2026-06-05'), AssessmentStatus.OVERDUE),
      assessment('h1', 1000, new Date('2026-07-05'), AssessmentStatus.OVERDUE),
    ];

    expect(
      summarizeFinance(['h1'], overdue, new Map(), now, 2).get('h1'),
    ).toMatchObject({ monthsBehind: 3, standing: BAD });

    expect(
      summarizeFinance(['h1'], overdue, new Map(), now, 4).get('h1'),
    ).toMatchObject({ monthsBehind: 3, standing: GOOD });

    expect(
      summarizeFinance(['h1'], overdue, new Map(), now).get('h1'),
    ).toMatchObject({ monthsBehind: 3, standing: BAD });
  });
});

describe('HouseholdsService switchHousehold', () => {
  const membership = {
    relationshipType: 'OWNER',
    isPrimary: false,
    household: {
      id: 'h2',
      block: 'B',
      lot: '5',
      unit: null,
      address: 'Block B',
      status: 'ACTIVE',
    },
  };

  let prismaMock: any;
  let service: HouseholdsService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      user: { findFirst: jest.fn() },
      residentHousehold: { findFirst: jest.fn() },
      resident: {
        update: jest.fn().mockResolvedValue({ id: 'res-1', householdId: 'h2' }),
      },
    };

    service = new HouseholdsService(prismaMock, {} as any);
  });

  it('switches the resident active household to a membership', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      residentId: 'res-1',
    });
    prismaMock.residentHousehold.findFirst.mockResolvedValue(membership);

    const result = await service.switchHousehold('c1', 'user-1', 'h2');

    expect(result.success).toBe(true);
    expect(prismaMock.resident.update).toHaveBeenCalledWith({
      where: { id: 'res-1' },
      data: { householdId: 'h2' },
    });
  });

  it('throws when the user has no linked resident', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      residentId: null,
    });

    await expect(service.switchHousehold('c1', 'user-1', 'h2')).rejects.toThrow(
      ForbiddenException,
    );

    expect(prismaMock.resident.update).not.toHaveBeenCalled();
  });

  it('throws when the user is not an active member of the household', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      residentId: 'res-1',
    });
    prismaMock.residentHousehold.findFirst.mockResolvedValue(null);

    await expect(service.switchHousehold('c1', 'user-1', 'h2')).rejects.toThrow(
      ForbiddenException,
    );

    expect(prismaMock.resident.update).not.toHaveBeenCalled();
  });

  it('throws when the target household is inactive', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      residentId: 'res-1',
    });
    prismaMock.residentHousehold.findFirst.mockResolvedValue({
      ...membership,
      household: { ...membership.household, status: 'INACTIVE' },
    });

    await expect(service.switchHousehold('c1', 'user-1', 'h2')).rejects.toThrow(
      ConflictException,
    );

    expect(prismaMock.resident.update).not.toHaveBeenCalled();
  });
});
