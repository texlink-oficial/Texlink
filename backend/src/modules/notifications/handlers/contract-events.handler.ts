import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
  CONTRACT_CREATED,
  CONTRACT_SENT_FOR_SIGNATURE,
  CONTRACT_REVISION_REQUESTED,
  CONTRACT_REVISION_RESPONDED,
  CONTRACT_SIGNED,
  CONTRACT_FULLY_SIGNED,
  CONTRACT_EXPIRING,
  CONTRACT_EXPIRED,
  CONTRACT_CANCELLED,
} from '../events/notification.events';
import type {
  ContractCreatedEvent,
  ContractSentForSignatureEvent,
  ContractRevisionRequestedEvent,
  ContractRevisionRespondedEvent,
  ContractSignedEvent,
  ContractFullySignedEvent,
  ContractExpiringEvent,
  ContractExpiredEvent,
  ContractCancelledEvent,
} from '../events/notification.events';
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';

@Injectable()
export class ContractEventsHandler {
  private readonly logger = new Logger(ContractEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handle contract created event
   * Notify brand users about new contract
   */
  @OnEvent(CONTRACT_CREATED)
  async handleContractCreated(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractCreatedEvent;
    this.logger.log(
      `Handling contract.created event for contract ${event.displayId}`,
    );

    try {
      // Notify brand users (except creator)
      const brandUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.brandId,
          userId: { not: event.createdById },
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_CREATED,
          priority: NotificationPriority.NORMAL,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Novo Contrato Criado',
          body: `Contrato ${event.displayId} foi criado para ${event.supplierName}`,
          data: event,
          actionUrl: `/brand/contratos/${event.contractId}`,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }

      this.logger.log(
        `Sent ${brandUsers.length} notifications for contract ${event.displayId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling contract.created: ${error.message}`);
    }
  }

  /**
   * Handle contract sent for signature event
   * Notify supplier about contract awaiting signature
   */
  @OnEvent(CONTRACT_SENT_FOR_SIGNATURE)
  async handleContractSentForSignature(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractSentForSignatureEvent;
    this.logger.log(
      `Handling contract.sent.for.signature for contract ${event.displayId}`,
    );

    try {
      // Notify supplier users
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.supplierId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      for (const user of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_SENT_FOR_SIGNATURE,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.supplierId,
          title: 'Contrato para Assinatura',
          body: event.message
            ? `${event.brandName} enviou um contrato para assinatura: "${event.message}"`
            : `${event.brandName} enviou um contrato (${event.displayId}) para sua assinatura`,
          data: event,
          actionUrl: `/portal/contratos/${event.contractId}`,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }

      this.logger.log(
        `Sent ${supplierUsers.length} notifications for contract signature ${event.displayId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling contract.sent.for.signature: ${error.message}`,
      );
    }
  }

