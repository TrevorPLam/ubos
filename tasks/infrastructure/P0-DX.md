# tasks/infrastructure/P0-DX.md – Developer Experience & API Documentation

This file covers Scalar API documentation UI via `@scalar/hono-api-reference`, automated SDK generation with Speakeasy, deterministic database seeding across domains, Changesets for monorepo versioning, TanStack Start debugging limitations documentation, Storybook setup for 56 UI components, Architecture Decision Records for core technology choices, and pre‑commit hooks with Husky + lint‑staged with test coverage thresholds. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑DX (2026‑05‑06)

### 1. Scalar API Reference for Hono

**`@scalar/hono-api-reference`** is a TypeScript Hono middleware that serves beautiful, interactive API documentation from OpenAPI/Swagger documents. Latest version: **0.10.6**, MIT license. The package includes built-in TypeScript type definitions.

**Hono integration pattern** (confirmed by Speakeasy's official 2026‑04‑24 guide and the Scalar dev.to community post):
```typescript
import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

const app = new Hono();
app.get("/docs", apiReference({
  spec: { url: "/openapi.json" },
  theme: "saturn",
}));
```

**Key features**: Built-in API client for testing endpoints right from docs, 10+ themes (saturn, purple, kepler, default), dark/light modes, OpenAPI 3.1 support, search, fast performance even on large specs. Scalar is chosen as the default OpenAPI documentation UI by multiple framework communities (Elysia, Hono, FastAPI). 

**Alternative integration**: `@hono-openapi/scalar@0.0.7` provides a zero‑configuration extension for Hono that automatically generates OpenAPI documentation and exposes it via the Scalar frontend. 

### 2. Speakeasy SDK Generation

Speakeasy provides a CLI (`speakeasy`) and GitHub Action (`sdk-generation-action`) for automatically generating idiomatic client SDKs from OpenAPI specifications. 

**Free tier**: 1 SDK with up to 50 API methods. Business tier: unlimited generations in multiple languages (TypeScript, Python, Go, Java, C#, and more). 14-day business trial available. 

**Workflow**: `speakeasy quickstart` → upload OpenAPI spec → select target language → SDK generated and compiled. Supports OpenAPI 3.0, 3.1, and JSON Schema. GitHub Action automates regeneration when the spec changes, pushing a branch for review and merge. 

**Hono-specific**: Speakeasy published an official guide (2026‑04‑24) demonstrating the full Hono → OpenAPI → Speakeasy SDK pipeline, including `x-speakeasy-retries` extensions for per‑endpoint retry configuration. 

### 3. Orval — OpenAPI Code Generation

Orval v8.8.0 generates type-safe JS/TS clients from OpenAPI v3 or Swagger v2 specs. Generates type definitions and fetch wrappers (`@orval/query`). Supports TanStack Query hooks automatically — when configured, it generates `useQuery` / `useMutation` hooks for each endpoint. Supports React, Vue, Svelte, Angular, and Solid. Can also generate MSW (Mock Service Worker) handlers for testing. 

### 4. Changesets — Monorepo Versioning

**`@changesets/cli`** v2.31.0 is the latest stable (2026‑04‑17). v3.0.0-next.1 is in development. Changesets is the standard tool for monorepo versioning when using pnpm workspaces. 

**Setup**: `pnpm add -Dw @changesets/cli` → `pnpm changeset init` → `.changeset/config.json` created. Two versioning strategies: `fixed` (all packages share one version) or `independent` (each package versioned separately). 

**Workflow**: Contributors run `pnpm changeset` to create a changeset file describing their changes and the semver bump. CI runs `pnpm changeset version` to consume changesets, bump versions, and generate CHANGELOGs. Release runs `pnpm changeset publish` to publish to npm and create git tags. 

The `changeset-bot` enforces that every PR touching packages includes a changeset file. 

### 5. TanStack Start Debugging Limitations

TanStack Start's debugging landscape as of May 2026:
- **TanStack Devtools** is still in **alpha** and may have breaking changes. The unified `TanStackDevtools` component (with plugins) is the current approach, replacing standalone RouterDevtools. 
- **Server function testing** is a known pain point: "The main issue is that TanStack Start expects a lot of metadata (Start context) to come along with a server function invocation, and so we have to supply all of that context ourselves." 
- **Import protection** is now default in new projects (as of March 2026) — prevents server‑only code from being imported into client bundles. 
- **Recommended debugging approach**: Browser DevTools for client side, structured logging (P0‑OBS‑2) for server side, TanStack Query Devtools for cache inspection. 
- **MCP server** for TanStack Devtools: As of May 1, 2026, a bridge for MCP‑capable coding agents via WebSocket for local development inspection exists. 

### 6. Storybook 10.3

Storybook 10.3 (March 2026) is the latest major release. Key features for UBOS:
- **MCP for React** (Preview): AI agents can interact with real components, write stories, run tests. 
- **Vite 8 support** — compatible with UBOS's Vite‑based build (P0‑SHELL‑1). 
- **ESLint 10 support** — compatible with UBOS's ESLint v10 flat config (P0‑FOUND‑3). 
- **CSF Factories** for type-safe, reduced‑boilerplate story authoring. 
- **Accessibility improvements** across the UI. 
- **Addon‑Vitest** simplified configuration — no more setup files required. 
- **No breaking changes** from pre-10.0. 

### 7. Husky + lint‑staged

Husky v9+ uses a simpler setup with a `.husky/` directory. `npx husky init` sets it up. The `prepare` script in `package.json` (`"prepare": "husky"`) ensures hooks are installed after `pnpm install`.

**Standard pattern**: Pre‑commit should be fast (lint‑staged only touches staged files), pre‑push can be slower (full type‑check). lint‑staged config: `{ "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }`. Contributors can bypass hooks with `--no-verify` in emergencies. 

### 8. Architecture Decision Records

Microsoft's Well‑Architected Framework (2026‑04‑10) and Martin Fowler (2026‑03‑24) agree on ADR best practices:
- **Append‑only log** — don't edit accepted records; write new ones that supersede old ones
- **Store with code** — common location is `docs/adr/` in the source repository
- **Keep short** — single page per record; link to supplemental material
- **Template**: Problem statement with context, Options considered, Decision outcome, Tradeoffs, Confidence level, Status (Proposed, Accepted, Superseded)
- **3–5 prior records** provides the best context window for understanding decisions
- Retroactive ADRs are acceptable for brownfield workloads when data is available

### 9. Test Coverage Thresholds

The 2026 consensus: 70–80% line coverage is the pragmatic target for most applications. 80% is the most commonly recommended threshold — it incentivizes testing the important stuff while skipping trivial getters. Below 60% indicates insufficient testing; above 85%, marginal tests become low‑value and flaky. Vitest supports `coverage.thresholds` in `vitest.config.ts` with per‑category (lines, functions, branches, statements) configuration.

---

## Task Definitions

### [ ] P0-DX-1: Generate and serve API documentation portal using `@scalar/hono-api-reference` middleware

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P0‑TRPC‑10 generates an OpenAPI spec at `/api/v1/openapi.json` but there is no visual documentation UI. Developers and API consumers have no interactive way to explore the API, test endpoints, or understand the schema beyond raw JSON. The `/api/v1/openapi.json` endpoint exists as raw JSON only.
**Size:** Small

**Description:**
Mount the Scalar API Reference UI at `/api/docs` (or `/docs`) using `@scalar/hono-api-reference` middleware. Scalar provides an interactive, modern API documentation experience with a built-in API client for testing endpoints directly from the browser.

**Implementation steps**:
1. Install `@scalar/hono-api-reference` (latest: 0.10.6 as of 2026‑05‑06) as a dependency.
2. In the Hono app (`apps/web/src/server/api.ts`), mount the Scalar middleware:
   ```typescript
   import { apiReference } from "@scalar/hono-api-reference";
   api.get("/docs", apiReference({
     spec: { url: "/api/v1/openapi.json" },
     theme: "saturn",
   }));
   ```
3. Configure the spec URL to point to the OpenAPI endpoint from P0‑TRPC‑10.
4. Verify that all CRM endpoints are visible, interactive (can test with "Try It"), and correctly documented.

**Research Findings (2026‑05‑06):**
- `@scalar/hono-api-reference` v0.10.6 is latest; MIT license. 
- Hono pattern: `apiReference({ spec: { url: "/openapi.json" }, theme: "saturn" })`. 
- Provides built‑in API client, dark/light themes, search, OpenAPI 3.1 support. 
- Scalar is free and open source; no API key required.

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-10` (OpenAPI document served at `/api/v1/openapi.json`)

**Blocks:**
- `tasks/infrastructure/P0-DX.md → P0-DX-2` (SDK generation needs OpenAPI spec)

**Related Files:**
- `apps/web/src/server/api.ts` (add Scalar middleware)
- `apps/web/package.json` (add `@scalar/hono-api-reference` dep)
- `pnpm-workspace.yaml` (add to catalog)

**Definition of Done**
- [ ] `@scalar/hono-api-reference` ^0.10.6 installed and added to `pnpm-workspace.yaml` catalog
- [ ] Scalar middleware mounted at `GET /docs` in the Hono app
- [ ] Spec URL points to `/api/v1/openapi.json`
- [ ] Interactive API documentation renders at `http://localhost:3000/docs`
- [ ] At least one CRM endpoint tested via the built‑in "Try It" feature
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Custom branding/theming beyond the default "saturn" theme (can be configured later)
- Authentication passthrough for the "Try It" feature (requires additional Scalar config)
- Custom domain for API docs (deferred)

**Rules to Follow**
- The Scalar route must be publicly accessible — do not add auth middleware.
- The spec URL must be relative (`/api/v1/openapi.json`) to work across environments.
- Do not import Scalar into client bundles — it's server‑side middleware only.

**Verification**
```bash
# Install and verify
pnpm ls @scalar/hono-api-reference

# Start dev server and open docs
pnpm dev
open http://localhost:3000/docs

# Verify interactive testing works
# Manual: open a CRM endpoint, click "Try It", send a request

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (documentation UI)

---

#### Subtasks

- [ ] P0-DX-1.0.25 (AGENT): Read current `apps/web/src/server/api.ts` and P0‑TRPC‑10 output. Research `@scalar/hono-api-reference` API.
  **Verification:** API understood.

- [ ] P0-DX-1.1 (AGENT): Install `@scalar/hono-api-reference` ^0.10.6, add to catalog.
  **File(s):** `apps/web/package.json`, `pnpm-workspace.yaml`
  **Verification:** `pnpm ls @scalar/hono-api-reference` shows installed.

- [ ] P0-DX-1.2 (AGENT): Mount Scalar middleware in `api.ts` at `/docs`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** `GET /docs` serves interactive documentation.

- [ ] P0-DX-1.3 (HUMAN): Verify interactive docs, test CRM endpoint. Approve.
  **Verification:** Approved.

---

### [ ] P0-DX-2: Set up automated SDK generation pipeline (Speakeasy or Orval)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No SDK generation exists. External developers must manually create HTTP clients by reading the OpenAPI spec or the Scalar documentation. There is no automated pipeline to regenerate SDKs when the API changes. This creates friction for API consumers and risks out‑of‑sync client code.
**Size:** Medium

**Description:**
Set up an automated SDK generation pipeline using Speakeasy as the primary tool. Speakeasy generates idiomatic TypeScript SDKs (and optionally Python, Go, Java, etc.) from the UBOS OpenAPI spec, with automatic regeneration in CI when the spec changes.

**(a) SDK generation**: Run `speakeasy quickstart` locally with the UBOS OpenAPI spec to generate the initial TypeScript SDK. Configure Speakeasy extensions (`x-speakeasy-retries`, `x-speakeasy-pagination`) in the OpenAPI spec to improve the generated SDK quality. The SDK is saved as a folder in the monorepo (e.g., `packages/sdk/`).

**(b) CI pipeline**: Create `.github/workflows/sdk-publish.yml` using Speakeasy's `sdk-generation-action`. The workflow:
- Triggers on changes to the OpenAPI spec (the `.json` file or the router files that generate it)
- Runs `speakeasy run` to regenerate the SDK
- Creates a PR with the SDK changes for review and merge
- Optionally publishes the SDK to npm (public or private registry)

**(c) Publishing**: Publish the TypeScript SDK as an npm package under `@ubos/sdk` (or `@ubos/api-client`). This enables external developers to install `npm install @ubos/sdk` and get a fully typed API client.

**(d) Decision documentation**: Write an ADR (`docs/adr/023-sdk-generation.md`) documenting: why Speakeasy was chosen over Orval and OpenAPI Generator (Speakeasy supports multi‑language generation, has a free tier for 1 SDK up to 50 methods, and provides idiomatic code with proper error handling), the regeneration workflow, and the publishing strategy.

**Research Findings (2026‑05‑06):**
- Speakeasy free tier: 1 SDK, up to 50 methods. Business tier: unlimited multi‑language. 
- `speakeasy quickstart` → guided setup: upload OpenAPI spec → select language → SDK generated. 
- GitHub Action automates regeneration on spec changes. 
- Orval v8.8.0 is an alternative focused on frontend client generation (React Query hooks, MSW handlers) — better for internal use than external SDK distribution. 
- Speakeasy was chosen over Orval for external SDKs because it generates idiomatic multi‑language SDKs (TypeScript, Python, Go, Java, C#) while Orval focuses on JavaScript/TypeScript frontend clients.

**Depends on:**
- `tasks/infrastructure/P0-DX.md → P0-DX-1` (OpenAPI spec + Scalar docs available)

**Blocks:** [N/A]

**Related Files:**
- `.github/workflows/sdk-publish.yml` (new)
- `packages/sdk/` (new — generated SDK package)
- `docs/adr/023-sdk-generation.md` (new)

**Definition of Done**
- [ ] Speakeasy CLI installed and authenticated
- [ ] Initial TypeScript SDK generated from the UBOS OpenAPI spec
- [ ] SDK saved in the monorepo (e.g., `packages/sdk/` or a separate repository)
- [ ] `.github/workflows/sdk-publish.yml` created: regenerates SDK on spec changes, creates PR
- [ ] Speakeasy extensions added to OpenAPI spec where beneficial (`x-speakeasy-retries`)
- [ ] ADR `docs/adr/023-sdk-generation.md` written documenting tool choice and workflow
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Publishing the SDK to a public npm registry (requires npm organization setup — deferred)
- Generating SDKs in languages beyond TypeScript (can be added later)
- Orval integration for internal React Query hooks (separate evaluation)
- MCP server generation (optional Speakeasy feature)

**Rules to Follow**
- The SDK must be regenerated automatically, not manually, to prevent out‑of‑sync clients.
- The generated SDK package should be treated as a separate workspace package in the monorepo.
- Speakeasy configurations (`.speakeasy/`) must be committed to the repository.

**Verification**
```bash
# Verify Speakeasy CLI
speakeasy --version

# Generate SDK
speakeasy quickstart
# Follow prompts, verify SDK generated

# Verify CI workflow
ls .github/workflows/sdk-publish.yml

# Verify ADR
ls docs/adr/023-sdk-generation.md

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (tooling automation)

---

#### Subtasks

- [ ] P0-DX-2.0.25 (AGENT): Research Speakeasy vs Orval vs OpenAPI Generator trade‑offs. Install Speakeasy CLI.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DX-2.1 (AGENT): Run `speakeasy quickstart` with UBOS OpenAPI spec, generate initial TypeScript SDK.
  **File(s):** `packages/sdk/` (new)
  **Verification:** SDK generated and compiles.

- [ ] P0-DX-2.2 (AGENT): Create `.github/workflows/sdk-publish.yml` with `sdk-generation-action`.
  **File(s):** `.github/workflows/sdk-publish.yml` (new)
  **Verification:** Workflow triggers on spec changes.

- [ ] P0-DX-2.3 (AGENT): Write `docs/adr/023-sdk-generation.md` documenting tool choice and workflow.
  **File(s):** `docs/adr/023-sdk-generation.md` (new)
  **Verification:** ADR documents decision and workflow.

- [ ] P0-DX-2.4 (HUMAN): Review SDK generation, approve tooling choice, verify ADR.
  **Verification:** Approved.

---

### [ ] P0-DX-3: Create database seed scripts for all domains (deterministic, seeded PRNG)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** P0‑DB‑6 built a basic seeding engine with organization and CRM data. However, the seeding script only covers CRM entities. As new domain schemas are added in Phase 1 (Projects, Documents, Finance, Assets), the seed script must be extended to populate realistic, deterministic data across all domains for development and testing.
**Size:** Medium

**Description:**
Extend the database seeding engine from P0‑DB‑6 to cover all Phase 0 domains with realistic, deterministic test data. The seed script generates data for:
- **Organizations**: At least 3 tenants with varied subscription states
- **Users**: Admin and member users per organization
- **CRM**: Leads (all 3 stages), contacts, companies, deals
- **Project structures** (as schema becomes available in Phase 1): Projects, tasks, milestones
- **Document structures**: Folders, document records (metadata only — actual R2 files not seeded)
- **Finance structures**: Chart of accounts, invoices, bills, vendors
- **Cross‑entity links**: Documents linked to CRM deals, tasks linked to projects

The seed script uses `drizzle‑seed` with a fixed seed number for reproducible data across all developer machines. It accepts a `--tenant-count` CLI argument (default: 3) and a `--reset` flag to clear existing data before seeding. Each domain's seed function is in a separate module (`seed/crm.ts`, `seed/projects.ts`, etc.) for maintainability.

**Research Findings (2026‑05‑06):**
- `drizzle‑seed` v0.3.1 supports deterministic generation via `seed` option and bulk creation via `count` option. 
- Seed scripts should be modular — one file per domain, aggregated by a master `seed.ts`. 
- Fixed seed number (e.g., `42`) ensures all developers see identical data. 
- Seeding must use `getMigrationDb()` (non‑pooled URL) since it performs DML operations.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-6` (basic seeding engine)
- Phase 1 domain schemas (as they become available — seed scripts should be created alongside each schema)

**Blocks:** [N/A]

**Related Files:**
- `packages/db/src/seed.ts` (extend)
- `packages/db/src/seed/orgs.ts` (new)
- `packages/db/src/seed/crm.ts` (new)
- `packages/db/src/seed/projects.ts` (new)
- `packages/db/src/seed/documents.ts` (new)
- `packages/db/src/seed/finance.ts` (new)

**Definition of Done**
- [ ] Modular seed structure: one file per domain, aggregated by `seed.ts`
- [ ] At least 3 tenants generated with varied subscription states
- [ ] CRM data generated: leads in all stages, contacts, companies, deals per tenant
- [ ] Seeding is deterministic (same seed → same data on every run)
- [ ] `--tenant-count` and `--reset` CLI flags functional
- [ ] Stub seed files created for Phase 1 domains (projects, documents, finance, assets) with placeholder data generation
- [ ] `pnpm db:seed` populates development database with realistic data
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Seeding Phase 2+ domains (Portal, Scheduling, HR)
- Production data seeding (dev/staging only)
- Seed data with R2 file uploads (metadata only for documents)

**Rules to Follow**
- Use a single fixed seed number (e.g., `42`) for deterministic output across all developers.
- Each domain's seed function must be independent — domains should run in dependency order (organizations first, then CRM, etc.).
- Never seed the production database.
- Use `getMigrationDb()`, not `getDb()`, for seeding operations.

**Verification**
```bash
# Seed the dev database
DATABASE_URL="postgresql://..." pnpm db:seed
# Verify data exists for all seeded domains
# Verify determinism: delete data, re-seed with same seed → identical data

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (seed data)

---

#### Subtasks

- [ ] P0-DX-3.0.25 (AGENT): Read P0‑DB‑6 output (basic seed script). Research `drizzle‑seed` advanced features.
  **Verification:** Research documented.

- [ ] P0-DX-3.1 (AGENT): Refactor `seed.ts` into modular structure with per‑domain seed files.
  **File(s):** `packages/db/src/seed.ts`, `packages/db/src/seed/*.ts` (new)
  **Verification:** Modular structure compiles and runs.

- [ ] P0-DX-3.2 (AGENT): Extend CRM seed with multi‑stage leads, contacts, companies, deals.
  **File(s):** `packages/db/src/seed/crm.ts`
  **Verification:** CRM data generated deterministically.

- [ ] P0-DX-3.3 (AGENT): Create stub seed files for Phase 1 domains.
  **File(s):** `packages/db/src/seed/projects.ts`, `documents.ts`, `finance.ts`
  **Verification:** Stub files exist with placeholder generation.

- [ ] P0-DX-3.4 (HUMAN): Run seed script, verify data across domains. Approve.
  **Verification:** Approved.

---

### [ ] P0-DX-4: Configure Changesets for monorepo versioning and changelog generation

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The UBOS monorepo has no automated versioning or changelog system. Package versions (`apps/web`, `packages/auth`, `packages/db`, `packages/tsconfig`) are managed manually. There is no `CHANGELOG.md` generation, no changeset enforcement, and no release workflow. Version bumps require manual coordination across packages.
**Size:** Small

**Description:**
Configure Changesets for automated versioning, changelog generation, and release management across the UBOS monorepo. Changesets is the standard tool for monorepo versioning with pnpm workspaces.

**(a) Installation and initialization**: `pnpm add -Dw @changesets/cli` → `pnpm changeset init`. This creates the `.changeset/` directory with a `config.json` file.

**(b) Versioning strategy**: Use `"baseBranch": "main"` and `"access": "restricted"` (private packages). Choose `"fixed"` versioning (all packages share one version) since UBOS is a unified platform where all packages release together. Configure `"commit": false` (the CI release workflow handles commits).

**(c) Changeset bot integration**: Add a CI step (or use `changeset-bot`) that checks every PR for a changeset file. If a PR touches a package, it must include a changeset describing the change and the semver bump. This prevents unversioned changes from being merged.

**(d) Release workflow**: Create `.github/workflows/release.yml` that:
- Watches for PRs titled "Version Packages" (created by the Changesets action)
- On merge, runs `pnpm changeset version` to consume changesets and bump versions
- Runs `pnpm changeset publish` to publish packages
- Creates git tags for each published version

**(e) Documentation**: Update `CONTRIBUTING.md` with instructions on creating changesets. Add a section explaining: `pnpm changeset` → select packages → describe change (patch/minor/major) → commit the generated file.

**Research Findings (2026‑05‑06):**
- `@changesets/cli` v2.31.0 is latest stable (2026‑04‑17). v3.0.0‑next.1 in development. 
- `pnpm add -Dw @changesets/cli` → `pnpm changeset init`. 
- Two strategies: `fixed` (one version for all packages) or `independent` (per‑package). 
- `changeset-bot` enforces changeset inclusion in PRs. 
- Standard release pattern: `changeset version` bumps versions, `changeset publish` publishes. 

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (root config)

**Blocks:** [N/A]

**Related Files:**
- `.changeset/config.json` (new)
- `.github/workflows/release.yml` (new)
- `CONTRIBUTING.md` (update with changeset instructions)

**Definition of Done**
- [ ] `@changesets/cli` ^2.31.0 installed as devDependency
- [ ] `.changeset/config.json` created with `"fixed"` versioning strategy
- [ ] `.github/workflows/release.yml` created: version bump on "Version Packages" PR merge
- [ ] Changeset enforcement configured in CI (PRs touching packages must include changeset)
- [ ] `CONTRIBUTING.md` updated with changeset instructions
- [ ] Test: create a changeset → verify it appears in `.changeset/` folder
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- npm publishing (requires npm organization and token setup — deferred to production release)
- Automated changelog customization beyond defaults
- `changeset-bot` GitHub App installation (CI check is sufficient for Phase 0)

**Rules to Follow**
- Changeset files must be committed with the PR that introduces the change.
- Never manually edit version numbers in `package.json` after Changesets is configured.
- The release workflow must not auto‑publish without human review of the "Version Packages" PR.

**Verification**
```bash
# Verify installation
pnpm ls @changesets/cli

# Verify config
cat .changeset/config.json

# Test changeset creation
pnpm changeset
# Follow prompts, verify generated file in .changeset/

# Verify CI enforcement
git push origin feature-branch
# PR should show changeset check

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (tooling)

---

#### Subtasks

- [ ] P0-DX-4.0.25 (AGENT): Research Changesets configuration for pnpm monorepos with "fixed" versioning.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DX-4.1 (AGENT): Install `@changesets/cli` ^2.31.0 and run `pnpm changeset init`.
  **File(s):** `package.json`, `.changeset/config.json` (new)
  **Verification:** `.changeset/` directory exists with config.

- [ ] P0-DX-4.2 (AGENT): Create `.github/workflows/release.yml` with version bump and publish steps.
  **File(s):** `.github/workflows/release.yml` (new)
  **Verification:** Workflow triggers correctly.

- [ ] P0-DX-4.3 (AGENT): Add changeset enforcement step to CI workflow.
  **File(s):** `.github/workflows/ci.yml`
  **Verification:** PRs without changesets fail CI.

- [ ] P0-DX-4.4 (AGENT): Update `CONTRIBUTING.md` with changeset instructions.
  **File(s):** `CONTRIBUTING.md`
  **Verification:** Instructions present and clear.

- [ ] P0-DX-4.5 (HUMAN): Test changeset creation and verify CI enforcement. Approve.
  **Verification:** Approved.

---

### [ ] P0-DX-5: Document TanStack Start debugging limitations and alternative patterns

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No documentation exists on how to debug TanStack Start applications. Developers encountering issues with server functions, SSR, or the development server have no guidance on which tools to use, known limitations to expect, or alternative patterns to work around them. TanStack Devtools is in alpha and may have breaking changes.
**Size:** Small

**Description:**
Create `docs/development/debugging.md` — a practical debugging guide for UBOS developers working with TanStack Start. The guide covers:

**(a) Known limitations**: TanStack Devtools is in alpha and may have breaking changes. "TanStack Start expects a lot of metadata (Start context) to come along with a server function invocation, and so we have to supply all of that context ourselves" for testing — document the workaround (supply mock context via `createServerFn` wrappers). Import protection is enabled by default, which may cause confusion when importing server‑only code — document how to identify and fix import protection errors.

**(b) Recommended tools and techniques**:
- **Browser DevTools**: Primary tool for client‑side debugging. React DevTools for component inspection, Network tab for API calls
- **TanStack Query Devtools**: Enabled in development (P0‑SHELL‑6). Shows query cache, allows manual invalidation
- **Structured JSON logging** (P0‑OBS‑2): Primary tool for server‑side debugging. All server functions, tRPC procedures, and API routes log with correlation IDs
- **Wrangler tail**: Real‑time log streaming from production Workers. Essential for debugging deployed issues
- **Inngest dashboard**: Debug background job execution, retries, and failures
- **Sentry** (P0‑OBS‑1): Error aggregation with full stack traces

**(c) TanStack Start‑specific gotchas**:
- Server functions must not be imported into client components (caught by import protection)
- The Vite dev server sometimes requires restarts when adding new routes (known RC behavior)
- SSR errors may appear as opaque HTML responses rather than clear error messages — check server logs

**(d) Alternative patterns**:
- Instead of debugging server functions in isolation, test them via the tRPC client (which provides proper context)
- Use Inngest for complex server‑side workflows rather than chained server functions
- Prefer `wrangler tail` over the Vite dev server for issues that only appear in production‑like environments

**Research Findings (2026‑05‑06):**
- TanStack Devtools is alpha; unified devtools panel for Router/Query/Start. 
- Server function testing limitation: "we have to supply all of that context ourselves." 
- Import protection is default since March 2026. 
- MCP server for TanStack Devtools available as of May 1, 2026. 

**Depends on:**
- `tasks/infrastructure/P0-OBS.md → P0-OBS-2` (structured logging)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-2` (Inngest dashboard)

**Blocks:** [N/A]

**Related Files:**
- `docs/development/debugging.md` (new)

**Definition of Done**
- [ ] `docs/development/debugging.md` created with all four sections: known limitations, recommended tools, gotchas, alternative patterns
- [ ] TanStack Devtools alpha status documented with version pinning advice
- [ ] Server function testing workaround documented
- [ ] Import protection guidance provided
- [ ] Document is practical and actionable (not theoretical)
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Video tutorials or screencasts
- Framework‑level debugging (Vite internals, Workers runtime)
- TanStack Start RSC debugging (RSC not yet supported)

**Rules to Follow**
- Document must acknowledge limitations honestly — don't claim things are stable that aren't.
- All debugging tool references must link to their setup documentation.
- Keep the guide under 5 pages — reference specific files and configurations, not general concepts.

**Verification**
```bash
ls docs/development/debugging.md
# Manual: review guide for accuracy and practicality
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (documentation)

---

#### Subtasks

- [ ] P0-DX-5.0.25 (AGENT): Research TanStack Start debugging challenges, Devtools alpha status, and community workarounds.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DX-5.1 (AGENT): Write `docs/development/debugging.md` covering all four sections.
  **File(s):** `docs/development/debugging.md` (new)
  **Verification:** Document covers all required topics.

- [ ] P0-DX-5.2 (HUMAN): Review debugging guide for accuracy and usefulness. Approve.
  **Verification:** Approved.

---

### [ ] P0-DX-6: Set up Storybook for UI component library (initial 10 components)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The UBOS project has 56 shadcn/ui components in `apps/web/src/components/ui/` but no component explorer, visual testing environment, or isolated development workflow. Developers must navigate the full application to view and test individual components. There is no visual regression testing or component documentation.
**Size:** Medium

**Description:**
Set up Storybook 10.3 for the UBOS UI component library, starting with 10 high‑impact components. Storybook provides an isolated component development environment, visual testing, and documentation generation.

**(a) Installation**: Run `npx storybook@latest init` in the `apps/web` directory. This automatically detects the Vite + React setup and configures Storybook. Storybook 10.3 supports Vite 8 and ESLint 10 — both compatible with UBOS's toolchain.

**(b) Initial stories**: Write stories for 10 components that have the most variants or are most frequently used:
- `Button` — all variants (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon)
- `Dialog` — open/close, different trigger scenarios
- `Sheet` — side variants (top, bottom, left, right)
- `DropdownMenu` — with submenus and checkbox items
- `Table` — with data, sorting, and selection
- `Card` — with header, footer, description
- `Input` — with validation states and disabled
- `Badge` — all variants
- `Tabs` — with content
- `Toast` / `Sonner` — trigger and display

Each story demonstrates all variants and interactive states using Storybook's Controls addon.

**(c) Configuration**: Configure `@storybook/addon-a11y` for accessibility testing, `@storybook/addon-vitest` for unit test integration, and `@storybook/addon-theme` for dark/light theme switching.

**(d) Documentation**: Add a `README.md` in the Storybook directory explaining how to run Storybook (`pnpm storybook`), how to add new stories, and how to use the accessibility addon.

**Research Findings (2026‑05‑06):**
- Storybook 10.3 (March 2026): MCP for React (AI agents interact with real components), Vite 8 support, ESLint 10 support. 
- No breaking changes from pre-10.0. 
- `@storybook/react` v10.3.6 is latest patch. 
- Storybook auto‑detects Vite + React setup via `npx storybook@latest init`. 
- Addon‑Vitest simplified configuration — no more setup files required. 

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1` (Vite config stable)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/.storybook/` (new directory — Storybook config)
- `apps/web/src/components/ui/*.stories.tsx` (new — story files)
- `apps/web/package.json` (add Storybook scripts)

**Definition of Done**
- [ ] Storybook 10.3 installed and configured in `apps/web`
- [ ] Storybook builds and serves without errors (`pnpm storybook`)
- [ ] 10 component stories written covering all variants and interactive states
- [ ] `@storybook/addon-a11y` configured — accessibility checks running
- [ ] `@storybook/addon-vitest` configured — component tests integrated
- [ ] Dark/light theme switching working
- [ ] `README.md` in `.storybook/` directory with usage instructions
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Stories for all 56 components (remaining 46 can be added incrementally)
- Visual regression testing with Chromatic (separate service; can be added later)
- Storybook MCP integration (preview feature; evaluate after stabilization)
- Storybook deployment to static hosting

**Rules to Follow**
- Stories must use the same Tailwind CSS v4 configuration as the main app.
- Each story must include all variants of the component (use Controls addon, not separate stories per variant).
- Stories must not import application‑specific data or services — they must be fully isolated.

**Verification**
```bash
# Start Storybook
cd apps/web && pnpm storybook
# Open http://localhost:6006

# Verify all 10 components render
# Verify Controls addon works for each story
# Verify a11y addon shows no critical violations

# Verify Vitest integration
pnpm test -- --config apps/web/.storybook

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a UI developer, I can browse all component variants in isolation, test their accessibility, and verify they match the design system without opening the full application.

---

#### Subtasks

- [ ] P0-DX-6.0.25 (AGENT): Research Storybook 10.3 features, Vite 8 compatibility, and shadcn/ui Storybook patterns.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DX-6.1 (AGENT): Run `npx storybook@latest init` in `apps/web`, verify auto‑detection.
  **File(s):** `apps/web/.storybook/`, `apps/web/package.json`
  **Verification:** Storybook starts at `localhost:6006`.

- [ ] P0-DX-6.2 (AGENT): Write stories for Button, Dialog, Sheet, DropdownMenu, Table.
  **File(s):** `apps/web/src/components/ui/*.stories.tsx`
  **Verification:** All 5 component stories render with Controls.

- [ ] P0-DX-6.3 (AGENT): Write stories for Card, Input, Badge, Tabs, Toast/Sonner.
  **File(s):** `apps/web/src/components/ui/*.stories.tsx`
  **Verification:** All 10 component stories complete.

- [ ] P0-DX-6.4 (AGENT): Configure `@storybook/addon-a11y` and `@storybook/addon-vitest`.
  **File(s):** `apps/web/.storybook/main.ts`
  **Verification:** A11y checks run; Vitest integration works.

- [ ] P0-DX-6.5 (AGENT): Write `.storybook/README.md` with usage instructions.
  **File(s):** `apps/web/.storybook/README.md` (new)
  **Verification:** Instructions clear.

- [ ] P0-DX-6.6 (HUMAN): Browse all stories, verify a11y passes, approve.
  **Verification:** Approved.

---

### [ ] P0-DX-7: Write Architecture Decision Records for auth, database, hosting, and tRPC

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Several ADRs already exist: `012-api-contract.md` (tRPC as primary API), `018-turbo-watch-remote-cache.md`, `019-pnpm-migration.md`, `020-jit-mappers.md`, `021-session-strategy.md`, `022-inngest-version.md`, `023-sdk-generation.md`. However, core architectural decisions for auth system, database strategy, hosting platform, and the deferral of React Server Components are not yet documented as formal ADRs.
**Size:** Small

**Description:**
Write four Architecture Decision Records covering the foundational technology choices of UBOS. Each ADR follows the standard template: problem statement with context, options considered, decision outcome, tradeoffs, confidence level, and status.

**(a) ADR 013 — Auth System**: Why Better Auth over Auth.js (NextAuth), Clerk, or Supabase Auth. Document: multi‑tenant support via organization plugin, Drizzle adapter for Neon Postgres, TanStack Start cookies integration, self‑hosted (no third‑party dependency), and the tradeoff of managing auth infrastructure vs using a managed service.

**(b) ADR 014 — Database Strategy**: Why Neon PostgreSQL + Drizzle ORM over PlanetScale, Supabase, or Turso. Document: serverless‑friendly (no persistent connections), branch‑based workflows for CI/CD, RLS for multi‑tenant isolation, and the tradeoff of cold starts vs operational simplicity.

**(c) ADR 015 — Hosting Platform**: Why Cloudflare Workers over Vercel, Fly.io, or AWS. Document: global edge deployment (low latency), integrated R2/KV/Queues, Hono compatibility, generous free tier for development, and the tradeoff of Workers runtime limitations (CPU, memory) vs infrastructure simplicity.

**(d) ADR 017 — RSC Deferral**: Why React Server Components are deferred to Phase 3+. Document: TanStack Start does not yet support RSC (as of May 2026); RSC migration requires architectural changes to the component tree; current SSR + client‑side hydration pattern is sufficient for Phase 0–2; and the trigger criteria for re‑evaluation (TanStack Start RSC stable, measurable bundle size benefit).

**Storage**: All ADRs go in `docs/adr/`. Number sequentially continuing from the existing ADRs (012, 018, 019, 020, 021, 022, 023).

**Research Findings (2026‑05‑06):**
- ADR template: problem statement, options, decision, tradeoffs, confidence, status. 
- Store ADRs in `docs/adr/` in the source repository. 
- Keep ADRs short — single page each. 
- Append‑only log — don't edit accepted records; supersede them. 

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (foundation decisions made)

**Blocks:** [N/A]

**Related Files:**
- `docs/adr/013-auth-system.md` (new)
- `docs/adr/014-database-strategy.md` (new)
- `docs/adr/015-hosting-platform.md` (new)
- `docs/adr/017-rsc-deferral.md` (new)

**Definition of Done**
- [ ] `docs/adr/013-auth-system.md` created: problem, options (Better Auth vs Auth.js vs Clerk vs Supabase Auth), decision, tradeoffs
- [ ] `docs/adr/014-database-strategy.md` created: problem, options (Neon vs PlanetScale vs Supabase vs Turso), decision, tradeoffs
- [ ] `docs/adr/015-hosting-platform.md` created: problem, options (Cloudflare Workers vs Vercel vs Fly.io vs AWS), decision, tradeoffs
- [ ] `docs/adr/017-rsc-deferral.md` created: problem, decision to defer, trigger criteria for re‑evaluation
- [ ] All ADRs have status "Accepted" and include confidence level
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- ADRs for decisions not yet made (Phase 2+ architecture)
- Retroactive ADRs for past decisions before the project started
- Exhaustive evaluation of every possible alternative (focus on the top 3–4)

**Rules to Follow**
- Each ADR must be self‑contained — a reader should not need to read other ADRs to understand the decision.
- All ADRs must be dated and include the author.
- Use the standard template consistently across all ADRs.
- Status must be one of: Proposed, Accepted, Deprecated, Superseded.

**Verification**
```bash
ls docs/adr/013-auth-system.md
ls docs/adr/014-database-strategy.md
ls docs/adr/015-hosting-platform.md
ls docs/adr/017-rsc-deferral.md
# Manual: review each ADR for completeness and correct template
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (documentation)

---

#### Subtasks

- [ ] P0-DX-7.0.25 (AGENT): Read existing ADRs in `docs/adr/` for template consistency. Review technology choices made in Phase 0.
  **Verification:** Template and context understood.

- [ ] P0-DX-7.1 (AGENT): Write `docs/adr/013-auth-system.md`.
  **File(s):** `docs/adr/013-auth-system.md` (new)
  **Verification:** ADR follows template; decision clear.

- [ ] P0-DX-7.2 (AGENT): Write `docs/adr/014-database-strategy.md` and `docs/adr/015-hosting-platform.md`.
  **File(s):** `docs/adr/014-database-strategy.md`, `docs/adr/015-hosting-platform.md` (new)
  **Verification:** Both ADRs follow template.

- [ ] P0-DX-7.3 (AGENT): Write `docs/adr/017-rsc-deferral.md`.
  **File(s):** `docs/adr/017-rsc-deferral.md` (new)
  **Verification:** ADR follows template; trigger criteria specified.

- [ ] P0-DX-7.4 (HUMAN): Review all four ADRs for accuracy and completeness. Approve.
  **Verification:** Approved.

---

### [ ] P0-DX-8: Add pre‑commit hooks (Husky + lint‑staged) and enforce test coverage thresholds in CI

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** P0‑FOUND‑3 established unified ESLint and Prettier configurations. However, linting and formatting are only checked in CI — there are no local pre‑commit hooks to catch issues before they're pushed. Developers can commit and push code with lint violations or type errors, wasting CI minutes and slowing feedback loops. No test coverage thresholds are enforced.
**Size:** Medium

**Description:**
Set up local pre‑commit and pre‑push hooks using Husky v9+ and lint‑staged, plus enforce test coverage thresholds in Vitest configurations.

**(a) Husky installation**: `pnpm add -D husky lint-staged` → `npx husky init`. This creates a `.husky/` directory with a `pre-commit` hook script. Add a `prepare` script to root `package.json`: `"prepare": "husky"`.

**(b) Pre‑commit hook**: Configure `.husky/pre-commit` to run `npx lint-staged`. Configure lint‑staged in `package.json` (or `.lintstagedrc`):
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```
Pre‑commit must be fast — lint‑staged only processes staged files, not the entire project.

**(c) Pre‑push hook**: Configure `.husky/pre-push` to run the full type‑check: `pnpm run typecheck`. This prevents pushes with type errors. Full type‑check is slower but acceptable for pre‑push (pre‑commit must be fast; pre‑push can be thorough). Optionally run `pnpm test` for the affected packages.

**(d) Test coverage thresholds**: Add coverage thresholds to `vitest.config.ts` (or package‑level vitest configs):
```typescript
test: {
  coverage: {
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
}
```
The 80% threshold is the 2026 consensus — "test the important stuff, skip the trivial getters." Below 60% indicates insufficient testing; above 85% incentivizes gaming the metric. Core modules (CRM, auth) should aim for higher thresholds (85–90%).

**(e) CI enforcement**: Update `.github/workflows/ci.yml` to run `pnpm test -- --coverage` and enforce thresholds. The Vitest thresholds config causes `vitest` to exit non‑zero if coverage drops below the minimum.

**(f) Escape hatch**: Document that `--no-verify` bypasses hooks in emergencies, but this should be discouraged in `CONTRIBUTING.md`.

**Research Findings (2026‑05‑06):**
- Husky v9+ uses `.husky/` directory with simple shell scripts. `npx husky init` sets it up. 
- `prepare: "husky"` in `package.json` ensures hooks installed after `pnpm install`. 
- lint‑staged pattern: `{ "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }`. 
- Pre‑commit fast (lint‑staged), pre‑push thorough (full type‑check). 
- 80% coverage threshold is the pragmatic 2026 target. 
- Vitest `coverage.thresholds` exits non‑zero when thresholds breached. 

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-3` (ESLint and Prettier configured)

**Blocks:** [N/A]

**Related Files:**
- `.husky/pre-commit` (new)
- `.husky/pre-push` (new)
- `package.json` (add `prepare` script, `lint-staged` config)
- `vitest.config.ts` or package‑level vitest configs (add thresholds)
- `.github/workflows/ci.yml` (add coverage enforcement)

**Definition of Done**
- [ ] `husky` and `lint-staged` installed as devDependencies
- [ ] `.husky/pre-commit` runs `npx lint-staged` on staged files
- [ ] `.husky/pre-push` runs `pnpm run typecheck`
- [ ] `prepare: "husky"` in root `package.json`
- [ ] `lint-staged` config covers `*.{ts,tsx}` and `*.{json,md,css}`
- [ ] Coverage thresholds (lines: 80%, functions: 80%, branches: 75%, statements: 80%) added to Vitest config
- [ ] CI enforces coverage thresholds (build fails if coverage drops)
- [ ] `CONTRIBUTING.md` updated with hook bypass instructions
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Commitlint for commit message validation (can be added later)
- Secret detection in pre‑commit (separate tooling)
- Branch‑specific coverage thresholds

**Rules to Follow**
- Pre‑commit must complete in under 5 seconds — only process staged files.
- Pre‑push can take up to 60 seconds — full type‑check is acceptable.
- Never force hooks on contributors who explicitly bypass with `--no-verify`.
- Coverage thresholds should be achievable — verify current coverage level before setting thresholds.

**Verification**
```bash
# Test pre-commit hook
echo "const x = 1" >> apps/web/src/test.ts
git add apps/web/src/test.ts
git commit -m "test"
# Expected: pre-commit runs lint-staged, fixes formatting

# Test pre-push hook
echo "const x: number = 'string'" >> apps/web/src/test.ts
git add apps/web/src/test.ts && git commit -m "test"
git push
# Expected: pre-push runs typecheck, fails

# Test coverage enforcement
pnpm test -- --coverage
# Verify thresholds are checked

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a contributor, I want lint and type errors caught before I push code so that CI feedback is faster and I don't waste time fixing issues that could have been caught locally.

---

#### Subtasks

- [ ] P0-DX-8.0.25 (AGENT): Read current linting/formatting setup from P0‑FOUND‑3. Research Husky v9+, lint‑staged, and Vitest coverage thresholds.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DX-8.1 (AGENT): Install `husky` and `lint-staged`, initialize Husky.
  **File(s):** `package.json`, `.husky/pre-commit` (new)
  **Verification:** `.husky/` directory created; `prepare` script present.

- [ ] P0-DX-8.2 (AGENT): Configure pre‑commit hook with lint‑staged and pre‑push hook with type‑check.
  **File(s):** `.husky/pre-commit`, `.husky/pre-push` (new)
  **Verification:** Hooks run on commit and push.

- [ ] P0-DX-8.3 (AGENT): Add `lint-staged` config to `package.json`.
  **File(s):** `package.json`
  **Verification:** Staged files processed on commit.

- [ ] P0-DX-8.4 (AGENT): Add coverage thresholds to Vitest config.
  **File(s):** `vitest.config.ts` or package‑level configs
  **Verification:** `pnpm test -- --coverage` enforces thresholds.

- [ ] P0-DX-8.5 (AGENT): Update CI workflow to enforce coverage thresholds.
  **File(s):** `.github/workflows/ci.yml`
  **Verification:** CI fails when coverage drops below thresholds.

- [ ] P0-DX-8.6 (AGENT): Update `CONTRIBUTING.md` with hook instructions.
  **File(s):** `CONTRIBUTING.md`
  **Verification:** Hook usage and bypass documented.

- [ ] P0-DX-8.7 (HUMAN): Test pre‑commit and pre‑push hooks, verify CI coverage enforcement. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑DX group are covered.*

---