import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChatSocket, ChatMessage } from '../../hooks/useChatSocket';
import {
    Send,
    Coins,
    MoreVertical,
    CheckCheck,
    Check,
    ArrowRight,
    DollarSign,
    Calendar,
    Package,
    ChevronDown,
    Loader2,
    WifiOff,
    Wifi,
} from 'lucide-react';

const NEGOTIATION_STATUSES = ['LANCADO_PELA_MARCA', 'EM_NEGOCIACAO'];

interface ChatPanelProps {
    orderId: string;
    orderDisplayId?: string;
    partnerName: string;
    partnerImage?: string;
    orderStatus?: string;
    currentOrder?: {
        pricePerUnit: number;
        quantity: number;
        deliveryDeadline: string;
    };
    onProposalAccepted?: () => void;
    className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    orderId,
    orderDisplayId,
    partnerName,
    partnerImage,
    orderStatus,
    currentOrder,
    onProposalAccepted,
    className = '',
}) => {
    const canNegotiate = !orderStatus || NEGOTIATION_STATUSES.includes(orderStatus);
    const {
        messages,
        isConnected,
        isLoading,
        typingUsers,
        sendMessage,
        sendTyping,
        markAsRead,
        acceptProposal,
        rejectProposal,
    } = useChatSocket(orderId);

    const [inputValue, setInputValue] = useState('');
    const [showProposalForm, setShowProposalForm] = useState(false);
    const [proposalValues, setProposalValues] = useState({
        pricePerUnit: currentOrder?.pricePerUnit || 0,
        quantity: currentOrder?.quantity || 0,
        deliveryDeadline: currentOrder?.deliveryDeadline || '',
    });
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { user: authUser } = useAuth();
    const currentUserId = authUser?.id;

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showProposalForm]);

    // Mark as read when viewing
    useEffect(() => {
        if (isConnected && messages.length > 0) {
            markAsRead();
        }
    }, [isConnected, messages.length, markAsRead]);

    // Update proposal values when order changes
    useEffect(() => {
        if (currentOrder) {
            setProposalValues({
                pricePerUnit: currentOrder.pricePerUnit,
                quantity: currentOrder.quantity,
                deliveryDeadline: currentOrder.deliveryDeadline,
            });
        }
    }, [currentOrder]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        sendTyping(true);
    };

    const handleSendText = async () => {
        if (!inputValue.trim() || isSending) return;

        setIsSending(true);
        const success = await sendMessage({
            type: 'TEXT',
            content: inputValue.trim(),
        });

        if (success) {
            setInputValue('');
            sendTyping(false);
        }
        setIsSending(false);
    };

    const handleSendProposal = async () => {
        if (isSending) return;

        setIsSending(true);
        const success = await sendMessage({
            type: 'PROPOSAL',
            proposedPrice: proposalValues.pricePerUnit,
            proposedQuantity: proposalValues.quantity,
            proposedDeadline: proposalValues.deliveryDeadline,
        });

        if (success) {
            setShowProposalForm(false);
        }
        setIsSending(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    const handleAcceptProposal = async (messageId: string) => {
        const success = await acceptProposal(messageId);
        if (success) {
            onProposalAccepted?.();
        }
    };

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
    const formatTime = (date: string) =>
        new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const isOwnMessage = (message: ChatMessage) => message.senderId === currentUserId;

    if (isLoading) {
        return (
            <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {partnerImage ? (
                            <img
                                src={partnerImage}
                                alt={partnerName}
                                className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-600"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                <span className="text-brand-600 dark:text-brand-400 font-bold">
                                    {partnerName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 border-2 border-white dark:border-gray-800 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                            {partnerName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            {isConnected ? (
                                <>
                                    <Wifi className="w-3 h-3 text-green-500" />
                                    Conectado
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-3 h-3 text-gray-400" />
                                    Desconectado
                                </>
                            )}
                            {orderDisplayId && ` • Pedido ${orderDisplayId}`}
                        </p>
                    </div>
                </div>
                <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700">
                    <MoreVertical className="h-5 w-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-6">
                        <Coins className="h-10 w-10 text-amber-400 mb-3" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhuma mensagem ainda</p>
                        <p className="text-xs mt-1 text-center leading-relaxed">
                            {currentOrder && canNegotiate
                                ? <>Use o botão <span className="font-semibold text-amber-600 dark:text-amber-400">"Enviar Proposta"</span> abaixo para negociar preço, quantidade e prazo.</>
                                : 'Envie uma mensagem para a marca'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                                Hoje
                            </span>
                        </div>

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl shadow-sm text-sm relative overflow-hidden ${isOwnMessage(msg)
                                            ? 'bg-brand-500 text-white rounded-br-none'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                                        }`}
                                >
                                    {/* Text Message */}
                                    {msg.type === 'TEXT' && (
                                        <div className="px-4 py-2.5">
                                            <p>{msg.content}</p>
                                        </div>
                                    )}

                                    {/* Proposal Message */}
                                    {msg.type === 'PROPOSAL' && msg.proposalData && (
                                        <div className="min-w-[250px]">
                                            <div
                                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b ${isOwnMessage(msg)
                                                        ? 'bg-brand-600 border-white/20'
                                                        : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                                    }`}
                                            >
                                                <Coins className="h-4 w-4" />
                                                Proposta de Negociação
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {/* Price Change */}
                                                {msg.proposalData.newValues.pricePerUnit !==
                                                    msg.proposalData.originalValues.pricePerUnit && (
                                                        <div
                                                            className={`flex items-center justify-between p-2 rounded ${isOwnMessage(msg) ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700/50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2 text-xs opacity-90">
                                                                <DollarSign className="h-3 w-3" />
                                                                Preço un.
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs line-through opacity-70">
                                                                    {formatCurrency(msg.proposalData.originalValues.pricePerUnit)}
                                                                </span>
                                                                <ArrowRight className="h-3 w-3 opacity-70" />
                                                                <span className="font-bold">
                                                                    {formatCurrency(msg.proposalData.newValues.pricePerUnit)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* Quantity Change */}
                                                {msg.proposalData.newValues.quantity !==
                                                    msg.proposalData.originalValues.quantity && (
                                                        <div
                                                            className={`flex items-center justify-between p-2 rounded ${isOwnMessage(msg) ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700/50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2 text-xs opacity-90">
                                                                <Package className="h-3 w-3" />
                                                                Quantidade
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs line-through opacity-70">
                                                                    {msg.proposalData.originalValues.quantity}
                                                                </span>
                                                                <ArrowRight className="h-3 w-3 opacity-70" />
                                                                <span className="font-bold">
                                                                    {msg.proposalData.newValues.quantity}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* Date Change */}
                                                {msg.proposalData.newValues.deliveryDeadline !==
                                                    msg.proposalData.originalValues.deliveryDeadline && (
                                                        <div
                                                            className={`flex items-center justify-between p-2 rounded ${isOwnMessage(msg) ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700/50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2 text-xs opacity-90">
                                                                <Calendar className="h-3 w-3" />
                                                                Prazo
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs line-through opacity-70">
                                                                    {formatDate(msg.proposalData.originalValues.deliveryDeadline)}
                                                                </span>
                                                                <ArrowRight className="h-3 w-3 opacity-70" />
                                                                <span className="font-bold">
                                                                    {formatDate(msg.proposalData.newValues.deliveryDeadline)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>

                                            {/* Proposal Status / Actions */}
                                            {msg.proposalData.status === 'PENDING' && !isOwnMessage(msg) ? (
                                                <div className="flex gap-2 p-3 border-t border-gray-100 dark:border-gray-600">
                                                    <button
                                                        onClick={() => handleAcceptProposal(msg.id)}
                                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg"
                                                    >
                                                        Aceitar
                                                    </button>
                                                    <button
                                                        onClick={() => rejectProposal(msg.id)}
                                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-lg"
                                                    >
                                                        Recusar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`px-3 py-1.5 text-[10px] text-center font-bold uppercase ${msg.proposalData.status === 'ACCEPTED'
                                                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                                                            : msg.proposalData.status === 'REJECTED'
                                                                ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                                                                : isOwnMessage(msg)
                                                                    ? 'bg-brand-700/50'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}
                                                >
                                                    {msg.proposalData.status === 'PENDING'
                                                        ? 'Aguardando Resposta'
                                                        : msg.proposalData.status === 'ACCEPTED'
                                                            ? 'Proposta Aceita ✓'
                                                            : 'Proposta Recusada'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Timestamp and Read Status */}
                                    <div
                                        className={`flex items-center justify-end gap-1 px-4 pb-2 text-[10px] ${isOwnMessage(msg) ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500'
                                            }`}
                                    >
                                        {formatTime(msg.createdAt)}
                                        {isOwnMessage(msg) && (
                                            msg.read ? (
                                                <CheckCheck className="h-3 w-3 text-brand-100" />
                                            ) : (
                                                <Check className="h-3 w-3 opacity-70" />
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                        <span>{typingUsers[0].userName} está digitando</span>
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Proposal Builder */}
            {showProposalForm && (
                <div className="bg-white dark:bg-gray-800 border-t border-brand-100 dark:border-gray-600 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Coins className="h-5 w-5 text-brand-500" />
                                Nova Proposta
                            </h4>
                            <button
                                onClick={() => setShowProposalForm(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    Preço Unitário (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={proposalValues.pricePerUnit}
                                    onChange={(e) =>
                                        setProposalValues({
                                            ...proposalValues,
                                            pricePerUnit: Number(e.target.value),
                                        })
                                    }
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    Quantidade
                                </label>
                                <input
                                    type="number"
                                    value={proposalValues.quantity}
                                    onChange={(e) =>
                                        setProposalValues({
                                            ...proposalValues,
                                            quantity: Number(e.target.value),
                                        })
                                    }
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    Prazo de Entrega
                                </label>
                                <input
                                    type="date"
                                    value={proposalValues.deliveryDeadline.split('T')[0]}
                                    onChange={(e) =>
                                        setProposalValues({
                                            ...proposalValues,
                                            deliveryDeadline: e.target.value,
                                        })
                                    }
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSendProposal}
                            disabled={isSending}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Enviar Proposta <Send className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Proposal CTA */}
            {currentOrder && canNegotiate && !showProposalForm && (
                <div className="px-3 pt-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowProposalForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
                    >
                        <Coins className="h-4 w-4" />
                        Enviar Proposta de Negociação
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className={`p-3 bg-white dark:bg-gray-800 ${!currentOrder || showProposalForm ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/30 transition-all">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 outline-none"
                        disabled={showProposalForm || !isConnected}
                    />
                    <button
                        onClick={handleSendText}
                        disabled={!inputValue.trim() || showProposalForm || isSending || !isConnected}
                        className="p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
