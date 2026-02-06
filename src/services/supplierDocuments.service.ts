import api from './api';
import type {
    SupplierDocument,
    SupplierDocumentSummary,
    SupplierDocumentChecklistItem,
    SupplierDocumentType,
    SupplierDocumentStatus,
} from '../types';

export interface CreateSupplierDocumentDto {
    type: SupplierDocumentType;
    competenceMonth?: number;
    competenceYear?: number;
    expiresAt?: string;
    notes?: string;
}

export interface UpdateSupplierDocumentDto {
    competenceMonth?: number;
    competenceYear?: number;
    expiresAt?: string;
    notes?: string;
}

class SupplierDocumentsService {
    private readonly basePath = '/supplier-documents';

    // Get all documents (with optional filters)
    async getAll(
        type?: SupplierDocumentType,
        status?: SupplierDocumentStatus
    ): Promise<SupplierDocument[]> {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (status) params.append('status', status);

        const response = await api.get<SupplierDocument[]>(
            `${this.basePath}?${params.toString()}`
        );
        return response.data;
    }

    // Get document summary (counts by status)
    async getSummary(): Promise<SupplierDocumentSummary> {
        const response = await api.get<SupplierDocumentSummary>(
            `${this.basePath}/summary`
        );
        return response.data;
    }

    // Get document checklist (all types with status)
    async getChecklist(): Promise<SupplierDocumentChecklistItem[]> {
        const response = await api.get<SupplierDocumentChecklistItem[]>(
            `${this.basePath}/checklist`
        );
        return response.data;
    }

    // Get single document by ID
    async getById(id: string): Promise<SupplierDocument> {
        const response = await api.get<SupplierDocument>(
            `${this.basePath}/${id}`
        );
        return response.data;
    }

    // Create document placeholder (without file)
    async create(dto: CreateSupplierDocumentDto): Promise<SupplierDocument> {
        const response = await api.post<SupplierDocument>(this.basePath, dto);
        return response.data;
    }

    // Create document with file upload
    async createWithFile(
        dto: CreateSupplierDocumentDto,
        file: File
    ): Promise<SupplierDocument> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', dto.type);
        if (dto.competenceMonth) formData.append('competenceMonth', String(dto.competenceMonth));
        if (dto.competenceYear) formData.append('competenceYear', String(dto.competenceYear));
        if (dto.expiresAt) formData.append('expiresAt', dto.expiresAt);
        if (dto.notes) formData.append('notes', dto.notes);

        const response = await api.post<SupplierDocument>(
            `${this.basePath}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    }

    // Upload/replace file for existing document
    async uploadFile(id: string, file: File): Promise<SupplierDocument> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.patch<SupplierDocument>(
            `${this.basePath}/${id}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    }

    // Update document metadata
    async update(id: string, dto: UpdateSupplierDocumentDto): Promise<SupplierDocument> {
        const response = await api.patch<SupplierDocument>(
            `${this.basePath}/${id}`,
            dto
        );
        return response.data;
    }

    // Delete document
    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }

    // Get download URL for a document (supplier's own access - presigned URL)
    async getDownloadUrl(documentId: string): Promise<DocumentDownloadResponse> {
        const response = await api.get<DocumentDownloadResponse>(
            `${this.basePath}/${documentId}/download`
        );
        return response.data;
    }

    // ========== BRAND ACCESS METHODS ==========

    /**
     * Get supplier documents for a brand (requires active relationship with consent)
     */
    async getForBrand(
        supplierId: string,
        type?: SupplierDocumentType,
        status?: SupplierDocumentStatus
    ): Promise<SupplierDocument[]> {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (status) params.append('status', status);

        const response = await api.get<SupplierDocument[]>(
            `${this.basePath}/brand/suppliers/${supplierId}?${params.toString()}`
        );
        return response.data;
    }

    /**
     * Get supplier document summary for a brand (with consent status)
     */
    async getSummaryForBrand(supplierId: string): Promise<SupplierDocumentSummaryForBrand> {
        const response = await api.get<SupplierDocumentSummaryForBrand>(
            `${this.basePath}/brand/suppliers/${supplierId}/summary`
        );
        return response.data;
    }

    /**
     * Get download URL for a supplier document (brand access)
     */
    async getDownloadUrlForBrand(
        supplierId: string,
        documentId: string
    ): Promise<DocumentDownloadResponse> {
        const response = await api.get<DocumentDownloadResponse>(
            `${this.basePath}/brand/suppliers/${supplierId}/documents/${documentId}/download`
        );
        return response.data;
    }
}

// Types for brand access
export interface SupplierDocumentSummaryForBrand {
    hasConsent: boolean;
    consentedAt: string | null;
    total: number;
    valid: number;
    expiringSoon: number;
    expired: number;
    pending: number;
    compliancePercentage: number;
    message?: string;
}

export interface DocumentDownloadResponse {
    url: string;
    fileName: string;
    mimeType: string;
    expiresIn: number;
}

export const supplierDocumentsService = new SupplierDocumentsService();
