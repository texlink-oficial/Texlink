import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationType } from '@prisma/client';
import sgMail from '@sendgrid/mail';
import { ResponseError } from '@sendgrid/mail';
import {
  INotificationProvider,
  NotificationPayload,
  NotificationResult,
  NotificationDeliveryStatus,
} from './notification-provider.interface';

/**
 * Provider de envio de emails usando SendGrid
 * https://docs.sendgrid.com/api-reference/mail-send/mail-send
 *
 * Configurações via variáveis de ambiente:
 * - SENDGRID_API_KEY: API Key do SendGrid
 * - SENDGRID_FROM_EMAIL: Email do remetente
 * - SENDGRID_FROM_NAME: Nome do remetente
 */
@Injectable()
export class SendGridProvider implements INotificationProvider, OnModuleInit {
  readonly name = 'SENDGRID';
  readonly type = InvitationType.EMAIL;

  private readonly logger = new Logger(SendGridProvider.name);
  private readonly apiKey?: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@texlink.com.br',
    );
    this.fromName = this.configService.get<string>(
      'SENDGRID_FROM_NAME',
      'Texlink',
    );
  }

  /**
   * Inicializa o SDK do SendGrid com a API Key
   */
  onModuleInit() {
    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid configurado com sucesso');
    } else {
      this.logger.warn(
        'SendGrid não configurado: SENDGRID_API_KEY não definida',
      );
    }
  }

  /**
   * Verifica se o provider está disponível/configurado
   */
  async isAvailable(): Promise<boolean> {
    return this.isConfigured && !!this.apiKey;
  }

  /**
   * Envia um email via SendGrid
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error:
          'SendGrid não configurado. Defina SENDGRID_API_KEY nas variáveis de ambiente.',
        provider: this.name,
        type: this.type,
        timestamp: new Date(),
      };
    }

    try {
      this.logger.log(`Enviando email para ${this.maskEmail(payload.to)}`);

      const message = this.buildMessage(payload);

      const [response] = await sgMail.send(message);

      // O messageId vem no header x-message-id
      const messageId = (response.headers['x-message-id'] as string) || '';

      this.logger.log(`Email enviado com sucesso. Message ID: ${messageId}`);

      return {
        success: true,
        messageId,
        provider: this.name,
        type: this.type,
        timestamp: new Date(),
        rawResponse: {
          statusCode: response.statusCode,
          headers: response.headers,
        },
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      this.logger.error(`Erro ao enviar email: ${errorInfo.message}`);

      return {
        success: false,
        error: errorInfo.message,
        errorCode: errorInfo.code,
        provider: this.name,
        type: this.type,
        timestamp: new Date(),
        rawResponse: errorInfo.raw,
      };
    }
  }

  /**
   * Processa webhook de status do SendGrid
   */
  async handleWebhook(
    payload: unknown,
  ): Promise<NotificationDeliveryStatus | null> {
    const event = payload as Record<string, unknown>;

    if (!event.sg_message_id) {
      return null;
    }

    const statusMap: Record<string, NotificationDeliveryStatus['status']> = {
      processed: 'queued',
      delivered: 'delivered',
      open: 'opened',
      click: 'clicked',
      bounce: 'bounced',
      dropped: 'failed',
      deferred: 'queued',
      unsubscribe: 'unsubscribed',
      spamreport: 'failed',
    };

    const eventType = event.event as string;
    const status = statusMap[eventType];

    if (!status) {
      return null;
    }

    return {
      messageId: event.sg_message_id as string,
      status,
      timestamp: new Date((event.timestamp as number) * 1000),
      metadata: {
        email: event.email,
        event: eventType,
        reason: event.reason,
        ip: event.ip,
        useragent: event.useragent,
      },
      error: event.reason as string | undefined,
    };
  }

  /**
   * Constrói o objeto de mensagem para o SendGrid
   */
  private buildMessage(payload: NotificationPayload): sgMail.MailDataRequired {
    const from = payload.from || {
      email: this.fromEmail,
      name: this.fromName,
    };

    // Base da mensagem - usando tipagem que aceita todas as variantes
    const message: Record<string, unknown> = {
      to: payload.to,
      from: {
        email: from.email,
        name: from.name,
      },
      subject: payload.subject || '',
    };

    // Se tem templateId, usa template dinâmico do SendGrid
    if (payload.templateId) {
      message.templateId = payload.templateId;

      if (payload.variables) {
        message.dynamicTemplateData = payload.variables;
      }
    } else {
      // Conteúdo HTML direto
      message.html = payload.content;

      // Gera versão texto simples removendo tags HTML
      message.text = this.stripHtml(payload.content);
    }

    // Reply-to
    if (payload.replyTo) {
      message.replyTo = payload.replyTo;
    }

    // Anexos
    if (payload.attachments && payload.attachments.length > 0) {
      message.attachments = payload.attachments.map((att) => ({
        content:
          typeof att.content === 'string'
            ? att.content
            : att.content.toString('base64'),
        filename: att.filename,
        type: att.contentType,
        contentId: att.contentId,
        disposition: att.contentId ? 'inline' : 'attachment',
      }));
    }

    // Metadados customizados para rastreamento
    if (payload.metadata) {
      message.customArgs = payload.metadata;
    }

    // Agendamento
    if (payload.scheduledAt) {
      message.sendAt = Math.floor(payload.scheduledAt.getTime() / 1000);
    }

    return message as unknown as sgMail.MailDataRequired;
  }

  /**
   * Remove tags HTML de um texto
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Mascara email para logs
   */
  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    const maskedUser =
      user.length > 3 ? `${user.slice(0, 2)}***${user.slice(-1)}` : '***';
    return `${maskedUser}@${domain}`;
  }

  /**
   * Trata erros do SendGrid
   */
  private handleError(error: unknown): {
    message: string;
    code?: string;
    raw?: Record<string, unknown>;
  } {
    // Erro específico do SendGrid
    if (this.isResponseError(error)) {
      const statusCode = error.code;
      const responseBody = error.response?.body;
      const body =
        typeof responseBody === 'object'
          ? (responseBody as Record<string, unknown>)
          : undefined;
      const errors = body?.errors as Array<Record<string, unknown>> | undefined;
      const firstError = errors?.[0];

      // Erros comuns
      if (statusCode === 401) {
        return {
          message: 'API Key inválida ou expirada',
          code: 'AUTH_ERROR',
          raw: body,
        };
      }
      if (statusCode === 403) {
        return {
          message: 'Acesso negado. Verifique as permissões da API Key',
          code: 'FORBIDDEN',
          raw: body,
        };
      }
      if (statusCode === 429) {
        return {
          message: 'Limite de requisições excedido. Tente novamente mais tarde',
          code: 'RATE_LIMIT',
          raw: body,
        };
      }
      if (statusCode === 400) {
        const fieldError = firstError?.field ? ` (${firstError.field})` : '';
        return {
          message:
            ((firstError?.message || 'Requisição inválida') as string) +
            fieldError,
          code: 'VALIDATION_ERROR',
          raw: body,
        };
      }

      return {
        message: (firstError?.message ||
          error.message ||
          `Erro HTTP ${statusCode}`) as string,
        code: statusCode?.toString(),
        raw: body,
      };
    }

    // Erro genérico
    if (error instanceof Error) {
      return { message: error.message };
    }

    return { message: 'Erro desconhecido ao enviar email' };
  }

  /**
   * Type guard para ResponseError do SendGrid
   */
  private isResponseError(error: unknown): error is ResponseError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'response' in error
    );
  }
}
