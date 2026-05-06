# tasks/phase-1/P1-ROUTE.md — Dashboard Layout Route Refactor

This file covers the creation of a **pathless `_dashboard` layout route** using TanStack Router's underscore convention, migrating the `MainLayout` wrapper and auth guard out of `__root.tsx`, and nestling all nine domain lazy routes under the new layout. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑ROUTE (2026‑05‑06)

### 1. Pathless Layout Routes — The Underscore Convention

The underscore prefix (`_`) is the canonical 2026 mechanism for creating **pathless layout routes** in TanStack Router's file‑based routing system. Multiple independent sources published between December 2025 and April 2026 converge on identical mechanics:

- **CSDN (2026‑01‑12)**: "在 TanStack Router 中，如果你希望创建一个'包裹器'组件（比如包含侧边栏的 Layout），但不希望它在 URL 中增加一层路径，你需要在文件名加一个下划线前缀 `_`。" — to create a wrapper component that doesn't add a URL segment, prefix the filename with underscore.
- **PJCHENder (2026‑01‑17)**: "Pathless Layout Routes：即使路徑沒有匹配到也會套用的元件或邏輯，檔案名稱以 `_` 作為前綴".
- **royportas.com (2026‑04‑05)**: "The underscore prefix (`_account/`) creates a layout group that shares a `route.tsx` wrapper without contributing a URL segment. Routes inside `_account/` render at `/orders` and `/profile`, not `/account/orders` and `/account/profile`.".
- **TanStack Router Docs**: Official documentation confirms pathless layout routes with examples showing `_pathlessLayout.tsx` wrapping `route-a.tsx` and `route-b.tsx` whose URLs remain `/route-a` and `/route-b` respectively.

**The key rule**: A `_dashboard` layout renders child routes at their flat URLs — `/dashboard`, `/crm`, `/projects` — not `/dashboard/dashboard`, `/dashboard/crm`, etc. The underscore segment is stripped from URL computation.

### 2. Flat vs Directory Route Structures — 2026 Consensus

TanStack Router supports **both flat routes** (dot‑notation in filenames) and **directory routes** (folders with `route.tsx`), and critically, **both can be mixed**.

**Directory approach** (recommended for UBOS given the number of domain routes):
```
_dashboard/
  route.tsx          # Layout route with MainLayout + auth guard
  dashboard.lazy.tsx # /dashboard
  crm.lazy.tsx       # /crm
  ...
```
The `route.tsx` file inside any directory acts as a **layout route** for that directory's children. TanStack Router uses the token `route` (configurable via `routeToken`) to identify layout files.

**Flat approach** (alternative):
```
_dashboard.tsx              # Layout route
_dashboard.dashboard.lazy.tsx  # /dashboard
_dashboard.crm.lazy.tsx        # /crm
```

**For UBOS**: The **directory approach is recommended** because it:
- Groups all nine domain routes under a single directory, making the structure self‑documenting
- Is more maintainable when future nested routes are added (e.g., `settings/` sub‑routes in Phase 1, `crm/$leadId.tsx`)
- Aligns with the production‑proven pattern used by Railway, the SaaS template community, and MUI Toolpad

### 3. Auth Guard Relocation — from `__root.tsx` to `_dashboard/route.tsx`

The 2026 consensus pattern for protected routes separates concerns cleanly:

- **`__root.tsx`**: Providers only (QueryClientProvider, TooltipProvider, Devtools), renders `<Outlet />`. No auth logic, no MainLayout.
- **Pathless layout route** (`_dashboard/route.tsx`): Auth guard via `beforeLoad`, renders `MainLayout` with `<Outlet />` for child content.

**The `beforeLoad` redirect pattern** (from the Atomic Object guide, 2026‑02‑10):
```typescript
export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
  beforeLoad: async ({ context: { auth } }) => {
    if (!auth?.user) {
      return redirect({ to: '/signin' });
    }
  },
});

function DashboardLayout() {
  return <MainLayout><Outlet /></MainLayout>;
}
```
This is the pattern validated across multiple 2026 sources.

**Critical SSR consideration**: TanStack Start executes `beforeLoad` on both server and client by default. Redirects thrown from `beforeLoad` must work identically in both environments to avoid hydration mismatches. A known issue exists where throwing `notFound()` from a child route's `beforeLoad` causes hydration errors (Issue #6779, 2026‑02‑27) — this does not affect layout‑level auth redirects but is noted for future child‑route guard patterns.

