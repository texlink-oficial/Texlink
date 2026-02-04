import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HelpCircle, Search, Clock,
    Package, CreditCard, Key, Wrench, MoreHorizontal,
    ChevronRight, RefreshCw, AlertCircle, User, Send,
    X
} from 'lucide-react';
import { supportTicketsService, UpdateTicketDto } from '../../services/supportTickets.service';
import type {
    SupportTicket,
    SupportTicketMessage,
    SupportTicketStats,
    SupportTicketStatus,
    SupportTicketCategory,
    SupportTicketPriority,
} from '../../types';
import {
    TICKET_STATUS_LABELS,
    TICKET_CATEGORY_LABELS,
    TICKET_PRIORITY_LABELS,
} from '../../types';

const CATEGORY_ICONS: Record<SupportTicketCategory, React.ElementType> = {
    PEDIDOS: Package,
    PAGAMENTOS: CreditCard,
    ACESSO: Key,
    TECNICO: Wrench,
    OUTROS: MoreHorizontal,
};

const STATUS_COLORS: Record<SupportTicketStatus, { bg: string; text: string; dot: string }> = {
    ABERTO: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    EM_ANDAMENTO: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    AGUARDANDO_RESPOSTA: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    RESOLVIDO: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    FECHADO: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },
};

const PRIORITY_COLORS: Record<SupportTicketPriority, { bg: string; text: string }> = {
    BAIXA: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
    MEDIA: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
    ALTA: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
    URGENTE: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
};

