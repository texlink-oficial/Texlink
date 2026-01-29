import React, { useState } from 'react';
import { Package, Sparkles, Gauge, Factory } from 'lucide-react';

interface Step5CapabilitiesProps {
  token: string;
  onComplete: () => void;
}

interface CapabilitiesData {
  productTypes: string[];
  specialties?: string[];
  monthlyCapacity: number;
  currentOccupancy: number;
}

const productTypeOptions = [
  'Infantil',
  'Adulto Feminino',
  'Adulto Masculino',
  'Fitness/Activewear',
  'Moda Praia',
  'Pijamas/Loungewear',
  'Uniformes',
  'Jeans/Denim',
];

const specialtyOptions = [
  'Malha',
  'Tricô',
  'Jeans',
  'Alfaiataria',
  'Moletom',
  'Tecido Plano',
  'Lingerie',
  'Bordados',
  'Estamparia',
];

/**
 * Step 5: Capacidades Produtivas
 *
 * Coleta informações sobre a produção da facção:
 * - Tipos de produtos que produz
 * - Especialidades
 * - Capacidade mensal
 * - Ocupação atual
 */
export function Step5Capabilities({ token, onComplete }: Step5CapabilitiesProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CapabilitiesData>({
    productTypes: [],
    specialties: [],
    monthlyCapacity: 0,
    currentOccupancy: 50,
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
      specialties: prev.specialties?.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...(prev.specialties || []), specialty],
    }));
  };

  const isFormValid =
    formData.productTypes.length > 0 && formData.monthlyCapacity >= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid) {
      setError('Selecione pelo menos um tipo de produto e informe a capacidade (mín. 100 peças/mês)');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Integrar com API
      // await onboardingService.updateCapabilities(token, formData);

      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar capacidades produtivas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Factory className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Produção e Capacidade
        </h2>
        <p className="text-gray-600">
          Informe o que você produz e sua capacidade para encontrarmos os
          melhores pedidos
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipos de Produto */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Package className="w-4 h-4" />
            O que você produz? (selecione todos que se aplicam)
          </label>
          <div className="flex flex-wrap gap-2">
            {productTypeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleProductType(type)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  formData.productTypes.includes(type)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-blue-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {formData.productTypes.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {formData.productTypes.length} tipo(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Especialidades */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Sparkles className="w-4 h-4" />
            Especialidades (opcional)
          </label>
          <div className="flex flex-wrap gap-2">
            {specialtyOptions.map((specialty) => (
              <button
                key={specialty}
                type="button"
                onClick={() => toggleSpecialty(specialty)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  formData.specialties?.includes(specialty)
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-teal-500'
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>
          {formData.specialties && formData.specialties.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {formData.specialties.length} especialidade(s) selecionada(s)
            </p>
          )}
        </div>

        {/* Capacidade Mensal */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Gauge className="w-4 h-4" />
            Capacidade mensal (peças/mês)
          </label>
          <input
            type="number"
            min="100"
            step="100"
            value={formData.monthlyCapacity || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                monthlyCapacity: parseInt(e.target.value) || 0,
              })
            }
            placeholder="Ex: 5000"
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Capacidade mínima: 100 peças/mês
          </p>
        </div>

        {/* Ocupação Atual */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Gauge className="w-4 h-4" />
            Ocupação atual: {formData.currentOccupancy}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.currentOccupancy}
            onChange={(e) =>
              setFormData({
                ...formData,
                currentOccupancy: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0% (Ocioso)</span>
            <span>50%</span>
            <span>100% (Lotado)</span>
          </div>

          {/* Indicador Visual */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Capacidade disponível
              </span>
              <span className="text-sm font-bold text-blue-600">
                {formData.monthlyCapacity > 0
                  ? Math.round(
                      (formData.monthlyCapacity * (100 - formData.currentOccupancy)) / 100
                    ).toLocaleString()
                  : 0}{' '}
                peças/mês
              </span>
            </div>
            <p className="text-xs text-blue-700">
              Capacidade total: {formData.monthlyCapacity.toLocaleString()} peças/mês
              • Ocupação: {formData.currentOccupancy}%
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvando capacidades...' : 'Salvar e Continuar'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 text-sm">
          💡 Por que estas informações são importantes?
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• As marcas usarão isso para encontrar facções adequadas</li>
          <li>• Pedidos serão direcionados conforme sua capacidade disponível</li>
          <li>• Você poderá atualizar estas informações a qualquer momento</li>
        </ul>
      </div>
    </div>
  );
}
