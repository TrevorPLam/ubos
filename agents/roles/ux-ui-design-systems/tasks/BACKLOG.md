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

## group_begin [type:infra][priority:high]
## ðŸ³ Infrastructure (Unscheduled) â€” High



## group_end

## group_begin [type:dev][priority:high]
## ðŸš€ Development (Unscheduled) â€” High

## task_begin
### # [id:TASK-20260204-209][type:dev][priority:high][component:client] Build Design System Component Library
**Status:** todo  
**Description:** Create comprehensive design system component library with Radix UI primitives, consistent styling, and extensive documentation.  
**Acceptance Criteria:**  
- [ ] Core components (Button, Input, Select, Modal, etc.)
- [ ] Consistent theming and variants
- [ ] Component composition patterns
- [ ] Accessibility built-in (WCAG AA)
- [ ] Storybook documentation
**Relevant Files:** `client/src/components/ui/`, `client/src/styles/`, `docs/`  
**Relevant Documentation:** `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md`, `docs/user/README.md`  
**Plan:**  
1. Audit existing components and identify gaps
2. Build missing core components with Radix UI
3. Implement consistent theming system
4. Ensure accessibility in all components
5. Document in Storybook with examples
**Estimated Effort:** 5 days
## task_end

---

## task_begin
### # [id:TASK-20260204-210][type:dev][priority:high][component:client] Implement Design Tokens System
**Status:** todo  
**Description:** Create design tokens system for colors, typography, spacing, and other design primitives with tooling for token generation and synchronization.  
**Acceptance Criteria:**  
- [ ] Design tokens defined (colors, typography, spacing, shadows)
- [ ] Token generation from design files
- [ ] CSS variable output
- [ ] TypeScript type generation
- [ ] Token documentation
**Relevant Files:** `client/src/styles/`, `tailwind.config.ts`, `design-tokens/`  
**Relevant Documentation:** `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md`, `docs/user/README.md`  
**Plan:**  
1. Define design token structure
2. Extract tokens from current design
3. Set up token generation tooling
4. Generate CSS variables and TypeScript types
5. Integrate tokens with Tailwind config
**Estimated Effort:** 3 days
## task_end

---
## group_end

## group_begin [type:dev][priority:medium]
## ðŸš€ Development (Unscheduled) â€” Medium

## task_begin
### # [id:TASK-20260204-294][type:dev][priority:medium][p_level:P2][component:client] Implement Optimistic Updates in React Query
**Status:** todo  
**Description:** Add optimistic updates to all mutations to improve perceived performance and user experience. Currently all mutations invalidate queries and wait for refetch, causing loading spinners.  
**Acceptance Criteria:**  
- [ ] Optimistic update pattern implemented for create mutations
- [ ] Optimistic update pattern implemented for update mutations
- [ ] Optimistic update pattern implemented for delete mutations
- [ ] Rollback on error properly handled
- [ ] Loading states removed where optimistic updates apply
**Relevant Files:** `client/src/pages/*.tsx` (all pages with mutations), `client/src/lib/queryClient.ts`  
**Relevant Documentation:** `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md` — Frontend patterns, `ANALYSIS.md` — Frontend concerns  
**Plan:**  
1. Create optimistic update helper functions in queryClient.ts
2. Update create mutations to use optimistic updates (add temp ID)
3. Update update mutations to use optimistic updates (immediate update)
4. Update delete mutations to use optimistic updates (immediate removal)
5. Add proper rollback handlers on mutation error
6. Test optimistic update edge cases (simultaneous edits, errors)
7. Document optimistic update patterns
**Estimated Effort:** 1 week
## task_end

---

## task_begin
### # [id:TASK-20260204-295][type:dev][priority:medium][p_level:P2][component:client] Add Domain-Level Frontend Code Organization
**Status:** todo  
**Description:** Reorganize frontend code into domain-specific folders to mirror backend domain structure and improve code navigation and maintainability.  
**Acceptance Criteria:**  
- [ ] pages/ reorganized into domain folders (crm/, sales/, finance/, projects/)
- [ ] Domain-specific components moved to domain folders
- [ ] Domain-specific hooks created (useCrmDashboard, useProjectsSummary)
- [ ] All imports updated and working
- [ ] No duplicate code across domains
**Relevant Files:** `client/src/pages/*.tsx`, `client/src/components/`, `client/src/hooks/`  
**Relevant Documentation:** `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md` — Frontend architecture, `ANALYSIS.md` — Frontend concerns  
**Plan:**  
1. Create domain folder structure (pages/crm/, pages/finance/, etc.)
2. Move existing pages to appropriate domain folders
3. Create domain-specific component folders
4. Extract domain-specific hooks from pages
5. Update App.tsx route paths
6. Update all imports across the codebase
7. Test all routes still working
8. Document frontend domain structure
**Estimated Effort:** 1 week
## task_end

---

## task_begin
### # [id:TASK-20260204-296][type:dev][priority:medium][p_level:P2][component:client] Extract Shared Form Schemas
**Status:** todo  
**Description:** Extract form validation schemas from individual pages and reuse insert schemas from shared/schema.ts to eliminate duplication and ensure consistency between client and server validation.  
**Acceptance Criteria:**  
- [ ] Form schemas extracted to client/src/lib/schemas.ts
- [ ] All forms reuse schemas from shared/schema.ts where possible
- [ ] Custom client-only validations properly separated
- [ ] No duplicate schema definitions
- [ ] All form validation still working
**Relevant Files:** `client/src/pages/*.tsx`, `client/src/lib/schemas.ts` (new), `shared/schema.ts`  
**Relevant Documentation:** `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md` — Form patterns, `ANALYSIS.md` — Frontend concerns  
**Plan:**  
1. Create client/src/lib/schemas.ts
2. Import insert schemas from shared/schema.ts
3. Create client-specific transformations (e.g., omit organizationId)
4. Update all pages to use shared schemas
5. Remove duplicate schema definitions from pages
6. Test all form validation working
7. Document schema reuse patterns
**Estimated Effort:** 3 days
## task_end

---

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

