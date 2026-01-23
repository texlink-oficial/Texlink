import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_USERS } from './mockData';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'BRAND' | 'SUPPLIER';
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
    companyUsers?: {
        role: string;
        company: {
            id: string;
            tradeName: string;
            type: string;
            status: string;
        };
    }[];
}

// Mock authentication for demo mode
const mockLogin = async (data: LoginDto): Promise<AuthResponse> => {
    await simulateDelay(800);

    // Find matching demo user
    const demoUser = Object.values(MOCK_USERS).find(
        u => u.email === data.email && u.password === data.password
    );

    if (!demoUser) {
        throw new Error('Credenciais inválidas. Use um dos usuários demo.');
    }

    const { password, ...userWithoutPassword } = demoUser;

    return {
        user: {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            name: userWithoutPassword.name,
            role: userWithoutPassword.role
        },
        accessToken: `mock-token-${userWithoutPassword.role.toLowerCase()}-${Date.now()}`
    };
};

const mockGetProfile = async (): Promise<User> => {
    await simulateDelay(300);

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
        throw new Error('Não autenticado');
    }

    const parsed = JSON.parse(storedUser);
    const demoUser = Object.values(MOCK_USERS).find(u => u.email === parsed.email);

    if (!demoUser) {
        throw new Error('Usuário não encontrado');
    }

    const { password, ...userWithoutPassword } = demoUser;
    return userWithoutPassword as User;
};

export const authService = {
    async login(data: LoginDto): Promise<AuthResponse> {
        if (MOCK_MODE) {
            const response = await mockLogin(data);
            localStorage.setItem('token', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));
            return response;
        }

        const response = await api.post<AuthResponse>('/auth/login', data);
        const { accessToken, user } = response.data;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            // In demo mode, just show a message
            throw new Error('Modo Demo: Cadastro desabilitado. Use os usuários demo para testar.');
        }

        const response = await api.post<AuthResponse>('/auth/register', data);
        const { accessToken, user } = response.data;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async getProfile(): Promise<User> {
        if (MOCK_MODE) {
            return mockGetProfile();
        }

        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    getStoredUser(): User | null {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getToken(): string | null {
        return localStorage.getItem('token');
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    },
};
