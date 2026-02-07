import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

export interface ReportPeriod {
    start: Date;
    end: Date;
}

export interface ReportSummary {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
    avgRating: number;
}

export interface SalesData {
    accepted: number;
    rejected: number;
    completed: number;
    acceptanceRate: number;
}

export interface CancellationReason {
    reason: string;
    count: number;
    value: number;
    percentage: number;
}

export interface CancellationRecord {
    id: string;
    code: string;
    date: string;
    brand: string;
    reason: string;
    value: number;
}

export interface CancellationsData {
    total: number;
    totalLoss: number;
    percentage: string;
    byReason: CancellationReason[];
    recent: CancellationRecord[];
}

export interface QualityData {
    avgRating: number;
    completionRate: number;
}

export interface UnifiedReport {
    period: ReportPeriod;
    summary: ReportSummary;
    sales: SalesData;
    cancellations: CancellationsData;
    quality: QualityData;
}

// Mock data for reports
const generateMockReport = (startDate?: Date, endDate?: Date): UnifiedReport => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return {
        period: {
            start: startDate || thirtyDaysAgo,
            end: endDate || now
        },
        summary: {
            totalOrders: 45,
            totalRevenue: 125000,
            avgTicket: 2777.78,
            avgRating: 4.8
        },
        sales: {
            accepted: 42,
            rejected: 3,
            completed: 38,
            acceptanceRate: 93.3
        },
        cancellations: {
            total: 3,
            totalLoss: 8500,
            percentage: '6.7%',
            byReason: [
                { reason: 'Prazo inviável', count: 1, value: 3500, percentage: 41 },
                { reason: 'Falta de material', count: 1, value: 2800, percentage: 33 },
                { reason: 'Capacidade excedida', count: 1, value: 2200, percentage: 26 }
            ],
            recent: [
                { id: '1', code: 'TX-20260115-0010', date: '2026-01-15', brand: 'Marca Fashion', reason: 'Prazo inviável', value: 3500 },
                { id: '2', code: 'TX-20260112-0008', date: '2026-01-12', brand: 'TrendWear', reason: 'Falta de material', value: 2800 },
                { id: '3', code: 'TX-20260108-0005', date: '2026-01-08', brand: 'StyleCo', reason: 'Capacidade excedida', value: 2200 }
            ]
        },
        quality: {
            avgRating: 4.8,
            completionRate: 98.5
        }
    };
};

export const reportsService = {
    async getUnifiedReport(startDate?: Date, endDate?: Date): Promise<UnifiedReport> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            return generateMockReport(startDate, endDate);
        }

        const params: Record<string, string> = {};
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();

        const response = await api.get<UnifiedReport>('/suppliers/reports', { params });
        return response.data;
    },

    async exportReport(
        format: 'pdf' | 'excel',
        startDate?: string,
        endDate?: string,
    ): Promise<Blob> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            const content = format === 'pdf' ? 'Mock PDF' : 'Mock Excel';
            const type = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            return new Blob([content], { type });
        }

        const params: Record<string, string> = { format };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get('/suppliers/reports/export', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },
};
