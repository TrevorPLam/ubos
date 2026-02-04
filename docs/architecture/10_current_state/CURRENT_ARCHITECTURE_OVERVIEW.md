# Current Architecture Overview

**Purpose:** Document the actual architecture as implemented in the codebase  
**Status:** Active development (early stage)  
**Last verified:** 2026-02-04

## Current State Summary

UBOS is a **single-process monolith** (not yet modular) with a React SPA client and Express API server. It implements a multi-tenant business operations platform with lightweight local auth.

**Key characteristics:**
- Single database (Postgres) with flat table structure (no schema separation yet)
- Cookie-based auth for development (OIDC-ready but not implemented)
- Multi-tenancy via `organizationId` column on all tables
- No event-driven architecture (no outbox, no async workers)
- No workflow engine
- Direct cross-domain queries (no boundaries enforced)
- Monolithic storage layer (`server/storage.ts`)

## High-Level Runtime Architecture

```
┌─────────────────────────────────────────────────────┐
│           React SPA (Vite + React Router)           │
│  - Client code in client/src/                       │
│  - Pages: dashboard, clients, deals, projects, etc. │
│  - React Query for API state management             │
│  - Radix UI + Tailwind CSS                          │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP (REST JSON)
┌──────────────────▼──────────────────────────────────┐
│            Express API Server (Node.js)              │
│  - Entry: server/index.ts                           │
│  - Routes: server/routes.ts (1047 lines)            │
│  - Auth: Cookie-based (dev) or header (x-user-id)   │
│  - Security: Helmet, rate limiting, CORS, CSRF      │
│  - Storage: server/storage.ts (monolithic)          │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 Postgres (via Drizzle ORM)           │
│  - Schema: shared/schema.ts (905 lines)             │
│  - Tables: 20+ tables (orgs, clients, deals, etc.)  │
│  - Multi-tenancy: organizationId column             │
│  - No schema separation (single public schema)      │
└──────────────────────────────────────────────────────┘
```

## Implemented Domains (Current)

The codebase has **data models** for target domains but no architectural boundaries yet:

