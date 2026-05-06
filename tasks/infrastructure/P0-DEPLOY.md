# tasks/infrastructure/P0-DEPLOY.md – Deployment & CI/CD

This file covers GitHub Actions setup for basic staging deployment using `cloudflare/wrangler-action@v4` with environment‑specific variables, Cloudflare Workers Builds configuration for automatic build and deploy on push to `main` with preview deployments for PR branches, and the environment strategy for staging/production Worker separation. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑DEPLOY (2026‑05‑06)

### 1. The Two CI/CD Paths for Cloudflare Workers in 2026

Cloudflare offers **two distinct CI/CD paths** for Workers deployments. The Cloudflare docs explicitly guide the choice: "Choose Workers Builds if you want a fully integrated solution within Cloudflare's ecosystem that requires minimal setup and configuration for GitHub or GitLab users. We recommend using external CI/CD providers if you have a self-hosted instance of GitHub or GitLab, or you are using a Git provider that is not GitHub or GitLab."

**Workers Builds** (Native CI/CD):
- Connect a GitHub or GitLab repository in the Cloudflare dashboard → Settings → Builds
- Automatically builds and deploys on every push to selected branches
- Generates preview URLs per branch (e.g., `<branch-name>-<worker-name>.<subdomain>.workers.dev`)
- Automatic PR comments with preview links
- Zero configuration for framework detection via autoconfig
- "removing the need for manual wrangler deploy commands"
- Build caching and Watch Paths for monorepo speed (2026‑02‑24)

**GitHub Actions** (External CI/CD):
- Official `cloudflare/wrangler-action@v4` for deployment
- "improved caching, faster deployments" (January 2025 update)
- Secrets support with `vars` and `secrets` parameters
- Full control over build pipeline (lint → test → build → deploy)
- Multi‑environment support via environment‑specific workflow files

### 2. The Staging/Production Environment Strategy

The 2026 consensus for Worker environment separation follows a standard pattern:

**Wrangler configuration**: A default (top‑level) environment serves as **staging** — the safe default where bare `wrangler deploy` goes. A named `[env.production]` block contains production‑specific bindings, routes, and secrets. Production deployment requires the explicit `--env production` flag, preventing accidental production deploys.

**From the crane‑console ADR 026 (locked 2026‑02‑12)**: "Add `[env.production]` blocks to each worker so that bare wrangler deploy targets staging (safe default) and wrangler deploy --env production targets prod." Worker naming follows the suffixed convention (`*-staging`). Production promotion uses manual workflow dispatch with GitHub environment protection rules.

**Secrets separation**: Each environment gets its own secrets via `wrangler secret put <NAME> --env production`. Per‑environment `.env` files (`.env.staging`, `.env.production`) are loaded automatically by Wrangler when `--env` is specified. The `wrangler types` command (v4.60.0+) now generates per‑environment TypeScript interfaces.

### 3. Official Deployment GitHub Action — `wrangler-action@v4`

The `cloudflare/wrangler-action@v4` marketplace action is the official deployment tool. Key configuration:

- **API token**: A Cloudflare API token with "Edit Cloudflare Workers" permission, scoped to the specific account. Stored as `CLOUDFLARE_API_TOKEN` in GitHub secrets, along with `CLOUDFLARE_ACCOUNT_ID`
- **Deploy command**: `wrangler deploy` (default), or `wrangler deploy --env staging` for environment‑specific deploys
- **Secrets passthrough**: The action supports `secrets` and `vars` parameters for passing environment‑specific variables at deploy time
- **⚠️ Node.js deprecation**: `wrangler-action@v3` runs on Node.js 20, which GitHub Actions will force to Node.js 24 starting June 2, 2026 (Node.js 20 removed September 16, 2026). `wrangler-action@v4` should be used to avoid forced migration mid‑year

### 4. Preview Deployments for PR Branches

Both CI/CD paths support per‑PR preview URLs:

**Workers Builds**: Each branch automatically gets a preview URL in the format `<branch-name>-<worker-name>.<subdomain>.workers.dev`. This URL is posted as a PR comment and regenerated on every push to the branch.

