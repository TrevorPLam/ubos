# TASK INDEX

<!--
SYSTEM INSTRUCTIONS — TASK_INDEX.md (agent-enforced)

Purpose: Central registry mapping every task's ID to its current location.

Canonical workflow + templates live in: TASKS.md

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
-->

## 🗂 Task Registry

---

## index_entry_begin
[id:TASK-20260203-001]  
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
[id:TASK-20260203-002]  
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
[id:TASK-20260203-003]  
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
[id:TASK-20260203-004]  
type: config  
priority: low  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Declare supported Node.js versions  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-005]  
type: docs  
priority: high  
component: onboarding  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add a production-quality README  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-006]  
type: docs  
priority: high  
component: config  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add .env.example and document required env vars  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-007]  
type: quality  
priority: high  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add ESLint configuration for TS + React  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-008]  
type: quality  
priority: high  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add Prettier formatting + CI format check  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-009]  
type: ci  
priority: high  
component: automation  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add GitHub Actions CI pipeline  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-010]  
type: test  
priority: high  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add a test runner (Vitest) and first smoke test  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-011]  
type: devex  
priority: medium  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Add .editorconfig for consistent formatting  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-012]  
type: devex  
priority: medium  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Pin package manager + document install expectations  
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
location: BACKLOG.md  
created: 2026-02-03  
title: Add dependency update automation (Dependabot/Renovate)  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-016]  
type: ci  
priority: medium  
component: automation  
status: todo  
location: BACKLOG.md  
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
---
