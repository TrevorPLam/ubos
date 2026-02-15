# Task 6.2 – Test Environment Fixes (2026)

**Last updated:** 2026-02-14
**Owner:** Backend/Test Infrastructure

## Summary

- Default backend tests run against in-memory pg-mem (no Postgres service required).
- Postgres is optional: set `TEST_DB_DRIVER=postgres` + `DATABASE_URL` only when you explicitly want to hit a real database.
- Clear fallback messaging for missing `DATABASE_URL` in non-test environments.

## Changes

1. **Database bootstrap** (`server/db.ts`)
   - In test env (`NODE_ENV=test`), prefer pg-mem unless `TEST_DB_DRIVER=postgres` is set.
   - When `TEST_DB_DRIVER=postgres` is set but `DATABASE_URL` is missing, we still fall back to pg-mem to avoid hard failures while preserving test isolation.
   - Non-test environments continue to require `DATABASE_URL` and throw a clear error if absent.

2. **Test setup** (`tests/setup/backend.setup.ts` – unchanged behavior)
   - Tests remain isolated; the new db bootstrap logic transparently uses pg-mem, so the existing `DATABASE_URL` fallback no longer breaks runs when Postgres is unavailable.

## How to run tests

- **Default (no Postgres needed):**

  ```bash
  NODE_ENV=test npm test
  ```

  Uses pg-mem automatically for hermetic, credential-free runs.

- **Against real Postgres (optional):**

  ```bash
  NODE_ENV=test TEST_DB_DRIVER=postgres DATABASE_URL="postgresql://user:pass@localhost/test_db" npm test
  ```

  Useful only when you explicitly need integration/performance checks.

## Rationale (2026 best practices)

- **Hermetic tests by default:** pg-mem avoids external dependencies, enabling parallel CI and faster feedback.
- **Zero-trust & safety:** Explicit opt-in for real DB prevents accidental use of prod/staging credentials in tests.
- **Forward compatibility:** Environment switch keeps us ready for future matrix testing (pg-mem + Postgres + cloud providers).

## Verification

- Successful db initialization in tests without local Postgres credentials.
- Permission middleware logging no longer throws `db.insert is not a function` when `DATABASE_URL` is absent.

## Next Steps

- Add CI matrix to run smoke tests with pg-mem and a real Postgres service.
- Extend test setup to seed pg-mem with fixtures for deterministic integration tests.