**GitHub Actions**: Using `wrangler deploy --env preview` with a separate preview route or environment. The preview URL can be extracted from `wrangler versions list` output and posted as a PR comment via GitHub Script action. A common issue: PR preview deployments persist after PR close — a cleanup job must delete the preview deployment when the PR is closed or merged. "PR deployments currently go straight to production. There is no staging/preview URL to verify changes before they hit the live site." This is the exact scenario for UBOS's current state.

### 5. Gradual Deployments (Blue‑Green Canary)

Wrangler v4 supports gradual deployments for production rollouts:
- `wrangler versions upload` — uploads a new version without deploying it
- `wrangler versions deploy` — creates a split deployment between two versions, with configurable traffic percentages (e.g., 10% new, 90% old)
- Monitor error rates and roll back if issues are detected
- Progressively increase the new version to 100%
- This is recommended for production deployments to reduce risk, but can be added as a Phase 2 enhancement

### 6. Cloudflare Workers Best Practices (2026‑02‑15)

From the official Changelog: "A new Workers Best Practices guide provides opinionated recommendations for building fast, reliable, observable, and secure Workers." Key practices relevant to deployment:
- **Enable Workers Logs and Traces** before deploying to production — "Configure observability before deploying to production so you have data when you need to debug"
- **Generate binding types** with `wrangler types` — "Never hand-write your Env interface. Let Wrangler generate it from your actual configuration to catch mismatches at compile time"
- **Use bindings, not REST APIs** for Cloudflare services — "direct, in-process references with no network hop and no authentication overhead"
- **Keep your compatibility date current** and enable `nodejs_compat`
- **Use Queues and Workflows** for background work — move long‑running tasks out of the request path
- **Avoid global mutable state** — Workers reuse isolates; storing request‑scoped data in module‑level variables causes cross‑request data leaks

---

## Task Definitions

### [ ] P0-DEPLOY-1: Set up GitHub Actions for basic staging deployment using `cloudflare/wrangler-action@v4` with environment‑specific variables

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No GitHub Actions deployment workflow exists. `apps/web/wrangler.jsonc` has a `[env.production]` section from P0‑SHELL‑2 but no `[env.staging]` section. No Cloudflare API token or account ID are stored as GitHub secrets. Deployments are fully manual via `wrangler deploy` from a developer's machine.
**Size:** Medium

**Description:**
Create the staging deployment CI/CD pipeline using GitHub Actions and the official `cloudflare/wrangler-action@v4`. The pipeline automates: check out code, set up pnpm + Node.js 22+, install dependencies, run lint and type‑check, build the Worker, and deploy to the staging environment.

**(a) Required GitHub secrets**:
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID from the Workers dashboard URL
- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with "Edit Cloudflare Workers" permission, scoped to the project's account. Create via Cloudflare Dashboard → Account API Tokens → Custom Token → Edit Cloudflare Workers

**(b) Staging environment setup in `wrangler.jsonc`**: Add a `[env.staging]` block to `apps/web/wrangler.jsonc`:
```jsonc
{
  "name": "ubos-staging",
  "env": {
    "staging": {
      "name": "ubos-staging",
      "vars": {},
      "r2_buckets": [ { "binding": "UBOS_FILES", "bucket_name": "ubos-files-staging" } ]
    },
    "production": {
      "name": "ubos",
      "r2_buckets": [ { "binding": "UBOS_FILES", "bucket_name": "ubos-files-production" } ]
    }
  }
}
```
The top‑level (default) environment becomes staging — bare `wrangler deploy` targets staging, per the locked 2026‑02‑12 industry consensus. Production requires explicit `wrangler deploy --env production`

**(c) GitHub Actions workflow** (`.github/workflows/deploy-staging.yml`):
```yaml
name: Deploy Staging
on:
  push:
    branches: [main]
  workflow_dispatch:  # manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run build
      - name: Deploy to Staging
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/web
          command: deploy
```

**(d) Workflow features**:
- Triggers on push to `main` (automatic staging deployment)
- Supports manual trigger via `workflow_dispatch` for testing
- Runs lint and type‑check before building to catch issues early
- Uses `--frozen-lockfile` for deterministic installs
- Deploys via `wrangler-action@v4` which provides "improved caching, faster deployments" compared to v3

