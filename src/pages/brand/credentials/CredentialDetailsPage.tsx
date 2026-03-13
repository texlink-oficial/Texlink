import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    Trash2,
    CheckCircle,
    Send,
    RefreshCw,
    Loader2,
    Mail,
    Phone,
    Building2,
    Calendar,
    FileText,
    AlertCircle,
    Eye,
} from 'lucide-react';
import { credentialsService } from '../../../services';
import type { SupplierCredential, SupplierCredentialStatus } from '../../../types/credentials';
import { TimelineStatus } from '../../../components/credentials/TimelineStatus';
import { ValidationResultCard } from '../../../components/credentials/ValidationResultCard';
import { ComplianceScore } from '../../../components/credentials/ComplianceScore';
import { ComplianceAnalysisCard } from '../../../components/credentials/ComplianceAnalysisCard';
import { ApproveRejectModal } from '../../../components/credentials/ApproveRejectModal';
import { SendInviteModal } from '../../../components/credentials/SendInviteModal';
import { StatusBadge } from '../../../components/shared/StatusBadge';

const CredentialDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [credential, setCredential] = useState<SupplierCredential | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id) {
            loadCredential();
            loadHistory();
        }
    }, [id]);

    useEffect(() => {
        // Start polling if status is VALIDATING or PENDING_VALIDATION
        if (
            credential &&
            (credential.status === 'VALIDATING' || credential.status === 'PENDING_VALIDATION')
        ) {
            const interval = setInterval(() => {
                loadCredential(false);
            }, 5000);
            setPollingInterval(interval);

            return () => {
                if (interval) clearInterval(interval);
            };
        } else {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        }
    }, [credential?.status]);

    const loadCredential = async (showLoader = true) => {
        try {
            if (showLoader) setIsLoading(true);
            const data = await credentialsService.getById(id!);
            setCredential(data);
        } catch (error) {
            console.error('Error loading credential:', error);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            const history = await credentialsService.getHistory(id!);
            setStatusHistory(history);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    const handleValidate = async () => {
        try {
            setIsValidating(true);
            await credentialsService.validate(id!);
            await loadCredential();
            await loadHistory();
        } catch (error) {
            console.error('Error validating credential:', error);
        } finally {
            setIsValidating(false);
        }
    };

    const handleDelete = async () => {
        try {
            await credentialsService.delete(id!);
            navigate('/brand/credenciamento');
        } catch (error) {
            console.error('Error deleting credential:', error);
        }
    };

    const handleSendInvite = async (data: any) => {
        try {
            await credentialsService.sendInvitation(id!, {
                channel: data.channel,
                templateId: data.templateId,
                customMessage: data.customMessage,
                recipientEmail: credential?.contactEmail,
                recipientPhone: credential?.contactPhone,
            });
            await loadCredential();
            await loadHistory();
        } catch (error) {
            console.error('Error sending invite:', error);
            throw error;
        }
    };

    const handleApproveCredential = async (data: any) => {
        try {
            // In a real app, call API endpoint
            // await credentialsService.approveManually(id!, data);
            if (import.meta.env.DEV) console.log('Approving credential with data:', data);
            await loadCredential();
            await loadHistory();
        } catch (error) {
            console.error('Error approving credential:', error);
            throw error;
        }
    };

    const handleRejectCredential = async (data: any) => {
        try {
            // In a real app, call API endpoint
            // await credentialsService.rejectManually(id!, data);
            if (import.meta.env.DEV) console.log('Rejecting credential with data:', data);
            await loadCredential();
            await loadHistory();
        } catch (error) {
            console.error('Error rejecting credential:', error);
            throw error;
        }
    };

    const handleResendInvite = async () => {
        try {
            setIsSendingInvite(true);
            await credentialsService.resendInvitation(id!);
            await loadCredential();
            await loadHistory();
        } catch (error) {
            console.error('Error resending invite:', error);
        } finally {
            setIsSendingInvite(false);
        }
    };

    const formatCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        }
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusConfig = (status: SupplierCredentialStatus) => {
        const configs: Record<
            SupplierCredentialStatus,
            { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' }
        > = {
            DRAFT: { label: 'Rascunho', variant: 'default' },
            PENDING_VALIDATION: { label: 'Aguardando Validação', variant: 'warning' },
            VALIDATING: { label: 'Validando', variant: 'info' },
            VALIDATION_FAILED: { label: 'Validação Falhou', variant: 'error' },
            VALIDATION_SUCCESS: { label: 'Validação OK', variant: 'success' },
            PENDING_COMPLIANCE: { label: 'Aguardando Compliance', variant: 'warning' },
            COMPLIANCE_APPROVED: { label: 'Compliance Aprovado', variant: 'success' },
            COMPLIANCE_REJECTED: { label: 'Compliance Rejeitado', variant: 'error' },
            INVITATION_PENDING: { label: 'Convite Pendente', variant: 'warning' },
            INVITATION_SENT: { label: 'Convite Enviado', variant: 'info' },
            INVITATION_OPENED: { label: 'Convite Aberto', variant: 'purple' },
            INVITATION_EXPIRED: { label: 'Convite Expirado', variant: 'error' },
            ONBOARDING_STARTED: { label: 'Onboarding Iniciado', variant: 'info' },
            ONBOARDING_IN_PROGRESS: { label: 'Onboarding em Progresso', variant: 'purple' },
            ONBOARDING_COMPLETE: { label: 'Onboarding Completo', variant: 'success' },
            CONTRACT_PENDING: { label: 'Contrato Pendente', variant: 'warning' },
            CONTRACT_SIGNED: { label: 'Contrato Assinado', variant: 'success' },
            ACTIVE: { label: 'Ativo', variant: 'success' },
            SUSPENDED: { label: 'Suspenso', variant: 'warning' },
            BLOCKED: { label: 'Bloqueado', variant: 'error' },
        };
        return configs[status] || { label: status, variant: 'default' as const };
    };

    const canEdit = (status: SupplierCredentialStatus) => {
        return ['DRAFT', 'VALIDATION_FAILED', 'COMPLIANCE_REJECTED'].includes(status);
    };

    const canDelete = (status: SupplierCredentialStatus) => {
        return [
            'DRAFT',
            'VALIDATION_FAILED',
            'COMPLIANCE_REJECTED',
            'INVITATION_EXPIRED',
        ].includes(status);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!credential) {
        return (
            <div className="p-6 lg:p-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Credenciamento não encontrado
                    </h3>
                    <button
                        onClick={() => navigate('/brand/credenciamento')}
                        className="mt-4 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Voltar para lista
                    </button>
                </div>
            </div>
        );
    }

    const statusConfig = getStatusConfig(credential.status);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/brand/credenciamento')}
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Voltar
                </button>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {credential.tradeName || credential.legalName || credential.contactName}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-mono">
                                {formatCNPJ(credential.cnpj)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <StatusBadge label={statusConfig.label} variant={statusConfig.variant} dot />

                        {/* Actions Dropdown */}
                        <div className="relative group">
                            <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <Edit className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Status */}
            <TimelineStatus currentStatus={credential.status} history={statusHistory} />

            {/* Action Buttons based on Status */}
            <div className="flex flex-wrap gap-3">
                {credential.status === 'DRAFT' && (
                    <>
                        <button
                            onClick={handleValidate}
                            disabled={isValidating}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isValidating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Validar CNPJ
                        </button>
                        {canEdit(credential.status) && (
                            <button
                                onClick={() => navigate(`/brand/credenciamento/${id}/editar`)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Edit className="w-5 h-5" />
                                Editar
                            </button>
                        )}
                        {canDelete(credential.status) && (
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                                Remover
                            </button>
                        )}
                    </>
                )}

                {(credential.status === 'VALIDATING' || credential.status === 'PENDING_VALIDATION') && (
                    <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Validando CNPJ...
                    </div>
                )}

                {credential.status === 'PENDING_COMPLIANCE' && credential.compliance?.recommendation === 'MANUAL_REVIEW' && (
                    <>
                        <button
                            onClick={() => setShowApproveModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Aprovar
                        </button>
                        <button
                            onClick={() => setShowRejectModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <AlertCircle className="w-5 h-5" />
                            Rejeitar
                        </button>
                    </>
                )}

                {credential.status === 'COMPLIANCE_APPROVED' && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        disabled={isSendingInvite}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSendingInvite ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                        Enviar Convite
                    </button>
                )}

                {credential.status === 'INVITATION_SENT' && (
                    <>
                        <button
                            onClick={handleResendInvite}
                            disabled={isSendingInvite}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            {isSendingInvite ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                            Reenviar Convite
                        </button>
                        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <Eye className="w-5 h-5" />
                            Ver Tracking
                        </button>
                    </>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Informações Básicas
                    </h3>
                    <div className="space-y-4">
                        {credential.legalName && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Razão Social
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {credential.legalName}
                                </p>
                            </div>
                        )}
                        {credential.tradeName && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Nome Fantasia
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {credential.tradeName}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Nome do Contato
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {credential.contactName}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {credential.contactEmail}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Telefone</p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {formatPhone(credential.contactPhone)}
                                </p>
                            </div>
                        </div>
                        {credential.contactWhatsapp && (
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</p>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {formatPhone(credential.contactWhatsapp)}
                                    </p>
                                </div>
                            </div>
                        )}
                        {credential.category && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Categoria
                                </p>
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
                                    {credential.category}
                                </span>
                            </div>
                        )}
                        {credential.notes && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Observações
                                </p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {credential.notes}
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Criado em
                                </p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {formatDate(credential.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Validation Result */}
                {credential.validations && credential.validations.length > 0 && (
                    <ValidationResultCard
                        validation={{
                            id: credential.validations[0].id,
                            isValid: credential.validations[0].isValid,
                            source: credential.validations[0].provider,
                            validatedAt: credential.validations[0].validatedAt,
                            companyStatus: credential.validations[0].taxSituation,
                            mainActivity: credential.validations[0].mainActivity,
                            parsedData: {
                                razaoSocial: credential.validations[0].legalName,
                                nomeFantasia: credential.validations[0].tradeName,
                                endereco: credential.validations[0].address,
                                situacaoCadastral: credential.validations[0].taxSituation,
                            },
                            errorMessage: credential.validations[0].error,
                        }}
                    />
                )}

            </div>

            {/* Compliance Analysis Section */}
            {credential.compliance && (
                <>
                    {/* Manual Review Alert Banner */}
                    {credential.status === 'PENDING_COMPLIANCE' && credential.compliance.recommendation === 'MANUAL_REVIEW' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                                        Revisão Manual Necessária
                                    </h3>
                                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                        Este credenciamento requer análise manual devido aos fatores de risco identificados.
                                        Por favor, revise os dados de compliance e tome uma decisão.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compliance Analysis Card */}
                    <ComplianceAnalysisCard compliance={credential.compliance} />
                </>
            )}

            {/* Status History */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Histórico de Status
                </h3>
                {statusHistory.length > 0 ? (
                    <div className="space-y-3">
                        {statusHistory.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                            >
                                <FileText className="w-5 h-5 text-gray-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {item.fromStatus ? `${item.fromStatus} → ` : ''}
                                        {item.toStatus}
                                    </p>
                                    {item.reason && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.reason}
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(item.createdAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nenhum histórico disponível
                    </p>
                )}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Confirmar Remoção
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Tem certeza que deseja remover este credenciamento? Esta ação não pode
                            ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <SendInviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                credential={credential}
                onConfirm={handleSendInvite}
            />

            <ApproveRejectModal
                isOpen={showApproveModal}
                onClose={() => setShowApproveModal(false)}
                credential={credential}
                type="approve"
                onConfirm={handleApproveCredential}
            />

            <ApproveRejectModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                credential={credential}
                type="reject"
                onConfirm={handleRejectCredential}
            />
        </div>
    );
};

export default CredentialDetailsPage;
