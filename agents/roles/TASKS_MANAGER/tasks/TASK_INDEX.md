# TASK INDEX

<!--
SYSTEM INSTRUCTIONS â€” TASK_INDEX.md (agent-enforced)

Purpose: Central registry mapping every task's ID to its current location.

Canonical workflow + templates live in: TASKS.md
Planning requirements documented in: PLANNING_REQUIREMENTS.md

Rules:
1) Every task MUST have an entry here.
2) On task creation â†’ append new entry.
3) When moving tasks â†’ update `status` + `location`.
4) When completing â†’ set status=done, location=ARCHIVE.md, add completed date.
5) Strict boundaries:
   ## index_entry_begin
   ## index_entry_end
6) Entries MUST remain in chronological order.
7) Allowed statuses: todo | in-progress | blocked | done
8) Allowed locations: BACKLOG.md | TODO.md | ARCHIVE.md
9) NEW (2026-02-04): All tasks MUST include Plan, Estimated Effort, and Relevant Documentation
-->

## ðŸ—‚ Task Registry

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










---

