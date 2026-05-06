# tasks/phase-2/P2-AICRM.md — Advanced CRM Features

This file covers the email send + auto-log procedure via `enqueueEmail()` with open/click tracking via Resend webhooks, the email sequence engine using Inngest `step.sleep()` and `step.run()` for drip campaigns with auto-stop on reply, the React Flow drag-and-drop sequence builder UI, the sequence analytics dashboard, the deal scoring model with configurable rules, the pipeline analytics dashboard with win rate/velocity/cycle time, the CRM sales dashboard, deal health indicators with nightly cron, the public CRM REST API, webhook outbound management, and Zapier/Make webhook trigger integration. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P2‑AICRM (2026‑05‑06)

### 1. Email Sequence Engine — Inngest `step.sleep()` + `step.run()` for Drip Campaigns

The Inngest documentation provides the canonical pattern for building reliable email drip campaigns using two step primitives:

- **Inngest Sleeps Documentation** (2026): `step.sleep` and `step.sleepUntil` are available to pause function execution for a specific amount of time. The documentation shows: "Sleeps enable you to create a user onboarding workflow that sequences multiple actions in time: first send a welcome email, then send a tutorial each day for a week."  The `step.run()` method wraps each email send in a memoized step — if the email service fails, only that step retries independently, not the entire sequence.

- **Inngest Email Sequence docs** (2026): "This page provides an overview on how to use Inngest to build reliable marketing campaigns." The quick snippet pattern combines `step.sleep("delay-power-tips-email", "1 day")` with `step.run("send-power-user-tips", ...)` to create multi-day sequences. 

- **Inngest Background Jobs**: `step.run()` ensures each email send is automatically retried upon failure, while `step.sleepUntil()` pauses execution until a specific date. 

- **Drip Campaign Pattern** from Inngest examples: "With these two functions, we might then extend one of them to send an email midway through the trial. This is as easy as adding step.sleep() and another step to send the email. You just created a drip campaign triggered from the original event in a few lines of code." 

- **Wait for an Event**: Inngest's `step.waitForEvent()` enables behavior-driven sequences — e.g., if contact replies to an email, the sequence can branch or stop. "Below is an example of an Inngest function that creates an Intercom or Customer.io-like drip email campaign, customized based on user behavior." 

**For UBOS**: The email sequence engine uses Inngest with `step.sleep()` for time delays between sends and `step.run()` for each email. A contact enrollment event triggers the sequence. If the contact replies to any email (detected via Resend webhook), a `contact/email.replied` event is sent to Inngest, and the sequence function uses `step.waitForEvent()` to detect this and auto-end the sequence.

### 2. React Flow — The 2026 Standard for Visual Workflow Builders

React Flow (`@xyflow/react`) is the definitive library for building drag-and-drop workflow editors in 2026:

- **NoCode JS comparison** (2026‑03‑08): "React Flow is a widely used library for building node-based editors and visual graph interfaces in React applications. Developers can create custom nodes, connect them with edges, and build highly interactive visual editors." 

- **runifi issue #39** (2026‑03‑12): "Adopt React Flow (@xyflow/react) — selected. MIT licensed, 36k GitHub stars, 3.6M npm weekly downloads, purpose-built for node-based flow editors. Used by Stripe, Prefect, and enterprise workflow tools." 

- **React Flow Custom Nodes** (2026‑04‑24): "Fully customizable React components - Smooth drag and drop experience - Zoom and pan support." 

- **Langflow visual flow builder** (2026‑04‑16): "Built on top of React Flow, it provides drag-and-drop functionality, connection management, keyboard shortcuts, and real-time canvas interactions." 

- **Workflow Builder vs React Flow** (2026‑04‑30): "When you use Workflow Builder, React Flow still handles the canvas - nodes, edges, drag-to-connect, pan and zoom. Workflow Builder adds the production workflow editor layer on top: obstacle-avoiding edge routing, ELK auto-layout, schema-driven node configuration." 

**For UBOS**: The sequence builder uses React Flow with custom nodes for each sequence step type: Email Send (configurable subject, body with variable injection), Wait Delay (configurable duration), Condition Fork (branch based on contact behavior), and End Sequence. Edges connect steps in order. The canvas supports drag-and-drop from a sidebar palette, zoom, and pan. Sequences are serialized to JSON and stored in the database.

### 3. Email Open/Click Tracking — Resend Webhooks

- **Resend webhook events**: `email.opened`, `email.clicked`, `email.delivered`, `email.bounced`, `email.complained`. 

- **Nylas integration pattern** (2026‑04‑29): "A welcome email goes out with open + click tracking. Webhooks fire as the customer engages — opens, clicks, books — and a state machine decides what happens next." 

- **CRM email tracking** (2026‑01‑19): "Exposes a webhook endpoint intended to be called by Resend when an email is received/replied, updates the lead record in Postgres." 

