import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, User } from '../services/auth.service';
import { setViewAsCompanyId } from '../services/api';

export interface ViewAsState {
    role: 'BRAND' | 'SUPPLIER';
    companyId: string;
    companyName: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    viewAs: ViewAsState | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, role: 'BRAND' | 'SUPPLIER', extra?: { legalName?: string; tradeName?: string; document?: string; phone?: string; city?: string; state?: string; invitationToken?: string }) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    enterViewAs: (role: 'BRAND' | 'SUPPLIER', companyId: string, companyName: string) => void;
    exitViewAs: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(authService.getToken());
    const [isLoading, setIsLoading] = useState(true);
    const [viewAs, setViewAs] = useState<ViewAsState | null>(null);

    useEffect(() => {
        /**
         * SEC-F001: On page load, attempt to restore the session.
         *
         * Strategy:
         * 1. Check if in-memory tokens already exist (e.g., hot module reload in dev)
         * 2. If not, try migrating tokens from legacy storage (users upgrading from old version)
         * 3. If we have an access token, verify it via /auth/me
         * 4. If access token is expired but we have a refresh token, try refreshing
         * 5. If nothing works, user needs to re-login (expected security trade-off)
         */
        const initAuth = async () => {
            // Step 1: Check in-memory tokens
            let hasToken = !!authService.getToken();

            // Step 2: Migrate from legacy storage if needed (one-time for upgrading users)
            if (!hasToken) {
                const migrated = authService.migrateFromLegacyStorage();
                hasToken = migrated;
            }

            if (!hasToken) {
                setIsLoading(false);
                return;
            }

            try {
                // Step 3: Verify access token by fetching profile
                const profile = await authService.getProfile();
                setUser(profile);
                setToken(authService.getToken());
            } catch {
                // Step 4: Access token may be expired — try refresh
                const refreshResult = await authService.refreshTokens();
                if (refreshResult) {
                    try {
                        const profile = await authService.getProfile();
                        setUser(profile);
                        setToken(authService.getToken());
                    } catch {
                        // Refresh succeeded but profile failed — clear everything
                        authService.clearTokens();
                        setUser(null);
                        setToken(null);
                    }
                } else {
                    // No valid refresh token — user must re-login
                    authService.clearTokens();
                    setUser(null);
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authService.login({ email, password });
        setToken(response.accessToken);
        const profile = await authService.getProfile();
        setUser(profile);
    }, []);

    const register = useCallback(async (email: string, password: string, name: string, role: 'BRAND' | 'SUPPLIER', extra?: { legalName?: string; tradeName?: string; document?: string; phone?: string; city?: string; state?: string; invitationToken?: string }) => {
        const response = await authService.register({ email, password, name, role, ...extra });
        setToken(authService.getToken());
        try {
            const profile = await authService.getProfile();
            setUser(profile);
        } catch {
            // Registration succeeded but profile fetch failed — set basic user data
            // from the register response so navigation can still proceed
            setUser(response.user as User);
        }
    }, []);

    const logout = useCallback(() => {
        setViewAs(null);
        authService.logout();
        setUser(null);
        setToken(null);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const profile = await authService.getProfile();
            setUser(profile);
        } catch {
            logout();
        }
    }, [logout]);

    const enterViewAs = useCallback((role: 'BRAND' | 'SUPPLIER', companyId: string, companyName: string) => {
        if (user?.role !== 'ADMIN' || !user?.isSuperAdmin) return;
        setViewAs({ role, companyId, companyName });
        setViewAsCompanyId(companyId);
    }, [user]);

    const exitViewAs = useCallback(() => {
        setViewAs(null);
        setViewAsCompanyId(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user,
                viewAs,
                login,
                register,
                logout,
                refreshUser,
                enterViewAs,
                exitViewAs,
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