### 4. Lazy Routes Inside Pathless Layout Directories

`createLazyFileRoute` can be used inside pathless layout directories without modification. The route path in the file must match the final resolved path (without the underscore prefix). For example, inside `_dashboard/`, a file `crm.lazy.tsx` would use:

```typescript
import { createLazyFileRoute } from '@tanstack/react-router';
export const Route = createLazyFileRoute('/crm')({
  component: CrmPage,
});
```

This is confirmed by the TanStack Router file‑based routing docs, which show that pathless layout routes are transparent to child route definitions — child routes use their **flat URL paths** regardless of nesting depth within pathless directories.

### 5. `routeTree.gen.ts` Regeneration

TanStack Router's file‑based routing auto‑generates `routeTree.gen.ts` from the `src/routes/` directory. Any structural change (renaming files, creating directories, changing nesting) requires the generated route tree to be regenerated. This happens automatically via the TanStack Router Vite plugin during `vite dev`, but **must be committed to the repository** after the refactor is complete.

### 6. Index Route and Catch‑All Considerations

**Index route conflict**: When a directory named `_dashboard/` exists alongside a flat file named `dashboard.lazy.tsx`, there is no collision because the underscore prefix distinguishes them. However, the existing root‑level `index.tsx` (which redirects `/` to `/dashboard`) must remain at root level and must NOT be moved inside `_dashboard/`, as it handles unauthenticated users landing at `/`.

**Catch‑all route**: The existing `$.tsx` (or `not-found.tsx`) should remain outside `_dashboard/` so it can render without the dashboard layout.

**API route**: The `api.$.ts` server route must remain at root level — moving it inside `_dashboard/` would break the API handler.

### 7. Consolidated Directory Structure (Target)

Based on research consensus, the target route directory structure after P1‑ROUTE‑1:

```
apps/web/src/routes/
├── __root.tsx                       # Providers + Devtools; no MainLayout
├── index.tsx                        # Smart redirect: auth → /dashboard, else → /signin
├── signin.tsx                       # Public sign-in page (no layout)
├── signup.tsx                       # Public sign-up page (no layout)
├── $.tsx                            # 404 page (no layout)
├── api.$.ts                         # API handler (server route)
└── _dashboard/                      # Pathless layout for authenticated pages
    ├── route.tsx                    # Layout: beforeLoad auth guard + MainLayout wrapper
    ├── dashboard.lazy.tsx           # /dashboard
    ├── crm.lazy.tsx                 # /crm
    ├── analytics.lazy.tsx           # /analytics
    ├── assets.lazy.tsx              # /assets
    ├── documents.lazy.tsx           # /documents
    ├── finance.lazy.tsx             # /finance
    ├── portal.lazy.tsx              # /portal
    ├── projects.lazy.tsx            # /projects
    └── settings.lazy.tsx            # /settings
```

This structure:
- Isolates authenticated vs public routes clearly
- Keeps `MainLayout` rendering only for authenticated pages
- Preserves all existing lazy‑loading code splitting
- Makes future nested routes (e.g., `_dashboard/crm/$leadId.tsx`) natural to add

---

## Task Definitions

### [ ] P1-ROUTE-1: Create pathless `_dashboard` layout route with MainLayout wrapper; migrate all domain lazy routes

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The application uses a flat route structure with all nine domain pages defined as `createLazyFileRoute` at the root level (`crm.lazy.tsx`, `analytics.lazy.tsx`, etc.). The `__root.tsx` route performs authentication checks via `beforeLoad`, handles public path exceptions, and conditionally wraps authenticated pages with `MainLayout`. This architecture conflates three concerns — providers, auth guarding, and layout rendering — into a single root route. Adding nested routes (e.g., `settings/*` or `crm/$leadId`) under this flat structure would require repeating layout logic. The `MainLayout` is rendered even on the 404 page, which is incorrect behavior【ANALYSIS†Section 3.3 - NotFound renders inside MainLayout】.
**Size:** Large

