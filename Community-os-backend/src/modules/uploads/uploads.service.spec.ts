import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../common/s3/s3.service';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');

  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const buildFile = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    buffer: PNG_BYTES,
    mimetype: 'image/png',
    originalname: 'photo.png',
    size: PNG_BYTES.length,
    ...overrides,
  }) as Express.Multer.File;

describe('UploadsService file gating', () => {
  let service: UploadsService;
  let prisma: {
    upload: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      upload: {
        create: jest.fn().mockResolvedValue({
          id: 'upload-id',
          filename: 'uuid.png',
          originalName: 'photo.png',
          mimetype: 'image/png',
          size: PNG_BYTES.length,
        }),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: S3Service,
          useValue: { enabled: false, put: jest.fn(), get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('accepts a valid PNG and persists it', async () => {
    const result = await service.uploadFile('c1', 'u1', buildFile());

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: 'upload-id',
      mimetype: 'image/png',
    });
    expect(prisma.upload.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a blocked file extension', async () => {
    await expect(
      service.uploadFile('c1', 'u1', buildFile({ originalname: 'evil.svg' })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.upload.create).not.toHaveBeenCalled();
  });

  it('rejects a disallowed mimetype', async () => {
    await expect(
      service.uploadFile('c1', 'u1', buildFile({ mimetype: 'image/svg+xml' })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.upload.create).not.toHaveBeenCalled();
  });

  it('rejects HTML embedded in a text file', async () => {
    await expect(
      service.uploadFile(
        'c1',
        'u1',
        buildFile({
          buffer: Buffer.from('<html><script>alert(1)</script></html>'),
          mimetype: 'text/plain',
          originalname: 'notes.txt',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.upload.create).not.toHaveBeenCalled();
  });

  it('rejects an empty file', async () => {
    await expect(
      service.uploadFile(
        'c1',
        'u1',
        buildFile({ buffer: Buffer.alloc(0), size: 0 }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UploadsService S3 storage', () => {
  let service: UploadsService;
  let prisma: {
    upload: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };
  let s3: {
    enabled: boolean;
    put: jest.Mock;
    get: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      upload: {
        create: jest.fn().mockResolvedValue({
          id: 'upload-id',
          filename: 'c1/uuid.png',
          originalName: 'photo.png',
          mimetype: 'image/png',
          size: PNG_BYTES.length,
        }),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    s3 = {
      enabled: true,
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('writes the file to S3 keyed by communityId/filename', async () => {
    await service.uploadFile('c1', 'u1', buildFile());

    expect(s3.put).toHaveBeenCalledTimes(1);
    const [key] = s3.put.mock.calls[0];
    expect(key).toMatch(/^c1\/[a-f0-9-]+\.png$/);
    expect(prisma.upload.create).toHaveBeenCalledTimes(1);
  });

  it('deletes the object from S3 when removing', async () => {
    prisma.upload.findFirst.mockResolvedValue({
      id: 'upload-id',
      filename: 'c1/uuid.png',
    });

    await service.removeUploadForCommunity('c1', 'upload-id');

    expect(s3.delete).toHaveBeenCalledWith('c1/uuid.png');
    expect(prisma.upload.delete).toHaveBeenCalledWith({
      where: { id: 'upload-id' },
    });
  });

  it('reads a file body from S3', async () => {
    s3.get.mockResolvedValue(Buffer.from('file-bytes'));

    const body = await service.readFile({
      communityId: 'c1',
      filename: 'c1/uuid.png',
    });

    expect(s3.get).toHaveBeenCalledWith('c1/uuid.png');
    expect(body?.toString()).toBe('file-bytes');
  });

  it('returns null when the S3 object is missing', async () => {
    s3.get.mockRejectedValue(new Error('NoSuchKey'));

    const body = await service.readFile({
      communityId: 'c1',
      filename: 'c1/missing.png',
    });

    expect(body).toBeNull();
  });
});
