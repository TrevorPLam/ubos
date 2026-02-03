# Current Sprints & Active Tasks

<!--
SYSTEM INSTRUCTIONS — TODO.md (agent-enforced)

Purpose: Active work queue. This file MUST contain tasks of a SINGLE batch type.

Canonical workflow + templates live in: TASKS.md

Global Rules:
1) Task blocks MUST be wrapped with:
   ## task_begin
   ## task_end
2) Every task MUST include tags in the title line:
   [id:...][type:...][priority:...][component:...]
3) Batch rules:
   - TODO.md MUST contain only ONE [type:*] at a time.
   - Batch size target: 5 tasks (or fewer if backlog has fewer).
   - Do NOT add tasks manually unless explicitly instructed.
4) Ordering rules:
   - Preserve the order as moved from BACKLOG.md.
   - Do NOT reorder unless explicitly instructed.
5) Completion rules:
   - When Status becomes done, MOVE the entire task block to ARCHIVE.md.
   - Remove it from TODO.md after archiving.
6) Notes discipline:
   - "Notes & Summary" is for execution logs and final summaries.
   - Keep Notes <= 10 lines. Prefer bullets. No long transcripts.
-->

## 🎯 Current Batch Focus
**Batch Type:** [type:config]  
**Batch Goal:** Improve config/tooling stability and reduce build-time surprises  
**Batch Size Target:** 5

---

<!-- Tasks are promoted here from BACKLOG.md. Keep only active tasks in this file. -->

## task_begin
## 1. # [id:TASK-20260203-001][type:config][priority:medium][component:tooling] Type-check root config files

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Ensure TypeScript type-checking covers root config files like Vite and Tailwind configs.

### Acceptance Criteria
- [ ] `npm run check` fails on TS errors in `vite.config.ts` and `tailwind.config.ts`
- [ ] Approach is documented (e.g., `tsconfig.node.json` or updated `include`)

### Relevant Files
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.ts`

### Notes & Summary
-
## task_end

---

## task_begin
## 2. # [id:TASK-20260203-002][type:config][priority:medium][component:css] Stop suppressing the PostCSS warning in Vite

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Remove the Vite logger suppression hiding the PostCSS "from" warning and address the underlying cause if needed.

### Acceptance Criteria
- [ ] Logger warning suppression is removed
- [ ] CSS build succeeds without reintroducing noisy warnings

### Relevant Files
- `vite.config.ts`
- `postcss.config.js`

### Notes & Summary
-
## task_end

---

## task_begin
## 3. # [id:TASK-20260203-003][type:config][priority:medium][component:css] Make PostCSS config compatible across tooling

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Ensure the PostCSS config format works reliably for current and future tooling (ESM vs CommonJS).

### Acceptance Criteria
- [ ] PostCSS config format choice is explicit and works in the build pipeline
- [ ] If switching to CommonJS, config is renamed appropriately (e.g., `.cjs`)

### Relevant Files
- `postcss.config.js`
- `package.json`

### Notes & Summary
-
## task_end
