import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CompanyType,
  OrderStatus,
  SupplierDocumentStatus,
} from '@prisma/client';

export interface PortalAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface PortalSummary {
  activeOrders: number;
  pendingAccept: number;
  upcomingDeliveries: number;
  pendingDocuments: number;
  bankDataComplete: boolean;
  alerts: PortalAlert[];
}

export interface TrendPoint {
  date: string;
  label: string;
  value: number;
}

export interface PlatformAverage {
  onTimeDeliveryRate: number;
  qualityScore: number;
  rejectionRate: number;
  avgLeadTime: number;
}

export interface PerformanceData {
  completedOrders: number;
  acceptanceRate: number;
  avgLeadTime: number;
  cancellationRate: number;
  totalRevenue: number;
  chartData: { date: string; value: number }[];
  byStatus: { status: string; count: number; value: number }[];
  byBrand: { brand: string; count: number; value: number }[];
  onTimeDeliveryTrend: TrendPoint[];
  qualityScoreTrend: TrendPoint[];
  rejectionRateTrend: TrendPoint[];
  platformAverage: PlatformAverage;
}

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get supplier company for current user
   */
  private async getSupplierCompany(userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
      include: {
        company: {
          include: {
            supplierProfile: true,
            bankAccount: true,
          },
        },
      },
    });

    if (!companyUser) {
      throw new NotFoundException('Empresa da facção não encontrada');
    }

    return companyUser.company;
  }

  /**
   * GET /portal/summary
   * Returns dashboard summary for supplier portal
   */
  async getSummary(userId: string): Promise<PortalSummary> {
    const company = await this.getSupplierCompany(userId);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      activeOrders,
      pendingAccept,
      upcomingDeliveries,
      pendingDocuments,
      rejectedOrders,
      totalOrders,
    ] = await Promise.all([
      // Active orders (in production)
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          status: {
            in: [
              OrderStatus.ACEITO_PELA_FACCAO,
              OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
              OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO,
              OrderStatus.EM_PRODUCAO,
              OrderStatus.PRONTO,
            ],
          },
        },
      }),
      // Pending acceptance
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          status: OrderStatus.LANCADO_PELA_MARCA,
        },
      }),
      // Upcoming deliveries (next 7 days)
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          status: {
            in: [
              OrderStatus.EM_PRODUCAO,
              OrderStatus.PRONTO,
              OrderStatus.EM_TRANSITO_PARA_MARCA,
            ],
          },
          deliveryDeadline: {
            gte: now,
            lte: sevenDaysFromNow,
          },
        },
      }),
      // Pending documents
      this.prisma.supplierDocument.count({
        where: {
          companyId: company.id,
          status: SupplierDocumentStatus.PENDING,
        },
      }),
      // Rejected orders (for acceptance rate calculation)
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          status: OrderStatus.RECUSADO_PELA_FACCAO,
        },
      }),
      // Total orders received
      this.prisma.order.count({
        where: {
          supplierId: company.id,
        },
      }),
    ]);

    // Check if bank data is complete
    const bankDataComplete = !!(
      company.bankAccount &&
      company.bankAccount.bankCode &&
      company.bankAccount.agency &&
      company.bankAccount.accountNumber
    );

    // Generate alerts based on real data
    const alerts: PortalAlert[] = [];

    if (!bankDataComplete) {
      alerts.push({
        id: 'bank-incomplete',
        type: 'warning',
        title: 'Complete seus dados bancários',
        message: 'Para receber repasses, preencha suas informações bancárias.',
        actionLabel: 'Atualizar dados',
        actionPath: '/portal/configuracoes',
      });
    }

    if (pendingAccept > 0) {
      alerts.push({
        id: 'pending-orders',
        type: 'info',
        title: `${pendingAccept} pedido${pendingAccept > 1 ? 's' : ''} aguardando aceite`,
        message: 'Você tem pedidos pendentes de confirmação.',
        actionLabel: 'Ver pedidos',
        actionPath: '/portal/pedidos',
      });
    }

    if (pendingDocuments > 0) {
      alerts.push({
        id: 'pending-docs',
        type: 'warning',
        title: `${pendingDocuments} documento${pendingDocuments > 1 ? 's' : ''} pendente${pendingDocuments > 1 ? 's' : ''}`,
        message: 'Envie os documentos necessários para manter seu cadastro ativo.',
        actionLabel: 'Enviar documentos',
        actionPath: '/portal/documentos',
      });
    }

    if (upcomingDeliveries > 0) {
      alerts.push({
        id: 'upcoming-deliveries',
        type: 'info',
        title: `${upcomingDeliveries} entrega${upcomingDeliveries > 1 ? 's' : ''} nos próximos 7 dias`,
        message: 'Prepare-se para as entregas agendadas.',
        actionLabel: 'Ver entregas',
        actionPath: '/portal/pedidos',
      });
    }

    // Low acceptance rate alert
    const acceptanceRate =
      totalOrders > 0
        ? ((totalOrders - rejectedOrders) / totalOrders) * 100
        : 100;
    if (acceptanceRate < 80 && totalOrders >= 5) {
      alerts.push({
        id: 'low-acceptance',
        type: 'warning',
        title: 'Taxa de aceite baixa',
        message: `Sua taxa de aceite está em ${acceptanceRate.toFixed(0)}%. Taxas abaixo de 80% podem afetar sua visibilidade.`,
        actionLabel: 'Ver relatórios',
        actionPath: '/portal/relatorios',
      });
    }

    return {
      activeOrders,
      pendingAccept,
      upcomingDeliveries,
      pendingDocuments,
      bankDataComplete,
      alerts,
    };
  }

  /**
   * GET /portal/performance
   * Returns performance metrics for supplier
   */
  async getPerformance(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PerformanceData> {
    const company = await this.getSupplierCompany(userId);

    const start =
      startDate ||
      new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
    const end = endDate || new Date();

    const dateFilter = {
      gte: start,
      lte: end,
    };

    // Parallel queries
    const [
      completedOrders,
      totalOrders,
      rejectedOrders,
      totalRevenue,
      ordersByStatus,
      ordersByBrand,
      revenueByWeek,
      avgLeadTimeResult,
      onTimeByWeek,
      qualityByWeek,
      rejectionByWeek,
      platformOnTime,
      platformQuality,
      platformRejection,
      platformLeadTime,
    ] = await Promise.all([
      // Completed orders
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          status: OrderStatus.FINALIZADO,
          updatedAt: dateFilter,
        },
      }),
      // Total orders received
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
        },
      }),
      // Rejected orders
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          status: OrderStatus.RECUSADO_PELA_FACCAO,
          updatedAt: dateFilter,
        },
      }),
      // Total revenue
      this.prisma.order.aggregate({
        where: {
          supplierId: company.id,
          status: OrderStatus.FINALIZADO,
          updatedAt: dateFilter,
        },
        _sum: { totalValue: true },
      }),
      // Orders grouped by status
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
        },
        _count: true,
        _sum: { totalValue: true },
      }),
      // Orders grouped by brand
      this.prisma.order.groupBy({
        by: ['brandId'],
        where: {
          supplierId: company.id,
          status: OrderStatus.FINALIZADO,
          updatedAt: dateFilter,
        },
        _count: true,
        _sum: { totalValue: true },
      }),
      // Revenue by week (for chart)
      this.prisma.$queryRaw<{ week: Date; value: number }[]>`
        SELECT
          DATE_TRUNC('week', "updatedAt") as week,
          COALESCE(SUM("totalValue"), 0)::float as value
        FROM "orders"
        WHERE "supplierId" = ${company.id}
          AND "status" = 'FINALIZADO'
          AND "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
        GROUP BY DATE_TRUNC('week', "updatedAt")
        ORDER BY week ASC
      `,
      // Average lead time in days (acceptedAt -> updatedAt for FINALIZADO orders)
      this.prisma.$queryRaw<{ avg_days: number }[]>`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM ("updatedAt" - "acceptedAt")) / 86400),
          0
        )::float as avg_days
        FROM "orders"
        WHERE "supplierId" = ${company.id}
          AND "status" = 'FINALIZADO'
          AND "acceptedAt" IS NOT NULL
          AND "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
      `,
      // On-time delivery rate by week (supplier)
      this.prisma.$queryRaw<
        { week: Date; total: number; on_time: number }[]
      >`
        SELECT
          DATE_TRUNC('week', "updatedAt") as week,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "updatedAt" <= "deliveryDeadline")::int as on_time
        FROM "orders"
        WHERE "supplierId" = ${company.id}
          AND "status" = 'FINALIZADO'
          AND "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
        GROUP BY DATE_TRUNC('week', "updatedAt")
        ORDER BY week ASC
      `,
      // Quality score by week (supplier - from reviews)
      this.prisma.$queryRaw<
        { week: Date; total_qty: number; approved_qty: number }[]
      >`
        SELECT
          DATE_TRUNC('week', r."reviewedAt") as week,
          COALESCE(SUM(r."approvedQuantity" + r."rejectedQuantity" + r."secondQualityQuantity"), 0)::int as total_qty,
          COALESCE(SUM(r."approvedQuantity"), 0)::int as approved_qty
        FROM "order_reviews" r
        INNER JOIN "orders" o ON o.id = r."orderId"
        WHERE o."supplierId" = ${company.id}
          AND r."reviewedAt" >= ${start}
          AND r."reviewedAt" <= ${end}
        GROUP BY DATE_TRUNC('week', r."reviewedAt")
        ORDER BY week ASC
      `,
      // Rejection rate by week (supplier)
      this.prisma.$queryRaw<
        { week: Date; total: number; rejected: number }[]
      >`
        SELECT
          DATE_TRUNC('week', "updatedAt") as week,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "status" = 'RECUSADO_PELA_FACCAO')::int as rejected
        FROM "orders"
        WHERE "supplierId" = ${company.id}
          AND "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
          AND "status" IN ('FINALIZADO', 'RECUSADO_PELA_FACCAO')
        GROUP BY DATE_TRUNC('week', "updatedAt")
        ORDER BY week ASC
      `,
      // Platform average: on-time delivery rate (all suppliers)
      this.prisma.$queryRaw<{ rate: number }[]>`
        SELECT CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE "updatedAt" <= "deliveryDeadline")::float / COUNT(*)::float * 100)
        END as rate
        FROM "orders"
        WHERE "status" = 'FINALIZADO'
          AND "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
      `,
      // Platform average: quality score (all suppliers)
      this.prisma.$queryRaw<{ rate: number }[]>`
        SELECT CASE
          WHEN COALESCE(SUM("approvedQuantity" + "rejectedQuantity" + "secondQualityQuantity"), 0) = 0 THEN 0
          ELSE (SUM("approvedQuantity")::float / SUM("approvedQuantity" + "rejectedQuantity" + "secondQualityQuantity")::float * 100)
        END as rate
        FROM "order_reviews" r
        INNER JOIN "orders" o ON o.id = r."orderId"
        WHERE r."reviewedAt" >= ${start}
          AND r."reviewedAt" <= ${end}
      `,
      // Platform average: rejection rate (all suppliers)
      this.prisma.$queryRaw<{ rate: number }[]>`
        SELECT CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE "status" = 'RECUSADO_PELA_FACCAO')::float / COUNT(*)::float * 100)
        END as rate
        FROM "orders"
        WHERE "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
          AND "status" IN ('FINALIZADO', 'RECUSADO_PELA_FACCAO')
      `,
      // Platform average: lead time (all suppliers)
      this.prisma.$queryRaw<{ avg_days: number }[]>`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM ("updatedAt" - "acceptedAt")) / 86400),
          0
        )::float as avg_days
        FROM "orders"
        WHERE "status" = 'FINALIZADO'
          AND "acceptedAt" IS NOT NULL
          AND "updatedAt" >= ${start}
          AND "updatedAt" <= ${end}
      `,
    ]);

    // Get brand names for the groupBy results
    const brandIds = ordersByBrand.map((b) => b.brandId);
    const brands = await this.prisma.company.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, tradeName: true },
    });
    const brandMap = new Map(brands.map((b) => [b.id, b.tradeName]));

    // Calculate metrics
    const acceptanceRate =
      totalOrders > 0 ? ((totalOrders - rejectedOrders) / totalOrders) * 100 : 100;
    const cancellationRate =
      totalOrders > 0 ? (rejectedOrders / totalOrders) * 100 : 0;

    // Map status to readable names
    const statusNames: Record<string, string> = {
      LANCADO_PELA_MARCA: 'Aguardando',
      EM_NEGOCIACAO: 'Em Negociação',
      ACEITO_PELA_FACCAO: 'Aceito',
      EM_PREPARACAO_SAIDA_MARCA: 'Preparando Envio',
      EM_TRANSITO_PARA_FACCAO: 'Em Trânsito (Recebimento)',
      EM_PREPARACAO_ENTRADA_FACCAO: 'Conferindo Insumos',
      EM_PRODUCAO: 'Em Produção',
      PRONTO: 'Pronto',
      EM_TRANSITO_PARA_MARCA: 'Em Trânsito (Devolução)',
      EM_REVISAO: 'Em Revisão',
      PARCIALMENTE_APROVADO: 'Parcialmente Aprovado',
      REPROVADO: 'Reprovado',
      AGUARDANDO_RETRABALHO: 'Aguardando Retrabalho',
      FINALIZADO: 'Concluído',
      RECUSADO_PELA_FACCAO: 'Recusado',
      DISPONIVEL_PARA_OUTRAS: 'Disponível',
    };

    // Helper to format week dates as labels
    const formatWeekLabel = (d: Date) =>
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    // Build trend arrays
    const onTimeDeliveryTrend: TrendPoint[] = onTimeByWeek.map((w) => ({
      date: w.week.toISOString().split('T')[0],
      label: formatWeekLabel(new Date(w.week)),
      value: w.total > 0 ? Math.round((w.on_time / w.total) * 1000) / 10 : 0,
    }));

    const qualityScoreTrend: TrendPoint[] = qualityByWeek.map((w) => ({
      date: w.week.toISOString().split('T')[0],
      label: formatWeekLabel(new Date(w.week)),
      value:
        w.total_qty > 0
          ? Math.round((w.approved_qty / w.total_qty) * 1000) / 10
          : 0,
    }));

    const rejectionRateTrend: TrendPoint[] = rejectionByWeek.map((w) => ({
      date: w.week.toISOString().split('T')[0],
      label: formatWeekLabel(new Date(w.week)),
      value:
        w.total > 0
          ? Math.round((w.rejected / w.total) * 1000) / 10
          : 0,
    }));

    const platformAverageData: PlatformAverage = {
      onTimeDeliveryRate:
        Math.round((platformOnTime[0]?.rate || 0) * 10) / 10,
      qualityScore:
        Math.round((platformQuality[0]?.rate || 0) * 10) / 10,
      rejectionRate:
        Math.round((platformRejection[0]?.rate || 0) * 10) / 10,
      avgLeadTime:
        Math.round((platformLeadTime[0]?.avg_days || 0) * 10) / 10,
    };

    return {
      completedOrders,
      acceptanceRate: Math.round(acceptanceRate),
      avgLeadTime: Math.round(avgLeadTimeResult[0]?.avg_days || 0),
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      totalRevenue: Number(totalRevenue._sum.totalValue) || 0,
      chartData: revenueByWeek.map((w) => ({
        date: w.week.toISOString().split('T')[0],
        value: Number(w.value) || 0,
      })),
      byStatus: ordersByStatus.map((s) => ({
        status: statusNames[s.status] || s.status,
        count: s._count,
        value: Number(s._sum.totalValue) || 0,
      })),
      byBrand: ordersByBrand
        .map((b) => ({
          brand: brandMap.get(b.brandId) || 'Desconhecido',
          count: b._count,
          value: Number(b._sum.totalValue) || 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      onTimeDeliveryTrend,
      qualityScoreTrend,
      rejectionRateTrend,
      platformAverage: platformAverageData,
    };
  }

  /**
   * GET /portal/revenue-history
   * Returns monthly revenue history for charts
   */
  async getRevenueHistory(
    userId: string,
    months: number = 6,
  ): Promise<{ month: string; revenue: number; orders: number }[]> {
    const company = await this.getSupplierCompany(userId);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const monthlyData = await this.prisma.$queryRaw<
      { month: Date; revenue: number; orders: number }[]
    >`
      SELECT
        DATE_TRUNC('month', "updatedAt") as month,
        COALESCE(SUM("totalValue"), 0)::float as revenue,
        COUNT(*)::int as orders
      FROM "orders"
      WHERE "supplierId" = ${company.id}
        AND "status" = 'FINALIZADO'
        AND "updatedAt" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "updatedAt")
      ORDER BY month ASC
    `;

    // Format months
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    return monthlyData.map((d) => ({
      month: monthNames[d.month.getMonth()],
      revenue: Number(d.revenue) || 0,
      orders: Number(d.orders) || 0,
    }));
  }
}
