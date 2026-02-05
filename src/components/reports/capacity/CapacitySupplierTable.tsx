import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { CapacityBySupplier } from '../../../services/capacityReports.service';

type TrendType = 'up' | 'down' | 'stable';
type SortKey = 'supplierName' | 'totalCapacity' | 'brandOccupationRate' | 'freeCapacity';

interface CapacitySupplierTableProps {
  suppliers: CapacityBySupplier[];
  isLoading?: boolean;
}

const TrendIcon: React.FC<{ trend: TrendType }> = ({ trend }) => {
  const config = {
    up: {
      icon: TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      label: 'Crescendo',
    },
    down: {
      icon: TrendingDown,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      label: 'Decrescendo',
    },
    stable: {
      icon: Minus,
      color: 'text-gray-400',
      bg: 'bg-gray-400/10',
      label: 'Estável',
    },
  };

  const { icon: Icon, color, bg, label } = config[trend];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const getColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500';
    if (rate >= 70) return 'bg-amber-500';
    if (rate >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getColor(value)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white w-14 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  );
};

const TableSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
    ))}
  </div>
);

export const CapacitySupplierTable: React.FC<CapacitySupplierTableProps> = ({
  suppliers,
  isLoading = false,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('brandOccupationRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'supplierName' ? 'asc' : 'desc');
    }
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'supplierName') {
      return a.supplierName.localeCompare(b.supplierName) * multiplier;
    }
    return (a[sortKey] - b[sortKey]) * multiplier;
  });

  const SortHeader: React.FC<{ label: string; sortKeyName: SortKey; className?: string }> = ({
    label,
    sortKeyName,
    className = '',
  }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className={`flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${className}`}
    >
      {label}
      {sortKey === sortKeyName && (
        sortOrder === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum fornecedor com capacidade definida
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Capacidade por Fornecedor
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Detalhamento de ocupação e disponibilidade
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-left">
                <SortHeader label="Facção" sortKeyName="supplierName" />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Capacidade" sortKeyName="totalCapacity" className="justify-end" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Alocação da Marca
                </span>
              </th>
              <th className="px-4 py-3 text-left min-w-[180px]">
                <SortHeader label="Ocupação" sortKeyName="brandOccupationRate" />
              </th>
              <th className="px-4 py-3 text-right">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Outras Marcas
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Livre" sortKeyName="freeCapacity" className="justify-end" />
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tendência
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pedidos
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {sortedSuppliers.map((supplier) => (
              <tr
                key={supplier.supplierId}
                className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-4">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {supplier.supplierName}
                  </p>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {supplier.totalCapacity.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    pçs/mês
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                    {supplier.brandAllocation.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    pçs
                  </span>
                </td>
                <td className="px-4 py-4">
                  <ProgressBar value={supplier.brandOccupationRate} />
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {supplier.otherBrandsAllocation.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    pçs
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {supplier.freeCapacity.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    pçs
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-center">
                    <TrendIcon trend={supplier.trend} />
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {supplier.activeOrdersCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CapacitySupplierTable;
