import api from './api';

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

interface CompanyWithProfile {
    id: string;
    supplierProfile: SupplierProfile | null;
}

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
     * Valida token de convite (publico)
     */
    async validateToken(token: string): Promise<OnboardingInvitation> {
        const response = await api.get<OnboardingInvitation>(`/onboarding/validate-token/${token}`);
        return response.data;
    },

    /**
     * Inicia processo de onboarding (publico)
     */
    async startOnboarding(token: string, deviceInfo?: any): Promise<{ onboardingId: string; resumed: boolean; currentStep: number }> {
        const response = await api.post(`/onboarding/start/${token}`, { deviceInfo });
        return response.data;
    },

    /**
     * Busca progresso do onboarding (publico)
     */
    async getProgress(token: string): Promise<OnboardingProgress | null> {
        const response = await api.get<OnboardingProgress>(`/onboarding/progress/${token}`);
        return response.data;
    },

    async getProfile(): Promise<SupplierProfile | null> {
        const response = await api.get<CompanyWithProfile>('/suppliers/profile');
        return response.data.supplierProfile;
    },

    async updatePhase2(data: {
        interesse?: string;
        faturamentoDesejado?: number;
        maturidadeGestao?: string;
        qtdColaboradores?: number;
        tempoMercado?: string;
    }): Promise<SupplierProfile> {
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: {
        productTypes: string[];
        specialties?: string[];
        monthlyCapacity: number;
        currentOccupancy?: number;
    }): Promise<SupplierProfile> {
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async completeOnboarding(): Promise<SupplierProfile> {
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/complete');
        return response.data;
    },

    /**
     * Upload documento do onboarding (publico)
     */
    async uploadDocument(
        token: string,
        file: File,
        type: string,
        name?: string
    ): Promise<OnboardingDocument> {
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
     * Listar documentos do onboarding (publico)
     */
    async getDocuments(token: string): Promise<OnboardingDocument[]> {
        const response = await api.get<OnboardingDocument[]>(`/onboarding/${token}/documents`);
        return response.data;
    },

    /**
     * Remover documento do onboarding (publico)
     */
    async deleteDocument(token: string, documentId: string): Promise<void> {
        await api.delete(`/onboarding/${token}/documents/${documentId}`);
    },

    /**
     * Step 2: Criar senha do usuario (publico)
     */
    async createPassword(token: string, password: string): Promise<{ success: boolean; userId: string }> {
        const response = await api.post(`/onboarding/${token}/password`, { password });
        return response.data;
    },

    /**
     * Step 3: Salvar dados da empresa (publico)
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
        const response = await api.post(`/onboarding/${token}/company-data`, data);
        return response.data;
    },

    /**
     * Step 5: Salvar capacidades produtivas (publico)
     */
    async saveCapabilities(
        token: string,
        data: {
            productTypes: string[];
            specialties?: string[];
            activeWorkers: number;
            hoursPerDay: number;
            monthlyCapacity?: number;
            currentOccupancy?: number;
        }
    ): Promise<{ success: boolean; onboardingId: string; currentStep: number }> {
        const response = await api.post(`/onboarding/${token}/capabilities`, data);
        return response.data;
    },

    /**
     * Atualizar progresso de um step especifico
     */
    async updateStepProgress(
        token: string,
        stepNumber: number
    ): Promise<{ success: boolean; currentStep: number; completedSteps: number[]; isComplete: boolean }> {
        const response = await api.post(`/onboarding/${token}/step/${stepNumber}`);
        return response.data;
    },
};
