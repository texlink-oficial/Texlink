import React, { useEffect, useState, useRef } from 'react';
import {
    Factory, Star, Package, Filter,
    CheckCircle, Clock, XCircle, Loader2,
    Search, MapPin, ChevronRight, RefreshCw,
    MoreVertical, Eye, Edit3, Power, Trash2, UserPlus
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useToast } from '../../contexts/ToastContext';
import CompanyDetailsModal from '../../components/admin/CompanyDetailsModal';
import EditCompanyModal from '../../components/admin/EditCompanyModal';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal';
import AdminRegisterCompanyModal from '../../components/admin/AdminRegisterCompanyModal';

interface Supplier {
    id: string;
    tradeName: string;
    legalName: string;
    document: string;
    email?: string;
    phone?: string;
    city: string;
    state: string;
    avgRating: number | string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    createdAt: string;
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [openActionId, setOpenActionId] = useState<string | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toast = useToast();

    useEffect(() => {
        loadSuppliers();
    }, [selectedStatus]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenActionId(null);
            }
        };
        if (openActionId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openActionId]);

    const loadSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getSuppliers(selectedStatus || undefined);
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (reason?: string) => {
        if (!selectedSupplier) return;
        const newStatus = selectedSupplier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            await adminService.updateCompanyStatus(selectedSupplier.id, newStatus, reason);
            toast.success('Status atualizado', `Facção ${newStatus === 'ACTIVE' ? 'ativada' : 'suspensa'} com sucesso`);
            setShowStatusConfirm(false);
            setSelectedSupplier(null);
            loadSuppliers();
        } catch (error) {
            toast.error('Erro', 'Não foi possível atualizar o status');
        }
    };

    const handleDelete = async () => {
        if (!selectedSupplier) return;
        try {
            await adminService.deleteCompany(selectedSupplier.id);
            toast.success('Facção excluída', 'Facção excluída com sucesso');
            setShowDeleteConfirm(false);
            setSelectedSupplier(null);
            loadSuppliers();
        } catch (error) {
            toast.error('Erro', 'Não foi possível excluir a facção');
        }
    };

    const filteredSuppliers = suppliers.filter(supplier => {
        const query = searchQuery.toLowerCase();
        return (
            supplier.tradeName?.toLowerCase().includes(query) ||
            supplier.legalName?.toLowerCase().includes(query) ||
            supplier.city?.toLowerCase().includes(query)
        );
    });

    const stats = {
        total: suppliers.length,
        active: suppliers.filter(s => s.status === 'ACTIVE').length,
        pending: suppliers.filter(s => s.status === 'PENDING').length,
        suspended: suppliers.filter(s => s.status === 'SUSPENDED').length,
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Facções</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie o ecossistema de produtores da rede</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowRegister(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
                        >
                            <UserPlus className="w-4 h-4" />
                            Registrar Facção
                        </button>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg border border-sky-500/10 shadow-sm">
                            <Factory className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">{stats.total} Registradas</span>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, razão social ou cidade..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all placeholder:text-gray-400 font-medium"
                        />
                    </div>

                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all appearance-none cursor-pointer font-medium"
                        >
                            <option value="">Todos os status</option>
                            <option value="ACTIVE">Somente Ativas</option>
                            <option value="PENDING">Somente Pendentes</option>
                            <option value="SUSPENDED">Somente Suspensas</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                    </div>

                    <button
                        onClick={loadSuppliers}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-500 hover:text-sky-500 transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-medium animate-pulse">Carregando ecossistema...</p>
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-white/[0.02] rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Factory className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Nenhuma facção encontrada</h3>
                        <p className="text-gray-500 max-w-sm mx-auto font-medium">Não encontramos resultados para os filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSuppliers.map((supplier) => (
                            <SupplierCard
                                key={supplier.id}
                                supplier={supplier}
                                isMenuOpen={openActionId === supplier.id}
                                menuRef={openActionId === supplier.id ? menuRef : undefined}
                                onToggleMenu={() => setOpenActionId(openActionId === supplier.id ? null : supplier.id)}
                                onViewDetails={() => {
                                    setSelectedSupplier(supplier);
                                    setShowDetails(true);
                                    setOpenActionId(null);
                                }}
                                onEdit={() => {
                                    setSelectedSupplier(supplier);
                                    setShowEdit(true);
                                    setOpenActionId(null);
                                }}
                                onToggleStatus={() => {
                                    setSelectedSupplier(supplier);
                                    setShowStatusConfirm(true);
                                    setOpenActionId(null);
                                }}
                                onDelete={() => {
                                    setSelectedSupplier(supplier);
                                    setShowDeleteConfirm(true);
                                    setOpenActionId(null);
                                }}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Modals */}
            {showDetails && selectedSupplier && (
                <CompanyDetailsModal
                    company={{ ...selectedSupplier, type: 'SUPPLIER' }}
                    onClose={() => { setShowDetails(false); setSelectedSupplier(null); }}
                />
            )}
            {showEdit && selectedSupplier && (
                <EditCompanyModal
                    company={selectedSupplier}
                    onClose={() => { setShowEdit(false); setSelectedSupplier(null); }}
                    onSuccess={() => { setShowEdit(false); setSelectedSupplier(null); loadSuppliers(); }}
                />
            )}
            {showStatusConfirm && selectedSupplier && (
                <ConfirmActionModal
                    title={selectedSupplier.status === 'ACTIVE' ? 'Suspender Facção' : 'Ativar Facção'}
                    message={`Tem certeza que deseja ${selectedSupplier.status === 'ACTIVE' ? 'suspender' : 'ativar'} a facção "${selectedSupplier.tradeName || selectedSupplier.legalName}"?`}
                    confirmLabel={selectedSupplier.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                    confirmColor={selectedSupplier.status === 'ACTIVE' ? 'amber' : undefined}
                    showReasonField={selectedSupplier.status === 'ACTIVE'}
                    reasonLabel="Motivo da suspensão"
                    onConfirm={handleStatusChange}
                    onClose={() => { setShowStatusConfirm(false); setSelectedSupplier(null); }}
                />
            )}
            {showDeleteConfirm && selectedSupplier && (
                <ConfirmActionModal
                    title="Excluir Facção"
                    message={`Tem certeza que deseja excluir a facção "${selectedSupplier.tradeName || selectedSupplier.legalName}"? Esta ação não pode ser desfeita.`}
                    confirmLabel="Excluir"
                    confirmColor="red"
                    onConfirm={handleDelete}
                    onClose={() => { setShowDeleteConfirm(false); setSelectedSupplier(null); }}
                />
            )}
            {showRegister && (
                <AdminRegisterCompanyModal
                    type="SUPPLIER"
                    onClose={() => setShowRegister(false)}
                    onSuccess={() => { setShowRegister(false); loadSuppliers(); }}
                />
            )}
        </div>
    );
};

const SupplierCard: React.FC<{
    supplier: Supplier;
    isMenuOpen: boolean;
    menuRef?: React.RefObject<HTMLDivElement>;
    onToggleMenu: () => void;
    onViewDetails: () => void;
    onEdit: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
}> = ({ supplier, isMenuOpen, menuRef, onToggleMenu, onViewDetails, onEdit, onToggleStatus, onDelete }) => {
    const ratingValue = typeof supplier.avgRating === 'string'
        ? parseFloat(supplier.avgRating)
        : supplier.avgRating;

    const displayRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-sky-500/10 transition-colors" />

            <div className="relative space-y-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/[0.08] shadow-sm group-hover:scale-110 transition-transform">
                            <Factory className="w-6 h-6 text-sky-500 dark:text-sky-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white font-display text-lg truncate group-hover:text-sky-500 transition-colors">
                                {supplier.tradeName || supplier.legalName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs font-medium">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{supplier.city}, {supplier.state}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={supplier.status} />
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={onToggleMenu}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-xl z-20 overflow-hidden">
                                    <button
                                        onClick={onViewDetails}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalhes
                                    </button>
                                    <button
                                        onClick={onEdit}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={onToggleStatus}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                                            supplier.status === 'ACTIVE'
                                                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                        }`}
                                    >
                                        <Power className="w-4 h-4" />
                                        {supplier.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                                    </button>
                                    <button
                                        onClick={onDelete}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-3 border border-gray-100 dark:border-white/[0.04]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avaliação</p>
                        <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-lg font-bold text-gray-900 dark:text-white font-display">{displayRating}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-3 border border-gray-100 dark:border-white/[0.04]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Carga</p>
                        <div className="flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-sky-500" />
                            <span className="text-lg font-bold text-gray-900 dark:text-white font-display">{supplier._count?.ordersAsSupplier || 0}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Ordens</span>
                        </div>
                    </div>
                </div>

                {supplier.supplierProfile?.productTypes && supplier.supplierProfile.productTypes.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Especialidades</p>
                        <div className="flex flex-wrap gap-1.5">
                            {supplier.supplierProfile.productTypes.slice(0, 3).map((type) => (
                                <span
                                    key={type}
                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/[0.08] rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-400 shadow-sm"
                                >
                                    {type}
                                </span>
                            ))}
                            {supplier.supplierProfile.productTypes.length > 3 && (
                                <span className="px-2 py-1 text-[10px] font-bold text-gray-400">
                                    +{supplier.supplierProfile.productTypes.length - 3}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
        ACTIVE: { label: 'Ativa', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
        PENDING: { label: 'Pendente', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
        SUSPENDED: { label: 'Suspensa', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    };

    const { label, bg, text, dot } = config[status] || config.PENDING;

    return (
        <div className={`px-2.5 py-1 ${bg} ${text} rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-black/5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
            {label}
        </div>
    );
};

export default SuppliersPage;
