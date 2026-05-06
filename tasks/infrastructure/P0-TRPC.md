# tasks/infrastructure/P0-TRPC.md – tRPC Server Context & Router Layer

This file covers tRPC initialization with error formatting and logging, tenant enforcement middleware via `SET LOCAL app.current_tenant_id`, RBAC middleware using procedure metadata, MFA step‑up middleware, idempotency key middleware for finance mutations, audit log middleware, rate‑limiting middleware backed by Cloudflare Workers bindings, root router aggregation, OpenAPI endpoint versioning, and the middleware pipeline definition. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

### [ ] P0-TRPC-1: Finalize tRPC init (error formatting, logger middleware, context)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** `apps/web/src/server/trpc/init.ts` exists with `initTRPC.context<TrpcContext>().create()`, exporting `router`, `publicProcedure`, `protectedProcedure`, `tenantProcedure`. However, no `errorFormatter` is configured, meaning stack traces may leak to clients in production. No global `onError` callback is set for Sentry or structured logging integration. The `requireSession` and `requireTenant` middlewares exist but the logger middleware is not wired to the structured JSON logger from P0‑OBS‑2 (not yet built). The `isDev` flag may default to a value that doesn't match the Cloudflare Workers environment.
**Size:** Medium

**Description:**
Harden the tRPC initialization in `apps/web/src/server/trpc/init.ts` to be production‑ready:

1. **Error formatting**: Add an explicit `errorFormatter` that strips `error.stack` in production. tRPC's default `isDev` behavior may not be reliable in all Worker environments — explicit is safer. In development, preserve stack traces. Add Zod error flattening (`error.cause instanceof ZodError ? error.cause.flatten() : undefined`) so the client receives structured field‑level validation errors.

2. **Global `onError` callback**: Add an `onError` handler that logs all errors to the structured JSON logger (or `console.error` as a fallback until P0‑OBS‑2 is complete). Include: procedure path, user ID, tenant ID, error code, and a truncated stack. Do not log request bodies (PII risk).

3. **Logger middleware**: Create a simple logger middleware that records procedure start + end with duration, attached to `publicProcedure`. This wraps every procedure call. Log: procedure path, type (query/mutation), duration in ms, success/failure. Attach a `requestId` (from headers or generated UUID) to the context for correlation across log entries.

4. **Context factory**: Verify that `createContext` in `apps/web/src/server/trpc/context.ts` correctly extracts session (via Better Auth), tenant ID (from session or header), and headers. Ensure it's compatible with the Cloudflare Workers fetch adapter. Add `requestId` generation if not present in incoming headers.

5. **Environment detection**: Explicitly set `isDev` based on `process.env.NODE_ENV !== 'production'` rather than relying on tRPC's default.

**Research Findings (2026‑05‑06):**
- tRPC v11 includes `error.data.stack` only when `isDev` is true by default, but explicit `errorFormatter` is recommended for production safety
- Confirmed security issue: CS485-Harmony/Harmony #165 (2026‑03‑09) — unconfigured errorFormatter leaks file paths and source structure
- `onError` is called before the error response is sent — ideal for logging/Sentry
- Zod errors can be flattened via `error.cause.flatten()` for field‑level validation messages
- tRPC v11 `next()` never throws — errors are returned as `{ ok: false, error }` objects — logger must check `result.ok`

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1` (auth session available in context)

**Blocks:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant middleware)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-3` (RBAC middleware)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-0` (middleware pipeline)

**Related Files:**
- `apps/web/src/server/trpc/init.ts`
- `apps/web/src/server/trpc/context.ts`
- `apps/web/src/server/api.ts` (where tRPC handler is mounted)

**Definition of Done**
- [ ] `errorFormatter` configured: strips `stack` in production, preserves in development
- [ ] Zod errors flattened to `fieldErrors` and `formErrors` in the error response
- [ ] `onError` callback logs: procedure path, user ID, tenant ID, error code, truncated stack
- [ ] Logger middleware records procedure start, end, duration, type, success/failure
- [ ] `requestId` generated (UUID) and attached to context for all requests missing `x-request-id` header
- [ ] `isDev` explicitly set based on `NODE_ENV`
- [ ] All existing CRM procedures continue to work without change
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Integrating Sentry SDK (P0‑OBS‑1)
- Structured JSON logging with Pino/Winston (P0‑OBS‑2)
- PII redaction in logs (P0‑OBS‑3)

**Rules to Follow**
- `errorFormatter` must never expose file paths or source code in production.
- Logger must not log request bodies (may contain passwords, PII).
- `requestId` must be propagated from incoming headers if present; generated otherwise.
- Do not break the existing `requireSession` and `requireTenant` middlewares.

**Verification**
```bash
# Verify errorFormatter strips stack in production
NODE_ENV=production pnpm dev
# Trigger an error (e.g., invalid CRM lead input)
# Verify response has no .stack field

# Verify requestId in context
curl -H "x-request-id: test-123" http://localhost:3000/api/trpc/crm.listLeadBoard
# Check logs for "test-123"

# Verify logger middleware output
# Check terminal for "[tRPC] crm.listLeadBoard query 12ms success"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a developer debugging a production issue, I want errors logged with correlation IDs and procedure paths so I can trace requests end‑to‑end without exposing sensitive data to clients.

---

#### Subtasks

- [ ] P0-TRPC-1.0.25 (AGENT): Read current `init.ts`, `context.ts`, and `api.ts`. Understand the current tRPC initialization, context creation, and handler mounting.
  **Verification:** Current state documented.

- [ ] P0-TRPC-1.0.5 (AGENT): Research tRPC v11 errorFormatter patterns, `onError` usage, Zod error flattening, and Cloudflare Workers `NODE_ENV` behavior.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-TRPC-1.1 (AGENT): Add explicit `errorFormatter` that strips `.stack` in production, flattens Zod errors, and preserves stack in development.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** Production error response has no `.stack`; Zod errors have `fieldErrors`.

- [ ] P0-TRPC-1.2 (AGENT): Add global `onError` callback logging procedure path, user ID, tenant ID, error code.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** Errors appear in logs with structured fields.

- [ ] P0-TRPC-1.3 (AGENT): Add logger middleware to `publicProcedure` — logs start/end/duration/type/success per procedure.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** Terminal shows `[tRPC] path type duration success` for each request.

- [ ] P0-TRPC-1.4 (AGENT): Extend `createContext` to generate `requestId` if `x-request-id` header is absent.
  **File(s):** `apps/web/src/server/trpc/context.ts`
  **Verification:** Context includes `requestId` on every request.

