import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './bootstrap-app';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes the public plans endpoint without auth', async () => {
    const res = await request(app.getHttpServer()).get('/api/public/plans');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('lists public communities without auth', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/public/communities',
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects an unknown API route with 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/does-not-exist');

    expect(res.status).toBe(404);
  });
});
