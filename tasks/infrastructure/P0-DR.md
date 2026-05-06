# tasks/infrastructure/P0-DR.md – Disaster Recovery & Operations

This file covers the Backup & Disaster Recovery runbook for Neon PITR restore procedures and R2 backup instructions, plus a secrets rotation strategy documenting rotation steps for DATABASE_URL, Stripe keys, and Resend API key with CI/CD variable integration. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑DR (2026‑05‑06)

### 1. Neon PITR — The Instant Restore Advantage

Neon's instant PITR is the cornerstone of UBOS's database disaster recovery strategy. Key operational characteristics:

- **Restore creates a new branch at a specific LSN or timestamp without duplicating data**, achieving near‑zero restore times. The production branch **remains online and untouched** during the restore operation — there is no downtime for the production database. Backup branches are automatically created to preserve the pre‑restore state for rollback. 
- **Overwrite, not a merge**: "Whenever you restore a branch, you are performing a complete overwrite, not a merge or refresh. Everything on your current branch, data and schema, is replaced with the contents from the historical source." This is critical for operational understanding — you cannot selectively restore one table while leaving others intact. 
- **Root branches only**: Instant restore is only supported for root branches (like `production` or `main`). Child branches do not support instant restore. When you restore a root branch, both the restored branch and the backup branch become separate root branches with no parent‑child relationship. 
- **LSN‑level granularity**: You can restore to any point within the configured restore window, down to the millisecond. Time Travel Assist enables read‑only queries to pinpoint the exact moment before data loss. 
- **The "dropped table" recovery pattern** (from the daily.dev guide): "create a new branch at the moment before the incident, allowing production to remain online with minimal downtime. Users can either copy the missing table from the recovered branch." For partial data loss (wrong UPDATE or DROP TABLE), the recommended approach is PITR branch → `pg_dump` of the affected table → restore to production via `pg_restore`. 
- **For complete corruption**: Use Neon's Branch Restore to overwrite the production branch. Neon automatically creates a backup branch before restore, enabling rollback of the restore itself. 

### 2. R2 Backup Strategy

Cloudflare R2 provides multiple layers of data protection:

- **Object lifecycle rules**: Automate object management — transition to Infrequent Access storage (lower cost for less‑frequently‑accessed data) or expire/delete objects after a configurable retention period. Objects are typically removed within 24 hours of the `x-amz-expiration` value. 
- **Bucket locks**: R2 bucket locks enable Write Once Read Many (WORM) compliance — lock objects for a specific duration (e.g., 90 days for audit retention), retain until a certain date, or lock indefinitely. If multiple rules apply, the strictest (longest) retention requirement takes precedence. 
- **Versioning + lifecycle rules**: Together, these "可实现"防误删+自动降本"的双重目标" (achieve the dual goal of preventing accidental deletion and automatic cost reduction). Versioning protects against accidental overwrites; lifecycle rules handle automated cleanup. 
- **Workflows for automated backups**: Cloudflare Workflows can automate D1 export → R2 storage for long‑term backup. The same pattern applies to any data that should be periodically backed up from Workers to R2. 

### 3. Cloudflare Workers Disaster Recovery

- **Secrets Store** (beta): Centralized, account‑level secret management. "Update a secret once, all Workers using it get the new value." This eliminates the operational burden of updating each Worker individually when rotating credentials. Secrets are securely encrypted and stored across all Cloudflare data centers. 
- **Wrangler environments**: Production and staging should be separate Workers (`ubos-production` and `ubos-staging`). Each environment has distinct bindings, vars, and secrets — not inherited from the root. 
- **Secrets validation at deploy**: The `secrets` configuration property in `wrangler.jsonc` can declare required secret names. Deployments fail with a clear error if required secrets are not configured, preventing partial deployments. 

### 4. Secrets Rotation — Industry Consensus

- **Stripe API key rotation**: Stripe supports key rotation via the Dashboard — "Rotating an API key revokes it and generates a replacement key that's ready to use immediately. You can also schedule an API key to rotate after a certain time." Keys should be rotated every 30‑90 days depending on sensitivity. Restricted API keys (RAKs) with scoped permissions reduce the blast radius of a compromised key. 
- **Resend API key rotation**: "Resend includes no built‑in expiration date or automatic rotation mechanism, but it is a good security practice to rotate keys regularly." Recommended: rotate every 90 days. The rotation procedure: create a new key with same permissions, update all services, verify the new key works, delete the old key. "Both keys will work simultaneously, so ensure your new key is working before deleting your old key so you do not experience downtime during the transition." 
- **Database credentials**: When rotating database credentials, update secrets via `wrangler secret put`. Use descriptive secret names (`DATABASE_URL_PROD` vs `DATABASE_URL_STAGING`). For local development, use `.dev.vars` or `.env` files (never committed). 
- **GitHub Actions**: GitHub does not auto‑rotate secrets natively. "Most teams use GitHub Actions or API scripts that push new secrets across repositories." The 2026 trend is toward OIDC‑based keyless authentication to eliminate long‑lived static secrets entirely. 

