import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_SUPPLIERS } from './mockData';

// ========================
// Types
// ========================

export enum CapacityPeriodFilter {
  CURRENT_MONTH = 'current_month',
  NEXT_MONTH = 'next_month',
  QUARTER = 'quarter',
  CUSTOM = 'custom',
}

export interface CapacityReportFilters {
  period?: CapacityPeriodFilter;
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  productType?: string;
  projectionMonths?: number;
}

export interface CapacitySummary {
  totalCapacity: number;
  allocatedByBrand: number;
  brandOccupationRate: number;
  availableCapacity: number;
  totalSuppliers: number;
  activeOrdersCount: number;
}

export interface CapacityBySupplier {
  supplierId: string;
  supplierName: string;
  totalCapacity: number;
  brandAllocation: number;
  brandOccupationRate: number;
  otherBrandsAllocation: number;
  freeCapacity: number;
  trend: 'up' | 'down' | 'stable';
  activeOrdersCount: number;
}

export enum CapacityAlertType {
  NEAR_FULL = 'NEAR_FULL',
  UNDERUTILIZED = 'UNDERUTILIZED',
  DEMAND_PEAK = 'DEMAND_PEAK',
  NO_CAPACITY = 'NO_CAPACITY',
}

export enum CapacityAlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

export interface CapacityAlert {
  type: CapacityAlertType;
  severity: CapacityAlertSeverity;
  supplierId: string | null;
  supplierName: string | null;
  message: string;
  value?: number;
}

export interface CapacityTrendPoint {
  month: string;
  label: string;
  totalCapacity: number;
  brandAllocation: number;
  occupationRate: number;
  isProjection: boolean;
}

export interface CapacityBySupplierResponse {
  suppliers: CapacityBySupplier[];
  totalSuppliers: number;
}

export interface CapacityAlertsResponse {
  alerts: CapacityAlert[];
}

export interface CapacityTrendResponse {
  trend: CapacityTrendPoint[];
}

// ========================
// Mock Data Generators
// ========================

const generateMockSummary = (): CapacitySummary => {
  return {
    totalCapacity: 15000,
    allocatedByBrand: 9500,
    brandOccupationRate: 63.3,
    availableCapacity: 5500,
    totalSuppliers: 5,
    activeOrdersCount: 23,
  };
};

const generateMockBySupplier = (): CapacityBySupplierResponse => {
  const suppliers: CapacityBySupplier[] = MOCK_SUPPLIERS.slice(0, 5).map((s, index) => ({
    supplierId: s.id,
    supplierName: s.tradeName,
    totalCapacity: 3000 - index * 200,
    brandAllocation: 2400 - index * 400,
    brandOccupationRate: 80 - index * 12,
    otherBrandsAllocation: 400 - index * 50,
    freeCapacity: 200 + index * 250,
    trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'stable',
    activeOrdersCount: 8 - index,
  }));

  return { suppliers, totalSuppliers: suppliers.length };
};

const generateMockAlerts = (): CapacityAlertsResponse => {
  const alerts: CapacityAlert[] = [
    {
      type: CapacityAlertType.NEAR_FULL,
      severity: CapacityAlertSeverity.CRITICAL,
      supplierId: 'supplier-001',
      supplierName: 'Confecções Elite',
      message: 'Confecções Elite está quase na capacidade máxima (92%)',
      value: 92,
    },
    {
      type: CapacityAlertType.UNDERUTILIZED,
      severity: CapacityAlertSeverity.WARNING,
      supplierId: 'supplier-004',
      supplierName: 'Tricot Brasil',
      message: 'Tricot Brasil está subutilizada (22%)',
      value: 22,
    },
    {
      type: CapacityAlertType.NO_CAPACITY,
      severity: CapacityAlertSeverity.INFO,
      supplierId: 'supplier-005',
      supplierName: 'Facção XYZ',
      message: 'Facção XYZ não possui capacidade definida',
    },
  ];

  return { alerts };
};

const generateMockTrend = (): CapacityTrendResponse => {
  const months = [
    'ago/25',
    'set/25',
    'out/25',
    'nov/25',
    'dez/25',
    'jan/26',
    'fev/26',
    'mar/26',
    'abr/26',
  ];

  const trend: CapacityTrendPoint[] = months.map((label, i) => {
    const isProjection = i >= 6;
    const baseAllocation = 8000;
    const growth = i * 200;

    return {
      month: `2025-${String(i + 8).padStart(2, '0')}`,
      label,
      totalCapacity: 15000,
      brandAllocation: baseAllocation + growth + (isProjection ? Math.floor(Math.random() * 200) : 0),
      occupationRate: Math.round(((baseAllocation + growth) / 15000) * 1000) / 10,
      isProjection,
    };
  });

  return { trend };
};

// ========================
// Service
// ========================

export const capacityReportsService = {
  async getSummary(filters: CapacityReportFilters = {}): Promise<CapacitySummary> {
    if (MOCK_MODE) {
      await simulateDelay(600);
      return generateMockSummary();
    }

    const response = await api.get<CapacitySummary>('/reports/capacity', {
      params: filters,
    });
    return response.data;
  },

  async getBySupplier(filters: CapacityReportFilters = {}): Promise<CapacityBySupplierResponse> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return generateMockBySupplier();
    }

    const response = await api.get<CapacityBySupplierResponse>('/reports/capacity/by-supplier', {
      params: filters,
    });
    return response.data;
  },

  async getAlerts(filters: CapacityReportFilters = {}): Promise<CapacityAlertsResponse> {
    if (MOCK_MODE) {
      await simulateDelay(400);
      return generateMockAlerts();
    }

    const response = await api.get<CapacityAlertsResponse>('/reports/capacity/alerts', {
      params: filters,
    });
    return response.data;
  },

  async getTrend(filters: CapacityReportFilters = {}): Promise<CapacityTrendResponse> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return generateMockTrend();
    }

    const response = await api.get<CapacityTrendResponse>('/reports/capacity/trend', {
      params: filters,
    });
    return response.data;
  },

  async exportReport(
    filters: CapacityReportFilters = {},
    format: 'csv' | 'xlsx' = 'csv',
  ): Promise<Blob> {
    if (MOCK_MODE) {
      await simulateDelay(800);
      const csv = 'Facção;Capacidade Total;Alocação da Marca;Taxa de Ocupação;Outras Marcas;Capacidade Livre;Pedidos Ativos;Tendência\nConfecções Elite;3000;2400;80%;400;200;8;up';
      return new Blob([csv], { type: 'text/csv' });
    }

    const response = await api.get('/reports/capacity/export', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default capacityReportsService;
