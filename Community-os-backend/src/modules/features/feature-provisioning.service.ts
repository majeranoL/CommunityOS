import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { BUILTIN_FEATURES } from '../../../prisma/feature-catalog';

// Reconciles the feature catalog on boot:
//   ensures every built-in feature exists as a Feature row.
// Akin to PermissionsProvisioningService — idempotent and non-destructive:
// it only ever ADDS missing rows, never removes or overwrites existing ones.
// This keeps already-provisioned databases in sync when new feature codes
// are added to the built-in catalog (e.g. a feature missing from an
// earlier seed run).
@Injectable()
export class FeatureProvisioningService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeatureProvisioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const added = await this.ensureBuiltinFeatures();
      this.logger.log(
        `Feature catalog reconciled: ${added} built-in feature(s) added.`,
      );
    } catch (error) {
      // Never take the app down because reconciliation failed.
      this.logger.error(
        'Feature catalog reconciliation failed; continuing startup.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async ensureBuiltinFeatures(): Promise<number> {
    let added = 0;

    for (const feature of BUILTIN_FEATURES) {
      const existing = await this.prisma.feature.findUnique({
        where: { code: feature.code },
        select: { id: true },
      });

      if (existing) continue;

      await this.prisma.feature.create({
        data: {
          code: feature.code,
          name: feature.name,
          description: feature.description,
          type: feature.type,
          dependencies: feature.dependencies,
          configSchema: feature.configSchema,
        },
      });

      added += 1;
    }

    return added;
  }
}
