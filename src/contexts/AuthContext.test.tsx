import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Use vi.hoisted to create mocks that can be referenced in vi.mock factory
const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getProfile: vi.fn(),
  logout: vi.fn(),
  getToken: vi.fn().mockReturnValue(null),
  getRefreshToken: vi.fn().mockReturnValue(null),
  isAuthenticated: vi.fn().mockReturnValue(false),
  refreshTokens: vi.fn().mockResolvedValue(null),
  migrateFromLegacyStorage: vi.fn().mockReturnValue(false),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  toggleSuperAdmin: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  authService: mockAuthService,
  // Re-export User type placeholder (tests don't use it at runtime)
}));

vi.mock('../services/api', () => ({
  default: {},
  setViewAsCompanyId: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';

// Test component that exposes auth context values
const TestConsumer: React.FC = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user ? auth.user.name : 'null'}</span>
      <span data-testid="role">{auth.user ? auth.user.role : 'null'}</span>
      <button data-testid="login" onClick={() => auth.login('test@test.com', 'pass123')}>
        Login
      </button>
      <button data-testid="logout" onClick={auth.logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.getToken.mockReturnValue(null);
    mockAuthService.getRefreshToken.mockReturnValue(null);
    mockAuthService.migrateFromLegacyStorage.mockReturnValue(false);
    mockAuthService.refreshTokens.mockResolvedValue(null);
  });

  describe('initialization', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      spy.mockRestore();
    });

    it('should be unauthenticated when no stored token', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('should attempt auto-login when refresh token exists in memory', async () => {
      // Simulate: no access token, but refresh token is available (page refresh scenario)
      mockAuthService.getToken.mockReturnValue(null);
      mockAuthService.getRefreshToken.mockReturnValue('persisted-refresh-token');
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      // After refresh succeeds, getToken now returns the new token
      mockAuthService.getToken
        .mockReturnValueOnce(null)     // first call in useState init
        .mockReturnValueOnce(null)     // initAuth hasToken check
        .mockReturnValue('new-access'); // after refresh
      mockAuthService.getProfile.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        name: 'Restored User',
        role: 'BRAND',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(mockAuthService.refreshTokens).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('Restored User');
    });

    it('should restore session when access token exists', async () => {
      const profile = {
        id: 'u1',
        email: 'test@test.com',
        name: 'Existing User',
        role: 'SUPPLIER',
        isActive: true,
      };

      mockAuthService.getToken.mockReturnValue('existing-token');
      mockAuthService.getRefreshToken.mockReturnValue('existing-refresh');
      mockAuthService.getProfile.mockResolvedValue(profile);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(mockAuthService.getProfile).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('Existing User');
      expect(screen.getByTestId('role').textContent).toBe('SUPPLIER');
    });

    it('should attempt token refresh when getProfile fails on init', async () => {
      mockAuthService.getToken.mockReturnValue('expired-token');
      mockAuthService.getRefreshToken.mockReturnValue('valid-refresh');
      mockAuthService.getProfile
        .mockRejectedValueOnce(new Error('Unauthorized')) // first attempt fails
        .mockResolvedValueOnce({
          id: 'u1',
          email: 'test@test.com',
          name: 'Refreshed User',
          role: 'BRAND',
          isActive: true,
        });
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(mockAuthService.refreshTokens).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('Refreshed User');
    });

    it('should clear session when both profile fetch and token refresh fail', async () => {
      mockAuthService.getToken.mockReturnValue('expired-token');
      mockAuthService.getRefreshToken.mockReturnValue('expired-refresh');
      mockAuthService.getProfile.mockRejectedValue(new Error('Unauthorized'));
      mockAuthService.refreshTokens.mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(mockAuthService.clearTokens).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('login()', () => {
    it('updates user state and stores tokens after successful login', async () => {
      const user = userEvent.setup();
      const loginResponse = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        user: { id: 'u1', email: 'test@test.com', name: 'Login User', role: 'BRAND' },
      };
      const profile = {
        id: 'u1',
        email: 'test@test.com',
        name: 'Login User',
        role: 'BRAND',
        isActive: true,
      };

      mockAuthService.login.mockResolvedValue(loginResponse);
      mockAuthService.getProfile.mockResolvedValue(profile);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await user.click(screen.getByTestId('login'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Login User');
      });

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass123',
      });
      expect(mockAuthService.getProfile).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });
  });

  describe('logout()', () => {
    it('clears user state and calls authService.logout', async () => {
      const user = userEvent.setup();
      const profile = {
        id: 'u1',
        email: 'test@test.com',
        name: 'User',
        role: 'BRAND',
        isActive: true,
      };

      mockAuthService.getToken.mockReturnValue('valid-token');
      mockAuthService.getRefreshToken.mockReturnValue('valid-refresh');
      mockAuthService.getProfile.mockResolvedValue(profile);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      await user.click(screen.getByTestId('logout'));

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('isAuthenticated', () => {
    it('is true when user object exists', async () => {
      const profile = {
        id: 'u1',
        email: 'test@test.com',
        name: 'User',
        role: 'BRAND',
        isActive: true,
      };

      mockAuthService.getToken.mockReturnValue('valid-token');
      mockAuthService.getProfile.mockResolvedValue(profile);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    it('is false when no user exists', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
  });

  describe('role checks via context', () => {
    it('provides BRAND role through user object', async () => {
      mockAuthService.getToken.mockReturnValue('token');
      mockAuthService.getProfile.mockResolvedValue({
        id: 'u1',
        email: 'brand@test.com',
        name: 'Brand User',
        role: 'BRAND',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('role').textContent).toBe('BRAND');
      });
    });

    it('provides SUPPLIER role through user object', async () => {
      mockAuthService.getToken.mockReturnValue('token');
      mockAuthService.getProfile.mockResolvedValue({
        id: 'u2',
        email: 'supplier@test.com',
        name: 'Supplier User',
        role: 'SUPPLIER',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('role').textContent).toBe('SUPPLIER');
      });
    });

    it('provides ADMIN role through user object', async () => {
      mockAuthService.getToken.mockReturnValue('token');
      mockAuthService.getProfile.mockResolvedValue({
        id: 'u3',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        isSuperAdmin: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('role').textContent).toBe('ADMIN');
      });
    });
  });

  describe('context values', () => {
    it('provides all expected context properties to children', async () => {
      const ContextInspector: React.FC = () => {
        const auth = useAuth();
        return (
          <div>
            <span data-testid="has-login">{String(typeof auth.login === 'function')}</span>
            <span data-testid="has-register">{String(typeof auth.register === 'function')}</span>
            <span data-testid="has-logout">{String(typeof auth.logout === 'function')}</span>
            <span data-testid="has-refreshUser">{String(typeof auth.refreshUser === 'function')}</span>
            <span data-testid="has-enterViewAs">{String(typeof auth.enterViewAs === 'function')}</span>
            <span data-testid="has-exitViewAs">{String(typeof auth.exitViewAs === 'function')}</span>
            <span data-testid="has-user">{String('user' in auth)}</span>
            <span data-testid="has-token">{String('token' in auth)}</span>
            <span data-testid="has-isLoading">{String('isLoading' in auth)}</span>
            <span data-testid="has-isAuthenticated">{String('isAuthenticated' in auth)}</span>
            <span data-testid="has-viewAs">{String('viewAs' in auth)}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <ContextInspector />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-login').textContent).toBe('true');
      });

      expect(screen.getByTestId('has-register').textContent).toBe('true');
      expect(screen.getByTestId('has-logout').textContent).toBe('true');
      expect(screen.getByTestId('has-refreshUser').textContent).toBe('true');
      expect(screen.getByTestId('has-enterViewAs').textContent).toBe('true');
      expect(screen.getByTestId('has-exitViewAs').textContent).toBe('true');
      expect(screen.getByTestId('has-user').textContent).toBe('true');
      expect(screen.getByTestId('has-token').textContent).toBe('true');
      expect(screen.getByTestId('has-isLoading').textContent).toBe('true');
      expect(screen.getByTestId('has-isAuthenticated').textContent).toBe('true');
      expect(screen.getByTestId('has-viewAs').textContent).toBe('true');
    });
  });
});
