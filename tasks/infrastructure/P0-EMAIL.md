# tasks/infrastructure/P0-EMAIL.md – Email Delivery (Resend)

This file covers Cloudflare Queue setup with producer/consumer bindings and dead‑letter queue (DLQ) configuration, the `enqueueEmail()` helper for server‑side email dispatching, Resend sending domain configuration with SPF/DKIM/DMARC DNS records, transactional email subdomain setup, a React Email‑based transactional template system with variable injection, and bounce/complaint webhook handling with Svix signature verification. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑EMAIL (2026‑05‑06)

### 1. Resend SDK — Latest Version & Workers Compatibility

**Latest version**: Resend Node.js SDK **v6.10.0** — available on npm as `resend`. The SDK is the official client for the Resend API and supports Node.js 18+. It provides `resend.emails.send()` for sending individual emails, with support for plain text, HTML, and React Email templates through the `react` property.

**Cloudflare Workers support**: Since v6.9.2 (February 10, 2026), the SDK includes "fix: support for Cloudflare Workers, and other non‑Node environments." The official Cloudflare Workers tutorial demonstrates the pattern: install `resend` from npm, import `{ Resend }` in the Worker, instantiate with the API key from environment, and call `resend.emails.send()`.

**API key security**: API keys must be stored as Cloudflare secrets (`wrangler secret put RESEND_API_KEY`), never in source code or `wrangler.jsonc` vars. The key is accessed via `env.RESEND_API_KEY` in the Worker handler.

**React Email integration**: Resend natively supports React Email templates. Pass a React component to the `react` property: `resend.emails.send({ from, to, subject, react: <EmailTemplate firstName="John" product="MyApp" /> })`. For `.ts` files without JSX transpilation, use `import { jsx } from 'react/jsx-runtime'` and `jsx(EmailTemplate, { ... })`.

**Rate limits**: Resend has a default rate limit of **2 requests per second**. Cloudflare Queues can batch messages (using `max_batch_size: 2`) to respect this limit — processing exactly two emails per batch, matching Resend's per‑second limit. Additional rate limits apply for the free tier: 100 emails/day, 3,000/month.

### 2. Cloudflare Queues — Configuration & Dead Letter Queues

**Free plan availability**: As of February 4, 2026, Cloudflare Queues is available on the **Workers Free plan** with 10,000 operations per day across reads, writes, and deletes. The Paid plan removes these limits and charges per operation.

**Wrangler configuration**: Queues are configured in `wrangler.jsonc` using two binding types:
- **Producer binding**: `[[queues.producers]]` with `queue` (name) and `binding` (JS variable name). Allows the Worker to send messages to the queue.
- **Consumer binding**: `[[queues.consumers]]` with `queue`, `max_batch_size`, `max_batch_timeout`, `max_retries`, `dead_letter_queue`. The consumer Worker receives batches of messages and processes them.

**Dead Letter Queue (DLQ)**: Defined within the consumer configuration. If a message fails after `max_retries` attempts (default: 3), it is moved to the DLQ. Without a DLQ, failed messages are permanently deleted. Messages in a DLQ persist for **4 days** without an active consumer, after which they are automatically deleted.

**Email‑specific configuration**: For Resend with its 2 req/s rate limit, the recommended consumer configuration is `max_batch_size: 2` — processing exactly two emails per batch.

**Local development**: Queues can be tested locally with `wrangler dev --local`. Messages are stored in `.wrangler/state/`. The `wrangler tail` command inspects queue messages in real time.

**JSONC format** (for `wrangler.jsonc`):
```jsonc
{
  "queues": {
    "producers": [
      { "queue": "email-queue", "binding": "EMAIL_QUEUE" }
    ],
    "consumers": [
      {
        "queue": "email-queue",
        "max_batch_size": 2,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "email-queue-dlq"
      }
    ]
  }
}
```

### 3. Cloudflare Email Service — Alternative to Resend (Noted)

Cloudflare launched its own **Email Service** into public beta on April 16, 2026. It provides a native Workers binding (`send_email`) that sends transactional emails without API keys — authentication is handled automatically via the Cloudflare domain. SPF, DKIM, and DMARC records are automatically configured when adding a domain. This is a potential future alternative to Resend that would eliminate external API key management, but it is still in beta and less mature than Resend. For Phase 0, Resend remains the recommended choice.

### 4. React Email 6.0 — Template System

React Email 6.0 was released in April 2026 (latest: `react-email@6.0.3` as of April 28, 2026). Key changes:
- **Unified package**: All components import from a single `react-email` package (no more `@react-email/components`, `@react-email/render`, etc.)
- **Visual editor**: Open‑source visual editor embeddable in your own application
- **Template collection**: Ready‑to‑use authentication and e‑commerce email sequences
- **2M weekly npm downloads**, 196 open source contributors

For UBOS, templates are built as React components using `react-email` and passed to Resend's `react` property for rendering.

### 5. SPF, DKIM, DMARC — 2026 Requirements

In 2026, DMARC is **"no longer optional"**. The standard approach: start with `p=none` to monitor traffic without blocking, then progress to `p=quarantine` (send to spam) and eventually `p=reject` (block entirely). DKIM keys should use **2048‑bit** (1024‑bit is deprecated in practice). SPF records must list all authorized senders. BIMI (Brand Indicators for Message Identification) is emerging as a trust signal.

Resend provides DNS records for domain verification through their dashboard: DKIM, SPF, and DMARC records that you add to your Cloudflare DNS. Once verified, you can send from your own domain.

### 6. Resend Webhooks — Bounce & Complaint Handling

Resend uses **Svix** for webhook signature verification. Each webhook request includes three headers: `svix-id` (unique message identifier), `svix-timestamp`, and `svix-signature`. Verification uses `resend.webhooks.verify({ payload, headers, webhookSecret })` or the `svix` npm package directly.

**Critical implementation detail**: The raw request body must be used for verification. "Some frameworks parse the request as JSON and then stringify it, and this will also break the signature verification."