**(e) Documentation**: Create `docs/deployment/workflows.md` describing the CI/CD setup, how to trigger manual deploys, how to view deploy logs, and how staging credentials were created.

**Research Findings (2026‑05‑06):**
- `cloudflare/wrangler-action@v4` is the latest official GitHub Action
- `wrangler-action@v3` runs on Node.js 20 which will be force‑migrated to Node.js 24 by June 2, 2026 — use v4 to avoid this
- Staging as default (bare `wrangler deploy`) is the locked industry standard for safe‑by‑default deployments
- `wrangler types` generates per‑environment TypeScript interfaces — run as a post‑deploy step or in CI
- Best practice: "Enable Workers Logs and Traces — Configure observability before deploying to production"

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc exists)
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-3` (linting configured)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1` (Vite build configured)

**Blocks:**
- `tasks/infrastructure/P0-DEPLOY.md → P0-DEPLOY-2` (production deployment)

**Related Files:**
- `.github/workflows/deploy-staging.yml` (new)
- `apps/web/wrangler.jsonc` (add `[env.staging]` block)
- `docs/deployment/workflows.md` (new)

**Definition of Done**
- [ ] `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` added as GitHub repository secrets
- [ ] `[env.staging]` block added to `apps/web/wrangler.jsonc` with staging‑specific name and bindings
- [ ] Default (top‑level) environment is staging — bare `wrangler deploy` deploys to staging
- [ ] `.github/workflows/deploy-staging.yml` created with all steps: checkout → pnpm setup → install → lint → typecheck → build → deploy
- [ ] Workflow triggers on push to `main` and manual `workflow_dispatch`
- [ ] Successful staging deployment verified (Worker URL returns the application)
- [ ] `docs/deployment/workflows.md` created documenting the CI/CD setup
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Production deployment (P0‑DEPLOY‑2)
- Preview deployments for PR branches (P0‑DEPLOY‑2)
- Gradual deployments (traffic splitting) — Phase 2 enhancement
- Smoke tests after deployment (separate testing workflow)
- Workers Logs configuration in CI (done via `wrangler.jsonc` `observability` block)

**Rules to Follow**
- API token must be scoped to the minimum necessary permissions — "Edit Cloudflare Workers" only, scoped to the specific account.
- Staging is the safe default — bare `wrangler deploy` must never touch production.
- `wrangler-action@v4` must be used (not v3) to avoid the Node.js 20→24 forced migration in June 2026.
- Secrets must never appear in workflow file output or logs — `wrangler-action@v4` handles this automatically.

