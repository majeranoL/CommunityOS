import { Injectable } from '@nestjs/common';

import {
  AssessmentStatus,
  ComplaintStatus,
  EventStatus,
  FacilityStatus,
  MaintenanceStatus,
  PaymentStatus,
  ReservationStatus,
  StaffStatus,
  VehicleStatus,
  VisitorStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: { toNumber(): number } | null | undefined): number {
    return value ? value.toNumber() : 0;
  }

  private monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private monthBounds(month: string): { start: Date; end: Date } {
    const [year, monthIndex] = month.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, monthIndex - 1, 1)),
      end: new Date(Date.UTC(year, monthIndex, 1)),
    };
  }

  private lastMonths(count: number): string[] {
    const keys: string[] = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      keys.push(this.monthKey(d));
    }
    return keys;
  }

  // ==========================================
  // Financial Summary
  // ==========================================

  async financial(communityId: string, month?: string) {
    const targetMonth = month ?? this.monthKey(new Date());
    const { start, end } = this.monthBounds(targetMonth);

    const [overallAgg, periodBilledAgg, periodCollectedAgg, periodPendingAgg] =
      await this.prisma.$transaction([
        this.prisma.assessment.aggregate({
          where: {
            communityId,
            deletedAt: null,
            status: { not: AssessmentStatus.CANCELLED },
          },
          _sum: {
            amount: true,
            paidAmount: true,
          },
          _count: true,
        }),

        this.prisma.assessment.aggregate({
          where: {
            communityId,
            deletedAt: null,
            status: { not: AssessmentStatus.CANCELLED },
            period: targetMonth,
          },
          _sum: {
            amount: true,
          },
          _count: true,
        }),

        this.prisma.payment.aggregate({
          where: {
            communityId,
            deletedAt: null,
            status: PaymentStatus.VERIFIED,
            paymentDate: { gte: start, lt: end },
          },
          _sum: {
            amount: true,
          },
          _count: true,
        }),

        this.prisma.payment.aggregate({
          where: {
            communityId,
            deletedAt: null,
            status: PaymentStatus.PENDING_VERIFICATION,
            paymentDate: { gte: start, lt: end },
          },
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ]);

    const statusCounts = await this.prisma.assessment.groupBy({
      by: ['status'],
      where: { communityId, deletedAt: null },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const totalBilled = this.toNumber(overallAgg._sum.amount);
    const totalCollected = this.toNumber(overallAgg._sum.paidAmount);

    const statusBreakdown: Record<string, number> = {};
    for (const status of Object.values(AssessmentStatus)) {
      statusBreakdown[status] = 0;
    }
    for (const row of statusCounts) {
      statusBreakdown[row.status] = row._count._all;
    }

    return {
      success: true,
      message: 'Financial analytics retrieved successfully.',
      data: {
        month: targetMonth,

        period: {
          billed: this.toNumber(periodBilledAgg._sum.amount),
          billedCount: periodBilledAgg._count,
          collected: this.toNumber(periodCollectedAgg._sum.amount),
          collectedCount: periodCollectedAgg._count,
          pending: this.toNumber(periodPendingAgg._sum.amount),
          pendingCount: periodPendingAgg._count,
        },

        overall: {
          totalBilled,
          totalCollected,
          outstanding: totalBilled - totalCollected,
          collectionRate:
            totalBilled > 0
              ? Math.round((totalCollected / totalBilled) * 100)
              : 0,
          assessmentsCount: overallAgg._count,
          statusBreakdown,
        },
      },
    };
  }

  // ==========================================
  // Trends
  // ==========================================

  async trends(communityId: string, months: number) {
    const keys = this.lastMonths(months);

    const [assessments, payments, complaints, maintenance] =
      await this.prisma.$transaction([
        this.prisma.assessment.findMany({
          where: {
            communityId,
            deletedAt: null,
            status: { not: AssessmentStatus.CANCELLED },
          },
          select: {
            period: true,
            amount: true,
            paidAmount: true,
          },
        }),

        this.prisma.payment.findMany({
          where: {
            communityId,
            deletedAt: null,
            status: PaymentStatus.VERIFIED,
          },
          select: {
            paymentDate: true,
            amount: true,
          },
        }),

        this.prisma.complaint.findMany({
          where: { communityId, deletedAt: null },
          select: { createdAt: true },
        }),

        this.prisma.maintenance.findMany({
          where: { communityId, deletedAt: null },
          select: { createdAt: true },
        }),
      ]);

    const rows = keys.map((key) => ({
      month: key,
      billed: 0,
      collected: 0,
      complaints: 0,
      maintenance: 0,
    }));

    const indexByMonth = new Map<string, number>();
    keys.forEach((key, index) => indexByMonth.set(key, index));

    for (const item of assessments) {
      if (item.period && indexByMonth.has(item.period)) {
        rows[indexByMonth.get(item.period) as number].billed += this.toNumber(
          item.amount,
        );
      }
    }

    for (const item of payments) {
      const key = this.monthKey(item.paymentDate);
      if (indexByMonth.has(key)) {
        rows[indexByMonth.get(key) as number].collected += this.toNumber(
          item.amount,
        );
      }
    }

    for (const item of complaints) {
      const key = this.monthKey(item.createdAt);
      if (indexByMonth.has(key)) {
        rows[indexByMonth.get(key) as number].complaints += 1;
      }
    }

    for (const item of maintenance) {
      const key = this.monthKey(item.createdAt);
      if (indexByMonth.has(key)) {
        rows[indexByMonth.get(key) as number].maintenance += 1;
      }
    }

    return {
      success: true,
      message: 'Trend analytics retrieved successfully.',
      data: rows,
    };
  }

  // ==========================================
  // Status Breakdown
  // ==========================================

  async statusBreakdown(communityId: string) {
    const [
      complaints,
      maintenance,
      reservations,
      visitors,
      vehicles,
      staff,
      facilities,
      assessments,
      payments,
      events,
    ] = await Promise.all([
      this.prisma.complaint.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.maintenance.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.reservation.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.visitor.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.vehicle.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.staff.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.facility.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.assessment.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.event.groupBy({
        by: ['status'],
        where: { communityId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    return {
      success: true,
      message: 'Status breakdown retrieved successfully.',
      data: {
        complaints: this.bucket(complaints, Object.values(ComplaintStatus)),
        maintenance: this.bucket(maintenance, Object.values(MaintenanceStatus)),
        reservations: this.bucket(
          reservations,
          Object.values(ReservationStatus),
        ),
        visitors: this.bucket(visitors, Object.values(VisitorStatus)),
        vehicles: this.bucket(vehicles, Object.values(VehicleStatus)),
        staff: this.bucket(staff, Object.values(StaffStatus)),
        facilities: this.bucket(facilities, Object.values(FacilityStatus)),
        assessments: this.bucket(assessments, Object.values(AssessmentStatus)),
        payments: this.bucket(payments, Object.values(PaymentStatus)),
        events: this.bucket(events, Object.values(EventStatus)),
      },
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private bucket(
    rows: { status: string; _count: { _all: number } }[],
    statuses: string[],
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const status of statuses) {
      result[status] = 0;
    }
    for (const row of rows) {
      result[row.status] = row._count._all;
    }
    return result;
  }
}
