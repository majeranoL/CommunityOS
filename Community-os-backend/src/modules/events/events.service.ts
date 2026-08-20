import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventStatus, NotificationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();
    dto.location = dto.location?.trim();
    dto.coverImageUrl = dto.coverImageUrl?.trim();

    const startAt = new Date(dto.startAt);
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;

    this.validateTimeRange(startAt, endAt);

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
        category: dto.category ?? 'GENERAL',
      },

      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: { select: { attendees: true } },
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
    const { page, limit, search, status, category, startFrom, startTo, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

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

    if (category) {
      where.category = category;
    }

    if (startFrom || startTo) {
      where.startAt = {};
      if (startFrom) where.startAt.gte = new Date(startFrom);
      if (startTo) where.startAt.lte = new Date(startTo);
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
          _count: { select: { attendees: true } },
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

  async findOne(communityId: string, id: string, userId?: string) {
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
        _count: { select: { attendees: true } },
        ...(userId
          ? {
              attendees: {
                where: { userId },
                select: { id: true },
                take: 1,
              },
            }
          : {}),
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

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.location) dto.location = dto.location.trim();

    if (dto.coverImageUrl) dto.coverImageUrl = dto.coverImageUrl.trim();

    const startAt = dto.startAt ? new Date(dto.startAt) : event.startAt;

    const endAt = dto.endAt ? new Date(dto.endAt) : (event.endAt ?? undefined);

    this.validateTimeRange(startAt, endAt);

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

        ...(dto.category && { category: dto.category }),
      },

      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: { select: { attendees: true } },
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
      event.startAt > new Date() ? EventStatus.UPCOMING : EventStatus.PUBLISHED;

    const published = await this.updateStatus(communityId, id, target);

    const remindersSetting = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key: 'eventReminders',
        },
      },
    });

    const remindersEnabled =
      (remindersSetting?.value as boolean | undefined) ?? true;

    if (remindersEnabled) {
      const userIds = await this.notifications.userIdsWithPermission(
        communityId,
        'event.view',
      );

      await this.notifications.notifyMany(
        communityId,
        userIds,
        NotificationType.EVENT,
        `Upcoming event: ${event.title}`,
        event.description ?? 'A new event has been published.',
        `/events/${event.id}`,
      );
    }

    return published;
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
  // RSVP
  // ==========================================

  async rsvp(communityId: string, eventId: string, userId: string) {
    const event = await this.findScoped(communityId, eventId);

    if (event.status === EventStatus.CANCELLED) {
      throw new ConflictException('Cannot RSVP to a cancelled event.');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new ConflictException('Cannot RSVP to a completed event.');
    }

    const existing = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      throw new ConflictException('Already RSVP\'d to this event.');
    }

    await this.prisma.eventAttendee.create({
      data: { eventId, userId },
    });

    const attendeeCount = await this.prisma.eventAttendee.count({
      where: { eventId },
    });

    return {
      success: true,
      message: 'RSVP confirmed.',
      data: { attendeeCount },
    };
  }

  async cancelRsvp(communityId: string, eventId: string, userId: string) {
    await this.findScoped(communityId, eventId);

    const existing = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!existing) {
      throw new NotFoundException('RSVP not found.');
    }

    await this.prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId, userId } },
    });

    const attendeeCount = await this.prisma.eventAttendee.count({
      where: { eventId },
    });

    return {
      success: true,
      message: 'RSVP cancelled.',
      data: { attendeeCount },
    };
  }

  async getAttendees(communityId: string, eventId: string) {
    await this.findScoped(communityId, eventId);

    const attendees = await this.prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      message: 'Attendees retrieved successfully.',
      data: attendees,
    };
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
        _count: { select: { attendees: true } },
      },
    });

    return {
      success: true,
      message: `Event ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: event,
    };
  }
}
