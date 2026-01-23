import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_SUPPLIERS, MOCK_SUPPLIER_DASHBOARD, MOCK_OPPORTUNITIES } from './mockData';

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

export interface Supplier {
    id: string;
    tradeName: string;
    legalName?: string;
    cnpj?: string;
    city: string;
    state: string;
    email?: string;
    phone?: string;
    avgRating: number;
    completedOrders: number;
    onTimeDeliveryRate: number;
    productTypes: string[];
    specialties: string[];
    monthlyCapacity: number;
    currentOccupancy: number;
    status: string;
    minOrderQuantity?: number;
    avgLeadTime?: number;
    profile?: {
        description?: string;
        equipment?: string[];
        certifications?: string[];
        photos?: string[];
    };
}

export const suppliersService = {
    async getMyProfile() {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_SUPPLIERS[0]; // Return first supplier as "my profile"
        }

        const response = await api.get('/suppliers/profile');
        return response.data;
    },

    async updatePhase2(data: OnboardingPhase2) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log('[MOCK] Onboarding Phase 2 updated:', data);
            return { success: true, message: 'Dados salvos (modo demo)' };
        }

        const response = await api.patch('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: OnboardingPhase3) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log('[MOCK] Onboarding Phase 3 updated:', data);
            return { success: true, message: 'Dados salvos (modo demo)' };
        }

        const response = await api.patch('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async getDashboard(): Promise<SupplierDashboard> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return MOCK_SUPPLIER_DASHBOARD;
        }

        const response = await api.get<SupplierDashboard>('/suppliers/dashboard');
        return response.data;
    },

    async getOpportunities() {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_OPPORTUNITIES;
        }

        const response = await api.get('/suppliers/opportunities');
        return response.data;
    },

    async search(filters: SupplierSearchFilters): Promise<Supplier[]> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            let results = [...MOCK_SUPPLIERS];

            if (filters.city) {
                results = results.filter(s => s.city.toLowerCase().includes(filters.city!.toLowerCase()));
            }
            if (filters.state) {
                results = results.filter(s => s.state === filters.state);
            }
            if (filters.productTypes?.length) {
                results = results.filter(s =>
                    s.productTypes.some(pt => filters.productTypes!.includes(pt))
                );
            }
            if (filters.minRating) {
                results = results.filter(s => s.avgRating >= filters.minRating!);
            }
            if (filters.minCapacity) {
                results = results.filter(s => s.monthlyCapacity >= filters.minCapacity!);
            }

            return results as Supplier[];
        }

        const response = await api.get('/suppliers', { params: filters });
        return response.data;
    },

    async getById(id: string): Promise<Supplier> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            const supplier = MOCK_SUPPLIERS.find(s => s.id === id);
            if (!supplier) {
                throw new Error('Fornecedor não encontrado');
            }
            return supplier as Supplier;
        }

        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    },
};
