import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
    MESSAGE_SENT,
    PROPOSAL_SENT,
    PROPOSAL_RESPONDED,
} from '../events/notification.events';
import type {
    MessageSentEvent,
    ProposalSentEvent,
    ProposalRespondedEvent,
} from '../events/notification.events';
import { NotificationType, NotificationPriority } from '../dto/notification.dto';

@Injectable()
export class MessageEventsHandler {
    private readonly logger = new Logger(MessageEventsHandler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Handle message sent event
     * Notify the recipient about the new message
     */
    @OnEvent(MESSAGE_SENT)
    async handleMessageSent(payload: Record<string, unknown>) {
        const event = payload as unknown as MessageSentEvent;
        this.logger.log(`Handling message.sent event for order ${event.orderId}`);

        try {
            // Only notify for text messages, proposals have their own handler
            if (event.type !== 'TEXT') return;

            await this.notificationsService.notifyNewMessage(event.recipientId, {
                orderId: event.orderId,
                senderName: event.senderName,
                messagePreview: event.content || '',
            });
        } catch (error) {
            this.logger.error(`Error handling message.sent: ${error.message}`);
        }
    }

    /**
     * Handle proposal sent event
     * Notify the recipient about the new proposal
     */
    @OnEvent(PROPOSAL_SENT)
    async handleProposalSent(payload: Record<string, unknown>) {
        const event = payload as unknown as ProposalSentEvent;
        this.logger.log(`Handling proposal.sent event for order ${event.orderId}`);

        try {
            // Get order display ID
            const order = await this.prisma.order.findUnique({
                where: { id: event.orderId },
                select: { displayId: true },
            });

            if (!order) return;

            await this.notificationsService.notifyProposalReceived(event.recipientId, {
                orderId: event.orderId,
                displayId: order.displayId,
                senderName: event.senderName,
                proposedPrice: event.proposedPrice,
                proposedDeadline: event.proposedDeadline?.toISOString(),
            });
        } catch (error) {
            this.logger.error(`Error handling proposal.sent: ${error.message}`);
        }
    }

    /**
     * Handle proposal responded event
     * Notify the proposer about the response
     */
    @OnEvent(PROPOSAL_RESPONDED)
    async handleProposalResponded(payload: Record<string, unknown>) {
        const event = payload as unknown as ProposalRespondedEvent;
        this.logger.log(`Handling proposal.responded event for order ${event.orderId}`);

        try {
            const order = await this.prisma.order.findUnique({
                where: { id: event.orderId },
                select: { displayId: true, productName: true },
            });

            if (!order) return;

            const isAccepted = event.status === 'ACCEPTED';

            await this.notificationsService.notify({
                type: NotificationType.ORDER_PROPOSAL_RESPONDED,
                priority: NotificationPriority.HIGH,
                recipientId: event.proposerId,
                title: isAccepted ? 'Proposta Aceita!' : 'Proposta Recusada',
                body: isAccepted
                    ? `${event.responderName} aceitou sua proposta para o pedido ${order.displayId}`
                    : `${event.responderName} recusou sua proposta para o pedido ${order.displayId}`,
                data: event,
                actionUrl: `/pedidos/${event.orderId}/chat`,
                entityType: 'order',
                entityId: event.orderId,
            });
        } catch (error) {
            this.logger.error(`Error handling proposal.responded: ${error.message}`);
        }
    }
}
