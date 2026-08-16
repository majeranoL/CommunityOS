import { Injectable, NotFoundException } from '@nestjs/common';

import { ExpenseCategory, PaymentMethod } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextExpenseNumber(communityId: string): Promise<string> {
    const latest = await this.prisma.expense.findFirst({
      where: { communityId },
      orderBy: { expenseNumber: 'desc' },
      select: { expenseNumber: true },
    });

    let nextNumber = 0;
    if (latest) {
      const parsed = parseInt(latest.expenseNumber.replace(/^EXP-/, ''), 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed;
    }

    return `EXP-${String(nextNumber + 1).padStart(6, '0')}`;
  }

  // ==========================================
  // Create Expense
  // ==========================================

  async create(communityId: string, dto: CreateExpenseDto, userId: string) {
    const expenseNumber = await this.nextExpenseNumber(communityId);

    const expense = await this.prisma.expense.create({
      data: {
        communityId,
        expenseNumber,
        title: dto.title,
        description: dto.description ?? undefined,
        category: dto.category ?? ExpenseCategory.OTHER,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
        payee: dto.payee ?? undefined,
        referenceNumber: dto.referenceNumber ?? undefined,
        notes: dto.notes ?? undefined,
        receiptFileId: dto.receiptFileId ?? undefined,
        receiptUrl: dto.receiptUrl ?? undefined,
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
      message: 'Expense recorded successfully.',
      data: expense,
    };
  }

  // ==========================================
  // Get All Expenses
  // ==========================================

  async findAll(communityId: string, query: ExpenseQueryDto) {
    const { page, limit, search, category, from, to, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(from || to
        ? {
            expenseDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { expenseNumber: { contains: search, mode: 'insensitive' } },
        { payee: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [expenses, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      success: true,
      message: 'Expenses retrieved successfully.',
      data: expenses,
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
  // Get Expense By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }

    return {
      success: true,
      message: 'Expense retrieved successfully.',
      data: expense,
    };
  }

  // ==========================================
  // Update Expense
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found.');
    }

    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.expenseDate !== undefined) {
      data.expenseDate = new Date(dto.expenseDate);
    }
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.payee !== undefined) data.payee = dto.payee;
    if (dto.referenceNumber !== undefined) {
      data.referenceNumber = dto.referenceNumber;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.receiptFileId !== undefined) data.receiptFileId = dto.receiptFileId;
    if (dto.receiptUrl !== undefined) data.receiptUrl = dto.receiptUrl;

    const expense = await this.prisma.expense.update({
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
      message: 'Expense updated successfully.',
      data: expense,
    };
  }

  // ==========================================
  // Delete Expense (soft delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found.');
    }

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Expense deleted successfully.',
    };
  }
}