**Event types**: Resend supports 15+ webhook event types. The most important for transactional email are:
- `email.delivered` — confirmation of successful delivery
- `email.bounced` — permanent (hard bounce: invalid address) or temporary (soft bounce)
- `email.complained` — recipient marked as spam (critical for sender reputation)

**Retry schedule**: If the webhook endpoint does not return 200, Resend retries at: 5s, 5min, 30min, 2h, 5h, 10h.

**Duplicate handling**: Use the `svix-id` header as an idempotency key — store processed IDs and skip duplicates.

**Webhook secret**: Available on the webhook details page in the Resend dashboard. Store as `RESEND_WEBHOOK_SECRET` via `wrangler secret put`.

---

## Task Definitions

### [ ] P0-EMAIL-0: Create `email-queue` Cloudflare Queue with consumer Worker that dequeues and sends via Resend

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No Cloudflare Queue exists for email delivery. There is no queue producer binding, no consumer Worker, and no dead‑letter queue. All email‑sending code would need to call Resend directly, creating tight coupling and risking rate‑limit failures. Cloudflare Queues requires a Workers Paid plan (or Free plan with limits). The Queues feature must be enabled in the Cloudflare dashboard before configuration.
**Size:** Large

**Description:**
Create the complete email delivery pipeline using Cloudflare Queues as the message broker between the application and Resend. This is the foundational infrastructure — all email‑sending code must enqueue messages rather than calling Resend directly.

**(a) Enable Queues**: In the Cloudflare Dashboard, navigate to Workers → Queues and enable the feature (requires Workers Paid plan for production volumes; Free plan includes 10,000 operations/day for development).

**(b) Create two queues**: `email-queue` (primary processing queue) and `email-queue-dlq` (dead‑letter queue for failed deliveries). Create via dashboard or CLI: `wrangler queues create email-queue` and `wrangler queues create email-queue-dlq`.

**(c) Wrangler configuration**: Update `apps/web/wrangler.jsonc` with both producer and consumer bindings:
```jsonc
{
  "queues": {
    "producers": [
      { "queue": "email-queue", "binding": "EMAIL_QUEUE" }
    ],
    "consumers": [
      {
        "queue": "email-queue",
        "max_batch_size": 2,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "email-queue-dlq"
      }
    ]
  }
}
```

**(d) Consumer Worker**: Create `apps/web/src/server/email/queue-consumer.ts` with a `queue()` handler that:
- Receives batches of messages (up to `max_batch_size: 2` per batch, matching Resend's 2 req/s rate limit)
- For each message, instantiates the Resend client and calls `resend.emails.send()` with the message payload
- On success: acknowledges the message (implicit — no `retryAll()` call)
- On failure: calls `batch.retryAll()` to requeue the message for retry (up to `max_retries: 3`)
- Logs delivery status to the structured logger (P0‑OBS‑2) with email ID, recipient, and status

**(e) Message format**: Define a Zod schema for email messages enqueued to the queue:
```typescript
const EmailMessageSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  react: z.any().optional(),  // React Email component (serialized)
  html: z.string().optional(),
  text: z.string().optional(),
  from: z.string().default("UBOS <noreply@ubos.app>"),
  replyTo: z.string().optional(),
  tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});
```

**(f) Environment variables**: Add `RESEND_API_KEY` as a secret via `wrangler secret put RESEND_API_KEY`. Reference it in the consumer Worker via `env.RESEND_API_KEY`. Note that Cloudflare Queues is separate from Inngest — Queues handle the immediate delivery pipeline, while Inngest (P0‑INNGEST) handles durable workflow orchestration.

**Research Findings (2026‑05‑06):**
- Cloudflare Queues free plan: 10,000 operations/day, available since February 4, 2026
- Resend rate limit: 2 requests/second — `max_batch_size: 2` matches this exactly
- DLQ messages persist for 4 days without consumer; after 3 retries, messages are sent to DLQ
- Resend SDK v6.10.0 is Workers‑compatible since v6.9.2
- API keys must be stored as Cloudflare secrets, never in `wrangler.jsonc` vars
- `batch.retryAll()` is the standard method to requeue failed messages
- Queues must be enabled in Cloudflare Dashboard before use

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc exists)

**Blocks:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0a` (enqueue helper)
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-1` (Resend domain setup)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-8` (email verification)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-9` (password reset)

**Related Files:**
- `apps/web/wrangler.jsonc` (queue bindings)
- `apps/web/src/server/email/queue-consumer.ts` (new)
- `apps/web/src/server/email/types.ts` (new — Zod schemas for messages)
- `apps/web/package.json` (add `resend` dependency)
- `pnpm-workspace.yaml` (add `resend` to catalog)

**Definition of Done**
- [ ] Cloudflare Queues enabled in dashboard
- [ ] `email-queue` and `email-queue-dlq` created via CLI or dashboard
- [ ] `wrangler.jsonc` updated with producer and consumer bindings
- [ ] `resend` ^6.10.0 installed as dependency, added to `pnpm-workspace.yaml` catalog
- [ ] `RESEND_API_KEY` set as secret via `wrangler secret put`
- [ ] `apps/web/src/server/email/queue-consumer.ts` created with `queue()` handler
- [ ] Consumer dequeues messages, sends via Resend, retries on failure, sends to DLQ after 3 retries
- [ ] Zod message schema defined in `types.ts`
- [ ] Manual test: enqueue a test message, verify email received via Resend
- [ ] `wrangler tail` shows queue processing logs
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Email template rendering (P0‑EMAIL‑3)
- Bounce/complaint webhook handling (P0‑EMAIL‑4)
- Cloudflare Email Service as alternative sender (Phase 2+)
- Queue monitoring dashboard (comes with Cloudflare dashboard)

**Rules to Follow**
- Never store the Resend API key in `wrangler.jsonc` or source code — always use `wrangler secret put`.
- The consumer Worker must never throw unhandled errors — always catch and either `retryAll()` or acknowledge.
- `max_batch_size: 2` is intentional to match Resend's 2 req/s rate limit.
- Each message in a batch must be processed independently — one failure should not block others.
- The queue consumer must be the **only** code path that calls Resend directly — all other code enqueues.

