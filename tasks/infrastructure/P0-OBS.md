# tasks/infrastructure/P0-OBS.md – Observability & Logging

This file covers Sentry error monitoring integration for Cloudflare Workers, structured JSON logging with correlation IDs, PII redaction for all log outputs, health check endpoints with dependency status, tRPC procedure timing and performance metrics, and real-user monitoring (Web Vitals) reporting. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑OBS (2026‑05‑06)

### Sentry for Cloudflare Workers

The `@sentry/cloudflare` SDK is the official Sentry offering for Workers. The architecture follows the `withSentry` wrapper pattern:

```typescript
import * as Sentry from "@sentry/cloudflare";
export default Sentry.withSentry(
  (env) => ({ dsn: env.SENTRY_DSN }),
  { async fetch(request, env, ctx) { /* handler */ } }
);
```

**Version target**: `^10.48.0` (2026‑04‑09) is the latest verified release adding `WorkerEntrypoint` instrumentation for fetch, scheduled, queue, and tail handlers. The TASKS.md reference to `@sentry/cloudflare@^10.48.0` remains accurate. The SDK also appeared on jsDelivr CDN with 10.48.0 as a version option.

**Critical setup requirements**:
- `nodejs_compat` compatibility flag is mandatory (Sentry needs `AsyncLocalStorage`)
- DSN should be set via `wrangler secret put SENTRY_DSN`, never hard‑coded in `wrangler.jsonc`
- Source maps: `upload_source_maps = true` in `wrangler.jsonc` + `SENTRY_AUTH_TOKEN` secret for automatic upload post‑deploy
- Release detection: add `CF_VERSION_METADATA` binding and the SDK auto‑detects the Worker version for release tracking
- PII filtering: use `beforeSend` hook to scrub sensitive data before events leave the local environment

**Alternative: OTLP export**. Cloudflare Workers can export traces and logs directly to Sentry via OTLP endpoints without any Sentry SDK code. This is configured in the Cloudflare dashboard under Workers Observability → Destinations. Separate endpoints exist for traces (`.../otlp/v1/traces`) and logs (`.../otlp/v1/logs`). This approach is less code‑invasive but offers less granular control compared to the SDK.

### Structured JSON Logging on Workers

Winston and Pino — the two dominant Node.js logging libraries — both face compatibility challenges on Cloudflare Workers. Pino's `pino/web` build has partial Workers support: `@maou-shonen/hono-pino` v0.12.0 reports that "for edge environments (e.g. Cloudflare Workers), some pino advanced features maybe not working". Winston similarly requires Node.js APIs unavailable in the Workers runtime, confirmed by the Cloudflare Developers community recommending `console.log`‑based approaches instead.

The 2026 consensus for Workers structured logging is straightforward: use `console.log()` with JSON objects, which Cloudflare Workers Logs automatically parses and indexes. The official Workers Logs docs demonstrate that `console.log({user_id: 123})` creates queryable fields, while `console.log("user_id: " + 123)` does not. Workers Logpush can then export these structured logs to Sentry, Datadog, or other external services via `logpush = true` in `wrangler.jsonc`.

**Recommended approach for UBOS**: Build a lightweight custom logger wrapper around `console.log(JSON.stringify({...}))` rather than adding a Pino/Winston dependency. The `workers-tagged-logger` package (v0.12.0) provides a reference pattern — it uses `AsyncLocalStorage` to attach context (requestId, userId, tenantId) to all logs within a request scope without passing a logger instance through every function call. Enable Workers Logs via the `observability` block in `wrangler.jsonc` and Workers Logpush for production log export.

### PII Redaction

Multiple layers of PII protection are industry standard in 2026. The approach recommended for UBOS:

1. **Logger‑level redaction**: A custom `redactor.ts` with regex patterns for common PII categories: emails (`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`), credit card numbers (Luhn‑validatable patterns), SSNs (`\d{3}-\d{2}-\d{4}`), phone numbers, and password/token fields. Applied as a sanitization function before any `console.log` call.

2. **Sentry `beforeSend` hook**: Last‑mile filtering before data leaves the infrastructure. The `beforeSend` callback receives the full event and can modify or drop it — this is the "last chance to decide not to send data or to edit it".

3. **Sentry Advanced Data Scrubbing**: Built‑in server‑side scrubbing for credit card numbers and other known PII patterns. This provides a safety net for any PII that passes through client‑side filters.

Key principle: scrub before logging, not just before sending to external services. "Secure Logging Practices — apply sanitization function before logs are written".

### Health Check Endpoints

The production‑grade health check pattern in 2026 validates each dependency independently with short timeouts and returns an aggregate status. Key design decisions:

- Each dependency check (DB, R2, Inngest, Stripe) runs in its own `try/catch` with a timeout under 2 seconds
- DB check uses `SELECT 1` with `statement_timeout` set to prevent hanging
- Aggregate response: HTTP 200 only if all dependencies healthy; HTTP 503 if any degraded
- Per‑dependency status included in the response body for debugging
- "Your health endpoint should respond in under 100ms" — if a dependency check takes 2 seconds the load balancer will time out

### tRPC Performance Monitoring

The canonical tRPC v11 timing middleware pattern captures `Date.now()` before `opts.next()` and after:

```typescript
const timingMiddleware = t.procedure.use(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  const durationMs = Date.now() - start;
  // log path, type, duration, success/failure
  return result;
});
```