---

## Task Definitions

### [ ] P0-DR-1: Document Backup & Disaster Recovery runbook — Neon PITR restore procedure, R2 backup instructions

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No disaster recovery runbook exists. If the production database is corrupted or data is accidentally deleted, the team has no documented procedure for recovery. The PITR restore capability (P0‑MIG‑3 covers rollback after migrations) has not been documented as a general disaster recovery runbook. R2 backup strategy is not documented. The existing `docs/operations/disaster‑recovery.md` file is referenced but not yet created.
**Size:** Small

**Description:**
Create a comprehensive disaster recovery runbook at `docs/operations/disaster-recovery.md`. This is a critical operational document — it's the first thing an on‑call engineer will reach for when the database is down or data has been lost.

**The runbook must cover three scenarios:**

**(a) Data corruption or accidental deletion (partial data loss)**:
1. Identify the point in time just before the incident using Time Travel Assist (`SELECT * FROM ... BEFORE TIMESTAMP '...'`)
2. Create a PITR branch at that timestamp using the Neon Console or API: `neon branches create --parent production --timestamp "2026-05-06T14:30:00Z"`
3. The production branch remains online and untouched — zero downtime
4. Export the affected data from the PITR branch: `pg_dump --table=affected_table --data-only`
5. Restore to production: `pg_restore` or `INSERT INTO ... SELECT` from the PITR branch
6. Verify data integrity and delete the PITR branch

**(b) Major database corruption requiring full branch restore**:
1. Confirm the corruption is not recoverable by partial means
2. Identify the restore point using Time Travel Assist
3. Initiate Branch Restore from the Neon Console: select the production branch → Restore from History → select timestamp/LSN
4. Understand this is a complete overwrite — all data and schema since the restore point is lost
5. Neon automatically creates a backup branch (`backup-before-restore-{timestamp}`) — this preserves the pre‑restore state in case the restore itself needs to be rolled back
6. Connections are temporarily interrupted but automatically re‑establish
7. After restore: verify data integrity, run smoke tests, inform stakeholders

**(c) Complete Neon service outage**:
This scenario is unlikely (Neon is a managed service with high availability), but the runbook should document:
1. Check Neon status page (`status.neon.tech`)
2. If outage is expected to exceed acceptable RTO (Recovery Time Objective), execute the migration to a backup database provider (requires pre‑configured backup PostgreSQL instance — document the setup procedure)
3. Restore from latest R2 backup using `pg_restore`
4. Update `DATABASE_URL` secret via `wrangler secret put`
5. Deploy Worker with new database connection

**R2 backup instructions (within the runbook)**:
- R2 lifecycle rules: configure a rule to expire old backup objects after 90 days (standard retention). Use bucket locks for compliance‑required backups (prevent deletion within lock period). 
- R2 versioning: enable on the UBOS files bucket to protect against accidental overwrites or deletions. Combined with lifecycle rules, this provides both protection and cost management.
- Cross‑region replication: not natively supported by R2 (Cloudflare handles replication across their edge). Document that R2 data is automatically replicated across Cloudflare's global infrastructure — no additional configuration needed.
- Export procedure: Use the S3‑compatible API (`aws s3 sync` or `rclone`) to export R2 bucket contents to another cloud provider or local storage for air‑gapped backups. Document the commands with placeholders.

**Research Findings (2026‑05‑06):**
- Neon PITR creates a branch in seconds without duplicating data, leaving production online. 
- Restore is a complete overwrite, not a merge — applies to all databases on the branch. 
- Neon automatically creates a backup branch before restore for rollback safety. 
- R2 lifecycle rules: expire objects after configurable period, transition to Infrequent Access for cost optimization. 
- R2 bucket locks: WORM compliance for audit‑retained data. 

**Depends on:**
- `tasks/infrastructure/P0-MIG.md → P0-MIG-3` (rollback procedure — cross‑reference)
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING-1` (Stripe secrets documented)

**Blocks:** [N/A]

**Related Files:**
- `docs/operations/disaster-recovery.md` (new)

**Definition of Done**
- [ ] `docs/operations/disaster‑recovery.md` created covering all three scenarios
- [ ] PITR step‑by‑step instructions with exact Neon Console and CLI commands (using placeholders for project‑specific values)
- [ ] R2 backup strategy documented: lifecycle rules, versioning, bucket locks, export procedure
- [ ] Cross‑reference to `docs/operations/rollback.md` (P0‑MIG‑3) for schema‑only rollback scenarios
- [ ] Document includes: RTO (Recovery Time Objective) definition, RPO (Recovery Point Objective) definition, escalation path, and key contacts
- [ ] Each scenario has a checklist format for rapid execution under stress
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Actual execution of DR procedures (this is documentation)
- DR testing (separate operational activity)
- Multi‑region failover architecture (Phase 2+)
- Automatic backup scheduling (manual trigger documented; automation deferred)

**Rules to Follow**
- The runbook must be written for an on‑call engineer under stress — use checklists, not prose.
- Every command must be copy‑pasteable with clear placeholders for environment‑specific values.
- Document the restoration order: database first, then application redeployment if needed.
- Include verification steps after every restore scenario.
- Keep the runbook under 5 pages — reference Neon's documentation for details rather than duplicating it.

**Verification**
```bash
ls docs/operations/disaster-recovery.md
# Manual: review runbook for completeness
# Manual: verify that every command can be executed with the documented placeholders

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (documentation)

