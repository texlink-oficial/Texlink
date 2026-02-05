import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

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

// ==================== MOCK DATA ====================

const mockContracts: SupplierContract[] = [
    {
        id: 'ctr-001',
        displayId: 'CTR-20260205-0001',
        relationshipId: 'rel-001',
        supplierId: 'sup-001',
        brandId: 'brand-001',
        type: 'SERVICE_AGREEMENT',
        title: 'Contrato de Prestacao de Servicos',
        description: 'Contrato para producao mensal de pecas',
        value: 50000,
        status: 'SIGNED',
        documentUrl: '/uploads/contracts/CTR-20260205-0001.pdf',
        documentHash: 'abc123def456',
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.999Z',
        brandSignedAt: '2026-01-02T10:00:00.000Z',
        brandSignerName: 'Maria Silva',
        supplierSignedAt: '2026-01-03T14:30:00.000Z',
        supplierSignerName: 'Joao Santos',
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-03T14:30:00.000Z',
        brand: { tradeName: 'Marca Fashion', legalName: 'Marca Fashion LTDA' },
        supplier: { tradeName: 'Faccao Textil Sul', legalName: 'Faccao Textil Sul LTDA' },
        revisions: [],
    },
    {
        id: 'ctr-002',
        displayId: 'CTR-20260205-0002',
        relationshipId: 'rel-001',
        supplierId: 'sup-001',
        brandId: 'brand-001',
        type: 'NDA',
        title: 'Termo de Confidencialidade',
        status: 'PENDING_SUPPLIER_SIGNATURE',
        documentUrl: '/uploads/contracts/CTR-20260205-0002.pdf',
        validFrom: '2026-02-01T00:00:00.000Z',
        validUntil: '2027-01-31T23:59:59.999Z',
        brandSignedAt: '2026-02-01T09:00:00.000Z',
        brandSignerName: 'Maria Silva',
        createdAt: '2026-02-01T08:00:00.000Z',
        updatedAt: '2026-02-01T09:00:00.000Z',
        brand: { tradeName: 'Marca Fashion', legalName: 'Marca Fashion LTDA' },
        supplier: { tradeName: 'Faccao Textil Sul', legalName: 'Faccao Textil Sul LTDA' },
        revisions: [
            {
                id: 'rev-001',
                contractId: 'ctr-002',
                requestedById: 'user-sup-001',
                requestedBy: { name: 'Joao Santos', email: 'joao@faccao.com' },
                message: 'Solicitamos revisao da clausula 3 sobre compartilhamento de informacoes.',
                status: 'PENDING',
                createdAt: '2026-02-02T10:00:00.000Z',
                updatedAt: '2026-02-02T10:00:00.000Z',
            },
        ],
    },
    {
        id: 'ctr-003',
        displayId: 'CTR-20260205-0003',
        relationshipId: 'rel-002',
        supplierId: 'sup-002',
        brandId: 'brand-001',
        type: 'SERVICE_AGREEMENT',
        title: 'Contrato de Producao Especial',
        status: 'DRAFT',
        validFrom: '2026-03-01T00:00:00.000Z',
        validUntil: '2026-08-31T23:59:59.999Z',
        value: 75000,
        createdAt: '2026-02-04T14:00:00.000Z',
        updatedAt: '2026-02-04T14:00:00.000Z',
        brand: { tradeName: 'Marca Fashion', legalName: 'Marca Fashion LTDA' },
        supplier: { tradeName: 'Confeccoes Norte', legalName: 'Confeccoes Norte ME' },
        revisions: [],
    },
];

// ==================== SERVICE ====================

