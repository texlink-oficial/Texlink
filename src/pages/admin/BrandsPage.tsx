import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import {
    ArrowLeft, Building2, Search, Filter, Package,
    CheckCircle, Clock, XCircle, Loader2, ChevronRight,
    Mail, Phone, MapPin
} from 'lucide-react';

interface Brand {
    id: string;
    legalName: string;
    tradeName: string;
    document: string;
    email?: string;
    phone?: string;
    city: string;
    state: string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    createdAt: string;
    _count?: {
        ordersAsBrand: number;
        brandSuppliers: number;
    };
}

const BrandsPage: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadBrands();
    }, [filter]);

    const loadBrands = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getBrands(filter || undefined);
            setBrands(data);
        } catch (error) {
            console.error('Error loading brands:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredBrands = brands.filter(brand =>
        brand.tradeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.legalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.document?.includes(searchQuery)
    );

    const formatDocument = (doc: string) => {
        if (!doc) return '-';
        if (doc.length === 14) {
            return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return doc;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
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
                                <h1 className="text-xl font-bold text-white">Marcas</h1>
                                <p className="text-sm text-brand-400">{brands.length} cadastradas</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar marca..."
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
                                    <option value="ACTIVE">Ativas</option>
                                    <option value="PENDING">Pendentes</option>
                                    <option value="SUSPENDED">Suspensas</option>
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
                                placeholder="Buscar marca..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : filteredBrands.length === 0 ? (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">
                            {searchQuery ? 'Nenhuma marca encontrada para esta busca' : 'Nenhuma marca encontrada'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-brand-900/50 border border-brand-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-brand-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Marca
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            CNPJ
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Localidade
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Pedidos
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Cadastro
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-800">
                                    {filteredBrands.map((brand) => (
                                        <tr
                                            key={brand.id}
                                            className="hover:bg-brand-800/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-brand-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {brand.tradeName || brand.legalName}
                                                        </p>
                                                        {brand.tradeName && brand.tradeName !== brand.legalName && (
                                                            <p className="text-xs text-brand-500 truncate max-w-[200px]">
                                                                {brand.legalName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-brand-300 font-mono text-sm">
                                                    {formatDocument(brand.document)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-brand-300">
                                                    <MapPin className="w-4 h-4 text-brand-500" />
                                                    {brand.city}, {brand.state}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-brand-300">
                                                    <Package className="w-4 h-4 text-brand-500" />
                                                    {brand._count?.ordersAsBrand || brand.ordersCount || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={brand.status} />
                                            </td>
                                            <td className="px-6 py-4 text-brand-400 text-sm">
                                                {brand.createdAt ? formatDate(brand.createdAt) : '-'}
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; icon: React.FC<{ className?: string }>; bg: string; text: string }> = {
        ACTIVE: { label: 'Ativa', icon: CheckCircle, bg: 'bg-green-500/10', text: 'text-green-400' },
        APPROVED: { label: 'Ativa', icon: CheckCircle, bg: 'bg-green-500/10', text: 'text-green-400' },
        PENDING: { label: 'Pendente', icon: Clock, bg: 'bg-amber-500/10', text: 'text-amber-400' },
        SUSPENDED: { label: 'Suspensa', icon: XCircle, bg: 'bg-red-500/10', text: 'text-red-400' },
    };
    const { label, icon: Icon, bg, text } = config[status] || config.PENDING;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </span>
    );
};

export default BrandsPage;
