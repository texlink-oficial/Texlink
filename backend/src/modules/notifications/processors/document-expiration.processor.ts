import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../../config/bull.config';
import {
  DOCUMENT_EXPIRING,
  DOCUMENT_EXPIRED,
  DocumentExpiringEvent,
  DocumentExpiredEvent,
} from '../events/notification.events';

/**
 * Bull processor for document expiration jobs
 */
@Processor(QUEUE_NAMES.DOCUMENT_EXPIRATION)
export class DocumentExpirationProcessor {
  private readonly logger = new Logger(DocumentExpirationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check for documents expiring soon (30, 15, 7 days)
   */
  @Process(JOB_NAMES.CHECK_EXPIRING)
  async handleCheckExpiring(job: Job<{ days?: number[] }>) {
    this.logger.log('Processing document expiration check job');

    try {
      const now = new Date();
      const expirationWindows = job.data.days || [30, 15, 7];
      let totalProcessed = 0;

      for (const days of expirationWindows) {
        const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const windowStart = new Date(targetDate);
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(targetDate);
        windowEnd.setHours(23, 59, 59, 999);

        const expiringDocs = await this.prisma.supplierDocument.findMany({
          where: {
            expiresAt: {
              gte: windowStart,
              lte: windowEnd,
            },
            status: { not: 'EXPIRED' },
          },
          select: {
            id: true,
            companyId: true,
            type: true,
            fileName: true,
            expiresAt: true,
          },
        });

        this.logger.log(
          `Found ${expiringDocs.length} documents expiring in ${days} days`,
        );

        for (const doc of expiringDocs) {
          const event: DocumentExpiringEvent = {
            documentId: doc.id,
            companyId: doc.companyId,
            documentType: doc.type,
            documentName: doc.fileName || doc.type,
            expiresAt: doc.expiresAt!,
            daysRemaining: days,
          };

          this.eventEmitter.emit(DOCUMENT_EXPIRING, event);

          // Update status to EXPIRING_SOON if within 30 days
          if (days <= 30) {
            await this.prisma.supplierDocument.update({
              where: { id: doc.id },
              data: { status: 'EXPIRING_SOON' },
            });
          }

          totalProcessed++;
        }
      }

      return { processed: totalProcessed };
    } catch (error) {
      this.logger.error(`Error in document expiration check: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check for already expired documents
   */
  @Process(JOB_NAMES.CHECK_EXPIRED)
  async handleCheckExpired(job: Job) {
    this.logger.log('Processing expired documents check job');

    try {
      const now = new Date();

      const expiredDocs = await this.prisma.supplierDocument.findMany({
        where: {
          expiresAt: { lt: now },
          status: { not: 'EXPIRED' },
        },
        select: {
          id: true,
          companyId: true,
          type: true,
          fileName: true,
          expiresAt: true,
        },
      });

      this.logger.log(`Found ${expiredDocs.length} expired documents`);

      for (const doc of expiredDocs) {
        // Update status to EXPIRED
        await this.prisma.supplierDocument.update({
          where: { id: doc.id },
          data: { status: 'EXPIRED' },
        });

        const event: DocumentExpiredEvent = {
          documentId: doc.id,
          companyId: doc.companyId,
          documentType: doc.type,
          documentName: doc.fileName || doc.type,
          expiredAt: doc.expiresAt!,
        };

        this.eventEmitter.emit(DOCUMENT_EXPIRED, event);
      }

      return { processed: expiredDocs.length };
    } catch (error) {
      this.logger.error(`Error in expired documents check: ${error.message}`);
      throw error;
    }
  }
}
