import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { CompanyNotesController } from './company-notes.controller';
import { CompanyNotesService } from './company-notes.service';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [CompanyNotesController],
  providers: [CompanyNotesService],
  exports: [CompanyNotesService],
})
export class CompanyNotesModule {}
