# tasks/phase-1/P1-SETTINGS.md — Settings Architecture & UI

This file covers the creation of a **2‑level settings sidebar layout route** using TanStack Router's directory‑based nested routing, a settings‑scoped search/filter component, the Notification Preferences settings page with per‑category toggle controls, the Email Settings page with sending domain/reply‑to/email signature configuration, and the User Profile settings page with avatar upload via presigned URLs. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑SETTINGS (2026‑05‑06)

### 1. Settings 2‑Level Sidebar Layout — Nested Route Patterns

The 2026 consensus for settings architecture across multiple production SaaS implementations separates **layout shell** from **content pages** using nested routing:

- **Judgemind #1144 (2026‑03‑20)**: Redesigned sidebar with "Navigation items organized under section labels like Dashboards, Pages, Apps, and Form Elements" — grouped, collapsible sub‑sections with active state tracking across parent and child items.
- **nmi-agro/fdm #401 (2026‑01‑05)**: "Refactor the organization routes to use a nested subpage architecture, leveraging React Router v7's layout routes. This will provide a cleaner navigation experience and a dedicated sidebar context".
- **vedovelli/ai-dev-team-simulation #416 (2026‑03‑18)**: Settings routes designed as `/settings`, `/settings/profile`, `/settings/notifications`, `/settings/display` with "consistent query key hierarchy" and "proper cache invalidation when settings are updated across different pages".
- **freeCodeCamp Guide (2026‑04‑14)**: "A config driven and modular sidebar system. Navigation data is separated from UI components. It supports dynamic routes, permissions, and feature flags".
- **Shadcn Sidebar Patterns (2026‑03‑07)**: "A well designed sidebar improves: Maintainability, Scalability, Developer productivity, Routing consistency, Permission handling, Performance".

**The Canonical Structure** for UBOS settings — validated by the CSDN TanStack Router实战 guide (2026‑01‑12):

```
routes/_dashboard/settings/
├── route.tsx                    # Settings layout route (sidebar + Outlet)
├── index.tsx                    # /settings (redirects to first section)
├── general.tsx                  # /settings/general
├── users-permissions.tsx        # /settings/users-permissions
├── email.tsx                    # /settings/email
├── notifications.tsx            # /settings/notifications
├── integrations.tsx             # /settings/integrations
├── security/                    # Auth-related settings group
│   ├── mfa.tsx
│   ├── sessions.tsx
│   └── sso.tsx
├── billing.tsx
├── api-webhooks.tsx
└── audit-log.tsx
```

A `route.tsx` inside a directory creates a **layout route** that wraps all sibling and child routes with a shared UI (in this case, the settings sidebar) and renders the active content page through `<Outlet />`.

### 2. Settings Sidebar — Composition Pattern

The 2026 shadcn/ui ecosystem provides the canonical sidebar composition pattern. The sidebar component system (25 components in the current UBOS `sidebar.tsx`) already supports all the primitives needed:

- **Grouped sections**: `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent` for organizing settings categories
- **Active state tracking**: `SidebarMenuButton` with `isActive` prop matching the current route via TanStack Router's `useMatchRoute()`
- **Collapsible sections**: `Collapsible` wrapping `SidebarGroup` for expand/collapse behavior
- **Badge counts**: `SidebarMenuBadge` for showing pending items

The pattern from **Shadcn Sidebar Patterns (2026‑03‑07)** emphasizes **config‑driven architecture**: "Navigation items are stored in a config file and mapped into UI components. This keeps logic clean and avoids repeating code".

For UBOS, the settings sidebar items should be defined as a typed configuration array:

```typescript
export const settingsNavItems = [
  { title: 'General', href: '/settings/general', icon: Settings },
  { title: 'Users & Permissions', href: '/settings/users-permissions', icon: Users },
  { title: 'Email', href: '/settings/email', icon: Mail },
  { title: 'Notifications', href: '/settings/notifications', icon: Bell },
  { title: 'Integrations', href: '/settings/integrations', icon: Puzzle },
  { title: 'Security', icon: Shield, children: [
    { title: 'MFA', href: '/settings/security/mfa' },
    { title: 'Sessions', href: '/settings/security/sessions' },
    { title: 'SSO', href: '/settings/security/sso' },
  ]},
  { title: 'Billing', href: '/settings/billing', icon: CreditCard },
  { title: 'API & Webhooks', href: '/settings/api-webhooks', icon: Code },
  { title: 'Audit Log', href: '/settings/audit-log', icon: ScrollText },
];
```

### 3. Settings Search / Filter — Implementation Patterns

The `dnviti/arsenale #197` issue (2026‑03‑12) demonstrates the standard pattern: a `cmd`‑style search input that filters settings navigation items by title/description, with keyboard navigation and highlighted matches.

For UBOS, the search should:
- Accept a `search` query prop or local state
- Filter the `settingsNavItems` array by matching against `title` and optional `description` fields
- Highlight matching text in results
- Support keyboard navigation (ArrowUp/Down, Enter)
- Be debounced at 150ms to avoid re‑renders on rapid typing
- Use the existing shadcn/ui `Command` component (already in the project as `CommandPalette.tsx`) for the dropdown UI

### 4. Notification Preferences — Per‑Category Toggle Design

The 2026 standard for SaaS notification preferences combines **category‑based toggles** with **per‑channel delivery controls**:

- **shadcn.io "Account Email Preferences" block (2026‑04‑05)**: "expandable notification categories with individual email type toggles, per-category frequency selectors (Instant, Daily digest, Weekly digest), always-on transactional emails, and a one-click unsubscribe all non-essential option".
- **shadcn.io "Onboarding Notification Permissions" block (2026‑03‑28)**: "Four notification channels with individual Switch toggles for email, push, SMS, and in-app notifications, each with an icon, label, and description".
- **dnviti/arsenale #197 (2026‑03‑12)**: Categories grouped by domain (Sharing, Secrets, Security, Organization, Sessions), each with toggle switches for in‑app delivery, with email column "present but disabled with 'Coming soon' tooltip".
- **khenson99/arda-vibe #349 (2026‑02‑12)**: "Preference matrix grouped by category with rows per notification type. Email/webhook toggles autosave via debounced and show success toast".

**For UBOS Phase 0/1**, the notification preferences page should:
- Group notifications by domain (CRM, Projects, Documents, Finance, Platform)
- Each row: notification type label + description + toggle switches for In‑App and Email channels
- Always‑on transactional notifications (password reset, email verification) shown as locked toggles
- Auto‑save via debounced `onChange` (300ms) — no explicit save button needed
- Show success toast on save, error toast on failure

