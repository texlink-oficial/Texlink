import api from './api';
import type {
    SupplierDocument,
    SupplierDocumentType,
    SupplierDocumentStatus,
} from '../types';

export interface AdminDocumentStats {
    total: number;
    valid: number;
    expiringSoon: number;
    expired: number;
    pending: number;
    suppliersCount: number;
}

export interface AdminDocument extends SupplierDocument {
    company: {
        id: string;
        tradeName: string;
        document: string; // CNPJ
    };
}

class AdminDocumentsService {
    private readonly basePath = '/admin';

    // Get all documents with optional filters
    async getAllDocuments(
        supplierId?: string,
        type?: SupplierDocumentType,
        status?: SupplierDocumentStatus
    ): Promise<AdminDocument[]> {
        const params = new URLSearchParams();
        if (supplierId) params.append('supplierId', supplierId);
        if (type) params.append('type', type);
        if (status) params.append('status', status);

        const response = await api.get<AdminDocument[]>(
            `${this.basePath}/documents?${params.toString()}`
        );
        return response.data;
    }

    // Get document stats across all suppliers
    async getStats(): Promise<AdminDocumentStats> {
        const response = await api.get<AdminDocumentStats>(
            `${this.basePath}/documents/stats`
        );
        return response.data;
    }

    // Get documents for a specific supplier
    async getSupplierDocuments(supplierId: string): Promise<SupplierDocument[]> {
        const response = await api.get<SupplierDocument[]>(
            `${this.basePath}/suppliers/${supplierId}/documents`
        );
        return response.data;
    }
}

export const adminDocumentsService = new AdminDocumentsService();
