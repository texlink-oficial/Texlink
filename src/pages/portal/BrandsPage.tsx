import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    AlertCircle,
    Pause,
    XCircle,
    ExternalLink,
    Calendar,
    TrendingUp,
    Package,
} from 'lucide-react';
import { relationshipsService } from '../../services';
import type {
    SupplierBrandRelationship,
    RelationshipStatus,
} from '../../types/relationships';

const BrandsPage: React.FC = () => {
    const [relationships, setRelationships] = useState<SupplierBrandRelationship[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get current user's supplierId from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const supplierId = user.supplierId || user.companyId;

    useEffect(() => {
        loadRelationships();
    }, [supplierId]);

    const loadRelationships = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await relationshipsService.getBySupplier(supplierId);
            setRelationships(data);
        } catch (err) {
            console.error('Error loading relationships:', err);
            setError('Erro ao carregar suas marcas. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusConfig = (status: RelationshipStatus) => {
        const configs: Record<
            RelationshipStatus,
            { icon: any; label: string; bgColor: string; textColor: string; description: string }
        > = {
            PENDING: {
                icon: Clock,
                label: 'Pendente',
                bgColor: 'bg-gray-100 dark:bg-gray-700',
                textColor: 'text-gray-700 dark:text-gray-300',
                description: 'Aguardando aprovação',
            },
            CONTRACT_PENDING: {
                icon: FileText,
                label: 'Contrato Pendente',
                bgColor: 'bg-amber-100 dark:bg-amber-900/30',
                textColor: 'text-amber-700 dark:text-amber-400',
                description: 'Assine o contrato para ativar',
            },
            ACTIVE: {
                icon: CheckCircle,
                label: 'Ativo',
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                textColor: 'text-green-700 dark:text-green-400',
                description: 'Pronto para receber pedidos',
            },
            SUSPENDED: {
                icon: Pause,
                label: 'Suspenso',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                textColor: 'text-red-700 dark:text-red-400',
                description: 'Temporariamente suspenso',
            },
            TERMINATED: {
                icon: XCircle,
                label: 'Encerrado',
                bgColor: 'bg-gray-100 dark:bg-gray-700',
                textColor: 'text-gray-500 dark:text-gray-400',
                description: 'Relacionamento encerrado',
            },
        };
        return configs[status];
    };

    const activeCount = relationships.filter((r) => r.status === 'ACTIVE').length;
    const pendingCount = relationships.filter(
        (r) => r.status === 'CONTRACT_PENDING' || r.status === 'PENDING'
    ).length;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Marcas</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Veja as marcas para as quais você trabalha
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                        <button
                            onClick={loadRelationships}
                            className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total de Marcas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {relationships.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Ativas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {activeCount}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {pendingCount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {relationships.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhuma marca vinculada
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        Você ainda não está credenciado para nenhuma marca. Quando uma marca
                        credenciar sua facção, ela aparecerá aqui.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {relationships.map((relationship) => {
                        const statusConfig = getStatusConfig(relationship.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <div
                                key={relationship.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                            >
                                {/* Card Header */}
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {relationship.brand?.tradeName ||
                                                    relationship.brand?.legalName ||
                                                    'Marca'}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                CNPJ: {relationship.brand?.document}
                                            </p>
                                        </div>
                                        <div
                                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${statusConfig.bgColor} ${statusConfig.textColor}`}
                                        >
                                            <StatusIcon className="w-4 h-4" />
                                            <span className="text-sm font-medium">
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6">
                                    {/* Status Description */}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        {statusConfig.description}
                                    </p>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Credenciado em
                                                </p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {new Date(relationship.createdAt).toLocaleDateString(
                                                        'pt-BR'
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {relationship.activatedAt && (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Ativado em
                                                    </p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {new Date(
                                                            relationship.activatedAt
                                                        ).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Internal Code if exists */}
                                    {relationship.internalCode && (
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Código interno
                                            </p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {relationship.internalCode}
                                            </p>
                                        </div>
                                    )}

                                    {/* Contract Status */}
                                    {relationship.contract && (
                                        <div
                                            className={`rounded-lg p-3 mb-4 ${
                                                relationship.contract.supplierSignedAt
                                                    ? 'bg-green-50 dark:bg-green-900/20'
                                                    : 'bg-amber-50 dark:bg-amber-900/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText
                                                    className={`w-4 h-4 ${
                                                        relationship.contract.supplierSignedAt
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-amber-600 dark:text-amber-400'
                                                    }`}
                                                />
                                                <span
                                                    className={`text-sm font-medium ${
                                                        relationship.contract.supplierSignedAt
                                                            ? 'text-green-700 dark:text-green-300'
                                                            : 'text-amber-700 dark:text-amber-300'
                                                    }`}
                                                >
                                                    {relationship.contract.supplierSignedAt
                                                        ? `Contrato assinado em ${new Date(
                                                              relationship.contract.supplierSignedAt
                                                          ).toLocaleDateString('pt-BR')}`
                                                        : 'Contrato aguardando assinatura'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        {relationship.status === 'CONTRACT_PENDING' &&
                                            relationship.contract && (
                                                <Link
                                                    to={`/portal/contratos/${relationship.contract.id}`}
                                                    className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Assinar Contrato
                                                </Link>
                                            )}

                                        {relationship.status === 'ACTIVE' && (
                                            <>
                                                <Link
                                                    to={`/portal/pedidos?brand=${relationship.brandId}`}
                                                    className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Package className="w-4 h-4" />
                                                    Ver Pedidos
                                                </Link>
                                                {relationship.contract && (
                                                    <a
                                                        href={relationship.contract.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-2"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        Contrato
                                                    </a>
                                                )}
                                            </>
                                        )}

                                        {relationship.status === 'SUSPENDED' && (
                                            <div className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-medium text-center">
                                                Aguardando reativação
                                            </div>
                                        )}

                                        {relationship.status === 'TERMINATED' && (
                                            <div className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-medium text-center">
                                                Relacionamento encerrado
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                {relationship.notes && (
                                    <div className="px-6 pb-6">
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                Observações da marca
                                            </p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {relationship.notes}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BrandsPage;
