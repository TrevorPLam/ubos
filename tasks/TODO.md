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
**Batch Type:** ci  
**Batch Goal:** Establish CI/CD foundation with automated testing and build verification  
**Batch Size Target:** 5

---

## task_begin
## 1. # [id:TASK-20260203-009][type:ci][priority:high][component:automation] Add GitHub Actions CI pipeline

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Add a CI workflow that runs install + typecheck + lint + build on pull requests and main.

### Acceptance Criteria
- [ ] Workflow runs on `pull_request` and `push` to `main`
- [ ] CI runs `npm ci`, `npm run check`, `npm run lint`, `npm run build`
- [ ] CI uses a pinned Node version compatible with the repo

### Definition of Done
- [ ] Code merged / change complete
- [ ] Checks pass (typecheck/lint/build/tests as applicable)

### Relevant Files
- `.github/workflows/ci.yml`
- `package.json`

### Dependencies
- None

### Plan
1. Create `.github/workflows/ci.yml` with Node.js setup
2. Add install, check, lint, and build steps
3. Test workflow on push/PR

### Notes & Summary
- [log] Task promoted from BACKLOG.md to start CI foundation
## task_end

---

## task_begin
## 2. # [id:TASK-20260203-010][type:test][priority:high][component:tooling] Add a test runner (Vitest) and first smoke test

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Add a minimal test setup and at least one high-signal smoke test so CI has real verification.

### Acceptance Criteria
- [ ] `npm test` (or `npm run test`) exists and runs in CI
- [ ] At least 1 test validates a core invariant (e.g., API auth/route behavior or a pure shared util)
- [ ] Tests run headless without requiring manual setup

### Definition of Done
- [ ] Code merged / change complete
- [ ] Checks pass (typecheck/lint/build/tests as applicable)

### Relevant Files
- `package.json`
- `server/routes.ts`
- `shared/**/*`

### Dependencies
- None

### Plan
1. Install Vitest and configure
2. Add test script to package.json
3. Create first smoke test for core functionality

### Notes & Summary
- [log] Task promoted to establish testing foundation
## task_end

---

## task_begin
## 3. # [id:TASK-20260203-015][type:ci][priority:medium][component:automation] Add dependency update automation (Dependabot/Renovate)

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Configure automated dependency update PRs to keep dependencies current and secure.

### Acceptance Criteria
- [ ] Dependabot or Renovate is configured for npm
- [ ] Update cadence is set (e.g., weekly) and includes security updates

### Definition of Done
- [ ] Code merged / change complete
- [ ] Checks pass (typecheck/lint/build/tests as applicable)

### Relevant Files
- `.github/dependabot.yml` (or Renovate config)

### Dependencies
- None

### Plan
1. Choose between Dependabot and Renovate
2. Create configuration file
3. Test automation workflow

### Notes & Summary
- [log] Promoted from medium priority to complete CI tooling
## task_end

---

## task_begin
## 4. # [id:TASK-20260203-016][type:ci][priority:medium][component:automation] Add a basic security audit step to CI

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Add an automated audit step to catch known vulnerable dependency versions.

### Acceptance Criteria
- [ ] CI runs an audit step with a documented threshold policy
- [ ] Audit failures are actionable (documented remediation steps)

### Definition of Done
- [ ] Code merged / change complete
- [ ] Checks pass (typecheck/lint/build/tests as applicable)

### Relevant Files
- `.github/workflows/ci.yml`
- `package.json`

### Dependencies
- TASK-20260203-009 (CI pipeline)

### Plan
1. Add audit step to existing CI workflow
2. Configure failure thresholds
3. Document remediation process

### Notes & Summary
- [log] Promoted to enhance CI security capabilities
## task_end

---

## task_begin
## 5. # [id:TASK-20260203-011][type:devex][priority:medium][component:tooling] Add .editorconfig for consistent formatting

**Status:** todo  
**Created:** 2026-02-03  
**Assignee:** @agent

### Description
> Add `.editorconfig` to enforce consistent whitespace/newlines across editors.

### Acceptance Criteria
- [ ] `.editorconfig` exists and matches project conventions
- [ ] No conflicts with Prettier/ESLint settings

### Definition of Done
- [ ] Code merged / change complete
- [ ] Checks pass (typecheck/lint/build/tests as applicable)

### Relevant Files
- `.editorconfig`

### Dependencies
- None

### Plan
1. Create `.editorconfig` with project settings
2. Verify compatibility with existing tooling
3. Test with different editor scenarios

### Notes & Summary
- [log] Promoted from devex to complete developer tooling in this batch
## task_end

---

<!-- Tasks are promoted here from BACKLOG.md. Keep only active tasks in this file. -->
