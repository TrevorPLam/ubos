# UBOS Codebase Analysis Report

## Executive Summary

### Project Overview and Purpose

**UBOS** is a full-stack TypeScript B2B platform (React + Express) backed by PostgreSQL, targeting CRM, projects, agreements, revenue (AR/AP), and engagements. The README describes a modular monolith with domain boundaries, outbox events, and a workflow engine. The codebase shows a mix of MVP implementations and mature areas (security, multi-tenancy, RBAC).

### Overall Health Score: **6.5/10**

**Rationale:** Strong architectural foundation with multi-tenancy, RBAC, security middleware, and extensive test coverage. However, critical issues (exposed credentials, flaky tests, debug logging in production paths) and technical debt (NestJS vs Express mismatch, RedisStore imported but unused, CSRF not enforced on API routes) lower the score.

### Top 5 Critical Issues Requiring Immediate Attention

1. **CRITICAL: Hardcoded database credentials in `package.json`** – The dev script exposes a production-grade database connection string with password.
2. **CRITICAL: Debug `console.log` in auth flow** – `App.tsx` and `use-auth.ts` log auth state on every render/navigation.
3. **HIGH: Flaky permission tests** – `permissions.test.ts` fails due to unmocked `req.connection` and `db.insert`.
4. **HIGH: CSRF protection not enforced** – `csrfProtection` middleware exists but is not applied to API routes.
5. **HIGH: Dashboard route uses `console.error`** – Errors logged with `console.error` instead of app logger.

### Top 5 High-Impact Improvement Opportunities

1. **Redis-backed rate limiting** – `rate-limit-redis` is installed and imported but not used; production multi-instance deployments are vulnerable.
2. **Remove debug logging before production** – Replace/remove `console.log` calls in client auth flow.
3. **Enforce CSRF on state-changing API routes** – Wire CSRF validation into POST/PUT/DELETE/PATCH routes.
4. **Mock `db` and `req.connection` in permission tests** – Fix failing permission tests and stabilize CI.
5. **Stricter file upload validation** – Add extension allowlist, content-type checks, and path traversal protection for logo uploads.

---

## Phase 1: Project Understanding & Architecture

### Project Context Discovery

| Aspect | Finding |
|--------|---------|
| **Type** | Full-stack web application (SPA + REST API) |
| **Primary Languages** | TypeScript |
| **Frontend** | React 18, Vite 7, Wouter, TanStack Query, Radix UI, Tailwind |
| **Backend** | Express (not NestJS as stated in README) |
| **Database** | PostgreSQL via Drizzle ORM |
| **Package Manager** | npm (README states pnpm) |
| **Monorepo** | Single package (README states yes; no `packages/` or workspace config) |
| **Dependencies** | ~60 production, ~35 dev; `engines.node`: >=20.19.0 |

### README vs. Reality: Technology Stack Alignment

| README States | Actual Implementation | Gap |
|---------------|----------------------|-----|
| NestJS | Express | **Major** – Different framework entirely |
| pnpm | npm | Minor – `package-lock.json` present |
| Monorepo | Single package | Minor – No workspace roots |
| S3/MinIO for files | Local disk (`uploads/`) | **Major** – Files stored on server filesystem |
| Redis for cache/jobs | Optional; in-memory fallbacks | Partial – Redis used only if `REDIS_URL` set |
| 30 agent roles in `/agents/roles/` | Present in repo | Aligned |

**Conclusion:** The README reflects an aspirational architecture. The codebase is Express-based, uses npm, and has not yet adopted object storage or full Redis integration for rate limiting.

### Entry Points and Bootstrap Flow

**Runtime startup** (when `server/index.ts` is run directly):

1. `dotenv.config()` loads `.env`
2. `connectRedis()` – Connects if `REDIS_URL` set; otherwise warns and continues
3. `eventDispatcher.start()` – Polls outbox every 5s
4. `workflowEngine.initialize()` – Registers handlers for `deal.created`, `deal.updated`
5. `createApp()` – Creates Express app, runs `assertValidConfiguration()`, applies security middleware and body parsers
6. `setupApplication()` – Registers domain routes, global error handler, Vite (dev) or static (prod)
7. `startServer()` – Listens on `PORT` (default 5000), host `0.0.0.0`

**Build flow** (`npm run build` via `script/build.ts`):

1. Delete `dist/`
2. Vite builds client → `dist/public/` (root: `client/`)
3. esbuild bundles server → `dist/index.cjs` (entry: `server/index.ts`; most deps external)

**Note:** The module-level `const app = express()` in `server/index.ts` (lines 61–62) is *never configured*. The bootstrap uses `createApp()`, which returns a *new* app. The exported `app` is the bare instance—tests that import it may receive an unconfigured app depending on setup.

### Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (Vite + React SPA)                      │
│  index.html → main.tsx → App.tsx → Router (auth gate)                    │
│  AuthenticatedRouter: AppLayout (Sidebar+Header) + Switch (lazy routes)  │
│  API: fetch with credentials, TanStack Query (queryKey = URL path)       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP/JSON + HttpOnly cookie
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Express Server (server/index.ts)                     │
│  CORS → Helmet → Rate Limit → Sanitization → JSON/urlencoded → Routes   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Domain Routes    │    │ Auth Middleware  │    │ Error Handler    │
│ identity, crm,   │    │ requireAuth,     │    │ (global)         │
│ projects, revenue│    │ checkPermission  │    │                  │
│ agreements, etc. │    │ getOrCreateOrg   │    │                  │
└────────┬─────────┘    └──────────────────┘    └──────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────┐
│ Storage Layer    │    │ Event Dispatcher │
│ server/storage.ts│    │ (polls outbox)   │
│ (Drizzle + pg)   │    │ + WorkflowEngine │
└────────┬─────────┘    └──────────────────┘
         │                         │
         │                         ▼
         │              deal.created / deal.updated
         │              → WorkflowEngine handlers (logging only)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL  │  Redis (optional)  │  uploads/ (local disk)               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Boundaries and Cross-Domain Dependencies

**Domain isolation:** Domains do *not* import from other domains. Each domain imports only:

- `../../storage` (or `../../storage` + `db` for identity)
- `../../middleware/auth`
- `../../middleware/permissions`
- `../../middleware/rateLimit` (rbac only)
- `@shared/schema` or `@shared/client-schemas`

**Boundary violation:** `server/domains/identity/routes.ts` imports `db` from storage and uses it directly at line 527 (`db.update(invitations)...`) for invitation token resend. This bypasses the storage abstraction—storage is intended to be the single DB access point.

**Workflow engine:** `domains/workflows/engine.ts` imports `eventDispatcher` (a cross-cutting service), not other domains. It registers handlers for `deal.created` and `deal.updated`.

### Data Flow: End-to-End Request Trace

**Example: Create Client (`POST /api/clients`)**

1. **Request** → Express receives JSON body
2. **Middleware** → CORS, Helmet, rate limit, sanitization, body parser
3. **Route** → `crmRoutes.post("/api/clients", requireAuth, checkPermission("clients", "create"), handler)`
4. **Auth** → `getUserIdFromRequest(req)` (cookie or dev header) → `getOrCreateOrg(userId)` → `orgId`
5. **Handler** → Validates body with `insertClientCompanySchema`, calls `storage.createClientCompany({ ...data, organizationId: orgId })`
6. **Storage** → `db.insert(clientCompanies).values(...).returning()` (Drizzle, parameterized)
7. **Response** → `res.json(client)`

**Example: Create Deal (triggers event)**

1. Same auth/route flow
2. **Storage** → `db.insert(deals)` then `createOutboxEvent({ eventType: "deal.created", payload: deal })`
3. **Background** → Event dispatcher polls `getUnprocessedEvents()`, runs workflow handlers (currently logging only)
4. **Response** → `res.json(deal)`

**Outbox usage:** Only `storage.createDeal` and `storage.updateDeal` call `createOutboxEvent`. No other domains emit events. The workflow engine handles `deal.created` and `deal.updated` but does not chain to new events.

### Event Flow (Outbox Pattern)

```
Storage.createDeal/updateDeal
    → db.insert(outbox) [deal.created | deal.updated]
    → EventDispatcher.processEvents() [every 5s]
        → storage.getUnprocessedEvents(10)
        → for each: run WorkflowEngine handlers
        → storage.markEventProcessed(id)
```

**Registered handlers:** `deal.created`, `deal.updated` (log only; no side effects like creating contracts or engagements).

### Complete API Surface

