import React, { useEffect, useState } from 'react';
import { ordersService, Order } from '../../services';
import {
    BarChart3, Loader2, Package, DollarSign, Factory,
    TrendingUp, Calendar, Download, CheckCircle
} from 'lucide-react';

const ReportsPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getBrandOrders();
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate stats
    const stats = {
        totalOrders: orders.length,
        totalValue: orders.reduce((sum, o) => sum + Number(o.totalValue), 0),
        avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + Number(o.totalValue), 0) / orders.length : 0,
        finalized: orders.filter(o => o.status === 'FINALIZADO').length,
        pending: orders.filter(o => o.status !== 'FINALIZADO').length,
    };

    // Orders by month
    const ordersByMonth = orders.reduce((acc, order) => {
        const month = new Date(order.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Top suppliers
    interface SupplierStat {
        count: number;
        value: number;
    }

    const supplierStats = orders.reduce((acc, order) => {
        if (!order.supplier) return acc;
        const name = order.supplier.tradeName;
        if (!acc[name]) {
            acc[name] = { count: 0, value: 0 };
        }
        acc[name].count++;
        acc[name].value += Number(order.totalValue);
        return acc;
    }, {} as Record<string, SupplierStat>);

    const topSuppliers = (Object.entries(supplierStats) as [string, SupplierStat][])
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 5);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
                    <p className="text-gray-500 dark:text-gray-400">Análise dos seus pedidos e gastos</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors">
                    <Download className="w-4 h-4" />
                    Exportar
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Package className="h-6 w-6" />}
                    label="Total de Pedidos"
                    value={stats.totalOrders}
                    color="brand"
                />
                <StatCard
                    icon={<DollarSign className="h-6 w-6" />}
                    label="Valor Total"
                    value={formatCurrency(stats.totalValue)}
                    color="green"
                />
                <StatCard
                    icon={<TrendingUp className="h-6 w-6" />}
                    label="Ticket Médio"
                    value={formatCurrency(stats.avgOrderValue)}
                    color="purple"
                />
                <StatCard
                    icon={<Factory className="h-6 w-6" />}
                    label="Facções Utilizadas"
                    value={Object.keys(supplierStats).length}
                    color="blue"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders by Month */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        Pedidos por Mês
                    </h2>
                    {Object.keys(ordersByMonth).length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados</p>
                    ) : (
                        <div className="space-y-3">
                            {(Object.entries(ordersByMonth) as [string, number][]).slice(-6).map(([month, count]) => (
                                <div key={month} className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16">{month}</span>
                                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                                            style={{ width: `${(count / Math.max(...(Object.values(ordersByMonth) as number[]))) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Suppliers */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Factory className="w-5 h-5 text-gray-400" />
                        Top Facções
                    </h2>
                    {topSuppliers.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados</p>
                    ) : (
                        <div className="space-y-3">
                            {topSuppliers.map(([name, data], index) => (
                                <div key={name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-amber-500' :
                                            index === 1 ? 'bg-gray-400' :
                                                index === 2 ? 'bg-orange-600' :
                                                    'bg-gray-300'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {data.count} pedido{data.count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <span className="font-semibold text-brand-600 dark:text-brand-400">
                                        {formatCurrency(data.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                    Distribuição por Status
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatusStat
                        label="Finalizados"
                        count={stats.finalized}
                        total={stats.totalOrders}
                        color="green"
                    />
                    <StatusStat
                        label="Em Produção"
                        count={orders.filter(o => o.status === 'EM_PRODUCAO').length}
                        total={stats.totalOrders}
                        color="purple"
                    />
                    <StatusStat
                        label="Aguardando"
                        count={orders.filter(o => o.status === 'LANCADO_PELA_MARCA').length}
                        total={stats.totalOrders}
                        color="amber"
                    />
                    <StatusStat
                        label="Em Trânsito"
                        count={orders.filter(o => o.status.includes('TRANSITO')).length}
                        total={stats.totalOrders}
                        color="blue"
                    />
                </div>
            </div>

            {/* Quality Metrics - NEW */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-400" />
                    Métricas de Qualidade
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-400 mb-1">Taxa de Aprovação</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                            {stats.totalOrders > 0
                                ? Math.round((stats.finalized / stats.totalOrders) * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            Aprovados na 1ª revisão
                        </p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Retrabalhos</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                            {orders.filter(o => o.status === 'AGUARDANDO_RETRABALHO' || o.status === 'REPROVADO').length}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                            Pedidos com retrabalho
                        </p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">2ª Qualidade</p>
                        <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                            {orders.reduce((sum, o) => sum + (o.secondQualityCount || 0), 0)}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                            Peças com defeito menor
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Em Revisão</p>
                        <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                            {orders.filter(o => o.status === 'EM_REVISAO' || o.status === 'PARCIALMENTE_APROVADO').length}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                            Aguardando avaliação
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'brand' | 'green' | 'purple' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    const colorClasses = {
        brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
};

const StatusStat: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const colorClasses: Record<string, string> = {
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500',
        blue: 'bg-blue-500',
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClasses[color]} rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs text-gray-400 mt-1">{percentage}%</p>
        </div>
    );
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default ReportsPage;
