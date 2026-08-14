import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';

import type { Response } from 'express';

import { FinanceImportExportService } from './finance-import-export.service';

import { FinanceExportQueryDto } from './dto/finance-export-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('finance/import-export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceImportExportController {
  constructor(
    private readonly financeImportExportService: FinanceImportExportService,
  ) {}

  // ==========================================
  // Export payments / assessments
  // ==========================================

  @Get('export/:kind')
  @Permissions('finance.export')
  async export(
    @Request() req: any,
    @Param('kind') kind: 'payments' | 'assessments',
    @Query() query: FinanceExportQueryDto,
    @Res() res: Response,
  ) {
    const file = await this.financeImportExportService.export(
      req.user.community.id,
      kind,
      query.format,
      {
        category: query.category,
        from: query.from,
        to: query.to,
      },
    );

    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.buffer);
  }

  // ==========================================
  // Import preview (parse + validate)
  // ==========================================

  @Post('import/preview')
  @Permissions('finance.import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  preview(
    @Request() req: any,
    @Query('kind') kind: 'payments' | 'assessments',
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded.',
      };
    }
    return this.financeImportExportService.preview(
      req.user.community.id,
      kind,
      file,
      req.user.id,
    );
  }

  // ==========================================
  // Import confirm
  // ==========================================

  @Post('import/:batchId/confirm')
  @Permissions('finance.import')
  confirm(
    @Request() req: any,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.financeImportExportService.confirm(
      req.user.community.id,
      batchId,
    );
  }

  // ==========================================
  // Import cancel / rollback
  // ==========================================

  @Post('import/:batchId/cancel')
  @Permissions('finance.import')
  rollback(
    @Request() req: any,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.financeImportExportService.rollback(
      req.user.community.id,
      batchId,
    );
  }

  // ==========================================
  // Import batches
  // ==========================================

  @Get('import/batches')
  @Permissions('finance.import')
  batches(@Request() req: any) {
    return this.financeImportExportService.batches(req.user.community.id);
  }
}
