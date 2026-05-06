# tasks/infrastructure/P0-BILLING.md – Stripe Integration

This file covers Stripe account configuration with API keys and environment variables, the Stripe client singleton using `createFetchHttpClient()` for Cloudflare Workers compatibility, webhook signature verification using `constructEventAsync()` with raw request body handling, a database‑backed idempotency ledger for Stripe events, subscription lifecycle event handling (checkout completed, updated, deleted), and the Stripe Customer Portal passthrough for self‑service billing management. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑BILLING (2026‑05‑06)

### 1. Stripe Node.js SDK — Latest Version & Workers Compatibility

**Latest stable**: Stripe Node SDK **v22.0.0**, released 2026‑04‑03, pinning API version **`2026-03-25.dahlia`**. The previous major release, v21.0.0 (2026‑03‑26), also pins the same API version. Both use the Dahlia API release.

**v22.0.0 breaking changes** (relevant to UBOS):
- **Must use `new Stripe()`** — the constructor is no longer callable as a plain function. `const stripe = Stripe("sk_...")` is invalid; use `const stripe = new Stripe("sk_...")`.
- **No callback support** — all API methods return Promises. Callback patterns removed.
- **Stricter parameter ordering** — `RequestParams` must always come before `RequestOptions`. Use `undefined` to skip params.
- **Per‑request API key** must be in `RequestOptions.apiKey`, not as a separate argument.
- **No per‑request host override** — set `host` in client configuration.
- **`Stripe.StripeContext` renamed** to `Stripe.StripeContextType`.
- **CJS entry point** no longer exports `.default` or `.Stripe` as separate properties.

**Cloudflare Workers compatibility**: The Stripe SDK's default HTTP client relies on Node.js's `node:https` module, which is unavailable on Workers. The SDK provides `Stripe.createFetchHttpClient()` — a Fetch‑based HTTP client compatible with Workers. This must be passed as the `httpClient` option when instantiating the Stripe client. 

### 2. Webhook Signature Verification on Cloudflare Workers

The canonical approach on Cloudflare Workers is `stripe.webhooks.constructEventAsync()`, **not** `constructEvent()`. The synchronous `constructEvent` uses Node.js crypto APIs internally and fails on Workers even with `nodejs_compat` flags. `constructEventAsync` uses the Web Crypto API (`crypto.subtle`) which is natively available on Workers. 

**Critical body handling**: The webhook body must be read with `await request.text()`, **not** `request.json()`. The raw body string is required for signature verification — JSON parsing and re‑stringifying will produce a different byte sequence, breaking the signature. This is confirmed by multiple Workers‑specific Stripe integration guides. 

**Signature verification pattern**:
```typescript
const body = await request.text();
const signature = request.headers.get('stripe-signature');
const event = await stripe.webhooks.constructEventAsync(
  body,
  signature,
  env.STRIPE_WEBHOOK_SECRET
);
```

**Webhook secret format**: Test mode secrets start with `whsec_test_`, live mode secrets with `whsec_live_`. These must be stored via `wrangler secret put`, never in `wrangler.jsonc` vars.

### 3. Webhook Idempotency — The "Insert‑Before‑Process" Pattern

Multiple 2026 production webhook guides converge on the same pattern: **database‑backed idempotency with the "insert‑before‑process" pattern**. 

**Key principle**: Stripe guarantees **at‑least‑once delivery** for webhooks. If your handler takes too long, experiences a network blip, or crashes mid‑process, Stripe retries the webhook. Without idempotency, you'll provision duplicate resources, send duplicate emails, or grant double credits. 

**The pattern**:
1. Extract the Stripe event ID (`event.id`, e.g., `evt_1MrSjz...`)
2. **Insert** a row into a `stripe_webhook_events` table with the event ID as the primary key
3. If the INSERT succeeds (event not yet processed), proceed with business logic
4. If the INSERT fails with a unique constraint violation (event already processed), return `200 OK` immediately — Stripe considers this a successful acknowledgment
5. After processing, update the row with status, processed_at, etc.

**Why not in‑memory (Redis)?** In‑memory sets are lost on serverless cold starts. "Never use in‑memory Sets (lost on serverless cold starts)" is stated as a core principle in the Stripe integration patterns. For Cloudflare Workers which are stateless by nature, database‑backed idempotency is the only reliable approach.

**Two‑tier approach** (matching the TASKS.md specification): The TASKS.md mentions "two‑tier: in‑memory + DB". In a Workers context, a KV‑based fast check (ultra‑low latency) with a PostgreSQL fallback (durable source of truth) provides defense‑in‑depth. KV can serve as a cache for recently processed event IDs, while the database table guarantees durability across KV evictions.

### 4. Subscription Lifecycle Events

The 2026 consensus for a SaaS subscription integration identifies **three core webhook events** as the minimal viable set:
- `checkout.session.completed` — Sent when a customer successfully completes the Checkout Session, informing you of a new purchase. Provision the subscription and set status to `active`. 
- `customer.subscription.updated` — Sent when a subscription changes (plan upgrade/downgrade, billing cycle change, status change). Map Stripe status to local enum and refresh entitlements. 
- `customer.subscription.deleted` — Sent when a subscription is cancelled (immediately or at period end). Set subscription status to `free` or `cancelled`. 

