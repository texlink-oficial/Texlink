# CLAUDE.md - Texlink Faccao Manager

## Project Overview

Texlink is a multi-tenant B2B platform connecting textile brands with garment factories (faccoes).
It manages orders, contracts, partnerships, ratings, payments, and real-time communication.

## Architecture

- **Frontend:** React 19 + Vite + TypeScript (SPA at `/src`)
- **Backend:** NestJS + Prisma + PostgreSQL (at `/backend`)
- **Realtime:** Socket.io with Redis adapter
- **Storage:** AWS S3 (presigned URLs for file access)
- **Auth:** JWT via Passport (multi-tenant with `companyId`)

## Project Structure

```
src/                    # Frontend (React)
  components/           # Reusable UI components (145 files)
  pages/                # Route pages (98 files)
    admin/              # Admin portal
    brand/              # Brand dashboard
    supplier/           # Supplier dashboard
    auth/               # Login, register, forgot password
    portal/             # Shared portal pages
    settings/           # User/company settings
    onboarding/         # First-time setup flows
  services/             # API client services (37 files)
  hooks/                # Custom React hooks (10 files)
  contexts/             # React context providers
  types/                # TypeScript type definitions
  db/                   # Dexie (IndexedDB) offline storage

backend/                # Backend (NestJS)
  src/
    modules/            # Feature modules (33 modules)
      auth/             # Authentication & JWT
      users/            # User management
      companies/        # Company/tenant management
      orders/           # Order lifecycle
      contracts/        # Contract management
      brands/           # Brand-specific logic
      suppliers/        # Supplier-specific logic
      chat/             # Real-time messaging
      notifications/    # Push & in-app notifications
      payments/         # Payment processing
      ratings/          # Partner ratings
      upload/           # File upload (S3)
      reports/          # Report generation
      ...
    prisma/             # Prisma ORM setup
  prisma/
    schema.prisma       # Database schema

artifacts/              # Squad pipeline artifacts
nginx/                  # Reverse proxy config
```

## Development Commands

```bash
# Frontend
npm run dev             # Start Vite dev server
npm run build           # Build for production

# Backend
cd backend && npm run start:dev   # Start NestJS in dev mode
cd backend && npx prisma studio   # Open Prisma Studio
cd backend && npx prisma migrate dev  # Run migrations
```

## Key Conventions

- **Tenant isolation:** All queries MUST filter by `companyId` for multi-tenant safety
- **API calls:** Use Axios via service files in `src/services/`
- **State management:** TanStack React Query for server state, React Context for client state
- **Styling:** Tailwind CSS utility classes; no CSS modules
- **Forms:** React Hook Form for all form handling
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`)
- **File naming:** PascalCase for components, camelCase for services/hooks

## Important Notes

- S3 file URLs require presigned URLs (direct URLs return AccessDenied)
- Notification system must filter by `companyId` for tenant isolation
- Backend uses Bull queues via Redis for async jobs (email, notifications)
- Socket.io uses Redis adapter for multi-instance support
