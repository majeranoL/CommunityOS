import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './bootstrap-app';
import { authHeaders, provisionCommunity, uniqueEmail } from './test-helpers';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Str0ng!Pass';

describe('Good standing gate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects QR generate + verify with 403 when good-bad-standing is not assigned', async () => {
    const owner = await provisionCommunity(app, 'Gate Off HOA', {
      firstName: 'Gate',
      lastName: 'Off',
      email: uniqueEmail('gateoff'),
      password: PASSWORD,
    });
    const agent = request.agent(app.getHttpServer());
    const headers = authHeaders(owner.accessToken);

    const gen = await agent.post('/api/good-standing/qr').set(headers).send({});
    expect(gen.status).toBe(403);

    const verify = await agent
      .post('/api/good-standing/verify')
      .set(headers)
      .send({ token: 'anything' });
    expect(verify.status).toBe(403);
  });

  it('allows QR generate + verify once good-bad-standing is assigned', async () => {
    const owner = await provisionCommunity(app, 'Gate On HOA', {
      firstName: 'Gate',
      lastName: 'On',
      email: uniqueEmail('gateon'),
      password: PASSWORD,
      block: 'A',
      lot: '1',
    });

    const feature = await prisma.feature.upsert({
      where: { code: 'good-bad-standing' },
      update: { isActive: true },
      create: {
        code: 'good-bad-standing',
        name: 'Good/Bad Standing',
        description: 'E2E good standing feature',
        type: 'OPTIONAL',
        isActive: true,
        dependencies: [],
      },
    });

    await prisma.communityFeature.upsert({
      where: {
        communityId_featureId: {
          communityId: owner.community.id,
          featureId: feature.id,
        },
      },
      update: { enabled: true },
      create: {
        communityId: owner.community.id,
        featureId: feature.id,
        enabled: true,
      },
    });

    const agent = request.agent(app.getHttpServer());
    const headers = authHeaders(owner.accessToken);

    const gen = await agent.post('/api/good-standing/qr').set(headers).send({});
    expect(gen.status).toBe(201);
    expect(gen.body.token).toBeDefined();

    const verify = await agent
      .post('/api/good-standing/verify')
      .set(headers)
      .send({ token: gen.body.token });
    expect(verify.status).toBe(201);
    expect(verify.body.household).toBeDefined();
  });
});