**For UBOS**: When a CRM email is sent, Resend's open/click tracking is enabled. Resend webhooks fire `email.opened` and `email.clicked` events to UBOS's webhook endpoint (P0-EMAIL-4 already handles Resend webhooks). The handler creates activity records on the contact/deal and fires Inngest events (`contact/email.opened`, `contact/email.clicked`) that the sequence engine can react to.

### 4. Pipeline Analytics — The 7 Critical Metrics

The 2026 consensus from LeadIQ, Revenue Grid, and Activated Scale identifies seven core pipeline metrics:

- **LeadIQ** (2026‑02‑26): "Track the 7 critical pipeline metrics: coverage ratio, win rate, velocity, cycle length, stage conversion, deal aging, creation rate." 

- **Revenue Grid** (2026‑04‑16): Pipeline Velocity formula = `(Opportunities × Avg Deal Value × Win Rate) ÷ Avg Cycle Length (days)`. "Shortening the sales cycle by 10% has the exact same revenue impact as increasing your win rate by 10%." 

- **Activated Scale** (2026‑04‑22): "Pipeline velocity measures how fast deals convert into revenue by combining opportunity volume, deal value, win rate, and sales cycle length." 

- **Monday.com CRM reporting** (2026‑02‑17): "Analyzing win rates by deal stage, average sales cycle length, and seasonal trends to project future revenue." 

**For UBOS**: The pipeline analytics dashboard computes all seven metrics from live CRM data. Pipeline velocity uses the standard formula. Win rate and stage conversion rates are calculated directly from deal stage transitions. Cycle length is computed as `AVG(won_date - created_date)` for won deals.

---

## Task Definitions

### [ ] P2-AICRM-1-1: Build email send + auto-log procedure (compose from CRM, send via Resend, log as activity)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Create `apps/web/src/server/trpc/routers/crm/email.ts` with `crm.email.send` procedure. Accepts: `entityType` ('contact'|'deal'), `entityId`, `to`, `subject`, `body` (HTML or text), `cc`, `bcc`. Calls `enqueueEmail()` to send via Resend with open/click tracking enabled. Auto-creates `activity` record (`type: 'email'`) linked to the CRM entity with: subject, body preview, sent timestamp. Resend webhook handler (extend P0‑EMAIL‑4) processes `email.opened`, `email.clicked`, `email.replied` events → creates activity records with engagement metadata → fires Inngest events (`contact/email.opened`, etc.) for the sequence engine. Email thread view in activity timeline shows sent emails with open/click/reply status indicators.

**Depends on:** P1‑CRM‑TRPC‑4 (activities), P0‑EMAIL‑0a (enqueueEmail), P0‑EMAIL‑4 (Resend webhooks), P0‑INNGEST‑3 (events)

**Related Files:** `apps/web/src/server/trpc/routers/crm/email.ts` (new), `apps/web/src/server/inngest/events/crm.ts` (extend)

**Definition of Done:** Composed emails send via Resend. Auto‑logged as activity. Open/click/reply tracked. Thread view in activity timeline. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-1-2: Build email sequence engine (enroll contact in multi-step outreach via Inngest)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Create `apps/web/src/server/inngest/functions/crm/sequence-engine.ts` — an Inngest function triggered by `crm/sequence.contactEnrolled` event. Reads the sequence definition (JSON from database) which specifies steps: email sends, wait delays, condition forks. Pattern: `step.run('send-email-1', ...)` → `step.sleep('wait-2-days', '2 days')` → `step.run('send-email-2', ...)`. Uses `step.waitForEvent('stop-on-reply', { event: 'contact/email.replied', timeout: '14 days', match: 'data.contactId' })` to pause the sequence waiting for a reply event. If reply received → sequence auto-ends (or branches to a "re-engagement" track). If timeout expires → continue to next step. Each sent email auto-logged as activity on the contact/deal. Sequence progress and status tracked on contact detail page. Enrollment: admin selects a sequence template, chooses contacts, clicks "Enroll" → creates `crm.sequence_enrollments` records → fires enrollment events.

**Depends on:** P2‑AICRM‑1‑1 (email send), P0‑INNGEST‑3 (events), P1‑CRM‑SCHEMA‑1 (activities table)

**Related Files:** `apps/web/src/server/inngest/functions/crm/sequence-engine.ts` (new), `packages/db/src/schema/sequences.ts` (new)