This is confirmed across multiple 2026 sources. For batched requests, the `callIndex` feature (tRPC Issue #7096) enables per‑call tracing within a batch. Metrics can be written to Cloudflare Workers Analytics Engine via `writeDataPoint()` for time‑series visualization in Grafana.

### Real‑User Monitoring (Web Vitals)

The `web-vitals` library v5.1.0 (January 2026) is the Google‑maintained reference implementation, ~1‑2KB brotli'd. Provides measurement functions for all Core Web Vitals:

- `onLCP` — Largest Contentful Paint
- `onINP` — Interaction to Next Paint
- `onCLS` — Cumulative Layout Shift
- `onFCP` — First Contentful Paint
- `onTTFB` — Time to First Byte

The standard reporting pattern is to capture metrics on `visibilityState: hidden` (when the page is being navigated away from) and send to a backend endpoint. Metrics should be reported at p75, matching Google CrUX reporting methodology.

Cloudflare also offers built‑in RUM via Web Analytics, which collects Core Web Vitals automatically without any client‑side library. For UBOS, the custom `web-vitals` approach provides more control over what metrics are collected and where they are sent.

Core Web Vitals thresholds for 2026 remain unchanged: LCP < 2.0s, INP < 200ms, CLS < 0.08, FCP < 1.5s (as established in the P0‑MOB research).

---

## Task Definitions

### [ ] P0-OBS-1: Integrate error monitoring (Sentry) into server functions and router

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No error monitoring is integrated into the application. Uncaught exceptions in Cloudflare Workers, tRPC procedures, or the Hono API handler are silently lost after the invocation ends. Workers Logs (via `wrangler tail`) provide real‑time visibility during development but have no persistence for production debugging. The `@sentry/cloudflare` package is not installed.
**Size:** Medium

**Description:**
Integrate Sentry for error monitoring, distributed tracing, and log correlation in the Cloudflare Workers runtime. The integration has three components:

**(a) SDK Installation and Configuration**: Install `@sentry/cloudflare` at `^10.48.0`. Create `apps/web/src/server/instrumentation.ts` as the Sentry initialization module. Configure `Sentry.withSentry()` to wrap the Worker handler, reading DSN from `env.SENTRY_DSN` (set via `wrangler secret`). Configure `tracesSampleRate: 1.0` in staging, `0.1` (10%) in production. Enable `sendDefaultPii: false` (do not auto‑collect user IPs and headers). Set environment via `process.env.NODE_ENV`. Add release detection via `CF_VERSION_METADATA` binding.

**(b) Workers‑specific beforeSend filter**: Create a `beforeSend` hook that scrubs PII (emails, credit card patterns, SSNs, phone numbers, tokens) from error events and breadcrumbs before they leave the Workers environment. Reference the PII redaction patterns from P0‑OBS‑3. The `beforeSend` hook is the "last chance to decide not to send data or to edit it" and should filter sensitive headers, query parameters, and request bodies.

**(c) Source Maps**: Enable `upload_source_maps: true` in `wrangler.jsonc`. Add `SENTRY_AUTH_TOKEN` as a secret via `wrangler secret put`. Verify source maps appear in Sentry's Project Settings → Source Maps after deployment. This enables unminified stack traces in error reports.

**(d) Wrangler configuration**: Add `nodejs_compat` flag (already present from P0‑SHELL‑2). Add `CF_VERSION_METADATA` binding for automatic release detection. Add `logpush: true` to enable Workers Logpush export (can send to Sentry OTLP endpoints as a secondary logging path).

**Research Findings (2026‑05‑06):**
- `@sentry/cloudflare` v10.48.0 is latest confirmed version with WorkerEntrypoint support
- `nodejs_compat` is mandatory for `AsyncLocalStorage` API access
- DSN must be a secret, not in `wrangler.jsonc` vars
- Source maps via `upload_source_maps: true` + `SENTRY_AUTH_TOKEN` secret
- `beforeSend` is the standard hook for PII scrubbing
- OTLP export is available as an alternative or supplement to the SDK

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-5` (server entry response hardening)

**Blocks:**
- `tasks/infrastructure/P2-MON.md → P2-ONCALL-1` (on‑call alerting integration)

**Related Files:**
- `apps/web/src/server/instrumentation.ts` (new)
- `apps/web/src/entry-server.tsx` (wrap handler with Sentry)
- `apps/web/wrangler.jsonc` (add `upload_source_maps`, `CF_VERSION_METADATA`, `logpush`)
- `apps/web/package.json` (add `@sentry/cloudflare` dependency)
- `pnpm-workspace.yaml` (add to catalog)

**Definition of Done**
- [ ] `@sentry/cloudflare` ^10.48.0 installed and added to `pnpm-workspace.yaml` catalog
- [ ] `apps/web/src/server/instrumentation.ts` created with `Sentry.withSentry()` wrapper
- [ ] DSN set via `wrangler secret put SENTRY_DSN` — not hard‑coded
- [ ] `beforeSend` hook implemented: scrubs emails, credit cards, SSNs, phone numbers, tokens
- [ ] `sendDefaultPii: false` configured
- [ ] `tracesSampleRate` set to 1.0 (staging) / 0.1 (production)
- [ ] `upload_source_maps: true` in `wrangler.jsonc`; `SENTRY_AUTH_TOKEN` secret set
- [ ] `CF_VERSION_METADATA` binding added for automatic release detection
- [ ] `logpush: true` enabled in `wrangler.jsonc` for Workers Logpush export
- [ ] Deliberate error in a tRPC procedure captured in Sentry dashboard with unminified stack trace
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Sentry Performance Monitoring (transaction tracing) — deferred; error monitoring first
- OTLP export destination configuration (optional supplement; not required if SDK is used)
- Session replay integration
- Cron monitoring for scheduled Workers

**Rules to Follow**
- Never hard‑code the Sentry DSN in source code or `wrangler.jsonc` — always use a secret.
- `sendDefaultPii` must be `false` in all environments.
- The `beforeSend` hook must never throw — wrap in try/catch and always return the event (or null to drop).
- Source map upload must not block deployment — failures should log a warning, not fail the build.

**Verification**
```bash
# Verify installation
pnpm ls @sentry/cloudflare

# Verify DSN is set as secret (not in wrangler.jsonc)
wrangler secret list --env production | grep SENTRY_DSN

# Trigger a test error
# Manual: add a deliberate throw in a tRPC procedure, deploy to staging
# Verify: error appears in Sentry dashboard with unminified stack trace

# Verify source maps
# Manual: Sentry Project Settings → Source Maps → find release → verify .map files

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an on‑call engineer, I want production errors automatically captured in Sentry with full stack traces so that I can diagnose issues without reproducing them locally.
- Deep Module: `instrumentation.ts` encapsulates all Sentry initialization, beforeSend filtering, and release detection behind `withSentry()`, hiding the complexity of Workers‑specific configuration from the application handler.

---

#### Subtasks

- [ ] P0-OBS-1.0.25 (AGENT): Read `apps/web/src/entry-server.tsx`, `apps/web/wrangler.jsonc`, and current `apps/web/package.json`. Research `@sentry/cloudflare` v10.48.0 API.
  **Verification:** Current state and Sentry API documented.

- [ ] P0-OBS-1.0.5 (AGENT): Research Workers‑specific Sentry considerations: `nodejs_compat` requirement, `CF_VERSION_METADATA`, source map upload flow, OTLP export option.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-OBS-1.1 (AGENT): Install `@sentry/cloudflare` ^10.48.0, add to `pnpm-workspace.yaml` catalog.
  **File(s):** `apps/web/package.json`, `pnpm-workspace.yaml`
  **Verification:** `pnpm ls @sentry/cloudflare` shows installed version.

- [ ] P0-OBS-1.2 (AGENT): Create `apps/web/src/server/instrumentation.ts` with `Sentry.withSentry()` wrapper, DSN from env, `tracesSampleRate`, `sendDefaultPii: false`.
  **File(s):** `apps/web/src/server/instrumentation.ts` (new)
  **Verification:** Module exports a wrapped handler.

- [ ] P0-OBS-1.3 (AGENT): Implement `beforeSend` hook with PII scrubbing patterns (emails, credit cards, SSNs, phones, tokens).
  **File(s):** `apps/web/src/server/instrumentation.ts`
  **Verification:** PII scrubbed from test error events.

- [ ] P0-OBS-1.4 (AGENT): Add `upload_source_maps: true`, `CF_VERSION_METADATA` binding, and `logpush: true` to `wrangler.jsonc`. Set `SENTRY_AUTH_TOKEN` secret.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Source maps uploaded on next deploy; release detected automatically.

- [ ] P0-OBS-1.5 (AGENT): Set `SENTRY_DSN` secret via `wrangler secret put`.
  **Verification:** Secret visible via `wrangler secret list`.

- [ ] P0-OBS-1.6 (AGENT): Deploy to staging, trigger a deliberate error, verify capture in Sentry dashboard with unminified stack trace.
  **Verification:** Error visible in Sentry; stack trace shows original source.

- [ ] P0-OBS-1.7 (HUMAN): Review Sentry dashboard, verify PII scrubbing, approve.
  **Verification:** Approved.

---

### [ ] P0-OBS-2: Implement structured JSON logging with correlation IDs

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** The codebase uses ad‑hoc `console.log()` and `console.error()` scattered across server files. There is no consistent log format, no request correlation (requestId), no structured context (userId, tenantId), and no log level control. In the Cloudflare Workers runtime, these unstructured logs are difficult to query and correlate across invocations. Workers Logs and Workers Logpush are not configured.
**Size:** Medium

**Description:**
Build a lightweight structured logging system that works reliably on Cloudflare Workers. The system has four components:

**(a) Logger utility**: Create `apps/web/src/lib/logger.ts` — a custom logger wrapping `console.log(JSON.stringify({...}))`. Features: log levels (`error`, `warn`, `info`, `debug`), child loggers for request‑scoped context (requestId, userId, tenantId, procedure path), timestamp in ISO‑8601, and environment‑aware level control (`debug` in development, `info` in production). Use `AsyncLocalStorage` to propagate context across async boundaries without passing a logger instance through every function call.

**Why not Pino or Winston?** Pino's `pino/web` build has documented edge‑compatibility issues on Workers. Winston requires Node.js APIs unavailable in Workers. The community consensus for Workers is structured `console.log()` with JSON, which Workers Logs automatically indexes. A custom wrapper is lightweight (<100 lines), has zero dependencies, and avoids the compatibility issues entirely.

**(b) Request context propagation**: Using `AsyncLocalStorage` (available via `nodejs_compat`), create a `runWithContext(ctx, fn)` pattern that makes `requestId`, `userId`, and `tenantId` available to all downstream logs without explicit parameter passing. The `requestId` is read from the `x-request-id` header or generated as a UUID on first access.

**(c) Workers Logs enablement**: Add `observability` configuration to `wrangler.jsonc` with `enabled: true` and appropriate `head_sampling_rate` (1.0 in development/staging, 0.25 in production). This enables the Cloudflare dashboard log viewer with structured JSON querying.

**(d) Workers Logpush**: Add `logpush: true` to `wrangler.jsonc` for production log export to external services (Sentry logs endpoint, or a future SIEM). Workers Logpush batches and ships logs in JSON lines format with minimal latency.

**(e) Integration**: Replace all existing `console.log` and `console.error` calls in `apps/web/src/server/` with the structured logger. Add request‑scoped logging to the tRPC context (via the logger middleware from P0‑TRPC‑1), the Hono API handler, and the Better Auth handler.

**Research Findings (2026‑05‑06):**
- Cloudflare Workers Logs auto‑indexes JSON fields: `console.log({user_id: 123})` is queryable
- Pino has edge compatibility issues; `@maou-shonen/hono-pino` notes "some pino advanced features maybe not working" on Workers
- The `workers-tagged-logger` package (v0.12.0) demonstrates the `AsyncLocalStorage` pattern for Workers
- Workers observability is enabled via `observability` block in `wrangler.jsonc`
- Logpush exports logs in JSON lines format to external destinations

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-5` (server entry for request ID propagation)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-1` (logger middleware integration point)

**Blocks:**
- `tasks/infrastructure/P0-OBS.md → P0-OBS-3` (PII redaction integrates with logger)

**Related Files:**
- `apps/web/src/lib/logger.ts` (new)
- `apps/web/wrangler.jsonc` (add `observability` and `logpush`)
- `apps/web/src/server/trpc/context.ts` (integrate logger into context)
- `apps/web/src/server/api.ts` (use structured logger)
- Various server files (replace console.log with logger)

**Definition of Done**
- [ ] `apps/web/src/lib/logger.ts` created with: log levels, child loggers, `AsyncLocalStorage` context propagation, JSON output
- [ ] `requestId` generated (UUID) and propagated to all logs within a request scope
- [ ] `userId` and `tenantId` automatically included in logs from the session context
- [ ] `observability` block added to `wrangler.jsonc` with `enabled: true` and `head_sampling_rate`
- [ ] `logpush: true` enabled in `wrangler.jsonc` for production
- [ ] All `console.log`/`console.error` calls in `apps/web/src/server/` replaced with structured logger
- [ ] Logs visible and queryable in Cloudflare dashboard → Workers → Observability → Logs
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Log‑based alerting (P2‑MON‑1)
- Custom Grafana dashboards (future)
- Log retention policies (Cloudflare manages retention automatically for Workers Logs)

**Rules to Follow**
- Never log request bodies or headers without explicit PII redaction (P0‑OBS‑3).
- The logger must never throw — wrap all log calls in defensive try/catch.
- Log level must be controllable via environment variable (`LOG_LEVEL`).
- In production (determined by `NODE_ENV`), default to `info` level; `debug` is development‑only.

**Verification**
```bash
# Verify structured log output
curl http://localhost:3000/api/trpc/crm.listLeadBoard
# Check terminal (wrangler tail or dev server): JSON lines with requestId, userId, tenantId, level, message

# Verify Workers Logs
# Manual: deploy to staging, check Cloudflare dashboard → Workers → Observability → Logs
# Filter by requestId or userId

# Verify log levels
LOG_LEVEL=debug pnpm dev  # should see debug messages
LOG_LEVEL=error pnpm dev  # should only see errors

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The logger encapsulates the complexity of `AsyncLocalStorage` context propagation and JSON serialization behind a simple `logger.info(msg, data)` API. Child loggers automatically inherit context from parent scopes without explicit parameter passing.
- BDD: As a developer debugging a production issue, I want all logs from a single request tagged with the same requestId so that I can trace the full lifecycle of a request across multiple services.

---

#### Subtasks

- [ ] P0-OBS-2.0.25 (AGENT): Read current logging patterns in `apps/web/src/server/` (grep for `console.log`, `console.error`). Research Workers Logs and `AsyncLocalStorage` API.
  **Verification:** Current logging inventory documented.

- [ ] P0-OBS-2.0.5 (AGENT): Research `workers-tagged-logger` pattern, Workers Logs indexing behavior, and Pino/Winston Workers compatibility.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-OBS-2.1 (AGENT): Create `apps/web/src/lib/logger.ts` with `createLogger()`, log levels, child loggers, and `AsyncLocalStorage` context propagation.
  **File(s):** `apps/web/src/lib/logger.ts` (new)
  **Verification:** Logger outputs valid JSON to console; child loggers inherit parent context.

- [ ] P0-OBS-2.2 (AGENT): Add `observability` block (`enabled: true`, `head_sampling_rate`) and `logpush: true` to `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Configuration present and valid.

- [ ] P0-OBS-2.3 (AGENT): Integrate logger into tRPC context, Hono handler, and auth handler — creating a request‑scoped logger with requestId, userId, tenantId.
  **File(s):** `apps/web/src/server/trpc/context.ts`, `apps/web/src/server/api.ts`
  **Verification:** Request context propagated to all downstream logs.

- [ ] P0-OBS-2.4 (AGENT): Replace all `console.log`/`console.error` calls in `apps/web/src/server/` with structured logger calls.
  **File(s):** Various files in `apps/web/src/server/`
  **Verification:** Zero bare `console.log` calls in server code; all logs are structured JSON.

- [ ] P0-OBS-2.5 (HUMAN): Deploy to staging, verify logs in Cloudflare dashboard, test log level control. Approve.
  **Verification:** Approved.

---

### [ ] P0-OBS-3: Build PII redaction filter for all log outputs

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** No PII redaction exists for logs or error reporting. Structured data including emails, user IDs, IP addresses, and potentially passwords could be logged to Cloudflare Workers Logs, Workers Logpush destinations, or Sentry. This is a compliance risk under GDPR, CCPA, and SOC 2.
**Size:** Small

**Description:**
Create `apps/web/src/lib/logger/redactor.ts` — a PII redaction utility that scrubs sensitive data before it reaches any log output or external service. The redactor is applied at two layers:

**(a) Logger‑level redaction**: A `redact(obj)` function that deep‑scans every value being logged and replaces PII patterns with `[REDACTED]`. Patterns to detect: email addresses (`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`), credit card numbers (13‑19 digit sequences passing Luhn algorithm), US Social Security Numbers (`\d{3}-\d{2}-\d{4}`), phone numbers, and any field name containing `password`, `token`, `secret`, `key`, `authorization`. The redactor is called automatically by the structured logger (P0‑OBS‑2) before writing any log entry.

**(b) Sentry `beforeSend` integration**: The Sentry `beforeSend` hook (from P0‑OBS‑1) calls the same redactor to scrub sensitive data from error events before they are sent to Sentry's servers. This ensures "sensitive data never leaves the local environment".

**Implementation**: Apply the redactor recursively to objects and arrays. Use `JSON.stringify` + regex replacement as a simple first pass, with field‑name‑based exclusion (any key matching `password|token|secret|key|authorization|cookie` is replaced with `[REDACTED]` regardless of value). Add Sentry's built‑in Advanced Data Scrubbing for credit card numbers as a server‑side safety net (configured in Sentry project settings, not code).

**Research Findings (2026‑05‑06):**
- Regex‑based redaction is industry standard for known patterns; Sentry's `beforeSend` is the canonical hook
- Multiple 2026 projects document the same pattern: emails, credit cards, SSNs, phone numbers as the redaction target set
- Field‑name‑based exclusion catches tokens and secrets that pattern matching might miss
- Sentry's server‑side Advanced Data Scrubbing provides a safety net

**Depends on:**
- `tasks/infrastructure/P0-OBS.md → P0-OBS-2` (logger integration point)
- `tasks/infrastructure/P0-OBS.md → P0-OBS-1` (Sentry beforeSend integration point)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/lib/logger/redactor.ts` (new)
- `apps/web/src/lib/logger.ts` (integrate redactor)
- `apps/web/src/server/instrumentation.ts` (integrate redactor into beforeSend)

**Definition of Done**
- [ ] `apps/web/src/lib/logger/redactor.ts` created with: recursive object scanning, regex patterns for emails/credit cards/SSNs/phones, field‑name‑based exclusion for password/token/secret/key/authorization/cookie
- [ ] Redactor integrated into structured logger — all log output is automatically scrubbed
- [ ] Redactor integrated into Sentry `beforeSend` hook — error events are scrubbed before transmission
- [ ] Sentry Advanced Data Scrubbing configured for credit card numbers (in Sentry project settings)
- [ ] Unit tests: redactor transforms known PII patterns to `[REDACTED]`, preserves non‑sensitive data
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- AI‑based PII detection (overkill for Phase 0; regex covers known patterns)
- GDPR data deletion across third‑party systems (P2‑SEC‑8)
- HIPAA compliance requirements

**Rules to Follow**
- The redactor must be applied at the logger level, not just at the export level — sensitive data must never be written to Workers Logs.
- Never log raw HTTP Authorization headers, cookies, or request bodies without redaction.
- The redactor must never throw — wrap in try/catch and return the original value if redaction fails.
- Redaction must happen before JSON serialization to avoid double‑encoding issues.

**Verification**
```bash
# Unit tests
pnpm test -- apps/web/src/lib/logger/redactor.test.ts

# Manual test: call logger.info with PII
logger.info({ email: "user@example.com", ssn: "123-45-6789" })
# Expected output: { email: "[REDACTED]", ssn: "[REDACTED]" }

# Verify Sentry beforeSend scrubbing
# Trigger an error in staging, check Sentry dashboard: no email/PII in breadcrumbs or extra data

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The redactor encapsulates all PII detection and replacement logic behind a single `redact(obj)` function, making PII protection a one‑line integration in the logger and Sentry hooks without requiring each log call site to think about what data is sensitive.

---

#### Subtasks

- [ ] P0-OBS-3.0.25 (AGENT): Research PII redaction patterns: regex for common PII types, field‑name‑based exclusion, Sentry Advanced Data Scrubbing.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-OBS-3.0.5 (AGENT): Identify all PII categories relevant to UBOS: which fields might contain PII in CRM leads, auth flows, finance data, etc.
  **Verification:** PII inventory documented in task notes.

- [ ] P0-OBS-3.1 (AGENT): Create `apps/web/src/lib/logger/redactor.ts` with recursive scanning, regex patterns, field‑name exclusion, and error‑tolerant wrapping.
  **File(s):** `apps/web/src/lib/logger/redactor.ts` (new)
  **Verification:** `redact({ email: "user@example.com" })` returns `{ email: "[REDACTED]" }`.

- [ ] P0-OBS-3.2 (AGENT): Integrate redactor into the structured logger so all log output is automatically scrubbed.
  **File(s):** `apps/web/src/lib/logger.ts`
  **Verification:** Logger output contains no PII.

- [ ] P0-OBS-3.3 (AGENT): Integrate redactor into Sentry `beforeSend` hook in `instrumentation.ts`.
  **File(s):** `apps/web/src/server/instrumentation.ts`
  **Verification:** Sentry events scrubbed before transmission.

- [ ] P0-OBS-3.4 (AGENT): Write unit tests for the redactor covering all PII patterns.
  **File(s):** `apps/web/src/lib/logger/redactor.test.ts` (new)
  **Verification:** Tests pass; coverage includes all PII patterns.

- [ ] P0-OBS-3.5 (HUMAN): Verify no PII appears in Workers Logs or Sentry after deployment. Approve.
  **Verification:** Approved.

---

### [ ] P0-OBS-4: Configure health check endpoints with dependency status

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** `apps/web/src/server/api.ts` has a basic `/api/health` endpoint that returns `{ status: "ok" }` with no dependency validation. There is no verification that the database, R2 storage, Inngest, or Stripe are reachable. A "healthy" response could mask a database outage.
**Size:** Small

**Description:**
Enhance the existing `/api/health` endpoint to validate all critical dependencies and return per‑dependency status. The enhanced health check:

**Dependencies to validate**:
1. **Database**: Execute `SELECT 1` against the runtime database (`getDb()`). Set a `statement_timeout` of 2 seconds to prevent hanging.
2. **R2 Storage**: Attempt to list objects in the configured R2 bucket (limit 1) — verifies the binding is correctly configured and the bucket is accessible.
3. **Stripe**: Call the Stripe API's balance endpoint (lightweight, no side effects) — verifies the API key is valid and Stripe is reachable.

**Inngest**: Deferred — Inngest health is monitored via its own dashboard and the `GET /api/inngest` endpoint that Inngest's platform pings.

**Response format**:
```json
{
  "status": "ok" | "degraded",
  "timestamp": "2026-05-06T...",
  "checks": {
    "database": { "status": "ok", "latencyMs": 12 },
    "r2": { "status": "ok", "latencyMs": 45 },
    "stripe": { "status": "ok", "latencyMs": 230 }
  }
}
```

**HTTP status**: 200 if all dependencies healthy, 503 if any check fails. Each dependency check runs in its own `try/catch` with a 2‑second timeout. The endpoint itself must respond within 5 seconds total.

**Integration**: Add to `apps/web/src/server/api.ts` as a Hono route: `api.get('/health', ...)`. Use `Promise.allSettled()` to run all checks concurrently.

**Research Findings (2026‑05‑06):**
- "Your health endpoint should respond in under 100ms" — set aggressive timeouts per dependency
- DB check uses `SELECT 1` with `statement_timeout` to prevent hanging
- Per‑dependency status reporting is the standard pattern
- `Promise.allSettled()` enables concurrent checks without one failure blocking others

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-1` (dual database connections)
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-2` (R2 operations wrapper)
- `tasks/infrastructure/P0-BILLING.md → P0-BILLING-1` (Stripe client)

**Blocks:**
- `tasks/infrastructure/P2-MON.md → P2-MON-1` (public status page)

**Related Files:**
- `apps/web/src/server/api.ts` (enhance existing health endpoint)
- `apps/web/src/server/health.ts` (new — health check logic, extract from api.ts)

**Definition of Done**
- [ ] `/api/health` validates database (`SELECT 1`), R2 (list bucket), and Stripe (balance)
- [ ] Each check has a 2‑second timeout
- [ ] Checks run concurrently via `Promise.allSettled()`
- [ ] Response includes `status` (`ok`/`degraded`), `timestamp`, and per‑dependency status with latency
- [ ] HTTP 200 when all healthy; HTTP 503 when any dependency fails
- [ ] Health check logic extracted to `apps/web/src/server/health.ts` for unit testing
- [ ] Unit tests: verify 200 when all deps healthy, 503 when DB down, graceful timeout handling
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Inngest health check (monitored via Inngest dashboard)
- Public status page (P2‑MON‑1)
- Uptime monitoring integration (external tool configuration)
- `/healthz` (Kubernetes‑style liveness probe) — separate endpoint if needed

**Rules to Follow**
- The health check must never log PII or sensitive configuration (connection strings, API keys).
- Each dependency check must fail fast (timeout under 2 seconds) — the health endpoint must always respond.
- Never allow a dependency check failure to crash the health endpoint itself.

**Verification**
```bash
# Healthy
curl http://localhost:3000/api/health
# Expected: 200, all checks "ok"

# Simulate DB failure (stop DB or set wrong URL)
curl http://localhost:3000/api/health
# Expected: 503, database check "error"

# Verify response time is under 5 seconds
curl -w "\n%{time_total}s\n" http://localhost:3000/api/health

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The health check module encapsulates all dependency validation logic behind a single `checkHealth()` function, enabling any monitoring system to assess platform health without knowing internal architecture details.

---

#### Subtasks

- [ ] P0-OBS-4.0.25 (AGENT): Read current `/api/health` in `api.ts`. Research health check endpoint patterns: dependency validation, timeouts, aggregate status.
  **Verification:** Current health check and best practices documented.

- [ ] P0-OBS-4.0.5 (AGENT): Research timeout patterns for database health checks (`statement_timeout`), R2 bucket listing API, and Stripe balance endpoint.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-OBS-4.1 (AGENT): Create `apps/web/src/server/health.ts` with `checkDatabase()`, `checkR2()`, `checkStripe()`, and `checkHealth()` orchestrator.
  **File(s):** `apps/web/src/server/health.ts` (new)
  **Verification:** Each checker returns `{ status, latencyMs }` or throws; orchestrator runs all concurrently.

- [ ] P0-OBS-4.2 (AGENT): Replace existing `/api/health` route with enhanced version using `health.ts`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** `/api/health` returns per‑dependency status.

- [ ] P0-OBS-4.3 (AGENT): Write unit tests for health check logic: all deps healthy, DB down, partial failure, timeout handling.
  **File(s):** `apps/web/src/server/health.test.ts` (new)
  **Verification:** Tests pass.

- [ ] P0-OBS-4.4 (HUMAN): Test health endpoint with real dependencies, verify 503 on failure. Approve.
  **Verification:** Approved.

---

### [ ] P0-OBS-5: Set up performance monitoring (tRPC procedure timing, DB query timing)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The tRPC logger middleware from P0‑TRPC‑1 records procedure duration, but this data is only logged locally and not aggregated for analysis. There is no way to track procedure latency trends, identify slow procedures, or monitor performance degradation over time. No database query timing is captured.
**Size:** Small

**Description:**
Enhance the tRPC timing middleware (built in P0‑TRPC‑1) to export procedure timing metrics for aggregation and visualization. The enhanced middleware will:

**(a) Record procedure timing**: Already captured in the logger middleware from P0‑TRPC‑1 (start time, end time, duration, procedure path, type). This task ensures the timing data is structured for metric export.

**(b) Export to Cloudflare Workers Analytics Engine**: Create a binding for Analytics Engine in `wrangler.jsonc` (`ANALYTICS`). Write one data point per procedure invocation with fields: `procedure` (path), `type` (query/mutation), `duration_ms`, `status` (success/error), `tenantId`. Analytics Engine supports time‑series queries via Grafana and is optimized for metrics at scale.

**⚠️ Analytics Engine limit**: Maximum 25 data points per Worker invocation. For batched tRPC requests, buffer writes and flush at the end of the invocation using `.writeDataPoint()` in bulk.

**(c) DB query timing**: For critical CRM queries, wrap database calls with `Date.now()` before/after and include `dbDurationMs` in the log/timing output. This provides visibility into whether latency originates in application code or database queries.

**(d) Sampling**: Sample procedure timing at 10% in production to manage Analytics Engine data point costs. Log all timings (100% sample) to Workers Logs for debugging, but only write to Analytics Engine at the sampling rate.

**Integration**: Extend the existing logger middleware in `apps/web/src/server/trpc/init.ts` to call `writeTimingMetric()` after each procedure. The `writeTimingMetric()` function buffers data points and flushes at the end of the Worker invocation (or immediately if the buffer exceeds 20 points).

**Research Findings (2026‑05‑06):**
- tRPC timing: `Date.now()` before `opts.next()`, duration = after − before
- Workers Analytics Engine: `writeDataPoint()` on binding, limit 25 writes per invocation
- For batched requests, the `callIndex` feature enables per‑call timing
- Sampling is essential for cost management at scale

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-1` (logger middleware)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc with bindings)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/trpc/middleware/timing.ts` (new — extract from init.ts)
- `apps/web/src/server/trpc/init.ts` (integrate timing middleware)
- `apps/web/wrangler.jsonc` (add Analytics Engine binding)

**Definition of Done**
- [ ] `apps/web/src/server/trpc/middleware/timing.ts` created with: duration measurement, Analytics Engine export, buffering
- [ ] Analytics Engine binding (`ANALYTICS`) configured in `wrangler.jsonc`
- [ ] Sampling rate configured: 100% Workers Logs, 10% Analytics Engine (production)
- [ ] Buffer: up to 20 data points per invocation, flushed at end or when full
- [ ] DB query timing added to CRM list/create/update/delete operations
- [ ] Metrics queryable in Cloudflare dashboard → Analytics Engine
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Grafana dashboard setup (external tool configuration)
- Per‑tenant performance dashboards (Phase 3)
- Long‑term metric retention (Analytics Engine retains 3 months by default)

**Rules to Follow**
- Never exceed 25 `writeDataPoint()` calls per Worker invocation.
- Timing data must not include request bodies or sensitive data.
- Log all timings; sample only the Analytics Engine writes (not the logs).
- The timing middleware must be the outermost procedural middleware to capture full end‑to‑end duration.

**Verification**
```bash
# Verify timing in logs
curl http://localhost:3000/api/trpc/crm.listLeadBoard
# Expected: log line with duration, procedure, type, status

