import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminService, AdminDashboard as DashboardData, RevenueHistoryItem } from '../../services';
import { NotificationBell } from '../../components/notifications';
import {
    DashboardHero,
    HeroMetrics,
    MetricCard,
    ChartCard,
    AreaChartRevenue,
    DonutChartStatus,
    RecentOrdersTable,
    QuickActionsGrid,
    getGreeting,
} from '../../components/dashboard';
import type { OrderTableItem, QuickActionItem } from '../../components/dashboard';
import {
    Package, DollarSign, Factory, Building2, Users,
    Clock, CheckCircle, AlertCircle, ChevronRight,
    Settings, LogOut, Shield, Gift, GraduationCap,
    HelpCircle, FolderOpen, Loader2, Eye
} from 'lucide-react';

interface CompanyItem {
    id: string;
    tradeName: string;
    legalName: string;
    status: string;
}

const AdminDashboard: React.FC = () => {
    const { user, logout, enterViewAs } = useAuth();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [revenueHistory, setRevenueHistory] = useState<RevenueHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCompanyModal, setShowCompanyModal] = useState<'BRAND' | 'SUPPLIER' | null>(null);
    const [companies, setCompanies] = useState<CompanyItem[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [companySearch, setCompanySearch] = useState('');

    const handleViewAs = async (role: 'BRAND' | 'SUPPLIER') => {
        setShowCompanyModal(role);
        setLoadingCompanies(true);
        setCompanySearch('');
        try {
            const data = role === 'SUPPLIER'
                ? await adminService.getSuppliers('ACTIVE')
                : await adminService.getBrands('ACTIVE');
            setCompanies(Array.isArray(data) ? data : []);
        } catch {
            setCompanies([]);
        } finally {
            setLoadingCompanies(false);
        }
    };

    const handleSelectCompany = (company: CompanyItem) => {
        const role = showCompanyModal!;
        setShowCompanyModal(null);
        enterViewAs(role, company.id, company.tradeName || company.legalName);
        navigate(role === 'SUPPLIER' ? '/portal/inicio' : '/brand/inicio');
    };

    const filteredCompanies = companies.filter(c => {
        const search = companySearch.toLowerCase();
        return (c.tradeName?.toLowerCase().includes(search) || c.legalName?.toLowerCase().includes(search));
    });

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            if (import.meta.env.DEV) console.log('[AdminDashboard] Loading data...');
            const [data, revenue] = await Promise.all([
                adminService.getDashboard(),
                adminService.getRevenueHistory(6).catch(() => []),
            ]);
            if (import.meta.env.DEV) console.log('[AdminDashboard] Dashboard data:', data);
            if (import.meta.env.DEV) console.log('[AdminDashboard] Revenue history:', revenue);
            setDashboard(data);
            setRevenueHistory(revenue);
        } catch (error) {
            console.error('[AdminDashboard] Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const metrics = dashboard?.metrics || {
        totalOrders: 0, activeOrders: 0, completedOrders: 0,
        totalSuppliers: 0, activeSuppliers: 0, pendingSuppliers: 0,
        totalBrands: 0, totalRevenue: 0,
    };

    // Transform orders for the table
    const recentOrdersForTable: OrderTableItem[] = useMemo(() => {
        if (!dashboard?.recentOrders) return [];

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

        return dashboard.recentOrders.slice(0, 5).map(order => {
            const config = statusConfig[order.status] || { label: order.status, color: 'neutral' as const };

            return {
                id: order.id,
                displayId: order.displayId,
                productName: order.productName || 'Pedido',
                status: order.status,
                statusLabel: config.label,
                statusColor: config.color,
                value: Number(order.totalValue),
                brandName: order.brand?.tradeName,
                supplierName: order.supplier?.tradeName,
            };
        });
    }, [dashboard?.recentOrders]);

    // Memoized chart data from real API
    const revenueData = useMemo(() => {
        if (revenueHistory.length > 0) {
            return revenueHistory.map((item) => ({
                name: item.month,
                value: item.revenue,
                previousValue: item.previousRevenue,
            }));
        }
        // Fallback to empty array if no data
        return [];
    }, [revenueHistory]);

    const supplierChartData = useMemo(() => [
        { name: 'Ativas', value: metrics.activeSuppliers, color: '#10b981' },
        { name: 'Pendentes', value: metrics.pendingSuppliers, color: '#f59e0b' },
        { name: 'Inativas', value: Math.max(0, metrics.totalSuppliers - metrics.activeSuppliers - metrics.pendingSuppliers), color: '#6b7280' },
    ], [metrics.activeSuppliers, metrics.pendingSuppliers, metrics.totalSuppliers]);

    const generateSparklineData = (baseValue: number, variance = 0.3) => {
        return Array.from({ length: 7 }, () =>
            Math.max(0, baseValue * (1 + (Math.random() - 0.5) * variance))
        );
    };

    // Quick actions
    const quickActions: QuickActionItem[] = [
        {
            id: 'suppliers',
            label: 'Gerenciar Facções de Costura',
            description: 'Ver todas as facções de costura cadastradas',
            icon: <Factory className="h-6 w-6" />,
            href: '/admin/suppliers',
            color: 'purple',
        },
        {
            id: 'suppliers-pool',
            label: 'Pool de Facções de Costura',
            description: 'Relacionamentos N:M e conexões',
            icon: <Users className="h-6 w-6" />,
            href: '/admin/suppliers-pool',
            color: 'blue',
        },
        {
            id: 'brands',
            label: 'Gerenciar Marcas',
            description: 'Configuração e dados das marcas',
            icon: <Building2 className="h-6 w-6" />,
            href: '/admin/brands',
            color: 'brand',
        },
        {
            id: 'orders',
            label: 'Todos os Pedidos',
            description: 'Histórico e status global',
            icon: <Package className="h-6 w-6" />,
            href: '/admin/orders',
            color: 'green',
        },
        {
            id: 'partners',
            label: 'Gerenciar Parceiros',
            description: 'Clube de benefícios e parcerias',
            icon: <Gift className="h-6 w-6" />,
            href: '/admin/partners',
            color: 'amber',
        },
        {
            id: 'educational',
            label: 'Texlink Educa',
            description: 'Conteúdo educacional e trilhas',
            icon: <GraduationCap className="h-6 w-6" />,
            href: '/admin/educational-content',
            color: 'purple',
        },
        {
            id: 'support',
            label: 'Central de Ajuda',
            description: 'Chamados e tickets de suporte',
            icon: <HelpCircle className="h-6 w-6" />,
            href: '/admin/support',
            color: 'blue',
        },
        {
            id: 'documents',
            label: 'Documentos',
            description: 'Repositório de arquivos e docs',
            icon: <FolderOpen className="h-6 w-6" />,
            href: '/admin/documents',
            color: 'brand',
        },
    ];

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const firstName = user?.name?.split(' ')[0] || 'Admin';

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Hero Section with Metrics */}
                <HeroMetrics
                    greeting={`${getGreeting()}, ${firstName}`}
                    subtitle="Visão geral da plataforma"
                >
                    <MetricCard
                        icon={<DollarSign className="h-6 w-6" />}
                        label="Receita Total"
                        value={metrics.totalRevenue}
                        prefix="R$ "
                        decimals={0}
                        trend={12}
                        color="green"
                        sparklineData={generateSparklineData(metrics.totalRevenue)}
                    />
                    <MetricCard
                        icon={<Package className="h-6 w-6" />}
                        label="Pedidos Ativos"
                        value={metrics.activeOrders}
                        color="blue"
                        sparklineData={generateSparklineData(metrics.activeOrders)}
                    />
                    <MetricCard
                        icon={<Factory className="h-6 w-6" />}
                        label="Facções de Costura Ativas"
                        value={metrics.activeSuppliers}
                        color="purple"
                        sparklineData={generateSparklineData(metrics.activeSuppliers)}
                    />
                    <MetricCard
                        icon={<Building2 className="h-6 w-6" />}
                        label="Marcas"
                        value={metrics.totalBrands}
                        color="amber"
                        sparklineData={generateSparklineData(metrics.totalBrands)}
                    />
                </HeroMetrics>

                {/* SuperAdmin: Experience Simulation */}
                {user?.isSuperAdmin && (
                    <div className="animate-fade-up">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Simulação de Experiência
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleViewAs('BRAND')}
                                className="group relative overflow-hidden bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 text-left hover:border-blue-300 dark:hover:border-blue-500/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all"
                            >
                                <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">Ver como Marca</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Navegar no portal da marca</p>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={() => handleViewAs('SUPPLIER')}
                                className="group relative overflow-hidden bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 text-left hover:border-purple-300 dark:hover:border-purple-500/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] transition-all"
                            >
                                <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                        <Factory className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">Ver como Facção</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Navegar no portal do parceiro</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Quick Actions - Platform Management */}
                <div className="animate-fade-up">
                    <QuickActionsGrid
                        title="Gestão da Plataforma"
                        actions={quickActions}
                        columns={4}
                    />
                </div>

                {/* Pending Approvals Alert */}
                {metrics.pendingSuppliers > 0 && (
                    <Link
                        to="/admin/approvals"
                        className="group relative overflow-hidden block bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 hover:from-amber-500/30 hover:to-orange-500/20 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] dashboard-section"
                    >
                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-amber-900 dark:text-white font-semibold">{metrics.pendingSuppliers} Aprovações Pendentes</p>
                                    <p className="text-amber-800/80 dark:text-amber-400/70 text-sm">Facções de costura aguardando aprovação</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard
                        title="Receita da Plataforma"
                        subtitle="Últimos 6 meses"
                        showPeriodSelector={false}
                    >
                        <AreaChartRevenue
                            data={revenueData}
                            showComparison={true}
                            color="#10b981"
                            comparisonColor="#8b5cf6"
                        />
                    </ChartCard>

                    <ChartCard
                        title="Status das Facções de Costura"
                        subtitle="Distribuição atual"
                        showPeriodSelector={false}
                        minHeight="320px"
                    >
                        <DonutChartStatus
                            data={supplierChartData}
                            centerValue={metrics.totalSuppliers}
                            centerLabel="Total"
                        />
                    </ChartCard>
                </div>

                {/* Stats Summary Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Orders Summary */}
                    <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 dashboard-section shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-semibold">Pedidos</h3>
                        </div>
                        <div className="space-y-3">
                            <StatRow label="Total" value={metrics.totalOrders} />
                            <StatRow label="Em andamento" value={metrics.activeOrders} color="blue" />
                            <StatRow label="Finalizados" value={metrics.completedOrders} color="green" />
                        </div>
                    </div>

                    {/* Suppliers Summary */}
                    <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 dashboard-section shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <Factory className="w-5 h-5 text-purple-400" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-semibold">Facções</h3>
                        </div>
                        <div className="space-y-3">
                            <StatRow label="Total" value={metrics.totalSuppliers} />
                            <StatRow label="Ativas" value={metrics.activeSuppliers} color="green" />
                            <StatRow label="Pendentes" value={metrics.pendingSuppliers} color="amber" />
                        </div>
                    </div>
                </div>

                {/* Recent Orders */}
                {dashboard?.recentOrders && dashboard.recentOrders.length > 0 && (
                    <div className="animate-fade-up delay-300">
                        <RecentOrdersTable
                            orders={recentOrdersForTable}
                            linkBase="/admin/orders"
                            showBrand={true}
                            showSupplier={true}
                            viewAllLink="/admin/orders"
                        />
                    </div>
                )}
            </main>

            {/* Company Selection Modal */}
            {showCompanyModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                {showCompanyModal === 'SUPPLIER' ? (
                                    <Factory className="w-5 h-5 text-purple-500" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-blue-500" />
                                )}
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Selecionar {showCompanyModal === 'SUPPLIER' ? 'Facção' : 'Marca'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowCompanyModal(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <AlertCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-200 dark:border-white/10">
                            <input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={companySearch}
                                onChange={(e) => setCompanySearch(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white placeholder-gray-400"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingCompanies ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                </div>
                            ) : filteredCompanies.length === 0 ? (
                                <p className="text-center text-gray-400 py-12 text-sm">
                                    Nenhuma empresa encontrada
                                </p>
                            ) : (
                                filteredCompanies.map((company) => (
                                    <button
                                        key={company.id}
                                        onClick={() => handleSelectCompany(company)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            {showCompanyModal === 'SUPPLIER' ? (
                                                <Factory className="w-4 h-4 text-purple-500" />
                                            ) : (
                                                <Building2 className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {company.tradeName || company.legalName}
                                            </p>
                                            {company.tradeName && company.legalName && company.tradeName !== company.legalName && (
                                                <p className="text-xs text-gray-400 truncate">{company.legalName}</p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Stat row component for summary cards
const StatRow: React.FC<{ label: string; value: number; color?: 'blue' | 'green' | 'amber' }> = ({ label, value, color }) => {
    const dotColor = color === 'blue' ? 'bg-blue-400' : color === 'green' ? 'bg-emerald-400' : color === 'amber' ? 'bg-amber-400' : 'bg-gray-400';

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-gray-500 dark:text-gray-400 text-sm">{label}</span>
            </div>
            <span className="text-gray-900 dark:text-white font-medium tabular-nums">{value}</span>
        </div>
    );
};

export default AdminDashboard;
