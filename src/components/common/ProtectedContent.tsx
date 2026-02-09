import React from 'react';
import { Lock } from 'lucide-react';

interface ProtectedContentProps {
    isProtected: boolean;
    children: React.ReactNode;
    message?: string;
}

/**
 * Componente que exibe conteúdo protegido com overlay de blur
 * Usado para proteger ficha técnica e observações até que o pedido seja aceito
 */
export const ProtectedContent: React.FC<ProtectedContentProps> = ({
    isProtected,
    children,
    message = 'Aceite o pedido para visualizar',
}) => {
    if (!isProtected) return <>{children}</>;

    return (
        <div className="relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-brand-100/90 dark:bg-brand-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex items-center gap-2 p-4">
                    <Lock className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                    <p className="text-sm text-brand-700 dark:text-brand-300 font-medium">{message}</p>
                </div>
            </div>
            <div className="blur-sm pointer-events-none select-none opacity-30">
                {children}
            </div>
        </div>
    );
};

export default ProtectedContent;
