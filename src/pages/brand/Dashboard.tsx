import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService, Order } from '../../services';
import {
    Package, DollarSign, ShoppingBag, Clock,
    Building2, ChevronRight, Bell, Settings, LogOut, Plus
} from 'lucide-react';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await ordersService.getBrandOrders();
                setOrders(data);
            } catch (error) {
                console.error('Error loading orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadOrders();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const stats = {
        totalOrders: orders.length,
        activeOrders: orders.filter(o => !['FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(o.status)).length,
        completedOrders: orders.filter(o => o.status === 'FINALIZADO').length,
        totalSpent: orders
            .filter(o => o.status === 'FINALIZADO')
            .reduce((sum, o) => sum + Number(o.totalValue), 0),
    };

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Building2 className="w-8 h-8 text-brand-500" />
                            <div>
                                <h1 className="text-xl font-bold text-white">Portal da Marca</h1>
                                <p className="text-sm text-brand-400">Gerencie seus pedidos</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2 text-brand-400 hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-brand-400 hover:text-white transition-colors">
                                <Settings className="w-5 h-5" />
                            </button>
                            <button
                                onClick={logout}
                                className="p-2 text-brand-400 hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Olá, {user?.name}! 👋
                        </h2>
                        <p className="text-brand-400">
                            Gerencie seus pedidos e encontre facções
                        </p>
                    </div>
                    <Link
                        to="/brand/orders/new"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-xl transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Pedido
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total de Pedidos"
                        value={stats.totalOrders}
                        icon={Package}
                        color="blue"
                    />
                    <StatCard
                        title="Em Andamento"
                        value={stats.activeOrders}
                        icon={Clock}
                        color="amber"
                    />
                    <StatCard
                        title="Finalizados"
                        value={stats.completedOrders}
                        icon={ShoppingBag}
                        color="green"
                    />
                    <StatCard
                        title="Investimento Total"
                        value={new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        }).format(stats.totalSpent)}
                        icon={DollarSign}
                        color="purple"
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <QuickActionCard
                        title="Buscar Facções"
                        description="Encontre facções para seus projetos"
                        href="/brand/suppliers"
                    />
                    <QuickActionCard
                        title="Meus Pedidos"
                        description="Acompanhe o status dos seus pedidos"
                        href="/brand/orders"
                    />
                </div>

                {/* Recent Orders */}
                {orders.length > 0 && (
                    <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Pedidos Recentes</h3>
                        <div className="space-y-3">
                            {orders.slice(0, 5).map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/brand/orders/${order.id}`}
                                    className="flex items-center justify-between p-4 bg-brand-800/50 rounded-xl hover:bg-brand-800 transition-all"
                                >
                                    <div>
                                        <p className="text-white font-medium">{order.displayId}</p>
                                        <p className="text-sm text-brand-400">{order.productName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-brand-300 text-sm">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.totalValue))}
                                        </p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.FC<{ className?: string }>;
    color: 'amber' | 'blue' | 'green' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
        green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border p-6`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-brand-300 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

interface QuickActionCardProps {
    title: string;
    description: string;
    href: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, href }) => {
    return (
        <Link
            to={href}
            className="group bg-brand-900/50 hover:bg-brand-800/50 rounded-2xl border border-brand-800 p-6 transition-all flex items-center justify-between"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                <p className="text-brand-400 text-sm">{description}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-brand-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-500/20 text-amber-400' },
        DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'bg-amber-500/20 text-amber-400' },
        RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'bg-red-500/20 text-red-400' },
        EM_NEGOCIACAO: { label: 'Em Negociação', color: 'bg-indigo-500/20 text-indigo-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-500/20 text-blue-400' },
        EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'bg-blue-500/20 text-blue-400' },
        EM_TRANSITO_PARA_FACCAO: { label: 'Trânsito', color: 'bg-cyan-500/20 text-cyan-400' },
        EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Preparação', color: 'bg-teal-500/20 text-teal-400' },
        EM_PRODUCAO: { label: 'Em Produção', color: 'bg-purple-500/20 text-purple-400' },
        PRONTO: { label: 'Pronto', color: 'bg-cyan-500/20 text-cyan-400' },
        EM_TRANSITO_PARA_MARCA: { label: 'Trânsito', color: 'bg-sky-500/20 text-sky-400' },
        EM_REVISAO: { label: 'Em Revisão', color: 'bg-orange-500/20 text-orange-400' },
        PARCIALMENTE_APROVADO: { label: 'Parcial', color: 'bg-yellow-500/20 text-yellow-400' },
        REPROVADO: { label: 'Reprovado', color: 'bg-red-500/20 text-red-400' },
        AGUARDANDO_RETRABALHO: { label: 'Retrabalho', color: 'bg-orange-500/20 text-orange-400' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-500/20 text-green-400' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-400' };

    return (
        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
};

export default Dashboard;
