# tasks/phase-2/P2-SEC.md — Enterprise Security, Compliance & Identity

This file covers MFA step-up enforcement for privileged operations, MFA enrollment wizard with QR and recovery codes, organization-wide "Require MFA" toggle, SCIM 2.0 server for automated user provisioning, enterprise SSO setup documentation, GDPR data export and deletion Inngest functions, compliance hold infrastructure with legal-hold flag, automated data retention engine, data residency controls with region routing, security whitepaper documentation, session timeout tiered policies, IP allowlist enforcement middleware, OAuth token rotation management, webhook management settings page, teams & groups management schema and UI, AI decision audit logs with human override indicators, GDPR third-party data deletion, and SAML SSO configuration UI. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P2‑SEC (2026‑05‑06)

### 1. MFA Step-Up for Privileged Operations — Time-Bound Re-Verification

The 2026 consensus for protecting sensitive operations uses **step-up authentication** — requiring a fresh MFA verification before executing privileged actions, even when the user already has an active session:

- **Vero-Ventures/fuzzycat #113 (2026‑02‑22)**: "Strict Enforcement: Update the `enforceMfa` logic to check if privileged users (clinic, admin) have any verified MFA factors. Forced Onboarding: If no factors exist, redirect them to `/mfa/setup` and block access to their portal until enrollment is complete. API Layer Security: Ensure tRPC procedures for these roles also check for the existence of an MFA factor." 

- **nupurmadaan04/SOUL_SENSE_EXAM #1245 (2026‑03‑02)**: "Require MFA re-authentication for privileged actions. Add step-up auth endpoint. Enforce time-bound re-verification. Middleware for privileged routes." 

- **Islamawad132/Authme #278 (2026‑03‑24)**: "Step-up supports MFA (TOTP) and WebAuthn. Step-up result cached for configurable duration (default 15 min). SDK includes step-up authentication helper." 

- **SecretsVault.xyz (2026‑03‑25)**: "Re-authentication or step-up for sensitive actions. Device binding and posture where possible." 

- **softwarepatternslexicon.com (2026‑03‑22)**: "Step-up authentication is often the cleanest response when the session reaches a privileged function, the user tries to export sensitive data, or current risk is elevated." 

**For UBOS**: The MFA step-up middleware (P0‑TRPC‑4 built a foundation) is extended with a configurable window (`MFA_REAUTH_WINDOW_SECONDS`, default 900 = 15 minutes). Privileged procedures (payment runs, org settings, API key creation) are tagged with `.meta({ requireMfa: true })`. The middleware checks `session.twoFactorVerified` timestamp. If older than the window, throws `MFA_REQUIRED` error → client prompts for MFA. After successful verification, the timestamp is refreshed and the original operation proceeds. Better Auth's `twoFactor` plugin handles the TOTP verification; the middleware only checks freshness.

### 2. SCIM 2.0 — Better Auth Plugin Architecture

Better Auth provides a dedicated `@better-auth/scim` plugin implementing SCIM 2.0 (RFC 7643 and RFC 7644):

- **DeepWiki SCIM Plugin (2026‑03‑15)**: "The SCIM plugin provides RESTful API endpoints that allow external identity providers to manage user accounts and group memberships in your Better Auth application programmatically. Key Features: User Provisioning (auto-create when assigned), User Deprovisioning (auto-deactivate/delete when removed), User Updates (sync name, email), Group Management, SCIM 2.0 Compliant." 

- **Installation**: Separate package `@better-auth/scim`. Configuration: `basePath: '/scim/v2'`, `authentication.bearerToken`, `userMapping`, `groupMapping`. 

- **SSOJet Best Practices (2026‑05‑04)**: "SCIM 2.0 (RFC 7643 and RFC 7644) is one of those specs that looks simple until a customer's Okta tenant starts sending you 1,200 provisioning events at 2am during a directory migration." 

- **Endpoint architecture**: `/scim/v2/Users` (GET list, POST create, GET/:id, PUT/PATCH/:id update, DELETE/:id deactivate). `/scim/v2/Groups` (GET list, POST create, GET/:id, PATCH/:id update, DELETE/:id). Bearer token authentication. 

**For UBOS**: Install `@better-auth/scim`, add to plugins array with `basePath: '/scim/v2'`. Configure bearer token per organization (stored in org settings). SCIM endpoints auto‑mounted by Better Auth. Document setup guide for Okta and Azure AD integration.

### 3. SOC 2 Type II — The 2026 Baseline for Enterprise SaaS

SOC 2 Type II is now the **de-facto requirement** for any SaaS targeting US enterprise customers:

