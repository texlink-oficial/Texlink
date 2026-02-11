import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { suppliersService, ordersService, Order } from '../../services';
import { StatusBadge } from '../../components/shared/StatusBadge';
import {
    Package, DollarSign,
    Calendar, Building2, Loader2,
    Target, CheckCircle, Eye, Search,
    SlidersHorizontal, X, ArrowUpDown,
    HandHeart, MessageSquare, Scale
} from 'lucide-react';

// ==================== TYPES ====================

type SortOption = 'newest' | 'highest_value' | 'closest_deadline';
type DeadlinePreset = '' | 'this_week' | 'this_month' | 'custom';

interface Filters {
    search: string;
    category: string;
    deadlinePreset: DeadlinePreset;
    deadlineFrom: string;
    deadlineTo: string;
    minValue: string;
    maxValue: string;
    sort: SortOption;
}

const INITIAL_FILTERS: Filters = {
    search: '',
    category: '',
    deadlinePreset: '',
    deadlineFrom: '',
    deadlineTo: '',
    minValue: '',
    maxValue: '',
    sort: 'newest',
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Mais recentes' },
    { value: 'highest_value', label: 'Maior valor' },
    { value: 'closest_deadline', label: 'Prazo mais próximo' },
];

// ==================== COMPONENT ====================