- [ ] P0-TRPC-1.5 (AGENT): Set `isDev` explicitly based on `process.env.NODE_ENV !== 'production'`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** `isDev` is true in development, false when `NODE_ENV=production`.

- [ ] P0-TRPC-1.6 (HUMAN): Test error responses, logging output, and CRM functionality. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-2: Implement tenant enforcement middleware (SET LOCAL app.current_tenant_id)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** `apps/web/src/server/trpc/init.ts` exports `requireTenant` middleware that checks for `tenantId` on the context. The existing `apps/web/src/server/api.ts` has conditional tenant middleware for CRM/tRPC routes. However, there is no middleware that executes `SET LOCAL app.current_tenant_id` on the PostgreSQL connection before queries run, which is how `@usebetterdev/tenant` and the RLS policies expect tenant context to be set. Without this, RLS policies may not correctly isolate data.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/middleware/tenant.ts` that wraps every tenant‑scoped procedure in a database transaction with `SET LOCAL app.current_tenant_id = $tenantId`. This ensures that all subsequent queries within the procedure are automatically scoped by PostgreSQL RLS policies using `current_setting('app.current_tenant_id')`.

**Implementation pattern:**
1. Middleware reads `tenantId` from `ctx` (set by `requireTenant`).
2. Middleware calls `getScopedDb(tenantId)` from `packages/db` (which uses `@usebetterdev/tenant`'s `tenant.getDatabase()`).
3. The scoped database is injected into the context as `ctx.db` so procedures can use it without manually calling `getScopedDb`.
4. Since `@usebetterdev/tenant` v0.5.4 resolves the tenant ID and starts a transaction automatically, the middleware primarily validates that the tenant exists and injects the scoped DB.

**Alternative approach** (if `@usebetterdev/tenant` is not used for transaction wrapping): Manually execute `SET LOCAL app.current_tenant_id = $tenantId` at the start of the procedure and `RESET app.current_tenant_id` after.

**Integration**: Update `tenantProcedure` in `init.ts` to use this middleware. Ensure the scoped DB is available as `ctx.db` in all tenant procedures.

**Research Findings (2026‑05‑06):**
- `@usebetterdev/tenant` v0.5.4 provides middleware that resolves tenant ID and starts a database transaction
- `SET LOCAL app.current_tenant_id` sets a session‑local PostgreSQL variable that RLS policies read via `current_setting('app.current_tenant_id')`
- The variable is automatically cleared at transaction end (ROLLBACK or COMMIT)

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-1` (tRPC init finalized)
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS policies use `app.current_tenant_id`)

**Blocks:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-3` (RBAC middleware needs tenant context)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-5` (idempotency middleware needs scoped DB)

**Related Files:**
- `apps/web/src/server/trpc/middleware/tenant.ts` (new)
- `apps/web/src/server/trpc/init.ts` (update `tenantProcedure`)
- `apps/web/src/server/trpc/context.ts` (update type to include `db`)

**Definition of Done**
- [ ] `apps/web/src/server/trpc/middleware/tenant.ts` created
- [ ] Middleware reads `tenantId` from context, calls `getScopedDb(tenantId)`, injects `ctx.db`
- [ ] Middleware validates tenant exists (throws `NOT_FOUND` if tenant ID is invalid)
- [ ] `tenantProcedure` updated to include tenant middleware
- [ ] All CRM procedures refactored to use `ctx.db` instead of calling `getDb()` directly
- [ ] RLS policies verified: querying without tenant scope returns empty results
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Tenant header extraction (handled by Hono middleware in `api.ts`)
- Multi‑tenant data seeding (P0‑DB‑6)

**Rules to Follow**
- `ctx.db` must be the scoped instance — procedures must never use the global `db` for tenant‑scoped operations.
- Tenant middleware must execute after auth middleware (needs `ctx.tenantId` from session).
- Tenant validation must not leak whether a tenant exists (return generic "Not Found").

**Verification**
```bash
# Test tenant isolation
# 1. Create two organizations in the database
# 2. Sign in as Org A → create CRM leads
# 3. Sign in as Org B → CRM leads list is empty
# 4. Direct DB query: SELECT * FROM crm_leads → all rows (bypass RLS)
# 5. Via tRPC: listLeadBoard → only Org B's leads (RLS enforced)

# Verify scoped DB injected
grep "ctx.db" apps/web/src/server/trpc/routers/crm.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a multi‑tenant platform operator, I want every database query automatically scoped to the current tenant so that no organization can access another organization's data.
- Deep Module: The tenant middleware hides the complexity of `SET LOCAL` and `@usebetterdev/tenant` behind a simple `ctx.db` injection, making tenant‑scoped queries indistinguishable from regular queries for the developer.

---

#### Subtasks

- [ ] P0-TRPC-2.0.25 (AGENT): Read `@usebetterdev/tenant` v0.5.4 documentation, current `init.ts`, `context.ts`, and CRM router.
  **Verification:** Current tenant handling documented.

- [ ] P0-TRPC-2.0.5 (AGENT): Research `SET LOCAL app.current_tenant_id` patterns and Drizzle RLS integration with `@usebetterdev/tenant`.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-TRPC-2.1 (AGENT): Create `apps/web/src/server/trpc/middleware/tenant.ts` with tenant validation and scoped DB injection.
  **File(s):** `apps/web/src/server/trpc/middleware/tenant.ts` (new)
  **Verification:** Middleware validates tenant, calls `getScopedDb`, injects `ctx.db`.

- [ ] P0-TRPC-2.2 (AGENT): Update `tenantProcedure` in `init.ts` to include the tenant middleware.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** `tenantProcedure` uses tenant middleware.

- [ ] P0-TRPC-2.3 (AGENT): Refactor CRM procedures to use `ctx.db` instead of `getDb()`.
  **File(s):** `apps/web/src/server/trpc/routers/crm.ts`
  **Verification:** CRM procedures use `ctx.db`; tenant isolation verified.

- [ ] P0-TRPC-2.4 (AGENT): Update `TrpcContext` type to include `db` field.
  **File(s):** `apps/web/src/server/trpc/context.ts`
  **Verification:** TypeScript compilation succeeds.

- [ ] P0-TRPC-2.5 (HUMAN): Test tenant isolation with two organizations. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-3: Build Role‑Based Access Control (RBAC) middleware

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** No RBAC middleware exists in the tRPC layer. The existing `requireSession` middleware only checks that a user is authenticated. All authenticated users have equal access to all procedures. There is no way to restrict admin‑only procedures (e.g., organization settings, user management) from regular members. Better Auth's organization plugin provides role data (`member.role`) but it is not wired into tRPC authorization.
**Size:** Medium

**Description:**
Build an RBAC middleware that reads required permissions from procedure metadata (`.meta()`) and checks the authenticated user's role against them.

**Implementation pattern:**
1. **Define roles**: `admin`, `member`, `viewer` (aligning with Better Auth's organization plugin role structure).
2. **Metadata convention**: Procedures declare `requiredPermission` in `.meta()`. Examples: `requiredPermission: 'crm:write'`, `requiredPermission: 'org:admin'`. For simple role checks: `requiredRole: 'admin'`.
3. **RBAC middleware** (`apps/web/src/server/trpc/middleware/rbac.ts`):
   - Reads `ctx.meta` for `requiredPermission` or `requiredRole`.
   - Reads the user's organization membership role from the session/database.
   - Resolves permission against a role‑permission map (configurable):
     - `admin` → all permissions
     - `member` → `crm:read`, `crm:write`, `projects:read`, `projects:write`, `documents:read`, `documents:write`, `finance:read`
     - `viewer` → `crm:read`, `projects:read`, `documents:read`, `finance:read`
   - If the user lacks the required permission, throws `TRPCError({ code: 'FORBIDDEN' })`.
4. **Admin‑only procedure**: Create `adminProcedure` as shorthand for procedures requiring `org:admin`.

**Integration**: Apply RBAC middleware to `protectedProcedure` (or `tenantProcedure`). Procedures that don't set `.meta()` are implicitly allowed (backward compatible).

**Research Findings (2026‑05‑06):**
- tRPC `.meta()` stores arbitrary procedure metadata accessible in middleware via `ctx.meta`
- Multiple `.meta()` calls shallow‑merge (discussion #3948)
- Community consensus: RBAC checks belong in middleware, using metadata to declare requirements on each procedure
- Better Auth organization plugin provides `member.role` on the session

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant context available)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-3` (session with organization role)

