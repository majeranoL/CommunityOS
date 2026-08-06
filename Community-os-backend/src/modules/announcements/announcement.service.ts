import { Injectable, NotFoundException } from '@nestjs/common';

import { AnnouncementStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Announcement
  // ==========================================

  async create(communityId: string, dto: CreateAnnouncementDto) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    const coverImageUrl = dto.coverImageUrl?.trim();

    const announcement = await this.prisma.announcement.create({
      data: {
        communityId,

        title,
        content,
        coverImageUrl,

        status: dto.status ?? AnnouncementStatus.DRAFT,

        publishedAt:
          dto.status === AnnouncementStatus.PUBLISHED ? new Date() : null,
      },

      select: {
        id: true,

        title: true,
        content: true,
        coverImageUrl: true,

        status: true,
        publishedAt: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Announcement created successfully.',
      data: announcement,
    };
  }
  // ==========================================
  // Get All Announcements
  // ==========================================

  async findAll(communityId: string, query: AnnouncementQueryDto) {
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
          content: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Status Filter
    if (status) {
      where.status = status;
    }

    const [announcements, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          title: true,
          coverImageUrl: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      }),

      this.prisma.announcement.count({
        where,
      }),
    ]);

    return {
      success: true,
      data: announcements,

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
  // Get Announcement By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      select: {
        id: true,

        title: true,
        content: true,
        coverImageUrl: true,

        status: true,
        publishedAt: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }

    return {
      success: true,
      message: 'Announcement retrieved successfully.',
      data: announcement,
    };
  }
  // ==========================================
  // Update Announcement
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }

    const updatedAnnouncement = await this.prisma.announcement.update({
      where: {
        id,
      },

      data: {
        ...(dto.title && {
          title: dto.title.trim(),
        }),

        ...(dto.content && {
          content: dto.content.trim(),
        }),

        ...(dto.coverImageUrl !== undefined && {
          coverImageUrl: dto.coverImageUrl?.trim(),
        }),

        ...(dto.status && {
          status: dto.status,
        }),

        ...(dto.status === AnnouncementStatus.PUBLISHED && {
          publishedAt: new Date(),
        }),
      },

      select: {
        id: true,
        title: true,
        content: true,
        coverImageUrl: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Announcement updated successfully.',
      data: updatedAnnouncement,
    };
  }
  // ==========================================
  // Delete Announcement (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }

    await this.prisma.announcement.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        status: AnnouncementStatus.ARCHIVED,
      },
    });

    return {
      success: true,
      message: 'Announcement deleted successfully.',
    };
  }
  // ==========================================
  // Publish Announcement
  // ==========================================

  async publish(communityId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }

    const publishedAnnouncement = await this.prisma.announcement.update({
      where: {
        id,
      },

      data: {
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },

      select: {
        id: true,
        title: true,
        content: true,
        coverImageUrl: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Announcement published successfully.',
      data: publishedAnnouncement,
    };
  }
}
