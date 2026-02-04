<!-- Purpose: Record the current test state of the repository as of 2026-02-03. -->
# Current test state

Date recorded: 2026-02-03

## Summary

- No automated test framework is configured in the repo.
- No test files or test directories are present.
- No test scripts exist in package.json.
- Static checks are available: lint, typecheck, and format checks.

## Evidence

- package.json scripts include:
  - `check` (TypeScript typecheck)
  - `lint` (ESLint)
  - `format` / `format:check` (Prettier)
- No scripts named `test` / `test:*` are defined.
- No test runner dependencies (e.g., Vitest, Jest, Playwright, Cypress) are listed.
- No files matching typical test patterns (e.g., *.test.*, *.spec.*, __tests__) were found.

## Gaps relative to PLAN.md quality gates

PLAN.md requires:

- Unit tests for core domain services and workflow engine
- Integration tests for DB migrations and key endpoints
- Static checks: lint, typecheck

Current state only satisfies the static checks requirement.

## Next steps (recommended)

- Add a test runner (likely Vitest for unit/integration and Playwright for E2E).
- Introduce a test folder structure aligned with domains and workflows.
- Create a tests runbook and a coverage matrix once tests exist.

## Minimal example

Example of a future test file location:

- server/domains/crm/__tests__/client-service.test.ts
