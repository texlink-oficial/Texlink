import React, { useState, useEffect, useCallback } from 'react';
import { portalService, PerformanceData, TrendPoint } from '../../services/portal.service';
import { ratingsService, Rating } from '../../services/ratings.service';
import { MetricCard } from '../../components/shared/MetricCard';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
    CheckCircle,
    TrendingUp,
    Clock,
    XCircle,
    DollarSign,
    Calendar,
    Download,
    Loader2,
    Award,
    BarChart3,
    ArrowUp,
    ArrowDown,
    Minus,
    Star,
    MessageSquare,
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type PeriodPreset = '7' | '30' | '90' | 'custom';

// --- CSV Export ---

function generateCsv(data: PerformanceData): string {
    const lines: string[] = [];

    // KPIs
    lines.push('Indicador,Valor');
    lines.push(`Pedidos Concluídos,${data.completedOrders}`);
    lines.push(`Taxa de Aceitação (%),${data.acceptanceRate}`);
    lines.push(`Lead Time Médio (dias),${data.avgLeadTime}`);
    lines.push(`Taxa de Cancelamento (%),${data.cancellationRate}`);
    lines.push(`Total Faturado (R$),${data.totalRevenue}`);
    lines.push('');

    // Platform averages
    if (data.platformAverage) {
        lines.push('Média da Plataforma,Valor');
        lines.push(`Entrega no Prazo (%),${data.platformAverage.onTimeDeliveryRate}`);
        lines.push(`Qualidade (%),${data.platformAverage.qualityScore}`);
        lines.push(`Taxa de Rejeição (%),${data.platformAverage.rejectionRate}`);
        lines.push(`Lead Time Médio (dias),${data.platformAverage.avgLeadTime}`);
        lines.push('');
    }

    // Revenue chart data
    if (data.chartData?.length) {
        lines.push('Faturamento por Semana');
        lines.push('Data,Valor (R$)');
        data.chartData.forEach((p) => lines.push(`${p.date},${p.value}`));
        lines.push('');
    }

    // On-time delivery trend
    if (data.onTimeDeliveryTrend?.length) {
        lines.push('Entrega no Prazo por Semana');
        lines.push('Data,Taxa (%)');
        data.onTimeDeliveryTrend.forEach((p) => lines.push(`${p.date},${p.value}`));
        lines.push('');
    }

    // Quality score trend
    if (data.qualityScoreTrend?.length) {
        lines.push('Qualidade por Semana');
        lines.push('Data,Aprovação (%)');
        data.qualityScoreTrend.forEach((p) => lines.push(`${p.date},${p.value}`));
        lines.push('');
    }

    // Rejection rate trend
    if (data.rejectionRateTrend?.length) {
        lines.push('Taxa de Rejeição por Semana');
        lines.push('Data,Taxa (%)');
        data.rejectionRateTrend.forEach((p) => lines.push(`${p.date},${p.value}`));
        lines.push('');
    }

    // By status
    if (data.byStatus?.length) {
        lines.push('Por Status');
        lines.push('Status,Pedidos,Valor (R$)');
        data.byStatus.forEach((r) => lines.push(`${r.status},${r.count},${r.value}`));
        lines.push('');
    }

    // By brand
    if (data.byBrand?.length) {
        lines.push('Por Marca');
        lines.push('Marca,Pedidos,Valor (R$)');
        data.byBrand.forEach((r) => lines.push(`${r.brand},${r.count},${r.value}`));
    }

    return lines.join('\n');
}