**Blocks:**
- `tasks/infrastructure/P1-SETTINGS.md → P1-SETTINGS-1` (users & permissions page)
- `tasks/infrastructure/P3-PLAT.md → P3-PLAT-1` (admin user management)

**Related Files:**
- `apps/web/src/server/trpc/middleware/rbac.ts` (new)
- `apps/web/src/server/trpc/init.ts` (add RBAC middleware to procedure chain)

**Definition of Done**
- [ ] `apps/web/src/server/trpc/middleware/rbac.ts` created with permission resolution logic
- [ ] Role‑permission map defined: `admin` (all), `member` (read/write for standard domains), `viewer` (read‑only)
- [ ] Middleware reads `ctx.meta.requiredPermission` or `ctx.meta.requiredRole` and enforces
- [ ] `TRPCError({ code: 'FORBIDDEN' })` thrown for unauthorized access
- [ ] `adminProcedure` created as shorthand
- [ ] RBAC middleware added to `tenantProcedure` chain
- [ ] At least one procedure tagged with `.meta({ requiredRole: 'admin' })` and verified
- [ ] Backward compatible: untagged procedures are allowed
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Dynamic permission CRUD UI (Phase 2 — currently role‑permission map is hardcoded)
- Per‑resource permissions (e.g., "can edit this specific project")
- Custom roles (Phase 2+)

**Rules to Follow**
- Never authorize based solely on `ctx.meta` — always verify against session.
- The role‑permission map must be a single source of truth, not duplicated across files.
- Forbidden errors must not reveal whether the resource exists (information leak).

**Verification**
```bash
# Test RBAC enforcement
# 1. Sign in as a regular member
# 2. Call an admin-only procedure → expect FORBIDDEN
# 3. Sign in as admin
# 4. Call same procedure → expect success

# Test backward compatibility
# 5. Call a procedure without .meta() → expect success (member)
# 6. Call a procedure without .meta() → expect success (admin)

# Verify procedure metadata
grep "requiredRole\|requiredPermission" apps/web/src/server/trpc/routers/*.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an admin, I can access organization settings. As a regular member, I cannot.
- Deep Module: The RBAC middleware encapsulates role‑permission mapping behind `.meta()` declarations on procedures, hiding the complexity of permission resolution from individual procedure implementations.

---

#### Subtasks

- [ ] P0-TRPC-3.0.25 (AGENT): Read Better Auth organization plugin role structure, tRPC `.meta()` documentation, and current session context.
  **Verification:** Role structure and metadata API understood.

- [ ] P0-TRPC-3.0.5 (AGENT): Research community RBAC patterns with tRPC metadata and role‑permission mapping.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-TRPC-3.1 (AGENT): Define role‑permission map with `admin`, `member`, `viewer` roles and domain‑scoped permissions.
  **File(s):** `apps/web/src/server/trpc/middleware/rbac.ts` (new)
  **Verification:** Map covers all existing domains.

- [ ] P0-TRPC-3.2 (AGENT): Create RBAC middleware that reads `ctx.meta`, resolves permissions, and throws `FORBIDDEN` if unauthorized.
  **File(s):** `apps/web/src/server/trpc/middleware/rbac.ts`
  **Verification:** Unauthorized requests rejected.

- [ ] P0-TRPC-3.3 (AGENT): Add RBAC middleware to `tenantProcedure` chain in `init.ts`. Create `adminProcedure`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** `adminProcedure` available; RBAC active on tenant procedures.

- [ ] P0-TRPC-3.4 (AGENT): Tag at least one procedure with `.meta({ requiredRole: 'admin' })` and verify enforcement.
  **File(s):** A router file (e.g., `apps/web/src/server/trpc/routers/crm.ts`)
  **Verification:** Admin can access; member gets FORBIDDEN.

- [ ] P0-TRPC-3.5 (HUMAN): Test RBAC with all three roles. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-4: Build MFA step‑up middleware for privileged mutations

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No middleware exists to require recent MFA verification for sensitive operations. Even after MFA is enabled (P0‑AUTH‑6), all procedures are accessible with a standard session. Privileged operations like organization deletion, billing changes, or API key creation should require a recent MFA verification.
**Size:** Small

**Description:**
Create `apps/web/src/server/trpc/middleware/mfa.ts` that checks the session's `twoFactorVerified` timestamp and requires re‑verification for sensitive operations.

**Implementation pattern:**
1. Procedures that require recent MFA add `.meta({ requireMfa: true })` or extend from an `mfaProcedure` base.
2. The MFA middleware checks `ctx.session.twoFactorVerified` (a timestamp set by Better Auth when the user completes 2FA).
3. If the timestamp is older than the configured window (e.g., 5 minutes for billing, 15 minutes for org settings), throw `TRPCError({ code: 'UNAUTHORIZED', message: 'MFA_REQUIRED' })`.
4. The client catches `MFA_REQUIRED` and redirects to the MFA verification page.
5. After successful MFA verification, the session's `twoFactorVerified` timestamp is updated.

**Research Findings (2026‑05‑06):**
- Better Auth's `twoFactor` plugin sets `session.twoFactorVerified` timestamp on verification
- The timestamp is refreshed on each MFA verification
- Trust device bypass (30 days) is handled by Better Auth — if trust is active, MFA is not required

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-6` (MFA implemented)

