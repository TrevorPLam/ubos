# tasks/infrastructure/P0-ENV.md – Environment & Configuration

This file covers the Wrangler `secrets.required` validation for deploy‑time secret verification, Cloudflare bindings type generation via `wrangler types` to prevent runtime mismatches, Workers Paid plan documentation as minimum requirement with `cpu_ms` limit configuration, and a deployment planning guide covering the Free→Paid migration path. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑ENV (2026‑05‑06)

### 1. Wrangler `secrets.required` — Deploy‑Time Validation

The `secrets` configuration property, released with Wrangler v4.70.0 (2026‑03‑03), is the most significant environment‑validation feature for UBOS. It addresses the exact failure mode identified in the TASKS.md: "環境変数の未検証・型不安全な参照" (unvalidated, type‑unsafe environment variable references).

**Three‑layer validation**:
- **Local development** (`wrangler dev` / `vite dev`): When `secrets` is defined, only keys listed in `secrets.required` are loaded from `.dev.vars` or `.env`. Missing required secrets generate a warning listing the missing names. 
- **Deploy** (`wrangler deploy` / `wrangler versions upload`): All secrets in `secrets.required` must be configured on the Worker. If any are missing, the command fails with an error listing which secrets need to be set — preventing partial deployments. 
- **Type generation** (`wrangler types`): Types are generated from `secrets.required` rather than inferred from `.dev.vars` or `.env`, enabling type generation in CI environments where those files don't exist. Per‑environment secrets are supported — the aggregated `Env` type marks secrets that only appear in some environments as optional. 

**Configuration pattern for UBOS**:
```jsonc
{
  "secrets": {
    "required": [
      "DATABASE_URL", "DATABASE_POOLED_URL",
      "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
      "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET",
      "INNGEST_SIGNING_KEY",
      "BETTER_AUTH_SECRET",
      "SENTRY_DSN",
      "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ACCOUNT_ID"
    ]
  }
}
```

### 2. `wrangler types` — Automatic Binding Type Generation

The Workers Best Practices guide explicitly warns: **"Do not hand‑write your `Env` interface. Run `wrangler types` to generate a type definition file that matches your actual Wrangler configuration. This catches mismatches between your config and code at compile time instead of at deploy time."** 

