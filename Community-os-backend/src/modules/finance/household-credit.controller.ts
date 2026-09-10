import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { HouseholdCreditService } from './household-credit.service';
import { FinanceSyncService } from './finance-sync.service';

import { IssueHouseholdCreditDto } from './dto/issue-household-credit.dto';
import { AdjustHouseholdCreditDto } from './dto/adjust-household-credit.dto';
import { HouseholdCreditQueryDto } from './dto/household-credit-query.dto';
import { ApplyHouseholdCreditDto } from './dto/apply-household-credit.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { Feature } from '../../common/decorators/feature.decorator';

@Controller('finance/credits')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@Feature('household-credit')
export class HouseholdCreditController {
  constructor(
    private readonly credits: HouseholdCreditService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // My household's credit (self-service)
  // ==========================================

  @Get('mine')
  @Permissions('credit.view_own')
  async mine(@Request() req: any) {
    const householdId = req.user.resident?.household?.id;
    if (!householdId) {
      throw new NotFoundException('No household is linked to your account.');
    }
    const [credits, availableBalance] = await Promise.all([
      this.credits.list({ communityId: req.user.community.id, householdId }),
      this.credits.availableFor(req.user.community.id, householdId),
    ]);
    return {
      success: true,
      message: 'Household credits retrieved successfully.',
      data: { credits, availableBalance },
    };
  }

  // ==========================================
  // Officer list (by household optional)
  // ==========================================

  @Get()
  @Permissions('credit.view')
  list(@Request() req: any, @Query() query: HouseholdCreditQueryDto) {
    return this.credits.list({
      communityId: req.user.community.id,
      householdId: query.householdId,
    });
  }

  // ==========================================
  // Issue credit
  // ==========================================

  @Post()
  @Permissions('credit.manage')
  issue(@Request() req: any, @Body() dto: IssueHouseholdCreditDto) {
    return this.credits.issue({
      communityId: req.user.community.id,
      householdId: dto.householdId,
      amount: dto.amount,
      actorId: req.user.id,
      reason: dto.reason,
      constructionRequestId: dto.constructionRequestId,
      referenceNumber: dto.referenceNumber,
    });
  }

  // ==========================================
  // Adjust credit balance
  // ==========================================

  @Patch(':id')
  @Permissions('credit.manage')
  adjust(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustHouseholdCreditDto,
  ) {
    return this.credits.adjust({
      communityId: req.user.community.id,
      creditId: id,
      amount: dto.amount,
    });
  }

  // ==========================================
  // Void credit (reverses applications + balance)
  // ==========================================

  @Post(':id/void')
  @Permissions('credit.manage')
  async void(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { assessmentIds } = await this.credits.void({
      communityId: req.user.community.id,
      creditId: id,
      actorId: req.user.id,
    });
    for (const assessmentId of assessmentIds) {
      await this.financeSyncService.syncAssessment(
        req.user.community.id,
        assessmentId,
      );
    }
    return { success: true, message: 'Household credit voided successfully.' };
  }

  // ==========================================
  // Settle assessments using credit (no cash movement)
  // ==========================================

  @Post('apply')
  @Permissions('payment.create')
  async apply(@Request() req: any, @Body() dto: ApplyHouseholdCreditDto) {
    const hasManage = req.user.permissions?.includes('credit.manage');
    const householdId = hasManage
      ? dto.householdId
      : req.user.resident?.household?.id;
    if (!householdId) {
      throw new NotFoundException('No household is linked to your account.');
    }
    const items = dto.allocations?.length
      ? dto.allocations.map((allocation) => ({
          assessmentId: allocation.assessmentId,
          amount: allocation.amount,
        }))
      : (dto.assessmentIds ?? []).map((assessmentId) => ({ assessmentId }));

    const result = await this.credits.apply({
      communityId: req.user.community.id,
      householdId,
      actorId: req.user.id,
      items,
    });

    for (const item of result.appliedByAssessment) {
      await this.financeSyncService.syncAssessment(
        req.user.community.id,
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
