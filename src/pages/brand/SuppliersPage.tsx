import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suppliersService } from '../../services';
import {
    ArrowLeft, Factory, Star, Search, Filter,
    MapPin, Package, Loader2
} from 'lucide-react';

interface Supplier {
    id: string;
    tradeName: string;
    legalName: string;
    city: string;
    state: string;
    avgRating: number;
    supplierProfile?: {
        productTypes: string[];
        specialties: string[];
        monthlyCapacity: number;
        currentOccupancy: number;
    };
}

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ state: '', productType: '' });

    useEffect(() => {
        loadSuppliers();
    }, [filters]);

    const loadSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await suppliersService.search({
                state: filters.state || undefined,
                productTypes: filters.productType ? [filters.productType] : undefined,
            });
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.tradeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.legalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-brand-950">
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/brand" className="text-brand-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white">Buscar Facções</h1>
                            <p className="text-sm text-brand-400">{filteredSuppliers.length} facções disponíveis</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search & Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou cidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                        <select
                            value={filters.state}
                            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                            className="pl-11 pr-8 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos os estados</option>
                            <option value="SP">São Paulo</option>
                            <option value="SC">Santa Catarina</option>
                            <option value="PR">Paraná</option>
                            <option value="RS">Rio Grande do Sul</option>
                            <option value="MG">Minas Gerais</option>
                        </select>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="text-center py-12">
                        <Factory className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">Nenhuma facção encontrada</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSuppliers.map((supplier) => (
                            <Link
                                key={supplier.id}
                                to={`/brand/orders/new?supplierId=${supplier.id}`}
                                className="bg-brand-900/50 hover:bg-brand-800/50 border border-brand-800 rounded-2xl p-5 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-brand-800 rounded-xl flex items-center justify-center group-hover:bg-brand-700 transition-colors">
                                            <Factory className="w-6 h-6 text-brand-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{supplier.tradeName || supplier.legalName}</h3>
                                            <p className="text-xs text-brand-400 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {supplier.city}, {supplier.state}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="text-sm font-medium">{supplier.avgRating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                </div>

                                {supplier.supplierProfile && (
                                    <>
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {supplier.supplierProfile.productTypes?.slice(0, 3).map((type) => (
                                                <span
                                                    key={type}
                                                    className="px-2 py-0.5 bg-brand-800 rounded text-xs text-brand-300"
                                                >
                                                    {type}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-brand-400 flex items-center gap-1">
                                                <Package className="w-4 h-4" />
                                                {supplier.supplierProfile.monthlyCapacity?.toLocaleString()} pçs/mês
                                            </span>
                                            <span className={`font-medium ${supplier.supplierProfile.currentOccupancy > 80 ? 'text-red-400' :
                                                    supplier.supplierProfile.currentOccupancy > 50 ? 'text-amber-400' : 'text-green-400'
                                                }`}>
                                                {100 - supplier.supplierProfile.currentOccupancy}% disponível
                                            </span>
                                        </div>
                                    </>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SuppliersPage;
