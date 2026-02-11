import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: 'red' | 'amber';
    showReasonField?: boolean;
    reasonLabel?: string;
    onConfirm: (reason?: string) => Promise<void>;
    onClose: () => void;
}

export default function ConfirmActionModal({ title, message, confirmLabel, confirmColor = 'red', showReasonField = false, reasonLabel, onConfirm, onClose }: Props) {
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm(showReasonField ? reason : undefined);
        } finally {
            setIsLoading(false);
        }
    };

    const colorClasses = confirmColor === 'red'
        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 ${confirmColor === 'red' ? 'text-rose-500' : 'text-amber-500'}`} />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>

                    {showReasonField && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                {reasonLabel || 'Motivo'}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Descreva o motivo (opcional)..."
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`px-8 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses}`}
                    >
                        {isLoading ? 'Processando...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
