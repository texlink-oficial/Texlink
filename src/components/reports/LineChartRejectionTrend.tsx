import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Area,
  ComposedChart,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { RejectionTrendPoint } from '../../services/rejectionReports.service';

interface LineChartRejectionTrendProps {
  data: RejectionTrendPoint[];
  height?: number;
}

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as RejectionTrendPoint;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[160px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Semana de {label}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Taxa de Rejeição:</span>
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            {data.rejectionRate}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rejeitados:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.totalRejections}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Revisados:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.totalReviewed}
          </span>
        </div>
      </div>
    </div>
  );
};

export const LineChartRejectionTrend: React.FC<LineChartRejectionTrendProps> = ({
  data,
  height = 280,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Sem dados disponíveis
      </div>
    );
  }

  const color = '#ef4444';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="rejectionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#e5e7eb"
          strokeOpacity={0.5}
        />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          dy={10}
        />

        <YAxis
          domain={[0, 'auto']}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
          width={45}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="rejectionRate"
          stroke="none"
          fill="url(#rejectionGradient)"
        />

        <Line
          type="monotone"
          dataKey="rejectionRate"
          stroke={color}
          strokeWidth={2.5}
          dot={{
            fill: color,
            stroke: '#fff',
            strokeWidth: 2,
            r: 4,
          }}
          activeDot={{
            r: 6,
            fill: color,
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default LineChartRejectionTrend;
