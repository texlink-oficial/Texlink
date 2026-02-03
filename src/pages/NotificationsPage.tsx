import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, ArrowLeft, CheckCheck, Search, Filter,
    RefreshCw, Trash2, Clock, X
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { NotificationItem } from '../components/notifications/NotificationItem';
import { AppNotification, NotificationType, NotificationPriority } from '../types/notification.types';
import { notificationsService } from '../services/notifications.service';

const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
    ORDER_CREATED: 'Pedido Criado',
    ORDER_ACCEPTED: 'Pedido Aceito',
    ORDER_REJECTED: 'Pedido Rejeitado',
    ORDER_STATUS_CHANGED: 'Status do Pedido',
    ORDER_PROPOSAL_RECEIVED: 'Proposta Recebida',
    ORDER_PROPOSAL_RESPONDED: 'Proposta Respondida',
    ORDER_DEADLINE_APPROACHING: 'Prazo Próximo',
    ORDER_FINALIZED: 'Pedido Finalizado',
    MESSAGE_RECEIVED: 'Mensagem Recebida',
    TICKET_CREATED: 'Chamado Criado',
    TICKET_MESSAGE_ADDED: 'Mensagem no Chamado',
    TICKET_STATUS_CHANGED: 'Status do Chamado',
    RELATIONSHIP_REQUESTED: 'Solicitação de Relacionamento',
    RELATIONSHIP_STATUS_CHANGED: 'Status do Relacionamento',
    RATING_RECEIVED: 'Avaliação Recebida',
    SYSTEM_ANNOUNCEMENT: 'Anúncio do Sistema',
};

const PRIORITY_COLORS: Record<NotificationPriority, { bg: string; text: string; dot: string }> = {
    LOW: { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
    NORMAL: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    HIGH: { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    URGENT: { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
};

type FilterType = 'all' | 'unread' | 'read';

const NotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead, hasMore } = useNotifications();

    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<NotificationPriority | ''>('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get back URL based on user role
    const getBackUrl = () => {
        switch (user?.role) {
            case 'SUPPLIER': return '/portal/inicio';
            case 'BRAND': return '/brand/inicio';
            case 'ADMIN': return '/admin';
            default: return '/dashboard';
        }
    };

    // Handle refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchNotifications();
        } finally {
            setIsRefreshing(false);
        }
    };

    // Filter notifications
    const filteredNotifications = notifications.filter(notification => {
        // Filter by read status
        if (filter === 'unread' && notification.read) return false;
        if (filter === 'read' && !notification.read) return false;

        // Filter by priority
        if (selectedPriority && notification.priority !== selectedPriority) return false;

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                notification.title.toLowerCase().includes(query) ||
                notification.body.toLowerCase().includes(query)
            );
        }

        return true;
    });

    // Format time ago
    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'agora';
        if (diffMinutes < 60) return `há ${diffMinutes}min`;
        if (diffHours < 24) return `há ${diffHours}h`;
        if (diffDays === 1) return 'ontem';
        if (diffDays < 7) return `há ${diffDays} dias`;
        return date.toLocaleDateString('pt-BR');
    };

    // Group notifications by date
    const groupedNotifications = React.useMemo(() => {
        const groups: { [key: string]: AppNotification[] } = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        filteredNotifications.forEach(notification => {
            const notifDate = new Date(notification.createdAt);
            notifDate.setHours(0, 0, 0, 0);

            let groupKey: string;
            if (notifDate.getTime() === today.getTime()) {
                groupKey = 'Hoje';
            } else if (notifDate.getTime() === yesterday.getTime()) {
                groupKey = 'Ontem';
            } else {
                groupKey = notifDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                });
                // Capitalize first letter
                groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(notification);
        });

        return groups;
    }, [filteredNotifications]);

    if (isLoading && notifications.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(getBackUrl())}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                    <Bell className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Notificações
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                title="Atualizar"
                            >
                                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    <span className="hidden sm:inline">Marcar todas como lidas</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar notificações..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {(['all', 'unread', 'read'] as FilterType[]).map((filterOption) => (
                            <button
                                key={filterOption}
                                onClick={() => setFilter(filterOption)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === filterOption
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {filterOption === 'all' ? 'Todas' : filterOption === 'unread' ? 'Não lidas' : 'Lidas'}
                            </button>
                        ))}
                    </div>

                    {/* Priority Filter */}
                    <select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value as NotificationPriority | '')}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                        <option value="">Todas prioridades</option>
                        <option value="LOW">Baixa</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">Alta</option>
                        <option value="URGENT">Urgente</option>
                    </select>
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Nenhuma notificação
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            {filter !== 'all' || searchQuery
                                ? 'Nenhuma notificação corresponde aos filtros selecionados.'
                                : 'Quando você receber notificações, elas aparecerão aqui.'}
                        </p>
                        {(filter !== 'all' || searchQuery) && (
                            <button
                                onClick={() => { setFilter('all'); setSearchQuery(''); setSelectedPriority(''); }}
                                className="mt-4 px-4 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedNotifications).map(([date, notifs]) => (
                            <div key={date}>
                                {/* Date Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {date}
                                    </h3>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                </div>

                                {/* Notifications for this date */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {notifs.map((notification, index) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkAsRead={markAsRead}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Load More */}
                        {hasMore && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={() => fetchNotifications()}
                                    disabled={isLoading}
                                    className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Carregar mais'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
