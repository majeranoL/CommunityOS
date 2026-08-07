import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==========================================
  // List notifications
  // ==========================================

  @Get()
  @Permissions('notification.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List notifications' })
  findAll(@Request() req: any, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(
      req.user.community.id,
      req.user.id,
      query,
    );
  }

  // ==========================================
  // Unread count
  // ==========================================

  @Get('unread-count')
  @Permissions('notification.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Unread notification count' })
  unreadCount(@Request() req: any) {
    return this.notificationsService.unreadCount(
      req.user.community.id,
      req.user.id,
    );
  }

  // ==========================================
  // Mark all as read
  // ==========================================

  @Patch('read-all')
  @Permissions('notification.update')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Mark all notifications as read' })
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(
      req.user.community.id,
      req.user.id,
    );
  }

  // ==========================================
  // Mark single as read
  // ==========================================

  @Patch(':id/read')
  @Permissions('notification.update')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Mark a notification as read' })
  markRead(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(
      req.user.community.id,
      req.user.id,
      id,
    );
  }
}
