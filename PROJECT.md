# PROJECT: Texlink - Faccao Manager

## Overview

| Field           | Value                                          |
|-----------------|------------------------------------------------|
| **Project**     | Texlink Faccao Manager                         |
| **Client**      | Texlink                                        |
| **Repository**  | https://github.com/texlink-oficial/Texlink.git |
| **Type**        | Brownfield (existing codebase)                 |
| **Start Date**  | 2026-01-13                                     |
| **Version**     | 0.0.0                                          |

## Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + PostCSS
- **State/Data:** TanStack React Query + Axios
- **Forms:** React Hook Form
- **Routing:** React Router DOM 7
- **Charts:** Recharts
- **Realtime:** Socket.io Client
- **Icons:** Lucide React
- **Offline:** Dexie (IndexedDB)
- **Monitoring:** Sentry

### Backend
- **Framework:** NestJS
- **Language:** TypeScript
- **ORM:** Prisma (PostgreSQL)
- **Auth:** Passport + JWT
- **Storage:** AWS S3
- **Email:** SendGrid
- **SMS:** Twilio
- **Cache:** Redis + Bull (queues)
- **Realtime:** Socket.io + Redis Adapter
- **Docs:** Swagger
- **PDF:** PDFKit
- **Excel:** ExcelJS
- **Monitoring:** Sentry

### Infrastructure
- **Proxy:** Nginx
- **Container:** Docker
- **Domain:** app.texlink.com.br

## Codebase Metrics

| Metric         | Count |
|----------------|-------|
| Source files    | 320   |
| Components     | 145   |
| Pages          | 105   |
| Hooks          | 10    |
| Services       | 38    |
| Total commits  | 389   |

## Pipeline Status

| Phase              | Files | Status      | Handoff |
|--------------------|-------|-------------|---------|
| 00-audit           | 5     | Done        | Yes     |
| 01-discovery       | 0     | Pending     | No      |
| 02-design          | 10    | Done        | Yes     |
| 03-architecture    | 3     | In Progress | No      |
| 04-qa              | 5     | Done        | Yes     |
| 05-deploy          | 4     | Done        | Yes     |
| 06-agentic         | 0     | Pending     | No      |
| 07-reports         | 6     | In Progress | -       |
| 08-reviews         | 19    | In Progress | -       |
| 09-security        | 8     | Done        | Yes     |
| 10-data            | 0     | Pending     | -       |

## Current Phase

**QA Planning** — Plano de testes abrangente criado em 2026-03-13. Cobertura atual: ~15% backend, ~2% frontend. Execução da Fase 1 de testes pendente de aprovação.

### Recent Work
- Tenant isolation enforcement in notification system
- Company logo display (sidebar, profile, messages, kanban)
- S3 presigned URLs for logo access
- Admin action menus for brands/suppliers
- Nginx API proxy configuration
- Removal of mock mode / seed data from production
- Bug fixes from user testing session (all 37 items addressed, 5 sprints)
- Gemini Vision API for document expiration extraction
- Forgot password full-stack flow (PasswordReset model, 24h token, email)
- Settings page 3-tab redesign (Perfil / Equipe / Empresa)
- SuperAdmin ViewAs role-gated route access
- Refresh token persistence in sessionStorage
- Inline editing of document expiration dates (admin)
- Capacity module with working days utility

## Key Decisions

1. Multi-tenant architecture with `companyId` isolation
2. AWS S3 for file/logo storage with presigned URLs
3. NestJS backend with Prisma ORM on PostgreSQL
4. Redis for caching and real-time socket adapter
5. Bull queues for async jobs (email, notifications)

## Audit Results (2026-02-12)

- **Score:** 45/100 (RED) — Verdict: **STABILIZE**
- **Issues Found:** 68 total (13 P0, 18 P1, 25 P2, 12 P3)
- **Critical:** 7 IDOR/access control vulnerabilities, JWT 7d expiry, zero frontend tests
- **Reports:** See `artifacts/00-audit/` for full details

## Next Steps

1. **URGENT:** Aprovar e iniciar Fase 1 do plano de testes (testes P0 de segurança e multi-tenant)
2. Configurar `vitest.config.ts` com cobertura e instalar MSW
3. Criar `src/test/setup.ts` com mocks globais
4. Criar `PermissionsGuard.spec.ts` (bloqueador crítico — sem testes de isolamento)
5. Criar testes de integração de isolamento multi-tenant (2 tenants, verificar 403)
6. Configurar Playwright para testes E2E
7. Executar Fase 2–4 conforme plano em `artifacts/04-qa/test-plan-comprehensive.md`
