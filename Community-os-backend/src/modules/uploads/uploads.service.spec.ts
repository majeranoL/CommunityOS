import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';

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
      providers: [UploadsService, { provide: PrismaService, useValue: prisma }],
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
