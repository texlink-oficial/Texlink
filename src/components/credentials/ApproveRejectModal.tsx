import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, CheckCircle, XCircle, AlertTriangle, Loader2, Building2 } from 'lucide-react';
import type { SupplierCredential } from '../../types/credentials';

interface ApproveRejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    credential: SupplierCredential | null;
    type: 'approve' | 'reject';
    onConfirm: (data: ApproveFormData | RejectFormData) => Promise<void>;
}

interface ApproveFormData {
    approvalNotes: string;
}

interface RejectFormData {
    rejectionReason: string;
    rejectionDetails: string;
}

const REJECTION_REASONS = [
    { value: 'low_credit_score', label: 'Score de crédito insuficiente' },
    { value: 'tax_issues', label: 'Pendências fiscais' },
    { value: 'incomplete_documentation', label: 'Documentação incompleta' },
    { value: 'inadequate_capacity', label: 'Capacidade produtiva inadequada' },
    { value: 'compliance_failed', label: 'Falha na análise de compliance' },
    { value: 'negative_background', label: 'Histórico negativo' },
    { value: 'other', label: 'Outros' },
];

export const ApproveRejectModal: React.FC<ApproveRejectModalProps> = ({
    isOpen,
    onClose,
    credential,
    type,
    onConfirm,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ApproveFormData | RejectFormData>();

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            setError(null);
            onClose();
        }
    };

    const onSubmit = async (data: ApproveFormData | RejectFormData) => {
        try {
            setIsSubmitting(true);
            setError(null);
            await onConfirm(data);
            reset();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao processar solicitação');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    if (!isOpen || !credential) return null;

    const isApprove = type === 'approve';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`sticky top-0 p-6 border-b border-gray-200 dark:border-gray-700 ${
                    isApprove
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${
                                isApprove
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                {isApprove ? (
                                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                    {isApprove
                                        ? 'Aprovar Credenciamento Manualmente'
                                        : 'Rejeitar Credenciamento'
                                    }
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {isApprove
                                        ? 'Forneça justificativa para aprovação manual'
                                        : 'Forneça o motivo da rejeição'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Credential Summary */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                    {credential.tradeName || credential.legalName || credential.contactName}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                    CNPJ: {formatCNPJ(credential.cnpj)}
                                </p>
                                {credential.contactEmail && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {credential.contactEmail}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Compliance Scores */}
                        {credential.compliance && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            Score Geral
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {credential.compliance.overallScore}/100
                                        </p>
                                    </div>
                                    {credential.compliance.creditScore && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                Score Crédito
                                            </p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                {credential.compliance.creditScore}/100
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            Nível de Risco
                                        </p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            credential.compliance.riskLevel === 'LOW'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : credential.compliance.riskLevel === 'MEDIUM'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : credential.compliance.riskLevel === 'HIGH'
                                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {credential.compliance.riskLevel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    {isApprove ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notas da Aprovação *
                            </label>
                            <textarea
                                {...register('approvalNotes', {
                                    required: 'As notas de aprovação são obrigatórias',
                                    minLength: {
                                        value: 10,
                                        message: 'Forneça uma justificativa com pelo menos 10 caracteres',
                                    },
                                })}
                                rows={4}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400"
                                placeholder="Ex: Aprovado com base em análise complementar dos documentos fiscais e entrevista com o responsável. Empresa demonstrou capacidade técnica adequada..."
                                disabled={isSubmitting}
                            />
                            {errors.approvalNotes && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    {errors.approvalNotes.message}
                                </p>
                            )}
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Documente os critérios utilizados para aprovação manual
                            </p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Motivo da Rejeição *
                                </label>
                                <select
                                    {...register('rejectionReason', {
                                        required: 'Selecione um motivo de rejeição',
                                    })}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900 dark:text-white"
                                    disabled={isSubmitting}
                                >
                                    <option value="">Selecione um motivo</option>
                                    {REJECTION_REASONS.map((reason) => (
                                        <option key={reason.value} value={reason.value}>
                                            {reason.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.rejectionReason && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                        {errors.rejectionReason.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Observações Adicionais *
                                </label>
                                <textarea
                                    {...register('rejectionDetails', {
                                        required: 'As observações são obrigatórias',
                                        minLength: {
                                            value: 20,
                                            message: 'Forneça uma explicação detalhada com pelo menos 20 caracteres',
                                        },
                                    })}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400"
                                    placeholder="Forneça detalhes sobre o motivo da rejeição..."
                                    disabled={isSubmitting}
                                />
                                {errors.rejectionDetails && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                        {errors.rejectionDetails.message}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Essas informações serão registradas no histórico do credenciamento
                                </p>
                            </div>
                        </>
                    )}

                    {/* Warning */}
                    <div className={`flex gap-3 p-4 rounded-lg ${
                        isApprove
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                            isApprove
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                        }`} />
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${
                                isApprove
                                    ? 'text-blue-900 dark:text-blue-300'
                                    : 'text-yellow-900 dark:text-yellow-300'
                            }`}>
                                {isApprove
                                    ? 'Atenção: Revisão Manual'
                                    : 'Atenção: Ação Irreversível'
                                }
                            </p>
                            <p className={`text-xs mt-1 ${
                                isApprove
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-yellow-700 dark:text-yellow-400'
                            }`}>
                                {isApprove
                                    ? 'Esta aprovação manual substituirá a recomendação automática do sistema. Certifique-se de que todos os critérios foram verificados.'
                                    : 'Ao rejeitar este credenciamento, o fornecedor será notificado e não poderá prosseguir com o processo de onboarding.'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                                isApprove
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    {isApprove ? (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Aprovar
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5" />
                                            Rejeitar
                                        </>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApproveRejectModal;
