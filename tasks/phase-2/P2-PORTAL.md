# tasks/phase-2/P2-PORTAL.md — Client Portal

This file covers the portal workspace schema (portal_workspaces, portal_members, portal_invitations) with RLS and org-scoping, the portal authentication gateway with an isolated route tree and separate portal layout, magic-link invitation flow for external clients using Better Auth's built-in email verification pattern, portal RBAC middleware with client-admin/client-member/view-only roles, the portal home dashboard with pending tasks, recent documents, open invoices, and messages, the portal document workspace, portal task checklist, branded portal builder with custom domain CNAME via Cloudflare for SaaS, the portal messaging thread, AR invoice exposure to portal clients, the client payment portal with Stripe elements, and the instalment plan configuration engine. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P2‑PORTAL (2026‑05‑06)

### 1. Client Portal Architecture — The 2026 Consensus

The Noloco client portal best practices (2026‑02‑25) establish the definitive blueprint for modern client portals: "A great client portal consolidates: Project status and milestones, File sharing and document approvals, Invoices and payment tracking, Messaging and feedback threads, Onboarding checklists and next steps."  The guide emphasizes five non‑negotiable principles: branding (custom domain, logo, colors), centralization (one hub for all client interactions), security (MFA, RBAC, encryption), mobile responsiveness (>50% of traffic from mobile), and freshness (automated status notifications so clients always see current data) .

- **Planhat Professional Services portal** (2026‑02‑24): "This is a collaborative microsite where I can share things like the statement of work, the actual project plan and the steps that I've chosen to share with the customer. I've got a collaborative chat, so I can tag the customer." 

- **Clio for Clients** (2026‑04‑07): "Create client portals between your firm and the client. Since resources are saved at the matter-level, you need to create a client portal for each of a client's matters." 

- **Birdview PSA** (2026‑02‑01): "Step 1: Define visibility rules before inviting clients. Step 2: Separate internal planning from client-facing delivery views. Step 3: Use a client portal instead of shared internal workspaces." 

**For UBOS**: The portal is a separate route tree (`/portal/$workspaceId/*`) with its own layout, auth gateway, and branding. Internal users and portal clients share the same database but see different views — portal clients only see resources explicitly shared with their workspace, enforced by portal RBAC middleware.

### 2. Magic-Link Invitation — Better Auth Pattern

The 2026 consensus uses magic links as the primary invitation mechanism:

- **macwilling/TaskFlow #59** (2026‑03‑06): "Replace admin.auth.admin.inviteUserByEmail() with signInWithOtp() for the initial grant. The first magic link email IS the invite. There is no separate 'accept invite' step. The auth callback already handles profile creation on first visit." 

- **ideaignitor/docflow #11** (2026‑01‑03): "POST /api/v1/auth/magic-link - Request magic link, magic link token generated (15 min expiry)." 

- **LoginRadius B2B SaaS guide** (2026‑05‑01): "A poorly designed magic link flow can confuse users switching devices. Strong authentication needs to match the user's stage, not just the system's preference." 

**For UBOS**: Better Auth's built-in email verification + `signIn.email` flow can serve as the magic-link foundation. Portal invitations generate a signed JWT with workspace context (`workspaceId`, `role`, `expiresAt`). The invite URL is `/portal/accept?token=...`. On first visit, the external user is created as a "portal contact" (not a full org member) and associated with the workspace. The token exchange creates a portal‑scoped session. Better Auth's session cookies handle subsequent visits.

### 3. Custom Domain CNAME — Cloudflare for SaaS

Cloudflare for SaaS (2026‑04‑15) is the definitive approach for white-label portal domains:

- **Cloudflare for SaaS**: "Provide custom domain support. Keep your customers' traffic encrypted. Keep your customers online." The CNAME target provides a friendly place for customers to route their traffic — e.g., `customers.ubos.app`. The fallback origin receives all custom hostname traffic. 

- **SSL for SaaS**: "SSL for SaaS manages customer hostnames and certificates automatically." Cloudflare provisions SSL certificates for customer domains and handles validation. The first 100 custom hostnames are free. 

- **Productboard** (2026‑03‑24): "Go to the DNS section on your provider's website and add a CNAME record for your public portal custom domain." 

