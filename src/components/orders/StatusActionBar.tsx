import React, { useEffect, useState } from 'react';
import {
    ChevronRight, Clock, Loader2, X, AlertTriangle, FileEdit
} from 'lucide-react';
import {
    ordersService,
    Order,
    OrderStatus,
    TransitionResponse,
    AvailableTransition,
    OrderReview,
} from '../../services/orders.service';
import { OrderReviewModal } from './OrderReviewModal';

interface StatusActionBarProps {
    order: Order;
    onStatusUpdated: () => void;
}

export const StatusActionBar: React.FC<StatusActionBarProps> = ({ order, onStatusUpdated }) => {
    const [transitions, setTransitions] = useState<TransitionResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [confirmTransition, setConfirmTransition] = useState<AvailableTransition | null>(null);
    const [notes, setNotes] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);

    useEffect(() => {
        loadTransitions();
    }, [order.id, order.status]);

    const loadTransitions = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getAvailableTransitions(order.id);
            setTransitions(data);
        } catch (error) {
            console.error('Error loading transitions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTransitionClick = (transition: AvailableTransition) => {
        if (transition.requiresReview) {
            setShowReviewModal(true);
            return;
        }
        if (transition.requiresConfirmation) {
            setConfirmTransition(transition);
            setNotes('');
            return;
        }
        executeTransition(transition.nextStatus);
    };

    const executeTransition = async (nextStatus: OrderStatus, transitionNotes?: string) => {
        setIsAdvancing(true);
        try {
            await ordersService.advanceStatus(order.id, nextStatus, transitionNotes);
            setConfirmTransition(null);
            setNotes('');
            onStatusUpdated();
        } catch (error) {
            console.error('Error advancing status:', error);
        } finally {
            setIsAdvancing(false);
        }
    };

    const handleConfirm = () => {
        if (!confirmTransition) return;
        executeTransition(confirmTransition.nextStatus, notes || undefined);
    };

    const handleReviewComplete = (_review: OrderReview) => {
        setShowReviewModal(false);
        onStatusUpdated();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-3">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (!transitions) return null;

    // Waiting state
    if (!transitions.canAdvance && transitions.waitingFor) {
        return (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {transitions.waitingLabel}
                    </p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
                        {transitions.waitingFor === 'BRAND'
                            ? 'A marca precisa realizar a próxima ação'
                            : 'A facção precisa realizar a próxima ação'}
                    </p>
                </div>
            </div>
        );
    }

    // No transitions available (terminal state)
    if (transitions.transitions.length === 0) {
        return null;
    }

    return (
        <>
            <div className="flex gap-3">
                {transitions.transitions.map((transition) => {
                    const isReview = transition.requiresReview;
                    return (
                        <button
                            key={transition.nextStatus}
                            onClick={() => handleTransitionClick(transition)}
                            disabled={isAdvancing}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                                isReview
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                    : 'bg-brand-600 hover:bg-brand-500 text-white'
                            }`}
                        >
                            {isAdvancing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isReview ? (
                                <FileEdit className="w-5 h-5" />
                            ) : (
                                <ChevronRight className="w-5 h-5" />
                            )}
                            {transition.label}
                        </button>
                    );
                })}
            </div>

            {/* Confirmation Modal */}
            {confirmTransition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {confirmTransition.label}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {confirmTransition.description}
                                </p>
                            </div>
                        </div>

                        {confirmTransition.requiresNotes && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Observações
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Adicione notas ou observações..."
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none h-20"
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmTransition(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isAdvancing}
                                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAdvancing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && (
                <OrderReviewModal
                    order={order}
                    isOpen={showReviewModal}
                    onClose={() => setShowReviewModal(false)}
                    onReviewComplete={handleReviewComplete}
                />
            )}
        </>
    );
};