function downloadCsv(data: PerformanceData) {
    const csv = generateCsv(data);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `desempenho-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Chart Tooltip ---

interface TrendTooltipProps {
    unit: string;
    platformValue?: number;
    platformLabel?: string;
}

function createTrendTooltip({ unit, platformValue, platformLabel }: TrendTooltipProps) {
    const TrendTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({
        active,
        payload,
        label,
    }) => {
        if (!active || !payload || !payload.length) return null;
        const point = payload[0].payload as TrendPoint;
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 min-w-[160px]">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Semana de {label}
                </p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Seu valor:</span>
                        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                            {point.value}{unit}
                        </span>
                    </div>
                    {platformValue !== undefined && (
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{platformLabel || 'Plataforma'}:</span>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {platformValue}{unit}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    TrendTooltip.displayName = 'TrendTooltip';
    return TrendTooltip;
}

// --- Trend Chart Component ---

interface TrendChartProps {
    title: string;
    data: TrendPoint[];
    color: string;
    platformAvgValue?: number;
    unit?: string;
    invertColor?: boolean; // For rejection rate: lower is better
    yDomain?: [number, number];
}

const TrendChart: React.FC<TrendChartProps> = ({
    title,
    data,
    color,
    platformAvgValue,
    unit = '%',
    invertColor = false,
    yDomain,
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
                <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                    Sem dados disponiveis para o periodo
                </div>
            </div>
        );
    }

    // Calculate current value (last point) vs platform average for comparison indicator
    const currentValue = data[data.length - 1]?.value ?? 0;
    let comparisonIcon = <Minus className="h-3.5 w-3.5" />;
    let comparisonColor = 'text-gray-500';
    let comparisonText = '';

    if (platformAvgValue !== undefined) {
        const diff = currentValue - platformAvgValue;
        if (Math.abs(diff) < 0.5) {
            comparisonText = 'Na media';
        } else if (invertColor ? diff < 0 : diff > 0) {
            comparisonIcon = <ArrowUp className="h-3.5 w-3.5" />;
            comparisonColor = 'text-green-600 dark:text-green-400';
            comparisonText = `${Math.abs(diff).toFixed(1)}${unit} acima da media`;
        } else {
            comparisonIcon = <ArrowDown className="h-3.5 w-3.5" />;
            comparisonColor = 'text-red-600 dark:text-red-400';
            comparisonText = `${Math.abs(diff).toFixed(1)}${unit} abaixo da media`;
        }
    }

    const TooltipContent = createTrendTooltip({
        unit,
        platformValue: platformAvgValue,
        platformLabel: 'Media plataforma',
    });

    // Compute y-axis domain
    const domain = yDomain || [0, 100];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                {platformAvgValue !== undefined && comparisonText && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${comparisonColor}`}>
                        {comparisonIcon}
                        <span>{comparisonText}</span>
                    </div>
                )}
            </div>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            dy={8}
                        />
                        <YAxis
                            domain={domain}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            tickFormatter={(v) => `${v}${unit}`}
                            width={50}
                        />
                        <Tooltip content={<TooltipContent />} />
                        {platformAvgValue !== undefined && (
                            <ReferenceLine
                                y={platformAvgValue}
                                stroke="#9ca3af"
                                strokeDasharray="6 4"
                                strokeWidth={1.5}
                                label={{
                                    value: `Media: ${platformAvgValue}${unit}`,
                                    position: 'insideTopRight',
                                    fill: '#9ca3af',
                                    fontSize: 10,
                                }}
                            />
                        )}
                        <Line
                            type="monotone"
                            dataKey="value"
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
            </div>
            {platformAvgValue !== undefined && (
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
                        <span>Seu desempenho</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-0.5 rounded border-t-2 border-dashed border-gray-400" />
                        <span>Media da plataforma</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Platform Comparison Card ---

interface ComparisonItemProps {
    label: string;
    supplierValue: number;
    platformValue: number;
    unit: string;
    invertColor?: boolean;
}

const ComparisonItem: React.FC<ComparisonItemProps> = ({
    label,
    supplierValue,
    platformValue,
    unit,
    invertColor = false,
}) => {
    const diff = supplierValue - platformValue;
    const isGood = invertColor ? diff <= 0 : diff >= 0;
    const absDiff = Math.abs(diff);

    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {supplierValue}{unit}
                </span>
                <span className="text-xs text-gray-400">vs</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {platformValue}{unit}
                </span>
                {absDiff >= 0.5 && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isGood
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {isGood ? '+' : ''}{diff.toFixed(1)}{unit}
                    </span>
                )}
            </div>
        </div>
    );
};

// --- Main Page ---

