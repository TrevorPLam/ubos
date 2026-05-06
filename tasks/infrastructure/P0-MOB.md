# tasks/infrastructure/P0-MOB.md – Mobile / PWA Strategy

This file covers the mobile use‑case definition, responsive audit of all nine domain pages, PWA offline caching, and mobile‑specific interaction enhancements for the UBOS platform. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑MOB (2026‑05‑06)

### TanStack Start + PWA: Known Incompatibility

The core technical challenge for P0‑MOB‑3 is a **known incompatibility** between `vite-plugin-pwa` and TanStack Start v1.x production builds. Specifically, `VitePWA()` build steps (asset generation, service‑worker bundle, `__WB_MANIFEST` injection) are **not executed** during `vite build` when `tanstackStart()` is also in the plugin array — though they work in the dev server.

**Two workarounds have emerged in the community:**

| Workaround | Approach | Risk |
|---|---|---|
| **A: Separate Vite build** | Create `vite.sw.config.ts`, run `vite build --config vite.sw.config.ts` before the main build, output SW to `public/` | Complex; still doesn't resolve `__WB_MANIFEST` injection for `injectManifest` strategy. |
| **B: Manual service worker** | Write a hand‑crafted `sw.js` in the `public/` directory using the raw Cache API (no Workbox dependency). The SW is a static asset, bypassing the Vite build pipeline entirely. | No Workbox precaching; requires manual cache‑key management. Adequate for Phase 0. |

