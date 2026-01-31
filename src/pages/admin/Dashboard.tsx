import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminService, AdminDashboard as DashboardData } from '../../services';
import {
    Package, DollarSign, Factory, Building2, Users,
    TrendingUp, Clock, CheckCircle, AlertCircle,
    ChevronRight, Settings, Bell, LogOut, Shield, Gift, GraduationCap
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const data = await adminService.getDashboard();
            setDashboard(data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const metrics = dashboard?.metrics || {
        totalOrders: 0, activeOrders: 0, completedOrders: 0,
        totalSuppliers: 0, activeSuppliers: 0, pendingSuppliers: 0,
        totalBrands: 0, totalRevenue: 0,
    };

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Shield className="w-8 h-8 text-brand-500" />
                            <div>
                                <h1 className="text-xl font-bold text-white">Admin TEXLINK</h1>
                                <p className="text-sm text-brand-400">Painel Administrativo</p>
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
                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Olá, {user?.name}! 👋</h2>
                    <p className="text-brand-400">Visão geral da plataforma</p>
                </div>

                {/* Primary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Receita Total"
                        value={formatCurrency(metrics.totalRevenue)}
                        icon={DollarSign}
                        color="green"
                        trend="+12%"
                    />
                    <StatCard
                        title="Pedidos Ativos"
                        value={metrics.activeOrders}
                        icon={Package}
                        color="blue"
                    />
                    <StatCard
                        title="Facções Ativas"
                        value={metrics.activeSuppliers}
                        icon={Factory}
                        color="purple"
                    />
                    <StatCard
                        title="Marcas"
                        value={metrics.totalBrands}
                        icon={Building2}
                        color="amber"
                    />
                </div>

                {/* Secondary Stats + Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Pending Approvals Alert */}
                    {metrics.pendingSuppliers > 0 && (
                        <Link
                            to="/admin/approvals"
                            className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 hover:from-amber-500/30 hover:to-orange-500/20 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">{metrics.pendingSuppliers} Aprovações Pendentes</p>
                                        <p className="text-amber-400/70 text-sm">Facções aguardando aprovação</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    )}

                    {/* Orders Summary */}
                    <div className="bg-brand-900/50 border border-brand-800 rounded-2xl p-6">
                        <h3 className="text-white font-semibold mb-4">Pedidos</h3>
                        <div className="space-y-3">
                            <StatRow label="Total" value={metrics.totalOrders} />
                            <StatRow label="Em andamento" value={metrics.activeOrders} color="blue" />
                            <StatRow label="Finalizados" value={metrics.completedOrders} color="green" />
                        </div>
                    </div>

                    {/* Suppliers Summary */}
                    <div className="bg-brand-900/50 border border-brand-800 rounded-2xl p-6">
                        <h3 className="text-white font-semibold mb-4">Facções</h3>
                        <div className="space-y-3">
                            <StatRow label="Total" value={metrics.totalSuppliers} />
                            <StatRow label="Ativas" value={metrics.activeSuppliers} color="green" />
                            <StatRow label="Pendentes" value={metrics.pendingSuppliers} color="amber" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <QuickAction
                        title="Gerenciar Facções"
                        description="Ver todas as facções cadastradas"
                        href="/admin/suppliers"
                        icon={Factory}
                    />
                    <QuickAction
                        title="Pool de Facções"
                        description="Gerenciar relacionamentos N:M"
                        href="/admin/suppliers-pool"
                        icon={Users}
                    />
                    <QuickAction
                        title="Gerenciar Marcas"
                        description="Ver todas as marcas cadastradas"
                        href="/admin/brands"
                        icon={Building2}
                    />
                    <QuickAction
                        title="Todos os Pedidos"
                        description="Ver histórico de pedidos"
                        href="/admin/orders"
                        icon={Package}
                    />
                    <QuickAction
                        title="Gerenciar Parceiros"
                        description="Benefícios e parcerias"
                        href="/admin/partners"
                        icon={Gift}
                    />
                    <QuickAction
                        title="Conteúdo Educacional"
                        description="Gerenciar Texlink Educa"
                        href="/admin/educational-content"
                        icon={GraduationCap}
                    />
                </div>

                {/* Recent Orders */}
                {dashboard?.recentOrders && dashboard.recentOrders.length > 0 && (
                    <div className="bg-brand-900/50 border border-brand-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold">Pedidos Recentes</h3>
                            <Link to="/admin/orders" className="text-brand-400 hover:text-white text-sm flex items-center gap-1">
                                Ver todos <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {dashboard.recentOrders.slice(0, 5).map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-3 bg-brand-800/50 rounded-xl"
                                >
                                    <div>
                                        <p className="text-white font-medium">{order.displayId}</p>
                                        <p className="text-sm text-brand-400">
                                            {order.brand?.tradeName} → {order.supplier?.tradeName || 'Aguardando'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-brand-300">{formatCurrency(Number(order.totalValue))}</p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// Helper Components
interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.FC<{ className?: string }>;
    color: 'green' | 'blue' | 'purple' | 'amber';
    trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
    const colors = {
        green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
        amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl border p-6`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className="w-6 h-6" />
                {trend && <span className="text-xs font-medium text-green-400">{trend}</span>}
            </div>
            <p className="text-sm text-brand-300 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

const StatRow: React.FC<{ label: string; value: number; color?: 'blue' | 'green' | 'amber' }> = ({ label, value, color }) => {
    const dotColor = color === 'blue' ? 'bg-blue-400' : color === 'green' ? 'bg-green-400' : color === 'amber' ? 'bg-amber-400' : 'bg-brand-400';

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-brand-300 text-sm">{label}</span>
            </div>
            <span className="text-white font-medium">{value}</span>
        </div>
    );
};

interface QuickActionProps {
    title: string;
    description: string;
    href: string;
    icon: React.FC<{ className?: string }>;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, href, icon: Icon }) => (
    <Link
        to={href}
        className="group bg-brand-900/50 hover:bg-brand-800/50 border border-brand-800 rounded-2xl p-6 transition-all flex items-center justify-between"
    >
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-800 rounded-xl flex items-center justify-center group-hover:bg-brand-700 transition-colors">
                <Icon className="w-6 h-6 text-brand-400" />
            </div>
            <div>
                <h3 className="text-white font-medium">{title}</h3>
                <p className="text-brand-400 text-sm">{description}</p>
            </div>
        </div>
        <ChevronRight className="w-5 h-5 text-brand-400 group-hover:translate-x-1 transition-transform" />
    </Link>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'text-amber-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'text-blue-400' },
        EM_PRODUCAO: { label: 'Produção', color: 'text-purple-400' },
        FINALIZADO: { label: 'Finalizado', color: 'text-green-400' },
    };
    const c = config[status] || { label: status, color: 'text-gray-400' };
    return <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default AdminDashboard;
