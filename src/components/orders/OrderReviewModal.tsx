import React, { useState, useEffect } from 'react';
import {
    X, CheckCircle, XCircle, AlertTriangle, Package, Plus,
    Trash2, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { ordersService, Order, ReviewType, OrderReview } from '../../services/orders.service';

interface OrderReviewModalProps {
    order: Order;
    isOpen: boolean;
    onClose: () => void;
    onReviewComplete: (review: OrderReview, childOrderCreated?: boolean) => void;
}

interface RejectedItemInput {
    reason: string;
    quantity: number;
    defectDescription?: string;
    requiresRework: boolean;
}

interface SecondQualityInput {
    quantity: number;
    defectType: string;
    defectDescription?: string;
    discountPercentage: number;
}

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
    order,
    isOpen,
    onClose,
    onReviewComplete
}) => {
    const [reviewType, setReviewType] = useState<ReviewType>('FINAL_REVIEW');
    const [approvedQty, setApprovedQty] = useState(order.quantity);
    const [rejectedQty, setRejectedQty] = useState(0);
    const [secondQualityQty, setSecondQualityQty] = useState(0);
    const [notes, setNotes] = useState('');
    const [rejectedItems, setRejectedItems] = useState<RejectedItemInput[]>([]);
    const [secondQualityItems, setSecondQualityItems] = useState<SecondQualityInput[]>([]);
    const [createChildOrder, setCreateChildOrder] = useState(false);
    const [childDeadline, setChildDeadline] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Reset when order changes
    useEffect(() => {
        setApprovedQty(order.quantity);
        setRejectedQty(0);
        setSecondQualityQty(0);
        setRejectedItems([]);
        setSecondQualityItems([]);
        setCreateChildOrder(false);
    }, [order.id]);

    // Validate quantities
    const totalQty = approvedQty + rejectedQty + secondQualityQty;
    const isValid = totalQty === order.quantity &&
        approvedQty >= 0 &&
        rejectedQty >= 0 &&
        secondQualityQty >= 0;

    const getResultPreview = () => {
        if (rejectedQty === 0 && secondQualityQty === 0) return { label: 'Aprovado', color: 'green', icon: CheckCircle };
        if (approvedQty === 0) return { label: 'Reprovado', color: 'red', icon: XCircle };
        return { label: 'Parcial', color: 'amber', icon: AlertTriangle };
    };

    const result = getResultPreview();
    const ResultIcon = result.icon;

    const handleAddRejectedItem = () => {
        setRejectedItems([...rejectedItems, { reason: '', quantity: 1, requiresRework: true }]);
    };

    const handleRemoveRejectedItem = (index: number) => {
        setRejectedItems(rejectedItems.filter((_, i) => i !== index));
    };

    const handleAddSecondQualityItem = () => {
        setSecondQualityItems([...secondQualityItems, { quantity: 1, defectType: '', discountPercentage: 20 }]);
    };

    const handleRemoveSecondQualityItem = (index: number) => {
        setSecondQualityItems(secondQualityItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!isValid) return;

        setIsSubmitting(true);
        try {
            // Create review
            const review = await ordersService.createReview(order.id, {
                type: reviewType,
                totalQuantity: order.quantity,
                approvedQuantity: approvedQty,
                rejectedQuantity: rejectedQty,
                secondQualityQuantity: secondQualityQty,
                notes: notes || undefined,
                rejectedItems: rejectedItems.length > 0 ? rejectedItems : undefined,
                secondQualityItems: secondQualityItems.length > 0 ? secondQualityItems : undefined,
            });

            // Create child order if needed
            let childCreated = false;
            if (createChildOrder && rejectedQty > 0) {
                await ordersService.createChildOrder(order.id, {
                    quantity: rejectedQty,
                    description: `Retrabalho: ${rejectedItems.map(i => i.reason).join(', ')}`,
                    deliveryDeadline: childDeadline || undefined,
                });
                childCreated = true;
            }

            onReviewComplete(review, childCreated);
            onClose();
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Revisão de Qualidade
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {order.displayId} • {order.productName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Review Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de Revisão
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setReviewType('FINAL_REVIEW')}
                                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${reviewType === 'FINAL_REVIEW'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                            >
                                <div className="font-medium">Revisão Final</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Antes de finalizar o pedido</div>
                            </button>
                            <button
                                onClick={() => setReviewType('QUALITY_CHECK')}
                                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${reviewType === 'QUALITY_CHECK'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                            >
                                <div className="font-medium">Verificação</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Durante a produção</div>
                            </button>
                        </div>
                    </div>

                    {/* Quantities */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Quantidade Total
                            </span>
                            <span className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-gray-400" />
                                {order.quantity} peças
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Approved */}
                            <div>
                                <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                                    <CheckCircle className="w-3 h-3 inline mr-1" />
                                    Aprovadas
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={order.quantity}
                                    value={approvedQty}
                                    onChange={(e) => setApprovedQty(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg text-center font-bold text-green-700 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {/* Rejected */}
                            <div>
                                <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                                    <XCircle className="w-3 h-3 inline mr-1" />
                                    Reprovadas
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={order.quantity}
                                    value={rejectedQty}
                                    onChange={(e) => setRejectedQty(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg text-center font-bold text-red-700 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            {/* Second Quality */}
                            <div>
                                <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                                    2ª Qualidade
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={order.quantity}
                                    value={secondQualityQty}
                                    onChange={(e) => setSecondQualityQty(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg text-center font-bold text-amber-700 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {/* Validation */}
                        {!isValid && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                                ⚠️ A soma deve ser igual a {order.quantity} peças. Atual: {totalQty}
                            </div>
                        )}
                    </div>

                    {/* Result Preview */}
                    <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${result.color === 'green' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                            result.color === 'red' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                                'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                        }`}>
                        <ResultIcon className={`w-8 h-8 ${result.color === 'green' ? 'text-green-500' :
                                result.color === 'red' ? 'text-red-500' :
                                    'text-amber-500'
                            }`} />
                        <div>
                            <div className={`font-bold ${result.color === 'green' ? 'text-green-700 dark:text-green-400' :
                                    result.color === 'red' ? 'text-red-700 dark:text-red-400' :
                                        'text-amber-700 dark:text-amber-400'
                                }`}>
                                Resultado: {result.label}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {approvedQty > 0 && `${approvedQty} aprovadas`}
                                {rejectedQty > 0 && ` • ${rejectedQty} reprovadas`}
                                {secondQualityQty > 0 && ` • ${secondQualityQty} 2ª qualidade`}
                            </div>
                        </div>
                    </div>

                    {/* Child Order Option */}
                    {rejectedQty > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={createChildOrder}
                                    onChange={(e) => setCreateChildOrder(e.target.checked)}
                                    className="w-5 h-5 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="font-medium text-blue-800 dark:text-blue-300">
                                        Criar pedido de retrabalho
                                    </div>
                                    <div className="text-sm text-blue-600 dark:text-blue-400">
                                        Será criado um pedido filho com {rejectedQty} peças para refazer
                                    </div>
                                </div>
                            </label>

                            {createChildOrder && (
                                <div className="mt-3 pl-8">
                                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                                        Prazo para retrabalho
                                    </label>
                                    <input
                                        type="date"
                                        value={childDeadline}
                                        onChange={(e) => setChildDeadline(e.target.value)}
                                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Observações
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Adicione observações sobre a revisão..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        />
                    </div>

                    {/* Advanced Options */}
                    <div>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            Opções avançadas (detalhar defeitos)
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 space-y-4">
                                {/* Rejected Items Details */}
                                {rejectedQty > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                                                Detalhes das Reprovações
                                            </span>
                                            <button
                                                onClick={handleAddRejectedItem}
                                                className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Adicionar
                                            </button>
                                        </div>
                                        {rejectedItems.map((item, index) => (
                                            <div key={index} className="flex gap-2 items-start">
                                                <input
                                                    type="text"
                                                    placeholder="Motivo"
                                                    value={item.reason}
                                                    onChange={(e) => {
                                                        const updated = [...rejectedItems];
                                                        updated[index].reason = e.target.value;
                                                        setRejectedItems(updated);
                                                    }}
                                                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg"
                                                />
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const updated = [...rejectedItems];
                                                        updated[index].quantity = parseInt(e.target.value) || 1;
                                                        setRejectedItems(updated);
                                                    }}
                                                    className="w-20 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-center"
                                                />
                                                <button
                                                    onClick={() => handleRemoveRejectedItem(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Second Quality Details */}
                                {secondQualityQty > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                                Detalhes da 2ª Qualidade
                                            </span>
                                            <button
                                                onClick={handleAddSecondQualityItem}
                                                className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Adicionar
                                            </button>
                                        </div>
                                        {secondQualityItems.map((item, index) => (
                                            <div key={index} className="flex gap-2 items-start">
                                                <input
                                                    type="text"
                                                    placeholder="Tipo de defeito"
                                                    value={item.defectType}
                                                    onChange={(e) => {
                                                        const updated = [...secondQualityItems];
                                                        updated[index].defectType = e.target.value;
                                                        setSecondQualityItems(updated);
                                                    }}
                                                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg"
                                                />
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const updated = [...secondQualityItems];
                                                        updated[index].quantity = parseInt(e.target.value) || 1;
                                                        setSecondQualityItems(updated);
                                                    }}
                                                    className="w-20 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-center"
                                                />
                                                <button
                                                    onClick={() => handleRemoveSecondQualityItem(index)}
                                                    className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Confirmar Revisão
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderReviewModal;
