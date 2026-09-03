import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PaymentMethodConfig,
  PaymentMethodConfigMethod,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { PaymentMethodConfigDto } from './dto/payment-method-config.dto';

const ALL_METHODS: PaymentMethodConfigMethod[] = [
  PaymentMethodConfigMethod.GCASH,
  PaymentMethodConfigMethod.MAYA,
  PaymentMethodConfigMethod.BANK_TRANSFER,
];

const MAX_ACTIVE_PER_SCOPE = 3;

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Resolve a config row.
  // communityId: string -> that community's dues method.
  // communityId: null (platform) -> platform-wide subscription method.
  // ==========================================

  private where(
    communityId: string | null,
    method?: PaymentMethodConfigMethod,
  ): Prisma.PaymentMethodConfigWhereInput {
    return {
      communityId: communityId ?? null,
      ...(method && { method }),
    };
  }

  // ==========================================
  // Officer / superadmin: save a config (upsert).
  // ==========================================

  async save(
    scope: { communityId: string | null },
    dto: PaymentMethodConfigDto,
  ): Promise<PaymentMethodConfig> {
    const method = dto.method;

    if (dto.displayMode === 'NUMBER' && !dto.accountNumber) {
      throw new BadRequestException(
        'Account number is required when display mode is NUMBER or BOTH.',
      );
    }
    if (dto.displayMode === 'QR' && !dto.qrUrl && !dto.qrFileId) {
      throw new BadRequestException(
        'A QR image is required when display mode is QR or BOTH.',
      );
    }

    const existing = await this.prisma.paymentMethodConfig.findFirst({
      where: { ...this.where(scope.communityId), method },
    });

    if (existing) {
      return this.prisma.paymentMethodConfig.update({
        where: { id: existing.id },
        data: {
          displayMode: dto.displayMode,
          accountName: dto.accountName ?? existing.accountName,
          accountNumber: dto.accountNumber ?? existing.accountNumber,
          qrFileId: dto.qrFileId ?? existing.qrFileId,
          qrUrl: dto.qrUrl ?? existing.qrUrl,
          instructions: dto.instructions ?? existing.instructions,
          isActive: dto.isActive ?? existing.isActive,
        },
      });
    }

    // Active-count limit per scope.
    const activeCount = await this.prisma.paymentMethodConfig.count({
      where: { ...this.where(scope.communityId), isActive: true },
    });
    if ((dto.isActive ?? true) && activeCount >= MAX_ACTIVE_PER_SCOPE) {
      throw new BadRequestException(
        `A maximum of ${MAX_ACTIVE_PER_SCOPE} active payment methods is allowed.`,
      );
    }

    return this.prisma.paymentMethodConfig.create({
      data: {
        communityId: scope.communityId ?? null,
        method,
        displayMode: dto.displayMode ?? 'QR',
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        qrFileId: dto.qrFileId,
        qrUrl: dto.qrUrl,
        instructions: dto.instructions,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ==========================================
  // List configs for a scope (management view).
  // ==========================================

  async findAll(scope: { communityId: string | null }) {
    const configs = await this.prisma.paymentMethodConfig.findMany({
      where: this.where(scope.communityId),
      orderBy: { method: 'asc' },
    });

    const byMethod = new Map(configs.map((c) => [c.method, c]));

    const rows = ALL_METHODS.map((method) => {
      const config = byMethod.get(method);
      return config
        ? {
            method,
            displayMode: config.displayMode,
            accountName: config.accountName,
            accountNumber: config.accountNumber,
            qrFileId: config.qrFileId,
            qrUrl: config.qrUrl,
            instructions: config.instructions,
            isActive: config.isActive,
            configured: true,
          }
        : {
            method,
            displayMode: 'QR' as const,
            accountName: null,
            accountNumber: null,
            qrFileId: null,
            qrUrl: null,
            instructions: null,
            isActive: false,
            configured: false,
          };
    });

    return {
      success: true,
      message: 'Payment methods retrieved successfully.',
      data: rows,
    };
  }

  // ==========================================
  // Delete a config.
  // ==========================================

  async remove(
    scope: { communityId: string | null },
    method: PaymentMethodConfigMethod,
  ) {
    const existing = await this.prisma.paymentMethodConfig.findFirst({
      where: { ...this.where(scope.communityId), method },
    });
    if (!existing) {
      throw new NotFoundException('Payment method config not found.');
    }
    await this.prisma.paymentMethodConfig.delete({
      where: { id: existing.id },
    });
    return { success: true, message: 'Payment method removed.' };
  }

  // ==========================================
  // Public / resident read: active configs for a scope.
  // ==========================================

  async findActive(scope: { communityId: string | null }) {
    const configs = await this.prisma.paymentMethodConfig.findMany({
      where: { ...this.where(scope.communityId), isActive: true },
      orderBy: { method: 'asc' },
    });

    return {
      success: true,
      data: configs.map((c) => ({
        method: c.method,
        displayMode: c.displayMode,
        accountName: c.accountName,
        accountNumber: c.accountNumber,
        qrUrl: c.qrUrl,
        instructions: c.instructions,
      })),
    };
  }
}
