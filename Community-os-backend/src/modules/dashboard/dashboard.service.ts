import { Injectable } from '@nestjs/common';

import {
  AssessmentStatus,
  AnnouncementStatus,
  ComplaintStatus,
  EventStatus,
  FacilityStatus,
  MaintenanceStatus,
  PaymentStatus,
  ReservationStatus,
  VisitorStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: { toNumber(): number } | null | undefined): number {
    return value ? value.toNumber() : 0;
  }

  // ==========================================
  // Overview
  // ==========================================

  async overview(communityId: string) {
    const now = new Date();

    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const [
      households,
      residents,
      facilities,
      vehicles,
      staff,
      activeVisitors,
      announcements,
      draftAnnouncements,
      openComplaints,
      pendingReservations,
      activeMaintenance,
      assessmentAgg,
      monthlyCollected,
      pendingPayments,
    ] = await this.prisma.$transaction([
      this.prisma.household.count({
        where: { communityId, deletedAt: null },
      }),

      this.prisma.resident.count({
        where: { communityId, deletedAt: null },
      }),

      this.prisma.facility.count({
        where: { communityId, deletedAt: null },
      }),

      this.prisma.vehicle.count({
        where: { communityId, deletedAt: null },
      }),

      this.prisma.staff.count({
        where: { communityId, deletedAt: null },
      }),

      this.prisma.visitor.count({
        where: {
          communityId,
          status: {
            in: [VisitorStatus.EXPECTED, VisitorStatus.CHECKED_IN],
          },
        },
      }),

      this.prisma.announcement.count({
        where: {
          communityId,
          deletedAt: null,
          status: AnnouncementStatus.PUBLISHED,
        },
      }),

      this.prisma.announcement.count({
        where: {
          communityId,
          deletedAt: null,
          status: AnnouncementStatus.DRAFT,
        },
      }),

      this.prisma.complaint.count({
        where: {
          communityId,
          deletedAt: null,
          status: {
            in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS],
          },
        },
      }),

      this.prisma.reservation.count({
        where: {
          communityId,
          deletedAt: null,
          status: ReservationStatus.PENDING,
        },
      }),

      this.prisma.maintenance.count({
        where: {
          communityId,
          deletedAt: null,
          status: {
            in: [
              MaintenanceStatus.OPEN,
              MaintenanceStatus.ASSIGNED,
              MaintenanceStatus.IN_PROGRESS,
              MaintenanceStatus.ON_HOLD,
            ],
          },
        },
      }),

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

      this.prisma.payment.aggregate({
        where: {
          communityId,
          deletedAt: null,
          status: PaymentStatus.CONFIRMED,
          paymentDate: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),

      this.prisma.payment.count({
        where: {
          communityId,
          deletedAt: null,
          status: PaymentStatus.PENDING,
        },
      }),
    ]);

    const assessmentStatusCounts = await this.prisma.assessment.groupBy({
      by: ['status'],
      where: { communityId, deletedAt: null },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const [upcomingEvents, recentReservations, recentComplaints] =
      await this.prisma.$transaction([
        this.prisma.event.findMany({
          where: {
            communityId,
            deletedAt: null,
            status: EventStatus.PUBLISHED,
            startAt: { gte: now },
          },
          orderBy: { startAt: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            location: true,
            startAt: true,
            endAt: true,
            status: true,
          },
        }),

        this.prisma.reservation.findMany({
          where: {
            communityId,
            deletedAt: null,
            status: {
              in: [ReservationStatus.PENDING, ReservationStatus.APPROVED],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            purpose: true,
            startAt: true,
            endAt: true,
            status: true,
            facility: {
              select: { name: true },
            },
          },
        }),

        this.prisma.complaint.findMany({
          where: {
            communityId,
            deletedAt: null,
            status: {
              in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            complaintNumber: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    const totalBilled = this.toNumber(assessmentAgg._sum.amount);
    const totalCollected = this.toNumber(assessmentAgg._sum.paidAmount);

    const statusCounts: Record<string, number> = {};
    for (const row of assessmentStatusCounts) {
      statusCounts[row.status] = row._count._all;
    }

    return {
      success: true,
      message: 'Dashboard overview retrieved successfully.',
      data: {
        counts: {
          households,
          residents,
          facilities,
          vehicles,
          staff,
          activeVisitors,
          announcements,
          draftAnnouncements,
          openComplaints,
          pendingReservations,
          activeMaintenance,
          pendingPayments,
        },

        finance: {
          totalBilled,
          totalCollected,
          outstanding: totalBilled - totalCollected,
          monthlyCollected: this.toNumber(monthlyCollected._sum.amount),
          monthlyPaymentsCount: monthlyCollected._count,
          assessments: {
            total: assessmentAgg._count,
            ...statusCounts,
          },
        },

        upcomingEvents,

        recentReservations,

        recentComplaints,

        facilityStatus: await this.facilityStatus(communityId),
      },
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async facilityStatus(communityId: string) {
    const rows = await this.prisma.facility.groupBy({
      by: ['status'],
      where: { communityId, deletedAt: null },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const result: Record<string, number> = {};
    for (const status of Object.values(FacilityStatus)) {
      result[status] = 0;
    }
    for (const row of rows) {
      result[row.status] = row._count._all;
    }

    return result;
  }
}