**Verification**
```bash
# Verify queues exist
wrangler queues list

# Verify bindings in wrangler.jsonc
cat apps/web/wrangler.jsonc | grep -E "email-queue|EMAIL_QUEUE"

# Start dev server with queue processing
cd apps/web && wrangler dev --local

# Enqueue a test message via producer binding
# (manual test via a temporary route)
curl -X POST http://localhost:8787/test-enqueue \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","text":"Hello"}'

# Verify email received (check Resend dashboard)
# Verify queue processing logs
wrangler tail

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an application developer, I want to enqueue an email message and have it reliably delivered even if the Resend API is temporarily unavailable.
- Deep Module: The queue consumer encapsulates the complexity of Resend rate‑limiting, retry logic, and dead‑letter handling behind a simple message format, making email delivery a fire‑and‑forget operation for the rest of the application.

---

#### Subtasks

- [ ] P0-EMAIL-0.0.25 (AGENT): Read current `apps/web/wrangler.jsonc` from P0‑SHELL‑2. Research Cloudflare Queues configuration, Resend SDK API, and the queue‑consumer pattern.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-EMAIL-0.0.5 (AGENT): Research Resend rate limits, `retryAll()` behavior, DLQ message persistence, and Queues Free plan operations limit.
  **Verification:** Rate limits and limits documented.

- [ ] P0-EMAIL-0.1 (AGENT): Enable Cloudflare Queues in dashboard and create `email-queue` and `email-queue-dlq`.
  **Verification:** Queues visible via `wrangler queues list`.

- [ ] P0-EMAIL-0.2 (AGENT): Add `resend` ^6.10.0 to `pnpm-workspace.yaml` catalog and install.
  **File(s):** `pnpm-workspace.yaml`, `apps/web/package.json`
  **Verification:** `pnpm ls resend` shows installed.

- [ ] P0-EMAIL-0.3 (AGENT): Update `wrangler.jsonc` with producer and consumer bindings for `EMAIL_QUEUE`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Bindings present with `max_batch_size: 2`, `max_retries: 3`, `dead_letter_queue`.

- [ ] P0-EMAIL-0.4 (AGENT): Create `apps/web/src/server/email/types.ts` with Zod email message schema.
  **File(s):** `apps/web/src/server/email/types.ts` (new)
  **Verification:** Schema validates email messages.

- [ ] P0-EMAIL-0.5 (AGENT): Create `apps/web/src/server/email/queue-consumer.ts` with `queue()` handler, Resend integration, retry logic, and structured logging.
  **File(s):** `apps/web/src/server/email/queue-consumer.ts` (new)
  **Verification:** Consumer processes messages, sends emails, retries on failure.

- [ ] P0-EMAIL-0.6 (AGENT): Set `RESEND_API_KEY` secret via `wrangler secret put`.
  **Verification:** Secret visible via `wrangler secret list`.

- [ ] P0-EMAIL-0.7 (HUMAN): Test end‑to‑end: enqueue message → consumer processes → email received → DLQ behavior on repeated failure. Approve.
  **Verification:** Approved.

---

### [ ] P0-EMAIL-0a: Build `enqueueEmail()` helper used by all server‑side email paths

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No `enqueueEmail()` helper exists. Server‑side code that needs to send email (auth verification, password reset, welcome emails) has no unified entry point. Each email‑sending code path would need to manually construct the message and interact with the queue producer binding, leading to code duplication and inconsistency.
**Size:** Small

**Description:**
Create `apps/web/src/server/email/enqueue.ts` exporting a single `enqueueEmail()` function that is the **sole entry point** for sending emails from server‑side code. All email paths (auth verification, password reset, welcome emails, notifications) call this function rather than interacting with the queue or Resend directly.

**Function signature**:
```typescript
async function enqueueEmail(
  email: z.infer<typeof EmailMessageSchema>
): Promise<void>
```

**Implementation**:
- Validates the email message against the `EmailMessageSchema` Zod schema from P0‑EMAIL‑0
- Sends the validated message to the `EMAIL_QUEUE` via the producer binding (`env.EMAIL_QUEUE.send(message)`)
- Optionally applies a delivery delay (`delaySeconds`) for time‑sensitive emails (e.g., "send welcome email 10 seconds after signup" allows auth DB write to propagate)
- Catches errors gracefully — if the queue send fails, logs an error to the structured logger (P0‑OBS‑2) but does **not** throw (fire‑and‑forget semantics)
- Is fully typed with the Zod schema

**Why fire‑and‑forget?** Email sending should never block the user‑facing request. If the queue is temporarily unavailable, the worst case is a missed email (logged and alertable), not a failed signup or transaction.

**Integration pattern**: All server‑side code imports `enqueueEmail` from this module. The function encapsulates the queue producer binding and message format, making the rest of the application unaware of Cloudflare Queues internals.

**Research Findings (2026‑05‑06):**
- Cloudflare Queues producer: `env.EMAIL_QUEUE.send(message, { delaySeconds })` to enqueue with optional delay
- Message format uses Zod schema defined in `types.ts`
- Fire‑and‑forget is the recommended pattern for transactional email — email delivery should not be in the critical path of user‑facing requests
- `delaySeconds` can be used for brief propagation delays (e.g., waiting for DB write to replicate)

**Depends on:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0` (queue created, bindings configured)

**Blocks:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-8` (email verification uses `enqueueEmail`)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-4` (welcome email uses `enqueueEmail`)

**Related Files:**
- `apps/web/src/server/email/enqueue.ts` (new)
- `apps/web/src/server/email/types.ts` (reference — from P0‑EMAIL‑0)

**Definition of Done**
- [ ] `apps/web/src/server/email/enqueue.ts` created with `enqueueEmail()` function
- [ ] Function validates input against `EmailMessageSchema`
- [ ] Function sends to `EMAIL_QUEUE` via producer binding
- [ ] Function supports optional `delaySeconds` for scheduled delivery
- [ ] Function catches errors, logs to structured logger, and never throws
- [ ] Function exported as the sole email‑sending entry point
- [ ] JSDoc comment documents usage, parameters, error handling
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Template rendering within `enqueueEmail` — callers are responsible for passing a rendered message
- Retry logic within the helper — the queue consumer handles retries
- Inngest integration — Inngest functions call `enqueueEmail`, not the reverse

