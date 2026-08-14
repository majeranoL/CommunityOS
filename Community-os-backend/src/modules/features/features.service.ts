import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { AssignFeatureDto } from './dto/assign-feature.dto';
import { UpdateCommunityFeatureDto } from './dto/update-community-feature.dto';
import { FeatureQueryDto } from './dto/feature-query.dto';

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Feature Availability (runtime checks)
  // ==========================================

  async isEnabled(communityId: string, code: string) {
    const assignment = await this.prisma.communityFeature.findFirst({
      where: {
        communityId,
        enabled: true,
        feature: {
          code,
          isActive: true,
        },
      },
      select: { id: true },
    });

    return assignment !== null;
  }

  async assertEnabled(communityId: string, code: string) {
    const enabled = await this.isEnabled(communityId, code);

    if (!enabled) {
      throw new ForbiddenException(
        `This community does not have the "${code}" feature enabled.`,
      );
    }
  }

  async getConfig(communityId: string, code: string) {
    const assignment = await this.prisma.communityFeature.findFirst({
      where: {
        communityId,
        enabled: true,
        feature: {
          code,
          isActive: true,
        },
      },
      select: { config: true },
    });

    return (assignment?.config as Record<string, unknown> | null) ?? {};
  }

  // ==========================================
  // Feature Catalog (Superadmin)
  // ==========================================

  async findAll(query: FeatureQueryDto) {
    const { page, limit, search, type, communityId } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.FeatureWhereInput = {};

    if (search) {
      where.OR = [
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          name: {
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
      ];
    }

    if (type) {
      where.type = type;
    }

    if (communityId) {
      where.communityFeatures = {
        some: {
          communityId,
        },
      };
    }

    const [features, total] = await this.prisma.$transaction([
      this.prisma.feature.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          name: 'asc',
        },

        include: {
          _count: {
            select: {
              communityFeatures: true,
            },
          },
        },
      }),

      this.prisma.feature.count({ where }),
    ]);

    return {
      success: true,
      message: 'Features retrieved successfully.',
      data: features,

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

  async findOne(id: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },

      include: {
        communityFeatures: {
          include: {
            community: {
              select: {
                id: true,
                code: true,
                displayName: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    return {
      success: true,
      message: 'Feature retrieved successfully.',
      data: feature,
    };
  }

  async create(dto: CreateFeatureDto) {
    const code = dto.code.trim().toLowerCase();

    const existing = await this.prisma.feature.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A feature with this code already exists.');
    }

    const feature = await this.prisma.feature.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),

        type: dto.type,
        isActive: dto.isActive ?? true,

        dependencies: dto.dependencies,

        configSchema: dto.configSchema as Prisma.InputJsonValue | undefined,
      },
    });

    return {
      success: true,
      message: 'Feature created successfully.',
      data: feature,
    };
  }

  async update(id: string, dto: UpdateFeatureDto) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    const data: Prisma.FeatureUpdateInput = {};

    if (dto.code !== undefined) {
      data.code = dto.code.trim().toLowerCase();
    }

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim();
    }

    if (dto.type !== undefined) {
      data.type = dto.type;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.dependencies !== undefined) {
      data.dependencies = dto.dependencies;
    }

    if (dto.configSchema !== undefined) {
      data.configSchema = dto.configSchema as Prisma.InputJsonValue | undefined;
    }

    const updated = await this.prisma.feature.update({
      where: { id },
      data,
    });

    return {
      success: true,
      message: 'Feature updated successfully.',
      data: updated,
    };
  }

  async remove(id: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    await this.prisma.feature.delete({ where: { id } });

    return {
      success: true,
      message: 'Feature removed successfully.',
    };
  }

  // ==========================================
  // Community Assignment (Superadmin)
  // ==========================================

  async assign(featureId: string, actorId: string, dto: AssignFeatureDto) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: { id: true, isActive: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    if (!feature.isActive) {
      throw new ConflictException(
        'Cannot assign an inactive feature to a community.',
      );
    }

    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
      select: { id: true },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const assignment = await this.prisma.communityFeature.upsert({
      where: {
        communityId_featureId: {
          communityId: dto.communityId,
          featureId,
        },
      },

      update: {
        enabled: true,
        config: dto.config as Prisma.InputJsonValue | undefined,
        enabledAt: new Date(),
        enabledBy: actorId,
        disabledAt: null,
        disabledBy: null,
      },

      create: {
        communityId: dto.communityId,
        featureId,
        enabled: true,
        config: dto.config as Prisma.InputJsonValue | undefined,
        enabledAt: new Date(),
        enabledBy: actorId,
      },

      include: {
        feature: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        community: {
          select: {
            id: true,
            code: true,
            displayName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Feature assigned to community successfully.',
      data: assignment,
    };
  }

  async updateAssignment(
    featureId: string,
    communityId: string,
    actorId: string,
    dto: UpdateCommunityFeatureDto,
  ) {
    const assignment = await this.prisma.communityFeature.findUnique({
      where: {
        communityId_featureId: {
          communityId,
          featureId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'This feature is not assigned to the community.',
      );
    }

    const data: Prisma.CommunityFeatureUpdateInput = {};

    if (dto.enabled !== undefined) {
      data.enabled = dto.enabled;

      if (dto.enabled) {
        data.enabledAt = new Date();
        data.enabledBy = actorId;
        data.disabledAt = null;
        data.disabledBy = null;
      } else {
        data.disabledAt = new Date();
        data.disabledBy = actorId;
      }
    }

    if (dto.config !== undefined) {
      data.config = dto.config as Prisma.InputJsonValue | undefined;
    }

    const updated = await this.prisma.communityFeature.update({
      where: {
        communityId_featureId: {
          communityId,
          featureId,
        },
      },
      data,
    });

    return {
      success: true,
      message: 'Feature assignment updated successfully.',
      data: updated,
    };
  }

  async revoke(featureId: string, communityId: string) {
    const assignment = await this.prisma.communityFeature.findUnique({
      where: {
        communityId_featureId: {
          communityId,
          featureId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'This feature is not assigned to the community.',
      );
    }

    await this.prisma.communityFeature.delete({
      where: {
        communityId_featureId: {
          communityId,
          featureId,
        },
      },
    });

    return {
      success: true,
      message: 'Feature assignment revoked successfully.',
    };
  }

  // ==========================================
  // Views
  // ==========================================

  async listCommunities(featureId: string) {
    const assignments = await this.prisma.communityFeature.findMany({
      where: { featureId },

      include: {
        community: {
          select: {
            id: true,
            code: true,
            displayName: true,
            status: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      message: 'Assigned communities retrieved successfully.',
      data: assignments,
    };
  }

  async listByCommunity(communityId: string) {
    const assignments = await this.prisma.communityFeature.findMany({
      where: { communityId },

      include: {
        feature: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            type: true,
            isActive: true,
          },
        },
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      message: 'Community features retrieved successfully.',
      data: assignments,
    };
  }

  // ==========================================
  // Community-facing: enabled features (frontend nav / config)
  // ==========================================

  async findEnabledByCommunity(communityId: string) {
    const assignments = await this.prisma.communityFeature.findMany({
      where: {
        communityId,
        enabled: true,
        feature: {
          isActive: true,
        },
      },

      include: {
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

      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      message: 'Enabled features retrieved successfully.',
      data: assignments.map((assignment) => ({
        id: assignment.feature.id,
        code: assignment.feature.code,
        name: assignment.feature.name,
        description: assignment.feature.description,
        type: assignment.feature.type,
        config: (assignment.config as Record<string, unknown> | null) ?? {},
      })),
    };
  }
}
