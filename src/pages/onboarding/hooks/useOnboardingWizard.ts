import { useState, useEffect, useMemo } from 'react';
import { onboardingService } from '../../../services/onboarding.service';

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  documentsUploadedAt?: string;
  contractSignedAt?: string;
  credential?: {
    contactEmail?: string;
    tradeName?: string;
  };
}

export interface UseOnboardingWizardReturn {
  currentStep: number;
  totalSteps: number;
  canProgress: boolean;
  isLoading: boolean;
  error: string | null;
  progress: OnboardingProgress | null;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  refreshProgress: () => Promise<void>;
}

/**
 * Hook para gerenciar estado e navegação do wizard de onboarding
 *
 * @param token - Token do convite de credenciamento
 * @returns Estado e métodos para controlar o wizard
 */
export function useOnboardingWizard(token: string): UseOnboardingWizardReturn {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 6;

  // Buscar progresso do backend
  const fetchProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await onboardingService.getProgress(token);

      if (data) {
        setProgress(data);
        // Define step atual baseado no progresso
        setCurrentStep(data.currentStep || 1);
      }
    } catch (err: any) {
      console.error('Erro ao buscar progresso:', err);
      setError(err.message || 'Erro ao carregar progresso do onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar progresso ao montar
  useEffect(() => {
    if (token) {
      fetchProgress();
    }
  }, [token]);

  // Determina se pode avançar para próximo step
  const canProgress = useMemo(() => {
    if (!progress) return false;

    // Verifica se o step atual foi completado
    const isCurrentStepCompleted = progress.completedSteps.includes(currentStep);

    // Permite avançar se:
    // 1. Step atual está completo
    // 2. OU está no último step (para permitir revisão)
    return isCurrentStepCompleted || currentStep === totalSteps;
  }, [currentStep, progress, totalSteps]);

  // Navegação
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  const refreshProgress = async () => {
    await fetchProgress();
  };

  return {
    currentStep,
    totalSteps,
    canProgress,
    isLoading,
    error,
    progress,
    nextStep,
    prevStep,
    goToStep,
    refreshProgress,
  };
}
