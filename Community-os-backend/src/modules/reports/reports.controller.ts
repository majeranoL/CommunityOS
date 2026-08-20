import {
  Controller,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService, ReportResult } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('residents')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Residents export' })
  residents(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'residents');
  }

  @Get('households')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Households export' })
  households(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'households');
  }

  @Get('payments')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Payments export' })
  payments(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'payments');
  }

  @Get('assessments')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Assessments export' })
  assessments(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'assessments');
  }

  @Get('complaints')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Complaints export' })
  complaints(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'complaints');
  }

  @Get('vehicles')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Vehicles export' })
  vehicles(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'vehicles');
  }

  @Get('maintenance')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Maintenance export' })
  maintenance(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'maintenance');
  }

  @Get('visitors')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Visitors export' })
  visitors(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'visitors');
  }

  @Get('events')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Events export' })
  events(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'events');
  }

  @Get('expenses')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Expenses export' })
  expenses(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'expenses');
  }

  @Get('reservations')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Reservations export' })
  reservations(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'reservations');
  }

  @Get('staff')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Staff export' })
  staff(
    @Request() req: any,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, query, 'staff');
  }

  @Get('status-options')
  @Permissions('reports.export')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Status options for report filters' })
  statusOptions() {
    return this.reportsService.statusOptions();
  }

  private async handle(
    req: any,
    res: Response,
    query: ReportQueryDto,
    type: string,
  ) {
    const methods: Record<
      string,
      (communityId: string, month?: string) => Promise<ReportResult>
    > = {
      residents: (id) => this.reportsService.residents(id),
      households: (id) => this.reportsService.households(id),
      payments: (id, month) => this.reportsService.payments(id, month),
      assessments: (id) => this.reportsService.assessments(id),
      complaints: (id) => this.reportsService.complaints(id),
      vehicles: (id) => this.reportsService.vehicles(id),
      maintenance: (id) => this.reportsService.maintenance(id),
      visitors: (id) => this.reportsService.visitors(id),
      events: (id) => this.reportsService.events(id),
      expenses: (id) => this.reportsService.expenses(id),
      reservations: (id) => this.reportsService.reservations(id),
      staff: (id) => this.reportsService.staff(id),
    };

    const report = await methods[type](req.user.community.id, query.month);

    if (query.format === 'json') {
      return {
        success: true,
        message: `${type} report generated successfully.`,
        data: report.rows,
      };
    }

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
    });

    return this.reportsService.buildCsv(report.columns, report.rows);
  }
}
