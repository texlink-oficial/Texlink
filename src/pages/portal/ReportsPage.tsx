import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText,
    BarChart3,
    XCircle,
    Download,
    FileSpreadsheet,
    Calendar,
    Package,
    DollarSign,
    Star,
    TrendingUp,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { reportsService, UnifiedReport } from '../../services/reports.service';

const ReportsPage: React.FC = () => {
    const [report, setReport] = useState<UnifiedReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 2);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await reportsService.getUnifiedReport(
                new Date(startDate),
                new Date(endDate)
            );
            setReport(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar relatório');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPDF = () => {
        // TODO: Implement PDF export
        alert('Exportação para PDF em desenvolvimento');
    };

    const handleExportExcel = () => {
        // TODO: Implement Excel export
        alert('Exportação para Excel em desenvolvimento');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                    <button
                        onClick={loadReport}
                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Relatório de Operações
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Visão consolidada de vendas, cancelamentos e qualidade
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Filters */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-sm text-gray-900 dark:text-white border-none focus:outline-none"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-sm text-gray-900 dark:text-white border-none focus:outline-none"
                        />
                        <button
                            onClick={loadReport}
                            className="px-3 py-1 text-sm bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
                        >
                            Filtrar
                        </button>
                    </div>

                    {/* Export Buttons */}
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                            <Package className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total Pedidos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {report?.summary.totalOrders || 0}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Faturamento</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(report?.summary.totalRevenue || 0)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Ticket Médio</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(report?.summary.avgTicket || 0)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Nota Média</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Number(report?.summary.avgRating || 0).toFixed(1)} ⭐
                    </p>
                </div>
            </div>

            {/* Sales Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-6 h-6 text-brand-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vendas</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aceitos</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {report?.sales.accepted || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Recusados</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {report?.sales.rejected || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Concluídos</p>
                        <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                            {report?.sales.completed || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Taxa Aceite</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {report?.sales.acceptanceRate || 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Cancellations Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <XCircle className="w-6 h-6 text-red-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cancelamentos</h2>
                    <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                        {report?.cancellations.percentage}% do total
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Cancelados</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {report?.cancellations.total || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Perda Total</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(report?.cancellations.totalLoss || 0)}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Principal Motivo</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                            {report?.cancellations.byReason[0]?.reason || 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Reasons Table */}
                {report?.cancellations.byReason && report.cancellations.byReason.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Motivo
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Quantidade
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Valor
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        %
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {report.cancellations.byReason.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {item.reason}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                                            {item.count}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(item.value)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                            {item.percentage}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quality Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Qualidade</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Nota Média</p>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                            {Number(report?.quality.avgRating || 0).toFixed(1)} ⭐
                        </p>
                    </div>
                    <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Taxa de Conclusão</p>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                            {report?.quality.completionRate || 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
