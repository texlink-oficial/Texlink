import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RejectionReportFiltersDto,
  PeriodFilter,
  RejectionCategory,
  RejectionSummary,
  RejectionBySupplier,
  RejectionByReason,
  RejectionTrendPoint,
  RejectionDetail,
  REJECTION_CATEGORY_LABELS,
} from './dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate date range based on filters
   */
  private calculateDateRange(filters: RejectionReportFiltersDto): {
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
   * Get previous period date range for comparison
   */
  private getPreviousPeriodRange(startDate: Date, endDate: Date): {
    startDate: Date;
    endDate: Date;
  } {
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);
    return { startDate: prevStartDate, endDate: prevEndDate };
  }

  /**
   * Categorize rejection reason text into a category
   */
  private categorizeReason(reason: string): RejectionCategory {
    const lower = reason.toLowerCase();
    if (/costura|ponto|arremate|overloque|bainha|rebatido/.test(lower)) {
      return RejectionCategory.DEFEITO_COSTURA;
    }
    if (/medida|tamanho|comprimento|largura|altura|fora do padr/.test(lower)) {
      return RejectionCategory.MEDIDAS_INCORRETAS;
    }
    if (/mancha|sujeira|sujo|oleado|amarelado|desbotad/.test(lower)) {
      return RejectionCategory.MANCHAS_SUJEIRA;
    }
    if (/aviamento|bot[aã]o|z[ií]per|etiqueta|fecho|el[aá]stico|linha/.test(lower)) {
      return RejectionCategory.AVIAMENTOS_ERRADOS;
    }
    return RejectionCategory.OUTROS;
  }

  /**
   * Build where clause for order reviews
   */
  private buildReviewWhereClause(
    brandId: string,
    startDate: Date,
    endDate: Date,
    filters: RejectionReportFiltersDto,
  ) {
    return {
      order: {
        brandId,
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.productType && { productType: filters.productType }),
      },
      reviewedAt: {
        gte: startDate,
        lte: endDate,
      },
    };
  }

  /**
   * Get rejection summary KPIs
   */
  async getSummary(
    brandId: string,
    filters: RejectionReportFiltersDto,
  ): Promise<RejectionSummary> {
    const { startDate, endDate } = this.calculateDateRange(filters);
    const prevPeriod = this.getPreviousPeriodRange(startDate, endDate);

    // Get all reviews in period
    const reviews = await this.prisma.orderReview.findMany({
      where: this.buildReviewWhereClause(brandId, startDate, endDate, filters),
      include: {
        rejectedItems: true,
        order: {
          select: {
            supplierId: true,
            supplier: { select: { id: true, tradeName: true } },
          },
        },
      },
    });

    // Get previous period reviews for comparison
    const prevReviews = await this.prisma.orderReview.findMany({
      where: this.buildReviewWhereClause(brandId, prevPeriod.startDate, prevPeriod.endDate, filters),
      select: { rejectedQuantity: true },
    });

    const totalReviewed = reviews.reduce((sum, r) => sum + r.totalQuantity, 0);
    const totalRejections = reviews.reduce((sum, r) => sum + r.rejectedQuantity, 0);
    const rejectionRate = totalReviewed > 0
      ? Math.round((totalRejections / totalReviewed) * 1000) / 10
      : 0;

    // Count rejections by reason category
    const reasonCounts = new Map<RejectionCategory, number>();
    for (const review of reviews) {
      for (const item of review.rejectedItems) {
        const category = filters.reasonCategory
          ? (this.categorizeReason(item.reason) === filters.reasonCategory
              ? filters.reasonCategory
              : null)
          : this.categorizeReason(item.reason);
        if (category) {
          reasonCounts.set(category, (reasonCounts.get(category) || 0) + item.quantity);
        }
      }
    }

    // Find top reason
    let topReason: RejectionSummary['topReason'] = null;
    let maxCount = 0;
    for (const [category, count] of reasonCounts) {
      if (count > maxCount) {
        maxCount = count;
        topReason = {
          category,
          count,
          percentage: totalRejections > 0
            ? Math.round((count / totalRejections) * 1000) / 10
            : 0,
        };
      }
    }

    // Find worst supplier
    const supplierStats = new Map<string, { name: string; rejected: number; total: number }>();
    for (const review of reviews) {
      const supplierId = review.order.supplierId;
      if (!supplierId) continue;
      const existing = supplierStats.get(supplierId) || {
        name: review.order.supplier?.tradeName || 'Desconhecido',
        rejected: 0,
        total: 0,
      };
      existing.rejected += review.rejectedQuantity;
      existing.total += review.totalQuantity;
      supplierStats.set(supplierId, existing);
    }

    let worstSupplier: RejectionSummary['worstSupplier'] = null;
    let maxRejectionRate = 0;
    for (const [id, stats] of supplierStats) {
      const rate = stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0;
      if (rate > maxRejectionRate) {
        maxRejectionRate = rate;
        worstSupplier = {
          id,
          name: stats.name,
          rejectionRate: Math.round(rate * 10) / 10,
          totalRejections: stats.rejected,
        };
      }
    }

    // Compare to previous period
    const prevRejections = prevReviews.reduce((sum, r) => sum + r.rejectedQuantity, 0);
    const rejectionsDiff = totalRejections - prevRejections;
    const rejectionsPercentChange = prevRejections > 0
      ? Math.round(((totalRejections - prevRejections) / prevRejections) * 1000) / 10
      : totalRejections > 0 ? 100 : 0;

    return {
      totalRejections,
      totalReviewed,
      rejectionRate,
      topReason,
      worstSupplier,
      comparedToPreviousPeriod: {
        rejectionsDiff,
        rejectionsPercentChange,
      },
    };
  }

  /**
   * Get rejections by supplier
   */
  async getBySupplier(
    brandId: string,
    filters: RejectionReportFiltersDto,
  ): Promise<{ suppliers: RejectionBySupplier[]; totalSuppliers: number }> {
    const { startDate, endDate } = this.calculateDateRange(filters);
    const prevPeriod = this.getPreviousPeriodRange(startDate, endDate);

    // Get supplier relationships
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: {
        brandId,
        status: 'ACTIVE',
        ...(filters.supplierId && { supplierId: filters.supplierId }),
      },
      include: {
        supplier: { select: { id: true, tradeName: true } },
      },
    });

    const suppliers: RejectionBySupplier[] = [];

    for (const rel of relationships) {
      const supplierId = rel.supplierId;

      // Current period
      const reviews = await this.prisma.orderReview.findMany({
        where: {
          order: {
            brandId,
            supplierId,
            ...(filters.productType && { productType: filters.productType }),
          },
          reviewedAt: { gte: startDate, lte: endDate },
        },
        include: { rejectedItems: true },
      });

      // Previous period for trend
      const prevReviews = await this.prisma.orderReview.aggregate({
        where: {
          order: { brandId, supplierId },
          reviewedAt: { gte: prevPeriod.startDate, lte: prevPeriod.endDate },
        },
        _sum: { rejectedQuantity: true, totalQuantity: true },
      });

      const totalOrders = await this.prisma.order.count({
        where: {
          brandId,
          supplierId,
          createdAt: { gte: startDate, lte: endDate },
          ...(filters.productType && { productType: filters.productType }),
        },
      });

      const totalReviewed = reviews.reduce((sum, r) => sum + r.totalQuantity, 0);
      const totalRejections = reviews.reduce((sum, r) => sum + r.rejectedQuantity, 0);
      const rejectedQuantity = totalRejections;
      const rejectionRate = totalReviewed > 0
        ? Math.round((totalRejections / totalReviewed) * 1000) / 10
        : 0;

      // Find top reason for this supplier
      const reasonCounts = new Map<RejectionCategory, number>();
      for (const review of reviews) {
        for (const item of review.rejectedItems) {
          const category = this.categorizeReason(item.reason);
          reasonCounts.set(category, (reasonCounts.get(category) || 0) + item.quantity);
        }
      }

      let topReason: RejectionCategory | null = null;
      let maxCount = 0;
      for (const [category, count] of reasonCounts) {
        if (count > maxCount) {
          maxCount = count;
          topReason = category;
        }
      }

      // Calculate trend
      const prevRejected = prevReviews._sum.rejectedQuantity || 0;
      const prevTotal = prevReviews._sum.totalQuantity || 0;
      const prevRate = prevTotal > 0 ? (prevRejected / prevTotal) * 100 : 0;
      const trend: 'up' | 'down' | 'stable' =
        rejectionRate > prevRate + 2 ? 'up' :
        rejectionRate < prevRate - 2 ? 'down' : 'stable';

      suppliers.push({
        supplierId,
        supplierName: rel.supplier.tradeName || 'Desconhecido',
        totalOrders,
        totalReviewed,
        totalRejections,
        rejectionRate,
        rejectedQuantity,
        topReason,
        trend,
      });
    }

    // Sort by rejection rate descending
    suppliers.sort((a, b) => b.rejectionRate - a.rejectionRate);

    return { suppliers, totalSuppliers: suppliers.length };
  }

  /**
   * Get rejections by reason category
   */
  async getByReason(
    brandId: string,
    filters: RejectionReportFiltersDto,
  ): Promise<{ reasons: RejectionByReason[] }> {
    const { startDate, endDate } = this.calculateDateRange(filters);

    const rejectedItems = await this.prisma.reviewRejectedItem.findMany({
      where: {
        review: this.buildReviewWhereClause(brandId, startDate, endDate, filters),
      },
      select: { reason: true, quantity: true },
    });

    const categoryCounts = new Map<RejectionCategory, { count: number; quantity: number }>();

    for (const item of rejectedItems) {
      const category = this.categorizeReason(item.reason);
      if (filters.reasonCategory && category !== filters.reasonCategory) continue;

      const existing = categoryCounts.get(category) || { count: 0, quantity: 0 };
      existing.count += 1;
      existing.quantity += item.quantity;
      categoryCounts.set(category, existing);
    }

    const totalCount = Array.from(categoryCounts.values()).reduce((sum, c) => sum + c.count, 0);

    const reasons: RejectionByReason[] = Array.from(categoryCounts.entries()).map(
      ([category, stats]) => ({
        category,
        label: REJECTION_CATEGORY_LABELS[category],
        count: stats.count,
        percentage: totalCount > 0
          ? Math.round((stats.count / totalCount) * 1000) / 10
          : 0,
        totalQuantity: stats.quantity,
      }),
    );

    // Sort by count descending
    reasons.sort((a, b) => b.count - a.count);

    return { reasons };
  }

  /**
   * Get rejection trend over time
   */
  async getTrend(
    brandId: string,
    filters: RejectionReportFiltersDto,
  ): Promise<{ trend: RejectionTrendPoint[] }> {
    const { startDate, endDate } = this.calculateDateRange(filters);

    const reviews = await this.prisma.orderReview.findMany({
      where: this.buildReviewWhereClause(brandId, startDate, endDate, filters),
      select: {
        reviewedAt: true,
        totalQuantity: true,
        rejectedQuantity: true,
      },
      orderBy: { reviewedAt: 'asc' },
    });

    // Group by week
    const weekData = new Map<string, { reviewed: number; rejected: number }>();

    for (const review of reviews) {
      const weekStart = this.getWeekStart(review.reviewedAt);
      const key = weekStart.toISOString().split('T')[0];
      const existing = weekData.get(key) || { reviewed: 0, rejected: 0 };
      existing.reviewed += review.totalQuantity;
      existing.rejected += review.rejectedQuantity;
      weekData.set(key, existing);
    }

    const trend: RejectionTrendPoint[] = Array.from(weekData.entries()).map(([date, data]) => ({
      date,
      label: this.formatWeekLabel(new Date(date)),
      totalReviewed: data.reviewed,
      totalRejections: data.rejected,
      rejectionRate: data.reviewed > 0
        ? Math.round((data.rejected / data.reviewed) * 1000) / 10
        : 0,
    }));

    return { trend };
  }

  /**
   * Get rejection details for a specific supplier
   */
  async getDetails(
    brandId: string,
    supplierId: string,
    filters: RejectionReportFiltersDto,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{
    details: RejectionDetail[];
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    const { startDate, endDate } = this.calculateDateRange(filters);

    const whereClause = {
      review: {
        order: {
          brandId,
          supplierId,
          ...(filters.productType && { productType: filters.productType }),
        },
        reviewedAt: { gte: startDate, lte: endDate },
      },
    };

    const [rejectedItems, totalCount] = await Promise.all([
      this.prisma.reviewRejectedItem.findMany({
        where: whereClause,
        include: {
          review: {
            include: {
              order: {
                select: {
                  id: true,
                  displayId: true,
                  productName: true,
                  supplierId: true,
                  supplier: { select: { tradeName: true } },
                },
              },
            },
          },
        },
        orderBy: { review: { reviewedAt: 'desc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.reviewRejectedItem.count({ where: whereClause }),
    ]);

    const details: RejectionDetail[] = rejectedItems
      .filter((item) => {
        if (!filters.reasonCategory) return true;
        return this.categorizeReason(item.reason) === filters.reasonCategory;
      })
      .map((item) => ({
        id: item.id,
        reviewId: item.reviewId,
        orderId: item.review.order.id,
        orderDisplayId: item.review.order.displayId,
        productName: item.review.order.productName || 'Produto',
        supplierId: item.review.order.supplierId || '',
        supplierName: item.review.order.supplier?.tradeName || 'Desconhecido',
        reason: item.reason,
        category: this.categorizeReason(item.reason),
        quantity: item.quantity,
        defectDescription: item.defectDescription,
        requiresRework: item.requiresRework,
        reviewedAt: item.review.reviewedAt,
      }));

    return { details, totalCount, page, pageSize };
  }

  /**
   * Export rejection data to CSV format
   */
  async exportToCsv(
    brandId: string,
    filters: RejectionReportFiltersDto,
  ): Promise<string> {
    const { startDate, endDate } = this.calculateDateRange(filters);

    const rejectedItems = await this.prisma.reviewRejectedItem.findMany({
      where: {
        review: this.buildReviewWhereClause(brandId, startDate, endDate, filters),
      },
      include: {
        review: {
          include: {
            order: {
              select: {
                displayId: true,
                productName: true,
                supplier: { select: { tradeName: true } },
              },
            },
          },
        },
      },
      orderBy: { review: { reviewedAt: 'desc' } },
    });

    // Build CSV
    const headers = [
      'Pedido',
      'Produto',
      'Fornecedor',
      'Motivo',
      'Categoria',
      'Quantidade',
      'Descrição',
      'Requer Retrabalho',
      'Data Revisão',
    ];

    const rows = rejectedItems.map((item) => [
      item.review.order.displayId,
      item.review.order.productName || '',
      item.review.order.supplier?.tradeName || '',
      item.reason,
      REJECTION_CATEGORY_LABELS[this.categorizeReason(item.reason)],
      item.quantity.toString(),
      item.defectDescription || '',
      item.requiresRework ? 'Sim' : 'Não',
      item.review.reviewedAt.toISOString().split('T')[0],
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    return csv;
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
}
