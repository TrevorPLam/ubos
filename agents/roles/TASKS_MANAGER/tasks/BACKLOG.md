# Project Backlog

<!--
SYSTEM INSTRUCTIONS â€” BACKLOG.md (agent-enforced)

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
6) REQUIRED FIELDS (per TASKS.md):
   - **Plan:** Minimum 3 numbered implementation steps
   - **Estimated Effort:** Time estimate (hours/days/weeks)
   - **Relevant Documentation:** Links to /docs/ files with context
   - If a task is missing these, it is incomplete and should not be promoted to TODO.md
-->

## group_begin [type:security][priority:critical]
## ðŸ” Security â€” CRITICAL (Production Blockers)

<!-- Tasks TASK-20260204-001, TASK-20260204-002, TASK-20260204-003 moved to TODO.md on 2026-02-04 -->

## group_end

## group_begin [type:config][priority:critical]
## ðŸ§° Config & Tooling â€” CRITICAL


## group_end

## group_begin [type:dev][priority:medium]
## ðŸš€ Development (Unscheduled) â€” Medium




## group_end

## group_begin [type:quality][priority:medium]
## âœ… Code Quality (Unscheduled) â€” Medium


## group_end

## group_begin [type:security][priority:high]
## ðŸ” Security â€” HIGH


---


---


---


## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security â€” MEDIUM


---


---


---


---


---


---


## group_end

## group_begin [type:quality][priority:high]
## âœ… Code Quality (Unscheduled) â€” High

## group_end

## group_begin [type:ci][priority:high]
## ðŸ§ª CI (Unscheduled) â€” High

## group_end

## group_begin [type:test][priority:high]
## ðŸ§± Testing (Unscheduled) â€” High

## group_end

## group_begin [type:devex][priority:medium]
## ðŸ§­ Developer Experience (Unscheduled) â€” Medium


## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security & Governance (Unscheduled) â€” Medium


---


## group_end

## group_begin [type:docs][priority:high]
## ðŸ“š Documentation â€” HIGH


---


---


---


---


---


---


---


---


---


---


---


---


---


## group_end

## group_begin [type:docs][priority:medium]
## ðŸ“š Documentation â€” MEDIUM (P1 Remaining)


---


---


## group_end

## group_begin [type:docs][priority:low]
## ðŸ“š Documentation â€” LOW (P2 "Wise Extras")


---


---


---


## group_end

## group_begin [type:ci][priority:medium]
## ðŸ§ª CI (Unscheduled) â€” Medium

## group_end

## group_begin [type:reliability][priority:low]
## ðŸ›¡ï¸ Reliability (Unscheduled) â€” Low


## group_end

## group_begin [type:release][priority:low]
## ðŸ·ï¸ Release Management (Unscheduled) â€” Low


## group_end

## group_begin [type:infra][priority:low]
## ðŸ³ Infrastructure (Unscheduled) â€” Low


## group_end

## group_begin [type:config][priority:low]
## ðŸ§° Config & Tooling (Unscheduled) â€” Low


## group_end


## group_begin [type:dev][priority:medium]
## 🚀 Development (Unscheduled) — Medium (Follow-ups)

## task_begin
### # [id:TASK-20260205-280][type:dev][priority:medium][component:tooling] Add web UI for task dependency graph exploration
**Status:** todo  
**Description:** Extend the dependency graph tool with a browser-based interactive explorer for upstream/downstream traversal and blocker highlighting.  
**Acceptance Criteria:**  
- [ ] Browser-based graph visualization exists
- [ ] Users can click a task and inspect direct dependencies/dependents
- [ ] Blocked tasks are highlighted with status legend
**Relevant Files:** `script/task-graph.ts`, `client/src/`, `docs/architecture/10_current_state/TASK_AUTOMATION_TOOLS.md`  
**Relevant Documentation:** `docs/architecture/10_current_state/TASK_AUTOMATION_TOOLS.md` — Current CLI behavior and export outputs, `agents/CONSTITUTION.md` — verification and scope rules  
**Plan:**  
1. Expose graph JSON via a reusable output contract.
2. Build a minimal client view using existing React stack for graph exploration.
3. Add smoke tests for render and dependency navigation behavior.
**Estimated Effort:** 2 days
## task_end

---

## task_begin
### # [id:TASK-20260205-281][type:dev][priority:medium][component:automation] Implement safe TODO promotion with TASK_INDEX synchronization
**Status:** todo  
**Description:** Improve sprint planner automation so TODO promotion moves blocks from BACKLOG, preserves ordering, and updates TASK_INDEX atomically.  
**Acceptance Criteria:**  
- [ ] Promoted tasks are removed from BACKLOG
- [ ] TODO receives only one batch type and keeps source ordering
- [ ] TASK_INDEX status/location updates are applied in same command
**Relevant Files:** `script/sprint-planner.ts`, `agents/roles/TASKS_MANAGER/tasks/BACKLOG.md`, `agents/roles/TASKS_MANAGER/tasks/TODO.md`, `agents/roles/TASKS_MANAGER/tasks/TASK_INDEX.md`  
**Relevant Documentation:** `agents/roles/TASKS_MANAGER/tasks/TASKS.md` — canonical promotion flow and index requirements, `agents/CONSTITUTION.md` — verification policy  
**Plan:**  
1. Add parser/updater helpers for BACKLOG/TODO/TASK_INDEX edits.
2. Implement transactional write strategy with dry-run mode.
3. Add regression tests for promotion ordering and index sync.
**Estimated Effort:** 2 days
## task_end

---

## group_end

## group_begin [type:config][priority:medium]
## 🧰 Config & Tooling — MEDIUM (Follow-ups)

## task_begin
### # [id:TASK-20260205-282][type:config][priority:medium][component:repo] Resolve PLAN.md source of truth for governance pack validation
**Status:** todo  
**Description:** Remove governance validation ambiguity by identifying and documenting the authoritative PLAN.md location referenced by task requirements.  
**Acceptance Criteria:**  
- [ ] Canonical PLAN.md path is documented
- [ ] Governance pack validation note is updated to remove UNKNOWN
- [ ] README or governance docs link to canonical plan source
**Relevant Files:** `AGENTS/AGENTS.toon`, `README.md`, `agents/roles/TASKS_MANAGER/tasks/ARCHIVE.md`  
**Relevant Documentation:** `agents/REPO.md` — repository structure conventions, `agents/CONSTITUTION.md` — unknown handling and verification policy  
**Plan:**  
1. Search repository and governance docs for authoritative planning source.
2. Update governance entrypoint and references to canonical location.
3. Verify references resolve and update task archive notes if needed.
**Estimated Effort:** 3 hours
## task_end

---

## group_end
