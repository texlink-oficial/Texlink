import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ordersService, Order } from '../../services';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { MessageSquare, Loader2, Package, Search, ChevronRight, Clock, X } from 'lucide-react';

interface Conversation {
    orderId: string;
    displayId: string;
    supplierName: string;
    supplierImage?: string;
    productName: string;
    lastMessage?: string;
    unreadCount: number;
    updatedAt: string;
    order: Order;
}

const MessagesPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

    // Check for orderId in URL params
    const urlOrderId = searchParams.get('orderId');

    useEffect(() => {
        loadConversations();
    }, []);

    // Select conversation from URL param
    useEffect(() => {
        if (urlOrderId && conversations.length > 0) {
            const conv = conversations.find((c) => c.orderId === urlOrderId);
            if (conv) {
                setSelectedConv(conv);
            }
        }
    }, [urlOrderId, conversations]);

    const loadConversations = async () => {
        try {
            setIsLoading(true);
            const orders = await ordersService.getBrandOrders();

            // Filter orders that have a supplier assigned and are active
            const convs: Conversation[] = orders
                .filter((o: Order) => o.supplier && o.status !== 'FINALIZADO')
                .map((order: Order) => ({
                    orderId: order.id,
                    displayId: order.displayId,
                    supplierName: order.supplier?.tradeName || 'Facção',
                    supplierImage: order.supplier?.logoUrl,
                    productName: order.productName,
                    lastMessage: undefined,
                    unreadCount: order._count?.messages || 0,
                    updatedAt: (order as any).updatedAt || order.createdAt,
                    order,
                }))
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            setConversations(convs);

            // Auto-select first conversation if none selected and we have conversations
            if (!selectedConv && convs.length > 0 && !urlOrderId) {
                setSelectedConv(convs[0]);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConv(conv);
        setSearchParams({ orderId: conv.orderId });
    };

    const handleCloseChat = () => {
        setSelectedConv(null);
        setSearchParams({});
    };

    const filteredConversations = conversations.filter(
        (conv) =>
            conv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatRelativeTime = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return past.toLocaleDateString('pt-BR');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex bg-gray-100 dark:bg-gray-900">
            {/* Conversations List - Left Panel */}
            <div
                className={`w-full md:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Mensagens
                    </h1>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar conversas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 mb-2">
                                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ativa'}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                As conversas são criadas quando você tem pedidos ativos
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredConversations.map((conv) => (
                                <button
                                    key={conv.orderId}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedConv?.orderId === conv.orderId
                                        ? 'bg-brand-50 dark:bg-brand-900/20 border-l-4 border-brand-500'
                                        : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        {conv.supplierImage ? (
                                            <img
                                                src={conv.supplierImage}
                                                alt={conv.supplierName}
                                                className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-gray-600"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                                <span className="text-brand-600 dark:text-brand-400 font-bold text-lg">
                                                    {conv.supplierName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p
                                                className={`font-semibold truncate ${conv.unreadCount > 0
                                                    ? 'text-gray-900 dark:text-white'
                                                    : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {conv.supplierName}
                                            </p>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                                                {formatRelativeTime(conv.updatedAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                                            <Package className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate">
                                                {conv.displayId} - {conv.productName}
                                            </span>
                                        </p>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Panel - Right Panel */}
            <div
                className={`flex-1 flex flex-col ${selectedConv ? 'flex' : 'hidden md:flex'
                    }`}
            >
                {selectedConv ? (
                    <>
                        {/* Mobile Back Button */}
                        <div className="md:hidden p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleCloseChat}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                                <span>Voltar</span>
                            </button>
                        </div>

                        <ChatPanel
                            orderId={selectedConv.orderId}
                            orderDisplayId={selectedConv.displayId}
                            partnerName={selectedConv.supplierName}
                            partnerImage={selectedConv.supplierImage}
                            currentOrder={{
                                pricePerUnit: Number(selectedConv.order.pricePerUnit),
                                quantity: selectedConv.order.quantity,
                                deliveryDeadline: selectedConv.order.deliveryDeadline,
                            }}
                            onProposalAccepted={loadConversations}
                            className="flex-1"
                        />
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-8">
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                            <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Selecione uma conversa
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            Escolha uma conversa na lista à esquerda para começar a trocar mensagens
                            com suas facções
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
