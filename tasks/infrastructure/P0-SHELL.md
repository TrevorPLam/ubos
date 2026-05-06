# tasks/infrastructure/P0-SHELL.md – TanStack Start Runtime & Visual Shell

This file covers the verification and hardening of the Vite build pipeline (TanStack Start, Cloudflare Workers, Tailwind CSS v4), client/server entry points, security headers, route layout consolidation, shell components (sidebar/header/layout), and React Compiler enablement. All tasks are version‑pinned against the live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

### [ ] P0-SHELL-1: Audit and finalize Vite build configuration

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🔴 Critical  
**Current State:** `apps/web/vite.config.ts` exists and uses the TanStack Start plugin, Tailwind CSS v4 plugin, React plugin, and tsconfig paths resolution. However, it may be missing newer TanStack Start conventions (e.g., the unified DevTools plugin vs. standalone RouterDevtools, FOUC prevention via THEME_INIT_SCRIPT) and may not yet include the React Compiler Babel plugin or `@cloudflare/vite-plugin`. The configuration has not been audited against the current `@tanstack/react-start` v0.62.x.  
**Size:** Medium

**Description:**
Audit `apps/web/vite.config.ts` against the latest TanStack Start template (v0.62+, March 2026). Ensure all required Vite plugins are present and properly ordered: `@vitejs/plugin-react` (with optional Babel compiler), `tailwindcss` v4, `tsconfig-paths`, `@cloudflare/vite-plugin` (if Cloudflare), and TanStack Start. Remove any deprecated plugins (standalone RouterDevtools). Verify that the `app.config.ts` or equivalent defines server entry correctly. Check that the Vite `define` for `THEME_INIT_SCRIPT` is present to prevent a flash of unstyled content in dark mode.

**Research Findings (2026‑05‑06):**
- TanStack Start template (2026‑03‑04) now uses a single `TanStackDevtools` component with plugins—standalone RouterDevtools is deprecated.
- A `THEME_INIT_SCRIPT` constant should be injected via Vite `define` to inline an anti‑FOUC script in the HTML.
- The React plugin can optionally include `babel-plugin-react-compiler` (see P0‑SHELL‑8).
- Cloudflare integration requires `@cloudflare/vite-plugin` in the Vite config to emulate bindings locally.

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-2`

**Blocks:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2`
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-3`
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-8`

**Related Files:**
- `apps/web/vite.config.ts`
- `apps/web/app.config.ts` (if it exists or needs creation)
- `apps/web/src/styles.css` (for FOUC script reference)

**Definition of Done**
- [ ] `vite.config.ts` includes plugins: `tanstackStart()`, `tailwindcss()`, `react()` (with babel option for compiler if opted), `tsconfigPaths()`, `cloudflare()` (if Cloudflare target)
- [ ] Deprecated `TanStackRouterDevtools` import removed from anywhere in the config or app
- [ ] `define` includes `THEME_INIT_SCRIPT` constant (inline `<script>` to set `document.documentElement.classList` for dark mode)
- [ ] `app.config.ts` (or equivalent) specifies `server.entry` as `.output/server/index.mjs` and `assets` as `.output/public`
- [ ] Running `pnpm dev` starts without Vite configuration errors
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Adding React Compiler (separate task P0‑SHELL‑8)
- Full Cloudflare bindings emulation (P0‑SHELL‑2)
- SSR security headers (P0‑SHELL‑5)

**Rules to Follow**
- Vite plugins order: React → TanStack Start → Cloudflare → Tailwind → tsconfig paths (or as recommended)
- Do not remove any existing working aliases without verifying they are not in use
- FOUC script must be minimal and inlined (no external requests)

