import api from './api';
import type { SupplierDocument } from '../types';

export interface SupplierDashboard {
    company: {
        id: string;
        tradeName: string;
        avgRating: number;
        status: string;
    };
    profile: {
        onboardingPhase: number;
        onboardingComplete: boolean;
        monthlyCapacity: number;
        currentOccupancy: number;
    };
    stats: {
        pendingOrders: number;
        activeOrders: number;
        completedOrdersThisMonth: number;
        totalRevenue: number;
        capacityUsage: number;
    };
}

export interface SupplierSearchFilters {
    city?: string;
    state?: string;
    productTypes?: string[];
    specialties?: string[];
    minCapacity?: number;
    maxCapacity?: number;
    minRating?: number;
}

export interface Supplier {
    id: string;
    tradeName: string;
    legalName?: string;
    cnpj?: string;
    city: string;
    state: string;
    email?: string;
    phone?: string;
    avgRating: number;
    completedOrders: number;
    onTimeDeliveryRate: number;
    productTypes: string[];
    specialties: string[];
    monthlyCapacity: number;
    currentOccupancy: number;
    status: string;
    minOrderQuantity?: number;
    avgLeadTime?: number;
    profile?: {
        description?: string;
        equipment?: string[];
        certifications?: string[];
        photos?: string[];
    };
}

// ==================== INVITATION TYPES ====================

export interface CNPJValidationResult {
    isValid: boolean;
    data?: {
        cnpj: string;
        razaoSocial: string;
        nomeFantasia?: string;
        situacao: string;
        dataSituacao?: string;
        dataAbertura?: string;
        naturezaJuridica?: string;
        capitalSocial?: number;
        porte?: string;
        endereco: {
            logradouro: string;
            numero: string;
            complemento?: string;
            bairro: string;
            municipio: string;
            uf: string;
            cep: string;
        };
        atividadePrincipal?: {
            codigo: string;
            descricao: string;
        };
        telefone?: string;
        email?: string;
    };
    error?: string;
    source: string;
    timestamp: Date;
}

export type InvitationChannel = 'EMAIL' | 'WHATSAPP' | 'BOTH';

export interface InviteSupplierDto {
    cnpj: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp?: string;
    customMessage?: string;
    sendVia: InvitationChannel;
    internalCode?: string;
    notes?: string;
}

export interface InviteSupplierResponse {
    id: string;
    cnpj: string;
    legalName?: string;
    status: string;
    message: string;
    expiresAt: Date;
}

export interface SupplierInvitation {
    id: string;
    cnpj: string;
    legalName?: string;
    tradeName?: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp?: string;
    status: string;
    internalCode?: string;
    createdAt: Date;
    expiresAt?: Date;
    lastInvitationSentAt?: Date;
    canResend: boolean;
}

export interface ResendInvitationDto {
    sendVia?: InvitationChannel;
    customMessage?: string;
}

// ==================== SERVICE ====================

export const suppliersService = {
    async getMyProfile() {
        const response = await api.get('/suppliers/profile');
        return response.data;
    },

    async getDashboard(): Promise<SupplierDashboard> {
        const response = await api.get<SupplierDashboard>('/suppliers/dashboard');
        return response.data;
    },

    async getOpportunities(filters?: {
        search?: string;
        category?: string;
        minValue?: number;
        maxValue?: number;
        deadlineFrom?: string;
        deadlineTo?: string;
        sort?: string;
    }) {
        const params: Record<string, string> = {};
        if (filters?.search) params.search = filters.search;
        if (filters?.category) params.category = filters.category;
        if (filters?.minValue !== undefined) params.minValue = String(filters.minValue);
        if (filters?.maxValue !== undefined) params.maxValue = String(filters.maxValue);
        if (filters?.deadlineFrom) params.deadlineFrom = filters.deadlineFrom;
        if (filters?.deadlineTo) params.deadlineTo = filters.deadlineTo;
        if (filters?.sort) params.sort = filters.sort;

        const response = await api.get('/suppliers/opportunities', { params });
        return response.data;
    },

    async expressInterest(orderId: string, message?: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post(`/suppliers/opportunities/${orderId}/interest`, { message });
        return response.data;
    },

    async search(filters: SupplierSearchFilters): Promise<Supplier[]> {
        const response = await api.get('/suppliers', { params: filters });
        return response.data;
    },

    async getById(id: string): Promise<Supplier> {
        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    },

    // Get supplier documents for a brand (requires active relationship)
    async getSupplierDocuments(supplierId: string): Promise<SupplierDocument[]> {
        const response = await api.get<SupplierDocument[]>(
            `/supplier-documents/brand/suppliers/${supplierId}`
        );
        return response.data;
    },

    // ==================== INVITATION METHODS ====================

    /**
     * Validate CNPJ via Brasil API
     */
    async validateCnpj(cnpj: string): Promise<CNPJValidationResult> {
        const response = await api.get<CNPJValidationResult>(`/suppliers/validate-cnpj/${cnpj}`);
        return response.data;
    },

    /**
     * Invite a new supplier
     */
    async inviteSupplier(data: InviteSupplierDto): Promise<InviteSupplierResponse> {
        const response = await api.post<InviteSupplierResponse>('/suppliers/invite', data);
        return response.data;
    },

    /**
     * Get all invitations for current brand
     */
    async getInvitations(): Promise<SupplierInvitation[]> {
        const response = await api.get<SupplierInvitation[]>('/suppliers/invitations');
        return response.data;
    },

    /**
     * Resend an invitation
     */
    async resendInvitation(invitationId: string, options?: ResendInvitationDto): Promise<{ success: boolean; message: string }> {
        const response = await api.post(`/suppliers/invitations/${invitationId}/resend`, options || {});
        return response.data;
    },
};
