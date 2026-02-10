import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandOnboardingService } from '../../services/brandOnboarding.service';
import { Briefcase, Users, Clock, Package, Building2, Loader2, ArrowRight } from 'lucide-react';

const objectiveOptions = [
    'Terceirizar produção',
    'Encontrar novas facções',
    'Reduzir custos de produção',
    'Aumentar capacidade produtiva',
    'Outros',
];

const maturityOptions = [
    { value: 'iniciante', label: 'Iniciante - Começando a estruturar' },
    { value: 'basico', label: 'Básico - Processos informais' },
    { value: 'intermediario', label: 'Intermediário - Processos definidos' },
    { value: 'avancado', label: 'Avançado - Processos otimizados' },
];

const timeInMarketOptions = [
    'Menos de 1 ano',
    '1 a 3 anos',
    '3 a 5 anos',
    '5 a 10 anos',
    'Mais de 10 anos',
];

const volumeOptions = [
    { value: 500, label: 'Até 500 peças/mês' },
    { value: 2000, label: '500 - 2.000 peças/mês' },
    { value: 5000, label: '2.000 - 5.000 peças/mês' },
    { value: 10000, label: '5.000 - 10.000 peças/mês' },
    { value: 50000, label: 'Mais de 10.000 peças/mês' },
];

interface FormData {
    objetivo: string;
    volumeMensal?: number;
    maturidadeGestao: string;
    qtdColaboradores?: number;
    tempoMercado: string;
}

const BrandOnboardingBusinessPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<FormData>({
        objetivo: '',
        volumeMensal: undefined,
        maturidadeGestao: '',
        qtdColaboradores: undefined,
        tempoMercado: '',
    });

    const isFormValid =
        formData.objetivo &&
        formData.maturidadeGestao &&
        formData.tempoMercado &&
        formData.qtdColaboradores &&
        formData.volumeMensal;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isFormValid) {
            setError('Por favor, preencha todos os campos');
            return;
        }

        setIsSubmitting(true);

        try {
            await brandOnboardingService.updatePhase2({
                objetivo: formData.objetivo,
                volumeMensal: formData.volumeMensal,
                maturidadeGestao: formData.maturidadeGestao,
                qtdColaboradores: formData.qtdColaboradores,
                tempoMercado: formData.tempoMercado,
            });
            navigate('/brand-onboarding/produtos');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join('. ') : msg || 'Erro ao salvar dados da empresa');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/20 rounded-full mb-4">
                    <Building2 className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Qualificação da Marca
                </h2>
                <p className="text-brand-300">
                    Conte-nos mais sobre sua marca para conectarmos você às melhores facções
                </p>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Objetivo */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Briefcase className="w-4 h-4" />
                        Qual seu principal objetivo na plataforma?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {objectiveOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFormData({ ...formData, objetivo: option })}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.objetivo === option
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white/10 text-brand-300 border border-white/20 hover:border-brand-500/50'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Maturidade de Gestão */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Clock className="w-4 h-4" />
                        Nível de maturidade na gestão
                    </label>
                    <select
                        value={formData.maturidadeGestao}
                        onChange={(e) => setFormData({ ...formData, maturidadeGestao: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        required
                    >
                        <option value="" className="bg-brand-900">Selecione...</option>
                        {maturityOptions.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-brand-900">
                                {opt.label}
                            </option>
                        ))}
                    </select>
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

                {/* Colaboradores */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Users className="w-4 h-4" />
                        Número de colaboradores
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={formData.qtdColaboradores || ''}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                qtdColaboradores: parseInt(e.target.value) || undefined,
                            })
                        }
                        placeholder="Ex: 20"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Volume Mensal */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Package className="w-4 h-4" />
                        Volume mensal de produção desejado
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {volumeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, volumeMensal: opt.value })}
                                className={`px-4 py-3 rounded-lg text-sm text-left transition-all ${formData.volumeMensal === opt.value
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white/10 text-brand-300 border border-white/20 hover:border-brand-500/50'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="w-full py-3 px-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Salvar e Continuar
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
                <p className="text-sm text-brand-300">
                    <strong className="text-brand-200">Dica:</strong> Estas informações ajudam a conectar
                    sua marca às facções mais adequadas ao seu perfil e volume de produção.
                </p>
            </div>
        </div>
    );
};

export default BrandOnboardingBusinessPage;
