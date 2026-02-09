import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderStatus } from '../../types';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, Package, MapPin, Calendar, DollarSign, GripVertical, Scissors, Circle, Layers, Check, X, Paperclip, FileText, Tag, ArrowRight } from 'lucide-react';

interface OrderCardProps {
    order: Order;
    onClick: (order: Order) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, order: Order) => void;
    onAccept?: (orderId: string) => Promise<void>;
    onReject?: (orderId: string) => Promise<void>;
    isSupplierView?: boolean;
    isMyTurn?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onClick,
    draggable,
    onDragStart,
    onAccept,
    onReject,
    isSupplierView = true,
    isMyTurn,
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const brandRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (brandRef.current) {
            const rect = brandRef.current.getBoundingClientRect();
            setTooltipPos({
                top: rect.top - 8,
                left: rect.left + (rect.width / 2)
            });
            setShowTooltip(true);
        }
    };

    const handleAccept = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAccept && !isProcessing) {
            setIsProcessing(true);
            try {
                await onAccept(order.id);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onReject && !isProcessing) {
            setIsProcessing(true);
            try {
                await onReject(order.id);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const getWaitingBadge = () => {
        if (order.status === OrderStatus.TRANSIT_TO_SUPPLIER || order.status === OrderStatus.PREPARING_BRAND) {
            if (order.missingItems && order.missingItems.length > 0) {
                return (
                    <div className="mt-2.5">
                        <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Pendências:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {order.missingItems.map((item, idx) => {
                                let icon = <Layers className="h-3 w-3" />;
                                if (item.toLowerCase().includes('botão') || item.toLowerCase().includes('botões')) icon = <Circle className="h-3 w-3" />;
                                if (item.toLowerCase().includes('zíper')) icon = <span className="font-bold text-[10px]">Z</span>;
                                if (item.toLowerCase().includes('tecido') || item.toLowerCase().includes('malha')) icon = <Scissors className="h-3 w-3" />;

                                return (
                                    <div key={idx} className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded">
                                        {icon}
                                        <span>{item}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            else if (order.waitingReason) {
                return (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 w-fit">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {order.waitingReason}
                    </div>
                );
            }
        }
        return null;
    };

    const getPaymentBadge = () => {
        switch (order.paymentStatus) {
            case 'paid':
                return (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800" title="Pagamento Confirmado">
                        <DollarSign className="h-3 w-3" /> Pago
                    </div>
                );
            case 'late':
                return (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800" title="Pagamento Atrasado">
                        <DollarSign className="h-3 w-3" /> Atrasado
                    </div>
                );
            case 'partial':
                return (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800" title="Pagamento Parcial">
                        <DollarSign className="h-3 w-3" /> Parcial
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600" title="A Receber">
                        <DollarSign className="h-3 w-3" /> Pendente
                    </div>
                );
        }
    };

    const isFinalized = order.status === OrderStatus.FINALIZED;
    const isNewOrder = order.status === OrderStatus.NEW;
    const showAcceptReject = isSupplierView && isNewOrder && onAccept && onReject;

    const getUrgencyColor = (date: string) => {
        if (isFinalized) return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';

        const deadline = new Date(date);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
        if (diffDays <= 3) return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    };

    const getDaysLeft = (date: string) => {
        if (isFinalized) return 'Finalizado';

        const deadline = new Date(date);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `${Math.abs(diffDays)}d atrasado`;
        if (diffDays === 0) return 'Entrega Hoje';
        return `${diffDays}d restantes`;
    }

    return (
        <>
            <div
                draggable={draggable}
                onDragStart={(e) => draggable && onDragStart && onDragStart(e, order)}
                onClick={() => onClick(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick(order);
                    }
                }}
                aria-label={`Pedido ${order.displayId} - ${order.productName}`}
                className={`
                    relative bg-white dark:bg-gray-800 p-3 rounded-xl
                    shadow-card border
                    transition-all duration-300 ease-spring
                    group
                    active:scale-[0.99] active:shadow-sm
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                    ${isFinalized
                        ? 'border-green-100 dark:border-green-900/50 hover:border-green-300 dark:hover:border-green-700'
                        : isNewOrder
                            ? 'border-brand-200 dark:border-brand-800 hover:border-brand-400 dark:hover:border-brand-600 ring-1 ring-brand-100 dark:ring-brand-900 animate-fade-up'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-card-hover hover:-translate-y-0.5'}
                    ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                `}
            >

                {/* NEW badge for new orders */}
                {isNewOrder && (
                    <div className="absolute -top-2.5 -right-2.5 gradient-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-card z-10 border-2 border-white dark:border-gray-900 animate-scale-in">
                        NOVO
                    </div>
                )}

                {/* "Sua vez" / "Aguardando" badge */}
                {!isNewOrder && !isFinalized && isMyTurn !== undefined && (
                    <div className={`absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 border-2 border-white dark:border-gray-900 flex items-center gap-1 ${
                        isMyTurn
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                        {isMyTurn ? (
                            <>
                                <ArrowRight className="h-3 w-3" />
                                Sua vez
                            </>
                        ) : (
                            <>
                                <Clock className="h-3 w-3" />
                                Aguardando
                            </>
                        )}
                    </div>
                )}

                {/* Drag Handle — absolute, never affects layout */}
                <div className="absolute left-1 top-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab z-10">
                    <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                </div>

                {/* Header: Brand + Type */}
                <div className="flex items-center justify-between mb-1">
                    <div
                        ref={brandRef}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="flex items-center gap-2 min-w-0"
                    >
                        <img src={order.brand.image} alt={order.brand.name} className="h-6 w-6 rounded-full border border-gray-100 dark:border-gray-600 object-cover flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{order.brand.name}</span>
                        <span className="text-[10px] text-yellow-500 flex-shrink-0">★{order.brand.rating}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border border-gray-100 dark:border-gray-700 px-1.5 py-px rounded bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                        {order.type}
                    </span>
                </div>

                {/* DisplayId + Payment */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-1.5 py-px rounded whitespace-nowrap group-hover:bg-brand-50 dark:group-hover:bg-brand-900/50 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                        {order.displayId}
                    </span>
                    {getPaymentBadge()}
                </div>

                {/* Product Name */}
                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 mb-1">
                    {order.productName}
                </h4>

                {/* OP + Artigo inline */}
                {(order.op || order.artigo) && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                        {order.op && <span>OP: {order.op}</span>}
                        {order.op && order.artigo && <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>}
                        {order.artigo && <span>{order.artigo}</span>}
                    </div>
                )}

                {/* Metrics row */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{order.quantity}</span>
                        <span className="text-[10px]">pçs</span>
                    </span>
                    {order.attachments && order.attachments.length > 0 && (
                        <>
                            <span className="text-gray-200 dark:text-gray-700">|</span>
                            <span className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{order.attachments.length}</span>
                            </span>
                        </>
                    )}
                    <span className="text-gray-200 dark:text-gray-700">|</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                        R$ {order.totalValue.toLocaleString('pt-BR')}
                    </span>
                </div>

                {getWaitingBadge()}

                {/* Accept/Reject Buttons for NEW orders */}
                {showAcceptReject && (
                    <div className="mt-2.5 flex gap-2">
                        <button
                            onClick={handleAccept}
                            disabled={isProcessing}
                            aria-label="Aceitar pedido"
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm press-scale touch-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Aceitar
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={isProcessing}
                            aria-label="Recusar pedido"
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm press-scale touch-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            Recusar
                        </button>
                    </div>
                )}

                {/* Footer / Deadline */}
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-medium transition-colors ${getUrgencyColor(order.deliveryDeadline)}`}>
                        {isFinalized ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {getDaysLeft(order.deliveryDeadline)}
                    </div>

                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        Entregar: {new Date(order.deliveryDeadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Tooltip Portal */}
            {showTooltip && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none transition-opacity duration-200"
                    style={{
                        top: tooltipPos.top,
                        left: tooltipPos.left,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg p-3 shadow-xl border border-gray-200 dark:border-gray-700 w-56 mb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="font-bold text-sm">{order.brand.name}</div>
                            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-500 text-yellow-800 dark:text-black px-1 rounded font-bold">★ {order.brand.rating}</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-300">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" /> {order.brand.location}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" /> Cliente desde Nov 2023
                            </div>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-900 rotate-45 border-r border-b border-gray-200 dark:border-gray-700"></div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};