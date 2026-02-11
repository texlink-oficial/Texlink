import api from './api';

export type BrandDocumentType =
  | 'CODE_OF_CONDUCT'
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'OTHER';

export type BrandDocumentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface BrandDocument {
  id: string;
  brandId: string;
  type: BrandDocumentType;
  status: BrandDocumentStatus;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  version: string;
  versionNumber: number;
  isRequired: boolean;
  requiresReacceptance: boolean;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  brand?: {
    id: string;
    tradeName?: string;
    legalName: string;
  };
  uploadedBy?: {
    id: string;
    name: string;
  };
  versions?: BrandDocumentVersion[];
  _count?: {
    acceptances: number;
  };
}

export interface BrandDocumentVersion {
  id: string;
  documentId: string;
  version: string;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  notes?: string;
}

export interface BrandDocumentAcceptance {
  id: string;
  documentId: string;
  relationshipId: string;
  acceptedAt: string;
  acceptedVersion: string;
  acceptedVersionNumber: number;
  acceptedById: string;
  acceptedByName: string;
  acceptedByRole?: string;
  clientIp: string;
  userAgent?: string;
  checkboxConfirmed: boolean;
}

export interface DocumentWithAcceptance extends BrandDocument {
  isAccepted: boolean;
  acceptance: BrandDocumentAcceptance | null;
  relationshipId: string;
}

export interface AcceptanceReport {
  document: BrandDocument;
  totalSuppliers: number;
  acceptedCount: number;
  pendingCount: number;
  acceptances: {
    id: string;
    acceptedAt: string;
    acceptedVersion: string;
    acceptedByName: string;
    acceptedByRole?: string;
    supplier: {
      id: string;
      name: string;
    };
  }[];
  pendingSuppliers: {
    id: string;
    name: string;
    relationshipId: string;
  }[];
}

export interface BrandDocumentFilters {
  type?: BrandDocumentType;
  status?: BrandDocumentStatus;
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

export interface UploadDocumentData {
  type: BrandDocumentType;
  title: string;
  description?: string;
  isRequired?: boolean;
  requiresReacceptance?: boolean;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  isRequired?: boolean;
  requiresReacceptance?: boolean;
  versionNotes?: string;
}

export interface AcceptDocumentData {
  documentId: string;
  relationshipId: string;
  checkboxConfirmed: boolean;
  acceptedByName: string;
  acceptedByRole?: string;
}

export interface SendRemindersResponse {
  remindersSent: number;
  suppliers: {
    id: string;
    name: string;
  }[];
}

export const brandDocumentsService = {
  /**
   * Upload a new brand document
   */
  async uploadDocument(file: File, data: UploadDocumentData): Promise<BrandDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.isRequired !== undefined) formData.append('isRequired', String(data.isRequired));
    if (data.requiresReacceptance !== undefined) formData.append('requiresReacceptance', String(data.requiresReacceptance));

    const response = await api.post<BrandDocument>('/brand-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Update a document (optionally with new file)
   */
  async updateDocument(id: string, file?: File, data?: UpdateDocumentData): Promise<BrandDocument> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (data?.title) formData.append('title', data.title);
    if (data?.description) formData.append('description', data.description);
    if (data?.isRequired !== undefined) formData.append('isRequired', String(data.isRequired));
    if (data?.requiresReacceptance !== undefined) formData.append('requiresReacceptance', String(data.requiresReacceptance));
    if (data?.versionNotes) formData.append('versionNotes', data.versionNotes);

    const response = await api.patch<BrandDocument>(`/brand-documents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Archive a document
   */
  async archiveDocument(id: string): Promise<void> {
    await api.delete(`/brand-documents/${id}`);
  },

  /**
   * Get documents for brand
   */
  async getDocuments(filters?: BrandDocumentFilters): Promise<PaginatedResponse<BrandDocument>> {
    const response = await api.get<PaginatedResponse<BrandDocument>>('/brand-documents', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<BrandDocument> {
    const response = await api.get<BrandDocument>(`/brand-documents/${id}`);
    return response.data;
  },

  /**
   * Get acceptance report for a document
   */
  async getAcceptanceReport(id: string): Promise<AcceptanceReport> {
    const response = await api.get<AcceptanceReport>(`/brand-documents/${id}/acceptances`);
    return response.data;
  },

  // ========== Supplier Methods ==========

  /**
   * Get documents for a brand (supplier perspective)
   */
  async getDocumentsForBrand(brandId: string): Promise<DocumentWithAcceptance[]> {
    const response = await api.get<DocumentWithAcceptance[]>(`/brand-documents/by-brand/${brandId}`);
    return response.data;
  },

  /**
   * Get pending documents for a relationship
   */
  async getPendingDocuments(relationshipId: string): Promise<BrandDocument[]> {
    const response = await api.get<BrandDocument[]>(`/brand-documents/pending/${relationshipId}`);
    return response.data;
  },

  /**
   * Get pending documents count for supplier (for badge)
   */
  async getPendingCount(): Promise<number> {
    const response = await api.get<number>('/brand-documents/pending-count');
    return response.data;
  },

  /**
   * Accept a document
   */
  async acceptDocument(data: AcceptDocumentData): Promise<BrandDocumentAcceptance> {
    const response = await api.post<BrandDocumentAcceptance>('/brand-documents/accept', data);
    return response.data;
  },

  /**
   * Download document (returns blob)
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    const doc = await this.getDocument(documentId);
    const response = await api.get(doc.fileUrl, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Send reminders to pending suppliers
   */
  async sendReminders(documentId: string): Promise<SendRemindersResponse> {
    const response = await api.post<SendRemindersResponse>(`/brand-documents/${documentId}/send-reminders`);
    return response.data;
  },

  // ========== Utility Methods ==========

  /**
   * Get document type label
   */
  getTypeLabel(type: BrandDocumentType): string {
    const labels: Record<BrandDocumentType, string> = {
      CODE_OF_CONDUCT: 'Código de Conduta',
      TERMS_OF_SERVICE: 'Termos de Serviço',
      PRIVACY_POLICY: 'Política de Privacidade',
      OTHER: 'Outro',
    };
    return labels[type] || type;
  },

  /**
   * Get status label
   */
  getStatusLabel(status: BrandDocumentStatus): string {
    const labels: Record<BrandDocumentStatus, string> = {
      DRAFT: 'Rascunho',
      ACTIVE: 'Ativo',
      ARCHIVED: 'Arquivado',
    };
    return labels[status] || status;
  },

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default brandDocumentsService;
