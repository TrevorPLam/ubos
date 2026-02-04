# MASTERCLASS PROMPT — Unified Business Ops Suite (Golden Record + Modular Monolith)

You are an autonomous senior staff engineer + product architect. Your job is to produce the full system described below in a way that is shippable, secure-by-default, and extractable into microservices later.

## NON-NEGOTIABLES
- Architecture: Modular monolith with strict domain boundaries, schema-per-domain in Postgres, outbox events, workflow engine as the only cross-domain orchestrator.
- Golden Record: CRM owns canonical Client/Contact. All other domains reference client_id / contact_id. No cross-domain DB reads.
- Unification primitives: Timeline (append-only), Client Profile read model, Global Search, Workflow engine. These are first-class.
- Integrate commodities: Email via OAuth APIs (Microsoft Graph, Gmail). Ledger via QuickBooks/Xero. E-sign via DocuSign/Dropbox Sign/PandaDoc. Files in object storage (S3/MinIO).
- Scope: Build the full platform skeleton + MVP vertical slice + Agreements + AR/AP orchestration layers.
- Security: tenant_id everywhere; audit logs; presigned URLs; least privilege; integration token vault; per-tenant integration health page.
- Output must be complete and runnable. Prefer “simple, correct, observable” over clever.

## YOUR TOOLING & ENVIRONMENT
- Language/Stack: Node/NestJS + TypeScript
- DB: PostgreSQL
- Cache/Jobs: Redis 
- Object storage: S3-compatible (MinIO local)
- Frontend: React SPA (single shell; no micro-frontends)
- Monorepo: YES  Package manager: pnpm

## DELIVERABLES (MUST CREATE ALL)
A) Repo-as-governance
1. /AGENTS/ governance pack:
   - AGENTS.toon (entrypoint)
   - policies: TOOL_POLICY, SAFETY_POLICY, ARCHITECTURE_RULES, CODING_STANDARDS
   - tasks: TODO.toon, BACKLOG.toon, ARCHIVE.toon
2. System documentation:
   - /docs/ARCHITECTURE.md (bounded contexts + rules)
   - /docs/DOMAIN_CONTRACTS.md (API + events)
   - /docs/RUNBOOK.md (local dev, env vars, debugging)
   - /docs/SECURITY.md (tenant isolation, auth, secrets, audit)

B) Backend (modular monolith)
Implement domain modules (each with its own schema migrations + services + API routes):
- identity (tenant, users, RBAC, sessions, OIDC-ready)
- crm (golden record: client/contact/relationship, tags, custom fields JSONB)
- projects (projects, tasks, kanban states, denorm client_id)
- files (tree nodes, blob metadata, versions, presigned URLs, request links)
- communications (email sync scaffolding + thread/message storage + link-to-client)
- scheduling (appointments + external calendar IDs; booking endpoints)
- portal (magic links, client-facing views for tasks/files/approvals)
- agreements (templates, proposals, proposal_version, contracts, signature packets)
- revenue (AR/AP orchestration: billing_account, invoice, invoice_line, payment, vendor, bill, approvals, ledger_sync_map)
- workflow (triggers, conditions, actions, runs, retries, idempotency)
- timeline (activity_event append-only)
- search (basic Postgres search; interface for later OpenSearch)

C) Eventing
- Outbox table + dispatcher worker
- Canonical event types + versioning
- Idempotent event handlers
- Dead-letter + retry tracking
- Per-tenant Integration Health page (last sync, errors, reauth CTA)

D) Frontend
- React SPA with:
  - Auth screens
  - Client Profile (hub)
  - Timeline view
  - CRM lists/detail
  - Projects/tasks (basic kanban + list)
  - Files (tree + upload + request links)
  - Scheduling booking pages (basic)
  - Portal (magic link views)
  - Agreements (template/proposal/contract UI minimal)
  - Revenue (invoices/bills lists + approval)
  - Integration Health dashboard
  - Command-K global search

E) Flagship workflows (implement as first-class workflow definitions)
1. appointment.booked → create/attach contact+client → create portal user → create folder template → create project skeleton
2. proposal.accepted → contract.send_for_signature → on signed activate project + invoice plan
3. file.request.completed → attach file to project → create review task → notify assignee
4. milestone/task.completed OR time threshold → invoice.drafted → approval → issue to ledger (stub integration) → notify portal
5. invoice.paid → update CRM client status/timeline + schedule follow-up
6. bill.received → approval routing → push to ledger (stub) → status/timeline update

F) Integrations (MVP = stubs + contracts + health)
- Email: OAuth connect + sync job scaffold (Graph/Gmail) — no full parity needed
- Ledger: QBO/Xero integration stubs + mapping + sync jobs
- E-sign: provider abstraction + webhook receiver + signature_packet updates
- Object storage: MinIO local config + presign service

G) Quality gates
- Unit tests for core domain services and workflow engine
- Integration tests for DB migrations and key endpoints
- Static checks: lint, typecheck
- Seed data + demo tenant generator
- Observability: structured logs, request IDs, basic metrics endpoints

## RULES OF EXECUTION
1) Plan first, then implement. Maintain a running checklist in /docs/BUILD_LOG.md.
2) Work in small batches. Each batch ends with:
   - tests passing
   - docs updated
   - migrations applied
3) Never break domain boundaries:
   - No cross-domain DB reads
   - No cross-domain imports
   - Only Workflow does orchestration
4) Prefer contracts:
   - Define events + API DTOs before wiring business logic
5) Avoid overengineering:
   - Keep features MVP-thin but correct
   - Don’t implement full GL or full CPQ
6) Everything must run locally with docker compose:
   - postgres, redis, minio
   - backend, frontend

## OUTPUT FORMAT
- Create/modify files directly in the repo.
- For every major file you add, include:
  - purpose header comment
  - minimal examples
- Summarize each batch with:
  - what changed
  - how to run
  - what remains

## START HERE
Step 1: Inspect the repository. Determine current stack, structure, and existing governance files. If missing, create the governance pack.
Step 2: Produce an “Implementation Plan” with:
  - directory structure
  - module boundaries
  - schema plan
  - event list (v1)
  - API surface (v1)
  - workflow engine minimal spec
Step 3: Implement Stage 0 foundation first (identity, shell, migrations, outbox, timeline, workflow skeleton).
Step 4: Implement Stage 1 vertical slice (CRM + Scheduling + Files + Portal + Projects + Client Profile read model + Search).
Step 5: Implement Agreements + Revenue + integration stubs + workflows.
Step 6: Harden: tests, docs, runbook, security notes.

Proceed now.
