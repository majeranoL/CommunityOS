import { INestApplication } from '@nestjs/common';
import { createHash } from 'crypto';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

export const TEST_OTP_CODE = '123456';

export interface TestOwner {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  middleName?: string;
  phoneNumber?: string;
  block?: string;
  lot?: string;
  unit?: string;
  address?: string;
}

export interface ProvisionedCommunity {
  community: { id: string; code: string; slug: string; displayName: string };
  accessToken: string;
  agent: ReturnType<typeof request.agent>;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function seedRegistrationOtp(
  prisma: PrismaService,
  email: string,
  code: string = TEST_OTP_CODE,
): Promise<void> {
  await prisma.otpVerification.create({
    data: {
      email,
      code: createHash('sha256').update(code).digest('hex'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

export async function provisionCommunity(
  app: INestApplication,
  displayName: string,
  owner: TestOwner,
): Promise<ProvisionedCommunity> {
  const agent = request.agent(app.getHttpServer());

  const res = await agent.post('/api/public/hoa/signup').send({
    displayName,
    email: owner.email,
    address: '123 Test Street, Test City, Province',
    owner,
  });

  if (res.status !== 201) {
    throw new Error(
      `signup failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  const accessToken = res.body?.data?.session?.accessToken as string;

  if (!accessToken) {
    throw new Error(
      `signup succeeded but no access token: ${JSON.stringify(res.body)}`,
    );
  }

  return {
    community: res.body.data.community,
    accessToken,
    agent,
  };
}

export function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
