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
| Source files    | 303   |
| Components     | 145   |
| Pages          | 98    |
| Hooks          | 10    |
| Services       | 37    |
| Total commits  | 272   |

## Pipeline Status

| Phase              | Files | Status      | Handoff |
|--------------------|-------|-------------|---------|
| 00-audit           | 5     | Done        | Yes     |
| 01-discovery       | 0     | Pending     | No      |
| 02-design          | 10    | Done        | Yes     |
| 03-architecture    | 2     | In Progress | No      |
| 04-qa              | 0     | Pending     | No      |
| 05-deploy          | 3     | Done        | Yes     |
| 06-agentic         | 0     | Pending     | No      |
| 07-reports         | 6     | In Progress | -       |
| 08-reviews         | 3     | In Progress | -       |
| 09-security        | 4     | In Progress | -       |
| 10-data            | 0     | Pending     | -       |

## Current Phase

**Development** — Active bug-fix and feature polish cycle on `main` branch.

### Recent Work
- Tenant isolation enforcement in notification system
- Company logo display (sidebar, profile, messages, kanban)
- S3 presigned URLs for logo access
- Admin action menus for brands/suppliers
- Nginx API proxy configuration
- Removal of mock mode / seed data from production
- Bug fixes from user testing session

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

1. **URGENT:** Execute Quick Wins 1-9 (security fixes, ~2 days)
2. Execute Quick Wins 10-15 (performance + validation, ~1 day)
3. Rotate all secrets found in git history
4. Set up frontend testing (Vitest + Testing Library)
5. Enable strict TypeScript + CI pipeline
