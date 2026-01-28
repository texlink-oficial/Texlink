import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Serviço para validação de assinatura de webhooks do Twilio
 * Referência: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
@Injectable()
export class TwilioSignatureService {
    private readonly logger = new Logger(TwilioSignatureService.name);
    private readonly authToken: string;
    private readonly enabled: boolean;

    constructor(private readonly configService: ConfigService) {
        this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
        this.enabled = this.configService.get<boolean>(
            'TWILIO_WEBHOOK_SIGNATURE_VALIDATION',
            false,
        );

        if (this.enabled && !this.authToken) {
            this.logger.warn(
                'Twilio webhook signature validation is enabled but TWILIO_AUTH_TOKEN is not configured',
            );
        }
    }

    /**
     * Valida a assinatura do webhook Twilio
     */
    validateSignature(
        url: string,
        params: Record<string, any>,
        signature: string,
    ): boolean {
        if (!this.enabled) {
            this.logger.debug('Twilio signature validation is disabled, skipping');
            return true;
        }

        if (!signature) {
            throw new UnauthorizedException('Missing X-Twilio-Signature header');
        }

        try {
            // Ordena os parâmetros alfabeticamente e concatena com a URL
            const sortedKeys = Object.keys(params).sort();
            let data = url;

            for (const key of sortedKeys) {
                data += key + params[key];
            }

            // Calcula o HMAC SHA1
            const hmac = crypto.createHmac('sha1', this.authToken);
            hmac.update(data);
            const expectedSignature = hmac.digest('base64');

            // Compara as assinaturas usando timing-safe comparison
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature),
            );

            if (!isValid) {
                throw new UnauthorizedException('Invalid webhook signature');
            }

            this.logger.debug('Twilio signature validated successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to validate Twilio signature', error);
            throw new UnauthorizedException('Failed to validate webhook signature');
        }
    }

    /**
     * Valida usando o método alternativo do Twilio para WhatsApp
     */
    validateWhatsAppSignature(
        url: string,
        body: string,
        signature: string,
    ): boolean {
        if (!this.enabled) {
            return true;
        }

        if (!signature) {
            throw new UnauthorizedException('Missing X-Twilio-Signature header');
        }

        try {
            // Para WhatsApp, a assinatura é calculada sobre a URL + body
            const data = url + body;

            const hmac = crypto.createHmac('sha1', this.authToken);
            hmac.update(data);
            const expectedSignature = hmac.digest('base64');

            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature),
            );

            if (!isValid) {
                throw new UnauthorizedException('Invalid webhook signature');
            }

            return true;
        } catch (error) {
            this.logger.error('Failed to validate Twilio WhatsApp signature', error);
            throw new UnauthorizedException('Failed to validate webhook signature');
        }
    }
}