**Definition of Done:** Multi-step email sequence with `step.sleep()` delays. Auto-stop on reply. Email sent activity logged. Sequence progress visible on contact detail. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-1-3: Build sequence builder UI (define steps, delays, conditional branching)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build `apps/web/src/routes/_dashboard/crm/sequences/builder.tsx` using React Flow (`@xyflow/react`). Custom node types: Email Send node (subject template, body template with `{{contact.firstName}}` variable injection, from name), Wait node (configurable duration in days/hours), Condition node (split by: email opened yes/no, email clicked yes/no, replied yes/no), End node. Canvas: drag-and-drop from sidebar node palette, connect nodes with edges, zoom/pan, minimap. Node configuration panel opens on click (right sidebar) for editing step properties. Variable autocomplete in email templates (pull from CRM contact/deal fields). Sequence preview mode: step through sequence visually. "Save as Template" stores the sequence as reusable JSON in database. "Publish" makes it available for enrollment. Sequences stored in `sequence_templates` table with `org_id`, `name`, `description`, `steps` (JSONB).

**Depends on:** P2‑AICRM‑1‑2 (sequence engine), P1‑ROUTE‑1

**Related Files:** `apps/web/src/routes/_dashboard/crm/sequences/builder.tsx` (new), `apps/web/src/components/crm/SequenceNode.tsx` (new), `apps/web/package.json` (add `@xyflow/react`)

**Definition of Done:** Drag-and-drop sequence builder with email/wait/condition/end nodes. Variable injection in templates. Save as template. Preview mode. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-1-4: Build sequence analytics dashboard (open rate, reply rate, stage completion)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build `apps/web/src/routes/_dashboard/crm/sequences/analytics.tsx`. Per-sequence metrics: enrollment count, completion rate (% contacts who reached end), open rate per email step, click rate per email step, reply rate, deal creation rate from sequence. Aggregate metrics: best performing sequences, worst performing steps (highest drop-off). Charts: open rate by step (bar chart), completion funnel (horizontal bar — enrolled → email 1 opened → email 2 opened → replied → deal created). Date range filter. Export CSV. Data from `crm.sequence_enrollments` and `crm.sequence_steps` tables tracking per-contact step progression.

**Depends on:** P2‑AICRM‑1‑2 (sequence engine tracks per-step events), P1‑ANALYTICS‑1 (analytics patterns)

**Related Files:** `apps/web/src/routes/_dashboard/crm/sequences/analytics.tsx` (new)

**Definition of Done:** Per-sequence and aggregate analytics. Open/click/reply rates. Completion funnel. CSV export. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-2-1: Build deal scoring model (rule‑based: activity recency, stage age, engagement signals)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `apps/web/src/server/trpc/routers/crm/scoring.ts` with `crm.scoring.getDealScore` procedure. Rules engine evaluates deal health based on configurable factors: activity recency (+10 if last activity within 3 days, +5 if within 7 days), stage age (−5 if stalled in same stage >30 days, −10 if >60 days), engagement signals (+15 if contact opened email in last 7 days, +25 if replied), contact seniority (+10 if VP+ title detected), deal value (proportional bonus for high-value deals). Configurable per org via `scoring_rules` JSONB on organization settings. Score displayed as numeric badge with color coding: green (≥70), yellow (40‑69), red (<40). Hover tooltip shows contributing factors and their values. Score computed on read (lazy aggregation) — not stored eagerly.

**Depends on:** P1‑CRM‑TRPC‑3 (deals router), P1‑SETTINGS‑2 (org settings)

**Related Files:** `apps/web/src/server/trpc/routers/crm/scoring.ts` (new), `apps/web/src/components/crm/DealScoreBadge.tsx` (new)

**Definition of Done:** Rule‑based scoring with configurable rules. Color‑coded badge. Factor breakdown on hover. Lazy computation on read. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-2-2: Build pipeline analytics dashboard (win rate, cycle time, velocity, revenue forecast)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build `apps/web/src/routes/_dashboard/crm/analytics/pipeline.tsx` with seven core metrics calculated from live deal data: Pipeline coverage ratio (total pipeline value ÷ quota), Win rate (% of deals marked won vs total closed), Sales velocity `(opportunities × avg deal value × win rate) ÷ avg cycle days`, Average cycle length (days from created to won/lost), Stage conversion rates (% progressing from each stage to next), Deal aging (deals stuck in stage beyond average time), Pipeline creation rate (new deals per month). Charts: Win rate by stage (horizontal bar), Pipeline velocity trend (line chart over 12 months), Stage conversion funnel (vertical bar), Revenue forecast (weighted by stage probability × deal value). All metrics filterable by date range, pipeline, and owner. Data from `crm.deals` with JOIN on `deal_stage_transitions` for stage history.

**Depends on:** P1‑CRM‑TRPC‑3 (deals router), P1‑ANALYTICS‑1 (Recharts patterns)

**Related Files:** `apps/web/src/routes/_dashboard/crm/analytics/pipeline.tsx` (new)

