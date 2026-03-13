import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  LocalStorageProvider,
  S3StorageProvider,
  STORAGE_PROVIDER,
} from './storage.provider';

/**
 * Factory function to select storage provider based on STORAGE_TYPE env var
 * - 'local': Use LocalStorageProvider (default, for development)
 * - 's3': Use S3StorageProvider (for production with AWS)
 */
const storageProviderFactory = {
  provide: STORAGE_PROVIDER,
  useFactory: (configService: ConfigService) => {
    const storageType = configService.get<string>('STORAGE_TYPE', 'local');

    if (storageType === 's3') {
      return new S3StorageProvider(configService);
    }

    return new LocalStorageProvider();
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(), // Store in memory for processing before saving
      limits: {
        fileSize: 210 * 1024 * 1024, // 210MB (para acomodar vídeos educacionais)
        files: 5,
      },
    }),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    LocalStorageProvider,
    S3StorageProvider,
    storageProviderFactory,
  ],
  exports: [UploadService, STORAGE_PROVIDER],
})
export class UploadModule {}