export const contractsService = {
    // ==================== BRAND METHODS ====================

    /**
     * Criar contrato a partir de template
     */
    async create(dto: CreateContractDto): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(1500);
            const newContract: SupplierContract = {
                id: `ctr-${Date.now()}`,
                displayId: `CTR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(mockContracts.length + 1).padStart(4, '0')}`,
                ...dto,
                status: 'DRAFT',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                brand: { tradeName: 'Marca Demo' },
                supplier: { tradeName: 'Faccao Demo' },
                revisions: [],
            };
            mockContracts.push(newContract);
            return newContract;
        }

        const response = await api.post<SupplierContract>('/contracts', dto);
        return response.data;
    },

    /**
     * Upload de contrato PDF customizado
     */
    async upload(dto: UploadContractDto, file: File): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(2000);
            const newContract: SupplierContract = {
                id: `ctr-${Date.now()}`,
                displayId: `CTR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(mockContracts.length + 1).padStart(4, '0')}`,
                ...dto,
                status: 'DRAFT',
                documentUrl: `/uploads/contracts/${file.name}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                brand: { tradeName: 'Marca Demo' },
                supplier: { tradeName: 'Faccao Demo' },
                revisions: [],
            };
            mockContracts.push(newContract);
            return newContract;
        }

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
        if (MOCK_MODE) {
            await simulateDelay(500);
            let filtered = [...mockContracts];

            if (filters.type) {
                filtered = filtered.filter(c => c.type === filters.type);
            }
            if (filters.status) {
                filtered = filtered.filter(c => c.status === filters.status);
            }
            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(c =>
                    c.displayId.toLowerCase().includes(search) ||
                    c.title?.toLowerCase().includes(search)
                );
            }

            const page = filters.page || 1;
            const limit = filters.limit || 10;
            const start = (page - 1) * limit;
            const paged = filtered.slice(start, start + limit);

            return {
                data: paged,
                meta: {
                    total: filtered.length,
                    page,
                    limit,
                    totalPages: Math.ceil(filtered.length / limit),
                },
            };
        }

        const response = await api.get<PaginatedContracts>('/contracts/brand', { params: filters });
        return response.data;
    },

    /**
     * Listar contratos do fornecedor
     */
    async getForSupplier(filters: ContractFilterDto = {}): Promise<PaginatedContracts> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            let filtered = [...mockContracts];

            if (filters.type) {
                filtered = filtered.filter(c => c.type === filters.type);
            }
            if (filters.status) {
                filtered = filtered.filter(c => c.status === filters.status);
            }
            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(c =>
                    c.displayId.toLowerCase().includes(search) ||
                    c.title?.toLowerCase().includes(search)
                );
            }

            const page = filters.page || 1;
            const limit = filters.limit || 10;
            const start = (page - 1) * limit;
            const paged = filtered.slice(start, start + limit);

            return {
                data: paged,
                meta: {
                    total: filtered.length,
                    page,
                    limit,
                    totalPages: Math.ceil(filtered.length / limit),
                },
            };
        }

        const response = await api.get<PaginatedContracts>('/contracts/supplier', { params: filters });
        return response.data;
    },

    /**
     * Buscar contrato por ID
     */
    async getById(id: string): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const contract = mockContracts.find(c => c.id === id);
            if (!contract) {
                throw new Error('Contrato nao encontrado');
            }
            return contract;
        }

        const response = await api.get<SupplierContract>(`/contracts/${id}`);
        return response.data;
    },

    /**
     * Download do PDF do contrato
     */
    async download(id: string): Promise<Blob> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            // Mock: retorna um blob vazio
            return new Blob(['Mock PDF content'], { type: 'application/pdf' });
        }

        const response = await api.get(`/contracts/${id}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Enviar contrato para assinatura
     */
    async sendForSignature(id: string, message?: string): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const contract = mockContracts.find(c => c.id === id);
            if (contract) {
                contract.status = 'PENDING_SUPPLIER_SIGNATURE';
                contract.updatedAt = new Date().toISOString();
            }
            return contract!;
        }

        const response = await api.post<SupplierContract>(`/contracts/${id}/send`, { message });
        return response.data;
    },

    /**
     * Assinar contrato como marca
     */
    async signAsBrand(id: string, signerName: string): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            const contract = mockContracts.find(c => c.id === id);
            if (contract) {
                contract.brandSignedAt = new Date().toISOString();
                contract.brandSignerName = signerName;
                if (contract.supplierSignedAt) {
                    contract.status = 'SIGNED';
                } else {
                    contract.status = 'PENDING_SUPPLIER_SIGNATURE';
                }
                contract.updatedAt = new Date().toISOString();
            }
            return contract!;
        }

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
        if (MOCK_MODE) {
            await simulateDelay(1000);
            const contract = mockContracts.find(c => c.id === id);
            if (contract) {
                contract.supplierSignedAt = new Date().toISOString();
                contract.supplierSignerName = signerName;
                if (contract.brandSignedAt) {
                    contract.status = 'SIGNED';
                } else {
                    contract.status = 'PENDING_BRAND_SIGNATURE';
                }
                contract.updatedAt = new Date().toISOString();
            }
            return contract!;
        }

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
        if (MOCK_MODE) {
            await simulateDelay(500);
            const contract = mockContracts.find(c => c.id === id);
            if (contract) {
                contract.status = 'CANCELLED';
                contract.updatedAt = new Date().toISOString();
            }
            return contract!;
        }

        const response = await api.post<SupplierContract>(`/contracts/${id}/cancel`, { reason });
        return response.data;
    },

    // ==================== REVISION METHODS ====================

    /**
     * Solicitar revisao de contrato (fornecedor)
     */
    async requestRevision(contractId: string, message: string): Promise<ContractRevision> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const revision: ContractRevision = {
                id: `rev-${Date.now()}`,
                contractId,
                requestedById: 'user-mock',
                requestedBy: { name: 'Usuario Mock', email: 'mock@email.com' },
                message,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const contract = mockContracts.find(c => c.id === contractId);
            if (contract) {
                contract.revisions = contract.revisions || [];
                contract.revisions.push(revision);
            }
            return revision;
        }

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
        if (MOCK_MODE) {
            await simulateDelay(800);
            for (const contract of mockContracts) {
                const revision = contract.revisions?.find(r => r.id === revisionId);
                if (revision) {
                    revision.status = status;
                    revision.respondedAt = new Date().toISOString();
                    revision.responseNotes = responseNotes;
                    revision.updatedAt = new Date().toISOString();
                    return revision;
                }
            }
            throw new Error('Revisao nao encontrada');
        }

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
        if (MOCK_MODE) {
            await simulateDelay(1500);
            return {
                id: 'contract-001',
                displayId: 'CTR-LEGACY-0001',
                credentialId: 'cred-001',
                type: 'SERVICE_AGREEMENT',
                status: 'PENDING_SUPPLIER_SIGNATURE',
                templateId: 'default',
                templateVersion: '1.0',
                documentUrl: '/uploads/contracts/mock-contract.pdf',
                documentHash: 'abc123...',
                terms: terms || {},
                brandSignedAt: new Date().toISOString(),
                brandSignedById: 'BRAND_USER',
                brandSignatureIp: 'AUTO',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }

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
        if (MOCK_MODE) {
            await simulateDelay(300);
            return {
                id: 'contract-001',
                displayId: 'CTR-LEGACY-0001',
                credentialId: 'cred-001',
                type: 'SERVICE_AGREEMENT',
                status: 'PENDING_SUPPLIER_SIGNATURE',
                templateId: 'default',
                templateVersion: '1.0',
                documentUrl: '/uploads/contracts/mock-contract.pdf',
                documentHash: 'abc123...',
                terms: {},
                brandSignedAt: new Date().toISOString(),
                brandSignedById: 'BRAND_USER',
                brandSignatureIp: 'AUTO',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }

        const response = await api.get<SupplierContract>(`/contracts/onboarding/${token}`);
        return response.data;
    },

    /**
     * Assina contrato (publico - onboarding)
     * @deprecated Use signAsSupplier() para novos contratos
     */
    async signContractByToken(token: string, accepted: boolean): Promise<{ success: boolean; signedAt: string }> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            return {
                success: true,
                signedAt: new Date().toISOString(),
            };
        }

        const response = await api.post<{ success: boolean; signedAt: string }>(
            `/contracts/onboarding/${token}/sign`,
            { accepted }
        );
        return response.data;
    },
};