**Definition of Done:** Seven pipeline metrics with live data. Velocity, win rate, cycle time, forecast charts. Date/pipeline/owner filters. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-2-3: Build CRM sales dashboard (total pipeline, deals by stage, top rep leaderboard)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build `apps/web/src/routes/_dashboard/crm/analytics/overview.tsx`. KPI cards: Total pipeline value, Open deals count, Avg deal size, Win rate (MTD). Deals by stage funnel chart with count and value per stage. Top performer leaderboard: ranked by revenue won (monthly), with deal count, win rate, and avg deal size per rep. Activity metrics: calls logged, emails sent, meetings scheduled per rep (this week). Monthly quota attainment: progress bar per rep comparing won revenue to quota target. Data from CRM tRPC procedures aggregated per rep.

**Depends on:** P2‑AICRM‑2‑2 (pipeline analytics with shared data)

**Related Files:** `apps/web/src/routes/_dashboard/crm/analytics/overview.tsx` (new)

**Definition of Done:** Sales KPI cards. Stage funnel. Rep leaderboard with quota attainment. Activity metrics. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-2-4: Implement deal health indicators (stalled deals, at‑risk tags, activity‑based warnings)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟢 Low

**Description:** Create `apps/web/src/components/crm/DealHealthBadge.tsx` — badge displayed on deal cards and detail pages. Green (on‑track): activity within 7 days, stage age within average. Yellow (at‑risk): no activity in 7‑14 days, OR past expected close date. Red (stalled): no activity in 14+ days, OR stuck in stage >2× average. Hover tooltip shows: last activity date and type, days in current stage, expected close date status. Inngest nightly cron (`TZ=UTC 0 3 * * *`) pre‑computes health status for all open deals and stores in `deal_health_status` column for fast querying. Badge updates on next deal view after status change.

**Depends on:** P2‑AICRM‑2‑1 (scoring data), P0‑INNGEST‑2 (cron)

**Related Files:** `apps/web/src/components/crm/DealHealthBadge.tsx` (new), `apps/web/src/server/inngest/functions/crm/health-scorer.ts` (new)

**Definition of Done:** Color‑coded health badges. Activity‑based status. Nightly cron. Hover detail tooltip. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-3-1: Build public CRM REST API (contacts, deals, activities) using tRPC‑to‑REST

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `apps/web/src/server/api/public/v1/crm/` — REST endpoints mapped from existing CRM tRPC procedures using `@trpc/openapi`. Endpoints: `GET /api/v1/crm/contacts`, `POST /api/v1/crm/contacts`, `GET /api/v1/crm/contacts/:id`, `PUT /api/v1/crm/contacts/:id`, `DELETE /api/v1/crm/contacts/:id`. Same pattern for deals and activities. Authentication via API key (`Authorization: Bearer ubos_...` header). Rate limited per API key. Versioned following P0‑API‑1 URL strategy. Documented in OpenAPI spec at `/api/v1/openapi.json`. Deprecation headers (RFC 8594/9745) ready via P0‑API‑2 middleware. Pagination via cursor. Filter support matching tRPC procedure inputs.

**Depends on:** P1‑CRM‑TRPC‑1/2/3 (CRM tRPC procedures), P0‑TRPC‑10 (OpenAPI), P0‑SEC‑3 (API keys), P0‑API‑1 (versioning)

**Related Files:** `apps/web/src/server/api/public/v1/crm/` (new), `apps/web/src/server/trpc/routers/crm/` (add OpenAPI metadata)

**Definition of Done:** REST endpoints for contacts/deals/activities. API key auth. Rate limiting. OpenAPI documented. Versioned. `pnpm run typecheck` passes.

---

### [ ] P2-AICRM-3-2 & P2-AICRM-3-3: Webhook outbound management + Zapier/Make triggers

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Note:** These are covered by `P2-SETTINGS-SEC-5` (Webhook Management settings page) in the P2‑SEC task definitions published in the previous section. The webhook management page covers outbound webhook configuration, event subscription, delivery logging, HMAC‑SHA256 signing, and Inngest‑based dispatch — all of which enable Zapier/Make integration via webhook triggers.

---

# tasks/phase-2/P2-INTEG.md — Integrations Hub & Calendar Sync

**P2-INTEG-1 — Integrations Directory Page** (`routes/_dashboard/settings/integrations/index.tsx`): List all available integrations with branding (icon, name, description), connection status (Connected/Not Connected/Error/Coming Soon), and action buttons. Following OAuth connection manager pattern. Categories: Calendar (Google, Outlook), Accounting (QuickBooks, Xero), Communication (Slack), Payments (Stripe), E‑Sign (DocuSign). (Small)

**P2-INTEG-2 — OAuth Connection Manager** (`packages/db/src/schema/integrations.ts`, tRPC router): Store encrypted OAuth tokens per org. Handle OAuth2 authorization code flow with PKCE for each provider. Automatic token refresh via provider SDK or API. Token expiry monitoring — warn 7 days before expiry. Revoke endpoint calls provider's token revocation. Provider SDKs: `@apigrate/quickbooks` v2.1.5 for QuickBooks Online (automatic OAuth2 token refresh, including an event handler) , `@googleapis/calendar` for Google Calendar, `@microsoft/microsoft-graph-client` for Outlook. (Medium)

