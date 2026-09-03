import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { promises as fsPromises } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { validateFile } from '../../common/utils/file-validation';
import { S3Service } from '../../common/s3/s3.service';

export interface UploadedFileResponse {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private toResponse(record: {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
  }): UploadedFileResponse {
    return {
      id: record.id,
      url: `/api/uploads/${record.id}`,
      filename: record.filename,
      originalName: record.originalName,
      mimetype: record.mimetype,
      size: record.size,
    };
  }

  private async persistFile(
    communityId: string,
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<string> {
    const extension = extname(originalName).toLowerCase();
    const filename = `${randomUUID()}${extension}`;
    const key = `${communityId}/${filename}`;

    if (this.s3.enabled) {
      await this.s3.put(key, buffer, mimetype);
      return key;
    }

    const dir = join(process.cwd(), 'uploads');
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(join(dir, filename), buffer);

    return filename;
  }

  private validate(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const validation = validateFile(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    if (!validation.ok) {
      throw new BadRequestException(validation.reason);
    }

    return validation;
  }

  async uploadFile(
    communityId: string,
    userId: string,
    file: Express.Multer.File,
    module = 'document',
  ) {
    const validation = this.validate(file);

    const filename = await this.persistFile(
      communityId,
      file.buffer,
      file.originalname,
      validation.mimetype,
    );

    const record = await this.prisma.upload.create({
      data: {
        communityId,
        uploadedById: userId,
        module,
        filename,
        originalName: file.originalname,
        mimetype: validation.mimetype,
        size: file.size,
      },
    });

    return {
      success: true,
      message: 'File uploaded successfully.',
      data: this.toResponse(record),
    };
  }

  async uploadFiles(
    communityId: string,
    userId: string,
    files: Express.Multer.File[],
    module = 'document',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded.');
    }

    const validated = files.map((file) => this.validate(file));

    const records: Awaited<ReturnType<typeof this.prisma.upload.create>>[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const validation = validated[index];

      const filename = await this.persistFile(
        communityId,
        file.buffer,
        file.originalname,
        validation.mimetype,
      );

      records.push(
        await this.prisma.upload.create({
          data: {
            communityId,
            uploadedById: userId,
            module,
            filename,
            originalName: file.originalname,
            mimetype: validation.mimetype,
            size: file.size,
          },
        }),
      );
    }

    return {
      success: true,
      message: 'Files uploaded successfully.',
      data: records.map((record) => this.toResponse(record)),
    };
  }

  async getUploadForCommunity(communityId: string, id: string) {
    const record = await this.prisma.upload.findFirst({
      where: { id, communityId },
    });

    if (!record) {
      throw new NotFoundException('File not found');
    }

    return record;
  }

  // Returns the household that owns this upload when it is used as a
  // payment proof, so downloads can be restricted to that household (and
  // finance managers). Returns null for any non-proof upload.
  async findPaymentProofHousehold(
    communityId: string,
    id: string,
  ): Promise<string | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { communityId, proofFileId: id, deletedAt: null },
      select: {
        resident: { select: { householdId: true } },
      },
    });

    return payment?.resident?.householdId ?? null;
  }

  async removeUploadForCommunity(communityId: string, id: string) {
    const record = await this.prisma.upload.findFirst({
      where: { id, communityId },
    });

    if (!record) {
      return { success: true };
    }

    if (this.s3.enabled) {
      await this.s3.delete(record.filename).catch(() => undefined);
    } else {
      await fsPromises
        .unlink(join(process.cwd(), 'uploads', record.filename))
        .catch(() => undefined);
    }

    await this.prisma.upload.delete({
      where: { id: record.id },
    });

    return { success: true };
  }

  // Reads the file bytes for a stored upload. Returns null when the object
  // is missing (404), mirroring the previous on-disk "File missing" case.
  async readFile(record: {
    communityId: string;
    filename: string;
  }): Promise<Buffer | null> {
    if (this.s3.enabled) {
      try {
        return await this.s3.get(record.filename);
      } catch {
        return null;
      }
    }

    const filePath = join(process.cwd(), 'uploads', record.filename);
    try {
      return await fsPromises.readFile(filePath);
    } catch {
      return null;
    }
  }
}
