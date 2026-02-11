import api from './api';

export type OrderStatus =
    | 'LANCADO_PELA_MARCA'
    | 'EM_NEGOCIACAO'
    | 'ACEITO_PELA_FACCAO'
    | 'EM_PREPARACAO_SAIDA_MARCA'
    | 'EM_TRANSITO_PARA_FACCAO'
    | 'EM_PREPARACAO_ENTRADA_FACCAO'
    | 'FILA_DE_PRODUCAO'
    | 'EM_PRODUCAO'
    | 'PRONTO'
    | 'EM_TRANSITO_PARA_MARCA'
    | 'EM_REVISAO'
    | 'PARCIALMENTE_APROVADO'
    | 'REPROVADO'
    | 'AGUARDANDO_RETRABALHO'
    | 'EM_PROCESSO_PAGAMENTO'
    | 'FINALIZADO'
    | 'CANCELADO'
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
    op?: string;
    artigo?: string;
    description?: string;
    observations?: string;
    techSheetUrl?: string;
    quantity: number;
    pricePerUnit: number;
    totalValue: number;
    platformFee?: number;
    netValue?: number;
    deliveryDeadline: string;
    paymentTerms?: string;
    materialsProvided: boolean;
    // Proteção de ficha técnica
    protectTechnicalSheet?: boolean;
    _techSheetProtected?: boolean; // Flag do backend indicando proteção ativa
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
    statusHistory?: StatusHistoryEntry[];
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

export interface MonthlyStatsItem {
    month: string;
    fullMonth?: string;
    revenue: number;
    previousRevenue?: number;
    orders: number;
    growth?: number;
}

export interface MonthlyStats {
    monthly: MonthlyStatsItem[];
    byStatus?: { status: string; name: string; count: number; value: number }[];
}

export interface Attachment {
    id: string;
    type: string;
    name: string;
    url: string;
    mimeType: string;
}

export interface AvailableTransition {
    nextStatus: OrderStatus;
    label: string;
    description: string;
    requiresConfirmation: boolean;
    requiresNotes: boolean;
    requiresReview: boolean;
}

export interface TransitionResponse {
    canAdvance: boolean;
    waitingFor: 'BRAND' | 'SUPPLIER' | null;
    waitingLabel: string;
    transitions: AvailableTransition[];
}

export interface StatusHistoryEntry {
    id: string;
    previousStatus?: OrderStatus;
    newStatus: OrderStatus;
    changedById: string;
    changedBy?: { name: string };
    notes?: string;
    createdAt: string;
}

export interface CreateOrderDto {
    productType: string;
    productCategory?: string;
    productName: string;
    op?: string;
    artigo?: string;
    description?: string;
    quantity: number;
    pricePerUnit: number;
    deliveryDeadline: string;
    paymentTerms?: string;
    materialsProvided?: boolean;
    observations?: string;
    protectTechnicalSheet?: boolean;
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
        const response = await api.post<OrderReview>(`/orders/${orderId}/reviews`, data);
        return response.data;
    },

    async getOrderReviews(orderId: string): Promise<OrderReview[]> {
        const response = await api.get<OrderReview[]>(`/orders/${orderId}/reviews`);
        return response.data;
    },

    async createChildOrder(parentOrderId: string, data: {
        quantity: number;
        description?: string;
        observations?: string;
        deliveryDeadline?: string;
    }): Promise<Order> {
        const response = await api.post<Order>(`/orders/${parentOrderId}/child-orders`, data);
        return response.data;
    },

    async getOrderHierarchy(orderId: string): Promise<OrderHierarchy> {
        const response = await api.get<OrderHierarchy>(`/orders/${orderId}/hierarchy`);
        return response.data;
    },

    async getSecondQualityItems(orderId: string): Promise<SecondQualityItem[]> {
        const response = await api.get<SecondQualityItem[]>(`/orders/${orderId}/second-quality`);
        return response.data;
    },

    async getReviewStats(companyId?: string): Promise<ReviewStats> {
        const params = companyId ? { companyId } : undefined;
        const response = await api.get<ReviewStats>('/orders/stats/reviews', { params });
        return response.data;
    },

    async getAvailableTransitions(orderId: string): Promise<TransitionResponse> {
        const response = await api.get<TransitionResponse>(`/orders/${orderId}/transitions`);
        return response.data;
    },

    async advanceStatus(orderId: string, nextStatus: OrderStatus, notes?: string): Promise<Order> {
        const response = await api.patch<Order>(`/orders/${orderId}/status`, { status: nextStatus, notes });
        return response.data;
    },

    async getMonthlyStatsBrand(months = 6): Promise<MonthlyStats> {
        try {
            const response = await api.get<MonthlyStats>('/orders/stats/monthly/brand', {
                params: { months },
            });
            return response.data;
        } catch {
            return { monthly: [] };
        }
    },

    async getMonthlyStatsSupplier(months = 6): Promise<MonthlyStats> {
        try {
            const response = await api.get<MonthlyStats>('/orders/stats/monthly/supplier', {
                params: { months },
            });
            return response.data;
        } catch {
            return { monthly: [] };
        }
    },

    async getAttachmentDownloadUrl(orderId: string, attachmentId: string): Promise<{ url: string; fileName: string; mimeType: string }> {
        const response = await api.get<{ url: string; fileName: string; mimeType: string }>(`/orders/${orderId}/attachments/${attachmentId}/download-url`);
        return response.data;
    },
};
