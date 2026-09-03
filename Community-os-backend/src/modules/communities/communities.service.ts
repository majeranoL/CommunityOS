import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import {
  AccountStatus,
  BillingCycle,
  CommunityStatus,
  HouseholdStatus,
  InvoiceStatus,
  Prisma,
  ResidentStatus,
  ResidentType,
  SubscriptionStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';

import { MEMBER_PERMISSIONS, permissions } from '../../../prisma/permissions';

import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CommunityQueryDto } from './dto/community-query.dto';
import { ProvisionCommunityDto } from './dto/provision-community.dto';

const PROVISION_TRIAL_DAYS = 14;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

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

    await this.featuresService.assignStandardFeaturesToCommunity(community.id);

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
  // Get Community Branding
  // ==========================================

  async getBranding(communityId: string) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        sidebarColor: true,
        faviconUrl: true,
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    return {
      success: true,
      message: 'Branding retrieved successfully.',
      data: {
        displayName: community.displayName,
        logoUrl: community.logoUrl,
        primaryColor: community.primaryColor,
        accentColor: community.accentColor,
        sidebarColor: community.sidebarColor,
        faviconUrl: community.faviconUrl,
      },
    };
  }

  // ==========================================
  // Update Community Branding
  // ==========================================

  async updateBranding(
    communityId: string,
    dto: {
      primaryColor?: string;
      accentColor?: string;
      sidebarColor?: string;
      faviconUrl?: string;
      logoUrl?: string;
    },
  ) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const updated = await this.prisma.community.update({
      where: { id: communityId },
      data: {
        ...(dto.primaryColor !== undefined && {
          primaryColor: dto.primaryColor || null,
        }),
        ...(dto.accentColor !== undefined && {
          accentColor: dto.accentColor || null,
        }),
        ...(dto.sidebarColor !== undefined && {
          sidebarColor: dto.sidebarColor || null,
        }),
        ...(dto.faviconUrl !== undefined && {
          faviconUrl: dto.faviconUrl || null,
        }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl || null }),
      },
      select: {
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        sidebarColor: true,
        faviconUrl: true,
      },
    });

    return {
      success: true,
      message: 'Branding updated successfully.',
      data: updated,
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

  // ==========================================
  // Provision Community (HOA signup / platform admin)
  // ==========================================

  async provision(dto: ProvisionCommunityDto, requireUnit = false) {
    const ownerEmail = dto.owner.email.trim().toLowerCase();

    // ==========================================
    // Duplicate Owner Email
    // ==========================================

    const existingAccount = await this.prisma.account.findUnique({
      where: { email: ownerEmail },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException('Email is already registered.');
    }

    // ==========================================
    // Resolve Subscription Plan
    // ==========================================

    const plan = dto.planId
      ? await this.prisma.subscriptionPlan.findFirst({
          where: { id: dto.planId, isActive: true, deletedAt: null },
        })
      : await this.prisma.subscriptionPlan.findFirst({
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        });

    // ==========================================
    // Generate Unique Code + Slug
    // ==========================================

    const code = await this.generateUniqueCode();
    const slug = await this.generateUniqueSlug(
      slugify(dto.displayName) || 'hoa',
    );

    // ==========================================
    // Hash Owner Password
    // ==========================================

    const passwordHash = await bcrypt.hash(
      dto.owner.password,
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );

    // ==========================================
    // Require Owner Unit Info (superadmin flow)
    // ==========================================

    const owner = dto.owner;
    const hasUnitInfo = Boolean(
      owner.block?.trim() ||
      owner.lot?.trim() ||
      owner.unit?.trim() ||
      owner.address?.trim(),
    );

    if (requireUnit && !hasUnitInfo) {
      throw new BadRequestException(
        'Please provide at least one of block, lot, unit, or address for the owner.',
      );
    }

    // ==========================================
    // Provision Transaction
    // ==========================================

    const result = await this.prisma.$transaction(async (tx) => {
      // ---------- Community ----------

      const community = await tx.community.create({
        data: {
          code,
          slug,
          displayName: dto.displayName.trim(),

          description: dto.description?.trim(),
          email: dto.email?.trim().toLowerCase(),
          contactNumber: dto.contactNumber?.trim(),
          address: dto.address?.trim(),
          logoUrl: dto.logoUrl?.trim(),

          status: CommunityStatus.ACTIVE,
        },
        select: {
          id: true,
          code: true,
          slug: true,
          displayName: true,
          email: true,
          status: true,
          createdAt: true,
        },
      });

      // ---------- System Roles ----------

      const presidentRole = await tx.role.create({
        data: {
          communityId: community.id,
          name: 'President',
          description: 'Community President',
          isSystem: true,
        },
      });

      const memberRole = await tx.role.create({
        data: {
          communityId: community.id,
          name: 'Member',
          description: 'Community Member',
          isSystem: true,
        },
      });

      const renterRole = await tx.role.create({
        data: {
          communityId: community.id,
          name: 'Renter',
          description: 'Renter (tenant) - limited account for a rented unit',
          isSystem: true,
        },
      });

      // ---------- Permissions ----------

      await tx.permission.createMany({
        data: permissions.map((permission) => ({
          communityId: community.id,
          code: permission.code,
          module: permission.module,
          description: permission.description,
        })),
      });

      const permissionRows = await tx.permission.findMany({
        where: { communityId: community.id },
        select: { id: true, code: true },
      });

      await tx.rolePermission.createMany({
        data: permissionRows.map((permission) => ({
          roleId: presidentRole.id,
          permissionId: permission.id,
        })),
      });

      const memberPermissions = permissionRows.filter((permission) =>
        MEMBER_PERMISSIONS.includes(permission.code),
      );

      await tx.rolePermission.createMany({
        data: memberPermissions.map((permission) => ({
          roleId: memberRole.id,
          permissionId: permission.id,
        })),
      });

      await tx.rolePermission.createMany({
        data: memberPermissions.map((permission) => ({
          roleId: renterRole.id,
          permissionId: permission.id,
        })),
      });

      // ---------- Subscription (Trial) ----------

      let subscription: {
        id: string;
        status: SubscriptionStatus;
        planId: string | null;
        endsAt: Date;
      } | null = null;

      let invoice: {
        id: string;
        invoiceNumber: string;
        amount: number | Prisma.Decimal;
        status: InvoiceStatus;
        dueDate: Date;
      } | null = null;

      if (plan) {
        const startsAt = new Date();
        const trialEndsAt = addDays(startsAt, PROVISION_TRIAL_DAYS);

        subscription = await tx.subscription.create({
          data: {
            communityId: community.id,
            planId: plan.id,
            status: SubscriptionStatus.TRIAL,
            startsAt,
            endsAt: trialEndsAt,
            trialEndsAt,
            autoRenew: true,
          },
          select: {
            id: true,
            status: true,
            planId: true,
            endsAt: true,
          },
        });

        // ---------- Issue first invoice for the plan (unless exempt) ----------

        if (Number(plan.price) > 0) {
          const invoiceCount = await tx.invoice.count({
            where: { communityId: community.id },
          });

          const now = new Date();
          const isExempt = await tx.billingExemption.findFirst({
            where: {
              communityId: community.id,
              startDate: { lte: now },
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          });

          invoice = await tx.invoice.create({
            data: {
              communityId: community.id,
              subscriptionId: subscription.id,
              invoiceNumber: `INV-${String(invoiceCount + 1).padStart(6, '0')}`,
              amount: isExempt ? 0 : Number(plan.price),
              billingCycle: plan.billingCycle ?? BillingCycle.MONTHLY,
              status: isExempt ? InvoiceStatus.WAIVED : InvoiceStatus.ISSUED,
              dueDate: trialEndsAt,
            },
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              status: true,
              dueDate: true,
            },
          });
        }
      }

      // ---------- Owner Account + User ----------

      const account = await tx.account.create({
        data: {
          email: ownerEmail,
          passwordHash,
          status: AccountStatus.ACTIVE,
        },
        select: { id: true },
      });

      // ---------- Owner Household + Resident ----------

      let residentId: string | null = null;

      if (hasUnitInfo) {
        const block = owner.block?.trim();
        const lot = owner.lot?.trim();
        const unit = owner.unit?.trim();

        // Find or create the household (mirrors the member register flow).
        let household: { id: string; status?: HouseholdStatus } | null =
          block && lot
            ? await tx.household.findFirst({
                where: {
                  communityId: community.id,
                  block,
                  lot,
                },
                select: { id: true, status: true },
              })
            : null;

        if (household?.status === HouseholdStatus.INACTIVE) {
          await tx.household.update({
            where: { id: household.id },
            data: { status: HouseholdStatus.ACTIVE, deletedAt: null },
          });
        }

        if (!household && (block || lot || unit)) {
          household = await tx.household.findFirst({
            where: {
              communityId: community.id,
              deletedAt: null,
              ...(block ? { block } : {}),
              ...(lot ? { lot } : {}),
              ...(unit ? { unit } : {}),
            },
            select: { id: true },
          });
        }

        if (!household) {
          household = await tx.household.create({
            data: {
              communityId: community.id,
              block: block ?? null,
              lot: lot ?? null,
              unit: unit ?? null,
              address: owner.address?.trim() ?? null,
              status: HouseholdStatus.ACTIVE,
            },
            select: { id: true },
          });
        }

        const latestResident = await tx.resident.findFirst({
          where: { communityId: community.id },
          orderBy: { residentNumber: 'desc' },
          select: { residentNumber: true },
        });

        let residentNumber = 'RES-000001';

        if (latestResident) {
          const latestNumber = Number(
            latestResident.residentNumber.replace('RES-', ''),
          );
          residentNumber = `RES-${String(latestNumber + 1).padStart(6, '0')}`;
        }

        const resident = await tx.resident.create({
          data: {
            communityId: community.id,
            residentNumber,
            householdId: household.id,
            firstName: capitalize(owner.firstName),
            middleName: owner.middleName ? capitalize(owner.middleName) : null,
            lastName: capitalize(owner.lastName),
            phoneNumber: owner.phoneNumber?.trim(),
            email: ownerEmail,
            status: ResidentStatus.ACTIVE,
            residentType: ResidentType.OWNER,
          },
          select: { id: true },
        });

        residentId = resident.id;
      }

      const user = await tx.user.create({
        data: {
          accountId: account.id,
          communityId: community.id,
          residentId,
          referenceNumber: 'USR-000001',

          firstName: capitalize(dto.owner.firstName),
          lastName: capitalize(dto.owner.lastName),

          status: UserStatus.ACTIVE,
          isPlatformAdmin: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: presidentRole.id,
        },
      });

      return { community, subscription, invoice, user };
    });

    await this.featuresService.assignStandardFeaturesToCommunity(
      result.community.id,
    );

    // Sync features from the assigned plan (enables optional features included in the plan)
    if (result.subscription?.planId) {
      await this.featuresService.syncFeaturesFromPlan(
        result.community.id,
        result.subscription.planId,
      );
    }

    return {
      success: true,
      message: 'Community provisioned successfully.',
      data: {
        community: result.community,
        subscription: result.subscription,
        invoice: result.invoice,
        owner: {
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: ownerEmail,
        },
      },
    };
  }

  // ==========================================
  // Provision Helpers
  // ==========================================

  private async generateUniqueCode() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `HOA-${Math.floor(100000 + Math.random() * 900000)}`;

      const existing = await this.prisma.community.findFirst({
        where: { code: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique community code. Please try again.',
    );
  }

  private async generateUniqueSlug(base: string) {
    // Prefer the clean, name-derived slug with no suffix.
    const baseAvailable = await this.prisma.community.findFirst({
      where: { slug: base },
      select: { id: true },
    });

    if (!baseAvailable) {
      return base;
    }

    // Only on collision, append a deterministic numeric suffix.
    for (let attempt = 2; attempt <= 10; attempt++) {
      const candidate = `${base}-${attempt}`;

      const existing = await this.prisma.community.findFirst({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique community slug. Please try again.',
    );
  }
}
