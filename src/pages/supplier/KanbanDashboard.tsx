import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService, suppliersService, ratingsService, Order as ApiOrder, OrderStatus as ApiOrderStatus, SupplierDashboard, PendingRating } from '../../services';
import { Order, OrderStatus } from '../../types';
import { DashboardHeader } from '../../components/kanban/DashboardHeader';
import { OrderCard } from '../../components/kanban/OrderCard';
import { OrderDetailModal } from '../../components/kanban/OrderDetailModal';
import { StatsOverview } from '../../components/kanban/StatsOverview';
import { OrderListView } from '../../components/kanban/OrderListView';
import { RatingModal } from '../../components/ratings/RatingModal';
import { Filter, LayoutGrid, List, Loader2 } from 'lucide-react';

// Status mapping from API to Kanban UI
const STATUS_MAP: Record<ApiOrderStatus, OrderStatus> = {
    'LANCADO_PELA_MARCA': OrderStatus.NEW,
    'ACEITO_PELA_FACCAO': OrderStatus.NEGOTIATION,
    'EM_PREPARACAO_SAIDA_MARCA': OrderStatus.WAITING,
    'EM_PREPARACAO_ENTRADA_FACCAO': OrderStatus.WAITING,
    'EM_PRODUCAO': OrderStatus.PRODUCTION,
    'PRONTO': OrderStatus.READY_SEND,
    'FINALIZADO': OrderStatus.FINALIZED,
    'RECUSADO_PELA_FACCAO': OrderStatus.REJECTED,
    'DISPONIVEL_PARA_OUTRAS': OrderStatus.NEW,
};

const REVERSE_STATUS_MAP: Record<OrderStatus, ApiOrderStatus> = {
    [OrderStatus.NEW]: 'LANCADO_PELA_MARCA',
    [OrderStatus.NEGOTIATION]: 'ACEITO_PELA_FACCAO',
    [OrderStatus.WAITING]: 'EM_PREPARACAO_SAIDA_MARCA',
    [OrderStatus.PRODUCTION]: 'EM_PRODUCAO',
    [OrderStatus.READY_SEND]: 'PRONTO',
    [OrderStatus.TRANSIT_TO_BRAND]: 'PRONTO',
    [OrderStatus.FINALIZED]: 'FINALIZADO',
    [OrderStatus.REJECTED]: 'RECUSADO_PELA_FACCAO',
};

const STATUS_COLUMNS = [
    { id: OrderStatus.NEW, label: '▪ Novos Pedidos' },
    { id: OrderStatus.NEGOTIATION, label: '▪ Em Negociação' },
    { id: OrderStatus.WAITING, label: '▪ Aguardando' },
    { id: OrderStatus.PRODUCTION, label: '▪ Em Produção' },
    { id: OrderStatus.READY_SEND, label: '▪ Pronto / Envio' },
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
        { step: 'Pedido Recebido', completed: true, date: new Date(apiOrder.createdAt).toLocaleDateString('pt-BR') },
        { step: 'Em Produção', completed: apiOrder.status === 'EM_PRODUCAO' || apiOrder.status === 'PRONTO' || apiOrder.status === 'FINALIZADO' },
        { step: 'Pronto para Envio', completed: apiOrder.status === 'PRONTO' || apiOrder.status === 'FINALIZADO' },
        { step: 'Finalizado', completed: apiOrder.status === 'FINALIZADO' },
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
            return matchesSearch && matchesDate;
        });
    }, [orders, searchQuery, dateFilter]);

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
                o.id === orderId ? { ...o, status: OrderStatus.NEGOTIATION } : o
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

    const activeFiltersCount = (dateFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

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
            <DashboardHeader
                toggleMobileMenu={() => { }}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                profile={headerProfile}
            />

            <main className="flex-1 overflow-hidden flex flex-col relative">
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 lg:px-8 shadow-sm z-30">
                    <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div ref={filterMenuRef} className="relative shrink-0">
                                <button
                                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 border border-transparent hover:bg-gray-200"
                                >
                                    <Filter className="h-4 w-4" /> Filtros
                                    {activeFiltersCount > 0 && <span className="ml-1 bg-brand-600 text-white text-[10px] px-1.5 rounded-full">{activeFiltersCount}</span>}
                                </button>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400"><strong>{filteredOrders.length}</strong> pedidos</span>
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
                                <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start no-scrollbar">
                                    {STATUS_COLUMNS.map(col => (
                                        <div
                                            key={col.id}
                                            className="min-w-[280px] w-[280px] flex flex-col h-full bg-gray-100/50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 flex-shrink-0"
                                        >
                                            <div className="p-3 rounded-t-xl border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
                                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{col.label}</h3>
                                                <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">{ordersByStatus[col.id]?.length || 0}</span>
                                            </div>
                                            <div className="p-2 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
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
