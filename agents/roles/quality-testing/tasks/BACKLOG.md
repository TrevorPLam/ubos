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

## task_begin
### # [id:TASK-20260204-263][type:test][priority:high][component:tests] Establish comprehensive unit testing strategy
**Status:** todo  
**Description:** Implement systematic unit testing coverage for all business logic, service layers, and utilities with clear standards, mocking strategies, and coverage goals to ensure code correctness.  
**Acceptance Criteria:**  
- [ ] Unit test coverage >80% for server business logic (services, utilities)
- [ ] Unit test coverage >75% for client components and hooks
- [ ] Test naming conventions documented (describe/it patterns)
- [ ] Mocking strategy established (DB mocks, API mocks, time mocks)
- [ ] Fast test suite (<30s for unit tests)
**Relevant Files:** `tests/backend/`, `tests/frontend/`, `vitest.config.ts`, `vitest.config.client.ts`  
**Relevant Documentation:** `docs/tests/README.md` — Testing standards, `docs/tests/UNIT_TESTING.md` (new) — Unit test guidelines  
**Plan:**  
1. Audit existing unit test coverage and identify gaps
2. Create unit test templates for common patterns (services, hooks, utilities)
3. Implement mocking infrastructure (DB fixtures, API mocks)
4. Write unit tests for uncovered business logic (target 80%+ coverage)
5. Document unit testing standards and best practices
**Estimated Effort:** 3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-264][type:test][priority:high][component:tests] Build integration testing infrastructure
**Status:** todo  
**Description:** Establish integration testing infrastructure with test database management, API contract testing, and workflow validation to ensure components interact correctly.  
**Acceptance Criteria:**  
- [ ] Test database setup automated (migrations, seed data, teardown)
- [ ] Integration tests for all API endpoints (happy path + error cases)
- [ ] Workflow engine integration tests (multi-step processes)
- [ ] External service mocking (email, payment, webhooks)
- [ ] Integration test suite completes in <5 minutes
**Relevant Files:** `tests/backend/integration/`, `tests/fixtures/`, `tests/utils/testDb.ts` (new)  
**Relevant Documentation:** `docs/tests/README.md` — Testing infrastructure, `docs/tests/INTEGRATION_TESTING.md` (new) — Integration test guide  
**Plan:**  
1. Create test database setup/teardown utilities (Docker PostgreSQL)
2. Build test data fixtures and seed scripts
3. Write integration tests for all API endpoints (CRUD operations)
4. Implement workflow integration tests (end-to-end processes)
5. Document integration testing patterns and common pitfalls
**Estimated Effort:** 3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-265][type:test][priority:high][component:tests] Implement E2E testing with Playwright
**Status:** todo  
**Description:** Establish end-to-end testing infrastructure using Playwright to validate critical user journeys from UI through to database, ensuring the complete system works as expected.  
**Acceptance Criteria:**  
- [ ] Playwright configured for E2E testing (headless + headed modes)
- [ ] E2E tests for critical user journeys (auth, CRM, projects, invoicing)
- [ ] Test environment automation (start server, seed data, cleanup)
- [ ] Visual regression testing integrated for key screens
- [ ] E2E test suite completes in <10 minutes
**Relevant Files:** `tests/e2e/` (new), `playwright.config.ts` (new), `package.json`  
**Relevant Documentation:** `docs/tests/README.md` — Testing strategy, `docs/tests/E2E_TESTING.md` (new) — E2E test guide  
**Plan:**  
1. Install and configure Playwright (browsers, reporters)
2. Create E2E test utilities (login helpers, page objects)
3. Write E2E tests for critical user journeys (5-10 key flows)
4. Integrate visual regression testing (Percy or Playwright screenshots)
5. Document E2E testing patterns and debugging strategies
**Estimated Effort:** 2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-266][type:test][priority:high][component:repo] Establish test coverage goals and enforcement
**Status:** todo  
**Description:** Define test coverage targets, configure coverage reporting, and enforce coverage thresholds in CI to prevent regression and ensure all new code is adequately tested.  
**Acceptance Criteria:**  
- [ ] Coverage thresholds defined (80% lines, 75% branches, 70% functions)
- [ ] Coverage reporting configured in CI with trend tracking
- [ ] Coverage enforcement enabled (CI fails if below threshold)
- [ ] Exclusion rules documented (auto-generated code, types, configs)
- [ ] Coverage reports published and accessible (HTML report artifacts)
**Relevant Files:** `vitest.config.ts`, `vitest.config.client.ts`, `.github/workflows/test.yml`  
**Relevant Documentation:** `docs/tests/README.md` — Test coverage standards, `docs/tests/COVERAGE.md` (new) — Coverage guide  
**Plan:**  
1. Define coverage targets by component (server, client, shared)
2. Configure vitest coverage reporter (v8 with HTML output)
3. Add coverage thresholds to vitest configs (fail on < 80%)
4. Configure CI to upload coverage reports as artifacts
5. Document coverage strategy and how to improve coverage
**Estimated Effort:** 1 week
## task_end

---

## task_begin
### # [id:TASK-20260204-267][type:test][priority:medium][component:tests] Implement contract testing for APIs
**Status:** todo  
**Description:** Establish contract testing using OpenAPI specs and Pact to ensure API contracts are maintained, validated, and versioned properly between frontend and backend teams.  
**Acceptance Criteria:**  
- [ ] OpenAPI 3.x specification generated from code (routes + schemas)
- [ ] Contract validation tests ensure API matches spec (request/response shapes)
- [ ] Contract tests run in CI (fail on breaking changes without version bump)
- [ ] API versioning strategy documented (deprecation timeline)
- [ ] Breaking change detection automated (OpenAPI diff tool)
**Relevant Files:** `docs/api/openapi.yaml`, `tests/contract/` (new), `server/routes.ts`  
**Relevant Documentation:** `docs/api/README.md` — API documentation, `docs/tests/CONTRACT_TESTING.md` (new) — Contract testing guide  
**Plan:**  
1. Generate OpenAPI spec from Zod schemas and Express routes
2. Implement contract validation tests (request/response against spec)
3. Add OpenAPI diff check in CI (detect breaking changes)
4. Document API versioning and deprecation policies
5. Create contract test templates for new endpoints
**Estimated Effort:** 2 weeks
## task_end

---


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

