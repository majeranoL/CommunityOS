import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { CommunityStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CommunityQueryDto } from './dto/community-query.dto';

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Community
  // ==========================================

  async create(dto: CreateCommunityDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.code = dto.code.trim().toUpperCase();
    dto.slug = dto.slug.trim().toLowerCase();
    dto.displayName = dto.displayName.trim();

    dto.description = dto.description?.trim();
    dto.email = dto.email?.trim().toLowerCase();
    dto.contactNumber = dto.contactNumber?.trim();
    dto.address = dto.address?.trim();
    dto.logoUrl = dto.logoUrl?.trim();

    // ==========================================
    // Duplicate Code
    // ==========================================

    const existingCode = await this.prisma.community.findFirst({
      where: {
        code: dto.code,
        deletedAt: null,
      },
    });

    if (existingCode) {
      throw new ConflictException('Community code already exists.');
    }

    // ==========================================
    // Duplicate Slug
    // ==========================================

    const existingSlug = await this.prisma.community.findFirst({
      where: {
        slug: dto.slug,
        deletedAt: null,
      },
    });

    if (existingSlug) {
      throw new ConflictException('Community slug already exists.');
    }

    // ==========================================
    // Create Community
    // ==========================================

    const community = await this.prisma.community.create({
      data: {
        code: dto.code,
        slug: dto.slug,
        displayName: dto.displayName,

        description: dto.description,
        email: dto.email,
        contactNumber: dto.contactNumber,
        address: dto.address,
        logoUrl: dto.logoUrl,

        status: dto.status ?? CommunityStatus.ACTIVE,
      },

      select: {
        id: true,
        code: true,
        slug: true,
        displayName: true,

        description: true,
        email: true,
        contactNumber: true,
        address: true,
        logoUrl: true,

        status: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Community created successfully.',
      data: community,
    };
  }

  // ==========================================
  // Get All Communities
  // ==========================================

  async findAll(communityId: string, query: CommunityQueryDto) {
    const { page, limit, search, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      id: communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          displayName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
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

    const [communities, total] = await this.prisma.$transaction([
      this.prisma.community.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          code: true,
          slug: true,
          displayName: true,

          email: true,
          contactNumber: true,
          address: true,
          logoUrl: true,

          status: true,

          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.community.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Communities retrieved successfully.',
      data: communities,

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
  // Get Community By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      select: {
        id: true,
        code: true,
        slug: true,
        displayName: true,

        description: true,
        email: true,
        contactNumber: true,
        address: true,
        logoUrl: true,

        status: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!community || community.id !== communityId) {
      throw new NotFoundException('Community not found.');
    }

    return {
      success: true,
      message: 'Community retrieved successfully.',
      data: community,
    };
  }

  // ==========================================
  // Update Community
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateCommunityDto) {
    const community = await this.prisma.community.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!community || community.id !== communityId) {
      throw new NotFoundException('Community not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.code) dto.code = dto.code.trim().toUpperCase();

    if (dto.slug) dto.slug = dto.slug.trim().toLowerCase();

    if (dto.displayName) dto.displayName = dto.displayName.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.email) dto.email = dto.email.trim().toLowerCase();

    if (dto.contactNumber) dto.contactNumber = dto.contactNumber.trim();

    if (dto.address) dto.address = dto.address.trim();

    if (dto.logoUrl) dto.logoUrl = dto.logoUrl.trim();

    // ==========================================
    // Duplicate Code
    // ==========================================

    if (dto.code) {
      const existingCode = await this.prisma.community.findFirst({
        where: {
          code: dto.code,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existingCode) {
        throw new ConflictException('Community code already exists.');
      }
    }

    // ==========================================
    // Duplicate Slug
    // ==========================================

    if (dto.slug) {
      const existingSlug = await this.prisma.community.findFirst({
        where: {
          slug: dto.slug,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existingSlug) {
        throw new ConflictException('Community slug already exists.');
      }
    }

    // ==========================================
    // Update Community
    // ==========================================

    const updatedCommunity = await this.prisma.community.update({
      where: {
        id,
      },

      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.slug && { slug: dto.slug }),

        ...(dto.displayName && {
          displayName: dto.displayName,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.email !== undefined && {
          email: dto.email,
        }),

        ...(dto.contactNumber !== undefined && {
          contactNumber: dto.contactNumber,
        }),

        ...(dto.address !== undefined && {
          address: dto.address,
        }),

        ...(dto.logoUrl !== undefined && {
          logoUrl: dto.logoUrl,
        }),

        ...(dto.status && { status: dto.status }),
      },

      select: {
        id: true,
        code: true,
        slug: true,
        displayName: true,

        description: true,
        email: true,
        contactNumber: true,
        address: true,
        logoUrl: true,

        status: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Community updated successfully.',
      data: updatedCommunity,
    };
  }

  // ==========================================
  // Delete Community (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!community || community.id !== communityId) {
      throw new NotFoundException('Community not found.');
    }

    await this.prisma.community.update({
      where: {
        id,
      },

      data: {
        status: CommunityStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Community deleted successfully.',
    };
  }
}