const OpportunitiesPage: React.FC = () => {
    const [opportunities, setOpportunities] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    // Express Interest modal state
    const [interestModal, setInterestModal] = useState<{ open: boolean; orderId: string; orderName: string }>({
        open: false, orderId: '', orderName: ''
    });
    const [interestMessage, setInterestMessage] = useState('');
    const [interestLoading, setInterestLoading] = useState(false);
    const [interestSuccess, setInterestSuccess] = useState<string | null>(null);

    // Track orders where interest was already expressed (locally)
    const [expressedInterest, setExpressedInterest] = useState<Set<string>>(new Set());

    // Negotiation modal state
    const [negotiateModal, setNegotiateModal] = useState<{ open: boolean; orderId: string; orderName: string }>({
        open: false, orderId: '', orderName: ''
    });
    const [negotiateLoading, setNegotiateLoading] = useState<'negotiate' | 'accept' | null>(null);

    const loadOpportunities = useCallback(async () => {
        try {
            setIsLoading(true);

            // Compute deadline range from preset
            let deadlineFrom = filters.deadlineFrom;
            let deadlineTo = filters.deadlineTo;
            if (filters.deadlinePreset === 'this_week') {
                const now = new Date();
                const endOfWeek = new Date(now);
                endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
                deadlineFrom = now.toISOString().split('T')[0];
                deadlineTo = endOfWeek.toISOString().split('T')[0];
            } else if (filters.deadlinePreset === 'this_month') {
                const now = new Date();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                deadlineFrom = now.toISOString().split('T')[0];
                deadlineTo = endOfMonth.toISOString().split('T')[0];
            }

            const data = await suppliersService.getOpportunities({
                search: filters.search || undefined,
                category: filters.category || undefined,
                minValue: filters.minValue ? parseFloat(filters.minValue) : undefined,
                maxValue: filters.maxValue ? parseFloat(filters.maxValue) : undefined,
                deadlineFrom: deadlineFrom || undefined,
                deadlineTo: deadlineTo || undefined,
                sort: filters.sort,
            });
            setOpportunities(data);
        } catch (error) {
            console.error('Error loading opportunities:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            loadOpportunities();
        }, 300);
        return () => clearTimeout(debounce);
    }, [loadOpportunities]);

    const handleNegotiate = async () => {
        if (!negotiateModal.orderId) return;
        try {
            setNegotiateLoading('negotiate');
            await ordersService.updateStatus(negotiateModal.orderId, 'EM_NEGOCIACAO');
            setOpportunities(prev => prev.filter(o => o.id !== negotiateModal.orderId));
            setNegotiateModal({ open: false, orderId: '', orderName: '' });
        } catch (error) {
            console.error('Error starting negotiation:', error);
        } finally {
            setNegotiateLoading(null);
        }
    };

    const handleAcceptDirect = async () => {
        if (!negotiateModal.orderId) return;
        try {
            setNegotiateLoading('accept');
            await ordersService.accept(negotiateModal.orderId);
            setOpportunities(prev => prev.filter(o => o.id !== negotiateModal.orderId));
            setNegotiateModal({ open: false, orderId: '', orderName: '' });
        } catch (error) {
            console.error('Error accepting order:', error);
        } finally {
            setNegotiateLoading(null);
        }
    };

    const handleExpressInterest = async () => {
        if (!interestModal.orderId) return;
        try {
            setInterestLoading(true);
            const result = await suppliersService.expressInterest(interestModal.orderId, interestMessage || undefined);
            setExpressedInterest(prev => new Set(prev).add(interestModal.orderId));
            setInterestSuccess(result.message);
            setTimeout(() => {
                setInterestModal({ open: false, orderId: '', orderName: '' });
                setInterestMessage('');
                setInterestSuccess(null);
            }, 2000);
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Erro ao demonstrar interesse.';
            setInterestSuccess(msg);
        } finally {
            setInterestLoading(false);
        }
    };

    const updateFilter = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters(INITIAL_FILTERS);
    };

    const hasActiveFilters = useMemo(() =>
        filters.search !== '' ||
        filters.category !== '' ||
        filters.deadlinePreset !== '' ||
        filters.minValue !== '' ||
        filters.maxValue !== '' ||
        filters.sort !== 'newest',
    [filters]);

    // Extract unique categories from loaded opportunities for the dropdown
    const categories = useMemo(() => {
        const cats = new Set<string>();
        opportunities.forEach(o => {
            if (o.productCategory) cats.add(o.productCategory);
            if (o.productType) cats.add(o.productType);
        });
        return Array.from(cats).sort();
    }, [opportunities]);

    const isBiddingOrder = (order: Order) =>
        order.assignmentType === 'BIDDING' || order.assignmentType === 'HYBRID';

    const hasExpressedInterest = (order: Order) => {
        if (expressedInterest.has(order.id)) return true;
        // Check from backend data if targetSuppliers has INTERESTED status
        const targets = (order as any).targetSuppliers;
        if (Array.isArray(targets) && targets.some((t: any) => t.status === 'INTERESTED')) return true;
        return false;
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Target className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Oportunidades
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                {isLoading ? '...' : `${opportunities.length} pedidos disponíveis`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por produto, marca ou descrição..."
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                        {filters.search && (
                            <button
                                onClick={() => updateFilter('search', '')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                        <select
                            value={filters.sort}
                            onChange={(e) => updateFilter('sort', e.target.value)}
                            className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toggle Filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                            showFilters || hasActiveFilters
                                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-600 text-brand-700 dark:text-brand-400'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filtros
                        {hasActiveFilters && (
                            <span className="w-2 h-2 bg-brand-500 rounded-full" />
                        )}
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Category */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Categoria / Tipo
                                </label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => updateFilter('category', e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="">Todas</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Prazo de Entrega
                                </label>
                                <select
                                    value={filters.deadlinePreset}
                                    onChange={(e) => {
                                        const v = e.target.value as DeadlinePreset;
                                        setFilters(prev => ({
                                            ...prev,
                                            deadlinePreset: v,
                                            deadlineFrom: v === 'custom' ? prev.deadlineFrom : '',
                                            deadlineTo: v === 'custom' ? prev.deadlineTo : '',
                                        }));
                                    }}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="">Qualquer</option>
                                    <option value="this_week">Esta semana</option>
                                    <option value="this_month">Este mês</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>

                            {/* Value Range */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Valor mínimo (R$)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0,00"
                                    value={filters.minValue}
                                    onChange={(e) => updateFilter('minValue', e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    min="0"
                                    step="100"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Valor máximo (R$)
                                </label>
                                <input
                                    type="number"
                                    placeholder="Sem limite"
                                    value={filters.maxValue}
                                    onChange={(e) => updateFilter('maxValue', e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    min="0"
                                    step="100"
                                />
                            </div>
                        </div>

                        {/* Custom date range (only when preset = custom) */}
                        {filters.deadlinePreset === 'custom' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                        De
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.deadlineFrom}
                                        onChange={(e) => updateFilter('deadlineFrom', e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                        Até
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.deadlineTo}
                                        onChange={(e) => updateFilter('deadlineTo', e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Clear filters */}
                        {hasActiveFilters && (
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                >
                                    <X className="h-3 w-3" />
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : opportunities.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {hasActiveFilters ? 'Nenhuma oportunidade encontrada' : 'Nenhuma oportunidade disponível'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        {hasActiveFilters
                            ? 'Tente ajustar os filtros para encontrar mais oportunidades.'
                            : 'Não há pedidos aguardando aceite no momento. Volte mais tarde para ver novas oportunidades de produção.'
                        }
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-4 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {opportunities.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            {order.displayId}
                                        </span>
                                        <StatusBadge
                                            label={order.assignmentType === 'DIRECT' ? 'Direto' : order.assignmentType === 'HYBRID' ? 'Híbrido' : 'Licitação'}
                                            variant={order.assignmentType === 'DIRECT' ? 'info' : 'purple'}
                                            size="sm"
                                        />
                                        {hasExpressedInterest(order) && (
                                            <StatusBadge
                                                label="Interesse enviado"
                                                variant="success"
                                                size="sm"
                                            />
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {order.productName}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {order.productType} {order.productCategory ? `\u2022 ${order.productCategory}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">{order.brand?.tradeName}</span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                <InfoCard
                                    icon={Package}
                                    label="Quantidade"
                                    value={`${order.quantity} pçs`}
                                />
                                <InfoCard
                                    icon={DollarSign}
                                    label="Valor Unitário"
                                    value={formatCurrency(Number(order.pricePerUnit))}
                                />
                                <InfoCard
                                    icon={DollarSign}
                                    label="Valor Total"
                                    value={formatCurrency(Number(order.totalValue))}
                                    highlight
                                />
                                <InfoCard
                                    icon={Calendar}
                                    label="Prazo de Entrega"
                                    value={formatDate(order.deliveryDeadline)}
                                />
                            </div>

                            {/* Description */}
                            {order.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    {order.description}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {isBiddingOrder(order) && !hasExpressedInterest(order) ? (
                                    <button
                                        onClick={() => setInterestModal({ open: true, orderId: order.id, orderName: order.productName })}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                                    >
                                        <HandHeart className="w-5 h-5" />
                                        Demonstrar Interesse
                                    </button>
                                ) : isBiddingOrder(order) && hasExpressedInterest(order) ? (
                                    <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium rounded-xl cursor-default">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        Interesse demonstrado
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setNegotiateModal({ open: true, orderId: order.id, orderName: order.productName })}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Aceitar Pedido
                                    </button>
                                )}
                                <Link
                                    to={`/portal/pedidos/${order.id}`}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                                >
                                    <Eye className="w-5 h-5" />
                                    Ver Detalhes
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Negotiation Confirmation Modal */}
            {negotiateModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => {
                            if (!negotiateLoading) {
                                setNegotiateModal({ open: false, orderId: '', orderName: '' });
                            }
                        }}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                <Scale className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Deseja negociar os termos do pedido?
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {negotiateModal.orderName}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Você pode negociar prazos, valores e condições com a marca antes de aceitar, ou aceitar o pedido diretamente com os termos atuais.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleNegotiate}
                                disabled={!!negotiateLoading}
                                className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {negotiateLoading === 'negotiate' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Scale className="w-4 h-4" />
                                )}
                                Sim, negociar
                            </button>
                            <button
                                onClick={handleAcceptDirect}
                                disabled={!!negotiateLoading}
                                className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {negotiateLoading === 'accept' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Nao, aceitar direto
                            </button>
                            <button
                                onClick={() => setNegotiateModal({ open: false, orderId: '', orderName: '' })}
                                disabled={!!negotiateLoading}
                                className="py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Express Interest Modal */}
            {interestModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => {
                            if (!interestLoading) {
                                setInterestModal({ open: false, orderId: '', orderName: '' });
                                setInterestMessage('');
                                setInterestSuccess(null);
                            }
                        }}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <HandHeart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Demonstrar Interesse
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {interestModal.orderName}
                                </p>
                            </div>
                        </div>

                        {interestSuccess ? (
                            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl mb-4">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <p className="text-sm text-green-700 dark:text-green-400">{interestSuccess}</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    A marca será notificada do seu interesse neste pedido. Você pode incluir uma mensagem opcional.
                                </p>

                                <div className="mb-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Mensagem (opcional)
                                    </label>
                                    <textarea
                                        value={interestMessage}
                                        onChange={(e) => setInterestMessage(e.target.value)}
                                        placeholder="Ex: Temos capacidade disponível para esse prazo e experiência com esse tipo de produto..."
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setInterestModal({ open: false, orderId: '', orderName: '' });
                                            setInterestMessage('');
                                        }}
                                        disabled={interestLoading}
                                        className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleExpressInterest}
                                        disabled={interestLoading}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        {interestLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <HandHeart className="w-4 h-4" />
                                        )}
                                        Enviar Interesse
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== SUB-COMPONENTS ====================

interface InfoCardProps {
    icon: React.FC<{ className?: string }>;
    label: string;
    value: string;
    highlight?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, highlight }) => (
    <div className={`p-3 rounded-xl ${highlight
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-900/50'
        }`}>
        <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <p className={`font-semibold ${highlight
                ? 'text-green-700 dark:text-green-400'
                : 'text-gray-900 dark:text-white'
            }`}>
            {value}
        </p>
    </div>
);

// ==================== HELPERS ====================

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export default OpportunitiesPage;
