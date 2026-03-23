import React from 'react';
import { ShieldAlert, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PendingCompanyGateProps {
    children: React.ReactNode;
}

/**
 * Blocks brand users whose company is not yet ACTIVE from accessing
 * supplier-related pages. Shows a friendly "awaiting approval" message instead.
 */
const PendingCompanyGate: React.FC<PendingCompanyGateProps> = ({ children }) => {
    const { companyStatus, user } = useAuth();

    // Admins always pass, suppliers don't need this gate
    if (user?.role === 'ADMIN' || user?.role === 'SUPPLIER') {
        return <>{children}</>;
    }

    if (companyStatus === 'ACTIVE') {
        return <>{children}</>;
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full text-center px-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
                    {companyStatus === 'SUSPENDED' ? (
                        <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                    ) : (
                        <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    )}
                </div>

                {companyStatus === 'SUSPENDED' ? (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Empresa Suspensa
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            O acesso aos fornecedores foi suspenso. Entre em contato com o suporte para mais informações.
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Aguardando Homologação
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Sua empresa está em processo de aprovação. O acesso aos fornecedores será
                            liberado assim que a homologação for concluída.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
                            <Clock className="w-4 h-4" />
                            Status: Pendente
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PendingCompanyGate;
