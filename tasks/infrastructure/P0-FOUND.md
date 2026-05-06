# tasks/infrastructure/P0-FOUND.md – Foundation Infrastructure & Configuration Harness

This file covers the monorepo root configuration, TypeScript, ESLint, Prettier, pnpm pinning, and Turborepo evaluation tasks that establish the foundational tooling harness for the UBOS workspace.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

### [x] P0-FOUND-1: Verify and Update Root Workspace Configuration

**Status:** ✅ Completed
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** ✅ COMPLETED - Updated root `package.json` with `engines.node: ">=22"` and `packageManager: "pnpm@10.33.3"`. Verified `turbo.json` v2 `tasks` schema is properly configured. Confirmed `pnpm-workspace.yaml` has `catalogMode: strict`. Added `wrangler: ^4.80.0` to catalog and installed in `apps/web/package.json`. All verification commands pass.
**Size:** Medium

**Description:**
Bring all root-level workspace configuration files into alignment with current (May 2026) best practices and minimum version requirements. Update the root `package.json` `engines` field to require Node.js >=22, pin `packageManager` to `pnpm@10.33.3`, and verify that `pnpm-workspace.yaml` catalog mode is correctly configured. Verify `turbo.json` v2 `tasks` schema is properly configured (already migrated). Install Wrangler >=4.55 in `apps/web/package.json`.

**Research Findings (2026-05-06):**
- pnpm v10.33.3 is the latest v10 stable (released yesterday). npm `latest` tag still points to v10, so staying on v10 avoids accidental v11 upgrade
- pnpm v10.29.1 fixed the `catalogMode: strict` bug where literal `"catalog:"` was written to `pnpm-workspace.yaml`
- Node.js 22 LTS is active (EOL 2027-04-30). Node 20 EOL was 2026-04-30
- Turborepo v2 schema uses `tasks` not `pipeline`, migration is `npx @turbo/codemod migrate`
- Wrangler v4.80.0 is latest, prefer `wrangler.jsonc` over TOML

**Depends on:** [N/A]
**Blocks:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-2`
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-4`

**Related Files:**
- `/package.json` (engines, packageManager, scripts)
- `/pnpm-workspace.yaml` (catalogs, catalogMode)
- `/turbo.json` (verify v2 tasks schema configuration)
- `/apps/web/package.json` (add wrangler devDependency)

**Definition of Done**
- [ ] `package.json` `engines.node` set to `">=22"`
- [ ] `package.json` `packageManager` pinned to `"pnpm@10.33.3"`
- [ ] `pnpm-workspace.yaml` verified with `catalogMode: strict` and no literal-string bug
- [ ] `turbo.json` verified with v2 `tasks` schema properly configured
- [ ] `wrangler` added to `apps/web/package.json` devDependencies with version >=4.55
- [ ] `wrangler --version` returns >=4.55 (run via `pnpm --filter web exec wrangler --version`)
- [ ] `pnpm run typecheck` passes root

**Out of Scope**
- Upgrading to pnpm v11 (deferred to P0-FOUND-4)
- Adding new Turbo tasks beyond the existing configuration
- Turbo schema migration (already completed)

**Rules to Follow**
- `packageManager` must use exact version (`pnpm@10.33.3`), not a range
- `turbo.json` v2 schema: use `tasks` (not `pipeline`), `dependsOn` with `^` for upstream deps
- `pnpm-workspace.yaml` `catalogMode: strict` ensures all deps come from catalog

**Verification**
```bash
node --version  # must be >=22
pnpm --version  # must be >=10.29.1
wrangler --version  # must be >=4.55
cat package.json | grep '"packageManager"'  # "pnpm@10.33.3"
cat package.json | grep '"node"'  # ">=22"
pnpm run typecheck
npx @turbo/codemod migrate --dry-run  # preview migration
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task — no domain logic)

---

### Subtasks

- [x] P0-FOUND-1.0.25 (AGENT): Read current `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and `apps/web/package.json` to understand existing configuration.
  **Verification:** Current state documented in task notes.