### 5. Email Settings — Sending Domain, Reply‑To, Signature

The 2026 consensus for SaaS email configuration pages comes from three sources:

- **Email Deliverability Guide (2026‑04‑07)**: "Use separate sending domains: Transactional (notifications@app.com): password resets, receipts, alerts — high deliverability required" and "Never send marketing email from your transactional domain".
- **Resend DNS Configuration Patterns**: SPF (`include:spf.resend.com`), DKIM (CNAME `resend._domainkey`), DMARC (`p=quarantine` with aggregate reports).
- **Reply‑To Best Practices**: "Enter the email address where you want replies to arrive. Confirm that the inbox is actively monitored by your team". Multiple SaaS platforms (HubSpot, Desk365, WellnessLiving) use identical patterns.

**The Email Settings page for UBOS** should provide:
- **Sending Domain section**: Display verified domain status (verified/pending/unverified), DNS record checklist (SPF, DKIM, DMARC), "Add Domain" button
- **Default From Address**: Editable input with validation — format `"UBOS <noreply@mail.ubos.app>"`
- **Reply‑To Address**: Editable input — where customer replies are directed (e.g., `support@ubos.app`)
- **Email Signature**: Rich text or plain text editor for default email footer appended to all transactional emails

### 6. User Profile Settings — Avatar Upload via Presigned URLs

The 2026 standard for avatar upload uses **presigned PUT URLs** to bypass the application server entirely:

- **Cloudflare R2 Presigned URL Pattern**: "Files are uploaded directly by clients using presigned PUT URLs — never through the server".
- **shadcn.io "Account Avatar Upload" block (2026‑04‑05)**: "Large centered avatar preview, drag-and-drop file upload zone, generate-from-initials option, avatar history thumbnails for reverting to previous photos, file size and format validation with inline feedback".
- **100-hours-a-week/IMYME #75 (2026‑02‑11)**: "Avatar image expiry (presigned GET) handling — React Query cache invalidation to fetch new presigned URL on load failure, preventing infinite retry".

**The flow**: (1) Frontend calls tRPC procedure to request a presigned upload URL for the avatar path, (2) receives `{ uploadUrl, publicUrl, key }`, (3) PUTs the image file directly to R2 via the presigned URL, (4) on success, calls a tRPC procedure to update the user's `avatarKey` in the database, (5) invalidates the React Query cache so the new avatar appears immediately.

**Image requirements**: Max 2 MB, accepted formats `image/png, image/jpeg, image/webp`. The avatar should render at 80×80 px with a circular crop. Fallback to computed initials with a deterministic background color.

### 7. TanStack Router Nested Settings Routes — Technical Implementation

The CSDN guide (2026‑01‑12) provides the canonical nested layout pattern for TanStack Router:

```typescript
// routes/_dashboard/settings/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <div className="flex h-full">
      <SettingsSidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

Child routes (e.g., `routes/_dashboard/settings/general.tsx`) use `createFileRoute('/_dashboard/settings/general')` — the route path reflects the full nested tree. The URL seen by the browser is `/settings/general` because `_dashboard` is pathless.

**Type‑safe navigation**: TanStack Router's `Link` component with `to` props provides compile‑time validation of route paths:

```tsx
<Link to="/settings/general">General</Link>
```

---

## Task Definitions

### [ ] P1-SETTINGS-ARCH-1: Build Settings 2-level sidebar layout route

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No settings layout route exists. The existing `settings.lazy.tsx` at `routes/_dashboard/settings.lazy.tsx` (after P1‑ROUTE‑1 migration) renders a single page with seven category tabs using in‑page state. All tabs except "Users & Permissions" and "Integrations" are placeholders with "coming soon" text. When more settings pages are added in Phase 1, this in‑page tab approach will become unmaintainable — there is no way to deep‑link to a specific settings section (e.g., `/settings/email`), no settings‑scoped sidebar for navigation, and no shared layout for settings pages. This matches the problem described by nmi-agro/fdm: "a single, overloaded page that is difficult to scale as we add more features".
**Size:** Large

**Description:**
Transform the flat `settings.lazy.tsx` page into a **directory‑based settings route** with a dedicated settings sidebar layout. This is the architectural foundation for all settings pages — every Phase 1 and Phase 2 settings task depends on this layout being in place first, exactly as vedovelli states: "Ana's UI components depend on this routing structure being in place first".

**(a) Create `routes/_dashboard/settings/` directory**: This directory will contain the settings layout route and all settings content pages.

**(b) Create `routes/_dashboard/settings/route.tsx`** — the settings layout route:
```typescript
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'

export const Route = createFileRoute('/_dashboard/settings')({
  component: SettingsLayoutRoute,
})

