import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  NotificationType,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // Create Payment
  // ==========================================

  async create(communityId: string, dto: CreatePaymentDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.paymentNumber = dto.paymentNumber.trim();
    dto.referenceNumber = dto.referenceNumber?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Duplicate Payment Number
    // ==========================================

    const existing = await this.prisma.payment.findFirst({
      where: {
        communityId,
        paymentNumber: dto.paymentNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Payment already exists.');
    }

    // ==========================================
    // Validate Assessment
    // ==========================================

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: dto.assessmentId,
        communityId,
        deletedAt: null,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    if (assessment.status === AssessmentStatus.CANCELLED) {
      throw new ConflictException(
        'Payment cannot be made on a cancelled assessment.',
      );
    }

    // ==========================================
    // Validate Resident
    // ==========================================

    const resident = await this.prisma.resident.findFirst({
      where: {
        id: dto.residentId,
        communityId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    // ==========================================
    // Create Payment
    // ==========================================

    const payment = await this.prisma.payment.create({
      data: {
        communityId,

        paymentNumber: dto.paymentNumber,
        assessmentId: dto.assessmentId,
        residentId: dto.residentId,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate),
        method: dto.method ?? 'CASH',
        referenceNumber: dto.referenceNumber,
        remarks: dto.remarks,

        status: dto.status ?? PaymentStatus.PENDING,
      },

      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // ==========================================
    // Notify Finance Staff
    // ==========================================

    if (payment.status === PaymentStatus.PENDING) {
      const financeUserIds =
        await this.notificationsService.userIdsWithPermission(
          communityId,
          'payment.confirm',
        );

      await this.notificationsService.notifyMany(
        communityId,
        financeUserIds,
        NotificationType.PAYMENT,
        `New payment ${payment.paymentNumber} awaiting confirmation`,
        `${payment.resident.firstName} ${payment.resident.lastName} recorded a payment of ${Number(
          payment.amount,
        )} for ${payment.assessment.title}.`,
        `/payments/${payment.id}`,
      );
    }

    return {
      success: true,
      message: 'Payment created successfully.',
      data: payment,
    };
  }

  // ==========================================
  // Get All Payments
  // ==========================================

  async findAll(communityId: string, query: PaymentQueryDto) {
    const {
      page,
      limit,
      search,
      status,
      method,
      assessmentId,
      residentId,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          paymentNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          referenceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          resident: {
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
    }

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (assessmentId) {
      where.assessmentId = assessmentId;
    }

    if (residentId) {
      where.residentId = residentId;
    }

    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              title: true,
            },
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.payment.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Payments retrieved successfully.',
      data: payments,

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
  // Get Payment By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return {
      success: true,
      message: 'Payment retrieved successfully.',
      data: payment,
    };
  }

  // ==========================================
  // Update Payment
  // ==========================================

  async update(communityId: string, id: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.paymentNumber) dto.paymentNumber = dto.paymentNumber.trim();

    if (dto.referenceNumber) dto.referenceNumber = dto.referenceNumber.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Duplicate Payment Number
    // ==========================================

    if (dto.paymentNumber) {
      const existing = await this.prisma.payment.findFirst({
        where: {
          communityId,
          paymentNumber: dto.paymentNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Payment already exists.');
      }
    }

    // ==========================================
    // Validate Assessment
    // ==========================================

    if (dto.assessmentId && dto.assessmentId !== payment.assessmentId) {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: dto.assessmentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found.');
      }
    }

    // ==========================================
    // Validate Resident
    // ==========================================

    if (dto.residentId && dto.residentId !== payment.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // ==========================================
    // Update Payment
    // ==========================================

    const updatedPayment = await this.prisma.payment.update({
      where: {
        id,
      },

      data: {
        ...(dto.paymentNumber && {
          paymentNumber: dto.paymentNumber,
        }),

        ...(dto.assessmentId && {
          assessmentId: dto.assessmentId,
        }),

        ...(dto.residentId && {
          residentId: dto.residentId,
        }),

        ...(dto.amount !== undefined && {
          amount: dto.amount,
        }),

        ...(dto.paymentDate && {
          paymentDate: new Date(dto.paymentDate),
        }),

        ...(dto.method && { method: dto.method }),

        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
          },
        },
        resident: {
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
      message: 'Payment updated successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Delete Payment (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    await this.prisma.payment.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Payment deleted successfully.',
    };
  }

  // ==========================================
  // Confirm Payment
  // ==========================================

  async confirm(communityId: string, id: string) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only PENDING payments can be confirmed.');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: {
        id,
      },

      data: {
        status: PaymentStatus.CONFIRMED,
      },

      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.syncAssessmentStatus(communityId, payment.assessmentId);

    // ==========================================
    // Notify Finance Staff
    // ==========================================

    const financeUserIds =
      await this.notificationsService.userIdsWithPermission(
        communityId,
        'payment.confirm',
      );

    await this.notificationsService.notifyMany(
      communityId,
      financeUserIds,
      NotificationType.PAYMENT,
      `Payment ${payment.paymentNumber} confirmed`,
      `${updatedPayment.resident.firstName} ${updatedPayment.resident.lastName}'s payment of ${Number(
        updatedPayment.amount,
      )} has been confirmed.`,
      `/payments/${payment.id}`,
    );

    return {
      success: true,
      message: 'Payment confirmed successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Reject Payment
  // ==========================================

  async reject(communityId: string, id: string) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only PENDING payments can be rejected.');
    }

    return this.updateStatus(communityId, id, PaymentStatus.REJECTED);
  }

  // ==========================================
  // Refund Payment
  // ==========================================

  async refund(communityId: string, id: string) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED payments can be refunded.');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: {
        id,
      },

      data: {
        status: PaymentStatus.REFUNDED,
      },

      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.syncAssessmentStatus(communityId, payment.assessmentId);

    return {
      success: true,
      message: 'Payment refunded successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return payment;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: PaymentStatus,
  ) {
    const payment = await this.prisma.payment.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
          },
        },
        resident: {
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
      message: `Payment ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: payment,
    };
  }

  private async syncAssessmentStatus(
    communityId: string,
    assessmentId: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: assessmentId,
      },
    });

    if (!assessment) {
      return;
    }

    const confirmed = await this.prisma.payment.aggregate({
      where: {
        communityId,
        assessmentId,
        deletedAt: null,
        status: PaymentStatus.CONFIRMED,
      },
      _sum: {
        amount: true,
      },
    });

    const paidAmount = confirmed._sum.amount
      ? confirmed._sum.amount.toNumber()
      : 0;

    const assessmentAmount = assessment.amount.toNumber();

    let status = assessment.status;

    if (assessment.status !== AssessmentStatus.CANCELLED) {
      if (paidAmount >= assessmentAmount) {
        status = AssessmentStatus.PAID;
      } else if (paidAmount > 0) {
        status = AssessmentStatus.PARTIALLY_PAID;
      } else {
        status = AssessmentStatus.ISSUED;
      }
    }

    await this.prisma.assessment.update({
      where: {
        id: assessmentId,
      },

      data: {
        paidAmount,
        status,
      },
    });
  }
}
