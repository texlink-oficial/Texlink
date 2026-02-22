import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../../config/bull.config';
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';

/**
 * Bull processor for notification-related jobs
 *
 * Handles:
 * - Deadline reminders (48h and 24h)
 * - Document expiration checks
 * - Payment overdue checks
 * - Notification cleanup
 */
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Process 48-hour deadline reminder
   */
  @Process(JOB_NAMES.DEADLINE_48H)
  async handleDeadline48h(job: Job<{ orderId?: string }>) {
    this.logger.log('Processing 48h deadline reminder job');

    try {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const whereClause: any = {
        deliveryDeadline: {
          gte: now,
          lte: in48Hours,
        },
        status: {
          in: [
            'ACEITO_PELA_FACCAO',
            'EM_PRODUCAO',
            'EM_PREPARACAO_ENTRADA_FACCAO',
          ],
        },
      };

      // If specific order ID provided, only process that order
      if (job.data.orderId) {
        whereClause.id = job.data.orderId;
      }

      const orders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          displayId: true,
          productName: true,
          deliveryDeadline: true,
          brandId: true,
          supplierId: true,
        },
      });

      this.logger.log(`Found ${orders.length} orders with deadline in 48h`);

      for (const order of orders) {
        const hoursRemaining = Math.ceil(
          (order.deliveryDeadline.getTime() - now.getTime()) / (60 * 60 * 1000),
        );

        const priority =
          hoursRemaining <= 24
            ? NotificationPriority.URGENT
            : NotificationPriority.HIGH;

        const notifData = {
          orderId: order.id,
          displayId: order.displayId,
          productName: order.productName,
          deadline: order.deliveryDeadline,
          hoursRemaining,
        };

        // Notify brand users
        const brandUsers = await this.prisma.companyUser.findMany({
          where: { companyId: order.brandId },
          select: { userId: true },
        });

        for (const user of brandUsers) {
          await this.notificationsService.notify({
            type: NotificationType.ORDER_DEADLINE_APPROACHING,
            priority,
            recipientId: user.userId,
            companyId: order.brandId,
            title: 'Prazo de Entrega Próximo',
            body: `Pedido ${order.displayId} vence em ${hoursRemaining}h. Produto: ${order.productName}`,
            data: notifData,
            actionUrl: `/brand/pedidos/${order.id}`,
            entityType: 'order',
            entityId: order.id,
          });
        }

        // Notify supplier users
        if (order.supplierId) {
          const supplierUsers = await this.prisma.companyUser.findMany({
            where: { companyId: order.supplierId },
            select: { userId: true },
          });

          for (const user of supplierUsers) {
            await this.notificationsService.notify({
              type: NotificationType.ORDER_DEADLINE_APPROACHING,
              priority,
              recipientId: user.userId,
              companyId: order.supplierId,
              title: 'Prazo de Entrega Próximo',
              body: `Pedido ${order.displayId} vence em ${hoursRemaining}h. Produto: ${order.productName}`,
              data: notifData,
              actionUrl: `/portal/pedidos/${order.id}`,
              entityType: 'order',
              entityId: order.id,
            });
          }
        }
      }

      return { processed: orders.length };
    } catch (error) {
      this.logger.error(`Error in 48h deadline job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process 24-hour deadline reminder
   */
  @Process(JOB_NAMES.DEADLINE_24H)
  async handleDeadline24h(job: Job<{ orderId?: string }>) {
    this.logger.log('Processing 24h deadline reminder job');

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const whereClause: any = {
        deliveryDeadline: {
          gte: now,
          lte: in24Hours,
        },
        status: {
          in: [
            'ACEITO_PELA_FACCAO',
            'EM_PRODUCAO',
            'EM_PREPARACAO_ENTRADA_FACCAO',
          ],
        },
      };

      if (job.data.orderId) {
        whereClause.id = job.data.orderId;
      }

      const orders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          displayId: true,
          productName: true,
          deliveryDeadline: true,
          brandId: true,
          supplierId: true,
        },
      });

      this.logger.log(`Found ${orders.length} orders with deadline in 24h`);

      for (const order of orders) {
        const hoursRemaining = Math.ceil(
          (order.deliveryDeadline.getTime() - now.getTime()) / (60 * 60 * 1000),
        );

        const priority =
          hoursRemaining <= 24
            ? NotificationPriority.URGENT
            : NotificationPriority.HIGH;

        const notifData = {
          orderId: order.id,
          displayId: order.displayId,
          productName: order.productName,
          deadline: order.deliveryDeadline,
          hoursRemaining,
        };

        const companyIds = [order.brandId, order.supplierId].filter(
          Boolean,
        ) as string[];
        const users = await this.prisma.companyUser.findMany({
          where: { companyId: { in: companyIds } },
          select: { userId: true, companyId: true },
        });

        for (const user of users) {
          const actionUrl =
            user.companyId === order.brandId
              ? `/brand/pedidos/${order.id}`
              : `/portal/pedidos/${order.id}`;

          await this.notificationsService.notify({
            type: NotificationType.ORDER_DEADLINE_APPROACHING,
            priority,
            recipientId: user.userId,
            companyId: user.companyId,
            title: 'Prazo de Entrega Próximo',
            body: `Pedido ${order.displayId} vence em ${hoursRemaining}h. Produto: ${order.productName}`,
            data: notifData,
            actionUrl,
            entityType: 'order',
            entityId: order.id,
          });
        }
      }

      return { processed: orders.length };
    } catch (error) {
      this.logger.error(`Error in 24h deadline job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process notification cleanup
   */
  @Process(JOB_NAMES.CLEANUP_NOTIFICATIONS)
  async handleCleanup(job: Job<{ daysOld?: number }>) {
    this.logger.log('Processing notification cleanup job');

    try {
      const daysOld = job.data.daysOld || 90;
      const deletedCount =
        await this.notificationsService.deleteOldNotifications(daysOld);
      this.logger.log(`Cleaned up ${deletedCount} old notifications`);
      return { deleted: deletedCount };
    } catch (error) {
      this.logger.error(`Error in cleanup job: ${error.message}`);
      throw error;
    }
  }
}
