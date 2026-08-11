import 'dotenv/config';

export const TEST_DATABASE_NAME = 'community_os_test';

export function testDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;

  if (!base) {
    throw new Error(
      'DATABASE_URL is not set. Create a .env file from .env.example.',
    );
  }

  const url = new URL(base);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}

export function maintenanceDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl());
  url.pathname = '/postgres';
  return url.toString();
}
