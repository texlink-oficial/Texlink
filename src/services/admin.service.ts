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
        if (MOCK_MODE) {
            await simulateDelay(500);
            return generateMockAdminDashboard();
        }

        const response = await api.get<AdminDashboard>('/admin/dashboard');
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

    async updateSupplierStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log(`[MOCK] Supplier ${id} status updated to ${status}`);
            return { success: true, message: `Status atualizado para ${status} (modo demo)` };
        }

        const response = await api.patch(`/admin/suppliers/${id}/status`, { status });
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
    }
};
