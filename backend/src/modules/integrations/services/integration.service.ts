import { Injectable, Logger } from '@nestjs/common';
import { InvitationType, RiskLevel } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

// CNPJ Providers
import {
  ICNPJProvider,
  CNPJValidationResult,
} from '../providers/cnpj/cnpj-provider.interface';
import { BrasilApiProvider } from '../providers/cnpj/brasil-api.provider';
import { ReceitaWsProvider } from '../providers/cnpj/receitaws.provider';

// Credit Providers
import {
  ICreditProvider,
  CreditAnalysisResult,
} from '../providers/credit/credit-provider.interface';
import { MockCreditProvider } from '../providers/credit/mock-credit.provider';
import { SerasaCreditProvider } from '../providers/credit/serasa.provider';
import { SPCCreditProvider } from '../providers/credit/spc.provider';

// Notification Providers
import {
  NotificationPayload,
  NotificationResult,
} from '../providers/notification/notification-provider.interface';
import { SendGridProvider } from '../providers/notification/sendgrid.provider';
import { TwilioWhatsappProvider } from '../providers/notification/twilio-whatsapp.provider';

// Cache for credit analysis (in-memory, will use Redis if available)
interface CreditCacheEntry {
  result: CreditAnalysisResult;
  expiresAt: Date;
}

/**
 * Serviço central de integrações
 * Agrega todos os providers externos e implementa fallback automático
 */
