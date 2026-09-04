import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './bootstrap-app';
import {
  authHeaders,
  provisionCommunity,
  seedRegistrationOtp,
  TEST_OTP_CODE,
  uniqueEmail,
} from './test-helpers';
import { PrismaService } from '../src/prisma/prisma.service';
const PASSWORD = 'Str0ng!Pass';
describe('Auth lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });
  it('provisions a community and sets a refresh cookie on the owner session', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = uniqueEmail('auth');
    const res = await agent.post('/api/public/hoa/signup').send({
      displayName: 'Auth Lifecycle HOA',
      email,
      address: '123 Test Street, Test City, Province',
      owner: {
        firstName: 'Auth',
        lastName: 'Owner',
        password: PASSWORD,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.community.id).toBeDefined();
    expect(res.body.data.session.accessToken).toBeDefined();
    expect(
      (res.headers['set-cookie'] as unknown as string[]).some(
        (cookie: string) => cookie.includes('refresh_token='),
      ),
    ).toBe(true);
  });
  it('links the owner to a household and OWNER resident when unit info is provided', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = uniqueEmail('linked');
    const res = await agent.post('/api/public/hoa/signup').send({
      displayName: 'Link HOA',
      email,
      address: '123 Test Street, Test City, Province',
      owner: {
        firstName: 'Link',
        lastName: 'Owner',
        password: PASSWORD,
        block: 'B',
        lot: '7',
        unit: '2A',
      },
    });
    expect(res.status).toBe(201);

    const user = await prisma.user.findFirst({
      where: { account: { email } },
      select: {
        id: true,
        residentId: true,
        resident: {
          select: {
            id: true,
            residentType: true,
            residentNumber: true,
            householdId: true,
            household: {
              select: { id: true, block: true, lot: true, unit: true },
            },
          },
        },
      },
    });

    expect(user).not.toBeNull();
    expect(user!.residentId).toBeDefined();
    expect(user!.resident).not.toBeNull();
    expect(user!.resident!.residentType).toBe('OWNER');
    expect(user!.resident!.residentNumber).toMatch(/^RES-\d{6}$/);
    expect(user!.resident!.household).not.toBeNull();
    expect(user!.resident!.household!.block).toBe('B');
    expect(user!.resident!.household!.lot).toBe('7');
    expect(user!.resident!.household!.unit).toBe('2A');
  });
  it('derives a name-based storefront slug and suffixes on collision', async () => {
    const agent = request.agent(app.getHttpServer());
    const displayName = `Metroville Tanza ${Date.now()}`;
    const baseSlug = `metroville-tanza-${Date.now()}`;

    const firstEmail = uniqueEmail('slug1');
    const first = await agent.post('/api/public/hoa/signup').send({
      displayName,
      email: firstEmail,
      address: '123 Test Street, Test City, Province',
      owner: {
        firstName: 'Slug',
        lastName: 'One',
        password: PASSWORD,
      },
    });
    expect(first.status).toBe(201);
    expect(first.body.data.community.slug).toBe(baseSlug);

    const secondEmail = uniqueEmail('slug2');
    const second = await agent.post('/api/public/hoa/signup').send({
      displayName,
      email: secondEmail,
      address: '123 Test Street, Test City, Province',
      owner: {
        firstName: 'Slug',
        lastName: 'Two',
        password: PASSWORD,
      },
    });
    expect(second.status).toBe(201);
    expect(second.body.data.community.slug).toBe(`${baseSlug}-2`);
  });
  it('returns the owner profile via /api/auth/me', async () => {
    const email = uniqueEmail('me');
    const { accessToken, agent } = await provisionCommunity(app, 'Me HOA', {
      firstName: 'Profile',
      lastName: 'User',
      email,
      password: PASSWORD,
    });
    const me = await agent.get('/api/auth/me').set(authHeaders(accessToken));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
    expect(me.body.data.roles).toContain('President');
  });
  it('rotates the refresh token cookie via /api/auth/refresh', async () => {
    const { accessToken, agent } = await provisionCommunity(
      app,
      'Refresh HOA',
      {
        firstName: 'Refresh',
        lastName: 'User',
        email: uniqueEmail('refresh'),
        password: PASSWORD,
      },
    );
    const res = await agent
      .post('/api/auth/refresh')
      .set(authHeaders(accessToken));
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(
      (res.headers['set-cookie'] as unknown as string[]).some(
        (cookie: string) => cookie.includes('refresh_token='),
      ),
    ).toBe(true);
  });
  it('logs out and invalidates the refresh token', async () => {
    const { accessToken, agent } = await provisionCommunity(app, 'Logout HOA', {
      firstName: 'Logout',
      lastName: 'User',
      email: uniqueEmail('logout'),
      password: PASSWORD,
    });
    const out = await agent
      .post('/api/auth/logout')
      .set(authHeaders(accessToken));
    expect(out.status).toBe(201);
    const clearCookie = (out.headers['set-cookie'] as unknown as string[]).find(
      (cookie: string) => cookie.includes('refresh_token='),
    );
    expect(clearCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    const again = await agent
      .post('/api/auth/refresh')
      .set(authHeaders(accessToken));
    expect(again.status).toBe(401);
  });
  it('rejects registration when registrationMode is CLOSED', async () => {
    const { community } = await provisionCommunity(app, 'Closed HOA', {
      firstName: 'Closed',
      lastName: 'Owner',
      email: uniqueEmail('closed'),
      password: PASSWORD,
    });
    await prisma.setting.upsert({
      where: {
        communityId_key: { communityId: community.id, key: 'registrationMode' },
      },
      update: { value: 'CLOSED' },
      create: {
        communityId: community.id,
        key: 'registrationMode',
        value: 'CLOSED',
        group: 'security',
        isPublic: false,
      },
    });
    const email = uniqueEmail('newbie');
    await seedRegistrationOtp(prisma, email);
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password: PASSWORD,
        firstName: 'New',
        lastName: 'Resident',
        communityId: community.id,
        block: 'B9',
        lot: 'L9',
        otpCode: TEST_OTP_CODE,
      });
    expect(res.status).toBe(403);
  });
  it('allows registration in OPEN mode and blocks duplicate unit ownership', async () => {
    const { community } = await provisionCommunity(app, 'Open HOA', {
      firstName: 'Open',
      lastName: 'Owner',
      email: uniqueEmail('open'),
      password: PASSWORD,
    });
    const register = () => {
      const email = uniqueEmail('resident');
      return seedRegistrationOtp(prisma, email).then(() =>
        request(app.getHttpServer()).post('/api/auth/register').send({
          email,
          password: PASSWORD,
          firstName: 'New',
          lastName: 'Resident',
          communityId: community.id,
          block: 'B1',
          lot: 'L1',
          otpCode: TEST_OTP_CODE,
        }),
      );
    };
    const first = await register();
    expect(first.status).toBe(201);
    const second = await register();
    expect(second.status).toBe(409);
  });
});
