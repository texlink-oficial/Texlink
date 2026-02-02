import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import {
    ArrowLeft, Package, Search, Filter, Loader2,
    ChevronRight, Clock, CheckCircle, Truck, Factory,
    Building2, Calendar, DollarSign, AlertCircle
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
    LANCADO_PELA_MARCA: { label: 'Aguardando Aceite', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    EM_TRANSITO_PARA_FACCAO: { label: 'Em Trânsito (Ida)', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Recebendo Materiais', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    EM_PRODUCAO: { label: 'Em Produção', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    PRONTO: { label: 'Pronto', color: 'text-green-400', bg: 'bg-green-500/10' },
    EM_TRANSITO_PARA_MARCA: { label: 'Em Trânsito (Volta)', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    EM_REVISAO: { label: 'Em Revisão', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    PARCIALMENTE_APROVADO: { label: 'Parcialmente Aprovado', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    REPROVADO: { label: 'Reprovado', color: 'text-red-400', bg: 'bg-red-500/10' },
    AGUARDANDO_RETRABALHO: { label: 'Aguardando Retrabalho', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    FINALIZADO: { label: 'Finalizado', color: 'text-green-400', bg: 'bg-green-500/10' },
    RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'text-red-400', bg: 'bg-red-500/10' },
    DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getAllOrders(filter || undefined);
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
        <div className="min-h-screen bg-brand-950">
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="text-brand-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Pedidos</h1>
                                <p className="text-sm text-brand-400">{stats.total} pedidos na plataforma</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar pedido..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
                                />
                            </div>

                            {/* Filter */}
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="pl-11 pr-8 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="">Todos</option>
                                    <option value="LANCADO_PELA_MARCA">Aguardando Aceite</option>
                                    <option value="EM_PRODUCAO">Em Produção</option>
                                    <option value="FINALIZADO">Finalizados</option>
                                    <option value="RECUSADO_PELA_FACCAO">Recusados</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Search */}
                    <div className="mt-4 md:hidden">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                            <input
                                type="text"
                                placeholder="Buscar pedido..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Total" value={stats.total} icon={Package} color="blue" />
                    <StatCard title="Ativos" value={stats.active} icon={Clock} color="purple" />
                    <StatCard title="Finalizados" value={stats.completed} icon={CheckCircle} color="green" />
                    <StatCard title="Atrasados" value={stats.overdue} icon={AlertCircle} color="red" />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">
                            {searchQuery ? 'Nenhum pedido encontrado para esta busca' : 'Nenhum pedido encontrado'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-brand-900/50 border border-brand-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-brand-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Pedido
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Marca
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Facção
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Valor
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Prazo
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-800">
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
                                                className="hover:bg-brand-800/30 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center">
                                                            <Package className="w-5 h-5 text-brand-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium font-mono text-sm">
                                                                {order.displayId}
                                                            </p>
                                                            <p className="text-xs text-brand-500 truncate max-w-[150px]">
                                                                {order.productName}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-brand-500" />
                                                        <span className="text-brand-300">
                                                            {order.brand?.tradeName || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Factory className="w-4 h-4 text-brand-500" />
                                                        <span className="text-brand-300">
                                                            {order.supplier?.tradeName || (
                                                                <span className="text-amber-400 italic">Aguardando</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {formatCurrency(order.totalValue)}
                                                        </p>
                                                        <p className="text-xs text-brand-500">
                                                            {order.quantity} pçs
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-400' : 'text-brand-300'}`}>
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(order.deliveryDeadline)}
                                                        {overdue && (
                                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        className="text-brand-400 hover:text-white transition-colors p-2"
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
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
        green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
        red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-xl border p-4`}>
            <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-brand-300">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

export default OrdersPage;
