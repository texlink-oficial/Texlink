import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import {
    SupplierCredentialStatus,
    RiskLevel,
    ManualReviewStatus,
} from '@prisma/client';

interface AuthUser {
    id: string;
    companyId: string;
    brandId?: string;
}

interface ComplianceScores {
    creditScore: number;
    taxScore: number;
    legalScore: number;
    overallScore: number;
}

interface ComplianceFlags {
    hasActiveCNPJ: boolean;
    hasRegularTaxStatus: boolean;
    hasNegativeCredit: boolean;
    hasLegalIssues: boolean;
    hasRelatedRestrictions: boolean;
}

/**
 * Serviço responsável pela análise de compliance de facções
 * 
 * Gerencia o fluxo de compliance:
 * 1. Análise automática (analyzeCompliance)
 * 2. Aprovação manual (approveCompliance)
 * 3. Rejeição manual (rejectCompliance)
 * 4. Consulta de análise (getCompliance)
 */
@Injectable()
export class ComplianceService {
    private readonly logger = new Logger(ComplianceService.name);

    // Status que permitem análise de compliance
    private readonly ANALYZABLE_STATUSES: SupplierCredentialStatus[] = [
        SupplierCredentialStatus.PENDING_COMPLIANCE,
        SupplierCredentialStatus.COMPLIANCE_REJECTED,
    ];

    // Pesos para cálculo do score overall
    private readonly SCORE_WEIGHTS = {
        credit: 0.4,   // 40% peso crédito
        tax: 0.35,     // 35% peso fiscal
        legal: 0.25,   // 25% peso legal
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly integrationService: IntegrationService,
    ) { }

    // ==================== ANALYZE COMPLIANCE ====================

    /**
     * Executa análise completa de compliance
     * 
     * - Busca credential com validações
     * - Chama IntegrationService.analyzeCredit
     * - Calcula scores (credit, tax, legal, overall)
     * - Determina riskLevel e recommendation
     * - Salva ComplianceAnalysis
     * - Atualiza status do credential
     */
    async analyzeCompliance(credentialId: string, performedById?: string) {
        // Busca credential com validações
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
            include: {
                validations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!credential) {
            throw new NotFoundException(`Credenciamento ${credentialId} não encontrado`);
        }

        // Valida status
        if (!this.ANALYZABLE_STATUSES.includes(credential.status)) {
            throw new BadRequestException(
                `Credenciamento com status "${credential.status}" não pode ser analisado. ` +
                `Status permitidos: ${this.ANALYZABLE_STATUSES.join(', ')}`,
            );
        }

        this.logger.log(`Iniciando análise de compliance para ${credentialId}`);

        // Obtém última validação
        const lastValidation = credential.validations[0];

        // Chama API de análise de crédito (mock por enquanto)
        const creditResult = await this.integrationService.analyzeCredit(credential.cnpj);

        // Calcula scores
        const scores = this.calculateScores(lastValidation, creditResult);

        // Determina nível de risco
        const riskLevel = this.determineRiskLevel(scores.overallScore);

        // Define flags
        const flags = this.determineFlags(lastValidation, creditResult);

        // Gera recomendação
        const recommendation = this.generateRecommendation(riskLevel, flags);

        // Fatores de risco identificados
        const riskFactors = this.identifyRiskFactors(lastValidation, creditResult, flags);

        // Salva ou atualiza análise de compliance
        const analysis = await this.prisma.complianceAnalysis.upsert({
            where: { credentialId },
            create: {
                credentialId,
                overallScore: scores.overallScore,
                creditScore: scores.creditScore,
                taxScore: scores.taxScore,
                legalScore: scores.legalScore,
                riskLevel,
                riskFactors: riskFactors as object,
                hasActiveCNPJ: flags.hasActiveCNPJ,
                hasRegularTaxStatus: flags.hasRegularTaxStatus,
                hasNegativeCredit: flags.hasNegativeCredit,
                hasLegalIssues: flags.hasLegalIssues,
                hasRelatedRestrictions: flags.hasRelatedRestrictions,
                recommendation: recommendation.action,
                recommendationReason: recommendation.reason,
                requiresManualReview: recommendation.requiresManualReview,
                manualReviewStatus: recommendation.requiresManualReview
                    ? ManualReviewStatus.PENDING
                    : null,
            },
            update: {
                overallScore: scores.overallScore,
                creditScore: scores.creditScore,
                taxScore: scores.taxScore,
                legalScore: scores.legalScore,
                riskLevel,
                riskFactors: riskFactors as object,
                hasActiveCNPJ: flags.hasActiveCNPJ,
                hasRegularTaxStatus: flags.hasRegularTaxStatus,
                hasNegativeCredit: flags.hasNegativeCredit,
                hasLegalIssues: flags.hasLegalIssues,
                hasRelatedRestrictions: flags.hasRelatedRestrictions,
                recommendation: recommendation.action,
                recommendationReason: recommendation.reason,
                requiresManualReview: recommendation.requiresManualReview,
                manualReviewStatus: recommendation.requiresManualReview
                    ? ManualReviewStatus.PENDING
                    : undefined,
                // Reset manual review se está sendo reanalisado
                reviewedById: null,
                reviewedAt: null,
                manualReviewNotes: null,
            },
        });

        // Atualiza status do credential baseado na recomendação
        const newStatus = this.getStatusFromRecommendation(recommendation);

        await this.updateCredentialStatus(
            credentialId,
            credential.status,
            newStatus,
            performedById || 'SYSTEM',
            recommendation.reason,
        );

        this.logger.log(
            `Análise de compliance concluída para ${credentialId}: ` +
            `Risk=${riskLevel}, Score=${scores.overallScore}, Action=${recommendation.action}`,
        );

        return {
            analysis,
            scores,
            riskLevel,
            flags,
            recommendation,
            nextStep: recommendation.requiresManualReview
                ? 'MANUAL_REVIEW'
                : recommendation.action === 'APPROVE'
                    ? 'SEND_INVITATION'
                    : 'REVIEW_AND_FIX',
        };
    }