**Blocks:**
- `tasks/infrastructure/P2-SEC.md → P2-SEC-1-1` (MFA enforcement for privileged ops)

**Related Files:**
- `apps/web/src/server/trpc/middleware/mfa.ts` (new)
- `apps/web/src/server/trpc/init.ts` (add `mfaProcedure`)

**Definition of Done**
- [ ] `apps/web/src/server/trpc/middleware/mfa.ts` created
- [ ] Middleware checks `session.twoFactorVerified` timestamp
- [ ] Configurable window: `MFA_WINDOW_MS` env var (default 5 minutes)
- [ ] Throws `MFA_REQUIRED` error if MFA is not recent
- [ ] `mfaProcedure` created in `init.ts` (extends `protectedProcedure` with MFA check)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Per‑procedure MFA window customization (all use the same window for Phase 0)
- MFA enforcement at organization level (P2‑SEC‑1‑3)

**Rules to Follow**
- MFA middleware must not block users who don't have MFA enabled — check if `twoFactorVerified` exists before enforcing.
- Error message must be distinguishable from regular auth errors (so client can redirect to MFA page).

**Verification**
```bash
# Test MFA step-up
# 1. Enable MFA for a user
# 2. Call an mfaProcedure → expect MFA_REQUIRED
# 3. Complete MFA verification
# 4. Call same procedure within window → expect success
# 5. Wait > window → call again → expect MFA_REQUIRED

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security‑conscious user, I want sensitive operations to require recent MFA verification so that a stolen session cannot be used for destructive actions.

---

#### Subtasks

- [ ] P0-TRPC-3.1.0.25 (AGENT): Read Better Auth `twoFactor` plugin session structure and tRPC middleware patterns.
  **Verification:** Session `twoFactorVerified` field understood.

- [ ] P0-TRPC-4.0.5 (AGENT): Research MFA step‑up patterns in tRPC and community implementations.
  **Verification:** Research documented.

- [ ] P0-TRPC-4.1 (AGENT): Create `mfa.ts` middleware with timestamp check and configurable window.
  **File(s):** `apps/web/src/server/trpc/middleware/mfa.ts` (new)
  **Verification:** Middleware enforces MFA window.

- [ ] P0-TRPC-4.2 (AGENT): Add `mfaProcedure` to `init.ts`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** `mfaProcedure` available.

- [ ] P0-TRPC-4.3 (HUMAN): Test MFA step‑up flow. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-5: Implement idempotency key middleware for finance mutations

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No idempotency protection exists for mutations. Network retries or double‑clicks could result in duplicate mutations (e.g., double payments, duplicate invoices). Finance operations are especially sensitive to this. The `Idempotency-Key` header pattern is not yet implemented.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/middleware/idempotency.ts` using the insert‑lock‑complete pattern for finance mutations. The middleware ensures that a mutation with a given idempotency key is only processed once.

**Implementation pattern:**
1. **Client responsibility**: The client generates a unique `Idempotency-Key` header (UUID) for every mutation. The key is stored in `localStorage` and reused on retry.
2. **Insert phase**: On receiving a mutation, the middleware checks the `idempotency_keys` table (PostgreSQL) for the key + tenant ID combination. Uses `INSERT ... ON CONFLICT (key, org_id) DO NOTHING` for atomicity.
3. **Lock phase**: If the INSERT succeeds (key was not present), the middleware proceeds to execute the mutation. The key row includes a `status` column (`pending` → `completed` or `failed`).
4. **Complete phase**: After the mutation completes, the middleware updates the key row with the response (cached as JSONB) and status `completed`.
5. **Cache hit**: If the key already exists and has status `completed`, the middleware returns the cached response immediately without executing the mutation.
6. **Pending handling**: If the key exists with status `pending` (another request is processing), wait up to 5 seconds polling for completion, then return the cached result or timeout.

**Storage**: PostgreSQL `idempotency_keys` table (part of the existing database, no additional infrastructure). Auto‑cleanup via a scheduled job (or Inngest function) that deletes keys older than 24 hours.

**Integration**: Apply to finance mutations via `.meta({ idempotent: true })` or create an `idempotentProcedure`.

**Research Findings (2026‑05‑06):**
- Standard pattern: `Idempotency-Key` header, insert‑lock‑complete in database
- PostgreSQL `UNIQUE` constraint on (key, org_id) ensures atomicity
- Cached response pattern: return same response for duplicate requests
- Cleanup: periodic deletion of old keys (24h+)

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant context for scoped DB)
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (add schema table)

**Blocks:**
- `tasks/infrastructure/P1-FIN.md → P1-FIN-TRPC-2` (finance AP procedures use idempotency)

**Related Files:**
- `apps/web/src/server/trpc/middleware/idempotency.ts` (new)
- `packages/db/src/schema/idempotency.ts` (new — idempotency_keys table)
- `apps/web/src/server/trpc/init.ts` (add `idempotentProcedure`)

**Definition of Done**
- [ ] `packages/db/src/schema/idempotency.ts` created with `idempotencyKeysTable`: `key`, `org_id`, `status`, `response` (JSONB), `created_at`, `updated_at`. Unique constraint on (key, org_id)
- [ ] Migration generated and applied
- [ ] `apps/web/src/server/trpc/middleware/idempotency.ts` created with insert‑lock‑complete logic
- [ ] Middleware checks `Idempotency-Key` header; skips if absent (backward compatible)
- [ ] Cache hit returns cached response; pending waits up to 5 seconds
- [ ] `idempotentProcedure` created in `init.ts`
- [ ] Auto‑cleanup: Inngest function or DB cron deletes keys older than 24h
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Idempotency for non‑finance domains (can opt‑in per procedure)
- Client‑side retry integration (handled by TanStack Query retry + same idempotency key)

