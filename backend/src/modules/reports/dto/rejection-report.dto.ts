import { RejectionCategory } from './rejection-filters.dto';

// Summary KPIs
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

// By Supplier breakdown
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

// By Reason breakdown
export interface RejectionByReason {
  category: RejectionCategory;
  label: string;
  count: number;
  percentage: number;
  totalQuantity: number;
}

// Trend data point for line chart
export interface RejectionTrendPoint {
  date: string;
  label: string;
  totalReviewed: number;
  totalRejections: number;
  rejectionRate: number;
}

// Detail item for drill-down
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
  reviewedAt: Date;
}

// Response DTOs
export class RejectionSummaryResponse {
  summary: RejectionSummary;
}

export class RejectionBySupplierResponse {
  suppliers: RejectionBySupplier[];
  totalSuppliers: number;
}

export class RejectionByReasonResponse {
  reasons: RejectionByReason[];
}

export class RejectionTrendResponse {
  trend: RejectionTrendPoint[];
}

export class RejectionDetailsResponse {
  details: RejectionDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Category labels for frontend
export const REJECTION_CATEGORY_LABELS: Record<RejectionCategory, string> = {
  [RejectionCategory.DEFEITO_COSTURA]: 'Defeito de Costura',
  [RejectionCategory.MEDIDAS_INCORRETAS]: 'Medidas Incorretas',
  [RejectionCategory.MANCHAS_SUJEIRA]: 'Manchas/Sujeira',
  [RejectionCategory.AVIAMENTOS_ERRADOS]: 'Aviamentos Errados',
  [RejectionCategory.OUTROS]: 'Outros',
};
