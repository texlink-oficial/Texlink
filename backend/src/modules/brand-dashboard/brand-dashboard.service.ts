import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import {
  DashboardFiltersDto,
  SupplierRankingFiltersDto,
  PeriodFilter,
  DashboardSummaryResponse,
  SuppliersRankingResponse,
  TimelineDataResponse,
  AlertsResponse,
  OrdersKpi,
  DeadlineKpi,
  QualityKpi,
  CostKpi,
  SupplierRankingItem,
  MedalType,
  Alert,
  AlertSeverity,
} from './dto';

@Injectable()
export class BrandDashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate date range based on filters
   */
  private calculateDateRange(filters: DashboardFiltersDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    let startDate: Date;

    if (filters.period === PeriodFilter.CUSTOM && filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      return { startDate, endDate: new Date(filters.endDate) };
    }

    switch (filters.period) {
      case PeriodFilter.SEVEN_DAYS:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case PeriodFilter.NINETY_DAYS:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        break;
      case PeriodFilter.THIRTY_DAYS:
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Build common where clause for orders
   */
  private buildOrdersWhereClause(
    brandId: string,
    startDate: Date,
    endDate: Date,
    filters: DashboardFiltersDto,
  ) {
    return {
      brandId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.productType && { productType: filters.productType }),
    };
  }

  /**
   * Get Orders KPI
   */
  private async getOrdersKpi(
    brandId: string,
    startDate: Date,
    endDate: Date,
    filters: DashboardFiltersDto,
  ): Promise<OrdersKpi> {
    const baseWhere = this.buildOrdersWhereClause(brandId, startDate, endDate, filters);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Active statuses (not finalized or rejected)
    const activeStatuses = [
      OrderStatus.LANCADO_PELA_MARCA,
      OrderStatus.ACEITO_PELA_FACCAO,
      OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO,
      OrderStatus.EM_PRODUCAO,
      OrderStatus.PRONTO,
      OrderStatus.EM_TRANSITO_PARA_FACCAO,
      OrderStatus.EM_TRANSITO_PARA_MARCA,
    ];

    const [activeOrders, onTimeOrders, atRiskOrders, overdueOrders] = await Promise.all([
      // Total active orders
      this.prisma.order.count({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
        },
      }),
      // On time (deadline > today)
      this.prisma.order.count({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
          deliveryDeadline: { gt: threeDaysFromNow },
        },
      }),
      // At risk (deadline within 3 days but not overdue)
      this.prisma.order.count({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
          deliveryDeadline: {
            gte: today,
            lte: threeDaysFromNow,
          },
        },
      }),
      // Overdue (deadline < today)
      this.prisma.order.count({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
          deliveryDeadline: { lt: today },
        },
      }),
    ]);

    const onTimePercentage = activeOrders > 0 ? Math.round((onTimeOrders / activeOrders) * 100) : 100;
    const atRiskPercentage = activeOrders > 0 ? Math.round((atRiskOrders / activeOrders) * 100) : 0;

    return {
      activeOrders,
      onTimeCount: onTimeOrders,
      onTimePercentage,
      atRiskCount: atRiskOrders,
      atRiskPercentage,
      overdueCount: overdueOrders,
    };
  }

  /**
   * Get Deadline KPI
   */
  private async getDeadlineKpi(
    brandId: string,
    startDate: Date,
    endDate: Date,
    filters: DashboardFiltersDto,
  ): Promise<DeadlineKpi> {
    // Get completed orders with acceptance and completion times
    const completedOrders = await this.prisma.order.findMany({
      where: {
        brandId,
        status: OrderStatus.FINALIZADO,
        acceptedAt: { not: null },
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.productType && { productType: filters.productType }),
      },
      select: {
        id: true,
        supplierId: true,
        acceptedAt: true,
        updatedAt: true,
        supplier: {
          select: {
            id: true,
            tradeName: true,
          },
        },
      },
    });

    if (completedOrders.length === 0) {
      return {
        avgLeadTimeDays: 0,
        generalAvgDays: 0,
        bestSupplier: null,
        worstSupplier: null,
      };
    }

    // Calculate lead time per order
    const orderLeadTimes = completedOrders.map((order) => {
      const leadTime = Math.ceil(
        (order.updatedAt.getTime() - order.acceptedAt!.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        supplierId: order.supplierId,
        supplierName: order.supplier?.tradeName || 'Desconhecido',
        leadTime,
      };
    });

    // Calculate overall average
    const totalLeadTime = orderLeadTimes.reduce((sum, o) => sum + o.leadTime, 0);
    const avgLeadTimeDays = Math.round(totalLeadTime / orderLeadTimes.length);

    // Group by supplier and calculate averages
    const supplierStats = new Map<
      string,
      { name: string; totalDays: number; count: number }
    >();

    orderLeadTimes.forEach((o) => {
      if (!o.supplierId) return;
      const existing = supplierStats.get(o.supplierId);
      if (existing) {
        existing.totalDays += o.leadTime;
        existing.count += 1;
      } else {
        supplierStats.set(o.supplierId, {
          name: o.supplierName,
          totalDays: o.leadTime,
          count: 1,
        });
      }
    });

    // Find best and worst performers
    let bestSupplier: DeadlineKpi['bestSupplier'] = null;
    let worstSupplier: DeadlineKpi['worstSupplier'] = null;
    let bestAvg = Infinity;
    let worstAvg = -Infinity;

    supplierStats.forEach((stats, supplierId) => {
      const avg = Math.round(stats.totalDays / stats.count);
      if (avg < bestAvg) {
        bestAvg = avg;
        bestSupplier = { id: supplierId, name: stats.name, avgDays: avg };
      }
      if (avg > worstAvg) {
        worstAvg = avg;
        worstSupplier = { id: supplierId, name: stats.name, avgDays: avg };
      }
    });

    return {
      avgLeadTimeDays,
      generalAvgDays: avgLeadTimeDays,
      bestSupplier,
      worstSupplier,
    };
  }

  /**
   * Get Quality KPI
   */
  private async getQualityKpi(
    brandId: string,
    startDate: Date,
    endDate: Date,
    filters: DashboardFiltersDto,
  ): Promise<QualityKpi> {
    const baseWhere = this.buildOrdersWhereClause(brandId, startDate, endDate, filters);

    // Aggregate review counts
    const aggregated = await this.prisma.order.aggregate({
      where: baseWhere,
      _sum: {
        totalReviewCount: true,
        approvalCount: true,
        rejectionCount: true,
        secondQualityCount: true,
        quantity: true,
      },
    });

    // Count rework orders (orders with childOrders)
    const reworkCount = await this.prisma.order.count({
      where: {
        ...baseWhere,
        childOrders: { some: {} },
      },
    });

    const totalOrders = await this.prisma.order.count({ where: baseWhere });

    const totalReviewed = aggregated._sum.totalReviewCount || 0;
    const approvedCount = aggregated._sum.approvalCount || 0;
    const rejectedCount = aggregated._sum.rejectionCount || 0;
    const secondQualityCount = aggregated._sum.secondQualityCount || 0;
    const totalQuantity = aggregated._sum.quantity || 0;

    const approvedPercentage = totalReviewed > 0
      ? Math.round((approvedCount / totalReviewed) * 100)
      : 100;
    const secondQualityPercentage = totalQuantity > 0
      ? Math.round((secondQualityCount / totalQuantity) * 100)
      : 0;
    const reworkPercentage = totalOrders > 0
      ? Math.round((reworkCount / totalOrders) * 100)
      : 0;

    return {
      totalReviewed,
      approvedCount,
      approvedPercentage,
      secondQualityCount,
      secondQualityPercentage,
      rejectedCount,
      reworkCount,
      reworkPercentage,
    };
  }

  /**
   * Get Cost KPI
   */
  private async getCostKpi(
    brandId: string,
    startDate: Date,
    endDate: Date,
    filters: DashboardFiltersDto,
  ): Promise<CostKpi> {
    const baseWhere = this.buildOrdersWhereClause(brandId, startDate, endDate, filters);

    const aggregated = await this.prisma.order.aggregate({
      where: baseWhere,
      _sum: {
        totalValue: true,
        quantity: true,
      },
    });

    const totalValue = Number(aggregated._sum.totalValue) || 0;
    const totalPieces = aggregated._sum.quantity || 0;
    const avgCostPerPiece = totalPieces > 0
      ? Math.round((totalValue / totalPieces) * 100) / 100
      : 0;

    // For cost deviation, we compare with an estimate (simplified)
    // In a real scenario, this would come from planned/budgeted values
    const plannedCost = totalValue * 0.95; // Assume 5% deviation for demo
    const actualCost = totalValue;
    const costDeviation = actualCost - plannedCost;
    const costDeviationPercentage = plannedCost > 0
      ? Math.round((costDeviation / plannedCost) * 100)
      : 0;

    // Quality impact cost (rework orders value)
    const reworkOrders = await this.prisma.order.aggregate({
      where: {
        ...baseWhere,
        origin: 'REWORK',
      },
      _sum: {
        totalValue: true,
      },
    });

    const qualityImpactCost = Number(reworkOrders._sum.totalValue) || 0;

    return {
      totalValue,
      totalPieces,
      avgCostPerPiece,
      plannedCost,
      actualCost,
      costDeviation,
      costDeviationPercentage,
      qualityImpactCost,
    };
  }

  /**
   * Get complete dashboard summary
   */
  async getSummary(
    brandId: string,
    filters: DashboardFiltersDto,
  ): Promise<DashboardSummaryResponse> {
    const { startDate, endDate } = this.calculateDateRange(filters);

    const [orders, deadline, quality, cost] = await Promise.all([
      this.getOrdersKpi(brandId, startDate, endDate, filters),
      this.getDeadlineKpi(brandId, startDate, endDate, filters),
      this.getQualityKpi(brandId, startDate, endDate, filters),
      this.getCostKpi(brandId, startDate, endDate, filters),
    ]);

    return { orders, deadline, quality, cost };
  }

  /**
   * Get suppliers ranking
   */
  async getSuppliersRanking(
    brandId: string,
    filters: SupplierRankingFiltersDto,
  ): Promise<SuppliersRankingResponse> {
    const { startDate, endDate } = this.calculateDateRange(filters);

    // Get suppliers with active relationship to this brand
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: {
        brandId,
        status: 'ACTIVE',
      },
      include: {
        supplier: {
          select: {
            id: true,
            tradeName: true,
          },
        },
      },
    });

    if (relationships.length === 0) {
      return { suppliers: [], totalSuppliers: 0 };
    }

    const supplierIds = relationships.map((r) => r.supplierId);

    // Get order statistics per supplier
    const supplierStats = await Promise.all(
      supplierIds.map(async (supplierId) => {
        const supplier = relationships.find((r) => r.supplierId === supplierId)?.supplier;

        // Get completed orders for this supplier
        const completedOrders = await this.prisma.order.findMany({
          where: {
            brandId,
            supplierId,
            status: OrderStatus.FINALIZADO,
            updatedAt: { gte: startDate, lte: endDate },
          },
          select: {
            updatedAt: true,
            deliveryDeadline: true,
          },
        });

        const totalOrders = completedOrders.length;
        const onTimeOrders = completedOrders.filter(
          (o) => o.updatedAt <= o.deliveryDeadline,
        ).length;

        // Count orders and quality/cost stats
        const [qualityStats, costStats] = await Promise.all([
          // Quality aggregates
          this.prisma.order.aggregate({
            where: {
              brandId,
              supplierId,
              updatedAt: { gte: startDate, lte: endDate },
            },
            _sum: {
              approvalCount: true,
              totalReviewCount: true,
              quantity: true,
            },
          }),
          // Cost aggregates
          this.prisma.order.aggregate({
            where: {
              brandId,
              supplierId,
              updatedAt: { gte: startDate, lte: endDate },
            },
            _sum: {
              totalValue: true,
              quantity: true,
            },
          }),
        ]);

        // Calculate on-time compliance
        const deadlineCompliance = totalOrders > 0
          ? Math.round((onTimeOrders / totalOrders) * 100)
          : 100;

        // Calculate quality score
        const totalReviewed = qualityStats._sum.totalReviewCount || 0;
        const approved = qualityStats._sum.approvalCount || 0;
        const qualityScore = totalReviewed > 0
          ? Math.round((approved / totalReviewed) * 100)
          : 100;

        // Calculate volume
        const volume = qualityStats._sum.quantity || 0;

        // Calculate average cost
        const totalValue = Number(costStats._sum.totalValue) || 0;
        const totalQty = costStats._sum.quantity || 0;
        const avgCost = totalQty > 0
          ? Math.round((totalValue / totalQty) * 100) / 100
          : 0;

        // Count non-conformances (rejections)
        const nonConformances = await this.prisma.order.count({
          where: {
            brandId,
            supplierId,
            updatedAt: { gte: startDate, lte: endDate },
            rejectionCount: { gt: 0 },
          },
        });

        return {
          id: supplierId,
          tradeName: supplier?.tradeName || 'Desconhecido',
          deadlineCompliance,
          qualityScore,
          volume,
          avgCost,
          nonConformances,
          // Calculate composite score for ranking
          compositeScore: deadlineCompliance * 0.4 + qualityScore * 0.4 + (volume > 0 ? 20 : 0),
        };
      }),
    );

    // Sort by composite score
    supplierStats.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign ranks and medals
    const rankedSuppliers: SupplierRankingItem[] = supplierStats.map((s, index) => {
      let medal: MedalType = null;
      if (index === 0) medal = 'gold';
      else if (index === 1) medal = 'silver';
      else if (index === 2) medal = 'bronze';

      // Determine trend (simplified - would need historical data)
      const trend: 'up' | 'down' | 'stable' = s.qualityScore >= 90 ? 'up' : s.qualityScore >= 70 ? 'stable' : 'down';

      return {
        id: s.id,
        tradeName: s.tradeName,
        rank: index + 1,
        medal,
        deadlineCompliance: s.deadlineCompliance,
        qualityScore: s.qualityScore,
        volume: s.volume,
        avgCost: s.avgCost,
        nonConformances: s.nonConformances,
        trend,
      };
    });

    return {
      suppliers: rankedSuppliers,
      totalSuppliers: rankedSuppliers.length,
    };
  }

  /**
   * Get timeline data for charts
   */
  async getTimelineData(
    brandId: string,
    filters: DashboardFiltersDto,
  ): Promise<TimelineDataResponse> {
    const { startDate, endDate } = this.calculateDateRange(filters);
    const baseWhere = this.buildOrdersWhereClause(brandId, startDate, endDate, filters);

    // Delivery evolution - group by week/month depending on period
    const completedOrders = await this.prisma.order.findMany({
      where: {
        ...baseWhere,
        status: OrderStatus.FINALIZADO,
      },
      select: {
        updatedAt: true,
        deliveryDeadline: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    // Group by week
    const deliveryByWeek = new Map<string, { total: number; onTime: number }>();
    completedOrders.forEach((order) => {
      const weekStart = this.getWeekStart(order.updatedAt);
      const key = weekStart.toISOString().split('T')[0];
      const isOnTime = order.updatedAt <= order.deliveryDeadline;

      const existing = deliveryByWeek.get(key) || { total: 0, onTime: 0 };
      existing.total += 1;
      if (isOnTime) existing.onTime += 1;
      deliveryByWeek.set(key, existing);
    });

    const deliveryEvolution = Array.from(deliveryByWeek.entries()).map(([date, stats]) => ({
      date,
      label: this.formatWeekLabel(new Date(date)),
      onTimePercentage: stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 100,
      totalDeliveries: stats.total,
    }));

    // Quality by supplier
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: { brandId, status: 'ACTIVE' },
      include: { supplier: { select: { id: true, tradeName: true } } },
      take: 5,
    });

    const qualityBySupplier = await Promise.all(
      relationships.map(async (rel) => {
        const stats = await this.prisma.order.aggregate({
          where: {
            ...baseWhere,
            supplierId: rel.supplierId,
          },
          _sum: {
            approvalCount: true,
            secondQualityCount: true,
            rejectionCount: true,
          },
        });

        return {
          supplierId: rel.supplierId,
          supplierName: rel.supplier.tradeName || 'Desconhecido',
          approved: stats._sum.approvalCount || 0,
          secondQuality: stats._sum.secondQualityCount || 0,
          rejected: stats._sum.rejectionCount || 0,
        };
      }),
    );

    // Production volume by week
    const allOrders = await this.prisma.order.findMany({
      where: baseWhere,
      select: {
        createdAt: true,
        quantity: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const volumeByWeek = new Map<string, number>();
    allOrders.forEach((order) => {
      const weekStart = this.getWeekStart(order.createdAt);
      const key = weekStart.toISOString().split('T')[0];
      const existing = volumeByWeek.get(key) || 0;
      volumeByWeek.set(key, existing + order.quantity);
    });

    const productionVolume = Array.from(volumeByWeek.entries()).map(([date, volume]) => ({
      date,
      label: this.formatWeekLabel(new Date(date)),
      volume,
    }));

    // Cost comparison by month
    const costByMonth = new Map<string, { planned: number; actual: number }>();
    allOrders.forEach((order: any) => {
      const monthKey = order.createdAt.toISOString().slice(0, 7);
      const existing = costByMonth.get(monthKey) || { planned: 0, actual: 0 };
      const orderValue = Number(order.totalValue) || 0;
      existing.actual += orderValue;
      existing.planned += orderValue * 0.95; // Simplified estimation
      costByMonth.set(monthKey, existing);
    });

    const costComparison = Array.from(costByMonth.entries()).map(([period, costs]) => ({
      period,
      label: this.formatMonthLabel(period),
      plannedCost: Math.round(costs.planned),
      actualCost: Math.round(costs.actual),
    }));

    return {
      deliveryEvolution,
      qualityBySupplier,
      productionVolume,
      costComparison,
    };
  }

  /**
   * Get active alerts
   */
  async getAlerts(brandId: string, filters: DashboardFiltersDto): Promise<AlertsResponse> {
    const { startDate, endDate } = this.calculateDateRange(filters);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const alerts: Alert[] = [];

    // 1. Orders near deadline (< 7 days)
    const urgentOrders = await this.prisma.order.findMany({
      where: {
        brandId,
        status: {
          in: [
            OrderStatus.LANCADO_PELA_MARCA,
            OrderStatus.ACEITO_PELA_FACCAO,
            OrderStatus.EM_PRODUCAO,
          ],
        },
        deliveryDeadline: {
          gte: today,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        displayId: true,
        productName: true,
        deliveryDeadline: true,
      },
      take: 5,
    });

    urgentOrders.forEach((order) => {
      const daysLeft = Math.ceil(
        (order.deliveryDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      alerts.push({
        id: `deadline-${order.id}`,
        type: 'deadline',
        severity: daysLeft <= 3 ? 'critical' : 'warning',
        title: `Pedido ${order.displayId} próximo do vencimento`,
        description: `${order.productName} - ${daysLeft} dia(s) restante(s)`,
        entityId: order.id,
        entityType: 'order',
        actionUrl: `/brand/pedidos/${order.id}`,
        createdAt: new Date().toISOString(),
      });
    });

    // 2. Overdue orders
    const overdueOrders = await this.prisma.order.findMany({
      where: {
        brandId,
        status: {
          notIn: [OrderStatus.FINALIZADO, OrderStatus.RECUSADO_PELA_FACCAO],
        },
        deliveryDeadline: { lt: today },
      },
      select: {
        id: true,
        displayId: true,
        productName: true,
        deliveryDeadline: true,
      },
      take: 5,
    });

    overdueOrders.forEach((order) => {
      const daysOverdue = Math.ceil(
        (today.getTime() - order.deliveryDeadline.getTime()) / (1000 * 60 * 60 * 24),
      );
      alerts.push({
        id: `overdue-${order.id}`,
        type: 'deadline',
        severity: 'critical',
        title: `Pedido ${order.displayId} em atraso`,
        description: `${order.productName} - ${daysOverdue} dia(s) de atraso`,
        entityId: order.id,
        entityType: 'order',
        actionUrl: `/brand/pedidos/${order.id}`,
        createdAt: new Date().toISOString(),
      });
    });

    // 3. Suppliers with low quality (< 90% approval in period)
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: { brandId, status: 'ACTIVE' },
      include: { supplier: { select: { id: true, tradeName: true } } },
    });

    for (const rel of relationships) {
      const qualityStats = await this.prisma.order.aggregate({
        where: {
          brandId,
          supplierId: rel.supplierId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: {
          approvalCount: true,
          totalReviewCount: true,
        },
      });

      const totalReviewed = qualityStats._sum.totalReviewCount || 0;
      const approved = qualityStats._sum.approvalCount || 0;
      const approvalRate = totalReviewed > 0 ? (approved / totalReviewed) * 100 : 100;

      if (totalReviewed > 0 && approvalRate < 90) {
        alerts.push({
          id: `quality-${rel.supplierId}`,
          type: 'quality',
          severity: approvalRate < 70 ? 'critical' : 'warning',
          title: `Queda de qualidade - ${rel.supplier.tradeName}`,
          description: `Taxa de aprovação: ${Math.round(approvalRate)}%`,
          entityId: rel.supplierId,
          entityType: 'supplier',
          actionUrl: `/brand/fornecedores/${rel.id}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Sort by severity (critical first)
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
    const warningCount = alerts.filter((a) => a.severity === 'warning').length;
    const infoCount = alerts.filter((a) => a.severity === 'info').length;

    return {
      alerts,
      criticalCount,
      warningCount,
      infoCount,
      totalCount: alerts.length,
    };
  }

  // Helper methods
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private formatWeekLabel(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }

  private formatMonthLabel(monthKey: string): string {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [year, month] = monthKey.split('-');
    return `${months[parseInt(month, 10) - 1]}/${year.slice(2)}`;
  }
}
