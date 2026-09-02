import { Injectable, NotFoundException } from '@nestjs/common';

import { CommunityStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CommunitiesService } from '../communities/communities.service';
import { AuthService } from '../auth/auth.service';

import { PublicCommunitiesQueryDto } from './dto/public-communities-query.dto';
import { ProvisionCommunityDto } from '../communities/dto/provision-community.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communitiesService: CommunitiesService,
    private readonly authService: AuthService,
  ) {}

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

  // ==========================================
  // Single community by slug (tenant storefront)
  // ==========================================

  async findCommunityBySlug(slug: string) {
    const community = await this.prisma.community.findFirst({
      where: {
        slug,
        status: CommunityStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const { id, code, displayName, description, address, logoUrl } = community;

    return {
      success: true,
      message: 'Community retrieved successfully.',
      data: {
        id,
        code,
        slug: community.slug,
        displayName,
        description,
        address,
        branding: {
          primaryColor: community.primaryColor,
          accentColor: community.accentColor,
          sidebarColor: community.sidebarColor,
          logoUrl,
        },
        registrationOpen: await this.isRegistrationOpen(id),
      },
    };
  }

  private async isRegistrationOpen(communityId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key: 'registrationMode',
        },
      },
    });

    return (setting?.value as string | undefined) !== 'CLOSED';
  }

  // ==========================================
  // Subscription Plans (public pricing)
  // ==========================================

  async findPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        price: true,
        billingCycle: true,
        features: true,
        maxUsers: true,
        maxResidents: true,
        isActive: true,
        sortOrder: true,
        planFeatures: {
          select: {
            feature: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Subscription plans retrieved successfully.',
      data: plans,
    };
  }

  // ==========================================
  // HOA Signup (provision community + owner session)
  // ==========================================

  async signup(
    dto: ProvisionCommunityDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const provisioned = await this.communitiesService.provision(dto);

    const owner = provisioned.data.owner;

    const session = await this.authService.login(
      dto.owner.email.trim().toLowerCase(),
      dto.owner.password,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Community created successfully. Welcome aboard!',
      data: {
        community: provisioned.data.community,
        subscription: provisioned.data.subscription,
        owner: {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
        },
        session: session.data,
      },
    };
  }
}
