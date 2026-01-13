import React, { useState, useEffect, useRef } from 'react';
import { Order, Message } from '../../types';
import { X, Send, Paperclip, MoreVertical, CheckCheck, Coins, ArrowRight, DollarSign, Calendar, Package, ChevronDown } from 'lucide-react';

interface ChatInterfaceProps {
  order: Order;
  onClose: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ order, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'text',
      text: `Olá! Sobre o pedido #${order.displayId}, estamos ansiosos para iniciar.`,
      sender: 'brand',
      timestamp: '10:30',
      read: true,
    },
    {
      id: '2',
      type: 'text',
      text: 'As fichas técnicas estão bem claras. Vamos priorizar a qualidade.',
      sender: 'me',
      timestamp: '10:35',
      read: true,
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Proposal Form State
  const [proposalValues, setProposalValues] = useState({
    pricePerUnit: order.pricePerUnit,
    quantity: order.quantity,
    deliveryDeadline: order.deliveryDeadline
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showProposalForm]);

  const handleSendText = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      text: inputValue,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
  };

  const handleSendProposal = () => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'proposal',
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      proposal: {
        status: 'pending',
        original: {
            pricePerUnit: order.pricePerUnit,
            quantity: order.quantity,
            deliveryDeadline: order.deliveryDeadline
        },
        new: { ...proposalValues }
      }
    };

    setMessages(prev => [...prev, newMessage]);
    setShowProposalForm(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendText();
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Chat Window */}
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-md h-[650px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={order.brand.image} alt={order.brand.name} className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-600" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{order.brand.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                Online agora • Pedido {order.displayId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700">
              <MoreVertical className="h-5 w-5" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4 relative">
          <div className="flex justify-center">
            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full uppercase font-bold tracking-wider">
              Hoje
            </span>
          </div>
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Message Bubble */}
              <div className={`max-w-[85%] rounded-2xl shadow-sm text-sm relative group overflow-hidden
                ${msg.sender === 'me' 
                  ? 'bg-brand-500 text-white rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                }`}>
                
                {msg.type === 'text' && (
                    <div className="px-4 py-2.5">
                        <p>{msg.text}</p>
                    </div>
                )}

                {msg.type === 'proposal' && msg.proposal && (
                    <div className="min-w-[250px]">
                        <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/20
                             ${msg.sender === 'me' ? 'bg-brand-600' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <Coins className="h-4 w-4" /> Proposta de Negociação
                        </div>
                        <div className="p-3 space-y-2">
                             {/* Price Change */}
                             {msg.proposal.new.pricePerUnit !== msg.proposal.original.pricePerUnit && (
                                <div className="flex items-center justify-between bg-white/10 dark:bg-black/20 p-2 rounded">
                                    <div className="flex items-center gap-2 text-xs opacity-90">
                                        <DollarSign className="h-3 w-3" /> Preço un.
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs line-through opacity-70">{formatCurrency(msg.proposal.original.pricePerUnit || 0)}</span>
                                        <ArrowRight className="h-3 w-3 opacity-70" />
                                        <span className="font-bold">{formatCurrency(msg.proposal.new.pricePerUnit || 0)}</span>
                                    </div>
                                </div>
                             )}

                             {/* Quantity Change */}
                             {msg.proposal.new.quantity !== msg.proposal.original.quantity && (
                                <div className="flex items-center justify-between bg-white/10 dark:bg-black/20 p-2 rounded">
                                     <div className="flex items-center gap-2 text-xs opacity-90">
                                        <Package className="h-3 w-3" /> Quantidade
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs line-through opacity-70">{msg.proposal.original.quantity}</span>
                                        <ArrowRight className="h-3 w-3 opacity-70" />
                                        <span className="font-bold">{msg.proposal.new.quantity}</span>
                                    </div>
                                </div>
                             )}

                             {/* Date Change */}
                             {msg.proposal.new.deliveryDeadline !== msg.proposal.original.deliveryDeadline && (
                                <div className="flex items-center justify-between bg-white/10 dark:bg-black/20 p-2 rounded">
                                     <div className="flex items-center gap-2 text-xs opacity-90">
                                        <Calendar className="h-3 w-3" /> Prazo
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs line-through opacity-70">{formatDate(msg.proposal.original.deliveryDeadline || '')}</span>
                                        <ArrowRight className="h-3 w-3 opacity-70" />
                                        <span className="font-bold">{formatDate(msg.proposal.new.deliveryDeadline || '')}</span>
                                    </div>
                                </div>
                             )}

                             {/* If nothing changed (just a confirm) */}
                             {msg.proposal.new.pricePerUnit === msg.proposal.original.pricePerUnit &&
                              msg.proposal.new.quantity === msg.proposal.original.quantity &&
                              msg.proposal.new.deliveryDeadline === msg.proposal.original.deliveryDeadline && (
                                  <div className="text-center italic text-xs opacity-80 py-2">
                                      Confirmando condições originais
                                  </div>
                              )}
                        </div>
                        <div className={`px-3 py-1.5 text-[10px] text-center font-bold uppercase ${msg.sender === 'me' ? 'bg-brand-700/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            {msg.proposal.status === 'pending' ? 'Aguardando Resposta' : msg.proposal.status}
                        </div>
                    </div>
                )}

                <div className={`flex items-center justify-end gap-1 px-4 pb-2 text-[10px] ${msg.sender === 'me' ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500'}`}>
                  {msg.timestamp}
                  {msg.sender === 'me' && (
                    <CheckCheck className="h-3 w-3 opacity-70" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Proposal Builder Drawer */}
        {showProposalForm && (
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-brand-100 dark:border-gray-600 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 rounded-t-2xl animate-in slide-in-from-bottom duration-300">
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Coins className="h-5 w-5 text-brand-500" /> Nova Proposta
                        </h4>
                        <button onClick={() => setShowProposalForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Preço Unitário (R$)</label>
                            <input 
                                type="number" 
                                value={proposalValues.pricePerUnit} 
                                onChange={(e) => setProposalValues({...proposalValues, pricePerUnit: Number(e.target.value)})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Quantidade</label>
                            <input 
                                type="number" 
                                value={proposalValues.quantity} 
                                onChange={(e) => setProposalValues({...proposalValues, quantity: Number(e.target.value)})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Prazo de Entrega</label>
                            <input 
                                type="date" 
                                value={proposalValues.deliveryDeadline} 
                                onChange={(e) => setProposalValues({...proposalValues, deliveryDeadline: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSendProposal}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Enviar Proposta <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-10">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/30 transition-all">
            <button 
                onClick={() => setShowProposalForm(!showProposalForm)}
                className={`p-2 rounded-full transition-colors ${showProposalForm ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300' : 'text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="Criar Proposta de Negociação"
            >
              <Coins className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hidden sm:block">
              <Paperclip className="h-5 w-5" />
            </button>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500"
              disabled={showProposalForm}
            />
            <button 
              onClick={handleSendText}
              disabled={!inputValue.trim() || showProposalForm}
              className="p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};