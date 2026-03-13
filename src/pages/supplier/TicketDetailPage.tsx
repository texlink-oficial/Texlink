import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, HelpCircle, Send, Clock, CheckCircle,
    Package, CreditCard, Key, Wrench, MoreHorizontal,
    RefreshCw, User, Headphones, X, AlertTriangle,
    Truck, FileText, Lightbulb
} from 'lucide-react';
import { supportTicketsService } from '../../services/supportTickets.service';
import type { SupportTicket, SupportTicketMessage, SupportTicketCategory, SupportTicketStatus } from '../../types';
import { TICKET_STATUS_LABELS, TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from '../../types';

const CATEGORY_ICONS: Record<SupportTicketCategory, React.ElementType> = {
    PEDIDOS: Package,
    PAGAMENTOS: CreditCard,
    ACESSO: Key,
    TECNICO: Wrench,
    FORNECEDORES: Truck,
    RELATORIOS: FileText,
    SUGESTAO: Lightbulb,
    OUTROS: MoreHorizontal,
};

const STATUS_COLORS: Record<SupportTicketStatus, { bg: string; text: string; dot: string }> = {
    ABERTO: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500 dark:bg-blue-400' },
    EM_ANDAMENTO: { bg: 'bg-yellow-100 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500 dark:bg-yellow-400' },
    AGUARDANDO_RESPOSTA: { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500 dark:bg-purple-400' },
    RESOLVIDO: { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500 dark:bg-green-400' },
    FECHADO: { bg: 'bg-gray-100 dark:bg-gray-500/10', text: 'text-gray-700 dark:text-gray-400', dot: 'bg-gray-500 dark:bg-gray-400' },
};

const TicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    useEffect(() => {
        if (id) {
            loadTicketData();
        }
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadTicketData = async () => {
        try {
            setIsLoading(true);
            const [ticketData, messagesData] = await Promise.all([
                supportTicketsService.getById(id!),
                supportTicketsService.getMessages(id!),
            ]);
            setTicket(ticketData);
            setMessages(messagesData);
        } catch (error) {
            console.error('Error loading ticket:', error);
            navigate('/portal/suporte');
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending || !ticket) return;

        try {
            setIsSending(true);
            const message = await supportTicketsService.sendMessage(ticket.id, {
                content: newMessage.trim(),
            });
            setMessages([...messages, message]);
            setNewMessage('');
            // Reload ticket to get updated status
            const updatedTicket = await supportTicketsService.getById(ticket.id);
            setTicket(updatedTicket);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!ticket) return;

        try {
            const updatedTicket = await supportTicketsService.closeTicket(ticket.id);
            setTicket(updatedTicket);
            setShowCloseConfirm(false);
        } catch (error) {
            console.error('Error closing ticket:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatMessageDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <HelpCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white">Chamado não encontrado</p>
                </div>
            </div>
        );
    }

    const CategoryIcon = CATEGORY_ICONS[ticket.category];
    const statusColors = STATUS_COLORS[ticket.status];
    const isClosed = ticket.status === 'FECHADO';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/portal/suporte" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                                    #{ticket.displayId}
                                </span>
                                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusColors.bg} ${statusColors.text}`}>
                                    <span className={`w-2 h-2 rounded-full ${statusColors.dot}`} />
                                    {TICKET_STATUS_LABELS[ticket.status]}
                                </span>
                            </div>
                        </div>

                        {!isClosed && (
                            <button
                                onClick={() => setShowCloseConfirm(true)}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Fechar Chamado
                            </button>
                        )}
                    </div>

                    <div className="mt-3">
                        <h1 className="text-lg font-medium text-gray-900 dark:text-white">{ticket.title}</h1>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <CategoryIcon className="w-4 h-4" />
                                {TICKET_CATEGORY_LABELS[ticket.category]}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDate(ticket.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                    {/* Initial Description */}
                    <div className="flex justify-start">
                        <div className="max-w-[80%]">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {ticket.createdBy?.name || 'Você'}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {formatMessageDate(ticket.createdAt)}
                                </span>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md p-4 shadow-sm">
                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {messages.map((message) => {
                        const isSupport = message.isFromSupport;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isSupport ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className="max-w-[80%]">
                                    <div className={`flex items-center gap-2 mb-1 ${isSupport ? '' : 'justify-end'}`}>
                                        {isSupport && (
                                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                                                <Headphones className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {isSupport ? 'Suporte Texlink' : (message.sender?.name || 'Você')}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {formatMessageDate(message.createdAt)}
                                        </span>
                                        {!isSupport && (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={`rounded-2xl p-4 shadow-sm ${
                                            isSupport
                                                ? 'bg-brand-50 dark:bg-brand-500/20 rounded-tl-md border border-brand-200 dark:border-brand-500/30'
                                                : 'bg-gray-100 dark:bg-gray-800 rounded-tr-md'
                                        }`}
                                    >
                                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            {!isClosed ? (
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                disabled={isSending}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isSending}
                                className="px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                            >
                                {isSending ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                            <CheckCircle className="w-5 h-5 inline mr-2 text-green-500" />
                            Este chamado foi fechado em {formatDate(ticket.closedAt || ticket.updatedAt)}
                        </p>
                    </div>
                </div>
            )}

            {/* Close Confirmation Modal */}
            {showCloseConfirm && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-500/10 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fechar Chamado</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Tem certeza que deseja fechar este chamado? Você não poderá enviar novas mensagens após o fechamento.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseConfirm(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCloseTicket}
                                className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-colors"
                            >
                                Sim, Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketDetailPage;
