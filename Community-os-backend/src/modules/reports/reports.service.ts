import { Injectable } from '@nestjs/common';

import {
  AssessmentStatus,
  ComplaintStatus,
  EventStatus,
  FacilityStatus,
  MaintenanceStatus,
  ReservationStatus,
  VehicleStatus,
  VisitorStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

type ReportColumn = {
  key: string;
  label: string;
};

export type ReportResult = {
  filename: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
};
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: { toNumber(): number } | null | undefined): number {
    return value ? value.toNumber() : 0;
  }

  private fmtDate(value: Date | null | undefined): string {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
  }

  private fullName(
    first: string,
    middle?: string | null,
    last?: string | null,
  ): string {
    return [last, `${first}${middle ? ` ${middle}` : ''}`]
      .filter(Boolean)
      .join(', ');
  }

  // ==========================================
  // CSV Builder
  // ==========================================

  buildCsv(columns: ReportColumn[], rows: Record<string, unknown>[]): string {
    const header = columns.map((col) => col.label).join(',');

    const body = rows
      .map((row) =>
        columns
          .map((col) => this.escapeCsv(this.stringifyCell(row[col.key])))
          .join(','),
      )
      .join('\r\n');

    return `${header}\r\n${body}`;
  }

  private stringifyCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    return JSON.stringify(value);
  }

  private escapeCsv(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ==========================================
  // Residents
  // ==========================================

  async residents(communityId: string): Promise<ReportResult> {
    const residents = await this.prisma.resident.findMany({
      where: { communityId, deletedAt: null },
      orderBy: { lastName: 'asc' },
      include: {
        household: {
          select: {
            block: true,
            lot: true,
            address: true,
          },
        },
      },
    });

    return {
      filename: 'residents.csv',
      columns: [
        { key: 'residentNumber', label: 'Resident Number' },
        { key: 'name', label: 'Name' },
        { key: 'gender', label: 'Gender' },
        { key: 'civilStatus', label: 'Civil Status' },
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'email', label: 'Email' },
        { key: 'household', label: 'Household' },
        { key: 'status', label: 'Status' },
      ],
      rows: residents.map((resident) => ({
        residentNumber: resident.residentNumber,
        name: this.fullName(
          resident.firstName,
          resident.middleName,
          resident.lastName,
        ),
        gender: resident.gender,
        civilStatus: resident.civilStatus,
        phoneNumber: resident.phoneNumber ?? '',
        email: resident.email ?? '',
        household: resident.household
          ? `${resident.household.block}${resident.household.lot} - ${resident.household.address}`
          : '',
        status: resident.status,
      })),
    };
  }

  // ==========================================
  // Households
  // ==========================================

  async households(communityId: string): Promise<ReportResult> {
    const households = await this.prisma.household.findMany({
      where: { communityId, deletedAt: null },
      orderBy: [{ block: 'asc' }, { lot: 'asc' }],
      include: {
        _count: {
          select: {
            residents: {
              where: { deletedAt: null },
            },
            assessments: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return {
      filename: 'households.csv',
      columns: [
        { key: 'block', label: 'Block' },
        { key: 'lot', label: 'Lot' },
        { key: 'address', label: 'Address' },
        { key: 'residentCount', label: 'Residents' },
        { key: 'assessmentCount', label: 'Assessments' },
        { key: 'status', label: 'Status' },
      ],
      rows: households.map((household) => ({
        block: household.block,
        lot: household.lot,
        address: household.address,
        residentCount: household._count.residents,
        assessmentCount: household._count.assessments,
        status: household.status,
      })),
    };
  }

  // ==========================================
  // Payments
  // ==========================================

  async payments(communityId: string, month?: string): Promise<ReportResult> {
    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (month) {
      const [year, monthIndex] = month.split('-').map(Number);
      where.paymentDate = {
        gte: new Date(Date.UTC(year, monthIndex - 1, 1)),
        lt: new Date(Date.UTC(year, monthIndex, 1)),
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        resident: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        assessment: {
          select: {
            assessmentNumber: true,
          },
        },
      },
    });

    return {
      filename: 'payments.csv',
      columns: [
        { key: 'paymentNumber', label: 'Payment Number' },
        { key: 'resident', label: 'Resident' },
        { key: 'assessmentNumber', label: 'Assessment' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
        { key: 'paymentDate', label: 'Payment Date' },
        { key: 'referenceNumber', label: 'Reference Number' },
        { key: 'status', label: 'Status' },
      ],
      rows: payments.map((payment) => ({
        paymentNumber: payment.paymentNumber,
        resident: this.fullName(
          payment.resident.firstName,
          payment.resident.middleName,
          payment.resident.lastName,
        ),
        assessmentNumber: payment.assessment.assessmentNumber,
        amount: this.toNumber(payment.amount),
        method: payment.method,
        paymentDate: this.fmtDate(payment.paymentDate),
        referenceNumber: payment.referenceNumber ?? '',
        status: payment.status,
      })),
    };
  }

  // ==========================================
  // Assessments
  // ==========================================

  async assessments(communityId: string): Promise<ReportResult> {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: { not: AssessmentStatus.CANCELLED },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        household: {
          select: {
            block: true,
            lot: true,
            address: true,
          },
        },
      },
    });

    return {
      filename: 'assessments.csv',
      columns: [
        { key: 'assessmentNumber', label: 'Assessment Number' },
        { key: 'household', label: 'Household' },
        { key: 'title', label: 'Title' },
        { key: 'amount', label: 'Amount' },
        { key: 'paidAmount', label: 'Paid Amount' },
        { key: 'outstanding', label: 'Outstanding' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'period', label: 'Period' },
        { key: 'status', label: 'Status' },
      ],
      rows: assessments.map((assessment) => {
        const amount = this.toNumber(assessment.amount);
        const paidAmount = this.toNumber(assessment.paidAmount);
        return {
          assessmentNumber: assessment.assessmentNumber,
          household: `${assessment.household.block}${assessment.household.lot} - ${assessment.household.address}`,
          title: assessment.title,
          amount,
          paidAmount,
          outstanding: amount - paidAmount,
          dueDate: this.fmtDate(assessment.dueDate),
          period: assessment.period ?? '',
          status: assessment.status,
        };
      }),
    };
  }

  // ==========================================
  // Complaints
  // ==========================================

  async complaints(communityId: string): Promise<ReportResult> {
    const complaints = await this.prisma.complaint.findMany({
      where: { communityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        resident: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      filename: 'complaints.csv',
      columns: [
        { key: 'complaintNumber', label: 'Complaint Number' },
        { key: 'resident', label: 'Resident' },
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'createdAt', label: 'Created Date' },
      ],
      rows: complaints.map((complaint) => ({
        complaintNumber: complaint.complaintNumber,
        resident: this.fullName(
          complaint.resident.firstName,
          complaint.resident.middleName,
          complaint.resident.lastName,
        ),
        title: complaint.title,
        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,
        assignedTo: complaint.assignedTo
          ? `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}`
          : '',
        createdAt: this.fmtDate(complaint.createdAt),
      })),
    };
  }

  // ==========================================
  // Vehicles
  // ==========================================

  async vehicles(communityId: string): Promise<ReportResult> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { communityId, deletedAt: null },
      orderBy: { plateNumber: 'asc' },
      include: {
        resident: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      filename: 'vehicles.csv',
      columns: [
        { key: 'plateNumber', label: 'Plate Number' },
        { key: 'owner', label: 'Owner' },
        { key: 'make', label: 'Make' },
        { key: 'model', label: 'Model' },
        { key: 'color', label: 'Color' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
      ],
      rows: vehicles.map((vehicle) => ({
        plateNumber: vehicle.plateNumber,
        owner: vehicle.resident
          ? this.fullName(
              vehicle.resident.firstName,
              vehicle.resident.middleName,
              vehicle.resident.lastName,
            )
          : '',
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        type: vehicle.type,
        status: vehicle.status,
      })),
    };
  }

  // ==========================================
  // Maintenance
  // ==========================================

  async maintenance(communityId: string): Promise<ReportResult> {
    const maintenance = await this.prisma.maintenance.findMany({
      where: { communityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        facility: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      filename: 'maintenance.csv',
      columns: [
        { key: 'maintenanceNumber', label: 'Maintenance Number' },
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority' },
        { key: 'facility', label: 'Facility' },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'status', label: 'Status' },
        { key: 'cost', label: 'Cost' },
        { key: 'scheduledAt', label: 'Scheduled Date' },
      ],
      rows: maintenance.map((item) => ({
        maintenanceNumber: item.maintenanceNumber,
        title: item.title,
        category: item.category,
        priority: item.priority,
        facility: item.facility?.name ?? '',
        assignedTo: item.assignedTo
          ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
          : '',
        status: item.status,
        cost: this.toNumber(item.cost),
        scheduledAt: this.fmtDate(item.scheduledAt),
      })),
    };
  }

  // ==========================================
  // Visitors
  // ==========================================

  async visitors(communityId: string): Promise<ReportResult> {
    const visitors = await this.prisma.visitor.findMany({
      where: { communityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        hostResident: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            plateNumber: true,
          },
        },
      },
    });

    return {
      filename: 'visitors.csv',
      columns: [
        { key: 'name', label: 'Visitor Name' },
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'hostResident', label: 'Host Resident' },
        { key: 'vehicle', label: 'Vehicle' },
        { key: 'status', label: 'Status' },
        { key: 'entryAt', label: 'Entry Date' },
        { key: 'exitAt', label: 'Exit Date' },
      ],
      rows: visitors.map((visitor) => ({
        name: visitor.name,
        phoneNumber: visitor.phoneNumber,
        purpose: visitor.purpose,
        hostResident: visitor.hostResident
          ? this.fullName(
              visitor.hostResident.firstName,
              visitor.hostResident.middleName,
              visitor.hostResident.lastName,
            )
          : '',
        vehicle: visitor.vehicle?.plateNumber ?? '',
        status: visitor.status,
        entryAt: this.fmtDate(visitor.entryAt),
        exitAt: this.fmtDate(visitor.exitAt),
      })),
    };
  }

  // ==========================================
  // Events
  // ==========================================

  async events(communityId: string): Promise<ReportResult> {
    const events = await this.prisma.event.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: { not: EventStatus.DRAFT },
      },
      orderBy: { startAt: 'desc' },
      include: {
        organizer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      filename: 'events.csv',
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'location', label: 'Location' },
        { key: 'organizer', label: 'Organizer' },
        { key: 'startAt', label: 'Start Date' },
        { key: 'endAt', label: 'End Date' },
        { key: 'status', label: 'Status' },
      ],
      rows: events.map((event) => ({
        title: event.title,
        location: event.location ?? '',
        organizer: event.organizer
          ? `${event.organizer.firstName} ${event.organizer.lastName}`
          : '',
        startAt: this.fmtDate(event.startAt),
        endAt: this.fmtDate(event.endAt),
        status: event.status,
      })),
    };
  }

  // ==========================================
  // Status Reference (for dropdowns)
  // ==========================================

  statusOptions() {
    return {
      success: true,
      message: 'Report status options retrieved successfully.',
      data: {
        assessments: Object.values(AssessmentStatus),
        complaints: Object.values(ComplaintStatus),
        maintenance: Object.values(MaintenanceStatus),
        reservations: Object.values(ReservationStatus),
        visitors: Object.values(VisitorStatus),
        vehicles: Object.values(VehicleStatus),
        facilities: Object.values(FacilityStatus),
        events: Object.values(EventStatus),
      },
    };
  }
}