- **Community issue** (2026‑01‑16): Notable gotcha — "I'm trying to set up custom domains on Cloudflare for SaaS on a domain with a worker, and I'm unable to get the SSL cert to be issued properly." Solution: set Worker route to `*/*` to match custom hostnames, add exclusions for platform domains. 

**For UBOS**: Portal branding settings page lets org admins configure a custom domain (e.g., `portal.theiragency.com`). Backend: store `custom_domain` and `custom_domain_verified` on the portal workspace. When a custom domain is added, use the Cloudflare API to create a custom hostname for the zone. The client adds a CNAME record pointing to `customers.ubos.app`. Cloudflare provisions the SSL certificate automatically. Worker route must match `*/*` to handle custom hostname traffic. The Worker reads the `Host` header, resolves the workspace, and renders the branded portal.

### 4. Branded Portal Builder — Logo, Colors, Typography

The 2026 consensus from Jotform, HoneyBook, ZPortals, SuiteDash, and Salesbuildr converges on the same feature set:

- **Jotform Enterprise** (2026‑03‑30): "Add your company's logo and favicon, define your official name, and set up a custom domain. These settings ensure your forms, dashboards, and portals reflect your brand at every touchpoint." 

- **HoneyBook** (2026‑02‑11): "Customize your client portal and login page using different fonts and colors. From the navigation menu, select your company logo. Navigate to the Domain & client portal section." 

- **ZPortals** (2026‑03‑12): "Apply your brand colors, logos, and typography. Use your own domain for a seamless experience. Choose from multiple themes and layouts. Create a fully white-labeled portal." 

- **SuiteDash** (2026‑02‑15): "When properly configured, your clients will never know SuiteDash powers your portal. You control: Custom domain (portal.yourbusiness.com), Your logo and branding colors throughout, Email branding." 

- **Salesbuildr** (2026‑02‑27): "Logo, favicon, main brand color (replaces the default blue). You can upload custom font files to use across your portal and quote documents." 

**For UBOS**: The branding builder at Settings → Portal → Branding stores `portal_logo_key` (R2 presigned URL for logo upload), `portal_primary_color` (hex), `portal_favicon_key`, and `portal_custom_domain`. These are read at portal render time and injected via CSS custom properties (`--portal-primary-color`) and `<link rel="icon">`. The portal layout uses these variables throughout all components. Email notifications sent from the portal use the org's branded sender name and logo.

### 5. Portal RBAC — Three Roles

The 2026 RBAC consensus for client portals uses a three‑role model:

- **DreamFactory Unified API Guide** (2026‑02‑25): "Role and attribute-based access control applies at route, row, and field levels. Output filters and masking protect sensitive fields without custom code." 

- **Noloco Best Practices** (2026‑02‑25): "Role-based access controls, so clients only see their own data." 

**For UBOS portal RBAC**: Three roles — `client-admin` (can invite other portal members, manage workspace settings, see all shared resources), `client-member` (can view shared resources, upload documents, complete tasks), `view-only` (read-only access to shared documents and project status). Portal RBAC middleware runs after portal auth and checks `ctx.portalMember.role` against the required permission. All portal data queries are filtered by `workspace_id` — portal members can never access data from other workspaces or internal org data.

### 6. Instalment Plans — Stripe Invoice Payment Plans

- **Stripe Payment Plans Guide** (2026‑02‑22): "A payment plan is an agreement that lets a customer pay for a product or service over time instead of in one lump sum. Payment plans finance a single purchase: Each installment reduces the remaining balance tied to a specific product or service." 

- **Community discussion** (2026‑01‑20): "With Stripe's current model, you have effectively only two ways to implement a truly enforced installment workflow: Use a BNPL provider (for example, Klarna), which handles the credit logic and repayment obligation on their side. Or use the invoice payment plan feature where Stripe creates scheduled invoices." 

**For UBOS**: Instalment plans are implemented via Stripe Invoices with scheduled payment terms. When a client chooses instalments, the system creates a Stripe invoice with `payment_settings.payment_method_options.card.installments.enabled = true`. Each instalment is a separate invoice line item with a future `due_date`. Stripe's dunning process handles failed payments automatically. The portal displays the instalment schedule, paid amounts, and upcoming payments.

---

## Task Definitions

