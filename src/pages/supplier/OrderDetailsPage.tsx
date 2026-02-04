import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ordersService, chatService, Order, Message } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft, Package, Calendar, DollarSign, User,
    CheckCircle, XCircle, Send, MessageSquare, Clock,
    ChevronRight, Loader2, FileText, Lock
} from 'lucide-react';
import { ProtectedContent } from '../../components/common/ProtectedContent';

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
            navigate('/supplier/orders');
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

    const handleAdvanceStatus = async () => {
        if (!order) return;

        const statusFlow: Record<string, string> = {
            ACEITO_PELA_FACCAO: 'EM_PRODUCAO',
            EM_PRODUCAO: 'PRONTO',
            PRONTO: 'FINALIZADO',
        };

        const nextStatus = statusFlow[order.status];
        if (nextStatus) {
            try {
                await ordersService.updateStatus(id!, nextStatus as any);
                await loadOrder();
            } catch (error) {
                console.error('Error updating status:', error);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <p className="text-brand-300">Pedido não encontrado</p>
            </div>
        );
    }

    const canAccept = order.status === 'LANCADO_PELA_MARCA';
    const canAdvance = ['ACEITO_PELA_FACCAO', 'EM_PRODUCAO', 'PRONTO'].includes(order.status);
    const isProtected = order._techSheetProtected ?? false;

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/supplier/orders" className="text-brand-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">{order.displayId}</h1>
                                <StatusBadge status={order.status} />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowChat(!showChat)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 text-white rounded-xl transition-colors"
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
                        {/* Product Info */}
                        <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Produto</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-brand-400">Nome do Produto</p>
                                    <p className="text-white font-medium">{order.productName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-brand-400">Tipo</p>
                                        <p className="text-white">{order.productType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-brand-400">Categoria</p>
                                        <p className="text-white">{order.productCategory || '-'}</p>
                                    </div>
                                </div>
                                {(order.description || isProtected) && (
                                    <ProtectedContent isProtected={isProtected}>
                                        <div>
                                            <p className="text-sm text-brand-400">Descrição</p>
                                            <p className="text-white">{order.description || 'Descrição detalhada do produto'}</p>
                                        </div>
                                    </ProtectedContent>
                                )}

                                {/* Banner de proteção ativa */}
                                {isProtected && (
                                    <div className="flex items-center gap-3 p-3 bg-amber-900/30 border border-amber-800/50 rounded-xl">
                                        <Lock className="w-5 h-5 text-amber-400" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-300">Informações protegidas</p>
                                            <p className="text-xs text-amber-400/80">A ficha técnica e detalhes serão liberados após aceitar o pedido</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Detalhes do Pedido</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InfoCard icon={Package} label="Quantidade" value={`${order.quantity} pçs`} />
                                <InfoCard icon={DollarSign} label="Preço/Un" value={formatCurrency(Number(order.pricePerUnit))} />
                                <InfoCard icon={DollarSign} label="Total" value={formatCurrency(Number(order.totalValue))} highlight />
                                <InfoCard icon={Calendar} label="Entrega" value={formatDate(order.deliveryDeadline)} />
                            </div>
                        </div>

                        {/* Brand Info */}
                        <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Marca</h2>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-800 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-brand-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">{order.brand?.tradeName}</p>
                                    {order.brand?.avgRating && (
                                        <p className="text-sm text-brand-400">⭐ {order.brand.avgRating.toFixed(1)}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {(canAccept || canAdvance) && (
                            <div className="flex gap-4">
                                {canAccept && (
                                    <>
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
                                    </>
                                )}

                                {canAdvance && (
                                    <button
                                        onClick={handleAdvanceStatus}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                        Avançar Status
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Chat Sidebar */}
                    {showChat && (
                        <div className="lg:col-span-1">
                            <div className="bg-brand-900/50 rounded-2xl border border-brand-800 h-[600px] flex flex-col">
                                <div className="p-4 border-b border-brand-800">
                                    <h3 className="font-semibold text-white">Chat com a Marca</h3>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {messages.length === 0 ? (
                                        <p className="text-brand-400 text-center text-sm">Nenhuma mensagem ainda</p>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.senderId === user?.id
                                                            ? 'bg-brand-600 text-white'
                                                            : 'bg-brand-800 text-brand-100'
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
                                <div className="p-4 border-t border-brand-800">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Digite sua mensagem..."
                                            className="flex-1 px-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    <div className="bg-brand-900 rounded-2xl border border-brand-800 p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">Recusar Pedido</h3>
                        <p className="text-brand-300 text-sm mb-4">
                            Descreva o motivo da recusa (opcional):
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ex: Capacidade indisponível no momento..."
                            className="w-full px-4 py-3 bg-brand-800 border border-brand-700 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none h-24"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-2 bg-brand-800 hover:bg-brand-700 text-white rounded-xl transition-colors"
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
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-500/20 text-amber-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-500/20 text-blue-400' },
        EM_PRODUCAO: { label: 'Em Produção', color: 'bg-purple-500/20 text-purple-400' },
        PRONTO: { label: 'Pronto', color: 'bg-cyan-500/20 text-cyan-400' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-500/20 text-green-400' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-400' };

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
    <div className={`p-4 rounded-xl ${highlight ? 'bg-brand-600/20 border border-brand-500/30' : 'bg-brand-800/50'}`}>
        <Icon className={`w-5 h-5 mb-2 ${highlight ? 'text-brand-400' : 'text-brand-500'}`} />
        <p className="text-xs text-brand-400">{label}</p>
        <p className={`font-semibold ${highlight ? 'text-brand-300' : 'text-white'}`}>{value}</p>
    </div>
);

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

export default OrderDetailsPage;
