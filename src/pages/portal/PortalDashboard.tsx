import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { portalService, PortalSummary, RevenueHistoryItem, PerformanceData } from '../../services/portal.service';
import { settingsService } from '../../services/settings.service';
import { onboardingService, SupplierProfile } from '../../services/onboarding.service';
import { BankAccount } from '../../types';
import { AlertBanner } from '../../components/shared/AlertBanner';
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
    Package,
    Clock,
    Truck,
    FileWarning,
    ArrowRight,
    BarChart3,
    DollarSign,
    Wallet,
    Loader2,
    CheckCircle,
    CheckCircle2,
    TrendingUp,
    FolderOpen,
} from 'lucide-react';

const PortalDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<PortalSummary | null>(null);
    const [profile, setProfile] = useState<SupplierProfile | null>(null);
    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [revenueHistory, setRevenueHistory] = useState<RevenueHistoryItem[]>([]);
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            setIsLoading(true);
            const [summaryData, profileData, bankData, revenueData, perfData] = await Promise.all([
                portalService.getSummary(),
                onboardingService.getProfile().catch(() => null),
                settingsService.getBankAccount().catch(() => null),
                portalService.getRevenueHistory(6).catch(() => []),
                portalService.getPerformance().catch(() => null),
            ]);
            setSummary(summaryData);
            setProfile(profileData);
            setBankAccount(bankData);
            setRevenueHistory(revenueData);
            setPerformance(perfData);
        } catch (error) {
            console.error('Error loading portal data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismissAlert = (alertId: string) => {
        setDismissedAlerts(prev => [...prev, alertId]);
        portalService.dismissAlert(alertId);
    };

    const visibleAlerts = summary?.alerts.filter(a => !dismissedAlerts.includes(a.id)) || [];

    // Memoized chart data from real API
    const revenueData = useMemo(() => {
        if (revenueHistory.length === 0) {
            // Return empty placeholder if no data
            return [];
        }
        return revenueHistory.map((item) => ({
            name: item.month,
            value: item.revenue,
            previousValue: 0, // We don't have previous period data yet
        }));
    }, [revenueHistory]);

    const statusData = useMemo(() => {
        // Use performance data if available, otherwise use summary data
        if (performance?.byStatus && performance.byStatus.length > 0) {
            const colorMap: Record<string, string> = {
                'Concluído': '#10b981',
                'Em Produção': '#8b5cf6',
                'Aceito': '#3b82f6',
                'Aguardando': '#f59e0b',
                'Recusado': '#ef4444',
                'Pronto': '#06b6d4',
                'Em Trânsito': '#6366f1',
            };
            return performance.byStatus.map((item) => ({
                name: item.status,
                value: item.count,
                color: colorMap[item.status] || '#6b7280',
            }));
        }
        // Fallback to summary data
        return [
            { name: 'Em Produção', value: summary?.activeOrders || 0, color: '#8b5cf6' },
            { name: 'Aguardando', value: summary?.pendingAccept || 0, color: '#f59e0b' },
            { name: 'Entregas', value: summary?.upcomingDeliveries || 0, color: '#3b82f6' },
        ];
    }, [summary, performance]);

    // Check if bank data is complete based on settings
    const isBankDataComplete = useMemo(() => {
        if (!bankAccount) return false;
        return !!(
            bankAccount.bankCode &&
            bankAccount.agency &&
            bankAccount.accountNumber &&
            bankAccount.accountHolder
        );
    }, [bankAccount]);

    const generateSparklineData = (baseValue: number, variance = 0.3) => {
        return Array.from({ length: 7 }, () =>
            Math.max(0, baseValue * (1 + (Math.random() - 0.5) * variance))
        );
    };

    // Quick actions configuration
    const quickActions: QuickActionItem[] = [
        {
            id: 'orders',
            label: 'Ver Pedidos',
            description: 'Gerenciar pedidos ativos',
            icon: <Package className="h-6 w-6" />,
            href: '/portal/pedidos',
            color: 'brand',
            badge: summary?.activeOrders,
        },
        {
            id: 'bank',
            label: 'Dados Bancários',
            description: 'Configurar conta para repasse',
            icon: <Wallet className="h-6 w-6" />,
            href: '/portal/configuracoes',
            color: 'green',
        },
        {
            id: 'deposits',
            label: 'Ver Depósitos',
            description: 'Histórico de pagamentos',
            icon: <DollarSign className="h-6 w-6" />,
            href: '/portal/financeiro/depositos',
            color: 'purple',
        },
        {
            id: 'performance',
            label: 'Ver Desempenho',
            description: 'Métricas e estatísticas',
            icon: <BarChart3 className="h-6 w-6" />,
            href: '/portal/desempenho',
            color: 'blue',
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

    const firstName = user?.name?.split(' ')[0] || 'Parceiro';
    const totalStatusOrders = statusData.reduce((sum, item) => sum + item.value, 0);

    return (
        <DashboardShell>
            {/* Hero Section with Metrics */}
            <HeroMetrics
                greeting={`${getGreeting()}, ${firstName}`}
                subtitle="Aqui está o resumo da sua operação"
            >
                <MetricCard
                    icon={<Package className="h-6 w-6" />}
                    label="Pedidos Ativos"
                    value={summary?.activeOrders || 0}
                    color="brand"
                    sparklineData={generateSparklineData(summary?.activeOrders || 5)}
                    onClick={() => navigate('/portal/pedidos')}
                />
                <MetricCard
                    icon={<Clock className="h-6 w-6" />}
                    label="Aguardando Aceite"
                    value={summary?.pendingAccept || 0}
                    color="amber"
                    sparklineData={generateSparklineData(summary?.pendingAccept || 3)}
                    onClick={() => navigate('/portal/pedidos?status=pending')}
                />
                <MetricCard
                    icon={<Truck className="h-6 w-6" />}
                    label="Entregas Próximas"
                    value={summary?.upcomingDeliveries || 0}
                    color="blue"
                    sparklineData={generateSparklineData(summary?.upcomingDeliveries || 2)}
                    onClick={() => navigate('/portal/pedidos?status=delivery')}
                />
                <MetricCard
                    icon={summary?.pendingDocuments ? <FileWarning className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                    label="Documentos Pendentes"
                    value={summary?.pendingDocuments || 0}
                    color={summary?.pendingDocuments ? 'red' : 'green'}
                    sparklineData={generateSparklineData(summary?.pendingDocuments || 0)}
                />
            </HeroMetrics>

            {/* Quick Actions */}
            <QuickActionsGrid
                title="Ações Rápidas"
                actions={quickActions}
                columns={4}
            />

            {/* Onboarding Progress Card */}
            {profile && !profile.onboardingComplete && (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white dashboard-section">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-orange-300/20 rounded-full blur-2xl" />

                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">Complete seu cadastro</h3>
                            <p className="text-amber-100 text-sm mb-4">
                                Finalize as etapas para receber pedidos na plataforma.
                            </p>
                            <div className="flex items-center gap-3 mb-4">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step < (profile.onboardingPhase || 1) + 1
                                                ? 'bg-white text-amber-600 shadow-lg shadow-amber-600/20'
                                                : step === (profile.onboardingPhase || 1) + 1
                                                    ? 'bg-white/30 text-white ring-2 ring-white'
                                                    : 'bg-white/20 text-white/60'
                                                }`}
                                        >
                                            {step < (profile.onboardingPhase || 1) + 1 ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <span className="text-sm font-bold">{step}</span>
                                            )}
                                        </div>
                                        {step < 3 && (
                                            <div className={`w-8 h-0.5 transition-all ${step < (profile.onboardingPhase || 1) + 1 ? 'bg-white' : 'bg-white/30'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    to="/onboarding"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-600/20"
                                >
                                    Continuar cadastro
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={async () => {
                                        try {
                                            await onboardingService.completeOnboarding();
                                            setProfile(prev => prev ? { ...prev, onboardingComplete: true } : null);
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
                            {profile.onboardingPhase || 1}/3
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts */}
            {visibleAlerts.length > 0 && (
                <div className="space-y-3 dashboard-section">
                    {visibleAlerts.map(alert => (
                        <AlertBanner
                            key={alert.id}
                            type={alert.type}
                            title={alert.title}
                            message={alert.message}
                            actionLabel={alert.actionLabel}
                            onAction={() => alert.actionPath && navigate(alert.actionPath)}
                            onDismiss={() => handleDismissAlert(alert.id)}
                        />
                    ))}
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard
                    title="Receita Mensal"
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
                    title="Distribuição de Pedidos"
                    subtitle="Por status"
                    showPeriodSelector={false}
                    minHeight="320px"
                >
                    <DonutChartStatus
                        data={statusData}
                        centerValue={totalStatusOrders}
                        centerLabel="Total"
                    />
                </ChartCard>
            </div>

            {/* Bank Data Status */}
            {!isBankDataComplete && (
                <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 text-white dashboard-section">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-300/20 rounded-full blur-2xl" />

                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Configure seus dados bancários</h3>
                            <p className="text-sky-100 text-sm mb-4">
                                Para receber os repasses dos pedidos, você precisa cadastrar suas informações bancárias.
                            </p>
                            <Link
                                to="/portal/configuracoes"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-sky-600 rounded-lg font-medium hover:bg-sky-50 transition-all hover:-translate-y-0.5 shadow-lg shadow-sky-700/20"
                            >
                                Configurar agora
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Wallet className="h-8 w-8 text-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <DashboardFooter variant="portal" />
        </DashboardShell>
    );
};

export default PortalDashboard;
