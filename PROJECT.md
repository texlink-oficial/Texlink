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

| Metric              | Count |
|---------------------|-------|
| Source files         | 324   |
| Components           | 145   |
| Pages                | 104   |
| Hooks                | 10    |
| Services             | 37    |
| Total commits        | 392   |
| Frontend test files  | 5     |
| Backend test files   | 17    |
| Total tests          | 410   |

## Pipeline Status

| Phase              | Files | Status      | Handoff |
|--------------------|-------|-------------|---------|
| 00-audit           | 5     | Done        | Yes     |
| 01-discovery       | 0     | Pending     | No      |
| 02-design          | 10    | Done        | Yes     |
| 03-architecture    | 3     | In Progress | No      |
| 04-qa              | 7     | Done        | Yes     |
| 05-deploy          | 4     | Done        | Yes     |
| 06-agentic         | 0     | Pending     | No      |
| 07-reports         | 6     | In Progress | -       |
| 08-reviews         | 19    | In Progress | -       |
| 09-security        | 8     | Done        | Yes     |
| 10-data            | 0     | Pending     | -       |

## Current Phase

**QA Phase 2 Week 4 Block 2 Complete** — Playwright instalado e stubs E2E criados em 2026-03-14. playwright.config.ts configurado, helper de autenticação, 2 suites de testes E2E (order-lifecycle.spec.ts e contracts.spec.ts) com 6 describes e 28 casos de teste cobrindo TC-E2E-030 a TC-E2E-042. Testes prontos para execução quando o ambiente estiver disponível.

**QA Phase 1 Complete (2026-03-13)** — 157 novos testes adicionados (64 frontend + 93 backend), 24 testes pré-existentes corrigidos. Total: 410 testes, todos passando.

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

1. Executar `npx playwright install chromium` e criar usuários de seed para habilitar execução E2E
2. Executar Fase 2 do plano de testes: chat, notifications, credentials, admin (Semana 5)
3. Criar testes de segurança IDOR para todas as entidades críticas
4. Executar Fases 3-4 conforme plano em `artifacts/04-qa/test-plan-comprehensive.md`
5. Configurar GitHub Actions para CI/CD com thresholds de cobertura e execução da suite E2E
