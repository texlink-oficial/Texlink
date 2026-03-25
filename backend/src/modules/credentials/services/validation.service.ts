import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SupplierCredentialStatus, ValidationSource } from '@prisma/client';
import { QUEUE_NAMES, JOB_NAMES } from '../../../config/bull.config';

interface AuthUser {
  id: string;
  companyId: string;
  brandId?: string;
}

/**
 * Serviço responsável pela validação de CNPJ de facções
 *
 * Gerencia o fluxo de validação:
 * 1. Inicia validação (startValidation)
 * 2. Processa via APIs externas (processValidation)
 * 3. Atualiza dados da empresa e status
 * 4. Registra histórico de validações
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  // Status que permitem iniciar validação
  private readonly VALIDATABLE_STATUSES: SupplierCredentialStatus[] = [
    SupplierCredentialStatus.DRAFT,
    SupplierCredentialStatus.VALIDATION_FAILED,
  ];

  // Status que permitem revalidação
  private readonly REVALIDATABLE_STATUSES: SupplierCredentialStatus[] = [
    SupplierCredentialStatus.DRAFT,
    SupplierCredentialStatus.VALIDATION_FAILED,
    SupplierCredentialStatus.PENDING_VALIDATION,
    SupplierCredentialStatus.VALIDATING,
    SupplierCredentialStatus.PENDING_COMPLIANCE,
    SupplierCredentialStatus.COMPLIANCE_REJECTED,
  ];

  // Cache TTL: 30 dias para validações CNPJ
  private readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.CNPJ_VALIDATION)
    private readonly validationQueue?: Queue,
  ) {}

  /**
   * Check if async validation via Bull is available
   */
  private isAsyncValidationAvailable(): boolean {
    return !!this.validationQueue;
  }

  // ==================== START VALIDATION ====================

  /**
   * Inicia o processo de validação de CNPJ
   *
   * - Busca credential e valida propriedade
   * - Valida status (deve ser DRAFT ou VALIDATION_FAILED)
   * - Atualiza status para PENDING_VALIDATION
   * - Se Bull/Redis disponível: agenda job assíncrono
   * - Se não: processa síncronamente (fallback)
   */
  async startValidation(credentialId: string, user: AuthUser) {
    const companyId = user.brandId || user.companyId;

    // Busca e valida credential
    const credential = await this.findAndValidateCredential(
      credentialId,
      companyId,
    );

    // Valida status permite validação
    if (!this.VALIDATABLE_STATUSES.includes(credential.status)) {
      throw new BadRequestException(
        `Credenciamento com status "${credential.status}" não pode iniciar validação. ` +
          `Status permitidos: ${this.VALIDATABLE_STATUSES.join(', ')}`,
      );
    }

    // Atualiza status para PENDING_VALIDATION
    await this.updateCredentialStatus(
      credentialId,
      credential.status,
      SupplierCredentialStatus.PENDING_VALIDATION,
      user.id,
      'Validação de CNPJ iniciada pelo usuário',
    );

    this.logger.log(`Validação iniciada para credential ${credentialId}`);

    // Se Bull/Redis está disponível, processa assincronamente
    if (this.isAsyncValidationAvailable()) {
      this.logger.log(`Agendando validação assíncrona via Bull para credential ${credentialId}`);

      const job = await this.validationQueue!.add(
        JOB_NAMES.VALIDATE_CNPJ,
        {
          credentialId,
          performedById: user.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      return {
        credentialId,
        jobId: job.id,
        status: 'QUEUED',
        message: 'Validação de CNPJ agendada. Você será notificado quando concluir.',
      };
    }

    // Fallback: processa sincronamente se Bull não está disponível
    this.logger.log(`Processando validação síncrona para credential ${credentialId} (Bull não disponível)`);
    const result = await this.processValidation(credentialId, user.id);

    return result;
  }

  // ==================== PROCESS VALIDATION ====================

  /**
   * Processa a validação de CNPJ
   *
   * - Atualiza status para VALIDATING
   * - Chama IntegrationService.validateCNPJ
   * - Salva resultado em CredentialValidation
   * - Se válido: atualiza dados e status para PENDING_COMPLIANCE
   * - Se inválido: atualiza status para VALIDATION_FAILED
   */
  async processValidation(credentialId: string, performedById: string) {
    // Busca credential
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new NotFoundException(
        `Credenciamento ${credentialId} não encontrado`,
      );
    }

    // CPF: skip external API, validate algorithmically and advance to compliance
    if (credential.documentType === 'CPF') {
      return this.processCPFValidation(credentialId, credential, performedById);
    }

    // CNPJ: existing external API flow
    // Atualiza status para VALIDATING
    await this.updateCredentialStatus(
      credentialId,
      credential.status,
      SupplierCredentialStatus.VALIDATING,
      performedById,
      'Processando validação de CNPJ',
    );

    try {
      // Verifica cache antes de chamar API
      const cacheKey = `cnpj_validation:${credential.cnpj}`;
      const cachedResult = await this.cacheManager.get(cacheKey);

      let validationResult: any;

      if (cachedResult) {
        this.logger.log(
          `Validação de CNPJ ${this.formatCNPJ(credential.cnpj)} encontrada em cache`,
        );
        validationResult = cachedResult;
      } else {
        // Chama API de validação
        this.logger.log(
          `Processando validação de CNPJ ${this.formatCNPJ(credential.cnpj)}`,
        );
        validationResult = await this.integrationService.validateCNPJ(
          credential.cnpj,
        );

        // Salva no cache se válido (30 dias)
        if (validationResult.isValid) {
          await this.cacheManager.set(
            cacheKey,
            validationResult,
            this.CACHE_TTL,
          );
          this.logger.log(
            `Validação de CNPJ ${this.formatCNPJ(credential.cnpj)} salva em cache`,
          );
        }
      }

      // Salva resultado da validação no banco
      const validation = await this.saveValidationResult(
        credentialId,
        validationResult,
      );

      if (validationResult.isValid && validationResult.data) {
        // Validação bem sucedida - atualiza dados da empresa
        await this.updateCredentialWithValidationData(
          credentialId,
          validationResult.data,
        );

        // Atualiza status para PENDING_COMPLIANCE
        await this.updateCredentialStatus(
          credentialId,
          SupplierCredentialStatus.VALIDATING,
          SupplierCredentialStatus.PENDING_COMPLIANCE,
          performedById,
          `CNPJ validado com sucesso. Situação: ${validationResult.data.situacao}`,
        );

        this.logger.log(`Validação concluída com sucesso para ${credentialId}`);

        // Envia notificação para marca
        await this.notificationsService
          .notifyBrandValidationComplete(credentialId, true)
          .catch((error) => {
            this.logger.error(`Falha ao enviar notificação: ${error.message}`);
          });

        return {
          success: true,
          validation,
          data: validationResult.data,
          nextStep: 'COMPLIANCE_ANALYSIS',
          message:
            'CNPJ validado com sucesso. Próximo passo: análise de compliance.',
        };
      } else {
        // Validação falhou
        await this.updateCredentialStatus(
          credentialId,
          SupplierCredentialStatus.VALIDATING,
          SupplierCredentialStatus.VALIDATION_FAILED,
          performedById,
          validationResult.error || 'Validação de CNPJ falhou',
        );

        this.logger.warn(
          `Validação falhou para ${credentialId}: ${validationResult.error}`,
        );

        // Envia notificação para marca
        await this.notificationsService
          .notifyBrandValidationComplete(credentialId, false)
          .catch((error) => {
            this.logger.error(`Falha ao enviar notificação: ${error.message}`);
          });

        return {
          success: false,
          validation,
          error: validationResult.error,
          nextStep: 'FIX_AND_RETRY',
          message:
            'Validação de CNPJ falhou. Verifique o CNPJ e tente novamente.',
        };
      }
    } catch (error) {
      // Erro inesperado
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error(
        `Erro ao processar validação ${credentialId}: ${errorMessage}`,
      );

      // Salva erro como validação falha
      await this.saveValidationResult(credentialId, {
        isValid: false,
        error: `Erro de sistema: ${errorMessage}`,
        source: 'SYSTEM_ERROR',
        timestamp: new Date(),
      });

      // Atualiza status para VALIDATION_FAILED
      await this.updateCredentialStatus(
        credentialId,
        SupplierCredentialStatus.VALIDATING,
        SupplierCredentialStatus.VALIDATION_FAILED,
        performedById,
        `Erro de sistema durante validação: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
        nextStep: 'RETRY',
        message:
          'Ocorreu um erro durante a validação. Tente novamente mais tarde.',
      };
    }
  }

  /**
   * Processa validação para CPF
   *
   * CPF não possui API pública de consulta como CNPJ.
   * Valida algoritmicamente e avança direto para PENDING_COMPLIANCE.
   */
  private async processCPFValidation(
    credentialId: string,
    credential: any,
    performedById: string,
  ) {
    // Atualiza status para VALIDATING
    await this.updateCredentialStatus(
      credentialId,
      credential.status,
      SupplierCredentialStatus.VALIDATING,
      performedById,
      'Processando validação de CPF',
    );

    // CPF validated algorithmically (check digits already passed via DTO)
    const validationResult = {
      isValid: true,
      source: 'ALGORITHMIC',
      data: null,
      timestamp: new Date(),
    };

    // Salva resultado da validação no banco
    const validation = await this.saveValidationResult(
      credentialId,
      validationResult,
    );

    // Atualiza status para PENDING_COMPLIANCE
    await this.updateCredentialStatus(
      credentialId,
      SupplierCredentialStatus.VALIDATING,
      SupplierCredentialStatus.PENDING_COMPLIANCE,
      performedById,
      'CPF validado algoritmicamente. Sem consulta pública disponível.',
    );

    this.logger.log(
      `CPF validado algoritmicamente para credential ${credentialId}`,
    );

    // Envia notificação para marca
    await this.notificationsService
      .notifyBrandValidationComplete(credentialId, true)
      .catch((error) => {
        this.logger.error(`Falha ao enviar notificação: ${error.message}`);
      });

    return {
      success: true,
      validation,
      data: null,
      nextStep: 'COMPLIANCE_ANALYSIS',
      message:
        'CPF validado com sucesso. Próximo passo: análise de compliance.',
    };
  }

  // ==================== REVALIDATE ====================

  /**
   * Revalida um CNPJ (permite de mais status)
   *
   * - Similar ao startValidation, mas aceita mais status
   * - Incrementa retryCount na validação anterior
   * - Útil quando dados foram corrigidos ou APIs estavam indisponíveis
   */
  async revalidate(credentialId: string, user: AuthUser) {
    const companyId = user.brandId || user.companyId;

    // Busca e valida credential
    const credential = await this.findAndValidateCredential(
      credentialId,
      companyId,
    );

    // Valida status permite revalidação
    if (!this.REVALIDATABLE_STATUSES.includes(credential.status)) {
      throw new BadRequestException(
        `Credenciamento com status "${credential.status}" não pode ser revalidado. ` +
          `Status permitidos: ${this.REVALIDATABLE_STATUSES.join(', ')}`,
      );
    }

    // Incrementa retryCount nas validações anteriores
    await this.prisma.credentialValidation.updateMany({
      where: { credentialId },
      data: { retryCount: { increment: 1 } },
    });

    // Atualiza status para PENDING_VALIDATION
    await this.updateCredentialStatus(
      credentialId,
      credential.status,
      SupplierCredentialStatus.PENDING_VALIDATION,
      user.id,
      'Revalidação de CNPJ solicitada pelo usuário',
    );

    this.logger.log(`Revalidação iniciada para credential ${credentialId}`);

    // Processa validação
    const result = await this.processValidation(credentialId, user.id);

    return {
      ...result,
      isRevalidation: true,
    };
  }

  // ==================== GET VALIDATIONS ====================

  /**
   * Retorna histórico de validações de um credenciamento
   */
  async getValidations(credentialId: string, companyId: string) {
    // Valida que credential existe e pertence à marca
    await this.findAndValidateCredential(credentialId, companyId);

    return this.prisma.credentialValidation.findMany({
      where: { credentialId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        source: true,
        isValid: true,
        companyStatus: true,
        companyType: true,
        mainActivity: true,
        foundedAt: true,
        errorMessage: true,
        retryCount: true,
        validatedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Alias para getValidations (compatibilidade)
   */
  async getValidationHistory(credentialId: string) {
    return this.prisma.credentialValidation.findMany({
      where: { credentialId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Valida CNPJ e retorna resultado (método legado)
   */
  async validateCNPJ(cnpj: string, credentialId: string) {
    const result = await this.integrationService.validateCNPJ(cnpj);
    await this.saveValidationResult(credentialId, result);
    return result;
  }

  /**
   * Verifica se CNPJ já está cadastrado para esta marca
   */
  async checkDuplicateCNPJ(
    cnpj: string,
    brandId: string,
    excludeCredentialId?: string,
  ): Promise<boolean> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    const existing = await this.prisma.supplierCredential.findFirst({
      where: {
        cnpj: cleanCnpj,
        brandId,
        id: excludeCredentialId ? { not: excludeCredentialId } : undefined,
        status: { notIn: [SupplierCredentialStatus.BLOCKED] },
      },
    });

    return !!existing;
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
   * Salva resultado da validação no banco
   */
  private async saveValidationResult(credentialId: string, result: any) {
    return this.prisma.credentialValidation.create({
      data: {
        credentialId,
        source: this.mapSource(result.source),
        isValid: result.isValid,
        companyStatus: result.data?.situacao,
        companyType: result.data?.naturezaJuridica,
        mainActivity: result.data?.atividadePrincipal,
        secondaryActivities: result.data?.atividadesSecundarias || [],
        foundedAt: result.data?.dataAbertura
          ? new Date(result.data.dataAbertura)
          : null,
        capitalStock: result.data?.capitalSocial,
        partnerNames: result.data?.socios || [],
        rawResponse: result.rawResponse as object | undefined,
        parsedData: result.data as object | undefined,
        errorMessage: result.error,
        validatedAt: result.isValid ? new Date() : null,
        expiresAt: result.isValid
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
          : null,
      },
    });
  }

  /**
   * Atualiza dados da empresa com resultado da validação
   */
  private async updateCredentialWithValidationData(
    credentialId: string,
    data: any,
  ) {
    const updateData: any = {};

    if (data.razaoSocial) updateData.legalName = data.razaoSocial;
    if (data.nomeFantasia && !updateData.tradeName)
      updateData.tradeName = data.nomeFantasia;

    // Endereço
    if (data.logradouro) updateData.addressStreet = data.logradouro;
    if (data.numero) updateData.addressNumber = data.numero;
    if (data.complemento) updateData.addressComplement = data.complemento;
    if (data.bairro) updateData.addressNeighborhood = data.bairro;
    if (data.municipio) updateData.addressCity = data.municipio;
    if (data.uf) updateData.addressState = data.uf;
    if (data.cep) updateData.addressZipCode = data.cep.replace(/\D/g, '');

    if (Object.keys(updateData).length > 0) {
      await this.prisma.supplierCredential.update({
        where: { id: credentialId },
        data: updateData,
      });

      this.logger.log(
        `Dados da empresa atualizados para credential ${credentialId}`,
      );
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

  /**
   * Mapeia fonte de validação para enum
   */
  private mapSource(source: string): ValidationSource {
    const mapping: Record<string, ValidationSource> = {
      BRASIL_API: ValidationSource.RECEITA_FEDERAL,
      RECEITAWS: ValidationSource.RECEITA_FEDERAL,
      RECEITA_FEDERAL: ValidationSource.RECEITA_FEDERAL,
      SERASA: ValidationSource.SERASA,
      SPC: ValidationSource.SPC,
      SINTEGRA: ValidationSource.SINTEGRA,
      ALGORITHMIC: ValidationSource.MANUAL, // CPF algorithmic validation maps to MANUAL
    };

    return mapping[source] || ValidationSource.MANUAL;
  }

  /**
   * Formata CNPJ para exibição
   */
  private formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }
}
