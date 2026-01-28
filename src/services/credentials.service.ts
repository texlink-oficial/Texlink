import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import type {
    SupplierCredential,
    CredentialFilters,
    CredentialListResponse,
    CreateCredentialDto,
    UpdateCredentialDto,
    CredentialStats,
    SendInvitationDto,
    ResendInvitationDto,
    SupplierCredentialStatus,
    CredentialValidation,
    ComplianceAnalysis,
    CredentialInvitation,
    CredentialStatusHistory,
    InvitationChannel,
} from '../types/credentials';

// Mock data for development
const MOCK_CREDENTIALS: SupplierCredential[] = [
    {
        id: '1',
        cnpj: '12345678000190',
        tradeName: 'Facção Silva',
        legalName: 'Silva Confecções LTDA',
        contactName: 'João Silva',
        contactEmail: 'joao@faccaosilva.com.br',
        contactPhone: '11999887766',
        contactWhatsapp: '11999887766',
        category: 'CONFECCAO',
        notes: 'Fornecedor tradicional, recomendado',
        priority: 8,
        status: 'COMPLIANCE_APPROVED',
        brandId: 'brand-1',
        createdById: 'user-1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T15:30:00Z',
    },
    {
        id: '2',
        cnpj: '98765432000111',
        tradeName: 'Bordados Premium',
        legalName: 'Premium Bordados ME',
        contactName: 'Maria Santos',
        contactEmail: 'maria@bordadospremium.com.br',
        contactPhone: '11988776655',
        category: 'BORDADO',
        notes: '',
        priority: 5,
        status: 'INVITATION_SENT',
        brandId: 'brand-1',
        createdById: 'user-1',
        createdAt: '2024-01-18T14:00:00Z',
        updatedAt: '2024-01-18T14:30:00Z',
    },
    {
        id: '3',
        cnpj: '11223344000155',
        tradeName: '',
        legalName: '',
        contactName: 'Carlos Oliveira',
        contactEmail: 'carlos@estamparia.com.br',
        contactPhone: '11977665544',
        category: 'ESTAMPARIA',
        notes: 'Aguardando validação do CNPJ',
        priority: 3,
        status: 'DRAFT',
        brandId: 'brand-1',
        createdById: 'user-1',
        createdAt: '2024-01-25T09:00:00Z',
        updatedAt: '2024-01-25T09:00:00Z',
    },
    {
        id: '4',
        cnpj: '22334455000166',
        tradeName: 'Lavanderia Express',
        legalName: 'Express Lavanderia Industrial LTDA',
        contactName: 'Ana Costa',
        contactEmail: 'ana@lavanderiaexpress.com.br',
        contactPhone: '11966554433',
        contactWhatsapp: '11966554433',
        category: 'LAVANDERIA',
        notes: 'Grande capacidade, ótimos prazos',
        priority: 9,
        status: 'ACTIVE',
        brandId: 'brand-1',
        createdById: 'user-1',
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-22T16:00:00Z',
        completedAt: '2024-01-22T16:00:00Z',
    },
    {
        id: '5',
        cnpj: '33445566000177',
        tradeName: 'Malharia Central',
        legalName: 'Central Malharia e Confecções LTDA',
        contactName: 'Pedro Almeida',
        contactEmail: 'pedro@malhariacentral.com.br',
        contactPhone: '11955443322',
        category: 'MALHARIA',
        notes: 'Precisa melhorar score de crédito',
        priority: 2,
        status: 'COMPLIANCE_REJECTED',
        brandId: 'brand-1',
        createdById: 'user-1',
        createdAt: '2024-01-20T11:00:00Z',
        updatedAt: '2024-01-24T10:00:00Z',
    },
    {
        id: '6',
        cnpj: '44556677000188',
        tradeName: 'Costura Rápida',
        legalName: 'Rápida Costura Industrial ME',
        contactName: 'Julia Ferreira',
        contactEmail: 'julia@costurarpida.com.br',
        contactPhone: '11944332211',
        category: 'COSTURA',
        notes: '',
        priority: 6,
        status: 'ONBOARDING_IN_PROGRESS',
        brandId: 'brand-1',
        createdById: 'user-1',
        createdAt: '2024-01-22T13:00:00Z',
        updatedAt: '2024-01-23T09:30:00Z',
    },
];