**Verification**
```bash
cd apps/web && pnpm dev
# Check browser: no flash of wrong theme on reload
# Check terminal: no deprecation warnings about RouterDevtools
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

#### Subtasks

- [ ] P0-SHELL-1.0.25 (AGENT): Read current `apps/web/vite.config.ts`, `apps/web/app.config.ts` (if any), and compare with latest `@tanstack/create` template (v0.62+).
  **Verification:** Current discrepancies documented.

- [ ] P0-SHELL-1.0.5 (AGENT): Research the latest TanStack Start Vite plugin list, required `define` constants, and Cloudflare integration requirements.
  **Verification:** Research documented in this task’s Description.

- [ ] P0-SHELL-1.1 (AGENT): Audit existing plugins; remove any deprecated standalone `TanStackRouterDevtools`; add `TanStackDevtools` with plugins if missing.
  **File(s):** `apps/web/vite.config.ts`
  **Verification:** `pnpm dev` starts with no deprecation warnings.

- [ ] P0-SHELL-1.2 (AGENT): Add `THEME_INIT_SCRIPT` define and corresponding inline script in the root HTML entry (or via `app.config.ts`).
  **File(s):** `apps/web/vite.config.ts`, `apps/web/app.config.ts`
  **Verification:** In Chrome DevTools, reload the app in dark mode; no flash of light background.

- [ ] P0-SHELL-1.3 (AGENT): Verify server output configuration: ensure `vite.config.ts` or `app.config.ts` points server entry to `.output/server/index.mjs` and public assets to `.output/public`.
  **File(s):** `apps/web/vite.config.ts` / `app.config.ts`
  **Verification:** After build: `ls apps/web/.output/server/index.mjs` exists.

- [ ] P0-SHELL-1.4 (HUMAN): Test `pnpm dev` and `pnpm build` on local machine, verify no regressions.
  **Verification:** Approved.

---

### [ ] P0-SHELL-2: Configure local Cloudflare emulation bindings

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🔴 Critical  
**Current State:** No `wrangler.jsonc` exists in `apps/web`. The project may rely on `wrangler.toml` or have no Cloudflare‑specific configuration. R2 buckets, KV namespaces, and environment variables for local development are not defined, making it impossible to test storage or queue operations locally.  
**Size:** Medium

**Description:**
Create `apps/web/wrangler.jsonc` (preferred over TOML for newer features) to define Cloudflare bindings for local emulation: R2 bucket (for documents), KV namespaces (for rate limiting, feature flags), environment variables (`DATABASE_URL`, `STRIPE_SECRET`, `RESEND_API_KEY`, etc.). Install and configure `@cloudflare/vite-plugin` in `vite.config.ts` so that `wrangler dev` and Vite dev server share bindings. Ensure `compatibility_date` is recent and `nodejs_compat` flag is set. Verify that local R2 data persists in `.wrangler/state/`.

**Research Findings (2026‑05‑06):**
- Wrangler v4 uses `wrangler.jsonc` as the preferred config format.
- Cloudflare Workers with Node.js APIs require `compatibility_flags: ["nodejs_compat"]`.
- The `@cloudflare/vite-plugin` must be added to the Vite plugin array; it reads bindings from `wrangler.jsonc` during `vite dev`.
- Local R2 emulation stores objects in `.wrangler/state/v3/r2/`; KV data in `.wrangler/state/v3/kv/`.
- `wrangler.jsonc` `main` field should point to the worker entry (e.g., `.output/server/index.mjs`), `assets` to `.output/public`.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1`

**Blocks:**
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-1`
- `tasks/infrastructure/P0-ENV.md → P0-ENV-1`

**Related Files:**
- `apps/web/wrangler.jsonc` (new)
- `apps/web/vite.config.ts` (add `@cloudflare/vite-plugin`)
- `apps/web/package.json` (devDependency: `@cloudflare/vite-plugin`)
- `apps/web/.env.example` (template for required env vars)

**Definition of Done**
- [ ] `apps/web/wrangler.jsonc` created with: `name`, `main` (server entry), `assets`, `compatibility_date` (≤30 days old), `compatibility_flags: ["nodejs_compat"]`, `env` section for staging/production, `r2_buckets` binding, `kv_namespaces` binding
- [ ] `@cloudflare/vite-plugin` installed and added to `vite.config.ts`
- [ ] Local `wrangler dev` starts successfully and picks up bindings
- [ ] R2 local emulation works: test upload/download via the Vite dev server using R2 binding
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Actual Cloudflare deployment (P0‑DEPLOY)
- Full R2 operations wrapper (P0‑STORAGE‑2)
- Queue definitions (P0‑EMAIL‑0)

**Rules to Follow**
- Use `wrangler.jsonc`, not `wrangler.toml`, for new configuration.
- Do not hard‑code secrets in `wrangler.jsonc`; use `vars` with literal `"placeholder"` and document actual values via `.env.example`.
- `compatibility_date` must be within 30 days of current date.

**Verification**
```bash
cd apps/web && npx wrangler dev --local
# Manual: upload a file to local R2 via API, check .wrangler/state/v3/r2/
cat apps/web/wrangler.jsonc
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

