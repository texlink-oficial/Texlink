/**
 * Invitation Notification Service
 *
 * Orchestrates sending supplier invitations via email and WhatsApp
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendGridProvider } from '../../integrations/providers/notification/sendgrid.provider';
import { TwilioWhatsappProvider } from '../../integrations/providers/notification/twilio-whatsapp.provider';
import {
    generateInvitationEmailHtml,
    generateInvitationEmailSubject,
    type InvitationEmailData,
} from '../../integrations/templates/invitation-email.template';
import {
    generateInvitationWhatsAppMessage,
    type InvitationWhatsAppData,
} from '../../integrations/templates/invitation-whatsapp.template';

export interface SendInvitationOptions {
    // Supplier details
    supplierLegalName: string;
    supplierTradeName?: string;
    supplierCnpj: string;

    // Contact details
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;

    // Brand details
    brandName: string;
    brandLogoUrl?: string;

    // Invitation details
    invitationToken: string;
    expiresAt: Date;
    customMessage?: string;
}

export interface SendInvitationResult {
    emailSent: boolean;
    emailError?: string;
    emailMessageId?: string;
    whatsappSent: boolean;
    whatsappError?: string;
    whatsappMessageId?: string;
}

@Injectable()
export class InvitationNotificationService {
    private readonly logger = new Logger(InvitationNotificationService.name);
    private readonly baseUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly sendGridProvider: SendGridProvider,
        private readonly twilioProvider: TwilioWhatsappProvider,
    ) {
        this.baseUrl = this.configService.get<string>(
            'APP_URL',
            'https://app.texlink.com.br',
        );
    }

    /**
     * Send invitation via email
     */
    async sendEmailInvitation(
        options: SendInvitationOptions,
    ): Promise<{ success: boolean; error?: string; messageId?: string }> {
        if (!options.contactEmail) {
            return { success: false, error: 'Email do contato não informado' };
        }

        const isAvailable = await this.sendGridProvider.isAvailable();
        if (!isAvailable) {
            this.logger.warn('SendGrid não disponível, email não será enviado');
            return { success: false, error: 'Serviço de email não configurado' };
        }

        try {
            const acceptUrl = this.buildAcceptUrl(options.invitationToken);

            const emailData: InvitationEmailData = {
                brandName: options.brandName,
                brandLogoUrl: options.brandLogoUrl,
                supplierLegalName: options.supplierLegalName,
                supplierCnpj: this.formatCnpj(options.supplierCnpj),
                contactName: options.contactName,
                customMessage: options.customMessage,
                acceptUrl,
                expiresAt: options.expiresAt,
            };

            const htmlContent = generateInvitationEmailHtml(emailData);
            const subject = generateInvitationEmailSubject(options.brandName);

            const result = await this.sendGridProvider.send({
                to: options.contactEmail,
                subject,
                content: htmlContent,
                metadata: {
                    type: 'supplier_invitation',
                    token: options.invitationToken,
                },
            });

            if (result.success) {
                this.logger.log(
                    `Email de convite enviado para ${this.maskEmail(options.contactEmail)}`,
                );
                return { success: true, messageId: result.messageId };
            } else {
                this.logger.error(`Erro ao enviar email de convite: ${result.error}`);
                return { success: false, error: result.error };
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Erro desconhecido';
            this.logger.error(`Exceção ao enviar email de convite: ${message}`);
            return { success: false, error: message };
        }
    }

    /**
     * Send invitation via WhatsApp
     */
    async sendWhatsAppInvitation(
        options: SendInvitationOptions,
    ): Promise<{ success: boolean; error?: string; messageId?: string }> {
        if (!options.contactPhone) {
            return { success: false, error: 'Telefone do contato não informado' };
        }

        const isAvailable = await this.twilioProvider.isAvailable();
        if (!isAvailable) {
            this.logger.warn(
                'Twilio WhatsApp não disponível, mensagem não será enviada',
            );
            return { success: false, error: 'Serviço de WhatsApp não configurado' };
        }

        try {
            const acceptUrl = this.buildAcceptUrl(options.invitationToken);

            const whatsappData: InvitationWhatsAppData = {
                brandName: options.brandName,
                supplierLegalName: options.supplierLegalName,
                contactName: options.contactName,
                customMessage: options.customMessage,
                acceptUrl,
                expiresAt: options.expiresAt,
            };

            const messageContent = generateInvitationWhatsAppMessage(whatsappData);

            const result = await this.twilioProvider.send({
                to: options.contactPhone,
                content: messageContent,
                metadata: {
                    type: 'supplier_invitation',
                    token: options.invitationToken,
                },
            });

            if (result.success) {
                this.logger.log(
                    `WhatsApp de convite enviado para ${this.maskPhone(options.contactPhone)}`,
                );
                return { success: true, messageId: result.messageId };
            } else {
                this.logger.error(
                    `Erro ao enviar WhatsApp de convite: ${result.error}`,
                );
                return { success: false, error: result.error };
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Erro desconhecido';
            this.logger.error(`Exceção ao enviar WhatsApp de convite: ${message}`);
            return { success: false, error: message };
        }
    }

    /**
     * Send invitation via both channels
     */
    async sendInvitation(
        options: SendInvitationOptions,
        channels: { email: boolean; whatsapp: boolean },
    ): Promise<SendInvitationResult> {
        const result: SendInvitationResult = {
            emailSent: false,
            whatsappSent: false,
        };

        // Send email if requested
        if (channels.email && options.contactEmail) {
            const emailResult = await this.sendEmailInvitation(options);
            result.emailSent = emailResult.success;
            result.emailError = emailResult.error;
            result.emailMessageId = emailResult.messageId;
        }

        // Send WhatsApp if requested
        if (channels.whatsapp && options.contactPhone) {
            const whatsappResult = await this.sendWhatsAppInvitation(options);
            result.whatsappSent = whatsappResult.success;
            result.whatsappError = whatsappResult.error;
            result.whatsappMessageId = whatsappResult.messageId;
        }

        return result;
    }

    /**
     * Build the invitation acceptance URL
     */
    private buildAcceptUrl(token: string): string {
        return `${this.baseUrl}/aceitar-convite/${token}`;
    }

    /**
     * Format CNPJ for display
     */
    private formatCnpj(cnpj: string): string {
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }

    /**
     * Mask email for logging
     */
    private maskEmail(email: string): string {
        const [user, domain] = email.split('@');
        if (!domain) return '***';
        const maskedUser =
            user.length > 3 ? `${user.slice(0, 2)}***${user.slice(-1)}` : '***';
        return `${maskedUser}@${domain}`;
    }

    /**
     * Mask phone for logging
     */
    private maskPhone(phone: string): string {
        const clean = phone.replace(/\D/g, '');
        if (clean.length < 8) return phone;
        return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
    }
}
