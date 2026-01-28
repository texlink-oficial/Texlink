import React from 'react';
import {
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Calendar,
    FileText,
    TrendingUp,
} from 'lucide-react';
import type { ComplianceAnalysis } from '../../types/credentials';
import { ComplianceScore } from './ComplianceScore';
import { RiskLevelCard } from './RiskLevelIndicator';

interface ComplianceAnalysisCardProps {
    compliance: ComplianceAnalysis;
    className?: string;
}

export const ComplianceAnalysisCard: React.FC<ComplianceAnalysisCardProps> = ({
    compliance,
    className = '',
}) => {
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRecommendationConfig = (recommendation: string) => {
        switch (recommendation) {
            case 'APPROVE':
                return {
                    label: 'Aprovação Automática',
                    description: 'Sistema recomenda aprovação',
                    icon: <CheckCircle className="w-5 h-5" />,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                };
            case 'REJECT':
                return {
                    label: 'Rejeição Automática',
                    description: 'Sistema recomenda rejeição',
                    icon: <XCircle className="w-5 h-5" />,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                };
            case 'MANUAL_REVIEW':
                return {
                    label: 'Revisão Manual',
                    description: 'Sistema recomenda análise humana',
                    icon: <AlertTriangle className="w-5 h-5" />,
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                };
            default:
                return {
                    label: 'Pendente',
                    description: 'Aguardando análise',
                    icon: <Clock className="w-5 h-5" />,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                };
        }
    };

    const recommendationConfig = getRecommendationConfig(compliance.recommendation);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            Análise de Compliance
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Avaliação automática de riscos e compliance
                        </p>
                    </div>
                </div>

                {/* Scores Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Compliance Scores */}
                    <ComplianceScore
                        creditScore={compliance.creditScore}
                        fiscalScore={compliance.fiscalScore}
                        overallScore={compliance.overallScore}
                        showDetails={true}
                    />

                    {/* Risk Level */}
                    <div className="space-y-4">
                        <RiskLevelCard riskLevel={compliance.riskLevel} />

                        {/* System Recommendation */}
                        <div
                            className={`rounded-xl border p-4 ${recommendationConfig.bgColor} ${recommendationConfig.borderColor}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={recommendationConfig.color}>
                                    {recommendationConfig.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-semibold mb-0.5 ${recommendationConfig.color}`}>
                                        {recommendationConfig.label}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {recommendationConfig.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Risk Factors */}
            {compliance.riskFactors && compliance.riskFactors.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Fatores de Risco Identificados
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {compliance.riskFactors.map((factor, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-orange-400 mt-1.5" />
                                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {factor}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {compliance.recommendations && compliance.recommendations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Recomendações
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {compliance.recommendations.map((recommendation, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                            >
                                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {recommendation}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Review Information */}
            {compliance.manualReview && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Revisão Manual
                        </h3>
                    </div>

                    <div
                        className={`rounded-xl border p-4 mb-4 ${
                            compliance.manualReview.decision === 'APPROVED'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            {compliance.manualReview.decision === 'APPROVED' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )}
                            <div className="flex-1">
                                <p
                                    className={`font-semibold text-sm mb-1 ${
                                        compliance.manualReview.decision === 'APPROVED'
                                            ? 'text-green-900 dark:text-green-300'
                                            : 'text-red-900 dark:text-red-300'
                                    }`}
                                >
                                    {compliance.manualReview.decision === 'APPROVED'
                                        ? 'Aprovado Manualmente'
                                        : 'Rejeitado Manualmente'}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Esta decisão foi tomada por um analista
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Reviewer Info */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Revisado por
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {compliance.manualReview.reviewedBy?.name || 'Analista'}
                                </p>
                                {compliance.manualReview.reviewedBy?.email && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {compliance.manualReview.reviewedBy.email}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Review Date */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Data da revisão
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatDate(compliance.manualReview.reviewedAt)}
                                </p>
                            </div>
                        </div>

                        {/* Approval Notes / Rejection Reason */}
                        {compliance.manualReview.decision === 'APPROVED' &&
                            compliance.manualReview.approvalNotes && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Notas da Aprovação
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {compliance.manualReview.approvalNotes}
                                    </p>
                                </div>
                            )}

                        {compliance.manualReview.decision === 'REJECTED' && (
                            <>
                                {compliance.manualReview.rejectionReason && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                                            Motivo da Rejeição
                                        </p>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {compliance.manualReview.rejectionReason}
                                        </p>
                                    </div>
                                )}
                                {compliance.manualReview.rejectionDetails && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-start gap-2 mb-2">
                                            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                Observações Adicionais
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {compliance.manualReview.rejectionDetails}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Analysis Metadata */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Data da Análise
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {formatDate(compliance.analyzedAt)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Provider
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {compliance.source || 'Sistema'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            ID da Análise
                        </p>
                        <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {compliance.id.substring(0, 8)}...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceAnalysisCard;
