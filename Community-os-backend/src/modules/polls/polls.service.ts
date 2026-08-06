import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NotificationType, PollStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { PollQueryDto } from './dto/poll-query.dto';
import { VoteDto } from './dto/vote.dto';
import { AddPollOptionDto } from './dto/add-poll-option.dto';

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const poll = await this.prisma.poll.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found.');
    }

    return poll;
  }

  private validateTimeRange(startAt?: Date, endAt?: Date) {
    if (startAt && isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid start time.');
    }

    if (endAt) {
      if (isNaN(endAt.getTime())) {
        throw new BadRequestException('Invalid end time.');
      }

      if (startAt && endAt <= startAt) {
        throw new BadRequestException('End time must be after start time.');
      }
    }
  }

  private assertOpenForVoting(poll: {
    status: PollStatus;
    startAt: Date | null;
    endAt: Date | null;
  }) {
    if (poll.status !== PollStatus.OPEN) {
      throw new ConflictException('Poll is not open for voting.');
    }

    const now = new Date();

    if (poll.startAt && poll.startAt > now) {
      throw new BadRequestException('Poll has not started yet.');
    }

    if (poll.endAt && poll.endAt < now) {
      throw new ConflictException('Poll has already ended.');
    }
  }

  private async findPollDetail(
    communityId: string,
    id: string,
    userId: string,
  ) {
    const poll = await this.prisma.poll.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },

        options: {
          orderBy: {
            createdAt: 'asc',
          },

          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },

        votes: {
          where: {
            userId,
          },

          select: {
            optionId: true,
          },
        },

        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found.');
    }

    return poll;
  }

  // ==========================================
  // Create Poll
  // ==========================================

  async create(communityId: string, userId: string, dto: CreatePollDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();

    const options = [
      ...new Set(dto.options.map((option) => option.trim()).filter(Boolean)),
    ];

    if (options.length < 2) {
      throw new BadRequestException('A poll must have at least 2 options.');
    }

    if (options.length > 20) {
      throw new BadRequestException('A poll can have at most 20 options.');
    }

    // ==========================================
    // Parse Dates
    // ==========================================

    const startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;

    this.validateTimeRange(startAt, endAt);

    // ==========================================
    // Create Poll
    // ==========================================

    const poll = await this.prisma.poll.create({
      data: {
        communityId,
        createdById: userId,

        title: dto.title,
        description: dto.description,
        status: dto.status ?? PollStatus.DRAFT,
        isAnonymous: dto.isAnonymous ?? false,
        allowMultiple: dto.allowMultiple ?? false,
        allowAddOptions: dto.allowAddOptions ?? false,
        startAt:
          dto.status === PollStatus.OPEN && !startAt ? new Date() : startAt,
        endAt,

        options: {
          create: options.map((text) => ({ text })),
        },
      },

      include: {
        options: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      success: true,
      message: 'Poll created successfully.',
      data: poll,
    };
  }

  // ==========================================
  // Get All Polls
  // ==========================================

  async findAll(communityId: string, query: PollQueryDto) {
    const { page, limit, search, status, sortBy, order } = query;

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
      ];
    }

    if (status) {
      where.status = status;
    }

    const [polls, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },

          options: {
            orderBy: {
              createdAt: 'asc',
            },

            include: {
              _count: {
                select: {
                  votes: true,
                },
              },
            },
          },

          _count: {
            select: {
              votes: true,
            },
          },
        },
      }),

      this.prisma.poll.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Polls retrieved successfully.',
      data: polls,

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
  // Get Poll By ID
  // ==========================================

  async findOne(communityId: string, id: string, userId: string) {
    const poll = await this.findPollDetail(communityId, id, userId);

    return {
      success: true,
      message: 'Poll retrieved successfully.',
      data: poll,
    };
  }

  // ==========================================
  // Update Poll
  // ==========================================

  async update(communityId: string, id: string, dto: UpdatePollDto) {
    const poll = await this.findScoped(communityId, id);

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    // ==========================================
    // Parse Dates
    // ==========================================

    const startAt = dto.startAt
      ? new Date(dto.startAt)
      : (poll.startAt ?? undefined);
    const endAt = dto.endAt ? new Date(dto.endAt) : (poll.endAt ?? undefined);

    this.validateTimeRange(startAt, endAt);

    // ==========================================
    // Validate Options Replacement
    // ==========================================

    let replacementOptions: string[] | undefined;

    if (dto.options && dto.options.length > 0) {
      const voteCount = await this.prisma.pollVote.count({
        where: {
          pollId: id,
        },
      });

      if (voteCount > 0) {
        throw new ConflictException(
          'Poll options cannot be modified after voting has started.',
        );
      }

      replacementOptions = [
        ...new Set(dto.options.map((option) => option.trim()).filter(Boolean)),
      ];

      if (replacementOptions.length < 2) {
        throw new BadRequestException('A poll must have at least 2 options.');
      }

      if (replacementOptions.length > 20) {
        throw new BadRequestException('A poll can have at most 20 options.');
      }
    }

    // ==========================================
    // Update Poll
    // ==========================================

    const updatedPoll = await this.prisma.$transaction(async (tx) => {
      if (replacementOptions) {
        await tx.pollOption.deleteMany({
          where: {
            pollId: id,
          },
        });
      }

      return tx.poll.update({
        where: {
          id,
        },

        data: {
          ...(dto.title && { title: dto.title }),

          ...(dto.description !== undefined && {
            description: dto.description,
          }),

          ...(dto.status && { status: dto.status }),

          ...(dto.isAnonymous !== undefined && {
            isAnonymous: dto.isAnonymous,
          }),

          ...(dto.allowMultiple !== undefined && {
            allowMultiple: dto.allowMultiple,
          }),

          ...(dto.allowAddOptions !== undefined && {
            allowAddOptions: dto.allowAddOptions,
          }),

          ...(dto.startAt && { startAt }),

          ...(dto.endAt !== undefined && { endAt }),

          ...(dto.status === PollStatus.OPEN &&
            !poll.startAt &&
            !dto.startAt && {
              startAt: new Date(),
            }),

          ...(replacementOptions && {
            options: {
              create: replacementOptions.map((text) => ({ text })),
            },
          }),
        },

        include: {
          options: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    });

    return {
      success: true,
      message: 'Poll updated successfully.',
      data: updatedPoll,
    };
  }

  // ==========================================
  // Delete Poll (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    await this.prisma.poll.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Poll deleted successfully.',
    };
  }

  // ==========================================
  // Publish Poll
  // ==========================================

  async publish(communityId: string, id: string) {
    const poll = await this.findScoped(communityId, id);

    if (poll.status === PollStatus.OPEN) {
      throw new ConflictException('Poll is already open.');
    }

    if (poll.status === PollStatus.CLOSED) {
      throw new ConflictException('A closed poll cannot be reopened.');
    }

    const publishedPoll = await this.prisma.poll.update({
      where: {
        id,
      },

      data: {
        status: PollStatus.OPEN,
        startAt: poll.startAt ?? new Date(),
      },

      include: {
        options: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    await this.notifyVoters(communityId, poll);

    return {
      success: true,
      message: 'Poll published successfully.',
      data: publishedPoll,
    };
  }

  // ==========================================
  // Close Poll
  // ==========================================

  async close(communityId: string, id: string) {
    const poll = await this.findScoped(communityId, id);

    if (poll.status === PollStatus.CLOSED) {
      throw new ConflictException('Poll is already closed.');
    }

    const closedPoll = await this.prisma.poll.update({
      where: {
        id,
      },

      data: {
        status: PollStatus.CLOSED,
      },

      include: {
        options: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      success: true,
      message: 'Poll closed successfully.',
      data: closedPoll,
    };
  }

  // ==========================================
  // Vote
  // ==========================================

  async vote(communityId: string, userId: string, id: string, dto: VoteDto) {
    const poll = await this.findScoped(communityId, id);

    this.assertOpenForVoting(poll);

    // ==========================================
    // Validate Options
    // ==========================================

    const optionIds = [...new Set(dto.optionIds)];

    const optionCount = await this.prisma.pollOption.count({
      where: {
        pollId: id,
        id: {
          in: optionIds,
        },
      },
    });

    if (optionCount !== optionIds.length) {
      throw new BadRequestException(
        'One or more options do not belong to this poll.',
      );
    }

    if (!poll.allowMultiple && optionIds.length > 1) {
      throw new BadRequestException('This poll only allows a single choice.');
    }

    // ==========================================
    // Enforce Single Vote
    // ==========================================

    if (!poll.allowMultiple) {
      const existing = await this.prisma.pollVote.findFirst({
        where: {
          pollId: id,
          userId,
        },
      });

      if (existing) {
        throw new ConflictException('You have already voted in this poll.');
      }
    }

    // ==========================================
    // Record Votes
    // ==========================================

    await this.prisma.pollVote.createMany({
      data: optionIds.map((optionId) => ({
        pollId: id,
        optionId,
        userId,
      })),
    });

    const pollDetail = await this.findPollDetail(communityId, id, userId);

    return {
      success: true,
      message: 'Vote recorded successfully.',
      data: pollDetail,
    };
  }

  // ==========================================
  // Add Option
  // ==========================================

  async addOption(communityId: string, id: string, dto: AddPollOptionDto) {
    const poll = await this.findScoped(communityId, id);

    if (!poll.allowAddOptions) {
      throw new BadRequestException('This poll does not allow adding options.');
    }

    if (poll.status !== PollStatus.OPEN) {
      throw new ConflictException('Options can only be added to an open poll.');
    }

    const text = dto.text.trim();

    if (!text) {
      throw new BadRequestException('Option text is required.');
    }

    const duplicate = await this.prisma.pollOption.findFirst({
      where: {
        pollId: id,
        text: {
          equals: text,
          mode: 'insensitive',
        },
      },
    });

    if (duplicate) {
      throw new ConflictException('This option already exists.');
    }

    const optionCount = await this.prisma.pollOption.count({
      where: {
        pollId: id,
      },
    });

    if (optionCount >= 20) {
      throw new BadRequestException('A poll can have at most 20 options.');
    }

    const option = await this.prisma.pollOption.create({
      data: {
        pollId: id,
        text,
      },
    });

    return {
      success: true,
      message: 'Option added successfully.',
      data: option,
    };
  }

  // ==========================================
  // Notify Eligible Voters
  // ==========================================

  private async notifyVoters(
    communityId: string,
    poll: { id: string; title: string },
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        communityId,
        deletedAt: null,

        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: {
                    code: 'poll.view',
                  },
                },
              },
            },
          },
        },
      },

      select: {
        id: true,
      },
    });

    await this.notifications.notifyMany(
      communityId,
      users.map((user) => user.id),
      NotificationType.POLL,
      `New poll: ${poll.title}`,
      'A new poll is open for voting.',
      `/polls/${poll.id}`,
    );
  }
}
