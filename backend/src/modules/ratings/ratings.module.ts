import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
