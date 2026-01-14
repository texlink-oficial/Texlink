import api from './api';

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

export const reportsService = {
    async getUnifiedReport(startDate?: Date, endDate?: Date): Promise<UnifiedReport> {
        const params: Record<string, string> = {};
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();

        const response = await api.get<UnifiedReport>('/suppliers/reports', { params });
        return response.data;
    },
};
