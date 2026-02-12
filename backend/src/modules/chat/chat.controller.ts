import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('orders/:orderId/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getMessages(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('direction') direction?: 'before' | 'after',
  ) {
    return this.chatService.getMessages(orderId, userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
      direction,
    });
  }

  @Post()
  async sendMessage(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(orderId, userId, dto);
  }

  @Patch('messages/:messageId/accept')
  async acceptProposal(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.acceptProposal(messageId, userId);
  }

  @Patch('messages/:messageId/reject')
  async rejectProposal(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.rejectProposal(messageId, userId);
  }

  @Get('unread')
  async getUnreadCount(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    const count = await this.chatService.getUnreadCount(orderId, userId);
    return { unreadCount: count };
  }
}
