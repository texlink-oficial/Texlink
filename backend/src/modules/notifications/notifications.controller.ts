import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { GetNotificationsQueryDto, MarkReadDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    /**
     * Get notifications for the current user
     */
    @Get()
    async getNotifications(
        @Request() req: any,
        @Query() query: GetNotificationsQueryDto,
    ) {
        return this.notificationsService.getNotifications(req.user.sub, query);
    }

    /**
     * Get unread notification count
     */
    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        const count = await this.notificationsService.getUnreadCount(req.user.sub);
        return { count };
    }

    /**
     * Get a single notification
     */
    @Get(':id')
    async getNotification(
        @Request() req: any,
        @Param('id') id: string,
    ) {
        return this.notificationsService.getNotification(id, req.user.sub);
    }

    /**
     * Mark notification(s) as read
     */
    @Patch('read')
    async markAsRead(
        @Request() req: any,
        @Body() body: MarkReadDto,
    ) {
        const result = await this.notificationsService.markAsRead(req.user.sub, body);
        const unreadCount = await this.notificationsService.getUnreadCount(req.user.sub);
        return { ...result, unreadCount };
    }

    /**
     * Mark a single notification as read
     */
    @Patch(':id/read')
    async markOneAsRead(
        @Request() req: any,
        @Param('id') id: string,
    ) {
        const result = await this.notificationsService.markAsRead(req.user.sub, { notificationId: id });
        const unreadCount = await this.notificationsService.getUnreadCount(req.user.sub);
        return { ...result, unreadCount };
    }

    /**
     * Mark all notifications as read
     */
    @Post('mark-all-read')
    async markAllAsRead(@Request() req: any) {
        const result = await this.notificationsService.markAsRead(req.user.sub, { markAll: true });
        return { ...result, unreadCount: 0 };
    }
}
