/**
 * Mock Mode Configuration
 * Controls whether the app runs in demo mode with mocked data
 */

// Enable mock mode when:
// 1. VITE_MOCK_MODE is explicitly set to 'true'
// 2. No API URL is configured (standalone frontend)
export const MOCK_MODE =
    import.meta.env.VITE_MOCK_MODE === 'true' ||
    !import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_URL === '';

// Demo user credentials for login page
export const DEMO_CREDENTIALS = {
    brand: { email: 'demo-brand@texlink.com', password: 'demo123' },
    supplier: { email: 'demo-supplier@texlink.com', password: 'demo123' },
    admin: { email: 'demo-admin@texlink.com', password: 'demo123' }
};

// Simulate API delay for realistic feel
export const simulateDelay = (ms: number = 500) =>
    new Promise(resolve => setTimeout(resolve, ms));

// Log mock mode status in development
if (import.meta.env.DEV) {
    console.log(`🎭 Mock Mode: ${MOCK_MODE ? 'ENABLED' : 'DISABLED'}`);
}
