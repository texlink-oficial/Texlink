import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

// Default mock user for auth responses
export const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test User',
  role: 'BRAND',
  isActive: true,
  companyId: 'company-1',
  companyName: 'Test Company',
};

export const mockAuthResponse = {
  data: {
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  },
  meta: {},
};

export const mockProfileResponse = {
  data: mockUser,
  meta: {},
};

export const handlers = [
  // POST /auth/login
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'test@test.com' && body.password === 'password123') {
      return HttpResponse.json(mockAuthResponse);
    }

    return HttpResponse.json(
      {
        error: { message: 'Credenciais invalidas', statusCode: 401 },
        meta: {},
      },
      { status: 401 },
    );
  }),

  // POST /auth/register
  http.post(`${API_URL}/auth/register`, async () => {
    return HttpResponse.json(mockAuthResponse);
  }),

  // GET /auth/me
  http.get(`${API_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: { message: 'Unauthorized', statusCode: 401 }, meta: {} },
        { status: 401 },
      );
    }

    return HttpResponse.json(mockProfileResponse);
  }),

  // POST /auth/refresh
  http.post(`${API_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };

    if (body.refreshToken) {
      return HttpResponse.json({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
        meta: {},
      });
    }

    return HttpResponse.json(
      { error: { message: 'Invalid refresh token', statusCode: 401 }, meta: {} },
      { status: 401 },
    );
  }),

  // POST /auth/forgot-password
  http.post(`${API_URL}/auth/forgot-password`, async () => {
    return HttpResponse.json({ data: { message: 'Email sent' }, meta: {} });
  }),

  // POST /auth/reset-password
  http.post(`${API_URL}/auth/reset-password`, async () => {
    return HttpResponse.json({ data: { message: 'Password reset' }, meta: {} });
  }),

  // POST /auth/logout
  http.post(`${API_URL}/auth/logout`, async () => {
    return HttpResponse.json({ data: { message: 'Logged out' }, meta: {} });
  }),
];