### [ ] P2-PORTAL-1: Define portal workspace schema (portal_workspaces, portal_members, portal_invitations)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Create `packages/db/src/schema/portal.ts` with three tables. **`portalWorkspacesTable`**: `id` (UUID PK), `org_id` (UUID FK), `name` (text), `slug` (text UNIQUE), `logo_key` (text—R2 key), `primary_color` (text DEFAULT '#2563eb'), `favicon_key` (text), `custom_domain` (text UNIQUE nullable), `custom_domain_verified` (boolean DEFAULT false), `is_active` (boolean DEFAULT true), `created_at`, `updated_at`. **`portalMembersTable`**: `id` (UUID PK), `org_id` (UUID FK), `workspace_id` (UUID FK), `user_id` (UUID FK—the portal contact user), `role` (text DEFAULT 'client-member' CHECK IN: 'client-admin', 'client-member', 'view-only'), `invited_by` (UUID FK), `invited_at`, `accepted_at`, `created_at`. UNIQUE on `(workspace_id, user_id)`. **`portalInvitationsTable`**: `id` (UUID PK), `org_id` (UUID FK), `workspace_id` (UUID FK), `email` (text NOT NULL), `role` (text DEFAULT 'client-member'), `token` (text UNIQUE—JWT), `invited_by` (UUID FK), `status` (text DEFAULT 'pending' CHECK IN: 'pending', 'accepted', 'expired', 'revoked'), `expires_at` (timestamptz NOT NULL DEFAULT NOW() + INTERVAL '7 days'), `accepted_at`, `created_at`. RLS on all tables.

**Depends on:** P0‑DB‑5, P0‑DB‑3

**Related Files:** `packages/db/src/schema/portal.ts` (new)

**Definition of Done:** Three tables with RLS, UNIQUE constraints, CHECK constraints. Migration generated and applied. `pnpm run typecheck` passes.

---

### [ ] P2-PORTAL-2: Build portal authentication gateway (isolated route tree, no main app access)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Create `apps/web/src/routes/portal/__root.tsx` — a separate root layout for the portal route tree. This layout renders a **branded shell** (no MainLayout sidebar/header — portal has its own minimal navigation). Implements `beforeLoad` auth guard that validates the portal session token (JWT from invitation or portal‑scoped session cookie). Portal routes live under `portal/$workspaceSlug/*`. The portal layout applies the workspace's branding: reads `primary_color`, `logo_key` from workspace context, injects CSS custom properties. Portal users can never access main app routes — the portal session cookie lacks organization membership. Portal sign‑in page at `/portal/$workspaceSlug/signin` uses email + magic link (no password). Portal logo and brand color rendered on sign‑in page.

**Depends on:** P2‑PORTAL‑1, P0‑AUTH‑2

**Related Files:** `apps/web/src/routes/portal/__root.tsx` (new), `apps/web/src/routes/portal/$workspaceSlug.tsx` (new—layout)

**Definition of Done:** Separate portal route tree with branded layout. Portal auth guard rejects non‑portal sessions. Portal sign‑in with magic link. Main app routes inaccessible from portal session. `pnpm run typecheck` passes.

---

### [ ] P2-PORTAL-3: Implement magic‑link invitation flow for external clients

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Build the invitation system. **Invite flow**: Org admin navigates to Portal → Members → "Invite Client", enters email + role, submits. Server creates `portalInvitation` with JWT token (signed with `BETTER_AUTH_SECRET`, payload: `{ workspaceId, role, email, exp }`). Email sent via `enqueueEmail()` with magic‑link URL: `{APP_URL}/portal/accept?token={jwt}`. **Accept flow**: `routes/portal/accept.tsx` reads token from query params, validates JWT signature and expiry, creates portal‑scoped user account (if new) or links existing portal contact, creates `portalMember` record, sets session cookie with portal context, redirects to portal dashboard. **JWT structure**: `{ sub: 'portal_invitation', workspaceId, role, email, iat, exp }`. Signed with HS256. 7‑day expiry. **Security**: Token is single‑use — `accepted_at` prevents replay. Rate limit: 3 invitation emails per workspace per hour.

**Depends on:** P2‑PORTAL‑1, P2‑PORTAL‑2, P0‑EMAIL‑0a

**Related Files:** `apps/web/src/routes/portal/accept.tsx` (new), `apps/web/src/server/trpc/routers/portal/invitations.ts` (new)

**Definition of Done:** Admin can invite clients. Magic link delivered via email. Token validated on accept. Portal member created. Session scoped to portal workspace. Rate limiting enforced. `pnpm run typecheck` passes.

---

