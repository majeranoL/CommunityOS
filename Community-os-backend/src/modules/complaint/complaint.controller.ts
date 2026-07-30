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

import { ComplaintService } from './complaint.service';

import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ComplaintQueryDto } from './dto/complaint-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('complaints')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ComplaintController {
  constructor(
    private readonly complaintService: ComplaintService,
  ) {}

  // ==========================================
  // Create Complaint
  // ==========================================

  @Post()
  @Permissions('complaint.create')
  create(
    @Request() req: any,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintService.create(
      req.user.community.id,
      dto,
    );
  }

  @Get()
  @Permissions('complaint.view')
  findAll(
    @Request() req: any,
    @Query() query: ComplaintQueryDto,
  ) {
    return this.complaintService.findAll(
      req.user.community.id,
      query,
    );
  }

  // ==========================================
  // Get Complaint By ID
  // ==========================================

  @Get(':id')
  @Permissions('complaint.view')
  findOne(
    @Request() req: any,

    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    return this.complaintService.findOne(
      req.user.community.id,
      id,
    );
  }

  // ==========================================
  // Update Complaint
  // ==========================================

  @Put(':id')
  @Permissions('complaint.update')
  update(
    @Request() req: any,

    @Param('id', ParseUUIDPipe)
    id: string,

    @Body()
    dto: UpdateComplaintDto,
  ) {
    return this.complaintService.update(
      req.user.community.id,
      id,
      dto,
    );
  }

  // ==========================================
  // Delete Complaint
  // ==========================================

  @Delete(':id')
  @Permissions('complaint.delete')
  remove(
    @Request() req: any,

    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    return this.complaintService.remove(
      req.user.community.id,
      id,
    );
  }
}