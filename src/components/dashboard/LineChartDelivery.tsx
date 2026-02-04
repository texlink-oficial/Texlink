import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DataPoint {
  date: string;
  label: string;
  onTimePercentage: number;
  totalDeliveries: number;
}

interface LineChartDeliveryProps {
  data: DataPoint[];
  color?: string;
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

  const data = payload[0].payload as DataPoint;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[160px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Semana de {label}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">No Prazo:</span>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {data.onTimePercentage}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Entregas:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.totalDeliveries}
          </span>
        </div>
      </div>
    </div>
  );
};

export const LineChartDelivery: React.FC<LineChartDeliveryProps> = ({
  data,
  color = '#10b981',
  height = 280,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
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
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
          width={45}
        />

        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone"
          dataKey="onTimePercentage"
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
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChartDelivery;
