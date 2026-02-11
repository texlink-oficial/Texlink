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

export interface RevenueHistoryItem {
    month: string;
    fullMonth?: string;
    revenue: number;
    previousRevenue: number;
    orders: number;
    growth: number;
}

export interface OrdersMonthlyStats {
    monthly: { month: string; total: number; value: number }[];
    byStatus: { status: string; name: string; count: number; value: number }[];
    byBrand: { brand: string; count: number; value: number }[];
}

export interface AdminAction {
    id: string;
    companyId: string;
    adminId: string;
    action: string;
    reason: string | null;
    previousStatus: string | null;
    newStatus: string | null;
    createdAt: string;
    company: { id: string; tradeName: string | null; legalName: string };
    admin: { id: string; name: string };
}

export interface SupplierDocument {
    id: string;
    companyId: string;
    type: string;
    status: string;
    fileName: string | null;
    fileUrl: string | null;
    fileKey: string | null;
    expiresAt: string | null;
    notes: string | null;
    createdAt: string;
    uploadedBy?: { id: string; name: string } | null;
}

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'BRAND' | 'SUPPLIER';
    isActive: boolean;
    createdAt: string;
    companyUsers: {
        id: string;
        companyRole: string;
        isCompanyAdmin: boolean;
        company: {
            id: string;
            tradeName: string | null;
            type: string;
        };
    }[];
}

export interface CreateUserData {
    email: string;
    name: string;
    password: string;
    role: 'ADMIN' | 'BRAND' | 'SUPPLIER';
    companyId?: string;
    isCompanyAdmin?: boolean;
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    role?: 'ADMIN' | 'BRAND' | 'SUPPLIER';
    isActive?: boolean;
}

export interface CreateCompanyData {
    legalName: string;
    tradeName?: string;
    document: string;
    type: 'BRAND' | 'SUPPLIER';
    city: string;
    state: string;
    phone?: string;
    email?: string;
    ownerUserId?: string;
}

export interface UpdateCompanyData {
    legalName?: string;
    tradeName?: string;
    document?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
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

    async updateSupplierStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
        const response = await api.patch(`/admin/suppliers/${id}/status`, { status, reason });
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

    async approveCompany(id: string) {
        const response = await api.patch(`/admin/approvals/${id}/approve`);
        return response.data;
    },

    async rejectCompany(id: string, reason?: string) {
        const response = await api.patch(`/admin/approvals/${id}/reject`, { reason });
        return response.data;
    },

    async getRevenueHistory(months = 6): Promise<RevenueHistoryItem[]> {
        try {
            const response = await api.get<RevenueHistoryItem[]>('/admin/dashboard/revenue-history', {
                params: { months },
            });
            return response.data;
        } catch (error) {
            console.error('[adminService.getRevenueHistory] API error:', error);
            return [];
        }
    },

    async getSupplierDocuments(supplierId: string) {
        const response = await api.get(`/admin/suppliers/${supplierId}/documents`);
        return response.data;
    },

    async getAdminActions(limit = 50): Promise<AdminAction[]> {
        const response = await api.get<AdminAction[]>('/admin/actions', { params: { limit } });
        return response.data;
    },

    async getOrdersMonthlyStats(months = 6): Promise<OrdersMonthlyStats | null> {
        try {
            const response = await api.get<OrdersMonthlyStats>('/admin/dashboard/orders-stats', {
                params: { months },
            });
            return response.data;
        } catch {
            return null;
        }
    },

    // ========== User Management ==========

    async getAllUsers(role?: string): Promise<AdminUser[]> {
        const params = role ? { role } : undefined;
        const response = await api.get<AdminUser[]>('/users', { params });
        return response.data;
    },

    async getUserById(id: string): Promise<AdminUser> {
        const response = await api.get<AdminUser>(`/users/${id}`);
        return response.data;
    },

    async createUser(data: CreateUserData): Promise<AdminUser> {
        const response = await api.post<AdminUser>('/users', data);
        return response.data;
    },

    async updateUser(id: string, data: UpdateUserData): Promise<AdminUser> {
        const response = await api.put<AdminUser>(`/users/${id}`, data);
        return response.data;
    },

    async deleteUser(id: string) {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },

    async resetPassword(id: string, newPassword: string) {
        const response = await api.post(`/users/${id}/reset-password`, { newPassword });
        return response.data;
    },

    // ========== Company Management ==========

    async createCompany(data: CreateCompanyData) {
        const response = await api.post('/admin/companies', data);
        return response.data;
    },

    async updateCompany(id: string, data: UpdateCompanyData) {
        const response = await api.patch(`/admin/companies/${id}`, data);
        return response.data;
    },

    async addUserToCompany(companyId: string, userId: string, companyRole?: string) {
        const response = await api.post(`/admin/companies/${companyId}/users`, {
            userId,
            companyRole,
        });
        return response.data;
    },

    async removeUserFromCompany(companyId: string, userId: string) {
        const response = await api.delete(`/admin/companies/${companyId}/users/${userId}`);
        return response.data;
    },
};