- **SSOJet (2026‑03‑18)**: "SOC 2 Type II is now the baseline for enterprise SaaS trust. Type II audits verify control effectiveness over 3–12 months. 2026 standards require integrating AI governance into security architecture." 

- **Dev.to Checklist (2026‑04‑03)**: "The five Trust Service Criteria: Security (required), Availability, Processing Integrity, Confidentiality, Privacy. Most SaaS teams pursue Security + Availability as the minimum scope. Logging is one of the most scrutinized areas: every authentication event, successful/failed logins, password resets, MFA challenges." 

- **DSalta Pen Testing (2026‑03‑09)**: "For a SOC 2 Type II audit, most auditors expect at least one full penetration test per year, with additional tests triggered by major product releases or infrastructure changes. At minimum, cover your externally facing attack surface: web application endpoints, OAuth flows, SSO integrations, and API key management." 

- **AI Controls (2026‑01‑14)**: 10 AI-powered controls for SOC 2 Type II including automated evidence collection and continuous monitoring. 

**For UBOS**: SOC 2 Type II is a documentation + process goal. Phase 2 tasks build the technical controls (audit logging, MFA enforcement, session management, data retention). The formal audit engagement is an external activity, but the security whitepaper (P2‑SEC‑2‑6) serves as the system description artifact auditors require.

### 4. GDPR Data Export & Deletion — Inngest Workflows

The 2026 pattern for GDPR compliance uses durable background jobs for data portability and erasure:

- **alexinslc/hickory #163 (2026‑01‑11)**: "Implement GDPR compliance: Data Export (generate ZIP with profile, conversations, messages, files, consent records), Account Deletion (soft delete with 30-day grace period, cascade deletion rules, retain data for legal requirements)." 

- **tax-pilot-lu/taxpilot #67 (2026‑02‑28)**: "GDPR Article 17 (Right to Erasure) and Luxembourg tax law create conflicting obligations. Retain what the law requires, delete everything else." 

- **juljanblischke/exo-chat #25 (2026‑02‑07)**: Export as machine‑readable JSON, secure download with expiration, audit trail of all export/delete requests. 

**For UBOS**: `gdpr-export` Inngest function compiles all user data across tenant tables into a JSON dump, stores it temporarily in R2 with a presigned download URL (expires 7 days), and emails the user. `gdpr-delete` Inngest function performs cascade deletion with compliance hold check (blocks if legal hold active). 30‑day soft‑delete grace period before permanent deletion.

### 5. Compliance Hold — Legal Hold Flag Pattern

- **alexinslc/hickory #163**: "Legal hold capability — retain necessary data for legal requirements." 

- **Full‑Session Guide (2026‑02‑20)**: DistinctCodes/AssetsUp patterns for compliance flags.

**For UBOS**: `compliance_holds` table with `org_id`, `entity_type`, `entity_id`, `hold_reason`, `placed_by`, `placed_at`, `expires_at`. Middleware `compliance-hold.ts` checks if entity is under hold before allowing deletion. Hold flag blocks both soft‑delete and hard‑delete. Admin-only placement/release.

### 6. Data Retention — pg_cron or Inngest Scheduled Jobs

- **troykelly/openclaw-projects #1469 (2026‑02‑17)**: "pgcron job for anomaly archival: resolve old unresolved anomalies (90 days), hard delete very old (180 days)." 

- **LFGBanditLabs/Quipay #246 (2026‑03‑06)**: "Implement a scheduled chron job to move data older than X months to object storage (S3) or a cold-storage analytical DB. Automatically anonymize PII in archived logs." 

- **Splunk Retention Strategy (2026‑04‑17)**: Tiered approaches keep long retention affordable while maintaining quick access to recent backups. 

**For UBOS**: Inngest cron function (`TZ=UTC 0 2 * * *` — nightly at 2am UTC). Scans configurable retention rules per entity type (e.g., activity_feed: 90 days, audit_logs: 7 years, deleted documents: 30 days). Anonymizes PII before archival. Moves old data to R2 cold storage as JSON dumps. Logs retention actions to audit log.

### 7. Data Residency — Region-Aware Database Routing

- **AtlasDevHQ/atlas #976 (2026‑03‑27)**: "Workspace admins can select their data region (US, EU, APAC). Region routing: workspace org_id → region mapping → select correct Postgres instance." 

- **Healthy-Stellar #156 (2026‑02‑23)**: "Database connection routing directs tenant queries to the correct regional PostgreSQL cluster. `DataResidencyGuard` blocks requests where the client IP region mismatches tenant region." 

