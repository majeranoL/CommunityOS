import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { FacilityStatus, ReservationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateTimeRange(startAt: Date, endAt: Date) {
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid date range.');
    }

    if (startAt >= endAt) {
      throw new BadRequestException('End time must be after start time.');
    }

    if (startAt < new Date()) {
      throw new BadRequestException(
        'Reservation start time cannot be in the past.',
      );
    }
  }

  private async validateFacility(communityId: string, facilityId: string) {
    const facility = await this.prisma.facility.findFirst({
      where: {
        id: facilityId,
        communityId,
        deletedAt: null,
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found.');
    }

    if (facility.status === FacilityStatus.CLOSED) {
      throw new ConflictException('Facility is closed and cannot be reserved.');
    }

    return facility;
  }

  private async validateResident(communityId: string, residentId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        communityId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }
  }

  private async checkOverlap(
    communityId: string,
    facilityId: string,
    startAt: Date,
    endAt: Date,
    excludeReservationId?: string,
  ) {
    const overlapping = await this.prisma.reservation.findFirst({
      where: {
        communityId,
        facilityId,
        deletedAt: null,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.APPROVED],
        },
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
        ...(excludeReservationId && {
          NOT: {
            id: excludeReservationId,
          },
        }),
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'Facility is already reserved for the selected time.',
      );
    }
  }

  // ==========================================
  // Create Reservation
  // ==========================================

  async create(communityId: string, dto: CreateReservationDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.purpose = dto.purpose?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Parse Dates
    // ==========================================

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateTimeRange(startAt, endAt);

    // ==========================================
    // Validate Facility & Resident
    // ==========================================

    await this.validateFacility(communityId, dto.facilityId);

    await this.validateResident(communityId, dto.residentId);

    // ==========================================
    // Overlap Check
    // ==========================================

    await this.checkOverlap(communityId, dto.facilityId, startAt, endAt);

    // ==========================================
    // Create Reservation
    // ==========================================

    const reservation = await this.prisma.reservation.create({
      data: {
        communityId,
        facilityId: dto.facilityId,
        residentId: dto.residentId,

        purpose: dto.purpose,
        startAt,
        endAt,
        remarks: dto.remarks,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Reservation created successfully.',
      data: reservation,
    };
  }

  // ==========================================
  // Get All Reservations
  // ==========================================

  async findAll(communityId: string, query: ReservationQueryDto) {
    const {
      page,
      limit,
      search,
      status,
      facilityId,
      residentId,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          purpose: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          resident: {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (residentId) {
      where.residentId = residentId;
    }

    const [reservations, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          facility: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.reservation.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Reservations retrieved successfully.',
      data: reservations,

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
  // Get Reservation By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return {
      success: true,
      message: 'Reservation retrieved successfully.',
      data: reservation,
    };
  }

  // ==========================================
  // Update Reservation
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateReservationDto) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.purpose) dto.purpose = dto.purpose.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Validate Facility & Resident
    // ==========================================

    if (dto.facilityId && dto.facilityId !== reservation.facilityId) {
      await this.validateFacility(communityId, dto.facilityId);
    }

    if (dto.residentId && dto.residentId !== reservation.residentId) {
      await this.validateResident(communityId, dto.residentId);
    }

    // ==========================================
    // Parse Dates
    // ==========================================

    const startAt = dto.startAt ? new Date(dto.startAt) : reservation.startAt;

    const endAt = dto.endAt ? new Date(dto.endAt) : reservation.endAt;

    this.validateTimeRange(startAt, endAt);

    // ==========================================
    // Overlap Check
    // ==========================================

    await this.checkOverlap(
      communityId,
      dto.facilityId ?? reservation.facilityId,
      startAt,
      endAt,
      id,
    );

    // ==========================================
    // Update Reservation
    // ==========================================

    const updatedReservation = await this.prisma.reservation.update({
      where: {
        id,
      },

      data: {
        ...(dto.facilityId && {
          facilityId: dto.facilityId,
        }),

        ...(dto.residentId && {
          residentId: dto.residentId,
        }),

        ...(dto.purpose !== undefined && {
          purpose: dto.purpose,
        }),

        ...(dto.startAt && { startAt }),

        ...(dto.endAt && { endAt }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Reservation updated successfully.',
      data: updatedReservation,
    };
  }

  // ==========================================
  // Delete Reservation (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    await this.prisma.reservation.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Reservation deleted successfully.',
    };
  }

  // ==========================================
  // Reservation Status Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: ReservationStatus,
  ) {
    const reservation = await this.prisma.reservation.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Reservation ${status.toLowerCase()} successfully.`,
      data: reservation,
    };
  }

  // ==========================================
  // Approve Reservation
  // ==========================================

  async approve(communityId: string, id: string) {
    const reservation = await this.findScoped(communityId, id);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING reservations can be approved.',
      );
    }

    return this.updateStatus(communityId, id, ReservationStatus.APPROVED);
  }

  // ==========================================
  // Reject Reservation
  // ==========================================

  async reject(communityId: string, id: string) {
    const reservation = await this.findScoped(communityId, id);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING reservations can be rejected.',
      );
    }

    return this.updateStatus(communityId, id, ReservationStatus.REJECTED);
  }

  // ==========================================
  // Cancel Reservation
  // ==========================================

  async cancel(communityId: string, id: string) {
    const reservation = await this.findScoped(communityId, id);

    if (
      reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only PENDING or APPROVED reservations can be cancelled.',
      );
    }

    return this.updateStatus(communityId, id, ReservationStatus.CANCELLED);
  }

  // ==========================================
  // Complete Reservation
  // ==========================================

  async complete(communityId: string, id: string) {
    const reservation = await this.findScoped(communityId, id);

    if (reservation.status !== ReservationStatus.APPROVED) {
      throw new BadRequestException(
        'Only APPROVED reservations can be completed.',
      );
    }

    return this.updateStatus(communityId, id, ReservationStatus.COMPLETED);
  }
}
