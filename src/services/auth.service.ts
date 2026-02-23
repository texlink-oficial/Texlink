import api from './api';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'BRAND' | 'SUPPLIER';
    legalName?: string;
    tradeName?: string;
    document?: string;
    phone?: string;
    city?: string;
    state?: string;
    invitationToken?: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    accessToken: string;
    refreshToken?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    isSuperAdmin?: boolean;
    createdAt?: string;
    companyId?: string;
    companyName?: string;
    companyType?: string;
    brandId?: string;
    supplierId?: string;
    companyUsers?: {
        role: string;
        company: {
            id: string;
            tradeName: string;
            legalName?: string | null;
            type: string;
            status: string;
            logoUrl?: string | null;
        };
    }[];
}

// SEC-F001: In-memory token storage — tokens never touch localStorage/sessionStorage
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const authService = {
    async login(data: LoginDto): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/login', data);
        const { accessToken, refreshToken } = response.data;
        _accessToken = accessToken;
        _refreshToken = refreshToken ?? null;
        return response.data;
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        // Clear any existing in-memory tokens before registering a new account
        _accessToken = null;
        _refreshToken = null;

        const response = await api.post<AuthResponse>('/auth/register', data);
        const { accessToken, refreshToken } = response.data;
        _accessToken = accessToken;
        _refreshToken = refreshToken ?? null;
        return response.data;
    },

    async getProfile(): Promise<User> {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    async refreshTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
        if (!_refreshToken) return null;
        try {
            const response = await api.post<{ accessToken: string; refreshToken: string }>(
                '/auth/refresh',
                { refreshToken: _refreshToken },
            );
            _accessToken = response.data.accessToken;
            _refreshToken = response.data.refreshToken;
            return response.data;
        } catch {
            _accessToken = null;
            _refreshToken = null;
            return null;
        }
    },

    logout() {
        if (_refreshToken) {
            api.post('/auth/logout', { refreshToken: _refreshToken }).catch(() => {});
        }
        _accessToken = null;
        _refreshToken = null;
        // Clear IndexedDB to prevent data leaking between accounts
        if (typeof indexedDB !== 'undefined') {
            indexedDB.deleteDatabase('ChatDB');
            indexedDB.deleteDatabase('texlink-notifications');
        }
        // Clean up any legacy storage from previous versions
        sessionStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    getToken(): string | null {
        return _accessToken;
    },

    getRefreshToken(): string | null {
        return _refreshToken;
    },

    setTokens(accessToken: string, refreshToken: string | null) {
        _accessToken = accessToken;
        _refreshToken = refreshToken;
    },

    clearTokens() {
        _accessToken = null;
        _refreshToken = null;
    },

    isAuthenticated(): boolean {
        return !!_accessToken;
    },

    /**
     * Migrate tokens from legacy storage (localStorage/sessionStorage) to memory.
     * Called once on app boot to support users who still have tokens in storage
     * from before the SEC-F001 fix. After migration, storage is cleared.
     */
    migrateFromLegacyStorage(): boolean {
        const legacyAccessToken = sessionStorage.getItem('token');
        const legacyRefreshToken = localStorage.getItem('refreshToken');

        if (legacyAccessToken || legacyRefreshToken) {
            _accessToken = legacyAccessToken;
            _refreshToken = legacyRefreshToken;
            // Clear legacy storage immediately
            sessionStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            return true;
        }
        return false;
    },

    async toggleSuperAdmin(password: string, targetUserId?: string): Promise<{ isSuperAdmin: boolean }> {
        const response = await api.post<{ isSuperAdmin: boolean }>('/auth/superadmin', { password, targetUserId });
        return response.data;
    },

    async forgotPassword(email: string): Promise<void> {
        await api.post('/auth/forgot-password', { email });
    },

    async resetPassword(token: string, password: string): Promise<void> {
        await api.post('/auth/reset-password', { token, password });
    },
};