const MOCK_STATS: CredentialStats = {
    total: 6,
    byStatus: {
        DRAFT: 1,
        INVITATION_SENT: 1,
        COMPLIANCE_APPROVED: 1,
        ACTIVE: 1,
        COMPLIANCE_REJECTED: 1,
        ONBOARDING_IN_PROGRESS: 1,
    },
    thisMonth: {
        created: 6,
        completed: 1,
    },
    pendingAction: 2,
    awaitingResponse: 2,
    activeCount: 1,
    conversionRate: 16.67,
};

export const credentialsService = {
    /**
     * Criar novo credenciamento
     */
    async create(data: CreateCredentialDto): Promise<SupplierCredential> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const newCredential: SupplierCredential = {
                id: `mock-${Date.now()}`,
                cnpj: data.cnpj.replace(/\D/g, ''),
                contactName: data.contactName,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone.replace(/\D/g, ''),
                contactWhatsapp: data.contactWhatsapp?.replace(/\D/g, ''),
                category: data.category,
                notes: data.notes,
                priority: 5,
                status: data.status || 'DRAFT',
                brandId: 'brand-1',
                createdById: 'user-1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            console.log('[MOCK] Credential created:', newCredential);
            MOCK_CREDENTIALS.unshift(newCredential);
            return newCredential;
        }

        const response = await api.post<SupplierCredential>('/credentials', data);
        return response.data;
    },

    /**
     * Buscar credenciais com filtros e paginação (alias para getAll)
     */
    async list(filters: CredentialFilters = {}): Promise<CredentialListResponse> {
        if (MOCK_MODE) {
            await simulateDelay(500);

            let filtered = [...MOCK_CREDENTIALS];

            // Filter by search
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filtered = filtered.filter(
                    (c) =>
                        c.cnpj.includes(filters.search!) ||
                        c.tradeName?.toLowerCase().includes(searchLower) ||
                        c.legalName?.toLowerCase().includes(searchLower) ||
                        c.contactName.toLowerCase().includes(searchLower) ||
                        c.contactEmail.toLowerCase().includes(searchLower)
                );
            }

            // Filter by status
            if (filters.status) {
                filtered = filtered.filter((c) => c.status === filters.status);
            }

            if (filters.statuses?.length) {
                filtered = filtered.filter((c) => filters.statuses!.includes(c.status));
            }

            // Filter by category
            if (filters.category) {
                filtered = filtered.filter((c) => c.category === filters.category);
            }

            // Filter by date range
            if (filters.createdFrom) {
                filtered = filtered.filter((c) => c.createdAt >= filters.createdFrom!);
            }

            if (filters.createdTo) {
                filtered = filtered.filter((c) => c.createdAt <= filters.createdTo!);
            }

            // Pagination
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const start = (page - 1) * limit;
            const end = start + limit;
            const total = filtered.length;
            const data = filtered.slice(start, end);

            return {
                data,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: end < total,
                    hasPreviousPage: page > 1,
                },
            };
        }

        const response = await api.get<CredentialListResponse>('/credentials', { params: filters });
        return response.data;
    },

    /**
     * Buscar credenciais com filtros e paginação
     */
    async getAll(filters: CredentialFilters = {}): Promise<CredentialListResponse> {
        return this.list(filters);
    },

    /**
     * Buscar estatísticas de credenciais
     */
    async getStats(): Promise<CredentialStats> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_STATS;
        }

        const response = await api.get<CredentialStats>('/credentials/stats');
        return response.data;
    },

    /**
     * Buscar credencial por ID
     */
    async getById(id: string): Promise<SupplierCredential> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            const credential = MOCK_CREDENTIALS.find((c) => c.id === id);
            if (!credential) {
                throw new Error('Credenciamento não encontrado');
            }
            return credential;
        }

        const response = await api.get<SupplierCredential>(`/credentials/${id}`);
        return response.data;
    },

    /**
     * Atualizar credencial
     */
    async update(id: string, data: UpdateCredentialDto): Promise<SupplierCredential> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            const credential = MOCK_CREDENTIALS.find((c) => c.id === id);
            if (!credential) {
                throw new Error('Credenciamento não encontrado');
            }
            const updated = { ...credential, ...data, updatedAt: new Date().toISOString() };
            console.log('[MOCK] Credential updated:', updated);
            return updated;
        }

        const response = await api.patch<SupplierCredential>(`/credentials/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            console.log('[MOCK] Credential deleted:', id);
            return;
        }

        await api.delete(`/credentials/${id}`);
    },

    /**
     * Validar CNPJ
     */
    async validate(id: string): Promise<CredentialValidation> {
        if (MOCK_MODE) {
            await simulateDelay(2000);
            const mockValidation: CredentialValidation = {
                id: `val-${Date.now()}`,
                credentialId: id,
                cnpj: '12345678000190',
                source: 'Receita Federal (Mock)',
                validatedAt: new Date().toISOString(),
                result: 'SUCCESS',
                razaoSocial: 'CONFECÇÕES SILVA LTDA',
                nomeFantasia: 'Confecções Silva',
                situacao: 'ATIVA',
                dataAbertura: '2010-05-15',
                endereco: {
                    logradouro: 'Rua das Confecções',
                    numero: '123',
                    bairro: 'Centro',
                    municipio: 'São Paulo',
                    uf: 'SP',
                    cep: '01234567',
                },
            };

            // Atualizar status do credential no mock
            const credIndex = MOCK_CREDENTIALS.findIndex((c) => c.id === id);
            if (credIndex !== -1) {
                MOCK_CREDENTIALS[credIndex].status = 'PENDING_COMPLIANCE';
                MOCK_CREDENTIALS[credIndex].tradeName = 'Confecções Silva';
                MOCK_CREDENTIALS[credIndex].legalName = 'CONFECÇÕES SILVA LTDA';
            }

            return mockValidation;
        }

        const response = await api.post<CredentialValidation>(`/credentials/${id}/validate`);
        return response.data;
    },

    /**
     * Analisar compliance
     */
    async analyzeCompliance(id: string): Promise<ComplianceAnalysis> {
        if (MOCK_MODE) {
            await simulateDelay(2500);
            const mockAnalysis: ComplianceAnalysis = {
                id: `comp-${Date.now()}`,
                credentialId: id,
                analyzedAt: new Date().toISOString(),
                source: 'Serasa Experian (Mock)',
                overallScore: 78,
                creditScore: 750,
                riskLevel: 'LOW',
                approved: true,
                reasons: ['Boa saúde financeira', 'Histórico de pagamentos positivo'],
                recommendations: ['Monitorar inadimplência trimestral'],
            };

            // Atualizar status do credential no mock
            const credIndex = MOCK_CREDENTIALS.findIndex((c) => c.id === id);
            if (credIndex !== -1) {
                MOCK_CREDENTIALS[credIndex].status = 'COMPLIANCE_APPROVED';
            }

            return mockAnalysis;
        }

        const response = await api.post<ComplianceAnalysis>(`/credentials/${id}/compliance`);
        return response.data;
    },

    /**
     * Enviar convite
     */
    async sendInvite(id: string, data: SendInvitationDto): Promise<CredentialInvitation> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            const credential = MOCK_CREDENTIALS.find((c) => c.id === id);

            const mockInvitation: CredentialInvitation = {
                id: `inv-${Date.now()}`,
                credentialId: id,
                channel: data.channel as InvitationChannel,
                sentAt: new Date().toISOString(),
                sentBy: 'user-1',
                sentTo: credential?.contactEmail || 'email@example.com',
                token: `token-${Date.now()}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'SENT',
                customMessage: data.customMessage || data.message,
            };

            // Atualizar status do credential no mock
            const credIndex = MOCK_CREDENTIALS.findIndex((c) => c.id === id);
            if (credIndex !== -1) {
                MOCK_CREDENTIALS[credIndex].status = 'INVITATION_SENT';
            }

            return mockInvitation;
        }

        const response = await api.post<CredentialInvitation>(`/credentials/${id}/invite`, data);
        return response.data;
    },

    /**
     * Reenviar convite
     */
    async resendInvite(id: string, inviteId: string): Promise<CredentialInvitation> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const credential = MOCK_CREDENTIALS.find((c) => c.id === id);

            const mockInvitation: CredentialInvitation = {
                id: inviteId,
                credentialId: id,
                channel: 'EMAIL',
                sentAt: new Date().toISOString(),
                sentBy: 'user-1',
                sentTo: credential?.contactEmail || 'email@example.com',
                token: `token-${Date.now()}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'SENT',
            };

            return mockInvitation;
        }

        const response = await api.post<CredentialInvitation>(
            `/credentials/${id}/invitations/${inviteId}/resend`
        );
        return response.data;
    },

    /**
     * Enviar convite (compatibilidade com código existente)
     */
    async sendInvitation(id: string, data: SendInvitationDto): Promise<void> {
        await this.sendInvite(id, data);
    },

    /**
     * Reenviar convite (compatibilidade com código existente)
     */
    async resendInvitation(id: string): Promise<void> {
        // Para compatibilidade, usamos o ID do credential como inviteId
        await this.resendInvite(id, `inv-${id}`);
    },

    /**
     * Atualizar status
     */
    async updateStatus(
        id: string,
        status: SupplierCredentialStatus,
        notes?: string
    ): Promise<SupplierCredential> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const index = MOCK_CREDENTIALS.findIndex((c) => c.id === id);
            if (!index || index === -1) {
                throw new Error('Credencial não encontrada');
            }

            MOCK_CREDENTIALS[index] = {
                ...MOCK_CREDENTIALS[index],
                status,
                updatedAt: new Date().toISOString(),
            };

            return MOCK_CREDENTIALS[index];
        }

        const response = await api.patch<SupplierCredential>(`/credentials/${id}/status`, {
            status,
            reason: notes,
        });
        return response.data;
    },

    /**
     * Buscar histórico de status
     */
    async getHistory(id: string): Promise<CredentialStatusHistory[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);

            return [
                {
                    id: 'hist-1',
                    credentialId: id,
                    previousStatus: undefined,
                    newStatus: 'DRAFT',
                    changedAt: '2024-01-15T10:00:00Z',
                    changedById: 'user-1',
                    reason: 'Credencial criada',
                    changedBy: {
                        id: 'user-1',
                        name: 'Admin',
                    },
                },
                {
                    id: 'hist-2',
                    credentialId: id,
                    previousStatus: 'DRAFT',
                    newStatus: 'PENDING_VALIDATION',
                    changedAt: '2024-01-15T14:00:00Z',
                    changedById: 'user-1',
                    reason: 'Iniciada validação de CNPJ',
                    changedBy: {
                        id: 'user-1',
                        name: 'Admin',
                    },
                },
                {
                    id: 'hist-3',
                    credentialId: id,
                    previousStatus: 'PENDING_VALIDATION',
                    newStatus: 'PENDING_COMPLIANCE',
                    changedAt: '2024-01-16T09:00:00Z',
                    changedById: 'system',
                    reason: 'CNPJ validado com sucesso',
                    changedBy: {
                        id: 'system',
                        name: 'Sistema',
                    },
                },
            ];
        }

        const response = await api.get<CredentialStatusHistory[]>(`/credentials/${id}/validations`);
        return response.data;
    },
};
