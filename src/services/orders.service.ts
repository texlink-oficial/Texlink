import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_ORDERS } from './mockData';

export type OrderStatus =
    | 'LANCADO_PELA_MARCA'
    | 'EM_NEGOCIACAO'
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
    op?: string;
    artigo?: string;
    description?: string;
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

// In-memory storage for mock mode (allows "creating" orders in demo)
let mockOrdersState: Order[] = [...MOCK_ORDERS] as Order[];

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
                revisionNumber: 0,
                origin: 'ORIGINAL',
                productType: data.productType,
                productCategory: data.productCategory,
                productName: data.productName,
                op: data.op,
                artigo: data.artigo,
                description: data.description,
                quantity: data.quantity,
                pricePerUnit: data.pricePerUnit,
                totalValue: data.quantity * data.pricePerUnit,
                deliveryDeadline: data.deliveryDeadline,
                paymentTerms: data.paymentTerms,
                materialsProvided: data.materialsProvided || false,
                protectTechnicalSheet: data.protectTechnicalSheet || false,
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
            // Filter orders assigned to demo supplier (company-supplier-001)
            let orders = mockOrdersState.filter(o =>
                o.supplierId === 'company-supplier-001' || o.supplier?.tradeName === 'Confecções Silva'
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
                assignmentType: (parentOrder?.assignmentType || 'DIRECT') as 'DIRECT' | 'BIDDING' | 'HYBRID',
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

    async getAvailableTransitions(orderId: string): Promise<TransitionResponse> {
        if (MOCK_MODE) {
            await simulateDelay(200);
            const order = mockOrdersState.find(o => o.id === orderId);
            if (!order) return { canAdvance: false, waitingFor: null, waitingLabel: '', transitions: [] };

            // Detect current user role from localStorage
            const storedUser = localStorage.getItem('user');
            const userRole: 'BRAND' | 'SUPPLIER' = storedUser
                ? (JSON.parse(storedUser).role === 'SUPPLIER' ? 'SUPPLIER' : 'BRAND')
                : 'BRAND';

            // Transition map mirroring the backend
            const STATUS_TRANSITIONS: Record<string, {
                nextStatus: OrderStatus;
                allowedRoles: ('BRAND' | 'SUPPLIER')[];
                requiresMaterials?: boolean;
                label: string;
                description: string;
                requiresConfirmation: boolean;
                requiresNotes: boolean;
                requiresReview: boolean;
            }[]> = {
                LANCADO_PELA_MARCA: [
                    { nextStatus: 'ACEITO_PELA_FACCAO', allowedRoles: ['SUPPLIER'], label: 'Aceitar Pedido', description: 'Aceitar este pedido e iniciar o fluxo de produção', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                ],
                ACEITO_PELA_FACCAO: [
                    { nextStatus: 'EM_PREPARACAO_SAIDA_MARCA', allowedRoles: ['BRAND'], requiresMaterials: true, label: 'Preparar Insumos', description: 'Iniciar preparação dos insumos para envio à facção', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                    { nextStatus: 'EM_PRODUCAO', allowedRoles: ['SUPPLIER'], requiresMaterials: false, label: 'Iniciar Produção', description: 'Iniciar produção sem aguardar insumos da marca', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                ],
                EM_PREPARACAO_SAIDA_MARCA: [
                    { nextStatus: 'EM_TRANSITO_PARA_FACCAO', allowedRoles: ['BRAND'], label: 'Despachar Insumos', description: 'Confirmar que os insumos foram despachados para a facção', requiresConfirmation: true, requiresNotes: true, requiresReview: false },
                ],
                EM_TRANSITO_PARA_FACCAO: [
                    { nextStatus: 'EM_PREPARACAO_ENTRADA_FACCAO', allowedRoles: ['SUPPLIER'], label: 'Confirmar Recebimento', description: 'Confirmar que os insumos foram recebidos na facção', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                ],
                EM_PREPARACAO_ENTRADA_FACCAO: [
                    { nextStatus: 'EM_PRODUCAO', allowedRoles: ['SUPPLIER'], label: 'Iniciar Produção', description: 'Iniciar a produção após conferência dos insumos', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                ],
                EM_PRODUCAO: [
                    { nextStatus: 'PRONTO', allowedRoles: ['SUPPLIER'], label: 'Produção Concluída', description: 'Marcar a produção como concluída e pronta para envio', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                ],
                PRONTO: [
                    { nextStatus: 'EM_TRANSITO_PARA_MARCA', allowedRoles: ['BRAND', 'SUPPLIER'], label: 'Marcar Despacho', description: 'Confirmar que o pedido foi despachado para a marca', requiresConfirmation: true, requiresNotes: true, requiresReview: false },
                ],
                EM_TRANSITO_PARA_MARCA: [
                    { nextStatus: 'EM_REVISAO', allowedRoles: ['BRAND'], label: 'Confirmar Recebimento', description: 'Confirmar que o pedido foi recebido e iniciar revisão de qualidade', requiresConfirmation: true, requiresNotes: false, requiresReview: false },
                ],
                EM_REVISAO: [
                    { nextStatus: 'FINALIZADO', allowedRoles: ['BRAND'], label: 'Aprovar Totalmente', description: 'Aprovar 100% do pedido e finalizar', requiresConfirmation: true, requiresNotes: false, requiresReview: true },
                    { nextStatus: 'PARCIALMENTE_APROVADO', allowedRoles: ['BRAND'], label: 'Aprovação Parcial', description: 'Aprovar parcialmente com itens rejeitados ou segunda qualidade', requiresConfirmation: true, requiresNotes: true, requiresReview: true },
                    { nextStatus: 'REPROVADO', allowedRoles: ['BRAND'], label: 'Reprovar', description: 'Reprovar o pedido por problemas de qualidade', requiresConfirmation: true, requiresNotes: true, requiresReview: true },
                ],
            };

            // Waiting for map
            const WAITING_FOR_MAP: Record<string, { waitingFor: 'BRAND' | 'SUPPLIER'; label: string }> = {
                LANCADO_PELA_MARCA: { waitingFor: 'SUPPLIER', label: 'Aguardando a Facção aceitar o pedido' },
                EM_PREPARACAO_SAIDA_MARCA: { waitingFor: 'BRAND', label: 'Marca preparando insumos para envio' },
                EM_TRANSITO_PARA_FACCAO: { waitingFor: 'SUPPLIER', label: 'Aguardando a Facção confirmar recebimento' },
                EM_PREPARACAO_ENTRADA_FACCAO: { waitingFor: 'SUPPLIER', label: 'Facção conferindo insumos recebidos' },
                EM_PRODUCAO: { waitingFor: 'SUPPLIER', label: 'Facção em produção' },
                PRONTO: { waitingFor: 'BRAND', label: 'Pronto para despacho' },
                EM_TRANSITO_PARA_MARCA: { waitingFor: 'BRAND', label: 'Aguardando a Marca confirmar recebimento' },
                EM_REVISAO: { waitingFor: 'BRAND', label: 'Marca revisando qualidade' },
            };

            const allTransitions = STATUS_TRANSITIONS[order.status] || [];
            const available: AvailableTransition[] = allTransitions
                .filter(t => {
                    if (!t.allowedRoles.includes(userRole)) return false;
                    if (t.requiresMaterials === true && !order.materialsProvided) return false;
                    if (t.requiresMaterials === false && order.materialsProvided) return false;
                    return true;
                })
                .map(t => ({
                    nextStatus: t.nextStatus,
                    label: t.label,
                    description: t.description,
                    requiresConfirmation: t.requiresConfirmation,
                    requiresNotes: t.requiresNotes,
                    requiresReview: t.requiresReview,
                }));

            const isMyTurn = available.length > 0;

            // Dynamic waiting for ACEITO_PELA_FACCAO based on materialsProvided
            let waitingFor: 'BRAND' | 'SUPPLIER' | null = null;
            let waitingLabel = '';
            if (!isMyTurn) {
                if (order.status === 'ACEITO_PELA_FACCAO') {
                    if (order.materialsProvided) {
                        waitingFor = 'BRAND';
                        waitingLabel = 'Aguardando a Marca preparar insumos';
                    } else {
                        waitingFor = 'SUPPLIER';
                        waitingLabel = 'Aguardando a Facção iniciar produção';
                    }
                } else {
                    const waitingInfo = WAITING_FOR_MAP[order.status];
                    if (waitingInfo) {
                        waitingFor = waitingInfo.waitingFor;
                        waitingLabel = waitingInfo.label;
                    }
                }
            }

            return { canAdvance: isMyTurn, waitingFor, waitingLabel, transitions: available };
        }

        const response = await api.get<TransitionResponse>(`/orders/${orderId}/transitions`);
        return response.data;
    },

    async advanceStatus(orderId: string, nextStatus: OrderStatus, notes?: string): Promise<Order> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const orderIndex = mockOrdersState.findIndex(o => o.id === orderId);
            if (orderIndex === -1) throw new Error('Pedido não encontrado');
            mockOrdersState[orderIndex] = {
                ...mockOrdersState[orderIndex],
                status: nextStatus,
            };
            return mockOrdersState[orderIndex] as Order;
        }

        const response = await api.patch<Order>(`/orders/${orderId}/status`, { status: nextStatus, notes });
        return response.data;
    },

    async getMonthlyStatsBrand(months = 6): Promise<MonthlyStats> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
            return {
                monthly: monthNames.slice(0, months).map((month, i) => ({
                    month,
                    revenue: 30000 + (i * 8000) + Math.floor(Math.random() * 10000),
                    previousRevenue: 25000 + (i * 6000) + Math.floor(Math.random() * 8000),
                    orders: 10 + i * 3,
                    growth: 5 + Math.floor(Math.random() * 10),
                })),
            };
        }

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
        if (MOCK_MODE) {
            await simulateDelay(300);
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
            return {
                monthly: monthNames.slice(0, months).map((month, i) => ({
                    month,
                    revenue: 20000 + (i * 5000) + Math.floor(Math.random() * 8000),
                    previousRevenue: 15000 + (i * 4000) + Math.floor(Math.random() * 6000),
                    orders: 8 + i * 2,
                    growth: 3 + Math.floor(Math.random() * 12),
                })),
            };
        }

        try {
            const response = await api.get<MonthlyStats>('/orders/stats/monthly/supplier', {
                params: { months },
            });
            return response.data;
        } catch {
            return { monthly: [] };
        }
    },
};
