import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
  DOCUMENT_EXPIRING,
  DOCUMENT_EXPIRED,
  DOCUMENT_SHARING_CONSENT_REVOKED,
  SUPPLIER_DOCUMENT_EXPIRING_FOR_BRAND,
  SUPPLIER_DOCUMENT_UPDATED,
} from '../events/notification.events';
import type {
  DocumentExpiringEvent,
  DocumentExpiredEvent,
  DocumentSharingConsentRevokedEvent,
  SupplierDocumentExpiringForBrandEvent,
  SupplierDocumentUpdatedEvent,
} from '../events/notification.events';
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';
import { RelationshipStatus } from '@prisma/client';

@Injectable()
export class DocumentEventsHandler {
  private readonly logger = new Logger(DocumentEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handle document expiring event
   * Notify supplier users about the expiring document
   */
  @OnEvent(DOCUMENT_EXPIRING)
  async handleDocumentExpiring(payload: Record<string, unknown>) {
    const event = payload as unknown as DocumentExpiringEvent;
    this.logger.log(
      `Handling document.expiring for document ${event.documentId}`,
    );

    try {
      // Get company users
      const companyUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.companyId },
        select: { userId: true },
      });

      for (const user of companyUsers) {
        await this.notificationsService.notifyDocumentExpiring(user.userId, {
          documentId: event.documentId,
          documentName: event.documentName,
          documentType: event.documentType,
          daysRemaining: event.daysRemaining,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling document.expiring: ${error.message}`);
    }
  }

  /**
   * Handle document expired event
   * Notify supplier users about the expired document
   */
  @OnEvent(DOCUMENT_EXPIRED)
  async handleDocumentExpired(payload: Record<string, unknown>) {
    const event = payload as unknown as DocumentExpiredEvent;
    this.logger.log(
      `Handling document.expired for document ${event.documentId}`,
    );

    try {
      // Get company users
      const companyUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.companyId },
        select: { userId: true },
      });

      for (const user of companyUsers) {
        await this.notificationsService.notify({
          type: NotificationType.DOCUMENT_EXPIRED,
          priority: NotificationPriority.URGENT,
          recipientId: user.userId,
          companyId: event.companyId,
          title: 'Documento Vencido',
          body: `O documento "${event.documentName}" está vencido. Atualize-o o mais rápido possível.`,
          data: event,
          actionUrl: '/portal/documentos',
          entityType: 'document',
          entityId: event.documentId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling document.expired: ${error.message}`);
    }
  }

  /**
   * Handle consent revoked event
   * Notify brand users that the supplier has revoked document sharing consent
   */
  @OnEvent(DOCUMENT_SHARING_CONSENT_REVOKED)
  async handleConsentRevoked(payload: Record<string, unknown>) {
    const event = payload as unknown as DocumentSharingConsentRevokedEvent;
    this.logger.log(
      `Handling document.sharing.consent.revoked for relationship ${event.relationshipId}`,
    );

    try {
      // Get brand company users
      const brandUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.brandId },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.DOCUMENT_SHARING_CONSENT_REVOKED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Consentimento de Documentos Revogado',
          body: `O fornecedor "${event.supplierName}" revogou o consentimento de compartilhamento de documentos. O relacionamento foi encerrado.`,
          data: {
            relationshipId: event.relationshipId,
            supplierId: event.supplierId,
            supplierName: event.supplierName,
            reason: event.reason,
          },
          actionUrl: `/brand/fornecedores/${event.supplierId}`,
          entityType: 'relationship',
          entityId: event.relationshipId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling document.sharing.consent.revoked: ${error.message}`);
    }
  }

  /**
   * Handle supplier document expiring for brand
   * Notify brand users about expiring documents of suppliers with active consent
   */
  @OnEvent(SUPPLIER_DOCUMENT_EXPIRING_FOR_BRAND)
  async handleSupplierDocumentExpiringForBrand(payload: Record<string, unknown>) {
    const event = payload as unknown as SupplierDocumentExpiringForBrandEvent;
    this.logger.log(
      `Handling supplier.document.expiring.for.brand for document ${event.documentId}`,
    );

    try {
      // Get brand company users
      const brandUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.brandId },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.SUPPLIER_DOCUMENT_EXPIRING_FOR_BRAND,
          priority: NotificationPriority.NORMAL,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Documento de Fornecedor Expirando',
          body: `O documento "${event.documentName}" do fornecedor "${event.supplierName}" expira em ${event.daysRemaining} dias.`,
          data: {
            documentId: event.documentId,
            supplierId: event.supplierId,
            supplierName: event.supplierName,
            documentType: event.documentType,
            daysRemaining: event.daysRemaining,
          },
          actionUrl: `/brand/fornecedores/${event.supplierId}/documentos`,
          entityType: 'supplier_document',
          entityId: event.documentId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling supplier.document.expiring.for.brand: ${error.message}`);
    }
  }

  /**
   * Handle supplier document updated
   * Notify brand users about updated documents of suppliers with active consent
   */
  @OnEvent(SUPPLIER_DOCUMENT_UPDATED)
  async handleSupplierDocumentUpdated(payload: Record<string, unknown>) {
    const event = payload as unknown as SupplierDocumentUpdatedEvent;
    this.logger.log(
      `Handling supplier.document.updated for document ${event.documentId}`,
    );

    try {
      // Get all brands with active relationship and consent for this supplier
      const relationships = await this.prisma.supplierBrandRelationship.findMany({
        where: {
          supplierId: event.supplierId,
          status: RelationshipStatus.ACTIVE,
          documentSharingConsent: true,
        },
        select: { brandId: true },
      });

      for (const relationship of relationships) {
        // Get brand company users
        const brandUsers = await this.prisma.companyUser.findMany({
          where: { companyId: relationship.brandId },
          select: { userId: true },
        });

        const actionText = event.action === 'uploaded' ? 'enviou' : 'atualizou';

        for (const user of brandUsers) {
          await this.notificationsService.notify({
            type: NotificationType.SUPPLIER_DOCUMENT_UPDATED,
            priority: NotificationPriority.LOW,
            recipientId: user.userId,
            companyId: relationship.brandId,
            title: 'Documento de Fornecedor Atualizado',
            body: `O fornecedor "${event.supplierName}" ${actionText} o documento "${event.documentName}".`,
            data: {
              documentId: event.documentId,
              supplierId: event.supplierId,
              supplierName: event.supplierName,
              documentType: event.documentType,
              action: event.action,
            },
            actionUrl: `/brand/fornecedores/${event.supplierId}/documentos`,
            entityType: 'supplier_document',
            entityId: event.documentId,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling supplier.document.updated: ${error.message}`);
    }
  }
}
