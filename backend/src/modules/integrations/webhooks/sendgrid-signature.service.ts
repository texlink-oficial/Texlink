import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Serviço para validação de assinatura de webhooks do SendGrid
 * Referência: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
@Injectable()
export class SendGridSignatureService {
    private readonly logger = new Logger(SendGridSignatureService.name);
    private readonly publicKey: string;
    private readonly enabled: boolean;

    constructor(private readonly configService: ConfigService) {
        this.publicKey = this.configService.get<string>(
            'SENDGRID_WEBHOOK_PUBLIC_KEY',
            '',
        );
        this.enabled = this.configService.get<boolean>(
            'SENDGRID_WEBHOOK_SIGNATURE_VALIDATION',
            false,
        );

        if (this.enabled && !this.publicKey) {
            this.logger.warn(
                'SendGrid webhook signature validation is enabled but SENDGRID_WEBHOOK_PUBLIC_KEY is not configured',
            );
        }
    }

    /**
     * Valida a assinatura do webhook SendGrid
     */
    validateSignature(
        payload: string,
        signature: string,
        timestamp: string,
    ): boolean {
        if (!this.enabled) {
            this.logger.debug(
                'SendGrid signature validation is disabled, skipping',
            );
            return true;
        }

        if (!signature || !timestamp) {
            throw new UnauthorizedException(
                'Missing signature or timestamp header',
            );
        }

        // Verifica se o timestamp é recente (máximo 10 minutos)
        const currentTime = Math.floor(Date.now() / 1000);
        const webhookTimestamp = parseInt(timestamp, 10);
        const timeDiff = currentTime - webhookTimestamp;

        if (timeDiff > 600) {
            // 10 minutos
            throw new UnauthorizedException('Webhook timestamp is too old');
        }

        if (timeDiff < -60) {
            // 1 minuto no futuro
            throw new UnauthorizedException('Webhook timestamp is in the future');
        }

        try {
            // Cria a string assinada: timestamp + payload
            const signedPayload = timestamp + payload;

            // Converte a chave pública de base64 para buffer
            const publicKeyBuffer = Buffer.from(this.publicKey, 'base64');

            // Converte a assinatura de base64 para buffer
            const signatureBuffer = Buffer.from(signature, 'base64');

            // Verifica a assinatura usando ECDSA com SHA256
            const verifier = crypto.createVerify('sha256');
            verifier.update(signedPayload);
            verifier.end();

            const isValid = verifier.verify(
                {
                    key: publicKeyBuffer,
                    format: 'der',
                    type: 'spki',
                },
                signatureBuffer,
            );

            if (!isValid) {
                throw new UnauthorizedException('Invalid webhook signature');
            }

            this.logger.debug('SendGrid signature validated successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to validate SendGrid signature', error);
            throw new UnauthorizedException('Failed to validate webhook signature');
        }
    }

    /**
     * Extrai o timestamp do cabeçalho de assinatura
     */
    extractTimestamp(signatureHeader: string): string | null {
        try {
            // O cabeçalho vem no formato: "t=timestamp,v1=signature"
            const parts = signatureHeader.split(',');
            for (const part of parts) {
                if (part.startsWith('t=')) {
                    return part.substring(2);
                }
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Extrai a assinatura do cabeçalho
     */
    extractSignature(signatureHeader: string): string | null {
        try {
            // O cabeçalho vem no formato: "t=timestamp,v1=signature"
            const parts = signatureHeader.split(',');
            for (const part of parts) {
                if (part.startsWith('v1=')) {
                    return part.substring(3);
                }
            }
            return null;
        } catch {
            return null;
        }
    }
}