#### Subtasks

- [ ] P0-SHELL-2.0.25 (AGENT): Read current Cloudflare configuration files (if any) and research `wrangler.jsonc` schema.
  **Verification:** Current state documented; schema understood.

- [ ] P0-SHELL-2.0.5 (AGENT): Research `@cloudflare/vite-plugin` usage and local R2/KV emulation quirks.
  **Verification:** Research documented.

- [ ] P0-SHELL-2.1 (AGENT): Create `apps/web/wrangler.jsonc` with all required bindings and env vars.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** JSONC parses without errors.

- [ ] P0-SHELL-2.2 (AGENT): Install `@cloudflare/vite-plugin` and add to `vite.config.ts`.
  **File(s):** `apps/web/package.json`, `apps/web/vite.config.ts`
  **Verification:** `pnpm dev` starts without module-not-found errors.

- [ ] P0-SHELL-2.3 (AGENT): Test local R2 emulation: start `wrangler dev --local`, hit R2 binding via a simple test endpoint.
  **File(s):** Temporary test route
  **Verification:** Object written and read successfully.

- [ ] P0-SHELL-2.4 (HUMAN): Verify all team members can start local environment with bindings. Approve.
  **Verification:** Approved.

---

### [ ] P0-SHELL-3: Verify Tailwind CSS v4 global directives and design tokens

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🔴 Critical  
**Current State:** `apps/web/src/styles.css` imports Tailwind via `@import "tailwindcss"` and defines custom CSS variables for the dark theme. However, Tailwind CSS v4 is CSS‑first (no `tailwind.config.js`), and the dark‑mode implementation may rely on `prefers‑color‑scheme` rather than a class‑based toggle. The shell’s theme toggle component (if any) must use `@custom-variant dark` to properly switch themes.  
**Size:** Small

**Description:**
Audit `apps/web/src/styles.css` to ensure all Tailwind v4 directives are correct. Confirm that custom design tokens (electric blue accent, glassmorphism backgrounds) use `@theme` and are properly layered. Most importantly, verify that dark‑mode is driven by `@custom-variant dark (&:where(.dark, .dark *))` so that the app can toggle the `dark` class on `<html>` (not just rely on OS preference). Integrate with the FOUC prevention script from P0‑SHELL‑1. If not already present, add the necessary `@custom-variant` and adjust any component that depends on theme.

**Research Findings (2026‑05‑06):**
- Tailwind v4 uses `@custom-variant dark` to define how `dark:` variants work; default is `@media (prefers-color-scheme: dark)` but for class‑based toggling you must override with `&:where(.dark, .dark *)`.
- The anti‑FOUC script (`THEME_INIT_SCRIPT`) should set `document.documentElement.classList.add('dark')` if the stored preference is dark.
- ShadCN UI components that use `dark:` will automatically respect the toggled class if the variant is defined correctly.
- No `tailwind.config.js` is needed; configuration lives entirely in CSS.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1`

**Blocks:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-7` (shell components depend on theme)

**Related Files:**
- `apps/web/src/styles.css`
- `apps/web/src/components/layout/Header.tsx` (theme toggle, if present)
- `apps/web/vite.config.ts` (THEME_INIT_SCRIPT)

**Definition of Done**
- [ ] `styles.css` contains `@custom-variant dark (&:where(.dark, .dark *));` after `@import "tailwindcss"`
- [ ] Design tokens (custom palette, glassmorphism) are defined in `@theme` and work in both light and dark modes
- [ ] Manual toggle (if any) sets `dark` class on `<html>` and all ShadCN components react accordingly
- [ ] No flash of wrong theme occurs on page load (combined with P0‑SHELL‑1)
- [ ] `pnpm dev` renders the app in dark theme by default; toggling works

**Out of Scope**
- Adding a theme toggle component (if missing, a follow‑up task should be created)
- Customizing ShadCN component themes beyond the provided palette

**Rules to Follow**
- Do not modify ShadCN components directly; rely on CSS variables and Tailwind variants.
- The `@custom-variant dark` statement must appear after `@import "tailwindcss"` to override the default media query.

