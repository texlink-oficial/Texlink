import api from './api';

// ========================
// Types
// ========================

export type PeriodFilter = '7d' | '30d' | '90d' | 'custom';

export interface DashboardFilters {
  period?: PeriodFilter;
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  productType?: string;
}

export interface OrdersKpi {
  activeOrders: number;
  onTimeCount: number;
  onTimePercentage: number;
  atRiskCount: number;
  atRiskPercentage: number;
  overdueCount: number;
}

export interface DeadlineKpi {
  avgLeadTimeDays: number;
  generalAvgDays: number;
  bestSupplier: { id: string; name: string; avgDays: number } | null;
  worstSupplier: { id: string; name: string; avgDays: number } | null;
}

export interface QualityKpi {
  totalReviewed: number;
  approvedCount: number;
  approvedPercentage: number;
  secondQualityCount: number;
  secondQualityPercentage: number;
  rejectedCount: number;
  reworkCount: number;
  reworkPercentage: number;
}

export interface CostKpi {
  totalValue: number;
  totalPieces: number;
  avgCostPerPiece: number;
  plannedCost: number;
  actualCost: number;
  costDeviation: number;
  costDeviationPercentage: number;
  qualityImpactCost: number;
}

export interface DashboardSummary {
  orders: OrdersKpi;
  deadline: DeadlineKpi;
  quality: QualityKpi;
  cost: CostKpi;
}

export type MedalType = 'gold' | 'silver' | 'bronze' | null;

export interface SupplierRankingItem {
  id: string;
  tradeName: string;
  rank: number;
  medal: MedalType;
  deadlineCompliance: number;
  qualityScore: number;
  volume: number;
  avgCost: number;
  nonConformances: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SuppliersRanking {
  suppliers: SupplierRankingItem[];
  totalSuppliers: number;
}

export interface DeliveryEvolutionPoint {
  date: string;
  label: string;
  onTimePercentage: number;
  totalDeliveries: number;
}

export interface QualityBySupplierPoint {
  supplierId: string;
  supplierName: string;
  approved: number;
  secondQuality: number;
  rejected: number;
}

export interface ProductionVolumePoint {
  date: string;
  label: string;
  volume: number;
  previousVolume?: number;
}

export interface CostComparisonPoint {
  period: string;
  label: string;
  plannedCost: number;
  actualCost: number;
}

export interface TimelineData {
  deliveryEvolution: DeliveryEvolutionPoint[];
  qualityBySupplier: QualityBySupplierPoint[];
  productionVolume: ProductionVolumePoint[];
  costComparison: CostComparisonPoint[];
}

export type AlertType = 'deadline' | 'quality' | 'cost' | 'supplier';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityId?: string;
  entityType?: 'order' | 'supplier';
  actionUrl?: string;
  createdAt: string;
}

export interface AlertsData {
  alerts: Alert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
}

// ========================
// Service
// ========================

export const brandDashboardService = {
  async getSummary(filters: DashboardFilters = {}): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>('/dashboard/brand/summary', {
      params: filters,
    });
    return response.data;
  },

  async getSuppliersRanking(filters: DashboardFilters = {}): Promise<SuppliersRanking> {
    const response = await api.get<SuppliersRanking>('/dashboard/brand/suppliers-ranking', {
      params: filters,
    });
    return response.data;
  },

  async getTimeline(filters: DashboardFilters = {}): Promise<TimelineData> {
    const response = await api.get<TimelineData>('/dashboard/brand/timeline', {
      params: filters,
    });
    return response.data;
  },

  async getAlerts(filters: DashboardFilters = {}): Promise<AlertsData> {
    const response = await api.get<AlertsData>('/dashboard/brand/alerts', {
      params: filters,
    });
    return response.data;
  },
};

export default brandDashboardService;
