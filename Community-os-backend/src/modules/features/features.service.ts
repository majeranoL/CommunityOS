import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { FeatureAuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { AssignFeatureDto } from './dto/assign-feature.dto';
import { UpdateCommunityFeatureDto } from './dto/update-community-feature.dto';
import { FeatureQueryDto } from './dto/feature-query.dto';

interface SchemaProperty {
  type?: string;
  enum?: unknown[];
  properties?: Record<string, SchemaProperty>;
}

interface ConfigSchema {
  required?: string[];
  properties?: Record<string, SchemaProperty>;
}

function validateConfig(
  schema: ConfigSchema | null | undefined,
  config: Record<string, unknown>,
): string[] {
  if (!schema || typeof schema !== 'object') return [];

  const errors: string[] = [];
  const props = schema.properties ?? {};

  if (schema.required) {
    for (const key of schema.required) {
      if (config[key] === undefined || config[key] === null) {
        errors.push(`"${key}" is required.`);
      }
    }
  }

  for (const [key, prop] of Object.entries(props)) {
    const value = config[key];
    if (value === undefined || value === null) continue;

    if (prop.type) {
      const actual = Array.isArray(value) ? 'array' : typeof value;
      if (actual !== prop.type) {
        errors.push(`"${key}" must be of type ${prop.type}, got ${actual}.`);
      }
    }

    if (prop.enum && !prop.enum.includes(value)) {
      errors.push(`"${key}" must be one of: ${prop.enum.join(', ')}.`);
    }
  }

  return errors;
}

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

    if (dto.dependencies?.length) {
      const deps = await this.prisma.feature.findMany({
        where: { code: { in: dto.dependencies } },
        select: { code: true },
      });

      const found = new Set(deps.map((d) => d.code));
      const missing = dto.dependencies.filter((d) => !found.has(d));

      if (missing.length) {
        throw new BadRequestException(
          `Unknown dependency codes: ${missing.join(', ')}.`,
        );
      }
    }

    const feature = await this.prisma.feature.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),

        type: dto.type ?? 'OPTIONAL',
        isActive: dto.isActive ?? true,

        dependencies: dto.dependencies ?? [],

        configSchema: dto.configSchema as Prisma.InputJsonValue | undefined,
      },
    });

    if (feature.type === 'STANDARD') {
      await this.assignStandardFeature(feature.id);
    }

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
      if (dto.dependencies.length) {
        const deps = await this.prisma.feature.findMany({
          where: { code: { in: dto.dependencies } },
          select: { code: true },
        });

        const found = new Set(deps.map((d) => d.code));
        const missing = dto.dependencies.filter((d) => !found.has(d));

        if (missing.length) {
          throw new BadRequestException(
            `Unknown dependency codes: ${missing.join(', ')}.`,
          );
        }
      }

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
      select: { id: true, code: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    const dependents = await this.prisma.feature.findMany({
      where: { dependencies: { has: feature.code } },
      select: { code: true, name: true },
    });

    if (dependents.length) {
      throw new ConflictException(
        `Cannot delete this feature. It is a dependency of: ${dependents.map((d) => d.name).join(', ')}.`,
      );
    }

    const assignmentCount = await this.prisma.communityFeature.count({
      where: { featureId: id },
    });

    if (assignmentCount > 0) {
      throw new ConflictException(
        `Cannot delete this feature. It is assigned to ${assignmentCount} community(ies). Revoke all assignments first.`,
      );
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
      select: {
        id: true,
        code: true,
        isActive: true,
        dependencies: true,
        configSchema: true,
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    if (!feature.isActive) {
      throw new ConflictException(
        'Cannot assign an inactive feature to a community.',
      );
    }

    if (dto.config && feature.configSchema) {
      const errors = validateConfig(
        feature.configSchema as ConfigSchema,
        dto.config as Record<string, unknown>,
      );

      if (errors.length) {
        throw new BadRequestException(
          `Configuration validation failed: ${errors.join(' ')}`,
        );
      }
    }

    if (feature.dependencies.length) {
      const enabledDeps = await this.prisma.communityFeature.findMany({
        where: {
          communityId: dto.communityId,
          enabled: true,
          feature: { code: { in: feature.dependencies }, isActive: true },
        },
        select: { feature: { select: { code: true } } },
      });

      const enabledCodes = new Set(enabledDeps.map((e) => e.feature.code));
      const missing = feature.dependencies.filter((d) => !enabledCodes.has(d));

      if (missing.length) {
        throw new ConflictException(
          `Cannot assign "${feature.code}". Missing required dependencies: ${missing.join(', ')}. Assign and enable those features first.`,
        );
      }
    }

    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
      select: { id: true },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const existing = await this.prisma.communityFeature.findUnique({
      where: {
        communityId_featureId: {
          communityId: dto.communityId,
          featureId,
        },
      },
      select: { enabled: true },
    });

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

    const action = existing?.enabled
      ? FeatureAuditAction.CONFIG_UPDATED
      : FeatureAuditAction.ASSIGNED;

    await this.createAuditLog(featureId, dto.communityId, action, actorId, {
      config: dto.config,
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
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: { id: true, code: true, dependencies: true, configSchema: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

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

    if (dto.config !== undefined && feature.configSchema) {
      const errors = validateConfig(
        feature.configSchema as ConfigSchema,
        dto.config as Record<string, unknown>,
      );

      if (errors.length) {
        throw new BadRequestException(
          `Configuration validation failed: ${errors.join(' ')}`,
        );
      }
    }

    if (dto.enabled === true && feature.dependencies.length) {
      const enabledDeps = await this.prisma.communityFeature.findMany({
        where: {
          communityId,
          enabled: true,
          feature: { code: { in: feature.dependencies }, isActive: true },
        },
        select: { feature: { select: { code: true } } },
      });

      const enabledCodes = new Set(enabledDeps.map((e) => e.feature.code));
      const missing = feature.dependencies.filter((d) => !enabledCodes.has(d));

      if (missing.length) {
        throw new ConflictException(
          `Cannot enable "${feature.code}". Missing required dependencies: ${missing.join(', ')}.`,
        );
      }
    }

    const data: Prisma.CommunityFeatureUpdateInput = {};
    let auditAction: FeatureAuditAction = FeatureAuditAction.CONFIG_UPDATED;

    if (dto.enabled !== undefined) {
      data.enabled = dto.enabled;

      if (dto.enabled) {
        data.enabledAt = new Date();
        data.enabledBy = actorId;
        data.disabledAt = null;
        data.disabledBy = null;
        auditAction = FeatureAuditAction.ENABLED;
      } else {
        data.disabledAt = new Date();
        data.disabledBy = actorId;
        auditAction = FeatureAuditAction.DISABLED;
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

    await this.createAuditLog(featureId, communityId, auditAction, actorId, {
      config: dto.config,
      enabled: dto.enabled,
    });

    return {
      success: true,
      message: 'Feature assignment updated successfully.',
      data: updated,
    };
  }

  async revoke(featureId: string, communityId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: { id: true, code: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    const dependents = await this.prisma.communityFeature.findMany({
      where: {
        communityId,
        enabled: true,
        feature: {
          dependencies: { has: feature.code },
          isActive: true,
        },
      },
      include: { feature: { select: { name: true } } },
    });

    if (dependents.length) {
      throw new ConflictException(
        `Cannot revoke "${feature.code}". The following enabled features depend on it: ${dependents.map((d) => d.feature.name).join(', ')}. Disable or revoke those first.`,
      );
    }

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

    await this.createAuditLog(
      featureId,
      communityId,
      FeatureAuditAction.REVOKED,
      null,
      null,
    );

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
  // Audit Log
  // ==========================================

  async listAuditLogs(
    featureId: string,
    query: { communityId?: string; page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FeatureAuditLogWhereInput = { featureId };

    if (query.communityId) {
      where.communityId = query.communityId;
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.featureAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          community: {
            select: { id: true, code: true, displayName: true },
          },
        },
      }),
      this.prisma.featureAuditLog.count({ where }),
    ]);

    return {
      success: true,
      message: 'Audit logs retrieved successfully.',
      data: logs,
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

  async listAuditLogsByCommunity(
    communityId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FeatureAuditLogWhereInput = { communityId };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.featureAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          feature: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.featureAuditLog.count({ where }),
    ]);

    return {
      success: true,
      message: 'Community feature audit logs retrieved successfully.',
      data: logs,
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
  // Standard Feature Auto-Enable
  // ==========================================

  async assignStandardFeaturesToCommunity(communityId: string) {
    const standardFeatures = await this.prisma.feature.findMany({
      where: { type: 'STANDARD', isActive: true },
      select: { id: true },
    });

    if (!standardFeatures.length) return;

    await this.prisma.communityFeature.createMany({
      data: standardFeatures.map((f) => ({
        communityId,
        featureId: f.id,
        enabled: true,
        enabledAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  // ==========================================
  // Plan-based Feature Sync
  // ==========================================

  async syncFeaturesFromPlan(communityId: string, planId: string) {
    // Get features linked to this plan
    const planFeatures = await this.prisma.planFeature.findMany({
      where: { planId },
      select: { featureId: true },
    });

    const planFeatureIds = new Set(planFeatures.map((pf) => pf.featureId));

    // Get all STANDARD features (always enabled)
    const standardFeatures = await this.prisma.feature.findMany({
      where: { type: 'STANDARD', isActive: true },
      select: { id: true },
    });

    const standardIds = new Set(standardFeatures.map((f) => f.id));

    // All features that should be enabled = plan features + standard features
    const desiredFeatureIds = new Set([...planFeatureIds, ...standardIds]);

    // Get current enabled features for this community
    const currentAssignments = await this.prisma.communityFeature.findMany({
      where: { communityId },
      select: { featureId: true, enabled: true },
    });

    const currentEnabled = new Set(
      currentAssignments.filter((a) => a.enabled).map((a) => a.featureId),
    );

    // Enable features from plan that aren't already enabled
    const toEnable = [...desiredFeatureIds].filter(
      (id) => !currentEnabled.has(id),
    );

    if (toEnable.length > 0) {
      await this.prisma.communityFeature.createMany({
        data: toEnable.map((featureId) => ({
          communityId,
          featureId,
          enabled: true,
          enabledAt: new Date(),
        })),
        skipDuplicates: true,
      });

      // Re-enable any disabled features
      await this.prisma.communityFeature.updateMany({
        where: {
          communityId,
          featureId: { in: toEnable },
          enabled: false,
        },
        data: { enabled: true, disabledAt: null, disabledBy: null },
      });
    }

    // Revoke OPTIONAL features NOT in the plan
    const toRevoke = currentAssignments.filter(
      (a) => a.enabled && !desiredFeatureIds.has(a.featureId),
    );

    if (toRevoke.length > 0) {
      const revokeIds = toRevoke.map((a) => a.featureId);

      const optionalToRevoke = await this.prisma.feature.findMany({
        where: { id: { in: revokeIds }, type: 'OPTIONAL' },
        select: { id: true },
      });

      if (optionalToRevoke.length > 0) {
        await this.prisma.communityFeature.deleteMany({
          where: {
            communityId,
            featureId: { in: optionalToRevoke.map((f) => f.id) },
          },
        });
      }
    }
  }

  private async assignStandardFeature(featureId: string) {
    const communities = await this.prisma.community.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    if (!communities.length) return;

    await this.prisma.communityFeature.createMany({
      data: communities.map((c) => ({
        communityId: c.id,
        featureId,
        enabled: true,
        enabledAt: new Date(),
      })),
      skipDuplicates: true,
    });
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

  // ==========================================
  // Helpers
  // ==========================================

  private async createAuditLog(
    featureId: string,
    communityId: string,
    action: FeatureAuditAction,
    actorId: string | null,
    details: Record<string, unknown> | null,
  ) {
    await this.prisma.featureAuditLog.create({
      data: {
        featureId,
        communityId,
        action,
        actorId,
        details: details as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