**Verification**
```bash
# Start dev server
cd apps/web && pnpm dev
# In browser:
# - Check <html> has class "dark" initially (if dark mode is default)
# - Manually toggle darkness: document.documentElement.classList.toggle('dark')
# - Verify that background, text, and ShadCN components switch themes
grep 'custom-variant dark' apps/web/src/styles.css
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (styling task)

---

#### Subtasks

- [ ] P0-SHELL-3.0.25 (AGENT): Read `apps/web/src/styles.css` and identify current theme setup.
  **Verification:** Current approach documented.

- [ ] P0-SHELL-3.0.5 (AGENT): Research Tailwind CSS v4 class‑based dark mode and `@custom-variant` usage.
  **Verification:** Research documented.

- [ ] P0-SHELL-3.1 (AGENT): Add `@custom-variant dark (&:where(.dark, .dark *));` to `styles.css`, overriding the default media query.
  **File(s):** `apps/web/src/styles.css`
  **Verification:** `pnpm dev` — toggling `.dark` class on `<html>` switches theme.

- [ ] P0-SHELL-3.2 (AGENT): Verify that all custom design tokens (`--color-electric-blue`, etc.) are properly used and have light/dark variants if needed.
  **File(s):** `apps/web/src/styles.css`
  **Verification:** Visual inspection: glassmorphism effects visible in dark mode, readable in light mode.

- [ ] P0-SHELL-3.3 (HUMAN): Test theme toggle across all nine domain pages, confirm consistency. Approve.
  **Verification:** Approved.

---

### [ ] P0-SHELL-4: Verify client hydration gateway

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🔴 Critical  
**Current State:** No explicit `apps/web/src/entry-client.tsx` exists; TanStack Start auto‑generates a default client entry that wraps the app with `StartClient` and `hydrateRoot`. This default may not include error boundaries, QueryClientProvider, or RUM agents.  
**Size:** Small

**Description:**
Verify whether the auto‑generated client entry is sufficient. If any customizations (ErrorBoundary, QueryClientProvider, Devtools, RUM injection) are required that the default does not cover, create `apps/web/src/entry-client.tsx` with the necessary wrappers. The auto‑generated default uses `hydrateRoot` correctly, but we need to ensure that React 19’s `hydrateRoot` is used (not `ReactDOM.hydrate`). Also confirm that `src/router.tsx` is set up to be client‑side only and properly passed to `StartClient`.

**Research Findings (2026‑05‑06):**
- TanStack Start auto‑generates entry-client and entry-server if not present; custom versions replace them.
- Custom entry-client is needed to add providers: `QueryClientProvider`, `TooltipProvider`, `ThemeProvider`.
- The `__root.tsx` already wraps with `QueryClientProvider` and `TooltipProvider` — if that’s sufficient, a custom entry-client may not be needed. However, the `__root` runs inside the router; an outer ErrorBoundary should sit outside the router to catch router‑level errors.
- The `StartClient` component expects a `router` prop.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1`

**Blocks:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-6` (root route may move providers to entry-client)

**Related Files:**
- `apps/web/src/entry-client.tsx` (possibly new)
- `apps/web/src/router.tsx`
- `apps/web/src/routes/__root.tsx`

**Definition of Done**
- [ ] If needed, `entry-client.tsx` created with: `hydrateRoot`, `StartClient`, `ErrorBoundary`, and any global providers not already in `__root`
- [ ] React 19 `hydrateRoot` is used (import from `react-dom/client`)
- [ ] No hydration mismatch errors in browser console for any route
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Adding RUM (real‑user monitoring) — separate task (P0‑OBS‑6)
- Server entry hardening (P0‑SHELL‑5)

**Rules to Follow**
- Never use `ReactDOM.hydrate` in React 19; always `hydrateRoot`.
- Keep the entry-client minimal; defer providers to the root route unless they need to wrap the entire router.

**Verification**
```bash
cd apps/web && pnpm dev
# In browser: open all 9 domain pages, check console for hydration warnings
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure)

---

#### Subtasks

- [ ] P0-SHELL-4.0.25 (AGENT): Understand TanStack Start’s default client entry generation and inspect current `__root.tsx` for providers.
  **Verification:** Current provider arrangement documented.

