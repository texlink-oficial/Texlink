import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService, Order } from '../../services';
import { Factory, Star, Package, Loader2, MapPin, ArrowRight } from 'lucide-react';

interface PartnerSupplier {
    id: string;
    tradeName: string;
    avgRating: number;
    city: string;
    state: string;
    orderCount: number;
    lastOrderDate: string;
}

const PartnersPage: React.FC = () => {
    const [partners, setPartners] = useState<PartnerSupplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            setIsLoading(true);
            const orders = await ordersService.getBrandOrders();

            // Group orders by supplier
            const supplierMap = new Map<string, PartnerSupplier>();
            orders.forEach((order: Order) => {
                if (!order.supplier || !order.supplierId) return;

                const existing = supplierMap.get(order.supplierId);
                if (existing) {
                    existing.orderCount++;
                    if (new Date(order.createdAt) > new Date(existing.lastOrderDate)) {
                        existing.lastOrderDate = order.createdAt;
                    }
                } else {
                    supplierMap.set(order.supplierId, {
                        id: order.supplierId,
                        tradeName: order.supplier.tradeName || 'Facção',
                        avgRating: Number(order.supplier.avgRating) || 0,
                        city: '',
                        state: '',
                        orderCount: 1,
                        lastOrderDate: order.createdAt,
                    });
                }
            });

            setPartners(Array.from(supplierMap.values()).sort((a, b) => b.orderCount - a.orderCount));
        } catch (error) {
            console.error('Error loading partners:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Parceiros</h1>
                <p className="text-gray-500 dark:text-gray-400">Facções com quem você já trabalhou</p>
            </div>

            {partners.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Factory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Você ainda não tem parceiros</p>
                    <Link
                        to="/brand/faccoes"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl transition-colors"
                    >
                        Buscar Facções
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {partners.map(partner => (
                        <Link
                            key={partner.id}
                            to={`/brand/faccoes/${partner.id}`}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                        <Factory className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                            {partner.tradeName}
                                        </h3>
                                        <div className="flex items-center gap-1 text-amber-500 text-sm">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span>{partner.avgRating?.toFixed(1) || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Package className="w-4 h-4" />
                                    <span>{partner.orderCount} pedido{partner.orderCount !== 1 ? 's' : ''}</span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    Último: {new Date(partner.lastOrderDate).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PartnersPage;
