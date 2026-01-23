import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_ORDERS } from './mockData';

export type OrderStatus =
    | 'LANCADO_PELA_MARCA'
    | 'ACEITO_PELA_FACCAO'
    | 'EM_PREPARACAO_SAIDA_MARCA'
    | 'EM_TRANSITO_PARA_FACCAO'
    | 'EM_PREPARACAO_ENTRADA_FACCAO'
    | 'EM_PRODUCAO'
    | 'PRONTO'
    | 'EM_TRANSITO_PARA_MARCA'
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

// In-memory storage for mock mode (allows "creating" orders in demo)
let mockOrdersState = [...MOCK_ORDERS];

export const ordersService = {
    async create(data: CreateOrderDto): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const newOrder: Order = {
                id: `order-mock-${Date.now()}`,
                displayId: `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(mockOrdersState.length + 1).padStart(4, '0')}`,
                brandId: 'company-brand-001',
                supplierId: data.supplierId || undefined,
                status: 'LANCADO_PELA_MARCA',
                assignmentType: data.assignmentType,
                productType: data.productType,
                productCategory: data.productCategory,
                productName: data.productName,
                description: data.description,
                quantity: data.quantity,
                pricePerUnit: data.pricePerUnit,
                totalValue: data.quantity * data.pricePerUnit,
                deliveryDeadline: data.deliveryDeadline,
                paymentTerms: data.paymentTerms,
                materialsProvided: data.materialsProvided || false,
                createdAt: new Date().toISOString(),
                brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
                supplier: data.supplierId ? { id: data.supplierId, tradeName: 'Fornecedor Demo', avgRating: 4.5 } : undefined,
                _count: { messages: 0 }
            };
            mockOrdersState.unshift(newOrder);
            return newOrder;
        }

        const response = await api.post<Order>('/orders', data);
        return response.data;
    },

    async getBrandOrders(status?: OrderStatus): Promise<Order[]> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            // Filter orders where brand matches current user's company
            let orders = mockOrdersState.filter(o =>
                o.brandId === 'company-brand-001' || o.brand?.tradeName === 'Fashion Style Ltda'
            );
            if (status) {
                orders = orders.filter(o => o.status === status);
            }
            return orders as Order[];
        }

        const params = status ? { status } : undefined;
        const response = await api.get<Order[]>('/orders/brand', { params });
        return response.data;
    },

    async getSupplierOrders(status?: OrderStatus): Promise<Order[]> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            // Filter orders assigned to supplier-001 (demo supplier)
            let orders = mockOrdersState.filter(o =>
                o.supplierId === 'supplier-001' || o.supplier?.tradeName === 'Confecções Silva'
            );
            if (status) {
                orders = orders.filter(o => o.status === status);
            }
            return orders as Order[];
        }

        const params = status ? { status } : undefined;
        const response = await api.get<Order[]>('/orders/supplier', { params });
        return response.data;
    },

    async getById(id: string): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const order = mockOrdersState.find(o => o.id === id);
            if (!order) {
                throw new Error('Pedido não encontrado');
            }
            return order as Order;
        }

        const response = await api.get<Order>(`/orders/${id}`);
        return response.data;
    },

    async accept(id: string): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const orderIndex = mockOrdersState.findIndex(o => o.id === id);
            if (orderIndex === -1) throw new Error('Pedido não encontrado');
            mockOrdersState[orderIndex] = {
                ...mockOrdersState[orderIndex],
                status: 'ACEITO_PELA_FACCAO'
            };
            return mockOrdersState[orderIndex] as Order;
        }

        const response = await api.patch<Order>(`/orders/${id}/accept`);
        return response.data;
    },

    async reject(id: string, reason?: string): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const orderIndex = mockOrdersState.findIndex(o => o.id === id);
            if (orderIndex === -1) throw new Error('Pedido não encontrado');
            mockOrdersState[orderIndex] = {
                ...mockOrdersState[orderIndex],
                status: 'RECUSADO_PELA_FACCAO'
            };
            return mockOrdersState[orderIndex] as Order;
        }

        const response = await api.patch<Order>(`/orders/${id}/reject`, { reason });
        return response.data;
    },

    async updateStatus(id: string, status: OrderStatus, notes?: string): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const orderIndex = mockOrdersState.findIndex(o => o.id === id);
            if (orderIndex === -1) throw new Error('Pedido não encontrado');
            mockOrdersState[orderIndex] = {
                ...mockOrdersState[orderIndex],
                status
            };
            return mockOrdersState[orderIndex] as Order;
        }

        const response = await api.patch<Order>(`/orders/${id}/status`, { status, notes });
        return response.data;
    },
};
