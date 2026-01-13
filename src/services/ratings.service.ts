import api from './api';

export interface Rating {
    id: string;
    orderId: string;
    fromCompanyId: string;
    toCompanyId: string;
    score: number;
    comment?: string;
    createdAt: string;
    fromCompany?: {
        id: string;
        tradeName: string;
    };
    toCompany?: {
        id: string;
        tradeName: string;
    };
}

export interface PendingRating {
    orderId: string;
    orderDisplayId: string;
    partnerCompanyId: string;
    partnerName: string;
    partnerImage?: string;
    completedAt: string;
}

export interface CreateRatingDto {
    orderId: string;
    score: number;
    comment?: string;
}

export const ratingsService = {
    async submitRating(orderId: string, data: { score: number; comment?: string }): Promise<Rating> {
        const response = await api.post<Rating>(`/ratings/orders/${orderId}`, data);
        return response.data;
    },

    async getPendingRatings(): Promise<PendingRating[]> {
        const response = await api.get<PendingRating[]>('/ratings/pending');
        return response.data;
    },

    async getCompanyRatings(companyId: string): Promise<Rating[]> {
        const response = await api.get<Rating[]>(`/ratings/company/${companyId}`);
        return response.data;
    },

    async getMyRatings(): Promise<Rating[]> {
        const response = await api.get<Rating[]>('/ratings/received');
        return response.data;
    },
};
