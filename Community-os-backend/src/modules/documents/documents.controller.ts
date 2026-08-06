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

import { DocumentsService } from './documents.service';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ==========================================
  // Create Document
  // ==========================================

  @Post()
  @Permissions('document.create')
  create(@Request() req: any, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(
      req.user.community.id,
      req.user.id,
      dto,
    );
  }

  // ==========================================
  // Get All Documents
  // ==========================================

  @Get()
  @Permissions('document.view')
  findAll(@Request() req: any, @Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Document By ID
  // ==========================================

  @Get(':id')
  @Permissions('document.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Document
  // ==========================================

  @Put(':id')
  @Permissions('document.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Document
  // ==========================================

  @Delete(':id')
  @Permissions('document.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Publish Document
  // ==========================================

  @Patch(':id/publish')
  @Permissions('document.publish')
  publish(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.publish(req.user.community.id, id);
  }

  // ==========================================
  // Archive Document
  // ==========================================

  @Patch(':id/archive')
  @Permissions('document.archive')
  archive(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.archive(req.user.community.id, id);
  }
}
