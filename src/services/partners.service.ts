import api from './api';
import type { Partner, PartnerCategory, PartnerCategoryCount } from '../types';

export interface CreatePartnerDto {
    name: string;
    description: string;
    logoUrl?: string;
    website: string;
    category: PartnerCategory;
    benefits: string[];
    contactEmail?: string;
    contactPhone?: string;
    discountCode?: string;
    discountInfo?: string;
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdatePartnerDto extends Partial<CreatePartnerDto> {}

class PartnersService {
    private readonly basePath = '/partners';

    // ========== PUBLIC ENDPOINTS ==========

    // Get all active partners (for suppliers)
    async getAll(category?: PartnerCategory): Promise<Partner[]> {
        const params = new URLSearchParams();
        if (category) params.append('category', category);

        const response = await api.get<Partner[]>(
            `${this.basePath}?${params.toString()}`
        );
        return response.data;
    }

    // Get categories with counts
    async getCategories(): Promise<PartnerCategoryCount[]> {
        const response = await api.get<PartnerCategoryCount[]>(
            `${this.basePath}/categories`
        );
        return response.data;
    }

    // Get partner by ID
    async getById(id: string): Promise<Partner> {
        const response = await api.get<Partner>(`${this.basePath}/${id}`);
        return response.data;
    }

    // ========== ADMIN ENDPOINTS ==========

    // Get all partners (admin)
    async getAllAdmin(category?: PartnerCategory, isActive?: boolean): Promise<Partner[]> {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (isActive !== undefined) params.append('isActive', String(isActive));

        const response = await api.get<Partner[]>(
            `${this.basePath}/admin/all?${params.toString()}`
        );
        return response.data;
    }

    // Get partner by ID (admin)
    async getByIdAdmin(id: string): Promise<Partner> {
        const response = await api.get<Partner>(`${this.basePath}/admin/${id}`);
        return response.data;
    }

    // Create partner
    async create(dto: CreatePartnerDto): Promise<Partner> {
        const response = await api.post<Partner>(`${this.basePath}/admin`, dto);
        return response.data;
    }

    // Update partner
    async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
        const response = await api.patch<Partner>(
            `${this.basePath}/admin/${id}`,
            dto
        );
        return response.data;
    }

    // Delete partner
    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/admin/${id}`);
    }

    // Toggle active status
    async toggleActive(id: string): Promise<Partner> {
        const response = await api.patch<Partner>(
            `${this.basePath}/admin/${id}/toggle`
        );
        return response.data;
    }

    // Update display order
    async updateOrder(items: { id: string; displayOrder: number }[]): Promise<void> {
        await api.patch(`${this.basePath}/admin/order`, items);
    }
}

export const partnersService = new PartnersService();
