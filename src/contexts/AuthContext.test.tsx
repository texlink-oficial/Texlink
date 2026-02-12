import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Use vi.hoisted to create mocks that can be referenced in vi.mock factory
const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getProfile: vi.fn(),
  logout: vi.fn(),
  getStoredUser: vi.fn(),
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  authService: mockAuthService,
}));

import { AuthProvider, useAuth } from './AuthContext';

// Test component that exposes auth context
const TestConsumer: React.FC = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user ? auth.user.name : 'null'}</span>
      <button data-testid="login" onClick={() => auth.login('test@test.com', 'pass')}>
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
    mockAuthService.getStoredUser.mockReturnValue(null);
    mockAuthService.getToken.mockReturnValue(null);
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });

  it('should initialize with no user when no stored session', async () => {
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

  it('should restore session from stored user and token', async () => {
    const storedUser = { id: 'u1', email: 'test@test.com', name: 'Test User', role: 'BRAND' };
    const profile = { ...storedUser, isActive: true };

    mockAuthService.getStoredUser.mockReturnValue(storedUser);
    mockAuthService.getToken.mockReturnValue('stored-token');
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
    expect(screen.getByTestId('user').textContent).toBe('Test User');
  });

  it('should clear session when profile fetch fails on init', async () => {
    mockAuthService.getStoredUser.mockReturnValue({ id: 'u1' });
    mockAuthService.getToken.mockReturnValue('expired-token');
    mockAuthService.getProfile.mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('should handle login flow', async () => {
    const user = userEvent.setup();
    const loginResponse = {
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
      user: { id: 'u1', email: 'test@test.com', name: 'Login User', role: 'BRAND' },
    };
    const profile = { ...loginResponse.user, isActive: true };

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
      password: 'pass',
    });
    expect(mockAuthService.getProfile).toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    const profile = { id: 'u1', email: 'test@test.com', name: 'User', role: 'BRAND', isActive: true };

    mockAuthService.getStoredUser.mockReturnValue(profile);
    mockAuthService.getToken.mockReturnValue('token');
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
