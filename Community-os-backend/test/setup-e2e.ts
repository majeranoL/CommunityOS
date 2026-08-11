import 'dotenv/config';

import { testDatabaseUrl } from './test-db';

process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
