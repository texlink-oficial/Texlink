import React, { useState } from 'react';
import { Briefcase, Users, Clock, DollarSign, Building2 } from 'lucide-react';

interface Step3CompanyDataProps {
  token: string;
  onComplete: () => void;
}

interface CompanyData {
  interesse?: string;
  faturamentoDesejado?: number;
  maturidadeGestao?: string;
  qtdColaboradores?: number;
  tempoMercado?: string;
}

const interestOptions = [
  'Aumentar faturamento',
  'Diversificar clientes',
  'Otimizar capacidade ociosa',
  'Crescer o negócio',
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

const revenueOptions = [
  { value: 10000, label: 'Até R$ 10.000/mês' },
  { value: 30000, label: 'R$ 10.000 - R$ 30.000/mês' },
  { value: 50000, label: 'R$ 30.000 - R$ 50.000/mês' },
  { value: 100000, label: 'R$ 50.000 - R$ 100.000/mês' },
  { value: 200000, label: 'Mais de R$ 100.000/mês' },
];

/**
 * Step 3: Dados da Empresa
 *
 * Coleta informações sobre o negócio da facção:
 * - Interesse na plataforma
 * - Maturidade de gestão
 * - Tempo de mercado
 * - Quantidade de colaboradores
 * - Faturamento desejado
 */
export function Step3CompanyData({ token, onComplete }: Step3CompanyDataProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CompanyData>({
    interesse: '',
    faturamentoDesejado: undefined,
    maturidadeGestao: '',
    qtdColaboradores: undefined,
    tempoMercado: '',
  });

  const isFormValid =
    formData.interesse &&
    formData.maturidadeGestao &&
    formData.tempoMercado &&
    formData.qtdColaboradores &&
    formData.faturamentoDesejado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Integrar com API
      // await onboardingService.updateCompanyData(token, formData);

      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar dados da empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Qualificação do Negócio
        </h2>
        <p className="text-gray-600">
          Conte-nos mais sobre sua facção para entendermos melhor seu perfil
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Interesse */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Briefcase className="w-4 h-4" />
            Por que deseja se cadastrar na plataforma?
          </label>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormData({ ...formData, interesse: option })}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  formData.interesse === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-blue-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Maturidade de Gestão */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Clock className="w-4 h-4" />
            Nível de maturidade na gestão
          </label>
          <select
            value={formData.maturidadeGestao}
            onChange={(e) =>
              setFormData({ ...formData, maturidadeGestao: e.target.value })
            }
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Selecione...</option>
            {maturityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tempo no Mercado */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Clock className="w-4 h-4" />
            Tempo de atuação no mercado
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {timeInMarketOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, tempoMercado: option })
                }
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  formData.tempoMercado === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-blue-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Colaboradores */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
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
            placeholder="Ex: 15"
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Faturamento Desejado */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <DollarSign className="w-4 h-4" />
            Faturamento mensal desejado
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {revenueOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, faturamentoDesejado: opt.value })
                }
                className={`px-4 py-3 rounded-lg text-sm text-left transition-all ${
                  formData.faturamentoDesejado === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-blue-500'
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
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvando dados...' : 'Salvar e Continuar'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>💡 Dica:</strong> Estas informações ajudam as marcas a
          entenderem melhor seu perfil e a oferecerem oportunidades adequadas
          ao seu negócio.
        </p>
      </div>
    </div>
  );
}
