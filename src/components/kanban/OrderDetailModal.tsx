import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Order, OrderStatus } from '../../types';
import { ChatInterface } from './ChatInterface';
import { OrderReviewModal } from '../orders/OrderReviewModal';
import { OrderReview, ordersService } from '../../services/orders.service';
import { X, CheckCircle, AlertOctagon, FileText, Truck, MapPin, DollarSign, Calendar, Scissors, Box, Clock, MessageCircle, Video, Image as ImageIcon, Download, ChevronRight, CreditCard, Play, PackageCheck, AlertTriangle, Copy, ClipboardCheck } from 'lucide-react';

interface OrderDetailModalProps {
    order: Order;
    onClose: () => void;
    onStatusChange: (id: string, newStatus: OrderStatus) => void;
    onTimelineStepToggle?: (id: string, stepName: string) => void;
    onOrderUpdated?: (order: any) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onStatusChange, onTimelineStepToggle, onOrderUpdated }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleDuplicateOrder = () => {
        // Prepare order data for duplication (excluding fields that should not be copied)
        const duplicateData = {
            productType: order.type,
            productCategory: order.category || '',
            productName: order.productName,
            description: order.description || '',
            pricePerUnit: order.pricePerUnit,
            paymentTerms: order.paymentTerms || '',
            materialsProvided: order.materialsProvided,
            observations: order.observations || '',
            // Do not copy: quantity, deliveryDeadline, attachments
        };

        navigate('/brand/pedidos/novo', {
            state: { duplicateFrom: duplicateData }
        });
        onClose();
    };

    if (!order) return null;

    // Detect user role from auth context
    const userRole: 'BRAND' | 'SUPPLIER' = user?.role === 'SUPPLIER' ? 'SUPPLIER' : 'BRAND';

    // Transition map: what actions each role can take per status
    type ActionDef = { targetStatus: OrderStatus; label: string; icon: string; color: string; confirmTitle: string; confirmMsg: string; requiresMaterials?: boolean };
    const ROLE_ACTIONS: Record<string, Record<string, ActionDef[]>> = {
        BRAND: {
            [OrderStatus.NEW]: [], // Brand waits for supplier to accept
            [OrderStatus.ACCEPTED]: [
                { targetStatus: OrderStatus.PREPARING_BRAND, label: 'Preparar Insumos', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Preparar Insumos?', confirmMsg: 'Confirma que vai iniciar a preparação dos insumos para envio à facção?', requiresMaterials: true },
            ],
            [OrderStatus.PREPARING_BRAND]: [
                { targetStatus: OrderStatus.TRANSIT_TO_SUPPLIER, label: 'Despachar Insumos', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Despachar Insumos?', confirmMsg: 'Confirma que os insumos foram despachados para a facção?' },
            ],
            [OrderStatus.TRANSIT_TO_SUPPLIER]: [], // Brand waits for supplier
            [OrderStatus.RECEIVED_SUPPLIER]: [], // Brand waits for supplier
            [OrderStatus.PRODUCTION]: [], // Brand waits for supplier
            [OrderStatus.READY_SEND]: [
                { targetStatus: OrderStatus.TRANSIT_TO_BRAND, label: 'Marcar Despacho', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Marcar Despacho?', confirmMsg: 'Confirma que o pedido foi despachado para a marca?' },
            ],
            [OrderStatus.TRANSIT_TO_BRAND]: [
                { targetStatus: OrderStatus.IN_REVIEW, label: 'Confirmar Recebimento', icon: 'receipt', color: 'bg-indigo-600 hover:bg-indigo-700', confirmTitle: 'Confirmar Recebimento?', confirmMsg: 'Confirma que o pedido foi recebido e deseja iniciar a revisão de qualidade?' },
            ],
            [OrderStatus.IN_REVIEW]: [], // Handled by OrderReviewModal
            [OrderStatus.PAYMENT_PROCESS]: [
                { targetStatus: OrderStatus.FINALIZED, label: 'Confirmar Pagamento', icon: 'advance', color: 'bg-green-600 hover:bg-green-700', confirmTitle: 'Confirmar Pagamento?', confirmMsg: 'Confirma que o pagamento foi realizado e deseja finalizar o pedido?' },
            ],
        },
        SUPPLIER: {
            [OrderStatus.NEW]: [
                { targetStatus: OrderStatus.ACCEPTED, label: 'Aceitar Pedido', icon: 'accept', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Aceitar Pedido?', confirmMsg: 'O pedido entrará em fase de Produção. Certifique-se de que tem capacidade para atender o prazo.' },
                { targetStatus: OrderStatus.NEGOTIATING, label: 'Negociar', icon: 'advance', color: 'bg-indigo-600 hover:bg-indigo-700', confirmTitle: 'Negociar Pedido?', confirmMsg: 'Deseja iniciar uma negociação de condições com a marca?' },
            ],
            [OrderStatus.NEGOTIATING]: [
                { targetStatus: OrderStatus.ACCEPTED, label: 'Aceitar após Negociação', icon: 'accept', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Aceitar Pedido?', confirmMsg: 'Aceitar o pedido após negociação de condições?' },
                { targetStatus: OrderStatus.CANCELLED, label: 'Cancelar Pedido', icon: 'advance', color: 'bg-red-600 hover:bg-red-700', confirmTitle: 'Cancelar Pedido?', confirmMsg: 'Tem certeza que deseja cancelar este pedido em negociação?' },
            ],
            [OrderStatus.ACCEPTED]: [
                { targetStatus: OrderStatus.PRODUCTION_QUEUE, label: 'Enviar para Fila de Produção', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Fila de Produção?', confirmMsg: 'Enviar para a fila de produção sem aguardar insumos da marca?', requiresMaterials: false },
            ],
            [OrderStatus.TRANSIT_TO_SUPPLIER]: [
                { targetStatus: OrderStatus.RECEIVED_SUPPLIER, label: 'Confirmar Recebimento', icon: 'receipt', color: 'bg-indigo-600 hover:bg-indigo-700', confirmTitle: 'Confirmar Recebimento?', confirmMsg: 'Confirma que os insumos foram recebidos na facção?' },
            ],
            [OrderStatus.RECEIVED_SUPPLIER]: [
                { targetStatus: OrderStatus.PRODUCTION_QUEUE, label: 'Enviar para Fila de Produção', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Fila de Produção?', confirmMsg: 'Enviar para a fila de produção após conferência dos insumos?' },
            ],
            [OrderStatus.PRODUCTION_QUEUE]: [
                { targetStatus: OrderStatus.PRODUCTION, label: 'Iniciar Produção', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Iniciar Produção?', confirmMsg: 'Confirma que vai iniciar a produção deste pedido?' },
            ],
            [OrderStatus.PRODUCTION]: [
                { targetStatus: OrderStatus.READY_SEND, label: 'Produção Concluída', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Produção Concluída?', confirmMsg: 'Confirma que a produção está concluída e pronta para envio?' },
            ],
            [OrderStatus.READY_SEND]: [
                { targetStatus: OrderStatus.TRANSIT_TO_BRAND, label: 'Marcar Despacho', icon: 'advance', color: 'bg-brand-600 hover:bg-brand-700', confirmTitle: 'Marcar Despacho?', confirmMsg: 'Confirma que o pedido foi despachado para a marca?' },
            ],
        },
    };

    // Filter actions by materialsProvided
    const currentActions = (ROLE_ACTIONS[userRole]?.[order.status] || []).filter(a => {
        if (a.requiresMaterials === true && !order.materialsProvided) return false;
        if (a.requiresMaterials === false && order.materialsProvided) return false;
        return true;
    });

    // Waiting messages when no actions available
    const WAITING_MESSAGES: Record<string, Record<string, string>> = {
        BRAND: {
            [OrderStatus.NEW]: 'Aguardando a Facção aceitar o pedido',
            [OrderStatus.NEGOTIATING]: 'Em negociação com a Facção',
            [OrderStatus.ACCEPTED]: 'Aguardando a Facção iniciar produção',
            [OrderStatus.TRANSIT_TO_SUPPLIER]: 'Aguardando a Facção confirmar recebimento',
            [OrderStatus.RECEIVED_SUPPLIER]: 'Facção conferindo insumos recebidos',
            [OrderStatus.PRODUCTION_QUEUE]: 'Aguardando início da produção',
            [OrderStatus.PRODUCTION]: 'Facção em produção',
        },
        SUPPLIER: {
            [OrderStatus.PREPARING_BRAND]: 'Marca preparando insumos para envio',
            [OrderStatus.ACCEPTED]: 'Aguardando a Marca preparar insumos',
            [OrderStatus.TRANSIT_TO_BRAND]: 'Aguardando a Marca confirmar recebimento',
            [OrderStatus.IN_REVIEW]: 'Marca revisando qualidade',
            [OrderStatus.PAYMENT_PROCESS]: 'Aguardando confirmação de pagamento',
        },
    };

    // Brand IN_REVIEW → opens OrderReviewModal instead of simple confirmation
    const isReviewStatus = userRole === 'BRAND' && order.status === OrderStatus.IN_REVIEW;
    const waitingMessage = !isReviewStatus && currentActions.length === 0 ? (WAITING_MESSAGES[userRole]?.[order.status] || null) : null;
    const isTerminal = [OrderStatus.FINALIZED, OrderStatus.PARTIALLY_APPROVED, OrderStatus.DISAPPROVED, OrderStatus.REJECTED, OrderStatus.CANCELLED].includes(order.status);

    // State for selected action for confirmation
    const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);

    // Supplier-specific reject action
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);

    // Review modal state
    const [showReviewModal, setShowReviewModal] = useState(false);

    const REVIEW_RESULT_TO_STATUS: Record<string, OrderStatus> = {
        APPROVED: OrderStatus.PAYMENT_PROCESS,
        PARTIAL: OrderStatus.PARTIALLY_APPROVED,
        REJECTED: OrderStatus.DISAPPROVED,
    };

    const handleReviewComplete = (review: OrderReview, childOrderCreated?: boolean) => {
        const newStatus = REVIEW_RESULT_TO_STATUS[review.result];
        if (newStatus) {
            onStatusChange(order.id, newStatus);
        }
        setShowReviewModal(false);
        onClose();
    };

    const executeAction = () => {
        if (pendingAction) {
            onStatusChange(order.id, pendingAction.targetStatus);
            setPendingAction(null);
            onClose();
            return;
        }
        if (showRejectConfirm) {
            onStatusChange(order.id, OrderStatus.REJECTED);
            setShowRejectConfirm(false);
            onClose();
            return;
        }
    };

    const getConfirmationDetails = () => {
        if (pendingAction) {
            return {
                title: pendingAction.confirmTitle,
                message: pendingAction.confirmMsg,
                confirmBtn: 'Confirmar',
                color: pendingAction.color,
            };
        }
        if (showRejectConfirm) {
            return {
                title: 'Recusar Pedido?',
                message: 'Tem certeza? O pedido será recusado e arquivado.',
                confirmBtn: 'Sim, Recusar',
                color: 'bg-red-600 hover:bg-red-700',
            };
        }
        return { title: '', message: '', confirmBtn: '', color: '' };
    };

    const isConfirmOpen = pendingAction !== null || showRejectConfirm;

    const isReceived = order.timeline.find(t => t.step === 'Recebimento na Facção')?.completed;

    const getBadgeStyle = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.NEW: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case OrderStatus.NEGOTIATING: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
            case OrderStatus.PRODUCTION_QUEUE: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case OrderStatus.PRODUCTION: return 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300';
            case OrderStatus.ACCEPTED: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case OrderStatus.PREPARING_BRAND: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case OrderStatus.TRANSIT_TO_SUPPLIER: return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
            case OrderStatus.RECEIVED_SUPPLIER: return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
            case OrderStatus.READY_SEND: return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
            case OrderStatus.TRANSIT_TO_BRAND: return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
            case OrderStatus.IN_REVIEW: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            case OrderStatus.PARTIALLY_APPROVED: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case OrderStatus.DISAPPROVED: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case OrderStatus.AWAITING_REWORK: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            case OrderStatus.PAYMENT_PROCESS: return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
            case OrderStatus.FINALIZED: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case OrderStatus.CANCELLED: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case OrderStatus.REJECTED: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case OrderStatus.AVAILABLE_FOR_OTHERS: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.NEW: return 'Novo';
            case OrderStatus.NEGOTIATING: return 'Em Negociação';
            case OrderStatus.ACCEPTED: return 'Aceito';
            case OrderStatus.PREPARING_BRAND: return 'Preparando Envio';
            case OrderStatus.TRANSIT_TO_SUPPLIER: return 'Em Trânsito';
            case OrderStatus.RECEIVED_SUPPLIER: return 'Conferindo Insumos';
            case OrderStatus.PRODUCTION_QUEUE: return 'Fila de Produção';
            case OrderStatus.PRODUCTION: return 'Em Produção';
            case OrderStatus.READY_SEND: return 'Pronto';
            case OrderStatus.TRANSIT_TO_BRAND: return 'Em Trânsito';
            case OrderStatus.IN_REVIEW: return 'Em Revisão';
            case OrderStatus.PARTIALLY_APPROVED: return 'Parcialmente Aprovado';
            case OrderStatus.DISAPPROVED: return 'Reprovado';
            case OrderStatus.AWAITING_REWORK: return 'Aguardando Retrabalho';
            case OrderStatus.PAYMENT_PROCESS: return 'Processo de Pagamento';
            case OrderStatus.FINALIZED: return 'Concluído';
            case OrderStatus.CANCELLED: return 'Cancelado';
            case OrderStatus.REJECTED: return 'Recusado';
            case OrderStatus.AVAILABLE_FOR_OTHERS: return 'Disponível';
            default: return status;
        }
    };

    const getTimelineIcon = (iconName?: string) => {
        switch (iconName) {
            case 'truck': return <Truck className="h-4 w-4" />;
            case 'scissors': return <Scissors className="h-4 w-4" />;
            case 'box': return <Box className="h-4 w-4" />;
            case 'clock': return <Clock className="h-4 w-4" />;
            default: return <CheckCircle className="h-4 w-4" />;
        }
    };

    const renderThumbnail = (att: { type: string; url: string }) => {
        // Mock logic: In a real app, you'd check if the URL is a valid image. 
        // Here we simulate thumbnails based on type or use the URL if it's not a hash.
        const hasValidImage = att.type === 'image' && att.url && att.url !== '#';

        if (hasValidImage) {
            return <img src={att.url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />;
        }

        switch (att.type) {
            case 'video':
                return (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="h-5 w-5 text-white ml-1" fill="currentColor" />
                        </div>
                    </div>
                );
            case 'image':
                return (
                    <div className="w-full h-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-blue-300 dark:text-blue-500" />
                    </div>
                );
            case 'pdf':
                return (
                    <div className="w-full h-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                        <FileText className="h-10 w-10 text-red-300 dark:text-red-500" />
                        <span className="absolute bottom-2 right-2 text-[10px] font-bold text-red-400 bg-red-100 dark:bg-red-900/50 px-1 rounded">PDF</span>
                    </div>
                );
            default:
                return (
                    <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <FileText className="h-10 w-10 text-gray-300 dark:text-gray-500" />
                    </div>
                );
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">

                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 dark:bg-opacity-80 transition-opacity backdrop-blur-sm" onClick={onClose} aria-hidden="true"></div>

                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                    {/* Modal Panel */}
                    <div className="relative inline-block align-bottom bg-gray-50 dark:bg-gray-900 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

                        {/* Header Compacto */}
                        <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                                        Pedido {order.displayId}
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getBadgeStyle(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Criado em {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDuplicateOrder}
                                    title="Duplicar Pedido"
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors focus:outline-none"
                                >
                                    <Copy className="h-4 w-4" />
                                    <span className="hidden sm:inline">Duplicar</span>
                                </button>
                                <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-2 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

                            {/* --- COLUNA ESQUERDA (PRINCIPAL) --- */}
                            <div className="lg:col-span-8 space-y-6">

                                {/* Card da Marca (Horizontal e Denso) */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <img src={order.brand.image} alt="" className="h-14 w-14 rounded-full object-cover border border-gray-100 dark:border-gray-600" />
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                {order.brand.name}
                                                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 text-xs px-1.5 py-0.5 rounded flex items-center font-medium">
                                                    ★ {order.brand.rating}
                                                </span>
                                            </h3>
                                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                                {order.brand.location}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsChatOpen(true)}
                                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                            order.status === OrderStatus.NEW || order.status === OrderStatus.NEGOTIATING
                                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20'
                                                : 'bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-300'
                                        }`}
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        <span className="flex flex-col items-start leading-tight">
                                            <span>{userRole === 'SUPPLIER' ? 'Chat com a Marca' : 'Chat com a Facção'}</span>
                                            {(order.status === OrderStatus.NEW || order.status === OrderStatus.NEGOTIATING) && (
                                                <span className="text-[10px] font-normal opacity-90">Envie propostas de preço e prazo</span>
                                            )}
                                        </span>
                                    </button>
                                </div>

                                {/* Card de Produto + Financeiro (Unificado) */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                                            <Scissors className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Especificações & Valores
                                        </h4>
                                        {order.techSheetUrl && (
                                            <button className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1 hover:underline">
                                                <FileText className="h-3 w-3" /> Ver Ficha Técnica
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        {/* Linha 1: Produto Principal */}
                                        <div className="mb-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{order.type}</span>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{order.productName}</h3>
                                                    {(order.op || order.artigo) && (
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            {order.op && (
                                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                    OP: {order.op}
                                                                </span>
                                                            )}
                                                            {order.artigo && (
                                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                    Artigo: {order.artigo}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md border border-gray-100 dark:border-gray-600">
                                                {order.description}
                                            </p>
                                        </div>

                                        {/* Linha 2: Grid de Dados (Régua) */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-gray-100 dark:border-gray-700">
                                            <div>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Quantidade</span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{order.quantity} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">pçs</span></span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Valor Unitário</span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">R$ {order.pricePerUnit.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Insumos</span>
                                                <span className={`text-sm font-bold flex items-center gap-1 mt-1 ${order.materialsProvided ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                    {order.materialsProvided ? <CheckCircle className="h-4 w-4" /> : <AlertOctagon className="h-4 w-4" />}
                                                    {order.materialsProvided ? 'Fornecidos' : 'Pela Facção'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Valor Total</span>
                                                <span className="text-lg font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 rounded inline-block">
                                                    R$ {order.totalValue.toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Linha 3: Pagamento */}
                                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            <span className="font-medium">Condição:</span> {order.paymentTerms}
                                        </div>
                                    </div>
                                </div>

                                {/* Seção de Arquivos (Grid Visual & Compacto) */}
                                {order.attachments && order.attachments.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 ml-1 flex items-center gap-2">
                                            <FileText className="h-4 w-4" /> Arquivos e Instruções
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {order.attachments.map((att) => (
                                                <div
                                                    key={att.id}
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        try {
                                                            const { url } = await ordersService.getAttachmentDownloadUrl(order.id, att.id);
                                                            window.open(url, '_blank');
                                                        } catch {
                                                            window.open(att.url, '_blank');
                                                        }
                                                    }}
                                                    className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600 transition-all cursor-pointer"
                                                >
                                                    {/* Thumbnail Area */}
                                                    <div className="h-28 w-full relative overflow-hidden">
                                                        {renderThumbnail(att)}

                                                        {/* Hover Overlay */}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="bg-white text-gray-900 rounded-full p-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                                <Download className="h-4 w-4" />
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Info Area */}
                                                    <div className="p-2.5">
                                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mb-0.5" title={att.name}>
                                                            {att.name}
                                                        </p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{att.type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- COLUNA DIREITA (OPERACIONAL) --- */}
                            <div className="lg:col-span-4 space-y-6">

                                {/* Card de Ação Principal & Prazo (Destaque) */}
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm">
                                    <div className="text-center mb-5">
                                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Prazo de Entrega</span>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                            {new Date(order.deliveryDeadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(order.deliveryDeadline).getFullYear()}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Terminal states */}
                                        {isTerminal ? (
                                            <div className={`w-full py-4 border text-sm font-medium rounded-lg text-center ${
                                                order.status === OrderStatus.FINALIZED
                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400'
                                                    : (order.status === OrderStatus.REJECTED || order.status === OrderStatus.CANCELLED)
                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400'
                                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'
                                            }`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    {order.status === OrderStatus.FINALIZED ? <CheckCircle className="h-6 w-6 mb-1" /> : <X className="h-6 w-6 mb-1" />}
                                                    <span>{order.status === OrderStatus.FINALIZED ? 'Pedido Finalizado' : order.status === OrderStatus.REJECTED ? 'Pedido Recusado' : order.status === OrderStatus.CANCELLED ? 'Pedido Cancelado' : order.status === OrderStatus.PARTIALLY_APPROVED ? 'Parcialmente Aprovado' : 'Reprovado'}</span>
                                                </div>
                                            </div>
                                        ) : isReviewStatus ? (
                                            <button
                                                onClick={() => setShowReviewModal(true)}
                                                className="w-full flex justify-center items-center gap-2 px-4 py-3 text-white text-sm font-bold rounded-lg shadow-sm transition-all transform active:scale-95 bg-orange-600 hover:bg-orange-700"
                                            >
                                                <ClipboardCheck className="h-4 w-4" />
                                                Revisar Qualidade
                                            </button>
                                        ) : currentActions.length > 0 ? (
                                            <>
                                                {/* Action buttons */}
                                                {currentActions.map((action) => (
                                                    <button
                                                        key={action.targetStatus}
                                                        onClick={() => setPendingAction(action)}
                                                        className={`w-full flex justify-center items-center gap-2 px-4 py-3 text-white text-sm font-bold rounded-lg shadow-sm transition-all transform active:scale-95 ${action.color}`}
                                                    >
                                                        {action.icon === 'receipt' ? <PackageCheck className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        {action.label}
                                                    </button>
                                                ))}
                                                {/* Supplier reject option for NEW orders */}
                                                {userRole === 'SUPPLIER' && order.status === OrderStatus.NEW && (
                                                    <button
                                                        onClick={() => setShowRejectConfirm(true)}
                                                        className="w-full flex justify-center items-center gap-2 px-3 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
                                                    >
                                                        <X className="h-4 w-4" /> Recusar
                                                    </button>
                                                )}
                                            </>
                                        ) : waitingMessage ? (
                                            <div className="w-full py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-lg text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Clock className="h-4 w-4" />
                                                    {waitingMessage}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg text-center cursor-not-allowed">
                                                Aguardando próxima etapa
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline Vertical */}
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col h-auto">
                                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Rastreamento
                                        </h4>
                                    </div>
                                    <div className="p-5">
                                        <div className="relative pl-2">
                                            {/* Linha Vertical Conectora */}
                                            <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-700"></div>

                                            <div className="space-y-6 relative">
                                                {order.timeline.map((event, idx) => (
                                                    <div key={idx} className="flex items-start group">
                                                        <div className={`relative flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 transition-colors
                                          ${event.completed
                                                                ? 'border-green-500 text-green-500 bg-white dark:bg-gray-800'
                                                                : 'border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 bg-white dark:bg-gray-800'}`}>
                                                            {getTimelineIcon(event.icon)}
                                                        </div>
                                                        <div className="ml-3 min-w-0 pt-1">
                                                            <p className={`text-sm font-medium ${event.completed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}`}>
                                                                {event.step}
                                                            </p>
                                                            {event.date ? (
                                                                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                                    {event.date}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 block">Pendente</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal Overlay */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setPendingAction(null); setShowRejectConfirm(false); }}></div>
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${showRejectConfirm ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600'}`}>
                                {showRejectConfirm ? <X className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {getConfirmationDetails().title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                {getConfirmationDetails().message}
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setPendingAction(null); setShowRejectConfirm(false); }}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeAction}
                                    className={`flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-lg shadow-sm transition-colors ${getConfirmationDetails().color}`}
                                >
                                    {getConfirmationDetails().confirmBtn}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isChatOpen && <ChatInterface order={order} onClose={() => setIsChatOpen(false)} onOrderUpdated={onOrderUpdated} />}

            {/* Quality Review Modal */}
            <OrderReviewModal
                order={order as any}
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onReviewComplete={handleReviewComplete}
            />
        </>
    );
};