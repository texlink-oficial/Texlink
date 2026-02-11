import api from './api';

export interface BrandProfile {
    id: string;
    companyId: string;
    onboardingPhase: number; // 1, 2, or 3
    onboardingComplete: boolean;
    businessQualification?: {
        objetivo?: string;
        volumeMensal?: number;
        maturidadeGestao?: string;
        qtdColaboradores?: number;
        tempoMercado?: string;
    };
    productTypes?: string[];
    specialties?: string[];
    monthlyVolume?: number;
}

interface CompanyWithProfile {
    id: string;
    brandProfile: BrandProfile | null;
}

export const brandOnboardingService = {
    async getProfile(): Promise<BrandProfile | null> {
        const response = await api.get<CompanyWithProfile>('/brands/profile');
        return response.data.brandProfile;
    },

    async updatePhase2(data: {
        objetivo?: string;
        volumeMensal?: number;
        maturidadeGestao?: string;
        qtdColaboradores?: number;
        tempoMercado?: string;
    }): Promise<BrandProfile> {
        const response = await api.patch<BrandProfile>('/brands/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: {
        productTypes: string[];
        specialties?: string[];
        monthlyVolume: number;
    }): Promise<BrandProfile> {
        const response = await api.patch<BrandProfile>('/brands/onboarding/phase3', data);
        return response.data;
    },

    async completeOnboarding(): Promise<BrandProfile> {
        const response = await api.patch<BrandProfile>('/brands/onboarding/complete');
        return response.data;
    },
};
