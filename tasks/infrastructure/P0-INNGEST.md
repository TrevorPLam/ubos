# tasks/infrastructure/P0-INNGEST.md – Background Jobs & Event Bus

This file covers the Inngest SDK version decision (v4 with `eventType()`), client initialization with durable execution configuration, mounting the serve handler on a Hono API route, defining a unified cross‑domain event registry using Zod schemas, building a proof‑of‑concept welcome email function triggered on signup, and extending a health‑check function to ping Neon every 5 minutes to prevent cold starts. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑INNGEST (2026‑05‑06)

### 1. Inngest SDK Version & v4 GA Status

**`inngest` npm package**: v4.3.0 is the latest published version as of May 2026—the GA (Generally Available) release, not beta. The npm page confirms install with `npm install inngest` (no `@latest` or `@beta` needed). 

**v4 GA date**: The TypeScript SDK v4 became generally available on March 16–17, 2026. The v4 beta began on March 4, 2026. As of May 2026, v4 is the current production release. 

**v4 Key Changes** (from the official blog and migration guide):
- `EventSchemas` removed entirely, replaced with `eventType()` — a helper that defines event types alongside functions with **optional runtime validation** via Standard Schema (Zod, Valibot, etc.) 
- **Triggers moved into the options object** (first argument of `createFunction`). No more separate second argument 
- Default mode is now `"cloud"` — requires a signing key for production or explicitly set `isDev: true` for local development 
- **Rewritten middleware** system: class-based with lifecycle hooks (`wrapRequest`, `wrapFunctionHandler`, `transformFunctionInput`, etc.) 
- **Structured logging** (Pino-style, object-first format) with `logger.info({ key: val }, "message")` 
- **Checkpointing enabled by default** — steps checkpoint progress eagerly, dramatically reducing inter-step latency 
- **Parallel step optimization** enabled by default (`optimizeParallelism`) 
- **Lazy initialization** for edge environments — `fetch` and configuration resolved at first use, no more manually binding `globalThis.fetch` 

**Migration complexity**: "This is a major version with breaking changes, but for most apps the migration is trivial." An automated codemod (`@web3smallie/migrate-wagmi-v3`) supports Inngest v3→v4 migrations with zero false positives. 

### 2. Critical Security Vulnerability — CVE-2026-42047

**CVE-2026-42047**: Inngest TypeScript SDK versions 3.22.0 through 3.53.1 allow unauthenticated remote attackers to exfiltrate environment variables from the host process via the `serve()` HTTP handler. Requests using PATCH, OPTIONS, or DELETE fall through to a generic handler that returns diagnostic information including `process.env` contents. 

**Impact on UBOS**: If we use v4 (4.3.0), we are **not affected**. This vulnerability is a critical driver for starting with v4 rather than v3. Any deployment running v3 with a publicly accessible `/api/inngest` endpoint would leak all environment variables.

### 3. Hono Adapter Pattern

The official Hono adapter for Inngest is imported from `inngest/hono`:

```typescript
import { serve } from "inngest/hono";
import { inngest } from "./client";

const handler = serve({
  client: inngest,
  functions: [helloWorld, welcomeEmail],
});

// Mount on Hono app
app.use("/api/inngest", handler);
```

The `serve()` function takes an options object with `client` (the Inngest instance) and `functions` (array of function definitions). It returns a handler compatible with Hono's `app.use()`. 

**For TanStack Start**: The official quick start shows using `inngest/edge` with TanStack's `createServerFileRoute`. However, since UBOS uses Hono internally, the `inngest/hono` adapter is more appropriate. 

### 4. Cloudflare Workers & Environment Variables

Cloudflare Workers do not set environment variables on `process.env`. They are passed as the `env` argument to the Worker's fetch handler. To make these available inside Inngest functions, a middleware extracts `env` from `requestArgs` and injects it via `transformFunctionInput`.

For Hono on Workers, `requestArgs` contains `[honoContext]`. The `env` can be accessed from `honoContext.env` or extracted via the `env` helper from `hono/adapter`. 

**v4 Middleware pattern** (class-based):
```typescript
class WorkersBindingsMiddleware extends Middleware.BaseMiddleware {
  id = "workers-bindings";
  private env!: Env;
  async wrapRequest({ next, requestArgs }) {
    // For Hono: requestArgs is [honoContext]
    this.env = requestArgs[0].env as Env;
    return await next();
  }
  transformFunctionInput(args) {
    return { ...args, ctx: { ...args.ctx, env: this.env } };
  }
}
```

### 5. Event Registry with `eventType()`

v4's `eventType()` replaces the centralized `EventSchemas`. Each event type is defined once and reused everywhere:

```typescript
import { eventType } from "inngest";
import { z } from "zod";

export const userSignup = eventType("app/user.signup", {
  schema: z.object({
    userId: z.string(),
    email: z.string().email(),
  }),
});

// Use as trigger:
inngest.createFunction(
  { id: "welcome-email", triggers: [userSignup] },
  async ({ event }) => {
    // event.data is typed as { userId: string; email: string }
  }
);

// Use for sending:
await inngest.send(userSignup.create({ userId: "123", email: "a@b.com" }));
```

If you don't want runtime validation, `staticSchema<T>()` provides compile-time type safety without adding a schema library. 

### 6. Cron Syntax for Keep‑Warm

