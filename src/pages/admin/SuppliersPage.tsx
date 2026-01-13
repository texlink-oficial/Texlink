import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import {
    ArrowLeft, Factory, Star, Package, Filter,
    CheckCircle, Clock, XCircle, Loader2
} from 'lucide-react';

interface Supplier {
    id: string;
    tradeName: string;
    legalName: string;
    city: string;
    state: string;
    avgRating: number;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    supplierProfile?: {
        productTypes: string[];
        monthlyCapacity: number;
        onboardingComplete: boolean;
    };
    _count: { ordersAsSupplier: number };
}

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');

    useEffect(() => {
        loadSuppliers();
    }, [filter]);

    const loadSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getSuppliers(filter || undefined);
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
        try {
            await adminService.updateSupplierStatus(id, status);
            loadSuppliers();
        } catch (error) {
            console.error('Error updating status:', error);
        }
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
                                <h1 className="text-xl font-bold text-white">Facções</h1>
                                <p className="text-sm text-brand-400">{suppliers.length} cadastradas</p>
                            </div>
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-11 pr-8 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="">Todos</option>
                                <option value="ACTIVE">Ativas</option>
                                <option value="PENDING">Pendentes</option>
                                <option value="SUSPENDED">Suspensas</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="text-center py-12">
                        <Factory className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">Nenhuma facção encontrada</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.map((supplier) => (
                            <div
                                key={supplier.id}
                                className="bg-brand-900/50 border border-brand-800 rounded-2xl p-5"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center">
                                            <Factory className="w-5 h-5 text-brand-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{supplier.tradeName || supplier.legalName}</h3>
                                            <p className="text-xs text-brand-400">{supplier.city}, {supplier.state}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={supplier.status} />
                                </div>

                                <div className="flex items-center gap-4 text-sm text-brand-300 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-400" />
                                        {supplier.avgRating?.toFixed(1) || 'N/A'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        {supplier._count?.ordersAsSupplier || 0} pedidos
                                    </span>
                                </div>

                                {supplier.supplierProfile?.productTypes && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {supplier.supplierProfile.productTypes.slice(0, 3).map((type) => (
                                            <span
                                                key={type}
                                                className="px-2 py-0.5 bg-brand-800 rounded text-xs text-brand-300"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {supplier.status === 'ACTIVE' ? (
                                        <button
                                            onClick={() => handleStatusChange(supplier.id, 'SUSPENDED')}
                                            className="flex-1 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors"
                                        >
                                            Suspender
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStatusChange(supplier.id, 'ACTIVE')}
                                            className="flex-1 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors"
                                        >
                                            Ativar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { icon: React.FC<{ className?: string }>; color: string }> = {
        ACTIVE: { icon: CheckCircle, color: 'text-green-400' },
        PENDING: { icon: Clock, color: 'text-amber-400' },
        SUSPENDED: { icon: XCircle, color: 'text-red-400' },
    };
    const { icon: Icon, color } = config[status] || config.PENDING;
    return <Icon className={`w-5 h-5 ${color}`} />;
};

export default SuppliersPage;
