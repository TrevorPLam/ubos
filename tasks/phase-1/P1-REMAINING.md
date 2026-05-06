# tasks/phase-1/P1-REMAINING.md — Onboarding, Analytics, Dashboard, Settings, QA, Billing UI, Auth Extensions, Notifications, I18N Extraction & Cross-Module Testing

This file covers the organization creation wizard with multi-step form using TanStack Form, real analytics dashboards consuming live CRM/Projects/Finance data, a live dashboard with aggregated KPI cards and activity feed, functional Users & Permissions and Organization Settings pages, UI activation audit replacing all inert buttons with real handlers, the frontend Stripe provider and reusable PaymentElement wrapper for in-app subscription checkout, OAuth social login (Google, GitHub) via Better Auth built-in `socialProviders`, passkey/passwordless authentication via `@better-auth/passkey` plugin, extended notification delivery via Slack Incoming Webhooks, i18n string extraction for all domain modules, and a cross-module Playwright E2E smoke test covering the critical user journey. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑REMAINING (2026‑05‑06)

### 1. Multi‑Step Onboarding Wizard — TanStack Form with Progress Persistence

The 2026 consensus for SaaS onboarding wizards converges on a multi-step architecture using TanStack Form with `localStorage` persistence and per-step validation:

- **vedovelli/ai-dev-team-simulation #419 (2026‑03‑18)**: "OnboardingWizard: step-by-step modal/page using useOnboarding from FAB-190. OnboardingStep: individual step card (title, description, action button, skip link). OnboardingProgressBar: visual progress indicator. All settings forms submit via TanStack Form with field-level validation. Skip button appears only when canSkip is true." 

- **TanStack Form v1 Multi-Step Tutorial (2026‑04‑17)**: "Persisting Progress to localStorage — Users expect long forms to survive a page refresh. Use `form.Subscribe` to persist state."  The tutorial demonstrates `onChangeAsyncDebounceMs` for async validation, `form.Field` with `mode="array"` for dynamic field arrays, and Zod schema integration.

- **techinterview.org Multi-Step Wizard Guide (2026‑05‑05)**: "React Hook Form has built-in support for nested forms; can register a master form across steps. Strategies: Validate on Next button click, Allow free movement flag invalid steps, Async validation before allowing Next." 

- **HydraItalia/hydra #182 (2026‑02‑04)**: "Replace the current 6-field vendor onboarding form with a 7-step wizard. Each step maps to one onboarding section. Single react-hook-form instance with per-step validation." 

- **FullSession.io Form Completion Guide (2026‑02‑20)**: "Use multi-step only when it reduces perceived effort and you can show progress clearly. Use multi-step when it reduces perceived effort or groups distinct decisions." 

**For UBOS**: The organization creation wizard transforms the existing single-page `SignUp.tsx` into a 3‑step flow: Step 1 — User account (name, email, password with HIBP check), Step 2 — Organization setup (name, slug auto‑generation, logo upload), Step 3 — Invite team (optional, email input with "Skip" button). State persists to `localStorage` via TanStack Form subscribe, and the wizard uses Zod schemas per step.

### 2. OAuth Social Login — Better Auth `socialProviders` (No Plugin Needed)

Better Auth v1.6.2+ provides **built-in `socialProviders`** directly in the `betterAuth()` options — no separate plugin installation required:

- **DeepWiki Social Providers (2026‑03‑15)**: "Social providers in Better Auth implement the standard OAuth 2.0 Authorization Code flow. Each provider is configured under the `socialProviders` key in BetterAuthOptions. The framework handles state management, PKCE, token exchange, user-info fetching, and session creation automatically." 

- **Configuration pattern**: `socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }, github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! } }` 

- **MakerKit Guide (2026‑04‑10)**: "1. Create Google OAuth Credentials — Go to Google Cloud Console. 2. Create GitHub OAuth App — Go to GitHub Developer Settings. 3. Add Environment Variables. 4. Add GitHub to Social Providers." 

- **Better Auth supports 35+ built-in providers**: Google, GitHub, Apple, Discord, Twitter, Microsoft, Facebook, Twitch, Spotify, LinkedIn, GitLab, Slack, Atlassian, and more. 

- **Client-side**: `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })` triggers the OAuth flow. Better Auth handles callback, session creation, and redirect.

**For UBOS**: Google and GitHub OAuth buttons are added to the `SignIn.tsx` and `SignUp.tsx` pages. No plugin installation needed — `socialProviders` is a top-level Better Auth option. Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

