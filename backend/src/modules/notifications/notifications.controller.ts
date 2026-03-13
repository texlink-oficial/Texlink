import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { GetNotificationsQueryDto, MarkReadDto } from './dto/notification.dto';

@ApiTags('Notificações')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get notifications for the current user
   */
  @Get()
  async getNotifications(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications(userId, query, companyId);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(userId, companyId);
    return { count };
  }

  /**
   * Get a single notification
   */
  @Get(':id')
  async getNotification(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.getNotification(id, userId);
  }

  /**
   * Mark notification(s) as read
   */
  @Patch('read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Body() body: MarkReadDto,
  ) {
    const result = await this.notificationsService.markAsRead(userId, body);
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { ...result, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  @Patch(':id/read')
  async markOneAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.notificationsService.markAsRead(userId, {
      notificationId: id,
    });
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { ...result, unreadCount };
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  async markAllAsRead(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const result = await this.notificationsService.markAsRead(userId, {
      markAll: true,
    }, companyId);
    return { ...result, unreadCount: 0 };
  }
}
