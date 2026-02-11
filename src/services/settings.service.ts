import api from './api';
import {
    CompanyData,
    BankAccount,
    NotificationSettings,
    CapacitySettings,
    Suggestion,
} from '../types';

// =============================================================================
// SERVICE
// =============================================================================

export const settingsService = {
    // ==================== COMPANY DATA ====================

    async getCompanyData(): Promise<CompanyData> {
        const response = await api.get<CompanyData>('/settings/company');
        return response.data;
    },

    async updateCompanyData(data: Partial<CompanyData>): Promise<CompanyData> {
        const response = await api.patch<CompanyData>('/settings/company', data);
        return response.data;
    },

    async uploadLogo(file: File): Promise<{ logoUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ logoUrl: string }>('/settings/company/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // ==================== BANK ACCOUNT ====================

    async getBankAccount(): Promise<BankAccount | null> {
        const response = await api.get<BankAccount | null>('/settings/bank-account');
        return response.data;
    },

    async updateBankAccount(data: Omit<BankAccount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
        const response = await api.put<BankAccount>('/settings/bank-account', data);
        return response.data;
    },

    // ==================== CAPACITY ====================

    async getCapacitySettings(): Promise<CapacitySettings> {
        const response = await api.get<CapacitySettings>('/settings/capacity');
        return response.data;
    },

    async updateCapacitySettings(data: Partial<CapacitySettings>): Promise<CapacitySettings> {
        const response = await api.patch<CapacitySettings>('/settings/capacity', data);
        return response.data;
    },

    // ==================== NOTIFICATIONS ====================

    async getNotificationSettings(): Promise<NotificationSettings> {
        const response = await api.get<NotificationSettings>('/settings/notifications');
        return response.data;
    },

    async updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
        const response = await api.patch<NotificationSettings>('/settings/notifications', data);
        return response.data;
    },

    // ==================== SECURITY ====================

    async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post<{ success: boolean; message: string }>('/settings/security/change-password', {
            currentPassword,
            newPassword,
            confirmPassword,
        });
        return response.data;
    },

    // ==================== ORDER DEFAULTS ====================

    async getOrderDefaults(): Promise<{ defaultProtectTechnicalSheet: boolean }> {
        const response = await api.get<{ defaultProtectTechnicalSheet: boolean }>('/credential-settings/order-defaults');
        return response.data;
    },

    async updateOrderDefaults(data: { defaultProtectTechnicalSheet?: boolean }): Promise<void> {
        await api.patch('/credential-settings/order-defaults', data);
    },

    // ==================== SUGGESTIONS ====================

    async getSuggestions(): Promise<Suggestion[]> {
        const response = await api.get<Suggestion[]>('/settings/suggestions');
        return response.data;
    },

    async createSuggestion(data: { category: string; title: string; description: string }): Promise<Suggestion> {
        const response = await api.post<Suggestion>('/settings/suggestions', data);
        return response.data;
    },
};
