<!-- Purpose: Define the planned structure and conventions for test documentation in this repo. -->
# Tests documentation index

This folder records the planned test documentation layout and serves as the entry point for test-related status and guides.

## Planned folder structure

- docs/tests/overview/
  - Test strategy, scope, and quality gates summary.
- docs/tests/unit/
  - Unit test guidelines, patterns, and per-domain notes.
- docs/tests/integration/
  - DB migration tests, API integration tests, and contract checks.
- docs/tests/e2e/
  - End-to-end test plans for key workflows and UI paths.
- docs/tests/fixtures/
  - Test data conventions, seed data references, and shared fixtures.
- docs/tests/reports/
  - Historical test run summaries, CI artifacts, and known failures.
- docs/tests/runbooks/
  - How to execute tests locally/CI, troubleshooting, and environment setup.
- docs/tests/matrix/
  - Coverage matrix by domain, feature, and workflow.

## Conventions

- Each subfolder should include a README.md describing scope and expectations.
- Keep docs focused on intent and usage; put implementation details in code.
- Align naming with bounded contexts and workflows described in PLAN.md.

## Minimal examples

Example tree after folders are created:

- docs/tests/overview/README.md
- docs/tests/unit/README.md
- docs/tests/integration/README.md
- docs/tests/e2e/README.md
- docs/tests/fixtures/README.md
- docs/tests/reports/README.md
- docs/tests/runbooks/README.md
- docs/tests/matrix/README.md
- docs/tests/CURRENT_STATE.md
