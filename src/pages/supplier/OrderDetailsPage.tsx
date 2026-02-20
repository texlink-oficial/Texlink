import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersService, chatService, Order, Message, TransitionResponse } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft, Package, Calendar, DollarSign, User,
    CheckCircle, XCircle, Send, MessageSquare,
    Loader2, FileText, Lock
} from 'lucide-react';
import { ProtectedContent } from '../../components/common/ProtectedContent';
import { OrderTimeline, StatusActionBar } from '../../components/orders';

const OrderDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [order, setOrder] = useState<Order | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setSending] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [transitionData, setTransitionData] = useState<TransitionResponse | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) loadOrder();
    }, [id]);

    useEffect(() => {
        if (showChat && id) loadMessages();
    }, [showChat, id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadOrder = async () => {
        try {
            const data = await ordersService.getById(id!);
            setOrder(data);
            try {
                const transitions = await ordersService.getAvailableTransitions(id!);
                setTransitionData(transitions);
            } catch {
                // ok
            }
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async () => {
        try {
            const data = await chatService.getMessages(id!);
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleAccept = async () => {
        try {
            await ordersService.accept(id!);
            await loadOrder();
        } catch (error) {
            console.error('Error accepting order:', error);
        }
    };

    const handleReject = async () => {
        try {
            await ordersService.reject(id!, rejectReason);
            navigate(-1);
        } catch (error) {
            console.error('Error rejecting order:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const message = await chatService.sendMessage(id!, { type: 'TEXT', content: newMessage });
            setMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <p className="text-gray-600 dark:text-gray-300">Pedido não encontrado</p>
            </div>
        );
    }

    const canAccept = order.status === 'LANCADO_PELA_MARCA';
    const isProtected = order._techSheetProtected ?? false;
    const waitingLabel = transitionData && !transitionData.canAdvance ? transitionData.waitingLabel : '';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{order.displayId}</h1>
                                <StatusBadge status={order.status} />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowChat(!showChat)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl transition-colors"
                        >
                            <MessageSquare className="w-5 h-5" />
                            Chat
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Timeline */}
                        <OrderTimeline order={order} waitingLabel={waitingLabel} />

                        {/* Product Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Produto</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Nome do Produto</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{order.productName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p>
                                        <p className="text-gray-900 dark:text-white">{order.productType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Categoria</p>
                                        <p className="text-gray-900 dark:text-white">{order.productCategory || '-'}</p>
                                    </div>
                                </div>
                                {(order.description || isProtected) && (
                                    <ProtectedContent isProtected={isProtected}>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Descrição</p>
                                            <p className="text-gray-900 dark:text-white">{order.description || 'Descrição detalhada do produto'}</p>
                                        </div>
                                    </ProtectedContent>
                                )}

                                {isProtected && (
                                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800/50 rounded-xl">
                                        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Informações protegidas</p>
                                            <p className="text-xs text-amber-700 dark:text-amber-400/80">A ficha técnica e detalhes serão liberados após aceitar o pedido</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalhes do Pedido</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InfoCard icon={Package} label="Quantidade" value={`${order.quantity} pçs`} />
                                <InfoCard icon={DollarSign} label="Preço/Un" value={formatCurrency(Number(order.pricePerUnit))} />
                                <InfoCard icon={DollarSign} label="Total" value={formatCurrency(Number(order.totalValue))} highlight />
                                <InfoCard icon={Calendar} label="Entrega" value={formatDate(order.deliveryDeadline)} />
                            </div>
                            {order.plannedStartDate && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>Início previsto: <strong className="text-gray-900 dark:text-white">{new Date(order.plannedStartDate).toLocaleDateString('pt-BR')}</strong></span>
                                </div>
                            )}
                        </div>

                        {/* Brand Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Marca</h2>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-gray-900 dark:text-white font-medium">{order.brand?.tradeName}</p>
                                    {order.brand?.avgRating && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            <span className="text-amber-400">&#9733;</span> {Number(order.brand.avgRating).toFixed(1)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {canAccept && (
                            <div className="flex gap-4">
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Aceitar Pedido
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl border border-red-600/30 transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Recusar
                                </button>
                            </div>
                        )}

                        {!canAccept && (
                            <StatusActionBar order={order} onStatusUpdated={loadOrder} />
                        )}
                    </div>

                    {/* Chat Sidebar */}
                    {showChat && (
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 h-[600px] flex flex-col">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Chat com a Marca</h3>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {messages.length === 0 ? (
                                        <p className="text-gray-500 dark:text-gray-400 text-center text-sm">Nenhuma mensagem ainda</p>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.senderId === user?.id
                                                            ? 'bg-brand-500 text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        }`}
                                                >
                                                    <p className="text-sm">{msg.content}</p>
                                                    <p className="text-xs opacity-60 mt-1">
                                                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Digite sua mensagem..."
                                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={isSending || !newMessage.trim()}
                                            className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recusar Pedido</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                            Descreva o motivo da recusa (opcional):
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ex: Capacidade indisponível no momento..."
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none h-24"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors"
                            >
                                Confirmar Recusa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper components
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Novo Pedido', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        EM_NEGOCIACAO: { label: 'Em Negociação', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        EM_PREPARACAO_SAIDA_MARCA: { label: 'Marca Preparando', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
        EM_TRANSITO_PARA_FACCAO: { label: 'Insumos em Trânsito', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
        EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Insumos Recebidos', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
        FILA_DE_PRODUCAO: { label: 'Fila de Produção', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        EM_PRODUCAO: { label: 'Em Produção', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        PRONTO: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        EM_TRANSITO_PARA_MARCA: { label: 'Em Trânsito → Marca', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
        EM_REVISAO: { label: 'Em Revisão', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        PARCIALMENTE_APROVADO: { label: 'Parcialmente Aprovado', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        REPROVADO: { label: 'Reprovado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        AGUARDANDO_RETRABALHO: { label: 'Retrabalho', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        EM_PROCESSO_PAGAMENTO: { label: 'Processo de Pagamento', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
};

interface InfoCardProps {
    icon: React.FC<{ className?: string }>;
    label: string;
    value: string;
    highlight?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, highlight }) => (
    <div className={`p-4 rounded-xl ${highlight ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
        <Icon className={`w-5 h-5 mb-2 ${highlight ? 'text-brand-500' : 'text-gray-400'}`} />
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`font-semibold ${highlight ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
);

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

export default OrderDetailsPage;
