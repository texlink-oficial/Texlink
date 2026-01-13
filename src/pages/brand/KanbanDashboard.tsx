import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService, Order as ApiOrder, OrderStatus as ApiOrderStatus } from '../../services';
import { Order, OrderStatus } from '../../types';
import { DashboardHeader } from '../../components/kanban/DashboardHeader';
import { OrderCard } from '../../components/kanban/OrderCard';
import { OrderDetailModal } from '../../components/kanban/OrderDetailModal';
import { StatsOverview } from '../../components/kanban/StatsOverview';
import { OrderListView } from '../../components/kanban/OrderListView';
import { Filter, LayoutGrid, List, Loader2, Plus } from 'lucide-react';

// Status mapping from API to Kanban UI (Brand perspective)
const STATUS_MAP: Record<ApiOrderStatus, OrderStatus> = {
    'LANCADO_PELA_MARCA': OrderStatus.NEW,
    'ACEITO_PELA_FACCAO': OrderStatus.ACCEPTED,
    'EM_PREPARACAO_SAIDA_MARCA': OrderStatus.PREPARING_BRAND,
    'EM_TRANSITO_PARA_FACCAO': OrderStatus.TRANSIT_TO_SUPPLIER,
    'EM_PREPARACAO_ENTRADA_FACCAO': OrderStatus.RECEIVED_SUPPLIER,
    'EM_PRODUCAO': OrderStatus.PRODUCTION,
    'PRONTO': OrderStatus.READY_SEND,
    'EM_TRANSITO_PARA_MARCA': OrderStatus.TRANSIT_TO_BRAND,
    'FINALIZADO': OrderStatus.FINALIZED,
    'RECUSADO_PELA_FACCAO': OrderStatus.REJECTED,
    'DISPONIVEL_PARA_OUTRAS': OrderStatus.NEW,
};

const STATUS_COLUMNS = [
    { id: OrderStatus.NEW, label: '▪ Aguardando Facção' },
    { id: OrderStatus.ACCEPTED, label: '▪ Aceito' },
    { id: OrderStatus.PREPARING_BRAND, label: '▪ Preparando Envio' },
    { id: OrderStatus.TRANSIT_TO_SUPPLIER, label: '▪ Trânsito → Facção' },
    { id: OrderStatus.RECEIVED_SUPPLIER, label: '▪ Recebido' },
    { id: OrderStatus.PRODUCTION, label: '▪ Em Produção' },
    { id: OrderStatus.READY_SEND, label: '▪ Pronto / Envio' },
    { id: OrderStatus.TRANSIT_TO_BRAND, label: '▪ Trânsito → Marca' },
    { id: OrderStatus.FINALIZED, label: '▪ Finalizados' },
];

// Convert API order to Kanban order format (Brand perspective - uses supplier info)
const convertApiOrder = (apiOrder: ApiOrder): Order => ({
    id: apiOrder.id,
    displayId: apiOrder.displayId,
    brand: {
        id: apiOrder.supplier?.id || apiOrder.supplierId || '',
        name: apiOrder.supplier?.tradeName || 'Aguardando Facção',
        rating: Number(apiOrder.supplier?.avgRating) || 0,
        location: 'Brasil',
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(apiOrder.supplier?.tradeName || 'AF')}&background=10b981&color=fff`,
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

const BrandKanbanDashboard: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    // Load orders from API
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const apiOrders = await ordersService.getBrandOrders();
            setOrders(apiOrders.map(convertApiOrder));
        } catch (error) {
            console.error('Error loading orders:', error);
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
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
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

    const activeFiltersCount = (dateFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

    // Stats for brand
    const stats = {
        totalOrders: orders.length,
        activeOrders: orders.filter(o => !['FINALIZADO', 'RECUSADO'].includes(o.status as string)).length,
        completedOrders: orders.filter(o => o.status === OrderStatus.FINALIZED).length,
        totalSpent: orders
            .filter(o => o.status === OrderStatus.FINALIZED)
            .reduce((sum, o) => sum + o.totalValue, 0),
    };

    // Brand profile for header
    const brandProfile = {
        name: user?.name || 'Minha Marca',
        rating: 4.8,
        isActive: true,
        capacityUsage: Math.round((stats.activeOrders / Math.max(stats.totalOrders, 1)) * 100),
    };

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
                profile={brandProfile}
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
                            <Link
                                to="/brand/orders/new"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Novo Pedido
                            </Link>
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
                                                        isSupplierView={false}
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
        </div>
    );
};

export default BrandKanbanDashboard;
