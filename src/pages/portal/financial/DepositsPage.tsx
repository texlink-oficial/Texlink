import React from 'react';
import { Rocket, TrendingUp, CreditCard, PieChart, Bell } from 'lucide-react';

const upcomingFeatures = [
    { icon: TrendingUp, label: 'Extrato de recebimentos' },
    { icon: CreditCard, label: 'Gestão de pagamentos' },
    { icon: PieChart, label: 'Relatórios financeiros' },
    { icon: Bell, label: 'Alertas de vencimento' },
];

const DepositsPage: React.FC = () => {
    return (
        <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
                {/* Animated icon */}
                <div className="relative flex justify-center mb-8">
                    <div className="absolute inset-0 flex justify-center items-center">
                        <div className="w-32 h-32 bg-brand-500/10 dark:bg-brand-400/10 rounded-full animate-pulse" />
                    </div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl flex items-center justify-center shadow-xl shadow-brand-500/25">
                        <Rocket className="h-12 w-12 text-white -rotate-45" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    Em breve
                </h1>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg mb-8">
                    Estamos preparando ferramentas para facilitar a gestão financeira da sua empresa.
                </p>

                {/* Upcoming features */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {upcomingFeatures.map(({ icon: Icon, label }) => (
                        <div
                            key={label}
                            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-left"
                        >
                            <div className="w-9 h-9 bg-brand-50 dark:bg-brand-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                        </div>
                    ))}
                </div>

                {/* CTA note */}
                <p className="text-sm text-gray-400 dark:text-gray-500">
                    Você será notificado assim que esta funcionalidade estiver disponível.
                </p>
            </div>
        </div>
    );
};

export default DepositsPage;
