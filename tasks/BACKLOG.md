# Project Backlog

<!--
SYSTEM INSTRUCTIONS — BACKLOG.md (agent-enforced)

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
-->

## group_begin [type:docs][priority:high]
## 📚 Documentation (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-005][type:docs][priority:high][component:onboarding] Add a production-quality README
**Status:** todo  
**Description:** Add a root README that explains what UBOS is, how to run it locally, how to build, and common workflows.
**Acceptance Criteria:**  
- [ ] README includes: prerequisites (Node/Postgres), install, dev, build, start
- [ ] README includes troubleshooting for common issues (PORT, DATABASE_URL, build output)
- [ ] README includes a brief architecture overview (client/server/shared)
**Relevant Files:** `README.md`, `package.json`, `server/index.ts`, `script/build.ts`
## task_end

---

## task_begin
### # [id:TASK-20260203-006][type:docs][priority:high][component:config] Add .env.example and document required env vars
**Status:** todo  
**Description:** Create a checked-in `.env.example` that documents required and optional environment variables for local dev and production.
**Acceptance Criteria:**  
- [ ] `.env.example` exists and includes `DATABASE_URL` and `PORT` defaults/notes
- [ ] README references `.env.example` and explains setup
**Relevant Files:** `.env.example`, `server/db.ts`, `server/index.ts`
## task_end

## group_end

## group_begin [type:quality][priority:high]
## ✅ Code Quality (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-007][type:quality][priority:high][component:tooling] Add ESLint configuration for TS + React
**Status:** todo  
**Description:** Add ESLint with an industry-standard baseline for TypeScript/React and wire it into package scripts.
**Acceptance Criteria:**  
- [ ] `npm run lint` exists and reports issues
- [ ] Lint config covers `client/src`, `server`, and `shared`
- [ ] Lint results are stable (no noisy false positives)
**Relevant Files:** `package.json`, `client/src/**/*`, `server/**/*`, `shared/**/*`
## task_end

---

## task_begin
### # [id:TASK-20260203-008][type:quality][priority:high][component:tooling] Add Prettier formatting + CI format check
**Status:** todo  
**Description:** Add Prettier and scripts for formatting and format verification to keep diffs consistent.
**Acceptance Criteria:**  
- [ ] `npm run format` formats the repo
- [ ] `npm run format:check` fails on unformatted code
- [ ] Prettier config is committed and applies consistently
**Relevant Files:** `package.json`, `.prettierrc*` or `prettier.config.*`
## task_end

## group_end

## group_begin [type:ci][priority:high]
## 🧪 CI (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-009][type:ci][priority:high][component:automation] Add GitHub Actions CI pipeline
**Status:** todo  
**Description:** Add a CI workflow that runs install + typecheck + lint + build on pull requests and main.
**Acceptance Criteria:**  
- [ ] Workflow runs on `pull_request` and `push` to `main`
- [ ] CI runs `npm ci`, `npm run check`, `npm run lint`, `npm run build`
- [ ] CI uses a pinned Node version compatible with the repo
**Relevant Files:** `.github/workflows/ci.yml`, `package.json`
## task_end

## group_end

## group_begin [type:test][priority:high]
## 🧱 Testing (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-010][type:test][priority:high][component:tooling] Add a test runner (Vitest) and first smoke test
**Status:** todo  
**Description:** Add a minimal test setup and at least one high-signal smoke test so CI has real verification.
**Acceptance Criteria:**  
- [ ] `npm test` (or `npm run test`) exists and runs in CI
- [ ] At least 1 test validates a core invariant (e.g., API auth/route behavior or a pure shared util)
- [ ] Tests run headless without requiring manual setup
**Relevant Files:** `package.json`, `server/routes.ts`, `shared/**/*`
## task_end

## group_end

## group_begin [type:devex][priority:medium]
## 🧭 Developer Experience (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-011][type:devex][priority:medium][component:tooling] Add .editorconfig for consistent formatting
**Status:** todo  
**Description:** Add `.editorconfig` to enforce consistent whitespace/newlines across editors.
**Acceptance Criteria:**  
- [ ] `.editorconfig` exists and matches project conventions
- [ ] No conflicts with Prettier/ESLint settings
**Relevant Files:** `.editorconfig`
## task_end