| Domain | Methods | Paths |
|--------|---------|-------|
| **Identity** | GET | `/api/login`, `/api/logout`, `/api/auth/user`, `/api/invitations`, `/api/invitations/:token/validate`, `/api/users/me` |
| | POST | `/api/invitations`, `/api/invitations/bulk`, `/api/invitations/:token/accept`, `/api/invitations/:id/resend`, `/api/users/me/avatar` |
| | PUT | `/api/users/me`, `/api/users/me/password`, `/api/users/me/preferences` |
| **CRM** | GET | `/api/clients`, `/api/clients/stats`, `/api/clients/:id`, `/api/contacts`, `/api/deals` |
| | POST | `/api/clients`, `/api/contacts`, `/api/deals` |
| | PUT | `/api/clients/:id` |
| | PATCH | `/api/contacts/:id`, `/api/deals/:id` |
| | DELETE | `/api/clients/:id`, `/api/contacts/:id`, `/api/deals/:id` |
| **Projects** | GET | `/api/projects`, `/api/tasks` |
| | POST | `/api/projects`, `/api/tasks` |
| | PATCH | `/api/projects/:id` |
| | DELETE | `/api/projects/:id` |
| **Revenue** | GET | `/api/invoices`, `/api/bills`, `/api/vendors` |
| | POST | `/api/invoices`, `/api/bills`, `/api/vendors`, `/api/invoices/:id/send`, `/api/invoices/:id/mark-paid`, `/api/bills/:id/approve`, `/api/bills/:id/pay` |
| | PATCH | `/api/invoices/:id`, `/api/bills/:id` |
| | DELETE | `/api/invoices/:id`, `/api/bills/:id` |
| **Agreements** | GET | `/api/proposals`, `/api/contracts` |
| | POST | `/api/proposals`, `/api/proposals/:id/send`, `/api/contracts`, `/api/contracts/:id/send`, `/api/contracts/:id/mark-signed` |
| | PATCH | `/api/proposals/:id` |
| | DELETE | `/api/proposals/:id`, `/api/contracts/:id` |
| **Engagements** | GET | `/api/engagements` |
| | POST | `/api/engagements` |
| | PATCH | `/api/engagements/:id` |
| | DELETE | `/api/engagements/:id` |
| **Communications** | GET | `/api/threads`, `/api/threads/:id/messages` |
| | POST | `/api/threads`, `/api/threads/:id/messages` |
| **Files** | GET | `/api/files`, `/api/files/:id/download` |
| | POST | `/api/files/upload` |
| **Organizations** | GET | `/api/organizations/settings` |
| | PUT | `/api/organizations/settings` |
| | POST | `/api/organizations/logo` |
| | DELETE | `/api/organizations/logo` |
| **RBAC** | GET | `/api/roles`, `/api/roles/:id`, `/api/permissions`, `/api/roles/:id/permissions` |
| | POST | `/api/roles`, `/api/roles/:id/permissions` |
| | PUT | `/api/roles/:id` |
| | DELETE | `/api/roles/:id`, `/api/roles/:id/permissions/:permId` |
| **Dashboard** | GET | `/api/dashboard/stats` |

### Client-Server Contract

- **Auth:** HttpOnly cookie `ubos_user_id`; dev override via `x-user-id` / `x-user` header
- **API base:** Same origin (no explicit base URL; `fetch` uses relative paths)
- **Data format:** JSON request/response
- **Shared types:** `@shared/schema` (Drizzle types, Zod schemas), `@shared/client-schemas` (pagination, filters, validation)
- **Client API layer:** `apiRequest(method, url, data)` for mutations; TanStack Query `getQueryFn` uses `queryKey.join("/")` as URL

### Schema and Migration Strategy

- **Schema definition:** `shared/schema.ts` – Drizzle table definitions, enums, relations, Zod insert schemas
- **Migrations:** Single SQL file `docs/migrations/001-rbac-schema.sql`; no `drizzle-kit` or migration runner detected
- **Assumption:** Schema is managed via Drizzle’s schema-first approach; migrations appear manual. The app assumes tables exist (no auto-migrate on startup).

### Directory Structure (Expanded)

| Path | Purpose |
|------|---------|
| `client/` | React SPA; Vite root; `index.html`, `src/main.tsx`, pages, components, hooks, lib |
| `client/src/lib/` | `queryClient.ts`, `auth-utils.ts` |
| `server/` | Express app, domains, middleware, services |
| `server/domains/` | identity, crm, projects, revenue, agreements, engagements, communications, files, rbac, organizations, workflows |
| `server/middleware/` | auth, permissions, rateLimit |
| `server/services/` | event-dispatcher, (email stubbed) |
| `shared/` | schema.ts, client-schemas.ts, models/auth.ts |
| `script/` | build.ts, task-graph.ts, sprint-planner.ts, generate-task-index.ts, enforce-coverage.ts |
| `tests/` | backend/, frontend/, setup/ |
| `docs/` | architecture, security, api, migrations |

### Architecture Patterns

- **Modular monolith** – Domain routes under `server/domains/*`; no cross-domain imports
- **Layered** – Routes → Storage → DB; shared schema in `shared/`
- **Multi-tenant** – `organizationId` on most tables; storage enforces org scope
- **Event-driven (partial)** – Outbox + EventDispatcher + WorkflowEngine; only deals emit events; handlers are logging-only
- **Golden record** – CRM owns clients/contacts; other domains reference `clientCompanyId`/`contactId`

### SOLID & Design Patterns

- **Single Responsibility** – Domains separated; storage handles persistence
- **Dependency Inversion** – Storage is concrete; routes depend on it directly (no interfaces)
- **Open/Closed** – New domains added by new route modules and storage methods
- **Interface Segregation** – Storage exposes many methods; no formal interface

### Information Gaps Addressed

| Gap | Resolution |
|-----|------------|
| Who writes to outbox? | Only `storage.createDeal` and `storage.updateDeal` |
| How is schema applied? | Manual SQL in `docs/migrations/`; no drizzle-kit migrate |
| Cross-domain imports? | None; identity bypasses storage with `db` for one operation |
| Bootstrap vs. exported app? | Bootstrap uses `createApp()`; exported `app` is unconfigured |
| Client API contract? | `queryKey` as URL; `credentials: "include"`; JSON |
| Event handler coverage? | deal.created, deal.updated only; no chaining |