- [ ] P0-SHELL-4.0.5 (AGENT): Research best practices for custom `entry-client.tsx` with TanStack Start.
  **Verification:** Research documented.

- [ ] P0-SHELL-4.1 (AGENT): If `__root.tsx` already provides all necessary global context and an outer ErrorBoundary is not required, document that no custom entry-client is needed. Else, create `entry-client.tsx`.
  **File(s):** `apps/web/src/entry-client.tsx` (if needed)
  **Verification:** No hydration warnings.

- [ ] P0-SHELL-4.2 (HUMAN): Test app hydration and verify no console errors. Approve.
  **Verification:** Approved.

---

### [ ] P0-SHELL-5: Harden server‑entry response (CSP, CORS, security headers)

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🟠 High  
**Current State:** The Hono server (`apps/web/src/server/api.ts`) serves API routes and integrates tRPC but does not set comprehensive security headers. There is no `entry-server.tsx` customizing the SSR response. The TanStack Start default server entry does not add CSP, CORS, HSTS, or other headers.  
**Size:** Medium

**Description:**
Create a custom `apps/web/src/entry-server.tsx` (or extend the Hono app) to add security headers to all responses. Use Hono’s built‑in `secureHeaders()` middleware for basic headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`). Implement a dynamic Content Security Policy (CSP) that is strict enough for security but allows the app’s required sources (inline scripts for FOUC, tRPC, R2 presigned URLs). Configure CORS middleware to allow only the production domain (with localhost exception for dev). Ensure all cookies have `SameSite=Strict` and `Secure` flags (handled by auth package but verified here).

**Research Findings (2026‑05‑06):**
- Hono `secureHeaders()` automatically sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Strict-Transport-Security`. CSP can be added via `contentSecurityPolicy` option.
- CSP nonces for inline scripts are incompatible with pure SPA without SSR injection per request; for now, allow `'unsafe-inline'` for scripts and styles and plan to refactor in a later phase.
- CORS can be set via Hono’s `cors()` middleware; wide‑open CORS is a security risk in production.
- TanStack Start’s custom server entry can wrap the default handler or replace it entirely, exporting a `fetch` export.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1`

**Blocks:**
- `tasks/infrastructure/P0-SEC.md → P0-SEC-1` (CSP details)
- `tasks/infrastructure/P0-SEC.md → P0-SEC-2`

**Related Files:**
- `apps/web/src/entry-server.tsx` (new)
- `apps/web/src/server/api.ts` (add security middleware)
- `.env.example` (allowed origins)

**Definition of Done**
- [ ] Custom `entry-server.tsx` created that calls `secureHeaders()` and `cors()` before the default handler
- [ ] CSP header defined with: `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src *`, `connect-src 'self' *.s3.region.amazonaws.com` (adjust for R2), `frame-ancestors 'none'`
- [ ] CORS allows only `https://ubos.app` (and `http://localhost:3000` in dev)
- [ ] `Strict-Transport-Security` header set to `max-age=63072000; includeSubDomains; preload`
- [ ] Cookies from auth package have `SameSite=Strict` and `Secure` (verified, not modified)
- [ ] All existing API endpoints continue to function
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- CSP nonce generation (deferred to later phase; currently use `'unsafe-inline'`)
- CSRF custom header middleware (P0‑SEC‑7)

**Rules to Follow**
- CSP must allow `'unsafe-inline'` for now (FOUC script and ShadCN inline styles); document technical debt.
- CORS must not be `*` in any environment that uses credentials.
- Security headers must not break local development; use conditional middleware based on `process.env.NODE_ENV`.

