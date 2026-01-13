import api from './api';

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

export const paymentsService = {
    async getFinancialDashboard(): Promise<FinancialDashboard> {
        const response = await api.get<FinancialDashboard>('/payments/dashboard');
        return response.data;
    },

    async getPayments(filters?: { status?: PaymentStatus; orderId?: string }): Promise<Payment[]> {
        const response = await api.get<Payment[]>('/payments', { params: filters });
        return response.data;
    },

    async getPaymentById(id: string): Promise<Payment> {
        const response = await api.get<Payment>(`/payments/${id}`);
        return response.data;
    },

    async updatePayment(id: string, data: UpdatePaymentDto): Promise<Payment> {
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
        const response = await api.get(`/payments/export`, {
            params: { format },
            responseType: 'blob',
        });
        return response.data;
    },
};