### [ ] P2-PORTAL-4: Build portal RBAC middleware (client‑admin, client‑member, view‑only)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Create `apps/web/src/server/trpc/middleware/portal-rbac.ts` — tRPC middleware that reads the portal member's role from the session context. Three roles: `client-admin` (full access to workspace: invite members, manage settings, upload/delete documents, view all shared resources), `client-member` (view shared resources, upload documents, complete tasks, post messages), `view-only` (read-only access to shared documents and project status — no uploads, no messages). Middleware checks `ctx.portalMember.role` against procedure metadata (`requiredPortalRole`). Portal procedures are namespaced under `portal.*` router with a separate `portalProcedure` base that includes both portal auth and portal RBAC. Row‑level filtering: all portal queries automatically filter by `workspace_id` — portal members can never see data from other workspaces or internal org data.

**Depends on:** P2‑PORTAL‑2, P0‑TRPC‑3

**Related Files:** `apps/web/src/server/trpc/middleware/portal-rbac.ts` (new), `apps/web/src/server/trpc/routers/portal/_app.ts` (new)

**Definition of Done:** Portal RBAC enforcing three roles. Workspace‑scoped data queries. Internal data inaccessible to portal users. `pnpm run typecheck` passes.

---

### [ ] P2-PORTAL-5 through P2-PORTAL-12: Portal UI Pages

**P2-PORTAL-5 — Portal Home Dashboard** (`routes/portal/$workspaceSlug/index.tsx`): KPI cards (open tasks, recent documents, outstanding invoices, next milestone). Activity feed (recent uploads, completed tasks, messages). "What's New" section. Onboarding checklist for new portal members. Branded with workspace colors/logo. Mobile responsive. (Large)

**P2-PORTAL-6 — Portal Document Workspace** (`routes/portal/$workspaceSlug/documents.tsx`): Filtered document list showing only documents shared with the portal workspace. Upload button (creates document entity linked to workspace). Download via presigned GET URLs. Document preview. Version history (read-only for portal). (Medium)

**P2-PORTAL-7 — Portal Task Checklist** (`routes/portal/$workspaceSlug/tasks.tsx`): Tasks published to portal from internal project management (P1‑PROJ). Checkbox to mark complete. Due date display. Progress bar for overall completion. New tasks appear with "New" badge. Client can add comments on tasks. Following Planhat: "the actual project plan and the steps that I've chosen to share with the customer." (Medium)

**P2-PORTAL-8 — Branded Portal Builder** (`routes/_dashboard/settings/portal/branding.tsx`): Logo upload via presigned URL. Primary color picker (preset palette + custom hex). Favicon upload. Google Font selector (10 curated fonts). Live preview panel showing how portal will look. Custom domain input with CNAME verification instructions and status badge (pending/verified). "Save" applies branding immediately. Following Jotform/HoneyBook/ZPortals patterns. (Medium)

**P2-PORTAL-9 — Portal Messaging Thread** (`routes/portal/$workspaceSlug/messages.tsx`): Simple org↔client chat. Messages grouped by date. Text input with send button. Typing indicator. File attachment support (uploaded to workspace documents). Notification email to internal team on new client message. (Medium)

**P2-PORTAL-10 — AR Invoice Exposure to Portal Clients**: tRPC procedures `portal.invoices.list` (returns invoices linked to workspace, filtered to `sent` and `paid` status only — drafts not visible). `portal.invoices.getById` (with line items). Invoice PDF download via presigned URL. Payment history for each invoice. (Medium)

**P2-PORTAL-11 — Client Payment Portal** (`routes/portal/$workspaceSlug/payments.tsx`): Invoice list with status badges. "Pay Now" button opens Stripe PaymentElement (using P1‑BILLING‑UI‑0 wrapper). Card/ACH/Apple Pay/Google Pay supported. Payment confirmation with receipt download. Payment history. Auto‑syncs with Stripe webhook — payment status updates in real time. (Large)

**P2-PORTAL-12 — Instalment Plan Configuration**: Org admin configures instalment options (3‑month, 6‑month, 12‑month) for invoices above a threshold. Client sees "Pay in Instalments" option on eligible invoices. System creates Stripe invoice with scheduled payments. Portal displays instalment schedule with paid/upcoming status. Stripe handles automatic payment collection and dunning. (Medium)

