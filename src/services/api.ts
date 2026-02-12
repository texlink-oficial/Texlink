import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors with automatic token refresh
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (token) {
            prom.resolve(token);
        } else {
            prom.reject(error);
        }
    });
    failedQueue = [];
};

/**
 * Unwrap envelope: { data, meta } → data
 * Falls back to raw response if no envelope detected (backward compat)
 */
const unwrapEnvelope = (responseData: any) => {
    if (responseData && typeof responseData === 'object' && 'data' in responseData && 'meta' in responseData) {
        return responseData.data;
    }
    return responseData;
};

api.interceptors.response.use(
    (response) => {
        // Unwrap the API envelope so frontend code keeps using response.data directly
        response.data = unwrapEnvelope(response.data);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Extract structured error message from envelope and ensure backward compat
        if (error.response?.data?.error?.message) {
            const msg = error.response.data.error.message;
            error.message = Array.isArray(msg) ? msg[0] : msg;
            // Backward compat: frontend code reads error.response.data.message
            error.response.data.message = error.response.data.error.message;
        }

        // Don't retry refresh/login/register requests
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/register')
        ) {
            if (isRefreshing) {
                // Queue requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        },
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const response = await axios.post(
                        `${API_URL}/auth/refresh`,
                        { refreshToken },
                    );
                    // Raw axios call gets the full envelope — unwrap it
                    const refreshData = unwrapEnvelope(response.data);
                    const { accessToken, refreshToken: newRefreshToken } = refreshData;
                    sessionStorage.setItem('token', accessToken);
                    localStorage.setItem('refreshToken', newRefreshToken);
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    processQueue(null, accessToken);
                    return api(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    sessionStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            // No refresh token available
            sessionStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