# Verify Analytics Engine
# Manual: Cloudflare dashboard → Analytics Engine → query procedure timings

# Verify DB query timing
# Check logs for dbDurationMs field on CRM operations

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The timing middleware encapsulates the complexity of data point buffering, sampling, and Analytics Engine API limits behind a simple `recordTiming()` function, enabling procedure authors to get performance visibility without any knowledge of the metrics infrastructure.

---

#### Subtasks

- [ ] P0-OBS-5.0.25 (AGENT): Read current logger middleware in `init.ts`. Research Workers Analytics Engine API: `writeDataPoint()`, limits, sampling recommendations.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-OBS-5.0.5 (AGENT): Research Analytics Engine binding configuration and data point schema design.
  **Verification:** Binding setup documented.

- [ ] P0-OBS-5.1 (AGENT): Create `apps/web/src/server/trpc/middleware/timing.ts` with duration measurement, Analytics Engine export, buffering, and sampling.
  **File(s):** `apps/web/src/server/trpc/middleware/timing.ts` (new)
  **Verification:** Timing middleware records and exports procedure metrics.

- [ ] P0-OBS-5.2 (AGENT): Add Analytics Engine binding (`ANALYTICS`) to `wrangler.jsonc`.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** Binding configured.

- [ ] P0-OBS-5.3 (AGENT): Add DB query timing instrumentation to CRM procedures.
  **File(s):** `apps/web/src/server/crm/repository.ts`
  **Verification:** CRM operations log `dbDurationMs`.