function SettingsLayoutRoute() {
  return (
    <div className="flex h-full">
      <SettingsSidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
```
The layout renders a persistent settings sidebar on the left and the active content page on the right. On mobile (below 768 px), the sidebar collapses into a Sheet drawer accessible via a hamburger button in the top bar of the settings content area. The mobile behavior follows the pattern from `judgemind/judgemind #1144`: "Sheet (side="left") for mobile menu".

**(c) Create `SettingsSidebar` component** (`apps/web/src/components/settings/SettingsSidebar.tsx`):
- Use existing shadcn/ui `Sidebar` provider and components from `components/ui/sidebar.tsx`
- Define `settingsNavItems` as a typed configuration array with `title`, `href`, `icon`, optional `children`, optional `description`
- Navigation items organized into expandable groups: **Platform** (General, Users & Permissions, Audit Log), **Communication** (Email, Notifications), **Integrations** (Integrations, API & Webhooks), **Billing** (Billing), **Security** (MFA, Sessions, SSO)
- Active state tracked via `useMatchRoute()` from TanStack Router — a nav item is active when the current route matches its `href` or any child `href`
- Collapsible groups use `Collapsible` + `SidebarGroup` — clicking a group header toggles visibility of its children
- Icon‑only collapsed state on narrow screens (matches existing sidebar behavior)

**(d) Create `routes/_dashboard/settings/index.tsx`**: A landing/redirect route that redirects to the first settings section (`/settings/general`) or renders a "Select a settings section" placeholder if no default is configured.

**(e) Refactor existing `settings.lazy.tsx`**: The existing single‑page settings component must be **disassembled** — its content sections become separate route files:
- `routes/_dashboard/settings/general.tsx` — (Phase 1) replaces the current General tab placeholder
- `routes/_dashboard/settings/users-permissions.tsx` — migrate the existing Users & Permissions table and functionality
- `routes/_dashboard/settings/integrations.tsx` — migrate the existing integrations grid

The **remaining placeholders** become stub route files that render appropriate "coming soon" states:
- `email.tsx`, `notifications.tsx`, `billing.tsx`, `api-webhooks.tsx`, `audit-log.tsx`
- `security/mfa.tsx`, `security/sessions.tsx`, `security/sso.tsx`

**(f) Update `routeTree.gen.ts`**: After all file creation and moves, run `pnpm dev` to regenerate the route tree. Verify the generated file reflects the nested settings routing structure. Commit the regenerated file.

**(g) Preserve functionality**: The Users & Permissions table and Integrations grid must remain fully functional after migration — all interactive elements (role dropdowns, status toggles, integration connection buttons) must work identically to the pre‑refactor state.

**Research Findings (2026‑05‑06):**
- Nested settings routes: `route.tsx` as layout + child files as content pages
- Config‑driven sidebar reduces code duplication and enables search/filter
- Four settings groups: Platform, Communication, Integrations, Billing + Security sub‑group
- Mobile sidebar uses shadcn Sheet for slide‑out navigation
- Active state via `useMatchRoute()` with URL pattern matching
- Directory‑based routes are the 2026 consensus for maintainable settings architecture

**Depends on:**
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1` (`_dashboard` layout route must exist)

**Blocks:**
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-SEARCH` (settings search)
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-3` (notification preferences)
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-4` (email settings)
- `tasks/phase-1/P1-SETTINGS.md → P1-AUTH-PROFILE` (user profile)
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-1` (functional users & permissions)
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-2` (org settings)
- `tasks/phase-2/P2-SETTINGS-SEC-*` (all Phase 2 security settings)
- `tasks/phase-2/P2-SETTINGS-*` (all other Phase 2 settings)

**Related Files:**
- `apps/web/src/routes/_dashboard/settings/route.tsx` (new)
- `apps/web/src/routes/_dashboard/settings/index.tsx` (new)
- `apps/web/src/routes/_dashboard/settings/general.tsx` (new)
- `apps/web/src/routes/_dashboard/settings/users-permissions.tsx` (migrate content)
- `apps/web/src/routes/_dashboard/settings/integrations.tsx` (migrate content)
- `apps/web/src/routes/_dashboard/settings/email.tsx` (new — placeholder for P1‑SETTINGS‑4)
- `apps/web/src/routes/_dashboard/settings/notifications.tsx` (new — placeholder for P1‑SETTINGS‑3)
- `apps/web/src/routes/_dashboard/settings/billing.tsx` (new — placeholder)
- `apps/web/src/routes/_dashboard/settings/api-webhooks.tsx` (new — placeholder)
- `apps/web/src/routes/_dashboard/settings/audit-log.tsx` (new — placeholder)
- `apps/web/src/routes/_dashboard/settings/security/mfa.tsx` (new — placeholder)
- `apps/web/src/routes/_dashboard/settings/security/sessions.tsx` (new — placeholder)
- `apps/web/src/routes/_dashboard/settings/security/sso.tsx` (new — placeholder)
- `apps/web/src/components/settings/SettingsSidebar.tsx` (new)
- `apps/web/src/routes/_dashboard/settings.lazy.tsx` (remove — content migrated)
- `apps/web/src/routeTree.gen.ts` (regenerated)

**Definition of Done**
- [ ] `routes/_dashboard/settings/` directory created with `route.tsx` layout file
- [ ] `SettingsSidebar` component created with: four collapsible groups, active route highlighting, config‑driven nav items, responsive Sheet drawer on mobile
- [ ] Settings layout renders sidebar on left, `<Outlet />` content area on right
- [ ] `routes/_dashboard/settings/index.tsx` redirects to `/settings/general`
- [ ] Existing Users & Permissions content migrated to `users-permissions.tsx` with full functionality preserved
- [ ] Existing Integrations content migrated to `integrations.tsx` with all connection status badges preserved
- [ ] All nine placeholder route files created with appropriate "coming soon" states
- [ ] Old `settings.lazy.tsx` file removed
- [ ] `routeTree.gen.ts` regenerated and committed
- [ ] All settings routes accessible via flat URLs: `/settings/general`, `/settings/email`, `/settings/notifications`, etc.
- [ ] Deep‑linking works: navigating directly to `/settings/email` renders the email settings page within the settings layout
- [ ] Mobile: sidebar collapses into Sheet drawer at <768px
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Implementing the content of placeholder settings pages (done in subsequent P1‑SETTINGS tasks)
- Search/filter in the settings sidebar (P1‑SETTINGS‑SEARCH)
- RBAC‑based filtering of settings nav items (deferred — all items visible to all authenticated users for Phase 1)

**Rules to Follow**
- The settings layout route must use TanStack Router's directory‑based `route.tsx` convention.
- Settings nav items must be defined as a typed configuration array, not hardcoded in JSX.
- The `useMatchRoute()` hook must handle nested paths — a parent is active if any child matches.
- Mobile sidebar must use the existing shadcn `Sheet` component — do not introduce new drawer libraries.
- The existing Users & Permissions functionality must be preserved exactly — no regression in role dropdowns or status toggles.
- `routeTree.gen.ts` must be committed after every route structure change.

**Verification**
```bash
# Verify settings layout structure
ls -la apps/web/src/routes/_dashboard/settings/

# Verify all settings routes are accessible
curl http://localhost:3000/settings/general
curl http://localhost:3000/settings/users-permissions
curl http://localhost:3000/settings/email
curl http://localhost:3000/settings/notifications
curl http://localhost:3000/settings/integrations
curl http://localhost:3000/settings/billing
curl http://localhost:3000/settings/api-webhooks
curl http://localhost:3000/settings/audit-log
curl http://localhost:3000/settings/security/mfa

# Verify deep‑linking: navigate directly to /settings/email → renders within settings layout
# Verify Users & Permissions: role dropdowns and status toggles work identically to pre‑refactor
# Verify Integrations: service cards with connection badges preserved
# Verify mobile: at 375px, hamburger button opens settings sidebar in Sheet drawer

# Verify routeTree.gen.ts committed
git diff --name-only HEAD | grep routeTree.gen.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can navigate to `/settings/email` directly and see the email settings page with the settings sidebar visible, rather than hunting through in‑page tabs.
- Deep Module: The `SettingsSidebar` component encapsulates the complexity of grouped navigation, collapsible sections, active route tracking, and responsive behavior behind a single config array, making the addition of new settings pages a one‑line config change.

---

#### Subtasks

- [ ] P1-SETTINGS-ARCH-1.0.25 (AGENT): Read current `settings.lazy.tsx`, existing shadcn `sidebar.tsx` component, and `P1-ROUTE-1` output (`_dashboard/route.tsx`). Catalog all interactive elements to preserve.
  **Verification:** Current settings implementation and transfer requirements documented.

- [ ] P1-SETTINGS-ARCH-1.0.5 (AGENT): Research TanStack Router nested directory routes, shadcn Sidebar composition patterns, config‑driven navigation, and production settings architectures.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-SETTINGS-ARCH-1.1 (AGENT): Create `routes/_dashboard/settings/` directory and `route.tsx` layout with `<SettingsSidebar />` + `<Outlet />` structure.
  **File(s):** `apps/web/src/routes/_dashboard/settings/route.tsx` (new)
  **Verification:** Layout renders sidebar on left, content area on right.

- [ ] P1-SETTINGS-ARCH-1.2 (AGENT): Create `SettingsSidebar` component with typed nav config, four collapsible groups, active route tracking, and responsive Sheet drawer.
  **File(s):** `apps/web/src/components/settings/SettingsSidebar.tsx` (new)
  **Verification:** Sidebar navigates between settings sections; active state highlights correct item.

- [ ] P1-SETTINGS-ARCH-1.3 (AGENT): Create `routes/_dashboard/settings/index.tsx` redirect route.
  **File(s):** `apps/web/src/routes/_dashboard/settings/index.tsx` (new)
  **Verification:** Navigating to `/settings` redirects to `/settings/general`.

- [ ] P1-SETTINGS-ARCH-1.4 (AGENT): Migrate Users & Permissions tab content to `users-permissions.tsx`.
  **File(s):** `apps/web/src/routes/_dashboard/settings/users-permissions.tsx` (new)
  **Verification:** Table with initials, email, role dropdowns, status toggles preserved and functional.

- [ ] P1-SETTINGS-ARCH-1.5 (AGENT): Migrate Integrations tab content to `integrations.tsx`.
  **File(s):** `apps/web/src/routes/_dashboard/settings/integrations.tsx` (new)
  **Verification:** Six service cards with connection badges and action buttons preserved.

- [ ] P1-SETTINGS-ARCH-1.6 (AGENT): Create placeholder route files for all remaining settings sections with appropriate "coming soon" UI.
  **File(s):** 10 new files under `routes/_dashboard/settings/`
  **Verification:** Each route renders its title and a placeholder state.

- [ ] P1-SETTINGS-ARCH-1.7 (AGENT): Remove old `settings.lazy.tsx`; regenerate and commit `routeTree.gen.ts`.
  **File(s):** Remove `routes/_dashboard/settings.lazy.tsx`; regenerate `routeTree.gen.ts`
  **Verification:** Old file deleted; route tree regenerated with nested settings structure.

- [ ] P1-SETTINGS-ARCH-1.8 (HUMAN): Full walk‑through: test all settings routes, verify deep‑linking, test mobile sidebar drawer, confirm Users & Permissions and Integrations are functional. Approve.
  **Verification:** Approved.

---

### [ ] P1-SETTINGS-SEARCH: Build Settings search/filter within settings sidebar

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No settings search or filter functionality exists. When the settings section grows beyond 10 pages (Phase 1 + Phase 2), users will need to scan the sidebar to find the right settings page. A search input within the settings sidebar allows rapid navigation by filtering navigation items by title. The `dnviti/arsenale #197` issue (2026‑03‑12) demonstrates the exact pattern needed: a search input that filters settings sections by name and description.
**Size:** Small

**Description:**
Add a search input to the `SettingsSidebar` component created in P1‑SETTINGS‑ARCH‑1. The search field filters the settings navigation items in real time as the user types.

**Implementation**: The search input sits at the top of the settings sidebar, above the navigation groups. It uses the existing shadcn/ui `Input` component with a search icon. On input change (debounced at 150ms), filter the `settingsNavItems` configuration array:

1. Flatten all navigation items (including nested children in collapsible groups) into a single searchable list
2. Match against each item's `title` and optional `description` field using case‑insensitive substring matching
3. Render matching items in a dropdown or replace the sidebar navigation with search results
4. Highlight the matching portion of each result's title (using `<mark>` or a highlight span)
5. Support keyboard navigation: ArrowUp/ArrowDown to move between results, Enter to navigate to the selected item
6. Click outside or press Escape to clear the search and restore the normal sidebar navigation

**Alternative — use existing `Command` component**: The project already has `apps/web/src/components/ui/command.tsx` (cmdk‑based command palette) and `apps/web/src/components/CommandPalette.tsx`. The settings search can leverage the same `Command` primitives for the filtered dropdown, providing visual consistency with the global command palette.

**When a user selects a result**, navigate to that settings page using TanStack Router's `router.navigate({ to: item.href })`. The search input clears and focus returns to the page content.

**Research Findings (2026‑05‑06):**
- Search input at top of settings sidebar, debounced 150ms
- Filter by title + description using substring matching
- Keyboard navigation with highlight
- Leverage existing cmdk `Command` component for consistency
- Navigate via `router.navigate()` on selection

**Depends on:**
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-ARCH-1` (settings sidebar exists)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/components/settings/SettingsSidebar.tsx` (add search functionality)
- `apps/web/src/components/ui/command.tsx` (reference)

**Definition of Done**
- [ ] Search input rendered at top of settings sidebar with search icon
- [ ] Typing filters settings nav items in real time (150ms debounce)
- [ ] Matched text highlighted in results
- [ ] Keyboard navigation: ArrowUp/ArrowDown to move, Enter to select, Escape to clear
- [ ] Selecting a result navigates to that settings page and clears the search
- [ ] Clicking outside the search results clears the search
- [ ] Empty search state shows "No settings found" message
- [ ] Search does not appear on mobile (sidebar is a Sheet drawer; search adds complexity for small screens)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full‑text search across settings content (only searches nav item titles/descriptions)
- Search analytics (tracking which settings are most searched)
- Voice search or advanced query syntax

**Rules to Follow**
- The search must never block the settings sidebar from rendering — if the search index fails to build, show all items unfiltered.
- Keyboard focus must be managed: Tab into the search input, Arrow keys within results, Enter to navigate.
- The search input must have appropriate `aria-label` and `role="searchbox"` attributes.

**Verification**
```bash
# Verify search functionality in the settings sidebar
# 1. Navigate to /settings/general
# 2. Click the search input in the settings sidebar
# 3. Type "email" → sidebar filters to show Email settings
# 4. Press ArrowDown → highlight moves to result
# 5. Press Enter → navigates to /settings/email
# 6. Press Escape → search clears, normal sidebar restored

# Verify debounce
# Type rapidly → only one filter operation occurs after 150ms pause

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user who doesn't remember which settings group an option is under, I can type "API" in the settings search and immediately navigate to the API & Webhooks page.

---

#### Subtasks

- [ ] P1-SETTINGS-SEARCH.0.25 (AGENT): Read P1‑SETTINGS‑ARCH‑1 output (`SettingsSidebar.tsx`, nav config). Research cmdk search patterns and debounced filtering.
  **Verification:** Current sidebar structure and search implementation approach documented.

- [ ] P1-SETTINGS-SEARCH.0.5 (AGENT): Design the search UX: input placement, result rendering, keyboard interaction, mobile behavior.
  **Verification:** Design documented.

- [ ] P1-SETTINGS-SEARCH.1 (AGENT): Add search input and real‑time filtering to `SettingsSidebar.tsx` with keyboard navigation and highlight.
  **File(s):** `apps/web/src/components/settings/SettingsSidebar.tsx`
  **Verification:** Search filters nav items and supports keyboard selection.

- [ ] P1-SETTINGS-SEARCH.2 (HUMAN): Test search with various queries, keyboard navigation, and mobile exclusion. Approve.
  **Verification:** Approved.

---

### [ ] P1-SETTINGS-3: Build Notification Preferences settings page

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No notification preferences UI exists. The `settings.lazy.tsx` page has an "Email & Notifications" tab that is a placeholder. Users cannot control which notification types they receive or through which channels. The notification dispatch infrastructure (P1‑INTEG‑6 and P1‑INTEG‑7) will rely on user preferences to gate delivery, so this page is a prerequisite for a functional notification system. The `notifications.tsx` placeholder route file exists (from P1‑SETTINGS‑ARCH‑1) but contains no implementation.
**Size:** Medium

**Description:**
Build the Notification Preferences page at `routes/_dashboard/settings/notifications.tsx` that replaces the placeholder created in P1‑SETTINGS‑ARCH‑1. The page follows the 2026 standard of **category‑based toggle groups with per‑channel controls**, drawing from the shadcn.io blocks and community implementations.

**(a) Page structure**: A two‑column layout:
- **Left column (wider)**: Notification categories with per‑type toggles
- **Right column (narrower)**: Delivery frequency settings and unsubscribe option

**(b) Notification categories and types** (Phase 1 scope):

| Category | Notification Types | Channels |
|---|---|---|
| **CRM** | Lead assigned, Lead stage changed, Deal won/lost, Contact added | In‑App, Email |
| **Projects** | Task assigned, Task completed, Project deadline approaching, Milestone reached | In‑App, Email |
| **Documents** | Document shared, Document signed, Upload requested, Signature needed | In‑App, Email |
| **Finance** | Invoice paid, Bill approved, Payment failed, Budget exceeded | In‑App, Email |
| **Platform** | Team member invited, Role changed, Billing updated, New sign‑in detected | In‑App, Email |

**(c) Per‑category controls**: Each category row shows:
- Category name and brief description
- In‑App toggle (Switch component, enabled by default)
- Email toggle (Switch component, disabled by default except for Platform security alerts)
- Always‑on items (password reset, email verification) shown with locked toggles and a "Required" badge

**(d) Auto‑save behavior**: All toggle changes auto‑save after a 300ms debounce. On successful save, show a brief success toast. On failure, show an error toast and revert the toggle. No explicit "Save Changes" button is needed — following the debounced auto‑save pattern from khenson99/arda‑vibe: "Email/webhook toggles autosave via debounced and show success toast".

**(e) Delivery frequency section**: A card at the bottom with frequency options:
- Instant (default) — notifications sent immediately
- Daily digest — batched once per day at a configurable time
- Weekly digest — batched once per week

This section uses `Select` components for time preference when digest mode is selected.

**(f) Unsubscribe all**: A "Pause all non‑essential notifications" button that sets a global mute flag. When active, only security‑critical and transactional notifications are delivered. This follows the shadcn.io pattern: "one‑click unsubscribe all non‑essential option".

**(g) Data persistence**: Notification preferences are stored via tRPC procedures:
- `GET /api/trpc/settings.notifications.getPreferences` — returns all preferences with defaults for unset types
- `PUT /api/trpc/settings.notifications.updatePreference` — upserts a single preference (used by auto‑save)
- `PUT /api/trpc/settings.notifications.bulkUpdatePreferences` — batch updates (used by "Unsubscribe all")

If the backend procedures are not yet built (they depend on P1‑INTEG‑6), the page stores preferences in `localStorage` with a documented upgrade path. The page renders and is functional; preferences persist within the browser session.

**Research Findings (2026‑05‑06):**
- Category‑grouped toggles with per‑channel switches (In‑App, Email)
- Always‑on transactional items shown as locked toggles
- Auto‑save via debounced 300ms — no explicit save button
- Delivery frequency: Instant, Daily digest, Weekly digest
- "Unsubscribe all" button for bulk mute
- Backend: tRPC procedures for get/upsert/bulkUpdate preferences

**Depends on:**
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-ARCH-1` (settings layout route)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-8` (root router aggregating domain routers)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-6` (notification system — backend persistence)

**Blocks:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-7` (notification dispatcher gates on user preferences)

**Related Files:**
- `apps/web/src/routes/_dashboard/settings/notifications.tsx` (replace placeholder)
- `apps/web/src/components/settings/NotificationPreferenceRow.tsx` (new — reusable row component)
- `apps/web/src/server/trpc/routers/settings/notifications.ts` (new — notification preference procedures)

**Definition of Done**
- [ ] `routes/_dashboard/settings/notifications.tsx` replaces placeholder with full implementation
- [ ] Five notification categories rendered: CRM, Projects, Documents, Finance, Platform
- [ ] Each category shows description + In‑App toggle + Email toggle
- [ ] Always‑on transactional notifications shown with locked toggles and "Required" badge
- [ ] All toggle changes auto‑save after 300ms debounce with success/error toast
- [ ] Delivery frequency section: Instant, Daily digest (with time picker), Weekly digest
- [ ] "Pause all non‑essential notifications" button with confirmation dialog
- [ ] Backend: tRPC procedures for get/upsert/bulkUpdate preferences (or localStorage fallback with documented upgrade path)
- [ ] Page is responsive: two‑column on desktop, single column on mobile
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- SMS/push/webhook channels (deferred to Phase 2)
- Per‑project or per‑deal notification overrides (granular context preferences)
- Notification template preview within settings
- Slack delivery channel (P2‑INTEG‑5)

**Rules to Follow**
- Toggle state must never be lost on accidental page navigation — auto‑save is mandatory.
- Always‑on notifications must not be toggleable — use a disabled Switch with a lock icon.
- The "Unsubscribe all" action must have a confirmation step to prevent accidental activation.
- All notification copy must be extracted to i18n keys (P1‑I18N‑EXTRACT‑OTHER).

**Verification**
```bash
# Navigate to /settings/notifications
# Verify: five category groups rendered with toggles

# Test auto‑save
# 1. Toggle "Lead assigned" email to ON
# 2. Wait 300ms → verify success toast appears
# 3. Refresh page → verify toggle remains ON

# Test always‑on items
# "Password reset" toggle is locked with "Required" badge — cannot be toggled

# Test unsubscribe all
# 1. Click "Pause all non‑essential notifications"
# 2. Confirm in dialog
# 3. All non‑security toggles set to OFF and locked

# Test delivery frequency
# 1. Select "Daily digest"
# 2. Time picker appears → select 9:00 AM
# 3. Refresh page → settings persist

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user who receives too many notifications, I can disable email notifications for CRM updates while keeping in‑app alerts, and my preferences are saved automatically without clicking a save button.

---

#### Subtasks

- [ ] P1-SETTINGS-3.0.25 (AGENT): Read P1‑SETTINGS‑ARCH‑1 output, current `notifications.tsx` placeholder, and P1‑INTEG‑6 notification system design. Research notification preference UI patterns.
  **Verification:** Current state and UI patterns documented.

- [ ] P1-SETTINGS-3.0.5 (AGENT): Design notification categories, types, channel matrix, and auto‑save UX for UBOS.
  **Verification:** Design documented.

- [ ] P1-SETTINGS-3.1 (AGENT): Build `NotificationPreferenceRow` reusable component with category label, description, In‑App toggle, Email toggle, and locked state.
  **File(s):** `apps/web/src/components/settings/NotificationPreferenceRow.tsx` (new)
  **Verification:** Component renders all four states (enabled, disabled, locked, loading).

- [ ] P1-SETTINGS-3.2 (AGENT): Build the notification preferences page with five categories, auto‑save, delivery frequency, and unsubscribe all.
  **File(s):** `apps/web/src/routes/_dashboard/settings/notifications.tsx` (replace)
  **Verification:** Full notification preferences UI functional.

- [ ] P1-SETTINGS-3.3 (AGENT): Create tRPC procedures for notification preferences (or localStorage fallback).
  **File(s):** `apps/web/src/server/trpc/routers/settings/notifications.ts` (new)
  **Verification:** Preferences persist across page refreshes.

- [ ] P1-SETTINGS-3.4 (HUMAN): Test all toggle combinations, auto‑save, unsubscribe all, delivery frequency, and mobile responsiveness. Approve.
  **Verification:** Approved.

---

### [ ] P1-SETTINGS-4: Build Email Settings page (sending domain, reply-to, signature)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No email settings UI exists. The `settings.lazy.tsx` page has an "Email & Notifications" tab that is a placeholder. The Resend sending domain is configured server‑side (P0‑EMAIL‑1, P0‑EMAIL‑2), but there is no UI for managing email configuration — administrators cannot view domain verification status, change the default From address, set a Reply‑To address, or manage an email signature. All these values are hardcoded in environment variables or server code. The `email.tsx` placeholder route file exists (from P1‑SETTINGS‑ARCH‑1) but contains no implementation.
**Size:** Medium

**Description:**
Build the Email Settings page at `routes/_dashboard/settings/email.tsx` that replaces the placeholder created in P1‑SETTINGS‑ARCH‑1. The page provides administrator control over outbound email configuration, following the established SaaS email infrastructure patterns.

**(a) Page structure**: Three card sections stacked vertically:
- **Sending Domain** card
- **Default From Address** card
- **Reply‑To & Signature** card

**(b) Sending Domain section**: Displays the configured sending domain with:
- Domain name (e.g., `mail.ubos.app`) with verification status badge (Verified / Pending / Error)
- DNS records checklist — three rows showing SPF, DKIM, and DMARC record status:
  - **SPF**: TXT record `v=spf1 include:spf.resend.com -all` — status indicator (Configured / Missing)
  - **DKIM**: CNAME `resend._domainkey.mail.ubos.app` → `resend._domainkey.resend.com` — status indicator
  - **DMARC**: TXT `v=DMARC1; p=quarantine; rua=mailto:dmarc@ubos.app` — status indicator
- Each DNS record row shows the record type, expected value (copyable), and a status badge
- "Verify Domain" button that triggers a re‑check of DNS records
- Domain verification status is read from Resend API or stored in database

The DNS checklist format follows the Resend integration pattern: "Resend, SendGrid, and Postmark all have dashboards that tell you exactly what DNS records to add".

**(c) Default From Address section**: An input field pre‑populated with the current default:
- Format: `"UBOS <noreply@mail.ubos.app>"`
- Validates email format on blur with inline error message
- "Save" button (not auto‑save — explicit save for production configuration changes)
- Shows current value from database or environment variable
- If Resend domain is unverified, show warning: "Cannot send from this address until your sending domain is verified"

**(d) Reply‑To & Signature section**:
- **Reply‑To Address**: Email input for where customer replies are sent (e.g., `support@ubos.app`). This follows the pattern: "Enter the email address where you want replies to arrive. Confirm that the inbox is actively monitored by your team"
- **Email Signature**: A textarea (or lightweight rich text editor) for the default email footer appended to all transactional emails. Plain text with support for basic formatting. Preview renders below the editor showing how the signature will appear in emails
- Both fields save via an explicit "Save" button with success/error toast

**(e) Data persistence**: Settings are stored via tRPC procedures:
- `GET /api/trpc/settings.email.getConfig` — returns current email configuration
- `PUT /api/trpc/settings.email.updateConfig` — updates from address, reply‑to, signature
- `POST /api/trpc/settings.email.verifyDomain` — triggers domain verification check

If backend procedures are not yet built, read current values from environment variables (displayed as read‑only) with an "Edit" button that is disabled and shows a tooltip: "Email configuration is managed via environment variables. Contact your administrator to change these settings."

**Research Findings (2026‑05‑06):**
- Three‑section layout: Sending Domain, From Address, Reply‑To & Signature
- DNS checklist pattern: record type, expected value (copyable), status badge
- Explicit save (not auto‑save) for production email configuration
- Reply‑To address points to actively monitored inbox
- Signature rendered as plain text with live preview
- Resend domain verification status from API

**Depends on:**
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-ARCH-1` (settings layout route)
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-1` (Resend sending domain configured)
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-2` (transactional subdomain configured)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/_dashboard/settings/email.tsx` (replace placeholder)
- `apps/web/src/components/settings/DnsRecordRow.tsx` (new — DNS record checklist row)
- `apps/web/src/server/trpc/routers/settings/email.ts` (new — email config procedures)

**Definition of Done**
- [ ] `routes/_dashboard/settings/email.tsx` replaces placeholder with full implementation
- [ ] Sending Domain card: domain name, verification status badge, DNS checklist (SPF/DKIM/DMARC) with copyable values and status indicators
- [ ] Default From Address card: validated email input with explicit save button
- [ ] Reply‑To & Signature card: validated email input, signature textarea with live preview, explicit save button
- [ ] Warning shown when sending domain is unverified
- [ ] Backend: tRPC procedures for get/update email config (or read‑only environment variable fallback)
- [ ] All DNS record values are copyable (click to copy)
- [ ] Page is responsive: cards stack vertically on mobile
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Adding new sending domains (Phase 2 — Resend dashboard handles this)
- Email template management (separate feature)
- Per‑email‑type From address overrides
- Email analytics / delivery statistics
- SPF/DKIM/DMARC record auto‑configuration via Cloudflare API

**Rules to Follow**
- DNS record values must be displayed exactly as provided by Resend — do not modify them.
- The From address must be validated as a proper email format with domain matching the verified sending domain.
- Explicit save is required for production email configuration — do NOT auto‑save.
- The signature must be plain text only for Phase 1 (HTML signature support deferred).

**Verification**
```bash
# Navigate to /settings/email
# Verify: Sending Domain card with status badge and DNS checklist
# Verify: From Address card with validated input
# Verify: Reply‑To & Signature card with signature preview

# Test DNS record copy
# Click SPF record value → copied to clipboard → toast confirmation

# Test From address validation
# Enter invalid email "not-an-email" → blur → inline error message
# Enter valid email "noreply@mail.ubos.app" → blur → no error

# Test save
# Change Reply‑To to "support@ubos.app" → click Save → success toast
# Refresh page → value persists

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an administrator, I can verify that our sending domain is properly configured and update the reply‑to address so customer responses reach our support team.

---

#### Subtasks

- [ ] P1-SETTINGS-4.0.25 (AGENT): Read P1‑SETTINGS‑ARCH‑1 output, current `email.tsx` placeholder, P0‑EMAIL‑1 (Resend domain), and P0‑EMAIL‑2 (subdomain). Research email settings UI patterns.
  **Verification:** Current configuration and UI patterns documented.

- [ ] P1-SETTINGS-4.0.5 (AGENT): Determine data source for domain verification status (Resend API vs database stored status).
  **Verification:** Data source decision documented.

- [ ] P1-SETTINGS-4.1 (AGENT): Build `DnsRecordRow` component with record type, value (copyable), and status badge.
  **File(s):** `apps/web/src/components/settings/DnsRecordRow.tsx` (new)
  **Verification:** Component renders all three DNS record types with copy functionality.

- [ ] P1-SETTINGS-4.2 (AGENT): Build the Email Settings page with Sending Domain, From Address, and Reply‑To & Signature cards.
  **File(s):** `apps/web/src/routes/_dashboard/settings/email.tsx` (replace)
  **Verification:** Full email settings UI functional.

- [ ] P1-SETTINGS-4.3 (AGENT): Create tRPC procedures for email configuration (or read‑only env var fallback).
  **File(s):** `apps/web/src/server/trpc/routers/settings/email.ts` (new)
  **Verification:** Config values persist or display read‑only with explanation.

- [ ] P1-SETTINGS-4.4 (HUMAN): Test DNS record copy, From address validation, Reply‑To/Signature save, unverified domain warning. Approve.
  **Verification:** Approved.

---

### [ ] P1-AUTH-PROFILE: Build User Profile settings page (consolidate P1-ONBOARD-2)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No user profile page exists. The TASKS.md specification says "Build user profile page (avatar, display name, notification preferences, timezone)" under P1‑ONBOARD‑2, and this task consolidates it into the settings architecture. Users cannot change their display name, upload an avatar, or set their timezone. The `general.tsx` placeholder route file exists (from P1‑SETTINGS‑ARCH‑1) but contains no implementation.
**Size:** Medium

**Description:**
Build the User Profile settings page at `routes/_dashboard/settings/general.tsx` (replacing the placeholder) with display name, avatar upload via presigned URL, and timezone selection.

**(a) Page structure**: A single‑column centered layout with three card sections:
- **Profile Picture** card (top, most visual)
- **Display Name** card
- **Preferences** card (timezone)

**(b) Avatar upload section**: Follows the shadcn.io "Account Avatar Upload" block pattern (2026‑04‑05):
- Large centered circular avatar (80×80 px) with the current user's avatar or computed initials fallback
- "Change Photo" button below the avatar opens a file picker
- Supports drag‑and‑drop directly onto the avatar area
- File validation: max 2 MB, accepted formats `image/png, image/jpeg, image/webp`
- After file selection: shows a cropping interface (optional for Phase 1 — can use simple center‑crop or accept the image as‑is)

**Upload flow** (presigned URL pattern from P0‑STORAGE‑2):
1. User selects or drops an image file
2. Frontend calls `settings.profile.requestAvatarUpload` tRPC procedure with content type and file size
3. Server validates file size/type, generates a presigned PUT URL via `generatePresignedUploadUrl()` from `r2.ts`
4. Server returns `{ uploadUrl, publicUrl, key }` — the key is scoped to `avatars/{userId}/{uuid}`
5. Frontend PUTs the raw file bytes directly to R2 via the presigned URL (bypasses the Worker)
6. On PUT success (200), frontend calls `settings.profile.confirmAvatarUpload` with the key
7. Server updates the user's `avatarKey` in the database
8. Frontend invalidates the React Query cache — avatar updates immediately
9. If the presigned URL has expired (GET returns 403), React Query cache invalidation triggers a fresh presigned URL retrieval, matching the IMYME pattern: "React Query cache (myProfile)를 invalidate하여 새 presigned URL을 재발급"

**Avatar fallback**: If no avatar is set, display computed initials with a deterministic background color derived from the user's name or email. The project already uses `AvatarFallback` from shadcn/ui which handles this pattern.

**(c) Display Name section**: A text input pre‑populated with the current user's display name from Better Auth session. Auto‑saves on blur (300ms debounce) with success/error toast.

**(d) Timezone section**: A `Select` dropdown with common timezone options (grouped by region: Americas, Europe, Asia/Pacific, etc.). Defaults to the browser's detected timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Auto‑saves on selection change with success toast.

**(e) Data persistence**: Profile data is stored via tRPC procedures:
- `GET /api/trpc/settings.profile.get` — returns display name, avatar key, timezone
- `PUT /api/trpc/settings.profile.update` — updates display name and/or timezone
- `POST /api/trpc/settings.profile.requestAvatarUpload` — validates and returns presigned upload URL
- `POST /api/trpc/settings.profile.confirmAvatarUpload` — persists avatar key and returns public URL

**Research Findings (2026‑05‑06):**
- Avatar upload: presigned PUT URL → direct R2 upload → confirm + cache invalidate
- Maximum 2 MB, accepted formats: PNG, JPEG, WebP
- 80×80 px circular preview with initials fallback
- Presigned URL expiry handling: React Query cache invalidation on load failure
- Display name auto‑saves on blur (debounced)
- Timezone selector grouped by region

**Depends on:**
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-ARCH-1` (settings layout route)
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-2` (R2 presigned URL operations wrapper)
- `tasks/infrastructure/P0-SEC.md → P0-SEC-5` (file upload security — filename sanitization)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/_dashboard/settings/general.tsx` (replace placeholder)
- `apps/web/src/components/settings/AvatarUpload.tsx` (new — avatar upload component)
- `apps/web/src/server/trpc/routers/settings/profile.ts` (new — profile procedures)

**Definition of Done**
- [ ] `routes/_dashboard/settings/general.tsx` replaces placeholder with full implementation
- [ ] Avatar upload: circular 80×80 px avatar, drag‑and‑drop, file picker, 2 MB max, PNG/JPEG/WEBP only
- [ ] Avatar upload flow: presigned URL → direct R2 PUT → confirm procedure → cache invalidation
- [ ] Avatar fallback: computed initials with deterministic background color
- [ ] Display Name: text input with auto‑save on blur (300ms debounce)
- [ ] Timezone: `Select` with grouped timezone options, auto‑save on change
- [ ] Backend: tRPC procedures for profile get/update/avatar upload/avatar confirm
- [ ] Presigned URL expiry: cache invalidation on GET failure prevents broken avatars
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Avatar cropping interface (accept image as‑is for Phase 1)
- Avatar history / revert to previous (deferred)
- Remove avatar confirmation flow
- Cover photo / banner image
- Social profile links

**Rules to Follow**
- Never upload avatar images through the Worker — always use presigned PUT URLs directly to R2.
- The presigned URL must be scoped to a specific key: `avatars/{userId}/{uuid}`.
- File validation must happen both client‑side (for UX) and server‑side (for security).
- The avatar component must handle loading (shimmer), error (broken image fallback), and empty (initials) states.
- All user‑facing strings must use i18n `t()` calls (aligning with P1‑I18N‑EXTRACT‑OTHER).

**Verification**
```bash
# Navigate to /settings/general
# Verify: centered avatar with initials (no avatar set)

# Test avatar upload
# 1. Click "Change Photo" → select a PNG < 2 MB
# 2. Verify loading spinner during upload
# 3. Verify avatar updates with new image
# 4. Refresh page → avatar persists

# Test avatar validation
# 1. Try uploading a 5 MB file → error toast "File must be under 2 MB"
# 2. Try uploading a .gif → error toast "File must be PNG, JPEG, or WebP"

# Test display name auto‑save
# 1. Change display name → click outside input
# 2. Wait 300ms → success toast
# 3. Refresh page → name persists

# Test timezone
# 1. Select "Europe/London" from dropdown
# 2. Success toast → refresh → timezone persists

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can upload my profile picture, change my display name, and set my timezone, with all changes persisting across sessions.

---

#### Subtasks

- [ ] P1-AUTH-PROFILE.0.25 (AGENT): Read P1‑SETTINGS‑ARCH‑1 output, P0‑STORAGE‑2 (R2 presigned URL wrapper), P0‑SEC‑5 (filename sanitization), and current `general.tsx` placeholder. Research avatar upload patterns.
  **Verification:** Current infrastructure and upload patterns documented.

- [ ] P1-AUTH-PROFILE.0.5 (AGENT): Design the presigned URL avatar upload flow: request → upload → confirm → cache invalidate.
  **Verification:** Flow diagram and error handling documented.

- [ ] P1-AUTH-PROFILE.1 (AGENT): Build `AvatarUpload` component with circular preview, drag‑and‑drop, file picker, validation, and presigned URL upload.
  **File(s):** `apps/web/src/components/settings/AvatarUpload.tsx` (new)
  **Verification:** Component handles all four states: empty (initials), loading, success (image), error (broken).

- [ ] P1-AUTH-PROFILE.2 (AGENT): Build the Profile settings page with avatar, display name, and timezone sections.
  **File(s):** `apps/web/src/routes/_dashboard/settings/general.tsx` (replace)
  **Verification:** Full profile page functional.

- [ ] P1-AUTH-PROFILE.3 (AGENT): Create tRPC procedures for profile get/update/avatar upload/avatar confirm.
  **File(s):** `apps/web/src/server/trpc/routers/settings/profile.ts` (new)
  **Verification:** Profile data persists across page refreshes; avatar upload flow works end‑to‑end.

- [ ] P1-AUTH-PROFILE.4 (HUMAN): Test avatar upload (all formats, size limits, drag‑and‑drop), display name auto‑save, timezone selection. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P1‑SETTINGS group are covered.*