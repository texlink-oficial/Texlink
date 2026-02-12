import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Clock,
    CheckCircle,
    Loader2,
    AlertCircle,
    X
} from 'lucide-react';
import api from '../../../services/api';

type PayoutFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

interface FrequencyConfig {
    currentFrequency: PayoutFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    nextPayouts: string[];
    hasPendingRequest: boolean;
    pendingRequestFrequency?: PayoutFrequency;
}

const FREQUENCY_LABELS: Record<PayoutFrequency, string> = {
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quinzenal',
    MONTHLY: 'Mensal',
};

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PayoutFrequencyPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<FrequencyConfig | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedFrequency, setSelectedFrequency] = useState<PayoutFrequency>('WEEKLY');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setIsLoading(true);
            const response = await api.get<FrequencyConfig>('/portal/finance/payout-frequency');
            setConfig(response.data);
            setSelectedFrequency(response.data.currentFrequency);
        } catch (error) {
            console.error('Error loading config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitRequest = async () => {
        try {
            setIsSubmitting(true);
            await api.post('/portal/finance/payout-frequency/request', { frequency: selectedFrequency });
            setShowRequestModal(false);
            setShowSuccess(true);
            setConfig(prev => prev ? { ...prev, hasPendingRequest: true, pendingRequestFrequency: selectedFrequency } : null);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error submitting request:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFrequencyDescription = (freq: PayoutFrequency) => {
        switch (freq) {
            case 'WEEKLY':
                return `Repasse toda ${DAYS_OF_WEEK[config?.dayOfWeek || 1]}-feira`;
            case 'BIWEEKLY':
                return `Repasse a cada 15 dias (${DAYS_OF_WEEK[config?.dayOfWeek || 1]}-feira)`;
            case 'MONTHLY':
                return `Repasse no dia ${config?.dayOfMonth || 5} de cada mês`;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    to="/portal/inicio"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Frequência de Repasse
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Configure quando deseja receber seus pagamentos
                    </p>
                </div>
            </div>

            {/* Success Banner */}
            {showSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="font-medium text-green-800 dark:text-green-200">
                        Solicitação enviada! Aguarde aprovação do Admin Texlink.
                    </p>
                </div>
            )}

            {/* Pending Request Banner */}
            {config?.hasPendingRequest && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                            Solicitação de mudança pendente
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Você solicitou alteração para frequência {FREQUENCY_LABELS[config.pendingRequestFrequency!]}.
                            Aguardando aprovação.
                        </p>
                    </div>
                </div>
            )}

            {/* Current Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                                <Clock className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Configuração Atual</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {FREQUENCY_LABELS[config?.currentFrequency || 'WEEKLY']}
                                </p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 ml-12">
                            {config && getFrequencyDescription(config.currentFrequency)}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRequestModal(true)}
                        disabled={config?.hasPendingRequest}
                        className="px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Solicitar Mudança
                    </button>
                </div>
            </div>

            {/* Next Payouts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Próximos Repasses
                </h2>
                <div className="space-y-3">
                    {config?.nextPayouts.map((date, index) => (
                        <div
                            key={date}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                <span className="text-gray-900 dark:text-white font-medium">
                                    {new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </span>
                            </div>
                            {index === 0 && (
                                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                    Próximo
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowRequestModal(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <button
                            onClick={() => setShowRequestModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Solicitar Mudança de Frequência
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Selecione a nova frequência desejada. A alteração será analisada pelo Admin Texlink.
                        </p>

                        <div className="space-y-3 mb-6">
                            {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as PayoutFrequency[]).map((freq) => (
                                <button
                                    key={freq}
                                    onClick={() => setSelectedFrequency(freq)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${selectedFrequency === freq
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <p className="font-medium text-gray-900 dark:text-white">{FREQUENCY_LABELS[freq]}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {freq === 'WEEKLY' && 'Receba toda semana'}
                                        {freq === 'BIWEEKLY' && 'Receba a cada 15 dias'}
                                        {freq === 'MONTHLY' && 'Receba uma vez por mês'}
                                    </p>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitRequest}
                                disabled={isSubmitting || selectedFrequency === config?.currentFrequency}
                                className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                                Enviar Solicitação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayoutFrequencyPage;
