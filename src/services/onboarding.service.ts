import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

export interface SupplierProfile {
    id: string;
    companyId: string;
    onboardingPhase: number; // 1, 2, or 3
    onboardingComplete: boolean;
    businessQualification?: {
        interesse?: string;
        faturamentoDesejado?: number;
        maturidadeGestao?: string;
        qtdColaboradores?: number;
        tempoMercado?: string;
    };
    productTypes?: string[];
    specialties?: string[];
    monthlyCapacity?: number;
    currentOccupancy?: number;
}

export interface Phase2Data {
    interesse?: string;
    faturamentoDesejado?: number;
    maturidadeGestao?: string;
    qtdColaboradores?: number;
    tempoMercado?: string;
}

export interface Phase3Data {
    productTypes: string[];
    specialties?: string[];
    monthlyCapacity: number;
    currentOccupancy?: number;
    onboardingComplete?: boolean;
}

interface CompanyWithProfile {
    id: string;
    supplierProfile: SupplierProfile | null;
}

// Mock state
let mockProfile: SupplierProfile = {
    id: 'profile-001',
    companyId: 'company-supplier-001',
    onboardingPhase: 2,
    onboardingComplete: false,
    businessQualification: {
        interesse: 'Alta capacidade produtiva',
        faturamentoDesejado: 50000,
        maturidadeGestao: 'Intermediária',
        qtdColaboradores: 15,
        tempoMercado: '5-10 anos'
    }
};

// Interfaces para wizard de onboarding (Fase 3)
export interface OnboardingInvitation {
    valid: boolean;
    token: string;
    brand: {
        name: string;
        logo?: string;
        location: string;
    };
    supplier: {
        cnpj: string;
        tradeName: string;
        legalName?: string;
        contactName?: string;
        contactEmail?: string;
        contactPhone?: string;
    };
    invitation: {
        type: string;
        sentAt: string;
        expiresAt: string;
        daysRemaining: number;
    };
    status: string;
    hasOnboarding: boolean;
    onboardingProgress?: {
        currentStep: number;
        totalSteps: number;
        completedSteps: number[];
    };
}

export interface OnboardingProgress {
    id: string;
    credentialId: string;
    currentStep: number;
    totalSteps: number;
    completedSteps: number[];
    documentsUploadedAt?: string;
    contractSignedAt?: string;
    lastActivityAt: string;
    createdAt: string;
    documents?: OnboardingDocument[];
}

export interface OnboardingDocument {
    id: string;
    onboardingId: string;
    type: string;
    name: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    isValid?: boolean | null;
    validationNotes?: string | null;
    validatedById?: string | null;
    validatedAt?: string | null;
    createdAt: string;
}