**P2-INTEG-3 — Google Calendar Two‑Way Sync**: OAuth2 to Google Calendar API. Push UBOS tasks with due dates to Google Calendar as events with description and links. Pull external Google Calendar events to show in UBOS scheduling (blocking availability). Sync uses `events.watch` for push notifications (real-time) combined with incremental sync for reliability. Following the Nango pattern: "push notifications for instant change detection and incremental sync for reliable data retrieval" . Inngest sync function runs every 15 minutes for reconciliation. Duplicate detection by Google event ID. Two-way conflict: if an event is modified in both systems, UBOS wins for task-linked events, Google wins for personal events. (Large)

**P2-INTEG-4 — Microsoft/Outlook Calendar Sync**: Same architecture as Google Calendar but using Microsoft Graph API. Register app in Microsoft Entra ID. OAuth2 scopes: `Calendars.ReadWrite`. Following unified.to guide: "register your app in Microsoft Entra ID, configure OAuth consent screen."  Uses `@microsoft/microsoft-graph-client` SDK. Sync tasks to Outlook events, pull Outlook events for availability. Two-way conflict resolution matching Google pattern. (Large)

**P2-INTEG-5 — Slack Notification Integration**: Covered in P1‑NOTIF‑1 (Slack delivery channel for notification dispatcher). Extends with custom notification templates per Slack channel, interactive Slack buttons, slash commands. (Medium)

**P2-INTEG-6 — QuickBooks Online Sync**: OAuth2 to QuickBooks Online via `@apigrate/quickbooks` which supports "automatic OAuth2 token refresh including an event handler" . Push invoices/bills from UBOS to QuickBooks. Pull chart of accounts for GL coding reference. Sync vendors. Webhook listener for QuickBooks change notifications: "In the Intuit Developer Portal, go to your app → Webhooks and register your endpoint" . Inngest cron for periodic reconciliation. Following apideck.com complete QBO integration guide (2026‑03‑06). (Large)

---

# tasks/phase-2/P2-TEST.md — Testing & QA Infrastructure

### [ ] P2-TEST-1: Expand E2E test suite to cover all critical user journeys

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Extend the E2E test suite from P1‑TEST‑SMOKE with additional scenarios: subscription purchase flow (signup → choose plan → Stripe checkout → verify subscription active), multi‑tenant isolation (create two tenants, verify cross‑tenant data blindness for CRM, Projects, Documents, Finance domains), portal access control (invite client → client signs in via magic link → client sees only shared resources → client cannot access internal pages), data export/deletion (admin triggers GDPR export → download link received → delete account → verify soft‑delete and reactivation), RBAC enforcement for all roles (admin vs member vs viewer permissions). Uses separate Playwright browser contexts per tenant for isolation. Tests run in CI on every PR. Screenshots captured on failure and uploaded as CI artifacts. Target: suite completes in under 5 minutes.

**Depends on:** P2‑PORTAL‑3 (magic link), P2‑SEC‑2‑1 (GDPR export), P2‑BILLING‑1 (checkout), P1‑TEST‑SMOKE

**Related Files:** `tests/e2e/critical-path.spec.ts` (new)

**Definition of Done:** All critical user journeys covered by E2E tests. Tests pass consistently in CI. Under 5 minutes. `pnpm run typecheck` passes.

---

### [ ] P2-TEST-2: Build API contract tests for all public REST endpoints

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `tests/contract/public-api.spec.ts` — OpenAPI contract validation for all public REST endpoints (CRM, future Finance/Projects public APIs). Verifies: response schema matches OpenAPI spec (using `openapi-schema-validator` or custom validation), status codes match spec, required headers present, authentication required for protected endpoints, pagination cursors follow spec, error response format matches schema. Run in CI on PR when OpenAPI spec or tRPC routers change.

**Depends on:** P2‑AICRM‑3‑1 (public REST API), P0‑TRPC‑10 (OpenAPI spec)

**Related Files:** `tests/contract/public-api.spec.ts` (new)

**Definition of Done:** Contract tests validate all public endpoints against OpenAPI spec. CI runs on spec changes. `pnpm run typecheck` passes.

---

### [ ] P2-TEST-3: Implement visual regression testing for all domain pages

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Using Playwright's built-in `toHaveScreenshot()` (v1.40.0+), create visual regression tests for all nine domain pages at desktop (1440px) and mobile (390px) viewports. Following the bug0.com 2026 guide: "toHaveScreenshot() captures screenshots, compares them pixel-by-pixel using pixelmatch, and fails your test when something looks wrong."  Baseline screenshots committed to `tests/visual/screenshots/`. Mask dynamic elements (timestamps, order IDs, relative dates) to avoid flaky false positives — following the dev.to pro-tip: "always mask dynamic elements like timestamps or order IDs to avoid flaky false positives."  Max diff pixel ratio: 0.01. Diff images uploaded as CI artifacts on failure. Documentation in CONTRIBUTING.md for updating baselines when intentional UI changes are made.