Additional events for a complete integration:
- `invoice.paid` — Each billing period when payment succeeds
- `invoice.payment_failed` — Payment method issue; notify customer to update payment method

**Status mapping**: Stripe subscription statuses (`active`, `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `trialing`, `paused`) must be mapped to UBOS's internal subscription states.

### 5. Stripe Customer Portal

The Customer Portal is a Stripe‑hosted UI for subscription and billing management. It eliminates the need to build a custom billing settings page. Sessions are created via `stripe.billingPortal.sessions.create({ customer, return_url })`.

**Key API details**:
- Returns a `url` property — a short‑lived URL that gives the customer access to the portal
- Sessions expire if the customer does not visit the URL
- Create sessions on‑demand when customers intend to manage their subscriptions
- `return_url` specifies where to redirect customers when they click "Return to [website]"
- Portal configuration (features, branding) is managed in the Stripe Dashboard under Settings → Billing → Customer Portal

### 6. Inngest for Subscription Sync

Inngest can consume Stripe webhook events directly by providing a webhook URL to Stripe. However, this approach requires: (1) registering the Inngest‑generated URL as the Stripe webhook endpoint, and (2) defining transform functions on Inngest's servers to convert Stripe's raw event format to Inngest's event format. 

For UBOS, the approach will be: receive webhooks directly at the Hono endpoint (`/api/stripe/webhook`), verify signatures, apply idempotency, and then dispatch typed Inngest events (`billing/subscription.updated`, etc.) via `inngest.send()`. This keeps signature verification and idempotency in our control while leveraging Inngest for durable subscription state synchronization.

---

## Task Definitions

### [ ] P0-BILLING-1: Configure Stripe account, API keys, and environment variables; create Stripe client singleton

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🔴 Critical
**Current State:** No Stripe account is connected to the UBOS project. No Stripe API keys exist in environment variables or Cloudflare secrets. No Stripe client singleton exists in the codebase. The `stripe` npm package is not installed. No Stripe products, prices, or webhook endpoints are configured.
**Size:** Small

**Description:**
Set up the Stripe integration foundation: Stripe account configuration, API keys as Cloudflare secrets, the Stripe client singleton with Workers‑compatible HTTP client, and environment variable documentation. This is the prerequisite for all other billing tasks.

**(a) Stripe account setup** (HUMAN): Create a Stripe account (if one doesn't exist) or use an existing one. In test mode, create at least one product with a recurring price (e.g., "UBOS Pro — $29/month"). Note the product ID (`prod_...`) and price ID (`price_...`). These will be used in Phase 2 billing UI tasks.

**(b) API keys as secrets**: Store the Stripe secret key as a Cloudflare secret: `wrangler secret put STRIPE_SECRET_KEY`. The secret key begins with `sk_test_` (test mode) or `sk_live_` (live mode). Also store `STRIPE_WEBHOOK_SECRET` (begins with `whsec_`). Store the publishable key (`pk_test_` or `pk_live_`) as `STRIPE_PUBLISHABLE_KEY` (this one is not a secret — it's safe for client‑side use, but storing it as a secret keeps configuration centralized). Never hard‑code these in `wrangler.jsonc` or source code. 

**(c) Stripe client singleton**: Create `apps/web/src/server/stripe/client.ts` with a lazy‑initialized Stripe client singleton. The client must use `Stripe.createFetchHttpClient()` (not the default `node:https` client) for Cloudflare Workers compatibility. Pin the API version to `2026-03-25.dahlia` (matching the SDK's pinned version). Use the factory function pattern: export `getStripe()` which returns the singleton, initializing it on first call. This avoids build‑time errors when the API key is not available during bundling.

```typescript
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}
```

**(d) Installation**: Add `stripe` ^22.0.0 to `pnpm-workspace.yaml` catalog and `apps/web/package.json`. Run `pnpm install`.

**(e) Environment documentation**: Update `.env.example` with descriptions of all three Stripe environment variables and their formats (`sk_test_`, `whsec_`, `pk_test_`). Document that the webhook secret must be the **endpoint** secret (from the specific webhook endpoint in Stripe Dashboard), not the account secret key.

**Research Findings (2026‑05‑06):**
- Stripe Node SDK v22.0.0 is latest stable (2026‑04‑03), pinning API version `2026-03-25.dahlia`. 
- Must use `new Stripe()` constructor (v22 breaking change). 
- `Stripe.createFetchHttpClient()` required for Cloudflare Workers. 
- Lazy initialization prevents build errors when API key is absent. 
- API keys must never be hardcoded — always use secrets. 

**Depends on:** [N/A]

**Blocks:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑2` (webhook verification)
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑5` (customer portal)
- `tasks/infrastructure/P0‑OBS.md → P0‑OBS‑4` (health check Stripe dependency)

**Related Files:**
- `apps/web/src/server/stripe/client.ts` (new)
- `apps/web/package.json` (add `stripe` dep)
- `pnpm-workspace.yaml` (add `stripe` to catalog)
- `.env.example` (document Stripe variables)

**Definition of Done**
- [ ] Stripe account configured with test mode product and price
- [ ] `stripe` ^22.0.0 installed and added to workspace catalog
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PUBLISHABLE_KEY` stored as Cloudflare secrets
- [ ] `apps/web/src/server/stripe/client.ts` created with lazy‑initialized singleton using `createFetchHttpClient()` and pinned API version
- [ ] Stripe client compiles without errors; can make a test API call (`stripe.products.list({ limit: 1 })`)
- [ ] `.env.example` documents all three Stripe variables
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Creating actual subscription products and prices in Stripe (Phase 2 — handled when subscription plans are defined)
- Stripe Checkout session creation (Phase 2)
- Stripe webhook endpoint registration in Stripe Dashboard (P0‑BILLING‑2)
- Customer Portal configuration in Stripe Dashboard (P0‑BILLING‑5)

