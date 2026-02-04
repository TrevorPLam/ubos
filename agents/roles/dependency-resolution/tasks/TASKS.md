# Task Workflow & Templates (UBOS)

This repo uses a lightweight, file-based task system.

**Source of truth:**
- The workflow and templates live in this file.
- The operational task queues live alongside it in this folder:
  - `BACKLOG.md` — unscheduled tasks, grouped for batching
  - `TODO.md` — the active batch agents should work on
  - `ARCHIVE.md` — append-only completed work history
  - `TASK_INDEX.md` — registry mapping every task ID to its current location

---

## Workflow (the only supported flow)

### 1) Create a task (unscheduled)
- Add the task to `BACKLOG.md` inside an appropriate `## group_begin [type:X][priority:Y]` section.
- **REQUIRED fields:**
  - Description, Acceptance Criteria, Relevant Files
  - **Plan:** Numbered implementation steps (minimum 3 steps)
  - **Estimated Effort:** Time estimate (hours/days/weeks)
  - **Relevant Documentation:** Links to `/docs/` files that provide context
- Add a matching entry to `TASK_INDEX.md` with:
  - `status: todo`
  - `location: BACKLOG.md`

### 2) Start a sprint / batch (promote tasks)
- Choose **one** group in `BACKLOG.md` (single `type`, single `priority`).
- Promote up to **5** tasks (in order) from `BACKLOG.md` to `TODO.md`.
- When promoting:
  - MOVE the whole task block (copy into TODO, delete from BACKLOG).
  - Update `TASK_INDEX.md` entries for those IDs:
    - `location: TODO.md`
    - `status: todo` (or `in-progress` if you explicitly start immediately)

### 3) Execute active work (agents)
- Agents should work **only** from `TODO.md`.
- If you start work on a task, set `**Status:** in-progress`.
- If blocked, set `**Status:** blocked` and add a short note in the task’s `Notes & Summary`.

### 4) Complete work (archive)
- When a task is complete:
  1. Set `**Status:** done`
  2. Add `**Completed:** YYYY-MM-DD`
  3. MOVE the entire task block from `TODO.md` to the bottom of `ARCHIVE.md` (append-only)
  4. Update `TASK_INDEX.md`:
     - `status: done`
     - `location: ARCHIVE.md`
     - add `completed: YYYY-MM-DD`

### 5) Repeat
- Keep `TODO.md` as the active batch.
- Refill from `BACKLOG.md` when the batch is complete or underfilled.

---

## Conventions

### Task IDs
- Format: `TASK-YYYYMMDD-NNN` (e.g., `TASK-20260203-001`)
- IDs are unique, never reused.

### Allowed status values
- `todo` | `in-progress` | `blocked` | `done`

### Allowed index locations
- `BACKLOG.md` | `TODO.md` | `ARCHIVE.md`

### Required Planning Fields
Every task MUST include:
- **Plan:** Minimum 3 numbered, actionable steps showing implementation approach
- **Estimated Effort:** Time estimate (hours/days/weeks) based on the plan
- **Relevant Documentation:** Links to `/docs/` files that provide:
  - Architecture decisions (ADRs) from `/docs/architecture/`
  - API contracts from `/docs/api/`
  - Data schemas from `/docs/data/`
  - Security requirements from `/docs/security/`
  - Test patterns from `/docs/tests/`

### Documentation Linking Best Practices
- Link to **specific files**, not just directories
- Include a brief note on **why** each doc is relevant
- Prefer architecture/data/security docs over generic READMEs
- Update doc links if task scope changes during execution

---

## Templates (copy/paste)

### A) TASK_INDEX entry

```md
## index_entry_begin
[id:TASK-YYYYMMDD-NNN]
type: <config|docs|quality|ci|test|devex|security|reliability|release|infra|...>
priority: <critical|high|medium|low>
component: <tooling|css|server|repo|automation|...>
status: todo
location: BACKLOG.md
created: YYYY-MM-DD
title: Short task title
## index_entry_end
```

### B) BACKLOG task block

```md
## task_begin
### # [id:TASK-YYYYMMDD-NNN][type:TYPE][priority:PRIORITY][component:COMPONENT] Task title
**Status:** todo  
**Description:** One paragraph describing the work and why.  
**Acceptance Criteria:**  
- [ ] Concrete verifiable outcome 1
- [ ] Concrete verifiable outcome 2
**Relevant Files:** `path/one`, `path/two`  
**Relevant Documentation:** `docs/section/file.md`, `docs/section2/file2.md`  
**Plan:**  
1. Step 1
2. Step 2
3. Step 3
**Estimated Effort:** X hours / Y days / Z weeks
## task_end

---
```

### C) TODO task block (active work)

```md
## task_begin
## 1. # [id:TASK-YYYYMMDD-NNN][type:TYPE][priority:PRIORITY][component:COMPONENT] Task title

**Status:** todo  
**Created:** YYYY-MM-DD  
**Assignee:** @agent

### Description
> One paragraph describing the work and why.

### Acceptance Criteria
- [ ] Concrete verifiable outcome 1
- [ ] Concrete verifiable outcome 2

### Definition of Done
- [ ] Code merged / change complete
- [ ] Checks pass (typecheck/lint/build/tests as applicable)

### Relevant Files
- `path/one`
- `path/two`

### Relevant Documentation
- `docs/section/file.md` — Brief reason why relevant
- `docs/section2/file2.md` — Brief reason why relevant

### Dependencies
- None

### Plan
1. Step 1
2. Step 2
3. Step 3

### Estimated Effort
X hours / Y days / Z weeks

### Notes & Summary
- [log] Start notes here
## task_end

---
```

### D) ARCHIVE block (completed)

```md
## task_begin
## N. # [id:TASK-YYYYMMDD-NNN][type:TYPE][priority:PRIORITY][component:COMPONENT] Task title

**Status:** done  
**Created:** YYYY-MM-DD  
**Completed:** YYYY-MM-DD  
**Assignee:** @agent

### Notes & Summary
- Final summary (<= 8 lines)
## task_end

---
```
