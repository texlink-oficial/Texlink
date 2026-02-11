import api from './api';
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

export const credentialsService = {
    /**
     * Criar novo credenciamento
     */
    async create(data: CreateCredentialDto): Promise<SupplierCredential> {
        const response = await api.post<SupplierCredential>('/credentials', data);
        return response.data;
    },

    /**
     * Buscar credenciais com filtros e paginacao (alias para getAll)
     */
    async list(filters: CredentialFilters = {}): Promise<CredentialListResponse> {
        const response = await api.get<CredentialListResponse>('/credentials', { params: filters });
        return response.data;
    },

    /**
     * Buscar credenciais com filtros e paginacao
     */
    async getAll(filters: CredentialFilters = {}): Promise<CredentialListResponse> {
        return this.list(filters);
    },

    /**
     * Buscar estatisticas de credenciais
     */
    async getStats(): Promise<CredentialStats> {
        const response = await api.get<CredentialStats>('/credentials/stats');
        return response.data;
    },

    /**
     * Buscar credencial por ID
     */
    async getById(id: string): Promise<SupplierCredential> {
        const response = await api.get<SupplierCredential>(`/credentials/${id}`);
        return response.data;
    },

    /**
     * Atualizar credencial
     */
    async update(id: string, data: UpdateCredentialDto): Promise<SupplierCredential> {
        const response = await api.patch<SupplierCredential>(`/credentials/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/credentials/${id}`);
    },

    /**
     * Validar CNPJ
     */
    async validate(id: string): Promise<CredentialValidation> {
        const response = await api.post<CredentialValidation>(`/credentials/${id}/validate`);
        return response.data;
    },

    /**
     * Analisar compliance
     */
    async analyzeCompliance(id: string): Promise<ComplianceAnalysis> {
        const response = await api.post<ComplianceAnalysis>(`/credentials/${id}/compliance`);
        return response.data;
    },

    /**
     * Enviar convite
     */
    async sendInvite(id: string, data: SendInvitationDto): Promise<CredentialInvitation> {
        const response = await api.post<CredentialInvitation>(`/credentials/${id}/invite`, data);
        return response.data;
    },

    /**
     * Reenviar convite
     */
    async resendInvite(id: string, inviteId: string): Promise<CredentialInvitation> {
        const response = await api.post<CredentialInvitation>(
            `/credentials/${id}/invitations/${inviteId}/resend`
        );
        return response.data;
    },

    /**
     * Enviar convite (compatibilidade com codigo existente)
     */
    async sendInvitation(id: string, data: SendInvitationDto): Promise<void> {
        await this.sendInvite(id, data);
    },

    /**
     * Reenviar convite (compatibilidade com codigo existente)
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
        const response = await api.patch<SupplierCredential>(`/credentials/${id}/status`, {
            status,
            reason: notes,
        });
        return response.data;
    },

    /**
     * Listar credenciamentos com documentos pendentes de validacao
     */
    async getPendingDocuments(): Promise<any[]> {
        const response = await api.get('/credentials/pending-documents');
        return response.data;
    },

    /**
     * Validar ou rejeitar documento de onboarding
     */
    async validateDocument(
        credentialId: string,
        documentId: string,
        data: { isValid: boolean; validationNotes?: string }
    ): Promise<any> {
        const response = await api.patch(
            `/credentials/${credentialId}/documents/${documentId}`,
            data,
        );
        return response.data;
    },

    /**
     * Buscar historico de status
     */
    async getHistory(id: string): Promise<CredentialStatusHistory[]> {
        const response = await api.get<CredentialStatusHistory[]>(`/credentials/${id}/validations`);
        return response.data;
    },
};
