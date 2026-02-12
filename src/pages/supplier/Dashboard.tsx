import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { suppliersService, SupplierDashboard as DashboardData } from '../../services';
import { DashboardHero, getGreeting, StatCardPremium } from '../../components/dashboard';
import {
    Package, DollarSign, TrendingUp, Clock,
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

    const firstName = user?.name?.split(' ')[0] || 'Usuário';

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-500/30 blur-lg rounded-full animate-pulse-glow" />
                                <div className="relative w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                    <Factory className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">
                                    {dashboard?.company?.tradeName || 'Minha Facção'}
                                </h1>
                                <p className="text-sm text-brand-400">Portal da Facção</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2 text-brand-400 hover:text-white transition-colors rounded-lg hover:bg-brand-800/50">
                                <Bell className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-brand-400 hover:text-white transition-colors rounded-lg hover:bg-brand-800/50">
                                <Settings className="w-5 h-5" />
                            </button>
                            <button
                                onClick={logout}
                                className="p-2 text-brand-400 hover:text-red-400 transition-colors rounded-lg hover:bg-brand-800/50"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-br from-brand-900/80 via-brand-800/50 to-purple-900/30 border border-brand-800/50">
                    {/* Decorative elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl animate-float" />
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

                    {/* Grid pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.05]"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                            backgroundSize: '24px 24px'
                        }}
                    />

                    <div className="relative z-10 p-6 lg:p-8">
                        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                            {getGreeting()}, {firstName}
                        </h2>
                        <p className="text-brand-300">
                            Acompanhe seus pedidos e oportunidades
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="animate-stagger-fade stagger-1">
                        <StatCardPremium
                            icon={<Clock className="h-6 w-6" />}
                            label="Pedidos Pendentes"
                            value={stats.pendingOrders}
                            color="amber"
                        />
                    </div>
                    <div className="animate-stagger-fade stagger-2">
                        <StatCardPremium
                            icon={<Package className="h-6 w-6" />}
                            label="Em Produção"
                            value={stats.activeOrders}
                            color="blue"
                        />
                    </div>
                    <div className="animate-stagger-fade stagger-3">
                        <StatCardPremium
                            icon={<TrendingUp className="h-6 w-6" />}
                            label="Finalizados (Mês)"
                            value={stats.completedOrdersThisMonth}
                            color="green"
                            trend={12}
                        />
                    </div>
                    <div className="animate-stagger-fade stagger-4">
                        <StatCardPremium
                            icon={<DollarSign className="h-6 w-6" />}
                            label="Receita Total"
                            value={Number(stats.totalRevenue)}
                            prefix="R$ "
                            decimals={0}
                            color="purple"
                        />
                    </div>
                </div>

                {/* Capacity Usage */}
                <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6 mb-8 backdrop-blur-sm animate-stagger-fade stagger-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Capacidade de Produção</h3>
                        <span className="text-2xl font-bold text-gradient">{stats.capacityUsage}%</span>
                    </div>
                    <div className="h-3 bg-brand-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                                stats.capacityUsage > 80
                                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                                    : stats.capacityUsage > 50
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                        : 'bg-gradient-to-r from-green-500 to-green-400'
                            }`}
                            style={{ width: `${stats.capacityUsage}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-brand-400">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
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

interface QuickActionCardProps {
    title: string;
    description: string;
    href: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, href }) => {
    return (
        <Link
            to={href}
            className="group bg-brand-900/50 hover:bg-brand-800/50 rounded-2xl border border-brand-800 hover:border-brand-700 p-6 transition-all duration-300 flex items-center justify-between hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)]"
        >
            <div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-300 transition-colors">{title}</h3>
                <p className="text-brand-400 text-sm">{description}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-brand-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>
    );
};

export default Dashboard;
