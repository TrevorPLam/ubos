# REPO.md — UBOS Repository Context

## What this repo is / will become

**Current Status**: Full-stack TypeScript app (React + Express) with Postgres backend. Security-first MVP with comprehensive documentation and agent-driven governance structure.

**Goal**: Modular monolith designed to be shippable, secure-by-default, and extractable into microservices later. Full platform skeleton with MVP vertical slice including CRM, Projects, Scheduling, Files, Communications, Agreements, Revenue (AR/AP), Workflow engine, and Integration framework.

## Repo Map (Reality)

- `client/`: React app (Vite root) - Frontend SPA with React Query, Radix UI, Tailwind CSS
- `server/`: Express server + API routes + dev/prod client hosting, security middleware
- `shared/`: Shared types/schema (Zod) used by both client and server
- `script/`: Build pipeline (build.ts) - Vite + esbuild for production
- `tests/`: Test suites (backend, frontend, fixtures, utils) - Vitest + Testing Library
- `docs/`: Comprehensive documentation
  - `api/`: API documentation and OpenAPI specs
  - `architecture/`: Architecture decision records and system design
  - `security/`: Security standards, compliance (SOC2, PCI-DSS, HIPAA, GDPR)
  - `tests/`: Test documentation
  - `user/`: User documentation
- `agents/`: Agent governance structure
  - `roles/`: 30 specialized agent roles with task management
  - Each role has: `<role_name>.md` + `tasks/` (TODO.md, BACKLOG.md, TASKS.md, ARCHIVE.md, TASK_INDEX.md)

## Conventions

- **Language**: TypeScript (primary) - strict mode enabled
- **Package Manager**: npm (not pnpm/turbo despite README mentions - based on package-lock.json)
- **Testing**: vitest (separate configs for backend + client)
  - `vitest.config.ts` - backend tests
  - `vitest.config.client.ts` - frontend tests
  - Coverage via @vitest/coverage-v8
- **Database**: PostgreSQL via Drizzle ORM
- **Security**: 
  - `/server/security.ts` - security middleware (Helmet, rate limiting)
  - `/server/csrf.ts` - CSRF protection
  - `/docs/security/` - comprehensive security documentation
- **Build**: Vite (client) + esbuild (server) via custom build script
- **Styling**: Tailwind CSS + Radix UI components
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query (React Query)
- **Routing**: Wouter (lightweight React router)

## Golden Commands

- **Install**: `npm install`
- **Dev server**: `npm run dev` (sets NODE_ENV=development, runs via tsx)
- **Typecheck**: `npm run check` (checks both tsconfig.json + tsconfig.node.json)
- **Tests**: 
  - `npm test` - run all tests
  - `npm run test:backend` - backend only
  - `npm run test:frontend` - frontend only
  - `npm run test:ci` - with coverage
- **Build**: `npm run build` (runs script/build.ts)
- **Production**: `npm start` (runs dist/index.cjs)
- **Lint**: `npm run lint` (ESLint on client, server, shared)
- **Format**: `npm run format` (Prettier)
- **Security validation**: `npm run validate:security` (full security check suite)

## Environment Variables

**Required**:
- `DATABASE_URL`: Postgres connection string (format: `postgres://USER:PASSWORD@HOST:PORT/DB_NAME`)

**Optional**:
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (set by scripts: development/production)

**Note**: This repo does **not** auto-load `.env` files at runtime. Set vars in shell/IDE. See `.env.example` for reference.

## Critical Invariants

- **Multi-tenant scoping required on all data access** (tenant_id everywhere)
- **No sensitive logging** (redaction enforced via logger configuration)
- **No "dev auth bypass" in production** (auth required for all protected routes)
- **Domain boundaries enforced**:
  - No cross-domain DB reads
  - No cross-domain imports
  - Workflow engine is the only cross-domain orchestrator
- **Golden Record**: CRM owns canonical Client/Contact; other domains reference client_id/contact_id
- **Security-first**: All user input validated via Zod schemas, parameterized queries, security headers
- **Test requirements**: All changes must include tests; no .only() or .skip() in committed tests

## Architecture Principles

1. **Modular monolith** - strict domain boundaries, schema-per-domain in Postgres
2. **Outbox pattern** - event-driven with outbox table + dispatcher worker
3. **Workflow engine** - orchestrates cross-domain business processes
4. **Unification primitives**: Timeline (append-only), Client Profile read model, Global Search
5. **Integration framework**: OAuth for email, ledger sync stubs, e-sign abstraction
6. **Security-by-default**: tenant isolation, audit logs, presigned URLs, least privilege