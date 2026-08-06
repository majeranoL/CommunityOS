import { Injectable, BadRequestException } from '@nestjs/common';

export interface UploadedFileResponse {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadsService {
  uploadFile(file: Express.Multer.File): {
    success: boolean;
    message: string;
    data: UploadedFileResponse;
  } {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    return {
      success: true,
      message: 'File uploaded successfully.',
      data: {
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    };
  }

  uploadFiles(files: Express.Multer.File[]): {
    success: boolean;
    message: string;
    data: UploadedFileResponse[];
  } {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded.');
    }

    return {
      success: true,
      message: 'Files uploaded successfully.',
      data: files.map((file) => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })),
    };
  }
}
