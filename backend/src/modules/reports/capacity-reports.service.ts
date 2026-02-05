import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CapacityReportFiltersDto,
  CapacityPeriodFilter,
} from './dto/capacity-filters.dto';
import {
  CapacitySummary,
  CapacityBySupplier,
  CapacityAlert,
  CapacityAlertType,
  CapacityAlertSeverity,
  CapacityTrendPoint,
} from './dto/capacity-report.dto';
import { OrderStatus } from '@prisma/client';

// Active order statuses that count toward capacity allocation
const ACTIVE_ORDER_STATUSES = [
  OrderStatus.ACEITO_PELA_FACCAO,
  OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
  OrderStatus.EM_TRANSITO_PARA_FACCAO,
  OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO,
  OrderStatus.EM_PRODUCAO,
  OrderStatus.PRONTO,
];

@Injectable()
export class CapacityReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the date range based on period filter
   */
  private getDateRange(filters: CapacityReportFiltersDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (filters.period === CapacityPeriodFilter.CUSTOM) {
      startDate = filters.startDate ? new Date(filters.startDate) : now;
      endDate = filters.endDate
        ? new Date(filters.endDate)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filters.period === CapacityPeriodFilter.NEXT_MONTH) {
      startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    } else if (filters.period === CapacityPeriodFilter.QUARTER) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    } else {
      // CURRENT_MONTH or default
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  }

  /**
   * GET /reports/capacity
   * Returns capacity summary KPIs
   */
  async getSummary(
    brandId: string,
    filters: CapacityReportFiltersDto = {},
  ): Promise<CapacitySummary> {
    const { startDate, endDate } = this.getDateRange(filters);

    // Get all active relationships
    const relationships = await this.prisma.supplierBrandRelationship.findMany(
      {
        where: {
          brandId,
          status: 'ACTIVE',
        },
        include: {
          supplier: {
            include: {
              supplierProfile: true,
            },
          },
        },
      },
    );

    let totalCapacity = 0;
    let allocatedByBrand = 0;
    let activeOrdersCount = 0;

    for (const rel of relationships) {
      const capacity =
        rel.supplier.supplierProfile?.monthlyCapacity || 0;
      totalCapacity += capacity;

      // Get brand's allocation for this supplier in the period
      const orders = await this.prisma.order.findMany({
        where: {
          brandId,
          supplierId: rel.supplierId,
          status: { in: ACTIVE_ORDER_STATUSES },
          deliveryDeadline: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const allocation = orders.reduce((sum, order) => sum + order.quantity, 0);
      allocatedByBrand += allocation;
      activeOrdersCount += orders.length;
    }

    const brandOccupationRate =
      totalCapacity > 0
        ? Math.round((allocatedByBrand / totalCapacity) * 1000) / 10
        : 0;
    const availableCapacity = Math.max(0, totalCapacity - allocatedByBrand);

    return {
      totalCapacity,
      allocatedByBrand,
      brandOccupationRate,
      availableCapacity,
      totalSuppliers: relationships.length,
      activeOrdersCount,
    };
  }

  /**
   * GET /reports/capacity/by-supplier
   * Returns capacity breakdown by supplier
   */
  async getBySupplier(
    brandId: string,
    filters: CapacityReportFiltersDto = {},
  ): Promise<{ suppliers: CapacityBySupplier[]; totalSuppliers: number }> {
    const { startDate, endDate } = this.getDateRange(filters);

    const relationships = await this.prisma.supplierBrandRelationship.findMany(
      {
        where: {
          brandId,
          status: 'ACTIVE',
          ...(filters.supplierId
            ? { supplierId: filters.supplierId }
            : {}),
        },
        include: {
          supplier: {
            include: {
              supplierProfile: true,
            },
          },
        },
      },
    );

    const suppliers: CapacityBySupplier[] = [];

    for (const rel of relationships) {
      const totalCapacity =
        rel.supplier.supplierProfile?.monthlyCapacity || 0;

      // Get brand's allocation
      const brandOrders = await this.prisma.order.findMany({
        where: {
          brandId,
          supplierId: rel.supplierId,
          status: { in: ACTIVE_ORDER_STATUSES },
          deliveryDeadline: {
            gte: startDate,
            lte: endDate,
          },
          ...(filters.productType
            ? { productType: filters.productType }
            : {}),
        },
      });

      const brandAllocation = brandOrders.reduce(
        (sum, order) => sum + order.quantity,
        0,
      );

      // Estimate other brands' allocation (total current occupancy from profile)
      const currentOccupancy =
        rel.supplier.supplierProfile?.currentOccupancy || 0;
      const estimatedTotalAllocation = Math.round(
        (totalCapacity * currentOccupancy) / 100,
      );
      const otherBrandsAllocation = Math.max(
        0,
        estimatedTotalAllocation - brandAllocation,
      );

      const brandOccupationRate =
        totalCapacity > 0
          ? Math.round((brandAllocation / totalCapacity) * 1000) / 10
          : 0;

      const freeCapacity = Math.max(
        0,
        totalCapacity - brandAllocation - otherBrandsAllocation,
      );

      // Calculate trend (compare to previous period)
      const prevStartDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
      const prevEndDate = new Date(endDate);
      prevEndDate.setMonth(prevEndDate.getMonth() - 1);

      const prevOrders = await this.prisma.order.findMany({
        where: {
          brandId,
          supplierId: rel.supplierId,
          status: { in: ACTIVE_ORDER_STATUSES },
          deliveryDeadline: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      });

      const prevAllocation = prevOrders.reduce(
        (sum, order) => sum + order.quantity,
        0,
      );

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (brandAllocation > prevAllocation * 1.1) {
        trend = 'up';
      } else if (brandAllocation < prevAllocation * 0.9) {
        trend = 'down';
      }

      suppliers.push({
        supplierId: rel.supplierId,
        supplierName: rel.supplier.tradeName || rel.supplier.legalName,
        totalCapacity,
        brandAllocation,
        brandOccupationRate,
        otherBrandsAllocation,
        freeCapacity,
        trend,
        activeOrdersCount: brandOrders.length,
      });
    }

    // Sort by occupation rate descending
    suppliers.sort((a, b) => b.brandOccupationRate - a.brandOccupationRate);

    return {
      suppliers,
      totalSuppliers: suppliers.length,
    };
  }

  /**
   * GET /reports/capacity/alerts
   * Returns capacity alerts based on thresholds
   */
  async getAlerts(
    brandId: string,
    filters: CapacityReportFiltersDto = {},
  ): Promise<{ alerts: CapacityAlert[] }> {
    const { suppliers } = await this.getBySupplier(brandId, filters);
    const alerts: CapacityAlert[] = [];

    for (const supplier of suppliers) {
      // Alert: Near full capacity (>= 90%)
      if (supplier.brandOccupationRate >= 90) {
        alerts.push({
          type: CapacityAlertType.NEAR_FULL,
          severity: CapacityAlertSeverity.CRITICAL,
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          message: `${supplier.supplierName} está quase na capacidade máxima (${supplier.brandOccupationRate}%)`,
          value: supplier.brandOccupationRate,
        });
      }
      // Alert: Underutilized (< 30%)
      else if (
        supplier.totalCapacity > 0 &&
        supplier.brandOccupationRate < 30
      ) {
        alerts.push({
          type: CapacityAlertType.UNDERUTILIZED,
          severity: CapacityAlertSeverity.WARNING,
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          message: `${supplier.supplierName} está subutilizada (${supplier.brandOccupationRate}%)`,
          value: supplier.brandOccupationRate,
        });
      }

      // Alert: No capacity defined
      if (supplier.totalCapacity === 0) {
        alerts.push({
          type: CapacityAlertType.NO_CAPACITY,
          severity: CapacityAlertSeverity.INFO,
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          message: `${supplier.supplierName} não possui capacidade definida`,
        });
      }
    }

    return { alerts };
  }

  /**
   * GET /reports/capacity/trend
   * Returns capacity trend over time with projections
   */
  async getTrend(
    brandId: string,
    filters: CapacityReportFiltersDto = {},
  ): Promise<{ trend: CapacityTrendPoint[] }> {
    const projectionMonths = filters.projectionMonths || 3;
    const trend: CapacityTrendPoint[] = [];

    const now = new Date();

    // Historical data (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
      );

      const summary = await this.getSummary(brandId, {
        period: CapacityPeriodFilter.CUSTOM,
        startDate: month.toISOString(),
        endDate: monthEnd.toISOString(),
      });

      trend.push({
        month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
        label: month.toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
        }),
        totalCapacity: summary.totalCapacity,
        brandAllocation: summary.allocatedByBrand,
        occupationRate: summary.brandOccupationRate,
        isProjection: false,
      });
    }

    // Projections (future months)
    const lastTrend = trend[trend.length - 1];
    const avgGrowth =
      trend.length > 1
        ? (trend[trend.length - 1].brandAllocation -
            trend[0].brandAllocation) /
          trend.length
        : 0;

    for (let i = 1; i <= projectionMonths; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const projectedAllocation = Math.max(
        0,
        lastTrend.brandAllocation + avgGrowth * i,
      );
      const projectedRate =
        lastTrend.totalCapacity > 0
          ? Math.round(
              (projectedAllocation / lastTrend.totalCapacity) * 1000,
            ) / 10
          : 0;

      trend.push({
        month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
        label: month.toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
        }),
        totalCapacity: lastTrend.totalCapacity,
        brandAllocation: Math.round(projectedAllocation),
        occupationRate: projectedRate,
        isProjection: true,
      });
    }

    return { trend };
  }

  /**
   * GET /reports/capacity/export
   * Export capacity data to CSV
   */
  async exportToCsv(
    brandId: string,
    filters: CapacityReportFiltersDto = {},
  ): Promise<string> {
    const { suppliers } = await this.getBySupplier(brandId, filters);

    let csv = 'Facção;Capacidade Total;Alocação da Marca;Taxa de Ocupação;Outras Marcas;Capacidade Livre;Pedidos Ativos;Tendência\n';

    for (const supplier of suppliers) {
      csv += `${supplier.supplierName};${supplier.totalCapacity};${supplier.brandAllocation};${supplier.brandOccupationRate}%;${supplier.otherBrandsAllocation};${supplier.freeCapacity};${supplier.activeOrdersCount};${supplier.trend}\n`;
    }

    return csv;
  }
}
