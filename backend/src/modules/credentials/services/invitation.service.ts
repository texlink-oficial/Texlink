import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import {
  InvitationChannel,
  SendInvitationDto,
  BulkSendInvitationDto,
  BulkInvitationResultDto,
} from '../dto';
import { SupplierCredentialStatus, InvitationType } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { StorageProvider } from '../../upload/storage.provider';
import { STORAGE_PROVIDER } from '../../upload/storage.provider';

interface AuthUser {
  id: string;
  companyId: string;
  brandId?: string;
}

export interface InvitationResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
}

/**
 * Serviço responsável pelo envio e gestão de convites para facções
 *
 * Gerencia o fluxo de convites:
 * 1. Envio de convites (sendInvitation)
 * 2. Envio em lote (sendBulkInvitations)
 * 3. Reenvio (resendInvitation)
 * 4. Validação de token (validateInvitationToken)
 * 5. Tracking de cliques (markInvitationClicked)
 */
@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  // Status que permitem envio de convite
  private readonly INVITABLE_STATUSES: SupplierCredentialStatus[] = [
    SupplierCredentialStatus.COMPLIANCE_APPROVED,
    SupplierCredentialStatus.INVITATION_PENDING,
  ];

  // Valores padrão (podem ser sobrescritos por CredentialSettings)
  private readonly DEFAULT_MAX_ATTEMPTS = 5;
  private readonly DEFAULT_INVITATION_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // ==================== SEND INVITATION ====================

  /**
   * Envia convite para um credenciamento
   *
   * - Valida credential e status
   * - Gera token único e link de onboarding
   * - Substitui variáveis no template
   * - Envia via email e/ou WhatsApp
   * - Cria registros de convite
   * - Atualiza status do credential
   */
  async sendInvitation(
    credentialId: string,
    dto: SendInvitationDto,
    user: AuthUser,
  ) {
    const companyId = user.brandId || user.companyId;

    // Busca e valida credential
    const credential = await this.findAndValidateCredential(
      credentialId,
      companyId,
    );

    // Valida status permite envio de convite
    if (!this.INVITABLE_STATUSES.includes(credential.status)) {
      throw new BadRequestException(
        `Credenciamento com status "${credential.status}" não pode receber convite. ` +
          `Status permitidos: ${this.INVITABLE_STATUSES.join(', ')}`,
      );
    }

    // Valida dados de contato conforme canal
    this.validateContactInfo(credential, dto.channel);

    // Gera token único
    const token = this.generateToken();

    // Busca configurações da marca
    const settings = await this.getCredentialSettings(companyId);
    const expiryDays =
      settings?.invitationExpiryDays || this.DEFAULT_INVITATION_EXPIRY_DAYS;

    // Calcula data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Gera link de onboarding
    const onboardingLink = this.generateOnboardingLink(token);

    // Prepara variáveis do template
    const templateVariables = this.prepareTemplateVariables(
      credential,
      onboardingLink,
      expiresAt,
    );

    // Processa mensagem (template ou customizada)
    const emailContent =
      dto.customMessage || this.getDefaultEmailContent(templateVariables);
    const whatsappContent = dto.customMessage
      ? this.formatForWhatsApp(dto.customMessage, templateVariables)
      : this.getDefaultWhatsAppContent(templateVariables);

    const results: {
      email?: InvitationResult;
      whatsapp?: InvitationResult;
    } = {};

    // Envia por Email
    if (
      dto.channel === InvitationChannel.EMAIL ||
      dto.channel === InvitationChannel.BOTH
    ) {
      results.email = await this.sendEmailInvitation(
        credential,
        token,
        emailContent,
        templateVariables,
        dto.templateId,
        expiresAt,
      );
    }

    // Envia por WhatsApp
    if (
      dto.channel === InvitationChannel.WHATSAPP ||
      dto.channel === InvitationChannel.BOTH
    ) {
      // Gera token diferente para WhatsApp se enviando para ambos
      const whatsappToken =
        dto.channel === InvitationChannel.BOTH ? this.generateToken() : token;

      results.whatsapp = await this.sendWhatsAppInvitation(
        credential,
        whatsappToken,
        whatsappContent,
        templateVariables,
        dto.templateId,
        expiresAt,
      );
    }

    // Atualiza status do credential
    await this.updateCredentialStatus(
      credentialId,
      credential.status,
      SupplierCredentialStatus.INVITATION_SENT,
      user.id,
      `Convite enviado via ${dto.channel}`,
    );

    this.logger.log(
      `Convite enviado para credential ${credentialId} via ${dto.channel}`,
    );

    return {
      credentialId,
      results,
      expiresAt,
      message: 'Convite enviado com sucesso',
    };
  }

  // ==================== SEND BULK INVITATIONS ====================

  /**
   * Envia convites em lote
   *
   * - Loop pelos credentialIds
   * - Chama sendInvitation para cada
   * - Retorna resumo de sucesso/falhas
   */
  async sendBulkInvitations(
    dto: BulkSendInvitationDto,
    user: AuthUser,
  ): Promise<BulkInvitationResultDto> {
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const credentialId of dto.credentialIds) {
      try {
        await this.sendInvitation(
          credentialId,
          {
            channel: dto.channel,
            customMessage: dto.customMessage,
            templateId: dto.templateId,
          },
          user,
        );
        successful.push(credentialId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        failed.push({ id: credentialId, error: errorMessage });
        this.logger.error(
          `Falha ao enviar convite para ${credentialId}: ${errorMessage}`,
        );
      }
    }

    return {
      successful,
      failed,
      totalSent: successful.length,
      totalFailed: failed.length,
    };
  }

  // ==================== RESEND INVITATION ====================

  /**
   * Reenvia convite para credenciamento
   *
   * - Busca último convite
   * - Verifica limite de tentativas (configurável por marca)
   * - Verifica se convite não expirou
   * - Gera novo token se expirado
   * - Reenvia com mesmo canal
   * - Incrementa attemptCount
   */
  async resendInvitation(credentialId: string, user: AuthUser) {
    const companyId = user.brandId || user.companyId;

    // Busca credential
    const credential = await this.findAndValidateCredential(
      credentialId,
      companyId,
    );

    // Busca configurações da marca
    const settings = await this.getCredentialSettings(companyId);
    const maxAttempts =
      settings?.maxInvitationAttempts || this.DEFAULT_MAX_ATTEMPTS;
    const expiryDays =
      settings?.invitationExpiryDays || this.DEFAULT_INVITATION_EXPIRY_DAYS;

    // Busca último convite
    const lastInvitation = await this.prisma.credentialInvitation.findFirst({
      where: { credentialId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastInvitation) {
      throw new BadRequestException(
        'Nenhum convite anterior encontrado. Use o envio normal.',
      );
    }

    // Verifica limite de tentativas (configurável)
    if (lastInvitation.attemptCount >= maxAttempts) {
      throw new BadRequestException(
        `Limite máximo de ${maxAttempts} tentativas atingido. ` +
          `Contate o suporte ou aguarde o contato da facção.`,
      );
    }

    // Verifica se convite está expirado
    const now = new Date();
    const isExpired = now > lastInvitation.expiresAt;

    if (isExpired) {
      this.logger.log(
        `Convite ${lastInvitation.id} expirado, gerando novo token`,
      );
    }

    // Determina o canal baseado no último convite
    const channel =
      lastInvitation.type === InvitationType.EMAIL
        ? InvitationChannel.EMAIL
        : InvitationChannel.WHATSAPP;

    // Gera novo token (sempre para segurança)
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const onboardingLink = this.generateOnboardingLink(token);
    const templateVariables = this.prepareTemplateVariables(
      credential,
      onboardingLink,
      expiresAt,
    );

    let result: InvitationResult;

    if (channel === InvitationChannel.EMAIL) {
      const content = this.getDefaultEmailContent(templateVariables);
      result = await this.sendEmailInvitation(
        credential,
        token,
        content,
        templateVariables,
        lastInvitation.templateId || undefined,
        expiresAt,
        lastInvitation.attemptCount + 1,
      );
    } else {
      const content = this.getDefaultWhatsAppContent(templateVariables);
      result = await this.sendWhatsAppInvitation(
        credential,
        token,
        content,
        templateVariables,
        lastInvitation.templateId || undefined,
        expiresAt,
        lastInvitation.attemptCount + 1,
      );
    }

    // Desativa convite anterior
    await this.prisma.credentialInvitation.update({
      where: { id: lastInvitation.id },
      data: { isActive: false },
    });

    // Atualiza status se necessário
    if (credential.status === SupplierCredentialStatus.INVITATION_EXPIRED) {
      await this.updateCredentialStatus(
        credentialId,
        credential.status as SupplierCredentialStatus,
        SupplierCredentialStatus.INVITATION_SENT,
        user.id,
        'Convite reenviado',
      );
    }

    this.logger.log(
      `Convite reenviado para credential ${credentialId} (tentativa ${lastInvitation.attemptCount + 1})`,
    );

    return {
      credentialId,
      channel,
      result,
      attemptNumber: lastInvitation.attemptCount + 1,
      expiresAt,
    };
  }

  // ==================== VALIDATE INVITATION TOKEN ====================

  /**
   * Valida token de convite
   *
   * - Busca invitation pelo token
   * - Verifica se está ativo e não expirado
   * - Atualiza openedAt se primeira vez
   * - Retorna credential associado
   */
  async validateInvitationToken(token: string) {
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: {
          include: {
            brand: {
              select: {
                id: true,
                tradeName: true,
                legalName: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Token de convite inválido');
    }

    // Verifica se está ativo
    if (!invitation.isActive) {
      throw new BadRequestException('Este convite não está mais ativo');
    }

    // Verifica expiração
    if (new Date() > invitation.expiresAt) {
      // Marca como expirado
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { isActive: false },
      });

      // Atualiza status do credential se necessário
      if (
        invitation.credential.status ===
        SupplierCredentialStatus.INVITATION_SENT
      ) {
        await this.prisma.supplierCredential.update({
          where: { id: invitation.credentialId },
          data: { status: SupplierCredentialStatus.INVITATION_EXPIRED },
        });
      }

      throw new BadRequestException(
        'Este convite expirou. Solicite um novo convite.',
      );
    }

    // Atualiza openedAt se primeira vez
    if (!invitation.openedAt) {
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { openedAt: new Date() },
      });

      // Atualiza status do credential para OPENED
      if (
        invitation.credential.status ===
        SupplierCredentialStatus.INVITATION_SENT
      ) {
        await this.prisma.supplierCredential.update({
          where: { id: invitation.credentialId },
          data: { status: SupplierCredentialStatus.INVITATION_OPENED },
        });

        // Registra no histórico
        await this.prisma.credentialStatusHistory.create({
          data: {
            credentialId: invitation.credentialId,
            fromStatus: SupplierCredentialStatus.INVITATION_SENT,
            toStatus: SupplierCredentialStatus.INVITATION_OPENED,
            performedById: 'SYSTEM',
            reason: 'Convite aberto pelo destinatário',
          },
        });
      }
    }

    const resolvedLogoUrl = await this.storage.resolveUrl?.(invitation.credential.brand?.logoUrl) ?? invitation.credential.brand?.logoUrl;

    return {
      valid: true,
      credential: {
        ...invitation.credential,
        brand: {
          ...invitation.credential.brand,
          logoUrl: resolvedLogoUrl,
        },
      },
      brand: {
        ...invitation.credential.brand,
        logoUrl: resolvedLogoUrl,
      },
      invitationType: invitation.type,
      expiresAt: invitation.expiresAt,
    };
  }

  // ==================== GET INVITATIONS ====================

  /**
   * Retorna histórico de convites de um credenciamento
   */
  async getInvitations(credentialId: string, companyId: string) {
    // Valida que credential pertence à marca
    await this.findAndValidateCredential(credentialId, companyId);

    return this.prisma.credentialInvitation.findMany({
      where: { credentialId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        recipient: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        expiresAt: true,
        isActive: true,
        attemptCount: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  }

  // ==================== MARK INVITATION CLICKED ====================

  /**
   * Marca que o link do convite foi clicado
   *
   * - Atualiza clickedAt
   * - Atualiza status do credential para ONBOARDING_STARTED se necessário
   */
  async markInvitationClicked(token: string) {
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Token de convite inválido');
    }

    // Atualiza clickedAt se ainda não foi clicado
    if (!invitation.clickedAt) {
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { clickedAt: new Date() },
      });
    }

    // Atualiza status do credential se ainda não iniciou onboarding
    const startableStatuses: SupplierCredentialStatus[] = [
      SupplierCredentialStatus.INVITATION_SENT,
      SupplierCredentialStatus.INVITATION_OPENED,
    ];

    if (startableStatuses.includes(invitation.credential.status)) {
      await this.prisma.supplierCredential.update({
        where: { id: invitation.credentialId },
        data: { status: SupplierCredentialStatus.ONBOARDING_STARTED },
      });

      // Registra no histórico
      await this.prisma.credentialStatusHistory.create({
        data: {
          credentialId: invitation.credentialId,
          fromStatus: invitation.credential.status,
          toStatus: SupplierCredentialStatus.ONBOARDING_STARTED,
          performedById: 'SYSTEM',
          reason: 'Onboarding iniciado pelo destinatário',
        },
      });

      this.logger.log(
        `Onboarding iniciado para credential ${invitation.credentialId}`,
      );
    }

    return { success: true };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Busca credential e valida que pertence à marca
   */
  private async findAndValidateCredential(
    credentialId: string,
    companyId: string,
  ) {
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: credentialId },
      include: {
        brand: { select: { id: true, tradeName: true, legalName: true } },
      },
    });

    if (!credential) {
      throw new NotFoundException(
        `Credenciamento ${credentialId} não encontrado`,
      );
    }

    if (credential.brandId !== companyId) {
      throw new ForbiddenException('Credenciamento pertence a outra marca');
    }

    return credential;
  }

  /**
   * Valida dados de contato conforme canal
   */
  private validateContactInfo(credential: any, channel: InvitationChannel) {
    if (
      channel === InvitationChannel.EMAIL ||
      channel === InvitationChannel.BOTH
    ) {
      if (!credential.contactEmail) {
        throw new BadRequestException(
          'Email de contato não informado. Atualize o cadastro antes de enviar.',
        );
      }
    }

    if (
      channel === InvitationChannel.WHATSAPP ||
      channel === InvitationChannel.BOTH
    ) {
      if (!credential.contactWhatsapp && !credential.contactPhone) {
        throw new BadRequestException(
          'Telefone/WhatsApp de contato não informado. Atualize o cadastro antes de enviar.',
        );
      }
    }
  }

  /**
   * Gera token único para convite
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Gera link de onboarding
   */
  private generateOnboardingLink(token: string): string {
    const baseUrl = this.configService.getOrThrow<string>('frontendUrl');
    return `${baseUrl}/onboarding/${token}`;
  }

  /**
   * Prepara variáveis do template
   */
  private prepareTemplateVariables(
    credential: any,
    onboardingLink: string,
    expiresAt: Date,
  ): Record<string, string> {
    return {
      brand_name: credential.brand?.tradeName || 'Texlink',
      contact_name: credential.contactName || 'Parceiro',
      supplier_name: credential.tradeName || credential.legalName || 'Empresa',
      company_name: credential.legalName || credential.tradeName || 'Empresa',
      link: onboardingLink,
      expiry_date: expiresAt.toLocaleDateString('pt-BR'),
      expiry_days: String(
        Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      ),
    };
  }

  /**
   * Busca configurações de credenciamento da marca
   */
  private async getCredentialSettings(companyId: string) {
    return this.prisma.credentialSettings.findUnique({
      where: { companyId },
    });
  }

  /**
   * Substitui variáveis no template
   */
  private replaceTemplateVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Formata texto para WhatsApp
   */
  private formatForWhatsApp(
    text: string,
    variables: Record<string, string>,
  ): string {
    // Remove HTML e substitui variáveis
    const plainText = text
      .replace(/<[^>]*>/g, '') // Remove HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    return this.replaceTemplateVariables(plainText, variables);
  }

  /**
   * Conteúdo padrão do email de convite
   */
  private getDefaultEmailContent(variables: Record<string, string>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Convite de Credenciamento</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Olá, ${variables.contact_name}! 👋</h2>
    
    <p>Você foi convidado pela <strong>${variables.brand_name}</strong> para se credenciar como fornecedor parceiro.</p>
    
    <p>Para iniciar seu processo de credenciamento, clique no botão abaixo:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${variables.link}" 
         style="background-color: #2563eb; color: white; padding: 14px 28px; 
                text-decoration: none; border-radius: 8px; font-weight: bold;
                display: inline-block;">
        Iniciar Credenciamento
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      <strong>Importante:</strong> Este link é válido até ${variables.expiry_date} (${variables.expiry_days} dias).
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px;">
      Se você não esperava este convite ou tem dúvidas, entre em contato conosco.<br>
      Equipe ${variables.brand_name}
    </p>
  </div>
</body>
</html>`;
  }

  /**
   * Conteúdo padrão da mensagem WhatsApp
   */
  private getDefaultWhatsAppContent(variables: Record<string, string>): string {
    return `Olá, *${variables.contact_name}*! 👋

Você foi convidado pela *${variables.brand_name}* para se credenciar como fornecedor parceiro.

🔗 *Clique para iniciar:*
${variables.link}

⏰ Este link é válido até ${variables.expiry_date}.

Dúvidas? Responda esta mensagem.

_Equipe ${variables.brand_name}_`;
  }

  /**
   * Envia convite por email
   */
  private async sendEmailInvitation(
    credential: any,
    token: string,
    content: string,
    variables: Record<string, string>,
    templateId: string | undefined,
    expiresAt: Date,
    attemptCount: number = 1,
  ): Promise<InvitationResult> {
    try {
      const result = await this.integrationService.sendEmail({
        to: credential.contactEmail,
        subject: `Convite de Credenciamento - ${variables.brand_name}`,
        content,
        templateId,
        variables,
      });

      // Cria registro do convite
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: InvitationType.EMAIL,
          recipient: credential.contactEmail,
          token,
          subject: `Convite de Credenciamento - ${variables.brand_name}`,
          message: content,
          templateId,
          sentAt: result?.success ? new Date() : null,
          expiresAt,
          attemptCount,
          lastAttemptAt: new Date(),
          providerMessageId: result?.messageId,
          providerResponse: result as object | undefined,
          errorMessage: result?.error,
        },
      });

      return {
        success: result?.success || false,
        channel: 'EMAIL',
        messageId: result?.messageId,
        error: result?.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao enviar email';

      // Cria registro mesmo com erro
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: InvitationType.EMAIL,
          recipient: credential.contactEmail,
          token,
          templateId,
          expiresAt,
          attemptCount,
          lastAttemptAt: new Date(),
          errorMessage,
        },
      });

      return {
        success: false,
        channel: 'EMAIL',
        error: errorMessage,
      };
    }
  }

  /**
   * Envia convite por WhatsApp
   */
  private async sendWhatsAppInvitation(
    credential: any,
    token: string,
    content: string,
    variables: Record<string, string>,
    templateId: string | undefined,
    expiresAt: Date,
    attemptCount: number = 1,
  ): Promise<InvitationResult> {
    const phone = credential.contactWhatsapp || credential.contactPhone;

    try {
      const result = await this.integrationService.sendWhatsApp({
        to: phone,
        content,
        templateId,
        variables,
      });

      // Cria registro do convite
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: InvitationType.WHATSAPP,
          recipient: phone,
          token,
          message: content,
          templateId,
          sentAt: result?.success ? new Date() : null,
          expiresAt,
          attemptCount,
          lastAttemptAt: new Date(),
          providerMessageId: result?.messageId,
          providerResponse: result as object | undefined,
          errorMessage: result?.error,
        },
      });

      return {
        success: result?.success || false,
        channel: 'WHATSAPP',
        messageId: result?.messageId,
        error: result?.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao enviar WhatsApp';

      // Cria registro mesmo com erro
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: InvitationType.WHATSAPP,
          recipient: phone,
          token,
          templateId,
          expiresAt,
          attemptCount,
          lastAttemptAt: new Date(),
          errorMessage,
        },
      });

      return {
        success: false,
        channel: 'WHATSAPP',
        error: errorMessage,
      };
    }
  }

  /**
   * Atualiza status do credential e registra no histórico
   */
  private async updateCredentialStatus(
    credentialId: string,
    fromStatus: SupplierCredentialStatus,
    toStatus: SupplierCredentialStatus,
    performedById: string,
    reason: string,
  ) {
    // Registra no histórico
    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId,
        fromStatus,
        toStatus,
        performedById,
        reason,
      },
    });

    // Atualiza status
    await this.prisma.supplierCredential.update({
      where: { id: credentialId },
      data: { status: toStatus },
    });
  }
}