@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  // Providers ordenados por prioridade
  private readonly cnpjProviders: ICNPJProvider[];
  private readonly creditProviders: ICreditProvider[];

  // Credit analysis cache (30 days)
  private readonly creditCache: Map<string, CreditCacheEntry> = new Map();
  private readonly CREDIT_CACHE_TTL_DAYS = 30;

  constructor(
    private readonly configService: ConfigService,
    // CNPJ Providers
    private readonly brasilApiProvider: BrasilApiProvider,
    private readonly receitaWsProvider: ReceitaWsProvider,
    // Credit Providers
    private readonly mockCreditProvider: MockCreditProvider,
    private readonly serasaCreditProvider: SerasaCreditProvider,
    private readonly spcCreditProvider: SPCCreditProvider,
    // Notification Providers
    private readonly sendGridProvider: SendGridProvider,
    private readonly twilioWhatsappProvider: TwilioWhatsappProvider,
  ) {
    // Ordena providers de CNPJ por prioridade (menor = maior prioridade)
    this.cnpjProviders = [this.brasilApiProvider, this.receitaWsProvider].sort(
      (a, b) => a.priority - b.priority,
    );

    // Setup credit providers based on configuration
    // Order: Serasa → SPC → Mock (fallback)
    this.creditProviders = [
      this.serasaCreditProvider,
      this.spcCreditProvider,
      this.mockCreditProvider,
    ];

    this.logger.log('Integration service initialized');
  }

  // ==================== CNPJ VALIDATION ====================

  /**
   * Valida um CNPJ usando os providers disponíveis (com fallback automático)
   */
  async validateCNPJ(cnpj: string): Promise<CNPJValidationResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      return {
        isValid: false,
        error: 'CNPJ inválido. Deve conter 14 dígitos numéricos.',
        source: 'VALIDATION',
        timestamp: new Date(),
      };
    }

    const availableProviders: ICNPJProvider[] = [];

    // Filtra providers disponíveis
    for (const provider of this.cnpjProviders) {
      const available = await provider.isAvailable();
      if (available) {
        availableProviders.push(provider);
        this.logger.debug(
          `Provider ${provider.name} disponível (prioridade ${provider.priority})`,
        );
      } else {
        this.logger.debug(`Provider ${provider.name} indisponível, pulando...`);
      }
    }

    if (availableProviders.length === 0) {
      this.logger.error('Nenhum provider de CNPJ disponível');
      return {
        isValid: false,
        error:
          'Nenhum serviço de validação de CNPJ disponível no momento. Tente novamente mais tarde.',
        source: 'NONE',
        timestamp: new Date(),
      };
    }

    // Tenta cada provider em sequência
    for (const provider of availableProviders) {
      try {
        this.logger.log(`Tentando validar CNPJ via ${provider.name}`);
        const result = await provider.validate(cleanCnpj);

        // Se validou com sucesso (encontrou o CNPJ)
        if (result.data) {
          this.logger.log(
            `CNPJ validado via ${provider.name} - Situação: ${result.data.situacao}`,
          );
          return result;
        }

        // Se CNPJ não foi encontrado (404), é um resultado definitivo
        if (result.error?.includes('não encontrado')) {
          this.logger.warn(`CNPJ não encontrado na base da Receita Federal`);
          return result;
        }

        // Outro erro - tenta próximo provider
        this.logger.warn(
          `Provider ${provider.name} retornou erro: ${result.error}`,
        );
      } catch (error) {
        this.logger.error(
          `Erro inesperado no provider ${provider.name}: ${error}`,
        );
      }
    }

    // Todos os providers falharam
    this.logger.error('Todos os providers de CNPJ falharam');
    return {
      isValid: false,
      error:
        'Não foi possível validar o CNPJ. Todos os serviços retornaram erro. Tente novamente mais tarde.',
      source: 'FALLBACK',
      timestamp: new Date(),
    };
  }

  // ==================== CREDIT ANALYSIS ====================

  /**
   * Analisa o crédito de uma empresa pelo CNPJ
   *
   * Flow:
   * 1. Check cache (30 days)
   * 2. Try configured provider (CREDIT_PROVIDER env)
   * 3. Fallback: Serasa → SPC → Mock
   * 4. Cache result
   */
  async analyzeCredit(
    cnpj: string,
    forceRefresh = false,
  ): Promise<CreditAnalysisResult | null> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      this.logger.warn('CNPJ inválido para análise de crédito');
      return null;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedCreditAnalysis(cleanCnpj);
      if (cached) {
        this.logger.log(
          `Credit analysis for ${this.maskCnpj(cleanCnpj)} retrieved from cache`,
        );
        return cached;
      }
    }

    // Get configured provider preference
    const preferredProvider = this.configService.get<string>(
      'CREDIT_PROVIDER',
      'mock',
    );

    // Reorder providers based on preference
    const orderedProviders = this.getOrderedCreditProviders(preferredProvider);

    // Try each provider
    for (const provider of orderedProviders) {
      const isAvailable = await provider.isAvailable();

      if (!isAvailable) {
        this.logger.debug(`Credit provider ${provider.name} not available`);
        continue;
      }

      this.logger.log(`Analyzing credit via ${provider.name}`);

      try {
        const result = await provider.analyze(cleanCnpj);

        // If successful (no error), cache and return
        if (!result.error) {
          this.cacheCreditAnalysis(cleanCnpj, result);
          return result;
        }

        this.logger.warn(
          `Provider ${provider.name} returned error: ${result.error}`,
        );
      } catch (error) {
        this.logger.error(
          `Error from credit provider ${provider.name}: ${error.message}`,
        );
      }
    }

    // All providers failed - return mock fallback
    this.logger.warn(
      `All credit providers failed, using inline mock for ${this.maskCnpj(cleanCnpj)}`,
    );
    return this.generateFallbackCreditResult(cleanCnpj);
  }

  /**
   * Get credit providers ordered by preference
   */
  private getOrderedCreditProviders(
    preferred: string,
  ): ICreditProvider[] {
    const providers = [...this.creditProviders];

    // Move preferred provider to front
    const preferredIndex = providers.findIndex(
      (p) => p.name.toLowerCase() === preferred.toLowerCase(),
    );

    if (preferredIndex > 0) {
      const [provider] = providers.splice(preferredIndex, 1);
      providers.unshift(provider);
    }

    return providers;
  }

  /**
   * Get cached credit analysis if still valid
   */
  private getCachedCreditAnalysis(
    cnpj: string,
  ): CreditAnalysisResult | null {
    const cacheKey = `credit_analysis:${cnpj}`;
    const cached = this.creditCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    if (new Date() > cached.expiresAt) {
      this.creditCache.delete(cacheKey);
      return null;
    }

    return {
      ...cached.result,
      source: `${cached.result.source}_CACHED`,
    };
  }

  /**
   * Cache credit analysis result
   */
  private cacheCreditAnalysis(
    cnpj: string,
    result: CreditAnalysisResult,
  ): void {
    const cacheKey = `credit_analysis:${cnpj}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.CREDIT_CACHE_TTL_DAYS);

    this.creditCache.set(cacheKey, {
      result,
      expiresAt,
    });

    this.logger.debug(
      `Cached credit analysis for ${this.maskCnpj(cnpj)} until ${expiresAt.toISOString()}`,
    );
  }

  /**
   * Generate fallback credit result when all providers fail
   */
  private generateFallbackCreditResult(cnpj: string): CreditAnalysisResult {
    // Gera score aleatório entre 300 e 900
    const score = Math.floor(Math.random() * 601) + 300;

    // Determina risk level baseado no score
    let riskLevel: RiskLevel;
    if (score >= 700) {
      riskLevel = RiskLevel.LOW;
    } else if (score >= 550) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (score >= 400) {
      riskLevel = RiskLevel.HIGH;
    } else {
      riskLevel = RiskLevel.CRITICAL;
    }

    const hasNegatives = score < 500 || Math.random() < 0.2;

    return {
      score,
      riskLevel,
      hasNegatives,
      recommendations: this.generateCreditRecommendations(score, hasNegatives),
      source: 'FALLBACK_INLINE',
      timestamp: new Date(),
      rawResponse: {
        _mock: true,
        _message:
          'Dados simulados (fallback). Providers de crédito não disponíveis.',
      },
    };
  }

  /**
   * Gera recomendações baseadas no score
   */
  private generateCreditRecommendations(
    score: number,
    hasNegatives: boolean,
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 700) {
      recommendations.push('Empresa com excelente histórico de crédito');
      recommendations.push('Baixo risco para parceria comercial');
      recommendations.push('Condições de pagamento padrão recomendadas');
    } else if (score >= 550) {
      recommendations.push('Empresa com histórico de crédito moderado');
      recommendations.push('Recomendado solicitar garantias adicionais');
      if (hasNegatives) {
        recommendations.push(
          'Verificar regularização de pendências antes de prosseguir',
        );
      }
    } else {
      recommendations.push('Alto risco - revisão manual recomendada');
      recommendations.push('Exigir garantias ou pagamento antecipado');
      if (hasNegatives) {
        recommendations.push(
          'Aguardar regularização das pendências financeiras',
        );
      }
    }

    return recommendations;
  }

  // ==================== EMAIL NOTIFICATIONS ====================

  /**
   * Envia email via SendGrid
   */
  async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
    const isAvailable = await this.sendGridProvider.isAvailable();

    if (!isAvailable) {
      this.logger.error('SendGrid não configurado');
      return {
        success: false,
        error: 'Serviço de email não configurado. Configure SENDGRID_API_KEY.',
        provider: 'SENDGRID',
        type: InvitationType.EMAIL,
        timestamp: new Date(),
      };
    }

    this.logger.log(`Enviando email para ${this.maskEmail(payload.to)}`);
    return this.sendGridProvider.send(payload);
  }

  // ==================== WHATSAPP NOTIFICATIONS ====================

  /**
   * Envia mensagem WhatsApp via Twilio
   */
  async sendWhatsApp(
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    const isAvailable = await this.twilioWhatsappProvider.isAvailable();

    if (!isAvailable) {
      this.logger.error('Twilio WhatsApp não configurado');
      return {
        success: false,
        error:
          'Serviço de WhatsApp não configurado. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM.',
        provider: 'TWILIO_WHATSAPP',
        type: InvitationType.WHATSAPP,
        timestamp: new Date(),
      };
    }

    this.logger.log(`Enviando WhatsApp para ${this.maskPhone(payload.to)}`);
    return this.twilioWhatsappProvider.send(payload);
  }

  // ==================== NOTIFICATION ROUTER ====================

  /**
   * Router para enviar notificação baseado no tipo
   */
  async sendNotification(
    type: 'EMAIL' | 'WHATSAPP',
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    switch (type) {
      case 'EMAIL':
        return this.sendEmail(payload);

      case 'WHATSAPP':
        return this.sendWhatsApp(payload);

      default:
        this.logger.error(`Tipo de notificação não suportado: ${type}`);
        return {
          success: false,
          error: `Tipo de notificação não suportado: ${type}`,
          provider: 'NONE',
          type: InvitationType.EMAIL,
          timestamp: new Date(),
        };
    }
  }

  // ==================== PROVIDER STATUS ====================

  /**
   * Retorna o status de todos os providers
   */
  async getProvidersStatus(): Promise<
    Record<string, { available: boolean; name: string; type: string }>
  > {
    const [
      brasilApiAvailable,
      receitaWsAvailable,
      mockCreditAvailable,
      serasaAvailable,
      spcAvailable,
      sendGridAvailable,
      twilioAvailable,
    ] = await Promise.all([
      this.brasilApiProvider.isAvailable(),
      this.receitaWsProvider.isAvailable(),
      this.mockCreditProvider.isAvailable(),
      this.serasaCreditProvider.isAvailable(),
      this.spcCreditProvider.isAvailable(),
      this.sendGridProvider.isAvailable(),
      this.twilioWhatsappProvider.isAvailable(),
    ]);

    return {
      brasilApi: {
        name: this.brasilApiProvider.name,
        type: 'CNPJ',
        available: brasilApiAvailable,
      },
      receitaWs: {
        name: this.receitaWsProvider.name,
        type: 'CNPJ',
        available: receitaWsAvailable,
      },
      mockCredit: {
        name: this.mockCreditProvider.name,
        type: 'CREDIT',
        available: mockCreditAvailable,
      },
      serasa: {
        name: this.serasaCreditProvider.name,
        type: 'CREDIT',
        available: serasaAvailable,
      },
      spc: {
        name: this.spcCreditProvider.name,
        type: 'CREDIT',
        available: spcAvailable,
      },
      sendGrid: {
        name: this.sendGridProvider.name,
        type: 'EMAIL',
        available: sendGridAvailable,
      },
      twilioWhatsapp: {
        name: this.twilioWhatsappProvider.name,
        type: 'WHATSAPP',
        available: twilioAvailable,
      },
    };
  }

  // ==================== UTILITY METHODS ====================

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
   * Mascara telefone para logs
   */
  private maskPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 8) return phone;
    return `+${clean.slice(0, 4)}****${clean.slice(-4)}`;
  }

  /**
   * Mascara CNPJ para logs
   */
  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }
}