**Rules to Follow**
- Idempotency key must be scoped to tenant (org_id) — keys from different tenants must not collide.
- Do not cache error responses — only cache successful `completed` responses.
- The `Idempotency-Key` header is optional; procedures without it execute normally.

**Verification**
```bash
# Test idempotency
# 1. Send a mutation with Idempotency-Key: test-001
# 2. Verify response, check idempotency_keys table (status: completed)
# 3. Send the same mutation with the same key
# 4. Verify identical response, no duplicate mutation
# 5. Send mutation without key → normal execution

# Test pending handling (concurrent requests)
# 1. Send slow mutation with key
# 2. Immediately send duplicate
# 3. Second request waits and returns same result

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a finance user, I want duplicate form submissions to be safely ignored so that I'm never double‑charged.
- Deep Module: The idempotency middleware hides the complexity of distributed locking and response caching behind a simple `Idempotency-Key` header contract.

---

#### Subtasks

- [ ] P0-TRPC-5.0.25 (AGENT): Research idempotency key patterns, PostgreSQL insert‑lock‑complete, and tRPC middleware integration.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-TRPC-5.0.5 (AGENT): Design `idempotency_keys` table schema.
  **Verification:** Schema designed.

- [ ] P0-TRPC-5.1 (AGENT): Create `packages/db/src/schema/idempotency.ts` and generate migration.
  **File(s):** `packages/db/src/schema/idempotency.ts` (new), migration files
  **Verification:** Table created; unique constraint on (key, org_id).

- [ ] P0-TRPC-5.2 (AGENT): Create `apps/web/src/server/trpc/middleware/idempotency.ts` with insert‑lock‑complete logic.
  **File(s):** `apps/web/src/server/trpc/middleware/idempotency.ts` (new)
  **Verification:** Duplicate requests return cached result.

- [ ] P0-TRPC-5.3 (AGENT): Add `idempotentProcedure` to `init.ts`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** Procedure available.

- [ ] P0-TRPC-5.4 (AGENT): Implement auto‑cleanup for keys older than 24h (Inngest function or DB cron).
  **File(s):** `apps/web/src/server/inngest/functions/infra/cleanup-idempotency.ts` (new)
  **Verification:** Old keys deleted.

- [ ] P0-TRPC-5.5 (HUMAN): Test idempotency with duplicate requests and pending handling. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-6: Implement audit log middleware (capture before/after, actor, tenant)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No audit logging exists in the tRPC layer. There is no record of who performed what mutation, when, or what the data looked like before and after. Regulatory compliance (GDPR, SOC 2) requires audit trails for all data mutations. The middleware pattern has a known gotcha in tRPC v11: `next()` never throws — errors are returned as result objects, so try/catch is the wrong approach.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/middleware/audit.ts` that captures structured audit log entries for every mutation. The middleware records: actor (user ID), tenant (org ID), action (procedure path), target entity (from `.meta()`), timestamp, before‑state (for updates), after‑state, and result (success/failure).

**Implementation pattern:**
1. **Metadata tagging**: Procedures declare audit metadata via `.meta()`:
   - `audit: { entity: 'crm.lead', action: 'create' | 'update' | 'delete' }`
   - `audit: { entity: 'finance.invoice', action: 'approve', sensitive: true }`
2. **Before‑state capture**: For updates/deletes, the middleware fetches the current record before the mutation executes. This is done inside the middleware, not the procedure.
3. **After‑state capture**: After `next()` returns, the middleware checks `result.ok`. If success, captures the result data. If failure, logs the error.
4. **Storage**: Audit entries are inserted into an `audit_logs` table (PostgreSQL) within the same transaction (co‑located with the mutation). This ensures audit entries are never orphaned from their mutations.
5. **Correct error handling**: Uses `if (!result.ok)` pattern (not try/catch) per tRPC v11 convention — `next()` returns `{ ok: false, error }` for errors, it never throws.

**Table schema**: `audit_logs` with: `id`, `org_id`, `user_id`, `action` (string), `entity_type`, `entity_id`, `before` (JSONB, nullable), `after` (JSONB, nullable), `metadata` (JSONB), `status` (success/failure), `error_message` (nullable), `created_at`. Index on `(org_id, created_at)` for querying.

**Research Findings (2026‑05‑06):**
- tRPC v10+ `next()` never throws — must check `result.ok`, confirmed in langwatch #1578 (2026-02-13)
- Community consensus from tRPC Discord: "middleware is a blunt instrument; entity‑aware audit logging needs procedure metadata"
- Audit entries should be co‑located with the mutation transaction for consistency

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant context)
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (add audit_logs table)

**Blocks:**
- `tasks/infrastructure/P3-PLAT.md → P3-PLAT-2` (admin audit log viewer)

**Related Files:**
- `apps/web/src/server/trpc/middleware/audit.ts` (new)
- `packages/db/src/schema/audit.ts` (new — audit_logs table)
- `apps/web/src/server/trpc/init.ts` (add audit middleware to mutation procedures)

**Definition of Done**
- [ ] `packages/db/src/schema/audit.ts` created with `auditLogsTable`: id, org_id, user_id, action, entity_type, entity_id, before (JSONB), after (JSONB), metadata (JSONB), status, error_message, created_at
- [ ] Migration generated and applied
- [ ] `apps/web/src/server/trpc/middleware/audit.ts` created with before/after capture and co‑located storage
- [ ] Middleware correctly handles errors via `if (!result.ok)` pattern
- [ ] Audit middleware added to mutation base procedure
- [ ] At least one CRM procedure tagged with audit metadata and verified
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Audit log retention/purging (P2‑SEC‑2‑4)
- Admin audit log viewer UI (P3‑PLAT‑2)
- Field‑level diff generation (logs before/after as JSONB; diffing is a UI concern)

**Rules to Follow**
- Audit entries must be written in the same transaction as the mutation.
- Never log request bodies or sensitive field values — `sensitive: true` in metadata should redact `before`/`after` values.
- The audit middleware must never fail the mutation — if audit logging fails, log the error but allow the mutation to proceed.