---

## task_begin
### # [id:TASK-20260203-012][type:devex][priority:medium][component:tooling] Pin package manager + document install expectations
**Status:** todo  
**Description:** Ensure reproducible installs by explicitly pinning a package manager and documenting it.
**Acceptance Criteria:**  
- [ ] `package.json` includes `packageManager` (and/or docs specify npm version)
- [ ] README describes the expected install command (`npm ci` vs `npm install`)
**Relevant Files:** `package.json`, `README.md`
## task_end

## group_end

## group_begin [type:security][priority:medium]
## 🔐 Security & Governance (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-013][type:security][priority:medium][component:repo] Add SECURITY.md and vulnerability reporting guidance
**Status:** todo  
**Description:** Document how to report security issues and the supported disclosure process.
**Acceptance Criteria:**  
- [ ] `SECURITY.md` exists with contact/process
- [ ] README links to the security policy
**Relevant Files:** `SECURITY.md`, `README.md`
## task_end

---

## task_begin
### # [id:TASK-20260203-014][type:security][priority:medium][component:repo] Add CONTRIBUTING + PR/issue templates
**Status:** todo  
**Description:** Add contributor guidance and lightweight GitHub templates to standardize changes.
**Acceptance Criteria:**  
- [ ] `CONTRIBUTING.md` exists (workflow, coding standards, how to run checks)
- [ ] PR template exists and prompts for tests/screenshots
- [ ] Issue templates exist for bugs and feature requests
**Relevant Files:** `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*`
## task_end

## group_end

## group_begin [type:ci][priority:medium]
## 🧪 CI (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-015][type:ci][priority:medium][component:automation] Add dependency update automation (Dependabot/Renovate)
**Status:** todo  
**Description:** Configure automated dependency update PRs to keep dependencies current and secure.
**Acceptance Criteria:**  
- [ ] Dependabot or Renovate is configured for npm
- [ ] Update cadence is set (e.g., weekly) and includes security updates
**Relevant Files:** `.github/dependabot.yml` (or Renovate config)
## task_end

---

## task_begin
### # [id:TASK-20260203-016][type:ci][priority:medium][component:automation] Add a basic security audit step to CI
**Status:** todo  
**Description:** Add an automated audit step to catch known vulnerable dependency versions.
**Acceptance Criteria:**  
- [ ] CI runs an audit step with a documented threshold policy
- [ ] Audit failures are actionable (documented remediation steps)
**Relevant Files:** `.github/workflows/ci.yml`, `package.json`
## task_end

## group_end

## group_begin [type:reliability][priority:low]
## 🛡️ Reliability (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-017][type:reliability][priority:low][component:server] Avoid crashing the process in the Express error handler
**Status:** todo  
**Description:** The current error middleware throws after sending a response, which can crash the server for handled errors.
**Acceptance Criteria:**  
- [ ] Error handler returns a response without throwing
- [ ] Logging remains intact (and does not leak sensitive data)
**Relevant Files:** `server/index.ts`
## task_end

## group_end

## group_begin [type:release][priority:low]
## 🏷️ Release Management (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-018][type:release][priority:low][component:repo] Add versioning + release notes automation
**Status:** todo  
**Description:** Introduce a lightweight release process (e.g., Changesets or semantic-release) to standardize changelogs and releases.
**Acceptance Criteria:**  
- [ ] Release tooling is chosen and configured
- [ ] A minimal workflow exists to generate/update release notes
- [ ] Maintainer instructions are documented
**Relevant Files:** `package.json`, `.github/workflows/*`, `README.md`
## task_end

## group_end

## group_begin [type:infra][priority:low]
## 🐳 Infrastructure (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-019][type:infra][priority:low][component:dev] Add Docker + compose for local Postgres
**Status:** todo  
**Description:** Provide an optional containerized local environment for consistent onboarding.
**Acceptance Criteria:**  
- [ ] Dockerfile and/or `docker-compose.yml` exist for local dev
- [ ] Compose provisions Postgres with a documented `DATABASE_URL`
- [ ] README includes steps to use containers
**Relevant Files:** `Dockerfile`, `docker-compose.yml`, `README.md`
## task_end

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