**Rules to Follow**
- `enqueueEmail()` must never throw — always catch errors and log.
- The function must be the only code path that interacts with the queue producer binding.
- Never call Resend directly from `enqueueEmail` — only enqueue to the queue.
- Input validation must use the same Zod schema as the consumer for consistency.

**Verification**
```bash
# Test enqueue from a server‑side route
curl -X POST http://localhost:8787/api/test-enqueue \
  -d '{"to":"test@ubos.app","subject":"Test","text":"Hello"}'
# Verify: message appears in queue (wrangler tail)
# Verify: email delivered via Resend

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: `enqueueEmail()` hides the complexity of queue producer binding, message validation, and error handling behind a single function call, making email sending a one‑line operation for any server‑side code path.

---

#### Subtasks

- [ ] P0-EMAIL-0a.0.25 (AGENT): Read P0‑EMAIL‑0 output (types.ts, queue consumer). Research Cloudflare Queues producer API.
  **Verification:** Producer API understood.

- [ ] P0-EMAIL-0a.1 (AGENT): Create `apps/web/src/server/email/enqueue.ts` with `enqueueEmail()` function.
  **File(s):** `apps/web/src/server/email/enqueue.ts` (new)
  **Verification:** Function compiles; enqueues validated messages.

- [ ] P0-EMAIL-0a.2 (AGENT): Test: call `enqueueEmail()` from a server route, verify message appears in queue and email delivered.
  **Verification:** End‑to‑end test passes.

- [ ] P0-EMAIL-0a.3 (HUMAN): Review helper API, error handling, and approve.
  **Verification:** Approved.

---

### [ ] P0-EMAIL-0b: Configure dead‑letter queue for failed email deliveries after 3 retries

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The `email-queue-dlq` queue is created in P0‑EMAIL‑0 but its consumer is not yet implemented. Messages that fail after 3 retries are moved to the DLQ but sit there unprocessed. Without a DLQ consumer, failed email deliveries are invisible — there is no alerting, no manual review capability, and no way to investigate why emails are failing.
**Size:** Small

**Description:**
Implement a DLQ consumer Worker that processes messages from `email-queue-dlq` for observability and alerting. The DLQ consumer:

**(a) DLQ Consumer binding**: Add a consumer binding for `email-queue-dlq` in `wrangler.jsonc` (separate from the main queue consumer; can be in the same Worker with an additional `[[queues.consumers]]` entry).

**(b) DLQ consumer handler**: Extend `apps/web/src/server/email/queue-consumer.ts` to include a handler for the DLQ. The DLQ handler:
- Reads each message from the DLQ
- Logs the full failed message to the structured logger at `error` level (P0‑OBS‑2)
- Includes the delivery attempt count (from message metadata) and any Resend API error responses
- Writes failure metrics to Workers Analytics Engine (via existing RUM/OBS infrastructure)
- Does **not** attempt to resend the email (it has already failed after 3 retries)
- Acknowledges the message (removes it from DLQ)

**(c) Monitoring**: Create a Sentry alert or dashboard widget that monitors DLQ depth. If more than 5 messages accumulate in the DLQ within 15 minutes, trigger an alert via Sentry (P0‑OBS‑1).

**(d) Manual replay capability**: Document how to manually resend a DLQ message: inspect the logged message payload, fix the underlying issue (e.g., invalid email address), and re‑enqueue via `enqueueEmail()`.

**Research Findings (2026‑05‑06):**
- DLQ messages persist for 4 days without an active consumer — they must be consumed and acknowledged to be removed
- The DLQ consumer is a separate `queue()` handler for the DLQ binding
- DLQ processing should be read‑only — log, alert, acknowledge, but never auto‑resend
- Multiple consumer bindings can coexist in a single Wrangler configuration
- Messages in DLQ retain their original payload and metadata

**Depends on:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0` (queues created)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/wrangler.jsonc` (add DLQ consumer binding)
- `apps/web/src/server/email/queue-consumer.ts` (extend with DLQ handler)

**Definition of Done**
- [ ] DLQ consumer binding added to `wrangler.jsonc` for `email-queue-dlq`
- [ ] DLQ handler added to `queue-consumer.ts`: logs failed messages at `error` level, acknowledges messages
- [ ] Failed message payload includes original email content, attempt count, and Resend error details
- [ ] Sentry alert configured for DLQ depth > 5 messages in 15 minutes
- [ ] Manual replay procedure documented in `docs/operations/email-dlq.md`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Automatic DLQ replay (manual review is intentional for email failures)
- DLQ dashboard (deferred; covered by Sentry alerting and structured logs)
- DLQ message analytics beyond basic metrics

**Rules to Follow**
- The DLQ consumer must never automatically resend failed emails — manual review is required to avoid re‑sending to invalid addresses and damaging sender reputation.
- All DLQ messages must be acknowledged (removed from DLQ) after logging — do not leave them in the queue.
- DLQ processing must be lightweight — no external API calls, just logging and alerting.

**Verification**
```bash
# Trigger DLQ message: enqueue an email to an invalid address
# (or force a Resend API error)
# Wait for 3 retries to exhaust
# Verify DLQ consumer logs the failed message
wrangler tail | grep "DLQ"

# Verify Sentry alert fires for DLQ depth
# Manual: check Sentry dashboard for alert

ls docs/operations/email-dlq.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an operations engineer, I want to be alerted when emails are failing delivery so that I can investigate and fix the underlying issue before customers notice.

---

#### Subtasks

