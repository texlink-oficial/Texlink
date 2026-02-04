import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_SUPPLIERS } from './mockData';

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
// Mock Data Generators
// ========================

const generateMockSummary = (): DashboardSummary => {
  const activeOrders = 24;
  const onTimeCount = 18;
  const atRiskCount = 4;
  const overdueCount = 2;

  return {
    orders: {
      activeOrders,
      onTimeCount,
      onTimePercentage: Math.round((onTimeCount / activeOrders) * 100),
      atRiskCount,
      atRiskPercentage: Math.round((atRiskCount / activeOrders) * 100),
      overdueCount,
    },
    deadline: {
      avgLeadTimeDays: 12,
      generalAvgDays: 14,
      bestSupplier: { id: 'supplier-001', name: 'Confecções Silva', avgDays: 8 },
      worstSupplier: { id: 'supplier-003', name: 'Jeans Master', avgDays: 18 },
    },
    quality: {
      totalReviewed: 156,
      approvedCount: 142,
      approvedPercentage: 91,
      secondQualityCount: 8,
      secondQualityPercentage: 3,
      rejectedCount: 6,
      reworkCount: 3,
      reworkPercentage: 2,
    },
    cost: {
      totalValue: 245000,
      totalPieces: 12500,
      avgCostPerPiece: 19.6,
      plannedCost: 232750,
      actualCost: 245000,
      costDeviation: 12250,
      costDeviationPercentage: 5,
      qualityImpactCost: 4500,
    },
  };
};

const generateMockRanking = (): SuppliersRanking => {
  const mockSuppliers = MOCK_SUPPLIERS.slice(0, 5);

  const suppliers: SupplierRankingItem[] = mockSuppliers.map((s, index) => ({
    id: s.id,
    tradeName: s.tradeName,
    rank: index + 1,
    medal: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null,
    deadlineCompliance: s.onTimeDeliveryRate || 95 - index * 3,
    qualityScore: 98 - index * 2,
    volume: 2500 - index * 400,
    avgCost: 18 + index * 1.5,
    nonConformances: index,
    trend: index === 0 ? 'up' : index < 3 ? 'stable' : 'down',
  }));

  return {
    suppliers,
    totalSuppliers: suppliers.length,
  };
};

const generateMockTimeline = (): TimelineData => {
  const weeks = ['01/01', '08/01', '15/01', '22/01', '29/01', '05/02'];

  const deliveryEvolution: DeliveryEvolutionPoint[] = weeks.map((label, i) => ({
    date: `2024-01-${(i * 7 + 1).toString().padStart(2, '0')}`,
    label,
    onTimePercentage: 85 + Math.floor(Math.random() * 10),
    totalDeliveries: 20 + Math.floor(Math.random() * 15),
  }));

  const qualityBySupplier: QualityBySupplierPoint[] = MOCK_SUPPLIERS.slice(0, 5).map((s) => ({
    supplierId: s.id,
    supplierName: s.tradeName,
    approved: 80 + Math.floor(Math.random() * 20),
    secondQuality: Math.floor(Math.random() * 10),
    rejected: Math.floor(Math.random() * 5),
  }));

  const productionVolume: ProductionVolumePoint[] = weeks.map((label, i) => ({
    date: `2024-01-${(i * 7 + 1).toString().padStart(2, '0')}`,
    label,
    volume: 2000 + Math.floor(Math.random() * 1000),
    previousVolume: 1800 + Math.floor(Math.random() * 800),
  }));

  const months = ['Out/23', 'Nov/23', 'Dez/23', 'Jan/24'];
  const costComparison: CostComparisonPoint[] = months.map((label, i) => {
    const planned = 50000 + i * 5000;
    const actual = planned + Math.floor(Math.random() * 5000) - 2000;
    return {
      period: `2024-${(i + 10).toString().padStart(2, '0')}`,
      label,
      plannedCost: planned,
      actualCost: actual,
    };
  });

  return {
    deliveryEvolution,
    qualityBySupplier,
    productionVolume,
    costComparison,
  };
};

const generateMockAlerts = (): AlertsData => {
  const alerts: Alert[] = [
    {
      id: 'alert-1',
      type: 'deadline',
      severity: 'critical',
      title: 'Pedido TX-20240115-0012 em atraso',
      description: 'Camisetas Polo Masculina - 3 dias de atraso',
      entityId: 'order-001',
      entityType: 'order',
      actionUrl: '/brand/pedidos/order-001',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'alert-2',
      type: 'deadline',
      severity: 'warning',
      title: 'Pedido TX-20240120-0015 próximo do vencimento',
      description: 'Moletons Femininos - 2 dias restantes',
      entityId: 'order-002',
      entityType: 'order',
      actionUrl: '/brand/pedidos/order-002',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'alert-3',
      type: 'quality',
      severity: 'warning',
      title: 'Queda de qualidade - Jeans Master',
      description: 'Taxa de aprovação: 82%',
      entityId: 'supplier-003',
      entityType: 'supplier',
      actionUrl: '/brand/fornecedores/rel-003',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'alert-4',
      type: 'cost',
      severity: 'info',
      title: 'Desvio de custo detectado',
      description: 'Custo 8% acima do planejado no último mês',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    alerts,
    criticalCount: alerts.filter((a) => a.severity === 'critical').length,
    warningCount: alerts.filter((a) => a.severity === 'warning').length,
    infoCount: alerts.filter((a) => a.severity === 'info').length,
    totalCount: alerts.length,
  };
};

// ========================
// Service
// ========================

export const brandDashboardService = {
  async getSummary(filters: DashboardFilters = {}): Promise<DashboardSummary> {
    if (MOCK_MODE) {
      await simulateDelay(600);
      return generateMockSummary();
    }

    const response = await api.get<DashboardSummary>('/dashboard/brand/summary', {
      params: filters,
    });
    return response.data;
  },

  async getSuppliersRanking(filters: DashboardFilters = {}): Promise<SuppliersRanking> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return generateMockRanking();
    }

    const response = await api.get<SuppliersRanking>('/dashboard/brand/suppliers-ranking', {
      params: filters,
    });
    return response.data;
  },

  async getTimeline(filters: DashboardFilters = {}): Promise<TimelineData> {
    if (MOCK_MODE) {
      await simulateDelay(700);
      return generateMockTimeline();
    }

    const response = await api.get<TimelineData>('/dashboard/brand/timeline', {
      params: filters,
    });
    return response.data;
  },

  async getAlerts(filters: DashboardFilters = {}): Promise<AlertsData> {
    if (MOCK_MODE) {
      await simulateDelay(400);
      return generateMockAlerts();
    }

    const response = await api.get<AlertsData>('/dashboard/brand/alerts', {
      params: filters,
    });
    return response.data;
  },
};

export default brandDashboardService;
