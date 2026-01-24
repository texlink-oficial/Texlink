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
    | 'EM_REVISAO'
    | 'PARCIALMENTE_APROVADO'
    | 'REPROVADO'
    | 'AGUARDANDO_RETRABALHO'
    | 'FINALIZADO'
    | 'RECUSADO_PELA_FACCAO'
    | 'DISPONIVEL_PARA_OUTRAS';

export type OrderOrigin = 'ORIGINAL' | 'REWORK';
export type ReviewType = 'QUALITY_CHECK' | 'FINAL_REVIEW';
export type ReviewResult = 'APPROVED' | 'PARTIAL' | 'REJECTED';

export interface Order {
    id: string;
    displayId: string;
    brandId: string;
    supplierId?: string;
    status: OrderStatus;
    assignmentType: 'DIRECT' | 'BIDDING' | 'HYBRID';
    // Hierarquia
    parentOrderId?: string;
    parentOrder?: { id: string; displayId: string };
    revisionNumber: number;
    origin: OrderOrigin;
    // Produto
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
    // Métricas de revisão
    totalReviewCount?: number;
    approvalCount?: number;
    rejectionCount?: number;
    secondQualityCount?: number;
    // Relações
    createdAt: string;
    brand?: { id: string; tradeName: string; avgRating?: number };
    supplier?: { id: string; tradeName: string; avgRating?: number };
    attachments?: Attachment[];
    childOrders?: OrderChild[];
    reviews?: OrderReview[];
    targetSuppliers?: { status: string }[];
    _count?: { messages: number; childOrders?: number };
}

export interface OrderChild {
    id: string;
    displayId: string;
    status: OrderStatus;
    quantity: number;
    revisionNumber: number;
    origin: OrderOrigin;
    createdAt: string;
}

export interface OrderReview {
    id: string;
    orderId: string;
    type: ReviewType;
    result: ReviewResult;
    totalQuantity: number;
    approvedQuantity: number;
    rejectedQuantity: number;
    secondQualityQuantity: number;
    notes?: string;
    reviewedAt: string;
    childOrderId?: string;
    reviewedBy?: { id: string; name: string };
    rejectedItems?: RejectedItem[];
}

export interface RejectedItem {
    id: string;
    reason: string;
    quantity: number;
    defectDescription?: string;
    requiresRework: boolean;
}

export interface SecondQualityItem {
    id: string;
    orderId: string;
    quantity: number;
    defectType: string;
    defectDescription?: string;
    originalUnitValue: number;
    discountPercentage: number;
    finalUnitValue?: number;
    createdAt: string;
}

export interface OrderHierarchy {
    currentOrder: Order;
    rootOrder: Order | null;
    hierarchy: {
        parent: { id: string; displayId: string; status: OrderStatus } | null;
        children: OrderChild[];
    };
}

export interface ReviewStats {
    totalOrders: number;
    ordersWithReviews: number;
    ordersWithRework: number;
    totalSecondQuality: number;
    firstTimeApprovalRate: number;
    reworkRate: number;
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

    // ========== REVIEW METHODS ==========

    async createReview(orderId: string, data: {
        type: ReviewType;
        totalQuantity: number;
        approvedQuantity: number;
        rejectedQuantity: number;
        secondQualityQuantity?: number;
        notes?: string;
        rejectedItems?: { reason: string; quantity: number; defectDescription?: string; requiresRework?: boolean }[];
        secondQualityItems?: { quantity: number; defectType: string; defectDescription?: string; discountPercentage?: number }[];
    }): Promise<OrderReview> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            return {
                id: `review-${Date.now()}`,
                orderId,
                type: data.type,
                result: data.rejectedQuantity === 0 ? 'APPROVED' : data.approvedQuantity === 0 ? 'REJECTED' : 'PARTIAL',
                totalQuantity: data.totalQuantity,
                approvedQuantity: data.approvedQuantity,
                rejectedQuantity: data.rejectedQuantity,
                secondQualityQuantity: data.secondQualityQuantity || 0,
                notes: data.notes,
                reviewedAt: new Date().toISOString(),
            };
        }
        const response = await api.post<OrderReview>(`/orders/${orderId}/reviews`, data);
        return response.data;
    },

    async getOrderReviews(orderId: string): Promise<OrderReview[]> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return [];
        }
        const response = await api.get<OrderReview[]>(`/orders/${orderId}/reviews`);
        return response.data;
    },

    async createChildOrder(parentOrderId: string, data: {
        quantity: number;
        description?: string;
        observations?: string;
        deliveryDeadline?: string;
    }): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const parentOrder = mockOrdersState.find(o => o.id === parentOrderId);
            const newOrder: Order = {
                id: `order-child-${Date.now()}`,
                displayId: `${parentOrder?.displayId || 'TX-00000000-0000'}-R1`,
                brandId: parentOrder?.brandId || '',
                supplierId: parentOrder?.supplierId,
                status: 'AGUARDANDO_RETRABALHO',
                assignmentType: parentOrder?.assignmentType || 'DIRECT',
                parentOrderId,
                revisionNumber: 1,
                origin: 'REWORK',
                productType: parentOrder?.productType || '',
                productName: parentOrder?.productName || '',
                quantity: data.quantity,
                pricePerUnit: 0,
                totalValue: 0,
                deliveryDeadline: data.deliveryDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                materialsProvided: parentOrder?.materialsProvided || false,
                createdAt: new Date().toISOString(),
            };
            mockOrdersState.unshift(newOrder);
            return newOrder;
        }
        const response = await api.post<Order>(`/orders/${parentOrderId}/child-orders`, data);
        return response.data;
    },

    async getOrderHierarchy(orderId: string): Promise<OrderHierarchy> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            const order = mockOrdersState.find(o => o.id === orderId);
            return {
                currentOrder: order as Order,
                rootOrder: null,
                hierarchy: { parent: null, children: [] }
            };
        }
        const response = await api.get<OrderHierarchy>(`/orders/${orderId}/hierarchy`);
        return response.data;
    },

    async getSecondQualityItems(orderId: string): Promise<SecondQualityItem[]> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return [];
        }
        const response = await api.get<SecondQualityItem[]>(`/orders/${orderId}/second-quality`);
        return response.data;
    },

    async getReviewStats(companyId?: string): Promise<ReviewStats> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return {
                totalOrders: 50,
                ordersWithReviews: 35,
                ordersWithRework: 5,
                totalSecondQuality: 120,
                firstTimeApprovalRate: 85.7,
                reworkRate: 10.0,
            };
        }
        const params = companyId ? { companyId } : undefined;
        const response = await api.get<ReviewStats>('/orders/stats/reviews', { params });
        return response.data;
    },
};
