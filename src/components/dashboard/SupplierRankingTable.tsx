import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

type MedalType = 'gold' | 'silver' | 'bronze' | null;
type TrendType = 'up' | 'down' | 'stable';
type SortKey = 'rank' | 'deadlineCompliance' | 'qualityScore' | 'volume' | 'avgCost';

interface SupplierRankingItem {
  id: string;
  tradeName: string;
  rank: number;
  medal: MedalType;
  deadlineCompliance: number;
  qualityScore: number;
  volume: number;
  avgCost: number;
  nonConformances: number;
  trend: TrendType;
}

interface SupplierRankingTableProps {
  suppliers: SupplierRankingItem[];
  onSupplierClick?: (supplierId: string) => void;
}

const MedalIcon: React.FC<{ medal: MedalType }> = ({ medal }) => {
  if (!medal) return null;

  const config = {
    gold: {
      icon: Trophy,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    silver: {
      icon: Medal,
      color: 'text-gray-400',
      bg: 'bg-gray-400/10',
    },
    bronze: {
      icon: Medal,
      color: 'text-orange-600',
      bg: 'bg-orange-600/10',
    },
  };

  const { icon: Icon, color, bg } = config[medal];

  return (
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
};

const TrendIcon: React.FC<{ trend: TrendType }> = ({ trend }) => {
  const config = {
    up: {
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    down: {
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    stable: {
      icon: Minus,
      color: 'text-gray-400',
      bg: 'bg-gray-400/10',
    },
  };

  const { icon: Icon, color, bg } = config[trend];

  return (
    <div className={`w-6 h-6 rounded ${bg} flex items-center justify-center`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
    <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
      {value}%
    </span>
  </div>
);

export const SupplierRankingTable: React.FC<SupplierRankingTableProps> = ({
  suppliers,
  onSupplierClick,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
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

  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum fornecedor encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Ranking de Fornecedores
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Top performers do período
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-left">
                <SortHeader label="#" sortKeyName="rank" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fornecedor
                </span>
              </th>
              <th className="px-4 py-3 text-left min-w-[140px]">
                <SortHeader label="Prazo" sortKeyName="deadlineCompliance" />
              </th>
              <th className="px-4 py-3 text-left min-w-[140px]">
                <SortHeader label="Qualidade" sortKeyName="qualityScore" />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Volume" sortKeyName="volume" className="justify-end" />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Custo Médio" sortKeyName="avgCost" className="justify-end" />
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Trend
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {sortedSuppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {supplier.medal ? (
                      <MedalIcon medal={supplier.medal} />
                    ) : (
                      <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        {supplier.rank}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {supplier.tradeName}
                    </p>
                    {supplier.nonConformances > 0 && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {supplier.nonConformances} não conformidade(s)
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ProgressBar
                    value={supplier.deadlineCompliance}
                    color={
                      supplier.deadlineCompliance >= 90
                        ? 'bg-emerald-500'
                        : supplier.deadlineCompliance >= 70
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }
                  />
                </td>
                <td className="px-4 py-4">
                  <ProgressBar
                    value={supplier.qualityScore}
                    color={
                      supplier.qualityScore >= 90
                        ? 'bg-emerald-500'
                        : supplier.qualityScore >= 70
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }
                  />
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {supplier.volume.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">pçs</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    R$ {supplier.avgCost.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-center">
                    <TrendIcon trend={supplier.trend} />
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    to={`/brand/fornecedores/${supplier.id}`}
                    className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                  >
                    Ver
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierRankingTable;
