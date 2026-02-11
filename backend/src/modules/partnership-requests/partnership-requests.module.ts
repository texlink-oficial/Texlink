import { Module } from '@nestjs/common';
import { PartnershipRequestsController } from './partnership-requests.controller';
import { PartnershipRequestsService } from './partnership-requests.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [PartnershipRequestsController],
  providers: [PartnershipRequestsService],
  exports: [PartnershipRequestsService],
})
export class PartnershipRequestsModule {}
