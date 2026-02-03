import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { memoryStorage } from 'multer';

/**
 * Módulo de Onboarding Público
 *
 * Gerencia o fluxo público de onboarding de facções:
 * - Validação de token de convite (sem autenticação)
 * - Criação de conta de facção
 * - Progresso do onboarding
 * - Upload de documentos
 *
 * Steps do Onboarding:
 * 1. Verificação de Email (token já validado)
 * 2. Criação de Senha
 * 3. Dados da Empresa (qualificação do negócio)
 * 4. Upload de Documentos
 * 5. Capacidades Produtivas
 * 6. Revisão de Contrato
 */
@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    UploadModule, // Import for STORAGE_PROVIDER injection
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
