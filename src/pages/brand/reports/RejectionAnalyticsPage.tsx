import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  rejectionReportsService,
  RejectionSummary,
  RejectionBySupplierResponse,
  RejectionByReasonResponse,
  RejectionTrendResponse,
  RejectionDetailsResponse,
  RejectionReportFilters,
  RejectionCategory,
  PeriodFilter,
} from '../../../services/rejectionReports.service';
import {
  RejectionSummaryCards,
  PieChartRejectionReasons,
  BarChartRejectionsBySupplier,
  LineChartRejectionTrend,
  SupplierRejectionTable,
  RejectionDetailModal,
} from '../../../components/reports';
import { ChartCard } from '../../../components/dashboard';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Filter,
  X,
  Calendar,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

const RejectionAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<RejectionSummary | null>(null);
  const [bySupplier, setBySupplier] = useState<RejectionBySupplierResponse | null>(null);
  const [byReason, setByReason] = useState<RejectionByReasonResponse | null>(null);
  const [trend, setTrend] = useState<RejectionTrendResponse | null>(null);

  // Detail modal state
  const [selectedSupplier, setSelectedSupplier] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [details, setDetails] = useState<RejectionDetailsResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<RejectionReportFilters>({
    period: '30d' as PeriodFilter,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load data
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setIsRefreshing(!showLoading);
      setError(null);

      const [summaryData, bySupplierData, byReasonData, trendData] = await Promise.all([
        rejectionReportsService.getSummary(filters),
        rejectionReportsService.getBySupplier(filters),
        rejectionReportsService.getByReason(filters),
        rejectionReportsService.getTrend(filters),
      ]);

      setSummary(summaryData);
      setBySupplier(bySupplierData);
      setByReason(byReasonData);
      setTrend(trendData);
    } catch (err) {
      console.error('[RejectionAnalytics] Error loading data:', err);
      setError('Erro ao carregar dados de rejeições');
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

  // Load supplier details
  const handleSupplierClick = async (supplierId: string) => {
    const supplier = bySupplier?.suppliers.find((s) => s.supplierId === supplierId);
    if (!supplier) return;

    setSelectedSupplier({ id: supplierId, name: supplier.supplierName });
    setIsLoadingDetails(true);

    try {
      const detailsData = await rejectionReportsService.getDetails(supplierId, filters);
      setDetails(detailsData);
    } catch (err) {
      console.error('[RejectionAnalytics] Error loading details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedSupplier(null);
    setDetails(null);
  };

  // Export handlers
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setShowExportMenu(false);
    try {
      const blob = await rejectionReportsService.exportReport(filters, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-rejeicoes-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[RejectionAnalytics] Error exporting:', err);
    }
  };

  // Period filter labels
  const periodLabels: Record<PeriodFilter, string> = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias',
    custom: 'Personalizado',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Carregando relatório de rejeições...
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
            <AlertTriangle className="w-6 h-6 text-red-500" />
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Relatório de Rejeições
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Análise comparativa de lotes reprovados por facção
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
              {(['7d', '30d', '90d'] as PeriodFilter[]).map((period) => (
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
              {(filters.supplierId || filters.productType || filters.reasonCategory) && (
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
            {filters.reasonCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                Motivo filtrado
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, reasonCategory: undefined }))}
                  className="hover:text-amber-900 dark:hover:text-amber-100"
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

                {/* Reason Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Categoria do Motivo
                  </label>
                  <select
                    value={filters.reasonCategory || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        reasonCategory: (e.target.value as RejectionCategory) || undefined,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.06] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                  >
                    <option value="">Todas</option>
                    <option value={RejectionCategory.DEFEITO_COSTURA}>Defeito de Costura</option>
                    <option value={RejectionCategory.MEDIDAS_INCORRETAS}>Medidas Incorretas</option>
                    <option value={RejectionCategory.MANCHAS_SUJEIRA}>Manchas/Sujeira</option>
                    <option value={RejectionCategory.AVIAMENTOS_ERRADOS}>Aviamentos Errados</option>
                    <option value={RejectionCategory.OUTROS}>Outros</option>
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
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {summary && <RejectionSummaryCards data={summary} isLoading={isRefreshing} />}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - By Reason */}
          <ChartCard
            title="Distribuição por Motivo"
            subtitle="Categorias de defeitos"
            showPeriodSelector={false}
          >
            <PieChartRejectionReasons data={byReason?.reasons || []} />
          </ChartCard>

          {/* Line Chart - Trend */}
          <ChartCard
            title="Tendência de Rejeições"
            subtitle="Evolução da taxa de rejeição"
            showPeriodSelector={false}
          >
            <LineChartRejectionTrend data={trend?.trend || []} />
          </ChartCard>
        </div>

        {/* Bar Chart - By Supplier */}
        <ChartCard
          title="Taxa de Rejeição por Facção"
          subtitle="Comparativo entre fornecedores"
          showPeriodSelector={false}
        >
          <BarChartRejectionsBySupplier
            data={bySupplier?.suppliers || []}
            onSupplierClick={handleSupplierClick}
          />
        </ChartCard>

        {/* Supplier Table */}
        <SupplierRejectionTable
          suppliers={bySupplier?.suppliers || []}
          onSupplierClick={handleSupplierClick}
          isLoading={isRefreshing}
        />

        {/* Detail Modal */}
        <RejectionDetailModal
          isOpen={!!selectedSupplier}
          onClose={handleCloseModal}
          supplierName={selectedSupplier?.name || ''}
          details={details?.details || []}
          isLoading={isLoadingDetails}
          totalCount={details?.totalCount || 0}
        />
      </main>
    </div>
  );
};

export default RejectionAnalyticsPage;
