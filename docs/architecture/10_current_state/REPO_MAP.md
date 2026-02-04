# Repository Map

**Purpose:** Document monorepo structure, ownership, and file responsibilities  
**Last verified:** 2026-02-04

## Monorepo Structure

```
ubos/
├── client/                    # React SPA (Vite root)
│   ├── index.html             # HTML entry point
│   └── src/
│       ├── main.tsx           # React mount point
│       ├── App.tsx            # Root component (auth gate + routing)
│       ├── index.css          # Global styles (Tailwind)
│       ├── components/        # Reusable UI components
│       │   ├── ui/            # shadcn/ui components (Radix wrappers)
│       │   ├── app-header.tsx
│       │   ├── app-sidebar.tsx
│       │   ├── data-table.tsx
│       │   ├── empty-state.tsx
│       │   ├── stat-card.tsx
│       │   ├── status-badge.tsx
│       │   ├── theme-provider.tsx
│       │   └── theme-toggle.tsx
│       ├── hooks/             # React hooks (use-auth, etc.)
│       ├── lib/               # Client utilities (queryClient, utils)
│       └── pages/             # Route pages (lazy-loaded)
│           ├── landing.tsx
│           ├── dashboard.tsx
│           ├── clients.tsx
│           ├── contacts.tsx
│           ├── deals.tsx
│           ├── proposals.tsx
│           ├── contracts.tsx
│           ├── engagements.tsx
│           ├── projects.tsx
│           ├── messages.tsx
│           ├── invoices.tsx
│           ├── bills.tsx
│           ├── settings.tsx
│           └── not-found.tsx
├── server/                    # Express API server
│   ├── index.ts               # Server entry point (HTTP + security + routes)
│   ├── routes.ts              # All API endpoints (1047 lines)
│   ├── storage.ts             # Monolithic data access layer
│   ├── db.ts                  # Drizzle ORM initialization
│   ├── security.ts            # Security middleware (Helmet, rate limit, CORS)
│   ├── security-utils.ts      # PII redaction, log sanitization
│   ├── csrf.ts                # CSRF token handling
│   ├── session.ts             # Session management (dev: in-memory)
│   ├── static.ts              # Static file serving (prod: dist/public)
│   └── vite.ts                # Vite dev middleware integration
├── shared/                    # Shared code (client + server)
│   ├── schema.ts              # Drizzle schema + Zod types (905 lines)
│   ├── schema.test.ts         # Schema validation tests
│   └── models/
│       └── auth.ts            # Auth-related types (user, tenant, RBAC)
├── script/                    # Build scripts
│   └── build.ts               # Production build (Vite + esbuild)
├── tests/                     # Test suites
│   ├── backend/               # Backend tests
│   │   ├── api-routes.test.ts
│   │   ├── auth-middleware.test.ts
│   │   ├── csrf.test.ts
│   │   ├── multi-tenant-isolation.test.ts
│   │   ├── security-utils.test.ts
│   │   └── security.test.ts
│   ├── frontend/              # Frontend tests
│   │   └── page-flows.test.ts
│   ├── fixtures/              # Test data factories
│   │   └── factories.ts
│   ├── setup/                 # Test setup
│   │   ├── backend.setup.ts
│   │   └── frontend.setup.ts
│   └── utils/                 # Test utilities
│       ├── express-mocks.ts
│       └── react-test-utils.tsx
├── docs/                      # Documentation
│   ├── architecture/          # Architecture docs (this folder)
│   ├── security/              # Security standards + compliance
│   ├── api/                   # API documentation
│   ├── data/                  # Data model documentation
│   ├── tests/                 # Testing documentation
│   ├── COMMENTING.md
│   ├── CURRENT_STATE_AND_TEST_PLAN.md
│   ├── FINAL_VALIDATION_REPORT.md
│   ├── TESTING.md
│   └── TEST_*.md
├── tasks/                     # Project management (file-based)
│   ├── TASKS.md               # Active tasks
│   ├── BACKLOG.md             # Backlog
│   ├── TODO.md                # Quick todos
│   ├── TASK_INDEX.md          # Task index
│   └── ARCHIVE.md             # Completed tasks
├── package.json               # Dependencies + scripts
├── tsconfig.json              # TypeScript config (root)
├── tsconfig.node.json         # TypeScript config (Node scripts)
├── tsconfig.test.json         # TypeScript config (tests)
├── vite.config.ts             # Vite config (client bundler)
├── vitest.config.ts           # Vitest config (backend tests)
├── vitest.config.client.ts    # Vitest config (frontend tests)
├── eslint.config.js           # ESLint config
├── tailwind.config.ts         # Tailwind CSS config
├── postcss.config.cjs         # PostCSS config
├── PLAN.md                    # Project plan (target architecture)
└── README.md                  # Setup instructions
```

