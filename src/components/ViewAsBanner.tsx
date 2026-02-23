import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';

export const ViewAsBanner: React.FC = () => {
    const { viewAs, exitViewAs } = useAuth();
    const navigate = useNavigate();

    if (!viewAs) return null;

    const roleLabel = viewAs.role === 'SUPPLIER' ? 'Facção' : 'Marca';

    const handleExit = () => {
        exitViewAs();
        navigate('/admin');
    };

    return (
        <>
            {/* Fixed banner */}
            <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                    Visualizando como: <strong>{roleLabel}</strong> - {viewAs.companyName}
                </span>
                <button
                    onClick={handleExit}
                    className="ml-4 inline-flex items-center gap-1 px-3 py-1 bg-amber-900/20 hover:bg-amber-900/40 rounded-lg transition-colors font-semibold"
                >
                    <X className="w-3.5 h-3.5" />
                    Sair
                </button>
            </div>
            {/* Spacer to push content below the fixed banner */}
            <div className="h-10" />
        </>
    );
};
