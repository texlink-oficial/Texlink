import React, { useEffect, useState } from 'react';
import { adminService } from '../../services';
import {
    Building2, Search, Filter, Package,
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
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Marcas</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{brands.length} marcas registradas na plataforma</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:w-80 group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar marca ou CNPJ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                            />
                        </div>

                        {/* Filter */}
                        <div className="relative group flex-1 sm:flex-none">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                            >
                                <option value="">Todos os status</option>
                                <option value="ACTIVE">Somente Ativas</option>
                                <option value="PENDING">Somente Pendentes</option>
                                <option value="SUSPENDED">Somente Suspensas</option>
                            </select>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-24">
                        <div className="relative">
                            <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full animate-pulse" />
                            <Loader2 className="w-10 h-10 text-sky-500 animate-spin relative" />
                        </div>
                    </div>
                ) : filteredBrands.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-20 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-display">
                            {searchQuery ? 'Nenhuma marca encontrada' : 'Nenhuma marca cadastrada'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                            {searchQuery ? 'Tente ajustar sua busca ou limpar os filtros.' : 'Quando houver marcas registradas, elas aparecerão aqui.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Marca
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Identificação
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Localidade
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Pedidos
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                                    {filteredBrands.map((brand) => (
                                        <tr
                                            key={brand.id}
                                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/[0.08] rounded-xl flex items-center justify-center transition-all group-hover:border-sky-500/50 group-hover:shadow-lg group-hover:shadow-sky-500/5">
                                                        <Building2 className="w-6 h-6 text-gray-400 group-hover:text-sky-500 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-900 dark:text-white font-bold group-hover:text-sky-500 transition-colors font-display">
                                                            {brand.tradeName || brand.legalName}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                                                            Cadastrada em {brand.createdAt ? formatDate(brand.createdAt) : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <span className="text-gray-700 dark:text-gray-300 font-mono text-sm block">
                                                        {formatDocument(brand.document)}
                                                    </span>
                                                    {brand.tradeName && brand.tradeName !== brand.legalName && (
                                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block max-w-[180px]">
                                                            {brand.legalName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 dark:text-gray-200 font-medium text-sm">
                                                        {brand.city}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {brand.state}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center sm:text-left">
                                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-lg">
                                                    <Package className="w-3.5 h-3.5 text-sky-500" />
                                                    <span className="font-bold text-gray-900 dark:text-white text-xs">
                                                        {brand._count?.ordersAsBrand || brand.ordersCount || 0}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={brand.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-xl transition-all"
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
    const config: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
        ACTIVE: { label: 'Ativa', icon: CheckCircle, color: 'emerald' },
        APPROVED: { label: 'Ativa', icon: CheckCircle, color: 'emerald' },
        PENDING: { label: 'Pendente', icon: Clock, color: 'amber' },
        SUSPENDED: { label: 'Suspensa', icon: XCircle, color: 'red' },
    };

    const { label, icon: Icon, color } = config[status] || config.PENDING;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 rounded-lg text-[10px] font-bold uppercase tracking-wider`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </span>
    );
};

export default BrandsPage;
