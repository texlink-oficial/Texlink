import React from 'react';
import {
    Package, CheckCircle, Box, Truck, Scissors,
    PackageCheck, ClipboardCheck, CheckCircle2, Clock, ListOrdered, CreditCard
} from 'lucide-react';
import { Order, OrderStatus, StatusHistoryEntry } from '../../services/orders.service';

interface TimelineStep {
    label: string;
    status: OrderStatus;
    icon: React.FC<{ className?: string }>;
    responsible: 'Marca' | 'Facção' | 'Ambos';
}

const FULL_FLOW_STEPS: TimelineStep[] = [
    { label: 'Pedido Criado', status: 'LANCADO_PELA_MARCA', icon: Package, responsible: 'Marca' },
    { label: 'Aceito pela Facção', status: 'ACEITO_PELA_FACCAO', icon: CheckCircle, responsible: 'Facção' },
    { label: 'Insumos em Preparação', status: 'EM_PREPARACAO_SAIDA_MARCA', icon: Box, responsible: 'Marca' },
    { label: 'Insumos em Trânsito', status: 'EM_TRANSITO_PARA_FACCAO', icon: Truck, responsible: 'Marca' },
    { label: 'Recebido pela Facção', status: 'EM_PREPARACAO_ENTRADA_FACCAO', icon: PackageCheck, responsible: 'Facção' },
    { label: 'Fila de Produção', status: 'FILA_DE_PRODUCAO', icon: ListOrdered, responsible: 'Facção' },
    { label: 'Em Produção', status: 'EM_PRODUCAO', icon: Scissors, responsible: 'Facção' },
    { label: 'Produção Concluída', status: 'PRONTO', icon: PackageCheck, responsible: 'Facção' },
    { label: 'Em Trânsito → Marca', status: 'EM_TRANSITO_PARA_MARCA', icon: Truck, responsible: 'Ambos' },
    { label: 'Em Revisão', status: 'EM_REVISAO', icon: ClipboardCheck, responsible: 'Marca' },
    { label: 'Em Processo de Pagamento', status: 'EM_PROCESSO_PAGAMENTO', icon: CreditCard, responsible: 'Marca' },
    { label: 'Finalizado', status: 'FINALIZADO', icon: CheckCircle2, responsible: 'Marca' },
];

const SIMPLE_FLOW_STEPS: TimelineStep[] = [
    { label: 'Pedido Criado', status: 'LANCADO_PELA_MARCA', icon: Package, responsible: 'Marca' },
    { label: 'Aceito pela Facção', status: 'ACEITO_PELA_FACCAO', icon: CheckCircle, responsible: 'Facção' },
    { label: 'Fila de Produção', status: 'FILA_DE_PRODUCAO', icon: ListOrdered, responsible: 'Facção' },
    { label: 'Em Produção', status: 'EM_PRODUCAO', icon: Scissors, responsible: 'Facção' },
    { label: 'Produção Concluída', status: 'PRONTO', icon: PackageCheck, responsible: 'Facção' },
    { label: 'Em Trânsito → Marca', status: 'EM_TRANSITO_PARA_MARCA', icon: Truck, responsible: 'Ambos' },
    { label: 'Em Revisão', status: 'EM_REVISAO', icon: ClipboardCheck, responsible: 'Marca' },
    { label: 'Em Processo de Pagamento', status: 'EM_PROCESSO_PAGAMENTO', icon: CreditCard, responsible: 'Marca' },
    { label: 'Finalizado', status: 'FINALIZADO', icon: CheckCircle2, responsible: 'Marca' },
];

// Terminal statuses that map to the "Finalizado" step position
const TERMINAL_STATUSES: OrderStatus[] = ['FINALIZADO', 'PARCIALMENTE_APROVADO', 'REPROVADO', 'CANCELADO'];
const TERMINAL_LABELS: Record<string, string> = {
    FINALIZADO: 'Finalizado',
    PARCIALMENTE_APROVADO: 'Parcialmente Aprovado',
    REPROVADO: 'Reprovado',
    CANCELADO: 'Cancelado',
};