**Verification**
```bash
curl -I http://localhost:3000/  # check for X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Content-Security-Policy
# Ensure CORS headers appear only when Origin matches allowed list
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure)

---

#### Subtasks

- [ ] P0-SHELL-5.0.25 (AGENT): Read current `api.ts` and TanStack Start entry‑server docs. Understand where middleware can be injected.
  **Verification:** Current state documented.

- [ ] P0-SHELL-5.0.5 (AGENT): Research Hono `secureHeaders`, CSP syntax, and CORS best practices for SPAs behind Cloudflare.
  **Verification:** Research documented.

- [ ] P0-SHELL-5.1 (AGENT): Add `secureHeaders()` and `cors()` middleware to `api.ts` (or create `entry-server.tsx` if needed).
  **File(s):** `apps/web/src/server/api.ts` and/or `apps/web/src/entry-server.tsx`
  **Verification:** Headers present in curl response.

- [ ] P0-SHELL-5.2 (AGENT): Configure CSP with `'unsafe-inline'` and document the debt; set CORS allowed origins.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** `curl -I` shows CSP and Access-Control-Allow-Origin headers.

- [ ] P0-SHELL-5.3 (HUMAN): Test app functionality (auth, CRM, API calls) and confirm no broken requests. Approve.
  **Verification:** Approved.

---

### [ ] P0-SHELL-6: Consolidate root route layout (auth guard, query client, devtools)

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🔴 Critical  
**Current State:** `apps/web/src/routes/__root.tsx` exists with `beforeLoad` auth guard, public path handling, conditional `MainLayout` rendering, `QueryClientProvider`, `TooltipProvider`, and `TanStackDevtools`. It may use deprecated standalone `TanStackRouterDevtools` or have providers that should be moved to the entry‑client. The route tree is flat (lazy routes directly under root), not nested under a pathless layout route.  
**Size:** Medium

**Description:**
Audit and refactor `__root.tsx` to be the definitive root route container. Ensure that:
- All global providers (`QueryClientProvider`, `TooltipProvider`) are present and correctly used.
- Devtools use the new unified `TanStackDevtools` with plugins (if separate RouterDevtools is present, replace it).
- The `beforeLoad` auth guard correctly redirects unauthenticated users to `/signin` and allows public routes.
- The `MainLayout` wrapper is rendered only for authenticated routes, not for 404 or error pages.
- The component structure is clean and well‑commented.
- No redundant providers exist between root and entry‑client (if entry‑client is created).

**Research Findings (2026‑05‑06):**
- The new `TanStackDevtools` (since v0.62) accepts a `plugins` array; the router plugin replaces standalone `TanStackRouterDevtools`.
- A pathless `_dashboard` layout route is planned for Phase 1 (P1‑ROUTE‑1); verify that current flat route structure works correctly until then.
- `beforeLoad` can use `router.invalidate()` to re‑run on auth state change.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-4` (client entry)

**Blocks:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-7` (shell component refactor)

**Related Files:**
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/router.tsx`
- `apps/web/src/lib/auth/client.ts` (auth state)

**Definition of Done**
- [ ] `__root.tsx` uses `TanStackDevtools` with `routerPlugin` (no standalone RouterDevtools)
- [ ] `QueryClientProvider` and `TooltipProvider` are placed appropriately (either here or in entry‑client, not duplicated)
- [ ] Auth guard redirects `/` to `/dashboard`, `/signin` and `/signup` are public, all other routes require session
- [ ] `MainLayout` does not wrap the sign‑in/sign‑up/404 pages
- [ ] Devtools are only rendered in development (`process.env.NODE_ENV === 'development'`)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Creating the pathless `_dashboard` layout (P1‑ROUTE‑1)
- Major restructuring of the route tree

**Rules to Follow**
- Keep the root route as simple as possible; defer domain‑specific logic to lazy routes.
- Do not remove existing auth guard logic that works; only adjust for correctness.

