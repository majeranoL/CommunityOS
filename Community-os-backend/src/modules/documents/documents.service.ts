import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Document
  // ==========================================

  async create(communityId: string, userId: string, dto: CreateDocumentDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();
    dto.fileUrl = dto.fileUrl.trim();
    dto.fileName = dto.fileName?.trim();
    dto.mimeType = dto.mimeType?.trim();

    // ==========================================
    // Create Document
    // ==========================================

    const document = await this.prisma.document.create({
      data: {
        communityId,
        uploadedById: userId,

        title: dto.title,
        description: dto.description,
        category: dto.category ?? 'OTHER',
        fileUrl: dto.fileUrl,
        fileName: dto.fileName ?? dto.title,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,

        status: dto.status ?? DocumentStatus.DRAFT,
      },

      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Document created successfully.',
      data: document,
    };
  }

  // ==========================================
  // Get All Documents
  // ==========================================

  async findAll(communityId: string, query: DocumentQueryDto) {
    const { page, limit, search, category, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          fileName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.document.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Documents retrieved successfully.',
      data: documents,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // ==========================================
  // Get Document By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    return {
      success: true,
      message: 'Document retrieved successfully.',
      data: document,
    };
  }

  // ==========================================
  // Update Document
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateDocumentDto) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.fileUrl) dto.fileUrl = dto.fileUrl.trim();

    if (dto.fileName) dto.fileName = dto.fileName.trim();

    if (dto.mimeType) dto.mimeType = dto.mimeType.trim();

    // ==========================================
    // Update Document
    // ==========================================

    const updatedDocument = await this.prisma.document.update({
      where: {
        id,
      },

      data: {
        ...(dto.title && { title: dto.title }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.category && { category: dto.category }),

        ...(dto.fileUrl && { fileUrl: dto.fileUrl }),

        ...(dto.fileName !== undefined && {
          fileName: dto.fileName,
        }),

        ...(dto.fileSize !== undefined && {
          fileSize: dto.fileSize,
        }),

        ...(dto.mimeType !== undefined && {
          mimeType: dto.mimeType,
        }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Document updated successfully.',
      data: updatedDocument,
    };
  }

  // ==========================================
  // Delete Document (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    await this.prisma.document.update({
      where: {
        id,
      },

      data: {
        status: DocumentStatus.ARCHIVED,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Document deleted successfully.',
    };
  }

  // ==========================================
  // Publish Document
  // ==========================================

  async publish(communityId: string, id: string) {
    const document = await this.findScoped(communityId, id);

    if (document.status === DocumentStatus.ARCHIVED) {
      throw new ConflictException('Archived documents cannot be published.');
    }

    return this.updateStatus(communityId, id, DocumentStatus.PUBLISHED);
  }

  // ==========================================
  // Archive Document
  // ==========================================

  async archive(communityId: string, id: string) {
    const document = await this.findScoped(communityId, id);

    if (document.status === DocumentStatus.ARCHIVED) {
      throw new ConflictException('Document is already archived.');
    }

    return this.updateStatus(communityId, id, DocumentStatus.ARCHIVED);
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: DocumentStatus,
  ) {
    const document = await this.prisma.document.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Document ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: document,
    };
  }
}
