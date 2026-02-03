import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupplierCredentialStatus } from '@prisma/client';
import { SendGridSignatureService } from './sendgrid-signature.service';
import { ThrottleWebhook } from '../../../common/decorators/throttle.decorator';

interface SendGridEvent {
  email: string;
  event: string;
  timestamp: number;
  'smtp-id'?: string;
  sg_message_id?: string;
  category?: string[];
  credentialId?: string;
  invitationId?: string;
}

@ApiTags('Webhooks')
@Controller('webhooks/sendgrid')
@ThrottleWebhook() // 100 requests per minute - webhooks may send bursts
export class SendGridWebhookController {
  private readonly logger = new Logger(SendGridWebhookController.name);
  private readonly processedEvents = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly signatureService: SendGridSignatureService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook do SendGrid' })
  @ApiResponse({ status: 200, description: 'Eventos processados' })
  @ApiResponse({ status: 401, description: 'Assinatura inválida' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() events: SendGridEvent[],
    @Headers('x-twilio-email-event-webhook-signature')
    signatureHeader?: string,
    @Headers('x-twilio-email-event-webhook-timestamp')
    timestamp?: string,
  ) {
    this.logger.log(`Recebidos ${events.length} eventos do SendGrid`);

    // Valida a assinatura do webhook
    if (signatureHeader && timestamp) {
      const rawBody = req.rawBody?.toString() || JSON.stringify(events);
      const signature = this.signatureService.extractSignature(signatureHeader);
      const ts =
        this.signatureService.extractTimestamp(signatureHeader) || timestamp;

      if (signature && ts) {
        this.signatureService.validateSignature(rawBody, signature, ts);
      }
    }

    const results = await Promise.allSettled(
      events.map((event) => this.processEvent(event)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { success: true, processed: succeeded, failed };
  }

  private async processEvent(event: SendGridEvent) {
    const eventId = `${event.sg_message_id || event['smtp-id']}-${event.event}-${event.timestamp}`;

    if (this.processedEvents.has(eventId)) {
      return;
    }

    const invitationId = this.extractMetadata(event, 'invitationId');
    if (!invitationId) return;

    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { id: invitationId },
      include: { credential: true },
    });

    if (!invitation) return;

    switch (event.event) {
      case 'delivered':
        await this.handleDelivered(invitation.id);
        break;
      case 'open':
      case 'opened':
        await this.handleOpened(invitation.id, invitation.credentialId);
        break;
      case 'click':
        await this.handleClicked(invitation.id, invitation.credentialId);
        break;
      case 'bounce':
      case 'dropped':
        await this.handleFailed(invitation.id, event.event);
        break;
    }

    this.processedEvents.add(eventId);
    setTimeout(() => this.processedEvents.delete(eventId), 3600000);
  }

  private async handleDelivered(invitationId: string) {
    await this.prisma.credentialInvitation.update({
      where: { id: invitationId },
      data: { deliveredAt: new Date() },
    });
  }

  private async handleOpened(invitationId: string, credentialId: string) {
    await this.prisma.credentialInvitation.update({
      where: { id: invitationId },
      data: { openedAt: new Date() },
    });

    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: credentialId },
    });

    if (credential?.status === SupplierCredentialStatus.INVITATION_SENT) {
      await this.prisma.supplierCredential.update({
        where: { id: credentialId },
        data: { status: SupplierCredentialStatus.INVITATION_OPENED },
      });
    }
  }

  private async handleClicked(invitationId: string, credentialId: string) {
    await this.prisma.credentialInvitation.update({
      where: { id: invitationId },
      data: { clickedAt: new Date() },
    });
  }

  private async handleFailed(invitationId: string, reason: string) {
    await this.prisma.credentialInvitation.update({
      where: { id: invitationId },
      data: {
        isActive: false,
        errorMessage: `Falha: ${reason}`,
      },
    });
  }

  private extractMetadata(event: SendGridEvent, key: string): string | null {
    if (event.category && Array.isArray(event.category)) {
      const found = event.category.find((c) => c.startsWith(`${key}:`));
      if (found) return found.split(':')[1];
    }
    return (event as any)[key] || null;
  }
}
