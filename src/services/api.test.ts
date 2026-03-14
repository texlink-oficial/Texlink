import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- All hoisted state ----
const {
  mockGetToken,
  mockGetRefreshToken,
  mockSetTokens,
  mockClearTokens,
  mockAxiosPost,
  capturedRequestInterceptors,
  capturedResponseInterceptors,
} = vi.hoisted(() => ({
  mockGetToken: vi.fn().mockReturnValue(null),
  mockGetRefreshToken: vi.fn().mockReturnValue(null),
  mockSetTokens: vi.fn(),
  mockClearTokens: vi.fn(),
  mockAxiosPost: vi.fn(),
  capturedRequestInterceptors: [] as Array<(config: unknown) => unknown>,
  capturedResponseInterceptors: [] as Array<{
    onFulfilled: (resp: unknown) => unknown;
    onRejected: (err: unknown) => Promise<unknown>;
  }>,
}));

vi.mock('./auth.service', () => ({
  authService: {
    getToken: mockGetToken,
    getRefreshToken: mockGetRefreshToken,
    setTokens: mockSetTokens,
    clearTokens: mockClearTokens,
  },
}));

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: {
        use: vi.fn((fn: (config: unknown) => unknown) => {
          capturedRequestInterceptors.push(fn);
          return 0;
        }),
      },
      response: {
        use: vi.fn(
          (
            onFulfilled: (resp: unknown) => unknown,
            onRejected: (err: unknown) => Promise<unknown>,
          ) => {
            capturedResponseInterceptors.push({ onFulfilled, onRejected });
            return 0;
          },
        ),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:3000/api', headers: { common: {} } },
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
      post: mockAxiosPost,
    },
  };
});

// Import AFTER mocks - this triggers api.ts to register its interceptors
import { setViewAsCompanyId } from './api';

// Helper to build a headers-like object
function makeHeaders(): Record<string, string | undefined> {
  return {};
}

describe('api interceptors', () => {
  let requestInterceptor: (config: unknown) => unknown;
  let responseSuccess: (resp: unknown) => unknown;
  let responseError: (err: unknown) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockReturnValue(null);
    mockGetRefreshToken.mockReturnValue(null);

    // Grab the interceptor functions that api.ts registered
    requestInterceptor = capturedRequestInterceptors[0];
    responseSuccess = capturedResponseInterceptors[0]?.onFulfilled;
    responseError = capturedResponseInterceptors[0]?.onRejected;
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', () => {
      mockGetToken.mockReturnValue('my-access-token');
      const config = { headers: makeHeaders() };

      const result = requestInterceptor(config) as typeof config;

      expect(result.headers.Authorization).toBe('Bearer my-access-token');
    });

    it('does not add Authorization header when no token', () => {
      mockGetToken.mockReturnValue(null);
      const config = { headers: makeHeaders() };

      const result = requestInterceptor(config) as typeof config;

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('adds X-View-As-Company header when viewAs is active', () => {
      mockGetToken.mockReturnValue('token');
      setViewAsCompanyId('company-123');

      const config = { headers: makeHeaders() };
      const result = requestInterceptor(config) as typeof config;

      expect(result.headers['X-View-As-Company']).toBe('company-123');

      // Clean up
      setViewAsCompanyId(null);
    });

    it('does not add X-View-As-Company header when viewAs is null', () => {
      mockGetToken.mockReturnValue('token');
      setViewAsCompanyId(null);

      const config = { headers: makeHeaders() };
      const result = requestInterceptor(config) as typeof config;

      expect(result.headers['X-View-As-Company']).toBeUndefined();
    });
  });

  describe('response interceptor - success (envelope unwrapping)', () => {
    it('unwraps API envelope { data, meta } to just the inner data', () => {
      const response = {
        data: {
          data: { id: 1, name: 'Test' },
          meta: { total: 1 },
        },
        status: 200,
      };

      const result = responseSuccess(response) as typeof response;

      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    it('passes through response without envelope unchanged', () => {
      const response = {
        data: { id: 1, name: 'Test' },
        status: 200,
      };

      const result = responseSuccess(response) as typeof response;

      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('response interceptor - 401 error handling', () => {
    it('attempts refresh on 401 and stores new tokens', async () => {
      mockGetRefreshToken.mockReturnValue('valid-refresh-token');
      mockAxiosPost.mockResolvedValue({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
          meta: {},
        },
      });

      const error = {
        config: {
          url: '/some-protected-resource',
          headers: makeHeaders(),
        },
        response: {
          status: 401,
          data: {},
        },
      };

      try {
        await responseError(error);
      } catch {
        // The retry (api(originalRequest)) uses the mocked instance which may fail
      }

      expect(mockAxiosPost).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/refresh',
        { refreshToken: 'valid-refresh-token' },
      );
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
    });

    it('clears tokens and redirects to login on refresh failure', async () => {
      mockGetRefreshToken.mockReturnValue('expired-refresh');
      mockAxiosPost.mockRejectedValue(new Error('Refresh failed'));

      const error = {
        config: {
          url: '/some-resource',
          headers: makeHeaders(),
        },
        response: {
          status: 401,
          data: {},
        },
      };

      await expect(responseError(error)).rejects.toThrow();

      expect(mockClearTokens).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });

    it('redirects to login when no refresh token available on 401', async () => {
      mockGetRefreshToken.mockReturnValue(null);

      const error = {
        config: {
          url: '/some-resource',
          headers: makeHeaders(),
        },
        response: {
          status: 401,
          data: {},
        },
      };

      await expect(responseError(error)).rejects.toBeTruthy();

      expect(mockClearTokens).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });

    it('does not retry login endpoint on 401', async () => {
      const error = {
        config: {
          url: '/auth/login',
          headers: makeHeaders(),
        },
        response: {
          status: 401,
          data: {},
        },
      };

      await expect(responseError(error)).rejects.toBeTruthy();

      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockSetTokens).not.toHaveBeenCalled();
    });

    it('does not retry register endpoint on 401', async () => {
      const error = {
        config: {
          url: '/auth/register',
          headers: makeHeaders(),
        },
        response: {
          status: 401,
          data: {},
        },
      };

      await expect(responseError(error)).rejects.toBeTruthy();

      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockSetTokens).not.toHaveBeenCalled();
    });

    it('does not retry refresh endpoint on 401', async () => {
      const error = {
        config: {
          url: '/auth/refresh',
          headers: makeHeaders(),
        },
        response: {
          status: 401,
          data: {},
        },
      };

      await expect(responseError(error)).rejects.toBeTruthy();

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('propagates non-401 errors without attempting refresh', async () => {
      const error = {
        config: {
          url: '/some-resource',
          headers: makeHeaders(),
        },
        response: {
          status: 500,
          data: { error: { message: 'Internal Server Error' } },
        },
      };

      await expect(responseError(error)).rejects.toBeTruthy();

      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockClearTokens).not.toHaveBeenCalled();
    });
  });
});
