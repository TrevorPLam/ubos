# Project Backlog

<!--
SYSTEM INSTRUCTIONS — BACKLOG.md (agent-enforced)

Purpose: Storage of unscheduled tasks. Agent replenishes TODO.md from here.

Canonical workflow + templates live in: TASKS.md

Global Rules:
1) All tasks MUST follow this header format:
   ### # [id:...][type:...][priority:...][component:...] Title
2) Task blocks MUST be wrapped with:
   ## task_begin
   ## task_end
3) Grouping rules (for deterministic batching):
   - Tasks are grouped using:
     ## group_begin [type:X][priority:Y]
     ## group_end
   - When replenishing TODO.md:
     a) Select ONE group only (single type).
     b) Take up to 5 tasks in listed order.
     c) MOVE tasks to TODO.md (copy then delete from BACKLOG.md).
4) Agent MUST NOT rewrite task content except to:
   - normalize formatting
   - fix obvious tag typos
   - add missing fields if absent
5) Do NOT reorder tasks inside a group.
-->

## group_begin [type:config][priority:high]
## 🧰 Config & Tooling (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-020][type:config][priority:high][component:repo] Create AGENTS governance pack
**Status:** todo  
**Description:** Create comprehensive governance pack including AGENTS.toon entrypoint, policies (TOOL_POLICY, SAFETY_POLICY, ARCHITECTURE_RULES, CODING_STANDARDS), and task management files.  
**Acceptance Criteria:**  
- [ ] /AGENTS/AGENTS.toon entrypoint created
- [ ] TOOL_POLICY, SAFETY_POLICY, ARCHITECTURE_RULES, CODING_STANDARDS defined
- [ ] TODO.toon, BACKLOG.toon, ARCHIVE.toon task files created
- [ ] Governance pack is enforceable and documented
**Relevant Files:** `/AGENTS/*`, governance documentation
## task_end

## task_begin
### # [id:TASK-20260203-021][type:config][priority:high][component:docs] Create system documentation
**Status:** todo  
**Description:** Create comprehensive system documentation including architecture, domain contracts, runbook, and security specifications.  
**Acceptance Criteria:**  
- [ ] /docs/ARCHITECTURE.md with bounded contexts and rules
- [ ] /docs/DOMAIN_CONTRACTS.md with API + events specification
- [ ] /docs/RUNBOOK.md with local dev setup and debugging
- [ ] /docs/SECURITY.md with tenant isolation and auth details
- [ ] /docs/BUILD_LOG.md for tracking implementation progress
**Relevant Files:** `/docs/*`, architecture documentation
## task_end

## task_begin
### # [id:TASK-20260203-022][type:config][priority:high][component:repo] Create comprehensive implementation plan
**Status:** todo  
**Description:** Produce detailed implementation plan with directory structure, module boundaries, schema plan, event list, API surface, and workflow engine specs.  
**Acceptance Criteria:**  
- [ ] Directory structure plan for modular monolith
- [ ] Domain module boundaries defined and documented
- [ ] Database schema plan per domain
- [ ] Event list (v1) with canonical event types
- [ ] API surface (v1) specification
- [ ] Workflow engine minimal specification
**Relevant Files:** `/docs/implementation-plan.md`, architecture docs
## task_end

## group_end

## group_begin [type:infra][priority:high]
## 🐳 Infrastructure (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-023][type:infra][priority:high][component:server] Implement Stage 0 foundation - Identity module
**Status:** todo  
**Description:** Implement identity domain module with tenant management, users, RBAC, sessions, and OIDC readiness.  
**Acceptance Criteria:**  
- [ ] Identity domain module with separate schema
- [ ] Tenant management with tenant_id everywhere
- [ ] User management with RBAC system
- [ ] Session management and authentication
- [ ] OIDC-ready configuration
- [ ] Database migrations for identity schema
**Relevant Files:** `src/identity/**/*`, identity migrations, auth system
## task_end

## task_begin
### # [id:TASK-20260203-024][type:infra][priority:high][component:server] Implement Stage 0 foundation - Core infrastructure
**Status:** todo  
**Description:** Implement core infrastructure including application shell, database migrations, outbox pattern, timeline, and workflow skeleton.  
**Acceptance Criteria:**  
- [ ] Application shell framework for modular monolith
- [ ] Database migration system with domain schemas
- [ ] Outbox table + dispatcher worker implementation
- [ ] Timeline (activity_event append-only) system
- [ ] Workflow engine skeleton with triggers/conditions/actions
- [ ] Docker compose setup (postgres, redis, minio)
**Relevant Files:** `src/core/**/*`, infrastructure, docker-compose.yml
## task_end