**Description:**
Refactor the route tree to introduce a **pathless `_dashboard` layout route** that wraps all authenticated domain pages with `MainLayout`. This is the **critical infrastructure task for Phase 1** — it must be completed before any Phase 1 domain route tasks can proceed, as all nested routes depend on the layout structure.

**(a) Create `_dashboard/` directory**: Create `apps/web/src/routes/_dashboard/` directory.

**(b) Create `_dashboard/route.tsx`**: This is the pathless layout route that replaces the conditional `MainLayout` rendering currently in `__root.tsx`. It must:
- Use `createFileRoute('/_dashboard')` — the underscore prefix signals a pathless route to TanStack Router
- Implement `beforeLoad` with the auth guard logic currently in `__root.tsx`:
  - Retrieve the session/authentication state from router context
  - If the user is not authenticated, redirect to `/signin`
  - Allow access if authenticated
- Render `MainLayout` wrapping `<Outlet />` for child route content
- **Not** duplicate providers — `QueryClientProvider`, `TooltipProvider`, and devtools remain in `__root.tsx`

**Code pattern**:
```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayoutRoute,
  beforeLoad: async ({ context }) => {
    // Auth guard logic migrated from __root.tsx
    const { auth } = context;
    if (!auth?.user) {
      throw redirect({ to: '/signin' });
    }
  },
});

function DashboardLayoutRoute() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
```

**(c) Move all nine domain lazy route files into `_dashboard/` directory**: Each file is moved from the root `routes/` directory into `routes/_dashboard/` and its internal path reference is updated to the flat URL (without the `_dashboard` prefix):

| Old File | New File | Route Path (in `createLazyFileRoute`) |
|---|---|---|
| `routes/dashboard.lazy.tsx` | `routes/_dashboard/dashboard.lazy.tsx` | `/dashboard` |
| `routes/crm.lazy.tsx` | `routes/_dashboard/crm.lazy.tsx` | `/crm` |
| `routes/analytics.lazy.tsx` | `routes/_dashboard/analytics.lazy.tsx` | `/analytics` |
| `routes/assets.lazy.tsx` | `routes/_dashboard/assets.lazy.tsx` | `/assets` |
| `routes/documents.lazy.tsx` | `routes/_dashboard/documents.lazy.tsx` | `/documents` |
| `routes/finance.lazy.tsx` | `routes/_dashboard/finance.lazy.tsx` | `/finance` |
| `routes/portal.lazy.tsx` | `routes/_dashboard/portal.lazy.tsx` | `/portal` |
| `routes/projects.lazy.tsx` | `routes/_dashboard/projects.lazy.tsx` | `/projects` |
| `routes/settings.lazy.tsx` | `routes/_dashboard/settings.lazy.tsx` | `/settings` |

The `createLazyFileRoute` path argument must remain the flat URL — e.g., `createLazyFileRoute('/crm')` — even though the file now lives inside `_dashboard/`. This is the correct behavior: pathless layouts are transparent to child route definitions.

**(d) Simplify `__root.tsx`**: After the migration, `__root.tsx` must:
- **Remove** the `MainLayout` conditional wrapping logic
- **Remove** the auth guard `beforeLoad` (moved to `_dashboard/route.tsx`)
- **Keep**: `QueryClientProvider`, `TooltipProvider`, `TanStackDevtools`, MSW initialization, tenant ID sync
- **Keep**: The not‑found catch logic (or relocate to `$.tsx`)
- Render `<Outlet />` directly (no conditional wrapping)

The root route becomes purely a providers + devtools shell, following the 2026 consensus pattern.

**(e) Handling of public routes**: `signin.tsx`, `signup.tsx`, `$.tsx` (404), and `index.tsx` remain at root level outside `_dashboard/`. These routes must NOT render inside `MainLayout`. The existing `beforeLoad` logic in `__root.tsx` that whitelists these as public paths should be preserved or adapted — specifically, the root‑level `index.tsx` should still redirect authenticated users to `/dashboard`.

**(f) Regenerate route tree**: After all file moves, run `pnpm dev` to trigger automatic regeneration of `routeTree.gen.ts`. Verify that the generated file reflects the new pathless layout structure with all nine child routes nested under `_dashboard`. Commit the regenerated file.

**(g) Verify code splitting**: Confirm that `.lazy.tsx` files inside `_dashboard/` still produce separate code‑split chunks. TanStack Router's automatic code splitting works with both flat and directory‑based routes; the `.lazy` suffix remains the trigger for chunk separation.

