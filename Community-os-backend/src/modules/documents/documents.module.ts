import { Module } from '@nestjs/common';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
