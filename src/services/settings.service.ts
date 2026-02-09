import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import {
    CompanyData,
    BankAccount,
    NotificationSettings,
    CapacitySettings,
    Suggestion,
} from '../types';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_COMPANY_DATA: CompanyData = {
    id: 'company-supplier-001',
    legalName: 'Confecções Estrela Ltda',
    tradeName: 'Confecções Estrela',
    document: '12345678000190',
    phone: '(11) 99999-8888',
    email: 'contato@confeccoesestrela.com.br',
    city: 'São Paulo',
    state: 'SP',
    logoUrl: undefined,
    street: 'Rua das Costureiras',
    number: '123',
    complement: 'Galpão 5',
    neighborhood: 'Bom Retiro',
    zipCode: '01120000',
};

const MOCK_BANK_ACCOUNT: BankAccount = {
    id: 'bank-001',
    companyId: 'company-supplier-001',
    bankCode: '341',
    bankName: 'Itaú Unibanco',
    agency: '1234',
    accountNumber: '12345-6',
    accountType: 'CORRENTE',
    accountHolder: 'Confecções Estrela Ltda',
    holderDocument: '12345678000190',
    pixKeyType: 'CNPJ',
    pixKey: '12345678000190',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
};

const MOCK_NOTIFICATION_SETTINGS: NotificationSettings = {
    id: 'notif-001',
    companyId: 'company-supplier-001',
    emailEnabled: true,
    whatsappEnabled: true,
    newOrdersEmail: true,
    newOrdersWhatsapp: true,
    messagesEmail: true,
    messagesWhatsapp: false,
    paymentsEmail: true,
    paymentsWhatsapp: true,
    deadlineReminders: true,
    systemUpdates: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
};

const MOCK_CAPACITY_SETTINGS: CapacitySettings = {
    monthlyCapacity: 5000,
    currentOccupancy: 75,
    activeWorkers: 12,
    hoursPerDay: 8.5,
    productTypes: ['Infantil', 'Adulto', 'Fitness'],
    specialties: ['Malha', 'Jeans', 'Moletom'],
};

const MOCK_SUGGESTIONS: Suggestion[] = [
    {
        id: 'sug-001',
        category: 'FUNCIONALIDADE',
        title: 'Notificações push no celular',
        description: 'Seria muito útil receber notificações push de novos pedidos diretamente no celular, mesmo quando o app não está aberto.',
        status: 'EM_ANALISE',
        createdAt: '2024-12-10T14:30:00Z',
        updatedAt: '2024-12-15T09:00:00Z',
    },
    {
        id: 'sug-002',
        category: 'USABILIDADE',
        title: 'Filtro por data no histórico de pedidos',
        description: 'Gostaria de poder filtrar os pedidos por período específico (ex: últimos 30 dias, mês anterior, etc) para facilitar a busca.',
        status: 'IMPLEMENTADO',
        adminNotes: 'Implementado na versão 2.5.0',
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2024-11-20T16:00:00Z',
    },
];

// =============================================================================
// SERVICE
// =============================================================================

export const settingsService = {
    // ==================== COMPANY DATA ====================

    async getCompanyData(): Promise<CompanyData> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return MOCK_COMPANY_DATA;
        }
        const response = await api.get<CompanyData>('/settings/company');
        return response.data;
    },

    async updateCompanyData(data: Partial<CompanyData>): Promise<CompanyData> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { ...MOCK_COMPANY_DATA, ...data };
        }
        const response = await api.patch<CompanyData>('/settings/company', data);
        return response.data;
    },

    async uploadLogo(file: File): Promise<{ logoUrl: string }> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            return { logoUrl: URL.createObjectURL(file) };
        }
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ logoUrl: string }>('/settings/company/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // ==================== BANK ACCOUNT ====================

    async getBankAccount(): Promise<BankAccount | null> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_BANK_ACCOUNT;
        }
        const response = await api.get<BankAccount | null>('/settings/bank-account');
        return response.data;
    },

    async updateBankAccount(data: Omit<BankAccount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { ...MOCK_BANK_ACCOUNT, ...data };
        }
        const response = await api.put<BankAccount>('/settings/bank-account', data);
        return response.data;
    },

    // ==================== CAPACITY ====================

    async getCapacitySettings(): Promise<CapacitySettings> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_CAPACITY_SETTINGS;
        }
        const response = await api.get<CapacitySettings>('/settings/capacity');
        return response.data;
    },

    async updateCapacitySettings(data: Partial<CapacitySettings>): Promise<CapacitySettings> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { ...MOCK_CAPACITY_SETTINGS, ...data };
        }
        const response = await api.patch<CapacitySettings>('/settings/capacity', data);
        return response.data;
    },

    // ==================== NOTIFICATIONS ====================

    async getNotificationSettings(): Promise<NotificationSettings> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_NOTIFICATION_SETTINGS;
        }
        const response = await api.get<NotificationSettings>('/settings/notifications');
        return response.data;
    },

    async updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return { ...MOCK_NOTIFICATION_SETTINGS, ...data };
        }
        const response = await api.patch<NotificationSettings>('/settings/notifications', data);
        return response.data;
    },

    // ==================== SECURITY ====================

    async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            if (currentPassword !== 'demo123') {
                throw new Error('Senha atual incorreta');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('As senhas não coincidem');
            }
            return { success: true, message: 'Senha alterada com sucesso' };
        }
        const response = await api.post<{ success: boolean; message: string }>('/settings/security/change-password', {
            currentPassword,
            newPassword,
            confirmPassword,
        });
        return response.data;
    },

    // ==================== ORDER DEFAULTS ====================

    async getOrderDefaults(): Promise<{ defaultProtectTechnicalSheet: boolean }> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return { defaultProtectTechnicalSheet: false };
        }
        const response = await api.get<{ defaultProtectTechnicalSheet: boolean }>('/credential-settings/order-defaults');
        return response.data;
    },

    async updateOrderDefaults(data: { defaultProtectTechnicalSheet?: boolean }): Promise<void> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return;
        }
        await api.patch('/credential-settings/order-defaults', data);
    },

    // ==================== SUGGESTIONS ====================

    async getSuggestions(): Promise<Suggestion[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_SUGGESTIONS;
        }
        const response = await api.get<Suggestion[]>('/settings/suggestions');
        return response.data;
    },

    async createSuggestion(data: { category: string; title: string; description: string }): Promise<Suggestion> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const newSuggestion: Suggestion = {
                id: `sug-${Date.now()}`,
                category: data.category as Suggestion['category'],
                title: data.title,
                description: data.description,
                status: 'ENVIADO',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            MOCK_SUGGESTIONS.unshift(newSuggestion);
            return newSuggestion;
        }
        const response = await api.post<Suggestion>('/settings/suggestions', data);
        return response.data;
    },
};
