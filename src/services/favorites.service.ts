/**
 * Favorites Service
 * Handles product templates, favorite suppliers, and payment presets
 */

import api from './api';

// ==================== TYPES ====================

export interface ProductTemplate {
    id: string;
    companyId: string;
    name: string;
    productType: string;
    productCategory?: string;
    productName: string;
    description?: string;
    materialsProvided: boolean;
    defaultPrice?: number;
    observations?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTemplateData {
    name: string;
    productType: string;
    productCategory?: string;
    productName: string;
    description?: string;
    materialsProvided?: boolean;
    defaultPrice?: number;
    observations?: string;
}

export interface FavoriteSupplier {
    id: string;
    companyId: string;
    supplierId: string;
    notes?: string;
    priority: number;
    createdAt: string;
    supplier: {
        id: string;
        tradeName: string;
        avgRating: number;
        city?: string;
        state?: string;
        supplierProfile?: {
            productTypes: string[];
            dailyCapacity?: number;
        };
    };
}

export interface PaymentTermsPreset {
    id: string;
    companyId: string;
    name: string;
    terms: string;
    isDefault: boolean;
    createdAt: string;
}

// ==================== SERVICE ====================

export const favoritesService = {
    // ==================== PRODUCT TEMPLATES ====================

    async getTemplates(): Promise<ProductTemplate[]> {
        const response = await api.get('/favorites/templates');
        return response.data;
    },

    async getTemplateById(id: string): Promise<ProductTemplate> {
        const response = await api.get(`/favorites/templates/${id}`);
        return response.data;
    },

    async createTemplate(data: CreateTemplateData): Promise<ProductTemplate> {
        const response = await api.post('/favorites/templates', data);
        return response.data;
    },

    async updateTemplate(id: string, data: Partial<CreateTemplateData>): Promise<ProductTemplate> {
        const response = await api.patch(`/favorites/templates/${id}`, data);
        return response.data;
    },

    async deleteTemplate(id: string): Promise<void> {
        await api.delete(`/favorites/templates/${id}`);
    },

    // ==================== FAVORITE SUPPLIERS ====================

    async getFavoriteSuppliers(): Promise<FavoriteSupplier[]> {
        const response = await api.get('/favorites/suppliers');
        return response.data;
    },

    async getFavoriteSupplierIds(): Promise<string[]> {
        const favorites = await this.getFavoriteSuppliers();
        return favorites.map(f => f.supplierId);
    },

    async addFavoriteSupplier(supplierId: string, notes?: string): Promise<FavoriteSupplier> {
        const response = await api.post('/favorites/suppliers', { supplierId, notes });
        return response.data;
    },

    async updateFavoriteSupplier(supplierId: string, data: { notes?: string; priority?: number }): Promise<FavoriteSupplier> {
        const response = await api.patch(`/favorites/suppliers/${supplierId}`, data);
        return response.data;
    },

    async removeFavoriteSupplier(supplierId: string): Promise<void> {
        await api.delete(`/favorites/suppliers/${supplierId}`);
    },

    async isFavoriteSupplier(supplierId: string): Promise<boolean> {
        const response = await api.get(`/favorites/suppliers/${supplierId}/check`);
        return response.data.isFavorite;
    },

    // ==================== PAYMENT TERMS PRESETS ====================

    async getPaymentPresets(): Promise<PaymentTermsPreset[]> {
        const response = await api.get('/favorites/payment-presets');
        return response.data;
    },

    async createPaymentPreset(data: { name: string; terms: string; isDefault?: boolean }): Promise<PaymentTermsPreset> {
        const response = await api.post('/favorites/payment-presets', data);
        return response.data;
    },

    async updatePaymentPreset(id: string, data: { name?: string; terms?: string; isDefault?: boolean }): Promise<PaymentTermsPreset> {
        const response = await api.patch(`/favorites/payment-presets/${id}`, data);
        return response.data;
    },

    async deletePaymentPreset(id: string): Promise<void> {
        await api.delete(`/favorites/payment-presets/${id}`);
    },
};

export default favoritesService;