- **Cloudflare Custom Regions (2026‑03‑28)**: Fine‑grained data residency control — customers precisely define where data is processed, routing traffic to in‑region destinations. 

**For UBOS Phase 2**: Provision EU Neon project. Add `region` field to organizations table (`'us' | 'eu'`). Region routing middleware reads org's region and routes DB queries to the correct database instance. Data residency settings page in organization settings shows current region and (for enterprise) allows migration. Region migration is a gated enterprise feature requiring data export/import.

### 8. IP Allowlist — Tenant-Level Enforcement with Dual Modes

- **dnviti/arsenale #145 (2026‑03‑12)**: "Allow tenant admins to define trusted IP addresses and CIDR ranges. Block mode: reject with 403 + audit log. Flag mode: allow login but add 'UNTRUSTED_IP' to audit entry. Chip‑based CIDR input with validation. 'Test IP' button." 

- **mecra/server-core JSR (2026‑04‑12)**: "Create an IP allowlist/blocklist enforcement middleware. Global blocklist applied before workspace‑specific rules." 

- **MuleSoft Blog (2026‑01‑21)**: "Define the IP CIDR blocks allowed to sign in. Turn on Enforcement to activate rules for all users." 

**For UBOS**: `ipAllowlistEntries` column on `organizationSettingsTable` (text array of CIDR strings). Middleware `ip-allowlist.ts` runs in auth flow (before session validation). Two modes: `flag` (allow but log) and `block` (reject with 403). Admin toggle in Settings → Security → IP Allowlist. Test IP button validates CIDR entries. Audit log on allowlist modification and blocked attempts.

### 9. Session Timeout Policies — Tiered by Role

- **PingIdentity (2026‑04‑17)**: "Session timeout settings (maximum session time and maximum idle time) can be set in different locations to provide greater control. Default maximum session timeout is 120 minutes, maximum idle time 30 minutes." 

- **aicers/aice-web-next #59 (2026‑03‑02)**: "Re-auth flow: flag session `needs_reauth` → return 401 with re-authentication prompt → user re-enters password → update ip_address and user_agent → session continues." 

- **Qlik REST API (2026‑04‑23)**: "Tenant administrators can programmatically retrieve and update authentication settings controlling user session behavior: session inactivity timeout." 

**For UBOS**: Configure Better Auth session tiers: standard users (7 days, 1h idle), admin users (4 hours, 30min idle), billing operations (re‑auth required). The `admin-session` middleware (P0‑AUTH‑5) already implements freshness checks. Extend with idle timeout tracking via `last_active_at` on session, checked by middleware.

### 10. OAuth Token Rotation — Automatic Refresh with Revocation

- **Salesforce Mandatory Update (2026‑03‑18)**: "Ensure PKCE and Refresh Token Rotation are enabled on any Partner‑owned CAs/ECAs in use by more than 2+ customer production orgs by May 11, 2026." 

- **Gainsight CS (2026‑01‑09)**: "Refresh Token Rotation (RTR): each refresh token is single‑use — every time an access request is made, a new refresh token is issued and the old one is immediately invalidated." 

- **Google OAuth Best Practices (2026‑04‑15)**: "Revoke tokens as soon as they are no longer needed and delete them permanently. Handle refresh token revocation and expiration." 

**For UBOS**: Connected apps management page in Settings → Integrations → Connected Apps. Lists all OAuth connections per user (Google, GitHub, etc.) with last used date. "Revoke Access" button calls provider's token revocation endpoint and removes stored tokens. Better Auth's OAuth plugin handles token refresh automatically; the management page provides visibility and manual revocation.

### 11. Webhook Management — Outbound Dispatch via Inngest

- **Inngest Webhooks (2026)**: "Create an HTTP handler for a webhook endpoint that verifies the webhook payload signature and pushes webhook events to a particular queue. You can set up a webhook with Inngest by creating a webhook 'source' in the Inngest dashboard." 

**For UBOS**: `webhooks` table stores endpoint configuration (`url`, `secret`, `events[]`, `is_active`). Webhook dispatch Inngest function listens to all domain events, filters by org's subscribed webhooks, signs payload with HMAC‑SHA256, POSTs to endpoint URL, retries on failure (exponential backoff, max 5 retries). Webhook management UI in Settings → API & Webhooks.

---

## Task Definitions

### [ ] P2-SEC-1-1: Enforce MFA step‑up for privileged operations (payment runs, org settings, API key creation)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🔴 Critical

