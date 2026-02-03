import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../../config/bull.config';

/**
 * Service for managing Bull queues
 *
 * Handles:
 * - Scheduling recurring jobs (cron-like)
 * - Adding one-time jobs
 * - Queue monitoring
 */
@Injectable()
export class BullQueueService implements OnModuleInit {
  private readonly logger = new Logger(BullQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DOCUMENT_EXPIRATION)
    private readonly documentExpirationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENT_OVERDUE)
    private readonly paymentOverdueQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.setupRecurringJobs();
  }

  /**
   * Setup recurring jobs (replaces @Cron decorators)
   */
  private async setupRecurringJobs() {
    this.logger.log('Setting up recurring Bull jobs...');

    // Clean existing repeatable jobs to avoid duplicates
    await this.cleanRepeatableJobs();

    // Deadline reminder - 48h (daily at 8:00 AM)
    await this.notificationsQueue.add(
      JOB_NAMES.DEADLINE_48H,
      {},
      {
        repeat: { cron: '0 8 * * *' },
        jobId: 'deadline-48h-recurring',
      },
    );

    // Deadline reminder - 24h (daily at 8:00 AM and 6:00 PM)
    await this.notificationsQueue.add(
      JOB_NAMES.DEADLINE_24H,
      {},
      {
        repeat: { cron: '0 8,18 * * *' },
        jobId: 'deadline-24h-recurring',
      },
    );

    // Document expiration check (Mondays at 9:00 AM)
    await this.documentExpirationQueue.add(
      JOB_NAMES.CHECK_EXPIRING,
      { days: [30, 15, 7] },
      {
        repeat: { cron: '0 9 * * 1' },
        jobId: 'document-expiring-recurring',
      },
    );

    // Expired documents check (daily at 9:00 AM)
    await this.documentExpirationQueue.add(
      JOB_NAMES.CHECK_EXPIRED,
      {},
      {
        repeat: { cron: '0 9 * * *' },
        jobId: 'document-expired-recurring',
      },
    );

    // Payment overdue check (every 15 minutes)
    await this.paymentOverdueQueue.add(
      JOB_NAMES.CHECK_OVERDUE,
      {},
      {
        repeat: { cron: '*/15 * * * *' },
        jobId: 'payment-overdue-recurring',
      },
    );

    // Notification cleanup (Sundays at 2:00 AM)
    await this.notificationsQueue.add(
      JOB_NAMES.CLEANUP_NOTIFICATIONS,
      { daysOld: 90 },
      {
        repeat: { cron: '0 2 * * 0' },
        jobId: 'notification-cleanup-recurring',
      },
    );

    this.logger.log('Recurring Bull jobs configured successfully');
  }

  /**
   * Clean existing repeatable jobs to avoid duplicates on restart
   */
  private async cleanRepeatableJobs() {
    const queues = [
      this.notificationsQueue,
      this.documentExpirationQueue,
      this.paymentOverdueQueue,
    ];

    for (const queue of queues) {
      const repeatableJobs = await queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await queue.removeRepeatableByKey(job.key);
      }
    }
  }

  /**
   * Add a one-time deadline reminder job
   */
  async addDeadlineReminder(orderId: string, hours: 24 | 48) {
    const jobName = hours === 24 ? JOB_NAMES.DEADLINE_24H : JOB_NAMES.DEADLINE_48H;
    await this.notificationsQueue.add(
      jobName,
      { orderId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  /**
   * Add a document expiration check job
   */
  async addDocumentExpirationCheck(days: number[] = [30, 15, 7]) {
    await this.documentExpirationQueue.add(
      JOB_NAMES.CHECK_EXPIRING,
      { days },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  /**
   * Add a payment overdue check job
   */
  async addPaymentOverdueCheck(thresholds?: number[]) {
    await this.paymentOverdueQueue.add(
      JOB_NAMES.CHECK_OVERDUE,
      { thresholds },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = {
      notifications: await this.getQueueMetrics(this.notificationsQueue),
      documentExpiration: await this.getQueueMetrics(this.documentExpirationQueue),
      paymentOverdue: await this.getQueueMetrics(this.paymentOverdueQueue),
    };

    return stats;
  }

  private async getQueueMetrics(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
