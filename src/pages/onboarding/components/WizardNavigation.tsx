import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProgress: boolean;
  canGoBack?: boolean;
  isLastStep?: boolean;
  isLoading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  nextButtonLabel?: string;
}

/**
 * Componente de navegação do wizard (botões prev/next)
 */
export function WizardNavigation({
  currentStep,
  totalSteps,
  canProgress,
  canGoBack = true,
  isLastStep = false,
  isLoading = false,
  onPrev,
  onNext,
  nextButtonLabel,
}: WizardNavigationProps) {
  const showBackButton = currentStep > 1 && canGoBack;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      {/* Botão Voltar */}
      {showBackButton ? (
        <button
          onClick={onPrev}
          disabled={isLoading}
          className="
            flex items-center gap-2 px-4 py-2 text-sm font-medium
            text-gray-700 bg-white border border-gray-300 rounded-md
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
      ) : (
        <div /> // Spacer
      )}

      {/* Indicador de progresso */}
      <div className="text-sm text-gray-500">
        Etapa {currentStep} de {totalSteps}
      </div>

      {/* Botão Avançar */}
      <button
        onClick={onNext}
        disabled={!canProgress || isLoading}
        className="
          flex items-center gap-2 px-6 py-2 text-sm font-medium
          text-white bg-blue-600 rounded-md
          hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processando...
          </>
        ) : (
          <>
            {nextButtonLabel || (isLastStep ? 'Finalizar' : 'Continuar')}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </>
        )}
      </button>
    </div>
  );
}