**Decision for Phase 0:** Adopt **Workaround B** — a hand‑written service worker with `CacheFirst` for static assets and `StaleWhileRevalidate` for API responses. This avoids the upstream bug, gets offline caching working immediately, and can be upgraded to `vite-plugin-pwa` once the upstream PR (vite‑pwa/vite‑plugin‑pwa#786) is merged and released.

### PWA Performance & Caching Strategies

- **Workbox 7** is the current standard, with `StaleWhileRevalidate` becoming the default strategy over `NetworkFirst`. In 2026, a PWA that loads in under 1.5 s on mid‑tier mobile consistently achieves 100 Lighthouse scores.
- **Recommended caching layering:** Precache the app shell (HTML, CSS, JS bundles) on install; use `CacheFirst` for static assets and fonts; use `StaleWhileRevalidate` for API/JSON responses.
- For our manual SW, we'll implement: (a) **Install** → precache critical assets listed in a static manifest, (b) **Fetch** → `CacheFirst` for `/assets/`, `/fonts/`, `/logo*`, `StaleWhileRevalidate` for `/api/trpc/`, and NetworkOnly for everything else.

### Core Web Vitals 2026

The thresholds were tightened significantly in 2025 and remain unchanged for 2026:

| Metric | Old "Good" | 2026 "Good" | Change |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | **< 2.0s** | 20% stricter |
| INP (Interaction to Next Paint) | FID < 100ms | **INP < 200ms** | New metric (2024) |
| CLS (Cumulative Layout Shift) | < 0.1 | **< 0.08** | 25% stricter |
| FCP (First Contentful Paint) | Informal | **< 1.5s** | Newly official |

No new metrics have been added since INP replaced FID in March 2024, and cross‑browser measurement reached all major browsers in December 2025.

### Mobile Breakpoints & Responsive Design

- **Smallest phones:** 320 px (iPhone SE, older Android)
- **Large phones:** 428 px (iPhone Pro Max series)
- **Recommended audit range:** 320–428 px (matching the TASKS.md specification)
- **Modern approach:** Container Queries have been **Baseline Widely Available since August 2025**, meaning they are supported across every major browser engine. They enable components to respond to parent container size rather than viewport width, making truly portable UI modules possible.
- **Dynamic viewport units** (`dvh`, `svh`, `lvh`) reached Baseline Widely Available in June 2025 with ~95% global support. Use `svh` for above‑the‑fold content, `dvh` for adaptive full‑screen layouts.

### WCAG 2.2 & EU Accessibility Act

- **EU Accessibility Act** became enforceable on **June 28, 2025** for new products and services. Existing products have until June 28, 2030.
- **Key requirements:** WCAG 2.2 Level AA conformance; 24×24 CSS pixels minimum for touch targets; minimum contrast ratio of **4.5:1** for normal text, **3:1** for large text on dark backgrounds.
- UBOS is a new product entering the market → **must comply now**.

### Bottom‑Sheet / Swipe Patterns for Web

- The **shadcn/ui Drawer** (built on Vaul) already supports swipe‑to‑dismiss and bottom‑sheet positioning. For UBOS, the mobile sidebar should use the existing `Sheet` component pattern (dialog → drawer transformation at the 768px breakpoint using `useIsMobile`).
- The **Credenza** pattern (dialog on desktop, drawer on mobile) is the established responsive modal approach.

---

## Task Definitions

### [ ] P0-MOB-1: Define mobile use cases and target devices

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🟠 High
**Current State:** No documented mobile strategy exists. The application uses a `use-mobile.tsx` hook with a 768 px breakpoint and renders all nine domain pages at any viewport width, but there has been no systematic evaluation of which user journeys must work on mobile, which devices are in scope, or what "acceptable" mobile UX means for each module.
**Size:** Small

**Description:**
Define the mobile strategy for UBOS by answering: (1) what user jobs must be completable on a phone vs. those that are desktop‑only, (2) what device range is in scope (320–428 px phones, 768 px tablets), (3) what the performance budget is (LCP < 2.0s, INP < 200ms on throttled 4G), and (4) which interactions will benefit from mobile‑specific patterns (swipe actions, bottom sheets). Document findings in a new `docs/product/mobile‑use‑cases.md` and link to it from the root `README.md`.

**Research Findings (2026‑05‑06):**
- Core Web Vitals thresholds: LCP < 2.0s, INP < 200ms, CLS < 0.08, FCP < 1.5s.
- Small‑phone lower bound: 320 px (iPhone SE); large‑phone upper bound: 428 px. Use content‑driven breakpoints, not device‑specific labels.
- Container Queries (Baseline Widely Available since Aug 2025) should be used for component‑level responsiveness.

**Depends on:** [N/A]

**Blocks:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-2`
- `tasks/infrastructure/P0-MOB.md → P0-MOB-3`

**Related Files:**
- `/docs/product/mobile‑use‑cases.md` (new)
- `/apps/web/src/hooks/use-mobile.tsx` (reference)

**Definition of Done**
- [ ] `docs/product/mobile‑use‑cases.md` created with sections: Target Devices, User Jobs by Module, Performance Budget, Mobile‑Specific Patterns, Out‑of‑Scope (Phase 0)
- [ ] At least three prioritized mobile user jobs identified (e.g., "View and update CRM leads", "Check project status", "Approve/reject invoices")
- [ ] Device matrix defined: 320 px (min), 390 px (iPhone 14), 428 px (iPhone Pro Max), 768 px (iPad mini)
- [ ] Performance budget documented: LCP < 2.0s, INP < 200ms, CLS < 0.08 on Slow 4G throttling
- [ ] Decision documented on which modules are desktop‑preferred in Phase 0 (Finance, Analytics)
- [ ] `pnpm run typecheck` passes (docs only — no code changed)

**Out of Scope**
- Implementing mobile‑specific interactions (P0‑MOB‑4)
- PWA install‑prompt UI (deferred to a later UX enhancement)

**Rules to Follow**
- Use the official Web Vitals thresholds from Google's web.dev as of 2026‑05‑06.
- Breakpoints must be content‑driven, not device‑named.
- EU Accessibility Act compliance (WCAG 2.2 AA) applies to mobile as well as desktop.

**Verification**
```bash
ls docs/product/mobile-use-cases.md
# Manual: review that all sections are complete and decisions are clearly stated
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a product owner, I want to know which user jobs must be supported on mobile, so I can prioritize the responsive audit and PWA investment.

---

#### Subtasks

- [ ] P0-MOB-1.0.25 (AGENT): Read the existing `use-mobile.tsx`, the current `MainLayout.tsx` responsive behavior from the WORKSPACE-MAP, and any existing design docs.
  **Verification:** Current mobile state documented in task notes.

- [ ] P0-MOB-1.0.5 (AGENT): Research latest Core Web Vitals thresholds, mobile device spectrum, and EU Accessibility Act requirements.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MOB-1.1 (AGENT): Draft `docs/product/mobile‑use‑cases.md` with all required sections.
  **File(s):** `/docs/product/mobile‑use‑cases.md`
  **Verification:** File exists and all sections are populated.

- [ ] P0-MOB-1.2 (HUMAN): Review mobile strategy document, approve target devices and prioritized jobs, sign off on performance budget.
  **Verification:** Approved.

---

### [ ] P0-MOB-2: Perform responsive audit of all 9 domain pages (320–428 px)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** The nine domain pages render at mobile widths but have never been systematically audited. Known issues likely include: overflow on wide tables (Assets inventory table, Finance AP table), cramped kanban boards (CRM Leads), modal dialogs that exceed viewport height, and sidebar navigation that may not collapse correctly. No GitHub issues track mobile UX problems.
**Size:** Medium

**Description:**
Conduct a manual responsive audit of all nine domain pages at 320 px, 390 px, and 428 px viewport widths. For each page, record: layout breakages, overflow/scrolling issues, touch‑target sizes below 24×24 px, illegible text, interactive elements that are unreachable or overlap, and any modal/drawer behavior problems. Log all findings as GitHub issues labeled `mobile` and `phase-0`. Create a summary report at `docs/testing/mobile‑audit‑report.md` with a severity matrix and recommended fixes.

**Research Findings (2026‑05‑06):**
- EU Accessibility Act mandates 24×24 CSS px minimum touch targets for Level AA compliance (enforceable since June 2025).
- WCAG 2.2 AA requires 4.5:1 text contrast; dark‑theme glassmorphism effects must be checked for readability.
- Known trouble spots in similar apps: wide data tables, kanban boards at narrow widths, modal overflow on small viewports.

**Depends on:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-1`

**Blocks:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-1` (automated a11y audit builds on mobile findings)

**Related Files:**
- All page components in `apps/web/src/pages/` (Analytics.tsx, Assets.tsx, CRM.tsx, Dashboard.tsx, Documents.tsx, Finance.tsx, Portal.tsx, Projects.tsx, Settings.tsx)
- `docs/testing/mobile‑audit‑report.md` (new)

**Definition of Done**
- [ ] All nine domain pages tested at 320 px, 390 px, and 428 px widths
- [ ] Each page photographed (screenshot) at each width; screenshots stored in `docs/testing/screenshots/`
- [ ] Every issue logged as a GitHub issue with `mobile` and `phase-0` labels, including: page name, viewport width, severity (Critical/High/Medium/Low), description, and screenshot reference
- [ ] Summary report `docs/testing/mobile‑audit‑report.md` created with: severity matrix, count of issues by page and severity, top‑10 most critical fixes
- [ ] At minimum, all Critical severity issues filed (touch target < 24px, unreadable text, unreachable controls)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Fixing the issues found (deferred to per‑page tasks in Phase 1)
- Automated visual regression testing (P2‑TEST‑3)

**Rules to Follow**
- Audit must be manual (not automated); use Chrome DevTools Device Mode with the exact pixel widths.
- Touch target size check: any interactive element smaller than 24×24 CSS px is a Critical finding.
- Do not modify any code during the audit; this task is assessment only.

**Verification**
```bash
ls docs/testing/mobile-audit-report.md
ls docs/testing/screenshots/  # at least 27 screenshots (9 pages × 3 widths)
# Manual: check GitHub issues list for mobile-labeled issues
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a mobile user, I can access and interact with all nine domain pages without layout breakage or unreachable controls.

---

#### Subtasks

- [ ] P0-MOB-2.0.25 (AGENT): Set up dev environment, open Chrome DevTools in Responsive Design Mode, confirm 320 px / 390 px / 428 px presets.
  **Verification:** Device mode working; all presets configured.

- [ ] P0-MOB-2.0.5 (AGENT): Read the WCAG 2.2 touch‑target and contrast requirements; create an audit checklist template.
  **Verification:** Checklist document ready.

- [ ] P0-MOB-2.1 (AGENT): Audit pages 1–3 (Dashboard, CRM, Projects) at all three widths. Screenshot each. Log issues.
  **Verification:** Screenshots saved; issues logged.

- [ ] P0-MOB-2.2 (AGENT): Audit pages 4–6 (Documents, Finance, Assets) at all three widths. Screenshot each. Log issues.
  **Verification:** Screenshots saved; issues logged.

- [ ] P0-MOB-2.3 (AGENT): Audit pages 7–9 (Portal, Analytics, Settings) at all three widths. Screenshot each. Log issues.
  **Verification:** Screenshots saved; issues logged.

- [ ] P0-MOB-2.4 (AGENT): Compile `docs/testing/mobile‑audit‑report.md` with severity matrix, issue counts, and top‑10 critical fixes.
  **File(s):** `/docs/testing/mobile‑audit‑report.md`
  **Verification:** Report complete; all GitHub issues linked.

- [ ] P0-MOB-2.5 (HUMAN): Review audit report, triage critical issues, and approve findings.
  **Verification:** Approved.

---

### [ ] P0-MOB-3: Implement PWA offline caching for critical assets and previously loaded data

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No service worker, web app manifest, or offline caching exists in the application. The `public/` directory contains static icons (`logo192.png`, `logo512.png`) and a `manifest.json` for PWA basics, but these have not been verified for correctness. The `vite-plugin-pwa` is a known option but has a **documented incompatibility** with TanStack Start production builds.
**Size:** Medium

**Description:**
Implement PWA offline support using a **hand‑written service worker** (`public/sw.js`) that avoids the `vite-plugin-pwa` + TanStack Start compatibility bug. The SW will:

1. **Install:** Precache critical app‑shell assets listed in a static manifest (HTML shell, core CSS, JS entry chunks, logo PNGs, critical fonts).
2. **Activate:** Clean old caches on version change.
3. **Fetch:** Apply `CacheFirst` for static assets (`/assets/`, `/fonts/`, `/logo*`), `StaleWhileRevalidate` for tRPC API calls (`/api/trpc/`), and `NetworkOnly` for everything else.
4. **Registration:** Register the SW via a small inline script in `entry‑client.tsx` (or root HTML), gated on `'serviceWorker' in navigator` and `process.env.NODE_ENV === 'production'`.

Additionally, verify and update the existing `public/manifest.json` to include proper `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, icons at 192×192 and 512×512, and optional `shortcuts` for CRM and Dashboard. Create a simple offline fallback page (`public/offline.html`) that renders when the user is offline and requests a non‑cached route.

**Why not `vite-plugin-pwa`?** The upstream issue (vite‑pwa/vite‑plugin‑pwa#786) remains unresolved. A separate Vite build for the SW is a documented workaround but adds build complexity and still has edge cases with `__WB_MANIFEST` injection. A manual SW is sufficient for Phase 0 offline support and can be migrated once the upstream fix ships.

**Research Findings (2026‑05‑06):**
- `vite-plugin-pwa` v1.2.0 (Nov 2025) is the latest release; the fix for Vite 6 Environment API is still in PR.
- Discussion #4211 shows the plugin works in dev server but production builds are unreliable.
- A manual SW with raw Cache API is a valid approach; Workbox adds convenience but is not required for basic PWA functionality.
- `StaleWhileRevalidate` is the recommended default caching strategy for modern PWAs.
- Core Web Vitals thresholds for 2026: LCP < 2.0s, INP < 200ms, CLS < 0.08.

**Depends on:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-1`

**Blocks:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-4` (mobile‑specific interactions can leverage offline‑first patterns)

**Related Files:**
- `apps/web/public/sw.js` (new — hand‑written service worker)
- `apps/web/public/manifest.json` (update/verify)
- `apps/web/public/offline.html` (new — offline fallback page)
- `apps/web/src/entry‑client.tsx` (add SW registration logic)
- `apps/web/src/routes/__root.tsx` (ensure proper HTML shell with `<link rel="manifest">`)

**Definition of Done**
- [ ] `public/sw.js` created with: version constant, install listener (precaches static‑asset URLs from a hardcoded manifest array), activate listener (deletes old cache versions), fetch listener with `CacheFirst` for asset paths, `StaleWhileRevalidate` for `/api/trpc/` paths, `NetworkOnly` fallback for everything else
- [ ] `public/manifest.json` verified: `name: "UBOS"`, `short_name: "UBOS"`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#0a0a0f"` (dark background), `background_color: "#0a0a0f"`, icons at 192 and 512 (existing files)
- [ ] `public/offline.html` created with a simple styled message ("You're offline — please check your connection") and a retry button
- [ ] SW registration gated on production (`NODE_ENV === 'production'`); dev server does NOT register the SW
- [ ] `<link rel="manifest" href="/manifest.json">` present in HTML `<head>`
- [ ] Chrome DevTools → Application → Service Workers shows the SW registered and activated (after `pnpm build && pnpm preview`)
- [ ] Offline test: disable network in DevTools → reload → app shell and previously visited pages load from cache
- [ ] Lighthouse PWA audit score ≥ 90 (run against production build)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Workbox integration (deferred until `vite-plugin-pwa` TanStack Start compatibility is fixed upstream)
- Push notification support
- Background sync for offline mutations
- PWA install‑prompt UI (deferred; discussed in P0‑MOB‑4)
- Advanced caching strategies for R2‑served documents

**Rules to Follow**
- SW must use a version constant (e.g., `const CACHE_VERSION = 'ubos-v1'`) — incrementing it triggers cache refresh on next activate.
- Never cache the SW file itself (browsers handle this automatically).
- `StaleWhileRevalidate` for API: serve from cache immediately, update cache from network in background.
- SW registration must not break SSR; place the registration script in `entry‑client.tsx` or a `<script>` tag in the root HTML template.
- The existing `public/` icons (`logo192.png`, `logo512.png`) must remain; do not delete them.

**Verification**
```bash
# Build and preview the production app
cd apps/web && pnpm build && pnpm preview
# In Chrome DevTools:
# 1. Application → Service Workers → verify "activated" and "running"
# 2. Application → Cache Storage → verify "ubos-v1" cache populated
# 3. Network tab → check "Disable cache" OFF → reload → assets served from SW
# 4. Network tab → check "Offline" → reload → app shell still loads
# 5. Lighthouse → Categories → Progressive Web App → score ≥ 90
cat apps/web/public/sw.js | grep "CACHE_VERSION"
cat apps/web/public/manifest.json | python3 -m json.tool
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user on an unreliable connection, I can continue browsing previously loaded pages and see a friendly offline message when I reach uncached content.
- Deep Module: The service worker encapsulates all caching logic behind a single entry point (`sw.js`), hiding cache‑key management, version migration, and fetch interception from the application layer.

---

#### Subtasks

- [ ] P0-MOB-3.0.25 (AGENT): Read the existing `public/manifest.json`, `public/` directory contents, `entry‑client.tsx` (or default entry), and `__root.tsx` for existing `<link>` tags.
  **Verification:** Current PWA‑related assets and registration status documented.

- [ ] P0-MOB-3.0.5 (AGENT): Research the `vite-plugin-pwa` + TanStack Start incompatibility and documented workarounds; confirm the manual SW approach is the right decision for Phase 0. Research Cache API best practices and `StaleWhileRevalidate` fetch pattern.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MOB-3.1 (AGENT): Verify and update `public/manifest.json` with correct PWA fields (`name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, `icons` array referencing existing PNGs).
  **File(s):** `apps/web/public/manifest.json`
  **Verification:** `cat apps/web/public/manifest.json | python3 -m json.tool` passes; all required fields present.

- [ ] P0-MOB-3.2 (AGENT): Create `public/sw.js` with: `CACHE_VERSION` constant, `install` listener (precache array of critical asset URLs), `activate` listener (delete old caches), `fetch` listener (CacheFirst for `/assets/` and `/fonts/`, StaleWhileRevalidate for `/api/trpc/`, NetworkOnly fallback).
  **File(s):** `apps/web/public/sw.js`
  **Verification:** `cat apps/web/public/sw.js | grep -E "CACHE_VERSION|install|activate|fetch|CacheFirst|StaleWhileRevalidate"` returns all expected patterns.

- [ ] P0-MOB-3.3 (AGENT): Create `public/offline.html` with a styled message and retry button.
  **File(s):** `apps/web/public/offline.html`
  **Verification:** Open `offline.html` directly in browser; visually confirm styling.

- [ ] P0-MOB-3.4 (AGENT): Add SW registration logic in `entry‑client.tsx` (or root HTML), gated on `'serviceWorker' in navigator && process.env.NODE_ENV === 'production'`.
  **File(s):** `apps/web/src/entry‑client.tsx` (or `apps/web/src/routes/__root.tsx` if no custom entry‑client)
  **Verification:** In dev mode (`pnpm dev`), no SW registered. After `pnpm build && pnpm preview`, SW appears in Chrome DevTools.

- [ ] P0-MOB-3.5 (AGENT): Ensure `<link rel="manifest" href="/manifest.json">` is present in the HTML `<head>`. If using `__root.tsx` `<Head>` component, add it there.
  **File(s):** `apps/web/src/routes/__root.tsx`
  **Verification:** DevTools → Elements → `<head>` contains the manifest link.

- [ ] P0-MOB-3.6 (AGENT): Run `pnpm build && pnpm preview`, test offline behavior in Chrome DevTools (disable network, reload previously cached pages), and run Lighthouse PWA audit.
  **Verification:** Offline pages load; Lighthouse PWA score ≥ 90; all cached assets served from SW.

- [ ] P0-MOB-3.7 (HUMAN): Test PWA on a real mobile device (Android Chrome or iOS Safari), verify installability, and approve.
  **Verification:** Approved.

---

### [ ] P0-MOB-4: Add mobile-specific interactions where beneficial (swipe actions, bottom sheets)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The application uses responsive CSS (Tailwind breakpoints) and the `use-mobile.tsx` hook to conditionally render the sidebar as a Sheet drawer on mobile (implemented in P0‑SHELL‑7). However, no mobile‑specific interaction patterns (swipe‑to‑dismiss, pull‑to‑refresh, bottom‑sheet action menus) are implemented. All interactions are identical across mobile and desktop.
**Size:** Medium

**Description:**
Enhance mobile UX with targeted interaction patterns, prioritized by the mobile use‑case document (P0‑MOB‑1). For Phase 0, implement:

1. **Swipe‑to‑dismiss on Drawer:** Verify the existing shadcn/ui `Drawer` component (built on Vaul) already handles swipe‑to‑dismiss. If not, configure the `shouldScaleBackground` and drag‑handle props.
2. **Responsive Dialog → Bottom Sheet:** For key modals (CRM lead creation, task creation), use the Credenza/dialog‑drawer responsive pattern: render as a centered `Dialog` on desktop (≥768 px) and a bottom `Drawer` on mobile. Refactor 2–3 key modals to use this pattern.
3. **Bottom‑sheet action menus:** For list‑item actions (CRM lead context menu, document row actions), use a bottom sheet on mobile instead of a dropdown menu for better thumb accessibility. The shadcn `Drawer` with `bottom` position serves this purpose.
4. **Touch‑optimized tap targets:** Ensure all interactive elements in mobile‑critical flows (CRM leads, project tasks) have minimum 24×24 px touch targets (EU Accessibility Act requirement).

Track enhancements as individual GitHub issues labeled `mobile-enhancement` for visibility.

**Research Findings (2026‑05‑06):**
- The shadcn/ui Drawer (Vaul) supports swipe‑to‑dismiss natively.
- The responsive Dialog→Drawer pattern (Credenza) is the established approach: detect mobile via `useIsMobile`, render `Drawer` on mobile, `Dialog` on desktop.
- EU Accessibility Act requires 24×24 CSS px minimum touch targets; enforcement began June 2025.
- Bottom sheets improve thumb accessibility for one‑handed phone use.

**Depends on:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-2` (responsive audit identifies specific components needing enhancement)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-7` (mobile sidebar drawer)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/pages/CRM.tsx` (lead creation modal, context menus)
- `apps/web/src/pages/Projects.tsx` (task creation, task actions)
- `apps/web/src/pages/Documents.tsx` (file row actions)
- `apps/web/src/components/layout/Sidebar.tsx` (verify swipe behavior)
- GitHub issues (track enhancements)

**Definition of Done**
- [ ] At least 3 key modals refactored to use the responsive Dialog→Drawer pattern (CRM lead create/edit, one Projects modal, one Documents modal)
- [ ] At least 2 list‑item action menus refactored to use bottom sheet on mobile
- [ ] All refactored interactions have touch targets ≥ 24×24 px
- [ ] Swipe‑to‑dismiss works on the mobile sidebar drawer (verify no regression from P0‑SHELL‑7)
- [ ] Each enhancement tracked as a GitHub issue with `mobile-enhancement` label
- [ ] No regression on desktop interactions
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Pull‑to‑refresh pattern (requires significant infrastructure; deferred to Phase 2+)
- Mobile‑specific gesture navigation (swipe between CRM tabs, etc.)
- PWA install‑prompt UI (separate enhancement)

**Rules to Follow**
- Use the existing shadcn/ui `Dialog` and `Drawer` components; do not introduce new UI libraries.
- The `useIsMobile` hook already exists; use it for conditional rendering.
- All bottom sheets must have a visible drag handle (accessibility).
- Do not modify the content of modals; only change their container presentation.

**Verification**
```bash
cd apps/web && pnpm dev
# Manual at 375px viewport:
# 1. Open CRM → create a lead → verify modal appears as bottom sheet
# 2. Long‑press on a lead → verify action menu appears as bottom sheet
# 3. Open sidebar → swipe down to dismiss → verify closes
# Manual at 1440px viewport:
# 4. Same interactions → verify modal appears as centered dialog
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a mobile user, I can create and manage CRM leads using thumb‑friendly bottom sheets without reaching to the top of the screen.
- Deep Module: The responsive modal pattern (`Dialog` on desktop, `Drawer` on mobile) is encapsulated in a single component, hiding the breakpoint detection and rendering logic from the calling code.

---

#### Subtasks

- [ ] P0-MOB-4.0.25 (AGENT): Read the existing CRM, Projects, Documents page components and identify all modals and action menus that are candidates for mobile enhancement.
  **Verification:** List of candidate components documented.

- [ ] P0-MOB-4.0.5 (AGENT): Research the responsive Dialog→Drawer pattern (Credenza), Vaul swipe‑to‑dismiss configuration, and EU Accessibility Act touch‑target requirements.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-MOB-4.1 (AGENT): Verify that the mobile sidebar `Sheet` (from P0‑SHELL‑7) already supports swipe‑to‑dismiss. If not, configure `shouldScaleBackground` and drag‑handle props.
  **File(s):** `apps/web/src/components/layout/Sidebar.tsx`
  **Verification:** On mobile viewport, swipe down on sidebar drawer dismisses it.

- [ ] P0-MOB-4.2 (AGENT): Refactor the CRM lead create/edit modal to use the responsive Dialog→Drawer pattern.
  **File(s):** `apps/web/src/pages/CRM.tsx`
  **Verification:** Bottom sheet on mobile, dialog on desktop.

- [ ] P0-MOB-4.3 (AGENT): Refactor one Projects modal (task creation) and one Documents modal (file detail) to use the responsive Dialog→Drawer pattern.
  **File(s):** `apps/web/src/pages/Projects.tsx`, `apps/web/src/pages/Documents.tsx`
  **Verification:** Bottom sheet on mobile, dialog on desktop.

- [ ] P0-MOB-4.4 (AGENT): Refactor CRM lead context menu and Documents file‑row actions to use bottom sheet on mobile.
  **File(s):** `apps/web/src/pages/CRM.tsx`, `apps/web/src/pages/Documents.tsx`
  **Verification:** On mobile, long‑pressing a lead or document row opens a bottom sheet action menu.

- [ ] P0-MOB-4.5 (AGENT): Ensure all refactored interactions have touch targets ≥ 24×24 px. Add explicit `min-w-[24px] min-h-[24px]` or `size-6` classes.
  **File(s):** Various (components modified in subtasks .2–.4)
  **Verification:** DevTools inspect → each interactive element ≥ 24×24 px.

- [ ] P0-MOB-4.6 (AGENT): Create GitHub issues for each enhancement with the `mobile-enhancement` label.
  **Verification:** Issues created and linked in task notes.

- [ ] P0-MOB-4.7 (HUMAN): Test all enhanced interactions on a real mobile device (or Chrome DevTools device mode) and approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026-05-06

*No backlog additions at this time. All tasks from TASKS.md P0-MOB group are covered.*

---