    // ==================== APPROVE COMPLIANCE ====================

    /**
     * Aprova compliance manualmente
     *
     * - Valida que análise existe e requer revisão manual
     * - Valida transição de status permitida
     * - Atualiza ComplianceAnalysis com dados da aprovação
     * - Atualiza status para COMPLIANCE_APPROVED
     */
    async approveCompliance(credentialId: string, notes: string, user: AuthUser) {
        const companyId = user.brandId || user.companyId;

        // Busca credential e valida propriedade
        const credential = await this.findAndValidateCredential(credentialId, companyId);

        // Busca análise de compliance
        const analysis = await this.prisma.complianceAnalysis.findUnique({
            where: { credentialId },
        });

        if (!analysis) {
            throw new BadRequestException(
                'Credenciamento não possui análise de compliance. Execute a análise primeiro.',
            );
        }

        // Valida que está pendente de revisão manual
        if (!analysis.requiresManualReview || analysis.manualReviewStatus !== ManualReviewStatus.PENDING) {
            throw new BadRequestException(
                'Credenciamento não está pendente de revisão manual. ' +
                `Status atual da revisão: ${analysis.manualReviewStatus || 'Nenhum'}`,
            );
        }

        // Valida status do credential
        const approvableStatuses: SupplierCredentialStatus[] = [
            SupplierCredentialStatus.PENDING_COMPLIANCE,
            SupplierCredentialStatus.COMPLIANCE_REJECTED, // Permite reaprovar após rejeição
        ];

        if (!approvableStatuses.includes(credential.status as SupplierCredentialStatus)) {
            throw new BadRequestException(
                `Credenciamento com status "${credential.status}" não pode ser aprovado. ` +
                `Status permitidos: ${approvableStatuses.join(', ')}`,
            );
        }

        this.logger.log(
            `Aprovando compliance manualmente para ${credentialId} por usuário ${user.id}`,
        );

        // Atualiza análise de compliance com dados da aprovação manual
        const updatedAnalysis = await this.prisma.complianceAnalysis.update({
            where: { credentialId },
            data: {
                manualReviewStatus: ManualReviewStatus.APPROVED,
                manualReviewNotes: notes,
                reviewedById: user.id,
                reviewedAt: new Date(),
                recommendation: 'APPROVE',
                recommendationReason: `Aprovado manualmente por ${user.id}: ${notes}`,
            },
        });

        // Atualiza status para COMPLIANCE_APPROVED
        await this.updateCredentialStatus(
            credentialId,
            credential.status,
            SupplierCredentialStatus.COMPLIANCE_APPROVED,
            user.id,
            `Compliance aprovado manualmente: ${notes}`,
        );

        this.logger.log(`Compliance aprovado com sucesso para ${credentialId}`);

        return {
            success: true,
            analysis: updatedAnalysis,
            message: 'Compliance aprovado com sucesso. Credenciamento pode prosseguir para envio de convite.',
            nextStep: 'SEND_INVITATION',
        };
    }