**Verification**
```bash
cd apps/web && pnpm dev
# Manual: visit /signin without session; verify redirect.
# Visit /dashboard with session; verify MainLayout renders.
# Check browser console for devtools presence.
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an unauthenticated user, I am redirected to /signin. As an authenticated user, I see the full shell.

---

#### Subtasks

- [ ] P0-SHELL-6.0.25 (AGENT): Read `__root.tsx`, `router.tsx`, and auth utilities to understand current auth guard.
  **Verification:** Current logic documented.

- [ ] P0-SHELL-6.0.5 (AGENT): Research latest TanStack Router auth patterns and `TanStackDevtools` migration.
  **Verification:** Research documented.

- [ ] P0-SHELL-6.1 (AGENT): Replace any standalone `TanStackRouterDevtools` with `TanStackDevtools` + `routerPlugin`.
  **File(s):** `apps/web/src/routes/__root.tsx`
  **Verification:** Devtools visible in dev mode; no import errors.

- [ ] P0-SHELL-6.2 (AGENT): Verify auth guard logic: `/signin`, `/signup`, `/` redirect; other routes require session. Add `router.invalidate()` on auth state change.
  **File(s):** `apps/web/src/routes/__root.tsx`
  **Verification:** Manual sign‑in flow works as expected.

- [ ] P0-SHELL-6.3 (HUMAN): Test full auth flow, navigation, and devtools. Approve.
  **Verification:** Approved.

---

### [ ] P0-SHELL-7: Verify and refactor shell components (sidebar, header, main layout)

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🟠 High  
**Current State:** `MainLayout.tsx`, `Sidebar.tsx`, and `Header.tsx` exist with Framer Motion animations, 9 domain links, active state highlighting, and responsive collapsible sidebar. They are functional but may not fully meet accessibility (keyboard navigation, ARIA labels) or responsiveness (mobile drawer) requirements.  
**Size:** Small

**Description:**
 Audit the three shell components against accessibility and responsive best practices:
- `Sidebar.tsx`: ensure it collapses to a mobile drawer using the existing ShadCN `Sheet` component (already available) on screens <768px. Add `aria-label` for the nav element. Verify keyboard navigation via Tab/Enter works for all links.
- `Header.tsx`: ensure the breadcrumb, search trigger, notification bell, and user dropdown are keyboard accessible (dropdown menus should open with Enter, close with Escape). Add `aria-expanded` to toggles.
- `MainLayout.tsx`: ensure the `AnimatePresence` does not trap focus; verify scrollable main content area has correct role and tabindex.

Do not build new components from scratch; refactor the existing ones. All UI primitives needed (Sheet, DropdownMenu, etc.) are already in the project.

**Research Findings (2026‑05‑06):**
- Mobile sidebar pattern: use ShadCN `Sheet` with `useIsMobile` hook to conditionally render side panel vs drawer.
- Keyboard accessibility: DropdownMenu and menubar components from Radix already manage focus; verify they are used correctly.
- ARIA: nav elements need `aria-label="Main navigation"`; active links need `aria-current="page"`.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-6`

**Blocks:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-2` (mobile audit)
- `tasks/infrastructure/P0-ACC.md → P0-ACC-1` (accessibility audit)

**Related Files:**
- `apps/web/src/components/layout/MainLayout.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/hooks/use-mobile.tsx`

**Definition of Done**
- [ ] Sidebar renders as `Sheet` drawer on mobile, inline sidebar on desktop
- [ ] All sidebar links have `aria-current="page"` when active
- [ ] Header dropdowns are keyboard accessible (focus trap, Esc to close)
- [ ] `MainLayout` main content area has `role="main"` and `tabindex="-1"` for skip‑nav
- [ ] No regression in animations or dark‑theme visuals
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full WCAG 2.2 AA audit (P0‑ACC)
- Adding new UI features (theme toggle, search functionality, etc.)

**Rules to Follow**
- Do not remove existing Framer Motion animations unless they cause accessibility issues.
- Use the existing `use-mobile` hook to detect screen width.
- All interactive elements must be focusable and operable via keyboard.

**Verification**
```bash
cd apps/web && pnpm dev
# Manual: resize to 375px width — sidebar should become a drawer
# Tab through header and sidebar links; verify focus rings visible
# Check ARIA attributes in DevTools
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a keyboard‑only user, I can navigate to any domain page using Tab and Enter.

---

#### Subtasks

- [ ] P0-SHELL-7.0.25 (AGENT): Read existing shell components and `use-mobile` hook to understand current mobile behavior.
  **Verification:** Current behavior documented.

- [ ] P0-SHELL-7.0.5 (AGENT): Research ShadCN Sheet responsive sidebar pattern and Radix accessibility docs.
  **Verification:** Research documented.

- [ ] P0-SHELL-7.1 (AGENT): Implement mobile drawer using `Sheet` in `Sidebar.tsx`, controlled by `useIsMobile` hook.
  **File(s):** `apps/web/src/components/layout/Sidebar.tsx`
  **Verification:** On mobile viewport, sidebar appears as slide‑out drawer.

- [ ] P0-SHELL-7.2 (AGENT): Add `aria-label`, `aria-current`, and keyboard navigation to sidebar links.
  **File(s):** `apps/web/src/components/layout/Sidebar.tsx`
  **Verification:** DevTools shows correct ARIA attributes; Tab key navigates links.

