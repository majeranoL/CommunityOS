import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AuditLogsService } from './audit-logs.service';

import { AuditLogQueryDto } from './dto/audit-log-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // ==========================================
  // Get All Audit Logs
  // ==========================================

  @Get()
  @Permissions('audit.view')
  findAll(@Request() req: any, @Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Summary
  // ==========================================

  @Get('summary')
  @Permissions('audit.view')
  summary(@Request() req: any) {
    return this.auditLogsService.summary(req.user.community.id);
  }

  // ==========================================
  // Purge Old Logs
  // ==========================================

  @Delete()
  @Permissions('audit.manage')
  purge(
    @Request() req: any,
    @Query('keepDays', new DefaultValuePipe(90), ParseIntPipe) keepDays: number,
  ) {
    return this.auditLogsService.purge(req.user.community.id, keepDays);
  }
}
