import { Test, TestingModule } from '@nestjs/testing';

import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SettingsService mergeDefaults', () => {
  let service: SettingsService;
  let prisma: { setting: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { setting: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('applies stored values over defaults and flags configured keys', async () => {
    prisma.setting.findMany.mockResolvedValue([
      {
        key: 'communityName',
        value: 'Sunrise Estates',
        group: 'general',
        isPublic: true,
      },
      {
        key: 'pollReminders',
        value: false,
        group: 'notifications',
        isPublic: false,
      },
    ]);

    const { data } = await service.findAll('community-id');
    const byKey = new Map(data.map((setting) => [setting.key, setting]));

    expect(byKey.get('communityName')?.value).toBe('Sunrise Estates');
    expect(byKey.get('communityName')?.configured).toBe(true);

    expect(byKey.get('pollReminders')?.value).toBe(false);
    expect(byKey.get('pollReminders')?.configured).toBe(true);
  });

  it('returns defaults with configured=false when nothing is stored', async () => {
    prisma.setting.findMany.mockResolvedValue([]);

    const { data } = await service.findAll('community-id');
    const byKey = new Map(data.map((setting) => [setting.key, setting]));

    expect(byKey.get('guestPassAutoApprove')?.configured).toBe(false);
    expect(byKey.get('guestPassAutoApprove')?.value).toBe(false);
    expect(byKey.get('registrationMode')?.value).toBe('OPEN');
    expect(byKey.get('paymentTermsDays')?.value).toBe(30);
  });

  it('includes custom keys that are not part of the defaults', async () => {
    prisma.setting.findMany.mockResolvedValue([
      {
        key: 'customSetting',
        value: 'x',
        group: 'custom',
        isPublic: false,
      },
    ]);

    const { data } = await service.findAll('community-id');
    const custom = data.find((setting) => setting.key === 'customSetting');

    expect(custom).toBeDefined();
    expect(custom?.configured).toBe(true);
  });

  it('returns settings sorted by key', async () => {
    prisma.setting.findMany.mockResolvedValue([]);

    const { data } = await service.findAll('community-id');
    const keys = data.map((setting) => setting.key);

    expect(keys).toEqual([...keys].sort());
  });
});
