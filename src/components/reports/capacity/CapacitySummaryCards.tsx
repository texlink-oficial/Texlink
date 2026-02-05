import React from 'react';
import { Package, TrendingUp, Factory, Activity } from 'lucide-react';
import { CapacitySummary } from '../../../services/capacityReports.service';

interface CapacitySummaryCardsProps {
  data: CapacitySummary;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
}) => {
  const bgColors = {
    default: 'bg-white dark:bg-slate-900',
    success: 'bg-emerald-50 dark:bg-emerald-900/20',
    warning: 'bg-amber-50 dark:bg-amber-900/20',
    info: 'bg-sky-50 dark:bg-sky-900/20',
  };

  const iconBgColors = {
    default: 'bg-gray-100 dark:bg-white/[0.05]',
    success: 'bg-emerald-100 dark:bg-emerald-900/40',
    warning: 'bg-amber-100 dark:bg-amber-900/40',
    info: 'bg-sky-100 dark:bg-sky-900/40',
  };

  const iconColors = {
    default: 'text-gray-600 dark:text-gray-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-sky-600 dark:text-sky-400',
  };

  return (
    <div
      className={`
        ${bgColors[variant]}
        border border-gray-200 dark:border-white/[0.06]
        rounded-2xl p-4 lg:p-5
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgColors[variant]}`}>
          <div className={iconColors[variant]}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 lg:p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  </div>
);

const ProgressRing: React.FC<{ value: number }> = ({ value }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 90) return '#ef4444'; // red
    if (val >= 70) return '#f59e0b'; // amber
    if (val >= 50) return '#3b82f6'; // blue
    return '#10b981'; // emerald
  };

  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke={getColor(value)}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          {value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export const CapacitySummaryCards: React.FC<CapacitySummaryCardsProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Capacity */}
      <StatCard
        title="Capacidade Total"
        value={data.totalCapacity.toLocaleString()}
        subtitle="peças/mês disponíveis"
        icon={<Factory className="w-6 h-6" />}
        variant="default"
      />

      {/* Allocated by Brand */}
      <StatCard
        title="Alocação da Marca"
        value={data.allocatedByBrand.toLocaleString()}
        subtitle={`de ${data.totalSuppliers} fornecedores`}
        icon={<Package className="w-6 h-6" />}
        variant="info"
      />

      {/* Occupation Rate with visual gauge */}
      <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 lg:p-5">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Taxa de Ocupação
        </p>
        <div className="flex items-center justify-center">
          <ProgressRing value={data.brandOccupationRate} />
        </div>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
          {data.activeOrdersCount} pedidos ativos
        </p>
      </div>

      {/* Available Capacity */}
      <StatCard
        title="Capacidade Disponível"
        value={data.availableCapacity.toLocaleString()}
        subtitle="peças/mês livres"
        icon={<Activity className="w-6 h-6" />}
        variant={data.availableCapacity > 0 ? 'success' : 'warning'}
      />
    </div>
  );
};

export default CapacitySummaryCards;
