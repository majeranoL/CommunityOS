import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MessageStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Send Message
  // ==========================================

  async create(communityId: string, senderId: string, dto: CreateMessageDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.subject = dto.subject.trim();
    dto.body = dto.body.trim();

    // ==========================================
    // Validate Recipient
    // ==========================================

    if (dto.recipientId) {
      const recipient = await this.prisma.user.findFirst({
        where: {
          id: dto.recipientId,
          communityId,
          deletedAt: null,
        },
      });

      if (!recipient) {
        throw new NotFoundException('Recipient not found.');
      }
    }

    // ==========================================
    // Create Message
    // ==========================================

    const message = await this.prisma.message.create({
      data: {
        communityId,
        senderId,
        recipientId: dto.recipientId,
        subject: dto.subject,
        body: dto.body,
        status: MessageStatus.SENT,
        sentAt: new Date(),
      },

      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        recipient: {
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
      message: 'Message sent successfully.',
      data: message,
    };
  }

  // ==========================================
  // Get All Messages
  // ==========================================

  async findAll(communityId: string, userId: string, query: MessageQueryDto) {
    const { page, limit, search, mailbox, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Mailbox
    if (mailbox === 'inbox') {
      where.OR = [
        {
          recipientId: userId,
        },
        {
          recipientId: null,
        },
      ];
    }

    if (mailbox === 'outbox') {
      where.senderId = userId;
    }

    // Search
    if (search) {
      const searchFilter = [
        {
          subject: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          body: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          sender: {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];

      where.AND = where.AND
        ? [...where.AND, { OR: searchFilter }]
        : { OR: searchFilter };
    }

    if (status) {
      where.status = status;
    }

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.message.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Messages retrieved successfully.',
      data: messages,

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
  // Get Message By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    return {
      success: true,
      message: 'Message retrieved successfully.',
      data: message,
    };
  }

  // ==========================================
  // Update Message
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateMessageDto) {
    await this.findScoped(communityId, id);

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.subject) dto.subject = dto.subject.trim();

    if (dto.body) dto.body = dto.body.trim();

    // ==========================================
    // Validate Recipient
    // ==========================================

    if (dto.recipientId) {
      const recipient = await this.prisma.user.findFirst({
        where: {
          id: dto.recipientId,
          communityId,
          deletedAt: null,
        },
      });

      if (!recipient) {
        throw new NotFoundException('Recipient not found.');
      }
    }

    // ==========================================
    // Update Message
    // ==========================================

    const updatedMessage = await this.prisma.message.update({
      where: {
        id,
      },

      data: {
        ...(dto.recipientId !== undefined && {
          recipientId: dto.recipientId,
        }),

        ...(dto.subject && { subject: dto.subject }),

        ...(dto.body && { body: dto.body }),
      },

      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        recipient: {
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
      message: 'Message updated successfully.',
      data: updatedMessage,
    };
  }

  // ==========================================
  // Delete Message (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    await this.prisma.message.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Message deleted successfully.',
    };
  }

  // ==========================================
  // Mark Message As Read
  // ==========================================

  async markAsRead(communityId: string, id: string, userId: string) {
    const message = await this.findScoped(communityId, id);

    if (message.recipientId && message.recipientId !== userId) {
      throw new ConflictException(
        'Only the recipient can mark this message as read.',
      );
    }

    if (message.recipientId === null && message.senderId === userId) {
      throw new ConflictException(
        'Sender cannot mark a broadcast message as read.',
      );
    }

    const updatedMessage = await this.prisma.message.update({
      where: {
        id,
      },

      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },

      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        recipient: {
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
      message: 'Message marked as read successfully.',
      data: updatedMessage,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    return message;
  }
}