**Research Findings (2026‑05‑06):**
- Pathless layout routes use underscore prefix: `_dashboard` → no URL segment added
- Directory with `route.tsx` acts as layout route; child files inherit it
- Auth guard via `beforeLoad` with `redirect()` is the 2026 standard pattern
- TanStack Router supports mixed flat + directory routing
- `createLazyFileRoute` works inside pathless layout directories without modification
- `__root.tsx` should be thin: providers only, no layout logic
- Route tree regeneration is automatic via Vite plugin; generated file must be committed

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-6` (consolidated root route with auth guard)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-7` (shell components verified — `MainLayout`, `Sidebar`, `Header`)

**Blocks:**
- **All Phase 1 domain UI tasks** — every `P1‑*-UI-*` task depends on the route tree structure
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-ARCH-1` (settings layout route)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-*`
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-*`
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-UI-*`
- `tasks/phase-1/P1-FIN.md → P1-FIN-UI-*`
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-*`
- `tasks/phase-1/P1-ONBOARD.md → P1-ONBOARD-*`
- `tasks/phase-1/P1-ANALYTICS.md → P1-ANALYTICS-*`
- `tasks/phase-1/P1-DASHBOARD.md → P1-DASHBOARD-*`
- `tasks/phase-1/P1-QA.md → P1-QA-1`

**Related Files:**
- `apps/web/src/routes/__root.tsx` (simplify)
- `apps/web/src/routes/_dashboard/route.tsx` (new)
- `apps/web/src/routes/_dashboard/*.lazy.tsx` (moved — 9 files)
- `apps/web/src/routes/index.tsx` (verify redirect logic)
- `apps/web/src/routes/signin.tsx` (verify remains public)
- `apps/web/src/routes/signup.tsx` (verify remains public)
- `apps/web/src/routes/$.tsx` (verify 404 renders without MainLayout)
- `apps/web/src/routes/api.$.ts` (verify untouched)
- `apps/web/src/components/layout/MainLayout.tsx` (reference — wrapped by `_dashboard/route.tsx`)
- `apps/web/src/routeTree.gen.ts` (regenerated — commit after refactor)

**Definition of Done**
- [ ] `apps/web/src/routes/_dashboard/` directory created
- [ ] `apps/web/src/routes/_dashboard/route.tsx` created with `createFileRoute('/_dashboard')`, `beforeLoad` auth guard, and `MainLayout` + `<Outlet />` rendering
- [ ] All nine domain lazy route files moved from `routes/` into `routes/_dashboard/` with corrected path strings
- [ ] `__root.tsx` simplified: no `MainLayout`, no auth guard; providers and devtools only
- [ ] Public routes (`signin.tsx`, `signup.tsx`) render without `MainLayout` — no regression
- [ ] 404 page (`$.tsx`) renders without `MainLayout` — fixes current behavior
- [ ] `index.tsx` redirects unauthenticated users to `/signin` and authenticated users to `/dashboard`
- [ ] `routeTree.gen.ts` regenerated and committed with correct pathless layout structure
- [ ] All nine domain pages functional: `/dashboard`, `/crm`, `/projects`, `/documents`, `/finance`, `/assets`, `/portal`, `/analytics`, `/settings`
- [ ] Lazy code splitting preserved: each domain page produces its own chunk
- [ ] No TypeScript errors; `pnpm run typecheck` passes
- [ ] No routing regressions; `pnpm dev` starts without errors

**Out of Scope**
- Creating nested sub‑routes inside domains (Phase 1 domain tasks — e.g., `_dashboard/crm/$leadId.tsx`)
- Creating a `_dashboard/settings/` sub‑layout (P1‑SETTINGS‑ARCH‑1)
- Adding loaders or data preloading to the `_dashboard` layout (can be added later)
- Refactoring `MainLayout` itself (verified in P0‑SHELL‑7)

**Rules to Follow**
- The `_dashboard` layout route must NOT add a URL segment — visiting `/crm` must still work, not `/dashboard/crm`.
- `createLazyFileRoute` path arguments must use flat URLs (e.g., `/crm`), not relative paths.
- Never delete old route files until new ones are confirmed working — move in a single commit to maintain git history.
- `routeTree.gen.ts` must be regenerated and committed after structural changes.
- `MainLayout` must never render for public routes (signin, signup, 404, landing).
- The auth guard must handle both SSR (initial load) and client‑side navigation without hydration mismatches.

**Verification**
```bash
# Verify route structure
ls -la apps/web/src/routes/_dashboard/

# Verify pathless layout: /crm should show MainLayout (auth required)
# Verify public routes: /signin should NOT show MainLayout
# Verify 404: /nonexistent should NOT show MainLayout

# Verify all domain pages load
curl http://localhost:3000/dashboard
curl http://localhost:3000/crm
curl http://localhost:3000/projects
curl http://localhost:3000/documents
curl http://localhost:3000/finance
curl http://localhost:3000/assets
curl http://localhost:3000/portal
curl http://localhost:3000/analytics
curl http://localhost:3000/settings

# Verify code splitting
# In browser DevTools → Network tab → navigate to CRM → verify chunk loaded for crm.lazy.tsx

# Verify routeTree.gen.ts committed
git diff --name-only HEAD | grep routeTree.gen.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an authenticated user, I see the dashboard sidebar and header on every domain page. As an unauthenticated user, I see a clean sign‑in page without the dashboard shell.
- Deep Module: The `_dashboard/route.tsx` layout encapsulates the auth guard and `MainLayout` rendering behind a single pathless route definition, making the `__root.tsx` a pure provider shell and enabling clean separation of concerns across the entire route tree.

---

#### Subtasks

- [ ] P1-ROUTE-1.0.25 (AGENT): Read current `__root.tsx` (auth guard, MainLayout wrapping, provider setup), all nine lazy route files, and `index.tsx`. Catalog the current beforeLoad logic, public path exceptions, and provider arrangement.
  **Verification:** Current route architecture documented.

- [ ] P1-ROUTE-1.0.5 (AGENT): Research TanStack Router pathless layout routes, underscore convention, `route.tsx` directory layout pattern, lazy route compatibility, and SSR auth guard considerations.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-ROUTE-1.1 (AGENT): Create `apps/web/src/routes/_dashboard/` directory and `route.tsx` with `createFileRoute('/_dashboard')`, `beforeLoad` auth guard, and `MainLayout` + `<Outlet />` wrapper.
  **File(s):** `apps/web/src/routes/_dashboard/route.tsx` (new)
  **Verification:** Layout route compiles; auth guard redirects unauthenticated users to `/signin`.

- [ ] P1-ROUTE-1.2 (AGENT): Move all nine domain lazy route files into `_dashboard/`, updating `createLazyFileRoute` path arguments to flat URLs.
  **File(s):** `apps/web/src/routes/_dashboard/*.lazy.tsx` (moved — 9 files)
  **Verification:** All nine pages load at their flat URLs with MainLayout.

- [ ] P1-ROUTE-1.3 (AGENT): Simplify `__root.tsx`: remove conditional MainLayout and auth guard; keep only providers, devtools, MSW init, and tenant ID sync.
  **File(s):** `apps/web/src/routes/__root.tsx`
  **Verification:** Root route is thin; no layout or auth logic.

- [ ] P1-ROUTE-1.4 (AGENT): Verify public routes: `signin.tsx`, `signup.tsx`, `$.tsx`, and `index.tsx` remain at root level and render without MainLayout.
  **File(s):** `apps/web/src/routes/signin.tsx`, `signup.tsx`, `$.tsx`, `index.tsx`
  **Verification:** Public pages render cleanly; 404 does not show sidebar.

- [ ] P1-ROUTE-1.5 (AGENT): Run `pnpm dev`, verify `routeTree.gen.ts` regenerates correctly, commit the generated file.
  **File(s):** `apps/web/src/routeTree.gen.ts`
  **Verification:** Generated route tree reflects pathless layout structure.

- [ ] P1-ROUTE-1.6 (AGENT): Verify lazy loading: confirm each domain page produces its own code‑split chunk.
  **Verification:** Network tab shows separate chunks for each lazy route.

- [ ] P1-ROUTE-1.7 (HUMAN): Full application walk‑through: test all nine domain pages with auth, test public routes, verify code splitting. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. The P1‑ROUTE‑1 task is the single critical‑path dependency for Phase 1.*