**Description:** Extend P0‑TRPC‑4 MFA middleware with configurable re‑auth window. Tag privileged procedures with `.meta({ requireMfa: true })`. Default window: 15 minutes (900 seconds). On `MFA_REQUIRED` error, client shows MFA verification modal. After successful verification, Better Auth refreshes `session.twoFactorVerified` timestamp, and the original operation is retried. Privileged operations: finance payment runs, org settings changes, API key creation/deletion, user role changes, data export/delete.

**Depends on:** P0‑AUTH‑6 (MFA implemented), P0‑TRPC‑4 (MFA middleware base)

**Related Files:** `apps/web/src/server/trpc/middleware/mfa.ts` (extend)

**Definition of Done:** MFA step‑up enforced on tagged procedures. 15‑min re‑auth window. Client MFA modal on `MFA_REQUIRED`. Audit log entry when step‑up is triggered. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-1-2: Build MFA setup wizard in user settings (QR code enrollment, recovery code display)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build the MFA enrollment wizard at `routes/_dashboard/settings/security/mfa.tsx`. Step 1: "Enable MFA" button → calls `authClient.twoFactor.enable()`. Step 2: QR code display (using `react-qr-code`) with manual secret copy option. Step 3: TOTP verification input to confirm enrollment. Step 4: Backup codes display with download capability and "I have saved these codes" confirmation. Features: Disable MFA button, Regenerate Backup Codes, list of recovery codes (masked, reveal on click). Built on P0‑AUTH‑6 backend.

**Depends on:** P0‑AUTH‑6 (TOTP backend), P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/security/mfa.tsx` (replace placeholder)

**Definition of Done:** Full enrollment wizard with QR, manual secret, verification, backup codes display/download, disable MFA, regenerate codes. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-1-3: Add organization‑wide "Require MFA" toggle with enforcement

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Add `require_mfa` boolean to organization settings. When enabled, all org members must have MFA enrolled. Enforcement: Middleware checks if org requires MFA and user hasn't enrolled → redirect to `/settings/security/mfa` with blocking message. tRPC procedures for privileged roles also check org requirement. Admin override for emergency access (audit‑logged). Toggle in Settings → Security → MFA Policy. Exemptions: API keys (not user sessions), service accounts.

**Depends on:** P2‑SEC‑1‑2, P1‑SETTINGS‑2

**Related Files:** `apps/web/src/routes/_dashboard/settings/security/index.tsx`, `apps/web/src/server/trpc/middleware/mfa-required.ts` (new)

**Definition of Done:** Org‑wide MFA toggle functional. Unenrolled users blocked with redirect. Admin emergency override logged. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-1-4: Integrate SCIM 2.0 server for automated user provisioning (Okta, Azure AD)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Install `@better-auth/scim` package. Add `scim()` to plugins array in `packages/auth/src/index.ts` with `basePath: '/scim/v2'`, bearer token authentication. Run migration for `scim_user` and `scim_group` tables. Generate per‑org SCIM bearer tokens (stored in org settings). SCIM endpoints auto‑mounted at `/api/auth/scim/v2/Users` and `/api/auth/scim/v2/Groups`. Document Okta and Azure AD setup in enterprise SSO guide: how to configure the SCIM connector in Okta/Azure to point to UBOS's SCIM endpoint, bearer token configuration, attribute mapping, and group push.

**Depends on:** P0‑AUTH‑7 (SSO plugin configured), P0‑AUTH‑1

**Related Files:** `packages/auth/src/index.ts`, `packages/auth/package.json`, `docs/enterprise/sso-setup.md` (extend)

**Definition of Done:** SCIM 2.0 endpoints functional. User provisioning/deprovisioning from Okta tested. Enterprise setup guide updated with SCIM instructions. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-1-5: Document enterprise SSO setup guide (SAML 2.0, OIDC)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Extend `docs/enterprise/sso-setup.md` (created in P0‑AUTH‑7) with step‑by‑step instructions for major identity providers: **Okta** (SAML 2.0: entity ID, ACS URL, certificate upload, attribute mapping; OIDC: client ID/secret, redirect URI), **Azure AD / Microsoft Entra ID** (SAML: basic SAML configuration, user attributes & claims, group claims; OIDC: app registration, client secret, API permissions), **Google Workspace** (OIDC: OAuth consent screen, credentials), **OneLogin** (SAML: connector configuration). Include screenshots, troubleshooting (clock skew, certificate expiry, metadata mismatch), attribute mapping table, just‑in‑time provisioning vs SCIM.

**Depends on:** P0‑AUTH‑7

**Related Files:** `docs/enterprise/sso-setup.md` (extend)

**Definition of Done:** Complete setup guide for four major IdPs. Screenshots included. Troubleshooting section. Attribute mapping table. `pnpm run typecheck` passes (docs only).

---

### [ ] P2-SEC-2-1 & P2-SEC-2-2: GDPR data export and deletion Inngest functions

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** `gdpr-export` Inngest function: triggered by admin action or self‑service request. Compiles all user data across all tenant tables (CRM contacts/leads/deals/activities, profile, notifications, documents metadata). Generates JSON dump. Stores in R2 with presigned download URL (expires 7 days). Emails user the download link. Logs to audit log. Takes ~5 minutes for a typical user. `gdpr-delete` Inngest function: 30‑day soft‑delete grace period. Checks compliance holds before deletion. Cascade‑deletes all user data across tenant tables. Anonymizes data in audit logs (PII redacted, UUIDs remain for referential integrity). Logs to audit log. Admin UI at Settings → Privacy for managing requests.

**Depends on:** P0‑INNGEST‑2, P0‑STORAGE‑2, P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/server/inngest/functions/compliance/gdpr-export.ts` (new), `apps/web/src/server/inngest/functions/compliance/gdpr-delete.ts` (new)

