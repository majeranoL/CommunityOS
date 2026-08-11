import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DocumentsService } from './documents.service';
import { UploadsService } from '../uploads/uploads.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentsService tenant isolation', () => {
  let service: DocumentsService;
  let prisma: {
    document: {
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
  let uploads: { removeUploadForCommunity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      document: {
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    uploads = { removeUploadForCommunity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadsService, useValue: uploads },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('remove()', () => {
    it('throws NotFound and never mutates when the document belongs to another community', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('community-A', 'some-id'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.document.update).not.toHaveBeenCalled();
      expect(uploads.removeUploadForCommunity).not.toHaveBeenCalled();
    });

    it('soft-deletes own document and cleans up its upload when unreferenced', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-1',
        communityId: 'community-A',
        fileUrl: '/api/uploads/upload-1',
      });
      prisma.document.count.mockResolvedValue(0);
      prisma.document.update.mockResolvedValue({});

      await service.remove('community-A', 'doc-1');

      expect(prisma.document.update).toHaveBeenCalledTimes(1);
      expect(uploads.removeUploadForCommunity).toHaveBeenCalledWith(
        'community-A',
        'upload-1',
      );
    });

    it('keeps the upload when another live document still references it', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-1',
        communityId: 'community-A',
        fileUrl: '/api/uploads/upload-1',
      });
      prisma.document.count.mockResolvedValue(1);
      prisma.document.update.mockResolvedValue({});

      await service.remove('community-A', 'doc-1');

      expect(uploads.removeUploadForCommunity).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('throws NotFound when the target document is in another community', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.update('community-A', 'foreign-id', { title: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('cleans up the replaced upload only when it belongs to the caller scope', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-1',
        communityId: 'community-A',
        fileUrl: '/api/uploads/upload-old',
      });
      prisma.document.count.mockResolvedValue(0);
      prisma.document.update.mockResolvedValue({});

      await service.update('community-A', 'doc-1', {
        fileUrl: '/api/uploads/upload-new',
      });

      expect(uploads.removeUploadForCommunity).toHaveBeenCalledWith(
        'community-A',
        'upload-old',
      );
    });
  });
});
