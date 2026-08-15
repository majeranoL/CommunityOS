import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { MEMBER_PERMISSIONS, permissions } from '../../../prisma/permissions';

// Reconciles the permission catalog against every community on boot:
//  1. ensures every catalog code exists as a Permission row (per community)
//  2. grants system roles any grants they are missing
//     (President → all; Member / Renter → the shared member subset)
// Idempotent and non-destructive: it only ever ADDS missing rows/grants,
// never removes existing ones. This keeps already-provisioned communities
// in sync when new permission codes are added to the catalog.
@Injectable()
export class PermissionsProvisioningService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsProvisioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const summary = await this.reconcileAllCommunities();
      this.logger.log(
        `Permission reconciliation complete: ${summary.permissionsAdded} permission(s) added, ` +
          `${summary.grantsAdded} grant(s) added across ${summary.communities} community(ies).`,
      );
    } catch (error) {
      // Never take the app down because reconciliation failed.
      this.logger.error(
        'Permission reconciliation failed; continuing startup.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async reconcileAllCommunities() {
    const communities = await this.prisma.community.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    let permissionsAdded = 0;
    let grantsAdded = 0;

    for (const community of communities) {
      const result = await this.reconcileCommunity(community.id);
      permissionsAdded += result.permissionsAdded;
      grantsAdded += result.grantsAdded;
    }

    return {
      communities: communities.length,
      permissionsAdded,
      grantsAdded,
    };
  }

  private async reconcileCommunity(communityId: string) {
    // 1. Ensure every catalog permission exists for the community.
    const permissionCreate = await this.prisma.permission.createMany({
      data: permissions.map((permission) => ({
        communityId,
        code: permission.code,
        module: permission.module,
        description: permission.description,
      })),
      skipDuplicates: true,
    });

    const permissionRows = await this.prisma.permission.findMany({
      where: { communityId },
      select: { id: true, code: true },
    });

    const idsByCode = new Map(
      permissionRows.map((permission) => [permission.code, permission.id]),
    );

    const allPermissionIds = permissionRows.map((permission) => permission.id);
    const memberPermissionIds = MEMBER_PERMISSIONS.map((code) =>
      idsByCode.get(code),
    ).filter((id): id is string => Boolean(id));

    // 2. Grant system roles any missing grants.
    const systemRoles = await this.prisma.role.findMany({
      where: { communityId, isSystem: true, deletedAt: null },
      select: { id: true, name: true },
    });

    let grantsAdded = 0;

    for (const role of systemRoles) {
      const isOfficer = role.name === 'President';
      const permissionIds = isOfficer ? allPermissionIds : memberPermissionIds;

      if (permissionIds.length === 0) continue;

      const rolePermissionCreate = await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });

      grantsAdded += rolePermissionCreate.count;
    }

    return {
      permissionsAdded: permissionCreate.count,
      grantsAdded,
    };
  }
}
