# TASK INDEX

<!--
SYSTEM INSTRUCTIONS — TASK_INDEX.md (agent-enforced)

Purpose: Central registry mapping every task's ID to its current location.

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
type: maintenance  
priority: medium  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Type-check root config files  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-002]  
type: maintenance  
priority: medium  
component: css  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Stop suppressing the PostCSS warning in Vite  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-003]  
type: maintenance  
priority: medium  
component: css  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Make PostCSS config compatible across tooling  
## index_entry_end

## index_entry_begin
[id:TASK-20260203-004]  
type: maintenance  
priority: low  
component: tooling  
status: todo  
location: BACKLOG.md  
created: 2026-02-03  
title: Declare supported Node.js versions  
## index_entry_end

## Template for New Index Entries

## index_entry_begin
[id:TASK-YYYYMMDD-XXX]  
type: <brainstorming|research|feature|documentation|etc>  
priority: <critical|high|medium|low>  
component: <ideation|workflows|organization|etc>  
status: todo  
location: BACKLOG.md  
created: YYYY-MM-DD  
title: New Task Title Goes Here  
## index_entry_end

---