## Directory Responsibilities

### `/client` — React SPA

| Path | Responsibility | Key Files |
|------|---------------|-----------|
| `client/src/main.tsx` | React mount point | Entry point |
| `client/src/App.tsx` | Auth gate + routing | Root component with providers |
| `client/src/pages/` | Route pages (lazy-loaded) | 14 pages (dashboard, clients, etc.) |
| `client/src/components/` | Reusable UI | Header, sidebar, tables, badges, etc. |
| `client/src/components/ui/` | shadcn/ui components | Radix UI wrappers (buttons, dialogs, etc.) |
| `client/src/hooks/` | React hooks | `use-auth`, etc. |
| `client/src/lib/` | Client utilities | Query client, utility functions |
| `client/index.html` | HTML shell | Vite entry point |

**Ownership:** Frontend team  
**Build output:** `dist/public/`  
**Dev server:** Vite middleware in `server/vite.ts`

### `/server` — Express API

| Path | Responsibility | Key Files |
|------|---------------|-----------|
| `server/index.ts` | HTTP server + middleware | Entry point (security, routes, client serving) |
| `server/routes.ts` | API endpoints | All REST routes (1047 lines) |
| `server/storage.ts` | Data access layer | Monolithic storage (queries Drizzle) |
| `server/db.ts` | Database connection | Drizzle ORM + pg Pool |
| `server/security.ts` | Security middleware | Helmet, rate limiting, CORS |
| `server/security-utils.ts` | Log sanitization | PII redaction |
| `server/csrf.ts` | CSRF protection | Token generation/validation |
| `server/session.ts` | Session management | In-memory (dev), Redis (future) |
| `server/static.ts` | Static file serving | Serves `dist/public/` in production |
| `server/vite.ts` | Vite dev middleware | HMR integration |

**Ownership:** Backend team  
**Build output:** `dist/index.cjs`  
**Runtime:** Node.js 20.x LTS

### `/shared` — Shared Types & Schema

| Path | Responsibility | Key Files |
|------|---------------|-----------|
| `shared/schema.ts` | Database schema + types | Drizzle tables + Zod schemas (905 lines) |
| `shared/schema.test.ts` | Schema validation tests | Zod schema tests |
| `shared/models/auth.ts` | Auth types | User, tenant, RBAC types |

**Ownership:** Shared (both frontend + backend)  
**Used by:** Client (types only), Server (types + ORM)

### `/tests` — Test Suites

| Path | Responsibility | Test Type |
|------|---------------|-----------|
| `tests/backend/` | Backend tests | API routes, auth, security, multi-tenancy |
| `tests/frontend/` | Frontend tests | Page flows, component tests |
| `tests/fixtures/` | Test data | Factories for test data generation |
| `tests/setup/` | Test setup | Vitest setup files |
| `tests/utils/` | Test utilities | Mocks, helpers |

**Ownership:** QA + Engineers  
**Coverage:** Backend (vitest.config.ts), Frontend (vitest.config.client.ts)

### `/docs` — Documentation

| Path | Responsibility | Status |
|------|---------------|--------|
| `docs/architecture/` | Architecture docs | 🆕 Created today |
| `docs/security/` | Security standards | ✅ Comprehensive |
| `docs/api/` | API documentation | ⚠️ Partial |
| `docs/data/` | Data model docs | ✅ Present |
| `docs/tests/` | Testing docs | ✅ Present |
| `docs/*.md` | Project docs | Various status reports |

**Ownership:** All teams (living documentation)

### `/tasks` — Project Management

| Path | Responsibility | Status |
|------|---------------|--------|
| `tasks/TASKS.md` | Active tasks | Updated frequently |
| `tasks/BACKLOG.md` | Backlog | Prioritized |
| `tasks/TODO.md` | Quick todos | Ad-hoc |
| `tasks/ARCHIVE.md` | Completed | Archive |

