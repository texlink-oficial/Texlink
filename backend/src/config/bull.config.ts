import { BullModuleOptions, SharedBullConfigurationFactory } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Bull Queue configuration factory
 *
 * Uses Redis for queue storage, falling back to in-memory if Redis is not available
 */
@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory {
  private readonly logger = new Logger(BullConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration(): BullModuleOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      // Return empty config for in-memory fallback (development only)
      this.logger.warn(
        'REDIS_URL not configured. Using in-memory queue (not recommended for production)',
      );
      return {
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      };
    }

    // Parse Redis URL
    const url = new URL(redisUrl);

    return {
      redis: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        db: parseInt(url.pathname?.slice(1) || '0', 10),
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs for debugging
        removeOnFail: 1000, // Keep last 1000 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    };
  }
}

/**
 * Queue names used throughout the application
 */
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  DEADLINE_REMINDERS: 'deadline-reminders',
  DOCUMENT_EXPIRATION: 'document-expiration',
  PAYMENT_OVERDUE: 'payment-overdue',
  CLEANUP: 'cleanup',
  CREDIT_ANALYSIS: 'credit-analysis',
  CNPJ_VALIDATION: 'cnpj-validation',
} as const;

/**
 * Job names for each queue
 */
export const JOB_NAMES = {
  // Notification jobs
  SEND_EMAIL: 'send-email',
  SEND_WHATSAPP: 'send-whatsapp',
  SEND_PUSH: 'send-push',

  // Reminder jobs
  DEADLINE_48H: 'deadline-48h',
  DEADLINE_24H: 'deadline-24h',

  // Document jobs
  CHECK_EXPIRING: 'check-expiring',
  CHECK_EXPIRED: 'check-expired',

  // Payment jobs
  CHECK_OVERDUE: 'check-overdue',

  // Cleanup jobs
  CLEANUP_NOTIFICATIONS: 'cleanup-notifications',
  CLEANUP_OLD_FILES: 'cleanup-old-files',

  // Credit analysis jobs
  ANALYZE_CREDIT: 'analyze-credit',

  // CNPJ validation jobs
  VALIDATE_CNPJ: 'validate-cnpj',
} as const;
