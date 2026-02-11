import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { InvitationNotificationService } from './services/invitation-notification.service';
import { ConsentService } from './services/consent.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [IntegrationsModule, UploadModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, InvitationNotificationService, ConsentService],
  exports: [SuppliersService, InvitationNotificationService, ConsentService],
})
export class SuppliersModule {}

