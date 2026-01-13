import api from './api';

export interface AdminDashboard {
    metrics: {
        totalOrders: number;
        activeOrders: number;
        completedOrders: number;
        totalSuppliers: number;
        activeSuppliers: number;
        pendingSuppliers: number;
        totalBrands: number;
        totalRevenue: number;
    };
    recentOrders: {
        id: string;
        displayId: string;
        status: string;
        totalValue: number;
        createdAt: string;
        brand: { tradeName: string };
        supplier: { tradeName: string } | null;
    }[];
}

export interface PendingApproval {
    id: string;
    legalName: string;
    tradeName: string;
    document: string;
    city: string;
    state: string;
    createdAt: string;
    supplierProfile?: {
        onboardingPhase: number;
        onboardingComplete: boolean;
        productTypes: string[];
    };
    companyUsers: {
        user: { name: string; email: string };
    }[];
}

export const adminService = {
    async getDashboard(): Promise<AdminDashboard> {
        const response = await api.get<AdminDashboard>('/admin/dashboard');
        return response.data;
    },

    async getPendingApprovals(): Promise<PendingApproval[]> {
        const response = await api.get<PendingApproval[]>('/admin/approvals');
        return response.data;
    },

    async updateSupplierStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
        const response = await api.patch(`/admin/suppliers/${id}/status`, { status });
        return response.data;
    },

    async getSuppliers(status?: string) {
        const params = status ? { status } : undefined;
        const response = await api.get('/admin/suppliers', { params });
        return response.data;
    },

    async getBrands(status?: string) {
        const params = status ? { status } : undefined;
        const response = await api.get('/admin/brands', { params });
        return response.data;
    },

    async getAllOrders(status?: string) {
        const params = status ? { status } : undefined;
        const response = await api.get('/admin/orders', { params });
        return response.data;
    },
};
