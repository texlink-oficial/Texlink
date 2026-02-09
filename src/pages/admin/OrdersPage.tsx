import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import {
    ArrowLeft, Package, Search, Filter, Loader2,
    ChevronRight, Clock, CheckCircle, Truck, Factory,
    Building2, Calendar, DollarSign, AlertCircle, RefreshCw, X
} from 'lucide-react';

interface Order {
    id: string;
    displayId: string;
    status: string;
    productName: string;
    productType: string;
    quantity: number;
    totalValue: number;
    pricePerUnit: number;
    deliveryDeadline: string;
    createdAt: string;
    brand: {
        id: string;
        tradeName: string;
    };
    supplier: {
        id: string;
        tradeName: string;
    } | null;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    LANCADO_PELA_MARCA: { label: 'Aguardando Aceite', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/10' },
    EM_NEGOCIACAO: { label: 'Em Negociacao', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/10' },
    ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' },
    EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' },
    EM_TRANSITO_PARA_FACCAO: { label: 'Em Trânsito (Ida)', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/10' },
    EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Recebendo Materiais', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/10' },
    EM_PRODUCAO: { label: 'Em Produção', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-500/10' },
    PRONTO: { label: 'Pronto', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/10' },
    EM_TRANSITO_PARA_MARCA: { label: 'Em Trânsito (Volta)', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/10' },
    EM_REVISAO: { label: 'Em Revisão', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/10' },
    PARCIALMENTE_APROVADO: { label: 'Parcialmente Aprovado', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/10' },
    REPROVADO: { label: 'Reprovado', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/10' },
    AGUARDANDO_RETRABALHO: { label: 'Aguardando Retrabalho', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/10' },
    FINALIZADO: { label: 'Finalizado', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/10' },
    RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/10' },
    DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/10' },
};

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        loadOrders();
    }, [filter]);

    // Auto-refresh every 30s
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            refreshOrders();
        }, AUTO_REFRESH_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [filter]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getAllOrders(filter || undefined);
            setOrders(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshOrders = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const data = await adminService.getAllOrders(filter || undefined);
            setOrders(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error refreshing orders:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [filter]);

    const filteredOrders = orders.filter(order =>
        order.displayId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.brand?.tradeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier?.tradeName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    const isOverdue = (deadline: string, status: string) => {
        if (['FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(status)) return false;
        return new Date(deadline) < new Date();
    };

    // Calculate stats
    const stats = {
        total: orders.length,
        active: orders.filter(o => !['FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(o.status)).length,
        completed: orders.filter(o => o.status === 'FINALIZADO').length,
        overdue: orders.filter(o => isOverdue(o.deliveryDeadline, o.status)).length,
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {stats.total} pedidos gerenciados no sistema
                            {lastUpdated && (
                                <span className="ml-2 text-xs text-gray-400">
                                    Atualizado: {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={refreshOrders}
                            disabled={isRefreshing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar pedido, marca ou facção..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
                            />
                        </div>

                        <div className="relative flex-1 sm:flex-none">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
                            >
                                <option value="">Todos os status</option>
                                <option value="LANCADO_PELA_MARCA">Aguardando Aceite</option>
                                <option value="EM_PRODUCAO">Em Produção</option>
                                <option value="FINALIZADO">Finalizados</option>
                                <option value="RECUSADO_PELA_FACCAO">Recusados</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard title="Total" value={stats.total} icon={Package} color="blue" />
                    <StatCard title="Ativos" value={stats.active} icon={Clock} color="purple" />
                    <StatCard title="Finalizados" value={stats.completed} icon={CheckCircle} color="green" />
                    <StatCard title="Atrasados" value={stats.overdue} icon={AlertCircle} color="red" />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl">
                        <Package className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'Nenhum pedido encontrado para esta busca' : 'Nenhum pedido encontrado'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-white/[0.06]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Pedido
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Marca
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Facção
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Valor
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Prazo
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                                    {filteredOrders.map((order) => {
                                        const statusConfig = ORDER_STATUS_CONFIG[order.status] || {
                                            label: order.status,
                                            color: 'text-gray-400',
                                            bg: 'bg-gray-500/10'
                                        };
                                        const overdue = isOverdue(order.deliveryDeadline, order.status);

                                        return (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                                            <Package className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-900 dark:text-white font-medium font-mono text-sm leading-none mb-1">
                                                                #{order.displayId}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                                                {order.productName}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {order.brand?.tradeName || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Factory className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {order.supplier?.tradeName || (
                                                                <span className="text-amber-500 italic">Aguardando</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm text-gray-900 dark:text-white font-semibold">
                                                            {formatCurrency(order.totalValue)}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                            {order.quantity} pçs
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`flex items-center gap-1.5 text-sm ${overdue ? 'text-red-500 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(order.deliveryDeadline)}
                                                        {overdue && (
                                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors p-2 bg-gray-50 dark:bg-white/[0.05] rounded-xl border border-gray-200 dark:border-white/[0.06]"
                                                        title="Ver detalhes"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
};

// Order Detail Modal
interface OrderDetailModalProps {
    order: Order;
    onClose: () => void;
    formatCurrency: (v: number) => string;
    formatDate: (d: string) => string;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, formatCurrency, formatDate }) => {
    const statusConfig = ORDER_STATUS_CONFIG[order.status] || {
        label: order.status, color: 'text-gray-400', bg: 'bg-gray-500/10'
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-sky-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-mono">#{order.displayId}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{order.productName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Marca</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {order.brand?.tradeName || '-'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Facção</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Factory className="w-4 h-4 text-gray-400" />
                            {order.supplier?.tradeName || <span className="text-amber-500 italic">Aguardando</span>}
                        </span>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/[0.06] pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Produto</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{order.productType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Quantidade</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{order.quantity} peças</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Preço unitário</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(order.pricePerUnit)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Valor total</span>
                            <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalValue)}</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/[0.06] pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Prazo de entrega</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(order.deliveryDeadline)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Criado em</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(order.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: number;
    icon: React.FC<{ className?: string }>;
    color: 'blue' | 'purple' | 'green' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colors = {
        blue: 'from-blue-500/10 to-blue-600/5 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
        purple: 'from-purple-500/10 to-purple-600/5 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20',
        green: 'from-green-500/10 to-green-600/5 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20',
        red: 'from-red-500/10 to-red-600/5 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20',
    };

    return (
        <div className={`bg-white dark:bg-slate-900 border ${colors[color]} rounded-2xl p-4 shadow-sm transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-current opacity-10`} />
                <Icon className="w-5 h-5 absolute" />
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
};

export default OrdersPage;
