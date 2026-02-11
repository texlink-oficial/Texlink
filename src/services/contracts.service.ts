import api from './api';

// ==================== TYPES ====================

export type ContractType = 'SERVICE_AGREEMENT' | 'NDA' | 'CODE_OF_CONDUCT' | 'AMENDMENT';
export type ContractStatus = 'DRAFT' | 'PENDING_BRAND_SIGNATURE' | 'PENDING_SUPPLIER_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';
export type ContractRevisionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface SupplierContract {
    id: string;
    displayId: string;
    relationshipId?: string | null;
    credentialId?: string | null;
    supplierId?: string | null;
    brandId?: string | null;
    type: ContractType;
    parentContractId?: string | null;
    title?: string | null;
    description?: string | null;
    value?: number | null;
    templateId?: string | null;
    templateVersion?: string | null;
    documentUrl?: string | null;
    documentHash?: string | null;
    terms?: Record<string, any> | null;
    brandSignedAt?: string | null;
    brandSignedById?: string | null;
    brandSignatureIp?: string | null;
    brandSignerName?: string | null;
    supplierSignedAt?: string | null;
    supplierSignedById?: string | null;
    supplierSignatureIp?: string | null;
    supplierSignerName?: string | null;
    status: ContractStatus;
    validFrom?: string | null;
    validUntil?: string | null;
    renewalReminder?: number | null;
    createdById?: string | null;
    createdAt: string;
    updatedAt: string;
    // Relacionamentos
    brand?: { tradeName?: string; legalName?: string; document?: string };
    supplier?: { tradeName?: string; legalName?: string; document?: string };
    brandSignedBy?: { name: string; email: string };
    supplierSignedBy?: { name: string; email: string };
    createdBy?: { name: string; email: string };
    revisions?: ContractRevision[];
    amendments?: Pick<SupplierContract, 'id' | 'displayId' | 'title' | 'status' | 'createdAt'>[];
    parentContract?: Pick<SupplierContract, 'id' | 'displayId' | 'title'>;
}

export interface ContractRevision {
    id: string;
    contractId: string;
    requestedById: string;
    requestedBy?: { name: string; email: string };
    message: string;
    status: ContractRevisionStatus;
    respondedById?: string | null;
    respondedBy?: { name: string; email: string } | null;
    respondedAt?: string | null;
    responseNotes?: string | null;
    createdAt: string;
    updatedAt: string;
    contract?: Pick<SupplierContract, 'displayId'>;
}

export interface CreateContractDto {
    relationshipId: string;
    type: ContractType;
    title?: string;
    description?: string;
    value?: number;
    validFrom: string;
    validUntil: string;
    terms?: Record<string, any>;
    parentContractId?: string;
}

export interface UploadContractDto {
    relationshipId: string;
    type: ContractType;
    title?: string;
    validFrom: string;
    validUntil: string;
    parentContractId?: string;
}

export interface ContractFilterDto {
    type?: ContractType;
    status?: ContractStatus;
    brandId?: string;
    supplierId?: string;
    relationshipId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedContracts {
    data: SupplierContract[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ==================== SERVICE ====================

export const contractsService = {
    // ==================== BRAND METHODS ====================

    /**
     * Criar contrato a partir de template
     */
    async create(dto: CreateContractDto): Promise<SupplierContract> {
        const response = await api.post<SupplierContract>('/contracts', dto);
        return response.data;
    },

    /**
     * Upload de contrato PDF customizado
     */
    async upload(dto: UploadContractDto, file: File): Promise<SupplierContract> {
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(dto).forEach(([key, value]) => {
            if (value !== undefined) {
                formData.append(key, String(value));
            }
        });

        const response = await api.post<SupplierContract>('/contracts/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Listar contratos da marca
     */
    async getForBrand(filters: ContractFilterDto = {}): Promise<PaginatedContracts> {
        const response = await api.get<PaginatedContracts>('/contracts/brand', { params: filters });
        return response.data;
    },

    /**
     * Listar contratos do fornecedor
     */
    async getForSupplier(filters: ContractFilterDto = {}): Promise<PaginatedContracts> {
        const response = await api.get<PaginatedContracts>('/contracts/supplier', { params: filters });
        return response.data;
    },

    /**
     * Buscar contrato por ID
     */
    async getById(id: string): Promise<SupplierContract> {
        const response = await api.get<SupplierContract>(`/contracts/${id}`);
        return response.data;
    },

    /**
     * Download do PDF do contrato
     */
    async download(id: string): Promise<Blob> {
        const response = await api.get(`/contracts/${id}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Enviar contrato para assinatura
     */
    async sendForSignature(id: string, message?: string): Promise<SupplierContract> {
        const response = await api.post<SupplierContract>(`/contracts/${id}/send`, { message });
        return response.data;
    },

    /**
     * Assinar contrato como marca
     */
    async signAsBrand(id: string, signerName: string): Promise<SupplierContract> {
        const response = await api.post<SupplierContract>(`/contracts/${id}/sign/brand`, {
            signerName,
            accepted: true,
        });
        return response.data;
    },

    /**
     * Assinar contrato como fornecedor
     */
    async signAsSupplier(id: string, signerName: string): Promise<SupplierContract> {
        const response = await api.post<SupplierContract>(`/contracts/${id}/sign/supplier`, {
            signerName,
            accepted: true,
        });
        return response.data;
    },

    /**
     * Cancelar contrato
     */
    async cancel(id: string, reason?: string): Promise<SupplierContract> {
        const response = await api.post<SupplierContract>(`/contracts/${id}/cancel`, { reason });
        return response.data;
    },

    // ==================== REVISION METHODS ====================

    /**
     * Solicitar revisao de contrato (fornecedor)
     */
    async requestRevision(contractId: string, message: string): Promise<ContractRevision> {
        const response = await api.post<ContractRevision>('/contracts/revisions', {
            contractId,
            message,
        });
        return response.data;
    },

    /**
     * Responder revisao (marca)
     */
    async respondToRevision(
        revisionId: string,
        status: 'ACCEPTED' | 'REJECTED',
        responseNotes?: string
    ): Promise<ContractRevision> {
        const response = await api.post<ContractRevision>(`/contracts/revisions/${revisionId}/respond`, {
            status,
            responseNotes,
        });
        return response.data;
    },

    // ==================== LEGACY ONBOARDING METHODS ====================

    /**
     * Gera contrato de fornecimento (publico - onboarding)
     * @deprecated Use create() para novos contratos
     */
    async generateContract(token: string, terms?: Record<string, any>): Promise<SupplierContract> {
        const response = await api.post<SupplierContract>(
            `/contracts/onboarding/${token}/generate`,
            { terms }
        );
        return response.data;
    },

    /**
     * Busca contrato gerado (publico - onboarding)
     * @deprecated Use getById() para novos contratos
     */
    async getContractByToken(token: string): Promise<SupplierContract> {
        const response = await api.get<SupplierContract>(`/contracts/onboarding/${token}`);
        return response.data;
    },

    /**
     * Assina contrato (publico - onboarding)
     * @deprecated Use signAsSupplier() para novos contratos
     */
    async signContractByToken(token: string, accepted: boolean): Promise<{ success: boolean; signedAt: string }> {
        const response = await api.post<{ success: boolean; signedAt: string }>(
            `/contracts/onboarding/${token}/sign`,
            { accepted }
        );
        return response.data;
    },
};