**P2-PORTAL-CNAME — Custom Domain CNAME Support** (`routes/_dashboard/settings/portal/domains.tsx`): Input for custom domain. Validation: must be a subdomain (e.g., `portal.clientdomain.com`). Generates CNAME instructions: "Add a CNAME record pointing `portal.clientdomain.com` to `customers.ubos.app`." Verification button: checks DNS propagation via Cloudflare API. Once verified, portal accessible at custom domain. SSL certificate auto‑provisioned via Cloudflare for SaaS. Worker route configured to handle custom hostname traffic. Following Cloudflare for SaaS documentation and community best practices. (Medium)

---

# tasks/phase-2/P2-ASSETS.md — Asset Management

**P2-ASSETS-1 — Assets Schema**: `assets` table (name, category, location, status, serial_number, purchase_date, purchase_cost_cents, current_value_cents, depreciation_method, useful_life_months, salvage_value_cents, assigned_to_user_id, assigned_to_project_id, qr_code_text, notes, custom_fields JSONB, org_id FK). `assetCategories` table. `assetAssignments` table (asset_id, user_id/project_id, checkout_date, expected_return_date, actual_return_date, checked_out_by). `assetMaintenance` table (asset_id, maintenance_type, scheduled_date, completed_date, cost_cents, vendor, notes). RLS enabled. (Medium)

**P2-ASSETS-2 — Assets CRUD tRPC**: Create/Read/Update/Delete for assets, categories, check-out/check-in, maintenance scheduling. Search by name/serial/category. Barcode/QR code lookup endpoint. (Medium)

**P2-ASSETS-3 — Asset Check-Out/Check-In**: `POST assets.checkout` validates asset availability, creates assignment record, sends notification to assignee. `POST assets.checkin` records return date, calculates rental period, flags overdue. Conflict detection: prevents double‑booking. (Medium)

**P2-ASSETS-4 — Asset Depreciation Engine**: Inngest monthly cron. Calculates depreciation for each asset based on `depreciation_method` (straight-line/declining balance). Updates `current_value_cents`. Posts depreciation journal entries to Finance ledger (debit depreciation expense, credit accumulated depreciation). (Medium)

**P2-ASSETS-5 — Asset → Finance Auto‑Capitalize**: When an asset is created from an approved AP bill, auto‑capitalize: create asset record from bill line item, link asset to bill via entity_links. Triggered by `finance/bill.approved` event when bill line items are asset‑type purchases. (Medium)

**P2-ASSETS-6 — Asset List View**: Table with category, location, status badges, current value, QR code icon. Search by name/serial. Filter by category/status/location. Bulk actions (print QR codes, export CSV). (Medium)

**P2-ASSETS-7 — Asset Detail Page**: Full detail with specs, assignment history timeline, maintenance log, depreciation schedule chart. Actions: Edit, Check-Out, Schedule Maintenance, Print QR Code, Decommission. (Medium)

**P2-ASSETS-8 — QR Code Generator**: Using `qrcode` npm package. Generate QR code image from asset ID or serial. Printable label template (Avery 5160). "Print QR Codes" bulk action generates multi‑label PDF. (Small)

---

# tasks/phase-2/P2-AICRM.md — Advanced CRM Features

### P2-AICRM-1 — Email & Communication

**P2-AICRM-1-1 — Email Send + Auto‑Log**: Compose email from CRM contact/deal page. Send via `enqueueEmail()`. Auto‑log as activity (`type: 'email'`) linked to the contact/deal. Track opens and clicks via Resend webhooks. Email thread view in activity timeline. (Medium)

**P2-AICRM-1-2 — Email Sequence Engine**: Inngest function triggered by contact enrollment event. Multi‑step outreach using `step.sleep()` for delays between emails and `step.run()` for sending each email. Steps: Day 0 → Intro email, Day 3 → Follow‑up, Day 7 → Value proposition, Day 14 → Breakup. If contact replies or deal is created, sequence auto‑ends. Sequence progress tracked on contact detail. (Large)

**P2-AICRM-1-3 — Sequence Builder UI**: Drag‑and‑drop sequence builder using React Flow. Define steps (email send, wait delay, condition fork). Each email step: subject template, body template with variable injection (`{{contact.firstName}}`, `{{deal.name}}`). Condition: if contact opened email → continue, else → follow‑up variant. Preview mode. "Save as Template." (Large)

