import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService, Order } from '../../services';
import {
    Package, DollarSign, Factory, Clock,
    TrendingUp, ArrowRight, Loader2, AlertCircle,
    CheckCircle, Truck, Plus
} from 'lucide-react';

const BrandDashboard: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getBrandOrders();
            setOrders(data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate stats
    const stats = {
        total: orders.length,
        emProducao: orders.filter(o => ['EM_PRODUCAO', 'EM_PREPARACAO_ENTRADA_FACCAO'].includes(o.status)).length,
        aguardando: orders.filter(o => ['LANCADO_PELA_MARCA', 'ACEITO_PELA_FACCAO'].includes(o.status)).length,
        finalizados: orders.filter(o => o.status === 'FINALIZADO').length,
        emTransito: orders.filter(o => ['EM_TRANSITO_PARA_FACCAO', 'EM_TRANSITO_PARA_MARCA'].includes(o.status)).length,
        valorTotal: orders.reduce((sum, o) => sum + Number(o.totalValue), 0),
    };

    const recentOrders = orders.slice(0, 5);

    const pendingAlerts = orders.filter(o => {
        const deadline = new Date(o.deliveryDeadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7 && daysUntil > 0 && o.status !== 'FINALIZADO';
    });

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Olá, {user?.name?.split(' ')[0] || 'Marca'}! 👋
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Aqui está o resumo dos seus pedidos
                    </p>
                </div>
                <Link
                    to="/brand/pedidos/novo"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-xl transition-all shadow-sm"
                >
                    <Plus className="h-5 w-5" />
                    Novo Pedido
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Package className="h-6 w-6" />}
                    label="Total de Pedidos"
                    value={stats.total}
                    color="brand"
                />
                <StatCard
                    icon={<Clock className="h-6 w-6" />}
                    label="Aguardando Aceite"
                    value={stats.aguardando}
                    color="amber"
                />
                <StatCard
                    icon={<Factory className="h-6 w-6" />}
                    label="Em Produção"
                    value={stats.emProducao}
                    color="purple"
                />
                <StatCard
                    icon={<CheckCircle className="h-6 w-6" />}
                    label="Finalizados"
                    value={stats.finalizados}
                    color="green"
                />
            </div>

            {/* Value Summary */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-brand-100 text-sm">Valor Total em Pedidos</p>
                        <p className="text-3xl font-bold mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.valorTotal)}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{stats.emTransito}</p>
                            <p className="text-xs text-brand-100">Em Trânsito</p>
                        </div>
                        <Truck className="h-10 w-10 text-brand-200" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Pedidos Recentes
                        </h2>
                        <Link
                            to="/brand/pedidos"
                            className="text-sm text-brand-600 hover:text-brand-500 flex items-center gap-1"
                        >
                            Ver todos <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {recentOrders.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                            Nenhum pedido encontrado
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/brand/pedidos/${order.id}`}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                                            <Package className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                {order.displayId}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {order.productName}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={order.status} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alerts */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Alertas
                        </h2>
                    </div>
                    {pendingAlerts.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">
                                Nenhum alerta no momento
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingAlerts.map((order) => {
                                const deadline = new Date(order.deliveryDeadline);
                                const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <Link
                                        key={order.id}
                                        to={`/brand/pedidos/${order.id}`}
                                        className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                                    >
                                        <Clock className="h-5 w-5 text-amber-600" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                {order.displayId} - Entrega em {daysUntil} dias
                                            </p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                                {order.productName}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickAction
                    to="/brand/pedidos/novo"
                    icon={<Plus className="h-5 w-5" />}
                    label="Novo Pedido"
                />
                <QuickAction
                    to="/brand/faccoes"
                    icon={<Factory className="h-5 w-5" />}
                    label="Buscar Facções"
                />
                <QuickAction
                    to="/brand/mensagens"
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Mensagens"
                />
                <QuickAction
                    to="/brand/relatorios"
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Relatórios"
                />
            </div>
        </div>
    );
};

// Helper Components
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'brand' | 'amber' | 'green' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    const colorClasses = {
        brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        EM_PRODUCAO: { label: 'Produção', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        PRONTO: { label: 'Pronto', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
        EM_TRANSITO_PARA_MARCA: { label: 'Trânsito', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    };

    const { label, color } = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${color}`}>
            {label}
        </span>
    );
};

const QuickAction: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
    <Link
        to={to}
        className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition-all"
    >
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400">
            {icon}
        </div>
        <span className="font-medium text-gray-900 dark:text-white text-sm">{label}</span>
    </Link>
);

export default BrandDashboard;
