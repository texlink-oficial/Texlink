import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CheckCircle2, ClipboardList, MessageSquare, FileCheck, BarChart3 } from 'lucide-react';

const steps = [
    { id: 1, name: 'Qualificação', path: '/brand-onboarding/qualificacao' },
    { id: 2, name: 'Produtos e Demanda', path: '/brand-onboarding/produtos' },
];

const features = [
    {
        icon: ClipboardList,
        title: 'Gestão de Pedidos',
        description: 'Acompanhe todo o ciclo de produção em tempo real',
    },
    {
        icon: FileCheck,
        title: 'Contratos Digitais',
        description: 'Geração e assinatura automática de contratos',
    },
    {
        icon: MessageSquare,
        title: 'Comunicação Integrada',
        description: 'Chat em tempo real entre marcas e facções',
    },
    {
        icon: BarChart3,
        title: 'Relatórios e Métricas',
        description: 'Dashboards com indicadores de desempenho',
    },
];

const BrandOnboardingLayout: React.FC = () => {
    const location = useLocation();

    const getCurrentStep = () => {
        if (location.pathname.includes('produtos')) return 2;
        return 1;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-10 xl:p-12 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-brand-400/5 rounded-full blur-2xl" />

                {/* Top - Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <svg
                                className="h-6 w-6 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">TEXLINK</span>
                    </div>
                </div>

                {/* Middle - Headline + Features */}
                <div className="relative z-10 flex-1 flex flex-col justify-center -mt-8">
                    <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">
                        Conectando marcas<br />
                        e facções de costura
                    </h2>
                    <p className="text-brand-300 text-base mb-10 max-w-sm">
                        Complete seu cadastro para encontrar as melhores facções e gerenciar sua produção.
                    </p>

                    <div className="space-y-5">
                        {features.map((feature) => (
                            <div key={feature.title} className="flex items-start gap-4 group">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                                    <feature.icon className="w-5 h-5 text-brand-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-0.5">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-brand-400 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom - Footer */}
                <div className="relative z-10">
                    <p className="text-xs text-brand-500">
                        &copy; {new Date().getFullYear()} Texlink. Todos os direitos reservados.
                    </p>
                </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 lg:bg-none lg:bg-white lg:dark:bg-gray-950">
                {/* Mobile-only logo */}
                <div className="lg:hidden flex items-center gap-3 p-6 pb-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <svg
                            className="h-5 w-5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white">TEXLINK</span>
                </div>

                {/* Progress Steps */}
                <div className="py-6 lg:py-8 px-6">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-sm font-medium text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 mb-4 text-center">
                            Cadastro de Marca
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm font-semibold ${step.id < currentStep
                                                    ? 'bg-green-500 text-white'
                                                    : step.id === currentStep
                                                        ? 'bg-brand-500 text-white ring-4 ring-brand-500/30'
                                                        : 'bg-white/10 text-white/50 lg:bg-gray-100 lg:text-gray-400 lg:dark:bg-gray-800 lg:dark:text-gray-500'
                                                }`}
                                        >
                                            {step.id < currentStep ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                                <span>{step.id}</span>
                                            )}
                                        </div>
                                        <span
                                            className={`text-xs font-medium ${step.id <= currentStep
                                                    ? 'text-white lg:text-gray-900 lg:dark:text-white'
                                                    : 'text-white/40 lg:text-gray-400'
                                                }`}
                                        >
                                            {step.name}
                                        </span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div
                                            className={`w-12 h-0.5 mx-1 ${step.id < currentStep
                                                    ? 'bg-green-500'
                                                    : 'bg-white/10 lg:bg-gray-200 lg:dark:bg-gray-700'
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scrollable content area */}
                <main className="flex-1 px-6 pb-8">
                    <div className="max-w-2xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default BrandOnboardingLayout;
