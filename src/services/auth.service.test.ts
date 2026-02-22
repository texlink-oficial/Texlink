import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing auth.service
vi.mock('./api', () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
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
    // SEC-F001: Clear in-memory tokens between tests
    authService.clearTokens();
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

    it('should store tokens in memory (not in storage)', async () => {
      mockApi.post.mockResolvedValue(loginResponse);

      await authService.login({ email: 'test@test.com', password: 'pass123' });

      // Tokens should be in memory
      expect(authService.getToken()).toBe('access-token-123');
      expect(authService.getRefreshToken()).toBe('refresh-token-456');

      // Tokens should NOT be in storage
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
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

      expect(authService.getToken()).toBe('access-token-123');
      expect(authService.getRefreshToken()).toBeNull();
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

    it('should store tokens in memory after register', async () => {
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

      expect(authService.getToken()).toBe('reg-token');
      expect(authService.getRefreshToken()).toBe('reg-refresh');
    });

    it('should clear previous tokens before registering', async () => {
      // Set existing tokens
      authService.setTokens('old-access', 'old-refresh');

      mockApi.post.mockResolvedValue({
        data: {
          user: { id: 'u2', email: 'new@test.com', name: 'New', role: 'BRAND' },
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        },
      });

      await authService.register({
        email: 'new@test.com',
        password: 'pass',
        name: 'New',
        role: 'BRAND',
      });

      expect(authService.getToken()).toBe('new-token');
      expect(authService.getRefreshToken()).toBe('new-refresh');
    });
  });

  describe('getProfile', () => {
    it('should call GET /auth/me and return profile without storing in localStorage', async () => {
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
      // SEC-F001: Should NOT store PII in localStorage
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('refreshTokens', () => {
    it('should return null when no refresh token in memory', async () => {
      const result = await authService.refreshTokens();

      expect(result).toBeNull();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should call POST /auth/refresh and update in-memory tokens', async () => {
      // Set refresh token in memory
      authService.setTokens('old-access', 'old-refresh');
      mockApi.post.mockResolvedValue({
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      });

      const result = await authService.refreshTokens();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh' });
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      expect(authService.getToken()).toBe('new-access');
      expect(authService.getRefreshToken()).toBe('new-refresh');
    });

    it('should clear tokens and return null on refresh failure', async () => {
      authService.setTokens('old-access', 'expired-refresh');
      mockApi.post.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.refreshTokens();

      expect(result).toBeNull();
      expect(authService.getToken()).toBeNull();
      expect(authService.getRefreshToken()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should send logout request with in-memory refresh token and clear everything', () => {
      authService.setTokens('my-access', 'my-refresh-token');
      mockApi.post.mockResolvedValue({});

      authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'my-refresh-token' });
      // In-memory tokens should be cleared
      expect(authService.getToken()).toBeNull();
      expect(authService.getRefreshToken()).toBeNull();
    });

    it('should skip logout request when no refresh token', () => {
      authService.logout();

      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('migrateFromLegacyStorage', () => {
    it('should migrate tokens from legacy storage to memory', () => {
      sessionStorage.setItem('token', 'legacy-access');
      localStorage.setItem('refreshToken', 'legacy-refresh');
      localStorage.setItem('user', '{"id":"u1"}');

      const migrated = authService.migrateFromLegacyStorage();

      expect(migrated).toBe(true);
      expect(authService.getToken()).toBe('legacy-access');
      expect(authService.getRefreshToken()).toBe('legacy-refresh');
      // Legacy storage should be cleared
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should return false when no legacy tokens exist', () => {
      const migrated = authService.migrateFromLegacyStorage();

      expect(migrated).toBe(false);
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return token from memory', () => {
      authService.setTokens('my-token', null);

      expect(authService.getToken()).toBe('my-token');
    });

    it('should return null when no token set', () => {
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists in memory', () => {
      authService.setTokens('token', null);

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no token in memory', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
