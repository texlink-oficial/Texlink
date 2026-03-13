import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EducationalContentController } from './educational-content.controller';
import { EducationalContentService } from './educational-content.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 210 * 1024 * 1024, // 210MB (vídeos educacionais até 200MB)
        files: 2,
      },
    }),
  ],
  controllers: [EducationalContentController],
  providers: [EducationalContentService],
  exports: [EducationalContentService],
})
export class EducationalContentModule {}
