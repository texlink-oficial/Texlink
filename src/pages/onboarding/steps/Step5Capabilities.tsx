import React, { useState } from 'react';
import { Package, Sparkles, Users, Clock, Factory, Info } from 'lucide-react';
import { PRODUCT_TYPE_OPTIONS, MACHINE_OPTIONS } from '../../../constants/supplierOptions';
import { getCurrentMonthWorkingDays, getMonthName } from '../../../utils/workingDays';

interface Step5CapabilitiesProps {
  token: string;
  onComplete: () => void;
}

interface CapabilitiesData {
  productTypes: string[];
  specialties?: string[];
  activeWorkers: number;
  hoursPerDay: number;
}

const productTypeOptions = [...PRODUCT_TYPE_OPTIONS];
const specialtyOptions = [...MACHINE_OPTIONS];

/**
 * Step 5: Capacidades Produtivas
 *
 * Coleta informações sobre a produção da facção:
 * - Tipos de produtos que produz
 * - Especialidades
 * - Costureiros ativos e horas por dia (capacidade calculada automaticamente)
 */
export function Step5Capabilities({ token, onComplete }: Step5CapabilitiesProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CapabilitiesData>({
    productTypes: [],
    specialties: [],
    activeWorkers: 0,
    hoursPerDay: 8,
  });

  const workingDaysThisMonth = getCurrentMonthWorkingDays();
  const currentMonthName = getMonthName(new Date().getMonth());

  const dailyCapacityMinutes = formData.activeWorkers > 0
    ? Math.round(formData.activeWorkers * formData.hoursPerDay * 60)
    : 0;

  const dailyCapacityHours = Math.round(dailyCapacityMinutes / 60);
  const weeklyCapacityHours = dailyCapacityHours * 5;
  const monthlyCapacityMinutes = dailyCapacityMinutes * workingDaysThisMonth;
  const monthlyCapacityHours = dailyCapacityHours * workingDaysThisMonth;

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
      const { onboardingService } = await import('../../../services/onboarding.service');
      await onboardingService.saveCapabilities(token, {
        ...formData,
        monthlyCapacity: dailyCapacityMinutes,
      });

      onComplete();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar capacidades produtivas';
      const axiosMessage =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(axiosMessage || message);
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

        {/* Equipe de Produção */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Users className="w-4 h-4" />
            Equipe de Produção
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
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
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
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
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Capacidade Calculada */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Capacidade diária estimada
              </span>
              <span className="text-sm font-bold text-blue-600">
                {dailyCapacityHours.toLocaleString('pt-BR')} horas/dia
              </span>
            </div>
            <p className="text-xs text-blue-700">
              {formData.activeWorkers} costureiro(s) x {formData.hoursPerDay}h/dia
              = {dailyCapacityMinutes.toLocaleString('pt-BR')} minutos/dia
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Projeção: {weeklyCapacityHours.toLocaleString('pt-BR')}h/semana • {monthlyCapacityHours.toLocaleString('pt-BR')}h/mês ({workingDaysThisMonth} dias úteis)
            </p>
            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Baseado em {workingDaysThisMonth} dias úteis em {currentMonthName}
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
          Por que estas informações são importantes?
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- As marcas usarão isso para encontrar facções adequadas</li>
          <li>- Pedidos serão direcionados conforme sua capacidade disponível</li>
          <li>- Você poderá atualizar estas informações a qualquer momento</li>
        </ul>
      </div>
    </div>
  );
}
