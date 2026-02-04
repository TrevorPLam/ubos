# UBOS

UBOS is a full-stack TypeScript app (React + Express) with a Postgres-backed API.
How every aspect of this repo should reflect: the basics and the fundaments (industry standards), the highest standards and best practices (enterprise level), and unique and novel information (differentiators).

## Prerequisites

- **Node.js:** 20.x LTS recommended
- **Postgres:** running locally or reachable from your environment

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables.

This repo does **not** auto-load a `.env` file at runtime. Use your shell/IDE to set env vars.
See `.env.example` for the full list.

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/ubos"
$env:PORT = "5000"
npm run dev
```

**bash/zsh (macOS/Linux):**

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/ubos"
export PORT="5000"
npm run dev
```

3. Run the app in development:

```bash
npm run dev
```

Open `http://localhost:5000`.

Tip: the app uses lightweight local auth. Visit `http://localhost:5000/api/login` to mint a dev user cookie.

## Common commands

- **Dev server (API + client via Vite middleware):** `npm run dev`
- **Typecheck:** `npm run check`
- **Production build (client + server):** `npm run build`
- **Run production bundle:** `npm start`

## Build output

- Client build: `dist/public/`
- Server bundle: `dist/index.cjs`

`npm start` runs `node dist/index.cjs` (make sure you’ve run `npm run build` first).

## Environment variables

Documented in `.env.example`.

- **Required**
  - `DATABASE_URL`: Postgres connection string used by the server.
- **Optional**
  - `PORT`: Port the server listens on (defaults to `5000`).
  - `NODE_ENV`: Set by scripts (`development` for `npm run dev`, `production` for `npm start`).

## Troubleshooting

- **“DATABASE_URL must be set”**
  - Set `DATABASE_URL` in your shell/IDE before running the server.
  - Confirm the database is reachable (host/port/credentials).

- **Port already in use**
  - Set `PORT` to another value (e.g. `5001`) and rerun.

- **Production server can’t find built assets**
  - If you see an error about a missing build directory, run `npm run build`.
  - Ensure `dist/public/` exists and is deployed alongside `dist/index.cjs`.

## Repo layout (high level)

- `client/` — React app (Vite root)
- `server/` — Express server + API routes + dev/prod client hosting
- `shared/` — Shared types/schema used by both client and server
- `script/build.ts` — Production build pipeline (Vite + esbuild)
- `agents/roles/` — Agent roles and task management per role
- `docs/` — Project documentation including security standards

## Architecture & Development Plan

UBOS is a full-stack modular monolith designed to be shippable, secure-by-default, and extractable into microservices later.

### Non-Negotiables

- **Architecture**: Modular monolith with strict domain boundaries, schema-per-domain in Postgres, outbox events, workflow engine as the only cross-domain orchestrator.
- **Golden Record**: CRM owns canonical Client/Contact. All other domains reference client_id / contact_id. No cross-domain DB reads.
- **Unification Primitives**: Timeline (append-only), Client Profile read model, Global Search, Workflow engine. These are first-class.
- **Integrations**: Email via OAuth APIs (Microsoft Graph, Gmail). Ledger via QuickBooks/Xero. E-sign via DocuSign/Dropbox Sign/PandaDoc. Files in object storage (S3/MinIO).
- **Scope**: Build the full platform skeleton + MVP vertical slice + Agreements + AR/AP orchestration layers.
- **Security**: tenant_id everywhere; audit logs; presigned URLs; least privilege; integration token vault; per-tenant integration health page.
- **Output**: Complete and runnable. Prefer "simple, correct, observable" over clever.

### Technology Stack

- **Language/Framework**: Node.js + NestJS + TypeScript
- **Database**: PostgreSQL
- **Cache/Jobs**: Redis
- **Object Storage**: S3-compatible (MinIO for local development)
- **Frontend**: React SPA (single shell; no micro-frontends)
- **Package Manager**: pnpm
- **Monorepo**: Yes

### Deliverables

#### A) Repo-as-Governance
1. `/agents/roles/` governance structure:
   - 30 specialized agent roles with task management per role
   - Policy and governance frameworks
   - Task management (TODO, BACKLOG, ARCHIVE per role)

2. System documentation:
   - Architecture documentation (bounded contexts, rules)
   - Domain contracts (API, events)
   - Runbooks (local dev, env vars, debugging)
   - Security documentation (tenant isolation, auth, secrets, audit)

#### B) Backend (Modular Monolith)

Domain modules (each with schema migrations, services, API routes):

- **identity** — Tenant, users, RBAC, sessions, OIDC-ready
- **crm** — Golden record: client/contact/relationship, tags, custom fields (JSONB)
- **projects** — Projects, tasks, kanban states, denormalized client_id
- **files** — Tree nodes, blob metadata, versions, presigned URLs, request links
- **communications** — Email sync scaffolding, thread/message storage, link-to-client
- **scheduling** — Appointments, external calendar IDs, booking endpoints
- **portal** — Magic links, client-facing views (tasks/files/approvals)
- **agreements** — Templates, proposals, proposal versions, contracts, signature packets
- **revenue** — AR/AP orchestration: billing_account, invoice, payment, vendor, bill, approvals, ledger sync mapping
- **workflow** — Triggers, conditions, actions, runs, retries, idempotency
- **timeline** — Activity events (append-only)
- **search** — Basic Postgres search; interface for later OpenSearch migration

