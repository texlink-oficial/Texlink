import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Order } from '../../types';
import { useChatSocket, ChatMessage } from '../../hooks/useChatSocket';
import {
  X,
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
  Wifi,
  WifiOff,
} from 'lucide-react';
import { NEGOTIATION_STATUSES } from '../../constants/orderStatuses';

interface ChatInterfaceProps {
  order: Order;
  onClose: () => void;
  onOrderUpdated?: (order: any) => void;
}

const MAX_MESSAGE_LENGTH = 5000;

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ order, onClose, onOrderUpdated }) => {
  const canNegotiate = NEGOTIATION_STATUSES.includes(order.status);
  const {
    messages,
    isConnected,
    isOnline,
    isLoading,
    typingUsers,
    rateLimitInfo,
    pendingCount,
    hasMore,
    isLoadingMore,
    sendMessage,
    sendTyping,
    markAsRead,
    acceptProposal,
    rejectProposal,
    loadMore,
  } = useChatSocket(order.id, { onOrderUpdated });

  const [inputValue, setInputValue] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalValues, setProposalValues] = useState({
    pricePerUnit: order.pricePerUnit,
    quantity: order.quantity,
    deliveryDeadline: order.deliveryDeadline,
  });
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showProposalForm]);

  useEffect(() => {
    if (isConnected && messages.length > 0) {
      markAsRead();
    }
  }, [isConnected, messages.length, markAsRead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_MESSAGE_LENGTH) {
      setInputValue(newValue);
      sendTyping(true);
    }
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
    await acceptProposal(messageId);
  };

  // Handle scroll to load more messages
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;

    // Load more when scrolled to top (scrollTop is at or near 0)
    if (target.scrollTop < 50 && hasMore && !isLoadingMore && !isLoading) {
      // Save current scroll height to restore position after loading
      const previousScrollHeight = target.scrollHeight;

      loadMore().then(() => {
        // Restore scroll position (keep user at same visual position)
        requestAnimationFrame(() => {
          const newScrollHeight = target.scrollHeight;
          target.scrollTop = newScrollHeight - previousScrollHeight;
        });
      });
    }
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isOwnMessage = (message: ChatMessage) => message.senderId === currentUserId;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Chat Window */}
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-md h-[min(650px,calc(100vh-2rem))] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={order.brand.image}
                alt={order.brand.name}
                className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-600"
              />
              <span
                className={`absolute bottom-0 right-0 h-2.5 w-2.5 border-2 border-white dark:border-gray-800 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
              ></span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {order.brand.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {!isOnline ? (
                  <>
                    <WifiOff className="w-3 h-3 text-red-500" />
                    Offline
                  </>
                ) : isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-500" />
                    Conectado
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-orange-500" />
                    Reconectando...
                  </>
                )}
                {' • '}Pedido {order.displayId}
                {pendingCount > 0 && (
                  <span className="text-orange-500 dark:text-orange-400 font-medium">
                    {' • '}{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                  </span>
                )}
                {rateLimitInfo.remaining <= 3 && !rateLimitInfo.blocked && pendingCount === 0 && (
                  <span className="text-orange-500 dark:text-orange-400 font-medium">
                    {' • '}{rateLimitInfo.remaining} msg{rateLimitInfo.remaining !== 1 ? 's' : ''} restante{rateLimitInfo.remaining !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700">
              <MoreVertical className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-2 flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
            <WifiOff className="h-4 w-4" />
            <span>Você está offline. Suas mensagens serão enviadas quando reconectar.</span>
          </div>
        )}

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4 relative"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-6">
              <Coins className="h-10 w-10 text-amber-400 mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1 text-center leading-relaxed">
                {canNegotiate
                  ? <>Use o botão <span className="font-semibold text-amber-600 dark:text-amber-400">"Enviar Proposta"</span> abaixo para negociar preço, quantidade e prazo.</>
                  : 'Envie uma mensagem para a marca'}
              </p>
            </div>
          ) : (
            <>
              {/* Loading indicator for older messages */}
              {isLoadingMore && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                </div>
              )}

              {/* No more messages indicator */}
              {!hasMore && messages.length > 0 && (
                <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">
                  — Início da conversa —
                </div>
              )}

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
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl shadow-sm text-sm relative group overflow-hidden ${isOwnMessage(msg)
                        ? 'bg-brand-500 text-white rounded-br-none'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                      }`}
                  >
                    {msg.type === 'TEXT' && (
                      <div className="px-4 py-2.5">
                        <p>{msg.content}</p>
                      </div>
                    )}

                    {msg.type === 'PROPOSAL' && msg.proposalData && (
                      <div className="min-w-[250px]">
                        <div
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/20 ${isOwnMessage(msg)
                              ? 'bg-brand-600'
                              : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                          <Coins className="h-4 w-4" /> Proposta de Negociação
                        </div>
                        <div className="p-3 space-y-2">
                          {/* Price Change */}
                          {msg.proposalData.newValues.pricePerUnit !==
                            msg.proposalData.originalValues.pricePerUnit && (
                              <div className="flex items-center justify-between bg-white/10 dark:bg-black/20 p-2 rounded">
                                <div className="flex items-center gap-2 text-xs opacity-90">
                                  <DollarSign className="h-3 w-3" /> Preço un.
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs line-through opacity-70">
                                    {formatCurrency(
                                      msg.proposalData.originalValues.pricePerUnit
                                    )}
                                  </span>
                                  <ArrowRight className="h-3 w-3 opacity-70" />
                                  <span className="font-bold">
                                    {formatCurrency(
                                      msg.proposalData.newValues.pricePerUnit
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}

                          {/* Quantity Change */}
                          {msg.proposalData.newValues.quantity !==
                            msg.proposalData.originalValues.quantity && (
                              <div className="flex items-center justify-between bg-white/10 dark:bg-black/20 p-2 rounded">
                                <div className="flex items-center gap-2 text-xs opacity-90">
                                  <Package className="h-3 w-3" /> Quantidade
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
                              <div className="flex items-center justify-between bg-white/10 dark:bg-black/20 p-2 rounded">
                                <div className="flex items-center gap-2 text-xs opacity-90">
                                  <Calendar className="h-3 w-3" /> Prazo
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs line-through opacity-70">
                                    {formatDate(
                                      msg.proposalData.originalValues
                                        .deliveryDeadline
                                    )}
                                  </span>
                                  <ArrowRight className="h-3 w-3 opacity-70" />
                                  <span className="font-bold">
                                    {formatDate(
                                      msg.proposalData.newValues.deliveryDeadline
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Proposal Status / Actions */}
                        {msg.proposalData.status === 'PENDING' &&
                          !isOwnMessage(msg) ? (
                          <div className="flex gap-2 p-3 border-t border-gray-100 dark:border-gray-600">
                            <button
                              onClick={() =>
                                handleAcceptProposal(msg.id)
                              }
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
                                    : 'bg-gray-100 dark:bg-gray-700'
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

                    <div
                      className={`flex items-center justify-end gap-1 px-4 pb-2 text-[10px] ${isOwnMessage(msg)
                          ? 'text-brand-100'
                          : 'text-gray-400 dark:text-gray-500'
                        }`}
                    >
                      {formatTime(msg.createdAt)}
                      {isOwnMessage(msg) &&
                        (msg.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin opacity-70" />
                        ) : msg.read ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3 opacity-70" />
                        ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <span>{typingUsers[0].userName} digitando</span>
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

        {/* Proposal Builder Drawer */}
        {showProposalForm && (
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-brand-100 dark:border-gray-600 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-brand-500" /> Nova Proposta
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
        {canNegotiate && !showProposalForm && (
          <div className="px-3 pt-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-10">
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
        <div className={`p-3 bg-white dark:bg-gray-800 ${showProposalForm ? 'border-t border-gray-100 dark:border-gray-700' : ''} z-10`}>
          {rateLimitInfo.blocked && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
              <span className="font-semibold">Limite atingido</span>
              <span>Aguarde {rateLimitInfo.retryAfter}s para enviar novamente</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/30 transition-all">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={rateLimitInfo.blocked ? "Aguarde para enviar..." : "Digite sua mensagem..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 outline-none"
              disabled={showProposalForm || !isConnected || rateLimitInfo.blocked}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            {inputValue.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <span className={`text-xs px-2 ${inputValue.length >= MAX_MESSAGE_LENGTH ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                {inputValue.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
            <button
              onClick={handleSendText}
              disabled={!inputValue.trim() || showProposalForm || isSending || !isConnected || rateLimitInfo.blocked}
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
    </div>
  );
};