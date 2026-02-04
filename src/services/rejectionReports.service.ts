import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_SUPPLIERS } from './mockData';

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
// Mock Data Generators
// ========================

const generateMockSummary = (): RejectionSummary => {
  return {
    totalRejections: 156,
    totalReviewed: 1892,
    rejectionRate: 8.2,
    topReason: {
      category: RejectionCategory.DEFEITO_COSTURA,
      count: 68,
      percentage: 43.6,
    },
    worstSupplier: {
      id: 'supplier-003',
      name: 'Jeans Master',
      rejectionRate: 14.5,
      totalRejections: 42,
    },
    comparedToPreviousPeriod: {
      rejectionsDiff: 12,
      rejectionsPercentChange: 8.3,
    },
  };
};

const generateMockBySupplier = (): RejectionBySupplierResponse => {
  const suppliers: RejectionBySupplier[] = MOCK_SUPPLIERS.slice(0, 5).map((s, index) => ({
    supplierId: s.id,
    supplierName: s.tradeName,
    totalOrders: 45 - index * 5,
    totalReviewed: 380 - index * 40,
    totalRejections: 42 - index * 8,
    rejectionRate: 14.5 - index * 2.5,
    rejectedQuantity: 156 - index * 25,
    topReason: index % 2 === 0 ? RejectionCategory.DEFEITO_COSTURA : RejectionCategory.MEDIDAS_INCORRETAS,
    trend: index === 0 ? 'up' : index < 3 ? 'stable' : 'down',
  }));

  return { suppliers, totalSuppliers: suppliers.length };
};

const generateMockByReason = (): RejectionByReasonResponse => {
  const reasons: RejectionByReason[] = [
    { category: RejectionCategory.DEFEITO_COSTURA, label: 'Defeito de Costura', count: 68, percentage: 43.6, totalQuantity: 245 },
    { category: RejectionCategory.MEDIDAS_INCORRETAS, label: 'Medidas Incorretas', count: 42, percentage: 26.9, totalQuantity: 156 },
    { category: RejectionCategory.MANCHAS_SUJEIRA, label: 'Manchas/Sujeira', count: 24, percentage: 15.4, totalQuantity: 89 },
    { category: RejectionCategory.AVIAMENTOS_ERRADOS, label: 'Aviamentos Errados', count: 15, percentage: 9.6, totalQuantity: 52 },
    { category: RejectionCategory.OUTROS, label: 'Outros', count: 7, percentage: 4.5, totalQuantity: 28 },
  ];

  return { reasons };
};

const generateMockTrend = (): RejectionTrendResponse => {
  const weeks = ['01/01', '08/01', '15/01', '22/01', '29/01', '05/02'];

  const trend: RejectionTrendPoint[] = weeks.map((label, i) => {
    const totalReviewed = 280 + Math.floor(Math.random() * 80);
    const totalRejections = 18 + Math.floor(Math.random() * 15);
    return {
      date: `2024-01-${(i * 7 + 1).toString().padStart(2, '0')}`,
      label,
      totalReviewed,
      totalRejections,
      rejectionRate: Math.round((totalRejections / totalReviewed) * 1000) / 10,
    };
  });

  return { trend };
};

const generateMockDetails = (supplierId: string): RejectionDetailsResponse => {
  const supplier = MOCK_SUPPLIERS.find((s) => s.id === supplierId) || MOCK_SUPPLIERS[0];
  const categories = Object.values(RejectionCategory);
  const reasons = [
    'Costura torta na lateral',
    'Medida do comprimento fora do padrão',
    'Mancha de óleo na frente',
    'Botão errado - cor diferente',
    'Arremate solto na gola',
    'Furo no tecido',
    'Etiqueta mal posicionada',
    'Acabamento da bainha ruim',
  ];

  const details: RejectionDetail[] = Array.from({ length: 10 }, (_, i) => ({
    id: `detail-${i}`,
    reviewId: `review-${i}`,
    orderId: `order-${i}`,
    orderDisplayId: `TX-2024-${(1000 + i).toString()}`,
    productName: `Produto ${i + 1}`,
    supplierId: supplier.id,
    supplierName: supplier.tradeName,
    reason: reasons[i % reasons.length],
    category: categories[i % categories.length],
    quantity: 5 + Math.floor(Math.random() * 20),
    defectDescription: i % 2 === 0 ? 'Descrição detalhada do defeito encontrado' : null,
    requiresRework: i % 3 !== 0,
    reviewedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));

  return {
    details,
    totalCount: 42,
    page: 1,
    pageSize: 20,
  };
};

// ========================
// Service
// ========================

export const rejectionReportsService = {
  async getSummary(filters: RejectionReportFilters = {}): Promise<RejectionSummary> {
    if (MOCK_MODE) {
      await simulateDelay(600);
      return generateMockSummary();
    }

    const response = await api.get<RejectionSummary>('/reports/rejections', {
      params: filters,
    });
    return response.data;
  },

  async getBySupplier(filters: RejectionReportFilters = {}): Promise<RejectionBySupplierResponse> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return generateMockBySupplier();
    }

    const response = await api.get<RejectionBySupplierResponse>('/reports/rejections/by-supplier', {
      params: filters,
    });
    return response.data;
  },

  async getByReason(filters: RejectionReportFilters = {}): Promise<RejectionByReasonResponse> {
    if (MOCK_MODE) {
      await simulateDelay(400);
      return generateMockByReason();
    }

    const response = await api.get<RejectionByReasonResponse>('/reports/rejections/by-reason', {
      params: filters,
    });
    return response.data;
  },

  async getTrend(filters: RejectionReportFilters = {}): Promise<RejectionTrendResponse> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return generateMockTrend();
    }

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
    if (MOCK_MODE) {
      await simulateDelay(400);
      return generateMockDetails(supplierId);
    }

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
    if (MOCK_MODE) {
      await simulateDelay(800);
      // Return mock CSV
      const csv = 'Pedido;Produto;Fornecedor;Motivo;Quantidade\nTX-2024-001;Camiseta;Fornecedor A;Defeito de costura;10';
      return new Blob([csv], { type: 'text/csv' });
    }

    const response = await api.get('/reports/rejections/export', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default rejectionReportsService;