const SupportTicketsPage: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [stats, setStats] = useState<SupportTicketStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<SupportTicketStatus | ''>('');
    const [selectedPriority, setSelectedPriority] = useState<SupportTicketPriority | ''>('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedStatus, selectedPriority]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [ticketsData, statsData] = await Promise.all([
                supportTicketsService.getAllAdmin({
                    status: selectedStatus || undefined,
                    priority: selectedPriority || undefined,
                }),
                supportTicketsService.getStats(),
            ]);
            setTickets(ticketsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.company?.tradeName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'agora há pouco';
        if (diffHours < 24) return `há ${diffHours}h`;
        if (diffDays === 1) return 'ontem';
        if (diffDays < 7) return `há ${diffDays} dias`;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Chamados de Suporte</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie o atendimento e resolução de dúvidas da rede</p>
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Abertos"
                            value={stats.abertos}
                            icon={AlertCircle}
                            color="sky"
                        />
                        <StatCard
                            title="Em Andamento"
                            value={stats.emAndamento}
                            icon={Clock}
                            color="amber"
                        />
                        <StatCard
                            title="Urgentes"
                            value={stats.urgentes}
                            icon={AlertCircle}
                            color="red"
                        />
                        <StatCard
                            title="Tempo Médio"
                            value={`${stats.tempoMedioResposta}h`}
                            icon={Clock}
                            color="violet"
                        />
                    </div>
                )}

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative group flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por título, número ou empresa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all placeholder:text-gray-400 font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative group w-48">
                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as SupportTicketStatus | '')}
                                className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                            >
                                <option value="">Todos os Status</option>
                                {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative group w-48">
                            <AlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                            <select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value as SupportTicketPriority | '')}
                                className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                            >
                                <option value="">Todas Prioridades</option>
                                {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full animate-pulse" />
                                <RefreshCw className="w-10 h-10 text-sky-500 animate-spin relative" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Sincronizando chamados...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                                <HelpCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-display">Nenhum chamado encontrado</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8 font-medium">
                                Ajuste os filtros ou verifique se há novas solicitações de suporte.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Chamado</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Empresa</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Prioridade</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Data</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                                    {filteredTickets.map((ticket) => {
                                        const CategoryIcon = CATEGORY_ICONS[ticket.category];
                                        const statusColors = STATUS_COLORS[ticket.status];
                                        const priorityColors = PRIORITY_COLORS[ticket.priority];

                                        return (
                                            <tr
                                                key={ticket.id}
                                                className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group cursor-pointer"
                                                onClick={() => setSelectedTicket(ticket)}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-gray-100 dark:border-white/[0.08] shadow-sm group-hover:scale-110 transition-transform">
                                                            <CategoryIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors font-display truncate max-w-[240px]">
                                                                {ticket.title}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest font-mono mt-0.5">
                                                                #{ticket.displayId}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        {ticket.company?.tradeName || '-'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusColors.bg} ${statusColors.text} rounded-lg text-[10px] font-bold uppercase tracking-wider`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot} animate-pulse`} />
                                                        {TICKET_STATUS_LABELS[ticket.status]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 ${priorityColors.bg} ${priorityColors.text} rounded-lg text-[10px] font-bold uppercase tracking-wider border border-current/10`}>
                                                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatDate(ticket.createdAt)}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Última atualização</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={() => {
                        loadData();
                        setSelectedTicket(null);
                    }}
                />
            )}
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: 'sky' | 'amber' | 'red' | 'violet';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorMap = {
        sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/10 shadow-sky-500/5',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10 shadow-amber-500/5',
        red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/10 shadow-red-500/5',
        violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/10 shadow-violet-500/5',
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${colorMap[color]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white font-display leading-none mb-1">{value}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
                </div>
            </div>
        </div>
    );
};

// Ticket Detail Modal Component
interface TicketDetailModalProps {
    ticket: SupportTicket;
    onClose: () => void;
    onUpdate: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose, onUpdate }) => {
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [newStatus, setNewStatus] = useState<SupportTicketStatus>(ticket.status);
    const [newPriority, setNewPriority] = useState<SupportTicketPriority>(ticket.priority);

    useEffect(() => {
        loadMessages();
    }, [ticket.id]);

    const loadMessages = async () => {
        try {
            setIsLoading(true);
            const data = await supportTicketsService.getMessages(ticket.id);
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;

        try {
            setIsSending(true);
            await supportTicketsService.replyAsSupport(ticket.id, {
                content: newMessage.trim(),
                isInternal,
            });
            setNewMessage('');
            setIsInternal(false);
            loadMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateTicket = async () => {
        try {
            const updateData: UpdateTicketDto = {};
            if (newStatus !== ticket.status) updateData.status = newStatus;
            if (newPriority !== ticket.priority) updateData.priority = newPriority;

            if (Object.keys(updateData).length > 0) {
                await supportTicketsService.updateTicket(ticket.id, updateData);
                onUpdate();
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const CategoryIcon = CATEGORY_ICONS[ticket.category];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-white/[0.06] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/10 shadow-lg shadow-sky-500/5">
                            <CategoryIcon className="w-6 h-6 text-sky-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display leading-tight">{ticket.title}</h2>
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono rounded border border-gray-200 dark:border-white/[0.06]">
                                    #{ticket.displayId}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">
                                {ticket.company?.tradeName || 'Empresa não identificada'} • {TICKET_CATEGORY_LABELS[ticket.category]}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Sub-header Controls */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06] flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status:</span>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as SupportTicketStatus)}
                            className="bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer hover:text-sky-500 transition-colors"
                        >
                            {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 border-l border-gray-200 dark:border-white/[0.08] pl-6">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prioridade:</span>
                        <select
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value as SupportTicketPriority)}
                            className="bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer hover:text-sky-500 transition-colors"
                        >
                            {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {(newStatus !== ticket.status || newPriority !== ticket.priority) && (
                        <button
                            onClick={handleUpdateTicket}
                            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-sky-500/20 active:scale-95"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Aplicar Alterações
                        </button>
                    )}
                </div>

                {/* Messages View */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/20 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/[0.06]">
                    {/* Initial Ticket Creation */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-lg shadow-sky-500/20">
                            {ticket.createdBy?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{ticket.createdBy?.name || 'Solicitante'}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formatDate(ticket.createdAt)}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm inline-block max-w-2xl">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
                        </div>
                    ) : (
                        messages.map((message) => {
                            const isSupport = message.isFromSupport;
                            return (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-4 ${isSupport ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg ${isSupport
                                        ? 'bg-violet-500 text-white shadow-violet-500/20'
                                        : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {message.sender?.name?.[0]?.toUpperCase() || (isSupport ? 'S' : 'U')}
                                    </div>
                                    <div className={`flex-1 min-w-0 max-w-[80%] ${isSupport ? 'items-end flex flex-col' : ''}`}>
                                        <div className={`flex items-center gap-2 mb-1 ${isSupport ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                {message.sender?.name || (isSupport ? 'Suporte Texlink' : 'Solicitante')}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formatDate(message.createdAt)}</span>
                                            {message.isInternal && (
                                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded border border-amber-500/20">
                                                    Nota Interna
                                                </span>
                                            )}
                                        </div>
                                        <div className={`rounded-2xl p-4 shadow-sm border ${message.isInternal
                                            ? 'bg-amber-500/5 border-amber-500/20'
                                            : isSupport
                                                ? 'bg-sky-500 dark:bg-sky-600 border-sky-400/20 dark:border-sky-500/20 text-white rounded-tr-none'
                                                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 rounded-tl-none'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Reply Section */}
                {ticket.status !== 'FECHADO' && (
                    <div className="p-6 border-t border-gray-100 dark:border-white/[0.06] bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={(e) => setIsInternal(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-8 h-4.5 bg-gray-200 dark:bg-slate-800 rounded-full transition-colors group-hover:bg-gray-300 dark:group-hover:bg-slate-700 peer-checked:bg-amber-500" />
                                    <div className="absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform peer-checked:translate-x-3.5" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Modo Nota Interna</span>
                            </label>

                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Respondendo como <span className="text-sky-500">Suporte Central</span>
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isInternal ? "Escreva uma observação técnica confidencial..." : "Escreva sua resposta para o usuário..."}
                                    rows={3}
                                    className={`w-full px-4 py-3 border rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 resize-none ${isInternal
                                        ? 'bg-amber-500/5 border-amber-500/20 focus:ring-amber-500/10 focus:border-amber-500/50'
                                        : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-white/[0.06] focus:ring-sky-500/10 focus:border-sky-500/50 text-gray-900 dark:text-white'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isSending}
                                className={`flex flex-col items-center justify-center gap-1.5 w-20 rounded-2xl transition-all disabled:opacity-40 disabled:grayscale group shadow-xl active:scale-95 ${isInternal
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                    : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/20'
                                    }`}
                            >
                                {isSending ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">{isInternal ? 'Nota' : 'Enviar'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportTicketsPage;
