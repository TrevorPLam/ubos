# TASK INDEX

<!--
SYSTEM INSTRUCTIONS — TASK_INDEX.md (agent-enforced)

Purpose: Central registry mapping every task's ID to its current location.

Canonical workflow + templates live in: TASKS.md
Planning requirements documented in: PLANNING_REQUIREMENTS.md

Rules:
1) Every task MUST have an entry here.
2) On task creation → append new entry.
3) When moving tasks → update `status` + `location`.
4) When completing → set status=done, location=ARCHIVE.md, add completed date.
5) Strict boundaries:
   ## index_entry_begin
   ## index_entry_end
6) Entries MUST remain in chronological order.
7) Allowed statuses: todo | in-progress | blocked | done
8) Allowed locations: BACKLOG.md | TODO.md | ARCHIVE.md
9) NEW (2026-02-04): All tasks MUST include Plan, Estimated Effort, and Relevant Documentation
-->

## 🗂 Task Registry

---

## index_entry_begin
[id:TASK-20260203-001]  
type: config  
priority: critical  
component: repo  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Create AGENTS governance pack  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-001]  
type: security  
priority: critical  
component: server  
status: todo  
location: TODO.md  
created: 2026-02-04  
title: Implement Redis-backed rate limiting  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-002]  
type: security  
priority: critical  
component: server  
status: todo  
location: TODO.md  
created: 2026-02-04  
title: Implement Redis-backed session store  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-003]  
type: security  
priority: critical  
component: server  
status: todo  
location: TODO.md  
created: 2026-02-04  
title: Implement soft deletes for audit trail  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-002]  
type: config  
priority: high  
component: docs  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Create system documentation  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-003]  
type: config  
priority: high  
component: repo  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Create comprehensive implementation plan  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-004]  
type: infra  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement Stage 0 foundation - Identity module  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-005]  
type: infra  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement Stage 0 foundation - Core infrastructure  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-006]  
type: dev  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement Stage 1 vertical slice - CRM module  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-007]  
type: dev  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement Stage 1 vertical slice - Core modules  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-008]  
type: dev  
priority: high  
component: client  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement Stage 1 vertical slice - Frontend shell  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-009]  
type: dev  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement Agreements and Revenue modules  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-010]  
type: dev  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement flagship workflows  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-011]  
type: dev  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Implement integration stubs and health  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-012]  
type: quality  
priority: medium  
component: repo  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Harden and finalize implementation  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-004]  
type: security  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement RBAC (Role-Based Access Control)  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-005]  
type: security  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement encryption at rest for sensitive data  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-006]  
type: security  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement key rotation and escrow  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-007]  
type: security  
priority: high  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement enhanced audit logging  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-008]  
type: security  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement MFA (Multi-Factor Authentication)  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-009]  
type: security  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement database Row-Level Security (RLS)  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-010]  
type: security  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement anomaly detection and alerting  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-011]  
type: security  
priority: medium  
component: infra  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement SIEM integration  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-012]  
type: security  
priority: medium  
component: ci  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement SAST in CI/CD pipeline  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-013]  
type: security  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement password hashing (when auth added)  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-014]  
type: security  
priority: medium  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Implement file upload security  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-015]  
type: docs  
priority: high  
component: security  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create SECURITY_POLICY.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-016]  
type: docs  
priority: high  
component: security  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create SECURITY_TESTING.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-017]  
type: docs  
priority: high  
component: security  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create VULNERABILITY_MANAGEMENT.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-018]  
type: docs  
priority: high  
component: security  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create NETWORK_SECURITY.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-019]  
type: docs  
priority: high  
component: security  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create DEPLOYMENT_SECURITY.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-020]  
type: docs  
priority: high  
component: security  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create CHANGE_MANAGEMENT.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-021]  
type: docs  
priority: high  
component: architecture  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create BUILD_AND_TOOLING.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-022]  
type: docs  
priority: high  
component: architecture  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create CONFIGURATION_MODEL.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-023]  
type: docs  
priority: high  
component: architecture  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create DEPENDENCY_GRAPH.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-024]  
type: docs  
priority: high  
component: architecture  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create AUTH_AND_SESSION.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-025]  
type: docs  
priority: high  
component: architecture  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create SECURITY_BASELINE.md  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-026]  
type: docs  
priority: high  
component: data  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Resolve 10 data unknowns  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-027]  
type: docs  
priority: high  
component: data  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Document 17 remaining entities  
## index_entry_end

## index_entry_begin
[id:TASK-20260204-028]  
type: docs  
priority: high  
component: data  
status: todo  
location: BACKLOG.md  
created: 2026-02-04  
title: Create 6 current state docs  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-013]  
type: security  
priority: medium  
component: repo  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add SECURITY.md and vulnerability reporting guidance  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-014]  
type: security  
priority: medium  
component: repo  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add CONTRIBUTING + PR/issue templates  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-015]  
type: ci  
priority: medium  
component: automation  
status: todo  
location: TODO.md  
created: 2026-02-03  
title: Add dependency update automation (Dependabot/Renovate)  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-016]  
type: ci  
priority: medium  
component: automation  
status: todo  
location: TODO.md  
created: 2026-02-03  
title: Add a basic security audit step to CI  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-017]  
type: reliability  
priority: low  
component: server  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Avoid crashing the process in the Express error handler  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-018]  
type: release  
priority: low  
component: repo  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add versioning + release notes automation  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-019]  
type: infra  
priority: low  
component: dev  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add Docker + compose for local Postgres  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-020]  
type: config  
priority: medium  
component: tooling  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Type-check root config files  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-021]  
type: config  
priority: medium  
component: css  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Stop suppressing the PostCSS warning in Vite  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-022]  
type: config  
priority: medium  
component: css  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Make PostCSS config compatible across tooling  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-023]  
type: config  
priority: low  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Declare supported Node.js versions  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-024]  
type: docs  
priority: high  
component: onboarding  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Add a production-quality README  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-025]  
type: docs  
priority: high  
component: config  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Add .env.example and document required env vars  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-026]  
type: quality  
priority: high  
component: tooling  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Add ESLint configuration for TS + React  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-027]  
type: quality  
priority: high  
component: tooling  
status: done  
location: ARCHIVE.md  
created: 2026-02-03  
completed: 2026-02-03  
title: Add Prettier formatting + CI format check  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-028]  
type: ci  
priority: high  
component: automation  
status: todo  
location: TODO.md  
created: 2026-02-03  
title: Add GitHub Actions CI pipeline  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-029]  
type: test  
priority: high  
component: tooling  
status: todo  
location: TODO.md  
created: 2026-02-03  
title: Add a test runner (Vitest) and first smoke test  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-030]  
type: devex  
priority: medium  
component: tooling  
status: todo  
location: TODO.md  
created: 2026-02-03  
title: Add .editorconfig for consistent formatting  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-031]  
type: devex  
priority: medium  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Pin package manager + document install expectations  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-012]  
type: quality  
priority: medium  
component: repo  
status: in-progress  
location: TODO.md  
created: 2026-02-03  
title: Harden and finalize implementation  
## index_entry_end

---