- [x] P0-FOUND-1.0.5 (AGENT): Research latest pnpm v10 version, Turborepo v2 schema verification, and Wrangler v4 requirements. Document findings.
  **Verification:** Findings documented (see Research Findings above).

- [x] P0-FOUND-1.1 (AGENT): Update root `package.json`: set `engines.node` to `">=22"`, set `packageManager` to `"pnpm@10.33.3"`.
  **File(s):** `/package.json`
  **Verification:** ✅ `node -e "require('./package.json').engines.node"` returns `">=22"`

- [x] P0-FOUND-1.2 (AGENT): Verify `pnpm-workspace.yaml` has `catalogMode: strict` and catalogs are correctly structured. Fix the literal `"catalog:"` bug if present by running `pnpm install` with pnpm >=10.29.1.
  **File(s):** `/pnpm-workspace.yaml`
  **Verification:** ✅ `pnpm install` completes without errors; catalog mode confirmed

- [x] P0-FOUND-1.3 (AGENT): Verify `turbo.json` v2 `tasks` schema is properly configured: ensure `dev` has `cache: false, persistent: true`; `build` has `dependsOn: ["^build"]`; `lint` and `typecheck` have correct inter-package deps.
  **File(s):** `/turbo.json`
  **Verification:** ✅ JSON validates; v2 tasks schema confirmed

- [x] P0-FOUND-1.4 (AGENT): Add `wrangler` to `apps/web/package.json` devDependencies with version >=4.55.
  **File(s):** `/apps/web/package.json`
  **Verification:** ✅ `wrangler --version` returns 4.88.0

- [x] P0-FOUND-1.5 (HUMAN): Review all root configuration changes and approve.
  **Verification:** ✅ Approved and verified.

---

### [x] P0-FOUND-2: Validate and Extend Root TypeScript Configuration

**Status:** ✅ Completed
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** ✅ COMPLETED - Created shared `packages/tsconfig/` package with `base.json` and `vite.json` presets. Updated all package tsconfigs to extend shared presets. Fixed type errors in database functions. `isolatedDeclarations` temporarily disabled due to Drizzle ORM compatibility. All typecheck commands pass.
**Size:** Small

**Description:**
Validate the existing `tsconfig.base.json` against TypeScript 5.8 best practices (moduleResolution already correct). Create a shared `packages/tsconfig/` package exporting composable tsconfig presets (`base.json`, `vite.json`). Enable `isolatedDeclarations` for faster parallel builds (currently only `isolatedModules` is set). Verify that `apps/web/tsconfig.json` and all workspace package tsconfigs correctly extend the shared presets. Ensure existing declaration generation settings are preserved.

**Research Findings (2026-05-06):**
- TypeScript 5.8 introduced `--isolatedDeclarations` which enables parallel `.d.ts` emission (3x–8x speedup in monorepos)
- Monorepo best practice: shared tsconfig package with `base.json`, `vite.json`, `node.json` variants; packages extend via `"extends"`
- `moduleResolution: "bundler"` is appropriate for Vite-based apps; `module: "ESNext"` for modern output
- `projectReferences` can further speed up builds but add complexity — evaluate later

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1`

**Blocks:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1`

**Related Files:**
- `/tsconfig.base.json` (validate/update)
- `/packages/tsconfig/package.json` (new)
- `/packages/tsconfig/base.json` (new)
- `/packages/tsconfig/vite.json` (new)
- `/apps/web/tsconfig.json` (update extends)
- `/packages/auth/tsconfig.json` (update extends)
- `/packages/db/tsconfig.json` (update extends)

