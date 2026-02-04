import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  brandDashboardService,
  DashboardSummary,
  SuppliersRanking,
  TimelineData,
  AlertsData,
  DashboardFilters,
  PeriodFilter,
} from '../../services/brandDashboard.service';
import {
  HeroMetrics,
  MetricCard,
  ChartCard,
  AreaChartRevenue,
  LineChartDelivery,
  BarChartQuality,
  GroupedBarChartCost,
  SupplierRankingTable,
  AlertsPanel,
  DashboardFiltersBar,
  getGreeting,
} from '../../components/dashboard';
import {
  Package,
  Clock,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Loader2,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

const AnalyticsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ranking, setRanking] = useState<SuppliersRanking | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);

  // Filters state
  const [filters, setFilters] = useState<DashboardFilters>({
    period: '30d' as PeriodFilter,
  });

  // Load dashboard data
  const loadDashboard = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setIsRefreshing(!showLoading);
      setError(null);

      const [summaryData, rankingData, timelineData, alertsData] = await Promise.all([
        brandDashboardService.getSummary(filters),
        brandDashboardService.getSuppliersRanking(filters),
        brandDashboardService.getTimeline(filters),
        brandDashboardService.getAlerts(filters),
      ]);

      setSummary(summaryData);
      setRanking(rankingData);
      setTimeline(timelineData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('[AnalyticsDashboard] Error loading data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [filters]);

  const handleRefresh = () => {
    loadDashboard(false);
  };

  // Transform production volume for AreaChartRevenue
  const volumeChartData = useMemo(() => {
    if (!timeline?.productionVolume) return [];
    return timeline.productionVolume.map((p) => ({
      name: p.label,
      value: p.volume,
      previousValue: p.previousVolume,
    }));
  }, [timeline?.productionVolume]);

  // Sparkline data generators
  const generateSparklineData = (baseValue: number, variance = 0.3) => {
    return Array.from({ length: 7 }, () =>
      Math.max(0, baseValue * (1 + (Math.random() - 0.5) * variance))
    );
  };

  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-gray-900 dark:text-white font-medium">{error}</p>
          <button
            onClick={() => loadDashboard()}
            className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Analytics
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getGreeting()}, {firstName}. Visão analítica completa.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Filters Bar */}
        <DashboardFiltersBar
          filters={filters}
          onChange={setFilters}
          suppliers={ranking?.suppliers.map((s) => ({ id: s.id, tradeName: s.tradeName })) || []}
          productTypes={['Camisetas', 'Moletons', 'Jaquetas', 'Calças', 'Vestidos']}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={<Package className="h-6 w-6" />}
            label="Pedidos Ativos"
            value={summary?.orders.activeOrders || 0}
            color="blue"
            sparklineData={generateSparklineData(summary?.orders.activeOrders || 10)}
          />
          <MetricCard
            icon={<Clock className="h-6 w-6" />}
            label="No Prazo"
            value={summary?.orders.onTimePercentage || 0}
            suffix="%"
            color="green"
            trend={summary?.orders.onTimePercentage && summary.orders.onTimePercentage >= 90 ? 5 : -3}
            sparklineData={generateSparklineData(summary?.orders.onTimePercentage || 90)}
          />
          <MetricCard
            icon={<CheckCircle className="h-6 w-6" />}
            label="Qualidade"
            value={summary?.quality.approvedPercentage || 0}
            suffix="%"
            color={summary?.quality.approvedPercentage && summary.quality.approvedPercentage >= 90 ? 'green' : 'amber'}
            trend={summary?.quality.approvedPercentage && summary.quality.approvedPercentage >= 90 ? 2 : -1}
            sparklineData={generateSparklineData(summary?.quality.approvedPercentage || 95)}
          />
          <MetricCard
            icon={<DollarSign className="h-6 w-6" />}
            label="Custo Médio/Peça"
            value={summary?.cost.avgCostPerPiece || 0}
            prefix="R$ "
            decimals={2}
            color="purple"
            sparklineData={generateSparklineData(summary?.cost.avgCostPerPiece || 20)}
          />
        </div>

        {/* Critical Alerts Banner */}
        {alerts && alerts.criticalCount > 0 && (
          <Link
            to="/brand/notificacoes"
            className="group relative overflow-hidden block bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/30 rounded-2xl p-4 hover:from-red-500/30 hover:to-orange-500/20 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-red-500/20 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-red-900 dark:text-white font-semibold">
                    {alerts.criticalCount} Alerta{alerts.criticalCount > 1 ? 's' : ''} Crítico{alerts.criticalCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-red-800/80 dark:text-red-400/70 text-sm">
                    Requer atenção imediata
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Charts Grid - 2x2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Entregas no Prazo"
            subtitle="Evolução semanal"
            showPeriodSelector={false}
          >
            <LineChartDelivery
              data={timeline?.deliveryEvolution || []}
              color="#10b981"
            />
          </ChartCard>

          <ChartCard
            title="Qualidade por Fornecedor"
            subtitle="Distribuição de aprovações"
            showPeriodSelector={false}
          >
            <BarChartQuality data={timeline?.qualityBySupplier || []} />
          </ChartCard>

          <ChartCard
            title="Volume de Produção"
            subtitle="Peças produzidas por semana"
            showPeriodSelector={false}
          >
            <AreaChartRevenue
              data={volumeChartData}
              showComparison={true}
              valuePrefix=""
              color="#0ea5e9"
              comparisonColor="#8b5cf6"
            />
          </ChartCard>

          <ChartCard
            title="Custo Previsto vs Real"
            subtitle="Comparativo mensal"
            showPeriodSelector={false}
          >
            <GroupedBarChartCost data={timeline?.costComparison || []} />
          </ChartCard>
        </div>

        {/* Ranking + Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SupplierRankingTable suppliers={ranking?.suppliers || []} />
          </div>
          <AlertsPanel alerts={alerts?.alerts || []} maxItems={4} />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Lead Time Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-sky-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Lead Time</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Média Geral</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {summary?.deadline.avgLeadTimeDays || 0} dias
                </span>
              </div>
              {summary?.deadline.bestSupplier && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Melhor</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {summary.deadline.bestSupplier.name.split(' ')[0]} ({summary.deadline.bestSupplier.avgDays}d)
                  </span>
                </div>
              )}
              {summary?.deadline.worstSupplier && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Mais Lento</span>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {summary.deadline.worstSupplier.name.split(' ')[0]} ({summary.deadline.worstSupplier.avgDays}d)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quality Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Qualidade</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Aprovadas</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {summary?.quality.approvedPercentage || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">2ª Qualidade</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {summary?.quality.secondQualityPercentage || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Retrabalho</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {summary?.quality.reworkPercentage || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Cost Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Custos</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  R$ {(summary?.cost.totalValue || 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Desvio</span>
                <span
                  className={`text-sm font-medium ${
                    (summary?.cost.costDeviationPercentage || 0) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {(summary?.cost.costDeviationPercentage || 0) > 0 ? '+' : ''}
                  {summary?.cost.costDeviationPercentage || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Impacto Qualidade</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  R$ {(summary?.cost.qualityImpactCost || 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Orders Status Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Pedidos</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">No Prazo</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {summary?.orders.onTimeCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Em Risco</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {summary?.orders.atRiskCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Atrasados</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {summary?.orders.overdueCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsDashboardPage;
