import { Injectable } from '@nestjs/common';

import { CommunityStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { PublicCommunitiesQueryDto } from './dto/public-communities-query.dto';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findCommunities(query: PublicCommunitiesQueryDto) {
    const { search, limit } = query;

    const where: any = {
      status: CommunityStatus.ACTIVE,
      deletedAt: null,
    };

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
      ];
    }

    const communities = await this.prisma.community.findMany({
      where,

      take: limit,

      orderBy: {
        displayName: 'asc',
      },

      select: {
        id: true,
        code: true,
        slug: true,
        displayName: true,
      },
    });

    return {
      success: true,
      message: 'Communities retrieved successfully.',
      data: communities,
    };
  }
}