### 3. Passkey/Passwordless — `@better-auth/passkey` Plugin

Better Auth provides a dedicated `@better-auth/passkey` package for WebAuthn/FIDO2 passwordless authentication:

- **Better Auth Passkey Docs**: "Passkeys are a secure, passwordless authentication method using cryptographic key pairs, supported by WebAuthn and FIDO2 standards. Users can log in using biometrics, PINs, or security keys. The implementation uses public-key cryptography with private keys stored in hardware security modules or secure enclaves." 

- **Installation**: `npm install @better-auth/passkey`, add `passkey()` to plugins array, run migration to add `passkey` table. 

- **Pre-auth registration** (v1.6.0+): "When `registration.requireSession` is false, passkey registration can be initiated without a session." Enables passkey-first onboarding. 

- **Client API**: `authClient.passkey.addPasskey({ name: 'My YubiKey' })` for registration, `authClient.signIn.passkey()` for sign-in with Conditional UI (browser autofill). 

- **DeepWiki Passkey Architecture**: Server plugin exports from `@better-auth/passkey`, client from `@better-auth/passkey/client`. Uses `@simplewebauthn/server` ^13.1.2 and `@simplewebauthn/browser` ^13.1.2. Database schema adds `passkey` table with `publicKey`, `credentialID`, `counter`, `deviceType`, `backedUp`, `transports`. 

**For UBOS**: Install `@better-auth/passkey`, add to plugins, run migration. Add "Sign in with Passkey" button to SignIn page. Add passkey enrollment in Settings → Security. Pre-auth registration enabled for passkey-first onboarding.

### 4. Dashboard KPI Aggregation — `useQueries` for Parallel Fetching

The 2026 pattern for dashboard KPI cards uses TanStack Query's `useQueries` hook for parallel, independent data fetching:

- **framework-best-practices #1857 (2026‑03‑05)**: "Replace imperative React Query orchestration in service dashboard hook with declarative queries — Refactor to declarative `useQueries`/dependent queries and remove disabled-query + manual cache-write pattern." 

- **Dev.to State Management 2026 (2026‑04‑09)**: "TanStack Query handles loading, error, caching, refetching, and invalidation. I keep server data in the query cache." 

- **Pattern**: Each KPI card is an independent query. `useQueries` runs them in parallel. Each card shows its own loading skeleton and error state independently — a failing "Revenue" query doesn't block "Active Projects" from rendering.

### 5. Stripe Elements — `@stripe/react-stripe-js` with PaymentElement

The mapshen/petlink issue #136 (2026‑03‑27) provides the canonical 2026 Stripe Elements integration pattern:

- **Phase 1 — PaymentForm component**: "Add `@stripe/stripe-js` and `@stripe/react-stripe-js` to frontend dependencies. Create `PaymentForm` component using Stripe PaymentElement (supports cards, Apple Pay, Google Pay). Handle payment confirmation, error states, 3D Secure authentication." 

- **PHP.cn Custom Payment Guide (2026‑03‑28)**: "如需完全控制支付流程，应弃用 pricing table，改用 Stripe Elements + 自定义前端定价展示 + 后端 session 创建." — For full control, use Stripe Elements + custom frontend pricing + backend session creation. 

- **@stripe/react-stripe-js**: Provides `Elements` provider, `PaymentElement`, `useStripe`, `useElements` hooks. Requires `loadStripe(publishableKey)` for initialization. 

**For UBOS**: `@stripe/stripe-js` and `@stripe/react-stripe-js` installed. `StripeProvider` wraps billing pages. `PaymentForm` component using `PaymentElement` collects card details. Subscription checkout stays in-app instead of redirecting to Stripe.

### 6. Cross-Module E2E Smoke Test — Playwright Critical Path

The 2026 consensus for E2E smoke testing follows a two-tier strategy:

- **AI测试 Playwright 企业级 E2E (2026‑04‑05)**: "四层测试模型（推荐）: Smoke Test（约 5-10 个，用例小于 1 分钟）目的：冒烟验证，每次部署前必跑。Critical Path Test（约 30-50 个，用例小于 10 分钟）." 

- **jperezdelreal/ffs-squad-monitor #91 (2026‑03‑13)**: "5+ smoke tests covering critical user flows. Tests pass locally against dev server. CI workflow runs E2E tests on PR. Screenshots captured on failure and uploaded as artifacts." 

- **blog.myntinc.com (2026‑02‑01)**: "Playwrightを運用する時は、「スモーク → 詳細」という二段構成に分離することが望ましい。テストをこの2つのレイヤーで走らせることで、安定した自動テスト運用を構築." 

