import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { HouseholdCreditService } from '../finance/household-credit.service';
import { FinanceSyncService } from '../finance/finance-sync.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';

import { AdminHouseholdCreditQueryDto } from './dto/admin-household-credit-query.dto';
import { AdminIssueHouseholdCreditDto } from './dto/admin-issue-household-credit.dto';
import { AdjustHouseholdCreditDto } from '../finance/dto/adjust-household-credit.dto';
import { AdminApplyHouseholdCreditDto } from './dto/admin-apply-household-credit.dto';

@Controller('admin/household-credits')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class HouseholdCreditAdminController {
  constructor(
    private readonly credits: HouseholdCreditService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  @Get()
  list(@Query() query: AdminHouseholdCreditQueryDto) {
    if (!query.communityId) {
      return this.credits.listAll();
    }
    return this.credits.list({
      communityId: query.communityId,
      householdId: query.householdId,
    });
  }

  @Get('households')
  households(@Query() query: AdminHouseholdCreditQueryDto) {
    if (!query.communityId) {
      throw new BadRequestException('communityId is required.');
    }
    return this.credits.listHouseholds(query.communityId);
  }

  @Post()
  issue(@Request() req: any, @Body() dto: AdminIssueHouseholdCreditDto) {
    return this.credits.issue({
      communityId: dto.communityId,
      householdId: dto.householdId,
      amount: dto.amount,
      actorId: req.user.id,
      reason: dto.reason,
      constructionRequestId: dto.constructionRequestId,
      referenceNumber: dto.referenceNumber,
    });
  }

  @Patch(':id')
  adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustHouseholdCreditDto,
  ) {
    return this.credits.adjustAll({ creditId: id, amount: dto.amount });
  }

  @Post(':id/void')
  async void(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const credit = await this.credits.findOneGlobal(id);
    const { assessmentIds } = await this.credits.void({
      communityId: credit.communityId,
      creditId: id,
      actorId: req.user.id,
    });
    for (const assessmentId of assessmentIds) {
      await this.financeSyncService.syncAssessment(
        credit.communityId,
        assessmentId,
      );
    }
    return { success: true, message: 'Household credit voided successfully.' };
  }

  @Post('apply')
  async apply(@Request() req: any, @Body() dto: AdminApplyHouseholdCreditDto) {
    const items = dto.allocations?.length
      ? dto.allocations.map((allocation) => ({
          assessmentId: allocation.assessmentId,
          amount: allocation.amount,
        }))
      : (dto.assessmentIds ?? []).map((assessmentId) => ({ assessmentId }));

    const result = await this.credits.apply({
      communityId: dto.communityId,
      householdId: dto.householdId,
      actorId: req.user.id,
      items,
    });

    for (const item of result.appliedByAssessment) {
      await this.financeSyncService.syncAssessment(
        dto.communityId,
        item.assessmentId,
      );
    }

    return {
      success: true,
      message: `Applied ${Number(result.totalApplied).toFixed(
        2,
      )} in household credit.`,
      data: result,
    };
  }
}