**Verification**
```bash
# Test audit logging
# 1. Create a CRM lead via tRPC
# 2. Check audit_logs table: entry with action "crm.lead.create", after populated
# 3. Update the lead
# 4. Check audit_logs: entry with action "crm.lead.update", before and after populated
# 5. Delete the lead
# 6. Check audit_logs: entry with action "crm.lead.delete", before populated

# Test error audit
# 7. Trigger a mutation error (invalid input)
# 8. Check audit_logs: entry with status "failure", error_message populated

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a compliance officer, I want every data mutation logged with who did what, when, and what changed, so that I can audit all data access.
- Deep Module: The audit middleware encapsulates the complexity of before/after state capture and transactional co‑location behind `.meta()` declarations on procedures.

---

#### Subtasks

- [ ] P0-TRPC-6.0.25 (AGENT): Research tRPC v11 audit logging patterns and the `next()` never‑throws gotcha.
  **Verification:** Research documented (see Research Roundup above and langwatch #1578).

- [ ] P0-TRPC-6.0.5 (AGENT): Design `audit_logs` table schema.
  **Verification:** Schema designed.

- [ ] P0-TRPC-6.1 (AGENT): Create `packages/db/src/schema/audit.ts` and generate migration.
  **File(s):** `packages/db/src/schema/audit.ts` (new), migration files
  **Verification:** Table created.

- [ ] P0-TRPC-6.2 (AGENT): Create `apps/web/src/server/trpc/middleware/audit.ts` with before/after capture, correct error handling, and sensitive‑field redaction.
  **File(s):** `apps/web/src/server/trpc/middleware/audit.ts` (new)
  **Verification:** Audit entries co‑located with mutation transactions.

- [ ] P0-TRPC-6.3 (AGENT): Add audit middleware to mutation base procedure in `init.ts`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** Mutations generate audit entries.

- [ ] P0-TRPC-6.4 (AGENT): Tag CRM procedures with audit metadata.
  **File(s):** `apps/web/src/server/trpc/routers/crm.ts`
  **Verification:** Audit entries include entity_type and entity_id.

- [ ] P0-TRPC-6.5 (HUMAN): Test audit logging for create, update, delete, and error scenarios. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-7: Build rate‑limiting middleware (sliding window per organization)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No rate limiting exists on tRPC procedures. Better Auth provides IP‑based rate limiting for auth endpoints (P0‑AUTH‑CF‑1), but application‑level tRPC procedures have no protection against abuse. A single user could make unlimited API calls to any procedure.
**Size:** Medium

**Description:**
Build a tRPC rate‑limiting middleware that enforces per‑organization sliding window limits on tRPC procedures, using the Cloudflare Workers Rate Limiting API binding as the primary backend and KV as a fallback for hourly/daily quotas.

**Implementation approach:**
1. **Cloudflare Workers Rate Limiting API**: The built‑in binding provides `limit()` with 10s or 60s windows. Configure a binding in `wrangler.jsonc` (e.g., `TRPC_RATE_LIMITER`).
2. **Per‑organization key**: `org_{orgId}:{procedurePath}` — limits are per‑organization, not per‑IP (aligning with Cloudflare's best practice of not rate limiting by IP).
3. **Tiered limits**: Read organization tier from context (or default to free tier):
   - Free: 100 req/60s per org
   - Pro: 1000 req/60s per org
4. **Hourly/daily quotas**: For longer windows, use Workers KV (1 write/sec/key is sufficient for aggregated counters). Track hourly and daily totals per org.
5. **Response**: When rate limit is exceeded, throw `TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Retry after X seconds.' })`. Include `Retry-After` header.
6. **Middleware application**: Add to `publicProcedure` so all procedures are rate‑limited by default.

**Research Findings (2026‑05‑06):**
- Cloudflare Workers Rate Limiting API: built‑in binding, `limit()` method, 10s or 60s periods, per‑location counters
- Best practice: rate limit by org ID / API key / user ID, not IP addresses
- KV write limit of 1/sec/key makes it unsuitable for per‑request counting but suitable for aggregated hourly counters
- Durable Objects for consistent cross‑location counting (future upgrade path)

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant context for org ID)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc with bindings)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/trpc/middleware/rate-limit.ts` (new)
- `apps/web/wrangler.jsonc` (add Rate Limiting API binding)
- `apps/web/src/server/trpc/init.ts` (add to `publicProcedure`)

**Definition of Done**
- [ ] Cloudflare Rate Limiting API binding configured in `wrangler.jsonc` (`TRPC_RATE_LIMITER`)
- [ ] `apps/web/src/server/trpc/middleware/rate-limit.ts` created
- [ ] Per‑organization sliding window (60s) enforced using `TRPC_RATE_LIMITER.limit()`
- [ ] Tiered limits: free (100/min), pro (1000/min)
- [ ] KV‑based hourly/daily quota tracking added as secondary layer
- [ ] `TRPCError` with `TOO_MANY_REQUESTS` and `Retry-After` on limit exceeded
- [ ] Middleware gracefully degrades if Rate Limiting binding is unavailable (allow requests, log warning)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Durable Objects for consistent cross‑location counting (future upgrade)
- Per‑procedure custom limits (all procedures share org‑level limit for Phase 0)
- User‑facing rate limit status/headers UI

**Rules to Follow**
- Rate limit key must use org ID, not IP.
- The middleware must fail open if the rate limiting backend is unavailable.
- Include `Retry-After` header in error response.

**Verification**
```bash
# Test rate limiting
# 1. Send 101 requests within 60 seconds as a free‑tier org
# 2. Request 101 should return 429 TOO_MANY_REQUESTS
# 3. Check response includes Retry-After header
# 4. Wait 60 seconds → requests succeed again
# 5. Send 101 requests as pro‑tier org → all succeed (1000 limit)

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a platform operator, I want API rate limits enforced per organization so that one tenant cannot degrade performance for others.

---

#### Subtasks

- [ ] P0-TRPC-7.0.25 (AGENT): Research Cloudflare Workers Rate Limiting API binding, KV‑based rate limiting, and tRPC middleware integration.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-TRPC-7.0.5 (AGENT): Evaluate Cloudflare Rate Limiting API vs KV vs Durable Objects trade‑offs for this use case.
  **Verification:** Decision documented.

