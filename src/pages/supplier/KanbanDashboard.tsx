import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService, suppliersService, ratingsService, Order as ApiOrder, OrderStatus as ApiOrderStatus, SupplierDashboard, PendingRating } from '../../services';
import { Order, OrderStatus } from '../../types';

import { OrderCard } from '../../components/kanban/OrderCard';
import { OrderDetailModal } from '../../components/kanban/OrderDetailModal';
import { StatsOverview } from '../../components/kanban/StatsOverview';
import { OrderListView } from '../../components/kanban/OrderListView';
import { RatingModal } from '../../components/ratings/RatingModal';
import { OrderFiltersDropdown } from '../../components/kanban/OrderFiltersDropdown';
import { Filter, LayoutGrid, List, Loader2, Search } from 'lucide-react';

// Status mapping from API to Kanban UI
const STATUS_MAP: Record<ApiOrderStatus, OrderStatus> = {
    'LANCADO_PELA_MARCA': OrderStatus.NEW,
    'EM_NEGOCIACAO': OrderStatus.NEGOTIATING,
    'ACEITO_PELA_FACCAO': OrderStatus.ACCEPTED,
    'EM_PREPARACAO_SAIDA_MARCA': OrderStatus.PREPARING_BRAND,
    'EM_TRANSITO_PARA_FACCAO': OrderStatus.TRANSIT_TO_SUPPLIER,
    'EM_PREPARACAO_ENTRADA_FACCAO': OrderStatus.RECEIVED_SUPPLIER,
    'EM_PRODUCAO': OrderStatus.PRODUCTION,
    'PRONTO': OrderStatus.READY_SEND,
    'EM_TRANSITO_PARA_MARCA': OrderStatus.TRANSIT_TO_BRAND,
    'EM_REVISAO': OrderStatus.IN_REVIEW,
    'PARCIALMENTE_APROVADO': OrderStatus.PARTIALLY_APPROVED,
    'REPROVADO': OrderStatus.DISAPPROVED,
    'AGUARDANDO_RETRABALHO': OrderStatus.AWAITING_REWORK,
    'FINALIZADO': OrderStatus.FINALIZED,
    'RECUSADO_PELA_FACCAO': OrderStatus.REJECTED,
    'DISPONIVEL_PARA_OUTRAS': OrderStatus.NEW,
};

const REVERSE_STATUS_MAP: Record<OrderStatus, ApiOrderStatus> = {
    [OrderStatus.NEW]: 'LANCADO_PELA_MARCA',
    [OrderStatus.NEGOTIATING]: 'EM_NEGOCIACAO',
    [OrderStatus.ACCEPTED]: 'ACEITO_PELA_FACCAO',
    [OrderStatus.PREPARING_BRAND]: 'EM_PREPARACAO_SAIDA_MARCA',
    [OrderStatus.TRANSIT_TO_SUPPLIER]: 'EM_TRANSITO_PARA_FACCAO',
    [OrderStatus.RECEIVED_SUPPLIER]: 'EM_PREPARACAO_ENTRADA_FACCAO',
    [OrderStatus.PRODUCTION]: 'EM_PRODUCAO',
    [OrderStatus.READY_SEND]: 'PRONTO',
    [OrderStatus.TRANSIT_TO_BRAND]: 'EM_TRANSITO_PARA_MARCA',
    [OrderStatus.IN_REVIEW]: 'EM_REVISAO',
    [OrderStatus.PARTIALLY_APPROVED]: 'PARCIALMENTE_APROVADO',
    [OrderStatus.DISAPPROVED]: 'REPROVADO',
    [OrderStatus.AWAITING_REWORK]: 'AGUARDANDO_RETRABALHO',
    [OrderStatus.FINALIZED]: 'FINALIZADO',
    [OrderStatus.REJECTED]: 'RECUSADO_PELA_FACCAO',
};

