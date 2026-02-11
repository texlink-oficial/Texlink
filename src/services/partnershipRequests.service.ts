import api from './api';

export type PartnershipRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PartnershipRequest {
  id: string;
  brandId: string;
  supplierId: string;
  requestedById: string;
  status: PartnershipRequestStatus;
  message?: string;
  respondedById?: string;
  respondedAt?: string;
  rejectionReason?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  relationshipId?: string;
  brand?: {
    id: string;
    tradeName?: string;
    legalName: string;
    city: string;
    state: string;
    logoUrl?: string;
  };
  supplier?: {
    id: string;
    tradeName?: string;
    legalName: string;
    city: string;
    state: string;
    avgRating?: number;
    logoUrl?: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email?: string;
  };
  respondedBy?: {
    id: string;
    name: string;
  };
}

export interface PartnershipRequestFilters {
  status?: PartnershipRequestStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CheckExistingResponse {
  hasActiveRelationship: boolean;
  hasPendingRequest: boolean;
  pendingRequestId: string | null;
  relationshipStatus: string | null;
}

export const partnershipRequestsService = {
  /**
   * Create a new partnership request (Brand)
   */
  async create(data: { supplierId: string; message?: string }): Promise<PartnershipRequest> {
    const response = await api.post<PartnershipRequest>('/partnership-requests', data);
    return response.data;
  },

  /**
   * Get requests sent by brand
   */
  async getSent(filters?: PartnershipRequestFilters): Promise<PaginatedResponse<PartnershipRequest>> {
    const response = await api.get<PaginatedResponse<PartnershipRequest>>('/partnership-requests/sent', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get requests received by supplier
   */
  async getReceived(filters?: PartnershipRequestFilters): Promise<PaginatedResponse<PartnershipRequest>> {
    const response = await api.get<PaginatedResponse<PartnershipRequest>>('/partnership-requests/received', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get pending count for supplier (for badge)
   */
  async getPendingCount(): Promise<number> {
    const response = await api.get<number>('/partnership-requests/pending-count');
    return response.data;
  },

  /**
   * Check existing request/relationship with supplier
   */
  async checkExisting(supplierId: string): Promise<CheckExistingResponse> {
    const response = await api.get<CheckExistingResponse>(`/partnership-requests/check/${supplierId}`);
    return response.data;
  },

  /**
   * Get request by ID
   */
  async getById(id: string): Promise<PartnershipRequest> {
    const response = await api.get<PartnershipRequest>(`/partnership-requests/${id}`);
    return response.data;
  },

  /**
   * Respond to a request (Supplier)
   * @param id - Request ID
   * @param data - Response data including consent for document sharing
   */
  async respond(
    id: string,
    data: { accepted: boolean; rejectionReason?: string; documentSharingConsent?: boolean }
  ): Promise<PartnershipRequest> {
    const response = await api.post<PartnershipRequest>(`/partnership-requests/${id}/respond`, data);
    return response.data;
  },

  /**
   * Cancel a pending request (Brand)
   */
  async cancel(id: string): Promise<PartnershipRequest> {
    const response = await api.post<PartnershipRequest>(`/partnership-requests/${id}/cancel`);
    return response.data;
  },
};

export default partnershipRequestsService;