export const onboardingService = {
    /**
     * Valida token de convite (público)
     */
    async validateToken(token: string): Promise<OnboardingInvitation> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return {
                valid: true,
                token,
                brand: {
                    name: 'Marca Exemplo',
                    logo: 'https://via.placeholder.com/150',
                    location: 'São Paulo, SP',
                },
                supplier: {
                    cnpj: '12.345.678/0001-90',
                    tradeName: 'Facção Teste',
                    legalName: 'Facção Teste Ltda',
                    contactName: 'João Silva',
                    contactEmail: 'joao@teste.com',
                    contactPhone: '(11) 98765-4321',
                },
                invitation: {
                    type: 'EMAIL',
                    sentAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    daysRemaining: 7,
                },
                status: 'INVITATION_SENT',
                hasOnboarding: false,
            };
        }
        const response = await api.get<OnboardingInvitation>(`/onboarding/validate-token/${token}`);
        return response.data;
    },

    /**
     * Inicia processo de onboarding (público)
     */
    async startOnboarding(token: string, deviceInfo?: any): Promise<{ onboardingId: string; resumed: boolean; currentStep: number }> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return { onboardingId: 'onb-001', resumed: false, currentStep: 1 };
        }
        const response = await api.post(`/onboarding/start/${token}`, { deviceInfo });
        return response.data;
    },

    /**
     * Busca progresso do onboarding (público)
     */
    async getProgress(token: string): Promise<OnboardingProgress | null> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return {
                id: 'onb-001',
                credentialId: 'cred-001',
                currentStep: 1,
                totalSteps: 6,
                completedSteps: [],
                lastActivityAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };
        }
        const response = await api.get<OnboardingProgress>(`/onboarding/progress/${token}`);
        return response.data;
    },

    async getProfile(): Promise<SupplierProfile | null> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return mockProfile;
        }
        const response = await api.get<CompanyWithProfile>('/suppliers/profile');
        return response.data.supplierProfile;
    },

    async updatePhase2(data: Phase2Data): Promise<SupplierProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                businessQualification: { ...mockProfile.businessQualification, ...data },
                onboardingPhase: 2
            };
            return mockProfile;
        }
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: Phase3Data): Promise<SupplierProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                ...data,
                onboardingPhase: 3
            };
            return mockProfile;
        }
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async completeOnboarding(): Promise<SupplierProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                onboardingComplete: true
            };
            return mockProfile;
        }
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/complete');
        return response.data;
    },

    /**
     * Upload documento do onboarding (público)
     */
    async uploadDocument(
        token: string,
        file: File,
        type: string,
        name?: string
    ): Promise<OnboardingDocument> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            return {
                id: `doc-${Date.now()}`,
                onboardingId: 'onb-001',
                type,
                name: name || type,
                fileName: file.name,
                fileUrl: `/uploads/onboarding/mock/${file.name}`,
                fileSize: file.size,
                mimeType: file.type,
                isValid: null,
                createdAt: new Date().toISOString(),
            };
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        if (name) {
            formData.append('name', name);
        }

        const response = await api.post<OnboardingDocument>(
            `/onboarding/${token}/documents`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    /**
     * Listar documentos do onboarding (público)
     */
    async getDocuments(token: string): Promise<OnboardingDocument[]> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return [];
        }
        const response = await api.get<OnboardingDocument[]>(`/onboarding/${token}/documents`);
        return response.data;
    },

    /**
     * Remover documento do onboarding (público)
     */
    async deleteDocument(token: string, documentId: string): Promise<void> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return;
        }
        await api.delete(`/onboarding/${token}/documents/${documentId}`);
    },

    /**
     * Step 2: Criar senha do usuário (público)
     */
    async createPassword(token: string, password: string): Promise<{ success: boolean; userId: string }> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { success: true, userId: 'mock-user-001' };
        }
        const response = await api.post(`/onboarding/${token}/password`, { password });
        return response.data;
    },

    /**
     * Step 3: Salvar dados da empresa (público)
     */
    async saveCompanyData(
        token: string,
        data: {
            interesse: string;
            faturamentoDesejado: number;
            maturidadeGestao: string;
            qtdColaboradores: number;
            tempoMercado: string;
        }
    ): Promise<{ success: boolean; onboardingId: string; currentStep: number }> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { success: true, onboardingId: 'onb-001', currentStep: 4 };
        }
        const response = await api.post(`/onboarding/${token}/company-data`, data);
        return response.data;
    },

    /**
     * Step 5: Salvar capacidades produtivas (público)
     */
    async saveCapabilities(
        token: string,
        data: {
            productTypes: string[];
            specialties?: string[];
            monthlyCapacity: number;
            currentOccupancy: number;
        }
    ): Promise<{ success: boolean; onboardingId: string; currentStep: number }> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { success: true, onboardingId: 'onb-001', currentStep: 6 };
        }
        const response = await api.post(`/onboarding/${token}/capabilities`, data);
        return response.data;
    },

    /**
     * Atualizar progresso de um step específico
     */
    async updateStepProgress(
        token: string,
        stepNumber: number
    ): Promise<{ success: boolean; currentStep: number; completedSteps: number[]; isComplete: boolean }> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return {
                success: true,
                currentStep: stepNumber + 1,
                completedSteps: Array.from({ length: stepNumber }, (_, i) => i + 1),
                isComplete: stepNumber >= 6,
            };
        }
        const response = await api.post(`/onboarding/${token}/step/${stepNumber}`);
        return response.data;
    },
};
