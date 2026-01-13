import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, ChevronRight } from 'lucide-react';

type AlertType = 'warning' | 'error' | 'info' | 'success';

interface AlertBannerProps {
    type?: AlertType;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    onDismiss?: () => void;
    className?: string;
}

const typeConfig: Record<AlertType, { bg: string; icon: React.ReactNode; iconColor: string }> = {
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        icon: <AlertTriangle className="h-5 w-5" />,
        iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        icon: <AlertCircle className="h-5 w-5" />,
        iconColor: 'text-red-600 dark:text-red-400',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        icon: <Info className="h-5 w-5" />,
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    success: {
        bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        icon: <CheckCircle className="h-5 w-5" />,
        iconColor: 'text-green-600 dark:text-green-400',
    },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
    type = 'warning',
    title,
    message,
    actionLabel,
    onAction,
    onDismiss,
    className = '',
}) => {
    const config = typeConfig[type];

    return (
        <div className={`rounded-xl border p-4 ${config.bg} ${className}`}>
            <div className="flex items-start gap-3">
                <div className={config.iconColor}>{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
                    {message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{message}</p>
                    )}
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mt-2"
                        >
                            {actionLabel}
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AlertBanner;
