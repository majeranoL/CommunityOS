import 'dotenv/config';

import { testDatabaseUrl } from './test-db';

process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
process.env.REFRESH_SECRET =
  process.env.REFRESH_SECRET ?? 'test-refresh-secret';
process.env.REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN ?? '7d';
