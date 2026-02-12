import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ChatModule } from './modules/chat/chat.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { TeamModule } from './modules/team/team.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { CredentialSettingsModule } from './modules/credential-settings/credential-settings.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { PartnershipRequestsModule } from './modules/partnership-requests/partnership-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/integrations/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { CommonModule } from './common/common.module';
import { SupplierDocumentsModule } from './modules/supplier-documents/supplier-documents.module';
import { PartnersModule } from './modules/partners/partners.module';
import { EducationalContentModule } from './modules/educational-content/educational-content.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PortalModule } from './modules/portal/portal.module';
import { BrandDashboardModule } from './modules/brand-dashboard/brand-dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BrandDocumentsModule } from './modules/brand-documents/brand-documents.module';
import { CapacityModule } from './modules/capacity/capacity.module';
import { BrandsModule } from './modules/brands/brands.module';
import configuration from './config/configuration';
import { BullConfigService, QUEUE_NAMES } from './config/bull.config';

/**
 * Conditionally import modules based on environment
 */
const conditionalImports: any[] = [];

// Only serve static files locally when not using S3
if (process.env.STORAGE_TYPE !== 's3') {
  conditionalImports.push(
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  );
}

// Only use Bull queues when Redis is available
if (process.env.REDIS_URL) {
  conditionalImports.push(
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useClass: BullConfigService,
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.DOCUMENT_EXPIRATION },
      { name: QUEUE_NAMES.PAYMENT_OVERDUE },
      { name: QUEUE_NAMES.CLEANUP },
      { name: QUEUE_NAMES.CREDIT_ANALYSIS },
    ),
  );
} else {
  Logger.warn('REDIS_URL not configured - Bull queues disabled, using in-memory scheduling', 'AppModule');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Conditional static file serving (only for local storage)
    ...conditionalImports,
    // Rate limiting global (60 req/min por IP)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 60, // 60 requests
      },
    ]),
    // Event-driven architecture for notifications
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    // Scheduled jobs for reminders
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    CommonModule,
    PermissionsModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    SuppliersModule,
    OrdersModule,
    ChatModule,
    RatingsModule,
    PaymentsModule,
    AdminModule,
    UploadModule,
    TeamModule,
    FavoritesModule,
    CredentialsModule,
    CredentialSettingsModule,
    OnboardingModule,
    ContractsModule,
    RelationshipsModule,
    PartnershipRequestsModule,
    NotificationsModule,
    WebhooksModule,
    SupplierDocumentsModule,
    PartnersModule,
    EducationalContentModule,
    SupportTicketsModule,
    SettingsModule,
    PortalModule,
    BrandDashboardModule,
    ReportsModule,
    BrandDocumentsModule,
    CapacityModule,
    BrandsModule,
  ],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
