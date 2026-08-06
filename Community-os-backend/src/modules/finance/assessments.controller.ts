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

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('assessments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  // ==========================================
  // Create Assessment
  // ==========================================

  @Post()
  @Permissions('assessment.create')
  create(@Request() req: any, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Assessments
  // ==========================================

  @Get()
  @Permissions('assessment.view')
  findAll(@Request() req: any, @Query() query: AssessmentQueryDto) {
    return this.assessmentsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Assessment By ID
  // ==========================================

  @Get(':id')
  @Permissions('assessment.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.findOne(req.user.community.id, id);
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
}
