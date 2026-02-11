import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_USERS, createMockUser } from './mockData';

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

    // First try to find in predefined demo users
    const demoUser = Object.values(MOCK_USERS).find(u => u.email === parsed.email);

    if (demoUser) {
        const { password, ...userWithoutPassword } = demoUser;
        return userWithoutPassword as User;
    }

    // If not found, this is a dynamically created mock user (from registration)
    // Return the stored user data directly
    if (parsed.id && parsed.id.startsWith('mock-')) {
        return {
            id: parsed.id,
            email: parsed.email,
            name: parsed.name,
            role: parsed.role,
            isActive: parsed.isActive ?? true,
            companyUsers: parsed.companyUsers
        } as User;
    }

    throw new Error('Usuário não encontrado');
};

export const authService = {
    async login(data: LoginDto): Promise<AuthResponse> {
        if (MOCK_MODE) {
            const response = await mockLogin(data);
            sessionStorage.setItem('token', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));
            return response;
        }

        const response = await api.post<AuthResponse>('/auth/login', data);
        const { accessToken, user } = response.data;
        sessionStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        if (MOCK_MODE) {
            await simulateDelay(800);

            // Create mock user based on registration data
            const mockUser = createMockUser({
                email: data.email,
                name: data.name,
                role: data.role
            });

            const mockToken = `mock-token-${data.role.toLowerCase()}-${Date.now()}`;

            // Store in localStorage (same as login flow)
            sessionStorage.setItem('token', mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));

            return {
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    name: mockUser.name,
                    role: mockUser.role
                },
                accessToken: mockToken
            };
        }

        const response = await api.post<AuthResponse>('/auth/register', data);
        const { accessToken, user } = response.data;
        sessionStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    },

    async getProfile(): Promise<User> {
        if (MOCK_MODE) {
            return mockGetProfile();
        }

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
