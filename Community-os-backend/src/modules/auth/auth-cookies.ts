import type { CookieOptions, Request, Response } from 'express';
import ms, { StringValue } from 'ms';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

function refreshMaxAge(): number {
  return (
    ms((process.env.REFRESH_EXPIRES_IN as StringValue | undefined) ?? '7d') ??
    604800000
  );
}

function isSecure(): boolean {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: refreshMaxAge(),
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions());
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...refreshCookieOptions(),
    maxAge: 0,
  });
}

export function getRefreshToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_TOKEN_COOKIE
  ];
}