## group_end

## group_begin [type:dev][priority:high]
## 🚀 Development (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-025][type:dev][priority:high][component:server] Implement Stage 1 vertical slice - CRM module
**Status:** todo  
**Description:** Implement CRM domain module as golden record with client/contact/relationship management, tags, and custom fields.  
**Acceptance Criteria:**  
- [ ] CRM domain module with separate schema
- [ ] Client/Contact golden record implementation
- [ ] Relationship management system
- [ ] Tags and custom fields (JSONB) support
- [ ] API routes for CRM operations
- [ ] Client Profile read model integration
**Relevant Files:** `src/crm/**/*`, CRM migrations, client profile system
## task_end

## task_begin
### # [id:TASK-20260203-026][type:dev][priority:high][component:server] Implement Stage 1 vertical slice - Core modules
**Status:** todo  
**Description:** Implement Scheduling, Files, Portal, and Projects modules with proper domain boundaries.  
**Acceptance Criteria:**  
- [ ] Scheduling module with appointments and calendar integration
- [ ] Files module with tree nodes, blob metadata, presigned URLs
- [ ] Portal module with magic links and client-facing views
- [ ] Projects module with tasks and kanban states
- [ ] Search module with basic Postgres search interface
- [ ] All modules follow domain boundary rules
**Relevant Files:** `src/scheduling/**/*`, `src/files/**/*`, `src/portal/**/*`, `src/projects/**/*`, `src/search/**/*`
## task_end

## task_begin
### # [id:TASK-20260203-027][type:dev][priority:high][component:client] Implement Stage 1 vertical slice - Frontend shell
**Status:** todo  
**Description:** Implement React SPA shell with auth screens, client profile hub, timeline view, and basic module interfaces.  
**Acceptance Criteria:**  
- [ ] React SPA application shell
- [ ] Authentication screens (login/register)
- [ ] Client Profile hub interface
- [ ] Timeline view component
- [ ] Basic navigation and routing
- [ ] Command-K global search interface
- [ ] Responsive design with TailwindCSS
**Relevant Files:** `client/src/**/*`, React components, routing
## task_end

## group_end

## group_begin [type:dev][priority:medium]
## 🚀 Development (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-028][type:dev][priority:medium][component:server] Implement Agreements and Revenue modules
**Status:** todo  
**Description:** Implement Agreements module (templates, proposals, contracts) and Revenue module (AR/AP orchestration).  
**Acceptance Criteria:**  
- [ ] Agreements module with template and proposal management
- [ ] Contract management with signature packets
- [ ] Revenue module with billing accounts and invoices
- [ ] AR/AP orchestration with approval workflows
- [ ] Integration stubs for ledger systems
- [ ] Payment processing integration points
**Relevant Files:** `src/agreements/**/*`, `src/revenue/**/*`, billing system
## task_end

## task_begin
### # [id:TASK-20260203-029][type:dev][priority:medium][component:server] Implement flagship workflows
**Status:** todo  
**Description:** Implement 6 flagship workflows as first-class workflow definitions with proper orchestration.  
**Acceptance Criteria:**  
- [ ] Workflow: appointment.booked → client setup → project creation
- [ ] Workflow: proposal.accepted → contract signing → project activation
- [ ] Workflow: file.request → project attachment → review task
- [ ] Workflow: milestone completion → invoice drafting → approval
- [ ] Workflow: invoice.paid → CRM updates → follow-up scheduling
- [ ] Workflow: bill.received → approval → ledger sync
- [ ] All workflows use workflow engine (no cross-domain calls)
**Relevant Files:** `src/workflow/definitions/**/*`, workflow implementations
## task_end

## task_begin
### # [id:TASK-20260203-030][type:dev][priority:medium][component:server] Implement integration stubs and health
**Status:** todo  
**Description:** Implement integration stubs for email, ledger, e-sign, and object storage with health monitoring.  
**Acceptance Criteria:**  
- [ ] Email integration OAuth scaffolding (Graph/Gmail)
- [ ] Ledger integration stubs (QBO/Xero) with mapping
- [ ] E-sign provider abstraction with webhook support
- [ ] MinIO object storage with presign service
- [ ] Per-tenant Integration Health dashboard
- [ ] Integration token vault and security
**Relevant Files:** `src/integrations/**/*`, integration health system
## task_end

## group_end

