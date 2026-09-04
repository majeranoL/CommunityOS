import { ForbiddenException } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { CommunityStatus } from '@prisma/client';

import { SuspendedInterceptor } from './suspended.interceptor';

describe('SuspendedInterceptor', () => {
  let interceptor: SuspendedInterceptor;

  const makeCtx = (method: string, path: string, user: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          path,
          user,
        }),
      }),
    }) as any;

  const call = (ctx: any) => {
    try {
      const source = interceptor.intercept(ctx, {
        handle: () => of('ok'),
      } as any);
      return firstValueFrom(source);
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  const suspendedUser = {
    isPlatformAdmin: false,
    community: { status: CommunityStatus.INACTIVE, suspendedAt: new Date() },
  };

  beforeEach(() => {
    interceptor = new SuspendedInterceptor();
  });

  it('allows non-community requests (auth/public/webhook)', async () => {
    await expect(
      call(makeCtx('POST', '/api/auth/login', undefined)),
    ).resolves.toBe('ok');
    await expect(
      call(makeCtx('POST', '/api/payments/webhook', undefined)),
    ).resolves.toBe('ok');
  });

  it('allows users without a community object', async () => {
    await expect(
      call(makeCtx('POST', '/api/admin/revenue', { isPlatformAdmin: true })),
    ).resolves.toBe('ok');
  });

  it('allows platform admins on a suspended community', async () => {
    await expect(
      call(
        makeCtx('PUT', '/api/roles/1', {
          isPlatformAdmin: true,
          community: {
            status: CommunityStatus.INACTIVE,
            suspendedAt: new Date(),
          },
        }),
      ),
    ).resolves.toBe('ok');
  });

  it('allows active (non-suspended) communities', async () => {
    await expect(
      call(
        makeCtx('POST', '/api/announcements', {
          isPlatformAdmin: false,
          community: { status: CommunityStatus.ACTIVE, suspendedAt: null },
        }),
      ),
    ).resolves.toBe('ok');
  });

  it('aliases paths without the /api prefix', async () => {
    await expect(
      call(makeCtx('GET', '/billing/summary', suspendedUser)),
    ).resolves.toBe('ok');
  });

  it('blocks a mutating request to a suspended community', async () => {
    await expect(
      call(makeCtx('POST', '/api/announcements', suspendedUser)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks reads of non-billing resources for a suspended community', async () => {
    await expect(
      call(makeCtx('GET', '/api/residents', suspendedUser)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows billing summary and limits', async () => {
    await expect(
      call(makeCtx('GET', '/api/billing/summary', suspendedUser)),
    ).resolves.toBe('ok');
    await expect(
      call(makeCtx('GET', '/api/billing/limits', suspendedUser)),
    ).resolves.toBe('ok');
  });

  it('allows viewing invoices (list and single)', async () => {
    await expect(
      call(makeCtx('GET', '/api/invoices', suspendedUser)),
    ).resolves.toBe('ok');
    await expect(
      call(
        makeCtx(
          'GET',
          '/api/invoices/11111111-1111-1111-1111-111111111111',
          suspendedUser,
        ),
      ),
    ).resolves.toBe('ok');
  });

  it('allows initiating checkout and marking paid', async () => {
    await expect(
      call(
        makeCtx(
          'POST',
          '/api/invoices/11111111-1111-1111-1111-111111111111/checkout',
          suspendedUser,
        ),
      ),
    ).resolves.toBe('ok');
    await expect(
      call(
        makeCtx(
          'POST',
          '/api/invoices/11111111-1111-1111-1111-111111111111/mark-paid',
          suspendedUser,
        ),
      ),
    ).resolves.toBe('ok');
  });

  it('blocks creating invoices while suspended', async () => {
    await expect(
      call(makeCtx('POST', '/api/invoices', suspendedUser)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows all auth endpoints (session survival)', async () => {
    await expect(
      call(makeCtx('GET', '/api/auth/me', suspendedUser)),
    ).resolves.toBe('ok');
    await expect(
      call(makeCtx('POST', '/api/auth/refresh', suspendedUser)),
    ).resolves.toBe('ok');
    await expect(
      call(makeCtx('POST', '/api/auth/logout', suspendedUser)),
    ).resolves.toBe('ok');
  });
});
