import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

import { UploadsService } from './uploads.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const uniqueName = randomUUID();
    const extension = extname(file.originalname);
    cb(null, `${uniqueName}${extension}`);
  },
});

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
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadFile(file);
  }

  // ==========================================
  // Upload Multiple Files
  // ==========================================

  @Post('multiple')
  @Permissions('upload.file')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.uploadsService.uploadFiles(files);
  }
}
