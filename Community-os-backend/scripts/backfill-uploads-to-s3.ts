/**
 * One-time backfill: copy legacy uploads from the local /app/uploads disk
 * into the configured S3 bucket, keyed by communityId/<filename>.
 *
 * Matches the key format used by UploadsService.persistFile(). Run ONCE after
 * deploying the S3-backed uploads change so pre-existing Upload rows resolve.
 *
 * Requirements (in env): DATABASE_URL, S3_BUCKET, S3_ACCESS_KEY_ID,
 * S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION. Legacy files at ./uploads.
 *
 * Usage:
 *   npx tsx scripts/backfill-uploads-to-s3.ts
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? 'auto';

if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
  console.error('Missing S3 env vars (S3_BUCKET/ACCESS_KEY_ID/SECRET/ENDPOINT).');
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

async function objectExists(key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket!, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const uploads = await prisma.upload.findMany({
      select: { id: true, communityId: true, filename: true, mimetype: true },
    });

    console.log(`Found ${uploads.length} upload record(s).`);

    let copied = 0;
    let skipped = 0;
    let missing = 0;

    for (const u of uploads) {
      // Legacy records store a flat filename; S3 keys are communityId/<filename>.
      const key = `${u.communityId}/${u.filename}`;

      if (await objectExists(key)) {
        skipped += 1;
        continue;
      }

      const filePath = join(UPLOADS_DIR, u.filename);
      let body: Buffer;
      try {
        body = await fs.readFile(filePath);
      } catch {
        console.warn(`DID NOT BACKFILL (file missing on disk): ${key}`);
        missing += 1;
        continue;
      }

      await client.send(
        new PutObjectCommand({
          Bucket: bucket!,
          Key: key,
          Body: body,
          ...(u.mimetype ? { ContentType: u.mimetype } : {}),
        }),
      );
      copied += 1;
      console.log(`Backfilled ${key} (${body.length} bytes)`);
    }

    console.log(`\nDone: copied=${copied} skipped(exists)=${skipped} missing=${missing}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});