const PerformancePage: React.FC = () => {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState<'byStatus' | 'byBrand'>('byStatus');
    const [receivedRatings, setReceivedRatings] = useState<Rating[]>([]);
    const [isLoadingRatings, setIsLoadingRatings] = useState(true);

    useEffect(() => {
        loadData();
        loadRatings();
    }, [periodPreset, startDate, endDate]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const result = await portalService.getPerformance(startDate, endDate);
            setData(result);
        } catch (error) {
            console.error('Error loading performance:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRatings = async () => {
        try {
            setIsLoadingRatings(true);
            const ratings = await ratingsService.getMyRatings();
            setReceivedRatings(ratings);
        } catch (error) {
            console.error('Error loading ratings:', error);
        } finally {
            setIsLoadingRatings(false);
        }
    };

    const handlePeriodChange = (preset: PeriodPreset) => {
        setPeriodPreset(preset);
        if (preset !== 'custom') {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(preset));
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
    };

    const handleExport = useCallback(() => {
        if (data) {
            downloadCsv(data);
        }
    }, [data]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Desempenho</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Acompanhe os principais indicadores da sua operacao
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={!data}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                </button>
            </div>

            {/* Period Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodo:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['7', '30', '90'] as PeriodPreset[]).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handlePeriodChange(preset)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodPreset === preset
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {preset} dias
                            </button>
                        ))}
                        <button
                            onClick={() => handlePeriodChange('custom')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodPreset === 'custom'
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Personalizado
                        </button>
                    </div>
                    {periodPreset === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                            <span className="text-gray-500">ate</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <MetricCard
                    title="Pedidos Concluídos"
                    value={data?.completedOrders || 0}
                    icon={CheckCircle}
                    iconColor="green"
                />
                <MetricCard
                    title="Taxa de Aceitação"
                    value={`${data?.acceptanceRate || 0}%`}
                    icon={TrendingUp}
                    iconColor="blue"
                />
                <MetricCard
                    title="Lead Time Médio"
                    value={`${data?.avgLeadTime || 0} dias`}
                    icon={Clock}
                    iconColor="purple"
                    subtitle={data?.platformAverage ? `Plataforma: ${data.platformAverage.avgLeadTime} dias` : undefined}
                />
                <MetricCard
                    title="Taxa de Cancelamento"
                    value={`${data?.cancellationRate || 0}%`}
                    icon={XCircle}
                    iconColor={data?.cancellationRate && data.cancellationRate > 5 ? 'red' : 'green'}
                />
                <MetricCard
                    title="Total Faturado"
                    value={formatCurrency(data?.totalRevenue || 0)}
                    icon={DollarSign}
                    iconColor="brand"
                />
            </div>

            {/* Performance Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <TrendChart
                    title="Entrega no Prazo"
                    data={data?.onTimeDeliveryTrend || []}
                    color="#10b981"
                    platformAvgValue={data?.platformAverage?.onTimeDeliveryRate}
                    unit="%"
                />
                <TrendChart
                    title="Qualidade (Aprovação)"
                    data={data?.qualityScoreTrend || []}
                    color="#6366f1"
                    platformAvgValue={data?.platformAverage?.qualityScore}
                    unit="%"
                />
                <TrendChart
                    title="Taxa de Rejeição"
                    data={data?.rejectionRateTrend || []}
                    color="#ef4444"
                    platformAvgValue={data?.platformAverage?.rejectionRate}
                    unit="%"
                    invertColor
                    yDomain={[0, Math.max(20, ...(data?.rejectionRateTrend?.map(p => p.value) || []))]}
                />
            </div>

            {/* Platform Comparison Card */}
            {data?.platformAverage && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                            <Award className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Comparativo com a Plataforma
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Veja como seu desempenho se compara à média de todos os fornecedores
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        <ComparisonItem
                            label="Entrega no Prazo"
                            supplierValue={
                                data.onTimeDeliveryTrend?.length
                                    ? data.onTimeDeliveryTrend[data.onTimeDeliveryTrend.length - 1].value
                                    : data.acceptanceRate
                            }
                            platformValue={data.platformAverage.onTimeDeliveryRate}
                            unit="%"
                        />
                        <ComparisonItem
                            label="Qualidade (Aprovação)"
                            supplierValue={
                                data.qualityScoreTrend?.length
                                    ? data.qualityScoreTrend[data.qualityScoreTrend.length - 1].value
                                    : 0
                            }
                            platformValue={data.platformAverage.qualityScore}
                            unit="%"
                        />
                        <ComparisonItem
                            label="Taxa de Rejeição"
                            supplierValue={data.cancellationRate}
                            platformValue={data.platformAverage.rejectionRate}
                            unit="%"
                            invertColor
                        />
                        <ComparisonItem
                            label="Lead Time Médio"
                            supplierValue={data.avgLeadTime}
                            platformValue={data.platformAverage.avgLeadTime}
                            unit=" dias"
                            invertColor
                        />
                    </div>
                </div>
            )}

            {/* Revenue Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Evolucao do Faturamento
                    </h2>
                </div>
                <div className="h-64 flex items-end justify-between gap-2">
                    {data?.chartData?.map((point, index) => {
                        const maxValue = Math.max(...(data.chartData?.map(p => p.value) || [1]));
                        const height = (point.value / maxValue) * 100;
                        return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {formatCurrency(point.value)}
                                </span>
                                <div
                                    className="w-full bg-gradient-to-t from-brand-500 to-brand-400 rounded-t"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('byStatus')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'byStatus'
                                    ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Por Status
                        </button>
                        <button
                            onClick={() => setActiveTab('byBrand')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'byBrand'
                                    ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Por Marca
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {activeTab === 'byStatus' ? 'Status' : 'Marca'}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Pedidos
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {(activeTab === 'byStatus' ? data?.byStatus : data?.byBrand)?.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        {activeTab === 'byStatus' ? row.status : (row as any).brand}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                                        {row.count}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                                        {formatCurrency(row.value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Received Ratings Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Avaliacoes Recebidas
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Veja o que as marcas dizem sobre seu trabalho
                            </p>
                        </div>
                    </div>
                </div>
                {isLoadingRatings ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                ) : receivedRatings.length === 0 ? (
                    <div className="p-12 text-center">
                        <Star className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Nenhuma avaliação recebida ainda
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {receivedRatings.map((rating) => (
                            <div key={rating.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {rating.fromCompany?.tradeName || 'Marca'}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {new Date(rating.createdAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                        {rating.order && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                Pedido #{rating.order.displayId} - {rating.order.productName}
                                            </p>
                                        )}
                                        {rating.comment && (
                                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                                "{rating.comment}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-4 h-4 ${i < rating.score
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-gray-200 dark:text-gray-600'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformancePage;
