import api from './api';

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
// Service
// ========================

export const capacityReportsService = {
  async getSummary(filters: CapacityReportFilters = {}): Promise<CapacitySummary> {
    const response = await api.get<CapacitySummary>('/reports/capacity', {
      params: filters,
    });
    return response.data;
  },

  async getBySupplier(filters: CapacityReportFilters = {}): Promise<CapacityBySupplierResponse> {
    const response = await api.get<CapacityBySupplierResponse>('/reports/capacity/by-supplier', {
      params: filters,
    });
    return response.data;
  },

  async getAlerts(filters: CapacityReportFilters = {}): Promise<CapacityAlertsResponse> {
    const response = await api.get<CapacityAlertsResponse>('/reports/capacity/alerts', {
      params: filters,
    });
    return response.data;
  },

  async getTrend(filters: CapacityReportFilters = {}): Promise<CapacityTrendResponse> {
    const response = await api.get<CapacityTrendResponse>('/reports/capacity/trend', {
      params: filters,
    });
    return response.data;
  },

  async exportReport(
    filters: CapacityReportFilters = {},
    format: 'csv' | 'xlsx' = 'csv',
  ): Promise<Blob> {
    const response = await api.get('/reports/capacity/export', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default capacityReportsService;