| Domain Area | Status | Evidence |
|------------|--------|----------|
| **Organizations** (multi-tenancy) | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L119-L135) |
| **CRM** (clients, contacts) | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L155-L227), [server/routes.ts](../../../server/routes.ts#L186-L304) |
| **Deals** (pipeline) | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L229-L261), [server/routes.ts](../../../server/routes.ts#L306-L387) |
| **Proposals** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L263-L292), [server/routes.ts](../../../server/routes.ts#L389-L488) |
| **Contracts** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L294-L331), [server/routes.ts](../../../server/routes.ts#L490-L556) |
| **Engagements** (hub) | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L333-L367), [server/routes.ts](../../../server/routes.ts#L558-L639) |
| **Projects & Tasks** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L369-L469), [server/routes.ts](../../../server/routes.ts#L641-L785) |
| **Files** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L471-L496), [server/routes.ts](../../../server/routes.ts) |
| **Threads/Messages** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L498-L543), [server/routes.ts](../../../server/routes.ts#L787-L893) |
| **Invoices (AR)** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L545-L620), [server/routes.ts](../../../server/routes.ts#L895-L978) |
| **Bills (AP)** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L628-L679), [server/routes.ts](../../../server/routes.ts#L980-L1047) |
| **Vendors** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L622-L640) |
| **Activity Timeline** | ✅ Implemented | [shared/schema.ts](../../../shared/schema.ts#L681-L707) |
| **Portal Access** | ✅ Implemented (schema only) | [shared/schema.ts](../../../shared/schema.ts#L709-L731) |
| **Identity/Auth** | ⚠️ Dev-only | [shared/models/auth.ts](../../../shared/models/auth.ts), [server/routes.ts](../../../server/routes.ts#L89-L152) |
| **Workflow Engine** | ❌ Not implemented | PLAN.md requirement, no code yet |
| **Outbox/Events** | ❌ Not implemented | PLAN.md requirement, no code yet |
| **Email Sync** | ❌ Not implemented | PLAN.md requirement, no code yet |
| **Scheduling** | ❌ Not implemented | PLAN.md requirement, no code yet |
| **Global Search** | ❌ Not implemented | PLAN.md requirement, no code yet |
| **Ledger Integration** | ❌ Not implemented | PLAN.md requirement, no code yet |
| **E-sign Integration** | ❌ Not implemented | PLAN.md requirement, no code yet |

## Key Characteristics

### Architecture Pattern
- **Current:** Single-process monolith with flat table structure
- **Target:** Modular monolith with schema-per-domain + event-driven communication
- **Gap:** No domain boundaries, no event sourcing, no workflow engine

### Multi-Tenancy
- **Current:** `organizationId` column on all business tables
- **Enforcement:** Application-level filtering in storage layer ([server/storage.ts](../../../server/storage.ts))
- **No RLS:** Postgres Row-Level Security not implemented yet
- **Auth gate:** `getOrCreateOrg(userId)` in routes ([server/routes.ts](../../../server/routes.ts#L112-L122))

### Authentication & Authorization
- **Current:** Lightweight cookie-based auth for development
  - Login: `GET /api/login` mints random UUID, stores in HttpOnly cookie
  - Dev shortcut: `x-user-id` header (disabled in production)
- **Session storage:** In-memory (no Redis yet)
- **RBAC:** Schema exists ([shared/models/auth.ts](../../../shared/models/auth.ts)) but not enforced in routes
- **Production-ready:** ❌ Dev-only auth, needs OIDC integration

### Data Access Pattern
- **Current:** Monolithic storage layer ([server/storage.ts](../../../server/storage.ts))
- **ORM:** Drizzle ([server/db.ts](../../../server/db.ts))
- **Cross-domain reads:** Allowed (no boundaries enforced)
- **No caching:** Direct DB queries on every request
- **No connection pooling:** Basic pg Pool ([server/db.ts](../../../server/db.ts#L23))

### Security
- **Headers:** Helmet middleware ([server/security.ts](../../../server/security.ts))
  - HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **Rate limiting:** Express rate limiter ([server/security.ts](../../../server/security.ts))
  - Global: 1000 req/15min
  - Auth: 10 req/15min
- **CORS:** Configurable origins ([server/security.ts](../../../server/security.ts))
- **Request sanitization:** PII redaction in logs ([server/security-utils.ts](../../../server/security-utils.ts))
- **Payload limits:** 100kb JSON/urlencoded ([server/index.ts](../../../server/index.ts#L54-L64))
- **CSRF:** csurf middleware (UNKNOWN: need to verify if enabled)
- **Audit logging:** Activity events table exists but incomplete coverage

### Observability
- **Logging:** Console logs with timestamp + source ([server/index.ts](../../../server/index.ts#L68-L77))
- **Request logging:** Duration + status code + PII redaction ([server/index.ts](../../../server/index.ts#L79-L131))
- **Structured logs:** ❌ Not implemented
- **Metrics:** ❌ Not implemented
- **Tracing:** ❌ Not implemented
- **Alerting:** ❌ Not implemented

## Technology Stack

### Frontend
- **Framework:** React 18.3.1
- **Bundler:** Vite 5.x
- **Routing:** Wouter 3.3.5 (lightweight)
- **State:** React Query 5.60.5 (API caching)
- **UI:** Radix UI + Tailwind CSS + shadcn/ui components
- **Forms:** React Hook Form + Zod validation
- **Build:** [vite.config.ts](../../../vite.config.ts)

### Backend
- **Runtime:** Node.js 20.x LTS
- **Framework:** Express 4.21.2
- **Database:** Postgres (via Drizzle ORM 0.39.3)
- **Schema:** [shared/schema.ts](../../../shared/schema.ts) (Drizzle + Zod)
- **Session:** In-memory (no Redis yet)
- **Security:** Helmet 8.1.0, express-rate-limit 8.2.1, csurf 1.11.0
- **Build:** esbuild ([script/build.ts](../../../script/build.ts))

### Testing
- **Framework:** Vitest
- **Backend tests:** [vitest.config.ts](../../../vitest.config.ts)
- **Frontend tests:** [vitest.config.client.ts](../../../vitest.config.client.ts)
- **Coverage:** v8 provider
- **Test location:** [tests/](../../../tests/)

### Build & Tooling
- **Package manager:** npm (not pnpm yet)
- **Monorepo:** Single package.json (not multi-package yet)
- **Typecheck:** TypeScript 5.x
- **Lint:** ESLint 9.x
- **Format:** Prettier

## Runtime Entry Points

| Component | Entry Point | Responsibility |
|-----------|-------------|----------------|
| **API Server** | [server/index.ts](../../../server/index.ts) | Express app + security middleware + API routes + client serving |
| **Client** | [client/src/main.tsx](../../../client/src/main.tsx) | React root mount |
| **App Shell** | [client/src/App.tsx](../../../client/src/App.tsx) | Auth gate + routing + layout |
| **Build** | [script/build.ts](../../../script/build.ts) | Production build (Vite + esbuild) |

## Configuration Model

### Environment Variables
- **DATABASE_URL** (required): Postgres connection string
- **PORT** (optional, default 5000): HTTP server port
- **NODE_ENV** (auto-set): `development` or `production`
- **ALLOWED_ORIGINS** (optional): CORS allowed origins (comma-separated)

**UNKNOWN:** No `.env` file loader. Env vars must be set in shell/IDE.

### Configuration Files
- [tsconfig.json](../../../tsconfig.json): TypeScript config (incremental, ES2022, ESNext modules)
- [vite.config.ts](../../../vite.config.ts): Vite config (path aliases, build output)
- [vitest.config.ts](../../../vitest.config.ts): Backend test config
- [vitest.config.client.ts](../../../vitest.config.client.ts): Frontend test config
- [eslint.config.js](../../../eslint.config.js): ESLint flat config
- [tailwind.config.ts](../../../tailwind.config.ts): Tailwind CSS config
- [package.json](../../../package.json): Dependencies + scripts

## Known Gaps vs Target Architecture

| Gap | Current | Target | Priority |
|-----|---------|--------|----------|
| **Domain boundaries** | None (monolithic storage) | Schema-per-domain | P0 |
| **Event-driven** | None | Outbox + dispatcher | P0 |
| **Workflow engine** | None | Triggers + actions + orchestration | P0 |
| **RBAC enforcement** | Schema only | Route middleware + service checks | P1 |
| **Redis caching** | None | Sessions + rate limiting + hot data | P1 |
| **Object storage** | None | MinIO/S3 for files | P1 |
| **Email sync** | None | OAuth + background jobs | P2 |
| **Ledger integration** | None | QBO/Xero stubs + sync | P2 |
| **E-sign integration** | None | DocuSign/etc + webhooks | P2 |
| **Global search** | None | Postgres baseline → OpenSearch | P2 |
| **Audit log coverage** | Partial (activity_events table) | All mutations logged | P1 |
| **Structured logging** | None (console.log) | JSON logs + correlation IDs | P2 |
| **Metrics/tracing** | None | Prometheus + OpenTelemetry | P2 |

See [GAP_ANALYSIS.md](../60_gaps_and_roadmap/GAP_ANALYSIS.md) for detailed roadmap.

---

**Navigation:**
- [REPO_MAP.md](./REPO_MAP.md): Detailed directory structure and ownership
- [RUNTIME_COMPONENTS.md](./RUNTIME_COMPONENTS.md): Server/client/workers decomposition
- [BUILD_AND_TOOLING.md](./BUILD_AND_TOOLING.md): Build system and scripts
- [TARGET_ARCHITECTURE.md](../00_plan_intent/TARGET_ARCHITECTURE.md): What we're building toward

**Last verified by:** Manual file inspection + `npm run check` + `npm test`
