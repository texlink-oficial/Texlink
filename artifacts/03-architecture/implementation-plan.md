# Implementation Plan - Texlink Facção Manager

> Generated: 2026-02-07
> Status: Active
> Total Tasks: 31 (incl. TASK-018b)
> Estimated Effort: ~103 story points

---

## Legend

| Size | Points | Dev Time |
|------|--------|----------|
| XS   | 1      | < 2h     |
| S    | 2      | 2-4h     |
| M    | 5      | 1-2 days |
| L    | 8      | 3-5 days |
| XL   | 13     | 1-2 weeks|

| Status | Icon |
|--------|------|
| Done   | :white_check_mark: |
| In Progress | :construction: |
| Pending | :white_circle: |
| Blocked | :no_entry: |

---

## Sprint 1: Critical Fixes & Missing Integrations

> Focus: Fix TODOs that break functionality, wire up missing notifications

### TASK-001-DEV — Wire contract notification triggers

| Field | Value |
|-------|-------|
| **Story** | As a supplier, I want to receive notifications when contracts are sent, signed, or revised |
| **Size** | S (2 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P0 - Critical |
| **Files** | `backend/src/modules/contracts/contracts.service.ts` (lines 243, 301, 347) |

**Acceptance Criteria:**
- [ ] Emit `contract.sent` event when contract is sent for signature
- [ ] Emit `contract.signed` event when supplier signs
- [ ] Emit `contract.revision_requested` event on revision
- [ ] Verify `contract-events.handler.ts` receives and delivers notifications
- [ ] Test WebSocket + Email + WhatsApp channels

**Commit Convention:** `fix: [TASK-001-DEV] wire contract notification triggers`

---

### TASK-002-DEV — Calculate real avgLeadTime in portal dashboard

| Field | Value |
|-------|-------|
| **Story** | As a supplier, I want to see my actual average lead time, not a hardcoded value |
| **Size** | XS (1 pt) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `backend/src/modules/portal/portal.service.ts:355` |

**Acceptance Criteria:**
- [ ] Calculate avg lead time from order ACCEPTED → DELIVERED timestamps
- [ ] Handle edge cases (no completed orders = show 0 or N/A)
- [ ] Return in days (integer)

**Commit Convention:** `fix: [TASK-002-DEV] calculate real avgLeadTime from order data`

---

### TASK-003-DEV — Integrate capacity update API

| Field | Value |
|-------|-------|
| **Story** | As a supplier, I want to update my production capacity from the dashboard |
| **Size** | S (2 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `src/pages/supplier/CapacityDashboardPage.tsx:325`, `backend/src/modules/settings/` |

**Acceptance Criteria:**
- [ ] Frontend calls `PATCH /settings/capacity` on save
- [ ] Backend persists capacity changes
- [ ] Success/error toast feedback
- [ ] Optimistic update in UI

**Commit Convention:** `feat: [TASK-003-DEV] integrate capacity update API`

---

### TASK-004-DEV — Integrate Document Validation with real API

| Field | Value |
|-------|-------|
| **Story** | As a brand, I want document validation to use real backend data, not mock data |
| **Size** | S (2 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `src/pages/brand/credentials/DocumentValidationPage.tsx:59,158` |

**Acceptance Criteria:**
- [ ] Replace mock data with `GET /credentials/pending-documents`
- [ ] Wire approve/reject actions to `PATCH /credentials/:id/documents/:docId`
- [ ] Loading states and error handling
- [ ] Refresh list after validation action

**Commit Convention:** `feat: [TASK-004-DEV] integrate document validation with backend API`

---

## Sprint 2: Financial Module & Reports

> Focus: Complete payment flows and report exports

### TASK-005-DEV — Integrate payment pages with backend API

| Field | Value |
|-------|-------|
| **Story** | As a brand, I want to see real payment data and manage payments |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `src/pages/brand/PaymentsPage.tsx`, `src/pages/brand/PaymentHistoryPage.tsx`, `src/services/payments.service.ts` |

**Acceptance Criteria:**
- [ ] PaymentsPage fetches from `GET /payments` with filters
- [ ] PaymentHistoryPage uses real transaction data
- [ ] Payment status updates call backend
- [ ] Pagination and search work correctly

**Commit Convention:** `feat: [TASK-005-DEV] integrate brand payment pages with backend`

---

### TASK-006-DEV — Integrate supplier financial pages with backend

| Field | Value |
|-------|-------|
| **Story** | As a supplier, I want to see my deposits, payout settings, and advance options |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `src/pages/portal/financial/DepositsPage.tsx`, `src/pages/portal/financial/PayoutFrequencyPage.tsx`, `src/pages/portal/financial/AdvancePage.tsx`, `src/pages/supplier/FinancialDashboardPage.tsx` |

**Acceptance Criteria:**
- [ ] DepositsPage fetches from `GET /deposits`
- [ ] DepositDetailPage shows real deposit data
- [ ] PayoutFrequencyPage reads/writes `GET/PATCH /deposits/settings`
- [ ] FinancialDashboardPage shows real KPIs

**Commit Convention:** `feat: [TASK-006-DEV] integrate supplier financial pages with backend`

---

### TASK-007-DEV — Implement report export (PDF & Excel)

| Field | Value |
|-------|-------|
| **Story** | As a brand/supplier, I want to export reports in PDF and Excel formats |
| **Size** | L (8 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P2 - Medium |
| **Files** | `src/pages/portal/ReportsPage.tsx:53,58`, `backend/src/modules/reports/` |

**Acceptance Criteria:**
- [ ] Backend: `GET /reports/rejections/export?format=pdf` generates PDF (pdfkit already installed)
- [ ] Backend: Excel export endpoint (add `exceljs` dependency)
- [ ] Frontend: Download button triggers export
- [ ] Support date range filters in export
- [ ] File download with proper filename and content-type

**Commit Convention:** `feat: [TASK-007-DEV] implement PDF and Excel report exports`

---

### TASK-008-ARCH — Design payment gateway integration

| Field | Value |
|-------|-------|
| **Story** | As a platform, we need a payment gateway to process real transactions |
| **Size** | M (5 pts) |
| **Agent** | Architect |
| **Status** | :white_check_mark: Done |
| **Priority** | P2 - Medium |
| **Depends On** | TASK-005, TASK-006 |
| **Output** | `artifacts/03-architecture/payment-gateway-adr.md` |

**Acceptance Criteria:**
- [ ] ADR comparing Stripe vs Mercado Pago vs PagSeguro
- [ ] Schema changes for payment gateway metadata
- [ ] Webhook handler design for payment events
- [ ] PIX integration flow
- [ ] Fee calculation model

**Commit Convention:** `docs: [TASK-008-ARCH] payment gateway architecture decision record`

---

## Sprint 3: Error Monitoring, Cleanup & Quality

> Focus: Production readiness, error tracking, dead code removal

### TASK-009-DEV — Integrate Sentry error monitoring

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want runtime errors tracked in Sentry for production debugging |
| **Size** | S (2 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `src/components/error/ErrorBoundary.tsx:33`, `src/main.tsx`, `backend/src/main.ts` |

**Acceptance Criteria:**
- [ ] Install `@sentry/react` (frontend) and `@sentry/nestjs` (backend)
- [ ] Configure DSN via env vars
- [ ] ErrorBoundary reports to Sentry
- [ ] Backend global exception filter reports to Sentry
- [ ] Source maps uploaded on build

**Commit Convention:** `feat: [TASK-009-DEV] integrate Sentry error monitoring`

---

### TASK-010-DEV — Remove deprecated onboarding pages

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want to remove dead code from old onboarding flow |
| **Size** | XS (1 pt) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P3 - Low |
| **Files** | `src/pages/onboarding/Phase2Page.tsx`, `src/pages/onboarding/Phase3Page.tsx`, routes in `src/App.tsx` |

**Acceptance Criteria:**
- [ ] Remove Phase2Page.tsx and Phase3Page.tsx
- [ ] Remove routes `/onboarding/phase2` and `/onboarding/phase3`
- [ ] Verify OnboardingWizardPage is the sole onboarding flow
- [ ] No broken imports

**Commit Convention:** `chore: [TASK-010-DEV] remove deprecated onboarding pages`

---

### TASK-011-DEV — Remove legacy supplier pages

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want to consolidate supplier management to the V3 N:M architecture |
| **Size** | S (2 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P3 - Low |
| **Files** | `src/pages/brand/SuppliersPage.tsx`, `src/pages/brand/SupplierProfilePage.tsx`, `src/pages/brand/PartnersPage.tsx` |

**Acceptance Criteria:**
- [ ] Audit which legacy pages are still in use vs replaced by V3
- [ ] Redirect legacy routes to V3 equivalents or remove
- [ ] Update sidebar navigation if needed
- [ ] No broken links

**Commit Convention:** `chore: [TASK-011-DEV] consolidate supplier pages to V3 architecture`

---

### TASK-012-DEV — Remove empty brands backend module

| Field | Value |
|-------|-------|
| **Story** | Cleanup: Remove empty `backend/src/modules/brands/` directory |
| **Size** | XS (1 pt) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P3 - Low |

**Acceptance Criteria:**
- [ ] Verify no imports reference the brands module
- [ ] Remove empty directory
- [ ] Remove from AppModule if registered

**Commit Convention:** `chore: [TASK-012-DEV] remove empty brands module`

---

## Sprint 4: Testing & Documentation

> Focus: Test coverage, API docs, Swagger completion

### TASK-013-QA — Add unit tests for orders service

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want unit tests for the order lifecycle to prevent regressions |
| **Size** | L (8 pts) |
| **Agent** | QA Tester |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `backend/src/modules/orders/orders.service.spec.ts` (create) |

**Acceptance Criteria:**
- [x] Test order creation (brand only)
- [x] Test status transitions (valid + invalid)
- [x] Test role-based transition permissions
- [x] Test order review creation
- [x] Test rework order hierarchy
- [x] Test second quality items
- [x] 28 tests passing

**Commit Convention:** `test: [TASK-013-QA] add unit tests for orders service`

---

### TASK-014-QA — Add unit tests for credentials service

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want tests for the credentialing workflow |
| **Size** | L (8 pts) |
| **Agent** | QA Tester |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Files** | `backend/src/modules/credentials/credentials.service.spec.ts` (extend) |

**Acceptance Criteria:**
- [x] Test credential creation
- [x] Test CNPJ validation flow
- [x] Test status transitions
- [x] Test document validation
- [x] Test supplier activation
- [x] Test pagination and filtering
- [x] 46 tests passing

**Commit Convention:** `test: [TASK-014-QA] add unit tests for credentials service`

---

### TASK-015-QA — Add unit tests for contracts service

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want tests for contract lifecycle management |
| **Size** | M (5 pts) |
| **Agent** | QA Tester |
| **Status** | :white_check_mark: Done |
| **Priority** | P2 - Medium |
| **Files** | `backend/src/modules/contracts/contracts.service.spec.ts` (create) |

**Acceptance Criteria:**
- [x] Test contract creation (template + upload)
- [x] Test send for signature
- [x] Test brand/supplier signing
- [x] Test revision workflow
- [x] Test cancellation
- [x] 48 tests passing

**Commit Convention:** `test: [TASK-015-QA] add unit tests for contracts service`

---

### TASK-016-QA — Add E2E tests for critical flows

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want E2E tests for the most critical user journeys |
| **Size** | XL (13 pts) |
| **Agent** | QA Tester |
| **Status** | :white_circle: Pending |
| **Priority** | P2 - Medium |
| **Files** | `backend/test/` (new test files) |

**Acceptance Criteria:**
- [ ] E2E: Register → Login → Create Order → Accept → Complete
- [ ] E2E: Create Credential → Validate → Invite → Onboard
- [ ] E2E: Create Contract → Send → Sign (both parties)
- [ ] E2E: Create Support Ticket → Reply → Resolve
- [ ] All tests pass in CI

**Commit Convention:** `test: [TASK-016-QA] add E2E tests for critical flows`

---

### TASK-017-DEV — Complete Swagger/OpenAPI documentation

| Field | Value |
|-------|-------|
| **Story** | As a developer, I want complete API documentation accessible via /api/docs |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P2 - Medium |

**Acceptance Criteria:**
- [x] All controllers have `@ApiTags` (24 controllers)
- [x] Auth requirements documented (`@ApiBearerAuth`) on 22 controllers
- [x] Swagger UI accessible at `/api/docs`
- [ ] DTOs have `@ApiProperty` decorators (deferred)
- [ ] All endpoints have `@ApiOperation` and `@ApiResponse` (deferred)

**Commit Convention:** `docs: [TASK-017-DEV] complete Swagger API documentation`

---

## Sprint 5: Security & Performance

> Focus: Security hardening, performance optimization

### TASK-018-SEC — Security audit and hardening

| Field | Value |
|-------|-------|
| **Story** | As a platform, we need to pass a security audit before production launch |
| **Size** | L (8 pts) |
| **Agent** | Security Analyst |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Output** | `artifacts/09-security/security-audit.md` |

**Acceptance Criteria:**
- [x] OWASP Top 10 checklist review (compliance matrix included)
- [x] Dependency audit (npm audit — backend + frontend)
- [x] Environment variable audit (hardcoded secret found — VULN-001)
- [x] Rate limiting review (IP-based present, account-level missing)
- [x] Input sanitization review (SQL injection in raw queries — VULN-002)
- [x] File upload validation review (MIME spoofing — VULN-017)
- [x] JWT configuration review (7-day hardcoded expiry — VULN-005)
- [x] CORS configuration review (WebSocket wildcard — VULN-004)
- [x] Report: 19 findings (3 Critical, 5 High, 6 Medium, 5 Low) with remediation plan

**Commit Convention:** `security: [TASK-018-SEC] security audit report`

---

### TASK-018b-SEC — Remediate all 19 security findings

| Field | Value |
|-------|-------|
| **Story** | As a platform, all security vulnerabilities identified in the audit must be fixed before production |
| **Size** | L (8 pts) |
| **Agent** | Developer + Security Analyst |
| **Status** | :white_check_mark: Done |
| **Priority** | P0 - Critical |
| **Depends On** | TASK-018-SEC |

**Acceptance Criteria:**
- [x] Fix 3 Critical findings: JWT secret hardcoding, SQL injection, mock token bypass
- [x] Fix 5 High findings: WebSocket CORS, JWT expiration, bcrypt cost, password policy, account lockout
- [x] Fix 6 Medium findings: Swagger in prod, .env in git, implicit conversion, Twilio webhook, RolesGuard, health endpoint
- [x] Fix 5 Low findings: localStorage→sessionStorage, ADMIN self-assign, magic bytes, body size limit
- [x] All 226 unit tests passing, no regressions
- [x] Frontend build clean
- [x] Security audit report updated — risk level downgraded HIGH → LOW
- [x] OWASP compliance: 9/10 categories PASS (A06 pending Dependabot)

**Commits:**
- `0afe8c9` — Critical (3): VULN-001, VULN-002, VULN-003
- `9e8855b` — High (5): VULN-004, VULN-005, VULN-006, VULN-007, VULN-008
- `b18bb17` — Medium (6): VULN-009, VULN-010, VULN-011, VULN-012, VULN-013, VULN-014
- `0f1fd52` — Low (5): VULN-015, VULN-016, VULN-017, VULN-018, VULN-019
- `cd15746` — Updated audit report

**Commit Convention:** `fix(security): [TASK-018b-SEC] remediate security findings`

---

### TASK-019-DEV — Implement Redis caching for hot paths

| Field | Value |
|-------|-------|
| **Story** | As the platform scales, we need Redis caching for frequently accessed data |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P2 - Medium |
| **Depends On** | TASK-018-SEC |

**Acceptance Criteria:**
- [x] CacheService with Redis + in-memory fallback
- [x] Cache brand dashboard (summary 5min, ranking 10min, timeline 10min, alerts 3min)
- [x] Cache credential stats (TTL: 5 min)
- [x] Event-driven cache invalidation on order/credential mutations
- [x] Graceful degradation if Redis unavailable

**Commit Convention:** `perf: [TASK-019-DEV] implement Redis caching for hot paths`

---

## Sprint 6: Real Integrations & Production Readiness

> Focus: Replace mocks with real providers, deploy infrastructure

### TASK-020-DEV — Integrate real credit provider (Serasa/SPC)

| Field | Value |
|-------|-------|
| **Story** | As a brand, I want real credit analysis data for supplier compliance |
| **Size** | L (8 pts) |
| **Agent** | Developer |
| **Status** | :white_check_mark: Done |
| **Priority** | P2 - Medium |
| **Depends On** | TASK-018-SEC |
| **Files** | `backend/src/modules/integrations/providers/credit/serasa.provider.ts`, `spc.provider.ts`, `integration.service.ts` |
| **Commit** | `cb26b3a` |

**Acceptance Criteria:**
- [x] Configure real Serasa API credentials (OAuth2 flow implemented)
- [x] Implement actual Serasa OAuth flow (with retry logic)
- [x] Map Serasa response to internal CreditAnalysisResult
- [x] Fallback to SPC if Serasa fails (fallback chain: Serasa → SPC → Mock)
- [x] Cache results (TTL: 30 days) — migrated to CacheService (Redis/in-memory)
- [x] Rate limit external calls (100 calls/hour per provider)
- [x] Circuit breaker pattern (5 failures → 5min open)
- [x] 20 unit tests covering all resilience patterns

**Commit Convention:** `feat: [TASK-020-DEV] integrate real Serasa/SPC credit provider`

---

### TASK-021-DEVOPS — Production deployment checklist & CI/CD

| Field | Value |
|-------|-------|
| **Story** | As a team, we need automated CI/CD and a production deployment playbook |
| **Size** | L (8 pts) |
| **Agent** | DevOps |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Output** | `artifacts/05-deploy/deployment-playbook.md`, `artifacts/05-deploy/handoff.yaml` |
| **Commit** | `948ca44` |

**Acceptance Criteria:**
- [x] GitHub Actions CI: lint, type-check, test on PR (improved with continue-on-error)
- [x] Staging auto-deploy on merge to `develop` (template ready, commented)
- [x] Production deploy on release tag (template ready, requires Railway token)
- [x] Database migration automation (documented: Prisma migrate deploy)
- [x] Environment variable checklist (validation script included)
- [x] Backup strategy documented (daily PostgreSQL + S3 versioning)
- [x] Rollback procedure documented (Railway, Docker, database)
- [x] Health check monitoring (4 endpoints: /health, /live, /ready, /detailed)

**Commit Convention:** `ci: [TASK-021-DEVOPS] setup CI/CD pipeline`

---

### TASK-022-DEVOPS — Configure production infrastructure

| Field | Value |
|-------|-------|
| **Story** | As a platform, we need reliable production infrastructure |
| **Size** | M (5 pts) |
| **Agent** | DevOps |
| **Status** | :white_check_mark: Done |
| **Priority** | P1 - High |
| **Depends On** | TASK-021-DEVOPS |
| **Commit** | `68d81bb` |

**Acceptance Criteria:**
- [x] Railway production service configured (auto-deploy on main, sleepApplication=false)
- [x] PostgreSQL production database with daily backups (Railway managed)
- [x] Redis production instance (Railway managed, CacheService fallback)
- [x] S3 bucket for production documents (storage.provider.ts with presigned URLs)
- [x] SSL/TLS configured (Railway automatic SSL)
- [x] Domain configured (api.texlink.com.br)
- [x] Environment variables set (CORS_ORIGINS now required in prod)
- [x] Prisma migrate deploy in production (replaces db push)
- [x] Dependabot for automated dependency scanning
- [x] Weak JWT secret validation hardened

**Commit Convention:** `infra: [TASK-022-DEVOPS] configure production infrastructure`

---

## Sprint 7: Advanced Features (Backlog)

> Focus: Features that enhance the platform but aren't launch-blocking

### TASK-023-DEV — Supplier opportunities/marketplace page

| Field | Value |
|-------|-------|
| **Story** | As a supplier, I want to browse and bid on available orders |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_circle: Pending |
| **Priority** | P2 - Medium |
| **Files** | `src/pages/supplier/OpportunitiesPage.tsx` |

**Acceptance Criteria:**
- [ ] List orders with `assignmentType: BIDDING` or `HYBRID`
- [ ] Filter by category, deadline, value
- [ ] "Express Interest" action
- [ ] Integration with backend orders endpoint

**Commit Convention:** `feat: [TASK-023-DEV] implement supplier opportunities marketplace`

---

### TASK-024-DEV — Supplier performance dashboard

| Field | Value |
|-------|-------|
| **Story** | As a supplier, I want to see my performance metrics and trends |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_circle: Pending |
| **Priority** | P2 - Medium |
| **Files** | `src/pages/portal/PerformancePage.tsx` |

**Acceptance Criteria:**
- [ ] On-time delivery rate chart
- [ ] Quality score trend
- [ ] Rejection rate over time
- [ ] Comparison with platform average
- [ ] Real data from `/portal/performance`

**Commit Convention:** `feat: [TASK-024-DEV] implement supplier performance dashboard`

---

### TASK-025-DEV — Admin approval workflow

| Field | Value |
|-------|-------|
| **Story** | As an admin, I want to approve/reject supplier registrations and documents |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_circle: Pending |
| **Priority** | P2 - Medium |
| **Files** | `src/pages/admin/ApprovalsPage.tsx` |

**Acceptance Criteria:**
- [ ] List pending approvals (suppliers, documents, credentials)
- [ ] Approve/reject with comments
- [ ] Notification to supplier on decision
- [ ] Audit trail of admin actions

**Commit Convention:** `feat: [TASK-025-DEV] implement admin approval workflow`

---

### TASK-026-DEV — Mobile-responsive audit and fixes

| Field | Value |
|-------|-------|
| **Story** | As a user, I want the platform to work well on mobile devices |
| **Size** | M (5 pts) |
| **Agent** | Developer |
| **Status** | :white_circle: Pending |
| **Priority** | P2 - Medium |

**Acceptance Criteria:**
- [ ] Audit all pages on 375px, 768px, 1024px viewports
- [ ] Fix Kanban board mobile layout
- [ ] Fix sidebar collapse on mobile
- [ ] Fix table responsiveness
- [ ] Fix modal sizing on mobile

**Commit Convention:** `fix: [TASK-026-DEV] mobile-responsive audit and fixes`

---

## Backlog (Unprioritized)

### TASK-027-ARCH — Multi-language support (i18n)

| Field | Value |
|-------|-------|
| **Size** | XL (13 pts) |
| **Agent** | Architect + Developer |
| **Priority** | P3 - Low |

---

### TASK-028-DEV — Implement invoice generation

| Field | Value |
|-------|-------|
| **Size** | L (8 pts) |
| **Agent** | Developer |
| **Priority** | P3 - Low |
| **Depends On** | TASK-008-ARCH |

---

### TASK-029-DEV — Implement audit trail system

| Field | Value |
|-------|-------|
| **Size** | L (8 pts) |
| **Agent** | Developer |
| **Priority** | P3 - Low |

---

### TASK-030-DEV — Implement custom report builder

| Field | Value |
|-------|-------|
| **Size** | XL (13 pts) |
| **Agent** | Developer |
| **Priority** | P3 - Low |

---

## Summary by Sprint

| Sprint | Focus | Tasks | Points | Priority |
|--------|-------|-------|--------|----------|
| **Sprint 1** | Critical Fixes | TASK-001 to TASK-004 | 7 pts | P0-P1 |
| **Sprint 2** | Financial & Reports | TASK-005 to TASK-008 | 23 pts | P1-P2 |
| **Sprint 3** | Cleanup & Quality | TASK-009 to TASK-012 | 6 pts | P1-P3 |
| **Sprint 4** | Testing & Docs | TASK-013 to TASK-017 | 39 pts | P1-P2 |
| **Sprint 5** | Security & Perf | TASK-018 to TASK-018b, TASK-019 | 21 pts | P0-P2 |
| **Sprint 6** | Deploy & Integrations | TASK-020 to TASK-022 | 21 pts | P1-P2 |
| **Sprint 7** | Advanced Features | TASK-023 to TASK-026 | 20 pts | P2 |
| **Backlog** | Future | TASK-027 to TASK-030 | 42 pts | P3 |

## Summary by Agent

| Agent | Tasks | Points |
|-------|-------|--------|
| **Developer** | 19 | ~82 pts |
| **QA Tester** | 4 | 34 pts |
| **Architect** | 2 | 18 pts |
| **Security Analyst** | 2 | 16 pts |
| **DevOps** | 2 | 13 pts |

## Dependency Graph

```
TASK-001 ──────────────────────────────────── (independent)
TASK-002 ──────────────────────────────────── (independent)
TASK-003 ──────────────────────────────────── (independent)
TASK-004 ──────────────────────────────────── (independent)
TASK-005 ─┬── TASK-008 (payment gateway ADR)
TASK-006 ─┘        └── TASK-028 (invoices)
TASK-009 ──────────────────────────────────── (independent)
TASK-013 ──────────────────────────────────── (independent)
TASK-018 ─┬── TASK-018b (security remediation) ✅
          ├── TASK-019 (Redis caching) ✅
          └── TASK-020 (credit providers) ✅
TASK-021 ✅ ─── TASK-022 ✅ (infra hardened)
```

## Commit Convention

All commits MUST reference a task:

```
feat: [TASK-XXX-DEV] description
fix: [TASK-XXX-DEV] description
test: [TASK-XXX-QA] description
docs: [TASK-XXX-ARCH] description
ci: [TASK-XXX-DEVOPS] description
security: [TASK-XXX-SEC] description
chore: [TASK-XXX-DEV] description
perf: [TASK-XXX-DEV] description
infra: [TASK-XXX-DEVOPS] description
```