**Verification**
```bash
# Verify staging deployment
# Push to main → workflow triggers
# Check GitHub Actions → Deploy Staging → successful

# Verify staging Worker responds
curl https://ubos-staging.<subdomain>.workers.dev/api/health

# Verify production is NOT affected
curl https://ubos.<subdomain>.workers.dev/api/health
# Should still be the old version (not updated by staging deploy)

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a developer, when I merge code to main, I want it automatically deployed to a staging environment so I can verify my changes before they reach production.
- Deep Module: The deployment workflow encapsulates the complexity of Cloudflare authentication, pnpm monorepo dependency management, and environment‑aware Wrangler commands behind a single GitHub Actions workflow file.

---

#### Subtasks

- [ ] P0-DEPLOY-1.0.25 (AGENT): Read current `apps/web/wrangler.jsonc` from P0‑SHELL‑2. Research `cloudflare/wrangler-action@v4` API and GitHub Actions workflow syntax.
  **Verification:** Configuration and action API understood.

- [ ] P0-DEPLOY-1.0.5 (AGENT): Research staging/production environment separation best practices for Wrangler v4.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DEPLOY-1.1 (AGENT): Add `[env.staging]` block to `wrangler.jsonc` with staging name and bindings.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** `[env.staging]` block present; `wrangler deploy` targets staging by default.

- [ ] P0-DEPLOY-1.2 (AGENT): Create `.github/workflows/deploy-staging.yml` with full deployment pipeline.
  **File(s):** `.github/workflows/deploy-staging.yml` (new)
  **Verification:** Workflow file valid; all steps properly ordered.

- [ ] P0-DEPLOY-1.3 (HUMAN): Create Cloudflare API token with "Edit Cloudflare Workers" permission and add to GitHub secrets.
  **Verification:** Secrets visible in GitHub repository settings.

- [ ] P0-DEPLOY-1.4 (AGENT): Trigger workflow via push to main, verify staging deployment.
  **Verification:** Staging Worker responds; application functional at staging URL.

- [ ] P0-DEPLOY-1.5 (AGENT): Write `docs/deployment/workflows.md` documenting CI/CD setup.
  **File(s):** `docs/deployment/workflows.md` (new)
  **Verification:** Document covers workflow structure and trigger instructions.

- [ ] P0-DEPLOY-1.6 (HUMAN): Verify full pipeline: push to main → lint → typecheck → build → deploy → staging Worker live. Approve.
  **Verification:** Approved.

---

### [ ] P0-DEPLOY-2: Configure Cloudflare Workers Builds for automatic build and deploy on push to `main`; preview environments for PR branches

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🟡 Medium
**Current State:** P0‑DEPLOY‑1 provides GitHub Actions‑based CI/CD. However, Cloudflare Workers Builds offers a simpler, integrated alternative that handles: automatic builds on push, per‑branch preview URLs, and PR comment updates — all without maintaining workflow YAML files. Workers Builds has not been evaluated or configured for the UBOS project.
**Size:** Small

**Description:**
Configure Cloudflare Workers Builds as an alternative CI/CD path alongside the GitHub Actions workflow. Workers Builds provides a simplified deployment path with built‑in preview URLs and requires minimal ongoing maintenance.

**(a) Connect repository**: In the Cloudflare Dashboard:
1. Navigate to Workers & Pages → select the staging Worker (`ubos-staging`)
2. Settings → Builds → Connect
3. Select the GitHub repository and branch (`main`)
4. Configure build settings:
   - Build command: `pnpm install --frozen-lockfile && pnpm run build`
   - Deploy command: `npx wrangler deploy` (to staging by default)
   - Working directory: `apps/web`

**(b) Build caching and Watch Paths**: Enable Build Caching and configure Build Watch Paths to the monorepo directories that actually contain Worker source code (`apps/web/src/`, `packages/auth/`, `packages/db/`). This avoids unnecessary rebuilds when only documentation, tests, or other non‑Worker files change. Monorepo support with Watch Paths was released February 24, 2026 and is ideal for UBOS's monorepo structure.

**(c) Preview deployments for PR branches**: Workers Builds automatically creates preview URLs for every branch. The URL format is `<branch-name>-<worker-name>.<subdomain>.workers.dev`. Each push to a PR branch triggers a build and deploys a preview version, with the preview URL posted automatically as a PR comment.

**(d) Preview cleanup**: Configure a cleanup workflow (via GitHub Actions or a Cloudflare Workers Cron Trigger) that deletes preview deployments when PRs are closed or merged. This prevents orphaned preview Workers from accumulating and consuming resources. Per the community issue: "PR preview deployments persist after PR close — add a cleanup job."

**(e) Decision documentation**: Write a short decision note in `docs/deployment/workflows.md` clarifying the relationship between the two CI/CD paths:
- **Workers Builds**: Primary path. Zero‑maintenance, integrated preview URLs, build caching for monorepos. Used for staging deployments and PR previews.
- **GitHub Actions**: Supplementary path. Provides granular control (lint, typecheck, test gating), required for production deployment with manual approval. Used when extra build steps or environment variables are needed.
- Both can coexist — Workers Builds does not conflict with GitHub Actions. "Workers Builds is Cloudflare's native CI/CD system" that complements external CI/CD.

**Research Findings (2026‑05‑06):**
- Workers Builds automatically creates preview URLs per branch
- Build Caching and Watch Paths are available for monorepo optimization since 2026‑02‑24
- Connection: Cloudflare dashboard → Worker → Settings → Builds → Connect repository
- PR preview cleanup is commonly missed — must be explicitly configured
- Workers Builds and GitHub Actions can coexist — they serve different needs
- The native CI/CD "removes the need for manual wrangler deploy commands" and "ensures consistent builds and deployments"

**Depends on:**
- `tasks/infrastructure/P0-DEPLOY.md → P0-DEPLOY-1` (staging environment exists in wrangler.jsonc)

**Blocks:** [N/A]

**Related Files:**
- `docs/deployment/workflows.md` (update with Workers Builds configuration)
- `.github/workflows/preview-cleanup.yml` (new — optional cleanup workflow)

**Definition of Done**
- [ ] UBOS Worker connected to GitHub repository in Cloudflare Dashboard → Builds
- [ ] Build command configured: `pnpm install --frozen-lockfile && pnpm run build` from `apps/web`
- [ ] Build Caching and Watch Paths enabled for monorepo optimization
- [ ] Push to `main` triggers automatic staging deployment via Workers Builds
- [ ] Push to a PR branch triggers preview deployment with preview URL posted as PR comment
- [ ] Preview URLs accessible and functional (application loads at `<branch>-ubos-staging.<subdomain>.workers.dev`)
- [ ] Preview cleanup workflow created (deletes preview deployments on PR close/merge)
- [ ] `docs/deployment/workflows.md` updated documenting both CI/CD paths and their relationship
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Workers Builds for production deployment (production deploys use GitHub Actions with manual approval)
- Automatic project configuration PR from Workers Builds (UBOS already has `wrangler.jsonc`)
- Gradual deployments via Workers Builds (Phase 2 enhancement)

**Rules to Follow**
- Workers Builds must deploy to staging by default — production deployment is via GitHub Actions with manual approval.
- The build command must be idempotent and work from any branch.
- Preview Workers must be cleaned up after PR close — orphaned Workers consume resources.
- Never configure Workers Builds to deploy to production from non‑`main` branches.

**Verification**
```bash
# Verify Workers Builds connection
# Cloudflare Dashboard → Workers → ubos-staging → Settings → Builds → Connected: Yes

