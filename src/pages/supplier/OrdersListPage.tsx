import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService, Order, OrderStatus } from '../../services';
import {
    Package, Clock, CheckCircle, XCircle, AlertCircle,
    ChevronRight, Filter, Search, ArrowLeft, FileText, Tag
} from 'lucide-react';

const OrdersListPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<OrderStatus | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [opFilter, setOpFilter] = useState('');
    const [artigoFilter, setArtigoFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'my_orders' | 'marketplace'>('my_orders');

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getSupplierOrders(filter || undefined);
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.brand?.tradeName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOp = !opFilter || (order.op?.toLowerCase().includes(opFilter.toLowerCase()));
        const matchesArtigo = !artigoFilter || (order.artigo?.toLowerCase().includes(artigoFilter.toLowerCase()));

        return matchesSearch && matchesOp && matchesArtigo;
    });

    // Segregate orders based on Tab
    const tabOrders = filteredOrders.filter(order => {
        const isInvited = order.targetSuppliers && order.targetSuppliers.length > 0;
        const isAssigned = ['ACEITO_PELA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(order.status);

        if (activeTab === 'my_orders') {
            // Show if I accepted/worked on it OR if I was explicitly invited
            return isAssigned || isInvited;
        } else {
            // Marketplace: Hybrid/Bidding orders where I am NOT invited and NOT assigned
            // Typically Open Hybrid orders
            return order.assignmentType === 'HYBRID' && !isInvited && !isAssigned && order.status === 'LANCADO_PELA_MARCA';
        }
    });

    const statusGroups = {
        pending: tabOrders.filter(o => o.status === 'LANCADO_PELA_MARCA'),
        active: tabOrders.filter(o => ['ACEITO_PELA_FACCAO', 'EM_PREPARACAO_SAIDA_MARCA', 'EM_TRANSITO_PARA_FACCAO', 'EM_PREPARACAO_ENTRADA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'EM_TRANSITO_PARA_MARCA', 'EM_REVISAO', 'PARCIALMENTE_APROVADO', 'AGUARDANDO_RETRABALHO'].includes(o.status)),
        completed: tabOrders.filter(o => o.status === 'FINALIZADO'),
    };

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Link to="/supplier" className="text-brand-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Pedidos</h1>
                                <p className="text-sm text-brand-400">Gerencie sua produção e novas oportunidades</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-brand-900/50 p-1 rounded-xl w-fit border border-brand-800">
                        <button
                            onClick={() => setActiveTab('my_orders')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'my_orders'
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                                : 'text-brand-400 hover:text-white hover:bg-brand-800/50'
                                }`}
                        >
                            Meus Pedidos ({
                                orders.filter(o => {
                                    const isInvited = o.targetSuppliers && o.targetSuppliers.length > 0;
                                    const isAssigned = ['ACEITO_PELA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(o.status);
                                    return isAssigned || isInvited;
                                }).length
                            })
                        </button>
                        <button
                            onClick={() => setActiveTab('marketplace')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'marketplace'
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                                : 'text-brand-400 hover:text-white hover:bg-brand-800/50'
                                }`}
                        >
                            <Search className="w-4 h-4" />
                            Bolsa de Pedidos ({
                                orders.filter(o => {
                                    const isInvited = o.targetSuppliers && o.targetSuppliers.length > 0;
                                    const isAssigned = ['ACEITO_PELA_FACCAO', 'EM_PRODUCAO', 'PRONTO', 'FINALIZADO', 'RECUSADO_PELA_FACCAO'].includes(o.status);
                                    return o.assignmentType === 'HYBRID' && !isInvited && !isAssigned && o.status === 'LANCADO_PELA_MARCA';
                                }).length
                            })
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                        <input
                            type="text"
                            placeholder="Buscar por ID, produto ou marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* OP Filter */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filtrar por OP..."
                            value={opFilter}
                            onChange={(e) => setOpFilter(e.target.value)}
                            className="w-full sm:w-32 px-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Artigo Filter */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filtrar por Artigo..."
                            value={artigoFilter}
                            onChange={(e) => setArtigoFilter(e.target.value)}
                            className="w-full sm:w-36 px-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as OrderStatus | '')}
                            className="pl-11 pr-8 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos os status</option>
                            <option value="LANCADO_PELA_MARCA">Pendentes</option>
                            <option value="ACEITO_PELA_FACCAO">Aceitos</option>
                            <option value="EM_PRODUCAO">Em Produção</option>
                            <option value="FINALIZADO">Finalizados</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tabOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">
                            {activeTab === 'marketplace'
                                ? 'Nenhuma oportunidade disponível no momento'
                                : 'Nenhum pedido encontrado'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Pending Orders */}
                        {statusGroups.pending.length > 0 && (
                            <OrderSection
                                title={activeTab === 'marketplace' ? "Oportunidades em Aberto" : "Aguardando Aceite"}
                                icon={<Clock className="w-5 h-5 text-amber-400" />}
                                orders={statusGroups.pending}
                                accentColor="amber"
                            />
                        )}

                        {/* Active Orders */}
                        {statusGroups.active.length > 0 && (
                            <OrderSection
                                title="Em Andamento"
                                icon={<AlertCircle className="w-5 h-5 text-blue-400" />}
                                orders={statusGroups.active}
                                accentColor="blue"
                            />
                        )}

                        {/* Completed Orders */}
                        {statusGroups.completed.length > 0 && (
                            <OrderSection
                                title="Finalizados"
                                icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                                orders={statusGroups.completed}
                                accentColor="green"
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

interface OrderSectionProps {
    title: string;
    icon: React.ReactNode;
    orders: Order[];
    accentColor: 'amber' | 'blue' | 'green';
}

const OrderSection: React.FC<OrderSectionProps> = ({ title, icon, orders, accentColor }) => {
    const borderColors = {
        amber: 'border-l-amber-500',
        blue: 'border-l-blue-500',
        green: 'border-l-green-500',
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <span className="text-sm text-brand-400">({orders.length})</span>
            </div>
            <div className="space-y-3">
                {orders.map((order) => (
                    <Link
                        key={order.id}
                        to={`/supplier/orders/${order.id}`}
                        className={`block bg-brand-900/50 hover:bg-brand-800/50 border border-brand-800 border-l-4 ${borderColors[accentColor]} rounded-xl p-4 transition-all`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-sm text-brand-300">{order.displayId}</span>
                                    <StatusBadge status={order.status} />
                                </div>
                                <h3 className="text-white font-medium mb-1">{order.productName}</h3>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    {order.op && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-brand-800/50 text-brand-300 px-2 py-0.5 rounded">
                                            <FileText className="w-3 h-3" />
                                            OP: {order.op}
                                        </span>
                                    )}
                                    {order.artigo && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-purple-800/50 text-purple-300 px-2 py-0.5 rounded">
                                            <Tag className="w-3 h-3" />
                                            {order.artigo}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-brand-400">
                                    {order.brand?.tradeName} • {order.quantity} peças
                                </p>
                            </div>
                            <div className="text-right ml-4">
                                <p className="text-lg font-bold text-white">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.totalValue))}
                                </p>
                                <p className="text-sm text-brand-400">
                                    Entrega: {new Date(order.deliveryDeadline).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-brand-400 ml-4" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        EM_NEGOCIACAO: { label: 'Em Negociação', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        EM_TRANSITO_PARA_FACCAO: { label: 'Trânsito', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
        EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Preparação', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
        EM_PRODUCAO: { label: 'Em Produção', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
        PRONTO: { label: 'Pronto', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
        EM_TRANSITO_PARA_MARCA: { label: 'Trânsito', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
        EM_REVISAO: { label: 'Em Revisão', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
        PARCIALMENTE_APROVADO: { label: 'Parcial', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
        REPROVADO: { label: 'Reprovado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        AGUARDANDO_RETRABALHO: { label: 'Retrabalho', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.color}`}>
            {config.label}
        </span>
    );
};

export default OrdersListPage;
