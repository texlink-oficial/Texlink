import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  capacityReportsService,
  CapacitySummary,
  CapacityBySupplierResponse,
  CapacityAlertsResponse,
  CapacityTrendResponse,
  CapacityReportFilters,
  CapacityPeriodFilter,
} from '../../../services/capacityReports.service';
import {
  CapacitySummaryCards,
  CapacitySupplierTable,
  CapacityTrendChart,
  CapacityAlertsPanel,
} from '../../../components/reports/capacity';
import { ChartCard } from '../../../components/dashboard';
import {
  Activity,
  Loader2,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react';

const CapacityUtilizationPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<CapacitySummary | null>(null);
  const [bySupplier, setBySupplier] = useState<CapacityBySupplierResponse | null>(null);
  const [alerts, setAlerts] = useState<CapacityAlertsResponse | null>(null);
  const [trend, setTrend] = useState<CapacityTrendResponse | null>(null);

  // Filters state
  const [filters, setFilters] = useState<CapacityReportFilters>({
    period: CapacityPeriodFilter.CURRENT_MONTH,
    projectionMonths: 3,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load data
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setIsRefreshing(!showLoading);
      setError(null);

      const [summaryData, bySupplierData, alertsData, trendData] = await Promise.all([
        capacityReportsService.getSummary(filters),
        capacityReportsService.getBySupplier(filters),
        capacityReportsService.getAlerts(filters),
        capacityReportsService.getTrend(filters),
      ]);

      setSummary(summaryData);
      setBySupplier(bySupplierData);
      setAlerts(alertsData);
      setTrend(trendData);
    } catch (err) {
      console.error('[CapacityUtilization] Error loading data:', err);
      setError('Erro ao carregar dados de capacidade');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData(false);
  };

  // Export handlers
  const handleExport = async (format: 'csv' | 'xlsx') => {
    setShowExportMenu(false);
    try {
      const blob = await capacityReportsService.exportReport(filters, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-capacidade-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[CapacityUtilization] Error exporting:', err);
    }
  };

  // Period filter labels
  const periodLabels: Record<CapacityPeriodFilter, string> = {
    [CapacityPeriodFilter.CURRENT_MONTH]: 'Mês Atual',
    [CapacityPeriodFilter.NEXT_MONTH]: 'Próximo Mês',
    [CapacityPeriodFilter.QUARTER]: 'Trimestre',
    [CapacityPeriodFilter.CUSTOM]: 'Personalizado',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Carregando relatório de capacidade...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-gray-900 dark:text-white font-medium">{error}</p>
          <button
            onClick={() => loadData()}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Capacidade e Utilização
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Acompanhamento de capacidade produtiva das facções
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileText className="w-4 h-4" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar Excel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1">
              {([
                CapacityPeriodFilter.CURRENT_MONTH,
                CapacityPeriodFilter.NEXT_MONTH,
                CapacityPeriodFilter.QUARTER,
              ] as CapacityPeriodFilter[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setFilters((prev) => ({ ...prev, period }))}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${filters.period === period
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                ${showFilters
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                  : 'bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                }
              `}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {(filters.supplierId || filters.productType) && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              )}
            </button>

            {/* Active Filter Pills */}
            {filters.supplierId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full">
                Facção selecionada
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, supplierId: undefined }))}
                  className="hover:text-sky-900 dark:hover:text-sky-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.productType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full">
                Tipo de produto filtrado
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, productType: undefined }))}
                  className="hover:text-sky-900 dark:hover:text-sky-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Supplier Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Facção
                  </label>
                  <select
                    value={filters.supplierId || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        supplierId: e.target.value || undefined,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.06] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                  >
                    <option value="">Todas</option>
                    {bySupplier?.suppliers.map((s) => (
                      <option key={s.supplierId} value={s.supplierId}>
                        {s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Tipo de Produto
                  </label>
                  <select
                    value={filters.productType || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        productType: e.target.value || undefined,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.06] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    <option value="Camisetas">Camisetas</option>
                    <option value="Moletons">Moletons</option>
                    <option value="Jaquetas">Jaquetas</option>
                    <option value="Calças">Calças</option>
                    <option value="Vestidos">Vestidos</option>
                  </select>
                </div>

                {/* Projection Months */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Projeção (meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={filters.projectionMonths || 3}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        projectionMonths: parseInt(e.target.value, 10) || 3,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.06] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {summary && <CapacitySummaryCards data={summary} isLoading={isRefreshing} />}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Tendência de Utilização"
              subtitle="Histórico e projeção de capacidade"
              showPeriodSelector={false}
            >
              <CapacityTrendChart data={trend?.trend || []} />
            </ChartCard>
          </div>

          {/* Alerts Panel - Takes 1 column */}
          <div>
            <CapacityAlertsPanel alerts={alerts?.alerts || []} isLoading={isRefreshing} />
          </div>
        </div>

        {/* Supplier Table */}
        <CapacitySupplierTable
          suppliers={bySupplier?.suppliers || []}
          isLoading={isRefreshing}
        />
      </main>
    </div>
  );
};

export default CapacityUtilizationPage;