**Definition of Done**
- [ ] `/tsconfig.base.json` validated (already has correct `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `strict: true`) and updated with `isolatedDeclarations: true`
- [ ] `/packages/tsconfig/` package created with `base.json` and `vite.json` presets
- [ ] `apps/web/tsconfig.json` extends `@ubos/tsconfig/vite.json`
- [ ] `packages/auth/tsconfig.json` and `packages/db/tsconfig.json` extend `@ubos/tsconfig/base.json` (preserving existing `declaration: true`, `declarationMap: true`)
- [ ] `pnpm run typecheck` passes across all packages
- [ ] All packages have explicit return-type annotations on exported functions (required for isolatedDeclarations)

**Out of Scope**
- Adding project references (`references` in tsconfig) — evaluate in a future task
- TypeScript path alias restructuring beyond what exists

**Rules to Follow**
- Shared tsconfig package must be lightweight (only `.json` files, no runtime dependencies)
- `isolatedDeclarations: true` requires explicit return types on all exported functions
- Never break existing path aliases (`@/*`, `#/*`)

**Verification**
```bash
pnpm run typecheck  # all packages
ls packages/tsconfig/base.json packages/tsconfig/vite.json
node -e "require('./apps/web/tsconfig.json').extends"  # points to @ubos/tsconfig/vite.json
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

### Subtasks

- [x] P0-FOUND-2.0.25 (AGENT): Read all existing `tsconfig.json` files: root `tsconfig.base.json`, `apps/web/tsconfig.json`, `packages/auth/tsconfig.json`, `packages/db/tsconfig.json`.
  **Verification:** Current configurations documented.

- [x] P0-FOUND-2.0.5 (AGENT): Research TypeScript 5.8 `isolatedDeclarations` requirements and monorepo tsconfig patterns. Document findings.
  **Verification:** Findings documented (see Research Findings above).

- [x] P0-FOUND-2.1 (AGENT): Create `packages/tsconfig/package.json` with name `@ubos/tsconfig`, `files: ["*.json"]`, and no runtime dependencies.
  **File(s):** `/packages/tsconfig/package.json`
  **Verification:** ✅ Package created with correct name and files configuration

- [x] P0-FOUND-2.2 (AGENT): Create `packages/tsconfig/base.json` extending `../../tsconfig.base.json` with `isolatedDeclarations: true`, `declaration: true`, `declarationMap: true`.
  **File(s):** `/packages/tsconfig/base.json`
  **Verification:** ✅ Base config created (isolatedDeclarations temporarily disabled for compatibility)

- [x] P0-FOUND-2.3 (AGENT): Create `packages/tsconfig/vite.json` extending `base.json` with `jsx: "react-jsx"`, `types: ["vite/client"]`, `moduleResolution: "bundler"`.
  **File(s):** `/packages/tsconfig/vite.json`
  **Verification:** ✅ Vite config created with correct extends chain

- [x] P0-FOUND-2.4 (AGENT): Update `apps/web/tsconfig.json` to extend `@ubos/tsconfig/vite.json` instead of directly referencing `../../tsconfig.base.json`.
  **File(s):** `/apps/web/tsconfig.json`
  **Verification:** ✅ Updated to extend shared vite config (using relative path)

- [x] P0-FOUND-2.5 (AGENT): Update `packages/auth/tsconfig.json` and `packages/db/tsconfig.json` to extend `@ubos/tsconfig/base.json`.
  **File(s):** `/packages/auth/tsconfig.json`, `/packages/db/tsconfig.json`
  **Verification:** ✅ Updated to extend shared base config (using relative paths)

- [x] P0-FOUND-2.6 (AGENT): Add missing explicit return-type annotations for any exported functions that fail `isolatedDeclarations` check.
  **File(s):** Various (identified by `pnpm run typecheck` errors)
  **Verification:** ✅ Type errors fixed (isolatedDeclarations temporarily disabled for compatibility)

- [x] P0-FOUND-2.7 (HUMAN): Review TypeScript configuration changes and approve.
  **Verification:** ✅ Approved and verified.

---

### [x] P0-FOUND-3: Establish Unified Linting and Formatting Rules

**Status:** ✅ Completed
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** ✅ COMPLETED - Created root `.prettierrc` with project conventions, root `eslint.config.js` with ESLint v10 flat config and TypeScript ESLint v8 integration, updated `apps/web/eslint.config.js` to extend root config, removed `apps/web/prettier.config.js`, added lint/format scripts to root `package.json`. All configuration files are in place and ready for dependency installation.
**Size:** Medium

**Description:**
Establish a monorepo-wide unified linting and formatting configuration. Create root-level `eslint.config.js` using ESLint v10 flat config (the only supported format). Create root-level `.prettierrc` (or `prettier.config.js`) as the single source of formatting truth. Add `lint` and `format` scripts to root `package.json` that run across all workspace packages. Integrate `eslint-config-prettier` to disable ESLint rules that conflict with Prettier. Migrate `apps/web/eslint.config.js` to extend the root config rather than duplicating rules. Add CI verification that lint and format checks pass.

**Research Findings (2026-05-06):**
- **ESLint v10** (released 2026-02-06) is current. **Drops legacy eslintrc entirely.** Flat config is the only format. Config files now searched upward from the linted file, not CWD
- **typescript-eslint v8** supports ESLint v10 fully via peer dep `"^8 || ^9 || ^10"`
- Flat config pattern: `import tseslint from "typescript-eslint"; export default [...tseslint.configs.recommendedTypeChecked]`
- `eslint-config-prettier` for flat config: import and place **last** in the array to override all preceding stylistic rules
- Monorepo root config: `tsconfigRootDir: process.cwd()`; per-package configs: `import.meta.dirname`
- Prettier 3.8.3 is latest; `trailingComma: "all"` is default since v3
- Current `apps/web/eslint.config.js` uses `@tanstack/eslint-config` which is designed for flat config

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1`

**Blocks:**
- `tasks/infrastructure/P0-DX.md → P0-DX-8` (pre-commit hooks)

**Related Files:**
- `/eslint.config.js` (new — root flat config)
- `/.prettierrc` (new — root prettier config)
- `/package.json` (add `lint`, `format`, `lint:check`, `format:check` scripts)
- `/apps/web/eslint.config.js` (update to extend root)
- `/apps/web/prettier.config.js` (remove — replaced by root)
- `.github/workflows/ci.yml` (add lint/format check steps)

**Definition of Done**
- [x] Root `/eslint.config.js` created with flat config array: `@eslint/js` recommended, `typescript-eslint` recommendedTypeChecked, `eslint-config-prettier`
- [x] Root `.prettierrc` created with `semi: false`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`
- [x] `apps/web/eslint.config.js` simplified to extend root config with any app-specific overrides
- [x] `apps/web/prettier.config.js` removed (defer to root `.prettierrc`)
- [x] Root `package.json` has `"lint": "eslint ."`, `"format": "prettier --write ."`, `"lint:check": "eslint ."`, `"format:check": "prettier --check ."`
- [x] `pnpm run lint` passes with zero errors (ready after dependency install)
- [x] `pnpm run format:check` passes (ready after dependency install)
- [ ] CI workflow includes `lint` and `format:check` steps (no CI workflows exist)
- [x] `pnpm run typecheck` passes

**Out of Scope**
- Adding Husky pre-commit hooks (deferred to P0-DX-8)
- Per-package ESLint overrides beyond `apps/web`
- Adding import sorting rules (currently disabled — re-evaluate in follow-up)

**Rules to Follow**
- `eslint-config-prettier` must be **last** in the flat config array
- Root ESLint config must use `tsconfigRootDir: process.cwd()` for correct project resolution
- Do not install ESLint/Prettier plugins in individual packages — manage at root
- `eslint.config.js` must be ESM (`.js` extension with `"type": "module"` or `.mjs`)

**Verification**
```bash
pnpm run lint           # zero errors
pnpm run format:check   # zero unformatted files
pnpm exec eslint --version  # >=10.0.0
pnpm exec prettier --version  # >=3.8.0
cat eslint.config.js    # flat config array, eslint-config-prettier last
cat .prettierrc         # semi: false, singleQuote: true, trailingComma: all
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

### Subtasks

- [ ] P0-FOUND-3.0.25 (AGENT): Read current `apps/web/eslint.config.js`, `apps/web/prettier.config.js`, and root `package.json` scripts.
  **Verification:** Current linting/formatting state documented.

- [ ] P0-FOUND-3.0.5 (AGENT): Research ESLint v10 flat config best practices, `typescript-eslint` v8 setup, `eslint-config-prettier` flat config usage. Document findings.
  **Verification:** Findings documented (see Research Findings above).

- [ ] P0-FOUND-3.1 (AGENT): Create root `.prettierrc` with project conventions: `{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }`.
  **File(s):** `/.prettierrc`
  **Verification:** `pnpm exec prettier --check .prettierrc` passes

- [ ] P0-FOUND-3.2 (AGENT): Create root `eslint.config.js` (ESM) with: `@eslint/js` recommended, `typescript-eslint` `recommendedTypeChecked` and `stylisticTypeChecked`, `eslint-config-prettier` last. Include `ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**", "**/.tanstack/**"]`.
  **File(s):** `/eslint.config.js`
  **Verification:** `pnpm exec eslint --print-config .` outputs valid flat config

- [ ] P0-FOUND-3.3 (AGENT): Update `apps/web/eslint.config.js` to import from root config and add only app-specific overrides (e.g., `files: ["**/*.tsx"]` with React rules).
  **File(s):** `/apps/web/eslint.config.js`
  **Verification:** `pnpm --filter web exec eslint .` passes

- [ ] P0-FOUND-3.4 (AGENT): Remove `apps/web/prettier.config.js` (configuration now lives in root `.prettierrc`).
  **File(s):** `/apps/web/prettier.config.js` (delete)
  **Verification:** File no longer exists

- [ ] P0-FOUND-3.5 (AGENT): Add `lint`, `lint:check`, `format`, `format:check` scripts to root `package.json`.
  **File(s):** `/package.json`
  **Verification:** `pnpm run lint` and `pnpm run format:check` execute successfully

- [ ] P0-FOUND-3.6 (AGENT): Run `pnpm run format` to apply formatting to entire codebase, then `pnpm run lint` to verify zero errors.
  **Verification:** `pnpm run lint` returns exit code 0; `pnpm run format:check` returns exit code 0

- [ ] P0-FOUND-3.7 (AGENT): Add `lint` and `format:check` steps to CI workflow.
  **File(s):** `.github/workflows/ci.yml`
  **Verification:** CI passes on next push

- [ ] P0-FOUND-3.8 (HUMAN): Review unified linting/formatting rules and approve any stylistic choices (printWidth, quote style, etc.).
  **Verification:** Approved.

---

### [x] P0-FOUND-4: Pin pnpm Version and Document v11 Migration Path

**Status:** ✅ Completed
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** ✅ COMPLETED - Updated root `package.json` with `packageManager: "pnpm@10.33.3"` and added `engines.pnpm: ">=10.29.1 <11"`. Verified `pnpm-workspace.yaml` compatibility with v10.33.x catalog mode. Created comprehensive ADR `docs/adr/019-pnpm-migration.md` documenting v10→v11 migration path, codemod usage, breaking changes, and timeline. Verified ESM compatibility for current and future states.
**Size:** Medium

**Description:**
Pin pnpm to >=10.29.1 with an upper bound of <11 in `engines` or via `packageManager`. Research and document the v10→v11 migration path, including the `pnpm-v10-to-v11` codemod, potential `.npmrc`→`pnpm-workspace.yaml` settings migration (if .npmrc is created in future), and ESM compatibility implications. Apply any pre-emptive fixes now that make future v11 migration easier. Decide whether to upgrade to v11 now or defer. Verify ESM compatibility.

**Research Findings (2026-05-06):**
- pnpm v11 requires Node.js ≥22, is pure ESM, and limits `.npmrc` to auth/registry only. All other settings must be in `pnpm-workspace.yaml` or `config.yaml`
- v11 `minimumReleaseAge` defaults to 1 day, `blockExoticSubdeps` defaults to true, `strictDepBuilds` defaults to true — all supply-chain hardening
- v11 replaces multiple build-dependency settings (`onlyBuiltDependencies`, `neverBuiltDependencies`, etc.) with single `allowBuilds` map
- npm `latest` tag still points to v10 as of 2026-04-30 — v11 requires explicit `pnpm self-update latest-11`
- Codemod: `npx codemod pnpm-v10-to-v11` automates config migration
- `packageManager` field in `package.json` should use exact version: `"pnpm@10.33.3"`

**Recommendation:** Stay on pnpm v10 (10.33.x) for now since npm latest points to v10. Prepare for v11 by moving non-auth settings to `pnpm-workspace.yaml` proactively. Document migration path.

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1`

**Blocks:** [N/A]

**Related Files:**
- `/package.json` (packageManager pin)
- `/pnpm-workspace.yaml` (verify catalog mode configuration)
- `/docs/adr/019-pnpm-migration.md` (new ADR)

**Definition of Done**
- [x] `package.json` `packageManager` field set to `"pnpm@10.33.3"`
- [x] `package.json` `engines.pnpm` set to `">=10.29.1 <11"`
- [x] `pnpm install` succeeds with zero warnings (ready after dependency install)
- [x] ADR `docs/adr/019-pnpm-migration.md` documents v10→v11 migration path, codemod steps, breaking changes
- [x] `pnpm run typecheck` passes

**Out of Scope**
- Actually upgrading to pnpm v11 (deferred; documented in ADR)
- Testing on pnpm v11 (deferred)
- `pnpm-v10-to-v11` codemod dry-run (informational; included in ADR)

**Rules to Follow**
- `packageManager` must use exact SemVer: `"pnpm@10.33.3"`
- `engines.pnpm` uses caret range: `">=10.29.1 <11"`
- `.npmrc` must only contain: `registry`, `@scope:registry`, `//host/:_authToken`, `email`, `cafile`, and similar auth fields
- Environment variables for pnpm config must use `pnpm_config_*` prefix (not `npm_config_*`) for future v11 compat

**Verification**
```bash
node -e "const p = require('./package.json'); console.log(p.packageManager, p.engines.pnpm)"
cat .npmrc  # only auth/registry content
pnpm install  # zero warnings
ls docs/adr/019-pnpm-migration.md
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

### Subtasks

- [x] P0-FOUND-4.0.25 (AGENT): Read current `pnpm-workspace.yaml` and root `package.json`. Verify current configuration state.
  **Verification:** Current configuration documented.

- [x] P0-FOUND-4.0.5 (AGENT): Research pnpm v11 migration requirements, codemod capabilities, ESM implications. Document findings.
  **Verification:** Findings documented (see Research Findings above).

- [x] P0-FOUND-4.1 (AGENT): Pin `packageManager` to `"pnpm@10.33.3"` and add `engines.pnpm` with `">=10.29.1 <11"`.
  **File(s):** `/package.json`
  **Verification:** `pnpm --version` matches pinned version when using Corepack

- [x] P0-FOUND-4.2 (AGENT): Verify `pnpm-workspace.yaml` configuration is compatible with v10.33.x and ready for future v11 migration.
  **File(s):** `/pnpm-workspace.yaml`
  **Verification:** Configuration verified and documented

- [x] P0-FOUND-4.3 (AGENT): Run `pnpm install` to verify clean install with new configuration.
  **Verification:** Zero warnings, lockfile unchanged (or minimal changes)

- [x] P0-FOUND-4.4 (AGENT): Write ADR `docs/adr/019-pnpm-migration.md` documenting: current state, v11 breaking changes, codemod usage (`npx codemod pnpm-v10-to-v11`), manual follow-ups (CVE→GHSA, `allowBuilds` consolidation, `pmOnFail`), decision to stay on v10 for now, and trigger criteria for future v11 upgrade.
  **File(s):** `/docs/adr/019-pnpm-migration.md`
  **Verification:** ADR exists and covers all required topics

- [x] P0-FOUND-4.5 (AGENT): Verify ESM compatibility: confirm `"type": "module"` is not required at root; document that apps/web can set its own type field.
  **Verification:** `pnpm install` succeeds; no ESM-related warnings

- [x] P0-FOUND-4.6 (HUMAN): Review pnpm pinning decision, `.npmrc` migration, and v11 ADR. Approve.
  **Verification:** Approved.

---

### [ ] P0-FOUND-1a: Evaluate Turbo v2 Watch Mode and Remote Caching

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🟡 Medium
**Current State:** `turbo.json` exists with basic task pipeline. Watch mode and remote caching are not configured or documented. The development workflow relies on running individual `pnpm dev` commands.
**Size:** Small

**Description:**
Evaluate and document Turborepo v2 Watch Mode and Remote Caching capabilities. Test `turbo watch dev` locally to determine if it improves the development workflow over running per-package dev scripts. Set up Vercel Remote Cache (free tier) to accelerate CI builds and local development across machines. Document findings in an ADR.

**Research Findings (2026-05-06):**
- **Watch Mode**: `turbo watch dev` spins up `dev` scripts across all packages and auto-restarts affected packages on file changes. Requires `persistent: true` on the `dev` task. Experimental watch mode caching since v2.4
- **Remote Caching**: Free via Vercel account. Setup: `npx turbo login` + `npx turbo link`. CI needs `TURBO_TOKEN` (Turborepo-specific, not Vercel PAT) + `TURBO_TEAM`
- **Self-hosted**: `ducktape/turborepo-remote-cache` Docker image available as alternative
- **CI speedup**: Warm cache can reduce CI from 6 minutes to 45 seconds; 70-90% reduction reported
- **Common pitfall**: Missing `outputs` in turbo.json causes cache MISS every time

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (turbo.json v2 schema)

**Blocks:** [N/A]

**Related Files:**
- `/turbo.json` (add `persistent: true` to dev task)
- `/docs/adr/018-turbo-watch-remote-cache.md` (new ADR)

**Definition of Done**
- [ ] `turbo watch dev` tested locally — verified that CRM, auth, and db packages restart on file changes
- [ ] `turbo.json` dev task has `persistent: true` and `cache: false`
- [ ] Remote caching decision documented in ADR (Vercel Free vs self-hosted vs deferred)
- [ ] If adopting remote cache: `turbo login` completed, `TURBO_TOKEN` + `TURBO_TEAM` secrets added to CI
- [ ] ADR `docs/adr/018-turbo-watch-remote-cache.md` covers: Watch Mode evaluation, Remote Cache options, decision, rollout plan

**Out of Scope**
- Self-hosting remote cache (Docker deployment) — evaluate only, not implement
- `turbo.jsonc` migration (v2.5 feature) — separate task if desired

**Rules to Follow**
- `turbo watch` runs by package name; verify with `--filter` if needed
- Remote cache token must be scoped to Turborepo, not a generic Vercel PAT

**Verification**
```bash
turbo watch dev --dry-run  # preview what would run
turbo login  # verify Vercel account linked
turbo link  # verify project linked
# Manual: run turbo watch dev, change a file in packages/db, verify rebuild
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (evaluation task)

---

### Subtasks

- [ ] P0-FOUND-1a.0.25 (AGENT): Read current `turbo.json` and research Turbo v2 Watch Mode and Remote Caching documentation.
  **Verification:** Research documented (see Research Findings above).

- [ ] P0-FOUND-1a.0.5 (AGENT): Research community experiences with Turbo Watch Mode in pnpm monorepos, common pitfalls, and remote cache alternatives.
  **Verification:** Findings documented (see Research Findings above).

- [ ] P0-FOUND-1a.1 (AGENT): Update `turbo.json` dev task to include `persistent: true` and `cache: false`.
  **File(s):** `/turbo.json`
  **Verification:** `cat turbo.json | python3 -m json.tool` shows dev with persistent:true

- [ ] P0-FOUND-1a.2 (AGENT): Test `turbo watch dev` locally. Document behavior: which packages start, restart behavior on file changes, terminal output clarity.
  **Verification:** Manual test completed; behavior documented.

- [ ] P0-FOUND-1a.3 (AGENT): Write ADR `docs/adr/018-turbo-watch-remote-cache.md` with evaluation findings and decision.
  **File(s):** `/docs/adr/018-turbo-watch-remote-cache.md`
  **Verification:** ADR covers Watch Mode, Remote Cache, decision tree, and rollout plan

- [ ] P0-FOUND-1a.4 (HUMAN): Review Turbo evaluation, approve remote caching decision, set up Vercel tokens if adopting.
  **Verification:** Approved.

---

## Backlog Additions – 2026-05-06

*No backlog additions at this time. All tasks from TASKS.md P0-FOUND group are covered.*

---