  /**
   * Handle contract revision requested event
   * Notify brand about supplier's revision request
   */
  @OnEvent(CONTRACT_REVISION_REQUESTED)
  async handleRevisionRequested(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractRevisionRequestedEvent;
    this.logger.log(
      `Handling contract.revision.requested for contract ${event.displayId}`,
    );

    try {
      // Notify brand users
      const brandUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.brandId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_REVISION_REQUESTED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Revisão de Contrato Solicitada',
          body: `${event.supplierName} solicitou alterações no contrato ${event.displayId}`,
          data: event,
          actionUrl: `/brand/contratos/${event.contractId}`,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling contract.revision.requested: ${error.message}`,
      );
    }
  }

  /**
   * Handle contract revision responded event
   * Notify supplier about brand's response
   */
  @OnEvent(CONTRACT_REVISION_RESPONDED)
  async handleRevisionResponded(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractRevisionRespondedEvent;
    this.logger.log(
      `Handling contract.revision.responded for contract ${event.displayId}`,
    );

    try {
      // Notify supplier users
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.supplierId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      const statusText = event.status === 'ACCEPTED' ? 'aceita' : 'recusada';

      for (const user of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_REVISION_RESPONDED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.supplierId,
          title: `Revisão de Contrato ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
          body: event.responseNotes
            ? `Sua solicitação de revisão foi ${statusText}: "${event.responseNotes}"`
            : `Sua solicitação de revisão para o contrato ${event.displayId} foi ${statusText}`,
          data: event,
          actionUrl: `/portal/contratos/${event.contractId}`,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling contract.revision.responded: ${error.message}`,
      );
    }
  }

  /**
   * Handle contract signed event
   * Notify the other party about signature
   */
  @OnEvent(CONTRACT_SIGNED)
  async handleContractSigned(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractSignedEvent;
    this.logger.log(
      `Handling contract.signed for contract ${event.displayId} by ${event.signedBy}`,
    );

    try {
      const notifyCompanyId =
        event.signedBy === 'BRAND' ? event.supplierId : event.brandId;

      const signerCompanyName =
        event.signedBy === 'BRAND' ? event.brandName : event.supplierName;

      const users = await this.prisma.companyUser.findMany({
        where: {
          companyId: notifyCompanyId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      const actionUrl =
        event.signedBy === 'BRAND'
          ? `/portal/contratos/${event.contractId}`
          : `/brand/contratos/${event.contractId}`;

      for (const user of users) {
        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_SIGNED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: notifyCompanyId,
          title: 'Contrato Assinado',
          body: `${signerCompanyName} assinou o contrato ${event.displayId}`,
          data: event,
          actionUrl,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling contract.signed: ${error.message}`);
    }
  }

  /**
   * Handle contract fully signed event
   * Notify both parties that contract is now active
   */
  @OnEvent(CONTRACT_FULLY_SIGNED)
  async handleContractFullySigned(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractFullySignedEvent;
    this.logger.log(
      `Handling contract.fully.signed for contract ${event.displayId}`,
    );

    try {
      // Notify both brand and supplier
      const allUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: { in: [event.brandId, event.supplierId] },
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true, companyId: true },
      });

      for (const user of allUsers) {
        const actionUrl =
          user.companyId === event.brandId
            ? `/brand/contratos/${event.contractId}`
            : `/portal/contratos/${event.contractId}`;

        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_FULLY_SIGNED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: user.companyId,
          title: 'Contrato Ativo',
          body: `O contrato ${event.displayId} foi assinado por ambas as partes e está agora ativo`,
          data: event,
          actionUrl,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling contract.fully.signed: ${error.message}`,
      );
    }
  }

  /**
   * Handle contract expiring event
   * Notify both parties about upcoming expiration
   */
  @OnEvent(CONTRACT_EXPIRING)
  async handleContractExpiring(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractExpiringEvent;
    this.logger.log(
      `Handling contract.expiring for contract ${event.displayId} (${event.daysRemaining} days)`,
    );

    try {
      // Notify both brand and supplier
      const allUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: { in: [event.brandId, event.supplierId] },
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true, companyId: true },
      });

      for (const user of allUsers) {
        const actionUrl =
          user.companyId === event.brandId
            ? `/brand/contratos/${event.contractId}`
            : `/portal/contratos/${event.contractId}`;

        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_EXPIRING,
          priority:
            event.daysRemaining <= 7
              ? NotificationPriority.URGENT
              : NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: user.companyId,
          title: 'Contrato Vencendo',
          body: `O contrato ${event.displayId} vence em ${event.daysRemaining} dias`,
          data: event,
          actionUrl,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling contract.expiring: ${error.message}`);
    }
  }

  /**
   * Handle contract expired event
   * Notify both parties about expiration
   */
  @OnEvent(CONTRACT_EXPIRED)
  async handleContractExpired(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractExpiredEvent;
    this.logger.log(
      `Handling contract.expired for contract ${event.displayId}`,
    );

    try {
      // Notify both brand and supplier
      const allUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: { in: [event.brandId, event.supplierId] },
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true, companyId: true },
      });

      for (const user of allUsers) {
        const actionUrl =
          user.companyId === event.brandId
            ? `/brand/contratos/${event.contractId}`
            : `/portal/contratos/${event.contractId}`;

        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_EXPIRED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: user.companyId,
          title: 'Contrato Expirado',
          body: `O contrato ${event.displayId} expirou e não está mais ativo`,
          data: event,
          actionUrl,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling contract.expired: ${error.message}`);
    }
  }

  /**
   * Handle contract cancelled event
   * Notify supplier about cancellation
   */
  @OnEvent(CONTRACT_CANCELLED)
  async handleContractCancelled(payload: Record<string, unknown>) {
    const event = payload as unknown as ContractCancelledEvent;
    this.logger.log(
      `Handling contract.cancelled for contract ${event.displayId}`,
    );

    try {
      // Notify supplier users
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.supplierId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      for (const user of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.CONTRACT_CANCELLED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.supplierId,
          title: 'Contrato Cancelado',
          body: event.reason
            ? `O contrato ${event.displayId} foi cancelado: "${event.reason}"`
            : `O contrato ${event.displayId} com ${event.brandName} foi cancelado`,
          data: event,
          actionUrl: `/portal/contratos/${event.contractId}`,
          entityType: 'contract',
          entityId: event.contractId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling contract.cancelled: ${error.message}`);
    }
  }
}
