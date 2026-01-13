import api from './api';

export type OrderStatus =
    | 'LANCADO_PELA_MARCA'
    | 'ACEITO_PELA_FACCAO'
    | 'EM_PREPARACAO_SAIDA_MARCA'
    | 'EM_PREPARACAO_ENTRADA_FACCAO'
    | 'EM_PRODUCAO'
    | 'PRONTO'
    | 'FINALIZADO'
    | 'RECUSADO_PELA_FACCAO'
    | 'DISPONIVEL_PARA_OUTRAS';

export interface Order {
    id: string;
    displayId: string;
    brandId: string;
    supplierId?: string;
    status: OrderStatus;
    assignmentType: 'DIRECT' | 'BIDDING';
    productType: string;
    productCategory?: string;
    productName: string;
    description?: string;
    quantity: number;
    pricePerUnit: number;
    totalValue: number;
    deliveryDeadline: string;
    paymentTerms?: string;
    materialsProvided: boolean;
    createdAt: string;
    brand?: { id: string; tradeName: string; avgRating?: number };
    supplier?: { id: string; tradeName: string; avgRating?: number };
    attachments?: Attachment[];
    _count?: { messages: number };
}

export interface Attachment {
    id: string;
    type: string;
    name: string;
    url: string;
    mimeType: string;
}

export interface CreateOrderDto {
    productType: string;
    productCategory?: string;
    productName: string;
    description?: string;
    quantity: number;
    pricePerUnit: number;
    deliveryDeadline: string;
    paymentTerms?: string;
    materialsProvided?: boolean;
    observations?: string;
    assignmentType: 'DIRECT' | 'BIDDING';
    supplierId?: string;
    targetSupplierIds?: string[];
}

export const ordersService = {
    async create(data: CreateOrderDto): Promise<Order> {
        const response = await api.post<Order>('/orders', data);
        return response.data;
    },

    async getBrandOrders(status?: OrderStatus): Promise<Order[]> {
        const params = status ? { status } : undefined;
        const response = await api.get<Order[]>('/orders/brand', { params });
        return response.data;
    },

    async getSupplierOrders(status?: OrderStatus): Promise<Order[]> {
        const params = status ? { status } : undefined;
        const response = await api.get<Order[]>('/orders/supplier', { params });
        return response.data;
    },

    async getById(id: string): Promise<Order> {
        const response = await api.get<Order>(`/orders/${id}`);
        return response.data;
    },

    async accept(id: string): Promise<Order> {
        const response = await api.patch<Order>(`/orders/${id}/accept`);
        return response.data;
    },

    async reject(id: string, reason?: string): Promise<Order> {
        const response = await api.patch<Order>(`/orders/${id}/reject`, { reason });
        return response.data;
    },

    async updateStatus(id: string, status: OrderStatus, notes?: string): Promise<Order> {
        const response = await api.patch<Order>(`/orders/${id}/status`, { status, notes });
        return response.data;
    },
};
