import {
    Controller,
    Post,
    Body,
    Headers,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';

interface TwilioWebhookEvent {
    MessageSid: string;
    SmsSid?: string;
    AccountSid: string;
    From: string;
    To: string;
    Body: string;
    MessageStatus: string;
    SmsStatus?: string;
    invitationId?: string;
}

@ApiTags('Webhooks')
@Controller('webhooks/twilio')
export class TwilioWebhookController {
    private readonly logger = new Logger(TwilioWebhookController.name);
    private readonly processedEvents = new Set<string>();

    constructor(private readonly prisma: PrismaService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Webhook do Twilio WhatsApp' })
    @ApiResponse({ status: 200, description: 'Evento processado' })
    async handleWebhook(
        @Body() event: TwilioWebhookEvent,
        @Headers('x-twilio-signature') signature?: string,
    ) {
        try {
            await this.processEvent(event);
            return { success: true };
        } catch (error) {
            this.logger.error('Erro ao processar evento Twilio', error);
            return { success: false, error: error.message };
        }
    }

    private async processEvent(event: TwilioWebhookEvent) {
        const messageId = event.MessageSid || event.SmsSid;
        const status = event.MessageStatus || event.SmsStatus;
        const eventId = `${messageId}-${status}`;

        if (this.processedEvents.has(eventId)) {
            return;
        }

        const invitationId = event.invitationId;
        if (!invitationId) return;

        const invitation = await this.prisma.credentialInvitation.findUnique({
            where: { id: invitationId },
        });

        if (!invitation) return;

        switch (status?.toLowerCase()) {
            case 'delivered':
                await this.handleDelivered(invitationId);
                break;
            case 'read':
                await this.handleRead(invitationId);
                break;
            case 'failed':
            case 'undelivered':
                await this.handleFailed(invitationId, status);
                break;
        }

        this.processedEvents.add(eventId);
        setTimeout(() => this.processedEvents.delete(eventId), 3600000);
    }

    private async handleDelivered(invitationId: string) {
        await this.prisma.credentialInvitation.update({
            where: { id: invitationId },
            data: { deliveredAt: new Date() },
        });
    }

    private async handleRead(invitationId: string) {
        await this.prisma.credentialInvitation.update({
            where: { id: invitationId },
            data: { openedAt: new Date() },
        });
    }

    private async handleFailed(invitationId: string, status: string) {
        await this.prisma.credentialInvitation.update({
            where: { id: invitationId },
            data: {
                isActive: false,
                errorMessage: `Falha no WhatsApp: ${status}`,
            },
        });
    }
}