---

#### Subtasks

- [ ] P0-DR-1.0.25 (AGENT): Read Neon PITR documentation, R2 lifecycle rules documentation, and existing rollback docs from P0‑MIG‑3.
  **Verification:** All relevant features and commands documented.

- [ ] P0-DR-1.0.5 (AGENT): Research community disaster recovery runbook formats and checklists for serverless Postgres + object storage architectures.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DR-1.1 (AGENT): Write `docs/operations/disaster-recovery.md` with all three scenarios, R2 backup strategy, and checklist format.
  **File(s):** `docs/operations/disaster-recovery.md` (new)
  **Verification:** Document covers all required scenarios with executable commands.

- [ ] P0-DR-1.2 (HUMAN): Review runbook for accuracy, verify commands, approve.
  **Verification:** Approved.

---

### [ ] P0-DR-2: Secrets rotation strategy — document rotation steps for DATABASE_URL, Stripe keys, Resend API key; integrate into CI variables

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** No secrets rotation strategy exists. All secrets (DATABASE_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, INNGEST_SIGNING_KEY, BETTER_AUTH_SECRET, SENTRY_DSN, etc.) are set once and never rotated. There is no inventory of which secrets exist, where they're used, or how to rotate them without causing downtime. No key rotation policy or schedule is documented. This is both a security risk (long‑lived credentials) and an operational risk (no procedure for emergency rotation if a key is compromised).
**Size:** Small

**Description:**
Create a comprehensive secrets rotation strategy document at `docs/operations/secrets-rotation.md`. This document serves as both an inventory of all secrets and a step‑by‑step rotation procedure for each one. It also documents the CI/CD integration points for automated rotation.

**The document must include:**

**(a) Secrets inventory**: A table of all secrets used by the UBOS application:

| Secret Name | Service | Rotation Complexity | Rotation Frequency | Impact if Leaked |
|---|---|---|---|---|
| `DATABASE_URL` / `DATABASE_POOLED_URL` | Neon Postgres | Medium | 90 days | Complete data access |
| `STRIPE_SECRET_KEY` | Stripe | Low (Stripe supports rolling) | 90 days | Financial data, charges |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks | Low | 90 days | Webhook forgery |
| `RESEND_API_KEY` | Resend | Low | 90 days | Email sending, domain reputation |
| `INNGEST_SIGNING_KEY` | Inngest | Low | 90 days | Job execution, event data |
| `BETTER_AUTH_SECRET` | Better Auth | High (invalidates all sessions) | 180 days | Session hijacking, auth bypass |
| `SENTRY_DSN` | Sentry | Low | 180 days | Error data exposure |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Medium | 90 days | File storage access |
| `RESEND_WEBHOOK_SECRET` | Resend Webhooks | Low | 90 days | Webhook forgery |

**(b) Rotation procedure for each secret type**: Step‑by‑step instructions.

**Pattern for standard API keys (Stripe, Resend, Sentry, Inngest)**:
1. Generate a new key in the service dashboard
2. Update the secret via `wrangler secret put <SECRET_NAME>` — use the two‑key overlap pattern: add the new key alongside the old one if the service supports multiple active keys
3. Deploy the Worker: `wrangler deploy --env production`
4. Verify the new key works (check logs, send a test request)
5. Delete the old key in the service dashboard
6. Update GitHub Actions secrets if the key is used in CI

**Pattern for DATABASE_URL (Neon)**: Neon doesn't support key rotation in the traditional sense — database credentials are tied to the Neon project. Rotation involves:
1. In Neon Console, go to the project Settings → Connection Details → Reset password (this generates a new password for the database role)
2. Copy the new connection strings (both pooled and non‑pooled)
3. Update via `wrangler secret put DATABASE_URL` and `wrangler secret put DATABASE_POOLED_URL`
4. Deploy the Worker — existing connections may be briefly interrupted but will reconnect
5. Update local `.dev.vars` files for development