**For UBOS**: A single smoke test script covering: signup → create deal → attach document → convert to project → create invoice → pay in portal. Uses separate Playwright browser contexts per tenant for isolation. Screenshots on failure uploaded to CI artifacts.

### 7. Slack Notification Integration — Incoming Webhooks

- **Slack Incoming Webhooks Guide (2026)**: "Posting a message is as simple as making an HTTPS POST request with a JSON body. Slack accepts plain text or Block Kit rich formatting." 

- **glukhov.org Slack Integration Patterns (2026‑04‑15)**: "Slack as a notification sink — Incoming webhooks are the fastest path to value for alerts and status updates. A webhook is a unique URL tied to an app installation, and you POST a JSON message to it." 

- **Block Kit format**: JSON with `blocks` array containing `section`, `context`, `divider` block types. Supports mrkdwn formatting.

**For UBOS**: Extend the notification dispatcher (P1‑INTEG‑7) with a `step.sendEvent()` call that fans out to a Slack delivery function. The Slack function uses `fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ blocks }) })`. Webhook URL stored per-org in integration settings.

---

## Task Definitions

### [ ] P1-ONBOARD-1: Enhance organization creation wizard (step‑by‑step: name, slug, logo, invite team)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical

**Description:** Transform the existing single‑page `SignUp.tsx` into a 3‑step wizard using TanStack Form with `localStorage` persistence. Step 1: User account (name, email, password with P0‑AUTH‑11 HIBP check, Zod validation). Step 2: Organization setup (name, auto‑generated slug via `toSlug`, optional logo upload via presigned URL from P0‑STORAGE‑2). Step 3: Invite team (optional — email input list with "Skip" button). Progress bar rendered at top. State persists across page refresh. Single `useForm` instance with per-step field validation. On submit: create user + organization + send invite emails.

**Depends on:** P0‑AUTH‑3 (auth client), P0‑STORAGE‑2 (presigned upload), P0‑EMAIL‑0a (enqueueEmail), P1‑ROUTE‑1

**Related Files:** `apps/web/src/pages/SignUp.tsx` (refactor), `apps/web/src/components/onboarding/OnboardingWizard.tsx` (new), `apps/web/src/components/onboarding/OnboardingStep.tsx` (new)

**Definition of Done:** 3‑step wizard with progress bar, localStorage persistence, Zod validation per step, Google/GitHub OAuth buttons on step 1, logo upload on step 2, optional team invite on step 3 with skip, `pnpm run typecheck` passes.

---

### [ ] P1-ONBOARD-4: Build onboarding checklist widget on dashboard

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Build `apps/web/src/components/onboarding/Checklist.tsx` — a widget on the dashboard showing key setup steps with completion status. Steps: Create organization ✓ (always done upon signup), Invite team member, Create first CRM lead, Upload first document, Connect Stripe (for billing). Widget reads completion status from API/user profile. Each incomplete step has a "Do this now" link to the relevant page. Widget is dismissible.

**Depends on:** P1‑ONBOARD‑1, P1‑DASHBOARD‑1

**Related Files:** `apps/web/src/components/onboarding/Checklist.tsx` (new), `apps/web/src/routes/_dashboard/dashboard.lazy.tsx` (add widget)

**Definition of Done:** 5‑step checklist with completion status, navigation links, dismiss functionality, empty state after all steps complete, `pnpm run typecheck` passes.

---

### [ ] P1-ANALYTICS-1: Build real CRM analytics dashboard — replace mock charts with live pipeline, win rate, lead volume

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Replace the mock analytics charts with live data from CRM tRPC procedures. CRM tab: pipeline funnel chart (leads → qualified → deals → won), win rate percentage, lead volume over time (bar chart), top performing sales rep leaderboard. Uses Recharts (already in project). All data consumed via `useSuspenseQuery` from CRM tRPC router.

**Depends on:** P1‑CRM‑TRPC‑3 (deals router), P1‑CRM‑TRPC‑6 (CRM search), P1‑ROUTE‑1

**Related Files:** `apps/web/src/routes/_dashboard/analytics.lazy.tsx` (refactor CRM tab)

**Definition of Done:** Real pipeline funnel, win rate, lead volume chart, sales rep leaderboard. Loading/empty/error states per chart. `pnpm run typecheck` passes.

---