**Ownership:** PM + Tech Lead  
**Format:** Markdown checklists

### `/script` — Build Scripts

| Path | Responsibility | Used By |
|------|---------------|---------|
| `script/build.ts` | Production build | `npm run build` |

**Ownership:** DevOps + Build Engineers  
**Output:** `dist/` (client + server)

## Build Artifacts

### Development
- **Client:** Served via Vite dev middleware (HMR enabled)
- **Server:** Run via `tsx server/index.ts` (no build)
- **Hot reload:** Vite for client, tsx watch for server (manual)

### Production
- **Client:** `dist/public/` (Vite build)
- **Server:** `dist/index.cjs` (esbuild bundle)
- **Command:** `npm run build` → `node dist/index.cjs`

## Configuration Files

| File | Purpose | Owner |
|------|---------|-------|
| [package.json](../../../package.json) | Dependencies + scripts | All |
| [tsconfig.json](../../../tsconfig.json) | TS config (root) | All |
| [tsconfig.node.json](../../../tsconfig.node.json) | TS config (scripts) | Build |
| [tsconfig.test.json](../../../tsconfig.test.json) | TS config (tests) | QA |
| [vite.config.ts](../../../vite.config.ts) | Vite bundler config | Frontend |
| [vitest.config.ts](../../../vitest.config.ts) | Backend tests | Backend |
| [vitest.config.client.ts](../../../vitest.config.client.ts) | Frontend tests | Frontend |
| [eslint.config.js](../../../eslint.config.js) | Linting rules | All |
| [tailwind.config.ts](../../../tailwind.config.ts) | Tailwind CSS | Frontend |
| [postcss.config.cjs](../../../postcss.config.cjs) | PostCSS (Tailwind) | Frontend |

## Path Aliases (Import Resolution)

Defined in [tsconfig.json](../../../tsconfig.json) and [vite.config.ts](../../../vite.config.ts):

```typescript
"@/*"      → "./client/src/*"
"@shared/*" → "./shared/*"
```

**Usage:**
```typescript
// Client
import { Button } from "@/components/ui/button";
import { insertClientSchema } from "@shared/schema";

// Server
import * as schema from "@shared/schema";
```

## Module Boundaries (Current)

**Status:** ❌ No boundaries enforced (monolithic structure)

| Boundary | Current State | Target State |
|----------|--------------|--------------|
| **Client ↔ Server** | Shared types via `@shared/schema` | ✅ Correct (types only) |
| **Server domains** | Single `storage.ts` file | ❌ Should be modular |
| **Cross-domain reads** | Allowed (no checks) | ❌ Should be event-driven |
| **Schema separation** | Single schema file | ❌ Should be schema-per-domain |

See [GAP_ANALYSIS.md](../60_gaps_and_roadmap/GAP_ANALYSIS.md) for modularization plan.

## Dependency Graph (High-Level)

```
client/src/pages/*.tsx
  ↓ (React Query)
client/src/hooks/use-auth.ts
  ↓ (fetch)
server/routes.ts
  ↓ (calls)
server/storage.ts
  ↓ (uses)
server/db.ts (Drizzle)
  ↓ (queries)
Postgres (DATABASE_URL)

shared/schema.ts
  ↑ (types)
  └── client + server (both import)
```

## File Counts (Approximate)

| Directory | File Count | Lines of Code |
|-----------|-----------|---------------|
| `client/src/` | ~50 files | ~5,000 LOC |
| `server/` | ~10 files | ~3,000 LOC |
| `shared/` | ~3 files | ~1,000 LOC |
| `tests/` | ~10 files | ~1,500 LOC |
| `docs/` | ~50 files | ~10,000 LOC (mostly markdown) |
| **Total** | ~120 files | ~20,000 LOC (code) |

**Note:** Counts are approximate, generated by manual inspection.

---

**Navigation:**
- [CURRENT_ARCHITECTURE_OVERVIEW.md](./CURRENT_ARCHITECTURE_OVERVIEW.md): High-level architecture
- [RUNTIME_COMPONENTS.md](./RUNTIME_COMPONENTS.md): Server/client/workers runtime
- [BUILD_AND_TOOLING.md](./BUILD_AND_TOOLING.md): Build system details

**Last verified by:** `ls -R` + manual file inspection
