import 'dotenv/config';

import { execSync } from 'child_process';
import { PrismaClient, BillingCycle } from '@prisma/client';

import {
  maintenanceDatabaseUrl,
  TEST_DATABASE_NAME,
  testDatabaseUrl,
} from './test-db';

async function ensureDatabase() {
  const admin = new PrismaClient({
    datasources: { db: { url: maintenanceDatabaseUrl() } },
  });

  try {
    const rows: { count: bigint }[] = await admin.$queryRawUnsafe(
      'SELECT 1 AS count FROM pg_database WHERE datname = $1',
      TEST_DATABASE_NAME,
    );

    if (rows.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
      console.log(`Created database "${TEST_DATABASE_NAME}".`);
    } else {
      console.log(`Database "${TEST_DATABASE_NAME}" already exists.`);
    }
  } finally {
    await admin.$disconnect();
  }
}

function runMigrations() {
  console.log('Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}

async function seedPlans() {
  console.log('Seeding subscription plans...');
  const prisma = new PrismaClient({
    datasources: { db: { url: testDatabaseUrl() } },
  });

  try {
    await prisma.subscriptionPlan.upsert({
      where: { code: 'STARTER' },
      update: {},
      create: {
        code: 'STARTER',
        name: 'Starter',
        description: 'E2E starter plan',
        price: 0,
        billingCycle: BillingCycle.MONTHLY,
        features: [],
        isActive: true,
        sortOrder: 1,
      },
    });

    await prisma.subscriptionPlan.upsert({
      where: { code: 'GROWTH' },
      update: {},
      create: {
        code: 'GROWTH',
        name: 'Growth',
        description: 'E2E growth plan',
        price: 500,
        billingCycle: BillingCycle.MONTHLY,
        features: [],
        isActive: true,
        sortOrder: 2,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await ensureDatabase();
  runMigrations();
  await seedPlans();
  console.log('Test database ready.');
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
