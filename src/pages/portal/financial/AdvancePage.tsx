import React from 'react';
import { Construction } from 'lucide-react';

const AdvancePage: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <Construction className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Em Desenvolvimento
                </h1>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    Aguarde! Estamos desenvolvendo uma funcionalidade para uma melhor
                    gestão da rotina financeira da sua empresa.
                </p>
            </div>
        </div>
    );
};

export default AdvancePage;
