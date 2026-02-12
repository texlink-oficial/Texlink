import api from './api';

// Types
export interface PortalSummary {
    activeOrders: number;
    pendingAccept: number;
    upcomingDeliveries: number;
    pendingDocuments: number;
    bankDataComplete: boolean;
    alerts: PortalAlert[];
}

export interface PortalAlert {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message?: string;
    actionLabel?: string;
    actionPath?: string;
}

export interface TrendPoint {
    date: string;
    label: string;
    value: number;
}

export interface PlatformAverage {
    onTimeDeliveryRate: number;
    qualityScore: number;
    rejectionRate: number;
    avgLeadTime: number;
}

export interface PerformanceData {
    completedOrders: number;
    acceptanceRate: number;
    avgLeadTime: number;
    cancellationRate: number;
    totalRevenue: number;
    chartData: { date: string; value: number }[];
    byStatus: { status: string; count: number; value: number }[];
    byBrand: { brand: string; count: number; value: number }[];
    onTimeDeliveryTrend?: TrendPoint[];
    qualityScoreTrend?: TrendPoint[];
    rejectionRateTrend?: TrendPoint[];
    platformAverage?: PlatformAverage;
}

export interface RevenueHistoryItem {
    month: string;
    revenue: number;
    orders: number;
}

export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    brandId?: string;
}

export interface ReportData<T = unknown> {
    summary: Record<string, number | string>;
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export const portalService = {
    async getSummary(): Promise<PortalSummary> {
        const response = await api.get<PortalSummary>('/portal/summary');
        return response.data;
    },

    async getPerformance(startDate?: string, endDate?: string): Promise<PerformanceData> {
        const response = await api.get<PerformanceData>('/portal/performance', {
            params: { start: startDate, end: endDate },
        });
        return response.data;
    },

    async getQualityReport(filters: ReportFilters): Promise<ReportData> {
        const response = await api.get('/portal/reports/quality', { params: filters });
        return response.data;
    },

    async getSalesReport(filters: ReportFilters): Promise<ReportData> {
        const response = await api.get('/portal/reports/sales', { params: filters });
        return response.data;
    },

    async getCancellationsReport(filters: ReportFilters): Promise<ReportData> {
        const response = await api.get('/portal/reports/cancellations', { params: filters });
        return response.data;
    },

    async dismissAlert(alertId: string): Promise<void> {
        await api.post(`/portal/alerts/${alertId}/dismiss`);
    },

    async getRevenueHistory(months = 6): Promise<RevenueHistoryItem[]> {
        const response = await api.get<RevenueHistoryItem[]>('/portal/revenue-history', {
            params: { months },
        });
        return response.data;
    },
};

export default portalService;