### [ ] P1-ANALYTICS-2: Build real Projects analytics — task completion rate, project health, overdue tasks

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Projects tab: task completion rate (gauge or donut), project health overview (on‑track/at‑risk/overdue counts), overdue tasks list with due dates. Data from projects and tasks tRPC routers.

**Depends on:** P1‑PROJ‑TRPC‑2 (tasks router), P1‑ANALYTICS‑1

**Related Files:** `apps/web/src/routes/_dashboard/analytics.lazy.tsx` (refactor Projects tab)

**Definition of Done:** Real task completion chart, project health breakdown, overdue tasks list. `pnpm run typecheck` passes.

---

### [ ] P1-ANALYTICS-3: Build real Finance analytics — AP/AR aging, cash flow summary

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Finance tab: AP aging donut chart (current/1‑30/31‑60/61‑90/>90), AR aging bar chart, monthly cash flow summary (revenue vs expenses). Data from finance tRPC routers.

**Depends on:** P1‑FIN‑TRPC‑5 (financial reports), P1‑FIN‑TRPC‑2 (AP), P1‑FIN‑TRPC‑3 (AR), P1‑ANALYTICS‑1

**Related Files:** `apps/web/src/routes/_dashboard/analytics.lazy.tsx` (refactor Finance tab)

**Definition of Done:** Real AP/AR aging charts, cash flow summary. `pnpm run typecheck` passes.

---

### [ ] P1-DASHBOARD-1: Replace mock dashboard KPI cards and activity feed with live aggregated data

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical

**Description:** Replace the four mock KPI cards with live aggregated data using TanStack Query `useQueries` for parallel fetching: Revenue MTD (from `finance.reports.profitLoss`), Active Projects (from `projects.list` filtered by status='active'), Open Leads (from `crm.leads.list`), Overdue Tasks (from `tasks.list` filtered by past due_date). Activity feed replaced with live `notifications.list` results (from P1‑INTEG‑6). Each KPI loads independently with its own skeleton. "New Lead" button already navigates to CRM — kept. "New Project" button wired to project creation modal.

**Depends on:** P1‑CRM‑TRPC‑1, P1‑PROJ‑TRPC‑1, P1‑FIN‑TRPC‑5, P1‑INTEG‑6, P1‑ROUTE‑1

**Related Files:** `apps/web/src/routes/_dashboard/dashboard.lazy.tsx` (refactor), `apps/web/src/components/dashboard/KpiCard.tsx` (new)

**Definition of Done:** Four live KPI cards with independent loading states. Live activity feed with relative timestamps. "New Project" button functional (not inert). Onboarding checklist widget integrated. `pnpm run typecheck` passes.

---

### [ ] P1-SETTINGS-1: Build functional Users & Permissions page — invite user, assign role, change role, deactivate

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical

**Description:** Replace the mock Users & Permissions table in `routes/_dashboard/settings/users-permissions.tsx` (migrated in P1‑SETTINGS‑ARCH‑1) with real functionality: invite user via email (uses enqueueEmail), assign role (dropdown wired to tRPC mutation), change role, deactivate user (soft-disable), resend invitation. "Invite User" button opens modal with email input + role selector. Table shows real org members from Better Auth organization plugin. Role dropdowns and status toggles use optimistic updates. RBAC-enforced: only admin can manage users.

**Depends on:** P1‑SETTINGS‑ARCH‑1, P0‑AUTH‑3 (org switching), P0‑TRPC‑3 (RBAC), P0‑EMAIL‑0a

**Related Files:** `apps/web/src/routes/_dashboard/settings/users-permissions.tsx` (replace mock), `apps/web/src/server/trpc/routers/settings/users.ts` (new)

**Definition of Done:** Real member list from database. Invite modal sends email. Role changes persist. Deactivation works. Admin-only RBAC gate. `pnpm run typecheck` passes.

---

### [ ] P1-SETTINGS-2: Build organization settings page — edit org name, logo, billing overview, member list

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Build `routes/_dashboard/settings/organization.tsx` with: org name editing (auto‑save on blur), logo upload via presigned URL (same pattern as P1‑AUTH‑PROFILE avatar), billing overview card (plan tier, subscription status from P0‑BILLING‑4), member list (from P1‑SETTINGS‑1 users router), danger zone (delete organization — confirmation modal). Org slug displayed as read‑only.