Key features as of Wrangler v4.60.0 (2026‑01‑22):
- Generates per‑environment interfaces (`StagingEnv`, `ProductionEnv`) containing only bindings explicitly declared in each environment.
- Generates an aggregated `Env` interface where bindings present in all environments are required, bindings not present in all environments are optional, and secrets are always required (since they're inherited everywhere).
- Conflicting binding types across environments produce union types (e.g., `KVNamespace | R2Bucket`). 

**Integration with UBOS**: Run `pnpm exec wrangler types` after any change to `wrangler.jsonc`. The generated file should be committed to the repository. Add the types file to `tsconfig.json`'s `compilerOptions.types` array.

### 3. Workers Paid Plan — Minimum Requirement

**The Workers Paid plan at $5/month is documented as the minimum for UBOS production deployment.** Key differences from the Free plan:

| Resource | Free Plan | Paid Plan ($5/mo) |
|---|---|---|
| Requests | 100,000/day | 10M/month (+$0.30/M) |
| CPU time per invocation | 10ms | 30s (configurable to 5 min) |
| CPU time (monthly) | None included | 30M ms (+$0.02/M ms) |
| Cron/Queue CPU | N/A | 15 min per invocation |
| Build minutes | 3,000/month | 6,000/month |
| Queues | 10,000 ops/day | Included |
| KV | Limited daily | Included |
| D1 | 5GB | Included |
| R2 | 10GB | Included |

The Free plan's 10ms CPU limit is insufficient for UBOS's workloads — Neon database queries alone take 50‑200ms. The Paid plan's 30s CPU (configurable to 5 minutes) enables all Phase 0 functionality. 

**`cpu_ms` configuration**: Add a `limits.cpu_ms` setting to `wrangler.jsonc` to set the maximum CPU time per invocation. Default is 30,000ms (30s), configurable up to 300,000ms (5 minutes). For Argon2id hashing (P0‑AUTH‑PERF‑1), 30s may still be tight; document the configuration path for adjustment. 

### 4. Workflows State Retention

Workflows state retention on the Paid plan is 7 days (vs 3 days on Free), which is immediately relevant for UBOS's Inngest and Queues‑based architecture. 

### 5. Environment Variable Best Practices from Workers Best Practices

The Cloudflare Workers Best Practices guide recommends six configuration practices relevant to P0‑ENV:
1. Keep your compatibility date current (within 30 days).
2. Enable `nodejs_compat` — this flag gives Workers access to `node:crypto`, `node:buffer`, and other built‑ins that many libraries depend on.
3. Generate binding types with `wrangler types` — never hand‑write the `Env` interface.
4. Store secrets with `wrangler secret`, not in source — secrets must never appear in `wrangler.jsonc` or source code.
5. Configure environments deliberately — each environment creates a distinct Worker named `{name}-{env}`.
6. "Enable Workers Logs and Traces — Configure observability before deploying to production." 

### 6. Secrets vs Environment Variables

Cloudflare makes a clear distinction: "Secrets are environment variables. The difference is secret values are not visible within Wrangler or Cloudflare dashboard after you define them." Both are accessible via the same `env` parameter in Worker code. For UBOS, all API keys and database credentials must be secrets (set via `wrangler secret put`), while non‑sensitive configuration (log levels, feature flags) can be environment variables (set via `[vars]` in `wrangler.jsonc`).

---

## Task Definitions

### [ ] P0-ENV-1: Extend environment variable validation to also validate Cloudflare bindings (R2, KV, secrets) at worker startup and deploy time

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No centralized environment variable or binding validation exists in the UBOS codebase. Individual server files access `process.env` or `env` bindings directly without any guard to ensure the expected value is present. If a required secret like `DATABASE_URL` is missing or misspelled in production, the Worker deploys successfully but fails at runtime with opaque errors. The `secrets.required` Wrangler feature (2026‑03‑24) is available but not yet configured in `wrangler.jsonc`. The `wrangler types` command for generating typed bindings is not integrated into the development workflow.
**Size:** Medium

**Description:**
Implement a three‑layer environment validation system:

**(a) Wrangler `secrets.required` — Deploy‑time gating**: Add a `secrets.required` array to `apps/web/wrangler.jsonc` listing every secret the Worker requires at runtime. This provides automatic validation at three stages:
- **Local dev**: Missing secrets generate warnings listing which names need to be set in `.dev.vars`
- **Deploy**: `wrangler deploy` fails with an error if any required secret is not configured on the Worker — preventing partial deployments
- **Type generation**: `wrangler types` generates typed bindings from `secrets.required`, enabling type‑safe access in CI environments where `.dev.vars` doesn't exist
- Per‑environment secrets are supported — secrets only appearing in some environments are marked optional in the aggregated `Env` type

The required secrets list for UBOS (Phase 0) must include: `DATABASE_URL`, `DATABASE_POOLED_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `INNGEST_SIGNING_KEY`, `BETTER_AUTH_SECRET`, `SENTRY_DSN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`. 

**(b) Worker‑level startup validation**: Create `apps/web/src/server/env-validator.ts` — a function called at Worker startup (in the Hono entry point or the root route `beforeLoad`) that:
- Reads `env` from the Hono context (not `process.env` — Cloudflare Workers pass `env` as the handler argument, not on `process.env`)
- Validates all required bindings and secrets exist using Zod schemas
- Validates the format of critical values (e.g., `DATABASE_URL` must be a valid PostgreSQL connection string)
- If any required value is missing or invalid, returns a clear 503 Service Unavailable with a structured error listing what's missing — **not** a cryptic runtime error
- This validation is a fail‑fast mechanism: it catches misconfiguration at startup rather than mid‑request

**(c) `wrangler types` integration**: 
1. Add a `db:types` script to `apps/web/package.json`: `"db:types": "wrangler types"`
2. Run `pnpm exec wrangler types` to generate the `worker-configuration.d.ts` file
3. Add the generated file to `tsconfig.json`'s `compilerOptions.types` array 
4. Document in the development README: run `pnpm exec wrangler types` after any change to `wrangler.jsonc`
5. Commit the generated types file to the repository so type‑checking works in CI without Wrangler

**(d) `.dev.vars` template**: Create `.dev.vars.example` listing all required secrets with placeholder values — developers copy this to `.dev.vars` and fill in real values. The file is `.gitignore`d per Cloudflare best practice. 

**Research Findings (2026‑05‑06):**
- `secrets.required` validates at dev, deploy, and type‑gen stages. 
- Wrangler v4.70.0+: `wrangler dev` and `vite dev` warn when required secrets are missing from `.dev.vars`. 
- Wrangler v4.70.0+: `wrangler deploy` fails if required secrets are not configured on the Worker. 
- Wrangler v4.60.0+: `wrangler types` generates per‑environment interfaces. 
- Workers Best Practices: "Never hand‑write your `Env` interface" — use `wrangler types`. 
- On Cloudflare Workers, environment variables are not on `process.env` — they must be accessed via `env` (the Hono context) or using `import { env } from "cloudflare:workers"`. 

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc exists)
- `tasks/infrastructure/P0-DB.md → P0-DB-1` (DATABASE_URL secret exists)

**Blocks:**
- Production deployment workflow (P0‑DEPLOY)
- Any future task adding new secrets

**Related Files:**
- `apps/web/wrangler.jsonc` (add `secrets.required` array)
- `apps/web/src/server/env-validator.ts` (new)
- `apps/web/package.json` (add `db:types` script)
- `apps/web/tsconfig.json` (add generated types to `compilerOptions.types`)
- `.dev.vars.example` (new)
- `apps/web/worker-configuration.d.ts` (generated by `wrangler types`)

**Definition of Done**
- [ ] `secrets.required` array added to `wrangler.jsonc` listing all 12 Phase 0 secrets
- [ ] `wrangler deploy` fails with clear error if any required secret is missing
- [ ] `wrangler dev` warns about missing secrets in `.dev.vars`
- [ ] `apps/web/src/server/env-validator.ts` created: validates all bindings at startup, returns 503 with structured error on misconfiguration
- [ ] `wrangler types` generates `worker-configuration.d.ts` with typed bindings
- [ ] Generated types file added to `tsconfig.json` `compilerOptions.types`
- [ ] `pnpm exec wrangler types` script added as `db:types` in `apps/web/package.json`
- [ ] `.dev.vars.example` created with all required secrets and placeholder values
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Runtime validation of non‑secret environment variables (`vars`)
- Cloudflare Secrets Store integration (beta feature — separate evaluation)
- `@t3-oss/env-core` integration (can be evaluated as a replacement for the custom `env-validator.ts` in a follow‑up)

**Rules to Follow**
- Never include secret values in `wrangler.jsonc` — only list the names in `secrets.required`.
- The startup validator must not expose secret values in error messages — only name the missing key.
- `.dev.vars` must be in `.gitignore` — the template is `.dev.vars.example`.
- Generated types file must be committed to the repository.
- On Workers, never use `process.env` to access bindings — use `env` from the Hono context.

**Verification**
```bash
# Verify secrets.required validation at deploy
wrangler deploy --dry-run
# Expected: fails if any secret not configured

# Verify local dev warnings
wrangler dev
# Expected: warns about any missing required secrets in .dev.vars

# Verify type generation
pnpm exec wrangler types
ls apps/web/worker-configuration.d.ts

# Verify startup validator works
curl https://ubos-staging.<subdomain>.workers.dev/api/health
# Expected: 200 if all configured, 503 if missing bindings

# Verify .dev.vars.example
cat .dev.vars.example | grep "DATABASE_URL\|BETTER_AUTH_SECRET"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an on‑call engineer, I want the Worker to fail‑fast on deploy if secrets are missing so that I never deploy a broken Worker that fails at runtime with cryptic errors.

---

#### Subtasks

- [ ] P0-ENV-1.0.25 (AGENT): Read current `apps/web/wrangler.jsonc` configuration from P0‑SHELL‑2 and P0‑DEPLOY‑1. Research `secrets.required` and `wrangler types` APIs.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-ENV-1.0.5 (AGENT): Research `@t3-oss/env-core` vs custom validator trade‑offs for Workers runtime.
  **Verification:** Decision documented in task notes.

- [ ] P0-ENV-1.1 (AGENT): Inventory all secrets used by UBOS from P0‑BILLING, P0‑AUTH, P0‑INNGEST, P0‑OBS, P0‑STORAGE, and P0‑EMAIL documentation. Build the complete `secrets.required` list.
  **Verification:** Secrets inventory compiled — all 12 secrets identified.

- [ ] P0-ENV-1.2 (AGENT): Add `secrets.required` array to `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** `wrangler deploy --dry-run` validates secrets.

- [ ] P0-ENV-1.3 (AGENT): Create `apps/web/src/server/env-validator.ts` with Zod‑based binding validation and 503 response.
  **File(s):** `apps/web/src/server/env-validator.ts` (new)
  **Verification:** Worker returns 503 when bindings are missing during startup.

- [ ] P0-ENV-1.4 (AGENT): Run `wrangler types` to generate `worker-configuration.d.ts` and add to `tsconfig.json`.
  **File(s):** `apps/web/worker-configuration.d.ts` (generated), `apps/web/tsconfig.json`
  **Verification:** TypeScript compilation recognizes `Env` interface.

- [ ] P0-ENV-1.5 (AGENT): Add `db:types` script to `apps/web/package.json` and create `.dev.vars.example`.
  **File(s):** `apps/web/package.json`, `.dev.vars.example` (new)
  **Verification:** `pnpm db:types` runs successfully; `.dev.vars.example` lists all secrets.

- [ ] P0-ENV-1.6 (HUMAN): Set required secrets on Worker via `wrangler secret put`. Verify deploy validation, local dev warnings, and type generation. Approve.
  **Verification:** Approved.

---

### [ ] P0-ENV-2: Document Workers Paid plan ($5/month) as minimum; configure CPU time limit to 30s in `wrangler.jsonc`; note Argon2id may still need optimization

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No formal documentation exists specifying the Workers Paid plan as the minimum requirement for UBOS production deployment. The `cpu_ms` limit is not explicitly configured in `wrangler.jsonc` — Workers uses the default 30s limit on the Paid plan. The Free plan's 10ms CPU limit is known to be insufficient for Neon database queries (50‑200ms), but this has not been documented as a formal requirement. No deployment plan exists.
**Size:** Small

**Description:**
Document the Workers Paid plan as the minimum production requirement and configure the CPU time limit appropriately for UBOS workloads.

**(a) Workers Paid plan documentation**: Create `docs/deployment/workers-plan.md` documenting:
- **Why Paid is required**: UBOS's core workload (Neon database queries at 50‑200ms per query, Better Auth password hashing at 50‑200ms scrypt on Workers) far exceeds the Free plan's 10ms CPU limit. Even a single `SELECT 1` from Neon requires ~50ms — 5× the Free limit.
- **What the Paid plan includes**: 10M requests/month, 30M CPU ms/month, 30s CPU per invocation (configurable to 5 min), 15 min for Cron/Queue consumers, 7‑day Workflows state retention, unlimited bandwidth.
- **Estimated monthly cost**: For low‑traffic Phase 0: $5.00 minimum. For moderate traffic (15M requests, 7ms avg CPU): ~$8.00/month.
- **Plan upgrade path**: How to upgrade from Free to Paid in the Cloudflare dashboard. The Free plan is sufficient for development but must not be used for production.

**(b) `cpu_ms` configuration**: Add `limits.cpu_ms` to `wrangler.jsonc`:
```jsonc
{
  "limits": {
    "cpu_ms": 30000  // 30 seconds, default on Paid plan
  }
}
```
The default 30s is configurable up to 300,000ms (5 minutes). For Phase 0, 30s is sufficient. For Cron Triggers and Queue Consumers (Inngest functions, keep‑warm pings), the limit is 15 minutes — these are handled automatically by Cloudflare and don't need explicit `cpu_ms` configuration. 

**(c) Argon2id optimization note**: Document in the plan that Argon2id password hashing on Workers may still be tight within 30s. The P0‑AUTH‑PERF‑1 benchmark results should be referenced here — if scrypt (non‑blocking, v1.6.0+) performs within limits, it's the recommended approach. If Argon2id is required for enterprise compliance, the `cpu_ms` can be increased to 60s or the separate hasher Worker pattern can be used.

**(d) Cloudflare Email Service note**: Note that the Workers Paid plan includes 3,000 emails/month via Cloudflare Email Service (beta, April 2026). If UBOS adopts Cloudflare Email Service in the future, this reduces third‑party dependency on Resend. For Phase 0, Resend handles email delivery.

**Research Findings (2026‑05‑06):**
- Workers Paid plan: $5/month, 30s CPU (default, configurable to 5 min), 10M requests/month, 30M CPU ms/month. 
- Free plan: 10ms CPU — insufficient for any database query. 
- `limits.cpu_ms` configuration in `wrangler.jsonc` controls the maximum. 
- Cron Triggers and Queue Consumers get 15 min CPU on Paid plan automatically. 
- Cloudflare Email Service: 3,000 emails/month included with Workers Paid plan since April 2026. 

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc exists)
- `tasks/infrastructure/P0-DEPLOY.md → P0-DEPLOY-1` (deployment workflow documented)

**Blocks:** [N/A]

**Related Files:**
- `docs/deployment/workers-plan.md` (new)
- `apps/web/wrangler.jsonc` (add `limits.cpu_ms`)

**Definition of Done**
- [ ] `docs/deployment/workers-plan.md` written covering: why Paid is required (Free plan 10ms CPU vs Neon 50‑200ms queries), what's included, estimated cost, upgrade path
- [ ] `limits.cpu_ms: 30000` added to `wrangler.jsonc`
- [ ] Argon2id optimization note included referencing P0‑AUTH‑PERF‑1 benchmark
- [ ] Cloudflare Email Service mention for future consideration
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Workers Enterprise plan documentation (Phase 2+)
- Per‑environment `cpu_ms` configuration
- Automated cost monitoring and alerts (Phase 2+)

**Rules to Follow**
- The documentation must make clear that the Free plan is acceptable for development but not for production.
- The `cpu_ms` limit should be set to a value that prevents runaway costs but is sufficient for legitimate workloads.
- Cost estimates must be conservative and clearly marked as estimates.

**Verification**
```bash
ls docs/deployment/workers-plan.md
# Verify the wrangler.jsonc has limits.cpu_ms
grep "cpu_ms" apps/web/wrangler.jsonc
# Manual: review documentation for accuracy
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (documentation)

---

#### Subtasks

- [ ] P0-ENV-2.0.25 (AGENT): Read current `wrangler.jsonc`. Research Workers Paid plan pricing, CPU limits, and included features.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-ENV-2.1 (AGENT): Write `docs/deployment/workers-plan.md` covering all required sections.
  **File(s):** `docs/deployment/workers-plan.md` (new)
  **Verification:** Document covers why Paid is required, what's included, cost estimates, upgrade path.

- [ ] P0-ENV-2.2 (AGENT): Add `limits.cpu_ms: 30000` to `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Configuration valid; `wrangler deploy` respects the limit.

- [ ] P0-ENV-2.3 (AGENT): Add Argon2id optimization note and Cloudflare Email Service mention.
  **File(s):** `docs/deployment/workers-plan.md`
  **Verification:** Cross‑reference to P0‑AUTH‑PERF‑1 present.

- [ ] P0-ENV-2.4 (HUMAN): Review plan documentation, verify CPU limits, approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. Both tasks from TASKS.md P0‑ENV group are covered.*

---