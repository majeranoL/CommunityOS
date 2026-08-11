import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

let cachedDatabaseUrl: string | undefined

function databaseUrl(): string {
  if (cachedDatabaseUrl) return cachedDatabaseUrl

  const fromEnv = process.env.DATABASE_URL
  if (fromEnv) {
    cachedDatabaseUrl = fromEnv
    return fromEnv
  }

  const envPath = join(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
    '..',
    'Community-os-backend',
    '.env',
  )
  const contents = readFileSync(envPath, 'utf8')
  const match = contents.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)
  if (!match) {
    throw new Error(`DATABASE_URL not found in ${envPath}`)
  }

  cachedDatabaseUrl = match[1]!
  return cachedDatabaseUrl
}

export async function withDb<T>(run: (db: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl() })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex')
}

export async function getAnchorCommunityId(db: Client): Promise<string> {
  const result = await db.query<{ id: string }>(
    `SELECT "id" FROM "Community" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1`,
  )
  if (result.rows.length === 0) {
    throw new Error('No active community found. Run the backend seed first.')
  }
  return result.rows[0].id
}

export async function seedRegistrationOtp(db: Client, email: string, code: string): Promise<void> {
  await db.query(
    `INSERT INTO "OtpVerification" ("id", "email", "purpose", "code", "expiresAt")
     VALUES (gen_random_uuid(), $1, 'REGISTER', $2, now() + interval '10 minutes')`,
    [email, hashOtpCode(code)],
  )
}

export async function seedTenantMember(
  db: Client,
  communityId: string,
  email: string,
): Promise<void> {
  const reference = await db.query<{ next: string }>(
    `SELECT 'USR-' || lpad((count(*) + 1)::text, 6, '0') AS next
     FROM "User" WHERE "communityId" = $1`,
    [communityId],
  )

  const role = await db.query<{ id: string }>(
    `SELECT "id" FROM "Role"
     WHERE "communityId" = $1 AND "name" = 'Member' AND "deletedAt" IS NULL AND "isSystem" = true
     LIMIT 1`,
    [communityId],
  )
  if (role.rows.length === 0) {
    throw new Error('System Member role not found. Run the backend seed first.')
  }

  const account = await db.query<{ id: string }>(
    `INSERT INTO "Account" ("id", "email", "passwordHash", "status", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1,
       (SELECT "passwordHash" FROM "Account" WHERE "email" = 'admin@communityos.com' LIMIT 1),
       'ACTIVE', now(), now())
     RETURNING "id"`,
    [email],
  )

  const user = await db.query<{ id: string }>(
    `INSERT INTO "User" ("id", "accountId", "communityId", "referenceNumber", "firstName", "lastName", "status", "isPlatformAdmin", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, 'Smoke', 'Member', 'ACTIVE', false, now(), now())
     RETURNING "id"`,
    [account.rows[0].id, communityId, reference.rows[0].next],
  )

  await db.query(
    `INSERT INTO "UserRole" ("id", "userId", "roleId")
     VALUES (gen_random_uuid(), $1, $2)`,
    [user.rows[0].id, role.rows[0].id],
  )
}

export async function getRegistrationMode(
  db: Client,
  communityId: string,
): Promise<string | null> {
  const result = await db.query<{ value: string }>(
    `SELECT "value" FROM "Setting" WHERE "communityId" = $1 AND "key" = 'registrationMode'`,
    [communityId],
  )
  return result.rows[0]?.value ?? null
}

export async function setRegistrationMode(
  db: Client,
  communityId: string,
  mode: 'OPEN' | 'CLOSED',
): Promise<void> {
  await db.query(
    `INSERT INTO "Setting" ("id", "communityId", "key", "value", "group", "isPublic", "updatedAt")
     VALUES (gen_random_uuid(), $1, 'registrationMode', $2::jsonb, 'security', false, now())
     ON CONFLICT ("communityId", "key")
     DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now()`,
    [communityId, JSON.stringify(mode)],
  )
}

export async function resetRegistrationMode(
  db: Client,
  communityId: string,
  previous: string | null,
): Promise<void> {
  if (previous === null) {
    await db.query(
      `DELETE FROM "Setting" WHERE "communityId" = $1 AND "key" = 'registrationMode'`,
      [communityId],
    )
  } else {
    await setRegistrationMode(db, communityId, previous as 'OPEN' | 'CLOSED')
  }
}

export async function cleanupRegisteredUser(
  db: Client,
  email: string,
  block: string,
  lot: string,
  communityId: string,
): Promise<void> {
  await db.query('DELETE FROM "OtpVerification" WHERE "email" = $1', [email])
  await db.query('DELETE FROM "Account" WHERE "email" = $1', [email])
  await db.query('DELETE FROM "Resident" WHERE "email" = $1', [email])
  await db.query(
    'DELETE FROM "Household" WHERE "block" = $1 AND "lot" = $2 AND "communityId" = $3',
    [block, lot, communityId],
  )
}

export async function cleanupAccountByEmail(db: Client, email: string): Promise<void> {
  await db.query('DELETE FROM "Account" WHERE "email" = $1', [email])
}
