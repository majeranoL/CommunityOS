import { Injectable, NotFoundException } from '@nestjs/common';

import { PaymentMethod, UtilityType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateUtilityExpenseDto } from './dto/create-utility-expense.dto';
import { UpdateUtilityExpenseDto } from './dto/update-utility-expense.dto';
import { UtilityExpenseQueryDto } from './dto/utility-expense-query.dto';

@Injectable()
export class UtilityExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextUtilityNumber(communityId: string): Promise<string> {
    const latest = await this.prisma.utilityExpense.findFirst({
      where: { communityId },
      orderBy: { utilityNumber: 'desc' },
      select: { utilityNumber: true },
    });

    let nextNumber = 0;
    if (latest) {
      const parsed = parseInt(latest.utilityNumber.replace(/^UTL-/, ''), 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed;
    }

    return `UTL-${String(nextNumber + 1).padStart(6, '0')}`;
  }

  // ==========================================
  // Create Utility Expense
  // ==========================================

  async create(communityId: string, dto: CreateUtilityExpenseDto, userId: string) {
    const utilityNumber = await this.nextUtilityNumber(communityId);

    const expense = await this.prisma.utilityExpense.create({
      data: {
        communityId,
        utilityNumber,
        providerName: dto.providerName.trim(),
        utilityType: dto.utilityType,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        billingPeriod: dto.billingPeriod?.trim(),
        paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
        referenceNumber: dto.referenceNumber?.trim(),
        invoiceNumber: dto.invoiceNumber?.trim(),
        description: dto.description?.trim(),
        receiptFileId: dto.receiptFileId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      message: 'Utility expense recorded successfully.',
      data: expense,
    };
  }

  // ==========================================
  // Get All Utility Expenses
  // ==========================================

  async findAll(communityId: string, query: UtilityExpenseQueryDto) {
    const { page, limit, search, utilityType, providerName, from, to, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (utilityType) {
      where.utilityType = utilityType;
    }

    if (providerName) {
      where.providerName = { contains: providerName, mode: 'insensitive' };
    }

    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to);
    }

    if (search) {
      where.OR = [
        { utilityNumber: { contains: search, mode: 'insensitive' } },
        { providerName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSorts: Record<string, string> = {
      utilityNumber: 'utilityNumber',
      providerName: 'providerName',
      amount: 'amount',
      expenseDate: 'expenseDate',
      createdAt: 'createdAt',
    };

    const orderBy = { [allowedSorts[sortBy] ?? 'expenseDate']: order };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.utilityExpense.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.utilityExpense.count({ where }),
    ]);

    return {
      success: true,
      message: 'Utility expenses retrieved successfully.',
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ==========================================
  // Get Summary
  // ==========================================

  async summary(communityId: string, query: { from?: string; to?: string }) {
    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (query.from || query.to) {
      where.expenseDate = {};
      if (query.from) where.expenseDate.gte = new Date(query.from);
      if (query.to) where.expenseDate.lte = new Date(query.to);
    }

    const expenses = await this.prisma.utilityExpense.findMany({
      where,
      select: {
        amount: true,
        utilityType: true,
        providerName: true,
      },
    });

    let totalAmount = 0;
    const byType: Record<string, { total: number; count: number }> = {};
    const byProvider: Record<string, { total: number; count: number }> = {};

    for (const expense of expenses) {
      totalAmount += Number(expense.amount);

      const typeKey = expense.utilityType;
      if (!byType[typeKey]) byType[typeKey] = { total: 0, count: 0 };
      byType[typeKey].total += Number(expense.amount);
      byType[typeKey].count += 1;

      const providerKey = expense.providerName;
      if (!byProvider[providerKey]) byProvider[providerKey] = { total: 0, count: 0 };
      byProvider[providerKey].total += Number(expense.amount);
      byProvider[providerKey].count += 1;
    }

    return {
      success: true,
      message: 'Utility expense summary retrieved successfully.',
      data: {
        totalAmount,
        totalCount: expenses.length,
        byType: Object.entries(byType).map(([type, data]) => ({
          type,
          total: data.total,
          count: data.count,
        })),
        byProvider: Object.entries(byProvider).map(([provider, data]) => ({
          provider,
          total: data.total,
          count: data.count,
        })),
      },
    };
  }

  // ==========================================
  // Get One Utility Expense
  // ==========================================

  async findOne(communityId: string, id: string) {
    const expense = await this.prisma.utilityExpense.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Utility expense not found.');
    }

    return {
      success: true,
      message: 'Utility expense retrieved successfully.',
      data: expense,
    };
  }

  // ==========================================
  // Update Utility Expense
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateUtilityExpenseDto) {
    const expense = await this.prisma.utilityExpense.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!expense) {
      throw new NotFoundException('Utility expense not found.');
    }

    const data: any = {};
    if (dto.providerName !== undefined) data.providerName = dto.providerName.trim();
    if (dto.utilityType !== undefined) data.utilityType = dto.utilityType;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.expenseDate !== undefined) data.expenseDate = new Date(dto.expenseDate);
    if (dto.billingPeriod !== undefined) data.billingPeriod = dto.billingPeriod?.trim();
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.referenceNumber !== undefined) data.referenceNumber = dto.referenceNumber?.trim();
    if (dto.invoiceNumber !== undefined) data.invoiceNumber = dto.invoiceNumber?.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim();
    if (dto.receiptFileId !== undefined) data.receiptFileId = dto.receiptFileId;

    const updated = await this.prisma.utilityExpense.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      message: 'Utility expense updated successfully.',
      data: updated,
    };
  }

  // ==========================================
  // Remove Utility Expense
  // ==========================================

  async remove(communityId: string, id: string) {
    const expense = await this.prisma.utilityExpense.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!expense) {
      throw new NotFoundException('Utility expense not found.');
    }

    await this.prisma.utilityExpense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Utility expense deleted successfully.',
      data: null,
    };
  }
}
