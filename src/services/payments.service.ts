import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_PAYMENTS_BRAND, MOCK_ORDERS } from './mockData';

export type PaymentStatus = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'ATRASADO';

export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: PaymentStatus;
    method?: string;
    proofUrl?: string;
    notes?: string;
    createdAt: string;
    order?: {
        displayId: string;
        productName: string;
        brand?: { tradeName: string };
    };
}

export interface FinancialDashboard {
    totalReceivable: number;
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    pendingPayments: Payment[];
    overduePayments: Payment[];
    recentPayments: Payment[];
    monthlyData: {
        month: string;
        received: number;
        pending: number;
    }[];
}

export interface UpdatePaymentDto {
    status?: PaymentStatus;
    paidDate?: string;
    method?: string;
    proofUrl?: string;
    notes?: string;
}

// Generate mock payments from orders
const generateMockPayments = (): Payment[] => {
    const today = new Date();
    return MOCK_PAYMENTS_BRAND.map((p, i) => ({
        id: `payment-${i + 1}`,
        orderId: p.orderId,
        amount: p.amount,
        dueDate: p.dueDate,
        paidDate: p.paidAt || undefined,
        status: p.status as PaymentStatus,
        createdAt: p.dueDate,
        order: {
            displayId: p.displayId,
            productName: MOCK_ORDERS.find(o => o.id === p.orderId)?.productName || 'Produto Demo',
            brand: { tradeName: 'Fashion Style Ltda' }
        }
    }));
};

// Generate mock financial dashboard
const generateMockFinancialDashboard = (): FinancialDashboard => {
    const payments = generateMockPayments();
    const pending = payments.filter(p => p.status === 'PENDENTE');
    const paid = payments.filter(p => p.status === 'PAGO');
    const overdue = payments.filter(p => p.status === 'ATRASADO');

    return {
        totalReceivable: payments.reduce((sum, p) => sum + p.amount, 0),
        totalReceived: paid.reduce((sum, p) => sum + p.amount, 0),
        totalPending: pending.reduce((sum, p) => sum + p.amount, 0),
        totalOverdue: overdue.reduce((sum, p) => sum + p.amount, 0),
        pendingPayments: pending,
        overduePayments: overdue,
        recentPayments: paid.slice(0, 5),
        monthlyData: [
            { month: 'Set', received: 45000, pending: 12000 },
            { month: 'Out', received: 52000, pending: 8000 },
            { month: 'Nov', received: 68000, pending: 15000 },
            { month: 'Dez', received: 78000, pending: 10000 },
            { month: 'Jan', received: 42000, pending: 25000 }
        ]
    };
};

// In-memory state for mock mode
let mockPaymentsState = generateMockPayments();

export const paymentsService = {
    async getFinancialDashboard(): Promise<FinancialDashboard> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return generateMockFinancialDashboard();
        }

        const response = await api.get<FinancialDashboard>('/payments/dashboard');
        return response.data;
    },

    async getPayments(filters?: { status?: PaymentStatus; orderId?: string }): Promise<Payment[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            let payments = [...mockPaymentsState];
            if (filters?.status) {
                payments = payments.filter(p => p.status === filters.status);
            }
            if (filters?.orderId) {
                payments = payments.filter(p => p.orderId === filters.orderId);
            }
            return payments;
        }

        const response = await api.get<Payment[]>('/payments', { params: filters });
        return response.data;
    },

    async getPaymentById(id: string): Promise<Payment> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const payment = mockPaymentsState.find(p => p.id === id);
            if (!payment) throw new Error('Pagamento não encontrado');
            return payment;
        }

        const response = await api.get<Payment>(`/payments/${id}`);
        return response.data;
    },

    async updatePayment(id: string, data: UpdatePaymentDto): Promise<Payment> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const index = mockPaymentsState.findIndex(p => p.id === id);
            if (index === -1) throw new Error('Pagamento não encontrado');
            mockPaymentsState[index] = { ...mockPaymentsState[index], ...data };
            return mockPaymentsState[index];
        }

        const response = await api.patch<Payment>(`/payments/${id}`, data);
        return response.data;
    },

    async markAsPaid(id: string, method?: string): Promise<Payment> {
        return this.updatePayment(id, {
            status: 'PAGO',
            paidDate: new Date().toISOString(),
            method,
        });
    },

    async exportReport(format: 'csv' | 'pdf'): Promise<Blob> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            // Return a mock blob
            const content = format === 'csv'
                ? 'ID,Pedido,Valor,Status,Vencimento\n1,TX-001,18000,PAGO,2026-01-10'
                : 'Mock PDF content';
            return new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
        }

        const response = await api.get(`/payments/export`, {
            params: { format },
            responseType: 'blob',
        });
        return response.data;
    },
};
