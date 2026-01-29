import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Factory,
    CheckCircle,
    Clock,
    XCircle,
    FileText,
    Loader2,
    AlertCircle,
    Pause,
    MapPin,
    Star,
    Calendar,
    MoreVertical,
    Ban,
    RotateCcw,
    ExternalLink,
    Phone,
    Mail,
    History,
} from 'lucide-react';
import { relationshipsService } from '../../../services';
import type {
    SupplierBrandRelationship,
    RelationshipStatus,
    RelationshipStatusHistory,
} from '../../../types/relationships';

const RelationshipDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [relationship, setRelationship] = useState<SupplierBrandRelationship | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    useEffect(() => {
        if (id) {
            loadRelationship();
        }
    }, [id]);

    const loadRelationship = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await relationshipsService.getOne(id!);
            setRelationship(data);
        } catch (err) {
            console.error('Error loading relationship:', err);
            setError('Erro ao carregar detalhes do relacionamento');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspend = async () => {
        const reason = prompt('Motivo da suspensão:');
        if (!reason) return;

        try {
            setIsActioning(true);
            await relationshipsService.suspend(id!, { reason });
            await loadRelationship();
        } catch (err) {
            console.error('Error suspending:', err);
            alert('Erro ao suspender relacionamento');
        } finally {
            setIsActioning(false);
        }
    };

    const handleReactivate = async () => {
        try {
            setIsActioning(true);
            await relationshipsService.reactivate(id!);
            await loadRelationship();
        } catch (err) {
            console.error('Error reactivating:', err);
            alert('Erro ao reativar relacionamento');
        } finally {
            setIsActioning(false);
        }
    };

    const handleTerminate = async () => {
        const reason = prompt('Motivo do encerramento (ATENÇÃO: Esta ação é permanente):');
        if (!reason) return;

        if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;

        try {
            setIsActioning(true);
            await relationshipsService.terminate(id!, { reason });
            await loadRelationship();
        } catch (err) {
            console.error('Error terminating:', err);
            alert('Erro ao encerrar relacionamento');
        } finally {
            setIsActioning(false);
        }
    };

    const getStatusConfig = (status: RelationshipStatus) => {
        const configs: Record<
            RelationshipStatus,
            { icon: any; label: string; bgColor: string; textColor: string }
        > = {
            PENDING: {
                icon: Clock,
                label: 'Pendente',
                bgColor: 'bg-gray-100 dark:bg-gray-700',
                textColor: 'text-gray-700 dark:text-gray-300',
            },
            CONTRACT_PENDING: {
                icon: FileText,
                label: 'Contrato Pendente',
                bgColor: 'bg-amber-100 dark:bg-amber-900/30',
                textColor: 'text-amber-700 dark:text-amber-400',
            },
            ACTIVE: {
                icon: CheckCircle,
                label: 'Ativo',
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                textColor: 'text-green-700 dark:text-green-400',
            },
            SUSPENDED: {
                icon: Pause,
                label: 'Suspenso',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                textColor: 'text-red-700 dark:text-red-400',
            },
            TERMINATED: {
                icon: XCircle,
                label: 'Encerrado',
                bgColor: 'bg-gray-100 dark:bg-gray-700',
                textColor: 'text-gray-500 dark:text-gray-400',
            },
        };
        return configs[status];
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error || !relationship) {
        return (
            <div className="p-6 lg:p-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                        {error || 'Relacionamento não encontrado'}
                    </h2>
                    <button
                        onClick={() => navigate('/brand/fornecedores')}
                        className="text-red-600 dark:text-red-400 hover:underline"
                    >
                        Voltar para lista
                    </button>
                </div>
            </div>
        );
    }

    const statusConfig = getStatusConfig(relationship.status);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/brand/fornecedores')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Detalhes do Fornecedor
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Relacionamento com {relationship.supplier?.tradeName}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {relationship.status === 'ACTIVE' && (
                        <button
                            onClick={handleSuspend}
                            disabled={isActioning}
                            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Ban className="w-4 h-4" />
                            Suspender
                        </button>
                    )}

                    {relationship.status === 'SUSPENDED' && (
                        <button
                            onClick={handleReactivate}
                            disabled={isActioning}
                            className="px-4 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reativar
                        </button>
                    )}

                    {relationship.status !== 'TERMINATED' && (
                        <button
                            onClick={handleTerminate}
                            disabled={isActioning}
                            className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <XCircle className="w-4 h-4" />
                            Encerrar
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                <Factory className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {relationship.supplier?.tradeName ||
                                        relationship.supplier?.legalName}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    CNPJ: {relationship.supplier?.document}
                                </p>
                                <div
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg mt-2 ${statusConfig.bgColor} ${statusConfig.textColor}`}
                                >
                                    <StatusIcon className="w-4 h-4" />
                                    <span className="font-medium">{statusConfig.label}</span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {(relationship.supplier?.city || relationship.supplier?.state) && (
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Localização
                                        </p>
                                        <p className="text-gray-900 dark:text-white">
                                            {[
                                                relationship.supplier?.city,
                                                relationship.supplier?.state,
                                            ]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {relationship.supplier?.email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Email
                                        </p>
                                        <p className="text-gray-900 dark:text-white">
                                            {relationship.supplier.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {relationship.supplier?.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Telefone
                                        </p>
                                        <p className="text-gray-900 dark:text-white">
                                            {relationship.supplier.phone}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {relationship.supplier?.supplierProfile?.avgRating && (
                                <div className="flex items-center gap-3">
                                    <Star className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Avaliação
                                        </p>
                                        <p className="text-gray-900 dark:text-white">
                                            {relationship.supplier.supplierProfile.avgRating.toFixed(
                                                1
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Specialties */}
                        {relationship.supplier?.supplierProfile?.specialties &&
                            relationship.supplier.supplierProfile.specialties.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Especialidades
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {relationship.supplier.supplierProfile.specialties.map(
                                            (spec, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                                                >
                                                    {spec}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>

                    {/* Contract Card */}
                    {relationship.contract && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-400" />
                                Contrato
                            </h3>

                            <div
                                className={`rounded-xl p-4 mb-4 ${
                                    relationship.contract.supplierSignedAt
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {relationship.contract.supplierSignedAt ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <span className="text-green-700 dark:text-green-300 font-medium">
                                                Contrato assinado em{' '}
                                                {new Date(
                                                    relationship.contract.supplierSignedAt
                                                ).toLocaleDateString('pt-BR')}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            <span className="text-amber-700 dark:text-amber-300 font-medium">
                                                Aguardando assinatura do fornecedor
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {relationship.contract.documentUrl && (
                                <a
                                    href={relationship.contract.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver Contrato
                                </a>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    {relationship.notes && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Observações
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300">{relationship.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Relationship Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Informações
                        </h3>

                        <div className="space-y-4">
                            {relationship.internalCode && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Código Interno
                                    </p>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {relationship.internalCode}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Credenciado em
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(relationship.createdAt).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>

                            {relationship.activatedAt && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Ativado em
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {new Date(relationship.activatedAt).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            }
                                        )}
                                    </p>
                                </div>
                            )}

                            {relationship.suspendedAt && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Suspenso em
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {new Date(relationship.suspendedAt).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            }
                                        )}
                                    </p>
                                </div>
                            )}

                            {relationship.terminatedAt && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Encerrado em
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {new Date(relationship.terminatedAt).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            }
                                        )}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Prioridade
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {relationship.priority === 2
                                        ? 'Muito Alta'
                                        : relationship.priority === 1
                                        ? 'Alta'
                                        : 'Normal'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status History */}
                    {relationship.statusHistory && relationship.statusHistory.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-400" />
                                Histórico
                            </h3>

                            <div className="space-y-4">
                                {relationship.statusHistory.map((entry, i) => (
                                    <div
                                        key={entry.id}
                                        className="relative pl-6 pb-4 border-l-2 border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
                                    >
                                        <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 -translate-x-[7px]" />
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {
                                                getStatusConfig(entry.status as RelationshipStatus)
                                                    .label
                                            }
                                        </p>
                                        {entry.notes && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {entry.notes}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelationshipDetailsPage;
