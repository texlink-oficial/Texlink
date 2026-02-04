import { PieChart, Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
  RejectionByReason,
  REJECTION_CATEGORY_COLORS,
  RejectionCategory,
} from '../../services/rejectionReports.service';

interface PieChartRejectionReasonsProps {
  data: RejectionByReason[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  category: RejectionCategory;
  totalQuantity: number;
}

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as ChartDataPoint;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[140px]">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {data.name}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {data.value} ocorrências
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {data.totalQuantity} peças afetadas
        </p>
      </div>
    </div>
  );
};

export const PieChartRejectionReasons: React.FC<PieChartRejectionReasonsProps> = ({
  data,
  height = 200,
  innerRadius = 60,
  outerRadius = 85,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Sem dados disponíveis
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.map((item) => ({
    name: item.label,
    value: item.count,
    color: REJECTION_CATEGORY_COLORS[item.category],
    category: item.category,
    totalQuantity: item.totalQuantity,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col">
      {/* Chart Container */}
      <div className="relative flex items-center justify-center" style={{ height }}>
        <PieChart width={height} height={height}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                className="transition-all duration-200 hover:opacity-80 focus:outline-none"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={(props) => <CustomTooltip {...props} />} />
        </PieChart>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
            {total}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Total
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6 p-2">
        {chartData.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-xs sm:text-sm border-b border-gray-100 dark:border-white/[0.05] pb-2 last:border-0"
          >
            <div className="flex items-center gap-2 truncate">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-400 truncate">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {item.value}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChartRejectionReasons;
