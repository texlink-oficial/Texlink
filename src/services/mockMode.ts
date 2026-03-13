/**
 * Demo credentials for login page quick-fill buttons.
 * These users are seeded in the database via prisma/seed.ts.
 * Gated behind import.meta.env.DEV so credentials are stripped from production builds.
 */
export const DEMO_CREDENTIALS = import.meta.env.DEV
    ? {
        brand: { email: 'demo-brand@texlink.com', password: 'demo123' },
        supplier: { email: 'demo-supplier@texlink.com', password: 'demo123' },
        admin: { email: 'demo-admin@texlink.com', password: 'demo123' },
    }
    : null;
