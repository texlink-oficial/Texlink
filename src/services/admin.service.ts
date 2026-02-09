import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_ADMIN_DASHBOARD, MOCK_PENDING_APPROVALS, MOCK_SUPPLIERS, MOCK_ORDERS } from './mockData';

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

// Generate mock admin dashboard
const generateMockAdminDashboard = (): AdminDashboard => ({
    metrics: {
        totalOrders: MOCK_ORDERS.length + 45,
        activeOrders: MOCK_ORDERS.filter(o => !['FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(o.status)).length,
        completedOrders: 42,
        totalSuppliers: MOCK_SUPPLIERS.length + 33,
        activeSuppliers: MOCK_SUPPLIERS.length,
        pendingSuppliers: MOCK_PENDING_APPROVALS.filter(a => a.type === 'SUPPLIER').length,
        totalBrands: MOCK_ADMIN_DASHBOARD.totalBrands,
        totalRevenue: MOCK_ADMIN_DASHBOARD.totalVolume
    },
    recentOrders: MOCK_ORDERS.slice(0, 5).map(o => ({
        id: o.id,
        displayId: o.displayId,
        status: o.status,
        totalValue: o.totalValue,
        createdAt: o.createdAt,
        brand: { tradeName: o.brand?.tradeName || 'N/A' },
        supplier: o.supplier ? { tradeName: o.supplier.tradeName } : null
    }))
});

// Convert pending approvals to the expected format
const convertPendingApprovals = (): PendingApproval[] =>
    MOCK_PENDING_APPROVALS.map(a => ({
        id: a.id,
        legalName: a.company.legalName,
        tradeName: a.company.tradeName,
        document: a.company.cnpj,
        city: a.company.city,
        state: a.company.state,
        createdAt: a.submittedAt,
        supplierProfile: a.type === 'SUPPLIER' ? {
            onboardingPhase: 2,
            onboardingComplete: false,
            productTypes: ['Camisetas', 'Moletons']
        } : undefined,
        companyUsers: [{
            user: { name: 'Responsável Demo', email: 'responsavel@demo.com' }
        }]
    }));

export const adminService = {
    async getDashboard(): Promise<AdminDashboard> {
        console.log('[adminService.getDashboard] MOCK_MODE:', MOCK_MODE);
        if (MOCK_MODE) {
            console.log('[adminService.getDashboard] Returning MOCK data');
            await simulateDelay(500);
            return generateMockAdminDashboard();
        }

        console.log('[adminService.getDashboard] Fetching from API...');
        const response = await api.get<AdminDashboard>('/admin/dashboard');
        console.log('[adminService.getDashboard] API response:', response.data);
        return response.data;
    },

    async getPendingApprovals(): Promise<PendingApproval[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return convertPendingApprovals();
        }

        const response = await api.get<PendingApproval[]>('/admin/approvals');
        return response.data;
    },

    async updateSupplierStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log(`[MOCK] Supplier ${id} status updated to ${status}, reason: ${reason}`);
            return { success: true, message: `Status atualizado para ${status} (modo demo)` };
        }

        const response = await api.patch(`/admin/suppliers/${id}/status`, { status, reason });
        return response.data;
    },

    async getSuppliers(status?: string) {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_SUPPLIERS.map(s => ({
                ...s,
                status: status || s.status
            }));
        }

        const params = status ? { status } : undefined;
        const response = await api.get('/admin/suppliers', { params });
        return response.data;
    },

    async getBrands(status?: string) {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return [
                { id: 'brand-001', tradeName: 'Fashion Style Ltda', status: 'APPROVED', ordersCount: 45 },
                { id: 'brand-002', tradeName: 'TrendWear', status: 'APPROVED', ordersCount: 32 },
                { id: 'brand-003', tradeName: 'Urban Style', status: 'APPROVED', ordersCount: 28 },
                { id: 'brand-004', tradeName: 'ModaCerta', status: 'APPROVED', ordersCount: 15 },
                { id: 'brand-005', tradeName: 'StyleCo', status: 'PENDING', ordersCount: 0 }
            ];
        }

        const params = status ? { status } : undefined;
        const response = await api.get('/admin/brands', { params });
        return response.data;
    },

    async getAllOrders(status?: string) {
        if (MOCK_MODE) {
            await simulateDelay(500);
            let orders = [...MOCK_ORDERS];
            if (status) {
                orders = orders.filter(o => o.status === status);
            }
            return orders;
        }

        const params = status ? { status } : undefined;
        const response = await api.get('/admin/orders', { params });
        return response.data;
    },

    async approveCompany(id: string) {
        if (MOCK_MODE) {
            await simulateDelay(800);
            console.log(`[MOCK] Company ${id} approved`);
            return { success: true, message: 'Empresa aprovada (modo demo)' };
        }

        const response = await api.patch(`/admin/approvals/${id}/approve`);
        return response.data;
    },

    async rejectCompany(id: string, reason?: string) {
        if (MOCK_MODE) {
            await simulateDelay(800);
            console.log(`[MOCK] Company ${id} rejected:`, reason);
            return { success: true, message: 'Empresa rejeitada (modo demo)' };
        }

        const response = await api.patch(`/admin/approvals/${id}/reject`, { reason });
        return response.data;
    },

    async getRevenueHistory(months = 6): Promise<RevenueHistoryItem[]> {
        console.log('[adminService.getRevenueHistory] MOCK_MODE:', MOCK_MODE);
        if (MOCK_MODE) {
            console.log('[adminService.getRevenueHistory] Returning MOCK data');
            await simulateDelay(300);
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
            return monthNames.map((month, i) => ({
                month,
                revenue: 50000 + (i * 10000) + Math.floor(Math.random() * 15000),
                previousRevenue: 40000 + (i * 8000) + Math.floor(Math.random() * 10000),
                orders: 20 + i * 5,
                growth: 10 + Math.floor(Math.random() * 15),
            }));
        }

        try {
            console.log('[adminService.getRevenueHistory] Fetching from API...');
            const response = await api.get<RevenueHistoryItem[]>('/admin/dashboard/revenue-history', {
                params: { months },
            });
            console.log('[adminService.getRevenueHistory] API response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[adminService.getRevenueHistory] API error:', error);
            return [];
        }
    },

    async getSupplierDocuments(supplierId: string) {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return [];
        }

        const response = await api.get(`/admin/suppliers/${supplierId}/documents`);
        return response.data;
    },

    async getAdminActions(limit = 50): Promise<AdminAction[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return [
                {
                    id: 'mock-1',
                    companyId: 'company-1',
                    adminId: 'admin-1',
                    action: 'APPROVED',
                    reason: 'Documentacao completa',
                    previousStatus: 'PENDING',
                    newStatus: 'ACTIVE',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    company: { id: 'company-1', tradeName: 'Faccao Demo', legalName: 'Demo LTDA' },
                    admin: { id: 'admin-1', name: 'Admin Demo' },
                },
                {
                    id: 'mock-2',
                    companyId: 'company-2',
                    adminId: 'admin-1',
                    action: 'REJECTED',
                    reason: 'Documentacao incompleta',
                    previousStatus: 'PENDING',
                    newStatus: 'SUSPENDED',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    company: { id: 'company-2', tradeName: 'Faccao Teste', legalName: 'Teste ME' },
                    admin: { id: 'admin-1', name: 'Admin Demo' },
                },
            ];
        }

        const response = await api.get<AdminAction[]>('/admin/actions', { params: { limit } });
        return response.data;
    },

    async getOrdersMonthlyStats(months = 6): Promise<OrdersMonthlyStats | null> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return null;
        }

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
        if (MOCK_MODE) {
            await simulateDelay(400);
            return [];
        }

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
