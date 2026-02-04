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

## task_begin
### # [id:TASK-20260203-001][type:config][priority:critical][component:repo] Create AGENTS governance pack
**Status:** todo  
**Description:** Create comprehensive governance pack per PLAN.md requirements. This is the foundation for all other work and must be completed first per PLAN.md "Step 1: Inspect the repository and create governance pack if missing."  
**Dependencies:** None (blocks all other work)
**Acceptance Criteria:**  
- [ ] /AGENTS/AGENTS.toon entrypoint created
- [ ] /AGENTS/policies/TOOL_POLICY.md created
- [ ] /AGENTS/policies/SAFETY_POLICY.md created
- [ ] /AGENTS/policies/ARCHITECTURE_RULES.md created
- [ ] /AGENTS/policies/CODING_STANDARDS.md created
- [ ] /AGENTS/tasks/TODO.toon created
- [ ] /AGENTS/tasks/BACKLOG.toon created
- [ ] /AGENTS/tasks/ARCHIVE.toon created
- [ ] Governance pack is enforceable and documented
**Definition of Done:**  
- [ ] All files created and validated
- [ ] PLAN.md requirements satisfied
- [ ] README.md links to governance pack
**Relevant Files:** `/AGENTS/*` (all new), `README.md`, `PLAN.md`
**Relevant Documentation:** `PLAN.md` â€” Agent governance requirements, `docs/standards/README.md` â€” Documentation standards to follow, `docs/architecture/README.md` â€” System architecture for ARCHITECTURE_RULES, `docs/security/00-overview/SECURITY_POLICY.md` â€” Security policy for SAFETY_POLICY
**Plan:**  
1. Create `/AGENTS/` directory structure
2. Create AGENTS.toon entrypoint (references PLAN.md)
3. Define TOOL_POLICY (tool usage guidelines)
4. Define SAFETY_POLICY (security, PII, credentials)
5. Define ARCHITECTURE_RULES (from PLAN.md: domain boundaries, no cross-domain reads, workflow orchestration)
6. Define CODING_STANDARDS (TypeScript, testing, documentation)
7. Create task management files (toon format)
8. Link from README.md
9. Validate against PLAN.md checklist
**Estimated Effort:** 1 week
## task_end

## group_end

## group_begin [type:infra][priority:high]
## ðŸ³ Infrastructure (Unscheduled) â€” High



## group_end

## group_begin [type:dev][priority:high]
## ðŸš€ Development (Unscheduled) â€” High




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

## task_begin
### # [id:TASK-20260203-004][type:config][priority:low][component:tooling] Declare supported Node.js versions
**Status:** todo  
**Description:** Add a clear Node.js version requirement so installs/builds donâ€™t fail unexpectedly on older Node versions.  
**Acceptance Criteria:**  
- [ ] `package.json` declares `engines.node` (minimum supported version)
- [ ] Local dev and CI use a compatible Node version
**Relevant Files:** `package.json`
**Relevant Documentation:** `docs/architecture/10_current_state/BUILD_AND_TOOLING.md` â€” Build requirements, `README.md` â€” Setup instructions
**Plan:**  
1. Determine minimum Node.js version (test with current dependencies)
2. Add `engines.node` field to package.json
3. Update .nvmrc if present
4. Update CI to use specified Node version
5. Document Node version in README
**Estimated Effort:** 30 minutes
## task_end

## group_end

