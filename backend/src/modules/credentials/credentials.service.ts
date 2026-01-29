import {
    Injectable,
    Logger,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierCredentialStatus } from '@prisma/client';
import {
    CreateCredentialDto,
    UpdateCredentialDto,
    CredentialFiltersDto,
    PaginatedCredentialsResponseDto,
} from './dto';

interface AuthUser {
    id: string;
    companyId: string;
    brandId?: string;
}

/**
 * Serviço principal de gerenciamento de credenciamentos
 * 
 * Gerencia todo o ciclo de vida dos credenciamentos de facções:
 * - CRUD completo com validações de negócio
 * - Controle de status e transições
 * - Histórico de alterações
 * - Estatísticas e métricas
 */
@Injectable()
export class CredentialsService {
    private readonly logger = new Logger(CredentialsService.name);

    // Status que permitem edição
    private readonly EDITABLE_STATUSES: SupplierCredentialStatus[] = [
        SupplierCredentialStatus.DRAFT,
        SupplierCredentialStatus.VALIDATION_FAILED,
        SupplierCredentialStatus.COMPLIANCE_REJECTED,
    ];

    // Status que permitem remoção
    private readonly REMOVABLE_STATUSES: SupplierCredentialStatus[] = [
        SupplierCredentialStatus.DRAFT,
        SupplierCredentialStatus.VALIDATION_FAILED,
        SupplierCredentialStatus.COMPLIANCE_REJECTED,
        SupplierCredentialStatus.INVITATION_EXPIRED,
    ];

    constructor(private readonly prisma: PrismaService) { }

    // ==================== CREATE ====================

