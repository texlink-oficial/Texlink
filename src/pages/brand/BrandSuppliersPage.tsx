import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    Loader2,
    Factory,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    FileText,
    Pause,
    MoreVertical,
    Eye,
    Ban,
    RotateCcw,
    Send,
    Users,
    Handshake,
} from 'lucide-react';
import { relationshipsService } from '../../services';
import type {
    SupplierBrandRelationship,
    RelationshipStatus,
    RelationshipStats,
} from '../../types/relationships';
import { PartnershipRequestCard } from '../../components/partnership-requests';
import {
    partnershipRequestsService,
    type PartnershipRequest,
    type PartnershipRequestStatus,
} from '../../services/partnershipRequests.service';

type TabType = 'suppliers' | 'requests';
type RequestTabStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

const requestTabs: { id: RequestTabStatus; label: string; icon: React.ElementType }[] = [
    { id: 'PENDING', label: 'Pendentes', icon: Clock },
    { id: 'ACCEPTED', label: 'Aceitas', icon: CheckCircle },
    { id: 'REJECTED', label: 'Recusadas', icon: XCircle },
    { id: 'CANCELLED', label: 'Canceladas', icon: Ban },
];

const BrandSuppliersPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('suppliers');
    const [relationships, setRelationships] = useState<SupplierBrandRelationship[]>([]);
    const [filteredRelationships, setFilteredRelationships] = useState<
        SupplierBrandRelationship[]
    >([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<RelationshipStatus | ''>('');
    const [stats, setStats] = useState<RelationshipStats>({
        total: 0,
        active: 0,
        suspended: 0,
        pending: 0,
        contractPending: 0,
        terminated: 0,
    });
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

    // Partnership requests state
    const [requestsTab, setRequestsTab] = useState<RequestTabStatus>('PENDING');
    const [requests, setRequests] = useState<PartnershipRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [requestsError, setRequestsError] = useState<string | null>(null);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    // Get current user's brandId from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const brandId = user.brandId || user.companyId;

    const fetchRequests = useCallback(async () => {
        setIsLoadingRequests(true);
        setRequestsError(null);
        try {
            const status = requestsTab as PartnershipRequestStatus;
            const response = await partnershipRequestsService.getSent({ status });
            setRequests(response.data);
        } catch (err) {
            setRequestsError('Erro ao carregar solicitações');
            console.error(err);
        } finally {
            setIsLoadingRequests(false);
        }
    }, [requestsTab]);

    const fetchPendingCount = useCallback(async () => {
        try {
            const response = await partnershipRequestsService.getSent({ status: 'PENDING' });
            setPendingRequestsCount(response.data.length);
        } catch (err) {
            console.error('Error fetching pending count:', err);
        }
    }, []);

    useEffect(() => {
        loadRelationships();
        fetchPendingCount();
    }, [brandId]);

    useEffect(() => {
        applyFilters();
    }, [relationships, searchTerm, statusFilter]);

    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        }
    }, [activeTab, requestsTab, fetchRequests]);

    const loadRelationships = async () => {
        try {
            setIsLoading(true);
            const data = await relationshipsService.getByBrand(brandId);
            setRelationships(data);

            // Calculate stats
            const statsData = await relationshipsService.getStats(brandId);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading relationships:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...relationships];

        // Status filter
        if (statusFilter) {
            filtered = filtered.filter((r) => r.status === statusFilter);
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.supplier?.tradeName?.toLowerCase().includes(term) ||
                    r.supplier?.legalName?.toLowerCase().includes(term) ||
                    r.supplier?.document?.includes(term) ||
                    r.internalCode?.toLowerCase().includes(term)
            );
        }

        setFilteredRelationships(filtered);
    };

    const handleSuspend = async (relationshipId: string) => {
        const reason = prompt('Motivo da suspensão:');
        if (!reason) return;

        try {
            await relationshipsService.suspend(relationshipId, { reason });
            await loadRelationships();
        } catch (error) {
            console.error('Error suspending relationship:', error);
            alert('Erro ao suspender relacionamento');
        }
    };

    const handleReactivate = async (relationshipId: string) => {
        try {
            await relationshipsService.reactivate(relationshipId);
            await loadRelationships();
        } catch (error) {
            console.error('Error reactivating relationship:', error);
            alert('Erro ao reativar relacionamento');
        }
    };

    const handleTerminate = async (relationshipId: string) => {
        const reason = prompt('Motivo do encerramento (ATENÇÃO: Esta ação é permanente):');
        if (!reason) return;

        if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;

        try {
            await relationshipsService.terminate(relationshipId, { reason });
            await loadRelationships();
        } catch (error) {
            console.error('Error terminating relationship:', error);
            alert('Erro ao encerrar relacionamento');
        }
    };

    const handleCancelRequest = async (request: PartnershipRequest) => {
        if (!window.confirm('Deseja cancelar esta solicitação?')) return;

        try {
            await partnershipRequestsService.cancel(request.id);
            fetchRequests();
            fetchPendingCount();
        } catch (err) {
            console.error('Erro ao cancelar:', err);
            alert('Erro ao cancelar solicitação');
        }
    };

    const getStatusBadge = (status: RelationshipStatus) => {
        const badges: Record<
            RelationshipStatus,
            { icon: any; label: string; className: string }
        > = {
            PENDING: {
                icon: Clock,
                label: 'Pendente',
                className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            },
            CONTRACT_PENDING: {
                icon: FileText,
                label: 'Aguardando Contrato',
                className:
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
            },
            ACTIVE: {
                icon: CheckCircle,
                label: 'Ativo',
                className:
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            },
            SUSPENDED: {
                icon: Pause,
                label: 'Suspenso',
                className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            },
            TERMINATED: {
                icon: XCircle,
                label: 'Encerrado',
                className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            },
        };

        const badge = badges[status];
        const Icon = badge.icon;

        return (
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${badge.className}`}
            >
                <Icon className="w-3.5 h-3.5" />
                {badge.label}
            </span>
        );
    };

    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Meus Fornecedores
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Gerencie as facções credenciadas para sua marca
                    </p>
                </div>
                <Link
                    to="/brand/fornecedores/adicionar"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Credenciar Fornecedor
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={Factory}
                    label="Total"
                    value={stats.total}
                    color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Ativos"
                    value={stats.active}
                    color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                />
                <StatCard
                    icon={FileText}
                    label="Contrato Pendente"
                    value={stats.contractPending}
                    color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                />
                <StatCard
                    icon={Clock}
                    label="Pendentes"
                    value={stats.pending}
                    color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
                <StatCard
                    icon={Pause}
                    label="Suspensos"
                    value={stats.suspended}
                    color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                />
                <StatCard
                    icon={XCircle}
                    label="Encerrados"
                    value={stats.terminated}
                    color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'suppliers'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Credenciados
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'suppliers'
                            ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            {stats.total}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'requests'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Handshake className="w-4 h-4" />
                        Solicitações
                        {pendingRequestsCount > 0 && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'requests'
                                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {pendingRequestsCount}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'requests' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for requests */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
                        <nav className="flex gap-1">
                            {requestTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = requestsTab === tab.id;
                                const count = tab.id === 'PENDING' ? pendingRequestsCount : undefined;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setRequestsTab(tab.id)}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex-1 justify-center
                                            ${isActive
                                                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                        {count !== undefined && count > 0 && (
                                            <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 rounded-full">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Requests Content */}
                    {isLoadingRequests ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : requestsError ? (
                        <div className="text-center py-12">
                            <p className="text-red-500">{requestsError}</p>
                            <button
                                onClick={fetchRequests}
                                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Nenhuma solicitação encontrada
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                {requestsTab === 'PENDING'
                                    ? 'Você não tem solicitações pendentes'
                                    : 'Não há solicitações nesta categoria'}
                            </p>
                            <Link
                                to="/brand/fornecedores/adicionar"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                            >
                                <Send className="w-5 h-5" />
                                Buscar Fornecedores
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {requests.map((request) => (
                                <PartnershipRequestCard
                                    key={request.id}
                                    request={request}
                                    viewType="brand"
                                    onCancel={request.status === 'PENDING' ? handleCancelRequest : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, CNPJ, código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative w-full lg:w-56">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="">Todos os status</option>
                                    <option value="ACTIVE">Ativo</option>
                                    <option value="CONTRACT_PENDING">Contrato Pendente</option>
                                    <option value="PENDING">Pendente</option>
                                    <option value="SUSPENDED">Suspenso</option>
                                    <option value="TERMINATED">Encerrado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : filteredRelationships.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <Factory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {relationships.length === 0
                                    ? 'Nenhum fornecedor credenciado'
                                    : 'Nenhum resultado encontrado'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                {relationships.length === 0
                                    ? 'Comece credenciando um fornecedor do pool'
                                    : 'Tente ajustar os filtros de busca'}
                            </p>
                            {relationships.length === 0 && (
                                <Link
                                    to="/brand/fornecedores/adicionar"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Credenciar Fornecedor
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredRelationships.map((relationship) => (
                                <div
                                    key={relationship.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                                <Factory className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {relationship.supplier?.tradeName ||
                                                        relationship.supplier?.legalName}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    CNPJ: {relationship.supplier?.document}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions Menu */}
                                        <div className="relative">
                                            <button
                                                onClick={() =>
                                                    setActionMenuOpen(
                                                        actionMenuOpen === relationship.id
                                                            ? null
                                                            : relationship.id
                                                    )
                                                }
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            >
                                                <MoreVertical className="w-5 h-5 text-gray-400" />
                                            </button>

                                            {actionMenuOpen === relationship.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                                    <button
                                                        onClick={() => {
                                                            window.location.href = `/brand/fornecedores/${relationship.id}`;
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Ver Detalhes
                                                    </button>

                                                    {relationship.status === 'ACTIVE' && (
                                                        <button
                                                            onClick={() => handleSuspend(relationship.id)}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                            Suspender
                                                        </button>
                                                    )}

                                                    {relationship.status === 'SUSPENDED' && (
                                                        <button
                                                            onClick={() =>
                                                                handleReactivate(relationship.id)
                                                            }
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                            Reativar
                                                        </button>
                                                    )}

                                                    {relationship.status !== 'TERMINATED' && (
                                                        <button
                                                            onClick={() => handleTerminate(relationship.id)}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 border-t border-gray-200 dark:border-gray-700"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Encerrar
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mb-4">{getStatusBadge(relationship.status)}</div>

                                    {/* Info */}
                                    <div className="space-y-2 text-sm">
                                        {relationship.internalCode && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    Código:
                                                </span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {relationship.internalCode}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                Credenciado em:
                                            </span>
                                            <span className="text-gray-900 dark:text-white">
                                                {new Date(relationship.createdAt).toLocaleDateString(
                                                    'pt-BR'
                                                )}
                                            </span>
                                        </div>

                                        {relationship.activatedAt && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    Ativado em:
                                                </span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {new Date(relationship.activatedAt).toLocaleDateString(
                                                        'pt-BR'
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {relationship.contract?.supplierSignedAt && (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Contrato assinado</span>
                                            </div>
                                        )}

                                        {relationship.status === 'CONTRACT_PENDING' && (
                                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Aguardando assinatura</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {relationship.notes && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {relationship.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BrandSuppliersPage;

