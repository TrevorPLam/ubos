# Project Backlog

<!--
SYSTEM INSTRUCTIONS — BACKLOG.md (agent-enforced)

Purpose: Storage of unscheduled tasks. Agent replenishes TODO.md from here.

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

## group_begin [type:config][priority:medium]
## 🧰 Config & Tooling (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-001][type:config][priority:medium][component:tooling] Type-check root config files
**Status:** todo  
**Description:** Ensure TypeScript type-checking covers root config files like Vite and Tailwind configs.  
**Acceptance Criteria:**  
- [ ] `npm run check` fails on TS errors in `vite.config.ts` and `tailwind.config.ts`
- [ ] Approach is documented (e.g., `tsconfig.node.json` or updated `include`)
**Relevant Files:** `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`
## task_end

---

## task_begin
### # [id:TASK-20260203-002][type:config][priority:medium][component:css] Stop suppressing the PostCSS warning in Vite
**Status:** todo  
**Description:** Remove the Vite logger suppression hiding the PostCSS "from" warning and address the underlying cause if needed.  
**Acceptance Criteria:**  
- [ ] Logger warning suppression is removed
- [ ] CSS build succeeds without reintroducing noisy warnings
**Relevant Files:** `vite.config.ts`, `postcss.config.js`
## task_end

---

## task_begin
### # [id:TASK-20260203-003][type:config][priority:medium][component:css] Make PostCSS config compatible across tooling
**Status:** todo  
**Description:** Ensure the PostCSS config format works reliably for current and future tooling (ESM vs CommonJS).  
**Acceptance Criteria:**  
- [ ] PostCSS config format choice is explicit and works in the build pipeline
- [ ] If switching to CommonJS, config is renamed appropriately (e.g., `.cjs`)
**Relevant Files:** `postcss.config.js`, `package.json`
## task_end

---

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
