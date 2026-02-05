import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Legend,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { CapacityTrendPoint } from '../../../services/capacityReports.service';

interface CapacityTrendChartProps {
  data: CapacityTrendPoint[];
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

  const data = payload[0].payload as CapacityTrendPoint;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {label} {data.isProjection && <span className="text-xs text-amber-500">(Projeção)</span>}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Capacidade Total:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.totalCapacity.toLocaleString()} pçs
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Alocação:</span>
          <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
            {data.brandAllocation.toLocaleString()} pçs
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Taxa de Ocupação:</span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {data.occupationRate}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const CapacityTrendChart: React.FC<CapacityTrendChartProps> = ({
  data,
  height = 320,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Sem dados disponíveis
      </div>
    );
  }

  // Split data into historical and projection
  const historicalData = data.filter((d) => !d.isProjection);
  const projectionData = data.filter((d) => d.isProjection);

  // Combine with overlap for smooth transition
  const chartData = [
    ...historicalData,
    ...(projectionData.length > 0 && historicalData.length > 0
      ? [{ ...historicalData[historicalData.length - 1], isProjection: true }]
      : []),
    ...projectionData,
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="capacityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e0f2fe" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#e0f2fe" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="allocationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
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
          yAxisId="left"
          domain={[0, 'auto']}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          width={50}
          label={{ value: 'Peças', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
        />

        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
          width={45}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
          iconType="line"
        />

        {/* Background area for total capacity */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="totalCapacity"
          stroke="none"
          fill="url(#capacityGradient)"
          name="Capacidade Total"
          strokeWidth={0}
        />

        {/* Line for brand allocation */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="brandAllocation"
          stroke="#0ea5e9"
          strokeWidth={2.5}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={payload.isProjection ? 3 : 4}
                fill={payload.isProjection ? '#f59e0b' : '#0ea5e9'}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          }}
          strokeDasharray={(props: any) => {
            const { isProjection } = props || {};
            return isProjection ? '5 5' : '0';
          }}
          name="Alocação da Marca"
        />

        {/* Line for occupation rate */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="occupationRate"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={payload.isProjection ? 3 : 4}
                fill={payload.isProjection ? '#f59e0b' : '#3b82f6'}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          }}
          strokeDasharray={(props: any) => {
            const { isProjection } = props || {};
            return isProjection ? '5 5' : '0';
          }}
          name="Taxa de Ocupação (%)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CapacityTrendChart;