---

## Phase 2: Code Quality Assessment

### Code Structure & Organization

**Strengths**

- Clear domain boundaries (identity, crm, projects, revenue, etc.); no cross-domain imports.
- Consistent route pattern: `requireAuth` → `checkPermission` → `getOrCreateOrg` → storage.
- Centralized error handling in **CRM only** (`crm/error-handlers.ts`) with `handleValidationError`, `handleNotFoundError`, `handleDependencyError`, `handleServerError`.
- AI-META headers document ownership, dependencies, and risks in many files.
- Single `IStorage` interface (~75 methods) defines the data-access contract.

**Weaknesses**

- **Storage monolith** – `server/storage.ts` is **1,684 lines**; implements all domains in one class; should be split by domain (e.g. `storage/crm.ts`, `storage/revenue.ts`).
- **Dashboard aggregation in `routes.ts`** – Cross-domain logic (clients, deals, engagements, invoices) lives in main routes instead of a dedicated service.
- **Error-handling inconsistency** – Only CRM uses centralized handlers; engagements, agreements, revenue, projects, communications, files, organizations, identity, RBAC use ad-hoc `try/catch` with `console.error` + `res.status(500).json({ error: "..." })`.

### Code Duplication (DRY Violations)

**Route handler boilerplate:** The same pattern appears in ~80+ route handlers across domains:

```ts
try {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  const result = await storage.someMethod(...);
  res.json(result);
} catch (error) {
  console.error("Operation error:", error);
  res.status(500).json({ error: "Failed to ..." });
}
```

**Domains without shared wrapper:** engagements, agreements, revenue, projects, communications, files, organizations, identity, RBAC. CRM uses `handleServerError` and related helpers; others repeat the pattern.

**Recommendation:** Introduce a `withAuthAndOrg(handler)` or `wrapRoute(handler)` higher-order function to extract `userId`, `orgId`, and error handling. CRM’s error-handlers could be generalized and reused.

### Input Validation Coverage

| Domain | Validates req.body/query? | Notes |
|--------|---------------------------|-------|
| **CRM** | Clients: yes (Zod safeParse); Contacts, Deals: no | Contacts/deals spread `req.body` directly |
| **Identity** | Yes | Invitations, profile, password, preferences |
| **Organizations** | Yes | Settings schema |
| **RBAC** | Yes | Roles schema |
| **Engagements** | No | `{ ...req.body, organizationId, ownerId }` |
| **Agreements** | No | Proposals, contracts, mark-signed |
| **Revenue** | No | Invoices, bills, vendors |
| **Projects** | No | Projects, tasks |
| **Communications** | No | Threads, messages |
| **Files** | Partial | `engagementId`, `folder`, `isClientVisible` from body; no schema |

**Risk:** Domains that pass `req.body` unchecked rely on Drizzle/Zod at the schema layer; malformed or unexpected fields can reach storage. CRM clients are the only entity with route-level validation outside identity/orgs/rbac.

### Code Readability & Maintainability

**Strengths**

- TypeScript used throughout; Drizzle provides strong typing.
- Descriptive function and variable names.
- `shared/schema.ts` (~1,335 lines) centralizes schema and Zod insert schemas.
- Prettier config (`.prettierrc.json`): 100 print width, trailing commas, semicolons.

**Weaknesses**

- **Debug logging in production paths** – Client auth flow logs on every render/navigation:
  - `client/src/App.tsx` lines 219, 226, 237, 245: `console.log("[Router] Auth state:", ...)`
  - `client/src/hooks/use-auth.ts` lines 31, 35, 44: `console.log("[useAuth] ...")`
- **Magic numbers** – Rate limits (1000, 500, 10), file size (5MB), poll interval (5000ms) hardcoded in multiple files.
- **Typed catch blocks** – Only `event-dispatcher.ts` uses `catch (error: any)`; ~75 other `catch (error)` blocks leave `error` untyped.

### Console vs. Logger Usage

