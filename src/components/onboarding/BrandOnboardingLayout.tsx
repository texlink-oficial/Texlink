import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CheckCircle2, Building2 } from 'lucide-react';

const steps = [
    { id: 1, name: 'Qualificação', path: '/brand-onboarding/qualificacao' },
    { id: 2, name: 'Produtos e Demanda', path: '/brand-onboarding/produtos' },
];

const BrandOnboardingLayout: React.FC = () => {
    const location = useLocation();

    const getCurrentStep = () => {
        if (location.pathname.includes('produtos')) return 2;
        return 1;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 flex flex-col">
            {/* Header */}
            <header className="p-6 border-b border-white/10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-brand-400" />
                        <h1 className="text-2xl font-bold text-white">TEXLINK</h1>
                    </div>
                    <span className="text-brand-300 text-sm">Cadastro de Marca</span>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="py-8 border-b border-white/10">
                <div className="max-w-2xl mx-auto px-6">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center gap-2">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step.id < currentStep
                                                ? 'bg-green-500 text-white'
                                                : step.id === currentStep
                                                    ? 'bg-brand-500 text-white ring-4 ring-brand-500/30'
                                                    : 'bg-white/10 text-white/50'
                                            }`}
                                    >
                                        {step.id < currentStep ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <span className="text-sm font-bold">{step.id}</span>
                                        )}
                                    </div>
                                    <span
                                        className={`text-xs font-medium ${step.id <= currentStep ? 'text-white' : 'text-white/40'
                                            }`}
                                    >
                                        {step.name}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`flex-1 h-0.5 mx-4 ${step.id < currentStep ? 'bg-green-500' : 'bg-white/10'
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 py-8 px-6">
                <div className="max-w-2xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default BrandOnboardingLayout;
