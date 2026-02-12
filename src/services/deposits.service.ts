import api from './api';

export type DepositStatus = 'PREVISTO' | 'PROCESSANDO' | 'DEPOSITADO' | 'FALHOU' | 'ESTORNADO';

export interface Deposit {
    id: string;
    periodStart: string;
    periodEnd: string;
    expectedDate: string;
    paidAt?: string;
    grossAmount: number;
    feeAmount: number;
    adjustments: number;
    netAmount: number;
    status: DepositStatus;
    notes?: string;
}

export interface DepositItem {
    id: string;
    orderId: string;
    orderDisplayId: string;
    productName: string;
    brand: string;
    amount: number;
}

export interface DepositDetail extends Deposit {
    items: DepositItem[];
}

export const depositsService = {
    async getDeposits(filters?: { status?: DepositStatus; startDate?: string; endDate?: string }): Promise<Deposit[]> {
        const response = await api.get<Deposit[]>('/portal/finance/deposits', { params: filters });
        return response.data;
    },

    async getDepositById(id: string): Promise<DepositDetail> {
        const response = await api.get<DepositDetail>(`/portal/finance/deposits/${id}`);
        return response.data;
    },
};

export default depositsService;