Inngest supports standard Unix cron expressions with optional timezone prefixes. For a keep‑warm ping every 5 minutes: `"TZ=UTC */5 * * * *"`. The `cron()` helper is a convenience wrapper. 

### 7. Resend Integration Pattern

The established pattern: `step.run("send-welcome-email", async () => { await resend.emails.send(...) })`. If Resend is down, Inngest retries the step independently. 

### 8. Inngest Dev Server

`npx inngest-cli@latest dev` starts the local dev server on `http://localhost:8288` with a GUI for triggering functions, viewing event history, and inspecting function runs. It auto-discovers locally hosted SDKs. 

---

## Task Definitions

### [ ] P0-INNGEST-0: Pin Inngest SDK version (choose v4), adapt event registry plan accordingly

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The UBOS codebase has no Inngest integration. The `inngest` npm package is not installed. There is no event registry, no Inngest client, and no decision on which SDK version to use. The `apps/web/package.json` and `pnpm-workspace.yaml` catalog have no Inngest dependency.
**Size:** Small

**Description:**
Make the architectural decision to adopt Inngest TypeScript SDK v4 (not v3) and document the event registry strategy. This task is a decision + dependency setup task with no runtime code beyond the client instantiation file.

**(a) Version Decision**: Install `inngest` at `^4.3.0` (latest GA release as of 2026‑05‑06). **v4 is chosen over v3** for these reasons:
- **Security**: CVE‑2026‑42047 affects v3.22.0 through v3.53.1 — those versions expose `process.env` via the `serve()` handler. v4 is not affected.
- **Architecture**: v4's `eventType()` with decentralized event definitions aligns with UBOS's multi‑domain architecture. Each domain can define its own events without a centralized registry bottleneck.
- **Performance**: Checkpointing (eager step progress) and parallel step optimization are enabled by default in v4, reducing latency for multi‑step workflows.
- **Longevity**: v4 is the current GA release and will receive all future improvements. v3 is now in maintenance mode.

