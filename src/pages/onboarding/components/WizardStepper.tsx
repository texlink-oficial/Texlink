import React from 'react';
import { Check } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  description?: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
}

/**
 * Componente de progresso visual do wizard
 *
 * Exibe os steps com indicadores de:
 * - Completado (check verde)
 * - Atual (destaque azul)
 * - Pendente (cinza)
 */
export function WizardStepper({ steps, currentStep, completedSteps }: WizardStepperProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center">
                {/* Círculo do step */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm transition-all
                    ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <div
                    className={`
                      text-xs font-medium
                      ${isCurrent ? 'text-blue-600' : 'text-gray-600'}
                    `}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Linha conectora */}
              {!isLast && (
                <div
                  className={`
                    flex-1 h-1 mx-2 rounded transition-all
                    ${isCompleted
                      ? 'bg-green-500'
                      : isCurrent
                        ? 'bg-gradient-to-r from-blue-500 to-gray-200'
                        : 'bg-gray-200'
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