#### C) Eventing

- Outbox table + dispatcher worker
- Canonical event types + versioning
- Idempotent event handlers
- Dead-letter + retry tracking
- Per-tenant Integration Health page (last sync, errors, reauth CTA)

#### D) Frontend

React SPA with:

- Auth screens
- Client Profile (hub)
- Timeline view
- CRM lists/detail
- Projects/tasks (basic kanban + list)
- Files (tree, upload, request links)
- Scheduling booking pages (basic)
- Portal (magic link views)
- Agreements (template/proposal/contract UI—minimal)
- Revenue (invoices/bills lists, approval)
- Integration Health dashboard
- Command-K global search

#### E) Flagship Workflows

Implement as first-class workflow definitions:

1. **appointment.booked** → create/attach contact+client → create portal user → create folder template → create project skeleton
2. **proposal.accepted** → contract.send_for_signature → on signed activate project + invoice plan
3. **file.request.completed** → attach file to project → create review task → notify assignee
4. **milestone/task.completed OR time threshold** → invoice.drafted → approval → issue to ledger (stub integration) → notify portal
5. **invoice.paid** → update CRM client status/timeline + schedule follow-up
6. **bill.received** → approval routing → push to ledger (stub) → status/timeline update

#### F) Integrations (MVP)

Stubs, contracts, and health tracking:

- **Email**: OAuth connect + sync job scaffold (Graph/Gmail)—no full parity needed
- **Ledger**: QBO/Xero integration stubs + mapping + sync jobs
- **E-sign**: Provider abstraction + webhook receiver + signature_packet updates
- **Object Storage**: MinIO local config + presign service

#### G) Quality Gates

- Unit tests for core domain services and workflow engine
- Integration tests for DB migrations and key endpoints
- Static checks: lint, typecheck
- Seed data + demo tenant generator
- Observability: structured logs, request IDs, basic metrics endpoints

### Rules of Execution

1. **Plan first, then implement**. Maintain a running checklist in documentation.
2. **Work in small batches**. Each batch ends with:
   - Tests passing
   - Docs updated
   - Migrations applied
3. **Never break domain boundaries**:
   - No cross-domain DB reads
   - No cross-domain imports
   - Only Workflow does orchestration
4. **Prefer contracts**:
   - Define events + API DTOs before wiring business logic
5. **Avoid overengineering**:
   - Keep features MVP-thin but correct
   - Don't implement full GL or full CPQ
6. **Everything must run locally** with docker compose:
   - postgres, redis, minio
   - backend, frontend

### Implementation Stages

- **Stage 0**: Foundation (identity, shell, migrations, outbox, timeline, workflow skeleton)
- **Stage 1**: Vertical slice (CRM, Scheduling, Files, Portal, Projects, Client Profile read model, Search)
- **Stage 2**: Agreements + Revenue + integration stubs + workflows
- **Stage 3**: Hardening (tests, docs, runbook, security notes)

## Security

UBOS implements comprehensive security standards and best practices. See [Security Documentation](./docs/security/00-overview/README.md) for details.

### Security Features

- **Authentication & Authorization**: Cookie-based auth with multi-tenant isolation
- **Security Headers**: HSTS, CSP, X-Frame-Options, and more via Helmet
- **Rate Limiting**: Protects against brute force and DoS attacks
- **Input Validation**: Zod schemas for all user input
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: React auto-escaping + output encoding
- **Error Handling**: No information disclosure in production
- **CORS**: Configurable cross-origin resource sharing
- **Request Sanitization**: Defense-in-depth against injection attacks

### Compliance Standards

UBOS documentation supports compliance with:

- **SOC2**: Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)
- **PCI-DSS**: Payment Card Industry Data Security Standard guidelines
- **HIPAA**: Health Insurance Portability and Accountability Act compliance
- **GDPR**: General Data Protection Regulation requirements

### Security Documentation

- [Security Overview](./docs/security/00-overview/README.md)
- [Application Security Guide](./docs/security/30-implementation-guides/APPLICATION_SECURITY.md)
- [Developer Security Guide](./docs/security/30-implementation-guides/DEVELOPER_GUIDE.md)
- [SOC2 Compliance](./docs/security/40-compliance/SOC2_COMPLIANCE.md)
- [PCI-DSS Guidelines](./docs/security/40-compliance/PCI_DSS_GUIDELINES.md)
- [HIPAA Compliance](./docs/security/40-compliance/HIPAA_COMPLIANCE.md)
- [GDPR Compliance](./docs/security/40-compliance/GDPR_COMPLIANCE.md)

### Security Testing

Run security-focused tests:

```bash
npm test tests/backend/security.test.ts
```

All tests (101 tests including 32 security tests):

```bash
npm test
```

### Reporting Security Issues

If you discover a security vulnerability, please report it to security@ubos.example.com. We take security seriously and will respond promptly to verified reports.
