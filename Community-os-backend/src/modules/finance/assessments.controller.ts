import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AssessmentsService } from './assessments.service';

import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import { GenerateAssessmentsDto } from './dto/generate-assessments.dto';
import { DuesTrackerQueryDto } from './dto/dues-tracker-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { hasAnyPermission } from '../../common/utils/permissions';

@Controller('assessments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  private resolveScope(user: any): string | undefined {
    const isManager = hasAnyPermission(user, [
      'assessment.create',
      'assessment.update',
      'assessment.delete',
      'assessment.issue',
      'assessment.cancel',
      'finance.waive',
    ]);

    if (isManager) return undefined;

    return user.resident?.household?.id;
  }

  // ==========================================
  // Create Assessment
  // ==========================================

  @Post()
  @Permissions('assessment.create')
  create(@Request() req: any, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Generate Assessments (bulk monthly dues)
  // ==========================================

  @Post('generate')
  @Permissions('assessment.create')
  generate(@Request() req: any, @Body() dto: GenerateAssessmentsDto) {
    return this.assessmentsService.generate(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Assessments
  // ==========================================

  @Get()
  @Permissions('assessment.view')
  findAll(@Request() req: any, @Query() query: AssessmentQueryDto) {
    return this.assessmentsService.findAll(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }

  // ==========================================
  // Dues Tracker (household x period matrix)
  // ==========================================

  @Get('dues-tracker')
  @Permissions('assessment.view')
  duesTracker(@Request() req: any, @Query() query: DuesTrackerQueryDto) {
    return this.assessmentsService.duesTracker(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }

  // ==========================================
  // Get Assessment By ID
  // ==========================================

  @Get(':id')
  @Permissions('assessment.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.findOne(
      req.user.community.id,
      id,
      this.resolveScope(req.user),
    );
  }

  // ==========================================
  // Update Assessment
  // ==========================================

  @Put(':id')
  @Permissions('assessment.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessmentsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Assessment
  // ==========================================

  @Delete(':id')
  @Permissions('assessment.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Issue Assessment
  // ==========================================

  @Patch(':id/issue')
  @Permissions('assessment.issue')
  issue(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.issue(req.user.community.id, id);
  }

  // ==========================================
  // Cancel Assessment
  // ==========================================

  @Patch(':id/cancel')
  @Permissions('assessment.cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.cancel(req.user.community.id, id);
  }

  // ==========================================
  // Waive Assessment
  // ==========================================

  @Patch(':id/waive')
  @Permissions('finance.waive')
  waive(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.waive(req.user.community.id, id);
  }
}