const STATUS_COLUMNS = [
    { id: OrderStatus.NEW, label: '▪ Novos Pedidos' },
    { id: OrderStatus.NEGOTIATING, label: '▪ Em Negociação' },
    { id: OrderStatus.ACCEPTED, label: '▪ Aceitos' },
    { id: OrderStatus.PREPARING_BRAND, label: '▪ Preparação (Marca)' },
    { id: OrderStatus.TRANSIT_TO_SUPPLIER, label: '▪ Trânsito → Facção' },
    { id: OrderStatus.RECEIVED_SUPPLIER, label: '▪ Recebido' },
    { id: OrderStatus.PRODUCTION, label: '▪ Em Produção' },
    { id: OrderStatus.READY_SEND, label: '▪ Pronto / Envio' },
    { id: OrderStatus.TRANSIT_TO_BRAND, label: '▪ Trânsito → Marca' },
    { id: OrderStatus.IN_REVIEW, label: '▪ Em Revisão' },
    { id: OrderStatus.PARTIALLY_APPROVED, label: '▪ Parc. Aprovado' },
    { id: OrderStatus.DISAPPROVED, label: '▪ Reprovado' },
    { id: OrderStatus.AWAITING_REWORK, label: '▪ Aguard. Retrabalho' },
    { id: OrderStatus.FINALIZED, label: '▪ Finalizados' },
];

