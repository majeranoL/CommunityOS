import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';

import { UploadsService } from './uploads.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { hasAnyPermission } from '../../common/utils/permissions';

import {
  isAllowedExtension,
  MAX_FILE_SIZE,
} from '../../common/utils/file-validation';

import type { Response } from 'express';

const storage = memoryStorage();

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!isAllowedExtension(file.originalname)) {
    cb(
      new BadRequestException(
        `File extension of "${file.originalname}" is not allowed`,
      ),
      false,
    );
    return;
  }
  cb(null, true);
};

@Controller('uploads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // ==========================================
  // Upload Single File
  // ==========================================

  @Post()
  @Permissions('upload.file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadFile(
      req.user.community.id,
      req.user.id,
      file,
    );
  }

  // ==========================================
  // Upload Multiple Files
  // ==========================================

  @Post('multiple')
  @Permissions('upload.file')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadFiles(@Req() req: any, @UploadedFiles() files: Express.Multer.File[]) {
    return this.uploadsService.uploadFiles(
      req.user.community.id,
      req.user.id,
      files,
    );
  }

  // ==========================================
  // Stream a file (JWT-gated, community-scoped)
  // ==========================================

  @Get(':id')
  async download(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const record = await this.uploadsService.getUploadForCommunity(
      req.user.community.id,
      id,
    );

    // Payment-proof files are private to the owning household unless the
    // caller is a finance manager. Non-proof uploads keep the previous
    // community-scoped behaviour.
    const proofHouseholdId =
      await this.uploadsService.findPaymentProofHousehold(
        req.user.community.id,
        id,
      );

    if (proofHouseholdId) {
      const isManager = hasAnyPermission(req.user, [
        'finance.view_all',
        'finance.manage',
        'finance.verify',
        'finance.reject',
        'finance.refund',
        'payment.cancel',
      ]);

      if (!isManager && req.user.resident?.household?.id !== proofHouseholdId) {
        throw new NotFoundException('File not found');
      }
    }

    const filePath = join(process.cwd(), 'uploads', record.filename);

    if (!existsSync(filePath)) {
      res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'File missing on disk',
      });
      return;
    }

    res.setHeader('Content-Type', record.mimetype);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      record.module === 'document'
        ? `inline; filename="${record.originalName}"`
        : `attachment; filename="${record.originalName}"`,
    );

    createReadStream(filePath).pipe(res);
  }
}
