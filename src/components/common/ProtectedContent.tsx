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
            <div className="absolute inset-0 bg-brand-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center p-4">
                    <Lock className="w-6 h-6 text-brand-400 mx-auto mb-2" />
                    <p className="text-sm text-brand-300 font-medium">{message}</p>
                </div>
            </div>
            <div className="blur-sm pointer-events-none select-none opacity-30">
                {children}
            </div>
        </div>
    );
};

export default ProtectedContent;