| Location | console.log | console.error | console.warn | logger |
|----------|-------------|---------------|--------------|--------|
| **server/domains/** | 12 | 75+ | 0 | 1 (CRM error-handlers) |
| **server/routes.ts** | 0 | 1 | 0 | 0 |
| **server/storage.ts** | 2 | 1 | 0 | 0 |
| **server/services/** | 3 | 4 | 0 | 0 |
| **server/middleware/** | 0 | 4 | 0 | 0 |
| **client/** | 4 | 1 | 0 | 0 |
| **script/** | 15 | 12 | 2 | 0 |

**Finding:** The app has a structured `logger` in `server/logger.ts`, but most server code uses `console.error` for errors. CRM error-handlers use `logger.warn`; other domains do not. Scripts reasonably use console for CLI output.

### File Size Distribution

| File | Lines | Assessment |
|------|-------|------------|
| `server/storage.ts` | 1,684 | Too large; single responsibility violated |
| `shared/schema.ts` | 1,335 | Acceptable for unified schema; consider splitting enums/types |
| `server/domains/identity/routes.ts` | 881 | Large; consider extracting invitation, profile, auth handlers |
| `server/domains/crm/routes.ts` | 384 | Manageable |
| `server/domains/crm/error-handlers.ts` | 313 | Reusable; candidate for shared module |

### Best Practices & Standards

**Strengths**

- Strict TypeScript, ESM, modern tooling.
- ESLint: recommended + TypeScript + React + React Hooks; `@typescript-eslint/no-unused-vars` warn with ignore patterns.
- Prettier for formatting; `npm run format`, `npm run format:check`.
- Drizzle ORM for type-safe queries; Zod for validation where used.

**Weaknesses**

- **`@typescript-eslint/no-explicit-any`** – Disabled (`"off"`); `any` is permitted, reducing type safety.
- **`react/no-unknown-property`** – Disabled for cmdk and similar libs.
- **No `no-console` rule** – Console usage is not restricted; production logging not enforced.
- **README vs. implementation** – NestJS/pnpm mentioned; Express/npm used.
- **Unused import** – `RedisStore` in `server/security.ts` imported but never used; rate limiting is in-memory only.

### Naming Conventions

- **Routes:** `crmRoutes`, `identityRoutes`, etc.; paths like `/api/clients`, `/api/users/me`.
- **Storage methods:** `getX`, `createX`, `updateX`, `deleteX`; `getXPaginated`, `getXWithRelations` where needed.
- **Consistency:** PascalCase for types; camelCase for variables/functions; `organizationId` (camelCase) in application code; `organization_id` (snake_case) in DB columns.

### Information Gaps Addressed

| Gap | Resolution |
|-----|------------|
| Error-handling consistency | Only CRM uses centralized handlers; 8 domains use ad-hoc try/catch |
| Input validation coverage | 4 domains validate (identity, orgs, rbac, CRM clients); 6 do not |
| Console vs. logger | 75+ console.error in server; logger used only in CRM error-handlers |
| DRY in route handlers | ~80 handlers repeat userId/orgId/error pattern |
| Largest files | storage 1684, schema 1335, identity routes 881 |
| ESLint strictness | no-explicit-any off; no-console not enforced |

---

## Phase 3: Security & Reliability

### Security Analysis

| Risk | Status | Notes |
|------|--------|-------|
| **Exposed credentials** | CRITICAL | `package.json` dev script has hardcoded DB URL and password |
| **SQL injection** | Mitigated | Drizzle parameterized queries; no raw concatenation found |
| **XSS** | Mitigated | React escaping; CSP; sanitization middleware |
| **CSRF** | Partial | Token generation/validation in `server/csrf.ts` but **not applied** to any API route |
| **Auth/Authorization** | Good | `requireAuth`, RBAC via `checkPermission`, org scoping |
| **Input validation** | Partial | See Phase 2; 6 domains pass `req.body` unvalidated |

### Authentication & Session

**Current implementation:** Simple cookie-based auth (`ubos_user_id`), not full session management.

| Aspect | Implementation | Notes |
|--------|----------------|-------|
| **Cookie** | HttpOnly, SameSite=Lax, **no Secure** | Secure omitted for local HTTP; **must add in production** |
| **Session module** | `server/session.ts` exists (Redis/memory, TTL, rotation) | **Not used**; login uses plain cookie, not `createSession` |
| **Header auth (dev)** | `x-user-id` / `x-user` accepted when `NODE_ENV !== "production"` | Production explicitly rejects; logs attempt |
| **Login** | `GET /api/login` issues new UUID, sets cookie, redirects | No password; dev-only “mint a user” flow |

**Unauthenticated routes:** 4 routes allow unauthenticated access:

- `GET /api/login` – Issues cookie
- `GET /api/logout` – Clears cookie
- `GET /api/invitations/:token/validate` – Validate invitation token (intentional)
- `POST /api/invitations/:token/accept` – Accept invitation (intentional; creates user)

### CSRF Protection

**Status:** Implemented but **not enforced**.

- `server/csrf.ts` exports `requireCsrf`, `getCsrfTokenHandler`, `validateCsrfToken`, `attachCsrfToken`
- **No route** imports or uses `requireCsrf`; it is never applied
- `registerRoutes` does not mount CSRF middleware
- CSRF tests cover token generation/validation; middleware is not wired into the app

**Recommendation:** Apply `requireCsrf` to all state-changing routes (POST, PUT, PATCH, DELETE) that use cookie auth.

### Authorization (RBAC) & Permission Mismatch

**RBAC flow:** `checkPermission(featureArea, action)` → queries `permissions`, `role_permissions`, `user_roles` → 403 if missing.

**Permission seeding:** `docs/migrations/001-rbac-schema.sql` inserts permissions for: clients, contacts, deals, proposals, contracts, projects, tasks, invoices, bills, files, messages, settings, users, roles. No `dashboard` or `organizations` in the migration.

**Mismatch:** Organization routes use `checkPermission("organizations", "view")` and `checkPermission("organizations", "edit")`, but the permissions table has `settings` (view/edit), not `organizations`. Organization routes may be effectively blocked for users with only seeded permissions unless `organizations` is added elsewhere.

**Dashboard:** Uses `checkPermission("dashboard", "view")`; `dashboard` is not in the migration. Same risk.

### Rate Limiting

| Limiter | Window | Max | Applied To |
|---------|--------|-----|------------|
| Global | 15 min | 1000 req | All requests (skips `/health`, `/api/health`) |
| Auth | 15 min | 10 req | `/api/login`, `/api/logout` |
| API | 15 min | 500 req | `/api/` |

**Note:** `/health` and `/api/health` are referenced in the skip function but **no health route is registered** in the app. GAP_ANALYSIS documents health endpoints as missing.

**Storage:** In-memory only; `RedisStore` imported in `server/security.ts` but **not used**. Multi-instance deployments will not share rate limits.

### Multi-Tenant Isolation

**Enforcement:** Storage methods take `orgId`; all queries filter by `organizationId`. `getOrCreateOrg(userId)` ensures every user has an org.

**Tests:** `multi-tenant-isolation.test.ts` uses **mock storage**; does not hit real DB. TODO in test: “Upgrade to real DB integration tests.”

### File Upload Security

**Organization logo** (`server/domains/organizations/routes.ts`):

- ✅ 5MB limit
- ✅ MIME type check (`image/*`)
- ⚠️ No extension allowlist (e.g. `.png`, `.jpg`, `.webp`)
- ⚠️ Path traversal in `file.originalname` not explicitly validated
- ⚠️ Stored on local disk (`uploads/logos/`), not S3/MinIO

**General files** (`server/domains/files/routes.ts`):

- 10MB limit (multer)
- No MIME type check
- `req.file.originalname` used as-is for display name
- Download uses `res.download(file.path, file.originalName)`; `file.path` is from multer (controlled), but `originalName` could affect `Content-Disposition` filename

### Error Handling & Resilience

**Strengths**

- Global error handler in `server/index.ts`: uses `createSafeErrorLog`, redacts PII, sends generic 5xx message to client
- `security-utils.ts`: redacts credit cards, SSNs, JWTs, API keys, passwords, DB URLs in logs
- Production: no stack traces to client; minimal error logging

**Weaknesses**

- Many route handlers use `console.error` + `res.status(500).json({ error: "..." })` instead of throwing to the global handler or using shared helpers
- Dashboard route uses `console.error` instead of logger
- Errors thrown in handlers are caught by the global handler only if they propagate; many handlers catch and respond locally

### Security Test Coverage

| Test File | Focus |
|-----------|-------|
| `security.test.ts` | Helmet, rate limit, CORS, sanitization setup (mocked) |
| `security-utils.test.ts` | PII redaction, safe error logging |
| `csrf.test.ts` | Token generation, validation, middleware behavior |
| `config-validation.test.ts` | Env vars, session config, proxy, rate limit config |
| `auth-middleware.test.ts` | `requireAuth`, `getUserIdFromRequest` |
| `multi-tenant-isolation.test.ts` | Cross-org access (mock storage) |

**validate:security script:** `npm run validate:security` runs check, test:backend, test:frontend, coverage, build, security:check-tests (detects `.only`/`.skip` in tests).

### Testing Coverage & Strategy

| Metric | Value |
|--------|-------|
| Test files | 62 (backend + frontend) |
| Test types | Unit, integration, property-based (fast-check) |
| Security-focused tests | security, security-utils, csrf, config-validation, auth-middleware, multi-tenant-isolation |

**Failing/flaky tests**

- `permissions.test.ts` – `req.connection` undefined; `db.insert` not mocked in `logPermissionCheck`
- `organization-settings-validation.test.ts` – 2 failures (need case-by-case check)

### Information Gaps Addressed

| Gap | Resolution |
|-----|------------|
| CSRF applied? | No; `requireCsrf` exists but is never used |
| Session vs cookie? | Simple cookie; `session.ts` is unused |
| Unauthenticated routes? | login, logout, invitation validate/accept |
| Cookie Secure flag? | Omitted; required for production HTTPS |
| RBAC permission mismatch? | organizations, dashboard not in migration |
| Health endpoints? | Referenced in rate-limit skip but not implemented |
| Multi-tenant test coverage? | Mock-only; no real DB integration |

---

## Phase 4: Performance & Optimization

### Database Performance

**Query patterns**

| Endpoint / Method | Pattern | Notes |
|-------------------|---------|-------|
| **Dashboard stats** | 4 parallel `Promise.all` queries, full list fetch | Fetches *all* clients, deals, engagements, invoices to count; filters in memory. For large orgs, use `COUNT(*)` or dedicated stats queries. |
| **getClientCompanyWithRelations** | 4 parallel queries | Good; no N+1. |
| **getClientCompaniesPaginated** | 2 queries (count + data) | Same WHERE; acceptable. Count on large tables can be slow; consider cursor pagination for very large datasets. |
| **getClientCompanyStats** | 1 full client list + 1 engagement query | Fetches *all* clients to compute total, recentlyAdded, byIndustry, byCountry in memory. **Inefficient**; should use `COUNT` and `GROUP BY`. |
| **checkClientCompanyDependencies** | 6 parallel `COUNT` queries | Good. |

**N+1:** No N+1 patterns found. Relations use parallel `Promise.all` where needed.

**Indexes:** Schema defines 40+ indexes on `organizationId`, foreign keys, and common filters (stage, status, engagementId, token, etc.). Partial index on outbox for `processed_at IS NULL`. Index coverage is strong.

### Connection Pool

**Configuration:** `server/db.ts` uses default `pg.Pool({ connectionString })`—no `max`, `min`, or `idleTimeoutMillis`.

**Defaults:** node-pg default `max` is 10 connections. Under load, the pool can be exhausted.

**Recommendation:** Add explicit pool config, e.g. `max: 20`, `idleTimeoutMillis: 30000`, per security/configuration docs.

### Per-Request Overhead

**Typical authenticated API request:**

1. **Auth** – `getUserIdFromRequest` (cookie parse, no DB)
2. **Org lookup** – `getOrCreateOrg(userId)` → 1–2 DB calls (getUserOrganization, possibly createOrganization)
3. **Permission check** – 1 `EXISTS` query + 1 insert into `activity_events` (logPermissionCheck)
4. **Handler** – 1+ storage calls

**Total:** 3–5+ DB operations before handler logic. No caching of `userId → orgId` or permissions.

**Recommendation:** Cache `getOrCreateOrg` per request (e.g. `req.organizationId`) or with short TTL to reduce repeated lookups.

### List Endpoints & Pagination

| Endpoint | Pagination | Returns |
|----------|------------|---------|
| `GET /api/clients` | Yes | `getClientCompaniesPaginated` (page, limit, filters) |
| `GET /api/deals` | No | Full list |
| `GET /api/engagements` | No | Full list |
| `GET /api/proposals` | No | Full list |
| `GET /api/contracts` | No | Full list |
| `GET /api/invoices` | No | Full list |
| `GET /api/bills` | No | Full list |
| `GET /api/projects` | No | Full list |
| `GET /api/tasks` | No | Full list |
| `GET /api/threads` | No | Full list |
| `GET /api/vendors` | No | Full list |

**Risk:** Unpaginated lists can return thousands of rows as the org grows. Clients are the only domain with pagination.

### Client-Side Performance

**React Query**

- `staleTime: Infinity` – Data never considered stale; no background refetch
- `refetchOnWindowFocus: false`, `refetchInterval: false` – No automatic refresh
- **Effect:** Fewer requests, but stale data until page refresh or mutation

**Code splitting:** All 16 pages use `React.lazy()`; Vite generates separate chunks. No explicit `manualChunks`; relies on Vite defaults.

**Bundle:** Build outputs to `dist/public/assets/` with hashed filenames. No bundle size analysis in build script.

### Server Build & Cold Start

**esbuild:** Server bundled to `dist/index.cjs`; most deps external. Allowlisted deps (drizzle, express, pg, etc.) are bundled to reduce `openat` syscalls and improve cold start.

**Vite:** Client built with React plugin; `emptyOutDir: true` for clean builds.

### Background Processes

**Event dispatcher**

- `setInterval(processEvents, 5000)` – Polls outbox every 5s
- Batch size: 10 events
- Handlers run sequentially per event
- `stop()` clears interval correctly; no obvious leak

### Resource Management

| Resource | Management | Notes |
|----------|------------|-------|
| **Postgres pool** | Single shared pool | No explicit cleanup on shutdown |
| **Redis** | Single shared client | Optional; `connectRedis()` at startup |
| **Event dispatcher** | `setInterval` | Cleared in `stop()` |
| **Multer** | Per-request | Uses disk storage; temp files in `uploads/` |

**Memory:** No obvious leaks from uncanceled listeners, intervals, or subscriptions in reviewed code.

### Body Size Limits

- **JSON:** 100kb (`express.json({ limit: '100kb' })`)
- **URL-encoded:** 100kb
- Mitigates JSON-bomb / large-payload DoS

### Information Gaps Addressed

| Gap | Resolution |
|-----|------------|
| Dashboard query efficiency | Fetches full lists to count; should use COUNT |
| Pagination coverage | Only clients paginated; 10 other list endpoints return full results |
| Pool configuration | Default only; no max/idleTimeout |
| Per-request DB calls | 3–5+ per request (org + permission + activity log) |
| getClientCompanyStats | Fetches all clients; should use COUNT/GROUP BY |
| memoizee dependency | In package.json but **not imported**; unused |

---

## Phase 5: Scalability & Extensibility

### Scalability

- **Horizontal scaling** – Rate limiting is in-memory; `config-validation` warns about Redis for multi-instance.
- **State** – Sessions and rate limits not shared; multi-instance needs Redis.
- **DB** – Standard Postgres; schema supports sharding by `organizationId` later if needed.

### Extensibility

- Adding domains: new route module + storage methods.
- Workflow engine can register new event handlers.
- RBAC supports new feature areas and permissions.

---

## Phase 6: DevOps & Operations

### Build & Deployment

- Build: `script/build.ts` (Vite client + esbuild server).
- Output: `dist/public/` (client), `dist/index.cjs` (server).
- CI: `.github/workflows/test.yml` – tests, coverage, lint, build; `validate:security` step.

### Gaps

- No DATABASE_URL in CI; tests use `postgresql://test:test@localhost/test_db` (may need Postgres service).
- `npm run build` does not validate env; production startup does.

---

## Phase 7: Dependencies & Technical Debt

### Dependencies

- Core deps are current (React 18, Express 4, Drizzle, Zod, etc.).
- `npm audit` failed (registry/certificate); re-run with default registry to check advisories.

### Technical Debt (TODOs)

| File | Issue |
|------|-------|
| `server/storage.ts` | Password verification when `passwordHash` exists; email confirmation tokens |
| `server/domains/identity/routes.ts` | Store password properly; file storage; org lookup |
| `client/src/pages/organization-settings.tsx` | Email template update API |
| `tests/backend/multi-tenant-isolation.test.ts` | Use real DB instead of mocks |
| `client/src/lib/auth-utils.ts` | Error handling; return URL support |
| `client/src/pages/landing.tsx` | Analytics |

---

## Metrics & Statistics (Approximate)

| Metric | Value |
|--------|-------|
| Total lines (app code) | ~25,000+ (excluding node_modules) |
| `shared/schema.ts` | ~980 lines |
| `server/storage.ts` | ~1,685 lines |
| Domain route modules | 10 |
| Test files | 62 |
| Dependencies | ~60 prod, ~35 dev |

---

## Prioritized Action Plan

### Quick Wins (high impact, low effort)

1. Remove hardcoded `DATABASE_URL` from `package.json`; use `$env:DATABASE_URL` or `.env`.
2. Remove or gate `console.log` in `App.tsx` and `use-auth.ts` (e.g. only in development).
3. Add `req.connection` fallback: `req.socket?.remoteAddress ?? 'unknown'` in permissions middleware.
4. Replace `console.error` in dashboard route with the logger.

### Critical Fixes (must address soon)

1. Rotate DB credentials exposed in `package.json` and remove from version control history if committed.
2. Fix permission tests: mock `db` and ensure `req.connection`/`req.socket` are set.
3. Enforce CSRF on state-changing routes (POST/PUT/DELETE/PATCH).
4. Add extension allowlist and path traversal checks for file uploads.

### Strategic Improvements (significant refactoring)

1. Split `storage.ts` into domain-specific modules (e.g. `storage/crm.ts`, `storage/projects.ts`).
2. Wire `RedisStore` for rate limiting in production when Redis is available.
3. Align README with implementation (Express, npm).
4. Add structured logging/metrics for production.

### Long-term Enhancements (architectural changes)

1. Object storage (S3/MinIO) for uploads instead of local disk.
2. Complete flagship workflows (e.g. proposal.accepted → contract, invoice.drafted).
3. Replace multi-tenant mocks with real DB integration tests.

---

## Code Examples for Recommendations

### 1. Remove Hardcoded Credentials

**Current (`package.json`):**

```json
"dev": "cross-env NODE_ENV=development DATABASE_URL=postgres://postgres:S34Trev8738!@... tsx server/index.ts",
```

**Recommended:**

```json
"dev": "cross-env NODE_ENV=development tsx server/index.ts",
```

Document in README: set `DATABASE_URL` in the shell or via `.env` before running.

### 2. Gate Debug Logging

**Current (`App.tsx`):**

```ts
console.log("[Router] Auth state:", { user, isLoading, isAuthenticated, location });
```

**Recommended:**

```ts
if (import.meta.env.DEV) {
  console.debug("[Router] Auth state:", { isLoading, isAuthenticated, location });
}
```

### 3. Fix `req.connection` Access

**Current (`permissions.ts`):**

```ts
const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
```

**Recommended:**

```ts
const clientIp = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
```

### 4. Use Redis for Rate Limiting When Available

**Current:** Only in-memory store.

**Recommended:** In `server/security.ts`, when `REDIS_URL` is set, use `RedisStore`:

```ts
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "./redis";

const store = process.env.REDIS_URL 
  ? new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args) })
  : undefined;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  store,
  // ...
});
```

---

*Analysis performed February 2025. For security fixes (especially credential rotation and CSRF enforcement), implement and verify changes before deployment.*
