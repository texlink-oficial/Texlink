import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService, Order, MonthlyStats } from '../../services';
import { brandOnboardingService, BrandProfile } from '../../services/brandOnboarding.service';
import {
    DashboardShell,
    HeroMetrics,
    MetricCard,
    ChartCard,
    AreaChartRevenue,
    DonutChartStatus,
    RecentOrdersTable,
    QuickActionsGrid,
    getGreeting,
    DashboardFooter,
} from '../../components/dashboard';
import type { OrderTableItem, QuickActionItem } from '../../components/dashboard';
import {
    Package, DollarSign, Factory, Clock, Users,
    TrendingUp, Loader2, AlertCircle,
    CheckCircle, CheckCircle2, Truck, Plus, FileText, ArrowRight
} from 'lucide-react';

const BrandDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
    const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [ordersData, statsData, profileData] = await Promise.all([
                ordersService.getBrandOrders(),
                ordersService.getMonthlyStatsBrand(6).catch(() => null),
                brandOnboardingService.getProfile().catch(() => null),
            ]);
            setOrders(ordersData);
            setMonthlyStats(statsData);
            setBrandProfile(profileData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate stats
    const stats = useMemo(() => ({
        total: orders.length,
        emProducao: orders.filter(o => ['EM_PRODUCAO', 'EM_PREPARACAO_ENTRADA_FACCAO'].includes(o.status)).length,
        aguardando: orders.filter(o => ['LANCADO_PELA_MARCA', 'ACEITO_PELA_FACCAO'].includes(o.status)).length,
        finalizados: orders.filter(o => o.status === 'FINALIZADO').length,
        emTransito: orders.filter(o => ['EM_TRANSITO_PARA_FACCAO', 'EM_TRANSITO_PARA_MARCA'].includes(o.status)).length,
        valorTotal: orders.reduce((sum, o) => sum + Number(o.totalValue), 0),
    }), [orders]);

    const pendingAlerts = useMemo(() => orders.filter(o => {
        const deadline = new Date(o.deliveryDeadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7 && daysUntil > 0 && o.status !== 'FINALIZADO';
    }), [orders]);

    // Transform orders for the table
    const recentOrdersForTable: OrderTableItem[] = useMemo(() => {
        const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
            LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'warning' },
            DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'warning' },
            RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'error' },
            EM_NEGOCIACAO: { label: 'Em Negociação', color: 'info' },
            ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'info' },
            EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'info' },
            EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Preparação', color: 'info' },
            EM_PRODUCAO: { label: 'Produção', color: 'info' },
            PRONTO: { label: 'Pronto', color: 'success' },
            EM_TRANSITO_PARA_FACCAO: { label: 'Trânsito', color: 'info' },
            EM_TRANSITO_PARA_MARCA: { label: 'Trânsito', color: 'info' },
            EM_REVISAO: { label: 'Em Revisão', color: 'warning' },
            PARCIALMENTE_APROVADO: { label: 'Parcial', color: 'warning' },
            REPROVADO: { label: 'Reprovado', color: 'error' },
            AGUARDANDO_RETRABALHO: { label: 'Retrabalho', color: 'warning' },
            FINALIZADO: { label: 'Finalizado', color: 'success' },
        };

        return orders.slice(0, 5).map(order => {
            const deadline = new Date(order.deliveryDeadline);
            const now = new Date();
            const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const config = statusConfig[order.status] || { label: order.status, color: 'neutral' as const };

            return {
                id: order.id,
                displayId: order.displayId,
                productName: order.productName,
                status: order.status,
                statusLabel: config.label,
                statusColor: config.color,
                value: Number(order.totalValue),
                daysUntilDeadline: daysUntil,
            };
        });
    }, [orders]);

    // Memoized chart data from real API
    const revenueData = useMemo(() => {
        if (monthlyStats?.monthly && monthlyStats.monthly.length > 0) {
            return monthlyStats.monthly.map((item) => ({
                name: item.month,
                value: item.revenue,
                previousValue: item.previousRevenue || 0,
            }));
        }
        // Return empty array if no data
        return [];
    }, [monthlyStats]);

    const statusChartData = useMemo(() => [
        { name: 'Em Produção', value: stats.emProducao, color: '#8b5cf6' },
        { name: 'Aguardando', value: stats.aguardando, color: '#f59e0b' },
        { name: 'Em Trânsito', value: stats.emTransito, color: '#3b82f6' },
        { name: 'Finalizados', value: stats.finalizados, color: '#10b981' },
    ], [stats.emProducao, stats.aguardando, stats.emTransito, stats.finalizados]);

    const generateSparklineData = (baseValue: number, variance = 0.3) => {
        return Array.from({ length: 7 }, () =>
            Math.max(0, baseValue * (1 + (Math.random() - 0.5) * variance))
        );
    };

    // Quick actions
    const quickActions: QuickActionItem[] = [
        {
            id: 'new-order',
            label: 'Novo Pedido',
            description: 'Criar novo pedido',
            icon: <Plus className="h-6 w-6" />,
            href: '/brand/pedidos/novo',
            color: 'brand',
        },
        {
            id: 'suppliers',
            label: 'Buscar Facções de Costura',
            description: 'Encontrar fornecedores',
            icon: <Factory className="h-6 w-6" />,
            href: '/brand/fornecedores',
            color: 'purple',
        },
        {
            id: 'messages',
            label: 'Mensagens',
            description: 'Comunicação com facções de costura',
            icon: <Users className="h-6 w-6" />,
            href: '/brand/mensagens',
            color: 'blue',
        },
        {
            id: 'reports',
            label: 'Relatórios',
            description: 'Análises e exportações',
            icon: <FileText className="h-6 w-6" />,
            href: '/brand/relatorios',
            color: 'green',
        },
    ];

    if (isLoading) {
        return (
            <DashboardShell>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                </div>
            </DashboardShell>
        );
    }

    const firstName = user?.name?.split(' ')[0] || 'Marca';
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return (
        <DashboardShell>
            {/* Hero Section with Metrics */}
            <HeroMetrics
                greeting={`${getGreeting()}, ${firstName}`}
                subtitle="Aqui está o resumo dos seus pedidos"
                action={
                    <Link
                        to="/brand/pedidos/novo"
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5"
                    >
                        <Plus className="h-5 w-5" />
                        Novo Pedido
                    </Link>
                }
            >
                <MetricCard
                    icon={<Package className="h-6 w-6" />}
                    label="Total de Pedidos"
                    value={stats.total}
                    color="brand"
                    sparklineData={generateSparklineData(stats.total)}
                    onClick={() => navigate('/brand/pedidos')}
                />
                <MetricCard
                    icon={<Clock className="h-6 w-6" />}
                    label="Aguardando Aceite"
                    value={stats.aguardando}
                    color="amber"
                    sparklineData={generateSparklineData(stats.aguardando)}
                />
                <MetricCard
                    icon={<Factory className="h-6 w-6" />}
                    label="Em Produção"
                    value={stats.emProducao}
                    color="purple"
                    sparklineData={generateSparklineData(stats.emProducao)}
                />
                <MetricCard
                    icon={<CheckCircle className="h-6 w-6" />}
                    label="Finalizados"
                    value={stats.finalizados}
                    trend={8}
                    color="green"
                    sparklineData={generateSparklineData(stats.finalizados)}
                />
            </HeroMetrics>

            {/* Quick Actions */}
            <QuickActionsGrid
                title="Ações Rápidas"
                actions={quickActions}
                columns={4}
            />

            {/* Onboarding Progress Card */}
            {brandProfile && !brandProfile.onboardingComplete && (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white dashboard-section">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-orange-300/20 rounded-full blur-2xl" />

                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">Complete seu cadastro</h3>
                            <p className="text-amber-100 text-sm mb-4">
                                Finalize as etapas para começar a criar pedidos na plataforma.
                            </p>
                            <div className="flex items-center gap-3 mb-4">
                                {[1, 2].map((step) => (
                                    <div key={step} className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step < (brandProfile.onboardingPhase || 1) + 1
                                                ? 'bg-white text-amber-600 shadow-lg shadow-amber-600/20'
                                                : step === (brandProfile.onboardingPhase || 1) + 1
                                                    ? 'bg-white/30 text-white ring-2 ring-white'
                                                    : 'bg-white/20 text-white/60'
                                                }`}
                                        >
                                            {step < (brandProfile.onboardingPhase || 1) + 1 ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <span className="text-sm font-bold">{step}</span>
                                            )}
                                        </div>
                                        {step < 2 && (
                                            <div className={`w-8 h-0.5 transition-all ${step < (brandProfile.onboardingPhase || 1) + 1 ? 'bg-white' : 'bg-white/30'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    to="/brand-onboarding"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-600/20"
                                >
                                    Continuar cadastro
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={async () => {
                                        try {
                                            await brandOnboardingService.completeOnboarding();
                                            setBrandProfile(prev => prev ? { ...prev, onboardingComplete: true } : null);
                                        } catch (e) {
                                            console.error('Error completing onboarding:', e);
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Já completei
                                </button>
                            </div>
                        </div>
                        <div className="text-amber-200 text-5xl font-bold opacity-30">
                            {brandProfile.onboardingPhase || 1}/2
                        </div>
                    </div>
                </div>
            )}

            {/* Value Summary Card */}
            <div className="relative overflow-hidden bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl p-6 text-white dashboard-section">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-sky-100 text-sm font-medium">Valor Total em Pedidos</p>
                        <p className="text-3xl lg:text-4xl font-bold mt-1 tabular-nums">
                            {formatCurrency(stats.valorTotal)}
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold tabular-nums">{stats.emTransito}</p>
                            <p className="text-xs text-sky-100">Em Trânsito</p>
                        </div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Truck className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard
                    title="Investimento Mensal"
                    subtitle="Últimos 6 meses"
                    showPeriodSelector={false}
                >
                    <AreaChartRevenue
                        data={revenueData}
                        showComparison={true}
                        color="#0ea5e9"
                        comparisonColor="#8b5cf6"
                    />
                </ChartCard>

                <ChartCard
                    title="Status dos Pedidos"
                    subtitle="Distribuição atual"
                    showPeriodSelector={false}
                    minHeight="320px"
                >
                    <DonutChartStatus
                        data={statusChartData}
                        centerValue={stats.total}
                        centerLabel="Pedidos"
                    />
                </ChartCard>
            </div>

            {/* Recent Orders and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentOrdersTable
                    orders={recentOrdersForTable}
                    linkBase="/brand/pedidos"
                    viewAllLink="/brand/pedidos"
                    emptyMessage="Nenhum pedido encontrado"
                />

                {/* Alerts Card */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden dashboard-section">
                    <div className="flex items-center gap-3 p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
                        <div className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            Alertas
                        </h3>
                    </div>

                    <div className="p-4 lg:p-6">
                        {pendingAlerts.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Nenhum alerta no momento
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingAlerts.slice(0, 4).map((order) => {
                                    const deadline = new Date(order.deliveryDeadline);
                                    const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <Link
                                            key={order.id}
                                            to={`/brand/pedidos/${order.id}`}
                                            className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-amber-200 dark:bg-amber-500/30 rounded-lg flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 truncate">
                                                    {order.displayId} - Entrega em {daysUntil} dias
                                                </p>
                                                <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
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
            </div>

            {/* Footer */}
            <DashboardFooter variant="brand" />
        </DashboardShell>
    );
};

export default BrandDashboard;
