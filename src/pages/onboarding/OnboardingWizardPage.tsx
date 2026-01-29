import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { OnboardingLayout } from '../../components/layout/OnboardingLayout';
import { useOnboardingWizard } from './hooks/useOnboardingWizard';
import { WizardStepper, type WizardStep } from './components/WizardStepper';
import { WizardNavigation } from './components/WizardNavigation';

// Import dos steps
import {
  Step1EmailVerification,
  Step2PasswordCreation,
  Step3CompanyData,
  Step4DocumentsUpload,
  Step5Capabilities,
  Step6ContractReview,
} from './steps';

/**
 * Página principal do wizard de onboarding
 *
 * Gerencia 6 etapas:
 * 1. Verificação de email
 * 2. Criação de senha
 * 3. Dados da empresa
 * 4. Upload de documentos
 * 5. Capacidades produtivas
 * 6. Revisão e assinatura de contrato
 */
export function OnboardingWizardPage() {
  const { token } = useParams<{ token: string }>();

  // Hook de gerenciamento do wizard
  const {
    currentStep,
    totalSteps,
    canProgress,
    isLoading,
    error,
    progress,
    nextStep,
    prevStep,
    refreshProgress,
  } = useOnboardingWizard(token!);

  // Configuração dos steps
  const steps: WizardStep[] = [
    { id: 1, label: 'Email', description: 'Verificação' },
    { id: 2, label: 'Senha', description: 'Criar conta' },
    { id: 3, label: 'Dados', description: 'Empresa' },
    { id: 4, label: 'Documentos', description: 'Upload' },
    { id: 5, label: 'Capacidades', description: 'Produção' },
    { id: 6, label: 'Contrato', description: 'Assinatura' },
  ];

  // Validação de token
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Loading inicial
  if (isLoading && !progress) {
    return (
      <OnboardingLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Carregando informações...</p>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // Erro
  if (error) {
    return (
      <OnboardingLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar onboarding</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Processo de Credenciamento
          </h1>
          <p className="text-gray-600">
            Complete as etapas abaixo para finalizar seu credenciamento
          </p>
        </div>

        {/* Stepper */}
        <WizardStepper
          steps={steps}
          currentStep={currentStep}
          completedSteps={progress?.completedSteps || []}
        />

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          {/* Step 1 - Email Verification */}
          {currentStep === 1 && progress && (
            <Step1EmailVerification
              token={token}
              email={progress.credential?.contactEmail || 'N/A'}
              onComplete={() => {
                nextStep();
                refreshProgress();
              }}
            />
          )}

          {/* Step 2 - Password Creation */}
          {currentStep === 2 && progress && (
            <Step2PasswordCreation
              token={token}
              email={progress.credential?.contactEmail || 'N/A'}
              onComplete={() => {
                nextStep();
                refreshProgress();
              }}
            />
          )}

          {/* Step 3 - Company Data */}
          {currentStep === 3 && (
            <Step3CompanyData
              token={token}
              onComplete={() => {
                nextStep();
                refreshProgress();
              }}
            />
          )}

          {/* Step 4 - Documents Upload */}
          {currentStep === 4 && (
            <Step4DocumentsUpload
              token={token}
              onComplete={() => {
                nextStep();
                refreshProgress();
              }}
            />
          )}

          {/* Step 5 - Capabilities */}
          {currentStep === 5 && (
            <Step5Capabilities
              token={token}
              onComplete={() => {
                nextStep();
                refreshProgress();
              }}
            />
          )}

          {/* Step 6 - Contract Review */}
          {currentStep === 6 && (
            <Step6ContractReview
              token={token}
              onComplete={() => {
                // Wizard completo!
                refreshProgress();
              }}
            />
          )}
        </div>

        {/* Navigation */}
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          canProgress={canProgress}
          isLoading={isLoading}
          onPrev={prevStep}
          onNext={nextStep}
          isLastStep={currentStep === totalSteps}
        />

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && progress && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs">
            <div className="font-mono">
              <div>Current Step: {currentStep}</div>
              <div>Completed Steps: [{progress.completedSteps.join(', ')}]</div>
              <div>Can Progress: {canProgress ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