**Definition of Done:** GDPR export generates complete JSON dump. GDPR delete performs cascade deletion with grace period. Compliance hold check blocks deletion. Audit logged. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-2-3: Implement compliance hold infrastructure (legal hold on documents/invoices preventing deletion)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Create `compliance_holds` table with `org_id`, `entity_type`, `entity_id`, `hold_reason`, `placed_by`, `placed_at`, `expires_at`. Unique constraint on `(entity_type, entity_id)`. Middleware `compliance-hold.ts` checks for active holds before allowing delete operations. If hold active, returns 409 Conflict with hold reason and "Contact your administrator to release this hold." Admin UI for placing/releasing holds: entity search, hold reason, optional expiry. Holds visible in entity detail page as a banner. Audit log entry on hold placement, release, and blocked deletion attempt.

**Depends on:** P0‑DB‑5, P1‑CRM‑SCHEMA‑2, P1‑DOCS‑SCHEMA‑2

**Related Files:** `packages/db/src/schema/compliance-holds.ts` (new), `apps/web/src/server/trpc/middleware/compliance-hold.ts` (new)

**Definition of Done:** Holds block deletion. Admin UI for hold management. Hold banner on entity detail. Audit logged. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-2-4: Build automated data retention engine (archive/delete per policy)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Inngest cron function (`TZ=UTC 0 2 * * *` — nightly). Configurable retention rules stored in database: `retention_policies` table with `entity_type`, `retention_days`, `action` ('archive' | 'delete' | 'anonymize'). Rules: activity_feed 90 days → delete, audit_logs 7 years → archive to R2, deleted_documents 30 days → hard delete from R2, notifications 180 days → delete. Before archiving: anonymize PII (replace names with `[REDACTED]`, keep UUIDs). Archived data stored as JSONL in R2. Retention action logged to audit log. Admin UI at Settings → Privacy → Data Retention for viewing and configuring policies.

**Depends on:** P0‑INNGEST‑2, P0‑STORAGE‑2, P2‑SEC‑2‑3

**Related Files:** `apps/web/src/server/inngest/functions/compliance/retention.ts` (new), `packages/db/src/schema/retention-policies.ts` (new)

**Definition of Done:** Nightly retention job functional. Configurable policies per entity type. PII anonymization before archive. Admin UI for policy management. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-2-5: Implement data residency controls (EU region Neon project, region routing)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Provision EU Neon project. Add `region` field to organizations table (`'us' | 'eu'`, default `'us'`). Create region routing middleware `region.ts` that reads org's region and selects the correct database connection pool (us‑db‑pool or eu‑db‑pool). Organization settings page shows current region. For enterprise plan: "Change Region" button with migration warning and confirmation. Region change triggers data migration Inngest function (export from old region, import to new region, verify, switch). Data residency enforcement: all queries, R2 storage, and log shipping respect region. Self‑serve region selection available to all paid plans (migration gated to enterprise).

**Depends on:** P0‑DB‑1 (dual Drizzle instances), P1‑SETTINGS‑2

**Related Files:** `apps/web/src/server/trpc/middleware/region.ts` (new), `apps/web/src/routes/_dashboard/settings/organization.tsx` (add region section)

