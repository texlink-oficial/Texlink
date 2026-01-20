import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ordersService, chatService, Order, Message } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft, Package, Calendar, DollarSign, Factory,
    CheckCircle, Send, MessageSquare, Clock,
    ChevronRight, Loader2, FileText, Upload,
    Truck, Box, Scissors, Star
} from 'lucide-react';

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

        // Brand can advance: preparation and transit stages
        const statusFlow: Record<string, string> = {
            ACEITO_PELA_FACCAO: 'EM_PREPARACAO_SAIDA_MARCA',
            EM_PREPARACAO_SAIDA_MARCA: 'EM_TRANSITO_PARA_FACCAO',
            PRONTO: 'EM_TRANSITO_PARA_MARCA',
            EM_TRANSITO_PARA_MARCA: 'FINALIZADO',
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Pedido não encontrado</p>
            </div>
        );
    }

    const canAdvance = ['ACEITO_PELA_FACCAO', 'EM_PREPARACAO_SAIDA_MARCA', 'PRONTO', 'EM_TRANSITO_PARA_MARCA'].includes(order.status);
    const isFinalized = order.status === 'FINALIZADO';

    // Timeline steps
    const timeline = [
        { step: 'Pedido Criado', status: 'LANCADO_PELA_MARCA', icon: Package, done: true },
        { step: 'Aceito pela Facção', status: 'ACEITO_PELA_FACCAO', icon: CheckCircle },
        { step: 'Preparação (Marca)', status: 'EM_PREPARACAO_SAIDA_MARCA', icon: Box },
        { step: 'Trânsito → Facção', status: 'EM_TRANSITO_PARA_FACCAO', icon: Truck },
        { step: 'Recebido na Facção', status: 'EM_PREPARACAO_ENTRADA_FACCAO', icon: Box },
        { step: 'Em Produção', status: 'EM_PRODUCAO', icon: Scissors },
        { step: 'Pronto p/ Envio', status: 'PRONTO', icon: Box },
        { step: 'Trânsito → Marca', status: 'EM_TRANSITO_PARA_MARCA', icon: Truck },
        { step: 'Finalizado', status: 'FINALIZADO', icon: CheckCircle },
    ];

    const currentIndex = timeline.findIndex(t => t.status === order.status);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/brand/pedidos" className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
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
                            {order._count?.messages ? (
                                <span className="bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {order._count.messages}
                                </span>
                            ) : null}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Timeline */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progresso</h2>
                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                <div className="space-y-4">
                                    {timeline.map((item, index) => {
                                        const Icon = item.icon;
                                        const isCompleted = index <= currentIndex;
                                        const isCurrent = index === currentIndex;

                                        return (
                                            <div key={item.step} className="relative flex items-center gap-4 pl-10">
                                                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                                                        ? 'bg-brand-500 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                    } ${isCurrent ? 'ring-4 ring-brand-200 dark:ring-brand-900' : ''}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-medium ${isCompleted
                                                            ? 'text-gray-900 dark:text-white'
                                                            : 'text-gray-400 dark:text-gray-500'
                                                        }`}>
                                                        {item.step}
                                                    </p>
                                                </div>
                                                {isCompleted && (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

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
                                {order.description && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Descrição</p>
                                        <p className="text-gray-900 dark:text-white">{order.description}</p>
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
                        </div>

                        {/* Supplier Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Facção</h2>
                            {order.supplier ? (
                                <Link
                                    to={`/brand/faccoes/${order.supplierId}`}
                                    className="flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 -m-2 rounded-xl transition-colors"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center">
                                        <Factory className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-900 dark:text-white font-medium">{order.supplier.tradeName}</p>
                                        {order.supplier.avgRating && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Star className="w-4 h-4 text-amber-400 fill-current" />
                                                {Number(order.supplier.avgRating).toFixed(1)}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Link>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">Aguardando aceite de uma facção</p>
                            )}
                        </div>

                        {/* Attachments */}
                        {order.attachments && order.attachments.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Anexos</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {order.attachments.map((att) => (
                                        <a
                                            key={att.id}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <FileText className="w-5 h-5 text-brand-500" />
                                            <span className="text-sm text-gray-900 dark:text-white truncate">{att.name}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {(canAdvance || isFinalized) && (
                            <div className="flex gap-4">
                                {canAdvance && (
                                    <button
                                        onClick={handleAdvanceStatus}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                        Avançar Status
                                    </button>
                                )}
                                {isFinalized && !order.ratings?.length && (
                                    <button
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-xl transition-colors"
                                    >
                                        <Star className="w-5 h-5" />
                                        Avaliar Facção
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Chat Sidebar */}
                    {showChat && (
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 h-[600px] flex flex-col sticky top-24">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Chat com a Facção</h3>
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
                                            className="p-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl disabled:opacity-50 transition-colors"
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
        </div>
    );
};

// Helper components
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
        LANCADO_PELA_MARCA: { label: 'Aguardando Aceite', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando Envio', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
        EM_TRANSITO_PARA_FACCAO: { label: 'Em Trânsito', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
        EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Recebido Facção', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
        EM_PRODUCAO: { label: 'Em Produção', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        PRONTO: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        EM_TRANSITO_PARA_MARCA: { label: 'Trânsito → Marca', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

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
