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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';
import { NotificationPrefsService } from './notification-prefs.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prefsService: NotificationPrefsService,
  ) {}

  // ==========================================
  // Notification preferences
  // ==========================================

  @Get('preferences')
  @Permissions('notification.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Get notification preferences' })
  getPreferences(@Request() req: any) {
    return this.prefsService.preferences(
      req.user.community.id,
      req.user.id,
    );
  }

  @Put('preferences')
  @Permissions('notification.update')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Update notification preferences' })
  updatePreferences(
    @Request() req: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.prefsService.upsertMany(
      req.user.community.id,
      req.user.id,
      dto,
    );
  }

  // ==========================================
  // Web push subscriptions (consent to push)
  // ==========================================

  @Post('push-subscribe')
  @Permissions('notification.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Register a web push subscription' })
  subscribePush(@Request() req: any, @Body() dto: CreatePushSubscriptionDto) {
    return this.prefsService.subscribe(
      req.user.community.id,
      req.user.id,
      dto,
    );
  }

  @Delete('push-subscribe/:endpoint')
  @Permissions('notification.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Remove a web push subscription' })
  unsubscribePush(
    @Request() req: any,
    @Param('endpoint') endpoint: string,
  ) {
    return this.prefsService.unsubscribe(
      req.user.community.id,
      req.user.id,
      decodeURIComponent(endpoint),
    );
  }

  @Delete('push-subscribe')
  @Permissions('notification.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Remove all web push subscriptions' })
  unsubscribeAllPush(@Request() req: any) {
    return this.prefsService.unsubscribe(
      req.user.community.id,
      req.user.id,
    );
  }

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