**Depends on:** All Phase 2 UI tasks, P1‑QA‑1 (UI activation)

**Related Files:** `tests/visual/domain-pages.spec.ts` (new), `tests/visual/screenshots/` (new)

**Definition of Done:** Visual regression tests for all 9 pages at 2 viewports. Baselines committed. CI runs on PR. Diff artifacts on failure. `pnpm run typecheck` passes.

---

### [ ] P2-TEST-4: Build load testing scripts for critical endpoints

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Using k6, create load test scripts for critical endpoints. Following the OFFER-HUB pattern: "Complete k6 load testing suite for verifying rate limiting, database connection pooling, and background job processing under stress. tests/load/sustained.js — 100 req/min sustained for 2 min, verifies <1% rate limited, p95 <500ms."  Scenarios: auth (sign‑in, 50 concurrent, ramp to 100), CRM list (100 concurrent with varied filters), global search (50 concurrent with varied queries), invoice creation (20 concurrent with idempotency keys to test deduplication), document upload (10 concurrent presigned URL requests). Test against staging environment. Output: P50/P95/P99 latency, error rate, throughput. Baseline established and committed to `tests/load/baseline.json`. Run manually before major releases (not in CI due to staging dependency).

**Depends on:** All Phase 2 domain tasks

**Related Files:** `tests/load/sustained.js`, `tests/load/spike.js` (new)

**Definition of Done:** Load test scripts for 5 critical endpoints. Baselines established. Manual execution documented.

---

# tasks/phase-2/P2-BILLING.md — Subscription & Usage Billing

### [ ] P2-BILLING-1: Build Stripe Checkout session for subscription purchase

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build pricing page at `routes/_dashboard/settings/billing/plans.tsx`. Plan cards showing features comparison (Free, Pro, Enterprise). "Subscribe" button creates Stripe Checkout Session via tRPC procedure `billing.createCheckoutSession`. Following the standard pattern: "On plan selection → create Stripe Checkout Session → return session URL to client."  Success URL: `/settings/billing?checkout=success`. Cancel URL: `/settings/billing/plans`. Webhook `checkout.session.completed` activates subscription in database (P0‑BILLING‑4 already handles this). Customer Portal link for managing existing subscription (P0‑BILLING‑5). Upgrade/downgrade handled via Stripe's subscription update API with proration. Requires `VITE_STRIPE_PUBLISHABLE_KEY` client-side. Uses Stripe Elements from P1‑BILLING‑UI‑0 for custom checkout (optional — hosted Checkout page also supported).

**Depends on:** P0‑BILLING‑4 (subscription webhooks), P1‑BILLING‑UI‑0 (Stripe Elements wrapper), P0‑BILLING‑1 (Stripe client)

**Related Files:** `apps/web/src/routes/_dashboard/settings/billing/plans.tsx` (new), `apps/web/src/routes/_dashboard/settings/billing/index.tsx` (new)

**Definition of Done:** Plan cards with feature comparison. Checkout session creation. Webhook activates subscription. Upgrade/downgrade with proration. Customer Portal link. `pnpm run typecheck` passes.

---

### [ ] P2-BILLING-2: Build usage metering (track seats, storage GB, AI token consumption)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `packages/db/src/schema/usage.ts` with `usage_records` table: `org_id`, `metric_name` (storage_gb, api_calls, ai_tokens, seats), `quantity` (float), `period_start`, `period_end`, `recorded_at`. Usage middleware `usage-meter.ts` increments counters: document upload → increment storage_gb, tRPC call → increment api_calls, AI completion → increment ai_tokens via P3‑AI‑INFRA‑6 token tracking. Periodic sync to Stripe metered billing: Inngest hourly cron aggregates usage by org and reports to Stripe via `stripe.billing.meterEvents.create()` using the Billing Meter API. Following MakerKit pattern: "Create a Meter in Stripe Dashboard → Billing → Meters → Event name: ai_tokens (used in code)."  Usage dashboard in admin showing per‑org consumption, near‑limit warnings, and historical trends.

**Depends on:** P0‑BILLING‑1 (Stripe client), P3‑AI‑INFRA‑6 (AI token tracking — concurrent), P0‑INNGEST‑2

**Related Files:** `packages/db/src/schema/usage.ts` (new), `apps/web/src/server/trpc/middleware/usage-meter.ts` (new), `apps/web/src/server/inngest/functions/billing/sync-usage.ts` (new)

