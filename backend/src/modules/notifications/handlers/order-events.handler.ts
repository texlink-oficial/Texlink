import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
  ORDER_CREATED,
  ORDER_ACCEPTED,
  ORDER_REJECTED,
  ORDER_STATUS_CHANGED,
  ORDER_FINALIZED,
} from '../events/notification.events';
import type {
  OrderCreatedEvent,
  OrderAcceptedEvent,
  OrderRejectedEvent,
  OrderStatusChangedEvent,
} from '../events/notification.events';
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';

@Injectable()
export class OrderEventsHandler {
  private readonly logger = new Logger(OrderEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handle order created event
   * Notify target suppliers about the new order
   */
  @OnEvent(ORDER_CREATED)
  async handleOrderCreated(payload: Record<string, unknown>) {
    const event = payload as unknown as OrderCreatedEvent;
    this.logger.log(
      `Handling order.created event for order ${event.displayId}`,
    );

    try {
      // Get all target supplier user IDs
      const recipientIds: string[] = [];

      if (event.supplierId) {
        // Direct order - notify the assigned supplier
        const supplierUsers = await this.prisma.companyUser.findMany({
          where: { companyId: event.supplierId },
          select: { userId: true },
        });
        recipientIds.push(...supplierUsers.map((u) => u.userId));
      } else if (
        event.targetSupplierIds &&
        event.targetSupplierIds.length > 0
      ) {
        // Bidding/hybrid - notify all target suppliers
        const supplierUsers = await this.prisma.companyUser.findMany({
          where: { companyId: { in: event.targetSupplierIds } },
          select: { userId: true },
        });
        recipientIds.push(...supplierUsers.map((u) => u.userId));
      }

      // Send notifications (order created goes to suppliers, use /portal/ prefix)
      for (const recipientId of recipientIds) {
        await this.notificationsService.notify({
          type: NotificationType.ORDER_CREATED,
          priority: NotificationPriority.HIGH,
          recipientId,
          title: 'Novo Pedido Recebido',
          body: `${event.brandName} enviou um novo pedido: ${event.productName} (${event.quantity} peças)`,
          data: {
            orderId: event.orderId,
            displayId: event.displayId,
            brandName: event.brandName,
            productName: event.productName,
            quantity: event.quantity,
            deadline: event.deadline,
          },
          actionUrl: `/portal/pedidos/${event.orderId}`,
          entityType: 'order',
          entityId: event.orderId,
        });
      }

      this.logger.log(
        `Sent ${recipientIds.length} notifications for order ${event.displayId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling order.created: ${error.message}`);
    }
  }

  /**
   * Handle order accepted event
   * Notify the brand that the order was accepted
   */
  @OnEvent(ORDER_ACCEPTED)
  async handleOrderAccepted(payload: Record<string, unknown>) {
    const event = payload as unknown as OrderAcceptedEvent;
    this.logger.log(
      `Handling order.accepted event for order ${event.displayId}`,
    );

    try {
      // Get brand owner/admin users
      const brandUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.brandId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.ORDER_ACCEPTED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Pedido Aceito',
          body: `${event.supplierName} aceitou o pedido ${event.displayId}`,
          data: event,
          actionUrl: `/brand/pedidos/${event.orderId}`,
          entityType: 'order',
          entityId: event.orderId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling order.accepted: ${error.message}`);
    }
  }

  /**
   * Handle order rejected event
   * Notify the brand that the order was rejected
   */
  @OnEvent(ORDER_REJECTED)
  async handleOrderRejected(payload: Record<string, unknown>) {
    const event = payload as unknown as OrderRejectedEvent;
    this.logger.log(
      `Handling order.rejected event for order ${event.displayId}`,
    );

    try {
      const brandUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.brandId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.ORDER_REJECTED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Pedido Recusado',
          body: event.reason
            ? `Pedido ${event.displayId} foi recusado: ${event.reason}`
            : `Pedido ${event.displayId} foi recusado pela facção`,
          data: event,
          actionUrl: `/brand/pedidos/${event.orderId}`,
          entityType: 'order',
          entityId: event.orderId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling order.rejected: ${error.message}`);
    }
  }

