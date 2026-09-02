import { Test, TestingModule } from '@nestjs/testing';
import { FeaturesService } from './features.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FeaturesService.syncFeaturesFromPlan', () => {
  let service: FeaturesService;
  let prisma: any;

  const communityId = 'community-1';
  const planId = 'plan-1';

  beforeEach(async () => {
    prisma = {
      subscriptionPlan: { findUnique: jest.fn() },
      feature: { findMany: jest.fn() },
      planFeature: { findMany: jest.fn() },
      communityFeature: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
  });

  it('enables all active features when plan.includesAllFeatures is true', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      includesAllFeatures: true,
    });

    prisma.feature.findMany.mockResolvedValue([
      { id: 'f1' },
      { id: 'f2' },
      { id: 'f3' },
    ]);

    prisma.planFeature.findMany.mockResolvedValue([]);
    prisma.communityFeature.findMany.mockResolvedValue([]);

    await service.syncFeaturesFromPlan(communityId, planId);

    expect(prisma.communityFeature.createMany).toHaveBeenCalledWith({
      data: [
        {
          communityId,
          featureId: 'f1',
          enabled: true,
          enabledAt: expect.any(Date),
        },
        {
          communityId,
          featureId: 'f2',
          enabled: true,
          enabledAt: expect.any(Date),
        },
        {
          communityId,
          featureId: 'f3',
          enabled: true,
          enabledAt: expect.any(Date),
        },
      ],
      skipDuplicates: true,
    });
  });

  it('enables only plan + standard features when includesAllFeatures is false', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      includesAllFeatures: false,
    });

    prisma.planFeature.findMany.mockResolvedValue([
      { featureId: 'optional-1' },
    ]);

    prisma.feature.findMany
      .mockResolvedValueOnce([{ id: 'std-1' }, { id: 'std-2' }]) // STANDARD features
      .mockResolvedValueOnce([{ id: 'optional-1', type: 'OPTIONAL' }]); // revoke lookup

    prisma.communityFeature.findMany.mockResolvedValue([]);

    await service.syncFeaturesFromPlan(communityId, planId);

    expect(prisma.communityFeature.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        {
          communityId,
          featureId: 'std-1',
          enabled: true,
          enabledAt: expect.any(Date),
        },
        {
          communityId,
          featureId: 'std-2',
          enabled: true,
          enabledAt: expect.any(Date),
        },
        {
          communityId,
          featureId: 'optional-1',
          enabled: true,
          enabledAt: expect.any(Date),
        },
      ]),
      skipDuplicates: true,
    });
  });

  it('revokes optional features not in the plan when includesAllFeatures is false', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      includesAllFeatures: false,
    });

    prisma.planFeature.findMany.mockResolvedValue([]);
    prisma.feature.findMany
      .mockResolvedValueOnce([]) // no STANDARD features
      .mockResolvedValueOnce([{ id: 'old-optional', type: 'OPTIONAL' }]); // revoke lookup

    prisma.communityFeature.findMany.mockResolvedValue([
      { featureId: 'old-optional', enabled: true },
    ]);

    await service.syncFeaturesFromPlan(communityId, planId);

    expect(prisma.communityFeature.deleteMany).toHaveBeenCalledWith({
      where: { communityId, featureId: { in: ['old-optional'] } },
    });
  });

  it('does not revoke any features when includesAllFeatures is true', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      includesAllFeatures: true,
    });

    prisma.feature.findMany.mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]);
    prisma.feature.findMany.mockResolvedValueOnce([{ id: 'f1' }, { id: 'f2' }]);
    prisma.feature.findMany.mockResolvedValueOnce([]); // revoke lookup -> none

    prisma.communityFeature.findMany.mockResolvedValue([
      { featureId: 'extra-optional', enabled: true },
    ]);

    await service.syncFeaturesFromPlan(communityId, planId);

    // With all features enabled, extra-optional should NOT be revoked
    expect(prisma.communityFeature.deleteMany).not.toHaveBeenCalled();
  });

  it('re-enables previously disabled features when includesAllFeatures is true', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      includesAllFeatures: true,
    });

    prisma.feature.findMany.mockResolvedValue([{ id: 'f1' }]);

    prisma.communityFeature.findMany.mockResolvedValue([
      { featureId: 'f1', enabled: false },
    ]);

    await service.syncFeaturesFromPlan(communityId, planId);

    expect(prisma.communityFeature.updateMany).toHaveBeenCalledWith({
      where: { communityId, featureId: { in: ['f1'] }, enabled: false },
      data: { enabled: true, disabledAt: null, disabledBy: null },
    });
  });
});
