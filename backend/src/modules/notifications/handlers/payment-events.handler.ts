import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
  PAYMENT_REGISTERED,
  PAYMENT_RECEIVED,
  PAYMENT_OVERDUE,
} from '../events/notification.events';
import type {
  PaymentRegisteredEvent,
  PaymentReceivedEvent,
  PaymentOverdueEvent,
} from '../events/notification.events';
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';

@Injectable()
export class PaymentEventsHandler {
  private readonly logger = new Logger(PaymentEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handle payment registered event
   * Notify the supplier about the new payment
   */
  @OnEvent(PAYMENT_REGISTERED)
  async handlePaymentRegistered(payload: Record<string, unknown>) {
    const event = payload as unknown as PaymentRegisteredEvent;
    this.logger.log(
      `Handling payment.registered for order ${event.orderDisplayId}`,
    );

    try {
      // Notify supplier users
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.supplierId },
        select: { userId: true },
      });

      for (const user of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PAYMENT_REGISTERED,
          recipientId: user.userId,
          companyId: event.supplierId,
          title: 'Pagamento Registrado',
          body: `Pagamento de R$ ${event.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado para o pedido ${event.orderDisplayId}`,
          data: {
            paymentId: event.paymentId,
            orderId: event.orderId,
            displayId: event.orderDisplayId,
            amount: event.amount,
            dueDate: event.dueDate,
          },
          actionUrl: `/portal/pedidos/${event.orderId}`,
          entityType: 'payment',
          entityId: event.paymentId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling payment.registered: ${error.message}`);
    }
  }

  /**
   * Handle payment received event
   * Notify the supplier about the payment confirmation
   */
  @OnEvent(PAYMENT_RECEIVED)
  async handlePaymentReceived(payload: Record<string, unknown>) {
    const event = payload as unknown as PaymentReceivedEvent;
    this.logger.log(
      `Handling payment.received for order ${event.orderDisplayId}`,
    );

    try {
      // Notify supplier users
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.supplierId },
        select: { userId: true },
      });

      for (const user of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PAYMENT_RECEIVED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.supplierId,
          title: 'Pagamento Recebido',
          body: `Pagamento de R$ ${event.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} confirmado para o pedido ${event.orderDisplayId}`,
          data: {
            paymentId: event.paymentId,
            orderId: event.orderId,
            displayId: event.orderDisplayId,
            amount: event.amount,
          },
          actionUrl: `/portal/pedidos/${event.orderId}`,
          entityType: 'payment',
          entityId: event.paymentId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling payment.received: ${error.message}`);
    }
  }

  /**
   * Handle payment overdue event
   * Notify both brand and supplier about the overdue payment
   */
  @OnEvent(PAYMENT_OVERDUE)
  async handlePaymentOverdue(payload: Record<string, unknown>) {
    const event = payload as unknown as PaymentOverdueEvent;
    this.logger.log(
      `Handling payment.overdue for order ${event.orderDisplayId}`,
    );

    try {
      // Notify brand users
      const brandUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.brandId },
        select: { userId: true },
      });

      for (const user of brandUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PAYMENT_OVERDUE,
          priority: NotificationPriority.URGENT,
          recipientId: user.userId,
          companyId: event.brandId,
          title: 'Pagamento em Atraso',
          body: `Pagamento de R$ ${event.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para o pedido ${event.orderDisplayId} está ${event.daysOverdue} dias atrasado`,
          data: event,
          actionUrl: `/brand/pedidos/${event.orderId}`,
          entityType: 'payment',
          entityId: event.paymentId,
        });
      }

      // Notify supplier users
      const supplierUsers = await this.prisma.companyUser.findMany({
        where: { companyId: event.supplierId },
        select: { userId: true },
      });

      for (const user of supplierUsers) {
        await this.notificationsService.notify({
          type: NotificationType.PAYMENT_OVERDUE,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.supplierId,
          title: 'Pagamento Pendente',
          body: `Pagamento de R$ ${event.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} do pedido ${event.orderDisplayId} está ${event.daysOverdue} dias atrasado`,
          data: event,
          actionUrl: `/portal/pedidos/${event.orderId}`,
          entityType: 'payment',
          entityId: event.paymentId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling payment.overdue: ${error.message}`);
    }
  }
}
