import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
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
// import { CredentialSettingsModule } from './modules/credential-settings/credential-settings.module'; // TODO: Corrigir erros de schema
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/integrations/webhooks/webhooks.module';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    // Rate limiting global (60 req/min por IP)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 60, // 60 requests
      },
    ]),
    PrismaModule,
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
    // CredentialSettingsModule, // TODO: Corrigir erros de schema
    OnboardingModule,
    NotificationsModule,
    WebhooksModule,
  ],
})
export class AppModule { }

