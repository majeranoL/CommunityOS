import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { CommunityStatus } from '@prisma/client';

@Injectable()
export class SuspendedInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | {
          isPlatformAdmin?: boolean;
          community?: {
            status: CommunityStatus;
            suspendedAt: Date | null;
          } | null;
        }
      | undefined;

    // Only applies to authenticated, community-scoped requests.
    if (!user || !user.community) {
      return next.handle();
    }

    // Platform admins must always retain full access.
    if (user.isPlatformAdmin === true) {
      return next.handle();
    }

    // Not suspended → allow.
    if (
      user.community.status !== CommunityStatus.INACTIVE ||
      !user.community.suspendedAt
    ) {
      return next.handle();
    }

    const method = (req.method as string).toUpperCase();
    const rawPath: string = req.path ?? req.url ?? '/';

    const path = rawPath.startsWith('/api') ? rawPath : `/api${rawPath}`;

    if (this.isAllowed(method, path)) {
      return next.handle();
    }

    throw new ForbiddenException(
      'This community is suspended due to an unpaid subscription. Please settle your billing to restore access.',
    );
  }

  private isAllowed(method: string, path: string): boolean {
    // Session/login endpoints always allowed so users aren't locked out.
    if (path.startsWith('/api/auth/')) {
      return true;
    }

    // Billing summary & usage (read-only) — to see what they owe.
    if (
      method === 'GET' &&
      (path === '/api/billing/summary' || path === '/api/billing/limits')
    ) {
      return true;
    }

    // View invoices (list + single).
    if (
      method === 'GET' &&
      (path === '/api/invoices' ||
        path.match(/^\/api\/invoices\/[0-9a-f-]{36}$/))
    ) {
      return true;
    }

    // Initiate / settle payment so the community can be restored.
    if (
      method === 'POST' &&
      (path.match(/^\/api\/invoices\/[0-9a-f-]{36}\/checkout$/) ||
        path.match(/^\/api\/invoices\/[0-9a-f-]{36}\/mark-paid$/))
    ) {
      return true;
    }

    return false;
  }
}