**Definition of Done:** EU Neon project provisioned. Region routing functional. Organization region displayed in settings. Enterprise migration flow documented. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-2-6: Build security whitepaper and architecture documentation for enterprise prospects

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Write `docs/enterprise/security-whitepaper.md` covering: Architecture overview (system diagram, component list, data flow diagram), Authentication & Identity (Better Auth, MFA, SSO/SAML/OIDC, SCIM provisioning, session management, OAuth token rotation, passkeys), Data Protection (encryption at rest — Neon AES‑256, encryption in transit — TLS 1.3, RLS multi‑tenant isolation, database encryption details), Network Security (Cloudflare WAF/DDoS, IP allowlisting, CSP/CORS/HSTS headers, API rate limiting), Compliance (SOC 2 Type II readiness, GDPR compliance, data residency options, data retention policies, penetration testing schedule), Vulnerability Management (dependency scanning via pnpm audit, Dependabot, SAST/dependency review in CI, annual penetration testing, responsible disclosure policy), Incident Response (incident classification, response timeline, communication plan, post‑mortem process), Business Continuity (Neon PITR backups, R2 data durability, disaster recovery runbook, RTO/RPO targets). Include architecture diagrams (ASCII art or Mermaid).

**Depends on:** P2‑SEC‑2‑5 (data residency), P0‑SEC‑6 (supply chain hardening)

**Related Files:** `docs/enterprise/security-whitepaper.md` (new)

**Definition of Done:** Complete security whitepaper with all sections. Architecture diagrams included. Ready to share with enterprise prospects during security review. `pnpm run typecheck` passes (docs only).

---

### [ ] P2-SEC-3-1: Implement session timeout policies (standard 24h, admin 4h, billing re‑auth)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Configure Better Auth with tiered session durations: standard users — 24 hours max session, 1 hour idle timeout; admin users — 4 hours max session, 30 minutes idle; billing operations — re‑auth required (fresh session within 5 minutes). Add `last_active_at` timestamp to sessions table. Idle timeout middleware: on each request, update `last_active_at`. If `NOW() - last_active_at > idle_timeout`, invalidate session and redirect to sign‑in. Admin session tier enforced via middleware checking user role. Session expiration warning banner 5 minutes before timeout. Billing re‑auth: `bills.approve` and `invoices.recordPayment` procedures check session freshness (≤5 minutes), throw `REAUTH_REQUIRED` if stale.

**Depends on:** P0‑AUTH‑1, P0‑AUTH‑5

**Related Files:** `packages/auth/src/index.ts`, `apps/web/src/server/trpc/middleware/session-tier.ts` (new)

**Definition of Done:** Tiered session timeouts enforced. Idle timeout with last_active_at tracking. Admin 4h limit. Billing re‑auth required. Expiration warning banner. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-3-2: Add IP allowlist enforcement per organization

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Add `ipAllowlistEnabled`, `ipAllowlistMode` ('flag'|'block'), `ipAllowlistEntries` (text[] CIDR) to organization settings. Middleware `ip-allowlist.ts` runs after auth (has session context): extracts client IP from `CF-Connecting-IP` header, checks against org's CIDR list using `isIpInCidr()`. Block mode: reject with 403 + audit log `LOGIN_FAILURE { reason: 'ip_not_allowed' }`. Flag mode: allow but add `UNTRUSTED_IP` to audit entry. Settings UI at Settings → Security → IP Allowlist: toggle, mode selector, chip‑based CIDR input with validation, "Test IP" button. Audit log entry `TENANT_UPDATE` on allowlist modification. Uses Node.js `net` module for CIDR checking (available via `nodejs_compat`).

**Depends on:** P1‑SETTINGS‑2, P0‑AUTH‑CF‑1 (CF-Connecting-IP)

**Related Files:** `apps/web/src/server/trpc/middleware/ip-allowlist.ts` (new), `apps/web/src/routes/_dashboard/settings/security/ip-allowlist.tsx` (new)

**Definition of Done:** IP allowlist enforced in auth flow. Block and flag modes functional. CIDR validation. Audit logged. Settings UI with test IP. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-3-3: Implement OAuth token rotation and revocation management

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build Connected Apps management page at Settings → Integrations → Connected Apps. Lists all OAuth connections per user: provider (Google, GitHub), connected date, last used, status. Each connection has "Revoke Access" button calling provider's token revocation endpoint + clearing stored tokens from Better Auth. Better Auth's built‑in OAuth refresh token rotation is enabled by default — document that refresh tokens are single‑use with automatic rotation. Token status monitoring: flag tokens nearing expiry (within 7 days), show warning in UI. For organization‑wide token management: admin can view all connected apps across org members (GDPR/offboarding use case).

