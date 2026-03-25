# Security Remediation Plan - Texlink Faccao Manager

**Date**: 2026-03-25
**Analyst**: Security Analyst Agent (STRAAS Squad)
**Scope**: All P0 and P1 security issues from audits dated 2026-02-07, 2026-02-12, and 2026-02-22
**Methodology**: Cross-referenced 3 audit reports against current codebase state

---

## Executive Summary

After auditing the codebase against all documented security findings, the current state is significantly improved from the original 45/100 (RED) score. Many critical issues from the 2026-02-07 audit have been resolved (JWT secret hardening, SQL injection, mock token gating, bcrypt cost factor, password policy, account lockout, RBAC on orders, etc.). However, **8 P0 and 10 P1 issues remain open** and require remediation before production launch.

| Severity | Originally Found | Now Resolved | Still Open |
|----------|-----------------|--------------|------------|
| P0       | 13              | 5            | 8          |
| P1       | 18              | 8            | 10         |
| **Total** | **31**         | **13**       | **18**     |

---

## P0 Issues (Fix within 48 hours)

---

### SEC-REM-001: Production Start Script Uses `--accept-data-loss`

- **ID**: SEC-P1-003 / VULN-011
- **Severity**: P0
- **OWASP**: A05 - Security Misconfiguration
- **Current State**: `backend/start.sh:31` runs `npx prisma db push --accept-data-loss` in **all** environments including production and staging. Line 33 also runs it for development. This flag can silently drop columns and data when the schema diverges from the database.
- **Required Fix**:
  - **File**: `backend/start.sh`
  - Remove `prisma db push --accept-data-loss` from the production/staging branch entirely. The `prisma migrate deploy` on line 11 already handles migrations. The `db push` on line 31 is redundant and dangerous.
  - For development, keep `db push` but remove `--accept-data-loss` or require an explicit `ALLOW_DATA_LOSS=true` env var.

```diff
# backend/start.sh lines 29-34
- # Sync schema to ensure DB matches schema.prisma
- echo "Syncing database schema..."
- npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
-else
-  npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
+else
+  # Development only: push schema changes without migrations
+  npx prisma db push --schema=./prisma/schema.prisma
```

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Deploy to staging and verify migrations apply cleanly without `db push`. Verify development environment still works with `db push` (without `--accept-data-loss`).

---

### SEC-REM-002: Nginx Security Headers Dropped in Location Blocks

- **ID**: SEC-F008
- **Severity**: P0
- **OWASP**: A05 - Security Misconfiguration
- **Current State**: `nginx/nginx.conf` defines security headers (X-Frame-Options, CSP, HSTS, etc.) at the `http` level (lines 40-46). However, nginx `add_header` is NOT inherited when child `location` blocks also use `add_header`. Two blocks lose all security headers:
  - `/assets` (line 66-69): adds `Cache-Control` and `Expires`, losing all security headers
  - `~* \.html$` (line 93-95): adds `Cache-Control`, losing all security headers
  - `/health` (line 62): adds `Content-Type`, losing all security headers
- **Required Fix**:
  - **File**: `nginx/nginx.conf`
  - Create an `include` snippet file with all security headers and include it in every `location` block that uses `add_header`.
  - Alternatively, repeat all security headers in each affected location block.

