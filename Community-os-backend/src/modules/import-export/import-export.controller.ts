import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { ImportExportService } from './import-export.service';
import { ModuleRegistry } from './module-registry';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('import-export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportExportController {
  constructor(
    private readonly importExportService: ImportExportService,
    private readonly registry: ModuleRegistry,
  ) {}

  @Get('modules')
  getModules() {
    return { success: true, data: this.registry.list() };
  }

  @Get('schemas/:module')
  getSchema(@Param('module') module: string) {
    return { success: true, data: this.importExportService.schema(module) };
  }

  @Get('template/:module')
  async downloadTemplate(
    @Param('module') module: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: any,
  ) {
    const file = await this.importExportService.template(module, format);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    res.send(file.buffer);
  }

  @Post('import/:module/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async preview(
    @Param('module') module: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMappingJson?: string,
    @Request() req?: any,
  ) {
    const mapping = columnMappingJson
      ? JSON.parse(columnMappingJson)
      : undefined;
    const result = await this.importExportService.preview(
      req.user.community.id,
      module,
      file.buffer,
      file.originalname,
      mapping,
      req.user.id,
    );

    return {
      success: true,
      message:
        'batchId' in result && result.invalidRows > 0
          ? `File parsed with ${result.invalidRows} row(s) to review.`
          : 'File parsed successfully.',
      data: result,
    };
  }

  @Post('import/:batchId/confirm')
  async confirm(
    @Param('batchId') batchId: string,
    @Request() req: any,
    @Body('rowIndices') rowIndices?: number[],
  ) {
    return this.importExportService.confirm(
      req.user.community.id,
      batchId,
      req.user.id,
      rowIndices,
    );
  }

  @Post('import/:batchId/cancel')
  async cancel(@Param('batchId') batchId: string, @Request() req: any) {
    return this.importExportService.cancel(req.user.community.id, batchId);
  }

  @Post('import/:batchId/rollback')
  async rollback(@Param('batchId') batchId: string, @Request() req: any) {
    return this.importExportService.rollback(req.user.community.id, batchId);
  }

  @Get('export/:module')
  async exportData(
    @Param('module') module: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Query('columns') columnsParam?: string,
    @Query() query?: Record<string, any>,
    @Request() req?: any,
    @Res() res?: any,
  ) {
    const filters = { ...query };
    delete filters.format;
    delete filters.columns;
    const columns = columnsParam?.split(',').filter(Boolean);
    const file = await this.importExportService.exportData(
      req.user.community.id,
      module,
      format,
      filters,
      columns,
    );
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    res.send(file.buffer);
  }

  @Get('errors/:batchId')
  async downloadErrors(
    @Param('batchId') batchId: string,
    @Request() req: any,
    @Res() res: any,
  ) {
    const file = await this.importExportService.downloadErrors(
      req.user.community.id,
      batchId,
    );
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    res.send(file.buffer);
  }

  @Get('batches')
  async batches(
    @Request() req: any,
    @Query('module') module?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importExportService.batches(
      req.user.community.id,
      module,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
