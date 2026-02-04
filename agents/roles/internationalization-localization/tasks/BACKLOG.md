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
### # [id:TASK-20260204-164][type:dev][priority:high][component:client] Implement i18n Framework with React
**Status:** todo  
**Description:** Integrate internationalization framework (react-i18next) into React application with support for multiple languages, dynamic language switching, and pluralization.  
**Acceptance Criteria:**  
- [ ] react-i18next integrated with language detection
- [ ] Translation files organized by namespace
- [ ] Dynamic language switching without page reload
- [ ] Pluralization and interpolation support
- [ ] Language selector component
**Relevant Files:** `client/src/`, `client/src/i18n/`, `client/src/components/`  
**Relevant Documentation:** `docs/user/README.md`, `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md`  
**Plan:**  
1. Install and configure react-i18next
2. Set up translation file structure by namespace
3. Create language detection and persistence logic
4. Implement language selector component
5. Wrap existing strings with translation functions
**Estimated Effort:** 3 days
## task_end

---

## task_begin
### # [id:TASK-20260204-165][type:dev][priority:high][component:client] Add RTL (Right-to-Left) Language Support
**Status:** todo  
**Description:** Implement RTL layout support for languages like Arabic and Hebrew including CSS direction changes, mirrored layouts, and bidirectional text handling.  
**Acceptance Criteria:**  
- [ ] CSS direction switching based on language
- [ ] Mirrored layout components for RTL
- [ ] Bidirectional text (bidi) handling
- [ ] RTL-compatible icon positioning
- [ ] Testing with Arabic and Hebrew languages
**Relevant Files:** `client/src/`, `tailwind.config.ts`, `client/src/styles/`  
**Relevant Documentation:** `docs/user/README.md`, `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md`  
**Plan:**  
1. Configure Tailwind CSS for RTL support
2. Implement direction switching logic based on language
3. Update layout components for RTL compatibility
4. Test and fix icon and spacing issues in RTL mode
5. Validate with native Arabic and Hebrew speakers
**Estimated Effort:** 3 days
## task_end

---
## group_end

## group_begin [type:dev][priority:medium]
## ðŸš€ Development (Unscheduled) â€” Medium

## task_begin
### # [id:TASK-20260204-166][type:dev][priority:medium][component:server] Implement Locale-Aware Data Formatting
**Status:** todo  
**Description:** Build locale-aware formatting for dates, times, numbers, and currency throughout the application respecting user locale preferences.  
**Acceptance Criteria:**  
- [ ] Date and time formatting per locale (Intl.DateTimeFormat)
- [ ] Number formatting with locale-specific separators
- [ ] Currency formatting with proper symbols
- [ ] Relative time formatting (e.g., "2 hours ago")
- [ ] Timezone handling and conversion
**Relevant Files:** `client/src/lib/`, `server/`, `shared/`  
**Relevant Documentation:** `docs/architecture/30_cross_cutting/README.md`, `docs/data/README.md`  
**Plan:**  
1. Create locale formatting utility library
2. Implement date/time formatting with Intl APIs
3. Add number and currency formatting functions
4. Build relative time formatting
5. Integrate timezone handling throughout application
**Estimated Effort:** 2 days
## task_end

---

## task_begin
### # [id:TASK-20260204-167][type:dev][priority:medium][component:tooling] Build Translation Management Workflow
**Status:** todo  
**Description:** Create tooling and workflow for managing translations including extraction of translatable strings, collaboration with translators, and import/export processes.  
**Acceptance Criteria:**  
- [ ] Translation string extraction from code
- [ ] Missing translation detection and reporting
- [ ] Import/export to translation management platforms
- [ ] Translation validation (placeholders, plurals)
- [ ] CI check for missing translations
**Relevant Files:** `client/src/i18n/`, `script/`, `.github/workflows/`  
**Relevant Documentation:** `docs/architecture/10_current_state/BUILD_AND_TOOLING.md`, `docs/architecture/50_deployment/CI_CD.md`  
**Plan:**  
1. Set up translation extraction tooling
2. Create missing translation detection script
3. Implement import/export for translation platforms (Lokalise, Crowdin)
4. Build translation validation checks
5. Add CI check for translation completeness
**Estimated Effort:** 2 days
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