```nginx
# nginx/security-headers.conf (new file)
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.amazonaws.com; font-src 'self'; connect-src 'self' https://*.amazonaws.com; media-src 'self' https://*.amazonaws.com blob:; frame-src https://www.youtube.com https://player.vimeo.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

```nginx
# Then in each location block that uses add_header:
location /assets {
    include /etc/nginx/security-headers.conf;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

- **Assigned to**: backend-dev
- **Effort**: S
- **Test Required**: Use `curl -I` on static assets and HTML pages to verify all 7 security headers are present. Check `/health`, `/assets/*`, and `/*.html` responses specifically.

---

### SEC-REM-003: Mock Token Check Uses Negative Environment Guard

- **ID**: SEC-P1-002 / VULN-008
- **Severity**: P0
- **OWASP**: A07 - Identification and Authentication Failures
- **Current State**: Both `backend/src/modules/chat/chat.gateway.ts:111` and `backend/src/modules/notifications/notifications.gateway.ts:94` accept mock tokens when `process.env.NODE_ENV === 'development'`. While this is better than the original `!== 'production'`, it still relies on NODE_ENV being correctly set. If NODE_ENV is unset or set to any value other than `'development'` or `'production'` (e.g., `'staging'`, `'test'`), mock tokens are correctly rejected. However, `NODE_ENV === 'development'` is only safe if we trust that production never gets this value.
- **Required Fix**:
  - **Files**: `backend/src/modules/chat/chat.gateway.ts`, `backend/src/modules/notifications/notifications.gateway.ts`
  - Add a secondary guard requiring an explicit `ENABLE_MOCK_TOKENS=true` environment variable. This is defense-in-depth against misconfigured NODE_ENV.

```typescript
// Replace the current check:
if (
  (token as string).startsWith('mock-token-') &&
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_MOCK_TOKENS === 'true'
) {
```

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Verify mock tokens work in development with `ENABLE_MOCK_TOKENS=true`. Verify mock tokens are rejected when either variable is missing. Verify production rejects mock tokens.

---

### SEC-REM-004: Refresh Token Stored in sessionStorage

- **ID**: VULN-001 / SEC-F001
- **Severity**: P0
- **OWASP**: A07 - Identification and Authentication Failures
- **Current State**: PARTIALLY FIXED. Access token is now stored in memory (variable `_accessToken`), which is good. However, refresh token is still persisted in `sessionStorage` under key `__rt` (`src/services/auth.service.ts:64`). While sessionStorage is tab-scoped (better than the original localStorage), it is still accessible to any JavaScript running in the page context via XSS.
- **Required Fix**:
  - **Phase 1 (immediate)**: Move refresh token to memory-only. Users will need to re-login when refreshing the page, but this eliminates XSS token theft.
  - **Phase 2 (post-launch)**: Migrate to httpOnly cookies for both access and refresh tokens.

  **File**: `src/services/auth.service.ts`

```diff
-const RT_KEY = '__rt';
 let _accessToken: string | null = null;
-let _refreshToken: string | null = sessionStorage.getItem(RT_KEY);
+let _refreshToken: string | null = null;

 // In login/register methods, remove:
-if (_refreshToken) sessionStorage.setItem(RT_KEY, _refreshToken);
+// Refresh token stays in memory only

 // In setTokens, remove:
-if (refreshToken) sessionStorage.setItem(RT_KEY, refreshToken);
-else sessionStorage.removeItem(RT_KEY);
+// No persistence needed

 // In clearTokens/logout, remove:
-sessionStorage.removeItem(RT_KEY);
+// No persistence to clear
```

  **Trade-off**: Page refresh will log users out. This is acceptable for a B2B application where security outweighs convenience. A silent `/auth/refresh` call on page load using an httpOnly cookie (Phase 2) would restore the UX.

- **Assigned to**: frontend-dev
- **Effort**: S (Phase 1), L (Phase 2)
- **Test Required**: Verify login works. Verify page refresh logs user out. Verify no tokens appear in sessionStorage or localStorage after login. Verify XSS simulation cannot extract tokens.

---

### SEC-REM-005: Docker Frontend Container Runs as Root

- **ID**: SEC-F013
- **Severity**: P0
- **OWASP**: A05 - Security Misconfiguration
- **Current State**: `Dockerfile` stage 3 (nginx:alpine runner) does not set a non-root user. The nginx process runs as root inside the container, increasing the blast radius of any container escape.
- **Required Fix**:
  - **File**: `Dockerfile` (after line 51)

```dockerfile
# Stage 3: Production - Nginx
FROM nginx:alpine AS runner

# ...existing setup...

# Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx
```

  Also update the `listen` directive in nginx.conf to use a port >= 1024 (e.g., 8080) since non-root users cannot bind to ports below 1024. The current template uses `${PORT}` which defaults to 8080, so this should already work.

- **Assigned to**: backend-dev
- **Effort**: S
- **Test Required**: Build Docker image, verify nginx starts successfully as non-root. Verify static assets are served. Verify health check passes.

---

### SEC-REM-006: Seed Script Runs in Production via start.sh

- **ID**: FE-P0-003 (partial) / SEC-F004
- **Severity**: P0
- **OWASP**: A07 - Identification and Authentication Failures
- **Current State**: `backend/start.sh:37` runs `npx prisma db seed` unconditionally in all environments. While `backend/prisma/seed.ts:8` has a production guard that exits with error, the `|| echo "Seed completed or skipped"` on line 37 of start.sh swallows the error and continues. If the seed file is ever modified to remove the guard, demo accounts with password `demo123` would be created in production.
- **Required Fix**:
  - **File**: `backend/start.sh`

```diff
-echo "Running database seed..."
-npx prisma db seed || echo "Seed completed or skipped"
+# Only seed in development
+if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "staging" ]; then
+  echo "Running database seed (development only)..."
+  npx prisma db seed || echo "Seed completed or skipped"
+else
+  echo "Skipping seed in $NODE_ENV environment"
+fi
```

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Verify seed does NOT run when NODE_ENV=production. Verify seed runs in development. Check that no demo accounts exist in production database.

---

### SEC-REM-007: CORS Origins Logged at Startup in Production

- **ID**: SEC-F009
- **Severity**: P0 (elevated from medium - leaks allowed domains in shared logging)
- **OWASP**: A09 - Security Logging Failures
- **Current State**: `backend/src/main.ts:45` logs `CORS origins configured: ${JSON.stringify(corsOrigins)}` unconditionally, including in production. This reveals allowed domains in log aggregation systems.
- **Required Fix**:
  - **File**: `backend/src/main.ts`

```diff
-logger.log(`CORS origins configured: ${JSON.stringify(corsOrigins)}`);
+if (process.env.NODE_ENV !== 'production') {
+  logger.log(`CORS origins configured: ${JSON.stringify(corsOrigins)}`);
+} else {
+  logger.log(`CORS origins configured: ${corsOrigins.length} origin(s)`);
+}
```

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Check production logs do not contain full CORS origin URLs.

---

### SEC-REM-008: Helmet CSP Disabled in Non-Production Backend

- **ID**: SEC-F015
- **Severity**: P0 (elevated - staging is publicly accessible)
- **OWASP**: A05 - Security Misconfiguration
- **Current State**: `backend/src/main.ts:36` sets `contentSecurityPolicy: false` when NODE_ENV is not production. If staging is publicly accessible (e.g., Railway), backend API responses have no CSP protection.
- **Required Fix**:
  - **File**: `backend/src/main.ts`

```diff
 app.use(
   helmet({
-    contentSecurityPolicy:
-      process.env.NODE_ENV === 'production' ? undefined : false,
+    contentSecurityPolicy: {
+      directives: {
+        defaultSrc: ["'self'"],
+        scriptSrc: ["'self'"],
+        styleSrc: ["'self'", "'unsafe-inline'"],
+        imgSrc: ["'self'", "data:", "https://*.amazonaws.com"],
+        connectSrc: ["'self'", "https://*.amazonaws.com"],
+        fontSrc: ["'self'"],
+        objectSrc: ["'none'"],
+        frameAncestors: ["'self'"],
+      },
+    },
     crossOriginEmbedderPolicy: false,
   }),
 );
```

- **Assigned to**: backend-dev
- **Effort**: S
- **Test Required**: Verify CSP header present in API responses for all environments. Verify frontend app still loads correctly with the CSP.

---

## P1 Issues (Fix within 1 week)

---

### SEC-REM-009: WebSocket CORS Reads env Directly Instead of ConfigService

- **ID**: SEC-P2-003 / VULN-016
- **Severity**: P1
- **OWASP**: A05 - Security Misconfiguration
- **Current State**: Both `backend/src/modules/chat/chat.gateway.ts:45` and `backend/src/modules/notifications/notifications.gateway.ts:31` read `process.env.CORS_ORIGINS` directly instead of using ConfigService. This creates a configuration divergence risk where the main app CORS and WebSocket CORS could differ.
- **Required Fix**:
  - **Files**: `backend/src/modules/chat/chat.gateway.ts`, `backend/src/modules/notifications/notifications.gateway.ts`
  - WebSocket gateways in NestJS resolve decorator options at import time, before DI is available. The fix is to use `afterInit()` to reconfigure CORS from ConfigService, or read from configuration at startup. A pragmatic solution: extract CORS config to a shared utility.

```typescript
// backend/src/common/config/cors.config.ts (new file)
export function getCorsOrigins(): string[] {
  return process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3001',
  ];
}
```

Use this in both gateways and in `main.ts` CORS setup to ensure consistency.

- **Assigned to**: backend-dev
- **Effort**: S
- **Test Required**: Verify WebSocket connections work from allowed origins. Verify connections are rejected from disallowed origins.

---

### SEC-REM-010: Refresh Token Secret Fallback Weakens Security

- **ID**: SEC-001 / SEC-F007
- **Severity**: P1
- **OWASP**: A02 - Cryptographic Failures
- **Current State**: FIXED. `backend/src/modules/auth/auth.service.ts:41` now uses `this.configService.getOrThrow<string>('jwt.refreshSecret')` which throws if the variable is missing. The original `|| jwt.secret + '-refresh'` fallback has been removed. This issue is **RESOLVED**.
- **Status**: CLOSED

---

### SEC-REM-011: Console.log Statements Leak Data in Production Frontend

- **ID**: SEC-F006 / FE-P2-001
- **Severity**: P1
- **OWASP**: A09 - Security Logging Failures
- **Current State**: PARTIALLY FIXED. Most `console.log` statements in the frontend are now gated behind `import.meta.env.DEV` (e.g., `useChatSocket.ts`, `useNotificationSocket.ts`, `Dashboard.tsx`). However, several `console.error` calls remain ungated and will execute in production:
  - `src/pages/brand/credentials/CredentialDetailsPage.tsx:78,89,100,111,127` - 5 ungated console.error calls
  - `src/hooks/useChatSocket.ts:125,162,197,223,235,240` - 6 ungated console.error calls
  - `src/hooks/useNotificationSocket.ts:68,72,105` - 3 ungated console.error calls
  - `src/pages/admin/Dashboard.tsx:87` - 1 ungated console.error

  Total: ~15 ungated `console.error` calls that may leak error details in production.

  Additionally, there are 24 `console.log` calls across the frontend; most appear properly gated.

- **Required Fix**:
  - Create a logger utility and replace all console.error calls:

  **File**: `src/utils/logger.ts` (new)
```typescript
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
    // In production, errors go to Sentry only (already configured)
  },
};
```

  - Replace all `console.error(...)` in the affected files with `logger.error(...)`.
  - Add an ESLint rule (`no-console`) to prevent future regressions.

- **Assigned to**: frontend-dev
- **Effort**: S
- **Test Required**: Build production bundle, open in browser, trigger errors, verify no console output. Verify Sentry still captures errors.

---

### SEC-REM-012: `@Param` Decorators Without `ParseUUIDPipe`

- **ID**: BE-P1-002
- **Severity**: P1
- **OWASP**: A03 - Injection
- **Current State**: 22 `@Param()` decorators across backend controllers lack `ParseUUIDPipe` validation. While Prisma ORM prevents SQL injection, invalid UUIDs cause unhandled Prisma errors instead of clean 400 responses, and could potentially be used for probing.
- **Required Fix**:
  - All `@Param('id')` and similar UUID parameters must use `@Param('id', ParseUUIDPipe)`.
  - Run: `grep -rn "@Param(" backend/src/ --include="*.ts" | grep -v "ParseUUIDPipe"` to find all instances.
  - The following controllers have already been fixed with ParseUUIDPipe: companies, contracts, payments, ratings, upload, orders.
  - Remaining controllers to check: admin, brands, suppliers, partners, team, settings, chat, notifications, credentials, support-tickets, reports.
- **Assigned to**: backend-dev
- **Effort**: S
- **Test Required**: Send malformed UUIDs (e.g., `abc`, `../etc/passwd`) to all parameterized endpoints, verify 400 Bad Request response.

---

### SEC-REM-013: NPM Dependency Vulnerabilities

- **ID**: SEC-F011
- **Severity**: P1
- **OWASP**: A06 - Vulnerable and Outdated Components
- **Current State**:
  - **Frontend**: Vulnerabilities including 1 high (axios DoS via __proto__ in mergeConfig - GHSA-43fc-jf86-j433) and 1 moderate (ajv ReDoS). The axios vulnerability is in a direct runtime dependency.
  - **Backend**: 36 vulnerabilities (2 critical, 15 high, 16 moderate, 3 low). Critical: `qs` denial-of-service and `socket.io-parser` unbounded binary attachments. Most high-severity items are in dev dependencies (@nestjs/cli, webpack).
- **Required Fix**:
  1. **Immediate**: Run `npm audit fix` in both root and backend directories.
  2. **Frontend**: Update axios to latest (`npm install axios@latest`) to fix the DoS vulnerability.
  3. **Backend**: Update `socket.io-parser` (runtime dependency, high severity). Run `npm audit fix` for automatic fixes.
  4. **Post-launch**: Set up Dependabot or Renovate for automated dependency updates.
- **Assigned to**: backend-dev (backend), frontend-dev (frontend)
- **Effort**: S (audit fix) + M (manual updates for breaking changes)
- **Test Required**: Run `npm audit` after fixes and verify 0 critical and 0 high vulnerabilities in runtime dependencies. Run full test suite to verify no regressions.

---

### SEC-REM-014: No JWT Secret Minimum Length Validation

- **ID**: SEC-P2-004 / VULN-012
- **Severity**: P1
- **OWASP**: A02 - Cryptographic Failures
- **Current State**: `backend/src/config/configuration.ts` validates against a list of known weak secrets (line 23-34) but does NOT enforce minimum length. A short secret (e.g., 8 characters) would pass validation but be brute-forceable.
- **Required Fix**:
  - **File**: `backend/src/config/configuration.ts`

```typescript
// Add after the weakSecrets check (line 34):
if ((process.env.JWT_SECRET || '').length < 32) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters long in production',
  );
}
if ((process.env.JWT_REFRESH_SECRET || '').length < 32) {
  throw new Error(
    'JWT_REFRESH_SECRET must be at least 32 characters long in production',
  );
}
```

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Verify application fails to start in production with a JWT_SECRET shorter than 32 characters. Verify it starts correctly with a 64+ character secret.

---

### SEC-REM-015: Swagger Accessible in Staging

- **ID**: SEC-F014
- **Severity**: P1
- **OWASP**: A05 - Security Misconfiguration
- **Current State**: `backend/src/main.ts:77` gates Swagger behind `NODE_ENV !== 'production'`. If staging is publicly accessible, the full API schema (all endpoints, DTOs, auth requirements) is exposed.
- **Required Fix**:
  - **File**: `backend/src/main.ts`

```diff
-if (process.env.NODE_ENV !== 'production') {
+if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SWAGGER === 'true') {
```

  This restricts Swagger to development by default, with an opt-in for staging via `ENABLE_SWAGGER=true`.

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Verify `/api/docs` returns 404 in staging (without ENABLE_SWAGGER). Verify it works in development. Verify the opt-in flag works.

---

### SEC-REM-016: LGPD Right-to-Deletion Not Implemented

- **ID**: SEC-P3-005 (elevated to P1 for legal compliance)
- **Severity**: P1
- **OWASP**: N/A (Regulatory - LGPD/GDPR)
- **Current State**: No endpoint exists for users to request deletion of their data. The LGPD (Lei Geral de Protecao de Dados) requires this for Brazilian operations.
- **Required Fix**:
  - Create `DELETE /api/users/me` endpoint that:
    1. Anonymizes user data (name -> "Usuario Removido", email -> hash@deleted.texlink.com)
    2. Soft-deletes the user account (set `isActive = false`)
    3. Removes PII from chat messages (replace sender name)
    4. Generates an audit log entry
    5. Sends confirmation email
  - Do NOT hard-delete records to maintain referential integrity for orders/contracts.
- **Assigned to**: backend-dev
- **Effort**: L
- **Test Required**: Request deletion, verify user data is anonymized. Verify user cannot login. Verify orders/contracts still display correctly with anonymized user references.

---

### SEC-REM-017: No Security Audit Trail for Sensitive Operations

- **ID**: SEC-F015 (compliance checklist gap)
- **Severity**: P1
- **OWASP**: A09 - Security Logging and Monitoring Failures
- **Current State**: The application uses Sentry for error tracking and has basic logging via NestJS Logger. However, there is no dedicated security audit trail for sensitive operations like:
  - Login attempts (successful and failed)
  - Password changes
  - Role changes
  - Contract signing
  - Payment status changes
  - Admin actions (company status changes, user management)
- **Required Fix**:
  - Create a `SecurityAuditService` that logs structured events to a dedicated audit log table.
  - **File**: New module `backend/src/modules/audit/`

```typescript
// Minimum viable audit log schema
model AuditLog {
  id        String   @id @default(uuid())
  action    String   // LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_CHANGED, etc.
  userId    String?
  ipAddress String?
  userAgent String?
  metadata  Json?    // Additional context
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

- **Assigned to**: backend-dev
- **Effort**: M
- **Test Required**: Verify login attempts generate audit entries. Verify password changes are logged. Verify audit logs are queryable by admin.

---

### SEC-REM-018: `credentials: true` in CORS Without Cookie Auth

- **ID**: VULN-010 / SEC-F010
- **Severity**: P1
- **OWASP**: A01 - Broken Access Control
- **Current State**: `backend/src/main.ts:48` sets `credentials: true` in CORS configuration. The application uses Bearer token authentication (not cookies), so `credentials: true` is unnecessary. It signals browsers to include cookies in cross-origin requests, which increases the attack surface if cookie-based auth is ever accidentally introduced.
- **Required Fix**:
  - **File**: `backend/src/main.ts`
  - Remove `credentials: true` from CORS config **if** the team is NOT planning to migrate to httpOnly cookies soon. If the cookie migration (SEC-REM-004 Phase 2) is planned, keep it but add CSRF protection.

```diff
 app.enableCors({
   origin: corsOrigins,
-  credentials: true,
   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-View-As-Company'],
 });
```

  Also update both WebSocket gateways to match:
  - `backend/src/modules/chat/chat.gateway.ts:49`: remove `credentials: true`
  - `backend/src/modules/notifications/notifications.gateway.ts:35`: remove `credentials: true`

- **Assigned to**: backend-dev
- **Effort**: XS
- **Test Required**: Verify API calls from frontend work without `credentials: true`. Verify WebSocket connections still work.

---

## Previously Reported Issues - Now Resolved

The following P0/P1 issues from the original audits have been verified as **RESOLVED** in the current codebase:

| Original ID | Description | Evidence of Fix |
|-------------|-------------|-----------------|
| SEC-P0-001 | Hardcoded JWT secret fallback | `auth.module.ts:20-22` throws Error if missing |
| SEC-P0-002 | JWT 7-day hardcoded expiry | `auth.module.ts:26` reads from config, defaults to `'1h'` |
| SEC-P0-003 | Companies endpoint IDOR | `companies.service.ts:89-96` checks `isMember` |
| BE-P0-001 | Registration race condition | `auth.service.ts:61` uses `$transaction` |
| BE-P0-002 | Payment update no access control | `payments.service.ts:102-112` checks brand/supplier membership |
| BE-P0-003 | Order reviews no access check | `orders.service.ts:1328` calls `verifyOrderAccess` |
| BE-P0-004 | Second-quality items no access check | `orders.service.ts:1555` calls `verifyOrderAccess` |
| SEC-P0-004 | Contract findById IDOR | `contracts.service.ts:784-798` checks `companyUser` membership |
| SEC-P0-005 | Payments getOrderPayments IDOR | `payments.controller.ts:47-54` has RolesGuard + passes userId |
| SEC-P0-006 | Ratings IDOR | `ratings.service.ts:88-108` checks membership or business relationship |
| FE-P0-003 | Demo credentials in prod bundle | `mockMode.ts:6` gated behind `import.meta.env.DEV` |
| SEC-P1-001 | Upload missing file validation | `upload.controller.ts:33-43` has ParseFilePipe with validators |
| SEC-001 | Refresh secret fallback | `auth.service.ts:41` uses `getOrThrow` |
| SEC-002 | No session invalidation after password change | `jwt.strategy.ts:79-85` checks `passwordChangedAt` vs `iat` |
| SEC-003 | Upload endpoint missing tenant check | `upload.service.ts:79-100` has `verifyOrderAccess` |
| VULN-002 | Hardcoded passwords in docker-compose | All compose files now use `${VAR}` references |
| VULN-003 | Staging Redis no auth | `docker-compose.staging.yml:37` uses `--requirepass ${REDIS_PASSWORD}` |

---

## Remediation Priority Matrix

| Priority | ID | Issue | Effort | Assignee |
|----------|-----|-------|--------|----------|
| P0-1 | SEC-REM-001 | start.sh --accept-data-loss | XS | backend-dev |
| P0-2 | SEC-REM-006 | Seed runs in production | XS | backend-dev |
| P0-3 | SEC-REM-007 | CORS origins logged in prod | XS | backend-dev |
| P0-4 | SEC-REM-003 | Mock token env guard | XS | backend-dev |
| P0-5 | SEC-REM-008 | Helmet CSP disabled non-prod | S | backend-dev |
| P0-6 | SEC-REM-002 | Nginx header inheritance | S | backend-dev |
| P0-7 | SEC-REM-005 | Docker runs as root | S | backend-dev |
| P0-8 | SEC-REM-004 | Refresh token in sessionStorage | S | frontend-dev |
| P1-1 | SEC-REM-014 | JWT secret min length | XS | backend-dev |
| P1-2 | SEC-REM-015 | Swagger in staging | XS | backend-dev |
| P1-3 | SEC-REM-018 | credentials:true unnecessary | XS | backend-dev |
| P1-4 | SEC-REM-012 | @Param without ParseUUIDPipe | S | backend-dev |
| P1-5 | SEC-REM-009 | WebSocket CORS divergence | S | backend-dev |
| P1-6 | SEC-REM-011 | Console.error in prod frontend | S | frontend-dev |
| P1-7 | SEC-REM-013 | npm dependency vulnerabilities | S-M | both |
| P1-8 | SEC-REM-017 | Security audit trail | M | backend-dev |
| P1-9 | SEC-REM-016 | LGPD right-to-deletion | L | backend-dev |

---

## Estimated Timeline

| Phase | Items | Effort | Target |
|-------|-------|--------|--------|
| Sprint 1 (Days 1-2) | SEC-REM-001,003,006,007,008,014,015,018 | 1-2 days | All XS/S backend P0s |
| Sprint 2 (Days 3-4) | SEC-REM-002,004,005 | 2 days | Remaining P0s |
| Sprint 3 (Days 5-7) | SEC-REM-009,011,012,013 | 3 days | P1 quick fixes |
| Sprint 4 (Week 2) | SEC-REM-016,017 | 5 days | P1 larger items |

**Total estimated effort**: 10-12 working days across 2 developers.

---

## Post-Remediation Verification

After all fixes are applied:

1. Re-run `npm audit` in both root and backend -- verify 0 critical/high runtime vulnerabilities
2. Run full E2E test suite with Playwright
3. Run backend unit/integration tests
4. Perform manual penetration testing on:
   - All IDOR endpoints (verify access control)
   - WebSocket authentication (verify mock tokens rejected)
   - Token storage (verify no tokens in browser storage)
   - Security headers (verify all 7 headers on all response types)
5. Run OWASP ZAP automated scan against staging
6. Update the security score and re-audit

---

*Generated by STRAAS Squad Security Analyst on 2026-03-25*
