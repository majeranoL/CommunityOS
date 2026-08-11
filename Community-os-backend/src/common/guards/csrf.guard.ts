import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const origin = req.headers.origin as string | undefined;
    if (!origin) return true;

    const allowed = allowedOrigins();
    if (allowed.includes(origin)) return true;

    const referer = req.headers.referer as string | undefined;
    if (referer && allowed.some((origin) => referer.startsWith(origin))) {
      return true;
    }

    throw new ForbiddenException('Cross-site request blocked');
  }
}
