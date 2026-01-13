import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suppliersService, ordersService, Order } from '../../services';
import {
    ArrowLeft, Package, Clock, DollarSign,
    Calendar, Building2, ChevronRight, Loader2
} from 'lucide-react';

const OpportunitiesPage: React.FC = () => {
    const [opportunities, setOpportunities] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOpportunities();
    }, []);

    const loadOpportunities = async () => {
        try {
            const data = await suppliersService.getOpportunities();
            setOpportunities(data);
        } catch (error) {
            console.error('Error loading opportunities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (orderId: string) => {
        try {
            await ordersService.accept(orderId);
            // Remove from list after accepting
            setOpportunities(prev => prev.filter(o => o.id !== orderId));
        } catch (error) {
            console.error('Error accepting order:', error);
        }
    };

    return (
        <div className="min-h-screen bg-brand-950">
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/supplier" className="text-brand-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white">Novas Oportunidades</h1>
                            <p className="text-sm text-brand-400">{opportunities.length} pedidos disponíveis</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : opportunities.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">Nenhuma oportunidade disponível no momento</p>
                        <p className="text-brand-400 text-sm mt-2">Volte mais tarde para ver novos pedidos</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {opportunities.map((order) => (
                            <div
                                key={order.id}
                                className="bg-brand-900/50 border border-brand-800 rounded-2xl p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono text-sm text-brand-300">{order.displayId}</span>
                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md text-xs font-medium">
                                                {order.assignmentType === 'DIRECT' ? 'Direto' : 'Licitação'}
                                            </span>
                                        </div>
                                        <h3 className="text-white font-semibold text-lg">{order.productName}</h3>
                                        <p className="text-brand-400 text-sm">{order.productType} • {order.productCategory || 'Geral'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-brand-400" />
                                        <span className="text-brand-300">{order.brand?.tradeName}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <InfoItem icon={Package} label="Quantidade" value={`${order.quantity} pçs`} />
                                    <InfoItem icon={DollarSign} label="Valor Unit." value={formatCurrency(Number(order.pricePerUnit))} />
                                    <InfoItem icon={DollarSign} label="Total" value={formatCurrency(Number(order.totalValue))} highlight />
                                    <InfoItem icon={Calendar} label="Entrega" value={formatDate(order.deliveryDeadline)} />
                                </div>

                                {order.description && (
                                    <p className="text-brand-400 text-sm mb-4">{order.description}</p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAccept(order.id)}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                                    >
                                        Aceitar Pedido
                                    </button>
                                    <Link
                                        to={`/supplier/orders/${order.id}`}
                                        className="px-6 py-3 bg-brand-800 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                                    >
                                        Ver Detalhes
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

interface InfoItemProps {
    icon: React.FC<{ className?: string }>;
    label: string;
    value: string;
    highlight?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, highlight }) => (
    <div className={`p-3 rounded-xl ${highlight ? 'bg-brand-600/20 border border-brand-500/30' : 'bg-brand-800/50'}`}>
        <Icon className={`w-4 h-4 mb-1 ${highlight ? 'text-brand-400' : 'text-brand-500'}`} />
        <p className="text-xs text-brand-400">{label}</p>
        <p className={`font-semibold ${highlight ? 'text-brand-300' : 'text-white'}`}>{value}</p>
    </div>
);

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

export default OpportunitiesPage;
