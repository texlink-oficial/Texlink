import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield, TrendingUp, CheckCircle, AlertTriangle,
    Loader2, FileX, Filter, Calendar, Eye, CheckCircleIcon, XCircle
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { credentialsService } from '../../../services';
import { RiskLevelIndicator } from '../../../components/credentials/RiskLevelIndicator';
import { ComplianceScore } from '../../../components/credentials/ComplianceScore';

interface ComplianceDashboardData {
    metrics: {
        totalAnalyses: number;
        averageScore: number;
        autoApprovalRate: number;
        pendingManualReview: number;
    };
    riskDistribution: Array<{
        name: string;
        value: number;
        level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
    scoreDistribution: Array<{
        range: string;
        count: number;
    }>;
    scoreTrend: Array<{
        date: string;
        avgScore: number;
    }>;
    pendingReviews: Array<{
        id: string;
        tradeName: string;
        legalName: string;
        cnpj: string;
        overallScore: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        analyzedAt: string;
    }>;
}

type RiskLevelFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ScoreRangeFilter = 'ALL' | '0-30' | '31-60' | '61-80' | '81-100';
type PeriodFilter = '7' | '30' | '90' | 'custom';

const ComplianceDashboardPage: React.FC = () => {
    const [data, setData] = useState<ComplianceDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [riskFilter, setRiskFilter] = useState<RiskLevelFilter>('ALL');
    const [scoreFilter, setScoreFilter] = useState<ScoreRangeFilter>('ALL');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    useEffect(() => {
        loadDashboard();
    }, [riskFilter, scoreFilter, periodFilter]);

    const loadDashboard = async () => {
        try {
            setIsLoading(true);

            const filters: any = {};

            if (riskFilter !== 'ALL') {
                filters.riskLevel = riskFilter;
            }

            if (scoreFilter !== 'ALL') {
                const [min, max] = scoreFilter.split('-').map(Number);
                filters.scoreMin = min;
                filters.scoreMax = max;
            }

            if (periodFilter === 'custom' && customDateFrom && customDateTo) {
                filters.dateFrom = customDateFrom;
                filters.dateTo = customDateTo;
            } else if (periodFilter !== 'custom') {
                const days = parseInt(periodFilter);
                const dateFrom = new Date();
                dateFrom.setDate(dateFrom.getDate() - days);
                filters.dateFrom = dateFrom.toISOString();
            }

            const response = await credentialsService.getComplianceDashboard(filters);
            setData(response);
        } catch (error) {
            console.error('Error loading compliance dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja aprovar este credenciamento?')) return;

        try {
            const notes = prompt('Notas de aprovação (opcional):');
            await credentialsService.approveCompliance(id, notes || '');
            loadDashboard();
        } catch (error) {
            console.error('Error approving:', error);
            alert('Erro ao aprovar credenciamento');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Motivo da rejeição:');
        if (!reason) return;

        const details = prompt('Detalhes adicionais (opcional):');

        try {
            await credentialsService.rejectCompliance(id, reason, details || '');
            loadDashboard();
        } catch (error) {
            console.error('Error rejecting:', error);
            alert('Erro ao rejeitar credenciamento');
        }
    };

    const RISK_COLORS = {
        LOW: '#10b981',
        MEDIUM: '#f59e0b',
        HIGH: '#f97316',
        CRITICAL: '#ef4444',
    };

    const formatCNPJ = (cnpj: string): string => {
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatDate = (date: string): string => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 lg:p-8">
                <div className="text-center py-20">
                    <FileX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                        Erro ao carregar dados do dashboard
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Dashboard de Compliance
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Análises e métricas de credenciamento
                    </p>
                </div>
                <Link
                    to="/brand/credenciamento"
                    className="px-4 py-2 text-brand-600 hover:text-brand-500 font-medium transition-colors"
                >
                    Voltar para Lista
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Risk Level Filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nível de Risco
                        </label>
                        <select
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value as RiskLevelFilter)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                            <option value="ALL">Todos</option>
                            <option value="LOW">Baixo</option>
                            <option value="MEDIUM">Médio</option>
                            <option value="HIGH">Alto</option>
                            <option value="CRITICAL">Crítico</option>
                        </select>
                    </div>

                    {/* Score Range Filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Faixa de Score
                        </label>
                        <select
                            value={scoreFilter}
                            onChange={(e) => setScoreFilter(e.target.value as ScoreRangeFilter)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                            <option value="ALL">Todos</option>
                            <option value="0-30">0-30 (Baixo)</option>
                            <option value="31-60">31-60 (Regular)</option>
                            <option value="61-80">61-80 (Bom)</option>
                            <option value="81-100">81-100 (Excelente)</option>
                        </select>
                    </div>

                    {/* Period Filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Período
                        </label>
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                            <option value="7">Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                            <option value="custom">Período customizado</option>
                        </select>
                    </div>

                    {periodFilter === 'custom' && (
                        <>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    value={customDateFrom}
                                    onChange={(e) => setCustomDateFrom(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    value={customDateTo}
                                    onChange={(e) => setCustomDateTo(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={loadDashboard}
                                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={Shield}
                    label="Total de Análises"
                    value={data.metrics.totalAnalyses}
                    color="blue"
                />
                <MetricCard
                    icon={TrendingUp}
                    label="Score Médio Geral"
                    value={data.metrics.averageScore.toFixed(1)}
                    suffix="/100"
                    color="green"
                />
                <MetricCard
                    icon={CheckCircle}
                    label="Taxa de Aprovação Auto"
                    value={`${data.metrics.autoApprovalRate.toFixed(1)}%`}
                    color="purple"
                />
                <MetricCard
                    icon={AlertTriangle}
                    label="Pendentes de Revisão"
                    value={data.metrics.pendingManualReview}
                    color="amber"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Distribution - Pie Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Distribuição por Nível de Risco
                    </h3>
                    {data.riskDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.riskDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.riskDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.level]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart message="Nenhuma análise realizada" />
                    )}
                </div>

                {/* Score Distribution - Bar Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Distribuição de Scores
                    </h3>
                    {data.scoreDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#6366f1" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart message="Nenhuma análise realizada" />
                    )}
                </div>
            </div>

            {/* Score Trend - Line Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Tendência de Scores ao Longo do Tempo
                </h3>
                {data.scoreTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.scoreTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="avgScore"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Score Médio"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyChart message="Dados insuficientes para tendência" />
                )}
            </div>

            {/* Manual Review List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Pendentes de Revisão Manual
                </h3>
                {data.pendingReviews.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                            Nenhum credenciamento pendente de revisão
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Nome
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        CNPJ
                                    </th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Score
                                    </th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Risco
                                    </th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Data
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pendingReviews.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {item.tradeName || item.legalName}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {formatCNPJ(item.cnpj)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {item.overallScore}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                                    /100
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-center">
                                                <RiskLevelIndicator riskLevel={item.riskLevel} size="sm" />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(item.analyzedAt)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/brand/credenciamento/${item.id}`}
                                                    className="p-2 text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleApprove(item.id)}
                                                    className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                                    title="Aprovar"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(item.id)}
                                                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                    title="Rejeitar"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Components
interface MetricCardProps {
    icon: React.ElementType;
    label: string;
    value: number | string;
    suffix?: string;
    color: 'blue' | 'green' | 'purple' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, suffix, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {value}
                        {suffix && <span className="text-base text-gray-500 ml-1">{suffix}</span>}
                    </p>
                </div>
            </div>
        </div>
    );
};

const EmptyChart: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
        <div className="text-center">
            <FileX className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{message}</p>
        </div>
    </div>
);

export default ComplianceDashboardPage;