- [ ] P0-OBS-5.4 (AGENT): Integrate timing middleware into procedure chain in `init.ts`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** All procedures emit timing metrics.

- [ ] P0-OBS-5.5 (HUMAN): Deploy to staging, run several CRM operations, verify metrics in Analytics Engine. Approve.
  **Verification:** Approved.

---

### [ ] P0-OBS-6: Create real‑user monitoring (Web Vitals) reporting

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟢 Low
**Current State:** No real‑user monitoring (RUM) is configured. There is no visibility into how the application performs for actual users — only synthetic data from local development. Core Web Vitals (LCP, INP, CLS) are not measured or reported. Cloudflare Web Analytics may be available at the platform level but is not integrated into application monitoring.
**Size:** Small

**Description:**
Integrate the `web-vitals` library into the client‑side application to measure and report Core Web Vitals from real users. The integration has two parts:

**(a) Client‑side measurement**: Install `web-vitals` v5.1.0. Create `apps/web/src/lib/rum.ts` that imports `onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB` from `web-vitals`. Each metric callback sends a beacon to `/api/rum` using `navigator.sendBeacon()` (fires reliably on page unload). Include context: page URL, effective connection type, and device category (mobile/desktop/tablet from `navigator.userAgent`).

**(b) Server‑side collection**: Create a Hono route `POST /api/rum` in `apps/web/src/server/api.ts` that accepts RUM data points. Log them to the structured logger (P0‑OBS‑2) with appropriate sampling. Write to Cloudflare Workers Analytics Engine for aggregation (separate index from procedure timing). The endpoint should respond 204 (no content) with minimal processing — the beacon is fire‑and‑forget.

