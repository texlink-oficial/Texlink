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
  utils/                # Utilities (logger, workingDays)
  db/                   # Dexie (IndexedDB) offline storage

backend/                # Backend (NestJS)
  src/
    common/
      config/           # Shared config (cors.config.ts)
      guards/           # JWT, Roles, ViewAs, Throttle guards
      decorators/       # @CurrentUser, @Roles
    modules/            # Feature modules (35 modules)
      auth/             # Authentication & JWT + audit logging
      users/            # User management
      companies/        # Company/tenant management
      orders/           # Order lifecycle
      contracts/        # Contract management
      brands/           # Brand-specific logic
      suppliers/        # Supplier-specific logic
      chat/             # Real-time messaging (Socket.io)
      notifications/    # Push & in-app notifications (Socket.io)
      payments/         # Payment processing
      ratings/          # Partner ratings
      upload/           # File upload (S3)
      reports/          # Report generation
      audit/            # Security audit trail (@Global)
      data-deletion/    # LGPD right-to-deletion
      ...
    prisma/             # Prisma ORM setup
  prisma/
    schema.prisma       # Database schema

.claude/                # AI Dev Squad
  agents/               # 16 agent definitions
  skills/               # 17 skill definitions
  templates/            # Project templates

artifacts/              # Squad pipeline artifacts
nginx/                  # Reverse proxy config + security headers
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

## Security Patterns

- **Token storage:** Access + refresh tokens are **memory-only** (no localStorage/sessionStorage). Page refresh requires re-login.
- **CORS:** Centralized in `backend/src/common/config/cors.config.ts`. Reads from `CORS_ORIGINS` env var, falls back to defaults.
- **CSP:** Defined in `nginx/security-headers.conf` (frontend) and Helmet in `backend/src/main.ts` (backend API). Must include Google Fonts, Tailwind CDN, Railway domains.
- **Mock tokens:** Require both `NODE_ENV=development` AND `ENABLE_MOCK_TOKENS=true`
- **Swagger:** Only in development, or opt-in via `ENABLE_SWAGGER=true`
- **JWT secrets:** Minimum 32 chars enforced in production
- **Audit trail:** `AuditService` is `@Global()` — inject anywhere, call `auditService.log()` (fire-and-forget, never throws)
- **LGPD deletion:** `POST /api/users/me/deletion-request` — anonymizes PII, soft-deactivates user
- **Frontend logging:** Use `import { logger } from '@/utils/logger'` instead of `console.error` — gated behind `import.meta.env.DEV`
- **Docker:** Frontend nginx runs as non-root `nginx` user. Backend runs as non-root `nestjs` user.
- **Prisma adapter-pg:** Uses type cast `pool as unknown as ConstructorParameters<typeof PrismaPg>[0]` due to `@types/pg` version mismatch between root and adapter

## Deploy Notes

- **Failed migrations:** `backend/start.sh` handles P3009 by marking failed migration as `--applied` (schema already matches DB from prior `db push`)
- **Nginx security headers:** Use `include /etc/nginx/security-headers.conf;` in every `location` block that has `add_header` (nginx doesn't inherit `add_header` into child blocks)
- S3 file URLs require presigned URLs (direct URLs return AccessDenied)
- Notification system must filter by `companyId` for tenant isolation
- Backend uses Bull queues via Redis for async jobs (email, notifications)
- Socket.io uses Redis adapter for multi-instance support
