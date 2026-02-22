import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingService } from '../../services/onboarding.service';
import { Package, Sparkles, Users, Clock, Factory, Loader2, CheckCircle } from 'lucide-react';
import { PRODUCT_TYPE_OPTIONS, MACHINE_OPTIONS } from '../../constants/supplierOptions';

const productTypeOptions = [...PRODUCT_TYPE_OPTIONS];
const specialtyOptions = [...MACHINE_OPTIONS];

interface FormData {
    productTypes: string[];
    specialties: string[];
    activeWorkers: number;
    hoursPerDay: number;
}

const OnboardingCapacityPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<FormData>({
        productTypes: [],
        specialties: [],
        activeWorkers: 0,
        hoursPerDay: 8,
    });

    const dailyCapacityMinutes = formData.activeWorkers > 0
        ? Math.round(formData.activeWorkers * formData.hoursPerDay * 60)
        : 0;

    const dailyCapacityHours = Math.round(dailyCapacityMinutes / 60);

    const toggleProductType = (type: string) => {
        setFormData((prev) => ({
            ...prev,
            productTypes: prev.productTypes.includes(type)
                ? prev.productTypes.filter((t) => t !== type)
                : [...prev.productTypes, type],
        }));
    };

    const toggleSpecialty = (specialty: string) => {
        setFormData((prev) => ({
            ...prev,
            specialties: prev.specialties.includes(specialty)
                ? prev.specialties.filter((s) => s !== specialty)
                : [...prev.specialties, specialty],
        }));
    };

    const isFormValid =
        formData.productTypes.length > 0 && formData.activeWorkers >= 1 && formData.hoursPerDay >= 1;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isFormValid) {
            setError('Selecione pelo menos um tipo de produto e informe a equipe de produção');
            return;
        }

        setIsSubmitting(true);

        try {
            await onboardingService.updatePhase3({
                productTypes: formData.productTypes,
                specialties: formData.specialties.length > 0 ? formData.specialties : undefined,
                monthlyCapacity: dailyCapacityMinutes,
                activeWorkers: formData.activeWorkers,
                hoursPerDay: formData.hoursPerDay,
            });
            await onboardingService.completeOnboarding();
            navigate('/portal/inicio');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join('. ') : msg || 'Erro ao salvar capacidades produtivas');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/20 rounded-full mb-4">
                    <Factory className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Produção e Capacidade
                </h2>
                <p className="text-brand-300">
                    Informe o que você produz e sua capacidade para encontrarmos os melhores pedidos
                </p>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipos de Produto */}
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

                {/* Especialidades */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Sparkles className="w-4 h-4" />
                        Especialidades (opcional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {specialtyOptions.map((specialty) => (
                            <button
                                key={specialty}
                                type="button"
                                onClick={() => toggleSpecialty(specialty)}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.specialties.includes(specialty)
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-white/10 text-brand-300 border border-white/20 hover:border-teal-500/50'
                                    }`}
                            >
                                {specialty}
                            </button>
                        ))}
                    </div>
                    {formData.specialties.length > 0 && (
                        <p className="text-sm text-brand-400 mt-2">
                            {formData.specialties.length} especialidade(s) selecionada(s)
                        </p>
                    )}
                </div>

                {/* Equipe de Produção */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Users className="w-4 h-4" />
                        Equipe de Produção
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-brand-300 mb-1">
                                Costureiros Ativos
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="9999"
                                value={formData.activeWorkers || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        activeWorkers: parseInt(e.target.value) || 0,
                                    })
                                }
                                placeholder="Ex: 12"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1 text-xs font-medium text-brand-300 mb-1">
                                <Clock className="w-3 h-3" />
                                Horas por Dia
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                step="0.5"
                                value={formData.hoursPerDay || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        hoursPerDay: parseFloat(e.target.value) || 0,
                                    })
                                }
                                placeholder="Ex: 8"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Capacidade Calculada */}
                    {formData.activeWorkers > 0 && formData.hoursPerDay > 0 && (
                        <div className="mt-4 p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-brand-200">
                                    Capacidade diária estimada
                                </span>
                                <span className="text-sm font-bold text-brand-400">
                                    {dailyCapacityHours.toLocaleString('pt-BR')} horas/dia
                                </span>
                            </div>
                            <p className="text-xs text-brand-300">
                                {formData.activeWorkers} costureiro(s) x {formData.hoursPerDay}h/dia
                                = {dailyCapacityMinutes.toLocaleString('pt-BR')} minutos/dia
                            </p>
                        </div>
                    )}
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
                            <CheckCircle className="w-5 h-5" />
                            Finalizar Cadastro
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
                <h4 className="font-medium text-brand-200 mb-2 text-sm">
                    Por que estas informações são importantes?
                </h4>
                <ul className="text-sm text-brand-300 space-y-1">
                    <li>- As marcas usarão isso para encontrar facções adequadas</li>
                    <li>- Pedidos serão direcionados conforme sua capacidade disponível</li>
                    <li>- Você poderá atualizar estas informações a qualquer momento</li>
                </ul>
            </div>
        </div>
    );
};

export default OnboardingCapacityPage;