**Definition of Done:** Usage tracking for 4 metrics. Hourly sync to Stripe. Admin dashboard with per‑org usage. Near‑limit warnings. `pnpm run typecheck` passes.

---

### [ ] P2-BILLING-3: Implement plan entitlement enforcement (gate features by active plan tier)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `apps/web/src/server/trpc/middleware/entitlement.ts` that gates features by plan tier. Reads org's active plan from `subscription_status` on the organization record. For each feature, checks if plan includes it. Returns `FORBIDDEN` with `UPGRADE_REQUIRED` error code and suggested plan when feature is not included. Following Stripe Entitlements pattern: "provide external feature gating managed in your Stripe dashboard."  Entitlements checked: storage limit (GB per plan), API rate (requests/min per plan), AI token limit (tokens/month), seats (max team members), custom domain support (enterprise only), SCIM/SSO access (enterprise only), portal workspace count (per plan). Upgrade prompt UI shown when limit reached: banner or modal with "Upgrade to Pro" CTA linking to billing page. Soft limits: warn at 80% usage. Hard limits: block at 100%.

**Depends on:** P2‑BILLING‑2 (usage metering data), P0‑BILLING‑4 (subscription status)

**Related Files:** `apps/web/src/server/trpc/middleware/entitlement.ts` (new), `apps/web/src/components/billing/UpgradePrompt.tsx` (new)

**Definition of Done:** Feature gating by plan tier. Upgrade prompts on limit exceeded. Soft/hard limit tiering. `pnpm run typecheck` passes.

---

### [ ] P2-BILLING-4: Build billing admin overview (subscription status, usage, invoice history)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build `routes/_dashboard/settings/billing/index.tsx`. Current plan card: plan name, status (active/past_due/canceled), renewal date, price. Usage meters: progress bars for storage, API calls, AI tokens, seats — showing used vs limit with percentage. Invoice history: paginated list from Stripe (fetched via tRPC → Stripe API) with invoice number, date, amount, status (paid/open), PDF download link. Payment method: card brand, last 4 digits, expiry — fetched from Stripe. "Change Plan" button → plans page (P2‑BILLING‑1). "Cancel Subscription" button → confirmation modal with exit survey, calls Stripe subscription cancel API (at period end). Billing contact email editable.

**Depends on:** P2‑BILLING‑1 (checkout), P2‑BILLING‑2 (usage data), P0‑BILLING‑1 (Stripe client), P0‑BILLING‑5 (Customer Portal)

**Related Files:** `apps/web/src/routes/_dashboard/settings/billing/index.tsx` (replace placeholder)

**Definition of Done:** Plan status, usage meters, invoice history, payment method, cancel/change flows. `pnpm run typecheck` passes.

---

# tasks/phase-2/P2-CAP.md — Capacity Management

### [ ] P2-CAP-1: Implement per‑tenant capacity limits (storage, API calls, records) and enforcement middleware

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `packages/db/src/schema/tenant-limits.ts` with `tenant_limits` table: `org_id` (FK), `max_storage_bytes` (bigint), `max_api_calls_per_minute` (integer), `max_ai_tokens_per_month` (bigint), `max_seats` (integer), `max_projects` (integer), `max_portal_workspaces` (integer). Defaults per plan tier. Capacity middleware `capacity.ts`: before resource creation operations, checks current usage against limit. Document upload → check storage bytes + new file size ≤ max. User invite → check current seats < max. Project creation → check count < max. Returns `429 TOO_MANY_REQUESTS` or `402 PAYMENT_REQUIRED` with limit detail and upgrade prompt. Soft limits: warn at 80% via notification. Hard limits: block at 100%. Admin override for temporary grace period (48-hour bypass, audit logged). Usage tracked via P2‑BILLING‑2 metering.

**Depends on:** P2‑BILLING‑2 (usage tracking), P0‑TRPC‑7 (rate limiting pattern)

**Related Files:** `packages/db/src/schema/tenant-limits.ts` (new), `apps/web/src/server/trpc/middleware/capacity.ts` (new)

**Definition of Done:** Per‑tenant capacity limits enforced. Soft warnings at 80%. Hard blocks at 100%. Admin override with audit log. `pnpm run typecheck` passes.

---

# tasks/phase-2/P2-MON.md — Monitoring & Status

### [ ] P2-MON-1: Set up public status page and health endpoint for external monitoring

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Deploy Uptime Kuma (open‑source, 54.4k GitHub stars) or set up `upptime` (GitHub Actions‑based, free) monitoring the `/api/health` endpoint. Following Uptime Kuma capabilities: "Status pages for internal and external visibility. Supports the creation of status pages that display service uptime information."  Monitor: UBOS API (health endpoint), Database connectivity (via health check), Stripe webhook processing. Status page hosted at `status.ubos.app`. Components: API, Database, File Storage, Email Delivery, Background Jobs. Incident management: create/update/resolve incidents visible on status page. Subscribe to status updates via email.