    /**
     * Cria um novo credenciamento
     * 
     * - Valida se CNPJ já não está cadastrado para esta marca
     * - Limpa e formata CNPJ
     * - Cria registro com status DRAFT
     * - Cria entrada no histórico de status
     */
    async create(dto: CreateCredentialDto, user: AuthUser) {
        const brandId = user.brandId || user.companyId;
        const cleanCnpj = this.cleanCNPJ(dto.cnpj);

        // Valida duplicidade de CNPJ para esta marca
        const existingCredential = await this.prisma.supplierCredential.findFirst({
            where: {
                brandId,
                cnpj: cleanCnpj,
                status: { notIn: [SupplierCredentialStatus.BLOCKED] },
            },
        });

        if (existingCredential) {
            throw new ConflictException(
                `CNPJ ${this.formatCNPJ(cleanCnpj)} já possui credenciamento ativo (ID: ${existingCredential.id})`,
            );
        }

        // Cria o credenciamento
        const credential = await this.prisma.supplierCredential.create({
            data: {
                cnpj: cleanCnpj,
                contactName: dto.contactName.trim(),
                contactEmail: dto.contactEmail.toLowerCase().trim(),
                contactPhone: this.cleanPhone(dto.contactPhone),
                contactWhatsapp: dto.contactWhatsapp ? this.cleanPhone(dto.contactWhatsapp) : null,
                tradeName: dto.tradeName?.trim() || null,
                internalCode: dto.internalCode?.trim() || null,
                category: dto.category?.trim() || null,
                notes: dto.notes?.trim() || null,
                priority: dto.priority ?? 0,
                status: SupplierCredentialStatus.DRAFT,
                brandId,
                createdById: user.id,
            },
            include: {
                brand: { select: { id: true, tradeName: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });

        // Registra no histórico de status
        await this.createStatusHistory(
            credential.id,
            null,
            SupplierCredentialStatus.DRAFT,
            user.id,
            'Credenciamento criado',
        );

        this.logger.log(`Credenciamento criado: ${credential.id} (CNPJ: ${this.formatCNPJ(cleanCnpj)})`);
        return credential;
    }

    // ==================== FIND ALL ====================

    /**
     * Lista credenciamentos com filtros e paginação
     * 
     * Filtros disponíveis:
     * - search: busca em cnpj, tradeName, legalName, contactName, contactEmail
     * - status/statuses: filtro por status
     * - category: filtro por categoria
     * - createdFrom/createdTo: filtro por data de criação
     * - Paginação e ordenação
     */
    async findAll(
        companyId: string,
        filters: CredentialFiltersDto,
    ): Promise<PaginatedCredentialsResponseDto> {
        const {
            search,
            status,
            statuses,
            category,
            createdFrom,
            createdTo,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = filters;

        // Monta where clause
        const where: any = { brandId: companyId };

        // Filtro de busca multi-campo
        if (search) {
            const searchTerm = search.trim();
            const cleanSearch = searchTerm.replace(/\D/g, ''); // Para busca de CNPJ

            where.OR = [
                { cnpj: { contains: cleanSearch || searchTerm } },
                { tradeName: { contains: searchTerm, mode: 'insensitive' } },
                { legalName: { contains: searchTerm, mode: 'insensitive' } },
                { contactName: { contains: searchTerm, mode: 'insensitive' } },
                { contactEmail: { contains: searchTerm.toLowerCase(), mode: 'insensitive' } },
                { internalCode: { contains: searchTerm, mode: 'insensitive' } },
            ];
        }

        // Filtro de status
        if (status) {
            where.status = status;
        } else if (statuses && statuses.length > 0) {
            where.status = { in: statuses };
        }

        // Filtro de categoria
        if (category) {
            where.category = category;
        }

        // Filtro de datas
        if (createdFrom || createdTo) {
            where.createdAt = {};
            if (createdFrom) {
                where.createdAt.gte = new Date(createdFrom);
            }
            if (createdTo) {
                // Inclui o dia inteiro
                const endDate = new Date(createdTo);
                endDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDate;
            }
        }

        // Conta total de registros
        const total = await this.prisma.supplierCredential.count({ where });

        // Busca com paginação
        const data = await this.prisma.supplierCredential.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                createdBy: { select: { id: true, name: true } },
                compliance: {
                    select: { riskLevel: true, creditScore: true, overallScore: true },
                },
                _count: {
                    select: { invitations: true, validations: true },
                },
            },
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    // ==================== FIND ONE ====================

    /**
     * Busca um credenciamento por ID
     * 
     * Inclui todos os relacionamentos:
     * - validations: histórico de validações
     * - compliance: análise de compliance
     * - invitations: convites enviados
     * - onboarding: status do onboarding
     * - contract: contrato associado
     * - statusHistory: histórico de mudanças de status
     */
    async findOne(id: string, companyId: string) {
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id },
            include: {
                brand: { select: { id: true, tradeName: true, legalName: true } },
                supplier: { select: { id: true, tradeName: true, legalName: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                validations: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                compliance: {
                    include: {
                        reviewedBy: { select: { id: true, name: true } },
                    },
                },
                invitations: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                onboarding: true,
                contract: true,
                statusHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        performedBy: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!credential) {
            throw new NotFoundException(`Credenciamento ${id} não encontrado`);
        }

        // Valida que pertence à marca do usuário
        if (credential.brandId !== companyId) {
            throw new ForbiddenException('Credenciamento pertence a outra marca');
        }

        return credential;
    }

    // ==================== UPDATE ====================

    /**
     * Atualiza um credenciamento
     * 
     * - Valida que pertence à marca do usuário
     * - Valida que status permite edição (DRAFT, VALIDATION_FAILED, COMPLIANCE_REJECTED)
     * - Se mudou CNPJ, reseta validações
     */
    async update(id: string, dto: UpdateCredentialDto, user: AuthUser) {
        const companyId = user.brandId || user.companyId;
        const existing = await this.findOne(id, companyId);

        // Valida status permite edição
        if (!this.EDITABLE_STATUSES.includes(existing.status)) {
            throw new BadRequestException(
                `Credenciamento com status "${existing.status}" não pode ser editado. ` +
                `Status editáveis: ${this.EDITABLE_STATUSES.join(', ')}`,
            );
        }

        // Prepara dados para atualização
        const updateData: any = {};

        if (dto.contactName !== undefined) updateData.contactName = dto.contactName.trim();
        if (dto.contactEmail !== undefined) updateData.contactEmail = dto.contactEmail.toLowerCase().trim();
        if (dto.contactPhone !== undefined) updateData.contactPhone = this.cleanPhone(dto.contactPhone);
        if (dto.contactWhatsapp !== undefined) updateData.contactWhatsapp = dto.contactWhatsapp ? this.cleanPhone(dto.contactWhatsapp) : null;
        if (dto.tradeName !== undefined) updateData.tradeName = dto.tradeName?.trim() || null;
        if (dto.internalCode !== undefined) updateData.internalCode = dto.internalCode?.trim() || null;
        if (dto.category !== undefined) updateData.category = dto.category?.trim() || null;
        if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null;
        if (dto.priority !== undefined) updateData.priority = dto.priority;

        // Se CNPJ mudou, precisa revalidar
        let cnpjChanged = false;
        if (dto.cnpj !== undefined) {
            const cleanCnpj = this.cleanCNPJ(dto.cnpj);

            if (cleanCnpj !== existing.cnpj) {
                // Verifica duplicidade do novo CNPJ
                const duplicateCnpj = await this.prisma.supplierCredential.findFirst({
                    where: {
                        brandId: companyId,
                        cnpj: cleanCnpj,
                        id: { not: id },
                        status: { notIn: [SupplierCredentialStatus.BLOCKED] },
                    },
                });

                if (duplicateCnpj) {
                    throw new ConflictException(
                        `CNPJ ${this.formatCNPJ(cleanCnpj)} já possui outro credenciamento`,
                    );
                }

                updateData.cnpj = cleanCnpj;
                updateData.legalName = null; // Reset dados da validação
                cnpjChanged = true;
            }
        }

        // Atualiza o credenciamento
        const updated = await this.prisma.supplierCredential.update({
            where: { id },
            data: updateData,
            include: {
                brand: { select: { id: true, tradeName: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });

        // Se CNPJ mudou, invalida validações anteriores e reseta status
        if (cnpjChanged) {
            await this.prisma.credentialValidation.updateMany({
                where: { credentialId: id },
                data: { isValid: false },
            });

            // Volta para DRAFT se estava em outro status
            if (existing.status !== SupplierCredentialStatus.DRAFT) {
                await this.changeStatus(id, SupplierCredentialStatus.DRAFT, user.id, 'CNPJ alterado, necessita nova validação');
            }

            this.logger.log(`CNPJ alterado para credenciamento ${id}, validações resetadas`);
        }

        return updated;
    }

    // ==================== REMOVE ====================

    /**
     * Remove um credenciamento (soft delete)
     * 
     * Optamos por soft delete via status BLOCKED porque:
     * 1. Mantém histórico para auditoria
     * 2. Permite desbloqueio futuro se necessário
     * 3. Evita perda de dados relacionados (validações, convites, etc.)
     * 4. Preserva integridade referencial
     */
    async remove(id: string, user: AuthUser) {
        const companyId = user.brandId || user.companyId;
        const existing = await this.findOne(id, companyId);

        // Valida status permite remoção
        if (!this.REMOVABLE_STATUSES.includes(existing.status)) {
            throw new BadRequestException(
                `Credenciamento com status "${existing.status}" não pode ser removido. ` +
                `Status removíveis: ${this.REMOVABLE_STATUSES.join(', ')}. ` +
                `Para credenciamentos em andamento, use a opção de cancelar.`,
            );
        }

        // Soft delete via status BLOCKED
        await this.changeStatus(
            id,
            SupplierCredentialStatus.BLOCKED,
            user.id,
            'Credenciamento removido pelo usuário',
        );

        this.logger.log(`Credenciamento ${id} removido (soft delete) por ${user.id}`);

        return { success: true, message: 'Credenciamento removido com sucesso' };
    }

    // ==================== STATS ====================

    /**
     * Retorna estatísticas de credenciamentos
     * 
     * - Contagens por status
     * - Total de credenciamentos
     * - Credenciamentos este mês
     * - Taxa de conversão (ACTIVE / total)
     */
    async getStats(companyId: string) {
        // Contagem por status
        const byStatus = await this.prisma.supplierCredential.groupBy({
            by: ['status'],
            where: { brandId: companyId },
            _count: { id: true },
        });

        // Constrói objeto de contagens
        const statusCounts: Record<string, number> = {};
        let total = 0;
        let activeCount = 0;

        for (const item of byStatus) {
            const count = item._count?.id || 0;
            statusCounts[item.status] = count;
            total += count;

            if (item.status === SupplierCredentialStatus.ACTIVE) {
                activeCount = count;
            }
        }

        // Credenciamentos criados este mês
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const thisMonth = await this.prisma.supplierCredential.count({
            where: {
                brandId: companyId,
                createdAt: { gte: startOfMonth },
            },
        });

        // Credenciamentos completados este mês
        const completedThisMonth = await this.prisma.supplierCredential.count({
            where: {
                brandId: companyId,
                status: SupplierCredentialStatus.ACTIVE,
                completedAt: { gte: startOfMonth },
            },
        });

        // Pendentes de ação (que precisam de próximo passo)
        const pendingAction = await this.prisma.supplierCredential.count({
            where: {
                brandId: companyId,
                status: {
                    in: [
                        SupplierCredentialStatus.DRAFT,
                        SupplierCredentialStatus.VALIDATION_FAILED,
                        SupplierCredentialStatus.COMPLIANCE_REJECTED,
                        SupplierCredentialStatus.INVITATION_PENDING,
                    ],
                },
            },
        });

        // Aguardando resposta da facção
        const awaitingResponse = await this.prisma.supplierCredential.count({
            where: {
                brandId: companyId,
                status: {
                    in: [
                        SupplierCredentialStatus.INVITATION_SENT,
                        SupplierCredentialStatus.INVITATION_OPENED,
                        SupplierCredentialStatus.ONBOARDING_STARTED,
                        SupplierCredentialStatus.ONBOARDING_IN_PROGRESS,
                        SupplierCredentialStatus.CONTRACT_PENDING,
                    ],
                },
            },
        });

        // Taxa de conversão
        const conversionRate = total > 0 ? (activeCount / total) * 100 : 0;

        return {
            total,
            byStatus: statusCounts,
            thisMonth: {
                created: thisMonth,
                completed: completedThisMonth,
            },
            pendingAction,
            awaitingResponse,
            activeCount,
            conversionRate: Math.round(conversionRate * 100) / 100, // 2 casas decimais
        };
    }

    // ==================== STATUS MANAGEMENT ====================

    /**
     * Altera o status de um credenciamento com histórico
     */
    async changeStatus(
        id: string,
        newStatus: SupplierCredentialStatus,
        userId: string,
        reason?: string,
    ) {
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id },
            select: { status: true },
        });

        if (!credential) {
            throw new NotFoundException(`Credenciamento ${id} não encontrado`);
        }

        // Registra no histórico
        await this.createStatusHistory(id, credential.status, newStatus, userId, reason);

        // Atualiza status
        const updateData: any = { status: newStatus };

        // Define completedAt se chegou a ACTIVE
        if (newStatus === SupplierCredentialStatus.ACTIVE) {
            updateData.completedAt = new Date();
        }

        return this.prisma.supplierCredential.update({
            where: { id },
            data: updateData,
        });
    }

    // ==================== DOCUMENT VALIDATION ====================

    /**
     * Lista documentos pendentes de validação
     */
    async getCredentialsWithPendingDocuments(user: AuthUser) {
        // Verifica permissão
        if (!user.brandId) {
            throw new ForbiddenException(
                'Apenas marcas podem validar documentos',
            );
        }

        const credentials = await this.prisma.supplierCredential.findMany({
            where: {
                brandId: user.brandId,
                status: {
                    in: [
                        SupplierCredentialStatus.ONBOARDING_STARTED,
                        SupplierCredentialStatus.ONBOARDING_IN_PROGRESS,
                    ],
                },
            },
            include: {
                onboarding: {
                    include: {
                        documents: {
                            where: {
                                isValid: null, // Apenas documentos não validados
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
            },
        });

        // Filtrar apenas credentials que têm documentos pendentes
        return credentials.filter(
            (c) => c.onboarding?.documents && c.onboarding.documents.length > 0,
        );
    }

    /**
     * Buscar documentos de um credenciamento específico
     */
    async getDocuments(credentialId: string, user: AuthUser) {
        // Verificar acesso
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential) {
            throw new NotFoundException('Credenciamento não encontrado');
        }

        // Verificar se pertence à marca do usuário
        if (user.brandId && credential.brandId !== user.brandId) {
            throw new ForbiddenException(
                'Você não tem permissão para acessar documentos deste credenciamento',
            );
        }

        if (!credential.supplierId) {
            return [];
        }

        const documents = await this.prisma.onboardingDocument.findMany({
            where: {
                onboarding: {
                    supplierId: credential.supplierId,
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return documents;
    }

    /**
     * Validar ou rejeitar documento
     */
    async validateDocument(
        credentialId: string,
        documentId: string,
        isValid: boolean,
        validationNotes: string | undefined,
        user: AuthUser,
    ) {
        // Verificar acesso
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential) {
            throw new NotFoundException('Credenciamento não encontrado');
        }

        // Verificar se pertence à marca do usuário
        if (user.brandId && credential.brandId !== user.brandId) {
            throw new ForbiddenException(
                'Você não tem permissão para validar documentos deste credenciamento',
            );
        }

        if (!user.brandId) {
            throw new ForbiddenException('Apenas marcas podem validar documentos');
        }

        // Buscar documento
        const document = await this.prisma.onboardingDocument.findUnique({
            where: { id: documentId },
            include: {
                onboarding: true,
            },
        });

        if (!document) {
            throw new NotFoundException('Documento não encontrado');
        }

        // Verificar se pertence ao credenciamento correto
        // Comparar supplierId do onboarding com supplierId da credential
        if (document.onboarding.supplierId !== credential.supplierId) {
            throw new BadRequestException(
                'Documento não pertence a este credenciamento',
            );
        }

        // Atualizar documento
        const updated = await this.prisma.onboardingDocument.update({
            where: { id: documentId },
            data: {
                isValid,
                validationNotes,
                validatedById: user.id,
                validatedAt: new Date(),
            },
        });

        this.logger.log(
            `Documento ${documentId} ${isValid ? 'aprovado' : 'rejeitado'} por ${user.id}`,
        );

        // Verificar se todos os documentos foram validados
        const allDocuments = await this.prisma.onboardingDocument.findMany({
            where: {
                onboardingId: document.onboardingId,
            },
        });

        const allValidated = allDocuments.every((doc) => doc.isValid !== null);
        const allApproved = allDocuments.every((doc) => doc.isValid === true);

        if (allValidated) {
            if (allApproved) {
                // Todos aprovados - atualizar última atividade
                await this.prisma.supplierOnboarding.update({
                    where: { id: document.onboardingId },
                    data: {
                        lastActivityAt: new Date(),
                    },
                });

                this.logger.log(
                    `Todos os documentos aprovados para credential ${credentialId}`,
                );
            } else {
                // Algum rejeitado - notificar fornecedor para reenviar
                this.logger.log(
                    `Documentos rejeitados para credential ${credentialId}`,
                );
            }
        }

        return updated;
    }

    /**
     * Ativar fornecedor manualmente (após todos os checks)
     */
    async activateSupplier(credentialId: string, user: AuthUser) {
        // Verificar acesso
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential) {
            throw new NotFoundException('Credenciamento não encontrado');
        }

        // Verificar se pertence à marca do usuário
        if (user.brandId && credential.brandId !== user.brandId) {
            throw new ForbiddenException(
                'Você não tem permissão para ativar este credenciamento',
            );
        }

        if (!user.brandId) {
            throw new ForbiddenException('Apenas marcas podem ativar fornecedores');
        }

        // Verificar se o contrato foi assinado
        const contract = await this.prisma.supplierContract.findUnique({
            where: { credentialId },
        });

        if (!contract || !contract.supplierSignedAt) {
            throw new BadRequestException(
                'Fornecedor deve assinar o contrato antes de ser ativado',
            );
        }

        // Verificar se todos os documentos foram aprovados
        if (credential.supplierId) {
            const onboarding = await this.prisma.supplierOnboarding.findUnique({
                where: { supplierId: credential.supplierId },
                include: { documents: true },
            });

            if (onboarding) {
                const allApproved = onboarding.documents.every(
                    (doc) => doc.isValid === true,
                );

                if (!allApproved) {
                    throw new BadRequestException(
                        'Todos os documentos devem ser aprovados antes de ativar',
                    );
                }
            }
        }

        // Atualizar status para ACTIVE
        const updated = await this.prisma.supplierCredential.update({
            where: { id: credentialId },
            data: {
                status: SupplierCredentialStatus.ACTIVE,
            },
        });

        // Criar histórico
        await this.createStatusHistory(
            credentialId,
            credential.status,
            SupplierCredentialStatus.ACTIVE,
            user.id,
            'Fornecedor ativado manualmente pela marca',
        );

        this.logger.log(
            `Fornecedor ${credentialId} ativado por ${user.id}`,
        );

        return updated;
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Cria registro no histórico de status
     */
    private async createStatusHistory(
        credentialId: string,
        fromStatus: SupplierCredentialStatus | null,
        toStatus: SupplierCredentialStatus,
        performedById: string,
        reason?: string,
    ) {
        return this.prisma.credentialStatusHistory.create({
            data: {
                credentialId,
                fromStatus,
                toStatus,
                performedById,
                reason,
            },
        });
    }

    /**
     * Remove caracteres não numéricos do CNPJ
     */
    private cleanCNPJ(cnpj: string): string {
        return cnpj.replace(/\D/g, '');
    }

    /**
     * Formata CNPJ para exibição
     */
    private formatCNPJ(cnpj: string): string {
        const clean = this.cleanCNPJ(cnpj);
        return clean.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }

    /**
     * Remove caracteres não numéricos do telefone
     */
    private cleanPhone(phone: string): string {
        return phone.replace(/\D/g, '');
    }
}
