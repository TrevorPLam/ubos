# tasks/infrastructure/P0-MIG.md – Data Migration Framework

This file covers the expand‑contract migration pattern documentation, Drizzle schema‑diff and migration compatibility checks in CI, automated rollback procedures using Neon PITR, backfill script templates, and migration rehearsal workflows. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑MIG (2026‑05‑06)

### 1. The Expand‑Contract Pattern (2026 Consensus)

The expand‑contract pattern is the universally recommended approach for zero‑downtime PostgreSQL schema changes in 2026. Multiple authoritative sources published between March and May 2026 agree on the same three‑phase structure:

| Phase | Action | Reversible? | Deployment |
|---|---|---|---|
| **Expand** | Add new columns as nullable, create new tables, build indexes with `CONCURRENTLY`. Old code ignores new structures. | Yes — drop new columns | Independent PR + deploy |
| **Migrate** | Dual‑write from app layer (old + new), backfill historical rows in batches. | Yes — old schema still works | Independent PR + deploy |
| **Contract** | Drop old columns, add `NOT NULL` constraints. Gated on verification that all clients have migrated. | Only after version gate passes | Independent PR + deploy |

Key rules from the literature:
- Each phase is its own PR, its own deployment, its own rollback path.
- PostgreSQL wraps DDL in transactions — if anything fails, nothing applies — making the expand phase atomic.
- Never ship a breaking schema change in a single deployment.
- Backfills should run in batches (5000–10000 rows at a time) with throttling, outside of the migration transaction.
- The contract phase needs **client telemetry** to know when it's safe to drop old columns.

### 2. Schema Drift Detection for Drizzle

**`drizzle‑kit check`**: Validates migration **history consistency** — it scans all generated migration files and their snapshot JSONs to detect collisions caused by multiple developers working on different branches. It does **not** detect whether the TypeScript schema has un‑generated changes relative to the last migration.

**Detecting un‑generated changes**: A feature request for a `drizzle‑kit changes` or `drizzle‑kit check --diff` command exists (Issue #5059, Nov 2025) but is **not yet implemented**. The community workaround, validated by multiple teams in 2026, is:

1. Apply all migrations to a throwaway database (or Neon branch).  
2. Run `drizzle‑kit push --dry-run` against that database.  
3. If `push --dry-run` detects pending changes (non‑zero exit or output), the TypeScript schema has drifted from the migration state.  
4. Fail the CI build if drift is detected.

### 3. Neon PITR and Rollback Procedures

Neon's PITR is based on its copy‑on‑write storage architecture. Key operational facts:

- **Instant restore**: Creates a new branch at a specific point in time in ~1 second regardless of database size, via copy‑on‑write storage.
- **Non‑destructive**: The production branch remains online and untouched. The restored branch is a separate, fully independent environment.
- **LSN‑level granularity**: You can restore to any Log Sequence Number within the retention window.
- **Retention window**: 30 days on the Free plan, configurable on paid plans.
- **Automatic backup**: Before a restore, Neon automatically creates a backup branch preserving the pre‑restore state, enabling rollback of the restore itself.
- **Two recovery routes**: (1) Keep production running, copy missing data from the PITR branch via `pg_dump`/`INSERT INTO ... SELECT`. (2) Full branch overwrite — restore the branch to a previous state (overwrite, not merge).
- **`reset-from-parent`**: Neon API/CLI feature that instantly resets a branch to its parent's latest state.

For UBOS, the rollback runbook combines two strategies:
1. **Schema‑only rollback**: If a migration added a column — drop it. The expand‑contract pattern gives a natural rollback point at every phase.
2. **Data + schema rollback**: Use Neon PITR to create a recovery branch, export affected data, and restore to production.

### 4. Backfill Best Practices

From the 2026 production PostgreSQL migration literature:

- **Batch, don't lock**: Backfills must run in small batches (5000–10000 rows) with commits between batches to avoid long‑running transactions.
- **Throttle**: Add a short sleep between batches to reduce load on the production database.
- **Idempotent**: Each batch should be restartable — use `WHERE column IS NULL AND id BETWEEN :start AND :end` patterns.
- **Monitor progress**: Track total rows, completed rows, and estimated time remaining.
- **Outside the migration**: Backfills should run as a separate operational step, not inside the DDL migration transaction.

### 5. Migration Rehearsal via Neon Branching

The recommended 2026 pattern for migration rehearsal:

1. Create a Neon branch from the production database (instant, includes all data).  
2. Run migrations against the branch.  
3. Verify: run application test suite, check for performance regressions, validate data integrity.  
4. If successful, proceed with production deployment.  
5. If failed, delete the branch and iterate.

Neon's `create‑branch‑action` GitHub Action (v5) automates this in CI. The branch can optionally be created at production scale (matching compute size) for realistic performance testing. For UBOS, this can be an optional but recommended step in the deployment pipeline before production migrations.

### 6. OpenAPI Spec Diffing for API Breaking Changes

The 2026 consensus tool for OpenAPI breaking change detection is **`oasdiff`**:

- Free, open source, 1M+ downloads, 1,100+ GitHub stars.
- 300+ change detection rules covering removals, type changes, enum modifications, required/optional changes.
- GitHub Action available: `oasdiff/action`.
- Supports OpenAPI 3.0 and 3.1.
- Exit codes: non‑zero when breaking changes detected, zero when compatible.
- Recommended workflow: run `oasdiff breaking base-spec.yaml head-spec.yaml` in CI on every PR that modifies the API spec; fail the build if breaking changes are detected without explicit approval.

---

## Task Definitions

### [ ] P0-MIG-1: Document expand‑contract migration pattern as team standard

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🔴 Critical
**Current State:** No documented migration pattern or standard exists for the UBOS codebase. The current Drizzle migration workflow (`drizzle‑kit generate` → `drizzle‑kit migrate`) generates SQL files but provides no guidance on how to structure breaking schema changes across multiple deployments, how to backfill data safely, or when it's safe to drop old columns. The team risks introducing downtime by shipping breaking DDL changes in a single deployment.
**Size:** Small

**Description:**
Create a comprehensive team‑standard document at `docs/development/migrations.md` that codifies the expand‑contract migration pattern for UBOS. The document must cover:

1. **Philosophy**: Never ship a breaking schema change in a single deployment. Every non‑additive change follows Expand → Migrate → Contract.
2. **Phase 1 – Expand**: Add new columns as nullable, create new tables, add indexes with `CONCURRENTLY`. Write the Drizzle schema changes and generate the migration. The old schema still works. Rollback: drop the new columns.
3. **Phase 2 – Migrate**: Dual‑write from the application layer (write both old and new columns). Backfill historical data using batched updates (not inside the migration transaction). Deploy backfill as a separate script or Inngest job. Rollback: stop dual‑write, old schema still intact.
4. **Phase 3 – Contract**: After verifying that all application instances are reading/writing the new columns, drop the old columns and add `NOT NULL` constraints. Only after monitoring confirms zero reads from old columns.
5. **Real examples**: Show a column rename (`name` → `full_name`) using the expand‑contract pattern, with actual Drizzle TypeScript schema changes and the three generated SQL migrations.
6. **Checklist**: A pre‑deployment checklist for each phase.
7. **Drizzle‑specific guidance**: How `drizzle‑kit generate` diffs TS schema vs. its local `meta/` snapshot (not the live DB), why the journal tracks applied migrations, and how to handle merge conflicts in `_journal.json`.

Additionally, create a shorter reference card at `docs/development/migrations-quickref.md` with a one‑page summary and the checklist.

**Research Findings (2026‑05‑06):**
- The expand‑contract pattern is the consensus approach across all major 2026 PostgreSQL migration guides.
- Each phase is a separate PR and deployment.
- PostgreSQL's transactional DDL makes the expand phase atomic and safe.
- Backfills must be batched and throttled, not run inside the migration transaction.
- `drizzle‑kit generate` diffs TS schema vs. local meta snapshot, not the live DB.

**Depends on:** [N/A]

**Blocks:**
- `tasks/infrastructure/P0-MIG.md → P0-MIG-2` (schema‑diff CI needs the pattern documented)
- `tasks/infrastructure/P0-MIG.md → P0-MIG-4` (backfill template references the pattern)
- All Phase 1 domain tasks (every schema change must follow the pattern)

**Related Files:**
- `docs/development/migrations.md` (new)
- `docs/development/migrations-quickref.md` (new)

**Definition of Done**
- [ ] `docs/development/migrations.md` written with all sections: Philosophy, Expand/Migrate/Contract phases with Drizzle code examples, rollback path for each phase, backfill strategy, safety checklist
- [ ] At least one complete example: column rename (`name` → `full_name`) with the three migration files shown inline
- [ ] `docs/development/migrations-quickref.md` written: one‑page summary with checklist
- [ ] Drizzle‑specific guidance included: how `meta/` snapshot works, journal behavior, merge conflict resolution
- [ ] Document reviewed by at least one team member who did not write it
- [ ] `pnpm run typecheck` passes (docs only — no code changes)

**Out of Scope**
- Implementing automated enforcement of the pattern (deferred; could be a lint rule in the future)
- Documenting blue‑green (shadow schema) pattern (reserved for Phase 2+ when structural rewrites are needed)
- Migrating existing migrations to the pattern (existing migrations are immutable; pattern applies to all future migrations)

**Rules to Follow**
- All SQL examples must be valid PostgreSQL.
- Drizzle examples must use the current Drizzle table definition syntax.
- Document must make clear that `drizzle‑kit generate` diffs against its local snapshot, not the live DB.

**Verification**
```bash
ls docs/development/migrations.md
ls docs/development/migrations-quickref.md
# Manual: review document for correctness and completeness
# Manual: verify Drizzle examples compile against current schema
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (documentation)

---

#### Subtasks

- [ ] P0-MIG-1.0.25 (AGENT): Read the current Drizzle migration setup (`drizzle.config.ts`, `drizzle/` folder, existing migration files) and the Drizzle migration docs to understand the tooling baseline.
  **Verification:** Current migration workflow documented.

- [ ] P0-MIG-1.0.5 (AGENT): Research the expand‑contract pattern across multiple 2026 sources; identify common themes and Drizzle‑specific guidance.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MIG-1.1 (AGENT): Write `docs/development/migrations.md` with all required sections and Drizzle code examples.
  **File(s):** `/docs/development/migrations.md`
  **Verification:** Document covers all required sections; Drizzle code examples are syntactically correct.

- [ ] P0-MIG-1.2 (AGENT): Write `docs/development/migrations-quickref.md` with one‑page summary and checklist.
  **File(s):** `/docs/development/migrations-quickref.md`
  **Verification:** Quick reference is concise and self‑contained.

- [ ] P0-MIG-1.3 (HUMAN): Review migration pattern document, verify examples, and approve as team standard.
  **Verification:** Approved.

---

### [ ] P0-MIG-2: Add schema‑diff and migration compatibility check to CI

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No automated checks exist in CI to detect whether the TypeScript Drizzle schema has un‑generated migration changes or whether the applied migrations match the declared schema. A developer can modify `schema.ts` without running `drizzle‑kit generate`, and the change will go undetected until runtime when the database schema doesn't match. Additionally, there is no check for migration history collisions caused by parallel branch work.
**Size:** Medium

**Description:**
Implement a GitHub Actions workflow (or extend the existing CI workflow) that performs two checks:

**Check 1 — Migration collision detection (`drizzle‑kit check`):** Runs against the committed migration folder to verify that all generated migrations are consistent (no collision from parallel branches). This is quick, requires no database connection, and catches the most common team‑workflow error: two developers generating migrations on different branches and merging without reconciliation.

**Check 2 — Schema drift detection (`push --dry-run`):** Creates a throwaway database (using a Neon branch via `neondatabase/create‑branch‑action@v5` or a local Docker PostgreSQL container), applies all existing migrations via `pnpm db:migrate`, then runs `drizzle‑kit push --dry-run` against that database. If `push --dry-run` reports pending changes, the TypeScript schema has drifted from the migration state and a migration needs to be generated. This prevents the dreaded "migration recorded as done but SQL never executed" scenario that has burned teams in production.

The workflow should:
1. Trigger on every PR that touches files under `packages/db/src/schema/` (Check 1) and/or on every push to `main` and PR branches (Check 2).
2. Fail the build if either check detects issues.
3. Provide clear error messages: "Migration drift detected — run `pnpm db:generate` to create a migration" for Check 2, and "Migration collisions detected — rebase and regenerate migrations" for Check 1.

Create the workflow at `.github/workflows/schema-diff.yml`.

**Research Findings (2026‑05‑06):**
- `drizzle‑kit check` scans migration snapshots for collisions; it does NOT compare TS schema to migrations.
- For schema‑to‑migration drift: the `push --dry-run` pattern has been validated by multiple teams as a workaround until the `drizzle‑kit changes` command is implemented.
- The `drizzle‑kit changes` feature request (Issue #5059) remains open and unimplemented as of 2026‑05‑06.
- Neon branching provides instant, lightweight databases for the throwaway DB approach.
- `drizzle‑kit check` CLI options: `drizzle‑kit check` or `drizzle‑kit check:pg` with config path.

**Depends on:**
- `tasks/infrastructure/P0-MIG.md → P0-MIG-1` (migration pattern documented)
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (programmatic migration script)
- `tasks/infrastructure/P0-DB.md → P0-DB-7` (Neon branching for CI)

**Blocks:**
- `tasks/infrastructure/P0-MIG.md → P0-MIG-3` (rollback procedure references CI checks)

**Related Files:**
- `.github/workflows/schema-diff.yml` (new)
- `packages/db/drizzle.config.ts` (reference for config path)
- `packages/db/package.json` (verify `db:generate` and `db:migrate` scripts exist)

**Definition of Done**
- [ ] `.github/workflows/schema-diff.yml` created with both checks: `drizzle‑kit check` and `push --dry-run`
- [ ] Check 1 runs on PRs touching `packages/db/src/schema/**` and fails on migration collisions
- [ ] Check 2 creates a throwaway Neon branch (or Docker PG), applies all migrations, runs `drizzle‑kit push --dry-run`, and fails if pending changes detected
- [ ] Workflow provides clear, actionable error messages
- [ ] Workflow tested: create a PR with a schema change but no migration → CI fails with drift message
- [ ] Workflow tested: create a PR with proper migration → CI passes
- [ ] `NEON_API_KEY` and `NEON_PROJECT_ID` secrets available to the workflow
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- OpenAPI spec diffing (separate task in P0‑API group, but the same pattern applies)
- Automatic migration generation in CI (generation should happen locally, CI only verifies)
- Schema diff against production database (deferred until production environment is stable)

**Rules to Follow**
- Never auto‑generate migrations in CI — the workflow should only detect drift, not fix it.
- If `drizzle‑kit push --dry-run` does not support `--dry-run` in the current version, use output parsing as a fallback (check for "No changes detected" vs. SQL output).
- The throwaway database must be deleted after the check completes to avoid cost.

**Verification**
```bash
# Test: create a branch with a schema change but no migration
# Push to GitHub → PR triggers workflow → expect CI failure
# Add migration → push → expect CI success
# Check logs: "Migration drift detected" or "All migrations are in sync"
ls .github/workflows/schema-diff.yml
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (CI automation)

---

#### Subtasks

- [ ] P0-MIG-2.0.25 (AGENT): Read the current CI workflow (`.github/workflows/ci.yml` if it exists) and understand the Neon branching action from P0‑DB‑7. Research `drizzle‑kit check` and `push --dry-run` behavior.
  **Verification:** Current CI state and commands understood.

- [ ] P0-MIG-2.0.5 (AGENT): Research the `drizzle‑kit changes` feature request status and community workarounds.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MIG-2.1 (AGENT): Create `schema-diff.yml` with Check 1 (`drizzle‑kit check`) triggered on PRs to `main` that touch `packages/db/src/schema/**`.
  **File(s):** `.github/workflows/schema-diff.yml`
  **Verification:** Workflow file valid; trigger conditions correct.

- [ ] P0-MIG-2.2 (AGENT): Add Check 2 to `schema-diff.yml`: create Neon branch, apply migrations, run `drizzle‑kit push --dry-run`, delete branch.
  **File(s):** `.github/workflows/schema-diff.yml`
  **Verification:** Check 2 runs successfully on a clean PR.

- [ ] P0-MIG-2.3 (AGENT): Test the workflow with a PR that has a schema change but no migration (expect failure) and a PR with proper migration (expect success).
  **Verification:** Both scenarios produce expected CI results.

- [ ] P0-MIG-2.4 (HUMAN): Review workflow, verify CI behavior, and approve.
  **Verification:** Approved.

---

### [ ] P0-MIG-3: Implement automated rollback procedure (Neon PITR + migration reversal)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** No documented or automated rollback procedure exists for database migrations. If a migration causes data loss or corruption in production, the team has no established process for recovery. Neon PITR is available as a platform feature but has not been integrated into an operational runbook.
**Size:** Small

**Description:**
Create a comprehensive rollback runbook at `docs/operations/rollback.md` and an automated rollback script at `packages/db/scripts/rollback.sh`. The runbook covers two scenarios:

**Scenario A — Schema‑only rollback (expand‑contract pattern):** If the migration is in the Expand phase (added a nullable column), the rollback is a new migration that drops the column. If in the Migrate phase (dual‑writing, backfilling), stop dual‑write and revert application code. If in the Contract phase (dropped old column), restore from the backup branch created before the contract deployment. This scenario assumes no data loss — only schema changes.

**Scenario B — Data loss rollback (Neon PITR):** If data was corrupted or lost: (1) Identify the timestamp just before the incident using Neon's Time Travel Assist. (2) Create a PITR branch at that timestamp via Neon Console or API (`neon branches create --parent main --timestamp "2026-05-06T14:30:00Z"`). (3) For partial data loss (e.g., wrong UPDATE), use `pg_dump` of the affected table from the PITR branch and restore to production. (4) For complete corruption, use Neon's Branch Restore to overwrite the production branch. (5) Neon automatically creates a backup branch before restore, enabling rollback of the restore itself.

The `rollback.sh` script automates scenario B for the most common case (partial data loss): it accepts a timestamp and a table name, creates a PITR branch, dumps the table from the branch, and provides the `pg_restore` command for manual execution. The script is **read‑only** — it never modifies the production database directly.

Additionally, update `docs/operations/disaster-recovery.md` (from P0‑DR‑1) with a cross‑reference to the rollback runbook.

**Research Findings (2026‑05‑06):**
- Neon PITR creates a branch in ~1 second regardless of database size via copy‑on‑write storage.
- The production branch remains online and untouched during PITR.
- Two recovery routes: copy missing table from PITR branch, or full branch overwrite.
- Neon automatically creates a backup branch before restore, enabling rollback of the restore.
- PITR retention: 30 days on Free plan, configurable on paid plans.
- LSN‑level granularity for precise point‑in‑time targeting.
- Neon Schema Diff can compare pre‑ and post‑restore states visually.

**Depends on:**
- `tasks/infrastructure/P0-MIG.md → P0-MIG-1` (migration pattern context)
- `tasks/infrastructure/P0-DB.md → P0-DB-1` (database connection setup for the script)

**Blocks:**
- `tasks/infrastructure/P0-DR.md → P0-DR-1` (disaster recovery runbook cross‑reference)

**Related Files:**
- `docs/operations/rollback.md` (new)
- `packages/db/scripts/rollback.sh` (new)
- `docs/operations/disaster-recovery.md` (to be updated with cross‑reference)

**Definition of Done**
- [ ] `docs/operations/rollback.md` covers both scenarios (schema‑only rollback via expand‑contract, data loss rollback via Neon PITR)
- [ ] Step‑by‑step instructions for each scenario with exact Neon Console and CLI commands
- [ ] `packages/db/scripts/rollback.sh` created: accepts `TIMESTAMP` and `TABLE_NAME` as arguments, creates PITR branch via Neon API, dumps table, outputs `pg_restore` command
- [ ] Script is read‑only (never modifies production); all destructive operations require manual confirmation
- [ ] Script includes `--help` flag with usage examples
- [ ] `docs/operations/disaster-recovery.md` updated with cross‑reference to rollback runbook
- [ ] `pnpm run typecheck` passes (script is bash — no TS change)

**Out of Scope**
- Full automation of the restore (the actual `pg_restore` to production is intentionally manual)
- Multi‑region rollback
- Rollback testing in CI (deferred to P0‑MIG‑5)

**Rules to Follow**
- The rollback script must NEVER auto‑execute destructive operations on production.
- All Neon API calls must use the project ID and API key from environment variables.
- The script must validate that required environment variables (`NEON_API_KEY`, `NEON_PROJECT_ID`) are set before proceeding.

**Verification**
```bash
# Test the script with --help
bash packages/db/scripts/rollback.sh --help
# Expected: usage instructions with examples

# Manual: test with a real Neon project (use a test branch, not production)
# Verify the script creates a PITR branch and outputs a pg_dump
ls docs/operations/rollback.md
grep "rollback" docs/operations/disaster-recovery.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (operational procedure)

---

#### Subtasks

- [ ] P0-MIG-3.0.25 (AGENT): Read the Neon PITR documentation, API reference, and branch restore guide. Understand the Neon CLI and API for branch creation.
  **Verification:** PITR and branch creation process documented.

- [ ] P0-MIG-3.0.5 (AGENT): Research production rollback patterns and community experiences with Neon PITR.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MIG-3.1 (AGENT): Write `docs/operations/rollback.md` with both scenarios, step‑by‑step instructions, decision tree, and troubleshooting.
  **File(s):** `/docs/operations/rollback.md`
  **Verification:** Document covers all required scenarios; commands are correct.

- [ ] P0-MIG-3.2 (AGENT): Create `packages/db/scripts/rollback.sh` with PITR branch creation, table dump, and safe output.
  **File(s):** `/packages/db/scripts/rollback.sh`
  **Verification:** Script runs with `--help` and validates environment variables.

- [ ] P0-MIG-3.3 (AGENT): Update `docs/operations/disaster-recovery.md` with cross‑reference to `rollback.md`.
  **File(s):** `/docs/operations/disaster-recovery.md`
  **Verification:** Cross‑reference present.

- [ ] P0-MIG-3.4 (HUMAN): Review rollback runbook, test the script against a development Neon branch, and approve.
  **Verification:** Approved.

---

### [ ] P0-MIG-4: Build backfill script template and guide for future schema additions

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No backfill script template or guide exists. When future schema changes require backfilling existing rows (e.g., adding a new column that must be populated from an old column or a join), developers must write backfill logic from scratch without a standard pattern. This increases the risk of long‑running transactions, table locks, or incomplete backfills.
**Size:** Small

**Description:**
Create two deliverables:

1. **`packages/db/scripts/backfill-template.ts`**: A TypeScript template script that demonstrates the safe backfill pattern using Drizzle and the migration database connection. The template must:
   - Connect via `getMigrationDb()` (non‑pooled URL).
   - Batch rows using cursor‑based pagination (`WHERE id > :lastId ORDER BY id LIMIT 5000`).
   - Commit each batch independently (no long‑running transactions).
   - Include configurable throttle (`await sleep(100)` between batches).
   - Log progress (total rows processed, elapsed time, estimated remaining).
   - Be idempotent (safe to re‑run if interrupted).
   - Accept CLI arguments for `--batch-size`, `--throttle-ms`, `--dry-run`.

2. **`docs/development/backfill.md`**: A guide that explains:
   - When to backfill (during the Migrate phase of expand‑contract).
   - The dangers of backfilling inside a migration transaction.
   - How to use the template script.
   - How to test a backfill against a Neon preview branch before running in production.
   - Monitoring and verification steps.
   - Common pitfalls (forgetting to update the `updatedAt` column, not handling NULL values, missing rows inserted during backfill).

**Research Findings (2026‑05‑06):**
- Backfills must be batched (5000–10000 rows), throttled, and run outside the DDL migration transaction.
- Cursor‑based pagination (`WHERE id > :lastId`) is preferred over `OFFSET` for consistent performance on large tables.
- Each batch should be an independent atomic UPDATE that commits immediately.
- Use `SKIP LOCKED` for concurrent safety if multiple backfill instances may run.
- Backfills should be idempotent: safe to re‑run if interrupted halfway.

**Depends on:**
- `tasks/infrastructure/P0-MIG.md → P0-MIG-1` (migration pattern context)
- `tasks/infrastructure/P0-DB.md → P0-DB-1` (database connection setup)

**Blocks:** [N/A]

**Related Files:**
- `packages/db/scripts/backfill-template.ts` (new)
- `docs/development/backfill.md` (new)
- `packages/db/src/index.ts` (reference `getMigrationDb()`)

**Definition of Done**
- [ ] `packages/db/scripts/backfill-template.ts` created with: cursor‑based batching, configurable batch size/throttle/dry‑run, progress logging, idempotency
- [ ] Template uses `getMigrationDb()` for the database connection
- [ ] Template includes an example backfill (e.g., populating a new `full_name` column from existing `first_name` + `last_name`)
- [ ] `docs/development/backfill.md` written with: when to backfill, dangers of in‑transaction backfills, how to use the template, testing guidance, common pitfalls
- [ ] Both files reference the expand‑contract migration pattern from P0‑MIG‑1
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Automatic backfill orchestration (Inngest‑based backfill jobs — deferred to Phase 2+)
- Production backfill execution (this is a template, not an automated system)

**Rules to Follow**
- The template must use `getMigrationDb()`, not `getDb()`, since backfills are DML operations that may need non‑pooled connections.
- Never wrap the entire backfill in a single transaction — each batch commits independently.
- The template must include a `--dry-run` flag that logs what would happen without modifying data.

**Verification**
```bash
# Test the template with --help
npx tsx packages/db/scripts/backfill-template.ts --help
# Test dry-run mode
npx tsx packages/db/scripts/backfill-template.ts --dry-run
ls docs/development/backfill.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (script template)

---

#### Subtasks

- [ ] P0-MIG-4.0.25 (AGENT): Read the current database connection setup in `packages/db/src/index.ts` and understand `getMigrationDb()`. Research backfill best practices.
  **Verification:** Database connection API and best practices documented.

- [ ] P0-MIG-4.0.5 (AGENT): Research cursor‑based pagination, idempotent batch updates, and common backfill pitfalls.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MIG-4.1 (AGENT): Create `packages/db/scripts/backfill-template.ts` with the safe backfill pattern.
  **File(s):** `/packages/db/scripts/backfill-template.ts`
  **Verification:** Template compiles, `--dry-run` works, example backfill is syntactically correct.

- [ ] P0-MIG-4.2 (AGENT): Write `docs/development/backfill.md` with guidance, pitfalls, and testing instructions.
  **File(s):** `/docs/development/backfill.md`
  **Verification:** Document covers all required topics.

- [ ] P0-MIG-4.3 (HUMAN): Review template and guide, verify example backfill, and approve.
  **Verification:** Approved.

---

### [ ] P0-MIG-5: Migration rehearsal — run migrations against a Neon branch scaled to production size before applying to prod

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Migrations are applied directly to the production database without rehearsal against a production‑scale copy. If a migration contains an inefficient query (e.g., a full table scan on a 50M‑row table) or a data‑type change that causes unexpected behavior at scale, it will only be discovered after production impact. Neon branching makes this rehearsal possible at near‑zero cost, but the workflow is not set up.
**Size:** Small

**Description:**
Create an optional but recommended GitHub Actions workflow at `.github/workflows/migration-rehearsal.yml` that can be triggered manually (`workflow_dispatch`) before a production deployment. The workflow:

1. Creates a Neon branch from the production database (includes all data and schema at production scale).
2. Scales the branch compute to match production size (if the production compute is larger than the default).
3. Runs all pending migrations against the branch.
4. Executes a light smoke test suite (`pnpm test -- integration`) against the branch to verify basic application functionality.
5. Logs migration duration for each migration file.
6. Deletes the branch after completion (or leaves it for manual inspection if `--keep-branch` flag is passed).
7. Reports results as a PR comment or workflow summary.

Document the rehearsal workflow in `docs/deployment/migration-rehearsal.md` with: how to trigger it, what it validates, how to interpret results, and troubleshooting.

**Research Findings (2026‑05‑06):**
- Neon branching creates a copy‑on‑write clone of the production database in seconds regardless of size.
- The rehearsal branch is fully isolated — operations on it do not affect production.
- Neon's `create‑branch‑action@v5` can be used to automate branch creation in CI.
- Community consensus: "When you build from a seed database you can often miss this kind of issue because it lacks the characteristics of your production environment".
- Migration rehearsal is specifically recommended in the 2026 zero‑downtime migration guides as a best practice.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-7` (Neon branching for CI)
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (programmatic migration)

**Blocks:** [N/A]

**Related Files:**
- `.github/workflows/migration-rehearsal.yml` (new)
- `docs/deployment/migration-rehearsal.md` (new)
- `packages/db/scripts/rollback.sh` (cross‑reference from P0‑MIG‑3)

**Definition of Done**
- [ ] `.github/workflows/migration-rehearsal.yml` created with `workflow_dispatch` trigger and optional `keep-branch` input
- [ ] Workflow creates a production‑scale Neon branch, runs migrations, executes smoke tests, reports results
- [ ] Migration execution time logged for each migration file (useful for detecting unexpectedly slow migrations)
- [ ] Workflow summary includes: branch name, migrations applied, duration per migration, smoke test results, link to Neon Console
- [ ] `docs/deployment/migration-rehearsal.md` written with: trigger instructions, what the workflow validates, result interpretation, troubleshooting
- [ ] At least one manual test: trigger the workflow, verify it completes successfully
- [ ] `pnpm run typecheck` passes (workflow only — no code change)

**Out of Scope**
- Automatic rehearsal on every PR (this is intentionally manual — production deployments should be deliberate)
- Full integration test suite against the rehearsal branch (smoke tests only; full suite would be too slow)
- Performance regression benchmarking against historical migration times (deferred to observability phase)

**Rules to Follow**
- The rehearsal branch must be deleted after the workflow completes (unless `--keep-branch` is specified).
- The workflow must not modify the production database in any way.
- All Neon API keys must be stored as GitHub secrets.

**Verification**
```bash
# Manual: trigger the workflow from GitHub Actions UI
# Verify: Neon branch created, migrations applied, smoke tests pass
# Verify: branch deleted after completion (or kept if --keep-branch specified)
ls .github/workflows/migration-rehearsal.yml
ls docs/deployment/migration-rehearsal.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (CI/CD workflow)

---

#### Subtasks

- [ ] P0-MIG-5.0.25 (AGENT): Read the Neon branching GitHub Actions documentation and understand the `create‑branch‑action` parameters.
  **Verification:** Neon action API understood.

- [ ] P0-MIG-5.0.5 (AGENT): Research community patterns for migration rehearsal and Neon‑based CI workflows.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MIG-5.1 (AGENT): Create `.github/workflows/migration-rehearsal.yml` with `workflow_dispatch` trigger, branch creation, migration execution, smoke tests, and cleanup.
  **File(s):** `.github/workflows/migration-rehearsal.yml`
  **Verification:** Workflow file valid; all steps properly ordered.

- [ ] P0-MIG-5.2 (AGENT): Add migration duration logging to the workflow (parse Drizzle migrate output or use `time` wrapper).
  **File(s):** `.github/workflows/migration-rehearsal.yml`
  **Verification:** Workflow summary shows per‑migration timing.

- [ ] P0-MIG-5.3 (AGENT): Write `docs/deployment/migration-rehearsal.md` with usage guide.
  **File(s):** `/docs/deployment/migration-rehearsal.md`
  **Verification:** Document covers all required topics.

- [ ] P0-MIG-5.4 (HUMAN): Trigger the workflow manually, verify it completes end‑to‑end, and approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑MIG group are covered.*

---