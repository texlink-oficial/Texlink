import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

export interface SupplierContract {
    id: string;
    credentialId: string;
    templateId?: string | null;
    templateVersion?: string | null;
    documentUrl?: string | null;
    documentHash?: string | null;
    terms?: Record<string, any> | null;
    brandSignedAt?: string | null;
    brandSignedById?: string | null;
    brandSignatureIp?: string | null;
    supplierSignedAt?: string | null;
    supplierSignedById?: string | null;
    supplierSignatureIp?: string | null;
    externalSignatureId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export const contractsService = {
    /**
     * Gera contrato de fornecimento (público)
     */
    async generateContract(token: string, terms?: Record<string, any>): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(1500);
            return {
                id: 'contract-001',
                credentialId: 'cred-001',
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
            `/onboarding/${token}/contract/generate`,
            { terms }
        );
        return response.data;
    },

    /**
     * Busca contrato gerado (público)
     */
    async getContract(token: string): Promise<SupplierContract> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return {
                id: 'contract-001',
                credentialId: 'cred-001',
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

        const response = await api.get<SupplierContract>(`/onboarding/${token}/contract`);
        return response.data;
    },

    /**
     * Assina contrato (público)
     */
    async signContract(token: string, accepted: boolean): Promise<{ success: boolean; signedAt: string }> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            return {
                success: true,
                signedAt: new Date().toISOString(),
            };
        }

        const response = await api.post<{ success: boolean; signedAt: string }>(
            `/onboarding/${token}/contract/sign`,
            { accepted }
        );
        return response.data;
    },
};
