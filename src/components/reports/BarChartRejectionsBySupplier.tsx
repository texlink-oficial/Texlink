import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  RejectionBySupplier,
  REJECTION_CATEGORY_LABELS,
  RejectionCategory,
} from '../../services/rejectionReports.service';

interface BarChartRejectionsBySupplierProps {
  data: RejectionBySupplier[];
  height?: number;
  onSupplierClick?: (supplierId: string) => void;
}

interface ChartDataPoint extends RejectionBySupplier {
  displayName: string;
}

const getBarColor = (rejectionRate: number): string => {
  if (rejectionRate > 15) return '#ef4444'; // red
  if (rejectionRate > 10) return '#f97316'; // orange
  if (rejectionRate > 5) return '#eab308'; // yellow
  return '#22c55e'; // green
};

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({
  active,
  payload,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as ChartDataPoint;
  const TrendIcon =
    data.trend === 'up' ? TrendingUp :
    data.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    data.trend === 'up' ? 'text-red-500' :
    data.trend === 'down' ? 'text-emerald-500' : 'text-gray-400';

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[200px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 truncate max-w-[200px]">
        {data.supplierName}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Taxa de Rejeição:</span>
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            {data.rejectionRate}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rejeições:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.totalRejections} de {data.totalReviewed}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Pedidos:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.totalOrders}
          </span>
        </div>
        {data.topReason && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Principal Motivo:</span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {REJECTION_CATEGORY_LABELS[data.topReason]}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">Tendência:</span>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs font-medium capitalize">
              {data.trend === 'up' ? 'Piorando' : data.trend === 'down' ? 'Melhorando' : 'Estável'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BarChartRejectionsBySupplier: React.FC<BarChartRejectionsBySupplierProps> = ({
  data,
  height = 300,
  onSupplierClick,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Sem dados disponíveis
      </div>
    );
  }

  // Prepare data with truncated names and sort by rejection rate
  const chartData: ChartDataPoint[] = [...data]
    .sort((a, b) => b.rejectionRate - a.rejectionRate)
    .map((d) => ({
      ...d,
      displayName: d.supplierName.length > 15 ? d.supplierName.slice(0, 13) + '...' : d.supplierName,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={true}
          vertical={false}
          stroke="#e5e7eb"
          strokeOpacity={0.5}
        />

        <XAxis
          type="number"
          domain={[0, 'auto']}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
        />

        <YAxis
          type="category"
          dataKey="displayName"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          width={100}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />

        <Bar
          dataKey="rejectionRate"
          radius={[0, 4, 4, 0]}
          onClick={(data) => onSupplierClick?.(data.supplierId)}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry.rejectionRate)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartRejectionsBySupplier;