    // ==================== REJECT COMPLIANCE ====================

    /**
     * Rejeita compliance manualmente
     *
     * - Valida que análise existe e está pendente de revisão
     * - Valida transição de status permitida
     * - Atualiza ComplianceAnalysis com dados da rejeição (reason + notes)
     * - Atualiza status para COMPLIANCE_REJECTED
     */
    async rejectCompliance(credentialId: string, reason: string, notes: string, user: AuthUser) {
        const companyId = user.brandId || user.companyId;

        // Busca credential e valida propriedade
        const credential = await this.findAndValidateCredential(credentialId, companyId);

        // Busca análise de compliance
        const analysis = await this.prisma.complianceAnalysis.findUnique({
            where: { credentialId },
        });

        if (!analysis) {
            throw new BadRequestException(
                'Credenciamento não possui análise de compliance. Execute a análise primeiro.',
            );
        }

        // Valida que está pendente de revisão manual
        if (!analysis.requiresManualReview || analysis.manualReviewStatus !== ManualReviewStatus.PENDING) {
            throw new BadRequestException(
                'Credenciamento não está pendente de revisão manual. ' +
                `Status atual da revisão: ${analysis.manualReviewStatus || 'Nenhum'}`,
            );
        }

        // Valida status do credential
        const rejectableStatuses: SupplierCredentialStatus[] = [
            SupplierCredentialStatus.PENDING_COMPLIANCE,
            SupplierCredentialStatus.COMPLIANCE_APPROVED, // Permite rejeitar após aprovação automática
        ];

        if (!rejectableStatuses.includes(credential.status as SupplierCredentialStatus)) {
            throw new BadRequestException(
                `Credenciamento com status "${credential.status}" não pode ser rejeitado. ` +
                `Status permitidos: ${rejectableStatuses.join(', ')}`,
            );
        }

        this.logger.log(
            `Rejeitando compliance manualmente para ${credentialId} por usuário ${user.id}. Motivo: ${reason}`,
        );

        // Atualiza análise de compliance com dados da rejeição
        const updatedAnalysis = await this.prisma.complianceAnalysis.update({
            where: { credentialId },
            data: {
                manualReviewStatus: ManualReviewStatus.REJECTED,
                manualReviewNotes: `${reason}\n\n${notes}`,
                reviewedById: user.id,
                reviewedAt: new Date(),
                recommendation: 'REJECT',
                recommendationReason: `Rejeitado manualmente por ${user.id}: ${reason}`,
            },
        });

        // Atualiza status para COMPLIANCE_REJECTED
        await this.updateCredentialStatus(
            credentialId,
            credential.status,
            SupplierCredentialStatus.COMPLIANCE_REJECTED,
            user.id,
            `Compliance rejeitado: ${reason}`,
        );

        this.logger.log(`Compliance rejeitado com sucesso para ${credentialId}`);

        return {
            success: true,
            analysis: updatedAnalysis,
            message: 'Compliance rejeitado. Credenciamento bloqueado.',
            nextStep: 'ARCHIVED',
        };
    }

    // ==================== GET COMPLIANCE ====================

