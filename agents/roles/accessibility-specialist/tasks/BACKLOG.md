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
### # [id:TASK-20260204-100][type:dev][priority:high][component:client] Implement WCAG 2.1 AA Keyboard Navigation
**Status:** todo  
**Description:** Ensure all interactive elements in the React application support full keyboard navigation per WCAG 2.1 AA standards. This includes proper focus management, skip links, focus indicators, and logical tab order across all pages and components.  
**Acceptance Criteria:**  
- [ ] All interactive elements are keyboard accessible (Tab, Enter, Space, Arrow keys)
- [ ] Visible focus indicators on all focusable elements
- [ ] Skip navigation links implemented on all pages
- [ ] Focus trap implemented for modals and dialogs
- [ ] Tab order follows logical reading flow
**Relevant Files:** `client/src/components/*`, `client/src/pages/*`, `client/src/App.tsx`  
**Relevant Documentation:** `docs/user/README.md`, `docs/architecture/30_cross_cutting/README.md`  
**Plan:**  
1. Audit all interactive components and pages for keyboard accessibility gaps
2. Implement focus management utilities and hooks (useFocusTrap, useFocusVisible)
3. Add skip navigation links to main layout component
4. Update CSS to ensure visible focus indicators on all interactive elements
5. Test keyboard navigation flow across all major user journeys
**Estimated Effort:** 2 days
## task_end

---

## task_begin
### # [id:TASK-20260204-101][type:dev][priority:high][component:client] Add ARIA Labels and Landmarks to Core Components
**Status:** todo  
**Description:** Implement proper ARIA attributes (labels, roles, landmarks) throughout the application to improve screen reader compatibility. Focus on core navigation, forms, data tables, and dynamic content regions.  
**Acceptance Criteria:**  
- [ ] All navigation regions use appropriate ARIA landmarks (navigation, main, complementary)
- [ ] Form inputs have associated labels or aria-label attributes
- [ ] Dynamic content updates announce via aria-live regions
- [ ] Data tables use proper ARIA table semantics
- [ ] Icon buttons have aria-label for screen readers
**Relevant Files:** `client/src/components/Layout.tsx`, `client/src/components/forms/*`, `client/src/components/ui/*`  
**Relevant Documentation:** `docs/user/README.md`, `docs/architecture/30_cross_cutting/README.md`  
**Plan:**  
1. Audit component library for missing ARIA attributes using axe DevTools
2. Add ARIA landmarks to layout components (header, nav, main, aside, footer)
3. Update form components to ensure proper label associations
4. Implement aria-live regions for toast notifications and dynamic content updates
5. Validate with screen reader testing (NVDA/JAWS)
**Estimated Effort:** 3 days
## task_end

---
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