// Convert API order to Kanban order format
const convertApiOrder = (apiOrder: ApiOrder): Order => ({
    id: apiOrder.id,
    displayId: apiOrder.displayId,
    brand: {
        id: apiOrder.brand?.id || apiOrder.brandId,
        name: apiOrder.brand?.tradeName || 'Marca',
        rating: Number(apiOrder.brand?.avgRating) || 4.5,
        location: 'Brasil',
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(apiOrder.brand?.tradeName || 'M')}&background=3b82f6&color=fff`,
    },
    type: apiOrder.productType?.includes('Infantil') ? 'Infantil' : 'Adulto',
    productName: apiOrder.productName,
    quantity: apiOrder.quantity,
    pricePerUnit: Number(apiOrder.pricePerUnit),
    totalValue: Number(apiOrder.totalValue),
    deliveryDeadline: apiOrder.deliveryDeadline,
    status: STATUS_MAP[apiOrder.status] || OrderStatus.NEW,
    paymentTerms: apiOrder.paymentTerms || '50% adiantado',
    paymentStatus: 'pending',
    description: apiOrder.description || '',
    observations: '',
    materialsProvided: apiOrder.materialsProvided,
    createdAt: apiOrder.createdAt,
    timeline: [
        { step: 'Pedido Criado', completed: true, date: new Date(apiOrder.createdAt).toLocaleDateString('pt-BR'), icon: 'check' },
        { step: 'Aceite da Facção', completed: ['ACEITO_PELA_FACCAO', 'EM_PREPARACAO_SAIDA_MARCA', 'EM_TRANSITO_PARA_FACCAO', 'EM_PREPARACAO_ENTRADA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'check' },
        { step: 'Preparação (Marca)', completed: ['EM_PREPARACAO_SAIDA_MARCA', 'EM_TRANSITO_PARA_FACCAO', 'EM_PREPARACAO_ENTRADA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'box' },
        { step: 'Em Trânsito → Facção', completed: ['EM_TRANSITO_PARA_FACCAO', 'EM_PREPARACAO_ENTRADA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'truck' },
        { step: 'Recebimento na Facção', completed: ['EM_PREPARACAO_ENTRADA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'box' },
        { step: 'Em Produção', completed: ['EM_PRODUCAO', 'PRONTO', 'EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'scissors' },
        { step: 'Pronto p/ Envio', completed: ['PRONTO', 'EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'box' },
        { step: 'Em Trânsito → Marca', completed: ['EM_TRANSITO_PARA_MARCA', 'FINALIZADO'].includes(apiOrder.status), icon: 'truck' },
        { step: 'Entrega / Finalização', completed: apiOrder.status === 'FINALIZADO', icon: 'check' },
        { step: 'Avaliação', completed: false, icon: 'check' }
    ],
});

const SupplierKanbanDashboard: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [supplierProfile, setSupplierProfile] = useState<SupplierDashboard | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([]);
    const [partnerFilter, setPartnerFilter] = useState('');
    const [productTypeFilter, setProductTypeFilter] = useState('');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [pendingRating, setPendingRating] = useState<PendingRating | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    // Load orders and profile from API
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [apiOrders, profile, pendingRatings] = await Promise.all([
                ordersService.getSupplierOrders(),
                suppliersService.getDashboard(),
                ratingsService.getPendingRatings().catch(() => [])
            ]);
            setOrders(apiOrders.map(convertApiOrder));
            setSupplierProfile(profile);

            // Show rating modal if there are pending ratings
            if (pendingRatings.length > 0) {
                setPendingRating(pendingRatings[0]);
                setShowRatingModal(true);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Close filter menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Dark Mode
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                order.displayId.toLowerCase().includes(searchLower) ||
                order.brand.name.toLowerCase().includes(searchLower) ||
                order.productName.toLowerCase().includes(searchLower);

            let matchesDate = true;
            if (dateFilter !== 'all') {
                const orderDate = new Date(order.createdAt);
                const today = new Date();

                if (dateFilter === 'today') {
                    matchesDate = orderDate.toDateString() === today.toDateString();
                } else if (dateFilter === 'week') {
                    const oneWeekAgo = new Date(today);
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    matchesDate = orderDate >= oneWeekAgo && orderDate <= today;
                } else if (dateFilter === 'month') {
                    matchesDate = orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
                }
            }

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status);
            const matchesPartner = partnerFilter === '' || order.brand.id === partnerFilter;
            const matchesProductType = productTypeFilter === '' || order.type === productTypeFilter;

            return matchesSearch && matchesDate && matchesStatus && matchesPartner && matchesProductType;
        });
    }, [orders, searchQuery, dateFilter, statusFilter, partnerFilter, productTypeFilter]);

    // Extract unique partners and product types for filters
    const partners = useMemo(() => {
        const uniquePartners = new Map<string, string>();
        orders.forEach(o => uniquePartners.set(o.brand.id, o.brand.name));
        return Array.from(uniquePartners.entries()).map(([id, name]) => ({ id, name }));
    }, [orders]);

    const productTypes = useMemo(() => {
        return [...new Set(orders.map(o => o.type))];
    }, [orders]);

    const clearFilters = () => {
        setDateFilter('all');
        setStatusFilter([]);
        setPartnerFilter('');
        setProductTypeFilter('');
    };

    const ordersByStatus = useMemo(() => {
        const grouped: Record<string, Order[]> = {};
        Object.values(OrderStatus).forEach(status => {
            grouped[status] = filteredOrders.filter(o => o.status === status);
        });
        return grouped;
    }, [filteredOrders]);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const apiStatus = REVERSE_STATUS_MAP[newStatus];
            if (apiStatus) {
                await ordersService.updateStatus(orderId, apiStatus);
            }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleTimelineStepToggle = (orderId: string, stepName: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            return {
                ...o,
                timeline: o.timeline.map(t =>
                    t.step === stepName ? { ...t, completed: true, date: 'Agora' } : t
                )
            };
        }));
    };

    // Handler for accepting an order
    const handleAcceptOrder = async (orderId: string) => {
        try {
            await ordersService.accept(orderId);
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, status: OrderStatus.ACCEPTED } : o
            ));
        } catch (error) {
            console.error('Error accepting order:', error);
        }
    };

    // Handler for rejecting an order
    const handleRejectOrder = async (orderId: string) => {
        try {
            await ordersService.reject(orderId);
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (error) {
            console.error('Error rejecting order:', error);
        }
    };

    const activeFiltersCount =
        (dateFilter !== 'all' ? 1 : 0) +
        (statusFilter.length > 0 ? 1 : 0) +
        (partnerFilter !== '' ? 1 : 0) +
        (productTypeFilter !== '' ? 1 : 0);

    // Build profile for header
    const headerProfile = supplierProfile ? {
        name: supplierProfile.company?.tradeName || 'Minha Facção',
        rating: Number(supplierProfile.company?.avgRating) || 4.5,
        isActive: supplierProfile.company?.status === 'ACTIVE',
        capacityUsage: supplierProfile.stats?.capacityUsage || 0,
    } : undefined;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans text-gray-900 dark:text-gray-100">
            <main className="flex-1 overflow-hidden flex flex-col relative">
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 lg:px-8 shadow-sm z-30">
                    <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar pedido, marca ou ref..."
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <div ref={filterMenuRef} className="relative shrink-0">
                                <button
                                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    <Filter className="h-4 w-4" /> Filtros
                                    {activeFiltersCount > 0 && <span className="ml-1 bg-brand-600 text-white text-[10px] px-1.5 rounded-full">{activeFiltersCount}</span>}
                                </button>
                                <OrderFiltersDropdown
                                    isOpen={isFilterMenuOpen}
                                    dateFilter={dateFilter}
                                    statusFilter={statusFilter}
                                    partnerFilter={partnerFilter}
                                    productTypeFilter={productTypeFilter}
                                    partners={partners}
                                    productTypes={productTypes}
                                    onDateFilterChange={setDateFilter}
                                    onStatusFilterChange={setStatusFilter}
                                    onPartnerFilterChange={setPartnerFilter}
                                    onProductTypeFilterChange={setProductTypeFilter}
                                    onClearFilters={clearFilters}
                                    statusLabels={STATUS_COLUMNS}
                                    partnerLabel="Marca"
                                />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block"><strong>{filteredOrders.length}</strong> pedidos</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex items-center border border-gray-200 dark:border-gray-600">
                                <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600' : 'text-gray-400'}`}><List className="h-4 w-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-[1600px] mx-auto h-full flex flex-col">
                        <StatsOverview orders={orders} />
                        <div className="h-full flex-1">
                            {viewMode === 'kanban' ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start kanban-scroll">
                                    {STATUS_COLUMNS.map(col => (
                                        <div
                                            key={col.id}
                                            className="min-w-[300px] w-[300px] flex flex-col h-full bg-gray-100/50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 flex-shrink-0"
                                        >
                                            <div className="p-3 rounded-t-xl border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
                                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{col.label}</h3>
                                                <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">{ordersByStatus[col.id]?.length || 0}</span>
                                            </div>
                                            <div className="p-2 space-y-3">
                                                {ordersByStatus[col.id]?.map(order => (
                                                    <OrderCard
                                                        key={order.id}
                                                        order={order}
                                                        onClick={setSelectedOrder}
                                                        draggable={true}
                                                        onDragStart={() => { }}
                                                        onAccept={handleAcceptOrder}
                                                        onReject={handleRejectOrder}
                                                        isSupplierView={true}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <OrderListView orders={filteredOrders} onOrderClick={setSelectedOrder} />
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                    onTimelineStepToggle={handleTimelineStepToggle}
                />
            )}

            {/* Rating Modal */}
            {pendingRating && (
                <RatingModal
                    isOpen={showRatingModal}
                    onClose={() => {
                        setShowRatingModal(false);
                        setPendingRating(null);
                    }}
                    onSubmit={async (rating, comment) => {
                        await ratingsService.submitRating(pendingRating.orderId, {
                            score: rating,
                            comment: comment || undefined
                        });
                        setShowRatingModal(false);
                        setPendingRating(null);
                    }}
                    partnerName={pendingRating.partnerName}
                    partnerImage={pendingRating.partnerImage}
                    orderId={pendingRating.orderId}
                    orderDisplayId={pendingRating.orderDisplayId}
                />
            )}
        </div>
    );
};

export default SupplierKanbanDashboard;