**(b) Install and Pin**: Add `inngest: ^4.3.0` to `pnpm-workspace.yaml` catalog and `apps/web/package.json` dependencies. Run `pnpm install`. The `inngest` package (not `@inngest/sdk` — that's the JSR name) is the npm package. 

**(c) ADR**: Write `docs/adr/022‑inngest‑version.md` documenting: the choice of v4 over v3, the CVE‑2026‑42047 security rationale, the event registry strategy (decentralized `eventType()` definitions per domain), and a future consideration for v5 migrations.

**(d) Event Registry Strategy**: Events will be defined co‑located with their domain. The file structure:
```
apps/web/src/server/inngest/
  client.ts          — Inngest instance
  events.ts           — re‑exports all domain events
  events/
    auth.ts           — app/user.signup, app/user.deleted
    crm.ts            — crm/lead.created, crm/deal.won
    documents.ts      — document/uploaded, document/deleted
    finance.ts        — finance/invoice.paid, finance/bill.approved
    projects.ts       — project/task.completed
  functions/          — function definitions
```

**Research Findings (2026‑05‑06):**
- `inngest` v4.3.0 is the latest npm version 
- CVE‑2026‑42047: v3.22.0–3.53.1 affected; v4 not affected 
- v4 GA: March 16–17, 2026 
- `eventType()` replaces `EventSchemas`; uses Standard Schema (Zod, Valibot) for optional runtime validation 
- v4 default mode: `cloud` — needs `isDev: true` for local development 

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (pnpm catalog configured)

**Blocks:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-1` (client initialization)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-3` (event registry)

**Related Files:**
- `apps/web/package.json` (add `inngest` dep)
- `pnpm-workspace.yaml` (add to catalog)
- `docs/adr/022‑inngest‑version.md` (new)
- `apps/web/src/server/inngest/client.ts` (new — minimal client file)

**Definition of Done**
- [ ] `inngest` ^4.3.0 added to `pnpm-workspace.yaml` catalog and `apps/web/package.json`
- [ ] `pnpm install` completes without errors
- [ ] `docs/adr/022‑inngest‑version.md` written: covers v4 vs v3 decision, CVE‑2026‑42047 security rationale, event registry strategy, migration considerations
- [ ] Event registry file structure diagram documented in ADR or a follow‑up note
- [ ] `apps/web/src/server/inngest/client.ts` created with minimal `new Inngest({ id: "ubos", isDev: true })` for development
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Implementing event types (P0‑INNGEST‑3)
- Implementing functions (P0‑INNGEST‑4, P0‑INNGEST‑5)
- Inngest account setup and signing key configuration (handled in deployment)
- Automating the codemod for v3→v4 (not applicable — we start on v4)

**Rules to Follow**
- Pin to exact minor version (`^4.3.0`) to avoid unexpected breaking changes in v5.
- Never deploy v3 to production due to CVE‑2026‑42047.
- `isDev: true` must be set for local development to avoid the signing key requirement.
- The Inngest client instance must be a singleton — import from `client.ts` everywhere.

**Verification**
```bash
# Verify installation
pnpm ls inngest

# Verify v4 (not v3)
node -e "const p = require('inngest/package.json'); console.log(p.version)"
# Expected: 4.x.x

# Verify ADR exists
ls docs/adr/022-inngest-version.md

# Verify client file compiles
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (architectural decision)

---

#### Subtasks

- [ ] P0-INNGEST-0.0.25 (AGENT): Read the Inngest v4 migration guide, changelog, and CVE‑2026‑42047 advisory. Research npm latest version.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-INNGEST-0.0.5 (AGENT): Research event registry patterns for multi‑domain applications using Inngest v4 `eventType()`.
  **Verification:** Pattern documented.

- [ ] P0-INNGEST-0.1 (AGENT): Add `inngest` ^4.3.0 to `pnpm-workspace.yaml` catalog and `apps/web/package.json`. Run `pnpm install`.
  **File(s):** `pnpm-workspace.yaml`, `apps/web/package.json`
  **Verification:** `pnpm ls inngest` shows ^4.3.0.

- [ ] P0-INNGEST-0.2 (AGENT): Write `docs/adr/022‑inngest‑version.md` covering all required decisions.
  **File(s):** `docs/adr/022‑inngest‑version.md` (new)
  **Verification:** ADR covers v4 decision, security rationale, event registry strategy.

- [ ] P0-INNGEST-0.3 (AGENT): Create `apps/web/src/server/inngest/client.ts` with minimal Inngest client instance (`id: "ubos"`, `isDev: true`).
  **File(s):** `apps/web/src/server/inngest/client.ts` (new)
  **Verification:** Client file compiles without errors.

- [ ] P0-INNGEST-0.4 (HUMAN): Review ADR and version decision. Approve.
  **Verification:** Approved.

---

### [ ] P0-INNGEST-1: Initialize Inngest client with durable execution configuration

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P0‑INNGEST‑0 creates the minimal client (`new Inngest({ id: "ubos", isDev: true })`). However, this minimal configuration lacks: structured logging integration with the UBOS logger (P0‑OBS‑2), Cloudflare Workers middleware for environment variable passthrough, and production signing key configuration. The client is development‑only.
**Size:** Small

**Description:**
Harden the Inngest client created in P0‑INNGEST‑0 for production use. The client must:

**(a) Environment‑aware initialization**: Detect `process.env.NODE_ENV`. In development, use `isDev: true` (no signing key needed). In production, require `INNGEST_SIGNING_KEY` from environment variables. In staging, optionally use the dev server or a dedicated signing key.

**(b) Cloudflare Workers bindings middleware**: Create `apps/web/src/server/inngest/middleware/workers-bindings.ts` — a v4 middleware class that extracts `env` from the Hono context (`requestArgs[0].env`) and injects it into function handlers via `transformFunctionInput`. This makes `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `RESEND_API_KEY`, and other bindings available inside Inngest functions without each function manually retrieving them. 

**(c) Structured logging integration**: Wire the UBOS structured logger (P0‑OBS‑2) into the Inngest client via the `logger` option. Since the UBOS logger uses a custom API (not Pino‑compatible), create a lightweight adapter that implements Inngest's expected logger interface (`info()`, `warn()`, `error()`, `debug()`). Use `wrapStringFirstLogger()` from v4 if the UBOS logger takes message‑first format. 

**(d) `internalLogger` separation**: Configure `internalLogger` to use a separate log level (`warn` in production, `info` in development). This prevents SDK internal logs from flooding application logs while retaining application‑level log control. 

**(e) Retry defaults**: Verify that Inngest's default retry policy (3 retries with exponential backoff) is active. No explicit configuration needed unless custom retry policies are required for specific functions.

**Research Findings (2026‑05‑06):**
- v4 default mode is `cloud` — requires signing key. `isDev: true` bypasses this. 
- v4 middleware uses class‑based `Middleware.BaseMiddleware` with explicit lifecycle hooks 
- For Hono on Workers, `requestArgs[0]` is the Hono Context, and `requestArgs[0].env` provides bindings 
- `transformFunctionInput` injects values into the function handler's context 
- Structured logging uses object‑first (`logger.info({ key }, "msg")`); `wrapStringFirstLogger()` adapts string‑first loggers 
- Lazy init: v4 resolves `fetch` at first use, no need to manually bind `globalThis.fetch` 

**Depends on:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-0` (client file exists)
- `tasks/infrastructure/P0-OBS.md → P0-OBS-2` (structured logger available)

**Blocks:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-2` (serve handler)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-4` (welcome email function)

**Related Files:**
- `apps/web/src/server/inngest/client.ts` (harden)
- `apps/web/src/server/inngest/middleware/workers-bindings.ts` (new)
- `apps/web/src/lib/logger.ts` (reference — adapter target)

**Definition of Done**
- [ ] Client detects environment: `isDev: true` in development, signing key from env in production
- [ ] `workers-bindings.ts` middleware created: extracts `env` from Hono context, injects into function handlers
- [ ] Structured logger adapter created and wired via `logger` option
- [ ] `internalLogger` configured with separate log level (`warn` in prod)
- [ ] Client lazy‑initialization verified (no `globalThis.fetch` binding needed)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Custom retry policies per function (can be added per‑function as needed)
- Inngest Connect (worker thread mode — not applicable to Workers runtime)
- Event throttle/debounce configuration

**Rules to Follow**
- Never hard‑code the Inngest signing key in source or `wrangler.jsonc` — use `wrangler secret put INNGEST_SIGNING_KEY`.
- The middleware must never throw during `transformFunctionInput` — if `env` is missing, log a warning and pass through.
- Logger adapter must handle both object‑first and message‑first formats gracefully.
- Client singleton must remain the single source of truth — all code imports from `client.ts`.

**Verification**
```bash
# Verify environment-aware client
INNGEST_DEV=1 pnpm dev  # starts without signing key
# In production build, verify INNGEST_SIGNING_KEY is required

# Verify middleware injection
# Add a temporary test function that logs env keys
# Deploy to staging and check Inngest dashboard logs

# Verify structured logging
# Check Inngest dashboard → function runs → logs tab
# Should see UBOS logger format with requestId, userId, etc.

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a developer writing Inngest functions, I can access `DATABASE_URL`, `RESEND_API_KEY`, and other environment variables from within my function handlers without manually passing them.
- Deep Module: The Workers bindings middleware encapsulates all Cloudflare‑specific env extraction behind `transformFunctionInput`, making Inngest functions portable across runtimes without runtime‑specific code.

---

#### Subtasks

- [ ] P0-INNGEST-1.0.25 (AGENT): Read P0‑INNGEST‑0 output (client.ts). Research Inngest v4 client configuration options, middleware API, and logging integration.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-INNGEST-1.0.5 (AGENT): Research Inngest v4 Cloudflare Workers patterns and the `inngest/edge` vs `inngest/hono` adapter differences.
  **Verification:** Research documented.

- [ ] P0-INNGEST-1.1 (AGENT): Harden `client.ts` with environment detection, signing key configuration, and logger integration options.
  **File(s):** `apps/web/src/server/inngest/client.ts`
  **Verification:** Client initializes in both dev and production modes.

- [ ] P0-INNGEST-1.2 (AGENT): Create `apps/web/src/server/inngest/middleware/workers-bindings.ts` v4 middleware class.
  **File(s):** `apps/web/src/server/inngest/middleware/workers-bindings.ts` (new)
  **Verification:** Middleware compiles; `env` injected into function context.

- [ ] P0-INNGEST-1.3 (AGENT): Wire structured logger adapter into client (bridge UBOS logger ↔ Inngest logger interface).
  **File(s):** `apps/web/src/server/inngest/client.ts`
  **Verification:** Function logs appear in Inngest dashboard with UBOS logger format.

- [ ] P0-INNGEST-1.4 (AGENT): Configure `internalLogger` with separate log level.
  **File(s):** `apps/web/src/server/inngest/client.ts`
  **Verification:** SDK internal logs at `warn` level in production.

- [ ] P0-INNGEST-1.5 (HUMAN): Test client initialization in dev and production modes. Approve.
  **Verification:** Approved.

---

### [ ] P0-INNGEST-2: Mount Inngest serve handler on Hono API route

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The Hono app (`apps/web/src/server/api.ts`) does not have an `/api/inngest` route. Inngest functions defined in the codebase cannot be discovered or invoked by the Inngest platform. Without this route, the Inngest dev server cannot find functions, and the Inngest cloud cannot invoke them.
**Size:** Small

**Description:**
Add an `/api/inngest` route to the Hono app that serves Inngest functions. This single route is the gateway through which Inngest discovers function definitions and invokes function executions.

**Implementation steps:**
1. Import the Inngest client from `client.ts` and all function definitions into a barrel file.
2. Create the serve handler using the `serve` function from `inngest/hono`.
3. Mount the handler at `/api/inngest` using `app.use()` (handles all HTTP methods — GET, POST, PUT).
4. Register all currently defined functions (initially empty, then populated by P0‑INNGEST‑4 and P0‑INNGEST‑5).

**Code pattern**:
```typescript
// apps/web/src/server/api.ts
import { serve } from "inngest/hono";
import { inngest } from "./inngest/client";
import { functions } from "./inngest/functions"; // barrel export

const handler = serve({
  client: inngest,
  functions,
});

api.use("/api/inngest", handler);
```

**Serve handler behavior**: The Inngest platform (or dev server) periodically calls `GET /api/inngest` to poll for new function definitions. Function invocations are sent as `POST /api/inngest`. Both are handled automatically by the `serve` handler. There is no need to create separate GET and POST routes. 

**Research Findings (2026‑05‑06):**
- `import { serve } from "inngest/hono"` — the official Hono adapter import path 
- `serve()` returns a handler function compatible with `app.use()` 
- For TanStack Start projects, the alternative `inngest/edge` adapter is also available 
- CVE‑2026‑42047: ensure v4 is used (v3 serve handler leaks env on unhandled HTTP methods) 

**Depends on:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-1` (client initialized)

**Blocks:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-4` (welcome email function)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-5` (health check function)

**Related Files:**
- `apps/web/src/server/api.ts` (add `/api/inngest` route)
- `apps/web/src/server/inngest/functions/index.ts` (new — barrel export)

**Definition of Done**
- [ ] `serve` handler created and mounted at `/api/inngest` in the Hono app
- [ ] `GET /api/inngest` returns function definitions (verified via curl or browser)
- [ ] Inngest dev server (`npx inngest-cli@latest dev`) detects the SDK endpoint and discovers functions
- [ ] Inngest dev server dashboard (http://localhost:8288) shows the app registered and functions listed
- [ ] Production build includes the route (not gated to development only)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Production Inngest account setup and signing key configuration (handled in deployment)
- Custom serve options (streaming ingest) — use defaults for Phase 0
- `GET`, `POST`, and `PUT` route separation — the `serve` handler manages all methods automatically

**Rules to Follow**
- The `/api/inngest` route must be publicly accessible — do not add auth middleware to this route.
- Use `app.use()`, not `app.all()` — the serve handler internally dispatches to the correct HTTP method.
- The route must be added before any catch‑all or error handling middleware.
- Never gate `/api/inngest` to development only — it must be available in production for Inngest cloud invocation.

**Verification**
```bash
# Start dev server
pnpm dev
# Start Inngest dev server in another terminal
npx inngest-cli@latest dev

# Verify route responds
curl http://localhost:3000/api/inngest
# Expected: Inngest registration response (JSON)

# Verify Inngest dashboard discovers app
# Open http://localhost:8288
# Expected: "ubos" app listed, functions visible

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The `serve` handler encapsulates all Inngest protocol complexity (function registration, secure invocation, streaming) behind a simple Hono middleware, making the application unaware of the communication protocol with the Inngest platform.

---

#### Subtasks

- [ ] P0-INNGEST-2.0.25 (AGENT): Read current `apps/web/src/server/api.ts` structure. Research `inngest/hono` serve handler API.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-INNGEST-2.0.5 (AGENT): Research Inngest serve handler behavior: what HTTP methods it handles, how it communicates with the platform, and discoverability.
  **Verification:** Behavior understood.

- [ ] P0-INNGEST-2.1 (AGENT): Create barrel export for functions at `apps/web/src/server/inngest/functions/index.ts`.
  **File(s):** `apps/web/src/server/inngest/functions/index.ts` (new)
  **Verification:** Barrel exports empty array (or any defined functions).

- [ ] P0-INNGEST-2.2 (AGENT): Add serve handler to Hono app at `/api/inngest`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** `GET /api/inngest` responds with JSON.

- [ ] P0-INNGEST-2.3 (AGENT): Start Inngest dev server and verify SDK discovery.
  **Verification:** Inngest dashboard shows "ubos" app registered.

- [ ] P0-INNGEST-2.4 (HUMAN): Verify Inngest dev server discovers functions and the dashboard is functional. Approve.
  **Verification:** Approved.

---

### [ ] P0-INNGEST-3: Define unified cross‑domain event registry (Zod schemas) using Inngest v4 `eventType()` pattern

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** No event types are defined for any domain. The event bus has no schema. Without typed events, domain routers cannot emit events, and Inngest functions cannot reliably trigger on them. The v4 `eventType()` API provides both compile‑time type safety and optional runtime validation via Zod.
**Size:** Medium

**Description:**
Build the cross‑domain event registry using Inngest v4's `eventType()` with Zod schemas. Events are defined per‑domain and re‑exported through a barrel file. This enables: type‑safe event emission from tRPC procedures, type‑safe event handling in Inngest functions, and runtime validation of event payloads during development.

**Event naming convention**: `{domain}/{entity}.{action}` — e.g., `crm/lead.created`, `documents/uploaded`.

**Event definitions to create for Phase 0**:

| Event Name | Domain | Payload | Used By |
|---|---|---|---|
| `app/user.signup` | Auth | `{ userId: string, email: string, orgId: string }` | P0‑INNGEST‑4 (welcome email) |
| `crm/lead.created` | CRM | `{ leadId: string, orgId: string, userId: string }` | Phase 1 integrations |
| `crm/deal.won` | CRM | `{ dealId: string, orgId: string, userId: string, value: number }` | Phase 1 quote‑to‑cash |
| `documents/uploaded` | Documents | `{ documentId: string, orgId: string, userId: string, filename: string }` | Phase 1 virus scanning |
| `documents/deleted` | Documents | `{ documentId: string, orgId: string, userId: string }` | Phase 1 cleanup |
| `finance/invoice.paid` | Finance | `{ invoiceId: string, orgId: string, amount: number }` | Phase 1 accounting |
| `finance/bill.approved` | Finance | `{ billId: string, orgId: string, vendorId: string, amount: number }` | Phase 1 AP workflows |
| `project/task.completed` | Projects | `{ taskId: string, projectId: string, orgId: string, userId: string }` | Phase 1 project events |

Not all events need runtime consumers immediately — defining them now establishes the contract.

**File structure**:
```
apps/web/src/server/inngest/events/
  auth.ts       — app/user.signup
  crm.ts        — crm/lead.created, crm/deal.won
  documents.ts  — documents/uploaded, documents/deleted
  finance.ts    — finance/invoice.paid, finance/bill.approved
  projects.ts   — project/task.completed
  index.ts      — barrel re‑export
```

**Code pattern** (example — `apps/web/src/server/inngest/events/auth.ts`):
```typescript
import { eventType } from "inngest";
import { z } from "zod";

export const userSignup = eventType("app/user.signup", {
  schema: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    orgId: z.string().uuid(),
  }),
});
```

**Research Findings (2026‑05‑06):**
- v4 `eventType()` replaces `EventSchemas` — decentralized, with optional runtime validation 
- `eventType()` accepts a Standard Schema (Zod, Valibot, ArkType) or `staticSchema<T>()` for compile‑time only 
- Naming convention `{domain}/{entity}.{action}` is the community standard 
- Events can trigger one or multiple functions, enabling fan‑out 

**Depends on:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-0` (v4 decision and client)

**Blocks:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-4` (welcome email function uses `app/user.signup`)
- All Phase 1 domain integration tasks (`inngest.send()` calls)

**Related Files:**
- `apps/web/src/server/inngest/events/auth.ts` (new)
- `apps/web/src/server/inngest/events/crm.ts` (new)
- `apps/web/src/server/inngest/events/documents.ts` (new)
- `apps/web/src/server/inngest/events/finance.ts` (new)
- `apps/web/src/server/inngest/events/projects.ts` (new)
- `apps/web/src/server/inngest/events/index.ts` (new — barrel export)

**Definition of Done**
- [ ] All eight event types defined with Zod schemas across five domain files
- [ ] Barrel export at `events/index.ts` re‑exports all event types
- [ ] Each event type has: a descriptive name in the `{domain}/{entity}.{action}` format, a Zod schema for runtime validation, and a JSDoc comment describing when it fires
- [ ] TypeScript compilation succeeds; all event types are importable
- [ ] Quick test: `inngest.send(userSignup.create({ userId: "...", email: "...", orgId: "..." }))` compiles and types are correct
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Emitting events from tRPC procedures (Phase 1 — the procedures call `inngest.send()`)
- Defining events for domains not in scope (Assets, Portal — Phase 2)
- `cron` and `invoke` trigger helpers (not needed for Phase 0 event registry)

**Rules to Follow**
- Every event must have a schema — even if the payload seems simple now, explicit schemas prevent future drift.
- Event names must follow the `{domain}/{entity}.{action}` convention consistently.
- Zod schemas must use `.uuid()` for all ID fields — `string()` alone is too loose.
- Event schemas must not include PII beyond what is strictly necessary — prefer IDs over email addresses after the auth domain.

**Verification**
```bash
# Verify all event files exist
ls apps/web/src/server/inngest/events/auth.ts
ls apps/web/src/server/inngest/events/crm.ts
ls apps/web/src/server/inngest/events/documents.ts
ls apps/web/src/server/inngest/events/finance.ts
ls apps/web/src/server/inngest/events/projects.ts

# Verify barrel export
grep "export.*from" apps/web/src/server/inngest/events/index.ts

# Verify type safety
pnpm run typecheck

# Manual: import an event type and call .create() to verify types
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: Events are the integration language between bounded contexts. Each domain owns its events; the barrel export provides a unified catalog without coupling domains.
- Deep Module: `eventType()` encapsulates both TypeScript type generation and runtime Zod validation in a single definition, making event contracts self‑documenting and self‑validating.

---

#### Subtasks

- [ ] P0-INNGEST-3.0.25 (AGENT): Research Inngest v4 `eventType()` API, Standard Schema, and community event naming conventions.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-INNGEST-3.0.5 (AGENT): Design event payload schemas for all eight events, identifying which fields are required vs optional.
  **Verification:** Payload designs documented.

- [ ] P0-INNGEST-3.1 (AGENT): Create `apps/web/src/server/inngest/events/auth.ts` with `userSignup` event.
  **File(s):** `apps/web/src/server/inngest/events/auth.ts` (new)
  **Verification:** Event compiles; `.create()` returns correctly typed payload.

- [ ] P0-INNGEST-3.2 (AGENT): Create `apps/web/src/server/inngest/events/crm.ts` with `leadCreated`, `dealWon` events.
  **File(s):** `apps/web/src/server/inngest/events/crm.ts` (new)
  **Verification:** Events compile with correct schemas.

- [ ] P0-INNGEST-3.3 (AGENT): Create `apps/web/src/server/inngest/events/documents.ts`, `finance.ts`, `projects.ts` with domain events.
  **File(s):** `apps/web/src/server/inngest/events/documents.ts`, `finance.ts`, `projects.ts` (new)
  **Verification:** All events compile.

- [ ] P0-INNGEST-3.4 (AGENT): Create barrel export at `events/index.ts`.
  **File(s):** `apps/web/src/server/inngest/events/index.ts` (new)
  **Verification:** All events re‑exported.

- [ ] P0-INNGEST-3.5 (HUMAN): Review event naming conventions, schema definitions, and approve.
  **Verification:** Approved.

---

### [ ] P0-INNGEST-4: Build first Inngest function as proof‑of‑concept (welcome email on signup)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The email queue infrastructure (P0‑EMAIL‑0) is not yet built, so the welcome email cannot be delivered via the production email path. However, the Inngest function can be built as a proof‑of‑concept using: (1) a `step.run()` that logs the email content to the console/Inngest dashboard for verification, and (2) an integration point that will be wired to Resend when P0‑EMAIL is complete. No Inngest functions exist in the codebase.
**Size:** Medium

**Description:**
Build the first Inngest function as a proof‑of‑concept to validate the entire Inngest integration pipeline: event emission → function triggering → step execution → observability in the Inngest dashboard.

**Function definition** (`apps/web/src/server/inngest/functions/auth/welcome‑email.ts`):
- **Trigger**: `app/user.signup` event (from the event registry)
- **Steps**:
  1. `step.run("send-welcome-email", ...)` — sends the welcome email. For the POC, log the email to the Inngest dashboard using `logger.info()`. This demonstrates the step execution model and structured logging.
  2. (Future) When P0‑EMAIL‑0 is complete, replace the log step with `resend.emails.send()`.
- **Retry policy**: Default (3 retries with exponential backoff)
- **Idempotency**: Inngest automatically handles duplicate events via event ID deduplication

**Integration point for email delivery**:
```typescript
await step.run("send-welcome-email", async () => {
  // Phase 0 POC: log to Inngest dashboard
  logger.info({ userId: event.data.userId, email: event.data.email },
    "Welcome email would be sent here");
  
  // Phase 1 (when P0-EMAIL-0 is complete):
  // await resend.emails.send({
  //   from: "UBOS <welcome@ubos.app>",
  //   to: event.data.email,
  //   subject: "Welcome to UBOS",
  //   html: welcomeTemplate({ name: event.data.userId }),
  // });
});
```

**Event emission**: Add a `inngest.send()` call in the sign‑up flow (in the auth handler or the Better Auth callback). Since the sign‑up flow is in `apps/web/src/pages/SignUp.tsx`, create a server‑side function trigger: when the user signs up successfully, call `inngest.send(userSignup.create({ userId, email, orgId }))`. This can be done in the auth handler or via a tRPC mutation.

**Testing with Inngest Dev Server**: After `npx inngest-cli@latest dev`, use the Inngest Dev Server UI to manually send a test `app/user.signup` event and verify the function runs and logs appear.

**Research Findings (2026‑05‑06):**
- Inngest automatically retries failed steps independently 
- Event ID deduplication prevents duplicate processing 
- `step.run()` is the basic building block — it memoizes the result and retries only that step on failure 
- Resend integration pattern: `step.run("send-welcome-email", async () => { await resend.emails.send(...) })` 
- Inngest functions use `createFunction({ id, triggers }, handler)` in v4 API 

**Depends on:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-2` (serve handler mounted)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-3` (event types defined)
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0` (email queue — for production wiring, not for POC)

**Blocks:**
- Phase 1 integration tasks that extend the email sequence (drip campaigns, etc.)

**Related Files:**
- `apps/web/src/server/inngest/functions/auth/welcome‑email.ts` (new)
- `apps/web/src/server/inngest/functions/index.ts` (add to barrel export)
- `apps/web/src/pages/SignUp.tsx` or auth handler (add `inngest.send()` call)

**Definition of Done**
- [ ] `apps/web/src/server/inngest/functions/auth/welcome‑email.ts` created with v4 `createFunction` API
- [ ] Function triggers on `app/user.signup` event using `triggers: [userSignup]`
- [ ] Contains at least one `step.run()` demonstrating step execution
- [ ] Structured logging via `logger.info()` shows in Inngest dashboard
- [ ] Function added to functions barrel export and served via `/api/inngest`
- [ ] Inngest Dev Server discovers and lists the function
- [ ] Manual test via Inngest Dev Server UI: send test event → function executes → logs visible
- [ ] Wireframe `inngest.send()` integration point in sign‑up flow (commented or gated behind feature flag)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full email template (comes with P0‑EMAIL‑3)
- Resend domain setup (P0‑EMAIL‑1, P0‑EMAIL‑2)
- Email queue integration (P0‑EMAIL‑0)
- Drip campaign logic (Phase 2)

**Rules to Follow**
- The function handler must never throw unhandled errors — use try/catch in step.run() and handle failures gracefully.
- `inngest.send()` must be fire‑and‑forget — do not await it in the sign‑up flow (it would add latency to the user‑facing request).
- The event payload must not contain PII beyond the minimum needed — already enforced by the event schema (P0‑INNGEST‑3).
- All step IDs must be unique within the function and stable across deployments.

**Verification**
```bash
# Start dev server and Inngest dev server
pnpm dev
npx inngest-cli@latest dev

# Open Inngest dashboard
open http://localhost:8288

# Send a test event via the dashboard UI
# Event name: app/user.signup
# Payload: { "data": { "userId": "uuid", "email": "test@example.com", "orgId": "uuid" } }

# Verify: function runs, step executes, logs appear
# Check Inngest dashboard → Functions → welcome-email → Runs

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a new user, I want to receive a welcome email after signing up, sent reliably in the background without slowing down my sign‑up experience.
- Deep Module: The Inngest function encapsulates the entire welcome email workflow (sending, retrying on failure, logging) behind a single `createFunction()` call, hiding the complexity of durable execution and retry logic from the sign‑up handler.

---

#### Subtasks

- [ ] P0-INNGEST-4.0.25 (AGENT): Read Inngest v4 `createFunction` API, `step.run()` documentation, and the Resend integration pattern.
  **Verification:** Research documented.

- [ ] P0-INNGEST-4.0.5 (AGENT): Read current sign‑up flow in `apps/web/src/pages/SignUp.tsx` and auth handler to identify where to add `inngest.send()`.
  **Verification:** Integration point identified.

- [ ] P0-INNGEST-4.1 (AGENT): Create `apps/web/src/server/inngest/functions/auth/welcome‑email.ts` with v4 function definition.
  **File(s):** `apps/web/src/server/inngest/functions/auth/welcome‑email.ts` (new)
  **Verification:** Function compiles and is discoverable by Inngest Dev Server.

- [ ] P0-INNGEST-4.2 (AGENT): Add function to barrel export at `functions/index.ts`.
  **File(s):** `apps/web/src/server/inngest/functions/index.ts`
  **Verification:** Function served via `/api/inngest`.

- [ ] P0-INNGEST-4.3 (AGENT): Add `inngest.send()` call in sign‑up flow (fire‑and‑forget, not awaited).
  **File(s):** `apps/web/src/pages/SignUp.tsx` or server‑side auth handler
  **Verification:** Event sent on successful sign‑up.

- [ ] P0-INNGEST-4.4 (AGENT): Test end‑to‑end: sign up → event sent → function triggered → step executed → logs in Inngest dashboard.
  **Verification:** Full pipeline functional.

- [ ] P0-INNGEST-4.5 (HUMAN): Review POC function, verify Inngest dashboard observability, approve.
  **Verification:** Approved.

---

### [ ] P0-INNGEST-5: Extend health‑check function to ping Neon (keep‑warm) every 5 minutes

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Neon serverless databases automatically suspend after periods of inactivity, causing cold starts of 500ms–2s on the next query. There is no keep‑warm mechanism to maintain connection pool warmth or prevent database suspension. This directly impacts user experience when the application has been idle.
**Size:** Small

**Description:**
Create an Inngest cron function that pings the Neon database every 5 minutes to prevent cold starts and database suspension. This is a lightweight health‑check function that executes a simple `SELECT 1` query and logs the result.

**Function definition** (`apps/web/src/server/inngest/functions/infra/health‑check.ts`):
- **Trigger**: Cron schedule — `"TZ=UTC */5 * * * *"` (every 5 minutes) 
- **Handler**: Execute `SELECT 1` against the database using `getDb()` from `packages/db`. Log the execution time. If the query fails, the function will be retried automatically by Inngest (default retry policy).
- **Timeouts**: Set a 10‑second timeout on the database query to prevent hanging. If the query times out, Inngest will retry.
- **Observability**: Log each execution with latency to the Inngest dashboard for monitoring.

**Why Inngest cron instead of Cloudflare Workers Cron Triggers?** Inngest cron functions: (1) retry automatically on failure (Workers Cron Triggers do not retry), (2) provide execution history and logs in the Inngest dashboard, (3) can be monitored and alerted alongside other background jobs, and (4) are defined in the same codebase as other functions.

**Research Findings (2026‑05‑06):**
- Inngest cron syntax: `"TZ=UTC */5 * * * *"` — standard Unix cron with optional timezone prefix 
- `SELECT 1` is the standard database health‑check query 
- Neon automatically suspends inactive databases; keep‑warm pings prevent this 
- Inngest retries failed function invocations automatically 

**Depends on:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-2` (serve handler mounted)
- `tasks/infrastructure/P0-DB.md → P0-DB-1` (database connection available)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/inngest/functions/infra/health‑check.ts` (new)
- `apps/web/src/server/inngest/functions/index.ts` (add to barrel export)

**Definition of Done**
- [ ] `apps/web/src/server/inngest/functions/infra/health‑check.ts` created with cron trigger `"TZ=UTC */5 * * * *"`
- [ ] Function executes `SELECT 1` against the database
- [ ] Execution time logged via `logger.info({ latencyMs })`
- [ ] 10‑second query timeout configured
- [ ] Function added to barrel export
- [ ] Inngest dashboard shows recurring execution every 5 minutes
- [ ] Database cold starts reduced (verifiable via Neon dashboard → compute → activity graph)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Health check for other services (R2, Stripe, Resend) — the application‑level health endpoint (P0‑OBS‑4) covers those
- Alerting on health‑check failure (comes with production monitoring setup)
- Multi‑region keep‑warm (single region for Phase 0)

**Rules to Follow**
- The cron expression must use UTC to avoid timezone‑related scheduling gaps.
- The function must not hold a database connection open — connect, query, disconnect each invocation.
- Do not use a connection pool for the keep‑warm query — a single `pg.Client` or `neon()` query is sufficient.
- The function must be lightweight — under 100ms execution time in normal conditions.

**Verification**
```bash
# Verify function is discoverable
npx inngest-cli@latest dev
# Open Inngest dashboard → Functions → health-check
# Expected: Cron trigger listed, next run time displayed

# Verify execution
# Check Inngest dashboard → Functions → health-check → Runs
# Expected: runs every 5 minutes with "SELECT 1" result logged

# Verify database stays warm
# Check Neon dashboard → compute → activity
# Expected: no suspension periods

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The health‑check function hides the complexity of cron scheduling and retry logic behind a simple `createFunction({ triggers: [cron("*/5 * * * *")] })` declaration, making database keep‑warm a one‑file, zero‑infrastructure concern.

---

#### Subtasks

- [ ] P0-INNGEST-5.0.25 (AGENT): Research Inngest cron function patterns, Neon database suspension behavior, and keep‑warm best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-INNGEST-5.0.5 (AGENT): Research Inngest cron syntax (timezone prefix, jitter support) and function timeout configuration.
  **Verification:** Syntax confirmed.

- [ ] P0-INNGEST-5.1 (AGENT): Create `apps/web/src/server/inngest/functions/infra/health‑check.ts` with cron trigger and database ping.
  **File(s):** `apps/web/src/server/inngest/functions/infra/health‑check.ts` (new)
  **Verification:** Function compiles and cron trigger syntax is valid.

- [ ] P0-INNGEST-5.2 (AGENT): Add function to barrel export at `functions/index.ts`.
  **File(s):** `apps/web/src/server/inngest/functions/index.ts`
  **Verification:** Function served via `/api/inngest`.

- [ ] P0-INNGEST-5.3 (AGENT): Deploy and verify cron execution in Inngest dashboard.
  **Verification:** Runs appear every 5 minutes; database activity visible in Neon dashboard.

- [ ] P0-INNGEST-5.4 (HUMAN): Monitor keep‑warm for 1 hour, verify no database suspension. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑INNGEST group are covered.*

---
