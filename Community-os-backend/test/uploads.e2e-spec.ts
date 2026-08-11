import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './bootstrap-app';
import { authHeaders, provisionCommunity, uniqueEmail } from './test-helpers';

const PASSWORD = 'Str0ng!Pass';
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe('Uploads auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated upload', async () => {
    const res = await request(app.getHttpServer()).post('/api/uploads');

    expect(res.status).toBe(401);
  });

  it('rejects an upload with a blocked extension', async () => {
    const { accessToken, agent } = await provisionCommunity(
      app,
      'Upload Bad HOA',
      {
        firstName: 'Upload',
        lastName: 'Bad',
        email: uniqueEmail('upbad'),
        password: PASSWORD,
      },
    );

    const res = await agent
      .post('/api/uploads')
      .set(authHeaders(accessToken))
      .attach('file', PNG_BYTES, {
        filename: 'malware.svg',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
  });

  it('uploads a file as the community owner and streams it back', async () => {
    const { accessToken, agent } = await provisionCommunity(
      app,
      'Upload Good HOA',
      {
        firstName: 'Upload',
        lastName: 'Good',
        email: uniqueEmail('upgood'),
        password: PASSWORD,
      },
    );

    const upload = await agent
      .post('/api/uploads')
      .set(authHeaders(accessToken))
      .attach('file', PNG_BYTES, {
        filename: 'proof.png',
        contentType: 'image/png',
      });

    expect(upload.status).toBe(201);
    const uploadId = upload.body.data.id as string;

    const stream = await agent
      .get(`/api/uploads/${uploadId}`)
      .set(authHeaders(accessToken));

    expect(stream.status).toBe(200);
    expect(stream.headers['content-type']).toContain('image/png');
    expect(stream.body.equals(PNG_BYTES)).toBe(true);
  });

  it('rejects a cross-community stream request', async () => {
    const communityA = await provisionCommunity(app, 'Upload Owner HOA', {
      firstName: 'Owner',
      lastName: 'A',
      email: uniqueEmail('upa'),
      password: PASSWORD,
    });

    const communityB = await provisionCommunity(app, 'Upload Stranger HOA', {
      firstName: 'Owner',
      lastName: 'B',
      email: uniqueEmail('upb'),
      password: PASSWORD,
    });

    const upload = await communityA.agent
      .post('/api/uploads')
      .set(authHeaders(communityA.accessToken))
      .attach('file', PNG_BYTES, {
        filename: 'private.png',
        contentType: 'image/png',
      });

    expect(upload.status).toBe(201);
    const uploadId = upload.body.data.id as string;

    const crossCommunity = await communityB.agent
      .get(`/api/uploads/${uploadId}`)
      .set(authHeaders(communityB.accessToken));

    expect(crossCommunity.status).toBe(404);
  });
});
