import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateTimeRange(startAt: Date, endAt?: Date) {
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid start time.');
    }

    if (endAt) {
      if (isNaN(endAt.getTime())) {
        throw new BadRequestException('Invalid end time.');
      }

      if (endAt <= startAt) {
        throw new BadRequestException('End time must be after start time.');
      }
    }
  }

  // ==========================================
  // Create Event
  // ==========================================

  async create(communityId: string, userId: string, dto: CreateEventDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();
    dto.location = dto.location?.trim();
    dto.coverImageUrl = dto.coverImageUrl?.trim();

    // ==========================================
    // Parse Dates
    // ==========================================

    const startAt = new Date(dto.startAt);
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;

    this.validateTimeRange(startAt, endAt);

    // ==========================================
    // Create Event
    // ==========================================

    const event = await this.prisma.event.create({
      data: {
        communityId,
        organizerId: userId,

        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt,
        endAt,
        coverImageUrl: dto.coverImageUrl,

        status: dto.status ?? EventStatus.DRAFT,
      },

      include: {
        organizer: {
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
      message: 'Event created successfully.',
      data: event,
    };
  }

  // ==========================================
  // Get All Events
  // ==========================================

  async findAll(communityId: string, query: EventQueryDto) {
    const { page, limit, search, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.event.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Events retrieved successfully.',
      data: events,

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
  // Get Event By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    return {
      success: true,
      message: 'Event retrieved successfully.',
      data: event,
    };
  }

  // ==========================================
  // Update Event
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateEventDto) {
    const event = await this.findScoped(communityId, id);

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.location) dto.location = dto.location.trim();

    if (dto.coverImageUrl) dto.coverImageUrl = dto.coverImageUrl.trim();

    // ==========================================
    // Parse Dates
    // ==========================================

    const startAt = dto.startAt ? new Date(dto.startAt) : event.startAt;

    const endAt = dto.endAt ? new Date(dto.endAt) : (event.endAt ?? undefined);

    this.validateTimeRange(startAt, endAt);

    // ==========================================
    // Update Event
    // ==========================================

    const updatedEvent = await this.prisma.event.update({
      where: {
        id,
      },

      data: {
        ...(dto.title && { title: dto.title }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.location !== undefined && {
          location: dto.location,
        }),

        ...(dto.startAt && { startAt }),

        ...(dto.endAt !== undefined && { endAt }),

        ...(dto.coverImageUrl !== undefined && {
          coverImageUrl: dto.coverImageUrl,
        }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        organizer: {
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
      message: 'Event updated successfully.',
      data: updatedEvent,
    };
  }

  // ==========================================
  // Delete Event (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    await this.prisma.event.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Event deleted successfully.',
    };
  }

  // ==========================================
  // Publish Event
  // ==========================================

  async publish(communityId: string, id: string) {
    const event = await this.findScoped(communityId, id);

    if (
      event.status === EventStatus.CANCELLED ||
      event.status === EventStatus.COMPLETED
    ) {
      throw new ConflictException('Event cannot be published.');
    }

    const target =
      event.startAt > new Date()
        ? EventStatus.UPCOMING
        : EventStatus.PUBLISHED;

    return this.updateStatus(communityId, id, target);
  }

  // ==========================================
  // Cancel Event
  // ==========================================

  async cancel(communityId: string, id: string) {
    const event = await this.findScoped(communityId, id);

    if (
      event.status === EventStatus.CANCELLED ||
      event.status === EventStatus.COMPLETED
    ) {
      throw new ConflictException('Event cannot be cancelled.');
    }

    return this.updateStatus(communityId, id, EventStatus.CANCELLED);
  }

  // ==========================================
  // Mark Event Completed
  // ==========================================

  async complete(communityId: string, id: string) {
    const event = await this.findScoped(communityId, id);

    if (event.status === EventStatus.CANCELLED) {
      throw new ConflictException('Cancelled events cannot be completed.');
    }

    return this.updateStatus(communityId, id, EventStatus.COMPLETED);
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    return event;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: EventStatus,
  ) {
    const event = await this.prisma.event.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        organizer: {
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
      message: `Event ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: event,
    };
  }
}
