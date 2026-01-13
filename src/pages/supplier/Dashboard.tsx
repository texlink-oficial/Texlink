import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { suppliersService, SupplierDashboard as DashboardData } from '../../services';
import {
    Package, DollarSign, TrendingUp, Clock, Star,
    Factory, ChevronRight, Bell, Settings, LogOut
} from 'lucide-react';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const data = await suppliersService.getDashboard();
                setDashboard(data);
            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboard();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const stats = dashboard?.stats || {
        pendingOrders: 0,
        activeOrders: 0,
        completedOrdersThisMonth: 0,
        totalRevenue: 0,
        capacityUsage: 0,
    };

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Factory className="w-8 h-8 text-brand-500" />
                            <div>
                                <h1 className="text-xl font-bold text-white">
                                    {dashboard?.company?.tradeName || 'Minha Facção'}
                                </h1>
                                <p className="text-sm text-brand-400">Portal da Facção</p>
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
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Olá, {user?.name}! 👋
                    </h2>
                    <p className="text-brand-400">
                        Acompanhe seus pedidos e oportunidades
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Pedidos Pendentes"
                        value={stats.pendingOrders}
                        icon={Clock}
                        color="amber"
                    />
                    <StatCard
                        title="Em Produção"
                        value={stats.activeOrders}
                        icon={Package}
                        color="blue"
                    />
                    <StatCard
                        title="Finalizados (Mês)"
                        value={stats.completedOrdersThisMonth}
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatCard
                        title="Receita Total"
                        value={new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        }).format(Number(stats.totalRevenue))}
                        icon={DollarSign}
                        color="purple"
                        isMonetary
                    />
                </div>

                {/* Capacity Usage */}
                <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Capacidade de Produção</h3>
                        <span className="text-2xl font-bold text-brand-400">{stats.capacityUsage}%</span>
                    </div>
                    <div className="h-3 bg-brand-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${stats.capacityUsage > 80 ? 'bg-red-500' :
                                stats.capacityUsage > 50 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${stats.capacityUsage}%` }}
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <QuickActionCard
                        title="Novas Oportunidades"
                        description="Veja pedidos disponíveis para aceitar"
                        href="/supplier/opportunities"
                    />
                    <QuickActionCard
                        title="Meus Pedidos"
                        description="Acompanhe o status dos seus pedidos"
                        href="/supplier/orders"
                    />
                </div>
            </main>
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.FC<{ className?: string }>;
    color: 'amber' | 'blue' | 'green' | 'purple';
    isMonetary?: boolean;
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
                <Star className="w-4 h-4 opacity-50" />
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

export default Dashboard;