- [ ] P0-EMAIL-0b.0.25 (AGENT): Read P0‑EMAIL‑0 output. Research DLQ consumer patterns and Cloudflare Queues DLQ behavior.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-EMAIL-0b.1 (AGENT): Add DLQ consumer binding for `email-queue-dlq` in `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Binding present.

- [ ] P0-EMAIL-0b.2 (AGENT): Extend `queue-consumer.ts` with DLQ handler that logs and acknowledges failed messages.
  **File(s):** `apps/web/src/server/email/queue-consumer.ts`
  **Verification:** DLQ messages logged and acknowledged.

- [ ] P0-EMAIL-0b.3 (AGENT): Configure Sentry alert for DLQ depth threshold.
  **File(s):** Sentry dashboard (external configuration)
  **Verification:** Alert fires when DLQ exceeds threshold.

- [ ] P0-EMAIL-0b.4 (AGENT): Write `docs/operations/email-dlq.md` documenting manual replay procedure.
  **File(s):** `docs/operations/email-dlq.md` (new)
  **Verification:** Document covers replay procedure.

- [ ] P0-EMAIL-0b.5 (HUMAN): Test DLQ flow: force email failure, verify logging, alerting, and manual replay docs. Approve.
  **Verification:** Approved.

---

### [ ] P0-EMAIL-1: Configure Resend sending domain with SPF, DKIM, DMARC DNS records

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🔴 Critical
**Current State:** No sending domain is configured in Resend. Emails cannot be sent from a custom domain (`@ubos.app` or similar) because no DNS records (SPF, DKIM, DMARC) are configured. The Resend API key exists (from P0‑EMAIL‑0) but the domain verification step has not been completed.
**Size:** Small

**Description:**
Configure the UBOS sending domain in Resend and add the required DNS records to Cloudflare DNS for email authentication. This task involves both Resend dashboard configuration (agent‑assisted) and DNS record creation (human review).

**(a) Domain addition**: In the Resend Dashboard (Domains → Add Domain), enter the sending domain (e.g., `ubos.app` or a subdomain like `mail.ubos.app`). Select a region. Resend will provide three types of DNS records: DKIM (public key for signing outgoing emails), SPF (authorizes Resend as a sender), and DMARC (policy for handling authentication failures).

**(b) DNS records in Cloudflare**: Navigate to Cloudflare Dashboard → DNS → Records. Add the DNS records provided by Resend:
- **DKIM**: TXT record with `resend._domainkey` hostname and the public key value
- **SPF**: TXT record with `v=spf1 include:spf.resend.com ~all`
- **DMARC**: TXT record with `v=DMARC1; p=none; rua=mailto:dmarc@ubos.app` (start with `p=none` for monitoring, then progress to `p=quarantine` or `p=reject`)

**(c) Verification**: Click "Verify DNS Records" in Resend. Wait for DNS propagation (usually under 5 minutes, can take up to 48 hours in rare cases). Once verified, the domain status changes to **Verified** and emails can be sent from this domain.

**(d) Sender identity**: Configure the default sender identity: `"UBOS <noreply@ubos.app>"`. This is used by `enqueueEmail()` when no explicit `from` address is provided.

**(e) Resend client configuration**: Create `apps/web/src/server/email/resend.ts` that exports a configured Resend client singleton from the environment API key. The client is imported by the queue consumer. This provides a single point of configuration for Resend authentication.

**Research Findings (2026‑05‑06):**
- DMARC `p=none` is the recommended starting policy — monitor, don't block
- DKIM keys should be 2048‑bit (1024‑bit is deprecated)
- Resend provides exact DNS records through their domain verification UI
- DNS propagation takes 5–30 minutes typically
- Resend free tier: 100 emails/day, 3,000/month
- Cloudflare Dashboard → DNS → Records is the standard place to add these records

**Depends on:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0` (Resend dependency installed)

**Blocks:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-2` (subdomain setup)
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-3` (template testing)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-4` (welcome email delivery)

**Related Files:**
- `apps/web/src/server/email/resend.ts` (new — configured Resend client singleton)
- DNS records in Cloudflare dashboard (external)

**Definition of Done**
- [ ] Sending domain added in Resend Dashboard
- [ ] DKIM DNS record added to Cloudflare (TXT, `resend._domainkey`)
- [ ] SPF DNS record added to Cloudflare (TXT, includes `spf.resend.com`)
- [ ] DMARC DNS record added to Cloudflare (TXT, `p=none` monitoring policy)
- [ ] Domain verified in Resend (status: Verified)
- [ ] `apps/web/src/server/email/resend.ts` created with singleton Resend client from `RESEND_API_KEY`
- [ ] Test email sent from `noreply@ubos.app` and received successfully
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- BIMI record configuration (optional brand trust signal, Phase 2)
- Custom tracking domain (Phase 2)
- Multiple sending domains (Phase 2)

**Rules to Follow**
- DMARC must start with `p=none` to avoid blocking legitimate emails.
- Never share Resend API keys or webhook secrets in documentation or logs.
- DNS changes are HUMAN actor — agent provides exact records, human reviews and adds them.
- The DKIM key must be exactly as provided by Resend — do not modify the value.

**Verification**
```bash
# Check DNS records
dig TXT resend._domainkey.ubos.app
dig TXT ubos.app | grep spf
dig TXT _dmarc.ubos.app

# Verify domain in Resend Dashboard
# Manual: Domains page → status should be "Verified"

# Send test email
curl -X POST http://localhost:3000/api/test-email \
  -H "Authorization: Bearer ..." \
  -d '{"to":"test@example.com","subject":"DNS Test","text":"Test"}'
# Expected: email delivered from noreply@ubos.app

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a system administrator, I want emails from UBOS to be authenticated with SPF, DKIM, and DMARC so that they are delivered to recipients' inboxes and not flagged as spam.

---

#### Subtasks

- [ ] P0-EMAIL-1.0.25 (AGENT): Research Resend domain verification process, required DNS records, and DMARC policy recommendations for 2026.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-EMAIL-1.0.5 (AGENT): Prepare exact DNS records based on Resend Dashboard output. Document them for human review.
  **Verification:** DNS records prepared.

