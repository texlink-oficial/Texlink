import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingService } from '../../services/onboarding.service';
import { Package, Users, Clock, Building2, Loader2, CheckCircle, ArrowLeft, Wrench, ArrowRight, FileText } from 'lucide-react';
import { PRODUCT_TYPE_OPTIONS, MACHINE_OPTIONS } from '../../constants/supplierOptions';
import { getCurrentMonthWorkingDays } from '../../utils/workingDays';

const productTypeOptions = [...PRODUCT_TYPE_OPTIONS];
const machineOptions = [...MACHINE_OPTIONS];

const timeInMarketOptions = [
    'Menos de 1 ano',
    '1 a 3 anos',
    '3 a 5 anos',
    '5 a 10 anos',
    'Mais de 10 anos',
];

interface FormData {
    productTypes: string[];
    machines: string[];
    qtdCostureiras?: number;
    tempoMercado: string;
}

const OnboardingBusinessPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showContractStep, setShowContractStep] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        productTypes: [],
        machines: [],
        qtdCostureiras: undefined,
        tempoMercado: '',
    });

    const isFormValid =
        formData.productTypes.length > 0 &&
        formData.machines.length > 0 &&
        formData.qtdCostureiras &&
        formData.qtdCostureiras >= 1 &&
        formData.tempoMercado;

    const toggleProductType = (type: string) => {
        setFormData((prev) => ({
            ...prev,
            productTypes: prev.productTypes.includes(type)
                ? prev.productTypes.filter((t) => t !== type)
                : [...prev.productTypes, type],
        }));
    };

    const toggleMachine = (machine: string) => {
        setFormData((prev) => ({
            ...prev,
            machines: prev.machines.includes(machine)
                ? prev.machines.filter((m) => m !== machine)
                : [...prev.machines, machine],
        }));
    };

    const handleAdvanceToContract = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isFormValid) {
            setError('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        setShowContractStep(true);
    };

    const handleSubmit = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            await onboardingService.updatePhase2({
                qtdColaboradores: formData.qtdCostureiras,
                tempoMercado: formData.tempoMercado,
            });
            await onboardingService.updatePhase3({
                productTypes: formData.productTypes,
                specialties: formData.machines,
                monthlyCapacity: (formData.qtdCostureiras || 1) * 8 * 60 * getCurrentMonthWorkingDays(),
            });
            await onboardingService.completeOnboarding();
            setShowSuccessModal(true);
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join('. ') : msg || 'Erro ao salvar dados da empresa');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success modal overlay
    if (showSuccessModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Cadastro Enviado com Sucesso!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">
                        Seu cadastro está em análise. Você será notificado por e-mail quando for aprovado pela equipe Texlink.
                    </p>
                    <button
                        onClick={() => navigate('/portal/inicio')}
                        className="w-full py-3 px-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        );
    }

    // Contract acceptance step
    if (showContractStep) {
        return (
            <div>
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/20 rounded-full mb-4">
                        <FileText className="w-8 h-8 text-brand-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Termos e Condições de Uso
                    </h2>
                    <p className="text-brand-300">
                        Leia atentamente os termos antes de concluir seu cadastro
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                {/* Scrollable terms container */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
                    <p className="text-brand-200 leading-relaxed">
                        Os termos e condições de uso da plataforma Texlink estão sendo finalizados.
                        Ao prosseguir, você concorda com os termos gerais de uso da plataforma,
                        incluindo políticas de privacidade e proteção de dados conforme a LGPD.
                    </p>
                    <p className="text-brand-200 leading-relaxed mt-4">
                        O documento completo será disponibilizado em breve e enviado por e-mail
                        para todos os usuários cadastrados.
                    </p>
                </div>

                {/* Checkbox */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="w-5 h-5 text-brand-500 border-white/20 rounded focus:ring-2 focus:ring-brand-500 bg-white/10"
                        />
                        <span className="text-brand-200 group-hover:text-white transition-colors">
                            Li e concordo com os termos e condições de uso
                        </span>
                    </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setShowContractStep(false);
                            setAcceptedTerms(false);
                            setError('');
                        }}
                        className="px-6 py-3 bg-white/10 border border-white/20 text-brand-300 font-medium rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!acceptedTerms || isSubmitting}
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Concluir Cadastro
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Business qualification form (original)
    return (
        <div>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/20 rounded-full mb-4">
                    <Building2 className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Qualificação do Negócio
                </h2>
                <p className="text-brand-300">
                    Conte-nos mais sobre sua facção para entendermos melhor seu perfil
                </p>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <form onSubmit={handleAdvanceToContract} className="space-y-6">
                {/* O que você produz */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Package className="w-4 h-4" />
                        O que você produz? (selecione todos que se aplicam)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {productTypeOptions.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => toggleProductType(type)}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.productTypes.includes(type)
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white/10 text-brand-300 border border-white/20 hover:border-brand-500/50'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    {formData.productTypes.length > 0 && (
                        <p className="text-sm text-brand-400 mt-2">
                            {formData.productTypes.length} tipo(s) selecionado(s)
                        </p>
                    )}
                </div>

                {/* Quais maquinas possui */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Wrench className="w-4 h-4" />
                        Quais máquinas possui? (selecione todas que se aplicam)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {machineOptions.map((machine) => (
                            <button
                                key={machine}
                                type="button"
                                onClick={() => toggleMachine(machine)}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.machines.includes(machine)
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-white/10 text-brand-300 border border-white/20 hover:border-teal-500/50'
                                    }`}
                            >
                                {machine}
                            </button>
                        ))}
                    </div>
                    {formData.machines.length > 0 && (
                        <p className="text-sm text-brand-400 mt-2">
                            {formData.machines.length} máquina(s) selecionada(s)
                        </p>
                    )}
                </div>

                {/* Numero de Costureiras */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Users className="w-4 h-4" />
                        Número de Costureiras
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={formData.qtdCostureiras || ''}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                qtdCostureiras: parseInt(e.target.value) || undefined,
                            })
                        }
                        placeholder="Ex: 15"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Tempo no Mercado */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Clock className="w-4 h-4" />
                        Tempo de atuação no mercado
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeInMarketOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFormData({ ...formData, tempoMercado: option })}
                                className={`px-3 py-2 rounded-lg text-sm transition-all ${formData.tempoMercado === option
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white/10 text-brand-300 border border-white/20 hover:border-brand-500/50'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="px-6 py-3 bg-white/10 border border-white/20 text-brand-300 font-medium rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>
                    <button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowRight className="w-5 h-5" />
                        Avançar
                    </button>
                </div>
            </form>

            <div className="mt-6 bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
                <p className="text-sm text-brand-300">
                    <strong className="text-brand-200">Dica:</strong> Estas informações ajudam as marcas a
                    entenderem melhor seu perfil e a oferecerem oportunidades adequadas
                    ao seu negócio.
                </p>
            </div>
        </div>
    );
};

export default OnboardingBusinessPage;
