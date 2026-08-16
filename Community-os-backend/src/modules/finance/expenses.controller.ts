import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ExpensesService } from './expenses.service';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ==========================================
  // Create Expense
  // ==========================================

  @Post()
  @Permissions('finance.expense_create')
  create(@Request() req: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.community.id, dto, req.user.id);
  }

  // ==========================================
  // Get All Expenses
  // ==========================================

  @Get()
  @Permissions('finance.expense_view')
  findAll(@Request() req: any, @Query() query: ExpenseQueryDto) {
    return this.expensesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Expense By ID
  // ==========================================

  @Get(':id')
  @Permissions('finance.expense_view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Expense
  // ==========================================

  @Patch(':id')
  @Permissions('finance.expense_update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Expense
  // ==========================================

  @Delete(':id')
  @Permissions('finance.expense_delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(req.user.community.id, id);
  }
}
