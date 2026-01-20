import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { suppliersService, ordersService, Order } from '../../services';
import {
    ArrowLeft, Factory, Star, MapPin, Package,
    Loader2, Calendar, Clock, Phone, Mail,
    CheckCircle, TrendingUp
} from 'lucide-react';

interface SupplierDetail {
    id: string;
    tradeName: string;
    legalName: string;
    city: string;
    state: string;
    phone?: string;
    email?: string;
    avgRating: number;
    supplierProfile?: {
        productTypes: string[];
        specialties: string[];
        monthlyCapacity: number;
        currentOccupancy: number;
    };
}

const SupplierProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            // Load supplier details
            const suppliers = await suppliersService.search({});
            const found = suppliers.find((s: any) => s.id === id);
            setSupplier(found || null);

            // Load order history with this supplier
            const orders = await ordersService.getBrandOrders();
            setOrderHistory(orders.filter((o: Order) => o.supplierId === id));
        } catch (error) {
            console.error('Error loading data:', error);
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

    if (!supplier) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Facção não encontrada</p>
            </div>
        );
    }

    const completedOrders = orderHistory.filter(o => o.status === 'FINALIZADO').length;
    const availability = 100 - (supplier.supplierProfile?.currentOccupancy || 0);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/brand/faccoes" className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.tradeName || supplier.legalName}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {supplier.city}, {supplier.state}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            {supplier.avgRating?.toFixed(1) || 'N/A'}
                        </span>
                    </div>
                </div>
                <Link
                    to={`/brand/pedidos/novo?supplierId=${supplier.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-xl transition-all"
                >
                    <Package className="h-4 w-4" />
                    Criar Pedido
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<TrendingUp className="h-5 w-5" />}
                            label="Disponibilidade"
                            value={`${availability}%`}
                            color={availability > 50 ? 'green' : availability > 20 ? 'amber' : 'red'}
                        />
                        <StatCard
                            icon={<Package className="h-5 w-5" />}
                            label="Capacidade/Mês"
                            value={`${(supplier.supplierProfile?.monthlyCapacity || 0).toLocaleString()}`}
                            color="brand"
                        />
                        <StatCard
                            icon={<CheckCircle className="h-5 w-5" />}
                            label="Pedidos Concluídos"
                            value={completedOrders}
                            color="blue"
                        />
                        <StatCard
                            icon={<Star className="h-5 w-5" />}
                            label="Avaliação"
                            value={supplier.avgRating?.toFixed(1) || 'N/A'}
                            color="amber"
                        />
                    </div>

                    {/* Specialties */}
                    {supplier.supplierProfile && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Especialidades</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tipos de Produto</p>
                                    <div className="flex flex-wrap gap-2">
                                        {supplier.supplierProfile.productTypes?.map(type => (
                                            <span key={type} className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {supplier.supplierProfile.specialties?.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Especialidades</p>
                                        <div className="flex flex-wrap gap-2">
                                            {supplier.supplierProfile.specialties.map(spec => (
                                                <span key={spec} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order History */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Histórico de Pedidos ({orderHistory.length})
                        </h2>
                        {orderHistory.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                Nenhum pedido com esta facção ainda
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {orderHistory.slice(0, 10).map(order => (
                                    <Link
                                        key={order.id}
                                        to={`/brand/pedidos/${order.id}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Package className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {order.displayId}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {order.productName} • {order.quantity} pçs
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contato</h2>
                        <div className="space-y-3">
                            {supplier.phone && (
                                <a href={`tel:${supplier.phone}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-brand-500">
                                    <Phone className="w-5 h-5" />
                                    <span>{supplier.phone}</span>
                                </a>
                            )}
                            {supplier.email && (
                                <a href={`mailto:${supplier.email}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-brand-500">
                                    <Mail className="w-5 h-5" />
                                    <span className="truncate">{supplier.email}</span>
                                </a>
                            )}
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                <MapPin className="w-5 h-5" />
                                <span>{supplier.city}, {supplier.state}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action */}
                    <Link
                        to={`/brand/pedidos/novo?supplierId=${supplier.id}`}
                        className="block w-full text-center py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-2xl transition-all shadow-sm"
                    >
                        Criar Pedido para esta Facção
                    </Link>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => {
    const colorClasses: Record<string, string> = {
        brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
                {icon}
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string }> = {
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        EM_PRODUCAO: { label: 'Produção', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    };
    const { label, color } = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-lg ${color}`}>{label}</span>;
};

export default SupplierProfilePage;