- [ ] P0-EMAIL-1.1 (AGENT): Create `apps/web/src/server/email/resend.ts` with singleton Resend client.
  **File(s):** `apps/web/src/server/email/resend.ts` (new)
  **Verification:** Client compiles; reads API key from environment.

- [ ] P0-EMAIL-1.2 (HUMAN): Add domain in Resend Dashboard, copy DNS records, add to Cloudflare DNS, verify domain. Approve.
  **Verification:** Domain status "Verified" in Resend.

- [ ] P0-EMAIL-1.3 (AGENT): Update `queue-consumer.ts` to import Resend client from `resend.ts` instead of instantiating directly.
  **File(s):** `apps/web/src/server/email/queue-consumer.ts`
  **Verification:** Consumer uses singleton client.

- [ ] P0-EMAIL-1.4 (HUMAN): Send test email, verify delivery from custom domain. Approve.
  **Verification:** Approved.

---

### [ ] P0-EMAIL-2: Set up transactional email subdomain (e.g., mail.ubos.app)

**Status:** ⏳ Not Started
**Actor:** MIXED
**Priority:** 🟡 Medium
**Current State:** The sending domain from P0‑EMAIL‑1 uses the root domain (e.g., `ubos.app`). For better deliverability and domain reputation isolation, transactional emails should be sent from a dedicated subdomain (e.g., `mail.ubos.app`). This separates transactional email reputation from marketing email reputation and the main domain's reputation.
**Size:** Small

**Description:**
Set up a dedicated subdomain for transactional email to isolate email reputation from the main domain. This follows the 2026 best practice of separating transactional and marketing sending streams.

**(a) Subdomain choice**: Use `mail.ubos.app` (or equivalent). This is a common convention for transactional email.

**(b) DNS records**: Add the same DNS records from P0‑EMAIL‑1 but for the subdomain: DKIM (`resend._domainkey.mail`), SPF (include `spf.resend.com`), and DMARC (`_dmarc.mail`). Since this is a subdomain, the DMARC policy can be more aggressive (`p=reject`) without affecting the root domain's email deliverability.

**(c) Resend verification**: Add the subdomain in Resend Dashboard, add the DNS records, and verify.

**(d) Default `from` address**: Update the default sender in `enqueueEmail()` to use `"UBOS <noreply@mail.ubos.app>"`.

**(e) `replyTo` configuration**: Transactional emails (password reset, email verification) should include a `replyTo` address that routes to a human‑monitored inbox or a dedicated support address.

**Research Findings (2026‑05‑06):**
- Subdomain isolation is a 2026 best practice for email deliverability
- Transactional subdomain: `mail.ubos.app` for password resets, verification emails, notifications
- DMARC on subdomain can use stricter policies without affecting root domain
- Cloudflare Email Routing could route replies from the subdomain to a support Worker or inbox

**Depends on:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-1` (root domain verified)

**Blocks:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-3` (templates use subdomain)

**Related Files:**
- `apps/web/src/server/email/resend.ts` (update default `from` address)
- DNS records in Cloudflare dashboard (external)

**Definition of Done**
- [ ] Subdomain (e.g., `mail.ubos.app`) verified in Resend
- [ ] DKIM, SPF, DMARC records configured for subdomain
- [ ] Default sender updated to `noreply@mail.ubos.app`
- [ ] `replyTo` configured for transactional email paths
- [ ] Test email sent from subdomain and delivered
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Marketing email subdomain (separate concern, Phase 2+)
- Inbound email handling (Cloudflare Email Routing, Phase 2+)

**Rules to Follow**
- Subdomain DMARC can be stricter than root domain — advantage of subdomain isolation.
- Never use the same subdomain for transactional and marketing email.
- `replyTo` should route to a monitored address, not a noreply address.

**Verification**
```bash
# Verify subdomain DNS
dig TXT resend._domainkey.mail.ubos.app
dig TXT mail.ubos.app | grep spf

# Verify in Resend Dashboard
# Manual: Domains page → subdomain status "Verified"

# Send test email from subdomain
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (DNS configuration)

---

#### Subtasks

- [ ] P0-EMAIL-2.0.25 (AGENT): Research subdomain isolation best practices for transactional email deliverability in 2026.
  **Verification:** Research documented.

- [ ] P0-EMAIL-2.1 (HUMAN): Add subdomain in Resend, add DNS records, verify. Approve.
  **Verification:** Subdomain verified.

- [ ] P0-EMAIL-2.2 (AGENT): Update default `from` and `replyTo` in `enqueue.ts` and `resend.ts`.
  **File(s):** `apps/web/src/server/email/enqueue.ts`, `apps/web/src/server/email/resend.ts`
  **Verification:** Default addresses use subdomain.

- [ ] P0-EMAIL-2.3 (HUMAN): Test email delivery from subdomain. Approve.
  **Verification:** Approved.

---

### [ ] P0-EMAIL-3: Build transactional email template system with variable injection

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No email templates exist. Email‑sending code must manually construct HTML strings, leading to inconsistent branding, missing dark‑mode support, and difficult maintenance. React Email 6.0 is available as the template engine, and Resend natively supports React Email components via the `react` property.
**Size:** Medium

**Description:**
Build a transactional email template system using React Email 6.0 and Resend's native React component support. Templates are React components that receive typed props and render HTML emails with UBOS branding.

**(a) Install React Email**: Add `react-email` ^6.0.0 to `apps/web/package.json` and `pnpm-workspace.yaml` catalog. React Email 6.0 (April 2026) provides a unified package — all components import from `react-email`.

**(b) Template components**: Create at minimum three templates:
- `apps/web/src/server/email/templates/welcome.tsx` — Welcome email with user's name, getting‑started links, and UBOS branding
- `apps/web/src/server/email/templates/verify-email.tsx` — Email verification with a verification link and expiration notice
- `apps/web/src/server/email/templates/reset-password.tsx` — Password reset with a reset link and security warning ("if you didn't request this...")

Each template:
- Accepts typed props (e.g., `{ name: string, verificationUrl: string }`)
- Uses React Email components for consistent styling and email client compatibility
- Includes UBOS branding (logo, colors)
- Supports dark mode via React Email's built‑in `@media (prefers-color-scheme: dark)`
- Renders correctly in major email clients (Gmail, Outlook, Apple Mail)

**(c) Template rendering utility**: Create `apps/web/src/server/email/render.ts` with `renderEmailTemplate(component, props)` that renders a React Email component to HTML using `@react-email/render`. This is called by `enqueueEmail()` (or the caller) to convert the React component into an HTML string before enqueuing to the queue.

**(d) Integration with `enqueueEmail()`**: Extend `enqueueEmail()` to accept a `react` property (React Email component) in addition to `html` and `text`. When `react` is provided, `enqueueEmail()` renders the template to HTML via `renderEmailTemplate()` before enqueuing. This allows callers to pass a React component directly.

**Research Findings (2026‑05‑06):**
- React Email 6.0 unified package: `import { Html, Button, Text, ... } from "react-email"`
- Resend natively passes React components via the `react` property
- For `.ts` files without JSX, use `jsx()` from `react/jsx-runtime`
- React Email 6.0 includes a visual editor, ready‑to‑use templates, and dark mode support

**Depends on:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-1` (sending domain verified)