**P2-AICRM-1-4 — Sequence Analytics Dashboard**: Open rate per email step. Reply rate. Deal creation rate from sequence. A/B test comparison between sequence variants. Unsubscribe rate. Per‑sequence and aggregate views. (Medium)

### P2-AICRM-2 — Pipeline Intelligence

**P2-AICRM-2-1 — Deal Scoring Model**: Rule‑based scoring: activity recency (+10 if activity in last 3 days), stage age (−5 if stalled >30 days in same stage), engagement signals (+15 if email opened, +25 if replied), contact seniority (+10 if VP+ title). Score displayed as badge on deal card. Configurable scoring rules per org. (Medium)

**P2-AICRM-2-2 — Pipeline Analytics Dashboard**: Win rate by stage. Average cycle time (lead → won). Pipeline velocity ($/week). Revenue forecast (weighted by stage probability). Deal aging heat map (deals stuck in stage). (Large)

**P2-AICRM-2-3 — CRM Sales Dashboard**: Total pipeline value. Deals by stage (funnel). Top performer leaderboard (by revenue won). Activity metrics (calls/emails per rep). Monthly quota attainment. (Medium)

**P2-AICRM-2-4 — Deal Health Indicators**: Color‑coded badges: green (on‑track), yellow (at‑risk: no activity in 7+ days), red (stalled: no activity in 14+ days, past expected close date). Hover tooltip shows health factors. Auto‑updated by Inngest nightly cron. (Small)

### P2-AICRM-3 — Integrations

**P2-AICRM-3-1 — Public CRM REST API**: `GET /api/v1/crm/contacts`, `POST /api/v1/crm/contacts`, etc. Versioned, documented in OpenAPI, rate‑limited. Follows P0‑API‑1 versioning strategy. (Large)

**P2-AICRM-3-2 — Webhook Outbound Management**: Covered in P2‑SETTINGS‑SEC‑5 (Webhook Management settings page). (Already defined)

**P2-AICRM-3-3 — Zapier/Make Integration**: Publish CRM events as webhook triggers that Zapier/Make can consume. Same infrastructure as P2‑AICRM‑3‑2. Configured via webhook management UI. (Small)

---

# tasks/phase-2/P2-INTEG.md — Integrations Hub & Calendar Sync

**P2-INTEG-1 — Integrations Directory**: Settings → Integrations page listing all available integrations with connection status (Connected, Not Connected, Error), branding (icon, name, description), and "Configure"/"Connect" buttons. (Small)

**P2-INTEG-2 — OAuth Connection Manager**: `integrations` table storing OAuth tokens per org (encrypted at rest using `BETTER_AUTH_SECRET`‑derived key). Token refresh handled automatically via provider SDK. Revoke endpoint calls provider's token revocation. Token expiry monitoring: warn 7 days before expiry. (Medium)

**P2-INTEG-3 — Google Calendar Two‑Way Sync**: OAuth to Google Calendar. Push UBOS tasks with due dates to Google Calendar. Pull external events to show in UBOS scheduling. Sync conflicts: duplicate detection by event ID. Inngest sync function runs every 15 minutes via cron. (Large)

**P2-INTEG-4 — Microsoft/Outlook Calendar Sync**: Same pattern as Google Calendar but using Microsoft Graph API. OAuth to Azure AD. Sync tasks and events. (Large)

**P2-INTEG-5 — Slack Notification Integration**: Coverage started in P1‑NOTIF‑1 (Slack delivery channel for notification dispatcher). Extends with: custom notification templates per Slack channel, interactive Slack buttons ("View Deal", "Approve Bill"), slash command integration (`/ubos search`). (Medium)

**P2-INTEG-6 — QuickBooks Online Sync**: OAuth to QuickBooks Online via Intuit API. Push invoices/bills created in UBOS to QuickBooks. Pull chart of accounts for GL coding reference. Sync vendors. Inngest sync function for periodic reconciliation. Following apideck.com complete QBO integration guide (2026‑03‑06)  and `@apigrate/quickbooks` npm package (2026‑03‑03) for automatic OAuth2 token refresh . (Large)

---

# tasks/phase-2/P2-TEST.md — Testing & QA Infrastructure

**P2-TEST-1 — Critical Path E2E Suite**: Coverage started in P1‑TEST‑SMOKE. Extends with: subscription purchase flow, multi‑tenant isolation (create two tenants, verify cross‑tenant data blindness for all domains), portal access control, data export/deletion verification, RBAC enforcement for all roles. (Large)

