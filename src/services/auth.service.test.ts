import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing auth.service
vi.mock('./api', () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { baseURL: 'http://localhost:3000/api' },
  };
  return { default: mockApi };
});

import { authService } from './auth.service';
import api from './api';

const mockApi = vi.mocked(api);

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('login', () => {
    const loginResponse = {
      data: {
        user: { id: 'u1', email: 'test@test.com', name: 'Test', role: 'BRAND' },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      },
    };

    it('should call POST /auth/login with credentials', async () => {
      mockApi.post.mockResolvedValue(loginResponse);

      await authService.login({ email: 'test@test.com', password: 'pass123' });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'pass123',
      });
    });

    it('should store tokens and user in storage', async () => {
      mockApi.post.mockResolvedValue(loginResponse);

      await authService.login({ email: 'test@test.com', password: 'pass123' });

      expect(sessionStorage.setItem).toHaveBeenCalledWith('token', 'access-token-123');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(loginResponse.data.user),
      );
    });

    it('should return the full auth response', async () => {
      mockApi.post.mockResolvedValue(loginResponse);

      const result = await authService.login({ email: 'test@test.com', password: 'pass123' });

      expect(result).toEqual(loginResponse.data);
    });

    it('should handle login without refresh token', async () => {
      const responseNoRefresh = {
        data: {
          user: { id: 'u1', email: 'test@test.com', name: 'Test', role: 'BRAND' },
          accessToken: 'access-token-123',
        },
      };
      mockApi.post.mockResolvedValue(responseNoRefresh);

      await authService.login({ email: 'test@test.com', password: 'pass123' });

      expect(sessionStorage.setItem).toHaveBeenCalledWith('token', 'access-token-123');
      // refreshToken should NOT be stored when undefined
      const refreshCalls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([key]: [string]) => key === 'refreshToken',
      );
      expect(refreshCalls).toHaveLength(0);
    });
  });

  describe('register', () => {
    it('should call POST /auth/register with data', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: { id: 'u1', email: 'new@test.com', name: 'New', role: 'SUPPLIER' },
          accessToken: 'token',
          refreshToken: 'rtoken',
        },
      });

      await authService.register({
        email: 'new@test.com',
        password: 'pass',
        name: 'New',
        role: 'SUPPLIER',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@test.com',
        password: 'pass',
        name: 'New',
        role: 'SUPPLIER',
      });
    });

    it('should store tokens after register', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          user: { id: 'u1', email: 'new@test.com', name: 'New', role: 'SUPPLIER' },
          accessToken: 'reg-token',
          refreshToken: 'reg-refresh',
        },
      });

      await authService.register({
        email: 'new@test.com',
        password: 'pass',
        name: 'New',
        role: 'SUPPLIER',
      });

      expect(sessionStorage.setItem).toHaveBeenCalledWith('token', 'reg-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'reg-refresh');
    });
  });

  describe('getProfile', () => {
    it('should call GET /auth/me and update stored user', async () => {
      const profile = {
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
        role: 'BRAND',
        isActive: true,
      };
      mockApi.get.mockResolvedValue({ data: profile });

      const result = await authService.getProfile();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(profile);
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(profile));
    });
  });

  describe('refreshTokens', () => {
    it('should return null when no refresh token in storage', async () => {
      const result = await authService.refreshTokens();

      expect(result).toBeNull();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should call POST /auth/refresh and update tokens', async () => {
      // Simulate stored refresh token
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('old-refresh');
      mockApi.post.mockResolvedValue({
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      });

      const result = await authService.refreshTokens();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh' });
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      expect(sessionStorage.setItem).toHaveBeenCalledWith('token', 'new-access');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
    });

    it('should return null on refresh failure', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('expired-refresh');
      mockApi.post.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.refreshTokens();

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should send logout request and clear all storage', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('my-refresh-token');
      mockApi.post.mockResolvedValue({});

      authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'my-refresh-token' });
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should skip logout request when no refresh token', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      authService.logout();

      expect(mockApi.post).not.toHaveBeenCalled();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('getStoredUser', () => {
    it('should return parsed user from localStorage', () => {
      const user = { id: 'u1', email: 'test@test.com', name: 'Test', role: 'BRAND' };
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(user));

      const result = authService.getStoredUser();

      expect(result).toEqual(user);
    });

    it('should return null when no user stored', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const result = authService.getStoredUser();

      expect(result).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return token from sessionStorage', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('my-token');

      expect(authService.getToken()).toBe('my-token');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no token', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