**Depends on:** P1‑AUTH‑1 (OAuth integration), P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/integrations/tokens.tsx` (new), `apps/web/src/server/trpc/routers/settings/connected-apps.ts` (new)

**Definition of Done:** Connected apps list with revoke. Refresh token rotation documented. Expiry warnings. Admin org‑wide view. `pnpm run typecheck` passes.

---

### [ ] P2-SETTINGS-SEC-5: Build Webhook Management settings page

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Webhook management at Settings → API & Webhooks. List of configured webhooks with: URL, subscribed events, status (active/inactive/error), last delivery timestamp, failure count. Create/Edit webhook form: URL (validated HTTPS), event type selector (multi‑select from all domain events), secret (auto‑generated or custom), active toggle. Test webhook: sends sample payload to verify connectivity. Delivery log: recent deliveries with status code, response time, retry count, payload preview. Redeliver button for failed deliveries. Webhook signing: HMAC‑SHA256 signature header (`X-UBOS-Signature`) sent with each delivery for client verification. Webhook schema stored in `webhooks` table.

**Depends on:** P0‑SEC‑3 (API key management), P0‑INNGEST‑3 (event registry), P1‑SETTINGS‑ARCH‑1

**Related Files:** `packages/db/src/schema/webhooks.ts` (new), `apps/web/src/server/trpc/routers/webhooks.ts` (new), `apps/web/src/server/inngest/functions/webhooks/dispatch.ts` (new), `apps/web/src/routes/_dashboard/settings/api-webhooks.tsx` (replace placeholder)

**Definition of Done:** Webhook CRUD with test and delivery log. HMAC‑SHA256 signing. Inngest dispatch function with retry. Settings UI functional. `pnpm run typecheck` passes.

---

### [ ] P2-SETTINGS-TEAMS: Build Teams & Groups management (schema + tRPC + UI)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Teams extend the organization model with sub‑groups. Schema: `teams` table with `org_id`, `name`, `description`, `created_by`. `team_members` junction table with `team_id`, `user_id`, `role` ('lead', 'member'). RLS enforced. tRPC: `teams.list`, `teams.create`, `teams.update`, `teams.delete`, `teams.members.add`, `teams.members.remove`, `teams.members.updateRole`. UI at Settings → Teams: team list, create/edit modal, member management (add/remove users, assign lead). Teams integrated into RBAC: resources can be assigned to teams, team membership used in notification dispatch. Team selector in project/task assignment UI.

**Depends on:** P0‑DB‑3 (RLS), P0‑TRPC‑3 (RBAC), P1‑SETTINGS‑ARCH‑1

**Related Files:** `packages/db/src/schema/teams.ts` (new), `apps/web/src/server/trpc/routers/teams.ts` (new), `apps/web/src/routes/_dashboard/settings/teams.tsx` (new)

**Definition of Done:** Team CRUD functional. Member management with roles. Team RBAC integration. UI with team list and member management. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-8: GDPR data deletion across third‑party systems — procedures to delete from Stripe, Resend, and DocuSign

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Extend GDPR deletion workflow (P2‑SEC‑2‑2) to cascade deletion to third‑party services: **Stripe**: delete customer record (anonymizes billing data) or delete specific payment methods. **Resend**: delete contact from audience, delete sent email logs. DocuSign/e‑sign providers: delete envelope history and recipient data. Each third‑party deletion is a separate `step.run()` in the Inngest function — one failure doesn't block others. Third‑party deletion results logged to audit log. Admin override to skip third‑party deletion (e.g., if subscription is still active). Audit trail per service showing what was deleted and when.

**Depends on:** P2‑SEC‑2‑2, P0‑BILLING‑1 (Stripe client), P0‑EMAIL‑1 (Resend), P3‑ADV‑DOCS‑1 (e‑signature integration — future)

**Related Files:** `apps/web/src/server/inngest/functions/compliance/third-party-deletion.ts` (new)

**Definition of Done:** Stripe and Resend deletion functional. Third‑party deletion results logged. Admin skip override. `pnpm run typecheck` passes.

---

### [ ] P2-SEC-9: Implement AI decision audit log with human override indicator

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Extend audit log schema with AI‑specific fields: `ai_model` (text — model name/version), `ai_confidence` (numeric — 0‑1), `ai_reasoning` (text — reasoning trace), `human_override` (boolean), `overridden_by` (UUID), `override_reason` (text). When AI features (Phase 3‑4) make or suggest decisions, each decision is logged with the full reasoning chain, confidence score, and model identifier. Human override: when a user rejects or modifies an AI suggestion, the original AI decision and the human action are both logged. This satisfies EU AI Act requirements for high‑risk AI systems (enforceable August 2026): "every autonomous decision is logged with a reasoning trace, an industry‑standard audit trail that records the step‑by‑step logic an AI followed to reach a specific conclusion." 

**Depends on:** P0‑TRPC‑6 (audit log middleware)

**Related Files:** `packages/db/src/schema/audit.ts` (extend), `apps/web/src/server/trpc/middleware/audit.ts` (extend)

**Definition of Done:** AI audit fields added to audit log. Reasoning trace stored. Human override recorded. EU AI Act compliance ready. `pnpm run typecheck` passes.

---

### [ ] P2-SETTINGS-SEC-4: Build Permissions Matrix settings page

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build the permissions matrix admin UI at Settings → Security → Permissions. Displays a grid: roles (admin, member, viewer) as columns, permission groups as rows (CRM read/write, Projects read/write, Documents read/write, Finance read, Settings, Admin). Each cell is a checkbox toggle. Changes auto‑save (debounced 300ms). Audit log entry on permission changes. Admin‑only access. Backend: role‑permission map stored in database, extending P0‑TRPC‑3 hardcoded map.

**Depends on:** P0‑TRPC‑3 (RBAC), P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/security/permissions.tsx` (replace placeholder), `apps/web/src/server/trpc/routers/settings/permissions.ts` (new)

