import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

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

let mockProfile: BrandProfile = {
    id: 'brand-profile-001',
    companyId: 'company-brand-001',
    onboardingPhase: 1,
    onboardingComplete: false,
};

export const brandOnboardingService = {
    async getProfile(): Promise<BrandProfile | null> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return mockProfile;
        }
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
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                onboardingPhase: 2,
                businessQualification: data,
            };
            return mockProfile;
        }
        const response = await api.patch<BrandProfile>('/brands/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: {
        productTypes: string[];
        specialties?: string[];
        monthlyVolume: number;
    }): Promise<BrandProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                onboardingPhase: 3,
                productTypes: data.productTypes,
                specialties: data.specialties,
                monthlyVolume: data.monthlyVolume,
            };
            return mockProfile;
        }
        const response = await api.patch<BrandProfile>('/brands/onboarding/phase3', data);
        return response.data;
    },

    async completeOnboarding(): Promise<BrandProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = { ...mockProfile, onboardingComplete: true };
            return mockProfile;
        }
        const response = await api.patch<BrandProfile>('/brands/onboarding/complete');
        return response.data;
    },
};
