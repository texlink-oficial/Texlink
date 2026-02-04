import { AlertTriangle, TrendingUp, TrendingDown, Factory, XCircle } from 'lucide-react';
import { RejectionSummary, REJECTION_CATEGORY_LABELS, RejectionCategory } from '../../services/rejectionReports.service';

interface RejectionSummaryCardsProps {
  data: RejectionSummary;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  variant?: 'default' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}) => {
  const bgColors = {
    default: 'bg-white dark:bg-slate-900',
    warning: 'bg-amber-50 dark:bg-amber-900/20',
    danger: 'bg-red-50 dark:bg-red-900/20',
  };

  const iconBgColors = {
    default: 'bg-gray-100 dark:bg-white/[0.05]',
    warning: 'bg-amber-100 dark:bg-amber-900/40',
    danger: 'bg-red-100 dark:bg-red-900/40',
  };

  const iconColors = {
    default: 'text-gray-600 dark:text-gray-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
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
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value > 0 ? (
                <TrendingUp className={`w-4 h-4 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
              ) : trend.value < 0 ? (
                <TrendingDown className={`w-4 h-4 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
              ) : null}
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </span>
            </div>
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

export const RejectionSummaryCards: React.FC<RejectionSummaryCardsProps> = ({
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

  const { comparedToPreviousPeriod } = data;
  // For rejections, a decrease is positive (good), an increase is negative (bad)
  const isPositiveTrend = comparedToPreviousPeriod.rejectionsPercentChange < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Rejections */}
      <StatCard
        title="Total de Rejeições"
        value={data.totalRejections}
        subtitle={`de ${data.totalReviewed} revisados`}
        icon={<XCircle className="w-6 h-6" />}
        trend={{
          value: comparedToPreviousPeriod.rejectionsPercentChange,
          isPositive: isPositiveTrend,
          label: 'vs período anterior',
        }}
        variant={data.rejectionRate > 10 ? 'danger' : data.rejectionRate > 5 ? 'warning' : 'default'}
      />

      {/* Rejection Rate */}
      <StatCard
        title="Taxa de Rejeição"
        value={`${data.rejectionRate}%`}
        subtitle="do total revisado"
        icon={<AlertTriangle className="w-6 h-6" />}
        variant={data.rejectionRate > 10 ? 'danger' : data.rejectionRate > 5 ? 'warning' : 'default'}
      />

      {/* Top Reason */}
      <StatCard
        title="Principal Motivo"
        value={data.topReason ? REJECTION_CATEGORY_LABELS[data.topReason.category] : '-'}
        subtitle={data.topReason ? `${data.topReason.count} ocorrências (${data.topReason.percentage}%)` : undefined}
        icon={<AlertTriangle className="w-6 h-6" />}
        variant="warning"
      />

      {/* Worst Supplier */}
      <StatCard
        title="Facção com Maior Taxa"
        value={data.worstSupplier?.name || '-'}
        subtitle={data.worstSupplier ? `${data.worstSupplier.rejectionRate}% (${data.worstSupplier.totalRejections} itens)` : undefined}
        icon={<Factory className="w-6 h-6" />}
        variant="danger"
      />
    </div>
  );
};

export default RejectionSummaryCards;
