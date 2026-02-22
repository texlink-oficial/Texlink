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
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';

@Injectable()
export class MessageEventsHandler {
  private readonly logger = new Logger(MessageEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resolve all users from the opposite company (excluding sender).
   * Uses direct companyUser queries like the working order-events handler.
   */
  private async resolveRecipientUsers(
    brandId: string,
    supplierId: string | undefined,
    senderId: string,
  ): Promise<{ userId: string; companyId: string }[]> {
    // Determine which company the sender belongs to
    const senderCompanyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId: senderId,
        companyId: { in: [brandId, ...(supplierId ? [supplierId] : [])] },
      },
      select: { companyId: true },
    });

    if (!senderCompanyUser) {
      this.logger.warn(`Could not determine sender company for user ${senderId}`);
      return [];
    }

    // Recipient company is the other one
    const recipientCompanyId =
      senderCompanyUser.companyId === brandId ? supplierId : brandId;

    if (!recipientCompanyId) {
      this.logger.warn(`No recipient company found (supplierId may be null)`);
      return [];
    }

    const recipientUsers = await this.prisma.companyUser.findMany({
      where: {
        companyId: recipientCompanyId,
        userId: { not: senderId },
      },
      select: { userId: true, companyId: true },
    });

    return recipientUsers;
  }

  /**
   * Handle message sent event
   * Notify ALL users of the opposite company about the new message
   */
  @OnEvent(MESSAGE_SENT)
  async handleMessageSent(payload: Record<string, unknown>) {
    const event = payload as unknown as MessageSentEvent;
    this.logger.log(`Handling message.sent event for order ${event.orderId}`);

    try {
      // Only notify for text messages, proposals have their own handler
      if (event.type !== 'TEXT') return;

      const recipientUsers = await this.resolveRecipientUsers(
        event.brandId,
        event.supplierId,
        event.senderId,
      );

      for (const user of recipientUsers) {
        const actionUrl =
          user.companyId === event.brandId
            ? `/brand/pedidos/${event.orderId}/chat`
            : `/portal/pedidos/${event.orderId}/chat`;

        await this.notificationsService.notify({
          type: NotificationType.MESSAGE_RECEIVED,
          recipientId: user.userId,
          companyId: user.companyId,
          title: 'Nova Mensagem',
          body: `${event.senderName}: ${(event.content || '').substring(0, 100)}${(event.content || '').length > 100 ? '...' : ''}`,
          data: {
            orderId: event.orderId,
            senderName: event.senderName,
            messagePreview: event.content || '',
          },
          actionUrl,
          entityType: 'order',
          entityId: event.orderId,
          skipEmail: true,
        });
      }

      this.logger.log(
        `Sent ${recipientUsers.length} chat notifications for order ${event.orderId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling message.sent: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle proposal sent event
   * Notify ALL users of the opposite company about the new proposal
   */
  @OnEvent(PROPOSAL_SENT)
  async handleProposalSent(payload: Record<string, unknown>) {
    const event = payload as unknown as ProposalSentEvent;
    this.logger.log(`Handling proposal.sent event for order ${event.orderId}`);

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: { displayId: true },
      });

      if (!order) return;

      const recipientUsers = await this.resolveRecipientUsers(
        event.brandId,
        event.supplierId,
        event.senderId,
      );

      for (const user of recipientUsers) {
        const actionUrl =
          user.companyId === event.brandId
            ? `/brand/pedidos/${event.orderId}/chat`
            : `/portal/pedidos/${event.orderId}/chat`;

        let body = `${event.senderName} enviou uma proposta para o pedido ${order.displayId}`;
        if (event.proposedPrice) {
          body += `: R$ ${event.proposedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }

        await this.notificationsService.notify({
          type: NotificationType.ORDER_PROPOSAL_RECEIVED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: user.companyId,
          title: 'Nova Proposta Recebida',
          body,
          data: {
            orderId: event.orderId,
            displayId: order.displayId,
            senderName: event.senderName,
            proposedPrice: event.proposedPrice,
            proposedDeadline: event.proposedDeadline?.toISOString(),
          },
          actionUrl,
          entityType: 'order',
          entityId: event.orderId,
        });
      }

      this.logger.log(
        `Sent ${recipientUsers.length} proposal notifications for order ${event.orderId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling proposal.sent: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle proposal responded event
   * Notify the proposer about the response
   */
  @OnEvent(PROPOSAL_RESPONDED)
  async handleProposalResponded(payload: Record<string, unknown>) {
    const event = payload as unknown as ProposalRespondedEvent;
    this.logger.log(
      `Handling proposal.responded event for order ${event.orderId}`,
    );

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: { displayId: true, productName: true, brandId: true },
      });

      if (!order) return;

      // Determine if the proposer is from the brand or supplier
      const proposerCompanyUser = await this.prisma.companyUser.findFirst({
        where: { userId: event.proposerId },
        select: { companyId: true },
      });

      const actionUrl =
        proposerCompanyUser?.companyId === order.brandId
          ? `/brand/pedidos/${event.orderId}/chat`
          : `/portal/pedidos/${event.orderId}/chat`;

      const isAccepted = event.status === 'ACCEPTED';

      await this.notificationsService.notify({
        type: NotificationType.ORDER_PROPOSAL_RESPONDED,
        priority: NotificationPriority.HIGH,
        recipientId: event.proposerId,
        companyId: proposerCompanyUser?.companyId,
        title: isAccepted ? 'Proposta Aceita!' : 'Proposta Recusada',
        body: isAccepted
          ? `${event.responderName} aceitou sua proposta para o pedido ${order.displayId}`
          : `${event.responderName} recusou sua proposta para o pedido ${order.displayId}`,
        data: event,
        actionUrl,
        entityType: 'order',
        entityId: event.orderId,
      });
    } catch (error) {
      this.logger.error(`Error handling proposal.responded: ${error.message}`, error.stack);
    }
  }
}