- [ ] P0-SHELL-7.3 (AGENT): Audit `Header.tsx` dropdowns for keyboard accessibility (Enter to open, Esc to close, arrow key navigation).
  **File(s):** `apps/web/src/components/layout/Header.tsx`
  **Verification:** Dropdown opens/closes with keyboard; focus visible.

- [ ] P0-SHELL-7.4 (AGENT): Add `role="main"` and `tabindex="-1"` to the main content area in `MainLayout.tsx`.
  **File(s):** `apps/web/src/components/layout/MainLayout.tsx`
  **Verification:** DevTools shows added attributes.

- [ ] P0-SHELL-7.5 (HUMAN): Test responsive layout, keyboard navigation, and visual consistency. Approve.
  **Verification:** Approved.

---

### [ ] P0-SHELL-8: Enable React 19 Compiler for automatic memoization

**Status:** ⏳ Not Started  
**Actor:** AGENT  
**Priority:** 🟡 Medium  
**Current State:** The project uses React 19 but does not have the React Compiler enabled. Components rely on manual `React.memo`, `useMemo`, and `useCallback`. The compiler can automatically apply optimizations, reducing bundle size and improving performance.  
**Size:** Small

**Description:**
Enable the React Compiler (Babel plugin) in `apps/web/vite.config.ts` via the `@vitejs/plugin-react` Babel options. Install `babel-plugin-react-compiler` as a devDependency. Start with `panicThreshold: 'NONE'` to skip non‑optimisable components gracefully. Add `'use no memo'` directive support for components that must not be memoized (if any). Verify that the app runs without regressions and that the compiler outputs logs in development mode. Measure bundle size and runtime performance before/after to validate gains.

**Research Findings (2026‑05‑06):**
- React Compiler v1.0 (Oct 2025) is stable for production.
- To enable: add `babel: { plugins: [['babel-plugin-react-compiler', { panicThreshold: 'NONE' }]] }` to the `react()` plugin options.
- No runtime package is needed; React 19 has the necessary hooks internally.
- `'use no memo'` directive can be placed at the top of a component to opt out.

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-1`

**Blocks:** [N/A]

**Related Files:**
- `apps/web/vite.config.ts`
- `apps/web/package.json` (devDependency: `babel-plugin-react-compiler`)

**Definition of Done**
- [ ] `babel-plugin-react-compiler` installed as devDependency
- [ ] `react()` plugin in `vite.config.ts` configured with Babel option for the compiler
- [ ] Development server starts without errors; console shows compiler optimization logs
- [ ] CRM functionality (leads CRUD) works as before
- [ ] Production build completes successfully
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Detailed performance benchmarking (deferred to observability phase)
- Adding `'use no memo'` directives to specific components (can be done later as needed)

**Rules to Follow**
- Enable the compiler in development with verbose logging to identify potential issues.
- Use `panicThreshold: 'NONE'` initially; do not fail the build on non‑optimizable components.

**Verification**
```bash
cd apps/web && pnpm dev
# Check terminal: "React Compiler" messages appearing
# Manually test CRM lead creation, update, deletion
pnpm build  # should succeed
pnpm typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: React Compiler hides memoization complexity from developers, automatically managing `useMemo`/`useCallback` equivalents.

---

#### Subtasks

- [ ] P0-SHELL-8.0.25 (AGENT): Read current `vite.config.ts` and understand existing React plugin configuration.
  **Verification:** Current config documented.

- [ ] P0-SHELL-8.0.5 (AGENT): Research React Compiler setup with Vite and known issues with ShadCN/Radix components.
  **Verification:** Research documented.

- [ ] P0-SHELL-8.1 (AGENT): Install `babel-plugin-react-compiler` and configure Babel in Vite React plugin.
  **File(s):** `apps/web/package.json`, `apps/web/vite.config.ts`
  **Verification:** `pnpm dev` shows compiler logs.

- [ ] P0-SHELL-8.2 (AGENT): Run `pnpm build` and verify production build succeeds; check for any compiler‑related errors.
  **Verification:** Build succeeds.

- [ ] P0-SHELL-8.3 (HUMAN): Test the app thoroughly (all 9 pages, CRM CRUD) and approve.
  **Verification:** Approved.

---