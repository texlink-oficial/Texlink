import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentsService, FinancialDashboard, Payment, PaymentStatus } from '../../services/payments.service';
import {
    DollarSign,
    TrendingUp,
    Clock,
    AlertTriangle,
    Download,
    CheckCircle,
    ArrowLeft,
    Calendar,
    Loader2,
    FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
    PENDENTE: { label: 'Pendente', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' },
    PARCIAL: { label: 'Parcial', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
    PAGO: { label: 'Pago', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' },
    ATRASADO: { label: 'Atrasado', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const FinancialDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'overdue' | 'recent'>('pending');

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setIsLoading(true);
            const data = await paymentsService.getFinancialDashboard();
            setDashboard(data);
        } catch (error) {
            console.error('Error loading financial dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsPaid = async (paymentId: string) => {
        try {
            await paymentsService.markAsPaid(paymentId);
            loadDashboard();
        } catch (error) {
            console.error('Error marking as paid:', error);
        }
    };

    const handleExport = async (format: 'csv' | 'pdf') => {
        try {
            const blob = await paymentsService.exportReport(format);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-financeiro.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting report:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const currentPayments = activeTab === 'pending'
        ? dashboard?.pendingPayments
        : activeTab === 'overdue'
            ? dashboard?.overduePayments
            : dashboard?.recentPayments;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/supplier" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Financeiro</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral de receitas e pagamentos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleExport('csv')}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                CSV
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receita Total</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(dashboard?.totalReceived || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">A Receber</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(dashboard?.totalReceivable || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(dashboard?.totalPending || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Atrasados</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(dashboard?.totalOverdue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Chart Placeholder */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução Mensal</h2>
                    <div className="h-64 flex items-end justify-between gap-4 px-4">
                        {dashboard?.monthlyData?.map((data, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full flex flex-col gap-1">
                                    <div
                                        className="w-full bg-green-500 rounded-t"
                                        style={{ height: `${Math.max((data.received / 10000) * 100, 10)}px` }}
                                    />
                                    <div
                                        className="w-full bg-yellow-500 rounded-b"
                                        style={{ height: `${Math.max((data.pending / 10000) * 50, 5)}px` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{data.month}</span>
                            </div>
                        )) || (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    Dados não disponíveis
                                </div>
                            )}
                    </div>
                    <div className="flex items-center gap-6 mt-4 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Recebido</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Pendente</span>
                        </div>
                    </div>
                </div>

                {/* Payments List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'pending'
                                        ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Pendentes ({dashboard?.pendingPayments?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('overdue')}
                                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'overdue'
                                        ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Atrasados ({dashboard?.overduePayments?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'recent'
                                        ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Recentes
                            </button>
                        </div>
                    </div>

                    {/* Payment Items */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentPayments?.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                Nenhum pagamento encontrado
                            </div>
                        ) : (
                            currentPayments?.map((payment) => (
                                <div key={payment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {payment.order?.displayId} - {payment.order?.productName}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {payment.order?.brand?.tradeName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(payment.amount)}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Vence: {formatDate(payment.dueDate)}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[payment.status].bg} ${STATUS_CONFIG[payment.status].color}`}>
                                                {STATUS_CONFIG[payment.status].label}
                                            </span>
                                            {payment.status !== 'PAGO' && (
                                                <button
                                                    onClick={() => handleMarkAsPaid(payment.id)}
                                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                    title="Marcar como pago"
                                                >
                                                    <CheckCircle className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FinancialDashboardPage;
