import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationService } from '../integrations/services/integration.service';
import {
  NotificationDispatcherService,
  DispatchNotificationPayload,
} from './services/notification-dispatcher.service';
import {
  NotificationType,
  NotificationPriority,
  GetNotificationsQueryDto,
} from './dto/notification.dto';

export interface NotificationPayload {
  to: string;
  subject?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface CredentialNotificationData {
  brandName: string;
  supplierName: string;
  contactName: string;
  contactEmail: string;
  status: string;
  cnpj: string;
}

/**
 * NotificationsService
 *
 * Main service for notification operations:
 * - CRUD operations for notifications
 * - High-level notification methods for different domains
 * - Integrates with NotificationDispatcherService for multi-channel delivery
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
    private readonly dispatcher: NotificationDispatcherService,
  ) { }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, query: GetNotificationsQueryDto, companyId?: string | null) {
    const limit = Math.min(query.limit || 20, 50);

    const where: any = {
      recipientId: userId,
    };

    // Filter by company context to enforce tenant isolation
    if (companyId) {
      where.companyId = companyId;
    }

    if (query.unreadOnly) {
      where.read = false;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.cursor) {
      where.createdAt = { lt: new Date(query.cursor) };
    }

    const unreadWhere: any = { recipientId: userId, read: false };
    if (companyId) {
      unreadWhere.companyId = companyId;
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.notification.count({
        where: unreadWhere,
      }),
    ]);

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : undefined;

    return {
      notifications: items,
      hasMore,
      nextCursor,
      unreadCount,
    };
  }

  /**
   * Get a single notification
   */
  async getNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return notification;
  }

  /**
   * Mark notification(s) as read
   */
  async markAsRead(
    userId: string,
    options: {
      notificationId?: string;
      notificationIds?: string[];
      markAll?: boolean;
    },
    companyId?: string | null,
  ) {
    const now = new Date();

    if (options.markAll) {
      const where: any = { recipientId: userId, read: false };
      if (companyId) {
        where.companyId = companyId;
      }
      const result = await this.prisma.notification.updateMany({
        where,
        data: { read: true, readAt: now },
      });
      return { updatedCount: result.count };
    }

    if (options.notificationIds && options.notificationIds.length > 0) {
      const result = await this.prisma.notification.updateMany({
        where: {
          id: { in: options.notificationIds },
          recipientId: userId,
          read: false,
        },
        data: { read: true, readAt: now },
      });
      return { updatedCount: result.count };
    }

    if (options.notificationId) {
      const result = await this.prisma.notification.updateMany({
        where: {
          id: options.notificationId,
          recipientId: userId,
          read: false,
        },
        data: { read: true, readAt: now },
      });
      return { updatedCount: result.count };
    }

    return { updatedCount: 0 };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string, companyId?: string | null): Promise<number> {
    const where: any = { recipientId: userId, read: false };
    if (companyId) {
      where.companyId = companyId;
    }
    return this.prisma.notification.count({ where });
  }

  /**
   * Delete old notifications (for cleanup jobs)
   */
  async deleteOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${result.count} old notifications`);
    return result.count;
  }

  // ==================== DISPATCH METHODS ====================

  /**
   * Create and dispatch a notification
   */
  async notify(payload: DispatchNotificationPayload) {
    return this.dispatcher.dispatch(payload);
  }

  /**
   * Notify multiple users
   */
  async notifyMany(
    recipientIds: string[],
    payload: Omit<DispatchNotificationPayload, 'recipientId'>,
  ) {
    return this.dispatcher.dispatchBulk(recipientIds, payload);
  }

  // ==================== DOMAIN-SPECIFIC NOTIFICATIONS ====================

  /**
   * Notify about new order
   */
  async notifyOrderCreated(
    recipientId: string,
    data: {
      orderId: string;
      displayId: string;
      brandName: string;
      productName: string;
      quantity: number;
      deadline: Date;
    },
  ) {
    return this.notify({
      type: NotificationType.ORDER_CREATED,
      priority: NotificationPriority.HIGH,
      recipientId,
      title: 'Novo Pedido Recebido',
      body: `${data.brandName} enviou um novo pedido: ${data.productName} (${data.quantity} peças)`,
      data,
      actionUrl: `/pedidos/${data.orderId}`,
      entityType: 'order',
      entityId: data.orderId,
    });
  }

  /**
   * Notify about order status change
   */
  async notifyOrderStatusChanged(
    recipientId: string,
    data: {
      orderId: string;
      displayId: string;
      newStatus: string;
      productName: string;
    },
  ) {
    const statusLabels: Record<string, string> = {
      ACEITO_PELA_FACCAO: 'Aceito pela Facção',
      EM_PRODUCAO: 'Em Produção',
      PRONTO: 'Pronto para Envio',
      FINALIZADO: 'Finalizado',
    };

    return this.notify({
      type: NotificationType.ORDER_STATUS_CHANGED,
      recipientId,
      title: 'Status do Pedido Atualizado',
      body: `Pedido ${data.displayId} (${data.productName}): ${statusLabels[data.newStatus] || data.newStatus}`,
      data,
      actionUrl: `/pedidos/${data.orderId}`,
      entityType: 'order',
      entityId: data.orderId,
    });
  }

  /**
   * Notify about order deadline approaching
   */
  async notifyDeadlineApproaching(
    recipientId: string,
    data: {
      orderId: string;
      displayId: string;
      productName: string;
      deadline: Date;
      hoursRemaining: number;
    },
  ) {
    const priority =
      data.hoursRemaining <= 24
        ? NotificationPriority.URGENT
        : NotificationPriority.HIGH;

    return this.notify({
      type: NotificationType.ORDER_DEADLINE_APPROACHING,
      priority,
      recipientId,
      title: 'Prazo de Entrega Próximo',
      body: `Pedido ${data.displayId} vence em ${data.hoursRemaining}h. Produto: ${data.productName}`,
      data,
      actionUrl: `/pedidos/${data.orderId}`,
      entityType: 'order',
      entityId: data.orderId,
    });
  }

  /**
   * Notify about new message
   */
  async notifyNewMessage(
    recipientId: string,
    data: {
      orderId: string;
      senderName: string;
      messagePreview: string;
    },
  ) {
    return this.notify({
      type: NotificationType.MESSAGE_RECEIVED,
      recipientId,
      title: 'Nova Mensagem',
      body: `${data.senderName}: ${data.messagePreview.substring(0, 100)}${data.messagePreview.length > 100 ? '...' : ''}`,
      data,
      actionUrl: `/pedidos/${data.orderId}/chat`,
      entityType: 'order',
      entityId: data.orderId,
      skipEmail: true, // Chat messages don't need email
    });
  }

  /**
   * Notify about proposal received
   */
  async notifyProposalReceived(
    recipientId: string,
    data: {
      orderId: string;
      displayId: string;
      senderName: string;
      proposedPrice?: number;
      proposedDeadline?: string;
    },
  ) {
    let body = `${data.senderName} enviou uma proposta para o pedido ${data.displayId}`;
    if (data.proposedPrice) {
      body += `: R$ ${data.proposedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    return this.notify({
      type: NotificationType.ORDER_PROPOSAL_RECEIVED,
      priority: NotificationPriority.HIGH,
      recipientId,
      title: 'Nova Proposta Recebida',
      body,
      data,
      actionUrl: `/pedidos/${data.orderId}/chat`,
      entityType: 'order',
      entityId: data.orderId,
    });
  }

  /**
   * Notify about payment registered
   */
  async notifyPaymentRegistered(
    recipientId: string,
    data: {
      paymentId: string;
      orderId: string;
      displayId: string;
      amount: number;
      dueDate: Date;
    },
  ) {
    return this.notify({
      type: NotificationType.PAYMENT_REGISTERED,
      recipientId,
      title: 'Pagamento Registrado',
      body: `Pagamento de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado para o pedido ${data.displayId}`,
      data,
      actionUrl: `/pedidos/${data.orderId}`,
      entityType: 'payment',
      entityId: data.paymentId,
    });
  }

  /**
   * Notify about payment received
   */
  async notifyPaymentReceived(
    recipientId: string,
    data: {
      paymentId: string;
      orderId: string;
      displayId: string;
      amount: number;
    },
  ) {
    return this.notify({
      type: NotificationType.PAYMENT_RECEIVED,
      priority: NotificationPriority.HIGH,
      recipientId,
      title: 'Pagamento Recebido',
      body: `Pagamento de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} confirmado para o pedido ${data.displayId}`,
      data,
      actionUrl: `/pedidos/${data.orderId}`,
      entityType: 'payment',
      entityId: data.paymentId,
    });
  }

  /**
   * Notify about document expiring
   */
  async notifyDocumentExpiring(
    recipientId: string,
    data: {
      documentId: string;
      documentName: string;
      documentType: string;
      daysRemaining: number;
    },
  ) {
    const priority =
      data.daysRemaining <= 7
        ? NotificationPriority.URGENT
        : NotificationPriority.HIGH;

    return this.notify({
      type: NotificationType.DOCUMENT_EXPIRING,
      priority,
      recipientId,
      title: 'Documento Próximo do Vencimento',
      body: `O documento "${data.documentName}" vence em ${data.daysRemaining} dias`,
      data,
      actionUrl: '/documentos',
      entityType: 'document',
      entityId: data.documentId,
    });
  }

  /**
   * Notify about ticket update
   */
  async notifyTicketUpdate(
    recipientId: string,
    data: {
      ticketId: string;
      displayId: string;
      title: string;
      type: 'created' | 'message' | 'status_changed';
      newStatus?: string;
      senderName?: string;
      actionUrl?: string;
    },
  ) {
    let notificationType: NotificationType;
    let notificationTitle: string;
    let body: string;

    switch (data.type) {
      case 'created':
        notificationType = NotificationType.TICKET_CREATED;
        notificationTitle = 'Novo Ticket de Suporte';
        body = `Ticket ${data.displayId} criado: ${data.title}`;
        break;
      case 'message':
        notificationType = NotificationType.TICKET_MESSAGE_ADDED;
        notificationTitle = 'Nova Mensagem no Ticket';
        body = `${data.senderName || 'Suporte'} respondeu ao ticket ${data.displayId}`;
        break;
      case 'status_changed':
        notificationType = NotificationType.TICKET_STATUS_CHANGED;
        notificationTitle = 'Status do Ticket Atualizado';
        body = `Ticket ${data.displayId}: ${data.newStatus}`;
        break;
    }

    return this.notify({
      type: notificationType,
      recipientId,
      title: notificationTitle,
      body,
      data,
      actionUrl: data.actionUrl || `/suporte/${data.ticketId}`,
      entityType: 'ticket',
      entityId: data.ticketId,
    });
  }

  /**
   * Send system announcement to all users of a role
   */
  async sendSystemAnnouncement(
    title: string,
    body: string,
    options: {
      targetRole?: 'BRAND' | 'SUPPLIER' | 'ADMIN';
      priority?: NotificationPriority;
      actionUrl?: string;
    } = {},
  ) {
    const where: any = { isActive: true };
    if (options.targetRole) {
      where.role = options.targetRole;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    const recipientIds = users.map((u) => u.id);

    return this.notifyMany(recipientIds, {
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      priority: options.priority || NotificationPriority.NORMAL,
      title,
      body,
      actionUrl: options.actionUrl,
    });
  }

  // ==================== LEGACY CREDENTIAL NOTIFICATIONS ====================
  // (Kept for backward compatibility)

  async notifyBrandValidationComplete(
    credentialId: string,
    validationSuccess: boolean,
  ) {
    try {
      const credential = await this.prisma.supplierCredential.findUnique({
        where: { id: credentialId },
        include: {
          brand: {
            select: {
              id: true,
              tradeName: true,
              email: true,
              companyUsers: {
                where: { role: 'OWNER' },
                select: { userId: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!credential || !credential.brand.companyUsers[0]) {
        return;
      }

      const recipientId = credential.brand.companyUsers[0].userId;

      return this.notify({
        type: NotificationType.CREDENTIAL_STATUS_CHANGED,
        priority: validationSuccess
          ? NotificationPriority.NORMAL
          : NotificationPriority.HIGH,
        recipientId,
        companyId: credential.brandId,
        title: validationSuccess
          ? 'Validação de CNPJ Concluída'
          : 'Validação de CNPJ Falhou',
        body: validationSuccess
          ? `A validação do CNPJ de ${credential.tradeName || 'Facção'} foi concluída com sucesso.`
          : `A validação do CNPJ de ${credential.tradeName || 'Facção'} falhou. Verifique os dados.`,
        entityType: 'credential',
        entityId: credentialId,
        actionUrl: `/credenciamento/${credentialId}`,
      });
    } catch (error) {
      this.logger.error(
        `Error notifying validation complete: ${error.message}`,
      );
    }
  }

  async notifyBrandOnboardingStarted(credentialId: string) {
    try {
      const credential = await this.prisma.supplierCredential.findUnique({
        where: { id: credentialId },
        include: {
          brand: {
            select: {
              id: true,
              tradeName: true,
              companyUsers: {
                where: { role: 'OWNER' },
                select: { userId: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!credential || !credential.brand.companyUsers[0]) {
        return;
      }

      const recipientId = credential.brand.companyUsers[0].userId;

      return this.notify({
        type: NotificationType.CREDENTIAL_STATUS_CHANGED,
        priority: NotificationPriority.HIGH,
        recipientId,
        companyId: credential.brandId,
        title: 'Facção Iniciou Credenciamento',
        body: `${credential.tradeName || 'Facção'} aceitou o convite e iniciou o processo de credenciamento.`,
        entityType: 'credential',
        entityId: credentialId,
        actionUrl: `/credenciamento/${credentialId}`,
      });
    } catch (error) {
      this.logger.error(`Error notifying onboarding started: ${error.message}`);
    }
  }

  async notifyBrandComplianceApproved(credentialId: string) {
    try {
      const credential = await this.prisma.supplierCredential.findUnique({
        where: { id: credentialId },
        include: {
          brand: {
            select: {
              id: true,
              companyUsers: {
                where: { role: 'OWNER' },
                select: { userId: true },
                take: 1,
              },
            },
          },
          compliance: true,
        },
      });

      if (!credential || !credential.brand.companyUsers[0]) {
        return;
      }

      const recipientId = credential.brand.companyUsers[0].userId;

      return this.notify({
        type: NotificationType.CREDENTIAL_STATUS_CHANGED,
        recipientId,
        companyId: credential.brandId,
        title: 'Análise de Compliance Aprovada',
        body: `A análise de compliance de ${credential.tradeName || 'Facção'} foi aprovada. Risco: ${credential.compliance?.riskLevel || 'MEDIUM'}`,
        entityType: 'credential',
        entityId: credentialId,
        actionUrl: `/credenciamento/${credentialId}`,
      });
    } catch (error) {
      this.logger.error(
        `Error notifying compliance approved: ${error.message}`,
      );
    }
  }

  async notifySupplierInvited(credentialId: string, invitationLink: string) {
    // This is typically handled by the invitation email service
    // Keeping for backward compatibility
    this.logger.log(`Supplier invited for credential ${credentialId}`);
  }

  // ==================== HELPERS ====================

  private formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;

    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }
}