## group_begin [type:quality][priority:medium]
## ✅ Code Quality (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-031][type:quality][priority:medium][component:repo] Harden and finalize implementation
**Status:** todo  
**Description:** Complete hardening with comprehensive tests, observability, seed data, and security validation.  
**Acceptance Criteria:**  
- [ ] Unit tests for core domain services and workflow engine
- [ ] Integration tests for DB migrations and key endpoints
- [ ] Static checks: lint, typecheck, security audit
- [ ] Seed data + demo tenant generator
- [ ] Observability: structured logs, request IDs, metrics
- [ ] Security validation: tenant isolation, audit logs
- [ ] Complete documentation and runbook
**Relevant Files:** Test suites, monitoring, security configurations
## task_end

## group_end

## group_begin [type:docs][priority:high]
## 📚 Documentation (Unscheduled) — High

## group_end

## group_begin [type:quality][priority:high]
## ✅ Code Quality (Unscheduled) — High

## group_end

## group_begin [type:ci][priority:high]
## 🧪 CI (Unscheduled) — High

## group_end

## group_begin [type:test][priority:high]
## 🧱 Testing (Unscheduled) — High

## group_end

## group_begin [type:devex][priority:medium]
## 🧭 Developer Experience (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-012][type:devex][priority:medium][component:tooling] Pin package manager + document install expectations
**Status:** todo  
**Description:** Ensure reproducible installs by explicitly pinning a package manager and documenting it.
**Acceptance Criteria:**  
- [ ] `package.json` includes `packageManager` (and/or docs specify npm version)
- [ ] README describes the expected install command (`npm ci` vs `npm install`)
**Relevant Files:** `package.json`, `README.md`
## task_end

## group_end

## group_begin [type:security][priority:medium]
## 🔐 Security & Governance (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-013][type:security][priority:medium][component:repo] Add SECURITY.md and vulnerability reporting guidance
**Status:** todo  
**Description:** Document how to report security issues and the supported disclosure process.
**Acceptance Criteria:**  
- [ ] `SECURITY.md` exists with contact/process
- [ ] README links to the security policy
**Relevant Files:** `SECURITY.md`, `README.md`
## task_end

---

## task_begin
### # [id:TASK-20260203-014][type:security][priority:medium][component:repo] Add CONTRIBUTING + PR/issue templates
**Status:** todo  
**Description:** Add contributor guidance and lightweight GitHub templates to standardize changes.
**Acceptance Criteria:**  
- [ ] `CONTRIBUTING.md` exists (workflow, coding standards, how to run checks)
- [ ] PR template exists and prompts for tests/screenshots
- [ ] Issue templates exist for bugs and feature requests
**Relevant Files:** `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*`
## task_end

## group_end

## group_begin [type:ci][priority:medium]
## 🧪 CI (Unscheduled) — Medium

## group_end

## group_begin [type:reliability][priority:low]
## 🛡️ Reliability (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-017][type:reliability][priority:low][component:server] Avoid crashing the process in the Express error handler
**Status:** todo  
**Description:** The current error middleware throws after sending a response, which can crash the server for handled errors.
**Acceptance Criteria:**  
- [ ] Error handler returns a response without throwing
- [ ] Logging remains intact (and does not leak sensitive data)
**Relevant Files:** `server/index.ts`
## task_end

## group_end

## group_begin [type:release][priority:low]
## 🏷️ Release Management (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-018][type:release][priority:low][component:repo] Add versioning + release notes automation
**Status:** todo  
**Description:** Introduce a lightweight release process (e.g., Changesets or semantic-release) to standardize changelogs and releases.
**Acceptance Criteria:**  
- [ ] Release tooling is chosen and configured
- [ ] A minimal workflow exists to generate/update release notes
- [ ] Maintainer instructions are documented
**Relevant Files:** `package.json`, `.github/workflows/*`, `README.md`
## task_end

## group_end

## group_begin [type:infra][priority:low]
## 🐳 Infrastructure (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-019][type:infra][priority:low][component:dev] Add Docker + compose for local Postgres
**Status:** todo  
**Description:** Provide an optional containerized local environment for consistent onboarding.
**Acceptance Criteria:**  
- [ ] Dockerfile and/or `docker-compose.yml` exist for local dev
- [ ] Compose provisions Postgres with a documented `DATABASE_URL`
- [ ] README includes steps to use containers
**Relevant Files:** `Dockerfile`, `docker-compose.yml`, `README.md`
## task_end

## group_end

## group_begin [type:config][priority:low]
## 🧰 Config & Tooling (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-004][type:config][priority:low][component:tooling] Declare supported Node.js versions
**Status:** todo  
**Description:** Add a clear Node.js version requirement so installs/builds don’t fail unexpectedly on older Node versions.  
**Acceptance Criteria:**  
- [ ] `package.json` declares `engines.node` (minimum supported version)
- [ ] Local dev and CI use a compatible Node version
**Relevant Files:** `package.json`
## task_end

## group_end