**Depends on:** P1‑SETTINGS‑ARCH‑1, P0‑STORAGE‑2, P0‑BILLING‑4, P1‑SETTINGS‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/organization.tsx` (new), `apps/web/src/server/trpc/routers/settings/organization.ts` (new)

**Definition of Done:** Org name editable, logo upload, billing overview, member list, danger zone. `pnpm run typecheck` passes.

---

### [ ] P1-QA-1: Audit and activate all previously inert UI controls — scan all pages, replace presentational buttons with real event handlers

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical

**Description:** Systematic audit of all nine domain pages and shell components. Replace every visually-present-but-inert button with real event handlers. Priority list from ANALYSIS.md: Projects page — "New Project" button, drawer "Add Task" button. Documents page — "E‑Sign", "Upload", folder navigation buttons, search input. Finance page — "Run Batch Payment", approve/reject icons, "Issue New Card". Assets page — "Scan Barcode", "New Asset". Settings page — "Invite User" (done in P1‑SETTINGS‑1). Portal page — "Portal Access" toggle. Header — notification bell (done in P1‑INTEG‑6), search trigger (opens command palette). Audit checklist in `docs/testing/ui-activation-audit.md` with pass/fail per control. Each fix is a small PR.

**Depends on:** All P1‑UI tasks for respective domains (CRM, PROJ, DOCS, FIN)

**Related Files:** All domain page files in `apps/web/src/routes/_dashboard/`

**Definition of Done:** All previously inert buttons now trigger real actions or show appropriate "coming soon" toasts. Audit checklist in docs with every control accounted for. No broken UI. `pnpm run typecheck` passes.

---

### [ ] P1-BILLING-UI-0: Build frontend Stripe provider & reusable Payment Element wrapper

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Install `@stripe/stripe-js` and `@stripe/react-stripe-js`. Create `apps/web/src/lib/stripe.ts` with `loadStripe(publishableKey)` singleton initialization. Create `apps/web/src/components/StripePaymentElement.tsx` — a reusable `PaymentForm` component using `PaymentElement` with: card input, Apple Pay / Google Pay support, error display, 3D Secure authentication handling, loading state. Create `StripeProvider` wrapper in billing pages. For Phase 1, this is infrastructure — the actual subscription checkout UI is P2‑BILLING‑1. The component is tested with a test-mode PaymentIntent.

**Depends on:** P0‑BILLING‑1 (Stripe client), P1‑ROUTE‑1

**Related Files:** `apps/web/src/lib/stripe.ts` (new), `apps/web/src/components/StripePaymentElement.tsx` (new), `apps/web/package.json` (add stripe deps)

**Definition of Done:** `@stripe/stripe-js` and `@stripe/react-stripe-js` installed. `PaymentForm` component renders and can collect test card details. `VITE_STRIPE_PUBLISHABLE_KEY` configured. `pnpm run typecheck` passes.

---

### [ ] P1-AUTH-1: Integrate OAuth social login (Google, GitHub) via Better Auth plugins

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Configure Built-in `socialProviders` in `packages/auth/src/index.ts` for Google and GitHub — no plugin installation needed. Add OAuth buttons to SignIn.tsx and Step 1 of SignUp.tsx wizard. Client calls `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })`. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` environment variables. Google Cloud Console setup: Authorized redirect URI = `{APP_URL}/api/auth/callback/google`. GitHub OAuth App setup: Authorization callback URL = `{APP_URL}/api/auth/callback/github`. Better Auth handles the full OAuth flow, token exchange, and session creation automatically.

**Depends on:** P0‑AUTH‑1 (auth engine), P1‑ONBOARD‑1 (signup wizard)

**Related Files:** `packages/auth/src/index.ts`, `apps/web/src/pages/SignIn.tsx`, `apps/web/src/pages/SignUp.tsx`

**Definition of Done:** Google Sign-In button functional. GitHub Sign-In button functional. New users created via OAuth. Existing users can link OAuth accounts. Login flow works. `pnpm run typecheck` passes.

---

### [ ] P1-AUTH-2: Add passkeys / passwordless authentication support

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Install `@better-auth/passkey` package. Add `passkey()` to plugins array in `packages/auth/src/index.ts` with configuration: `rpName: 'UBOS'`, `rpID` (domain), `origin` (app URL). Run migration to create `passkey` table. Add "Sign in with Passkey" button to SignIn.tsx using `authClient.signIn.passkey()` with Conditional UI (browser autofill). Add passkey enrollment in Settings → Security → Passkeys: list registered passkeys, "Add Passkey" button calling `authClient.passkey.addPasskey()`, remove passkey. Enable pre‑auth registration (`registration.requireSession: false`) for passkey‑first onboarding. Client import from `@better-auth/passkey/client`.

**Depends on:** P0‑AUTH‑1, P2‑SETTINGS‑SEC‑1 (security settings page stub)

