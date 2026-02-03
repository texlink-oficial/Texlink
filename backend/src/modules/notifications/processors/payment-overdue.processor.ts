import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../../config/bull.config';
import {
  PAYMENT_OVERDUE,
  PaymentOverdueEvent,
} from '../events/notification.events';

/**
 * Bull processor for payment overdue jobs
 */
@Processor(QUEUE_NAMES.PAYMENT_OVERDUE)
export class PaymentOverdueProcessor {
  private readonly logger = new Logger(PaymentOverdueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check for overdue payments
   */
  @Process(JOB_NAMES.CHECK_OVERDUE)
  async handleCheckOverdue(job: Job<{ thresholds?: number[] }>) {
    this.logger.log('Processing payment overdue check job');

    try {
      const now = new Date();
      const thresholds = job.data.thresholds || [1, 3, 7, 14, 30];

      // Find overdue payments (not paid and past due date)
      const overduePayments = await this.prisma.payment.findMany({
        where: {
          dueDate: { lt: now },
          status: { in: ['PENDENTE', 'PARCIAL'] },
          paidDate: null,
        },
        include: {
          order: {
            select: {
              id: true,
              displayId: true,
              brandId: true,
              supplierId: true,
            },
          },
        },
      });

      this.logger.log(`Found ${overduePayments.length} overdue payments`);

      let processedCount = 0;

      for (const payment of overduePayments) {
        const daysOverdue = Math.ceil(
          (now.getTime() - payment.dueDate.getTime()) / (24 * 60 * 60 * 1000),
        );

        // Only emit event for payments that crossed a threshold
        if (!thresholds.includes(daysOverdue)) {
          continue;
        }

        // Update payment status to ATRASADO
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'ATRASADO' },
        });

        if (!payment.order.supplierId) continue;

        const event: PaymentOverdueEvent = {
          paymentId: payment.id,
          orderId: payment.order.id,
          orderDisplayId: payment.order.displayId,
          brandId: payment.order.brandId,
          supplierId: payment.order.supplierId,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate,
          daysOverdue,
        };

        this.eventEmitter.emit(PAYMENT_OVERDUE, event);
        processedCount++;
      }

      return { processed: processedCount, total: overduePayments.length };
    } catch (error) {
      this.logger.error(`Error in payment overdue check: ${error.message}`);
      throw error;
    }
  }
}
