import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService, Order } from '../../services';
import { MessageSquare, Loader2, Package, ArrowRight, Clock } from 'lucide-react';

interface Conversation {
    orderId: string;
    displayId: string;
    supplierName: string;
    productName: string;
    lastMessage?: string;
    unreadCount: number;
    updatedAt: string;
}

const MessagesPage: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            setIsLoading(true);
            const orders = await ordersService.getBrandOrders();

            // Filter orders that have messages or are active (potential conversations)
            const convs: Conversation[] = orders
                .filter((o: Order) => o.supplier && o.status !== 'FINALIZADO')
                .map((order: Order) => ({
                    orderId: order.id,
                    displayId: order.displayId,
                    supplierName: order.supplier?.tradeName || 'Facção',
                    productName: order.productName,
                    lastMessage: undefined,
                    unreadCount: order._count?.messages || 0,
                    updatedAt: order.createdAt,
                }));

            setConversations(convs);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mensagens</h1>
                <p className="text-gray-500 dark:text-gray-400">Conversas com suas facções</p>
            </div>

            {conversations.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma conversa ativa</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        As conversas são criadas automaticamente quando você tem pedidos ativos
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {conversations.map(conv => (
                        <Link
                            key={conv.orderId}
                            to={`/brand/pedidos/${conv.orderId}`}
                            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                        {conv.supplierName}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                        <span className="bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    {conv.displayId} - {conv.productName}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                                </span>
                                <ArrowRight className="w-5 h-5 text-gray-400" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessagesPage;
