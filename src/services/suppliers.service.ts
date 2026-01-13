import api from './api';

export interface SupplierDashboard {
    company: {
        id: string;
        tradeName: string;
        avgRating: number;
        status: string;
    };
    profile: {
        onboardingPhase: number;
        onboardingComplete: boolean;
        monthlyCapacity: number;
        currentOccupancy: number;
    };
    stats: {
        pendingOrders: number;
        activeOrders: number;
        completedOrdersThisMonth: number;
        totalRevenue: number;
        capacityUsage: number;
    };
}

export interface OnboardingPhase2 {
    interesse?: string;
    faturamentoDesejado?: number;
    maturidadeGestao?: string;
    qtdColaboradores?: number;
    tempoMercado?: string;
}

export interface OnboardingPhase3 {
    productTypes: string[];
    specialties?: string[];
    monthlyCapacity: number;
    currentOccupancy?: number;
    onboardingComplete?: boolean;
}

export interface SupplierSearchFilters {
    city?: string;
    state?: string;
    productTypes?: string[];
    specialties?: string[];
    minCapacity?: number;
    maxCapacity?: number;
    minRating?: number;
}

export const suppliersService = {
    async getMyProfile() {
        const response = await api.get('/suppliers/profile');
        return response.data;
    },

    async updatePhase2(data: OnboardingPhase2) {
        const response = await api.patch('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: OnboardingPhase3) {
        const response = await api.patch('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async getDashboard(): Promise<SupplierDashboard> {
        const response = await api.get<SupplierDashboard>('/suppliers/dashboard');
        return response.data;
    },

    async getOpportunities() {
        const response = await api.get('/suppliers/opportunities');
        return response.data;
    },

    async search(filters: SupplierSearchFilters) {
        const response = await api.get('/suppliers', { params: filters });
        return response.data;
    },

    async getById(id: string) {
        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    },
};