**Sampling**: Report 100% of metrics for all users in development/staging. In production, sample at 10% to manage costs while maintaining statistical significance.

**Reporting**: Metrics should be reported at p75, matching Google CrUX reporting methodology. Cloudflare Web Analytics can be enabled as a supplement — it "collects the minimum amount of information - timing metrics - to show customers how their websites perform" and reports Core Web Vitals when `visibilityState` is hidden.

**Core Web Vitals Thresholds (2026)**:
- LCP < 2.0s (good), 2.0–3.0s (needs improvement), > 3.0s (poor)
- INP < 200ms (good), 200–500ms (needs improvement), > 500ms (poor)
- CLS < 0.08 (good), 0.08–0.25 (needs improvement), > 0.25 (poor)
- FCP < 1.5s (good), 1.5–3.0s (needs improvement), > 3.0s (poor)

**Research Findings (2026‑05‑06):**
- `web-vitals` v5.1.0 is the latest stable, ~1‑2KB brotli'd
- `navigator.sendBeacon()` is the recommended transport for RUM data (reliable on page unload)
- p75 is the standard aggregation level matching CrUX
- Cloudflare Web Analytics provides built‑in RUM as a supplement
- Sampling at 10% is common for RUM to control costs

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-4` (client entry point for script injection)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/lib/rum.ts` (new)
- `apps/web/src/entry-client.tsx` (import and initialize RUM)
- `apps/web/src/server/api.ts` (add POST /api/rum route)
- `apps/web/package.json` (add `web-vitals` dependency)

