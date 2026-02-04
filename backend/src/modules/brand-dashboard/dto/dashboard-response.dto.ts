// ========================
// KPI Response Types
// ========================

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
  bestSupplier: {
    id: string;
    name: string;
    avgDays: number;
  } | null;
  worstSupplier: {
    id: string;
    name: string;
    avgDays: number;
  } | null;
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

export interface DashboardSummaryResponse {
  orders: OrdersKpi;
  deadline: DeadlineKpi;
  quality: QualityKpi;
  cost: CostKpi;
}

// ========================
// Supplier Ranking Types
// ========================

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

export interface SuppliersRankingResponse {
  suppliers: SupplierRankingItem[];
  totalSuppliers: number;
}

// ========================
// Timeline/Charts Types
// ========================

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

export interface TimelineDataResponse {
  deliveryEvolution: DeliveryEvolutionPoint[];
  qualityBySupplier: QualityBySupplierPoint[];
  productionVolume: ProductionVolumePoint[];
  costComparison: CostComparisonPoint[];
}

// ========================
// Alerts Types
// ========================

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

export interface AlertsResponse {
  alerts: Alert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
}
