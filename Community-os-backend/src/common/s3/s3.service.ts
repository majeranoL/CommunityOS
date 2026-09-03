import { Injectable } from '@nestjs/common';

import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION ?? 'auto';
    const endpoint = process.env.S3_ENDPOINT;

    if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
      this.client = null;
      this.bucket = null;
      return;
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE === 'true'),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  get enabled(): boolean {
    return this.client !== null && this.bucket !== null;
  }

  private getBucket(): string {
    if (!this.bucket) {
      throw new Error('S3 is not configured');
    }
    return this.bucket;
  }

  private getClient(): S3Client {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }
    return this.client;
  }

  async put(key: string, body: Buffer, contentType?: string) {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: body,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
    );

    const stream = result.Body;
    if (!stream) {
      throw new Error('Empty S3 body');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
    );
  }
}