**Definition of Done**
- [ ] `web-vitals` ^5.1.0 installed as a dependency
- [ ] `apps/web/src/lib/rum.ts` created: imports measurement functions, collects all five Core Web Vitals, sends via `sendBeacon()` with URL/connection/device context
- [ ] RUM initialized in entry‑client (or a dedicated script loaded early in the page lifecycle)
- [ ] `POST /api/rum` route created: logs metrics to structured logger, writes to Analytics Engine, responds 204
- [ ] Sampling: 100% staging, 10% production
- [ ] Metrics visible in Workers Logs (via structured logger) and Analytics Engine
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Cloudflare Web Analytics setup (optional supplement; not blocking)
- Custom business metrics (e.g., "time to first lead" — deferred to product analytics)
- Session replay (privacy‑sensitive, requires legal review)
- RUM dashboard/Grafana setup (external tool configuration)

**Rules to Follow**
- Never send PII in RUM data — only aggregate metrics, page URLs, and device categories.
- `sendBeacon()` must be used (not `fetch()`) because it is reliable during page unload.
- The RUM script must be as small as possible — no frameworks, no dependencies beyond `web-vitals`.
- Sampling must be configurable via environment variable (`RUM_SAMPLE_RATE`).

**Verification**
```bash
# Verify RUM beacons in browser DevTools
# 1. Open Chrome DevTools → Network → filter "rum"
# 2. Navigate through pages
# 3. Verify beacon sent on page unload with LCP, INP, CLS values

# Verify server-side collection
# Manual: check Workers Logs for RUM data points

# Verify sampling
# Check that ~10% of requests in production produce RUM beacons

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The RUM module encapsulates all Web Vitals measurement, beacon transport, and sampling logic behind a single `initRUM()` call, providing production performance visibility without any developer having to understand Web Vitals API details.

---

#### Subtasks

- [ ] P0-OBS-6.0.25 (AGENT): Research `web-vitals` v5.1.0 API, `sendBeacon()` usage, and RUM best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-OBS-6.0.5 (AGENT): Research sampling strategies for RUM and Analytics Engine data point limits.
  **Verification:** Sampling strategy documented.

- [ ] P0-OBS-6.1 (AGENT): Install `web-vitals` ^5.1.0 dependency.
  **File(s):** `apps/web/package.json`
  **Verification:** `pnpm ls web-vitals` shows installed.

- [ ] P0-OBS-6.2 (AGENT): Create `apps/web/src/lib/rum.ts` with measurement functions, beacon transport, URL/connection/device context, and sampling.
  **File(s):** `apps/web/src/lib/rum.ts` (new)
  **Verification:** RUM beacons sent on page navigation.

- [ ] P0-OBS-6.3 (AGENT): Import and initialize RUM in `entry-client.tsx`.
  **File(s):** `apps/web/src/entry-client.tsx`
  **Verification:** RUM active in browser; beacons visible in DevTools.

- [ ] P0-OBS-6.4 (AGENT): Create `POST /api/rum` route for server‑side collection, logging, and Analytics Engine export.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Beacons received and logged.

- [ ] P0-OBS-6.5 (HUMAN): Deploy to staging, navigate app, verify RUM data in Workers Logs and Analytics Engine. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑OBS group are covered.*

---