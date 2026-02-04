import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DataPoint {
  supplierId: string;
  supplierName: string;
  approved: number;
  secondQuality: number;
  rejected: number;
}

interface BarChartQualityProps {
  data: DataPoint[];
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
  const total = data.approved + data.secondQuality + data.rejected;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 truncate max-w-[200px]">
        {data.supplierName}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Aprovado:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.approved} ({total > 0 ? Math.round((data.approved / total) * 100) : 0}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">2ª Qualidade:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.secondQuality} ({total > 0 ? Math.round((data.secondQuality / total) * 100) : 0}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Rejeitado:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.rejected} ({total > 0 ? Math.round((data.rejected / total) * 100) : 0}%)
          </span>
        </div>
      </div>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-6 mt-4">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm bg-emerald-500" />
      <span className="text-sm text-gray-600 dark:text-gray-400">Aprovado</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm bg-amber-500" />
      <span className="text-sm text-gray-600 dark:text-gray-400">2ª Qualidade</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm bg-red-500" />
      <span className="text-sm text-gray-600 dark:text-gray-400">Rejeitado</span>
    </div>
  </div>
);

export const BarChartQuality: React.FC<BarChartQualityProps> = ({
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

  // Truncate supplier names for X-axis
  const chartData = data.map((d) => ({
    ...d,
    displayName: d.supplierName.length > 12 ? d.supplierName.slice(0, 10) + '...' : d.supplierName,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
            strokeOpacity={0.5}
          />

          <XAxis
            dataKey="displayName"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            dy={10}
            interval={0}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />

          <Bar
            dataKey="approved"
            stackId="quality"
            fill="#10b981"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="secondQuality"
            stackId="quality"
            fill="#f59e0b"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="rejected"
            stackId="quality"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
};

export default BarChartQuality;
