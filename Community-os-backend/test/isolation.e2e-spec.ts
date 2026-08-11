import { INestApplication } from '@nestjs/common';

import { createTestApp } from './bootstrap-app';
import { authHeaders, provisionCommunity, uniqueEmail } from './test-helpers';

const PASSWORD = 'Str0ng!Pass';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not allow community B to read or mutate community A resources', async () => {
    const communityA = await provisionCommunity(app, 'Isolation A HOA', {
      firstName: 'Alpha',
      lastName: 'Owner',
      email: uniqueEmail('alpha'),
      password: PASSWORD,
    });

    const communityB = await provisionCommunity(app, 'Isolation B HOA', {
      firstName: 'Beta',
      lastName: 'Owner',
      email: uniqueEmail('beta'),
      password: PASSWORD,
    });

    expect(communityA.community.id).not.toBe(communityB.community.id);

    const createEvent = await communityA.agent
      .post('/api/events')
      .set(authHeaders(communityA.accessToken))
      .send({
        title: 'Isolation A Annual Meeting',
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createEvent.status).toBe(201);
    const eventId = createEvent.body.data.id as string;

    const readAsB = await communityB.agent
      .get(`/api/events/${eventId}`)
      .set(authHeaders(communityB.accessToken));
    expect(readAsB.status).toBe(404);

    const updateAsB = await communityB.agent
      .put(`/api/events/${eventId}`)
      .set(authHeaders(communityB.accessToken))
      .send({ title: 'Hijacked by B' });
    expect(updateAsB.status).toBe(404);

    const deleteAsB = await communityB.agent
      .delete(`/api/events/${eventId}`)
      .set(authHeaders(communityB.accessToken));
    expect(deleteAsB.status).toBe(404);

    const stillThere = await communityA.agent
      .get(`/api/events/${eventId}`)
      .set(authHeaders(communityA.accessToken));
    expect(stillThere.status).toBe(200);
  });

  it('keeps list endpoints scoped to the requesting community', async () => {
    const communityA = await provisionCommunity(app, 'Scope A HOA', {
      firstName: 'ScopeA',
      lastName: 'Owner',
      email: uniqueEmail('scopea'),
      password: PASSWORD,
    });

    const communityB = await provisionCommunity(app, 'Scope B HOA', {
      firstName: 'ScopeB',
      lastName: 'Owner',
      email: uniqueEmail('scopeb'),
      password: PASSWORD,
    });

    await communityA.agent
      .post('/api/events')
      .set(authHeaders(communityA.accessToken))
      .send({
        title: 'Event only visible in A',
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    const listA = await communityA.agent
      .get('/api/events')
      .set(authHeaders(communityA.accessToken));
    const listB = await communityB.agent
      .get('/api/events')
      .set(authHeaders(communityB.accessToken));

    expect(listA.status).toBe(200);
    expect(listB.status).toBe(200);

    const titlesA = (listA.body.data as { title: string }[]).map(
      (event) => event.title,
    );
    const titlesB = (listB.body.data as { title: string }[]).map(
      (event) => event.title,
    );

    expect(titlesA).toContain('Event only visible in A');
    expect(titlesB).not.toContain('Event only visible in A');
  });
});