**Blocks:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-8` (verification email template)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-9` (password reset email template)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-4` (welcome email template)

**Related Files:**
- `apps/web/src/server/email/templates/welcome.tsx` (new)
- `apps/web/src/server/email/templates/verify-email.tsx` (new)
- `apps/web/src/server/email/templates/reset-password.tsx` (new)
- `apps/web/src/server/email/render.ts` (new)
- `apps/web/package.json` (add `react-email`)

**Definition of Done**
- [ ] `react-email` ^6.0.3 installed and added to catalog
- [ ] Three template components created: welcome, verify‑email, reset‑password
- [ ] Each template accepts typed props and uses React Email components
- [ ] Templates include UBOS branding (logo, colors, footer)
- [ ] `render.ts` utility created with `renderEmailTemplate()` function
- [ ] Templates render correctly (tested via React Email preview server or sent to a test inbox)
- [ ] `enqueueEmail()` extended to accept `react` property
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Marketing email templates (separate concern, Phase 2+)
- Visual editor integration (React Email 6.0 feature — can be added later)
- Email template versioning and A/B testing
- Localization of templates

**Rules to Follow**
- Templates must be accessible — proper heading hierarchy, alt text for images, readable font sizes.
- Never embed sensitive data (passwords, full tokens) in email templates beyond what is necessary.
- Templates must render correctly without images (many email clients block images by default).
- All links must use HTTPS.
- Templates must include an unsubscribe footer (CAN‑SPAM compliance).

**Verification**
```bash
# Install and preview templates
npx react-email dev
# Open http://localhost:3001
# Preview each template with test props

# Send a test email using a template
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "template": "welcome",
    "props": { "name": "Test User" }
  }'
# Verify email received with correct rendering

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: Each template encapsulates its layout, styling, and responsive design behind typed React props, making email creation a simple component composition task rather than raw HTML string manipulation.

---

#### Subtasks

- [ ] P0-EMAIL-3.0.25 (AGENT): Research React Email 6.0 API, component library, and render utilities.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-EMAIL-3.0.5 (AGENT): Design template props interfaces for all three templates.
  **Verification:** Props documented.

- [ ] P0-EMAIL-3.1 (AGENT): Install `react-email` ^6.0.3, add to catalog.
  **File(s):** `apps/web/package.json`, `pnpm-workspace.yaml`
  **Verification:** `pnpm ls react-email` shows installed.

- [ ] P0-EMAIL-3.2 (AGENT): Create `welcome.tsx`, `verify-email.tsx`, `reset-password.tsx` templates.
  **File(s):** `apps/web/src/server/email/templates/*.tsx` (new)
  **Verification:** Templates compile and render via React Email preview.

- [ ] P0-EMAIL-3.3 (AGENT): Create `render.ts` with `renderEmailTemplate()` utility.
  **File(s):** `apps/web/src/server/email/render.ts` (new)
  **Verification:** Utility renders templates to HTML strings.

- [ ] P0-EMAIL-3.4 (AGENT): Extend `enqueueEmail()` to accept `react` property.
  **File(s):** `apps/web/src/server/email/enqueue.ts`
  **Verification:** React templates render and enqueue correctly.

- [ ] P0-EMAIL-3.5 (HUMAN): Test all three templates in major email clients (Gmail, Apple Mail). Approve.
  **Verification:** Approved.

---

### [ ] P0-EMAIL-4: Implement bounce and complaint webhook handling

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No webhook endpoint exists for Resend events. When emails bounce or recipients mark them as spam, there is no automated handling: hard‑bounced addresses are not suppressed from future sends, complaint spikes are not alerted, and delivery metrics are not tracked. This damages sender reputation and risks deliverability degradation.
**Size:** Small

**Description:**
Implement a webhook endpoint that receives Resend events and processes bounces and complaints. The endpoint must verify webhook signatures using Svix, distinguish between hard and soft bounces, suppress hard‑bounced addresses, and alert on complaint spikes.

**(a) Webhook endpoint**: Create `apps/web/src/routes/api/email/webhook.ts` — a Hono route handler for `POST /api/email/webhook`. The handler:
- Reads the raw request body (critical for signature verification — "Some frameworks parse the request as JSON and then stringify it, and this will also break the signature verification")
- Extracts the Svix headers: `svix-id`, `svix-timestamp`, `svix-signature`
- Verifies the webhook using `resend.webhooks.verify({ payload, headers, webhookSecret })`
- On verification failure: returns 400 with "Invalid webhook"
- On verification success: processes the event based on `event.type`

**(b) Event handling**:
- **`email.bounced`**: Check `bounce.type` — if `"Permanent"` (hard bounce), add the recipient to a suppression list (database table or KV store). If `"Transient"` (soft bounce), log and ignore (Resend retries automatically). Update per‑domain bounce counters.
- **`email.complained`**: Log at `warn` level. Increment complaint counter. If complaints exceed 0.1% of sent volume in a rolling 24h window (industry standard threshold), trigger a Sentry alert (P0‑OBS‑1).
- **`email.delivered`**: Log at `info` level for delivery tracking. Store delivery metrics.
- **Other events**: Log at `debug` level. Can be enriched later.