  /**
   * Handle order status changed event
   * Notify both brand and supplier about the status change
   */
  @OnEvent(ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged(payload: Record<string, unknown>) {
    const event = payload as unknown as OrderStatusChangedEvent;
    this.logger.log(
      `Handling order.status.changed for order ${event.displayId}: ${event.previousStatus} -> ${event.newStatus}`,
    );

    try {
      // Get order details
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: {
          productName: true,
          brandId: true,
          supplierId: true,
        },
      });

      if (!order) return;

      const statusLabels: Record<string, string> = {
        ACEITO_PELA_FACCAO: 'Aceito pela Facção',
        EM_PRODUCAO: 'Em Produção',
        PRONTO: 'Pronto para Envio',
        FINALIZADO: 'Finalizado',
      };

      const statusLabel = statusLabels[event.newStatus] || event.newStatus;

      // Notify brand users (except the one who made the change)
      const brandUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: order.brandId,
          userId: { not: event.changedById },
        },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.ORDER_STATUS_CHANGED,
          recipientId: user.userId,
          companyId: order.brandId,
          title: 'Status do Pedido Atualizado',
          body: `Pedido ${event.displayId} (${order.productName}): ${statusLabel}`,
          data: {
            orderId: event.orderId,
            displayId: event.displayId,
            newStatus: event.newStatus,
            productName: order.productName,
          },
          actionUrl: `/brand/pedidos/${event.orderId}`,
          entityType: 'order',
          entityId: event.orderId,
        });
      }

      // Notify supplier users (except the one who made the change)
      if (order.supplierId) {
        const supplierUsers = await this.prisma.companyUser.findMany({
          where: {
            companyId: order.supplierId,
            userId: { not: event.changedById },
          },
          select: { userId: true },
        });

        for (const user of supplierUsers) {
          await this.notificationsService.notify({
            type: NotificationType.ORDER_STATUS_CHANGED,
            recipientId: user.userId,
            companyId: order.supplierId,
            title: 'Status do Pedido Atualizado',
            body: `Pedido ${event.displayId} (${order.productName}): ${statusLabel}`,
            data: {
              orderId: event.orderId,
              displayId: event.displayId,
              newStatus: event.newStatus,
              productName: order.productName,
            },
            actionUrl: `/portal/pedidos/${event.orderId}`,
            entityType: 'order',
            entityId: event.orderId,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling order.status.changed: ${error.message}`,
      );
    }
  }

  /**
   * Handle order finalized event
   */
  @OnEvent(ORDER_FINALIZED)
  async handleOrderFinalized(payload: Record<string, unknown>) {
    const event = payload as unknown as OrderStatusChangedEvent;
    this.logger.log(`Handling order.finalized for order ${event.displayId}`);

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: {
          productName: true,
          brandId: true,
          supplierId: true,
          brand: { select: { tradeName: true } },
          supplier: { select: { tradeName: true } },
        },
      });

      if (!order) return;

      // Notify both parties
      const allCompanyIds = [order.brandId, order.supplierId].filter(
        Boolean,
      ) as string[];
      const users = await this.prisma.companyUser.findMany({
        where: { companyId: { in: allCompanyIds } },
        select: { userId: true, companyId: true },
      });

      for (const user of users) {
        const actionUrl =
          user.companyId === order.brandId
            ? `/brand/pedidos/${event.orderId}`
            : `/portal/pedidos/${event.orderId}`;

        await this.notificationsService.notify({
          type: NotificationType.ORDER_FINALIZED,
          priority: NotificationPriority.NORMAL,
          recipientId: user.userId,
          companyId: user.companyId,
          title: 'Pedido Finalizado',
          body: `Pedido ${event.displayId} (${order.productName}) foi finalizado com sucesso`,
          actionUrl,
          entityType: 'order',
          entityId: event.orderId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling order.finalized: ${error.message}`);
    }
  }
}