- [ ] P0-TRPC-7.1 (AGENT): Add Rate Limiting API binding to `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Binding configured.

- [ ] P0-TRPC-7.2 (AGENT): Create `apps/web/src/server/trpc/middleware/rate-limit.ts` with per‑org sliding window and tiered limits.
  **File(s):** `apps/web/src/server/trpc/middleware/rate-limit.ts` (new)
  **Verification:** Rate limiting enforces per‑org limits.

- [ ] P0-TRPC-7.3 (AGENT): Add KV‑based hourly/daily quota tracking as secondary layer.
  **File(s):** `apps/web/src/server/trpc/middleware/rate-limit.ts`
  **Verification:** Hourly quotas tracked in KV.

- [ ] P0-TRPC-7.4 (AGENT): Add rate‑limit middleware to `publicProcedure` in `init.ts`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** All procedures rate‑limited.

- [ ] P0-TRPC-7.5 (HUMAN): Test rate limit enforcement and graceful degradation. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-8: Create root router aggregating all domain routers

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** `apps/web/src/server/trpc/router.ts` exports `appRouter` merging only `crmRouter`. There is no merged root router that can accommodate future domain routers (documents, projects, finance, etc.). The pattern for adding new routers is not standardized.
**Size:** Small

**Description:**
Create (or refactor) the root router at `apps/web/src/server/trpc/routers/_app.ts` that merges all domain routers into a single `appRouter`. The root router:

1. **Merges CRM router** (existing) at `crm.*` namespace.
2. **Reserves namespaces** for future domains: `documents.*`, `projects.*`, `finance.*`, `assets.*`, `portal.*`, `analytics.*`, `settings.*`, `search.*`, `notifications.*`, `reports.*`, `webhooks.*`.
3. **Exports `appRouter` type** for client‑side type safety.
4. **Follows the pattern**: `t.router({ crm: crmRouter, documents: documentsRouter, ... })`.
5. **Placeholder routers**: For domains not yet implemented, create empty routers that can be filled in during Phase 1.

**Research Findings (2026‑05‑06):**
- tRPC router merging: `t.router({ namespace: domainRouter })` creates nested namespaces
- The merged router type is inferred — no manual type work needed
- `createCallerFactory()(appRouter)` enables server‑side calls

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-1` (tRPC init)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-3` (RBAC middleware)

**Blocks:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-10` (OpenAPI generation)
- All Phase 1 domain router tasks

**Related Files:**
- `apps/web/src/server/trpc/routers/_app.ts` (new, or refactor `router.ts`)
- `apps/web/src/server/trpc/router.ts` (may be deprecated in favor of `_app.ts`)
- `apps/web/src/server/api.ts` (update import)

**Definition of Done**
- [ ] `apps/web/src/server/trpc/routers/_app.ts` created (or `router.ts` refactored)
- [ ] `appRouter` merges CRM at `crm.*` namespace
- [ ] Placeholder routers created for all eight future domains (empty, ready to fill)
- [ ] `AppRouter` type exported for client usage
- [ ] `apps/web/src/server/api.ts` updated to import from correct path
- [ ] All existing CRM functionality works through the merged router
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Implementing domain routers (Phase 1)
- Router‑level middleware (handled at procedure level for Phase 0)

**Rules to Follow**
- The root router must be the single source of truth for all API routes.
- Do not delete `router.ts` if it's imported elsewhere — update imports first.
- Placeholder routers must be empty but typed correctly (export `t.router({})`).

**Verification**
```bash
# Verify CRM still works through merged router
curl http://localhost:3000/api/trpc/crm.listLeadBoard

# Verify placeholder routers exist
grep "documents\|projects\|finance\|assets\|portal\|analytics\|settings\|search\|notifications\|reports" apps/web/src/server/trpc/routers/_app.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (router composition)

---

#### Subtasks

- [ ] P0-TRPC-8.0.25 (AGENT): Read current `router.ts`, all existing routers, and client imports.
  **Verification:** Current router structure documented.

- [ ] P0-TRPC-8.0.5 (AGENT): Research tRPC v11 router merging patterns.
  **Verification:** Research documented.

- [ ] P0-TRPC-8.1 (AGENT): Create `_app.ts` root router merging CRM and placeholder routers.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts` (new)
  **Verification:** `appRouter` includes all namespaces.

- [ ] P0-TRPC-8.2 (AGENT): Create placeholder routers for all future domains.
  **File(s):** Various files in `apps/web/src/server/trpc/routers/`
  **Verification:** Placeholder files exist with `t.router({})`.

- [ ] P0-TRPC-8.3 (AGENT): Update `api.ts` and all imports to use `_app.ts`.
  **File(s):** `apps/web/src/server/api.ts`, `apps/web/src/lib/trpc/client.ts`
  **Verification:** CRM functionality works through merged router.

- [ ] P0-TRPC-8.4 (HUMAN): Test CRM functionality and verify router structure. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-10: Serve versioned OpenAPI endpoint at `/api/v1/openapi.json`

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** `apps/web/src/server/api.ts` generates an OpenAPI document via `@trpc/openapi` but may serve it at `/api/openapi.json` without versioning. The TASKS.md specification requires `/api/v1/openapi.json` for API versioning.
**Size:** Small

**Description:**
Serve the OpenAPI specification at the versioned endpoint `/api/v1/openapi.json` (in addition to or replacing the existing unversioned endpoint). This establishes the API versioning foundation for P0‑API tasks.

**Implementation steps:**
1. Generate the OpenAPI spec from the root `appRouter` using `@trpc/openapi`'s `generateOpenApiDocument`.
2. Serve it at `/api/v1/openapi.json` via the Hono app.
3. Keep `/api/openapi.json` as a redirect (or symlink) to the latest version for backward compatibility.
4. Add OpenAPI metadata to existing procedures via `.meta()`: `openapi: { method: 'GET', path: '/crm/leads', summary: '...', description: '...', protect: true }`.
5. Verify the generated spec is valid OpenAPI 3.1.

**Research Findings (2026‑05‑06):**
- `@trpc/openapi` v11.16.0‑alpha: cyclic type support, drops 20‑type depth limit, `zod.lazy` support, strips symbol noise
- `generateOpenApiDocument` from `@trpc/openapi` generates the spec from router
- Speakeasy tutorial (2026‑01‑22): shows the pattern of `.meta()` + `generateOpenApiDocument`

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-8` (root router)

**Blocks:**
- `tasks/infrastructure/P0-DX.md → P0-DX-1` (Scalar API documentation UI)
- `tasks/infrastructure/P0-DX.md → P0-DX-2` (SDK generation)

**Related Files:**
- `apps/web/src/server/api.ts`
- `apps/web/src/server/trpc/routers/crm.ts` (add OpenAPI metadata)
- `apps/web/src/server/trpc/openapi.ts` (new — OpenAPI generation utility)

**Definition of Done**
- [ ] OpenAPI spec served at `/api/v1/openapi.json`
- [ ] Spec is valid OpenAPI 3.1 (validated with openapi‑diff or Swagger Editor)
- [ ] CRM procedures tagged with OpenAPI metadata (method, path, summary, description)
- [ ] `/api/openapi.json` redirects or aliases to `/api/v1/openapi.json`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full OpenAPI metadata for all domains (Phase 1 — only CRM for now)
- Scalar UI (P0‑DX‑1)
- SDK generation (P0‑DX‑2)

**Rules to Follow**
- The OpenAPI spec must not expose internal procedure paths — use REST‑friendly paths.
- `protect: true` in metadata marks endpoints as requiring authentication in the spec.
- Versioning via URL path (`/api/v1/`) follows the strategy defined in P0‑API‑1.

**Verification**
```bash
# Fetch and validate OpenAPI spec
curl http://localhost:3000/api/v1/openapi.json | python3 -m json.tool

