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
    document?: string;
    phone?: string;
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

export const authService = {
    async login(data: LoginDto): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/login', data);
        const { accessToken, refreshToken, user } = response.data;
        sessionStorage.setItem('token', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        // Clear any existing session/storage before registering a new account
        // to prevent stale data from previous accounts leaking into the new one
        sessionStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        const response = await api.post<AuthResponse>('/auth/register', data);
        const { accessToken, refreshToken, user } = response.data;
        sessionStorage.setItem('token', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async getProfile(): Promise<User> {
        const response = await api.get<User>('/auth/me');
        // Update localStorage with fresh profile data (includes companyId)
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
    },

    async refreshTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;
        try {
            const response = await api.post<{ accessToken: string; refreshToken: string }>(
                '/auth/refresh',
                { refreshToken },
            );
            sessionStorage.setItem('token', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            return response.data;
        } catch {
            return null;
        }
    },

    logout() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            api.post('/auth/logout', { refreshToken }).catch(() => {});
        }
        sessionStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Clear IndexedDB to prevent data leaking between accounts
        indexedDB.deleteDatabase('ChatDB');
        indexedDB.deleteDatabase('texlink-notifications');
        window.location.href = '/login';
    },

    getStoredUser(): User | null {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getToken(): string | null {
        return sessionStorage.getItem('token');
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    },
};