**P2-TEST-2 — API Contract Tests**: Validate OpenAPI spec matches implementation for all public REST endpoints. Uses `openapi‑diff` or custom contract test suite. Schema validation for request/response. Status code verification. Authentication requirement validation. (Medium)

**P2-TEST-3 — Visual Regression Testing**: Using Playwright's built‑in `toHaveScreenshot()` (v1.40.0+). Baseline screenshots committed to `tests/visual/screenshots/`. Compare against baselines on every PR. Diff images uploaded as CI artifacts on failure. Max diff pixel ratio: 0.01. Screenshots for all nine domain pages at desktop + mobile viewports. Following UIForge #87 pattern: "Screenshot comparisons work automatically. The E2E CI job already runs Playwright."  Documentation in CONTRIBUTING.md for updating baselines. (Medium)

**P2-TEST-4 — Load Testing Scripts**: k6 or Artillery scripts targeting critical endpoints: auth (sign‑in rate), CRM list (100 concurrent), search (50 concurrent with varied queries), invoice creation (20 concurrent with idempotency keys). Run against staging. Report: P50/P95/P99 latency, error rate, throughput. Baseline established and committed to `tests/load/baseline.json`. (Medium)

---

# tasks/phase-2/P2-BILLING.md — Subscription & Usage Billing

**P2-BILLING-1 — Stripe Checkout for Subscription Purchase**: Build pricing page at `/settings/billing/plans`. Plan cards with features comparison. "Subscribe" button creates Stripe Checkout Session via tRPC. Success/cancel URLs handle post‑checkout routing. Webhook handles `checkout.session.completed` to activate subscription. Upgrade/downgrade/proration via Stripe. (Medium)

**P2-BILLING-2 — Usage Metering**: `usage_records` table tracking per‑org consumption: `org_id`, `metric_name` (storage_gb, api_calls, ai_tokens, seats), `quantity`, `period_start`, `period_end`. Usage middleware increments counters on operations (document upload → storage_gb, tRPC call → api_calls). Periodic sync to Stripe metered billing via `stripe.billing.meterEvents.create()`. Usage dashboard in admin showing per‑org consumption. Following Stripe metered subscriptions pattern supported by Stripe Billing (0.7% billing fee).  (Medium)

**P2-BILLING-3 — Plan Entitlement Enforcement**: `entitlement.ts` middleware that gates features by plan tier. Reads org's active plan from database. Rejects requests for features not included in current plan (`FORBIDDEN` with upgrade prompt). Entitlements checked: storage limit, API rate, AI token limit, team size, custom domain support, SCIM/SSO access. Plan upgrade path displayed in UI when limit reached. (Medium)

**P2-BILLING-4 — Billing Admin Overview**: Settings → Billing page. Current plan with feature list. Usage meters (progress bars). Invoice history (from Stripe). Payment method management. "Change Plan" button. "Cancel Subscription" with exit survey. Billing contact email. (Medium)

---

# tasks/phase-2/P2-CAP.md & P2-MON.md — Capacity & Monitoring

**P2-CAP-1 — Per‑Tenant Capacity Limits**: `tenant_limits` table storing per‑org caps: `max_storage_bytes`, `max_api_calls_per_minute`, `max_ai_tokens_per_month`, `max_seats`. Capacity middleware checks limits before resource creation (document upload → storage check, user invite → seats check). Returns `429 TOO_MANY_REQUESTS` or `402 PAYMENT_REQUIRED` with upgrade prompt. Soft limits: warn at 80%, hard block at 100%. Admin override for grace period. (Medium)

**P2-MON-1 — Public Status Page**: Deploy open‑source status page (e.g., `kener` or `upptime`) monitoring the `/api/health` endpoint. Shows current status + 90‑day uptime history. Configured via GitHub Actions `upptime` workflow. (Small)

**P2-ONCALL-1 — On‑Call Alerting**: PagerDuty/Opsgenie integration. Alert on: health check failure (any dependency down for >2 min), error rate spike (>5% for 5 min), DLQ depth > 10, Stripe webhook failure rate > 10%. Sentry alert rules configured via Sentry dashboard. Webhook endpoint at `/api/alerts` for external monitoring integration. (Small)

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All remaining Phase 2 tasks from TASKS.md are covered.*