import React, { useState, useEffect } from 'react';
import { Calendar, X, Filter, ChevronDown } from 'lucide-react';

type PeriodFilter = '7d' | '30d' | '90d' | 'custom';

interface DashboardFilters {
  period: PeriodFilter;
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  productType?: string;
}

interface Supplier {
  id: string;
  tradeName: string;
}

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  suppliers?: Supplier[];
  productTypes?: string[];
  showSupplierFilter?: boolean;
  showProductTypeFilter?: boolean;
}

const periodLabels: Record<PeriodFilter, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  custom: 'Personalizado',
};

export const DashboardFiltersBar: React.FC<DashboardFiltersBarProps> = ({
  filters,
  onChange,
  suppliers = [],
  productTypes = [],
  showSupplierFilter = true,
  showProductTypeFilter = true,
}) => {
  const [showCustomDates, setShowCustomDates] = useState(filters.period === 'custom');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setShowCustomDates(filters.period === 'custom');
  }, [filters.period]);

  const handlePeriodChange = (period: PeriodFilter) => {
    if (period === 'custom') {
      setShowCustomDates(true);
      onChange({ ...filters, period });
    } else {
      setShowCustomDates(false);
      onChange({
        ...filters,
        period,
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onChange({ ...filters, [field]: value });
  };

  const handleSupplierChange = (supplierId: string) => {
    onChange({
      ...filters,
      supplierId: supplierId || undefined,
    });
  };

  const handleProductTypeChange = (productType: string) => {
    onChange({
      ...filters,
      productType: productType || undefined,
    });
  };

  const clearFilters = () => {
    onChange({
      period: '30d',
      startDate: undefined,
      endDate: undefined,
      supplierId: undefined,
      productType: undefined,
    });
    setShowCustomDates(false);
  };

  const hasActiveFilters =
    filters.supplierId ||
    filters.productType ||
    filters.period === 'custom';

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4">
      {/* Main Row - Always visible */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Buttons */}
        <div className="flex items-center bg-gray-100 dark:bg-white/[0.05] rounded-xl p-1">
          {(['7d', '30d', '90d'] as PeriodFilter[]).map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                filters.period === period && !showCustomDates
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {periodLabels[period]}
            </button>
          ))}
          <button
            onClick={() => handlePeriodChange('custom')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              showCustomDates
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Personalizado</span>
          </button>
        </div>

        {/* Custom Date Inputs */}
        {showCustomDates && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-white/[0.05] border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-white/[0.05] border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}

        {/* Expand/Collapse Advanced Filters */}
        {(showSupplierFilter || showProductTypeFilter) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              isExpanded || hasActiveFilters
                ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Row - Collapsible */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-white/[0.06]">
          {/* Supplier Filter */}
          {showSupplierFilter && suppliers.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Fornecedor:</label>
              <select
                value={filters.supplierId || ''}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-white/[0.05] border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 min-w-[180px]"
              >
                <option value="">Todos</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.tradeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Product Type Filter */}
          {showProductTypeFilter && productTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Produto:</label>
              <select
                value={filters.productType || ''}
                onChange={(e) => handleProductTypeChange(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-white/[0.05] border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 min-w-[160px]"
              >
                <option value="">Todos</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardFiltersBar;