**(c) Suppression list**: For hard bounces, store the suppressed email in a database table (`email_suppressions`) with `email`, `reason`, `bounced_at`. All `enqueueEmail()` calls check the suppression list before enqueuing — if the recipient is suppressed, skip the email and log at `info` level. This prevents repeated sends to invalid addresses, protecting sender reputation.

**(d) Idempotency**: Use the `svix-id` header as an idempotency key. Store processed IDs in a database table (`webhook_events`) with a unique constraint on `svix_id`. On duplicate, return 200 (acknowledge receipt) without reprocessing.

**(e) Webhook secret**: Store `RESEND_WEBHOOK_SECRET` as a Cloudflare secret. The webhook signing secret is available on the webhook details page in the Resend dashboard.

**(f) Webhook registration**: After deploying the endpoint, register the production URL in the Resend Dashboard (Webhooks → Add Webhook). Select "All Events" to receive every event type. For development, use `resend webhooks listen` CLI or ngrok/VSCode port forwarding to test locally.

**Research Findings (2026‑05‑06):**
- Resend uses Svix for webhook signatures: `svix-id`, `svix-timestamp`, `svix-signature`
- Verification: `resend.webhooks.verify({ payload, headers, webhookSecret })` or manual via `@svix/webhook`
- Raw request body is critical — parsed‑then‑stringified bodies break verification
- `email.bounced` has `bounce.type`: `"Permanent"` (hard) or `"Transient"` (soft) with `bounce.subType` for details
- Complaint threshold: 0.1% complaint rate triggers Google/Yahoo spam filtering
- Deduplication via `svix-id` is essential — Resend provides at‑least‑once delivery and may retry
- Webhook retry schedule: 5s, 5min, 30min, 2h, 5h, 10h

**Depends on:**
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-1` (Resend domain configured)
- `tasks/infrastructure/P0-OBS.md → P0-OBS-1` (Sentry alerting)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/api/email/webhook.ts` (new)
- `apps/web/src/server/email/suppressions.ts` (new — suppression list logic)
- `packages/db/src/schema/email.ts` (new — email_suppressions and webhook_events tables)

**Definition of Done**
- [ ] `POST /api/email/webhook` route created with Svix signature verification
- [ ] Raw request body used for verification (not parsed JSON)
- [ ] `email.bounced` handler: hard bounces added to suppression list, soft bounces logged
- [ ] `email.complained` handler: complaint counter updated, Sentry alert on threshold breach
- [ ] `email.delivered` handler: delivery metric logged
- [ ] `email_suppressions` and `webhook_events` database tables created
- [ ] `enqueueEmail()` checks suppression list before enqueuing
- [ ] Webhook idempotency via `svix-id` (duplicate events acknowledged but not reprocessed)
- [ ] `RESEND_WEBHOOK_SECRET` set as Cloudflare secret
- [ ] Webhook registered in Resend Dashboard for production
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Webhook event replay UI (handled via Resend Dashboard)
- Delivery delay analytics (Phase 3)
- Inbound email webhooks (Phase 2+)

**Rules to Follow**
- The webhook endpoint must respond 200 quickly — do not perform synchronous heavy processing.
- Signature verification must use the raw body — the Hono route must read `req.text()` not `req.json()`.
- Never suppress an email address without a hard bounce — soft bounces are temporary.
- Complaint monitoring must use a rolling 24h window, not all‑time totals.

**Verification**
```bash
# Test local webhook endpoint (requires ngrok or similar tunnel)
npx resend webhooks listen

# Send an email to a known invalid address
# Wait for bounce event → verify webhook received
# Check suppression list: email added, reason recorded

# Send an email to the suppressed address
# Verify: email silently skipped, logged at info level

# Verify idempotency: resend the same webhook event
# Expected: 200 response, no duplicate processing

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a deliverability engineer, I want hard‑bounced email addresses automatically suppressed so that repeated sends to invalid addresses don't damage our sender reputation.
- Deep Module: The webhook handler encapsulates Svix signature verification, event type routing, and idempotency behind a single `POST` endpoint, making Resend event processing a simple consumer of verified, deduplicated events.

---

#### Subtasks

- [ ] P0-EMAIL-4.0.25 (AGENT): Research Resend webhook events, Svix signature verification, bounce/complaint handling best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-EMAIL-4.0.5 (AGENT): Design `email_suppressions` and `webhook_events` table schemas.
  **Verification:** Schemas designed.

- [ ] P0-EMAIL-4.1 (AGENT): Create `packages/db/src/schema/email.ts` with both tables and generate migration.
  **File(s):** `packages/db/src/schema/email.ts` (new), migration files
  **Verification:** Tables created.

- [ ] P0-EMAIL-4.2 (AGENT): Create `apps/web/src/server/email/suppressions.ts` with suppression list check and add logic.
  **File(s):** `apps/web/src/server/email/suppressions.ts` (new)
  **Verification:** Suppression check functional.

- [ ] P0-EMAIL-4.3 (AGENT): Create `apps/web/src/routes/api/email/webhook.ts` with signature verification and event routing.
  **File(s):** `apps/web/src/routes/api/email/webhook.ts` (new)
  **Verification:** Webhook verification works; events processed.

- [ ] P0-EMAIL-4.4 (AGENT): Integrate suppression check into `enqueueEmail()`.
  **File(s):** `apps/web/src/server/email/enqueue.ts`
  **Verification:** Suppressed addresses skipped.

- [ ] P0-EMAIL-4.5 (AGENT): Set `RESEND_WEBHOOK_SECRET` secret and register webhook in Resend Dashboard.
  **Verification:** Webhook registered; test event received.

- [ ] P0-EMAIL-4.6 (HUMAN): Test bounce handling, suppression, and complaint alerting. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑EMAIL group are covered.*

---
