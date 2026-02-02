import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast, Toast, ToastType } from '../../contexts/ToastContext';

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string; iconComponent: React.ElementType }> = {
    success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-500',
        iconComponent: CheckCircle,
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-500',
        iconComponent: XCircle,
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-500',
        iconComponent: AlertTriangle,
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-500',
        iconComponent: Info,
    },
};

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const style = TOAST_STYLES[toast.type];
    const Icon = style.iconComponent;

    return (
        <div
            className={`
                flex items-start gap-3 p-4 rounded-lg border shadow-lg
                ${style.bg} ${style.border}
                animate-in slide-in-from-right-full duration-300
            `}
            role="alert"
        >
            <Icon className={`h-5 w-5 flex-shrink-0 ${style.icon}`} />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {toast.title}
                </p>
                {toast.message && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {toast.message}
                    </p>
                )}
            </div>

            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onRemove={removeToast} />
                </div>
            ))}
        </div>
    );
}

export default ToastContainer;
