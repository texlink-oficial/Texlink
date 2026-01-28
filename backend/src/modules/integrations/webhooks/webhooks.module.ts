import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendGridWebhookController } from './sendgrid-webhook.controller';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { SendGridSignatureService } from './sendgrid-signature.service';
import { TwilioSignatureService } from './twilio-signature.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [SendGridWebhookController, TwilioWebhookController],
    providers: [SendGridSignatureService, TwilioSignatureService],
})
export class WebhooksModule {}
