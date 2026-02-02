import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
    DOCUMENT_EXPIRING,
    DOCUMENT_EXPIRED,
} from '../events/notification.events';
import type {
    DocumentExpiringEvent,
    DocumentExpiredEvent,
} from '../events/notification.events';
import { NotificationType, NotificationPriority } from '../dto/notification.dto';

@Injectable()
export class DocumentEventsHandler {
    private readonly logger = new Logger(DocumentEventsHandler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Handle document expiring event
     * Notify supplier users about the expiring document
     */
    @OnEvent(DOCUMENT_EXPIRING)
    async handleDocumentExpiring(payload: Record<string, unknown>) {
        const event = payload as unknown as DocumentExpiringEvent;
        this.logger.log(`Handling document.expiring for document ${event.documentId}`);

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
        this.logger.log(`Handling document.expired for document ${event.documentId}`);

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
                    actionUrl: '/documentos',
                    entityType: 'document',
                    entityId: event.documentId,
                });
            }
        } catch (error) {
            this.logger.error(`Error handling document.expired: ${error.message}`);
        }
    }
}
