import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Factory,
    Star,
    Package,
    Filter,
    Search,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    Building2,
    Users,
    FileText,
    Pause,
    Eye,
    MoreVertical,
    Plus,
    TrendingUp,
    MapPin,
    AlertCircle,
} from 'lucide-react';
import { adminService } from '../../services';
import { relationshipsService } from '../../services';
import type { SupplierBrandRelationship, RelationshipStatus } from '../../types/relationships';

interface PoolSupplier {
    id: string;
    tradeName: string;
    legalName: string;
    document: string;
    city: string;
    state: string;
    avgRating: number;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    supplierProfile?: {
        productTypes: string[];
        specialties: string[];
        monthlyCapacity: number;
        currentOccupancy: number;
        onboardingComplete: boolean;
    };
    onboarding?: {
        isCompleted: boolean;
        completedAt?: string;
    };
    _count: {
        ordersAsSupplier: number;
    };
    relationships?: SupplierBrandRelationship[];
}

interface PoolStats {
    total: number;
    onboarded: number;
    withBrands: number;
    available: number;
}

const SuppliersPoolPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<PoolSupplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<string>('');
    const [selectedSupplier, setSelectedSupplier] = useState<PoolSupplier | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [supplierRelationships, setSupplierRelationships] = useState<SupplierBrandRelationship[]>(
        []
    );
    const [loadingRelationships, setLoadingRelationships] = useState(false);

    const [stats, setStats] = useState<PoolStats>({
        total: 0,
        onboarded: 0,
        withBrands: 0,
        available: 0,
    });

    useEffect(() => {
        loadSuppliers();
    }, [filter]);

    const loadSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getSuppliers(filter || undefined);
            setSuppliers(data);

            // Calculate stats
            const total = data.length;
            const onboarded = data.filter((s: PoolSupplier) => s.onboarding?.isCompleted).length;
            const withBrands = data.filter(
                (s: PoolSupplier) => (s.relationships?.length || 0) > 0
            ).length;
            const available = onboarded - withBrands;

            setStats({
                total,
                onboarded,
                withBrands,
                available: available > 0 ? available : 0,
            });
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = async (supplier: PoolSupplier) => {
        setSelectedSupplier(supplier);
        setShowDetailsModal(true);
        setLoadingRelationships(true);

        try {
            const relationships = await relationshipsService.getBySupplier(supplier.id);
            setSupplierRelationships(relationships);
        } catch (error) {
            console.error('Error loading relationships:', error);
            setSupplierRelationships([]);
        } finally {
            setLoadingRelationships(false);
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

    const filteredSuppliers = suppliers.filter((s) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            s.tradeName?.toLowerCase().includes(term) ||
            s.legalName?.toLowerCase().includes(term) ||
            s.document?.includes(term) ||
            s.city?.toLowerCase().includes(term)
        );
    });

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; bgColor: string; textColor: string }> = {
            ACTIVE: {
                label: 'Ativo',
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                textColor: 'text-green-700 dark:text-green-400',
            },
            PENDING: {
                label: 'Pendente',
                bgColor: 'bg-amber-100 dark:bg-amber-900/30',
                textColor: 'text-amber-700 dark:text-amber-400',
            },
            SUSPENDED: {
                label: 'Suspenso',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                textColor: 'text-red-700 dark:text-red-400',
            },
        };
        const config = configs[status] || configs.PENDING;
        return (
            <span
                className={`px-2 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}
            >
                {config.label}
            </span>
        );
    };

    const getRelationshipStatusBadge = (status: RelationshipStatus) => {
        const configs: Record<RelationshipStatus, { label: string; color: string }> = {
            PENDING: { label: 'Pendente', color: 'text-gray-500' },
            CONTRACT_PENDING: { label: 'Contrato Pendente', color: 'text-amber-500' },
            ACTIVE: { label: 'Ativo', color: 'text-green-500' },
            SUSPENDED: { label: 'Suspenso', color: 'text-red-500' },
            TERMINATED: { label: 'Encerrado', color: 'text-gray-400' },
        };
        const config = configs[status];
        return <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>;
    };

    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <div className="bg-brand-900/50 border border-brand-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-brand-400">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="text-brand-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Pool de Facções</h1>
                                <p className="text-sm text-brand-400">
                                    Gerenciamento global de fornecedores
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={Factory}
                        label="Total de Facções"
                        value={stats.total}
                        color="bg-brand-800 text-brand-400"
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Onboarding Completo"
                        value={stats.onboarded}
                        color="bg-green-900/50 text-green-400"
                    />
                    <StatCard
                        icon={Building2}
                        label="Com Marcas"
                        value={stats.withBrands}
                        color="bg-blue-900/50 text-blue-400"
                    />
                    <StatCard
                        icon={Users}
                        label="Disponíveis"
                        value={stats.available}
                        color="bg-amber-900/50 text-amber-400"
                    />
                </div>

                {/* Filters */}
                <div className="bg-brand-900/50 border border-brand-800 rounded-xl p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, CNPJ, cidade..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-brand-800 border border-brand-700 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative w-full lg:w-56">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 pointer-events-none" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-brand-800 border border-brand-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="">Todos os status</option>
                                <option value="ACTIVE">Ativas</option>
                                <option value="PENDING">Pendentes</option>
                                <option value="SUSPENDED">Suspensas</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Suppliers Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="bg-brand-900/50 border border-brand-800 rounded-2xl p-12 text-center">
                        <Factory className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Nenhuma facção encontrada
                        </h3>
                        <p className="text-brand-400">
                            {searchTerm || filter
                                ? 'Tente ajustar os filtros de busca'
                                : 'Nenhuma facção cadastrada no sistema'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredSuppliers.map((supplier) => (
                            <div
                                key={supplier.id}
                                className="bg-brand-900/50 border border-brand-800 rounded-2xl p-5 hover:border-brand-700 transition-all"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                            <Factory className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">
                                                {supplier.tradeName || supplier.legalName}
                                            </h3>
                                            <p className="text-xs text-brand-400">
                                                {supplier.document}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(supplier.status)}
                                </div>

                                {/* Location */}
                                {(supplier.city || supplier.state) && (
                                    <div className="flex items-center gap-2 text-sm text-brand-300 mb-3">
                                        <MapPin className="w-4 h-4 text-brand-400" />
                                        {[supplier.city, supplier.state].filter(Boolean).join(', ')}
                                    </div>
                                )}

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 text-sm text-brand-300 mb-4">
                                    {supplier.avgRating && (
                                        <span className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-400" />
                                            {supplier.avgRating.toFixed(1)}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        {supplier._count?.ordersAsSupplier || 0} pedidos
                                    </span>
                                </div>

                                {/* Onboarding Status */}
                                <div
                                    className={`flex items-center gap-2 text-sm mb-4 ${
                                        supplier.onboarding?.isCompleted
                                            ? 'text-green-400'
                                            : 'text-amber-400'
                                    }`}
                                >
                                    {supplier.onboarding?.isCompleted ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Onboarding completo</span>
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-4 h-4" />
                                            <span>Onboarding pendente</span>
                                        </>
                                    )}
                                </div>

                                {/* Specialties */}
                                {supplier.supplierProfile?.specialties &&
                                    supplier.supplierProfile.specialties.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {supplier.supplierProfile.specialties
                                                .slice(0, 3)
                                                .map((spec, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-0.5 bg-brand-800 rounded text-xs text-brand-300"
                                                    >
                                                        {spec}
                                                    </span>
                                                ))}
                                            {supplier.supplierProfile.specialties.length > 3 && (
                                                <span className="px-2 py-0.5 text-brand-400 text-xs">
                                                    +{supplier.supplierProfile.specialties.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleViewDetails(supplier)}
                                        className="flex-1 py-2 text-sm bg-brand-800 hover:bg-brand-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalhes
                                    </button>
                                    {supplier.status === 'ACTIVE' ? (
                                        <button
                                            onClick={() =>
                                                handleStatusChange(supplier.id, 'SUSPENDED')
                                            }
                                            className="py-2 px-4 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors"
                                        >
                                            <Pause className="w-4 h-4" />
                                        </button>
                                    ) : supplier.status === 'SUSPENDED' ? (
                                        <button
                                            onClick={() => handleStatusChange(supplier.id, 'ACTIVE')}
                                            className="py-2 px-4 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Details Modal */}
            {showDetailsModal && selectedSupplier && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-900 border border-brand-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-brand-800">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                        <Factory className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {selectedSupplier.tradeName ||
                                                selectedSupplier.legalName}
                                        </h2>
                                        <p className="text-sm text-brand-400">
                                            {selectedSupplier.document}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-brand-400 hover:text-white"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-brand-800/50 rounded-xl p-4">
                                    <p className="text-xs text-brand-400 mb-1">Localização</p>
                                    <p className="text-white">
                                        {[selectedSupplier.city, selectedSupplier.state]
                                            .filter(Boolean)
                                            .join(', ') || 'Não informado'}
                                    </p>
                                </div>
                                <div className="bg-brand-800/50 rounded-xl p-4">
                                    <p className="text-xs text-brand-400 mb-1">Status</p>
                                    {getStatusBadge(selectedSupplier.status)}
                                </div>
                                <div className="bg-brand-800/50 rounded-xl p-4">
                                    <p className="text-xs text-brand-400 mb-1">Avaliação Média</p>
                                    <div className="flex items-center gap-1 text-white">
                                        <Star className="w-4 h-4 text-amber-400" />
                                        {selectedSupplier.avgRating?.toFixed(1) || 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-brand-800/50 rounded-xl p-4">
                                    <p className="text-xs text-brand-400 mb-1">Total de Pedidos</p>
                                    <p className="text-white">
                                        {selectedSupplier._count?.ordersAsSupplier || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Onboarding Status */}
                            <div
                                className={`rounded-xl p-4 ${
                                    selectedSupplier.onboarding?.isCompleted
                                        ? 'bg-green-900/30 border border-green-800'
                                        : 'bg-amber-900/30 border border-amber-800'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {selectedSupplier.onboarding?.isCompleted ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                            <span className="text-green-300 font-medium">
                                                Onboarding Completo
                                            </span>
                                            {selectedSupplier.onboarding.completedAt && (
                                                <span className="text-green-400 text-sm ml-auto">
                                                    {new Date(
                                                        selectedSupplier.onboarding.completedAt
                                                    ).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-5 h-5 text-amber-400" />
                                            <span className="text-amber-300 font-medium">
                                                Onboarding Pendente
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Relationships Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-brand-400" />
                                    Marcas Vinculadas
                                </h3>

                                {loadingRelationships ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                                    </div>
                                ) : supplierRelationships.length === 0 ? (
                                    <div className="bg-brand-800/50 rounded-xl p-6 text-center">
                                        <Building2 className="w-8 h-8 text-brand-400 mx-auto mb-2" />
                                        <p className="text-brand-300">
                                            Nenhuma marca vinculada a esta facção
                                        </p>
                                        <p className="text-brand-400 text-sm mt-1">
                                            Facção disponível para credenciamento
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {supplierRelationships.map((rel) => (
                                            <div
                                                key={rel.id}
                                                className="bg-brand-800/50 rounded-xl p-4 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-brand-700 rounded-lg flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-brand-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {rel.brand?.tradeName ||
                                                                rel.brand?.legalName ||
                                                                'Marca'}
                                                        </p>
                                                        <p className="text-xs text-brand-400">
                                                            Desde{' '}
                                                            {new Date(
                                                                rel.createdAt
                                                            ).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {getRelationshipStatusBadge(rel.status)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Specialties */}
                            {selectedSupplier.supplierProfile?.specialties &&
                                selectedSupplier.supplierProfile.specialties.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-brand-300 mb-3">
                                            Especialidades
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSupplier.supplierProfile.specialties.map(
                                                (spec, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-1 bg-brand-800 rounded-lg text-sm text-brand-200"
                                                    >
                                                        {spec}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-brand-800">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full py-3 bg-brand-800 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersPoolPage;