**Related Files:** `packages/auth/src/index.ts`, `packages/auth/package.json`, `apps/web/src/pages/SignIn.tsx`, `apps/web/src/routes/_dashboard/settings/security/mfa.tsx` (add passkey section)

**Definition of Done:** `@better-auth/passkey` installed. Passkey table migrated. Sign in with passkey functional. Passkey registration functional. Conditional UI autofill. Pre‑auth registration enabled. `pnpm run typecheck` passes.

---

### [ ] P1-NOTIF-1: Extend notification system to deliver via email and Slack

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Extend the notification dispatcher Inngest function (P1‑INTEG‑7) with additional delivery channels. **Email channel**: For notifications where the recipient has email delivery enabled, call `enqueueEmail()` with a notification email template. Email includes notification title, body, and action link. **Slack channel**: For organizations that have configured a Slack webhook URL (stored in org settings), POST a JSON payload to the Slack Incoming Webhook with Block Kit formatting: a `section` block with notification title and body, a `context` block with actor and timestamp, and an `actions` block with a "View in UBOS" button linking to the action URL. Slack webhook URL stored per-org in `organizationSettingsTable`. Rate limit: max 1 Slack message per org per 10 seconds. All channels are fire‑and‑forget via Inngest `step.sendEvent()` fan‑out.

**Depends on:** P1‑INTEG‑7 (notification dispatcher), P0‑EMAIL‑3 (email templates), P1‑SETTINGS‑2 (org settings)

**Related Files:** `apps/web/src/server/inngest/functions/notifications/dispatcher.ts` (extend), `apps/web/src/server/inngest/functions/notifications/slack-delivery.ts` (new), `apps/web/src/server/trpc/routers/settings/organization.ts` (add Slack webhook URL)

**Definition of Done:** Email delivery channel active. Slack delivery channel active for orgs with webhook configured. Block Kit formatted messages. Rate limiting prevents Slack API abuse. `pnpm run typecheck` passes.

---

### [ ] P1-I18N-EXTRACT-CRM through P1-I18N-EXTRACT-OTHER: Replace hardcoded strings in all domain modules with `t()` calls

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium

**Description:** Five parallel extraction tasks. Each scans its domain's pages and components, replaces every hardcoded user‑facing string with `t('namespace:key')` calls, and adds the keys to the corresponding English translation JSON file. **CRM**: Contacts, Companies, Deals, Leads, Activities, Pipelines, Import. **Projects**: Tasks, Milestones, Board, List, Gantt, Settings. **Documents**: Repository, Upload, Preview, Version History, Share. **Finance**: AP, AR, Vendors, Reports, Settings. **Other**: Assets, Portal, Settings, Dashboard, Auth pages. Reference `packages/i18n/src/locales/en/` for existing keys. New keys follow `{domain}:{category}.{key}` convention.

**Depends on:** P0‑I18N‑2 (string extraction from shell + base), All domain UI tasks

**Related Files:** Domain page/component files, `packages/i18n/src/locales/en/*.json`

**Definition of Done:** All Phase 1 domain hardcoded strings extracted. No untranslated user‑facing strings remain. `pnpm run typecheck` passes.

---

### [ ] P1-TEST-SMOKE: Cross‑module integration smoke test — Playwright E2E script covering critical user journey

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical

**Description:** Create `tests/e2e/cross-module-smoke.spec.ts` — a single Playwright test covering the critical end‑to‑end user journey: **Setup** — Seed test org and user. **Step 1** — Sign in. **Step 2** — Create CRM deal and mark as won. **Step 3** — Verify Quote‑to‑Cash: invoice auto‑created in Finance (P1‑INTEG‑1). **Step 4** — Upload document and verify auto‑linked to deal (P1‑INTEG‑2). **Step 5** — Convert deal to project. **Step 6** — Create invoice from project and record payment in Finance. Uses separate Playwright browser contexts for isolation. Test runs in CI on every PR. Screenshots captured on failure and uploaded as artifacts. Target: test completes in under 60 seconds.

**Depends on:** All Phase 1 domain tasks, P1‑INTEG‑1, P1‑INTEG‑2

**Related Files:** `tests/e2e/cross-module-smoke.spec.ts` (new), `.github/workflows/ci.yml` (add step)

**Definition of Done:** Smoke test passes consistently in CI. All six steps execute. Screenshots on failure. Under 60 seconds. `pnpm run typecheck` passes.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All remaining Phase 1 tasks are covered.*