    /**
     * Retorna análise de compliance de um credenciamento
     */
    async getCompliance(credentialId: string, companyId: string) {
        // Valida que credential pertence à marca
        await this.findAndValidateCredential(credentialId, companyId);

        const analysis = await this.prisma.complianceAnalysis.findUnique({
            where: { credentialId },
            include: {
                reviewedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!analysis) {
            return null;
        }

        return analysis;
    }

    /**
     * Retorna credenciamentos pendentes de revisão manual
     */
    async getPendingReviews(companyId?: string) {
        const where: any = {
            requiresManualReview: true,
            manualReviewStatus: ManualReviewStatus.PENDING,
        };

        if (companyId) {
            where.credential = { brandId: companyId };
        }

        return this.prisma.complianceAnalysis.findMany({
            where,
            include: {
                credential: {
                    select: {
                        id: true,
                        cnpj: true,
                        tradeName: true,
                        legalName: true,
                        contactName: true,
                        contactEmail: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: [
                { riskLevel: 'desc' }, // CRITICAL primeiro
                { createdAt: 'asc' },  // Mais antigos primeiro
            ],
        });
    }

    /**
     * Método legado para análise de crédito simples
     */
    async analyzeCredit(cnpj: string, credentialId: string) {
        const result = await this.integrationService.analyzeCredit(cnpj);

        if (!result) {
            return null;
        }

        return {
            analysis: await this.prisma.complianceAnalysis.upsert({
                where: { credentialId },
                create: {
                    credentialId,
                    riskLevel: result.riskLevel,
                    creditScore: result.score,
                    overallScore: result.score,
                    hasNegativeCredit: result.hasNegatives,
                    recommendation: this.getRecommendationFromRisk(result.riskLevel),
                    recommendationReason: result.recommendations?.join('; '),
                    requiresManualReview: result.riskLevel === RiskLevel.HIGH || result.riskLevel === RiskLevel.CRITICAL,
                },
                update: {
                    riskLevel: result.riskLevel,
                    creditScore: result.score,
                    overallScore: result.score,
                    hasNegativeCredit: result.hasNegatives,
                    recommendation: this.getRecommendationFromRisk(result.riskLevel),
                    recommendationReason: result.recommendations?.join('; '),
                    requiresManualReview: result.riskLevel === RiskLevel.HIGH || result.riskLevel === RiskLevel.CRITICAL,
                },
            }),
            result,
        };
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Busca credential e valida que pertence à marca
     */
    private async findAndValidateCredential(credentialId: string, companyId: string) {
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential) {
            throw new NotFoundException(`Credenciamento ${credentialId} não encontrado`);
        }

        if (credential.brandId !== companyId) {
            throw new ForbiddenException('Credenciamento pertence a outra marca');
        }

        return credential;
    }

    /**
     * Calcula scores de compliance refinado
     *
     * - Credit Score: Analisa score, dívidas e negativações
     * - Tax Score: Considera status CNPJ e regularidade fiscal
     * - Legal Score: Analisa questões legais e tempo de existência
     * - Overall Score: Média ponderada com ajustes por fatores críticos
     */
    private calculateScores(validation: any, creditResult: any): ComplianceScores {
        // ===== CREDIT SCORE (0-100) =====
        let creditScore = 50; // Base neutro

        if (creditResult?.score) {
            // Normaliza score de 0-1000 para 0-100
            creditScore = Math.round(creditResult.score / 10);

            // Penaliza por negativações ativas
            if (creditResult.hasNegatives) {
                creditScore = Math.max(0, creditScore - 20);
            }

            // Penaliza por dívidas altas (se disponível)
            if (creditResult.debtAmount && creditResult.debtAmount > 50000) {
                const debtPenalty = Math.min(15, Math.floor(creditResult.debtAmount / 10000));
                creditScore = Math.max(0, creditScore - debtPenalty);
            }
        } else if (creditResult?.hasNegatives) {
            // Se não temos score mas sabemos que tem negativações
            creditScore = 30;
        }

        // ===== TAX SCORE (0-100) =====
        let taxScore = 50; // Default neutro

        if (validation?.companyStatus) {
            const status = validation.companyStatus.toUpperCase();

            if (status === 'ATIVA' || status === 'REGULAR') {
                taxScore = 100;
            } else if (status === 'SUSPENSA') {
                taxScore = 30;
            } else if (status === 'INAPTA') {
                taxScore = 10;
            } else if (status === 'BAIXADA' || status === 'CANCELADA') {
                taxScore = 0;
            }
        }

        // Bonus por capital social alto (indica solidez)
        if (validation?.capitalStock && validation.capitalStock > 100000) {
            taxScore = Math.min(100, taxScore + 5);
        }

        // ===== LEGAL SCORE (0-100) =====
        let legalScore = 100; // Assume sem problemas por padrão

        // Penaliza por negativações (issues legais/financeiros)
        if (creditResult?.hasNegatives) {
            legalScore -= 30;
        }

        // Penaliza por processos judiciais (se disponível)
        if (creditResult?.legalIssues) {
            legalScore -= 25;
        }

        // Considera tempo de existência da empresa
        if (validation?.foundedAt) {
            const foundedDate = new Date(validation.foundedAt);
            const yearsActive = (Date.now() - foundedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

            if (yearsActive < 1) {
                // Empresa muito nova - risco maior
                legalScore = Math.max(0, legalScore - 20);
            } else if (yearsActive < 2) {
                legalScore = Math.max(0, legalScore - 10);
            } else if (yearsActive >= 5) {
                // Empresa estabelecida - bonus
                legalScore = Math.min(100, legalScore + 10);
            }
        }

        legalScore = Math.max(0, legalScore);

        // ===== OVERALL SCORE (média ponderada) =====
        let overallScore = Math.round(
            creditScore * this.SCORE_WEIGHTS.credit +
            taxScore * this.SCORE_WEIGHTS.tax +
            legalScore * this.SCORE_WEIGHTS.legal,
        );

        // Ajustes críticos no overall score
        // CNPJ inativo é sempre score muito baixo
        if (validation?.companyStatus) {
            const status = validation.companyStatus.toUpperCase();
            if (status === 'BAIXADA' || status === 'CANCELADA') {
                overallScore = Math.min(overallScore, 20);
            } else if (status === 'INAPTA') {
                overallScore = Math.min(overallScore, 40);
            }
        }

        // Negativações múltiplas reduzem score drasticamente
        if (creditResult?.hasNegatives && creditResult?.debtAmount > 100000) {
            overallScore = Math.min(overallScore, 45);
        }

        return {
            creditScore: Math.round(creditScore),
            taxScore: Math.round(taxScore),
            legalScore: Math.round(legalScore),
            overallScore: Math.round(overallScore)
        };
    }

    /**
     * Determina nível de risco baseado no score overall
     */
    private determineRiskLevel(overallScore: number): RiskLevel {
        if (overallScore >= 70) return RiskLevel.LOW;
        if (overallScore >= 50) return RiskLevel.MEDIUM;
        if (overallScore >= 30) return RiskLevel.HIGH;
        return RiskLevel.CRITICAL;
    }

    /**
     * Define flags de compliance
     */
    private determineFlags(validation: any, creditResult: any): ComplianceFlags {
        const status = validation?.companyStatus?.toUpperCase() || '';

        return {
            hasActiveCNPJ: status === 'ATIVA' || status === 'REGULAR',
            hasRegularTaxStatus: status === 'ATIVA' || status === 'REGULAR',
            hasNegativeCredit: creditResult?.hasNegatives || false,
            hasLegalIssues: false, // TODO: Integrar com APIs de processos judiciais
            hasRelatedRestrictions: false, // TODO: Integrar com APIs de restrições
        };
    }

    /**
     * Gera recomendação baseada no risco e flags
     */
    private generateRecommendation(
        riskLevel: RiskLevel,
        flags: ComplianceFlags,
    ): { action: string; reason: string; requiresManualReview: boolean } {
        // CNPJ inativo é sempre rejeição
        if (!flags.hasActiveCNPJ) {
            return {
                action: 'REJECT',
                reason: 'CNPJ não está ativo na Receita Federal',
                requiresManualReview: false,
            };
        }

        // Por nível de risco
        switch (riskLevel) {
            case RiskLevel.LOW:
                return {
                    action: 'APPROVE',
                    reason: 'Análise de compliance aprovada automaticamente. Baixo risco.',
                    requiresManualReview: false,
                };

            case RiskLevel.MEDIUM:
                return {
                    action: 'APPROVE',
                    reason: 'Análise de compliance aprovada. Risco médio - acompanhar.',
                    requiresManualReview: false,
                };

            case RiskLevel.HIGH:
                return {
                    action: 'MANUAL_REVIEW',
                    reason: 'Risco alto identificado. Requer aprovação manual.',
                    requiresManualReview: true,
                };

            case RiskLevel.CRITICAL:
                return {
                    action: 'REJECT',
                    reason: 'Risco crítico identificado. Recomendação de rejeição.',
                    requiresManualReview: true, // Permite override manual
                };

            default:
                return {
                    action: 'MANUAL_REVIEW',
                    reason: 'Não foi possível determinar risco. Requer revisão manual.',
                    requiresManualReview: true,
                };
        }
    }

    /**
     * Identifica fatores de risco de forma abrangente
     */
    private identifyRiskFactors(
        validation: any,
        creditResult: any,
        flags: ComplianceFlags,
    ): string[] {
        const factors: string[] = [];

        // === FATORES CRÍTICOS (risco alto) ===
        if (!flags.hasActiveCNPJ) {
            factors.push('CNPJ não está ativo - Status: ' + (validation?.companyStatus || 'Desconhecido'));
        }

        if (validation?.companyStatus?.toUpperCase() === 'BAIXADA') {
            factors.push('Empresa com CNPJ baixado na Receita Federal');
        }

        if (validation?.companyStatus?.toUpperCase() === 'CANCELADA') {
            factors.push('Empresa com CNPJ cancelado');
        }

        // === FATORES FISCAIS ===
        if (!flags.hasRegularTaxStatus) {
            factors.push('Situação fiscal irregular');
        }

        if (validation?.companyStatus?.toUpperCase() === 'INAPTA') {
            factors.push('Empresa inapta perante a Receita Federal');
        }

        if (validation?.companyStatus?.toUpperCase() === 'SUSPENSA') {
            factors.push('Empresa com atividades suspensas');
        }

        // === FATORES DE CRÉDITO ===
        if (flags.hasNegativeCredit) {
            if (creditResult?.debtAmount) {
                factors.push(`Possui negativações no mercado (Total: R$ ${creditResult.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
            } else {
                factors.push('Possui negativações ativas no mercado');
            }
        }

        if (creditResult?.score && creditResult.score < 300) {
            factors.push('Score de crédito crítico (abaixo de 300)');
        } else if (creditResult?.score && creditResult.score < 500) {
            factors.push('Score de crédito baixo (abaixo de 500)');
        }

        // Dívidas altas sem necessariamente ter negativações
        if (creditResult?.debtAmount && creditResult.debtAmount > 100000 && !flags.hasNegativeCredit) {
            factors.push('Valor elevado de dívidas registradas');
        }

        // === FATORES LEGAIS ===
        if (flags.hasLegalIssues) {
            factors.push('Possui processos judiciais ativos');
        }

        if (flags.hasRelatedRestrictions) {
            factors.push('Possui restrições relacionadas a sócios ou empresas vinculadas');
        }

        if (creditResult?.legalIssues) {
            factors.push('Identificados problemas legais na análise');
        }

        // === FATORES DE EXPERIÊNCIA ===
        // Empresa muito nova (menos de 1 ano)
        if (validation?.foundedAt) {
            const foundedDate = new Date(validation.foundedAt);
            const now = new Date();
            const yearsActive = (now.getTime() - foundedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

            if (yearsActive < 1) {
                factors.push('Empresa com menos de 1 ano de atividade (risco de inexperiência)');
            } else if (yearsActive < 2) {
                factors.push('Empresa com menos de 2 anos de atividade');
            }
        }

        // Capital social muito baixo
        if (validation?.capitalStock && validation.capitalStock < 10000) {
            factors.push('Capital social muito baixo (menor que R$ 10.000)');
        }

        // === RECOMENDAÇÕES EXTERNAS ===
        if (creditResult?.recommendations && Array.isArray(creditResult.recommendations)) {
            factors.push(...creditResult.recommendations);
        }

        // === SEM FATORES DE RISCO ===
        if (factors.length === 0) {
            factors.push('Nenhum fator de risco identificado - Perfil adequado');
        }

        return factors;
    }

    /**
     * Define status do credential baseado na recomendação
     */
    private getStatusFromRecommendation(
        recommendation: { action: string; requiresManualReview: boolean },
    ): SupplierCredentialStatus {
        if (recommendation.action === 'APPROVE' && !recommendation.requiresManualReview) {
            return SupplierCredentialStatus.INVITATION_PENDING;
        }

        if (recommendation.action === 'REJECT' && !recommendation.requiresManualReview) {
            return SupplierCredentialStatus.COMPLIANCE_REJECTED;
        }

        // Precisa de revisão manual
        return SupplierCredentialStatus.PENDING_COMPLIANCE;
    }

    /**
     * Recomendação simples baseada em risco
     */
    private getRecommendationFromRisk(riskLevel: RiskLevel): string {
        switch (riskLevel) {
            case RiskLevel.LOW:
            case RiskLevel.MEDIUM:
                return 'APPROVE';
            case RiskLevel.HIGH:
                return 'MANUAL_REVIEW';
            case RiskLevel.CRITICAL:
                return 'REJECT';
            default:
                return 'MANUAL_REVIEW';
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
