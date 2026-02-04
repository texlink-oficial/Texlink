import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DataPoint {
  period: string;
  label: string;
  plannedCost: number;
  actualCost: number;
}

interface GroupedBarChartCostProps {
  data: DataPoint[];
  height?: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as DataPoint;
  const deviation = data.actualCost - data.plannedCost;
  const deviationPercentage = data.plannedCost > 0
    ? ((deviation / data.plannedCost) * 100).toFixed(1)
    : '0';
  const isOverBudget = deviation > 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {data.label}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Planejado:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(data.plannedCost)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Real:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(data.actualCost)}
          </span>
        </div>
        <div className="pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Desvio:</span>
            <span
              className={`text-sm font-semibold ${
                isOverBudget
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isOverBudget ? '+' : ''}{deviationPercentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-6 mt-4">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm bg-sky-500" />
      <span className="text-sm text-gray-600 dark:text-gray-400">Planejado</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm bg-purple-500" />
      <span className="text-sm text-gray-600 dark:text-gray-400">Real</span>
    </div>
  </div>
);

export const GroupedBarChartCost: React.FC<GroupedBarChartCostProps> = ({
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

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={4}
          barCategoryGap="20%"
        >
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
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={formatCurrency}
            width={65}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />

          <Bar
            dataKey="plannedCost"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="actualCost"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
};

export default GroupedBarChartCost;
