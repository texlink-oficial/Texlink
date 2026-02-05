// Summary KPIs
export interface CapacitySummary {
  totalCapacity: number; // Total capacity across all suppliers (pieces/month)
  allocatedByBrand: number; // Brand's allocated capacity
  brandOccupationRate: number; // % of total capacity occupied by brand
  availableCapacity: number; // Available capacity for brand
  totalSuppliers: number; // Number of linked suppliers
  activeOrdersCount: number; // Number of active orders
}

// By Supplier breakdown
export interface CapacityBySupplier {
  supplierId: string;
  supplierName: string;
  totalCapacity: number; // Monthly capacity (pieces/month)
  brandAllocation: number; // Pieces allocated to this brand
  brandOccupationRate: number; // % occupied by this brand
  otherBrandsAllocation: number; // Estimated allocation to other brands
  freeCapacity: number; // Free capacity remaining
  trend: 'up' | 'down' | 'stable'; // Trend of occupation
  activeOrdersCount: number; // Active orders with this supplier
}

// Capacity Alert
export enum CapacityAlertType {
  NEAR_FULL = 'NEAR_FULL', // Supplier nearly at full capacity
  UNDERUTILIZED = 'UNDERUTILIZED', // Supplier underutilized
  DEMAND_PEAK = 'DEMAND_PEAK', // Future demand peak predicted
  NO_CAPACITY = 'NO_CAPACITY', // Capacity not defined
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
  value?: number; // Occupation rate or capacity value
}

// Trend data point for time series
export interface CapacityTrendPoint {
  month: string; // YYYY-MM
  label: string; // Display label (e.g., "Jan 2024")
  totalCapacity: number;
  brandAllocation: number;
  occupationRate: number; // %
  isProjection: boolean; // True for future projections
}

// Response DTOs
export class CapacitySummaryResponse {
  summary: CapacitySummary;
}

export class CapacityBySupplierResponse {
  suppliers: CapacityBySupplier[];
  totalSuppliers: number;
}

export class CapacityAlertsResponse {
  alerts: CapacityAlert[];
}

export class CapacityTrendResponse {
  trend: CapacityTrendPoint[];
}
