import api from './api';

// ========================
// Types
// ========================

export type PeriodFilter = '7d' | '30d' | '90d' | 'custom';

export enum RejectionCategory {
  DEFEITO_COSTURA = 'DEFEITO_COSTURA',
  MEDIDAS_INCORRETAS = 'MEDIDAS_INCORRETAS',
  MANCHAS_SUJEIRA = 'MANCHAS_SUJEIRA',
  AVIAMENTOS_ERRADOS = 'AVIAMENTOS_ERRADOS',
  OUTROS = 'OUTROS',
}

export const REJECTION_CATEGORY_LABELS: Record<RejectionCategory, string> = {
  [RejectionCategory.DEFEITO_COSTURA]: 'Defeito de Costura',
  [RejectionCategory.MEDIDAS_INCORRETAS]: 'Medidas Incorretas',
  [RejectionCategory.MANCHAS_SUJEIRA]: 'Manchas/Sujeira',
  [RejectionCategory.AVIAMENTOS_ERRADOS]: 'Aviamentos Errados',
  [RejectionCategory.OUTROS]: 'Outros',
};

export const REJECTION_CATEGORY_COLORS: Record<RejectionCategory, string> = {
  [RejectionCategory.DEFEITO_COSTURA]: '#ef4444',
  [RejectionCategory.MEDIDAS_INCORRETAS]: '#f97316',
  [RejectionCategory.MANCHAS_SUJEIRA]: '#eab308',
  [RejectionCategory.AVIAMENTOS_ERRADOS]: '#8b5cf6',
  [RejectionCategory.OUTROS]: '#6b7280',
};

export interface RejectionReportFilters {
  period?: PeriodFilter;
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  productType?: string;
  reasonCategory?: RejectionCategory;
}

export interface RejectionSummary {
  totalRejections: number;
  totalReviewed: number;
  rejectionRate: number;
  topReason: {
    category: RejectionCategory;
    count: number;
    percentage: number;
  } | null;
  worstSupplier: {
    id: string;
    name: string;
    rejectionRate: number;
    totalRejections: number;
  } | null;
  comparedToPreviousPeriod: {
    rejectionsDiff: number;
    rejectionsPercentChange: number;
  };
}

export interface RejectionBySupplier {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalReviewed: number;
  totalRejections: number;
  rejectionRate: number;
  rejectedQuantity: number;
  topReason: RejectionCategory | null;
  trend: 'up' | 'down' | 'stable';
}

export interface RejectionByReason {
  category: RejectionCategory;
  label: string;
  count: number;
  percentage: number;
  totalQuantity: number;
}

export interface RejectionTrendPoint {
  date: string;
  label: string;
  totalReviewed: number;
  totalRejections: number;
  rejectionRate: number;
}

export interface RejectionDetail {
  id: string;
  reviewId: string;
  orderId: string;
  orderDisplayId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  reason: string;
  category: RejectionCategory;
  quantity: number;
  defectDescription: string | null;
  requiresRework: boolean;
  reviewedAt: string;
}

export interface RejectionBySupplierResponse {
  suppliers: RejectionBySupplier[];
  totalSuppliers: number;
}

export interface RejectionByReasonResponse {
  reasons: RejectionByReason[];
}

export interface RejectionTrendResponse {
  trend: RejectionTrendPoint[];
}

export interface RejectionDetailsResponse {
  details: RejectionDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ========================
// Service
// ========================

export const rejectionReportsService = {
  async getSummary(filters: RejectionReportFilters = {}): Promise<RejectionSummary> {
    const response = await api.get<RejectionSummary>('/reports/rejections', {
      params: filters,
    });
    return response.data;
  },

  async getBySupplier(filters: RejectionReportFilters = {}): Promise<RejectionBySupplierResponse> {
    const response = await api.get<RejectionBySupplierResponse>('/reports/rejections/by-supplier', {
      params: filters,
    });
    return response.data;
  },

  async getByReason(filters: RejectionReportFilters = {}): Promise<RejectionByReasonResponse> {
    const response = await api.get<RejectionByReasonResponse>('/reports/rejections/by-reason', {
      params: filters,
    });
    return response.data;
  },

  async getTrend(filters: RejectionReportFilters = {}): Promise<RejectionTrendResponse> {
    const response = await api.get<RejectionTrendResponse>('/reports/rejections/trend', {
      params: filters,
    });
    return response.data;
  },

  async getDetails(
    supplierId: string,
    filters: RejectionReportFilters = {},
    page: number = 1,
    pageSize: number = 20,
  ): Promise<RejectionDetailsResponse> {
    const response = await api.get<RejectionDetailsResponse>(
      `/reports/rejections/details/${supplierId}`,
      {
        params: { ...filters, page, pageSize },
      },
    );
    return response.data;
  },

  async exportReport(
    filters: RejectionReportFilters = {},
    format: 'csv' | 'xlsx' | 'pdf' = 'csv',
  ): Promise<Blob> {
    const response = await api.get('/reports/rejections/export', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default rejectionReportsService;
