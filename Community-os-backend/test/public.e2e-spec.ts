import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './bootstrap-app';
import {
  provisionCommunity,
  uniqueEmail,
  type TestOwner,
} from './test-helpers';

describe('Public storefront (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function makeOwner() {
    const owner: TestOwner = {
      firstName: 'Owner',
      lastName: 'Storefront',
      email: uniqueEmail('storefront'),
      password: 'StrongPass123!',
    };
    const { community } = await provisionCommunity(
      app,
      `Storefront ${Date.now()}`,
      owner,
    );
    return { community, owner };
  }

  it('returns a community by slug with branding and registration info', async () => {
    const { community } = await makeOwner();

    const res = await request(app.getHttpServer()).get(
      `/api/public/communities/${community.slug}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(community.id);
    expect(res.body.data.slug).toBe(community.slug);
    expect(res.body.data.displayName).toBeTruthy();

    const branding = res.body.data.branding;
    expect(Object.keys(branding)).toEqual(
      expect.arrayContaining([
        'primaryColor',
        'accentColor',
        'sidebarColor',
        'logoUrl',
      ]),
    );

    expect(typeof res.body.data.registrationOpen).toBe('boolean');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/public/communities/this-slug-does-not-exist',
    );

    expect(res.status).toBe(404);
  });
});