# Verify CRM endpoints are documented
curl http://localhost:3000/api/v1/openapi.json | grep -E "crm|lead"

# Verify backward compatibility
curl -I http://localhost:3000/api/openapi.json  # redirects to /api/v1/openapi.json

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (OpenAPI generation)

---

#### Subtasks

- [ ] P0-TRPC-10.0.25 (AGENT): Read `@trpc/openapi` v11 documentation and current API handler.
  **Verification:** API understood.

- [ ] P0-TRPC-10.0.5 (AGENT): Research OpenAPI metadata patterns for tRPC procedures.
  **Verification:** Research documented.

- [ ] P0-TRPC-10.1 (AGENT): Create `openapi.ts` utility that generates the spec from `appRouter`.
  **File(s):** `apps/web/src/server/trpc/openapi.ts` (new)
  **Verification:** Spec generated and valid.

- [ ] P0-TRPC-10.2 (AGENT): Add OpenAPI metadata to CRM procedures.
  **File(s):** `apps/web/src/server/trpc/routers/crm.ts`
  **Verification:** CRM endpoints appear in spec.

- [ ] P0-TRPC-10.3 (AGENT): Serve spec at `/api/v1/openapi.json` and redirect `/api/openapi.json`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Both endpoints respond.

- [ ] P0-TRPC-10.4 (HUMAN): Validate OpenAPI spec and review endpoint metadata. Approve.
  **Verification:** Approved.

---

### [ ] P0-TRPC-0: Define and document tRPC middleware ordering pipeline

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Individual middlewares are built (auth, tenant, RBAC, MFA, idempotency, audit, rate‑limit) but their execution order is not formally defined or documented. Incorrect ordering could cause issues (e.g., rate limiting after auth to avoid unauthenticated requests consuming rate limit, audit logging before idempotency check to capture the attempt).
**Size:** Small

**Description:**
Define and document the canonical middleware ordering pipeline:

**Pipeline order** (outermost first):
1. **Rate Limit** — reject excessive requests before any processing
2. **Auth** — identify the user (requireSession)
3. **Tenant** — resolve tenant and set PostgreSQL session variable
4. **MFA** — (optional) verify recent MFA for sensitive operations
5. **RBAC** — check permissions against procedure metadata
6. **Idempotency** — (optional) check idempotency key for finance mutations
7. **Audit** — (outermost, pre‑next) capture before‑state → execute procedure → capture after‑state

**Justification:**
- Rate limit must be first to prevent resource exhaustion from unauthenticated requests
- Auth must precede tenant (tenant derived from session)
- Tenant must precede RBAC and idempotency (both need scoped DB)
- MFA sits between tenant and RBAC (step‑up before authorization)
- Idempotency check before procedure execution (prevents duplicate processing)
- Audit wraps procedure as outermost middleware (captures both before and after)

**Implementation**: Export a composed middleware function `createPipeline` from `apps/web/src/server/trpc/middleware/pipeline.ts` that applies all middlewares in the correct order. Use this to create `publicProcedure`, `protectedProcedure`, `tenantProcedure`, `adminProcedure`, `mfaProcedure`, `idempotentProcedure` in `init.ts`.

**Documentation**: Create `docs/architecture/middleware.md` with: pipeline diagram, ordering rationale, each middleware's responsibility, how to add a new middleware.

**Depends on:**
- All P0‑TRPC middleware tasks (P0‑TRPC‑2 through P0‑TRPC‑7)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/trpc/middleware/pipeline.ts` (new)
- `docs/architecture/middleware.md` (new)
- `apps/web/src/server/trpc/init.ts` (refactor to use pipeline)

**Definition of Done**
- [ ] `pipeline.ts` exports composed middleware in the documented order
- [ ] `init.ts` uses `createPipeline` to create all procedure variants
- [ ] `docs/architecture/middleware.md` created with pipeline diagram, ordering rationale, and extension guide
- [ ] All existing CRM procedures work through the new pipeline
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Dynamic middleware composition (hardcoded pipeline for Phase 0)
- Per‑domain middleware variations (all domains share the same pipeline)

**Rules to Follow**
- Rate limit must always be outermost.
- Audit must be the outermost pre‑execution middleware so it captures the request regardless of downstream outcomes.
- The pipeline must be easy to extend when new middlewares are added.

**Verification**
```bash
# Verify pipeline order
grep -A 10 "createPipeline" apps/web/src/server/trpc/middleware/pipeline.ts

# Verify all CRM functionality works
# Manual: CRUD a lead, verify all middleware layers execute correctly

ls docs/architecture/middleware.md

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The pipeline module hides the complexity of 7+ middleware layers behind a simple `createPipeline()` function, ensuring correct ordering without requiring individual procedure authors to remember the sequence.

---

#### Subtasks

- [ ] P0-TRPC-0.0.25 (AGENT): Review all created middlewares and understand their dependencies.
  **Verification:** Middleware dependency graph documented.

- [ ] P0-TRPC-0.0.5 (AGENT): Research tRPC middleware ordering best practices and community pipeline patterns.
  **Verification:** Research documented.

- [ ] P0-TRPC-0.1 (AGENT): Create `pipeline.ts` with composed middleware in the documented order.
  **File(s):** `apps/web/src/server/trpc/middleware/pipeline.ts` (new)
  **Verification:** Pipeline compiles and exports all procedure variants.

- [ ] P0-TRPC-0.2 (AGENT): Refactor `init.ts` to use the pipeline.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** All procedure variants built from pipeline.

- [ ] P0-TRPC-0.3 (AGENT): Write `docs/architecture/middleware.md` with diagram, rationale, and extension guide.
  **File(s):** `docs/architecture/middleware.md` (new)
  **Verification:** Document covers all required topics.

- [ ] P0-TRPC-0.4 (HUMAN): Review pipeline ordering, test CRM functionality, and approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑TRPC group are covered.*

---