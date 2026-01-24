/**
 * Favorites Service
 * Handles product templates, favorite suppliers, and payment presets
 */

import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

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
            monthlyCapacity?: number;
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

// ==================== MOCK DATA ====================

const MOCK_TEMPLATES: ProductTemplate[] = [
    {
        id: 'template-001',
        companyId: 'company-brand-001',
        name: 'Camiseta Básica Algodão',
        productType: 'Camiseta',
        productCategory: 'Básico',
        productName: 'Camiseta Básica',
        description: 'Camiseta 100% algodão, meia malha, 160g',
        materialsProvided: false,
        defaultPrice: 18.50,
        observations: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'template-002',
        companyId: 'company-brand-001',
        name: 'Calça Jeans Skinny',
        productType: 'Calça Jeans',
        productCategory: 'Feminino',
        productName: 'Calça Skinny',
        description: 'Calça jeans skinny, elastano 2%',
        materialsProvided: true,
        defaultPrice: 55.00,
        observations: 'Lavagem escura padrão',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'template-003',
        companyId: 'company-brand-001',
        name: 'Moletom Canguru',
        productType: 'Moletom',
        productCategory: 'Casual',
        productName: 'Moletom Canguru com Capuz',
        description: 'Moletom canguru com capuz e bolso frontal, 100% algodão felpado',
        materialsProvided: true,
        defaultPrice: 75.00,
        observations: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const MOCK_FAVORITE_SUPPLIERS: FavoriteSupplier[] = [
    {
        id: 'fav-001',
        companyId: 'company-brand-001',
        supplierId: 'supplier-001',
        notes: 'Excelente qualidade em malhas',
        priority: 1,
        createdAt: new Date().toISOString(),
        supplier: {
            id: 'supplier-001',
            tradeName: 'Confecções Silva',
            avgRating: 4.8,
            city: 'São Paulo',
            state: 'SP',
            supplierProfile: {
                productTypes: ['Camisetas', 'Moletons', 'Jaquetas'],
                monthlyCapacity: 5000,
            },
        },
    },
    {
        id: 'fav-002',
        companyId: 'company-brand-001',
        supplierId: 'supplier-002',
        notes: 'Especialista em peças femininas',
        priority: 2,
        createdAt: new Date().toISOString(),
        supplier: {
            id: 'supplier-002',
            tradeName: 'Têxtil Premium',
            avgRating: 4.9,
            city: 'Blumenau',
            state: 'SC',
            supplierProfile: {
                productTypes: ['Vestidos', 'Blusas', 'Saias'],
                monthlyCapacity: 3000,
            },
        },
    },
];

const MOCK_PAYMENT_PRESETS: PaymentTermsPreset[] = [
    {
        id: 'preset-001',
        companyId: 'company-brand-001',
        name: 'À Vista',
        terms: 'Pagamento à vista na entrega',
        isDefault: true,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'preset-002',
        companyId: 'company-brand-001',
        name: 'Parcelado 30/60',
        terms: '50% em 30 dias, 50% em 60 dias',
        isDefault: false,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'preset-003',
        companyId: 'company-brand-001',
        name: 'Parcelado 30/60/90',
        terms: '33% em 30 dias, 33% em 60 dias, 34% em 90 dias',
        isDefault: false,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'preset-004',
        companyId: 'company-brand-001',
        name: 'Entrada + Entrega',
        terms: '50% de entrada na aprovação, 50% na entrega',
        isDefault: false,
        createdAt: new Date().toISOString(),
    },
];

// Local mock storage
let mockTemplates = [...MOCK_TEMPLATES];
let mockFavoriteSuppliers = [...MOCK_FAVORITE_SUPPLIERS];
let mockPaymentPresets = [...MOCK_PAYMENT_PRESETS];

// ==================== SERVICE ====================

export const favoritesService = {
    // ==================== PRODUCT TEMPLATES ====================

    async getTemplates(): Promise<ProductTemplate[]> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return mockTemplates.filter(t => t.isActive);
        }
        const response = await api.get('/favorites/templates');
        return response.data;
    },

    async getTemplateById(id: string): Promise<ProductTemplate> {
        if (MOCK_MODE) {
            await simulateDelay(200);
            const template = mockTemplates.find(t => t.id === id);
            if (!template) throw new Error('Template not found');
            return template;
        }
        const response = await api.get(`/favorites/templates/${id}`);
        return response.data;
    },

    async createTemplate(data: CreateTemplateData): Promise<ProductTemplate> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            const newTemplate: ProductTemplate = {
                id: `template-${Date.now()}`,
                companyId: 'company-brand-001',
                ...data,
                materialsProvided: data.materialsProvided ?? false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            mockTemplates.push(newTemplate);
            return newTemplate;
        }
        const response = await api.post('/favorites/templates', data);
        return response.data;
    },

    async updateTemplate(id: string, data: Partial<CreateTemplateData>): Promise<ProductTemplate> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const index = mockTemplates.findIndex(t => t.id === id);
            if (index === -1) throw new Error('Template not found');
            mockTemplates[index] = {
                ...mockTemplates[index],
                ...data,
                updatedAt: new Date().toISOString(),
            };
            return mockTemplates[index];
        }
        const response = await api.patch(`/favorites/templates/${id}`, data);
        return response.data;
    },

    async deleteTemplate(id: string): Promise<void> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const index = mockTemplates.findIndex(t => t.id === id);
            if (index !== -1) {
                mockTemplates[index].isActive = false;
            }
            return;
        }
        await api.delete(`/favorites/templates/${id}`);
    },

    // ==================== FAVORITE SUPPLIERS ====================

    async getFavoriteSuppliers(): Promise<FavoriteSupplier[]> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return mockFavoriteSuppliers;
        }
        const response = await api.get('/favorites/suppliers');
        return response.data;
    },

    async getFavoriteSupplierIds(): Promise<string[]> {
        const favorites = await this.getFavoriteSuppliers();
        return favorites.map(f => f.supplierId);
    },

    async addFavoriteSupplier(supplierId: string, notes?: string): Promise<FavoriteSupplier> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            // Check if already exists
            if (mockFavoriteSuppliers.some(f => f.supplierId === supplierId)) {
                throw new Error('Supplier is already in favorites');
            }
            const newFavorite: FavoriteSupplier = {
                id: `fav-${Date.now()}`,
                companyId: 'company-brand-001',
                supplierId,
                notes,
                priority: mockFavoriteSuppliers.length,
                createdAt: new Date().toISOString(),
                supplier: {
                    id: supplierId,
                    tradeName: 'New Favorite Supplier',
                    avgRating: 4.5,
                },
            };
            mockFavoriteSuppliers.push(newFavorite);
            return newFavorite;
        }
        const response = await api.post('/favorites/suppliers', { supplierId, notes });
        return response.data;
    },

    async updateFavoriteSupplier(supplierId: string, data: { notes?: string; priority?: number }): Promise<FavoriteSupplier> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            const index = mockFavoriteSuppliers.findIndex(f => f.supplierId === supplierId);
            if (index === -1) throw new Error('Favorite supplier not found');
            mockFavoriteSuppliers[index] = {
                ...mockFavoriteSuppliers[index],
                ...data,
            };
            return mockFavoriteSuppliers[index];
        }
        const response = await api.patch(`/favorites/suppliers/${supplierId}`, data);
        return response.data;
    },

    async removeFavoriteSupplier(supplierId: string): Promise<void> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            mockFavoriteSuppliers = mockFavoriteSuppliers.filter(f => f.supplierId !== supplierId);
            return;
        }
        await api.delete(`/favorites/suppliers/${supplierId}`);
    },

    async isFavoriteSupplier(supplierId: string): Promise<boolean> {
        if (MOCK_MODE) {
            await simulateDelay(100);
            return mockFavoriteSuppliers.some(f => f.supplierId === supplierId);
        }
        const response = await api.get(`/favorites/suppliers/${supplierId}/check`);
        return response.data.isFavorite;
    },

    // ==================== PAYMENT TERMS PRESETS ====================

    async getPaymentPresets(): Promise<PaymentTermsPreset[]> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return mockPaymentPresets;
        }
        const response = await api.get('/favorites/payment-presets');
        return response.data;
    },

    async createPaymentPreset(data: { name: string; terms: string; isDefault?: boolean }): Promise<PaymentTermsPreset> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            if (data.isDefault) {
                mockPaymentPresets = mockPaymentPresets.map(p => ({ ...p, isDefault: false }));
            }
            const newPreset: PaymentTermsPreset = {
                id: `preset-${Date.now()}`,
                companyId: 'company-brand-001',
                ...data,
                isDefault: data.isDefault ?? false,
                createdAt: new Date().toISOString(),
            };
            mockPaymentPresets.push(newPreset);
            return newPreset;
        }
        const response = await api.post('/favorites/payment-presets', data);
        return response.data;
    },

    async updatePaymentPreset(id: string, data: { name?: string; terms?: string; isDefault?: boolean }): Promise<PaymentTermsPreset> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            if (data.isDefault) {
                mockPaymentPresets = mockPaymentPresets.map(p => ({
                    ...p,
                    isDefault: p.id === id ? true : false,
                }));
            }
            const index = mockPaymentPresets.findIndex(p => p.id === id);
            if (index === -1) throw new Error('Payment preset not found');
            mockPaymentPresets[index] = {
                ...mockPaymentPresets[index],
                ...data,
            };
            return mockPaymentPresets[index];
        }
        const response = await api.patch(`/favorites/payment-presets/${id}`, data);
        return response.data;
    },

    async deletePaymentPreset(id: string): Promise<void> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            mockPaymentPresets = mockPaymentPresets.filter(p => p.id !== id);
            return;
        }
        await api.delete(`/favorites/payment-presets/${id}`);
    },
};

export default favoritesService;
