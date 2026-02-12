import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandOnboardingService } from '../../services/brandOnboarding.service';
import { Package, Sparkles, ShoppingBag, Loader2, CheckCircle } from 'lucide-react';
import { PRODUCT_TYPE_OPTIONS, MACHINE_OPTIONS } from '../../constants/supplierOptions';

const productTypeOptions = [...PRODUCT_TYPE_OPTIONS];
const specialtyOptions = [...MACHINE_OPTIONS];

const volumeOptions = [
    { value: 500, label: 'Até 500 peças/mês' },
    { value: 2000, label: '500 - 2.000 peças/mês' },
    { value: 5000, label: '2.000 - 5.000 peças/mês' },
    { value: 10000, label: '5.000 - 10.000 peças/mês' },
    { value: 50000, label: 'Mais de 10.000 peças/mês' },
];

interface FormData {
    productTypes: string[];
    specialties: string[];
    monthlyVolume?: number;
}

const BrandOnboardingProductsPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<FormData>({
        productTypes: [],
        specialties: [],
        monthlyVolume: undefined,
    });

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
        formData.productTypes.length > 0 && formData.monthlyVolume;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isFormValid) {
            setError('Selecione pelo menos um tipo de produto e o volume desejado');
            return;
        }

        setIsSubmitting(true);

        try {
            await brandOnboardingService.updatePhase3({
                productTypes: formData.productTypes,
                specialties: formData.specialties.length > 0 ? formData.specialties : undefined,
                monthlyVolume: formData.monthlyVolume!,
            });
            await brandOnboardingService.completeOnboarding();
            navigate('/brand/inicio');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join('. ') : msg || 'Erro ao salvar dados de produto');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/20 rounded-full mb-4">
                    <ShoppingBag className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Produtos e Demanda
                </h2>
                <p className="text-brand-300">
                    Informe o que você produz para encontrarmos as facções ideais
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
                        Que tipos de produto você produz? (selecione todos que se aplicam)
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
                        Tipos de tecido/técnica que precisa (opcional)
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

                {/* Volume Mensal */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Package className="w-4 h-4" />
                        Volume mensal desejado
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {volumeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, monthlyVolume: opt.value })}
                                className={`px-4 py-3 rounded-lg text-sm text-left transition-all ${formData.monthlyVolume === opt.value
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
                    <li>- Facções adequadas serão sugeridas para seus pedidos</li>
                    <li>- O matching será mais preciso com seus requisitos</li>
                    <li>- Você poderá atualizar estas informações a qualquer momento</li>
                </ul>
            </div>
        </div>
    );
};

export default BrandOnboardingProductsPage;
