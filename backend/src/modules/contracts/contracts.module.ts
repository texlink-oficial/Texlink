import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';

/**
 * Módulo de Contratos
 *
 * Gerencia geração e assinatura de contratos de fornecimento:
 * - Geração de PDF com PDFKit
 * - Template configurável
 * - Assinatura eletrônica simples (IP tracking)
 * - Transições de status
 * - Storage via StorageProvider (local/S3)
 */
@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
