import { Module } from '@nestjs/common';
import { SendGridWebhookController } from './sendgrid-webhook.controller';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SendGridWebhookController, TwilioWebhookController],
})
export class WebhooksModule {}
