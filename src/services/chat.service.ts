import api from './api';

export interface Message {
    id: string;
    orderId: string;
    senderId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposalData?: {
        originalValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        newValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    };
    read: boolean;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        role: string;
    };
}

export interface SendMessageDto {
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    proposedDeadline?: string;
}

export const chatService = {
    async getMessages(orderId: string): Promise<Message[]> {
        const response = await api.get(`/orders/${orderId}/chat`);
        const data = response.data;
        // Backend returns { messages, hasMore, nextCursor } — extract the array
        if (data && typeof data === 'object' && 'messages' in data) {
            return (data as { messages: Message[] }).messages;
        }
        // Fallback: if response is already an array
        return Array.isArray(data) ? data : [];
    },

    async sendMessage(orderId: string, data: SendMessageDto): Promise<Message> {
        const response = await api.post<Message>(`/orders/${orderId}/chat`, data);
        return response.data;
    },

    async acceptProposal(orderId: string, messageId: string) {
        const response = await api.patch(`/orders/${orderId}/chat/messages/${messageId}/accept`);
        return response.data;
    },

    async rejectProposal(orderId: string, messageId: string) {
        const response = await api.patch(`/orders/${orderId}/chat/messages/${messageId}/reject`);
        return response.data;
    },

    async getUnreadCount(orderId: string): Promise<{ unreadCount: number }> {
        const response = await api.get<{ unreadCount: number }>(`/orders/${orderId}/chat/unread`);
        return response.data;
    },
};
