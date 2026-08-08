import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Observable, tap } from 'rxjs';

import { AuditLogsService } from './audit-logs.service';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogs: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const method: string = req.method;

    if (!MUTATING_METHODS.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return;
          }

          const communityId: string | undefined =
            req.user?.community?.id ?? req.user?.communityId;

          if (!communityId) {
            return;
          }

          const pathSegments: string[] = (req.path ?? '')
            .split('/')
            .filter((segment: string) => segment && segment !== 'api');

          const entity = pathSegments[0] ?? 'unknown';

          const entityId = [...pathSegments]
            .reverse()
            .find((segment) => UUID_REGEX.test(segment));

          this.auditLogs
            .log({
              communityId,
              actorId: req.user?.id,
              action: method,
              entity,
              entityId,
              ipAddress: req.ip,
              userAgent: String(req.headers?.['user-agent'] ?? '').slice(
                0,
                255,
              ),
            })
            .catch(() => undefined);
        },
      }),
    );
  }
}
