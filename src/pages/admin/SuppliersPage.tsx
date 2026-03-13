import React, { useEffect, useState, useRef } from 'react';
import {
    Factory, Filter, Loader2,
    Search, MapPin, ChevronRight, RefreshCw,
    MoreVertical, Eye, Edit3, Power, Trash2, UserPlus, FileSpreadsheet
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useToast } from '../../contexts/ToastContext';
import CompanyDetailsModal from '../../components/admin/CompanyDetailsModal';
import EditCompanyModal from '../../components/admin/EditCompanyModal';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal';
import AdminRegisterCompanyModal from '../../components/admin/AdminRegisterCompanyModal';
import BulkImportSuppliersModal from '../../components/suppliers/BulkImportSuppliersModal';

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
        dailyCapacity: number;
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
    const [showBulkImport, setShowBulkImport] = useState(false);
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
            await adminService.updateSupplierStatus(selectedSupplier.id, newStatus, reason);
            toast.success('Status atualizado', `Facção de costura ${newStatus === 'ACTIVE' ? 'ativada' : 'suspensa'} com sucesso`);
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
            toast.success('Facção de costura excluída', 'Facção de costura excluída com sucesso');
            setShowDeleteConfirm(false);
            setSelectedSupplier(null);
            loadSuppliers();
        } catch (error) {
            toast.error('Erro', 'Não foi possível excluir a facção de costura');
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Facções de Costura</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie o ecossistema de produtores da rede</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowBulkImport(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] shadow-sm active:scale-[0.98] transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Importar Planilha
                        </button>
                        <button
                            onClick={() => setShowRegister(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
                        >
                            <UserPlus className="w-4 h-4" />
                            Registrar Facção de Costura
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
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Nenhuma facção de costura encontrada</h3>
                        <p className="text-gray-500 max-w-sm mx-auto font-medium">Não encontramos resultados para os filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Razão Social</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CNPJ</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cidade</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Especialidades</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Cadastro</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                                    {filteredSuppliers.map((supplier) => (
                                        <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-gray-100 dark:border-white/[0.08] flex-shrink-0">
                                                        <Factory className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-sky-500 transition-colors">
                                                            {supplier.legalName || supplier.tradeName}
                                                        </p>
                                                        {supplier.tradeName && supplier.legalName && supplier.tradeName !== supplier.legalName && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.tradeName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{supplier.document || '-'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={supplier.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{supplier.city}, {supplier.state}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {supplier.supplierProfile?.productTypes?.length
                                                        ? supplier.supplierProfile.productTypes.slice(0, 2).map((type, i) => (
                                                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                                                {type}
                                                            </span>
                                                        ))
                                                        : <span className="text-sm text-gray-400">-</span>
                                                    }
                                                    {(supplier.supplierProfile?.productTypes?.length || 0) > 2 && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                            +{supplier.supplierProfile!.productTypes.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {new Date(supplier.createdAt).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="relative inline-block" ref={openActionId === supplier.id ? menuRef : undefined}>
                                                    <button
                                                        onClick={() => setOpenActionId(openActionId === supplier.id ? null : supplier.id)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    {openActionId === supplier.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-xl z-20 overflow-hidden">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSupplier(supplier);
                                                                    setShowDetails(true);
                                                                    setOpenActionId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Ver Detalhes
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSupplier(supplier);
                                                                    setShowEdit(true);
                                                                    setOpenActionId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSupplier(supplier);
                                                                    setShowStatusConfirm(true);
                                                                    setOpenActionId(null);
                                                                }}
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
                                                                onClick={() => {
                                                                    setSelectedSupplier(supplier);
                                                                    setShowDeleteConfirm(true);
                                                                    setOpenActionId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                    title={selectedSupplier.status === 'ACTIVE' ? 'Suspender Facção de Costura' : 'Ativar Facção de Costura'}
                    message={`Tem certeza que deseja ${selectedSupplier.status === 'ACTIVE' ? 'suspender' : 'ativar'} a facção de costura "${selectedSupplier.tradeName || selectedSupplier.legalName}"?`}
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
                    title="Excluir Facção de Costura"
                    message={`Tem certeza que deseja excluir a facção de costura "${selectedSupplier.tradeName || selectedSupplier.legalName}"? Esta ação não pode ser desfeita.`}
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
            <BulkImportSuppliersModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                onComplete={(results) => {
                    if (results.success > 0) {
                        toast.success('Importação concluída', `${results.success} convite(s) enviado(s) com sucesso`);
                        loadSuppliers();
                    }
                }}
            />
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
