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

import { MessagingService } from './messaging.service';

import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ==========================================
  // Send Message
  // ==========================================

  @Post()
  @Permissions('message.create')
  create(@Request() req: any, @Body() dto: CreateMessageDto) {
    return this.messagingService.create(
      req.user.community.id,
      req.user.id,
      dto,
    );
  }

  // ==========================================
  // Get All Messages
  // ==========================================

  @Get()
  @Permissions('message.view')
  findAll(@Request() req: any, @Query() query: MessageQueryDto) {
    return this.messagingService.findAll(
      req.user.community.id,
      req.user.id,
      query,
    );
  }

  // ==========================================
  // Get Message By ID
  // ==========================================

  @Get(':id')
  @Permissions('message.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.messagingService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Message
  // ==========================================

  @Put(':id')
  @Permissions('message.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagingService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Message
  // ==========================================

  @Delete(':id')
  @Permissions('message.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.messagingService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Mark Message As Read
  // ==========================================

  @Patch(':id/read')
  @Permissions('message.update')
  markAsRead(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.messagingService.markAsRead(
      req.user.community.id,
      id,
      req.user.id,
    );
  }
}