**Rules to Follow**
- Never hard‑code Stripe API keys in source code, `wrangler.jsonc`, or commit them to version control.
- Never use live mode keys in development or staging environments.
- The Stripe client must be lazy‑initialized — do not instantiate at module level.
- `httpClient: Stripe.createFetchHttpClient()` is mandatory for Workers compatibility.

**Verification**
```bash
# Verify installation
pnpm ls stripe

# Verify API key is a secret (not in wrangler.jsonc)
wrangler secret list --env production | grep STRIPE

# Verify client compiles and can make API calls
# (via a temporary test route or script)
node -e "
  const { getStripe } = require('./apps/web/src/server/stripe/client.ts');
  const stripe = getStripe();
  stripe.products.list({ limit: 1 }).then(console.log);
"

# Verify .env.example
grep STRIPE .env.example

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: `getStripe()` encapsulates the complexity of Workers‑compatible HTTP client configuration, lazy initialization, and API version pinning behind a simple function call, making Stripe API access a one‑line import throughout the codebase.

---

#### Subtasks

- [ ] P0-BILLING-1.0.25 (AGENT): Research Stripe Node SDK v22.0.0 breaking changes, `createFetchHttpClient()` usage, and secret key management for Cloudflare Workers.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-BILLING-1.0.5 (AGENT): Read `pnpm-workspace.yaml` and `apps/web/package.json`. Identify where to add Stripe dependency.
  **Verification:** Package configuration understood.

- [ ] P0-BILLING-1.1 (AGENT): Add `stripe` ^22.0.0 to `pnpm-workspace.yaml` catalog and `apps/web/package.json`. Run `pnpm install`.
  **File(s):** `pnpm-workspace.yaml`, `apps/web/package.json`
  **Verification:** `pnpm ls stripe` shows ^22.0.0.

- [ ] P0-BILLING-1.2 (AGENT): Create `apps/web/src/server/stripe/client.ts` with lazy‑initialized singleton, `createFetchHttpClient()`, and pinned API version.
  **File(s):** `apps/web/src/server/stripe/client.ts` (new)
  **Verification:** Client compiles; `new Stripe()` constructor pattern used.

- [ ] P0-BILLING-1.3 (AGENT): Update `.env.example` with `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PUBLISHABLE_KEY` descriptions.
  **File(s):** `.env.example`
  **Verification:** All three variables documented with format examples.

- [ ] P0-BILLING-1.4 (HUMAN): Create Stripe account, generate API keys, store as Cloudflare secrets, create test product/price. Approve.
  **Verification:** Approved.

---

### [ ] P0-BILLING-2: Build webhook endpoint with signature verification using `constructEventAsync`

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No Stripe webhook endpoint exists in the Hono API. Stripe events (checkout completion, subscription changes, payment failures) are not received or processed. Without webhook handling, the application has no way to respond to asynchronous Stripe events — it would need to poll the Stripe API, which is unreliable and not recommended.
**Size:** Medium

**Description:**
Build a production‑grade Stripe webhook endpoint at `POST /api/stripe/webhook` that verifies webhook signatures, applies idempotency, and dispatches events to the subscription sync Inngest function (P0‑BILLING‑4).

**(a) Webhook route**: Create `apps/web/src/routes/api/stripe/webhook.ts` — a Hono route handler for `POST /api/stripe/webhook`. The handler must:
- Read the **raw** request body using `await request.text()` — not `request.json()`. The raw string is required for signature verification; JSON parsing and re‑stringifying breaks the signature. 
- Extract the `stripe-signature` header
- Call `stripe.webhooks.constructEventAsync(body, signature, webhookSecret)` using the Workers‑compatible async method
- On signature verification failure: log a warning and return `400 Bad Request`
- On success: extract `event.id` and `event.type`

**(b) Idempotency check**: Before processing, check the idempotency ledger (P0‑BILLING‑3). If the event ID has already been processed, return `200 OK` immediately — Stripe interprets this as a successful acknowledgment and will not retry.

**(c) Event routing**: Based on `event.type`, dispatch to the appropriate handler:
- `checkout.session.completed` → extract customer ID, subscription ID, provision entitlements, set subscription status to `active`
- `customer.subscription.updated` → map Stripe status to local enum, refresh entitlements
- `customer.subscription.deleted` → set subscription status to `free`/`cancelled`, revoke entitlements
- `invoice.paid` → log payment, update payment history
- `invoice.payment_failed` → notify customer (future: trigger dunning workflow)
- Other events → log at debug level, return `200 OK`

**(d) Quick acknowledgment**: The webhook endpoint must respond `200 OK` quickly — within Stripe's timeout window (typically 10–20 seconds). Heavy processing (email sending, database updates) should be dispatched to Inngest (via `inngest.send()`) rather than performed synchronously. 

**(e) Webhook registration**: After deploying the endpoint, register it in the Stripe Dashboard (Workbench → Webhooks → Add endpoint). The URL should be `https://ubos.app/api/stripe/webhook`. Select the event types to listen to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. For local development, use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

