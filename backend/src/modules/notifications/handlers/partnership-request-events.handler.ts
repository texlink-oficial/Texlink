import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
  PARTNERSHIP_REQUEST_RECEIVED,
  PARTNERSHIP_REQUEST_ACCEPTED,
  PARTNERSHIP_REQUEST_REJECTED,
  PARTNERSHIP_REQUEST_CANCELLED,
} from '../events/notification.events';
import type {
  PartnershipRequestReceivedEvent,
  PartnershipRequestAcceptedEvent,
  PartnershipRequestRejectedEvent,
  PartnershipRequestCancelledEvent,
} from '../events/notification.events';
import { NotificationType, NotificationPriority } from '../dto/notification.dto';

@Injectable()
export class PartnershipRequestEventsHandler {
  private readonly logger = new Logger(PartnershipRequestEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handle partnership request received event
   * Notify supplier users about the new partnership request
   */
  @OnEvent(PARTNERSHIP_REQUEST_RECEIVED)
  async handleRequestReceived(payload: Record<string, unknown>) {
    const event = payload as unknown as PartnershipRequestReceivedEvent;
    this.logger.log(
      `Handling partnership.request.received for request ${event.requestId}`,
    );

    try {
      // Get all users from the supplier company
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.supplierId },
        select: { userId: true },
      });

      // Send notification to each supplier user
      for (const { userId } of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PARTNERSHIP_REQUEST_RECEIVED,
          priority: NotificationPriority.HIGH,
          recipientId: userId,
          companyId: event.supplierId,
          title: 'Nova Solicitação de Parceria',
          body: `${event.brandName} enviou uma solicitação de parceria.${event.message ? ` Mensagem: "${event.message}"` : ''}`,
          data: {
            requestId: event.requestId,
            brandId: event.brandId,
            brandName: event.brandName,
          },
          actionUrl: `/portal/solicitacoes/${event.requestId}`,
          entityType: 'PartnershipRequest',
          entityId: event.requestId,
        });
      }

      this.logger.log(
        `Sent ${supplierUsers.length} notifications for partnership request ${event.requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling partnership.request.received: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle partnership request accepted event
   * Notify brand users that their request was accepted
   */
  @OnEvent(PARTNERSHIP_REQUEST_ACCEPTED)
  async handleRequestAccepted(payload: Record<string, unknown>) {
    const event = payload as unknown as PartnershipRequestAcceptedEvent;
    this.logger.log(
      `Handling partnership.request.accepted for request ${event.requestId}`,
    );

    try {
      // Get all users from the brand company
      const brandUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.brandId },
        select: { userId: true },
      });

      // Send notification to each brand user
      for (const { userId } of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PARTNERSHIP_REQUEST_ACCEPTED,
          priority: NotificationPriority.HIGH,
          recipientId: userId,
          companyId: event.brandId,
          title: 'Solicitação de Parceria Aceita',
          body: `${event.supplierName} aceitou sua solicitação de parceria. O relacionamento foi estabelecido!`,
          data: {
            requestId: event.requestId,
            supplierId: event.supplierId,
            supplierName: event.supplierName,
            relationshipId: event.relationshipId,
          },
          actionUrl: `/brand/fornecedores`,
          entityType: 'PartnershipRequest',
          entityId: event.requestId,
        });
      }

      this.logger.log(
        `Sent ${brandUsers.length} notifications for accepted partnership request ${event.requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling partnership.request.accepted: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle partnership request rejected event
   * Notify brand users that their request was rejected
   */
  @OnEvent(PARTNERSHIP_REQUEST_REJECTED)
  async handleRequestRejected(payload: Record<string, unknown>) {
    const event = payload as unknown as PartnershipRequestRejectedEvent;
    this.logger.log(
      `Handling partnership.request.rejected for request ${event.requestId}`,
    );

    try {
      // Get all users from the brand company
      const brandUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.brandId },
        select: { userId: true },
      });

      // Send notification to each brand user
      for (const { userId } of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PARTNERSHIP_REQUEST_REJECTED,
          priority: NotificationPriority.NORMAL,
          recipientId: userId,
          companyId: event.brandId,
          title: 'Solicitação de Parceria Recusada',
          body: `${event.supplierName} recusou sua solicitação de parceria.${event.rejectionReason ? ` Motivo: "${event.rejectionReason}"` : ''}`,
          data: {
            requestId: event.requestId,
            supplierId: event.supplierId,
            supplierName: event.supplierName,
            rejectionReason: event.rejectionReason,
          },
          actionUrl: `/brand/fornecedores/solicitacoes`,
          entityType: 'PartnershipRequest',
          entityId: event.requestId,
        });
      }

      this.logger.log(
        `Sent ${brandUsers.length} notifications for rejected partnership request ${event.requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling partnership.request.rejected: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle partnership request cancelled event
   * Notify supplier users that the request was cancelled
   */
  @OnEvent(PARTNERSHIP_REQUEST_CANCELLED)
  async handleRequestCancelled(payload: Record<string, unknown>) {
    const event = payload as unknown as PartnershipRequestCancelledEvent;
    this.logger.log(
      `Handling partnership.request.cancelled for request ${event.requestId}`,
    );

    try {
      // Get all users from the supplier company
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.supplierId },
        select: { userId: true },
      });

      // Send notification to each supplier user
      for (const { userId } of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PARTNERSHIP_REQUEST_CANCELLED,
          priority: NotificationPriority.LOW,
          recipientId: userId,
          companyId: event.supplierId,
          title: 'Solicitação de Parceria Cancelada',
          body: `${event.brandName} cancelou a solicitação de parceria.`,
          data: {
            requestId: event.requestId,
            brandId: event.brandId,
            brandName: event.brandName,
          },
          actionUrl: `/portal/solicitacoes`,
          entityType: 'PartnershipRequest',
          entityId: event.requestId,
        });
      }

      this.logger.log(
        `Sent ${supplierUsers.length} notifications for cancelled partnership request ${event.requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling partnership.request.cancelled: ${error.message}`,
        error.stack,
      );
    }
  }
}
