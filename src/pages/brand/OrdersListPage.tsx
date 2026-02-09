import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService, Order, OrderStatus } from '../../services';
import {
    Package, Clock, CheckCircle, Plus,
    ChevronRight, Filter, Search, ArrowLeft, Paperclip
} from 'lucide-react';

const OrdersListPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<OrderStatus | ''>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getBrandOrders(filter || undefined);
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredOrders = orders.filter(order =>
        order.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier?.tradeName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/brand" className="text-brand-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Meus Pedidos</h1>
                                <p className="text-sm text-brand-400">{orders.length} pedidos</p>
                            </div>
                        </div>

                        <Link
                            to="/brand/orders/new"
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-medium rounded-xl transition-all hover:from-brand-500 hover:to-brand-400"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Pedido
                        </Link>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                        <input
                            type="text"
                            placeholder="Buscar por ID, produto ou facção..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as OrderStatus | '')}
                            className="pl-11 pr-8 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos os status</option>
                            <option value="LANCADO_PELA_MARCA">Aguardando Aceite</option>
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
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300 mb-4">Nenhum pedido encontrado</p>
                        <Link
                            to="/brand/orders/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Criar Primeiro Pedido
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map((order) => (
                            <Link
                                key={order.id}
                                to={`/brand/orders/${order.id}`}
                                className="block bg-brand-900/50 hover:bg-brand-800/50 border border-brand-800 rounded-xl p-4 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono text-sm text-brand-300">{order.displayId}</span>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <h3 className="text-white font-medium mb-1">{order.productName}</h3>
                                        <p className="text-sm text-brand-400">
                                            {order.supplier?.tradeName || 'Aguardando facção'} • {order.quantity} peças
                                        </p>
                                    </div>

                                    {order.attachments && order.attachments.length > 0 && (
                                        <div className="flex items-center gap-1.5 bg-brand-800 text-brand-300 px-3 py-1.5 rounded-lg mx-4" title={`${order.attachments.length} anexo(s)`}>
                                            <Paperclip className="w-4 h-4" />
                                            <span className="text-sm font-medium">{order.attachments.length}</span>
                                        </div>
                                    )}

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
                )}
            </main>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-500/20 text-amber-400' },
        DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'bg-amber-500/20 text-amber-400' },
        RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'bg-red-500/20 text-red-400' },
        EM_NEGOCIACAO: { label: 'Em Negociação', color: 'bg-indigo-500/20 text-indigo-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-500/20 text-blue-400' },
        EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'bg-blue-500/20 text-blue-400' },
        EM_TRANSITO_PARA_FACCAO: { label: 'Trânsito', color: 'bg-cyan-500/20 text-cyan-400' },
        EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Preparação', color: 'bg-teal-500/20 text-teal-400' },
        EM_PRODUCAO: { label: 'Em Produção', color: 'bg-purple-500/20 text-purple-400' },
        PRONTO: { label: 'Pronto', color: 'bg-cyan-500/20 text-cyan-400' },
        EM_TRANSITO_PARA_MARCA: { label: 'Trânsito', color: 'bg-sky-500/20 text-sky-400' },
        EM_REVISAO: { label: 'Em Revisão', color: 'bg-orange-500/20 text-orange-400' },
        PARCIALMENTE_APROVADO: { label: 'Parcial', color: 'bg-yellow-500/20 text-yellow-400' },
        REPROVADO: { label: 'Reprovado', color: 'bg-red-500/20 text-red-400' },
        AGUARDANDO_RETRABALHO: { label: 'Retrabalho', color: 'bg-orange-500/20 text-orange-400' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-500/20 text-green-400' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-400' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
};

export default OrdersListPage;
