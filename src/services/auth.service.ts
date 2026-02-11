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
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt?: string;
    companyUsers?: {
        role: string;
        company: {
            id: string;
            tradeName: string;
            type: string;
            status: string;
            logoUrl?: string | null;
        };
    }[];
}

export const authService = {
    async login(data: LoginDto): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/login', data);
        const { accessToken, user } = response.data;
        sessionStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/register', data);
        const { accessToken, user } = response.data;
        sessionStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async getProfile(): Promise<User> {
        const response = await api.get<User>('/auth/me');
        // Update localStorage with fresh profile data (includes companyId)
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
    },

    logout() {
        sessionStorage.removeItem('token');
        localStorage.removeItem('user');
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