**Research Findings (2026‑05‑06):**
- `constructEventAsync` is required on Workers (not `constructEvent`). 
- `await request.text()` is mandatory — `request.json()` breaks signature verification. 
- Stripe retries webhooks if the endpoint doesn't respond or returns non‑2xx. 
- The endpoint must acknowledge quickly — dispatch heavy work to background jobs.
- Webhook secret is endpoint‑specific (found in Stripe Dashboard under that webhook endpoint's details).

**Depends on:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑1` (Stripe client and secrets)

**Blocks:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑3` (idempotency ledger)
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑4` (subscription sync)

**Related Files:**
- `apps/web/src/routes/api/stripe/webhook.ts` (new)
- `apps/web/src/server/api.ts` (register the route)

**Definition of Done**
- [ ] `POST /api/stripe/webhook` route created in the Hono app
- [ ] Raw body read via `await request.text()`
- [ ] Signature verified using `constructEventAsync()` with the webhook secret
- [ ] Invalid signatures return `400`; valid signatures proceed to idempotency check
- [ ] Event routing dispatches to appropriate handlers for all five core event types
- [ ] Endpoint responds `200 OK` within 5 seconds (heavy processing dispatched to Inngest)
- [ ] Tested with Stripe CLI: `stripe trigger checkout.session.completed`
- [ ] Webhook endpoint registered in Stripe Dashboard for production
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full subscription provisioning logic (P0‑BILLING‑4 handles the Inngest side)
- Dunning workflow (Phase 2)
- Webhook event replay UI (Phase 3)

**Rules to Follow**
- Never parse the request body as JSON before signature verification — use `request.text()` and pass the raw string.
- Always respond `200 OK` after successful processing — Stripe retries on non‑2xx responses.
- The webhook handler must never throw unhandled errors — catch and log, then return `500`.
- Do not perform synchronous heavy work in the webhook handler — dispatch to Inngest.

**Verification**
```bash
# Start dev server and Stripe CLI
pnpm dev
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Verify signature verification works
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: invalid" \
  -d '{"type": "test"}'
# Expected: 400 Bad Request

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a billing system, I want Stripe webhooks reliably delivered and processed so that subscription state is always synchronized between Stripe and the UBOS database.
- Deep Module: The webhook handler encapsulates signature verification, idempotency, and event routing behind a single POST endpoint, making Stripe integration a simple consumer of verified, deduplicated events.

---

#### Subtasks

- [ ] P0-BILLING-2.0.25 (AGENT): Read P0‑BILLING‑1 output (Stripe client). Research `constructEventAsync` API, raw body handling, and Stripe webhook best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-BILLING-2.0.5 (AGENT): Research all five webhook event type payloads and the Stripe CLI testing workflow.
  **Verification:** Event payloads understood; testing workflow documented.

- [ ] P0-BILLING-2.1 (AGENT): Create `apps/web/src/routes/api/stripe/webhook.ts` with raw body reading, signature verification, and event routing.
  **File(s):** `apps/web/src/routes/api/stripe/webhook.ts` (new)
  **Verification:** Webhook endpoint verifies signatures and routes events.

- [ ] P0-BILLING-2.2 (AGENT): Register the webhook route in `apps/web/src/server/api.ts`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** `POST /api/stripe/webhook` responds.

- [ ] P0-BILLING-2.3 (AGENT): Test with Stripe CLI: send test events, verify signature verification, event routing, and 200 responses.
  **Verification:** All five event types processed correctly.

- [ ] P0-BILLING-2.4 (HUMAN): Register webhook endpoint in Stripe Dashboard, verify production readiness. Approve.
  **Verification:** Approved.

---

### [ ] P0-BILLING-3: Build idempotency ledger for Stripe events (database + KV two‑tier)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No idempotency protection exists for Stripe webhook events. If a webhook is retried (which Stripe guarantees will happen for at‑least‑once delivery), the same event would be processed multiple times — causing duplicate subscription provisioning, double email sending, or duplicate payment records. No `stripe_webhook_events` table exists in the database schema.
**Size:** Medium

**Description:**
Build a two‑tier idempotency ledger that prevents duplicate processing of Stripe webhook events. The ledger combines a Cloudflare KV store for ultra‑low‑latency duplicate detection with a PostgreSQL table for durable, persistent event tracking.

**(a) Database table**: Create `packages/db/src/schema/stripe-events.ts` with `stripeWebhookEventsTable`:
- `id` — TEXT PRIMARY KEY (Stripe event ID, e.g., `evt_1MrSjzLkdIwHu7ixex0IvU9b`)
- `type` — TEXT NOT NULL (event type, e.g., `checkout.session.completed`)
- `status` — TEXT NOT NULL DEFAULT 'received' (`received` → `processing` → `processed` | `failed`)
- `processed_at` — TIMESTAMPTZ (when processing completed successfully)
- `error_message` — TEXT (nullable, populated on failure)
- `created_at` — TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `org_id` — UUID (nullable, populated from subscription metadata)

The `id` column serves as the primary key with an implicit unique constraint — any duplicate INSERT will fail, providing database‑level idempotency.

**(b) KV namespace**: Create a KV namespace `STRIPE_EVENTS_KV` (via `wrangler kv:namespace create`) for fast idempotency checks. KV keys are Stripe event IDs with a short TTL (24 hours). On webhook receipt, check KV first — if the key exists, the event was recently processed. KV provides sub‑millisecond reads, avoiding a database round‑trip for duplicate events. If KV misses (key not found or expired), fall through to the database check.

**(c) Idempotency middleware/guard**: Create `apps/web/src/server/stripe/idempotency.ts` with:
- `isEventProcessed(eventId: string): Promise<boolean>` — checks KV first, then database. Returns `true` if the event has been processed.
- `markEventProcessing(eventId: string, type: string): Promise<void>` — inserts a row into the database and sets a KV key. Called **before** processing the event (insert‑before‑process pattern). 
- `markEventProcessed(eventId: string): Promise<void>` — updates the database row status to `processed` and sets `processed_at`.
- `markEventFailed(eventId: string, error: string): Promise<void>` — updates status to `failed` with error message.

**(d) Integration**: The webhook handler (P0‑BILLING‑2) calls `isEventProcessed()` immediately after signature verification. If already processed, return `200 OK` and skip all business logic. If not, call `markEventProcessing()` before dispatching to Inngest. The Inngest function (P0‑BILLING‑4) calls `markEventProcessed()` on success.

**Research Findings (2026‑05‑06):**
- Database‑backed idempotency with `INSERT`‑before‑process is the canonical 2026 pattern. 
- "Never use in‑memory Sets (lost on serverless cold starts)" — a core Stripe integration principle. 
- KV as a fast cache layer reduces database load for duplicate events while PostgreSQL provides durable source of truth.
- Stripe event IDs are globally unique and stable across retries. 
- Stripe retries webhooks for up to 3 days with exponential backoff. 

**Depends on:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑2` (webhook endpoint)
- `tasks/infrastructure/P0-DB.md → P0-DB‑5` (database schema infrastructure)

**Blocks:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑4` (subscription sync uses idempotency)

**Related Files:**
- `packages/db/src/schema/stripe-events.ts` (new)
- `apps/web/src/server/stripe/idempotency.ts` (new)
- `apps/web/wrangler.jsonc` (add KV namespace binding)

**Definition of Done**
- [ ] `packages/db/src/schema/stripe‑events.ts` created with `stripeWebhookEventsTable`
- [ ] Migration generated and applied
- [ ] KV namespace `STRIPE_EVENTS_KV` created and bound in `wrangler.jsonc`
- [ ] `apps/web/src/server/stripe/idempotency.ts` created with `isEventProcessed()`, `markEventProcessing()`, `markEventProcessed()`, `markEventFailed()`
- [ ] KV check returns quickly for duplicate events; database INSERT prevents races
- [ ] Idempotency guard integrated into webhook handler
- [ ] Test: send the same Stripe test event twice → first processes, second returns `200` with no side effects
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Automated cleanup of old KV keys (handled by KV TTL)
- Automated cleanup of old database rows (can be added as a cron Inngest function)
- Cross‑project event sharing (single Stripe account, single webhook endpoint)

**Rules to Follow**
- Always INSERT before processing, not after — the insert‑before‑process pattern prevents races.
- KV TTL must be shorter than the Stripe retry window (24h covers most retries; Stripe retries for up to 3 days but most retries happen within hours).
- The database INSERT must be the source of truth — KV is a performance optimization, not a replacement.
- Never skip the database check based solely on KV — KV can be evicted.

**Verification**
```bash
# Test idempotency
# 1. Send a Stripe test event (via Stripe CLI)
stripe trigger checkout.session.completed
# Verify: event processed, row inserted in stripe_webhook_events

# 2. Send the same event ID again (simulate retry)
# Verify: webhook handler returns 200, no duplicate processing

# Verify database
psql $DATABASE_URL -c "SELECT id, type, status FROM stripe_webhook_events;"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a billing engineer, I want duplicate Stripe webhook deliveries to be safely ignored so that customers are never double‑charged and subscriptions are never provisioned twice.
- Deep Module: The idempotency module encapsulates the two‑tier check (KV + PostgreSQL) and the insert‑before‑process pattern behind four simple functions, making webhook idempotency a one‑line check for any webhook handler.

---

#### Subtasks

- [ ] P0-BILLING-3.0.25 (AGENT): Read P0‑BILLING‑2 output. Research database‑backed idempotency patterns and KV‑based caching for Workers.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-BILLING-3.0.5 (AGENT): Design `stripeWebhookEventsTable` schema and KV namespace structure.
  **Verification:** Schemas designed.

- [ ] P0-BILLING-3.1 (AGENT): Create `packages/db/src/schema/stripe‑events.ts` and generate migration.
  **File(s):** `packages/db/src/schema/stripe‑events.ts` (new), migration files
  **Verification:** Table created with id as PRIMARY KEY.

- [ ] P0-BILLING-3.2 (AGENT): Create KV namespace and add binding to `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** KV binding configured.

- [ ] P0-BILLING-3.3 (AGENT): Create `apps/web/src/server/stripe/idempotency.ts` with four functions.
  **File(s):** `apps/web/src/server/stripe/idempotency.ts` (new)
  **Verification:** Idempotency check functional; duplicate events detected.

- [ ] P0-BILLING-3.4 (AGENT): Integrate idempotency guard into webhook handler.
  **File(s):** `apps/web/src/routes/api/stripe/webhook.ts`
  **Verification:** Duplicate events return 200 without side effects.

- [ ] P0-BILLING-3.5 (HUMAN): Test idempotency with duplicate Stripe events. Approve.
  **Verification:** Approved.

---

### [ ] P0-BILLING-4: Handle subscription lifecycle events (checkout completed, updated, deleted)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No subscription synchronization logic exists. When Stripe sends webhook events for subscription lifecycle changes, there is no code to update the UBOS database with the subscription state. Organizations have no `subscription_status` or `subscription_id` fields. There is no mapping between Stripe subscription statuses and UBOS internal subscription states.
**Size:** Medium

**Description:**
Build an Inngest function that handles the three core subscription lifecycle events: `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. This function is triggered by the webhook handler (P0‑BILLING‑2) dispatching typed Inngest events, and it synchronizes the subscription state from Stripe into the UBOS database.

**(a) Database schema**: Extend the organizations table (or create a subscriptions table) with fields: `stripe_customer_id` (text, nullable), `stripe_subscription_id` (text, nullable), `subscription_status` (text, nullable), `subscription_plan` (text, nullable), `subscription_current_period_end` (timestamptz, nullable), `subscription_cancel_at_period_end` (boolean, default false). These fields are populated and updated by the Inngest function.

**(b) Stripe status → UBOS status mapping**:

| Stripe Status | UBOS Status | Description |
|---|---|---|
| `active` | `active` | Subscription in good standing |
| `past_due` | `past_due` | Payment failed, retrying |
| `unpaid` | `past_due` | All retries exhausted |
| `canceled` | `free` | Subscription ended |
| `incomplete` | `provisioning` | Checkout started but not completed |
| `incomplete_expired` | `free` | Checkout abandoned |
| `trialing` | `trialing` | In trial period |
| `paused` | `paused` | Subscription paused |

**(c) Inngest events**: Create Inngest event types for billing events in the event registry (`apps/web/src/server/inngest/events/billing.ts`):
- `billing/subscription.created` — from `checkout.session.completed`
- `billing/subscription.updated` — from `customer.subscription.updated`
- `billing/subscription.deleted` — from `customer.subscription.deleted`

**(d) Inngest function**: Create `apps/web/src/server/inngest/functions/billing/subscription‑sync.ts`:
- **Triggers**: All three billing event types using `triggers: [subscriptionCreated, subscriptionUpdated, subscriptionDeleted]`
- **Handler**: For each event type:
  - `billing/subscription.created`: Set `subscription_status = 'active'`, store `stripe_customer_id`, `stripe_subscription_id`, `subscription_plan`, `subscription_current_period_end`. Log success.
  - `billing/subscription.updated`: Map Stripe status to UBOS status, update `subscription_status`, `subscription_current_period_end`, `subscription_cancel_at_period_end`. If status changed to `canceled`, set to `free`.
  - `billing/subscription.deleted`: Set `subscription_status = 'free'`, clear subscription fields. Revoke entitlements.
- **Steps**: Each status update is a `step.run()` — making each database operation individually retryable.

**(e) Event dispatching from webhook handler**: The webhook handler (P0‑BILLING‑2) calls `inngest.send()` with the appropriate typed event after successful signature verification and idempotency check. The event includes the relevant Stripe IDs and metadata.

**Research Findings (2026‑05‑06):**
- The three core webhook events for SaaS subscription lifecycle are: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. 
- Stripe subscription statuses: `active`, `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `trialing`, `paused`. 
- Inngest `step.run()` is the recommended pattern for database operations in webhook handlers. 
- `inngest.send()` should be fire‑and‑forget from the webhook handler — the Inngest function handles retries and durability.

**Depends on:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑3` (idempotency ledger)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST‑2` (Inngest serve handler)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST‑3` (event registry)

**Blocks:**
- `tasks/infrastructure/P2-BILLING.md → P2-BILLING‑1` (Stripe Checkout session creation)
- `tasks/infrastructure/P2-BILLING.md → P2-BILLING‑3` (plan entitlement enforcement)

**Related Files:**
- `packages/db/src/schema/subscriptions.ts` (new — subscription fields on org or separate table)
- `apps/web/src/server/inngest/events/billing.ts` (new — billing event types)
- `apps/web/src/server/inngest/functions/billing/subscription‑sync.ts` (new)
- `apps/web/src/routes/api/stripe/webhook.ts` (add `inngest.send()` calls)

**Definition of Done**
- [ ] Database fields added for subscription tracking (on organizations table or separate subscriptions table)
- [ ] Inngest event types defined: `billing/subscription.created`, `billing/subscription.updated`, `billing/subscription.deleted`
- [ ] Stripe → UBOS status mapping implemented as a pure function with unit tests
- [ ] `subscription‑sync.ts` Inngest function created: handles all three lifecycle events with `step.run()` for database operations
- [ ] Webhook handler dispatches typed Inngest events after signature verification and idempotency check
- [ ] Test: send Stripe test webhooks → verify database subscription fields updated correctly
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Entitlement enforcement (Phase 2 — P2‑BILLING‑3)
- Invoice history UI (Phase 2)
- Dunning workflows and payment retry logic (Phase 2)
- Usage‑based billing (Phase 2)

**Rules to Follow**
- Subscription state must be stored in the UBOS database, not derived from Stripe on every request.
- The status mapping function must be pure (no side effects) and unit‑testable.
- All Inngest steps must be individually retryable — wrap database operations in `step.run()`.
- Never expose Stripe raw webhook payloads in logs — extract only the needed IDs and statuses.

**Verification**
```bash
# Test subscription lifecycle
# 1. Send checkout.session.completed webhook
stripe trigger checkout.session.completed
# Verify: org subscription_status = 'active', stripe_customer_id set

# 2. Send customer.subscription.updated (plan change)
stripe trigger customer.subscription.updated
# Verify: subscription_plan updated

# 3. Send customer.subscription.deleted
stripe trigger customer.subscription.deleted
# Verify: subscription_status = 'free', entitlements revoked

# Check Inngest dashboard for function runs
open https://app.inngest.com

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a SaaS customer, when I subscribe to UBOS Pro, my account is immediately upgraded. When I cancel, my account reverts to the free tier at the end of the billing period.
- Deep Module: The subscription sync function encapsulates the complexity of Stripe status mapping, idempotent database updates, and retry logic behind three typed Inngest event handlers, making subscription lifecycle management a simple function of event type.

---

#### Subtasks

- [ ] P0-BILLING-4.0.25 (AGENT): Read P0‑BILLING‑3 and P0‑INNGEST‑3 outputs. Research Stripe subscription lifecycle events and status mapping.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-BILLING-4.0.5 (AGENT): Design subscription database schema and status mapping table.
  **Verification:** Schema and mapping designed.

- [ ] P0-BILLING-4.1 (AGENT): Add subscription fields to database schema and generate migration.
  **File(s):** `packages/db/src/schema/` (extend or new), migration files
  **Verification:** Fields exist in database.

- [ ] P0-BILLING-4.2 (AGENT): Create billing event types in the Inngest event registry.
  **File(s):** `apps/web/src/server/inngest/events/billing.ts` (new)
  **Verification:** Event types compile and export correctly.

- [ ] P0-BILLING-4.3 (AGENT): Create `subscription‑sync.ts` Inngest function with three event handlers.
  **File(s):** `apps/web/src/server/inngest/functions/billing/subscription‑sync.ts` (new)
  **Verification:** Function triggers on all three event types.

- [ ] P0-BILLING-4.4 (AGENT): Add `inngest.send()` calls to webhook handler for event dispatching.
  **File(s):** `apps/web/src/routes/api/stripe/webhook.ts`
  **Verification:** Webhook events dispatch Inngest events.

- [ ] P0-BILLING-4.5 (HUMAN): Test full subscription lifecycle with Stripe test events. Approve.
  **Verification:** Approved.

---

### [ ] P0-BILLING-5: Build Stripe Customer Portal passthrough for self‑service billing

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No Customer Portal integration exists. Users cannot manage their payment methods, view invoices, upgrade/downgrade plans, or cancel subscriptions without contacting support. The Stripe Customer Portal provides all of this functionality through a Stripe‑hosted UI, but no endpoint exists to generate a portal session URL.
**Size:** Small

**Description:**
Build a simple passthrough endpoint that creates a Stripe Customer Portal session and returns the URL for client‑side redirect. This eliminates the need to build a custom billing management UI.

**(a) Portal route**: Create `apps/web/src/routes/api/stripe/portal.ts` — a Hono route handler for `POST /api/stripe/portal`. The handler:
- Reads the authenticated user's organization from the session context
- Retrieves the `stripe_customer_id` from the organization's subscription record
- If no `stripe_customer_id` exists, returns `400 Bad Request` ("No Stripe customer associated with this organization")
- Calls `stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url })`
- Returns `{ url: session.url }` as JSON — the client redirects to this URL
- The `return_url` should point to the UBOS settings/billing page

**(b) Security**: The endpoint must be authenticated — only organization admins can access billing management. Apply the RBAC middleware (P0‑TRPC‑3) or a separate auth check.

**(c) Portal configuration**: The Customer Portal's features and branding are configured in the Stripe Dashboard (Settings → Billing → Customer Portal). For Phase 0, use the default configuration. Future customizations (collecting tax IDs, displaying specific products for upgrade) are dashboard‑side changes.

**(d) Client‑side**: Create a "Manage Subscription" button in the settings/billing page (when built in Phase 2) that calls this endpoint and redirects to the returned URL.

**Research Findings (2026‑05‑06):**
- `stripe.billingPortal.sessions.create({ customer, return_url })` — simple API. 
- Sessions are short‑lived and expire if the customer does not visit the URL. 
- Customer Portal handles: payment methods, invoices, plan upgrades/downgrades, cancellations. 
- The portal configuration (features, branding) is managed in Stripe Dashboard — no code changes needed for most customizations.
- No custom portal needed — Stripe's hosted portal is production‑ready. 

**Depends on:**
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑1` (Stripe client)
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING‑4` (subscription sync populates `stripe_customer_id`)

**Blocks:**
- `tasks/infrastructure/P2-BILLING.md → P2-BILLING‑4` (billing admin overview UI)

**Related Files:**
- `apps/web/src/routes/api/stripe/portal.ts` (new)
- `apps/web/src/server/api.ts` (register route)

**Definition of Done**
- [ ] `POST /api/stripe/portal` route created
- [ ] Endpoint retrieves `stripe_customer_id` from the authenticated organization
- [ ] Portal session created via `stripe.billingPortal.sessions.create()`
- [ ] `return_url` points to UBOS billing settings page
- [ ] Response includes portal URL for client redirect
- [ ] Endpoint returns appropriate errors for missing customer or Stripe API failures
- [ ] Tested: call endpoint → receive URL → open URL → see Stripe Customer Portal
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Custom portal configuration in Stripe Dashboard (dashboard‑side; not code)
- "Manage Subscription" button UI (Phase 2)
- Direct Stripe Checkout session creation (Phase 2)
- Custom branding beyond Stripe Dashboard settings

**Rules to Follow**
- The portal endpoint must be authenticated — unauthenticated access to billing management is a security risk.
- Never expose the `stripe_customer_id` in client‑side code — the portal session URL is temporary and does not leak the customer ID.
- The `return_url` must be an absolute HTTPS URL on the UBOS domain.

**Verification**
```bash
# Test portal session creation
curl -X POST http://localhost:3000/api/stripe/portal \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json"
# Expected: { url: "https://billing.stripe.com/p/session/..." }

# Open the URL in a browser
# Verify: Stripe Customer Portal loads with customer's subscriptions, payment methods, invoices

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a customer, I want to manage my subscription, payment methods, and billing history through a self‑service portal without contacting support.
- Deep Module: The portal endpoint encapsulates Stripe Customer Portal session creation behind a simple authenticated POST endpoint, making billing self‑service a one‑click redirect for the user.

---

#### Subtasks

- [ ] P0-BILLING-5.0.25 (AGENT): Read P0‑BILLING‑1 and P0‑BILLING‑4 outputs. Research Stripe Customer Portal API and session creation.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-BILLING-5.0.5 (AGENT): Identify `return_url` — which UBOS page should users return to after managing billing.
  **Verification:** Return URL confirmed.

- [ ] P0-BILLING-5.1 (AGENT): Create `apps/web/src/routes/api/stripe/portal.ts` with portal session creation.
  **File(s):** `apps/web/src/routes/api/stripe/portal.ts` (new)
  **Verification:** Endpoint creates and returns portal URL.

- [ ] P0-BILLING-5.2 (AGENT): Register route in `apps/web/src/server/api.ts`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** `POST /api/stripe/portal` responds.

- [ ] P0-BILLING-5.3 (AGENT): Add authentication check — only organization admins can access.
  **File(s):** `apps/web/src/routes/api/stripe/portal.ts`
  **Verification:** Unauthenticated requests return 401.

- [ ] P0-BILLING-5.4 (HUMAN): Test portal session creation, open portal URL, verify self‑service functionality. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑BILLING group are covered.*

---