**Pattern for BETTER_AUTH_SECRET** (⚠️ HIGH IMPACT):
This is the most dangerous rotation because it invalidates all existing sessions and password reset tokens. Rotation procedure:
1. Announce a maintenance window to users
2. Generate a new secret: `openssl rand -base64 32`
3. Update via `wrangler secret put BETTER_AUTH_SECRET`
4. Deploy immediately — all users will be signed out
5. Notify users that they need to sign in again

**(c) CI/CD integration**: Document how GitHub Actions secrets are updated. Use `gh secret set` CLI: `gh secret set STRIPE_SECRET_KEY --body "$(wrangler secret get STRIPE_SECRET_KEY --env production)"`. Note that GitHub and Wrangler secrets must be kept in sync — if a secret is used in CI (e.g., `SENTRY_AUTH_TOKEN` for source map uploads), it must be updated in both places.

**(d) Rotation schedule**: Recommended schedule based on industry consensus: "Rotating API keys every four minutes is overkill. Industry experts recommend a rotation schedule of every 30‑90 days, depending on data sensitivity and risk profile." For UBOS: standard keys (Stripe, Resend, etc.) rotate every 90 days; high‑impact keys (BETTER_AUTH_SECRET) rotate every 180 days with a maintenance window. 

**(e) Cloudflare Secrets Store (optional future enhancement)**: Document that Cloudflare Secrets Store (beta) enables centralized account‑level secret management — "update a secret once, all Workers using it get the new value." This would simplify rotation but requires adopting the Secrets Store API. For Phase 0, standard `wrangler secret put` is the tool. 

**(f) Emergency rotation**: Document the procedure for immediate rotation when a key is suspected compromised. Emergency rotation follows the same steps but without the overlap period — revoke the old key immediately after deploying the new one, accepting potential brief downtime.

**Research Findings (2026‑05‑06):**
- Stripe: "Rotating an API key revokes it and generates a replacement key that's ready to use immediately." Supports scheduling. 
- Resend: No built‑in rotation. "Both keys will work simultaneously, so ensure your new key is working before deleting your old key." 
- Industry: 30‑90 days for standard keys, 30 days for high‑risk environments. 
- Cloudflare: `wrangler secret put` updates secrets; deploy required. Secrets Store for centralized management. 
- Neon: Reset password generates new connection strings — brief connection interruption expected. 

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (wrangler secrets configured)
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING-1` (Stripe secrets documented)

**Blocks:** [N/A]

**Related Files:**
- `docs/operations/secrets-rotation.md` (new)

**Definition of Done**
- [ ] `docs/operations/secrets‑rotation.md` created with: secrets inventory table, per‑secret rotation procedures, CI/CD integration, rotation schedule, emergency rotation procedure
- [ ] Secrets inventory includes all secrets used by UBOS as of Phase 0 completion
- [ ] BETTER_AUTH_SECRET rotation documented with maintenance window warning
- [ ] Each rotation procedure includes verification steps
- [ ] CI/CD integration instructions for `gh secret set` documented
- [ ] Cloudflare Secrets Store noted as a future enhancement
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Automated rotation scripts (manual procedure is Phase 0; automation deferred)
- OIDC‑based keyless authentication for CI (long‑term security improvement)
- Rotation logging and auditing for SOC 2 compliance
- Secrets rotation testing in staging

**Rules to Follow**
- Every rotation procedure must include a verification step — never assume the new key works.
- The two‑key overlap pattern must be used whenever the service supports multiple active keys — eliminates downtime during rotation.
- BETTER_AUTH_SECRET rotation must require explicit approval (maintenance window).
- Never document actual secret values — all examples use placeholders.
- The document must live in the repository (docs/operations/) to be version‑controlled and reviewable.

**Verification**
```bash
ls docs/operations/secrets-rotation.md
# Manual: review document for completeness
# Manual: verify that every secret listed in the inventory matches the .env.example and current secrets list

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security engineer, I want a documented rotation procedure for every secret so that when a key is compromised, I can rotate it immediately without uncertainty or downtime.

---

#### Subtasks

- [ ] P0-DR-2.0.25 (AGENT): Inventory all secrets used by UBOS from P0‑BILLING, P0‑AUTH, P0‑INNGEST, P0‑OBS, and P0‑EMAIL documentation.
  **Verification:** Complete secrets inventory compiled.

- [ ] P0-DR-2.0.5 (AGENT): Research rotation procedures for Stripe, Resend, Neon, and Cloudflare Workers secrets.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-DR-2.1 (AGENT): Write `docs/operations/secrets-rotation.md` with inventory, per‑secret procedures, CI/CD integration, schedule, and emergency rotation.
  **File(s):** `docs/operations/secrets-rotation.md` (new)
  **Verification:** Document covers all required sections.

- [ ] P0-DR-2.2 (HUMAN): Review rotation procedures, verify accuracy against service documentation, approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑DR group are covered.*

---