**Definition of Done:** Permission matrix grid functional. Checkbox toggles auto‑save. Audit logged. Admin‑only. `pnpm run typecheck` passes.

---

### [ ] P2-AUTH-SESSION-MGMT: Build Active Sessions management page

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build the active sessions management page at Settings → Security → Sessions. Lists all active sessions for the current user: device/browser, IP address, location (derived from IP), last active timestamp, current session indicator. "Revoke" button on each session (except current) → calls Better Auth's `revokeSession()`. "Revoke all other sessions" bulk action with confirmation. Session details: created at, expires at, user agent parsed (browser + OS). Admin view: org admins can view and revoke sessions for all org members.

**Depends on:** P0‑AUTH‑5 (session security), P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/security/sessions.tsx` (replace placeholder)

**Definition of Done:** Active sessions list with device/IP/location. Individual and bulk revoke. Admin org‑wide view. `pnpm run typecheck` passes.

---

### [ ] P4-PLAT-ENT-5: Add SAML SSO configuration UI for enterprise IdPs (Okta, Azure AD)

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build SSO configuration UI at Settings → Security → SSO. SAML 2.0 configuration form: entity ID (read‑only, copyable), ACS URL (read‑only, copyable), certificate upload, IdP metadata URL or manual entry, attribute mapping (email, name, groups). OIDC configuration form: client ID, client secret, discovery URL, redirect URI (read‑only). Connection test button: initiates test SSO flow in popup window. SSO status indicator: configured, active, error. Enable/disable toggle per provider. Organization‑wide SSO enforcement toggle (when enabled, all org members must use SSO). Multiple IdP support (can configure both SAML and OIDC simultaneously).

**Depends on:** P0‑AUTH‑7 (SSO plugin), P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/security/sso.tsx` (replace placeholder)

**Definition of Done:** SAML and OIDC configuration forms. Connection test. Org‑wide SSO enforcement toggle. Multiple IdP support. `pnpm run typecheck` passes.

---

### [ ] P2-SETTINGS-PRIVACY: Build Data & Privacy settings page

**Status:** ⏳ Not Started | **Actor:** AGENT | **Priority:** 🟡 Medium

**Description:** Build data privacy self‑service page at Settings → Privacy. Sections: **My Data**: "Export My Data" button (triggers GDPR export Inngest function, emails download link), "Delete My Account" button (with confirmation, triggers soft‑delete with 30‑day grace period). **Data Retention**: view current retention policies (read‑only for non‑admin). **Consent Management**: marketing email consent toggle, third‑party data sharing consent toggle, cookie preferences. **Privacy Requests**: track status of submitted GDPR requests (export, deletion) with timestamps and status. Admin view adds org‑wide data management.

**Depends on:** P2‑SEC‑2‑1, P2‑SEC‑2‑2, P2‑SEC‑2‑4, P1‑SETTINGS‑ARCH‑1

**Related Files:** `apps/web/src/routes/_dashboard/settings/privacy.tsx` (new)

**Definition of Done:** Self‑service data export and deletion. Consent toggles. Request status tracking. Admin org‑wide view. `pnpm run typecheck` passes.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P2‑SEC group are covered.*