# Test automatic staging deployment
# Push a commit to main
# Check Cloudflare Dashboard → Workers → ubos-staging → Deployments → latest build succeeded

# Test preview deployment
# Create a PR with changes
# Verify preview URL posted as PR comment
# Verify application loads at preview URL

# Test preview cleanup
# Close the PR without merging
# Verify preview Worker deleted (or cleanup workflow runs)
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a reviewer, I want every PR to generate a live preview deployment so I can visually verify changes before approving the merge.

---

#### Subtasks

- [ ] P0-DEPLOY-2.0.25 (AGENT): Read current `wrangler.jsonc` and `docs/deployment/workflows.md`. Research Workers Builds configuration and preview deployment behavior.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DEPLOY-2.0.5 (AGENT): Research Build Caching and Watch Paths configuration for pnpm monorepos.
  **Verification:** Build optimization options documented.

- [ ] P0-DEPLOY-2.1 (HUMAN): Connect UBOS Worker to GitHub repository in Cloudflare Dashboard → Builds.
  **Verification:** Repository connected; build settings visible in dashboard.

- [ ] P0-DEPLOY-2.2 (AGENT): Configure build command, build caching, and Watch Paths in Workers Builds settings.
  **Verification:** Configuration applied.

- [ ] P0-DEPLOY-2.3 (AGENT): Trigger a push to `main` — verify automatic staging deployment succeeds via Workers Builds.
  **Verification:** Deploy successful; staging Worker updated.

- [ ] P0-DEPLOY-2.4 (AGENT): Create a test PR — verify preview URL generated, posted as PR comment, and functional.
  **Verification:** Preview URL accessible; application loads.

- [ ] P0-DEPLOY-2.5 (AGENT): Create `.github/workflows/preview-cleanup.yml` for PR close/merge cleanup.
  **File(s):** `.github/workflows/preview-cleanup.yml` (new)
  **Verification:** Preview Worker deleted after PR close.

- [ ] P0-DEPLOY-2.6 (AGENT): Update `docs/deployment/workflows.md` with Workers Builds configuration and CI/CD relationship note.
  **File(s):** `docs/deployment/workflows.md`
  **Verification:** Document covers both CI/CD paths.

- [ ] P0-DEPLOY-2.7 (HUMAN): Verify preview deployment and cleanup pipeline end‑to‑end. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑DEPLOY group are covered.*

---