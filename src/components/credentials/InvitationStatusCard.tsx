import React from 'react';
import { Send, Package, Eye, MousePointerClick, CheckCircle, Clock } from 'lucide-react';
import type { CredentialInvitation } from '../../types/credentials';

interface InvitationStatusCardProps {
    invitation: CredentialInvitation;
    compact?: boolean;
}

interface TimelineStep {
    label: string;
    icon: React.ElementType;
    timestamp?: string;
    isComplete: boolean;
    isActive: boolean;
    color: string;
}

/**
 * Componente para exibir a timeline de rastreamento de um convite de credenciamento.
 * Exibe status: SENT → DELIVERED → OPENED → CLICKED
 */
export const InvitationStatusCard: React.FC<InvitationStatusCardProps> = ({
    invitation,
    compact = false,
}) => {
    // Extrai timestamps do convite (baseado no schema do backend)
    const sentAt = invitation.sentAt;
    const deliveredAt = (invitation as any).deliveredAt;
    const openedAt = invitation.openedAt;
    const clickedAt = (invitation as any).clickedAt;

    // Define os passos da timeline
    const steps: TimelineStep[] = [
        {
            label: 'Enviado',
            icon: Send,
            timestamp: sentAt,
            isComplete: !!sentAt,
            isActive: !!sentAt && !deliveredAt,
            color: 'blue',
        },
        {
            label: 'Entregue',
            icon: Package,
            timestamp: deliveredAt,
            isComplete: !!deliveredAt,
            isActive: !!deliveredAt && !openedAt,
            color: 'green',
        },
        {
            label: 'Aberto',
            icon: Eye,
            timestamp: openedAt,
            isComplete: !!openedAt,
            isActive: !!openedAt && !clickedAt,
            color: 'purple',
        },
        {
            label: 'Link Clicado',
            icon: MousePointerClick,
            timestamp: clickedAt,
            isComplete: !!clickedAt,
            isActive: !!clickedAt,
            color: 'amber',
        },
    ];

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return null;

        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Agora mesmo';
            if (diffMins < 60) return `${diffMins} min atrás`;
            if (diffHours < 24) return `${diffHours}h atrás`;
            if (diffDays < 7) return `${diffDays}d atrás`;

            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return null;
        }
    };

    const getStepColorClasses = (color: string, isComplete: boolean, isActive: boolean) => {
        if (!isComplete) {
            return {
                icon: 'text-gray-300 dark:text-gray-600',
                bg: 'bg-gray-100 dark:bg-gray-700',
                text: 'text-gray-400 dark:text-gray-500',
            };
        }

        const colorMap = {
            blue: {
                icon: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                text: 'text-blue-600 dark:text-blue-400',
            },
            green: {
                icon: 'text-green-600 dark:text-green-400',
                bg: 'bg-green-100 dark:bg-green-900/30',
                text: 'text-green-600 dark:text-green-400',
            },
            purple: {
                icon: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-100 dark:bg-purple-900/30',
                text: 'text-purple-600 dark:text-purple-400',
            },
            amber: {
                icon: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-100 dark:bg-amber-900/30',
                text: 'text-amber-600 dark:text-amber-400',
            },
        };

        return colorMap[color as keyof typeof colorMap] || colorMap.blue;
    };

    // Modo compacto - apenas ícones horizontais
    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const colors = getStepColorClasses(step.color, step.isComplete, step.isActive);

                    return (
                        <div key={index} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg}`}
                                title={`${step.label}${step.timestamp ? `: ${formatTimestamp(step.timestamp)}` : ''}`}
                            >
                                <Icon className={`w-4 h-4 ${colors.icon}`} />
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`w-6 h-0.5 mx-1 ${step.isComplete ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Modo completo - timeline vertical
    return (
        <div className="space-y-1">
            {steps.map((step, index) => {
                const Icon = step.icon;
                const colors = getStepColorClasses(step.color, step.isComplete, step.isActive);
                const timestamp = formatTimestamp(step.timestamp);

                return (
                    <div key={index} className="flex items-start gap-3">
                        {/* Icon and connector line */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} transition-all`}
                            >
                                {step.isComplete ? (
                                    <CheckCircle className={`w-5 h-5 ${colors.icon}`} />
                                ) : (
                                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                                )}
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`w-0.5 h-8 ${step.isComplete ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-2 pb-4">
                            <div className="flex items-center justify-between">
                                <p className={`font-medium ${colors.text}`}>
                                    {step.label}
                                </p>
                                {timestamp && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {timestamp}
                                    </p>
                                )}
                            </div>
                            {!step.isComplete && step.isActive && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Aguardando próximo status...
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default InvitationStatusCard;
