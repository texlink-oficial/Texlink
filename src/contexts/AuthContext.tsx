import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, role: 'BRAND' | 'SUPPLIER', extra?: { cnpj?: string; phone?: string }) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(authService.getToken());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const initAuth = async () => {
            const storedUser = authService.getStoredUser();
            const token = authService.getToken();

            if (storedUser && token) {
                try {
                    // Verify token is still valid
                    const profile = await authService.getProfile();
                    setUser(profile);
                } catch {
                    // Token invalid, clear storage
                    authService.logout();
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authService.login({ email, password });
        setToken(response.accessToken);
        const profile = await authService.getProfile();
        setUser(profile);
    };

    const register = async (email: string, password: string, name: string, role: 'BRAND' | 'SUPPLIER', extra?: { document?: string; phone?: string }) => {
        await authService.register({ email, password, name, role, ...extra });
        const profile = await authService.getProfile();
        setUser(profile);
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        setToken(null);
    };

    const refreshUser = async () => {
        try {
            const profile = await authService.getProfile();
            setUser(profile);
        } catch {
            logout();
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
