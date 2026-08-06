import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingEntryDto } from './dto/update-settings.dto';

export interface SettingDefault {
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
}

export interface SettingResult extends SettingDefault {
  configured: boolean;
}

const SETTING_DEFAULTS: SettingDefault[] = [
  { key: 'communityName', value: '', group: 'general', isPublic: true },
  { key: 'communityDescription', value: '', group: 'general', isPublic: true },
  { key: 'contactEmail', value: '', group: 'general', isPublic: true },
  { key: 'contactNumber', value: '', group: 'general', isPublic: true },
  { key: 'address', value: '', group: 'general', isPublic: true },
  { key: 'logoUrl', value: '', group: 'general', isPublic: true },
  {
    key: 'pollReminders',
    value: true,
    group: 'notifications',
    isPublic: false,
  },
  {
    key: 'eventReminders',
    value: true,
    group: 'notifications',
    isPublic: false,
  },
  {
    key: 'guestPassAutoApprove',
    value: false,
    group: 'security',
    isPublic: false,
  },
  { key: 'currency', value: 'PHP', group: 'billing', isPublic: false },
  { key: 'paymentTermsDays', value: 30, group: 'billing', isPublic: false },
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async upsertOne(
    communityId: string,
    userId: string,
    entry: SettingEntryDto,
  ) {
    const value = entry.value as Prisma.InputJsonValue;

    return this.prisma.setting.upsert({
      where: {
        communityId_key: {
          communityId,
          key: entry.key,
        },
      },

      update: {
        value,
        ...(entry.group !== undefined && { group: entry.group }),
        ...(entry.isPublic !== undefined && { isPublic: entry.isPublic }),
        updatedById: userId,
      },

      create: {
        communityId,
        key: entry.key,
        value,
        group: entry.group ?? 'general',
        isPublic: entry.isPublic ?? false,
        updatedById: userId,
      },
    });
  }

  private mergeDefaults(
    settings: {
      key: string;
      value: unknown;
      group: string;
      isPublic: boolean;
    }[],
  ): SettingResult[] {
    const existing = new Map(settings.map((setting) => [setting.key, setting]));

    const defaultKeys = new Set(SETTING_DEFAULTS.map((setting) => setting.key));

    const merged: SettingResult[] = SETTING_DEFAULTS.map((setting) => ({
      ...setting,
      value: existing.get(setting.key)?.value ?? setting.value,
      isPublic: existing.get(setting.key)?.isPublic ?? setting.isPublic,
      configured: existing.has(setting.key),
    }));

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
  // Get All Settings
  // ==========================================

  async findAll(communityId: string) {
    const settings = await this.prisma.setting.findMany({
      where: {
        communityId,
      },

      orderBy: {
        key: 'asc',
      },
    });

    const merged = this.mergeDefaults(settings);

    return {
      success: true,
      message: 'Settings retrieved successfully.',
      data: merged,
    };
  }

  // ==========================================
  // Get Defaults
  // ==========================================

  defaults() {
    return {
      success: true,
      message: 'Setting defaults retrieved successfully.',
      data: SETTING_DEFAULTS,
    };
  }

  // ==========================================
  // Update Single Setting
  // ==========================================

  async update(
    communityId: string,
    userId: string,
    key: string,
    dto: UpdateSettingDto,
  ) {
    const entry: SettingEntryDto = {
      key,
      value: dto.value,
      group: dto.group,
      isPublic: dto.isPublic,
    };

    const setting = await this.upsertOne(communityId, userId, entry);

    return {
      success: true,
      message: 'Setting updated successfully.',
      data: setting,
    };
  }

  // ==========================================
  // Update Multiple Settings
  // ==========================================

  async updateMany(
    communityId: string,
    userId: string,
    entries: SettingEntryDto[],
  ) {
    const updated: {
      key: string;
      value: unknown;
      group: string;
      isPublic: boolean;
    }[] = [];

    for (const entry of entries) {
      const setting = await this.upsertOne(communityId, userId, entry);

      updated.push({
        key: setting.key,
        value: setting.value,
        group: setting.group,
        isPublic: setting.isPublic,
      });
    }

    return {
      success: true,
      message: 'Settings updated successfully.',
      data: updated,
    };
  }
}
