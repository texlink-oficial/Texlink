import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders/:orderId/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get()
    async getMessages(
        @Param('orderId') orderId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.chatService.getMessages(orderId, userId);
    }

    @Post()
    async sendMessage(
        @Param('orderId') orderId: string,
        @CurrentUser('id') userId: string,
        @Body() dto: SendMessageDto,
    ) {
        return this.chatService.sendMessage(orderId, userId, dto);
    }

    @Patch('messages/:messageId/accept')
    async acceptProposal(
        @Param('orderId') orderId: string,
        @Param('messageId') messageId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.chatService.acceptProposal(messageId, userId);
    }

    @Patch('messages/:messageId/reject')
    async rejectProposal(
        @Param('orderId') orderId: string,
        @Param('messageId') messageId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.chatService.rejectProposal(messageId, userId);
    }

    @Get('unread')
    async getUnreadCount(
        @Param('orderId') orderId: string,
        @CurrentUser('id') userId: string,
    ) {
        const count = await this.chatService.getUnreadCount(orderId, userId);
        return { unreadCount: count };
    }
}
