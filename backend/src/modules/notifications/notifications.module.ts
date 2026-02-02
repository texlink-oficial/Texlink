import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
// Event handlers
import { OrderEventsHandler } from './handlers/order-events.handler';
import { MessageEventsHandler } from './handlers/message-events.handler';
import { PaymentEventsHandler } from './handlers/payment-events.handler';
import { TicketEventsHandler } from './handlers/ticket-events.handler';
import { DocumentEventsHandler } from './handlers/document-events.handler';
// Scheduled jobs
import { DeadlineReminderJob } from './jobs/deadline-reminder.job';
import { DocumentExpirationJob } from './jobs/document-expiration.job';
import { PaymentOverdueJob } from './jobs/payment-overdue.job';
import { NotificationCleanupJob } from './jobs/notification-cleanup.job';

/**
 * NotificationsModule
 *
 * Complete notification system with:
 * - Real-time WebSocket notifications (namespace: /notifications)
 * - Email notifications via SendGrid
 * - WhatsApp notifications via Twilio (optional)
 * - Notification persistence and history
 * - User preference management
 * - Event-driven handlers for domain events
 * - Scheduled jobs for reminders and cleanup
 */
@Module({
    imports: [
        PrismaModule,
        IntegrationsModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
                },
            }),
        }),
    ],
    controllers: [NotificationsController],
    providers: [
        // Core services
        NotificationsGateway,
        NotificationDispatcherService,
        NotificationsService,
        // Event handlers
        OrderEventsHandler,
        MessageEventsHandler,
        PaymentEventsHandler,
        TicketEventsHandler,
        DocumentEventsHandler,
        // Scheduled jobs
        DeadlineReminderJob,
        DocumentExpirationJob,
        PaymentOverdueJob,
        NotificationCleanupJob,
    ],
    exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule { }
