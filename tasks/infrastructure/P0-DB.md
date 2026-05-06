# tasks/infrastructure/P0-DB.md – Database, RLS & Seeding Setup

This file covers the dual Drizzle instance configuration (Neon HTTP for runtime, node-postgres for migrations), Hyperdrive binding, programmatic migration via `migrate()`, migration folder structure upgrade to v3, RLS policy hardening, auth/org schema validation, deterministic database seeding, Neon branching for CI/CD preview environments, and Drizzle v1 JIT mapper evaluation. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑DB (2026‑05‑06)

### Drizzle ORM v1 Status

Drizzle ORM is currently on the **v1.0.0‑beta track** (latest: beta.22, with RC tags available). The `latest` npm tag still points to the 0.x stable line. The v1 line introduces: JIT row mappers (opt‑in, ~3×–8× faster row mapping), a reworked casing API, Effect v4 support, MSSQL dialect, and consolidated validator packages (`drizzle‑zod` → `drizzle‑orm/zod`). The `drizzle‑kit up` command converts the old journal‑based migration structure to the v3 folder format (timestamped per‑migration folders). Beta.16 introduced a versioned `__drizzle_migrations` table and commutativity checks for team workflows. Until v1 ships as stable, **we pin to the 0.x `latest` line** and evaluate v1 migration via `P0‑DB‑9`。

### Critical: Dual Connection Pattern

This is the single most important architectural decision for the database layer. Neon provides two PostgreSQL connection endpoints: a **non‑pooled (standard)** URL for DDL operations (migrations, schema changes) and a **pooled** URL (via PgBouncer) for runtime queries.

| Connection Type | URL Pattern | Use Case | Driver / Drizzle Import |
|---|---|---|---|
| Standard (non‑pooled) | `ep‑xxx.region.aws.neon.tech` | `drizzle‑kit migrate`, `migrate()`, seed scripts | `pg` + `drizzle‑orm/node‑postgres` |
| Pooled (PgBouncer) | `ep‑xxx‑pooler.region.aws.neon.tech?pgbouncer=true` | Runtime queries in Workers / serverless | `@neondatabase/serverless` + `drizzle‑orm/neon‑http` |

**Why two drivers?** PgBouncer in transaction mode does not support `SET` commands, advisory locks, or multi‑statement transactions — all of which Drizzle's migration runner uses. Conversely, the standard TCP driver (`pg`) is incompatible with Cloudflare Workers (no TCP sockets). The `@neondatabase/serverless` driver uses HTTP/WebSocket transport, works in Workers and Edge Functions.

### `@neondatabase/serverless` v1.1.0

**Released 2026‑04‑09.** Key changes since v0.10.x: v1.0.0 made the HTTP query template function only callable as a template literal (prevents SQL injection from accidental string interpolation). `sql.query()` and `sql.unsafe()` handle manual parameterization and trusted strings. v1.1.0 inlined type declarations (reducing package size and dependency on `@types/pg`/`@types/node`).

### Hyperdrive

Cloudflare Hyperdrive accelerates database queries from Workers by connection pooling and caching. It requires a `hyperdrive` binding in `wrangler.jsonc` with `localConnectionString` for local development. The `nodejs_compat` compatibility flag must be set. For Neon, Hyperdrive connects to the **pooled** (PgBouncer) endpoint.

### `@usebetterdev/tenant` v0.5.4

Already in the codebase. Provides RLS‑based multi‑tenant isolation with a Drizzle adapter. The `drizzleDatabase()` wrapper and `betterTenant()` setup are configured in the existing `packages/db/src/index.ts`. The `tenant.getDatabase()` returns a tenant‑scoped database where all queries are automatically filtered by RLS.

### `drizzle-seed` v0.3.1

Official seeding library. Uses a seedable PRNG for deterministic, reproducible fake data. Supports `seed(db, schema, { count, seed })` and `reset(db, schema)` for clearing/resetting. Requires `drizzle‑orm@≥0.36.4`.

### Neon Branching for CI/CD

Neon's branching is its "killer feature" — create a database branch per PR for isolated preview environments. The `neondatabase/create‑branch‑action@v5` GitHub Action automates this. **Must add a cleanup workflow** to delete branches on PR close/merge — this is a commonly missed step.

### Migration Best Practices

- Never run migrations against the pooled URL.
- `drizzle‑kit generate` diffs the TypeScript schema against its local meta snapshot, not the live DB.
- Drizzle's `migrate()` function from `drizzle‑orm/node‑postgres/migrator` is preferred for programmatic migration (using a single `pg.Client` connection).
- Beta.16 migration table v1 uses `name` column (folder name) for matching, not timestamps.

---

## Task Definitions

### [ ] P0-DB-1: Configure dual Drizzle instances with Hyperdrive

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** `packages/db/src/index.ts` initializes a single Drizzle instance using `node‑postgres` with a `Pool` connected to `DATABASE_URL`. There is no HTTP‑based runtime driver for Cloudflare Workers compatibility, no Hyperdrive binding, and no dual‑connection pattern. The migration story currently relies on `drizzle‑kit migrate` CLI rather than a programmatic `migrate()` function.
**Size:** Large

**Description:**
Establish the dual‑Drizzle connection architecture:

**(a) Runtime connection:** Use `@neondatabase/serverless` with `drizzle‑orm/neon‑http`. Connect to the **pooled** Neon URL (`DATABASE_POOLED_URL`). Configure `neonConfig.fetchConnectionCache = true` for WebSocket pooling in Node.js environments. This instance is used by all application queries at runtime (tRPC procedures, API routes).

**(b) Migration connection:** Use `pg` (node‑postgres) with `drizzle‑orm/node‑postgres`. Connect to the **non‑pooled** Neon URL (`DATABASE_URL`). Use a single `pg.Client` (not Pool) for DDL operations per Drizzle's recommendation.

**(c) Hyperdrive binding:** Add a `hyperdrive` binding in `apps/web/wrangler.jsonc` (this may already exist from P0‑SHELL‑2). The binding should reference a Hyperdrive config that points to the pooled Neon URL. For local development, use `localConnectionString`. Document in `packages/db/src/index.ts` that when `env.HYPERDRIVE` is available, the connection string from the Hyperdrive binding should be used instead of the raw pooled URL.

**(d) Export both instances** with distinct names: `db` (runtime, neon‑http) and `migrationDb` (node‑postgres). The existing `getDb()`, `getScopedDb()`, `withTenantDatabase()`, and `withSystemDatabase()` functions should use the runtime `db` instance. Add `getMigrationDb()` for programmatic migration.

**Research Findings (2026‑05‑06):**
- `@neondatabase/serverless` v1.1.0 is latest (2026‑04‑09). v1.0.0+ only allows template‑literal SQL calls — test that `drizzle‑orm/neon‑http` is compatible.
- Hyperdrive requires `nodejs_compat` flag in `wrangler.jsonc`. Uses `localConnectionString` for local dev.
- PgBouncer transaction mode blocks DDL — must use separate non‑pooled URL for migrations.

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (root config)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc exists with bindings)

**Blocks:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1a`
- `tasks/infrastructure/P0-DB.md → P0-DB-2`

**Related Files:**
- `packages/db/package.json` (add `@neondatabase/serverless` dep)
- `packages/db/src/index.ts` (refactor — dual connection, `getMigrationDb()`)
- `apps/web/wrangler.jsonc` (add Hyperdrive binding if not present)
- `.env.example` (document `DATABASE_URL` and `DATABASE_POOLED_URL`)
- `pnpm-workspace.yaml` (ensure `@neondatabase/serverless` in catalog)

**Definition of Done**
- [ ] `@neondatabase/serverless` ^1.1.0 added to `packages/db/package.json` and `pnpm-workspace.yaml` catalog
- [ ] `packages/db/src/index.ts` exports two Drizzle instances: `db` (neon‑http, runtime) and `migrationDb` (node‑postgres, migrations)
- [ ] Runtime `db` connects via `neon(process.env.DATABASE_POOLED_URL)` with `drizzle‑orm/neon‑http`
- [ ] Migration `migrationDb` connects via `new pg.Client({ connectionString: process.env.DATABASE_URL })` with `drizzle‑orm/node‑postgres`
- [ ] `neonConfig.fetchConnectionCache = true` set for WebSocket pooling
- [ ] Hyperdrive binding exists in `wrangler.jsonc` with `localConnectionString` for dev
- [ ] `getDb()`, `getScopedDb()`, `withTenantDatabase()`, `withSystemDatabase()` all use `db` (runtime instance)
- [ ] `getMigrationDb()` added and exported
- [ ] `.env.example` documents both `DATABASE_URL` (non‑pooled) and `DATABASE_POOLED_URL` (pooled)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Programmatic migration script (P0‑DB‑1a)
- Migration to v3 folder structure (P0‑DB‑8)
- Drizzle v1 upgrade (P0‑DB‑9)

**Rules to Follow**
- Never use the pooled URL for migrations — PgBouncer does not support `SET` or advisory locks.
- Never use `node‑postgres` in Worker runtime code — it requires TCP sockets.
- The `db` singleton must be lazy‑initialized to allow builds without `DATABASE_POOLED_URL`.
- Hyperdrive binding name in `wrangler.jsonc` must match the name used in code.

**Verification**
```bash
# Check both connection strings are documented
grep DATABASE_URL .env.example
grep DATABASE_POOLED_URL .env.example

# Verify the runtime db uses neon-http
grep "drizzle-orm/neon-http" packages/db/src/index.ts

# Verify migration db uses node-postgres
grep "drizzle-orm/node-postgres" packages/db/src/index.ts

# Check wrangler.jsonc for hyperdrive binding
cat apps/web/wrangler.jsonc | grep -i hyperdrive

# Typecheck
pnpm run typecheck

# Smoke test: runtime db connection
node -e "
  const { getDb } = require('./packages/db/src/index.ts');
  getDb().select().from(schema.usersTable).limit(1);
"
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The dual‑connection pattern hides the complexity of two separate database drivers behind simple exported functions (`getDb()` for queries, `getMigrationDb()` for DDL), allowing callers to use the right connection without knowing about PgBouncer limitations or serverless constraints.

---

#### Subtasks

- [ ] P0-DB-1.0.25 (AGENT): Read current `packages/db/src/index.ts`, `packages/db/package.json`, `pnpm-workspace.yaml`, and `apps/web/wrangler.jsonc` to understand existing DB setup.
  **Verification:** Current connection architecture documented in task notes.

- [ ] P0-DB-1.0.5 (AGENT): Research `@neondatabase/serverless` v1.1.0 API, `drizzle‑orm/neon‑http` usage, Hyperdrive binding configuration, and the dual‑connection pattern.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DB-1.1 (AGENT): Add `@neondatabase/serverless` to `pnpm-workspace.yaml` catalog and `packages/db/package.json` dependencies.
  **File(s):** `/pnpm-workspace.yaml`, `/packages/db/package.json`
  **Verification:** `pnpm install` succeeds; `pnpm ls @neondatabase/serverless` shows version.

- [ ] P0-DB-1.2 (AGENT): Create a runtime `db` instance using `neon()` + `drizzle‑orm/neon‑http`, connecting to `DATABASE_POOLED_URL`.
  **File(s):** `/packages/db/src/index.ts`
  **Verification:** `grep "drizzle-orm/neon-http" packages/db/src/index.ts` returns match.

- [ ] P0-DB-1.3 (AGENT): Create a migration `migrationDb` instance using `pg.Client` + `drizzle‑orm/node‑postgres`, connecting to `DATABASE_URL`.
  **File(s):** `/packages/db/src/index.ts`
  **Verification:** `grep "drizzle-orm/node-postgres" packages/db/src/index.ts` returns match; migration instance uses `pg.Client`, not `pg.Pool`.

- [ ] P0-DB-1.4 (AGENT): Refactor existing `getDb()`, `getScopedDb()`, `withTenantDatabase()`, `withSystemDatabase()` to use the runtime `db` instance. Add `getMigrationDb()`.
  **File(s):** `/packages/db/src/index.ts`
  **Verification:** All existing function signatures preserved; `getMigrationDb()` returns `migrationDb`.

- [ ] P0-DB-1.5 (AGENT): Add Hyperdrive binding to `wrangler.jsonc` with `localConnectionString` pointing to the pooled URL for local dev.
  **File(s):** `/apps/web/wrangler.jsonc`
  **Verification:** `cat apps/web/wrangler.jsonc | python3 -c "import sys,json; json.load(sys.stdin)"` parses successfully.

- [ ] P0-DB-1.6 (AGENT): Update `.env.example` to document both `DATABASE_URL` (non‑pooled, for migrations) and `DATABASE_POOLED_URL` (pooled, for runtime).
  **File(s):** `/.env.example`
  **Verification:** Both variables documented with usage notes.

- [ ] P0-DB-1.7 (AGENT): Lazy‑initialize both `db` and `migrationDb` to allow builds without database URLs.
  **File(s):** `/packages/db/src/index.ts`
  **Verification:** Build succeeds without `DATABASE_URL` set.

- [ ] P0-DB-1.8 (HUMAN): Review dual‑connection architecture, test runtime connection, and approve.
  **Verification:** Approved.

---

### [ ] P0-DB-1a: Create programmatic migration script using Drizzle's `migrate()` API

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** Migrations are currently run via the `drizzle‑kit migrate` CLI. There is no programmatic `migrate()` script that can be called from CI/CD pipelines or programmatic deploy scripts with proper error handling, logging, and rollback support.
**Size:** Small

**Description:**
Create `packages/db/src/migrate.ts` that wraps Drizzle's programmatic `migrate()` function (from `drizzle‑orm/node‑postgres/migrator`). The script must: use the migration `migrationDb` instance (non‑pooled URL); read migration files from `packages/db/drizzle/`; include try/catch with explicit error logging; exit with non‑zero code on failure. Add a `db:migrate` script to `packages/db/package.json` and a root‑level convenience script.

**Research Findings (2026‑05‑06):**
- Drizzle's `migrate()` from `drizzle‑orm/node‑postgres/migrator` is the recommended programmatic approach. It takes a `drizzle` instance and a migrations folder path.
- Must use single `pg.Client` connection (not Pool) for DDL migrations.
- Migrations table in v0 format has columns: `id`, `hash`, `created_at` (bigint). In v1 format: `id`, `hash`, `created_at`, `name`, `applied_at`. The script must handle both depending on migration folder format.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1`

**Blocks:**
- `tasks/infrastructure/P0-DB.md → P0-DB-8` (migration folder upgrade)
- `tasks/infrastructure/P0-DB.md → P0-DB-7` (CI/CD preview with migrations)

**Related Files:**
- `packages/db/src/migrate.ts` (new)
- `packages/db/package.json` (add `db:migrate` script)
- `package.json` (root `db:migrate` convenience script)

**Definition of Done**
- [ ] `packages/db/src/migrate.ts` created with `migrate(migrationDb, { migrationsFolder: ... })` call
- [ ] Script catches errors, logs them with `console.error`, and exits with `process.exit(1)`
- [ ] Script uses `getMigrationDb()` from `index.ts` (guarantees non‑pooled connection)
- [ ] `db:migrate` script added to `packages/db/package.json`
- [ ] Root `package.json` has `db:migrate` convenience script using `pnpm --filter @ubos/db run db:migrate`
- [ ] Manual test: run `pnpm db:migrate` against a dev database, verify it applies pending migrations
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Rollback support (P0‑MIG‑3)
- Migration rehearsal (P0‑MIG‑5)
- `drizzle‑kit generate` integration (separate script; `migrate.ts` only applies existing migrations)

**Rules to Follow**
- Must use `getMigrationDb()` (non‑pooled URL). Never `getDb()` for migrations.
- Do not import the runtime `db` instance in this file.
- `migrationsFolder` path must be relative to the monorepo root, resolvable via `path.resolve()`.

**Verification**
```bash
# Ensure DATABASE_URL points to non-pooled Neon endpoint
export DATABASE_URL="postgresql://..."
pnpm db:migrate
# Verify: no errors, migrations applied
# Verify: failing migration exits with non-zero
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure script)

---

#### Subtasks

- [ ] P0-DB-1a.0.25 (AGENT): Read Drizzle's `migrate()` documentation and the `drizzle‑orm/node‑postgres/migrator` API. Verify migration folder path.
  **Verification:** API understood; folder path confirmed.

- [ ] P0-DB-1a.0.5 (AGENT): Research common pitfalls with `migrate()` (pooled URL, missing schema, concurrent migrations).
  **Verification:** Findings documented.

- [ ] P0-DB-1a.1 (AGENT): Create `packages/db/src/migrate.ts` with `migrate()` call, try/catch error handling, and explicit exit codes.
  **File(s):** `/packages/db/src/migrate.ts`
  **Verification:** Script runs and applies migrations successfully.

- [ ] P0-DB-1a.2 (AGENT): Add `db:migrate` scripts to both `packages/db/package.json` and root `package.json`.
  **File(s):** `/packages/db/package.json`, `/package.json`
  **Verification:** `pnpm db:migrate` from root executes migration.

- [ ] P0-DB-1a.3 (HUMAN): Test migration against a real Neon dev database. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-1b: Ensure migration connection uses non‑pooled Neon URL

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The current setup uses a single `DATABASE_URL` environment variable. There is no distinction between pooled and non‑pooled URLs, so migrations may accidentally run against the pooled endpoint, causing silent failures.
**Size:** Small

**Description:**
Enforce that the migration connection (`getMigrationDb()`) always uses the non‑pooled `DATABASE_URL` (without `-pooler` in the hostname). Add runtime validation in `getMigrationDb()` that rejects pooled URLs. Document in `.env.example` the exact hostname pattern: `DATABASE_URL` must end with `.aws.neon.tech` (not `-pooler.aws.neon.tech`). Create a helper `isNonPooledUrl()` that throws a descriptive error if the URL appears to be a pooled endpoint.

**Research Findings (2026‑05‑06):**
- Pooled URLs contain `-pooler` in the hostname and typically end in `?pgbouncer=true`.
- Running `drizzle‑kit migrate` against pooled URL causes cryptic errors (SET, advisory locks fail silently).
- Neon free tier does not auto‑separate URLs; users must manually use the correct endpoint for each use case.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1`

**Blocks:** [N/A]

**Related Files:**
- `packages/db/src/index.ts` (add URL validation)
- `.env.example` (document URL patterns)

**Definition of Done**
- [ ] `isNonPooledUrl()` helper validates that the migration URL does not contain `-pooler` or `pgbouncer=true`
- [ ] `getMigrationDb()` calls `isNonPooledUrl()` and throws on invalid URL
- [ ] Error message clearly states: "DATABASE_URL appears to be a pooled Neon endpoint. Use the non‑pooled URL (without '-pooler') for migrations."
- [ ] `.env.example` documents both URL patterns with explicit hostname examples
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Automatic URL detection and switching (manual configuration is intentional for safety)
- Multi‑region URL validation

**Rules to Follow**
- Validation must happen at connection time (when `getMigrationDb()` is first called), not at module load time (to avoid breaking builds).
- Error message must include the exact difference between pooled and non‑pooled URLs.

**Verification**
```bash
# Test: set DATABASE_URL to a pooled endpoint, call getMigrationDb()
# Expected: descriptive error thrown
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (validation logic)

---

#### Subtasks

- [ ] P0-DB-1b.0.25 (AGENT): Read current URL handling in `packages/db/src/index.ts` and existing `.env.example`.
  **Verification:** Current URL pattern documented.

- [ ] P0-DB-1b.0.5 (AGENT): Research Neon pooled vs non‑pooled URL patterns and common pitfalls.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DB-1b.1 (AGENT): Create `isNonPooledUrl()` helper that checks for `-pooler` and `pgbouncer=true` in the connection string.
  **File(s):** `/packages/db/src/index.ts`
  **Verification:** Helper correctly identifies pooled URLs.

- [ ] P0-DB-1b.2 (AGENT): Integrate `isNonPooledUrl()` into `getMigrationDb()` with descriptive error.
  **File(s):** `/packages/db/src/index.ts`
  **Verification:** Calling `getMigrationDb()` with pooled URL throws.

- [ ] P0-DB-1b.3 (AGENT): Update `.env.example` with explicit URL pattern documentation.
  **File(s):** `/.env.example`
  **Verification:** Both URL patterns described with hostname examples.

- [ ] P0-DB-1b.4 (HUMAN): Test with both pooled and non‑pooled URLs. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-2: Validate migration configuration and lineage

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** `packages/db/drizzle.config.ts` exists with PostgreSQL dialect, schema paths (`./src/schema/index.ts`), output directory (`./drizzle`), and `DATABASE_URL` from environment. Migrations have been applied manually. The migration journal (`_journal.json`) and snapshot (`0000_snapshot.json`) exist. However, the configuration has not been audited against the current Drizzle Kit version, the dual‑connection pattern, and the distinction between `DATABASE_URL` (migrations) and `DATABASE_POOLED_URL` (runtime).
**Size:** Small

**Description:**
Audit and update `packages/db/drizzle.config.ts` to ensure: (1) it references `DATABASE_URL` (non‑pooled, for migration commands), not `DATABASE_POOLED_URL`; (2) the schema barrel export (`./src/schema/index.ts`) correctly re‑exports all auth, CRM, and org tables; (3) the `out` directory matches the folder read by `migrate.ts`; (4) `verbose: true` and `strict: true` remain enabled; (5) dialect is correctly set for the installed `drizzle‑orm` version. Verify migration lineage by comparing the on‑disk schema SQL files against the live database's `__drizzle_migrations` table.

**Research Findings (2026‑05‑06):**
- `drizzle.config.ts` uses `DATABASE_URL` for migrations; this must be the non‑pooled URL.
- Migration lineage: the `_journal.json` tracks all generated migrations by `idx` and `when`. The `__drizzle_migrations` table (or `drizzle.__drizzle_migrations`) tracks applied migrations in the database.
- Schema barrel export must include all table definitions for `drizzle‑kit generate` to detect changes.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1`

**Blocks:**
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS hardening)
- `tasks/infrastructure/P0-DB.md → P0-DB-4` (auth table validation)
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (org table validation)

**Related Files:**
- `packages/db/drizzle.config.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/drizzle/0000_easy_dazzler.sql`

**Definition of Done**
- [ ] `drizzle.config.ts` `dbCredentials.url` confirms `DATABASE_URL` (non‑pooled)
- [ ] `schema` path points to `./src/schema/index.ts` and barrel export is complete
- [ ] `out` path is `./drizzle` (matches migration folder)
- [ ] `dialect: "postgresql"`, `verbose: true`, `strict: true` confirmed
- [ ] Migration lineage verified: `drizzle‑kit check` shows no unapplied or missing migrations
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- `drizzle‑kit up` migration (P0‑DB‑8)
- Drizzle v1 upgrade (P0‑DB‑9)

**Rules to Follow**
- Never point `drizzle.config.ts` at the pooled URL.
- Do not manually edit `_journal.json` — always use `drizzle‑kit generate`.

**Verification**
```bash
cat packages/db/drizzle.config.ts | grep -E "url|schema|out|dialect"
# Manual: run drizzle-kit check
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit check
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (configuration audit)

---

#### Subtasks

- [ ] P0-DB-2.0.25 (AGENT): Read current `drizzle.config.ts`, `schema/index.ts`, `_journal.json`, and compare against Drizzle Kit docs.
  **Verification:** Current configuration documented.

- [ ] P0-DB-2.0.5 (AGENT): Research `drizzle‑kit check` command and migration lineage verification.
  **Verification:** Command behavior understood.

- [ ] P0-DB-2.1 (AGENT): Audit and update `drizzle.config.ts` for correctness.
  **File(s):** `/packages/db/drizzle.config.ts`
  **Verification:** All fields verified; `DATABASE_URL` non‑pooled confirmed.

- [ ] P0-DB-2.2 (AGENT): Verify schema barrel export in `schema/index.ts` includes all tables.
  **File(s):** `/packages/db/src/schema/index.ts`
  **Verification:** All `auth.ts`, `crm.ts`, `organizations.ts` tables re‑exported.

- [ ] P0-DB-2.3 (AGENT): Run `drizzle‑kit check` and verify migration lineage.
  **Verification:** No unapplied or missing migrations.

- [ ] P0-DB-2.4 (HUMAN): Review configuration and lineage. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-3: Consolidate and enhance existing RLS helpers

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** `packages/db/src/schema/policies.ts` exists with RLS helper functions: `bypassRlsCondition`, `tenantScopeCondition`, `tenantOrSystemCondition`, `tenantTablePolicies`, `organizationTablePolicies`. These use `current_setting('app.current_tenant')` and `app.bypass_rls`. They are referenced in `crm.ts` and `organizations.ts`. However, they may not fully align with `@usebetterdev/tenant` v0.5.4 conventions, and not all future domain tables (projects, documents, finance) have policy definitions yet.
**Size:** Medium

**Description:**
Audit the existing RLS policy helpers against `@usebetterdev/tenant` v0.5.4 best practices. Ensure the `tenantTablePolicies` function generates correct `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies that match the library's `SET LOCAL app.current_tenant_id` pattern. Verify that all existing tables in `crm.ts`, `auth.ts`, and `organizations.ts` have RLS enabled and policies applied. Create a helper `tenantAwareTable()` that automatically applies RLS and tenant policies to any new table, reducing boilerplate for future domain schemas (projects, documents, finance, assets). Document RLS usage patterns in a new `docs/architecture/rls-patterns.md`.

**Research Findings (2026‑05‑06):**
- `@usebetterdev/tenant` uses `SET LOCAL app.current_tenant_id = $1` to scope queries. RLS policies use `current_setting('app.current_tenant_id')` to match rows.
- Drizzle supports RLS via `pgPolicy()` and `crudPolicy()` helpers for common patterns.
- Neon supports full PostgreSQL RLS and recommends enabling it for multi‑tenant apps.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-2`

**Blocks:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (org validation)
- All Phase 1 domain schema tasks (P1‑CRM‑SCHEMA‑1, P1‑PROJ‑SCHEMA‑1, etc.)

**Related Files:**
- `packages/db/src/schema/policies.ts` (refactor)
- `packages/db/src/schema/crm.ts` (verify RLS applied)
- `packages/db/src/schema/organizations.ts` (verify RLS applied)
- `docs/architecture/rls‑patterns.md` (new)

**Definition of Done**
- [ ] `policies.ts` `tenantScopeCondition` correctly references `current_setting('app.current_tenant_id')` (matching `@usebetterdev/tenant` convention)
- [ ] All tables in `crm.ts` have `enableRLS()` and `tenantTablePolicies()` applied
- [ ] All tables in `organizations.ts` have RLS and correct policies
- [ ] `tenantAwareTable()` helper created in `policies.ts` — wraps `pgTable` with automatic RLS enablement and policies
- [ ] `docs/architecture/rls‑patterns.md` documents: tenant‑scope pattern, bypass RLS for admin, adding RLS to new tables, common pitfalls
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Applying RLS to auth tables (Better Auth manages its own access control)
- RLS for Phase 2+ tables (portal, scheduling, HR)

**Rules to Follow**
- All tenant‑scoped tables must have RLS enabled and policies applied.
- The `app.current_tenant_id` setting name must match the `@usebetterdev/tenant` middleware convention exactly.
- Never disable RLS on a table that holds tenant‑specific data.

**Verification**
```bash
# Check all CRM tables have RLS
grep -E "enableRLS|tenantPolicy" packages/db/src/schema/crm.ts
# Verify tenantAwareTable helper exists
grep "tenantAwareTable" packages/db/src/schema/policies.ts
# Check docs exist
ls docs/architecture/rls-patterns.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: `tenantAwareTable()` encapsulates RLS enablement and policy creation into a single call, hiding the complexity of `CREATE POLICY` statements and ensuring no new table accidentally lacks tenant isolation.

---

#### Subtasks

- [ ] P0-DB-3.0.25 (AGENT): Read current `policies.ts`, `crm.ts`, `organizations.ts` and compare with `@usebetterdev/tenant` v0.5.4 API.
  **Verification:** Current RLS setup and gaps documented.

- [ ] P0-DB-3.0.5 (AGENT): Research Drizzle `pgPolicy()` / `crudPolicy()` helpers and Neon RLS best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DB-3.1 (AGENT): Verify `tenantScopeCondition` uses `current_setting('app.current_tenant_id')` matching the `@usebetterdev/tenant` convention.
  **File(s):** `/packages/db/src/schema/policies.ts`
  **Verification:** Setting name matches the library middleware.

- [ ] P0-DB-3.2 (AGENT): Ensure all CRM tables (`crmCompaniesTable`, `crmContactsTable`, `crmDealsTable`, `crmLeadsTable`) have `enableRLS()` and `tenantTablePolicies()`.
  **File(s):** `/packages/db/src/schema/crm.ts`
  **Verification:** All four tables verified.

- [ ] P0-DB-3.3 (AGENT): Create `tenantAwareTable()` helper that wraps table creation with automatic RLS.
  **File(s):** `/packages/db/src/schema/policies.ts`
  **Verification:** Helper function usable by future domain schemas.

- [ ] P0-DB-3.4 (AGENT): Write `docs/architecture/rls‑patterns.md` with patterns, examples, and common pitfalls.
  **File(s):** `/docs/architecture/rls‑patterns.md`
  **Verification:** Document covers all required topics.

- [ ] P0-DB-3.5 (HUMAN): Review RLS setup and approve patterns for Phase 1 adoption.
  **Verification:** Approved.

---

### [ ] P0-DB-4: Validate completeness of auth tables; add missing indexes if needed

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** `packages/db/src/schema/auth.ts` defines Better Auth tables: `usersTable`, `sessionsTable`, `accountsTable`, `verificationsTable`, `membersTable`, `invitationsTable`, `rolesTable`, `userRolesTable`. Each has proper foreign keys, unique constraints, and indexes. The initial migration (`0000_easy_dazzler.sql`) created all these tables. However, the schema has not been audited against Better Auth's latest expected table structure or compared against the current Drizzle adapter requirements.
**Size:** Small

**Description:**
Audit `auth.ts` against the latest Better Auth Drizzle adapter schema expectations. Verify: all required columns are present with correct types; unique constraints match Better Auth's expectations (email, provider+account, organization+user, membership uniqueness); indexes cover common query patterns (lookup by email, session token, organization). Check for any Better Auth plugin columns that are missing (e.g., `twoFactor` plugin needs `twoFactors` table, `passkey` plugin needs `passkeys` table). Add any missing indexes, particularly for `sessionsTable.token` (already present), `usersTable.email` (already present), `membersTable.organizationId` + `membersTable.userId` (verify composite index exists). If no changes are needed, document that the schema is complete.

**Research Findings (2026‑05‑06):**
- Better Auth's Drizzle adapter expects tables: `user`, `session`, `account`, `verification`. Organization plugin adds: `member`, `invitation`, `role`, `userRole` (or `user_role`).
- Better Auth `experimental.joins: true` can improve performance by using SQL JOINs for related data but requires relations in Drizzle schema.
- Common missing indexes: composite index on `membersTable(organizationId, userId)` for fast membership lookups.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-2`

**Blocks:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`

**Related Files:**
- `packages/db/src/schema/auth.ts`

**Definition of Done**
- [ ] All Better Auth core tables (`user`, `session`, `account`, `verification`) verified complete
- [ ] All organization plugin tables (`member`, `invitation`, `role`, `userRole`) verified complete
- [ ] All unique constraints match Better Auth expectations
- [ ] Composite index on `membersTable(organizationId, userId)` present
- [ ] Missing indexes added (if any found)
- [ ] Documentation comment added at top of `auth.ts` listing which Better Auth features are supported by the current schema
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Adding tables for Better Auth plugins not currently used (twoFactor, passkey — deferred to P0‑AUTH‑6 and P1‑AUTH‑2)
- Better Auth `experimental.joins: true` enablement (evaluate separately)

**Rules to Follow**
- Do not rename existing columns — they are referenced by the migration and Better Auth configuration.
- Adding a new composite index requires a new migration.

**Verification**
```bash
# List all tables defined in auth.ts
grep -E "pgTable|Table\(" packages/db/src/schema/auth.ts
# Verify indexes
grep -E "index|uniqueIndex" packages/db/src/schema/auth.ts
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (schema audit)

---

#### Subtasks

- [ ] P0-DB-4.0.25 (AGENT): Read `auth.ts` and compare against Better Auth's latest Drizzle adapter documentation.
  **Verification:** Current schema and gaps documented.

- [ ] P0-DB-4.0.5 (AGENT): Research Better Auth plugin table requirements (twoFactor, passkey, organization).
  **Verification:** Plugin table requirements documented.

- [ ] P0-DB-4.1 (AGENT): Audit all columns, unique constraints, and indexes against Better Auth expectations. Add any missing indexes.
  **File(s):** `/packages/db/src/schema/auth.ts`
  **Verification:** All constraints verified; no missing indexes.

- [ ] P0-DB-4.2 (AGENT): Add documentation comment listing supported Better Auth features.
  **File(s):** `/packages/db/src/schema/auth.ts`
  **Verification:** Comment present and accurate.

- [ ] P0-DB-4.3 (HUMAN): Review auth schema completeness. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-5: Verify and enhance organizations table

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** `packages/db/src/schema/organizations.ts` defines `organizationsTable` with `id`, `name`, `slug` (unique), `createdAt`, `updatedAt`, and `organizationIdColumn` with `current_setting('app.current_tenant')` default. RLS is enabled and `organizationTablePolicies` applied. The table is used by `@usebetterdev/tenant` for tenant lookup. However, the table may need additional columns (logo, custom domain, settings JSONB) and the slug constraint may need to handle soft‑delete scenarios.
**Size:** Small

**Description:**
Verify `organizationsTable` against `@usebetterdev/tenant` v0.5.4 requirements. The library expects at minimum: `id` (UUID primary key), `name`, `slug` (unique), `createdAt`. Add optional columns for future use: `logo` (text, URL to R2 object) and `settings` (jsonb, for org‑level feature flags and preferences). Ensure the unique slug constraint handles soft‑delete correctly (if organizations can be soft‑deleted, the slug+deletedAt composite unique may be needed). Verify that `organizationIdColumn` integration is correct for all tables that reference it.

**Research Findings (2026‑05‑06):**
- `@usebetterdev/tenant` expects `id`, `name`, `slug`, `createdAt` as minimum.
- JSONB `settings` column is a common pattern for extensible org‑level configuration.
- Soft‑delete with unique slug requires a partial unique index: `CREATE UNIQUE INDEX ... ON organizations (slug) WHERE deleted_at IS NULL`.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS helpers)

**Blocks:**
- `tasks/infrastructure/P0-DB.md → P0-DB-6` (seeding)
- `tasks/infrastructure/P1-ONBOARD.md → P1-ONBOARD-3` (org settings UI)

**Related Files:**
- `packages/db/src/schema/organizations.ts`
- `packages/db/src/schema/policies.ts` (if `organizationTablePolicies` needs update)

**Definition of Done**
- [ ] `organizationsTable` verified against `@usebetterdev/tenant` minimum requirements
- [ ] Optional columns added: `logo` (text), `settings` (jsonb)
- [ ] Soft‑delete consideration documented (partial unique index described if needed)
- [ ] All tables with `organizationIdColumn` verified to reference `organizationsTable.id`
- [ ] If columns added, new migration generated
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Soft‑delete implementation (not needed until GDPR/compliance features)
- Multi‑region org routing

**Rules to Follow**
- Adding new columns requires a new migration (run `drizzle‑kit generate` + `migrate`).
- `organizationIdColumn` must remain consistent across all referencing tables.

**Verification**
```bash
# Check org table columns
grep -A 15 "organizationsTable" packages/db/src/schema/organizations.ts
# Verify references
grep "organizationIdColumn" packages/db/src/schema/*.ts
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (schema enhancement)

---

#### Subtasks

- [ ] P0-DB-5.0.25 (AGENT): Read `organizations.ts` and compare with `@usebetterdev/tenant` v0.5.4 API.
  **Verification:** Current schema and requirements documented.

- [ ] P0-DB-5.0.5 (AGENT): Research org table patterns (JSONB settings, logo storage, soft‑delete with unique slug).
  **Verification:** Research documented.

- [ ] P0-DB-5.1 (AGENT): Add `logo` (text) and `settings` (jsonb) columns to `organizationsTable`.
  **File(s):** `/packages/db/src/schema/organizations.ts`
  **Verification:** Columns added with correct types.

- [ ] P0-DB-5.2 (AGENT): Generate and apply migration for new columns.
  **File(s):** `/packages/db/drizzle/` (new migration)
  **Verification:** `pnpm db:migrate` applies migration successfully.

- [ ] P0-DB-5.3 (AGENT): Document soft‑delete slug approach in comments or ADR.
  **File(s):** `/packages/db/src/schema/organizations.ts`
  **Verification:** Comment describes partial unique index pattern.

- [ ] P0-DB-5.4 (HUMAN): Review enhanced org schema. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-6: Build deterministic database seeding engine

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No database seeding script exists. The only test data available is the `apps/web/src/data/mockData.ts` in‑memory mock data used by the frontend. There is no way to populate a development or staging database with realistic, reproducible data across all domains.
**Size:** Medium

**Description:**
Build a deterministic seeding engine using `drizzle‑seed` (v0.3.1+). Create `packages/db/src/seed.ts` that:

1. Uses `drizzle‑seed`'s `seed()` function with a fixed seed number for reproducibility.
2. Generates data for all existing tenant‑scoped tables: organizations (at least 3 tenants), users (via Better Auth API, not direct insertion), CRM leads (per tenant), CRM contacts (per tenant), CRM companies (per tenant).
3. Uses the `reset()` function from `drizzle‑seed` to optionally clear data before seeding.
4. Connects via the migration database instance (`getMigrationDb()`, non‑pooled URL) since seeding is a DDL/data operation, not runtime.
5. Accepts a `--tenant-count` CLI argument to control how many tenants to create.
6. Add a `db:seed` script to `packages/db/package.json` and a root `db:seed` convenience script.

**Research Findings (2026‑05‑06):**
- `drizzle‑seed` v0.3.1 supports deterministic generation via `seed` option and bulk creation via `count` option.
- `reset()` clears all tables defined in the schema.
- Seeding should use the non‑pooled URL since it performs DML operations in a single transaction.
- For Better Auth users, seeding through the auth API (or `authClient.signUp()`) is safer than direct table insertion to ensure password hashing and session setup.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (org schema complete)
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (migrate script pattern)

**Blocks:**
- `tasks/infrastructure/P0-SEC.md → P0-SEC-4` (tenant isolation tests need seed data)
- All Phase 1 domain UI tasks (developers need seeded data)

**Related Files:**
- `packages/db/src/seed.ts` (new)
- `packages/db/package.json` (add `db:seed` script)
- `package.json` (root `db:seed` convenience script)

**Definition of Done**
- [ ] `drizzle‑seed` installed as devDependency in `packages/db`
- [ ] `packages/db/src/seed.ts` creates 3+ tenants, CRM records per tenant using deterministic seed
- [ ] `pnpm db:seed` populates the development database with reproducible data
- [ ] `pnpm db:seed` with `--reset` flag clears and re‑seeds
- [ ] Seeding uses `getMigrationDb()` (non‑pooled connection)
- [ ] Seeding is idempotent — running twice does not duplicate data (or `--reset` flag communicates the behavior)
- [ ] Documentation comment at top of `seed.ts` explains seed number, expected data volumes, and usage
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Seeding data for domains not yet implemented (projects, documents, finance) — will be added in Phase 1
- Production data seeding (this is dev/staging only)
- `drizzle‑seed` v3 folder support (if migration to v3 not yet complete)

**Rules to Follow**
- Use a fixed seed number (e.g., `42`) for deterministic output.
- Never seed the production database.
- Use `getMigrationDb()`, not `getDb()`, for seeding operations.

**Verification**
```bash
# Seed the dev database
DATABASE_URL="postgresql://..." pnpm db:seed
# Verify data exists
# Query via drizzle-kit studio or psql
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (seed script)

---

#### Subtasks

- [ ] P0-DB-6.0.25 (AGENT): Read `drizzle‑seed` documentation and current schema to understand seeding requirements.
  **Verification:** Seed API understood; schema tables listed.

- [ ] P0-DB-6.0.5 (AGENT): Research `drizzle‑seed` best practices (seed numbers, reset, idempotency).
  **Verification:** Research documented.

- [ ] P0-DB-6.1 (AGENT): Install `drizzle‑seed` as devDependency in `packages/db`.
  **File(s):** `/packages/db/package.json`
  **Verification:** `pnpm ls drizzle-seed` shows installed.

- [ ] P0-DB-6.2 (AGENT): Create `packages/db/src/seed.ts` with organization, CRM lead, contact, and company seeding.
  **File(s):** `/packages/db/src/seed.ts`
  **Verification:** Script runs and populates tables.

- [ ] P0-DB-6.3 (AGENT): Add `db:seed` scripts to `packages/db/package.json` and root `package.json`.
  **File(s):** `/packages/db/package.json`, `/package.json`
  **Verification:** `pnpm db:seed` executes successfully from root.

- [ ] P0-DB-6.4 (AGENT): Test idempotency and `--reset` behavior.
  **Verification:** Running twice without `--reset` produces expected behavior (documented).

- [ ] P0-DB-6.5 (HUMAN): Run seed script, verify data in database, and approve.
  **Verification:** Approved.

---

### [ ] P0-DB-7: Set up Neon branching for CI/CD preview environments

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No preview environment database automation exists. Every developer shares the same development database, and there is no per‑PR isolated database for testing migrations or schema changes. The CI workflow does not create or clean up Neon branches.
**Size:** Medium

**Description:**
Create a GitHub Actions workflow that creates a Neon database branch for every PR and deletes it on PR close/merge. Use `neondatabase/create‑branch‑action@v5` to create the branch and `neondatabase/delete‑branch‑action@v5` to clean up. The preview branch must run migrations (`pnpm db:migrate`) against its own isolated database. The deployment workflow must use the preview branch's connection string (non‑pooled for migrations). Create two workflow files: `.github/workflows/preview.yml` (creates branch on PR open, runs migrations) and `.github/workflows/preview‑cleanup.yml` (deletes branch on PR close/merge). Document the workflow in `docs/deployment/neon‑branching.md`.

**Research Findings (2026‑05‑06):**
- `neondatabase/create‑branch‑action@v5` creates isolated branches per PR. Requires `project_id`, `branch_name`, `api_key`.
- **Common pitfall:** Many teams forget to add cleanup (branch deletion on PR close), leading to orphaned branches.
- Neon's free tier includes branching; branches count toward project limits.
- The preview branch connection string uses a different hostname pattern: `ep‑xxx‑branch‑name.region.aws.neon.tech`.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (migration script)

**Blocks:** [N/A]

**Related Files:**
- `.github/workflows/preview.yml` (new)
- `.github/workflows/preview‑cleanup.yml` (new)
- `docs/deployment/neon‑branching.md` (new)
- `.env.example` (document `NEON_PROJECT_ID` and `NEON_API_KEY`)

**Definition of Done**
- [ ] `preview.yml` creates a Neon branch on PR open, runs `pnpm db:migrate` against it
- [ ] `preview‑cleanup.yml` deletes the Neon branch on PR close/merge
- [ ] `NEON_PROJECT_ID` and `NEON_API_KEY` secrets added to GitHub repository
- [ ] `docs/deployment/neon‑branching.md` documents: branch naming convention, connection string pattern, cleanup policy, troubleshooting
- [ ] At least one PR test: create PR, verify branch created, merge PR, verify branch deleted
- [ ] `pnpm run typecheck` passes (workflows only — no code change)

**Out of Scope**
- Neon branch data seeding (optional; can be added later)
- Schema diff checks in CI (P0‑MIG‑2)

**Rules to Follow**
- Branch name must be deterministic from PR number: `preview/${{ github.event.number }}`.
- The create‑branch action must also output the connection string for use in subsequent steps.
- Cleanup must run on both PR close and PR merge events.

**Verification**
```bash
# Create a test PR
# Verify: Neon dashboard shows new branch "preview/<PR‑number>"
# Run migrations: workflow log shows successful migration
# Merge PR
# Verify: Neon dashboard shows branch deleted
ls docs/deployment/neon-branching.md
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (CI/CD automation)

---

#### Subtasks

- [ ] P0-DB-7.0.25 (AGENT): Research `neondatabase/create‑branch‑action@v5` and `neondatabase/delete‑branch‑action@v5` usage.
  **Verification:** Action API and inputs documented.

- [ ] P0-DB-7.0.5 (AGENT): Research best practices for Neon branching in CI/CD (naming, cleanup, connection string handling).
  **Verification:** Research documented.

- [ ] P0-DB-7.1 (AGENT): Create `preview.yml` workflow with branch creation and migration steps.
  **File(s):** `.github/workflows/preview.yml`
  **Verification:** Workflow file valid; triggers on `pull_request` opened/synchronize.

- [ ] P0-DB-7.2 (AGENT): Create `preview‑cleanup.yml` workflow with branch deletion step.
  **File(s):** `.github/workflows/preview‑cleanup.yml`
  **Verification:** Workflow file valid; triggers on `pull_request` closed.

- [ ] P0-DB-7.3 (AGENT): Add `NEON_PROJECT_ID` and `NEON_API_KEY` to GitHub repository secrets.
  **Verification:** Secrets configured in repo settings.

- [ ] P0-DB-7.4 (AGENT): Write `docs/deployment/neon‑branching.md` documentation.
  **File(s):** `/docs/deployment/neon‑branching.md`
  **Verification:** Document covers all required topics.

- [ ] P0-DB-7.5 (HUMAN): Test PR workflow end‑to‑end. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-8: Run `drizzle‑kit up` to convert migration folder from journal to v3 structure

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The migration folder at `packages/db/drizzle/` uses the old journal‑based format with `_journal.json`, `meta/_journal.json`, and a flat `0000_easy_dazzler.sql` file. The `__drizzle_migrations` table in the database uses the v0 schema (columns: `id`, `hash`, `created_at` as bigint). Drizzle beta.16+ introduced the v3 folder structure with per‑migration timestamped folders and a v1 migration table.
**Size:** Medium

**Description:**
Run `drizzle‑kit up` to convert the migration folder from the journal‑based format to the v3 folder structure. This command will: (1) remove `_journal.json`, (2) group SQL files and snapshots into timestamped per‑migration folders (e.g., `20250220153045_brave_wolverine/`), (3) reorganize the `meta/` directory. After folder conversion, run `migrate()` programmatically (P0‑DB‑1a) to upgrade the `__drizzle_migrations` table from v0 to v1 schema (adding `name` and `applied_at` columns). Verify that existing applied migrations are correctly recognized by the new structure and do not re‑apply.

**Research Findings (2026‑05‑06):**
- `drizzle‑kit up` is the official command for journal→v3 migration.
- Beta.16 fixed a regression where millisecond timestamps in old journal format caused all migrations to re‑apply after conversion. This is now fixed — migration matching uses folder name, not timestamp.
- The v1 migration table schema: `id`, `hash`, `created_at` (legacy), `name` (folder name), `applied_at` (timestamp). For pre‑existing migrations backfilled during upgrade, `applied_at` is `NULL`.
- **Safety:** Run this against a Neon branch first (P0‑DB‑7) before applying to the main development database.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (programmatic migrate)
- `tasks/infrastructure/P0-DB.md → P0-DB-7` (Neon branching for safe testing)

**Blocks:**
- `tasks/infrastructure/P0-DB.md → P0-DB-9` (JIT mapper evaluation — requires v1 RC)

**Related Files:**
- `packages/db/drizzle/` (entire folder — structural change)
- `packages/db/drizzle/meta/_journal.json` (removed by `up`)
- `packages/db/drizzle.config.ts` (verify output path still correct)

**Definition of Done**
- [ ] `drizzle‑kit up` executed successfully
- [ ] Old `_journal.json` removed; new per‑migration folders created
- [ ] `migrate()` executed to upgrade `__drizzle_migrations` table to v1 schema
- [ ] Query `SELECT * FROM drizzle.__drizzle_migrations` confirms `name` and `applied_at` columns present; existing migration row has `name` populated
- [ ] No migrations re‑applied (verified via migration logs)
- [ ] `pnpm db:migrate` runs clean (no new migrations to apply)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Upgrading to Drizzle v1 APIs (P0‑DB‑9)
- Schema or data changes (this is purely structural)

**Rules to Follow**
- Run `drizzle‑kit up` on a test branch first (Neon preview branch, P0‑DB‑7).
- Commit the new folder structure immediately after conversion.
- Verify that no team members have uncommitted schema changes before running `up`.

**Verification**
```bash
# Before: old journal structure
ls packages/db/drizzle/meta/_journal.json  # exists

# After: v3 structure
ls packages/db/drizzle/  # timestamped folders, no flat .sql files

# Verify migration table upgraded
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations;"
# Should show: name column populated, applied_at for new schema

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (migration structure upgrade)

---

#### Subtasks

- [ ] P0-DB-8.0.25 (AGENT): Read current migration folder structure and understand the `drizzle‑kit up` conversion process.
  **Verification:** Current structure documented; conversion steps understood.

- [ ] P0-DB-8.0.5 (AGENT): Research beta.16 regression fix and v1 migration table schema changes.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DB-8.1 (AGENT): Create a Neon preview branch (using P0‑DB‑7 workflow) and run `drizzle‑kit up` against it first.
  **Verification:** Conversion succeeds on test branch without data loss.

- [ ] P0-DB-8.2 (AGENT): Run `drizzle‑kit up` on the main development database.
  **File(s):** `/packages/db/drizzle/` (entire folder restructured)
  **Verification:** Folder structure converted; `_journal.json` removed.

- [ ] P0-DB-8.3 (AGENT): Run `migrate()` to upgrade `__drizzle_migrations` table to v1.
  **Verification:** Table schema upgraded; no migrations re‑applied.

- [ ] P0-DB-8.4 (AGENT): Commit all migration folder changes.
  **File(s):** `/packages/db/drizzle/`
  **Verification:** New folder structure committed to git.

- [ ] P0-DB-8.5 (HUMAN): Verify migration folder structure and database state. Approve.
  **Verification:** Approved.

---

### [ ] P0-DB-9: Evaluate Drizzle v1 JIT mappers for frequently called queries

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟢 Low
**Current State:** Drizzle ORM is on the 0.x `latest` stable line. v1 is available on the `beta` npm tag (currently beta.22) and introduces opt‑in JIT (just‑in‑time compiled) row mappers that significantly accelerate row mapping (the most expensive part of the query pipeline). There is no evaluation of whether upgrading to v1 RC would benefit the application's query performance.
**Size:** Small

**Description:**
Evaluate Drizzle v1 JIT mappers by: (1) reading the official v1 upgrade guide and JIT mapper documentation; (2) identifying the most frequently called CRM queries (e.g., `listLeadBoard`, `createLead`); (3) creating a decision ADR (`docs/adr/020‑jit‑mappers.md`) that covers: what JIT mappers are, estimated performance improvement, risks of upgrading to v1 RC (beta stability, breaking changes to validator imports, relational query v2 API), and the recommendation for when to upgrade (now, after v1 stable, or after Phase 1). If the decision is to adopt, outline the upgrade path: `drizzle‑kit up` (already done in P0‑DB‑8), import changes (`drizzle‑zod` → `drizzle‑orm/zod`), RQBv2 updates, and JIT mapper opt‑in.

**Research Findings (2026‑05‑06):**
- JIT mappers are an opt‑in API in v1. They accelerate row mapping by compiling mapping functions at runtime.
- The v1 RC is on the beta tag. Breaking changes include: validator packages moved into `drizzle‑orm`, relational query builder v2 (RQBv2), and migration folder v3 (already handled in P0‑DB‑8).
- Current latest: v1.0.0‑beta.22. No stable v1.0.0 release date announced.
- v1 RC has been in beta for several months (beta.1 released in mid‑2025). Community adoption is growing but most production apps remain on 0.x.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-8` (migration folder must be v3 for v1)

**Blocks:** [N/A]

**Related Files:**
- `docs/adr/020‑jit‑mappers.md` (new)
- `packages/db/src/schema/crm.ts` (example query for benchmarking)

**Definition of Done**
- [ ] ADR `docs/adr/020‑jit‑mappers.md` created with: description of JIT mappers, expected benefits, risks of v1 beta, analysis of breaking changes impact on UBOS codebase, recommendation with timeline
- [ ] If recommendation is "adopt now": list of all files requiring import changes documented
- [ ] If recommendation is "defer": trigger criteria for re‑evaluation specified (e.g., "v1 stable release" or "Phase 1 complete")
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Actually upgrading to Drizzle v1 (separate task based on ADR decision)
- Benchmarking (can be done as a follow‑up if adoption is recommended)

**Rules to Follow**
- ADR must reference specific versions: current (0.x `latest`), target (v1.0.0‑beta.22+).
- Breaking change analysis must include: `drizzle‑zod` imports, relational query API, casing API, migration folder structure.

**Verification**
```bash
ls docs/adr/020-jit-mappers.md
# Manual: read ADR, verify decision is clearly documented with rationale
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: JIT mappers hide the complexity of row‑mapping optimization from application code, applying performance improvements at the ORM level without requiring developer intervention.

---

#### Subtasks

- [ ] P0-DB-9.0.25 (AGENT): Read the Drizzle v1 upgrade guide, beta release notes, and JIT mapper documentation.
  **Verification:** v1 feature set and breaking changes documented.

- [ ] P0-DB-9.0.5 (AGENT): Research community adoption of v1 beta and production experiences.
  **Verification:** Community sentiment and stability assessment documented.

- [ ] P0-DB-9.1 (AGENT): Analyze breaking change impact on UBOS codebase: search for `drizzle‑zod` imports, relational query usage, casing configurations.
  **File(s):** Various — search across `apps/web/src`, `packages/db/src`
  **Verification:** Impact analysis complete; affected files listed.

- [ ] P0-DB-9.2 (AGENT): Write ADR `docs/adr/020‑jit‑mappers.md` with evaluation and recommendation.
  **File(s):** `/docs/adr/020‑jit‑mappers.md`
  **Verification:** ADR covers all required sections.

- [ ] P0-DB-9.3 (HUMAN): Review ADR and approve recommendation (adopt or defer).
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑DB group are covered.*

---