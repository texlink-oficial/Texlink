import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';
import { QUEUE_NAMES } from '../../config/bull.config';

// Main service and controller
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';

// Sub-services
import { ValidationService } from './services/validation.service';
import { ComplianceService } from './services/compliance.service';
import { InvitationService } from './services/invitation.service';

// Processors
import { CnpjValidationProcessor } from './processors/cnpj-validation.processor';

/**
 * Módulo de Credenciamento de Facções
 *
 * Gerencia todo o fluxo de credenciamento:
 * - Cadastro de novas facções
 * - Validação de CNPJ (com cache de 30 dias)
 * - Análise de compliance/crédito
 * - Envio de convites (email/WhatsApp)
 * - Fluxo de onboarding
 * - Notificações automáticas
 */
@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    UploadModule,
    forwardRef(() => NotificationsModule),
    CacheModule.register({
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 dias em ms
      max: 1000, // Máximo 1000 itens em cache
    }),
    // Bull queue for CNPJ validation
    BullModule.registerQueue({
      name: QUEUE_NAMES.CNPJ_VALIDATION,
    }),
  ],
  controllers: [CredentialsController],
  providers: [
    // Main service
    CredentialsService,

    // Sub-services
    ValidationService,
    ComplianceService,
    InvitationService,

    // Processors
    CnpjValidationProcessor,
  ],
  exports: [
    CredentialsService,
    ValidationService,
    ComplianceService,
    InvitationService,
  ],
})
export class CredentialsModule {}
