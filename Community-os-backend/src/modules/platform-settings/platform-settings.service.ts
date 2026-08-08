import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { SettingEntryDto } from '../settings/dto/update-settings.dto';

export interface PlatformSettingDefault {
  key: string;
  value: unknown;
  group: string;
}

export interface PlatformSettingResult extends PlatformSettingDefault {
  configured: boolean;
}

const PLATFORM_SETTING_DEFAULTS: PlatformSettingDefault[] = [
  { key: 'platformName', value: 'CommunityOS', group: 'general' },
  { key: 'supportEmail', value: '', group: 'general' },
];

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async upsertOne(userId: string, entry: SettingEntryDto) {
    const value = entry.value as Prisma.InputJsonValue;

    return this.prisma.platformSetting.upsert({
      where: {
        key: entry.key,
      },

      update: {
        value,
        ...(entry.group !== undefined && { group: entry.group }),
        updatedById: userId,
      },

      create: {
        key: entry.key,
        value,
        group: entry.group ?? 'general',
        updatedById: userId,
      },
    });
  }

  private mergeDefaults(
    settings: {
      key: string;
      value: unknown;
      group: string;
    }[],
  ): PlatformSettingResult[] {
    const existing = new Map(settings.map((setting) => [setting.key, setting]));

    const defaultKeys = new Set(
      PLATFORM_SETTING_DEFAULTS.map((setting) => setting.key),
    );

    const merged: PlatformSettingResult[] = PLATFORM_SETTING_DEFAULTS.map(
      (setting) => ({
        ...setting,
        value: existing.get(setting.key)?.value ?? setting.value,
        configured: existing.has(setting.key),
      }),
    );

    for (const setting of settings) {
      if (!defaultKeys.has(setting.key)) {
        merged.push({
          ...setting,
          configured: true,
        });
      }
    }

    return merged;
  }

  // ==========================================
  // Get All Platform Settings
  // ==========================================

  async findAll() {
    const settings = await this.prisma.platformSetting.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    const merged = this.mergeDefaults(settings);

    return {
      success: true,
      message: 'Platform settings retrieved successfully.',
      data: merged,
    };
  }

  // ==========================================
  // Update Multiple Platform Settings
  // ==========================================

  async updateMany(userId: string, entries: SettingEntryDto[]) {
    const updated: {
      key: string;
      value: unknown;
      group: string;
    }[] = [];

    for (const entry of entries) {
      const setting = await this.upsertOne(userId, entry);

      updated.push({
        key: setting.key,
        value: setting.value,
        group: setting.group,
      });
    }

    return {
      success: true,
      message: 'Platform settings updated successfully.',
      data: updated,
    };
  }
}
