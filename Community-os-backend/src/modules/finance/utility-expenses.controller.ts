import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { UtilityExpensesService } from './utility-expenses.service';

import { CreateUtilityExpenseDto } from './dto/create-utility-expense.dto';
import { UpdateUtilityExpenseDto } from './dto/update-utility-expense.dto';
import { UtilityExpenseQueryDto } from './dto/utility-expense-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('utility-expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UtilityExpensesController {
  constructor(
    private readonly utilityExpensesService: UtilityExpensesService,
  ) {}

  // ==========================================
  // Create Utility Expense
  // ==========================================

  @Post()
  @Permissions('finance.expense_create')
  create(@Request() req: any, @Body() dto: CreateUtilityExpenseDto) {
    return this.utilityExpensesService.create(
      req.user.community.id,
      dto,
      req.user.id,
    );
  }

  // ==========================================
  // Get All Utility Expenses
  // ==========================================

  @Get()
  @Permissions('finance.expense_view')
  findAll(@Request() req: any, @Query() query: UtilityExpenseQueryDto) {
    return this.utilityExpensesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Summary
  // ==========================================

  @Get('summary')
  @Permissions('finance.expense_view')
  summary(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.utilityExpensesService.summary(req.user.community.id, {
      from,
      to,
    });
  }

  // ==========================================
  // Get One Utility Expense
  // ==========================================

  @Get(':id')
  @Permissions('finance.expense_view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.utilityExpensesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Utility Expense
  // ==========================================

  @Put(':id')
  @Permissions('finance.expense_update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUtilityExpenseDto,
  ) {
    return this.utilityExpensesService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Utility Expense
  // ==========================================

  @Delete(':id')
  @Permissions('finance.expense_delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.utilityExpensesService.remove(req.user.community.id, id);
  }
}