// All statuses in order for index comparison
const STATUS_ORDER: OrderStatus[] = [
    'LANCADO_PELA_MARCA',
    'ACEITO_PELA_FACCAO',
    'EM_PREPARACAO_SAIDA_MARCA',
    'EM_TRANSITO_PARA_FACCAO',
    'EM_PREPARACAO_ENTRADA_FACCAO',
    'FILA_DE_PRODUCAO',
    'EM_PRODUCAO',
    'PRONTO',
    'EM_TRANSITO_PARA_MARCA',
    'EM_REVISAO',
    'EM_PROCESSO_PAGAMENTO',
    'FINALIZADO',
    'PARCIALMENTE_APROVADO',
    'REPROVADO',
    'CANCELADO',
];

function getStatusIndex(status: OrderStatus): number {
    const idx = STATUS_ORDER.indexOf(status);
    return idx >= 0 ? idx : -1;
}

function getHistoryDate(
    statusHistory: StatusHistoryEntry[] | undefined,
    targetStatus: OrderStatus,
): string | null {
    if (!statusHistory) return null;
    const entry = statusHistory.find((h) => h.newStatus === targetStatus);
    return entry ? entry.createdAt : null;
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

interface OrderTimelineProps {
    order: Order;
    waitingLabel?: string;
    compact?: boolean;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ order, waitingLabel, compact = false }) => {
    const steps = order.materialsProvided ? FULL_FLOW_STEPS : SIMPLE_FLOW_STEPS;
    const currentStatusIndex = getStatusIndex(order.status);
    const isTerminal = TERMINAL_STATUSES.includes(order.status);

    return (
        <div className={`relative ${compact ? '' : 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6'}`}>
            {!compact && (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progresso</h2>
            )}
            <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                <div className="space-y-4">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const stepStatusIndex = getStatusIndex(step.status);
                        const isLastStep = step.status === 'FINALIZADO';

                        // Determine completion state
                        let isCompleted = stepStatusIndex <= currentStatusIndex;
                        let isCurrent = step.status === order.status;
                        let displayLabel = step.label;

                        // Handle terminal statuses on the last step
                        if (isLastStep && isTerminal) {
                            isCompleted = true;
                            isCurrent = true;
                            displayLabel = TERMINAL_LABELS[order.status] || step.label;
                        }

                        // If current is a terminal status, only the last step shows as current
                        if (isTerminal && !isLastStep) {
                            isCompleted = stepStatusIndex < getStatusIndex('EM_REVISAO') || stepStatusIndex <= currentStatusIndex;
                            isCurrent = false;
                            // All steps before and including EM_REVISAO are completed
                            if (stepStatusIndex <= getStatusIndex('EM_REVISAO')) {
                                isCompleted = true;
                            }
                        }

                        const historyDate = getHistoryDate(order.statusHistory, step.status);

                        return (
                            <div key={step.status} className="relative flex items-start gap-4 pl-10">
                                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isCompleted
                                        ? isCurrent
                                            ? 'bg-brand-500 text-white ring-4 ring-brand-200 dark:ring-brand-900'
                                            : 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                } ${isCurrent && !isTerminal ? 'animate-pulse' : ''}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm ${
                                            isCompleted
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-400 dark:text-gray-500'
                                        }`}>
                                            {displayLabel}
                                        </p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                            isCompleted
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                                        }`}>
                                            {step.responsible}
                                        </span>
                                    </div>
                                    {historyDate && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {formatDateTime(historyDate)}
                                        </p>
                                    )}
                                    {isCurrent && waitingLabel && !isTerminal && (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Clock className="w-3 h-3 text-amber-500" />
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                {waitingLabel}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {isCompleted && !isCurrent && (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