**Depends on:** P0‑OBS‑4 (health endpoint)

**Related Files:** External configuration — Uptime Kuma deployment or `.github/workflows/upptime.yml`

**Definition of Done:** Public status page with 5 components. Monitors running. Incident management. Subscription option.

---

### [ ] P2-ONCALL-1: Integrate on‑call alerting (PagerDuty/Opsgenie) for critical errors

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Configure Sentry's built‑in PagerDuty/Opsgenie integrations. Sentry already provides direct replacements for these integrations at Settings → Integrations: "Some deprecated plugins have a direct replacement in the integrations platform. Specific replacements include: PagerDuty - OpsGenie."  Alert rules in Sentry: health check failure (any dependency down for >2 minutes), error rate spike (>5% error rate for 5 minutes), DLQ depth >10 messages, Stripe webhook failure rate >10%. On‑call rotation configured in PagerDuty/Opsgenie. Following SRE tools consensus: "PagerDuty remains a gold standard for on‑call management. It orchestrates alerts, escalations, runbooks, and stakeholder communications."  Webhook endpoint at `/api/alerts` for external monitoring tool integration (optional).

**Depends on:** P0‑OBS‑1 (Sentry integration), P2‑MON‑1 (health monitoring)

**Related Files:** External configuration — Sentry dashboard, PagerDuty/Opsgenie

**Definition of Done:** Sentry → PagerDuty/Opsgenie alerting active. Alert rules configured. On‑call rotation set up.

---

# tasks/phase-2/P2-QUOTE.md — Quote Management

### [ ] P2-QUOTE-1: Define Quote entity (schema, tRPC, basic UI) linking Deals, Contacts, and future Invoices

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `packages/db/src/schema/quotes.ts` with `quotes` table: `id` (UUID PK), `org_id` (FK), `deal_id` (FK to deals — optional), `contact_id` (FK to contacts), `quote_number` (text — sequential, e.g., `QUO‑0001`), `status` (text CHECK IN: 'draft', 'sent', 'accepted', 'declined', 'expired'), `subtotal_cents`, `tax_cents`, `total_cents`, `valid_until` (date), `terms` (text), `notes` (text), `created_by` (FK), `created_at`, `updated_at`. `quote_line_items` table: `quote_id` (FK), `description`, `quantity`, `unit_price_cents`, `amount_cents`. tRPC: `quotes.list` (by deal or standalone), `quotes.create` (from deal — pre‑fills contact/deal info), `quotes.send` (emails PDF to contact via `enqueueEmail()`), `quotes.accept` (contact accepts → can trigger invoice creation workflow), `quotes.decline` (records reason). UI: Quote list in CRM deal detail (Quotes tab), Quote create/edit form with line items, Quote PDF preview (server‑side PDF generation or client‑side print), "Convert to Invoice" button (creates invoice from accepted quote). RLS enabled.

**Depends on:** P1‑CRM‑SCHEMA‑1 (deals/contacts), P1‑FIN‑TRPC‑3 (AR invoices), P0‑EMAIL‑0a (enqueueEmail)

**Related Files:** `packages/db/src/schema/quotes.ts` (new), `apps/web/src/server/trpc/routers/quotes.ts` (new), `apps/web/src/routes/_dashboard/crm/quotes/` (new)

**Definition of Done:** Quote CRUD. Line items. Send via email. Accept/decline. Convert to invoice. PDF preview. Linked to deals and contacts. `pnpm run typecheck` passes.

---

# tasks/phase-2/P2-TEST-5.md — Schema Compatibility Testing

### [ ] P2-TEST-5: Schema versioning compatibility integration test

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `tests/integration/schema-compatibility.spec.ts`. Test applies all migrations sequentially from initial to latest against a throwaway Neon branch, verifying each migration applies cleanly without errors. Then runs the application's type‑check and a light smoke test against the fully‑migrated database. Validates: migration files are in correct sequence (no gaps in journal), `__drizzle_migrations` table reflects applied migrations correctly, no schema drift between TypeScript definitions and migrated database (using `drizzle-kit push --dry-run` pattern from P0‑DB‑2), all foreign keys resolve correctly, all CHECK constraints are valid, all RLS policies are applied to correct tables. Run in CI on PRs touching `packages/db/src/schema/`.

**Depends on:** P0‑DB‑7 (Neon branching), P0‑MIG‑2 (schema diff CI)

**Related Files:** `tests/integration/schema-compatibility.spec.ts` (new), `.github/workflows/ci.yml` (add step)

**Definition of Done:** Schema compatibility test runs in CI on schema changes. Sequential migration application verified. No drift between TS and migrated DB.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All remaining Phase 2 tasks from TASKS.md are covered.*