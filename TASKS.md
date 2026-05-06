# Phase 0 — Foundation Infrastructure & Platform Services (Consolidated Master Task List)

This document incorporates all six iterations of analysis, cross‑validated against the verified repository state, industry research, and external critiques. Tasks are granular, file‑path‑specific, and dependency‑ordered. Every single file, configuration, and directory required for production readiness is explicitly listed.

---

## Task Group P0‑FOUND: Monorepo & Configuration Harness

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑FOUND‑1 | Verify and update root workspace configuration with Node.js >=22, pnpm >=10.29.1 for catalogMode fix, Wrangler v4.x | `/package.json` (engines), `pnpm-workspace.yaml` (catalog mode), `/turbo.json` (pipeline, environment variables) | None | Small |
| P0‑FOUND‑2 | Validate & extend root TypeScript configuration | `/tsconfig.base.json`, `/packages/tsconfig/vite.json` (TanStack Start targets) | P0‑FOUND‑1 | Trivial |
| P0‑FOUND‑3 | Establish unified linting and formatting rules | `/eslint.config.js` (monorepo root), `/.prettierrc` (formatting standards) | P0‑FOUND‑1 | Trivial |
| P0‑FOUND‑4 | Pin pnpm version >=10.29.1; if upgrading to v11, run `pnpm-v10-to-v11` codemod, migrate config from `.npmrc` to `pnpm-workspace.yaml`, and verify ESM compatibility | `pnpm-workspace.yaml`, `.npmrc`, `package.json` | P0‑FOUND‑1 | Medium |
| P0‑FOUND‑1a | Evaluate Turbo v2 Watch mode & remote caching; document decision | `/turbo.json`, ADR | P0‑FOUND‑1 | Small |
| P0‑FOUND‑5 | Create base CI pipeline (lint, typecheck, unit test on every PR) | `.github/workflows/ci.yml` | P0‑FOUND‑1, P0‑FOUND‑2, P0‑FOUND‑3 | Small |

---

## Task Group P0‑ENV: Environment & Configuration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑ENV‑1 | Define and document all required environment variables | `.env.example`, `wrangler.jsonc` | None | Small |

---

## Task Group P0‑SHELL: TanStack Start Runtime & Visual Shell

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑SHELL‑1 | Audit and finalize Vite build configuration | `/apps/web/vite.config.ts` (TanStack Start plugin, Tailwind v4, React compiler) | P0‑FOUND‑2 | Small |
| P0‑SHELL‑2 | Configure local Cloudflare emulation bindings | `/apps/web/wrangler.jsonc` (R2 bucket names, KV namespaces, environment variables) | P0‑SHELL‑1 | Small |
| P0‑SHELL‑3 | Verify Tailwind CSS v4 global directives and design tokens | `/apps/web/src/styles.css` (custom palette, dark theme, glassmorphism) | P0‑SHELL‑1 | Trivial |
| P0‑SHELL‑4 | Verify client hydration gateway | `/apps/web/src/entry‑client.tsx` (React 19 hydrateRoot) | P0‑SHELL‑1 | Trivial |
| P0‑SHELL‑5 | Harden server‑entry response (CSP, CORS, security headers) | `/apps/web/src/entry‑server.tsx` (streaming headers, content security policy) | P0‑SHELL‑1 | Small |
| P0‑SHELL‑6 | Consolidate root route layout (auth guard, query client, devtools) | `/apps/web/src/routes/__root.tsx` (beforeLoad checks, QueryClientProvider, Devtools) | P0‑SHELL‑4 | Small |
| P0‑SHELL‑7 | Verify and refactor shell components (sidebar, header, main layout) | `/apps/web/src/components/layout/MainLayout.tsx`, `Sidebar.tsx`, `Header.tsx` (responsive, accessible) | P0‑SHELL‑6 | Small |
| P0‑SHELL‑8 | Enable React 19 Compiler for automatic memoization | `.babelrc` or `vite.config.ts` plugin addition (opt‑in, build‑time optimization) | P0‑SHELL‑1 | Trivial |

---

## Task Group P0‑MOB: Mobile / PWA Strategy

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P0‑MOB‑1 | Define mobile use cases and target devices | `/docs/product/mobile‑use‑cases.md` | None | Trivial | Guides responsive efforts and PWA scope |
| P0‑MOB‑2 | Perform responsive audit of all 9 domain pages (320–428px) | Manual check against Figma/design; log issues in GitHub | P0‑SHELL‑7 | Small | Ensures basic usability on phones |
| P0‑MOB‑3 | Implement PWA offline caching for critical assets and previously loaded data | `/apps/web/src/entry‑client.tsx` (register service worker), `/apps/web/public/sw.js` | P0‑MOB‑1 | Medium | Enables re‑engagement and resilience on poor connections |
| P0‑MOB‑4 | Add mobile‑specific interactions where beneficial (swipe actions, bottom sheets) | Component‑by‑component; tracked as enhancement issues | P0‑MOB‑2 | Medium | Optional but improves UX; can be phased |

---

## Task Group P0‑DB: Database, RLS & Seeding Setup

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑DB‑1 | Configure dual Drizzle instances with Hyperdrive: a) `@neondatabase/serverless` + `drizzle-orm/neon-http` for runtime; b) `drizzle-orm/node-postgres` for migrations; c) add Hyperdrive binding as primary read path | `/packages/db/src/index.ts`, `/apps/web/wrangler.jsonc` (Hyperdrive binding) | P0‑FOUND‑1 | Medium |
| P0‑DB‑1a | Create migration script using Drizzle's programmatic `migrate()` API (not CLI) with try/catch and explicit error logging | `/packages/db/src/migrate.ts` | P0‑DB‑1 | Small |
| P0‑DB‑1b | Ensure migration connection uses non‑pooled Neon URL (separate from runtime HTTP‑pooled URL) | `.env`, migration script | P0‑DB‑1 | Small |
| P0‑DB‑2 | Validate migration configuration and lineage | `/packages/db/drizzle.config.ts` (dialect, schema paths, output directory) | P0‑DB‑1 | Small |
| P0‑DB‑3 | Consolidate & enhance existing RLS helpers (already in `policies.ts`) | `/packages/db/src/schema/policies.ts` | P0‑DB‑2 | Small |
| P0‑DB‑4 | Validate completeness of auth tables; add missing indexes if needed (tables exist) | `/packages/db/src/schema/auth.ts` | P0‑DB‑2 | Trivial |
| P0‑DB‑5 | Verify & enhance organizations table (table exists) | `/packages/db/src/schema/organizations.ts` | P0‑DB‑3 | Trivial |
| P0‑DB‑6 | Build deterministic database seeding engine | `/packages/db/src/seed.ts` (using drizzle‑seed, generating realistic test data for all domains) | P0‑DB‑5 | Medium |
| P0‑DB‑7 | Set up Neon branching for CI/CD preview environments with migration step | `.github/workflows/preview.yml` (create branch per PR, run migrations, delete on close) | P0‑DB‑1 | Medium |
| P0‑DB‑8 | Run `drizzle-kit up` to convert migration folder from journal to v3 structure; then run programmatic `migrate()` to upgrade `__drizzle_migrations` table to version 1 | `/packages/db/drizzle/` after conversion | P0‑DB‑1a | Medium |
| P0‑DB‑9 | Evaluate Drizzle v1 JIT mappers for frequently called queries; document performance impact | `/docs/adr/020‑jit‑mappers.md` | P0‑DB‑1 | Small (optional) |

---

## Task Group P0‑MIG: Data Migration Framework

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P0‑MIG‑1 | Document expand‑contract migration pattern as team standard | `/docs/development/migrations.md` (expand → backfill → contract) | P0‑DB‑2 | Trivial | Prevents downtime during schema changes |
| P0‑MIG‑2 | Add schema‑diff and migration compatibility check to CI | `.github/workflows/schema‑diff.yml` (run `drizzle‑kit check` against production branch schema) | P0‑DB‑7 | Medium | Catches breaking schema changes before merge |
| P0‑MIG‑3 | Implement automated rollback procedure (Neon PITR + migration reversal) | `/packages/db/scripts/rollback.sh` (documented runbook) | P0‑DB‑1 | Small | Mandatory for production database safety |
| P0‑MIG‑4 | Build backfill script template and guide for future schema additions | `/packages/db/scripts/backfill‑template.ts`, `/docs/development/backfill.md` | P0‑MIG‑1 | Small |
| P0‑MIG‑5 | Migration rehearsal – run migrations against a Neon branch scaled to production size before applying to prod | `.github/workflows/migration‑rehearsal.yml` (optional) | P0‑DB‑7 | Small |

---

## Task Group P0‑AUTH: Authentication & Multi‑Tenant Pipeline

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑AUTH‑1 | Audit & harden Better Auth engine (engine already operational) | `/packages/auth/src/index.ts` (auth instance, database adapter, organization plugin, TanStack Start cookies) | P0‑DB‑4 | Small |
| P0‑AUTH‑3 | Extend client auth wrapper with missing hooks (organisation switching, token refresh) | `/apps/web/src/lib/auth‑client.ts` (useSession, signIn, signUp, signOut, organization switching) | P0‑AUTH‑1 | Small |
| P0‑AUTH‑5 | Strengthen session security (timeout tiers, refresh token rotation, brute‑force protection) | `/packages/auth/src/index.ts` (configure session expiry, rate limits), `/apps/web/src/server/trpc/middleware/brute‑force.ts` | P0‑AUTH‑1 | Small |
| P0‑AUTH‑6 | Implement TOTP Multi‑Factor Authentication (MFA) | Better Auth `twoFactor` plugin, `/apps/web/src/routes/settings/security.tsx` (QR enrollment, recovery codes) | P0‑AUTH‑1 | Medium |
| P0‑AUTH‑7 | Configure enterprise SSO plugin (SAML 2.0, OIDC) for future use; add explicit step: `pnpm add @better-auth/sso` before configuration | `/packages/auth/src/index.ts`, `package.json` | P0‑AUTH‑1 | Small |
| P0‑AUTH‑CF‑1 | Apply Cloudflare‑specific Better Auth fixes: a) `AbortSignal.timeout(5000)` on `getSession`; b) configure `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]`; c) verify rate limiting active via `wrangler tail` | `/packages/auth/src/index.ts`, `/apps/web/src/server/trpc/middleware/brute-force.ts` | P0‑AUTH‑1 | Small |
| P0‑AUTH‑EVAL‑1 | Evaluate Better Auth stateless sessions for Workers performance AND evaluate `better-auth-cloudflare` package; document decision | `/docs/adr/021‑session‑strategy.md` | P0‑AUTH‑CF‑1 | Small |
| P0‑AUTH‑PERF‑1 | Benchmark password hashing on Workers (Argon2id vs scrypt via `nodejs_compat` flag); if scrypt available and faster, configure Better Auth to use it | `/packages/auth/src/index.ts` | P0‑AUTH‑CF‑1 | Small |
| P0‑AUTH‑8 | Build email verification flow – after sign‑up send verification link via queue; add "verify‑email" page and guard middleware | `/apps/web/src/server/email/templates/verify‑email.ts`, `/apps/web/src/routes/verify‑email.tsx`, `/apps/web/src/server/trpc/middleware/email‑verified.ts` | P0‑AUTH‑1, P0‑EMAIL‑0 | Small |
| P0‑AUTH‑9 | Build password reset flow – "forgot password" page, reset token email via queue, reset page | `/apps/web/src/routes/forgot‑password.tsx`, `/apps/web/src/routes/reset‑password.tsx`, `/apps/web/src/server/auth/reset‑password.ts` | P0‑AUTH‑1, P0‑EMAIL‑0 | Small |
| P0‑AUTH‑10 | Build account deactivation/deletion – user can request deletion; soft‑delete with grace period, GDPR delete function stub | `/apps/web/src/routes/settings/account.tsx` (delete section), `/apps/web/src/server/auth/delete‑account.ts` | P0‑AUTH‑1 | Small |
| P0‑AUTH‑11 | Enforce password policies – minimum length 12, check against HaveIBeenPwned API on change | `/packages/auth/src/password‑policy.ts`, integrate into sign‑up/reset | P0‑AUTH‑1 | Trivial |
| P0‑AUTH‑5‑EXT | Extend session security: invalidate all sessions on password change; add brute‑force detection (lock after 10 failed attempts for 15 min) | `/packages/auth/src/index.ts` (session config), `/apps/web/src/server/trpc/middleware/brute‑force.ts` (extend) | P0‑AUTH‑5 | Small |
| P0‑AUTH‑EVAL‑DOC | Write Session Strategy ADR (stateless JWT vs DB-backed) | `docs/architecture/adr-session-strategy.md` | P0‑AUTH‑1 | Trivial |
| P0‑AUTH‑PERF‑DOC | Run password hashing benchmark and write ADR (P0‑AUTH‑PERF-1) | `docs/architecture/adr-password-hashing.md` | P0‑AUTH‑1, P0‑ENV‑2 | Small |

---

## Task Group P0‑TRPC: tRPC Server Context & Router Layer

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑TRPC‑1 | Finalize tRPC init (error formatting, logger middleware, context) | `/apps/web/src/server/trpc/init.ts` (errorFormatter stripping stack in production, global onError) | P0‑AUTH‑1 | Small |
| P0‑TRPC‑2 | Implement tenant enforcement middleware (SET LOCAL app.current_tenant_id) | `/apps/web/src/server/trpc/middleware/tenant.ts` (transaction wrapping to inject tenant context) | P0‑DB‑3 | Small |
| P0‑TRPC‑3 | Build Role‑Based Access Control (RBAC) middleware | `/apps/web/src/server/trpc/middleware/rbac.ts` (hasPermission check per procedure, staticData.requiredPermission) | P0‑TRPC‑2 | Medium |
| P0‑TRPC‑4 | Build MFA step‑up middleware for privileged mutations | `/apps/web/src/server/trpc/middleware/mfa.ts` (recent MFA verification required) | P0‑AUTH‑6 | Small |
| P0‑TRPC‑5 | Implement idempotency key middleware for finance mutations | `/apps/web/src/server/trpc/middleware/idempotency.ts` (insert‑lock‑complete pattern) | P0‑TRPC‑2 | Medium |
| P0‑TRPC‑6 | Implement audit log middleware (capture before/after, actor, tenant) | `/apps/web/src/server/trpc/middleware/audit.ts` (transactional log co‑located with mutation) | P0‑TRPC‑2 | Medium |
| P0‑TRPC‑7 | Build rate‑limiting middleware (sliding window per organization) | `/apps/web/src/server/trpc/middleware/rate‑limit.ts` (Cloudflare KV backed) | P0‑TRPC‑2 | Medium |
| P0‑TRPC‑8 | Create root router aggregating all domain routers | `/apps/web/src/server/trpc/routers/_app.ts` (merges CRM, Documents, Projects, Finance, etc.) | P0‑TRPC‑3 | Small |
| P0‑TRPC‑10 | Serve versioned OpenAPI endpoint at `/api/v1/openapi.json` (existing generation works) | `/apps/web/src/server/api.ts` | P0‑TRPC‑8 | Small |
| P0‑TRPC‑0 | Define and document tRPC middleware ordering pipeline (Rate Limit → Auth → Tenant → MFA → RBAC → Idempotency → Procedure → Audit) | `/apps/web/src/server/trpc/middleware/pipeline.ts` (export composed array), `/docs/architecture/middleware.md` | P0‑TRPC‑2, P0‑TRPC‑3 | Small |

---

## Task Group P0‑OBS: Observability & Logging

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑OBS‑1 | Integrate error monitoring (Sentry) into server functions and router; pin `@sentry/cloudflare@^10.48.0`; DSN via `wrangler secret`; source maps via Wrangler post‑deploy hook; add Workers specific beforeSend filter | `/apps/web/src/server/instrumentation.ts`, `wrangler.jsonc` | P0‑SHELL‑5 | Small |
| P0‑OBS‑2 | Implement structured JSON logging with correlation IDs | `/apps/web/src/lib/logger.ts` (Winston/Pino, per‑request UUID, tenant context) | P0‑SHELL‑5 | Medium |
| P0‑OBS‑3 | Build PII redaction filter for all log outputs | `/apps/web/src/lib/logger/redactor.ts` (scrub SSNs, credit cards, emails, passwords before external logging) | P0‑OBS‑2 | Small |
| P0‑OBS‑4 | Configure health check endpoints with dependency status | `/apps/web/src/server/api.ts` (health endpoint verifying DB, R2, Inngest, Stripe connectivity) | P0‑TRPC‑8 | Small |
| P0‑OBS‑5 | Set up performance monitoring (tRPC procedure timing, DB query timing) | `/apps/web/src/server/trpc/middleware/timing.ts` (capture and export metrics) | P0‑OBS‑2 | Small |
| P0‑OBS‑6 | Create real‑user monitoring (Web Vitals) reporting | `/apps/web/src/entry‑client.tsx` (inject RUM agent for LCP, CLS, INP) | P0‑SHELL‑4 | Trivial |

---

## Task Group P0‑SEC: Security Hardening

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑SEC‑1 | Configure Content Security Policy (CSP) and CORS headers | `/apps/web/src/entry‑server.tsx` (dynamic CSP per environment) | P0‑SHELL‑5 | Small |
| P0‑SEC‑2 | Enforce HTTPS and HSTS headers | `/apps/web/src/entry‑server.tsx` (Strict‑Transport‑Security) | P0‑SHELL‑5 | Trivial |
| P0‑SEC‑3 | Implement API key management for programmatic access | `/packages/db/src/schema/api‑keys.ts`, `/apps/web/src/server/trpc/middleware/api‑key.ts` | P0‑DB‑5 | Small |
| P0‑SEC‑4 | Build automated tenant isolation test suite | `/tests/e2e/tenant‑isolation.spec.ts` (create two tenants, verify cross‑tenant data blindness via Playwright) | P0‑DB‑6, P0‑TRPC‑2 | Medium |
| P0‑SEC‑5 | Harden file upload security (filename sanitization, CVE‑2026‑34750 mitigation) | `/apps/web/src/server/storage/validation.ts` (reject traversal sequences, enforce safe character set) | P0‑STORAGE‑2 | Small |
| P0‑SEC‑6 | Supply‑chain hardening: pin pnpm >=10.12 (PackageGate fix); add `pnpm audit` to CI with fail‑on‑critical; configure Dependabot weekly; document `minimumReleaseAge` trade‑off | `.github/workflows/ci.yml`, `.github/dependabot.yml`, ADR | P0‑FOUND‑4 | Small |
| P0‑SEC‑7 | CSRF protection for tRPC – set `SameSite=Strict` on auth cookies, add custom header check middleware | `/packages/auth/src/index.ts` (cookie config), `/apps/web/src/server/trpc/middleware/csrf.ts` | P0‑AUTH‑1 | Small |

---

## Task Group P0‑STORAGE: File Storage (Cloudflare R2)

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑STORAGE‑1 | Configure R2 bucket and bindings for local/production environments | `/apps/web/wrangler.jsonc` (bucket names, environment variables) | P0‑SHELL‑2 | Small |
| P0‑STORAGE‑2 | Build R2 presigned URL operations wrapper | `/apps/web/src/server/storage/r2.ts` (generate upload/download URLs, CORS config, size limits) | P0‑STORAGE‑1 | Medium |
| P0‑STORAGE‑3 | Replace "ClamAV via Inngest" with design spike; implementation will use either a 3rd‑party scanning API or a separate container, called from an Inngest function | `/docs/research/virus-scanning.md`, then `/apps/web/src/server/inngest/functions/storage/scan-file.ts` | P0‑STORAGE‑2 | Large |

---

## Task Group P0‑INNGEST: Background Jobs & Event Bus

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑INNGEST‑0 | Pin Inngest SDK version (choose v4 with `eventType()`); adapt event registry plan accordingly | `/apps/web/src/server/inngest/client.ts`, `/docs/adr/022‑inngest‑version.md` | None | Small |
| P0‑INNGEST‑1 | Initialize Inngest client with durable execution configuration | `/apps/web/src/server/inngest/client.ts` (inngest instance, event schemas) | P0‑TRPC‑8 | Small |
| P0‑INNGEST‑2 | Mount Inngest serve handler on Hono API route | `/apps/web/src/server/api.ts` (serve handler for `/api/inngest`) | P0‑INNGEST‑1 | Small |
| P0‑INNGEST‑3 | Define unified cross‑domain event registry (Zod schemas) using Inngest v4 `eventType()` pattern | `/apps/web/src/server/inngest/events.ts` (crm.deal.won, document.uploaded, invoice.paid, etc.) | P0‑INNGEST‑0 | Medium |
| P0‑INNGEST‑4 | Build first Inngest function as proof‑of‑concept (welcome email on signup) | `/apps/web/src/server/inngest/functions/auth/welcome‑email.ts` (triggers on auth event, sends via Resend) | P0‑INNGEST‑2, P0‑EMAIL‑1 | Small |
| P0‑INNGEST‑5 | Extend health‑check function to ping Neon (keep‑warm) every 5 minutes | `/apps/web/src/server/inngest/functions/infra/health‑check.ts` | P0‑INNGEST‑2 | Small |

---

## Task Group P0‑EMAIL: Email Delivery (Resend)

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑EMAIL‑0 | Establish transactional email infrastructure (Resend) — create packages/email with send() wrapper, configure RESEND_API_KEY | `packages/email/ (new package)`, `.env.example`, `wrangler.jsonc` | P0‑FOUND‑1, P0‑ENV‑1 | Medium |
| P0‑EMAIL‑0a | Create `email-queue` Cloudflare Queue with `max_batch_size: 2`; create queue consumer Worker that dequeues and sends via Resend; all email‑sending code must enqueue | `/apps/web/wrangler.jsonc`, `/apps/web/src/server/email/queue-consumer.ts` | P0‑EMAIL‑0 | Large |
| P0‑EMAIL‑0b | Build `enqueueEmail()` helper used by all server‑side email paths; dispatches to the queue | `/apps/web/src/server/email/enqueue.ts` | P0‑EMAIL‑0 | Small |
| P0‑EMAIL‑0c | Configure dead‑letter queue for failed email deliveries after 3 retries | `/apps/web/wrangler.jsonc` | P0‑EMAIL‑0 | Small |
| P0‑EMAIL‑1 | Configure Resend sending domain with SPF, DKIM, DMARC DNS records | (DNS configuration outside repo) `/apps/web/src/server/email/resend.ts` (Resend client initialization) | P0‑EMAIL‑0 | Small |
| P0‑EMAIL‑2 | Set up transactional email subdomain (e.g., mail.ubos.app) | DNS records + Resend domain verification | P0‑EMAIL‑1 | Small |
| P0‑EMAIL‑3 | Build transactional email template system with variable injection | `/apps/web/src/server/email/templates/` (welcome, invite, password reset, notification) | P0‑EMAIL‑1 | Medium |
| P0‑EMAIL‑4 | Implement bounce and complaint webhook handling | `/apps/web/src/routes/api/email/webhook.ts` (suppress hard bounces, alert on complaint spikes) | P0‑EMAIL‑2 | Small |

---

## Task Group P0‑BILLING: Stripe Integration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑BILLING‑1 | Configure Stripe account, API keys, and environment variables | Environment variables + `/apps/web/src/server/stripe/client.ts` (Stripe instance) | None | Small |
| P0‑BILLING‑2 | Update webhook signature verification to use `stripe.webhooks.constructEventAsync(body, signature, secret)` with `await request.text()`; Stripe client init with `Stripe.createFetchHttpClient()` | `/apps/web/src/routes/api/stripe/webhook.ts` | P0‑BILLING‑1 | Small |
| P0‑BILLING‑3 | Build idempotency ledger for Stripe events (two‑tier: in‑memory + DB) | `/packages/db/src/schema/stripe‑events.ts` (unique constraint on event ID) + middleware in webhook handler | P0‑BILLING‑2 | Medium |
| P0‑BILLING‑4 | Handle subscription lifecycle events (checkout completed, updated, deleted) | `/apps/web/src/server/inngest/functions/billing/subscription‑sync.ts` (persist subscription state to DB) | P0‑BILLING‑3, P0‑INNGEST‑2 | Medium |
| P0‑BILLING‑5 | Build Stripe Customer Portal passthrough for self‑service billing | `/apps/web/src/routes/api/stripe/portal.ts` (generate portal session URL) | P0‑BILLING‑1 | Small |

---

## Task Group P0‑DX: Developer Experience & API Documentation

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑DX‑1 | Generate and serve API documentation portal using `@scalar/hono-api-reference` middleware | `/apps/web/src/server/api.ts` (serve Scalar UI at `/api/docs`) | P0‑TRPC‑10 | Small |
| P0‑DX‑2 | Set up automated SDK generation pipeline (Speakeasy or Orval) | `.github/workflows/sdk‑publish.yml` (trigger on OpenAPI spec change, publish to npm) | P0‑DX‑1 | Medium |
| P0‑DX‑3 | Create database seed scripts for all domains (deterministic, seeded PRNG) | `/packages/db/src/seed.ts` (extends existing, adds realistic multi‑tenant data) | P0‑DB‑6 | Medium |
| P0‑DX‑4 | Configure Changesets for monorepo versioning and changelog generation | `/packages/*/package.json` (add changeset config, CI release workflow) | P0‑FOUND‑1 | Small |
| P0‑DX‑5 | Document TanStack Start debugging limitations and alternative patterns | `/docs/development/debugging.md` (browser DevTools, structured logging guide) | P0‑OBS‑2 | Trivial |
| P0‑DX‑6 | Set up Storybook for UI component library (initial 10 components) | `/apps/web/.storybook/`, `/apps/web/src/components/ui/*.stories.tsx` | P0‑SHELL‑7 | Medium |
| P0‑DX‑7 | Write Architecture Decision Records for auth, database, hosting, and tRPC; include ADR for RSC deferral (no TanStack Start RSC until Phase 3+) and import protection status | `/docs/adr/013‑auth‑system.md`, `014‑database‑strategy.md`, `015‑hosting.md`, `016‑trpc‑architecture.md`, `017‑rsc‑deferral.md` | P0‑FOUND‑1 | Small |
| P0‑DX‑8 | Add pre‑commit hooks (Husky + lint‑staged) and enforce test coverage thresholds in CI | `.husky/pre‑commit`, `package.json` scripts, `.github/workflows/ci.yml` (coverage gate) | P0‑FOUND‑3 | Small |

---

## Task Group P0‑DR: Disaster Recovery & Operations

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑DR‑1 | Document Backup & Disaster Recovery runbook – Neon PITR restore procedure, R2 backup instructions | `/docs/operations/disaster‑recovery.md` | P0‑DB‑1 | Trivial |
| P0‑DR‑2 | Secrets rotation strategy – document rotation steps for DATABASE_URL, Stripe keys, Resend API key; integrate into CI variables | `/docs/operations/secrets‑rotation.md` | P0‑FOUND‑1 | Trivial |

---

## Task Group P0‑DEPLOY: Deployment & CI/CD

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑DEPLOY‑1 | Set up GitHub Actions for basic staging deployment using `wrangler publish` with environment‑specific variables | `.github/workflows/deploy-staging.yml` | P0‑SHELL‑2 | Medium |
| P0‑DEPLOY‑2 | Configure Cloudflare Workers Builds for automatic build & deploy on push to `main`; preview environments for PR branches | Cloudflare dashboard / `wrangler.jsonc` | P0‑DEPLOY‑1 | Small |

---

## Task Group P0‑ENV: Environment & Configuration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑ENV‑1 | Extend environment variable validation to also validate Cloudflare bindings (R2, KV, secrets like DATABASE_URL, STRIPE_SECRET, RESEND_API_KEY) at worker startup | `/apps/web/src/server/env-validator.ts` | P0‑SHELL‑5 | Small |
| P0‑ENV‑2 | Document Workers Paid plan ($5/month) as minimum; configure CPU time limit to 30s in `wrangler.jsonc`; note Argon2id may still need optimization | `/docs/deployment/workers‑plan.md`, `wrangler.jsonc` | P0‑SHELL‑2 | Small |

---

## Task Group P0‑ACC: Accessibility Compliance (WCAG 2.2 AA)

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑ACC‑1 | Automated accessibility audit of all 56 UI components and 9 domain pages targeting WCAG 2.2 AA | `/tests/accessibility/axe‑audit.spec.ts` (Playwright + axe‑core in CI) | P0‑SHELL‑7 | Medium |
| P0‑ACC‑2 | Keyboard‑only navigation audit (Tab, Enter, Escape, arrow keys) | Manual test script documented in `/docs/testing/accessibility.md` | P0‑ACC‑1 | Small |
| P0‑ACC‑3 | Screen reader compatibility testing (NVDA/VoiceOver) for core CRUD flows | `/docs/testing/accessibility.md` (testing checklist) | P0‑ACC‑2 | Small |
| P0‑ACC‑4 | Color contrast compliance verification against WCAG 2.2 thresholds (4.5:1 normal text, 3:1 large text) | Automated via axe‑core; manual verification report in `/docs/testing/accessibility.md` | P0‑ACC‑1 | Trivial |
| P0‑ACC‑5 | Publish accessibility statement at `/accessibility` referencing WCAG 2.2 AA conformance | `/apps/web/src/routes/accessibility.tsx` (conformance level, contact info) | P0‑ACC‑4 | Trivial |

---

## Task Group P0‑FEAT: Feature Flag Infrastructure

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P0‑FEAT‑1 | Integrate PostHog (or open‑source alternative) for feature flag management; add bootstrapping step: fetch feature flags during SSR, inject via `posthog.init({ bootstrap: { featureFlags } })` | `/apps/web/src/lib/feature‑flags.ts` (PostHog React SDK provider) | P0‑SHELL‑4 | Small |
| P0‑FEAT‑2 | Build feature flag wrapper component for conditional UI rendering | `/apps/web/src/components/FeatureFlag.tsx` (render children only when flag enabled) | P0‑FEAT‑1 | Small |
| P0‑FEAT‑3 | Configure per‑organization feature flag targeting for beta/early‑access | PostHog dashboard + org property mapping | P0‑FEAT‑1 | Small |

---

## Task Group P0‑I18N: Internationalisation & Localisation

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P0‑I18N‑1 | Set up i18n infrastructure with namespace‑based translation files | `packages/i18n/src/` (react‑i18next provider, JSON namespace files for en‑US) | P0‑FOUND‑1 | Medium | Required for later multi‑language support; must be done before hardcoded strings proliferate |
| P0‑I18N‑2 | Extract all user‑facing strings from 56 UI components and 9 domain pages | All `.tsx` files in `/apps/web/src/` – replace hardcoded text with `t()` calls | P0‑I18N‑1 | Large | Prevents expensive retrofitting; aligns with WCAG and enterprise expectations |
| P0‑I18N‑3 | Implement locale‑aware number, date, and currency formatting | `/apps/web/src/lib/format.ts` (wrappers around `Intl` APIs, date‑fns locale) | P0‑I18N‑1 | Medium | Essential for Finance, CRM, and any external‑facing content |
| P0‑I18N‑4 | Configure RTL layout support in Tailwind and component library | `/apps/web/src/styles.css` (add `[dir="rtl"]` utilities), verify all 56 components | P0‑I18N‑1 | Medium | Opens Arabic, Hebrew, etc. markets |

---

## Task Group P0‑API: API Versioning & Governance

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P0‑API‑1 | Define API versioning strategy (URL‑based `/api/v{N}/`) | `/docs/api/versioning.md` | P0‑TRPC‑10 | Trivial | Establishes contract for public API |
| P0‑API‑2 | Implement deprecation header injection (`Sunset`, `Deprecation`) on older endpoints | `/apps/web/src/server/trpc/middleware/deprecation.ts` | P0‑API‑1 | Small | Gives integrators clear migration timeline |
| P0‑API‑3 | Add OpenAPI diff step to CI to detect breaking changes | `.github/workflows/api‑diff.yml` (run `openapi‑diff` or Speakeasy linter) | P0‑DX‑2 | Medium | Prevents accidental breaking changes to public API |
| P0‑API‑4 | Generate and publish versioned SDKs automatically | Extend `sdk‑publish.yml` to version output | P0‑DX‑2 | Medium | Professional developer experience |

---

## Dependency Ordering Summary

The following is the correct sequential build order for Phase 0, ensuring no task is blocked:

1. **P0‑FOUND** (monorepo, TypeScript, linting) → **P0‑FOUND‑4** (pnpm pinning)
2. **P0‑SHELL‑1 → P0‑SHELL‑4 → P0‑SHELL‑6 → P0‑SHELL‑7** (Vite config, entry points, root route, shell components)
3. **P0‑DB‑1 → P0‑DB‑1a, 1b → P0‑DB‑8 → P0‑DB‑2 → P0‑DB‑3 → P0‑DB‑4, P0‑DB‑5, P0‑DB‑6** (database configuration, migrations, RLS, schemas, seeding)
4. **P0‑AUTH‑1 → P0‑AUTH‑CF‑1 → P0‑AUTH‑EVAL‑1 → P0‑AUTH‑PERF‑1** (auth engine, Cloudflare fixes, session strategy, hashing performance)
5. **P0‑TRPC‑1 → P0‑TRPC‑2, P0‑TRPC‑3, P0‑TRPC‑5, P0‑TRPC‑6, P0‑TRPC‑7 (middleware) → P0‑TRPC‑0, P0‑TRPC‑8, P0‑TRPC‑10** (tRPC core, middleware, router, OpenAPI)
6. **P0‑ENV‑1 → P0‑EMAIL‑0 → P0‑EMAIL‑0a, 0b, 0c → P0‑EMAIL‑1, P0‑EMAIL‑2, P0‑EMAIL‑3, P0‑EMAIL‑4** (environment variables → email infrastructure)
7. **P0‑INNGEST‑0 → P0‑INNGEST‑1 → P0‑INNGEST‑2 → P0‑INNGEST‑3, P0‑INNGEST‑4, P0‑INNGEST‑5** (background jobs)
8. **P0‑BILLING‑1 → P0‑BILLING‑2 → P0‑BILLING‑3, P0‑BILLING‑4, P0‑BILLING‑5** (Stripe integration)
9. **P0‑STORAGE‑1 → P0‑STORAGE‑2 → P0‑STORAGE‑3** (R2 file storage)
10. **P0‑DEPLOY‑1 → P0‑DEPLOY‑2** (deployment workflows)
11. **P0‑OBS, P0‑SEC, P0‑DX, P0‑ACC, P0‑FEAT, P0‑I18N, P0‑API** (non‑blocking but critical for production readiness)
12. **P0‑DR, P0‑MIG‑4, P0‑MIG‑5** (operations and environment validation)

### Critical Path for Phase 1

**P1‑ROUTE‑1** (dashboard layout) **MUST** precede all Phase 1 UI tasks.

---

# Phase 1 — Core Vertical Slices & Cross‑Module Infrastructure (Consolidated Master Task List)

All tasks are file‑path‑specific, sized, and dependency‑ordered. This phase transforms the mock UI into fully functional, production‑grade business domains following the CRM‑established pattern: Drizzle schema → tRPC procedures (with tenant/RBAC middleware) → TanStack Query UI (optimistic updates, toast notifications). Every task can be checked off as a discrete file or configuration change.

### P1‑ROUTE: Critical Infrastructure Task

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| **P1‑ROUTE‑1** | **Create pathless `_dashboard` layout route (using underscore convention) with MainLayout wrapper; migrate all domain lazy routes into `_dashboard/` sub‑directories or dot‑separated files** | `/apps/web/src/routes/_dashboard.tsx`, move existing lazy routes | None (infra) | Large |

---

## Task Group P1‑SETTINGS: Settings Architecture & UI

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑SETTINGS‑ARCH‑1 | Build Settings 2-level sidebar layout route | `/apps/web/src/routes/dashboard/settings.tsx` (layout route) | P1‑ROUTE‑1 | Medium |
| P1‑SETTINGS‑SEARCH | Build Settings search/filter within settings sidebar | `/apps/web/src/components/settings/SettingsSearch.tsx` | P1‑SETTINGS‑ARCH‑1 | Small |
| P1‑SETTINGS‑3 | Build Notification Preferences settings page | `/apps/web/src/routes/dashboard/settings/notifications.tsx` | P1‑INTEG‑6, P1‑NOTIF‑1 | Small |
| P1‑SETTINGS‑4 | Build Email Settings page (sending domain, reply-to, signature) | `/apps/web/src/routes/dashboard/settings/email.tsx` | P0‑EMAIL‑0, P0‑EMAIL‑1 | Small |
| P1‑AUTH‑PROFILE | Build User Profile settings page (consolidate P1‑ONBOARD‑2) | `/apps/web/src/routes/dashboard/settings/profile.tsx` | P1‑ONBOARD‑2, P0‑STORAGE‑2 | Small |

---

## Task Group P1‑CRM: Customer Relationship Management

*Purpose: Complete the CRM module with contacts, companies, deals, activities, pipelines, and custom fields. Currently only leads are functional.*

### P1‑CRM‑SCHEMA — Database Schema

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑CRM‑SCHEMA‑1 | Define and migrate complete CRM tables (contacts, companies, deals, activities, pipelines, pipeline_stages, custom_fields) | `/packages/db/src/schema/crm.ts` (extend existing with all tables, FK constraints, RLS policies) | P0‑DB‑5 | Medium |
| P1‑CRM‑SCHEMA‑2 | Add polymorphic `entity_links` junction table for cross‑domain attachments (used by CRM ↔ Docs, etc.) | `/packages/db/src/schema/entity‑links.ts` (entity_type, entity_id, target_type, target_id, org_id) | P0‑DB‑5 | Small |
| P1‑CRM‑SCHEMA‑3 | Create generated migration and apply to staging/development | `drizzle‑kit generate` + `drizzle‑kit migrate` | P1‑CRM‑SCHEMA‑1 | Small |

### P1‑CRM‑TRPC — tRPC Procedures

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑CRM‑TRPC‑1 | Build contacts CRUD router (list, create, update, delete, search) | `/apps/web/src/server/trpc/routers/crm/contacts.ts` (Zod input/output, tenantProcedure) | P1‑CRM‑SCHEMA‑1, P0‑TRPC‑8 | Medium |
| P1‑CRM‑TRPC‑2 | Build companies CRUD router | `/apps/web/src/server/trpc/routers/crm/companies.ts` | P1‑CRM‑SCHEMA‑1 | Medium |
| P1‑CRM‑TRPC‑3 | Build deals CRUD router with stage transitions (won/lost) | `/apps/web/src/server/trpc/routers/crm/deals.ts` (include stage change validation, pipeline context) | P1‑CRM‑SCHEMA‑1 | Medium |
| P1‑CRM‑TRPC‑4 | Build activities CRUD router (log call, email, meeting, note) | `/apps/web/src/server/trpc/routers/crm/activities.ts` (link to contact/company/deal) | P1‑CRM‑SCHEMA‑1 | Medium |
| P1‑CRM‑TRPC‑5 | Build pipeline management router (create pipeline, reorder stages) | `/apps/web/src/server/trpc/routers/crm/pipelines.ts` | P1‑CRM‑SCHEMA‑1 | Medium |
| P1‑CRM‑TRPC‑6 | Build CRM full‑text search procedure (cross‑entity) | `/apps/web/src/server/trpc/routers/crm/search.ts` (GIN‑indexed tsvector queries) | P1‑CRM‑SCHEMA‑1 | Medium |
| P1‑CRM‑TRPC‑7 | Emit `crm.deal.won` and `crm.contact.created` events via Inngest client on relevant mutations | `/apps/web/src/server/trpc/routers/crm/deals.ts`, `contacts.ts` (use `inngest.send()`) | P0‑INNGEST‑3 | Small |

### P1‑CRM‑UI — User Interfaces

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑CRM‑UI‑1 | Build contacts list page with search, filter, and inline edit | `/apps/web/src/routes/dashboard/crm/contacts/index.tsx` (use TanStack Query, shadcn/ui Table) | P1‑CRM‑TRPC‑1 | Medium |
| P1‑CRM‑UI‑2 | Build contact detail page with activity timeline, deals panel, and attached documents | `/apps/web/src/routes/dashboard/crm/contacts/$contactId.tsx` | P1‑CRM‑TRPC‑1, P1‑CRM‑TRPC‑4 | Medium |
| P1‑CRM‑UI‑3 | Build companies list and detail pages | `/apps/web/src/routes/dashboard/crm/companies/index.tsx`, `$companyId.tsx` | P1‑CRM‑TRPC‑2 | Medium |
| P1‑CRM‑UI‑4 | Build interactive Kanban board for deals (drag‑and‑drop stages, deal cards) | `/apps/web/src/routes/dashboard/crm/deals/board.tsx` | P1‑CRM‑TRPC‑3 | Large |
| P1‑CRM‑UI‑5 | Build deal detail workspace (timeline, linked contacts, products, tasks) | `/apps/web/src/routes/dashboard/crm/deals/$dealId.tsx` | P1‑CRM‑TRPC‑3, P1‑CRM‑TRPC‑4 | Medium |
| P1‑CRM‑UI‑6 | Build pipeline management interface (create/edit pipelines and stages) | `/apps/web/src/routes/dashboard/crm/settings/pipelines.tsx` | P1‑CRM‑TRPC‑5 | Small |
| P1‑CRM‑UI‑7 | Build custom fields admin UI (add/edit/delete field definitions per entity) | `/apps/web/src/routes/dashboard/crm/settings/fields.tsx` | P1‑CRM‑SCHEMA‑1 | Small |
| P1‑CRM‑UI‑8 | Implement contact import (CSV upload with column mapping and duplicate detection) | `/apps/web/src/components/crm/ImportWizard.tsx` | P1‑CRM‑TRPC‑1 | Medium |
| P1‑CRM‑UI‑9 | Integrate CRM full‑text search results into global search command palette and CRM list pages | `/apps/web/src/components/CommandPalette.tsx` (add CRM results), `/apps/web/src/components/crm/SearchResults.tsx` | P1‑CRM‑TRPC‑6, P1‑INTEG‑5 | Small |

---

## Task Group P1‑PROJ: Projects & Tasks

*Purpose: Replace the mock Projects module with full CRUD, task management, and milestone tracking.*

### P1‑PROJ‑SCHEMA

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑PROJ‑SCHEMA‑1 | Define projects, tasks, milestones, task_dependencies, project_members tables | `/packages/db/src/schema/projects.ts` (RLS, FKs to organizations, tenant isolation) | P0‑DB‑5 | Medium |
| P1‑PROJ‑SCHEMA‑2 | Create migration and apply | `drizzle‑kit generate` + `drizzle‑kit migrate` | P1‑PROJ‑SCHEMA‑1 | Small |

### P1‑PROJ‑SETTINGS: Projects Settings Configuration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑PROJ‑SETTINGS‑1 | Build Projects Settings section (Workflow Statuses, Issue Types, Templates) | `/apps/web/src/routes/dashboard/settings/projects/ (3 sub-pages)` | P1‑PROJ‑SCHEMA‑1, P1‑PROJ‑TRPC‑1 | Medium |

### P1‑PROJ‑TRPC

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑PROJ‑TRPC‑1 | Build projects CRUD router (list, create, update, delete) | `/apps/web/src/server/trpc/routers/projects.ts` | P1‑PROJ‑SCHEMA‑1 | Medium |
| P1‑PROJ‑TRPC‑2 | Build tasks CRUD router with dependency validation | `/apps/web/src/server/trpc/routers/projects/tasks.ts` (circular dependency prevention) | P1‑PROJ‑SCHEMA‑1 | Large |
| P1‑PROJ‑TRPC‑3 | Build milestone tracking procedures (create milestone, link tasks, % complete rollup) | `/apps/web/src/server/trpc/routers/projects/milestones.ts` | P1‑PROJ‑SCHEMA‑1 | Medium |
| P1‑PROJ‑TRPC‑4 | Emit `project.task.completed` and `project.milestone.reached` events | Inside task/milestone routers | P0‑INNGEST‑3 | Small |

### P1‑PROJ‑UI

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑PROJ‑UI‑1 | Build project list page (card/table view, status filters, progress bars) | `/apps/web/src/routes/dashboard/projects/index.tsx` | P1‑PROJ‑TRPC‑1 | Medium |
| P1‑PROJ‑UI‑2 | Build project overview dashboard (progress, budget placeholder, recent activity) | `/apps/web/src/routes/dashboard/projects/$projectId.tsx` | P1‑PROJ‑TRPC‑1 | Medium |
| P1‑PROJ‑UI‑3 | Build Kanban task board (drag‑and‑drop status columns) | `/apps/web/src/routes/dashboard/projects/$projectId/board.tsx` | P1‑PROJ‑TRPC‑2 | Large |
| P1‑PROJ‑UI‑4 | Build hierarchical task list view (indent, expand/collapse, inline edit) | `/apps/web/src/routes/dashboard/projects/$projectId/list.tsx` | P1‑PROJ‑TRPC‑2 | Medium |
| P1‑PROJ‑UI‑5 | Build task detail panel (description, subtasks, comments, attachments) | `/apps/web/src/components/projects/TaskDetail.tsx` | P1‑PROJ‑TRPC‑2 | Medium |
| P1‑PROJ‑UI‑6 | Build Gantt chart placeholder (basic timeline rendering, will be enhanced in Phase 2) | `/apps/web/src/components/projects/GanttChart.tsx` | P1‑PROJ‑TRPC‑2 | Small |
| P1‑PROJ‑UI‑7 | Build milestone list and create/edit UI | `/apps/web/src/components/projects/MilestoneManager.tsx` | P1‑PROJ‑TRPC‑3 | Small |

---

## Task Group P1‑DOCS: Documents & Storage

*Purpose: Build the real document management backend with R2 storage, versioning, search, and cross‑module linking.*

### P1‑DOCS‑SCHEMA

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑DOCS‑SCHEMA‑1 | Define documents, document_versions, document_folders, document_links tables | `/packages/db/src/schema/documents.ts` (RLS, org‑scoped, FK to R2 key) | P0‑DB‑5 | Medium |
| P1‑DOCS‑SCHEMA‑2 | Create migration and apply | `drizzle‑kit generate` + `drizzle‑kit migrate` | P1‑DOCS‑SCHEMA‑1 | Small |

### P1‑DOCS‑TRPC

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑DOCS‑TRPC‑1 | Build documents CRUD router (list, create, update, delete, pagination, filters) | `/apps/web/src/server/trpc/routers/documents.ts` | P1‑DOCS‑SCHEMA‑1 | Medium |
| P1‑DOCS‑TRPC‑2 | Build presigned upload URL procedure (validate file type/size, generate R2 presigned POST) | `/apps/web/src/server/trpc/routers/documents/upload.ts` | P0‑STORAGE‑2, P1‑DOCS‑TRPC‑1, P0‑SEC‑5 | Medium |
| P1‑DOCS‑TRPC‑3 | Build upload registration procedure (client confirms upload, server creates metadata) | `/apps/web/src/server/trpc/routers/documents/upload.ts` (register callback) | P1‑DOCS‑TRPC‑2 | Small |
| P1‑DOCS‑TRPC‑4 | Build presigned download/view URL procedure (time‑limited, permission‑checked) | `/apps/web/src/server/trpc/routers/documents/download.ts` | P0‑STORAGE‑2 | Small |
| P1‑DOCS‑TRPC‑5 | Build document search procedure (title, metadata, full‑text on OCR text if available) | `/apps/web/src/server/trpc/routers/documents/search.ts` (GIN indexes) | P1‑DOCS‑SCHEMA‑1 | Medium |
| P1‑DOCS‑TRPC‑6 | Build version history procedures (list versions, restore, diff metadata) | `/apps/web/src/server/trpc/routers/documents/versions.ts` | P1‑DOCS‑TRPC‑1 | Medium |
| P1‑DOCS‑TRPC‑7 | Emit `document.uploaded` and `document.deleted` events | Within relevant routers | P0‑INNGEST‑3 | Small |
| P1‑DOCS‑TRPC‑8 | Build pinning/starring tRPC procedures for documents and folders | `/apps/web/src/server/trpc/routers/documents/pins.ts` | P1‑DOCS‑SCHEMA‑1 | Small |

### P1‑DOCS‑JOBS — Background Processing

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑DOCS‑JOBS‑1 | Build virus scanning Inngest function (triggered by upload completion) | `/apps/web/src/server/inngest/functions/documents/scan.ts` (ClamAV, quarantine if infected) | P1‑DOCS‑TRPC‑3, P0‑INNGEST‑3 | Medium |
| P1‑DOCS‑JOBS‑2 | Build OCR text extraction job (optional, for search indexing) | `/apps/web/src/server/inngest/functions/documents/ocr.ts` (Tesseract or AI‑based) | P1‑DOCS‑JOBS‑1 | Medium |
| P1‑DOCS‑JOBS‑3 | Build thumbnail generation job for common file types | `/apps/web/src/server/inngest/functions/documents/thumbnails.ts` | P1‑DOCS‑JOBS‑1 | Small |

### P1‑DOCS‑UI

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑DOCS‑UI‑1 | Build repository page with folder tree navigation and file list | `/apps/web/src/routes/dashboard/documents/index.tsx` (sidebar folders, configurable columns) | P1‑DOCS‑TRPC‑1 | Large |
| P1‑DOCS‑UI‑2 | Build upload zone component (drag‑and‑drop, progress bar, file type validation) | `/apps/web/src/components/documents/UploadZone.tsx` | P1‑DOCS‑TRPC‑2 | Medium |
| P1‑DOCS‑UI‑3 | Build document detail panel (metadata, version history, sharing settings, comments tab, activity) | `/apps/web/src/components/documents/DocumentDetail.tsx` | P1‑DOCS‑TRPC‑1, P1‑DOCS‑TRPC‑6 | Medium |
| P1‑DOCS‑UI‑4 | Build version history timeline UI with diff viewer and restore | `/apps/web/src/components/documents/VersionHistory.tsx` | P1‑DOCS‑TRPC‑6 | Medium |
| P1‑DOCS‑UI‑5 | Implement file preview modal (using presigned download URL, PDF/image viewer) | `/apps/web/src/components/documents/FilePreview.tsx` | P1‑DOCS‑TRPC‑4 | Medium |
| P1‑DOCS‑UI‑6 | Build document search UI (global search bar with filters) | `/apps/web/src/components/documents/SearchBar.tsx` | P1‑DOCS‑TRPC‑5 | Small |

---

## Task Group P1‑DOCS‑UI‑EXT: Document UX Extensions

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P1‑DOCS‑UI‑EXT‑1 | Build document pinning, stars, and smart collections (auto‑group by client/project/deal) | `/apps/web/src/components/documents/SmartCollections.tsx` | P1‑DOCS‑UI‑1, P1‑DOCS‑TRPC‑5 | Medium | Personalisation features in original J3‑k |
| P1‑DOCS‑UI‑EXT‑2 | Build visual permission badge on files/folders with one‑click sharing panel | `/apps/web/src/components/documents/PermissionBadge.tsx` | P1‑DOCS‑UI‑3 | Small | Original J3‑l |
| P1‑DOCS‑UI‑EXT‑3 | Implement share link with configurable expiry, password, download toggle, preview‑only mode | `/apps/web/src/components/documents/ShareLinkDialog.tsx` | P1‑DOCS‑TRPC‑4 | Medium | Original J3‑m |
| P1‑DOCS‑UI‑EXT‑4 | Build request‑file widget (external upload without account) | `/apps/web/src/components/documents/RequestFileWidget.tsx` | P1‑DOCS‑TRPC‑2 | Medium | Original J3‑n |
| P1‑DOCS‑UI‑EXT‑5 | Build bulk permission management interface | `/apps/web/src/components/documents/BulkPermissions.tsx` | P1‑DOCS‑UI‑EXT‑2 | Small | Original J3‑o |
| P1‑DOCS‑UI‑EXT‑6 | Add document commenting/annotation system (threaded) | `/apps/web/src/components/documents/Comments.tsx`, tRPC procedures for comments | P1‑DOCS‑UI‑3 | Large | Original J3 was incomplete; now essential |

---

## Task Group P1‑FIN: Finance & Accounting

*Purpose: Build a production‑grade double‑entry ledger, AP/AR invoicing, and basic financial reporting.*

### P1‑FIN‑SCHEMA

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑FIN‑SCHEMA‑1 | Define core finance tables: chart_of_accounts, ledger_entries (double‑entry), invoices, bill_items, payments, vendors | `/packages/db/src/schema/finance.ts` (RLS, ensure every financial mutation records balancing entries) | P0‑DB‑5 | Large |
| P1‑FIN‑SCHEMA‑2 | Add invoice/supporting document attachment via entity_links | `/packages/db/src/schema/finance.ts` (use entity_links table) | P1‑CRM‑SCHEMA‑2 | Small |
| P1‑FIN‑SCHEMA‑3 | Create migration and apply | `drizzle‑kit generate` + `drizzle‑kit migrate` | P1‑FIN‑SCHEMA‑1 | Small |

### P1‑FIN‑SETTINGS: Finance Settings Configuration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑FIN‑SETTINGS‑1 | Build Finance Settings section (CoA, Tax, Payment Terms, Approvals, Currency) | `/apps/web/src/routes/dashboard/settings/finance/ (5 sub-pages)` | P1‑FIN‑SCHEMA‑1, P1‑FIN‑TRPC‑1, P1‑FIN‑TRPC‑4 | Large |

### P1‑FIN‑TRPC

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑FIN‑TRPC‑1 | Build chart of accounts CRUD and query procedures | `/apps/web/src/server/trpc/routers/finance/accounts.ts` | P1‑FIN‑SCHEMA‑1 | Medium |
| P1‑FIN‑TRPC‑2 | Build AP procedures: create bill, list unpaid, approve/reject, schedule payment | `/apps/web/src/server/trpc/routers/finance/ap.ts` (idempotency‑guarded, ledger entries created automatically) | P0‑TRPC‑5, P1‑FIN‑SCHEMA‑1 | Large |
| P1‑FIN‑TRPC‑3 | Build AR procedures: create invoice, record payment, aging report | `/apps/web/src/server/trpc/routers/finance/ar.ts` (auto‑posting to ledger) | P1‑FIN‑SCHEMA‑1 | Large |
| P1‑FIN‑TRPC‑4 | Build vendor master data procedures (CRUD, tax info) | `/apps/web/src/server/trpc/routers/finance/vendors.ts` | P1‑FIN‑SCHEMA‑1 | Medium |
| P1‑FIN‑TRPC‑5 | Build financial reporting procedures (P&L, balance sheet, AR/AP aging) | `/apps/web/src/server/trpc/routers/finance/reports.ts` | P1‑FIN‑TRPC‑1, P1‑FIN‑TRPC‑2, P1‑FIN‑TRPC‑3 | Medium |
| P1‑FIN‑TRPC‑6 | Emit `finance.invoice.paid`, `finance.bill.approved` events | Within respective routers | P0‑INNGEST‑3 | Small |

### P1‑FIN‑UI

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑FIN‑UI‑1 | Build AP inbox view (list of unpaid bills, vendor, amount, due date) | `/apps/web/src/routes/dashboard/finance/ap.tsx` | P1‑FIN‑TRPC‑2 | Medium |
| P1‑FIN‑UI‑2 | Build bill creation/approval form with line items and GL coding | `/apps/web/src/components/finance/BillForm.tsx` | P1‑FIN‑TRPC‑2 | Medium |
| P1‑FIN‑UI‑3 | Build AR invoicing workspace (create invoice, send via Resend, record payment, comment thread panel) | `/apps/web/src/routes/dashboard/finance/ar.tsx` | P1‑FIN‑TRPC‑3, P1‑FIN‑COMM‑2 | Large |
| P1‑FIN‑UI‑4 | Build invoice template builder (drag‑and‑drop fields, logo, colors) | `/apps/web/src/components/finance/InvoiceTemplateBuilder.tsx` | P1‑FIN‑TRPC‑3 | Medium |
| P1‑FIN‑UI‑5 | Build basic financial dashboard (P&L summary, AP/AR aging, cash flow placeholder) | `/apps/web/src/routes/dashboard/finance/index.tsx` | P1‑FIN‑TRPC‑5 | Medium |
| P1‑FIN‑UI‑6 | Build vendor management page | `/apps/web/src/routes/dashboard/finance/vendors.tsx` | P1‑FIN‑TRPC‑4 | Small |

---

## Task Group P1‑FIN‑COMM: Invoice & Bill Commenting

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P1‑FIN‑COMM‑1 | Define `invoice_comments` table and tRPC procedures | `/packages/db/src/schema/finance.ts` (add table), `/apps/web/src/server/trpc/routers/finance/comments.ts` | P1‑FIN‑SCHEMA‑1 | Medium | Enables collaboration on AP/AR items |
| P1‑FIN‑COMM‑2 | Build threaded comment UI on invoice detail | `/apps/web/src/components/finance/CommentThread.tsx` (with @mentions) | P1‑FIN‑COMM‑1, P1‑FIN‑UI‑3 | Medium | Directly from original K1‑j and K3‑g‑b |

---

## Task Group P1‑INTEG: Cross‑Module Integration & Shared Services

*Purpose: Wire domains together through events, shared linking, and global search.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑INTEG‑1 | Build Inngest function for Quote‑to‑Cash: on `crm.deal.won` → auto‑create invoice | `/apps/web/src/server/inngest/functions/crm/deal‑won.ts` (use finance procedures to create invoice) | P1‑CRM‑TRPC‑7, P1‑FIN‑TRPC‑3 | Medium |
| P1‑INTEG‑2 | Build Inngest function: on `document.uploaded` → attach to related CRM deal/project via entity_links (if context supplied) | `/apps/web/src/server/inngest/functions/documents/auto‑link.ts` | P1‑DOCS‑TRPC‑7 | Small |
| P1‑INTEG‑3 | Set up PostgreSQL full‑text search (GIN indexes) across all domain tables for global search | Migration script adding `tsvector` columns and triggers on contacts, companies, deals, tasks, documents, invoices | P1‑CRM‑SCHEMA‑1, P1‑PROJ‑SCHEMA‑1, P1‑DOCS‑SCHEMA‑1, P1‑FIN‑SCHEMA‑1 | Medium |
| P1‑INTEG‑4 | Build global search tRPC procedure (federated query across domains) | `/apps/web/src/server/trpc/routers/search.ts` (UNION ALL over domain tsvectors, ranked) | P1‑INTEG‑3 | Medium |
| P1‑INTEG‑5 | Build global search UI (command palette results grouped by module) | Enhance existing `/apps/web/src/components/CommandPalette.tsx` to query P1‑INTEG‑4 | P1‑INTEG‑4 | Medium |
| P1‑INTEG‑6 | Build in‑app notification system: activity_feed table, tRPC subscription for real‑time delivery | `/packages/db/src/schema/notifications.ts`, `/apps/web/src/server/trpc/routers/notifications.ts`, `/apps/web/src/components/NotificationBell.tsx` | P0‑INNGEST‑3 | Medium |
| P1‑INTEG‑7 | Create notification dispatch Inngest function (listens to all domain events, creates feed entries) | `/apps/web/src/server/inngest/functions/notifications/dispatcher.ts` | P1‑INTEG‑6, P1‑CRM‑TRPC‑7, P1‑PROJ‑TRPC‑4, P1‑DOCS‑TRPC‑7, P1‑FIN‑TRPC‑6 | Medium |

---

## Task Group P1‑ONBOARD: User Onboarding & Settings

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑ONBOARD‑1 | Enhance organization creation wizard (step‑by‑step: name, slug, logo, invite team) | Refactor `/apps/web/src/pages/SignUp.tsx` into multi‑step form | P0‑AUTH‑3 | Medium |
| P1‑ONBOARD‑2 | Build user profile page (avatar, display name, notification preferences, timezone) | `/apps/web/src/routes/dashboard/settings/profile.tsx` | P0‑AUTH‑3 | Small |
| P1‑ONBOARD‑3 | Build organization settings page (name, logo, billing overview, member management) | `/apps/web/src/routes/dashboard/settings/organization.tsx` | P0‑AUTH‑6 | Medium |
| P1‑ONBOARD‑4 | Build onboarding checklist widget on dashboard (track key setup steps) | `/apps/web/src/components/onboarding/Checklist.tsx` (display and update progress) | P1‑ONBOARD‑1 | Small |

---

## Task Group P1‑ANALYTICS: Real Analytics Dashboards

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑ANALYTICS‑1 | Build real CRM analytics dashboard – replace mock charts with live pipeline, win rate, lead volume (consume CRM tRPC) | `/apps/web/src/routes/dashboard/analytics.tsx` (CRM tab) | P1‑CRM‑TRPC‑3, P1‑CRM‑TRPC‑6 | Medium |
| P1‑ANALYTICS‑2 | Build real Projects analytics – task completion rate, project health, overdue tasks from live data | Same file (Projects tab) | P1‑PROJ‑TRPC‑1 | Small |
| P1‑ANALYTICS‑3 | Build real Finance analytics – AP/AR aging, cash flow summary from live data | Same file (Finance tab) | P1‑FIN‑TRPC‑2, P1‑FIN‑TRPC‑3 | Medium |

---

## Task Group P1‑DASHBOARD: Live Dashboard Implementation

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑DASHBOARD‑1 | Replace mock dashboard KPI cards and activity feed with live aggregated data (use tRPC queries for metrics, activities) | `/apps/web/src/routes/dashboard.lazy.tsx` | P1‑CRM‑TRPC‑1, P1‑PROJ‑TRPC‑1, P1‑FIN‑TRPC‑5 | Medium |

---

## Task Group P1‑SETTINGS: Functional Settings Pages

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑SETTINGS‑1 | Build functional Users & Permissions page – invite user, assign role, change role, deactivate; consume RBAC middleware | `/apps/web/src/routes/dashboard/settings/users‑permissions.tsx` | P0‑TRPC‑3, P1‑ONBOARD‑3 | Medium |
| P1‑SETTINGS‑2 | Build organization settings page – edit org name, logo, billing overview, member list | `/apps/web/src/routes/dashboard/settings/organization.tsx` | P1‑ONBOARD‑3 | Small |

---

## Task Group P1‑QA: Quality Assurance & UI Activation

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑QA‑1 | Audit and activate all previously inert UI controls – scan all pages, replace presentational buttons with real event handlers | Manual audit checklist + per‑component fixes | P1‑CRM‑UI‑*, P1‑PROJ‑UI‑*, P1‑DOCS‑UI‑*, P1‑FIN‑UI‑* | Medium |
| P1‑ACC‑REMEDIATE | Remediate critical accessibility issues found by P0‑ACC‑1 audit – color contrast, missing aria labels, keyboard traps | All affected components | P0‑ACC‑1 | Medium |

---

## Task Group P1‑BILLING‑UI: Frontend Billing Integration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑BILLING‑UI‑0 | Build frontend Stripe provider & reusable Payment Element wrapper | `/apps/web/src/lib/stripe.ts`, `/apps/web/src/components/StripePaymentElement.tsx` | P0‑BILLING‑1 | Medium |

---

## Task Group P1‑AUTH‑EXT: Extended Authentication Features

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑AUTH‑1 | Integrate OAuth social login (Google, GitHub) via Better Auth plugins | `/packages/auth/src/index.ts` (add plugins), `/apps/web/src/pages/SignIn.tsx` (add buttons) | P0‑AUTH‑2 | Small |
| P1‑AUTH‑2 | Add passkeys / passwordless authentication support | `/packages/auth/src/index.ts` (add passkey plugin), `/apps/web/src/pages/SignIn.tsx` (passkey prompt) | P0‑AUTH‑2 | Small |

---

## Task Group P1‑NOTIF: Extended Notification System

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑NOTIF‑1 | Extend notification system to deliver via email and Slack (add channels to dispatcher) | `/apps/web/src/server/inngest/functions/notifications/dispatcher.ts` (expand) | P1‑INTEG‑7, P0‑EMAIL‑3, P2‑INTEG‑5 (Slack) | Medium |

---

## Task Group P1‑I18N‑EXTRACT: Internationalisation String Extraction

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑I18N‑EXTRACT‑CRM | Replace hardcoded strings in CRM components with `t()` calls | `/apps/web/src/pages/CRM.tsx`, CRM components | P0‑I18N‑1 | Small |
| P1‑I18N‑EXTRACT‑PROJ | Same for Projects module | `/apps/web/src/pages/Projects.tsx`, project components | P0‑I18N‑1 | Small |
| P1‑I18N‑EXTRACT‑DOCS | Same for Documents module | `/apps/web/src/pages/Documents.tsx`, document components | P0‑I18N‑1 | Small |
| P1‑I18N‑EXTRACT‑FIN | Same for Finance module | `/apps/web/src/pages/Finance.tsx`, finance components | P0‑I18N‑1 | Small |
| P1‑I18N‑EXTRACT‑OTHER | Same for Assets, Portal, Settings, Dashboard, Auth pages | Respective pages/components | P0‑I18N‑1 | Small |

---

## Task Group P1‑TEST‑SMOKE: Cross‑Module Integration Testing

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P1‑TEST‑SMOKE | Cross‑module integration smoke test – E2E script: create deal → attach document → convert to project → create invoice → pay in portal | `/tests/e2e/cross‑module‑smoke.spec.ts` | P1‑CRM‑UI‑*, P1‑PROJ‑UI‑*, P1‑DOCS‑UI‑*, P1‑FIN‑UI‑* | Medium |

---

## Dependency Ordering (Phase 1)

The build order within Phase 1 ensures that schema is created first, then tRPC procedures, then UI, and finally integration jobs.

1. **CRM** and **PROJ** and **DOCS** and **FIN** schemas (can run in parallel) → apply migrations.
2. **Cross‑module entity_links** (P1‑CRM‑SCHEMA‑2) is small and feeds into DOCS and FIN.
3. **tRPC routers** for each domain (dependent on respective schema): CRM, PROJ, DOCS, FIN.
4. **Integration infrastructure** (P1‑INTEG) after domain tRPC routers exist to emit events and consume them.
5. **UI pages** for CRM, PROJ, DOCS, FIN (in any order, dependent on their tRPC routers).
6. **Onboarding** tasks can be done after auth is complete and basic UI shell is stable.
7. **P1‑DOCS‑UI‑EXT** and **P1‑FIN‑COMM** can be done after their base domains are complete.
8. **P1‑ANALYTICS, P1‑DASHBOARD, P1‑SETTINGS, P1‑QA, P1‑BILLING‑UI, P1‑AUTH‑EXT, P1‑NOTIF, P1‑I18N‑EXTRACT, P1‑TEST‑SMOKE** (can run in parallel after respective domain foundations are complete).

# Phase 2 — Enterprise Security, Compliance & Cross‑Module Integration (Consolidated Master Task List)

This phase builds the enterprise‑grade features: client portal, advanced security (MFA enforcement, SCIM, data residency), asset management, advanced CRM features, and deeper cross‑module integrations. Every task is file‑path‑specific and cross‑referenced with Phase 0/1 dependencies.

---

## Task Group P2‑SETTINGS: Settings UI & Security Configuration

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑SETTINGS‑SEC‑1 | Build MFA Enrollment and Policy settings page | `/apps/web/src/routes/dashboard/settings/security/mfa.tsx` | P0‑AUTH‑6 | Small |
| P2‑SETTINGS‑SEC‑2 | Build Session & Password Policy settings page | `/apps/web/src/routes/dashboard/settings/security/session.tsx` | P0‑AUTH‑5, P0‑AUTH‑11 | Small |
| P2‑SETTINGS‑SEC‑3 | Build SSO Configuration settings page | `/apps/web/src/routes/dashboard/settings/security/sso.tsx` | P0‑AUTH‑7 | Medium |
| P2‑SETTINGS‑SEC‑4 | Build Permissions Matrix settings page | `/apps/web/src/routes/dashboard/settings/security/permissions.tsx` | P0‑TRPC‑3, P1‑SETTINGS‑1 | Medium |
| P2‑SETTINGS‑SEC‑5 | Build Webhook Management settings page | `/apps/web/src/routes/dashboard/settings/webhooks.tsx` | P0‑SEC‑3, P3‑AUTO‑CORE‑3 | Medium |
| P2‑SETTINGS‑PRIVACY | Build Data & Privacy settings page | `/apps/web/src/routes/dashboard/settings/privacy.tsx` | P0‑AUTH‑10, P1‑ONBOARD‑3 | Small |
| P2‑SETTINGS‑TEAMS | Build Teams & Groups management (schema + tRPC + UI) | `/apps/web/src/routes/dashboard/settings/teams.tsx, packages/db/src/schema/teams.ts` | P0‑DB‑3, P0‑TRPC‑3, P1‑SETTINGS‑1 | Medium |
| P2‑SETTINGS‑IP | Build IP Allowlist management settings page | `/apps/web/src/routes/dashboard/settings/security/ip-allowlist.tsx` | P3‑PLAT‑6 | Small |
| P2‑AUTH‑SESSION‑MGMT | Build Active Sessions management page | `/apps/web/src/routes/dashboard/settings/security/sessions.tsx` | P0‑AUTH‑5, P0‑AUTH‑5‑EXT | Small |
| P2‑DOCS‑SETTINGS‑1 | Build Documents Settings section (Types, Storage, E-Signature, Versioning) | `/apps/web/src/routes/dashboard/settings/documents/ (4 sub-pages)` | P1‑DOCS‑SCHEMA‑1, P0‑STORAGE‑2 | Medium |
| P2‑ASSETS‑SETTINGS‑1 | Build Assets Settings section (Categories, Depreciation, Locations, Check-Out) | `/apps/web/src/routes/dashboard/settings/assets/ (4 sub-pages)` | P2‑ASSETS‑SCHEMA‑1 (or equivalent assets schema task) | Medium |
| P2‑CRM‑SETTINGS‑3 | Build CRM Import/Export dedicated settings page | `/apps/web/src/routes/dashboard/settings/crm/import-export.tsx` | P1‑CRM‑TRPC‑1, P1‑CRM‑UI‑8 | Medium |
| P2‑PORTAL‑SETTINGS‑2 | Build Portal Access Control settings page | `/apps/web/src/routes/dashboard/settings/portal/access.tsx` | P2‑PORTAL‑4, P2‑PORTAL‑8 | Small |

---

## Task Group P2‑SEC: Enterprise Security & Compliance

*Purpose: Harden the platform for SOC 2 Type II, GDPR, and enterprise procurement requirements.*

### P2‑SEC‑1 — Identity & Access

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑SEC‑1‑1 | Enforce MFA step‑up for privileged operations (payment runs, org settings, API key creation) | `/apps/web/src/server/trpc/middleware/mfa.ts` (check recent MFA verification timestamp) | P0‑AUTH‑6, P0‑TRPC‑4 | Small |
| P2‑SEC‑1‑2 | Build MFA setup wizard in user settings (QR code enrollment, recovery code display) | `/apps/web/src/routes/dashboard/settings/security/mfa.tsx` | P0‑AUTH‑6 | Medium |
| P2‑SEC‑1‑3 | Add organization‑wide "Require MFA" toggle with enforcement | `/apps/web/src/routes/dashboard/settings/security/index.tsx` (enforce flag, admin override) | P2‑SEC‑1‑1 | Small |
| P2‑SEC‑1‑4 | Integrate SCIM 2.0 server for automated user provisioning (Okta, Azure AD) | `/apps/web/src/server/api/scim/[...scim].ts` (proxy to Better Auth SCIM plugin) | P0‑AUTH‑7 | Large |
| P2‑SEC‑1‑5 | Document enterprise SSO setup guide (SAML 2.0, OIDC) | `/docs/enterprise/sso‑setup.md` (step‑by‑step for major IdPs) | P0‑AUTH‑7 | Small |

### P2‑SEC‑2 — Data Protection & Compliance

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑SEC‑2‑1 | Build GDPR data export function (compile all user data across tenant tables) | `/apps/web/src/server/inngest/functions/compliance/gdpr‑export.ts` (generates JSON dump, emails secure link) | P0‑INNGEST‑2 | Medium |
| P2‑SEC‑2‑2 | Build GDPR data deletion function (cascade anonymization/deletion per contact) | `/apps/web/src/server/inngest/functions/compliance/gdpr‑delete.ts` (compliance hold check first) | P2‑SEC‑2‑1 | Medium |
| P2‑SEC‑2‑3 | Implement compliance hold infrastructure (legal hold on documents/invoices preventing deletion) | `/packages/db/src/schema/compliance‑holds.ts`, `/apps/web/src/server/trpc/routers/compliance.ts` (place/release hold) | P0‑DB‑5 | Medium |
| P2‑SEC‑2‑4 | Build automated data retention engine (archive/delete per policy) | `/apps/web/src/server/inngest/functions/compliance/retention.ts` (nightly scan, configurable rules) | P2‑SEC‑2‑3 | Medium |
| P2‑SEC‑2‑5 | Implement data residency controls (EU region Neon project, region routing) | Provision EU Neon project, `/apps/web/src/server/trpc/middleware/region.ts` (route to correct DB) | P0‑DB‑1 | Large |
| P2‑SEC‑2‑6 | Build security whitepaper and architecture documentation for enterprise prospects | `/docs/enterprise/security‑whitepaper.md` (network diagram, RLS explanation, encryption details) | P2‑SEC‑2‑5 | Small |
| P2‑SEC‑8 | GDPR data deletion across third‑party systems – procedures to delete from Stripe, Resend, and DocuSign on account/data deletion | `/apps/web/src/server/inngest/functions/compliance/third‑party‑deletion.ts` | P2‑SEC‑2‑2 | Medium |
| P2‑SEC‑9 | Implement AI decision audit log with human override indicator (extend P4‑AI‑ADV‑3 early) | `/packages/db/src/schema/ai‑decisions.ts` (add override column), `/apps/web/src/server/trpc/middleware/ai‑audit.ts` | P0‑TRPC‑6 | Small |

### P2‑SEC‑3 — Advanced Session Security

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑SEC‑3‑1 | Implement session timeout policies (standard 24h, admin 4h, billing re‑auth) | `/packages/auth/src/index.ts` (configure session expiry tiers) | P0‑AUTH‑5 | Small |
| P2‑SEC‑3‑2 | Add IP allowlist enforcement per organization | `/apps/web/src/server/trpc/middleware/ip‑allowlist.ts` (check against org settings) | P2‑SEC‑1‑1 | Small |
| P2‑SEC‑3‑3 | Implement OAuth token rotation and revocation management | `/apps/web/src/routes/dashboard/settings/integrations/tokens.tsx` (manage connected apps) | P0‑AUTH‑5 | Small |

---

## Task Group P2‑PORTAL: Client Portal

*Purpose: Build a branded, tenant‑scoped portal for clients to view documents, tasks, invoices, and make payments.*

### P2‑PORTAL‑AUTH

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑PORTAL‑1 | Define portal workspace schema (portal_workspaces, portal_members, portal_invitations) | `/packages/db/src/schema/portal.ts` (RLS, tenant‑scoped, link to organizations) | P0‑DB‑5 | Medium |
| P2‑PORTAL‑2 | Build portal authentication gateway (isolated route tree, no main app access) | `/apps/web/src/routes/portal/__root.tsx` (separate layout, auth guard, branding) | P0‑AUTH‑2, P2‑PORTAL‑1 | Large |
| P2‑PORTAL‑3 | Implement magic‑link invitation flow for external clients | `/apps/web/src/routes/api/portal/invite.ts` (generate signed token, accept → create portal‑scoped account) | P2‑PORTAL‑1 | Medium |
| P2‑PORTAL‑4 | Build portal RBAC middleware (client‑admin, client‑member, view‑only) | `/apps/web/src/server/trpc/middleware/portal‑rbac.ts` | P0‑TRPC‑3 | Small |

### P2‑PORTAL‑UI

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑PORTAL‑5 | Build portal home dashboard (pending tasks, recent documents, open invoices, messages) | `/apps/web/src/routes/portal/$workspaceId/index.tsx` | P2‑PORTAL‑2 | Large |
| P2‑PORTAL‑6 | Build portal document workspace (shared documents, upload requests, download history) | `/apps/web/src/routes/portal/$workspaceId/documents.tsx` | P2‑PORTAL‑5, P1‑DOCS‑TRPC‑4 | Medium |
| P2‑PORTAL‑7 | Build portal task checklist (client‑viewable steps, completion tracking) | `/apps/web/src/routes/portal/$workspaceId/tasks.tsx` | P2‑PORTAL‑5, P1‑PROJ‑TRPC‑2 | Medium |
| P2‑PORTAL‑8 | Build branded portal builder (org sets logo, primary color, custom domain CNAME) | `/apps/web/src/routes/dashboard/settings/portal/branding.tsx` | P2‑PORTAL‑5 | Medium |
| P2‑PORTAL‑9 | Build portal messaging thread (simple org ↔ client channel) | `/apps/web/src/routes/portal/$workspaceId/messages.tsx` | P2‑PORTAL‑5 | Medium |

### P2‑PORTAL‑PAYMENTS

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑PORTAL‑10 | Expose open invoices and payment history to portal clients | `/apps/web/src/server/trpc/routers/portal/finance.ts` (portal‑scoped finance procedures) | P2‑PORTAL‑4, P1‑FIN‑TRPC‑3 | Medium |
| P2‑PORTAL‑11 | Build client payment portal UI (invoice list, Pay Now button, payment method) | `/apps/web/src/routes/portal/$workspaceId/payments.tsx` | P2‑PORTAL‑10, P0‑BILLING‑1 | Large |
| P2‑PORTAL‑12 | Implement instalment plan configuration and auto‑charge | `/apps/web/src/server/inngest/functions/billing/instalments.ts` | P2‑PORTAL‑11 | Medium |
| P2‑PORTAL‑CNAME | Add custom domain (CNAME) support for client portals – configuration UI and SSL termination via Cloudflare for SaaS | `/apps/web/src/routes/dashboard/settings/portal/domains.tsx`, Cloudflare API integration | P2‑PORTAL‑8 | Medium |

---

## Task Group P2‑ASSETS: Asset Management

*Purpose: Build real asset tracking, check‑out/check‑in, maintenance scheduling, and depreciation.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑ASSETS‑1 | Define assets schema (assets, categories, locations, assignments, maintenance_schedule, depreciation) | `/packages/db/src/schema/assets.ts` (RLS, FK to organizations) | P0‑DB‑5 | Medium |
| P2‑ASSETS‑2 | Build assets CRUD tRPC router | `/apps/web/src/server/trpc/routers/assets.ts` | P2‑ASSETS‑1 | Medium |
| P2‑ASSETS‑3 | Build asset check‑out/check‑in procedures (assign to user/project, return date, conflict detection) | `/apps/web/src/server/trpc/routers/assets/checkout.ts` | P2‑ASSETS‑2 | Medium |
| P2‑ASSETS‑4 | Build asset depreciation engine (Inngest monthly job, straight‑line/declining balance) | `/apps/web/src/server/inngest/functions/assets/depreciation.ts` | P2‑ASSETS‑1, P0‑INNGEST‑2 | Medium |
| P2‑ASSETS‑5 | Link asset purchase to Finance (auto‑create AP bill, auto‑capitalize on approval) | `/apps/web/src/server/inngest/functions/assets/auto‑capitalize.ts` | P2‑ASSETS‑4, P1‑FIN‑TRPC‑2 | Medium |
| P2‑ASSETS‑6 | Build asset list view (table with category, location, status, book value) | `/apps/web/src/routes/dashboard/assets/index.tsx` | P2‑ASSETS‑2 | Medium |
| P2‑ASSETS‑7 | Build asset detail page (specs, assignment history, maintenance log, depreciation schedule) | `/apps/web/src/routes/dashboard/assets/$assetId.tsx` | P2‑ASSETS‑2 | Medium |
| P2‑ASSETS‑8 | Build QR code generator and printable label for physical tagging | `/apps/web/src/components/assets/QRCodeLabel.tsx` | P2‑ASSETS‑2 | Small |

---

## Task Group P2‑AICRM: Advanced CRM Features

*Purpose: Enrich CRM with email sequences, conversation intelligence, pipeline analytics, and integration hooks.*

### P2‑AICRM‑1 — Email & Communication

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑AICRM‑1‑1 | Build email send + auto‑log procedure (compose from CRM, send via Resend, log as activity) | `/apps/web/src/server/trpc/routers/crm/email.ts` | P1‑CRM‑TRPC‑4, P0‑EMAIL‑1 | Medium |
| P2‑AICRM‑1‑2 | Build email sequence engine (enroll contact in multi‑step outreach via Inngest) | `/apps/web/src/server/inngest/functions/crm/sequence‑engine.ts` | P2‑AICRM‑1‑1 | Large |
| P2‑AICRM‑1‑3 | Build sequence builder UI (define steps, delays, conditional branching) | `/apps/web/src/routes/dashboard/crm/sequences/builder.tsx` | P2‑AICRM‑1‑2 | Large |
| P2‑AICRM‑1‑4 | Build sequence analytics dashboard (open rate, reply rate, stage completion) | `/apps/web/src/routes/dashboard/crm/sequences/analytics.tsx` | P2‑AICRM‑1‑2 | Medium |

### P2‑AICRM‑2 — Pipeline Intelligence

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑AICRM‑2‑1 | Build deal scoring model (rule‑based: activity recency, stage age, engagement signals) | `/apps/web/src/server/trpc/routers/crm/scoring.ts` | P1‑CRM‑TRPC‑3 | Medium |
| P2‑AICRM‑2‑2 | Build pipeline analytics dashboard (win rate, cycle time, velocity, revenue forecast) | `/apps/web/src/routes/dashboard/crm/analytics/pipeline.tsx` | P1‑CRM‑TRPC‑3, P2‑AICRM‑2‑1 | Large |
| P2‑AICRM‑2‑3 | Build CRM sales dashboard (total pipeline, deals by stage, top rep leaderboard) | `/apps/web/src/routes/dashboard/crm/analytics/overview.tsx` | P2‑AICRM‑2‑2 | Medium |
| P2‑AICRM‑2‑4 | Implement deal health indicators (stalled deals, at‑risk tags, activity‑based warnings) | `/apps/web/src/components/crm/DealHealthBadge.tsx` | P2‑AICRM‑2‑1 | Small |

### P2‑AICRM‑3 — Integrations

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑AICRM‑3‑1 | Build public CRM REST API (contacts, deals, activities) using tRPC‑to‑REST | `/apps/web/src/server/api/public/v1/crm/` (add public tenant‑scoped routes) | P0‑TRPC‑10, P0‑API‑1, P0‑API‑2 | Large |
| P2‑AICRM‑3‑2 | Build webhook outbound management (clients subscribe to CRM events) | `/packages/db/src/schema/webhooks.ts`, `/apps/web/src/server/trpc/routers/webhooks.ts`, `/apps/web/src/server/inngest/functions/webhooks/dispatch.ts` | P0‑INNGEST‑3 | Large |
| P2‑AICRM‑3‑3 | Build Zapier/Make webhook trigger integration (publish CRM events to webhook URL) | Extends P2‑AICRM‑3‑2 (same infrastructure) | P2‑AICRM‑3‑2 | Small |

---

## Task Group P2‑INTEG: Integrations Hub & Calendar Sync

*Purpose: Build third‑party integration framework with initial Google/Microsoft calendar sync and Slack notifications.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑INTEG‑1 | Build integrations directory page (list all available integrations with status) | `/apps/web/src/routes/dashboard/settings/integrations/index.tsx` | P1‑ONBOARD‑3 | Small |
| P2‑INTEG‑2 | Build OAuth connection manager (store tokens per org, handle refresh, revoke) | `/packages/db/src/schema/integrations.ts`, `/apps/web/src/server/trpc/routers/integrations/oauth.ts` | P1‑INTEG‑7 | Medium |
| P2‑INTEG‑3 | Build Google Calendar two‑way sync (push UBOS events, pull external events) | `/apps/web/src/server/inngest/functions/calendar/google‑sync.ts` | P2‑INTEG‑2 | Large |
| P2‑INTEG‑4 | Build Microsoft / Outlook Calendar sync | `/apps/web/src/server/inngest/functions/calendar/outlook‑sync.ts` | P2‑INTEG‑2 | Large |
| P2‑INTEG‑5 | Build Slack notification integration (post deal won, task assigned, doc signed) | `/apps/web/src/server/inngest/functions/notifications/slack.ts` | P2‑INTEG‑2 | Medium |
| P2‑INTEG‑6 | Build QuickBooks Online sync (push invoices/bills, sync chart of accounts) | `/apps/web/src/server/inngest/functions/finance/qbo‑sync.ts` (optional, enterprise) | P2‑INTEG‑2, P1‑FIN‑TRPC‑3 | Large |

---

## Task Group P2‑TEST: Testing & QA Infrastructure

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑TEST‑1 | Expand E2E test suite to cover all critical user journeys (signup → create deal → send invoice → client portal payment) | `/tests/e2e/critical‑path.spec.ts` | All Phase 1 & 2 domains | Large |
| P2‑TEST‑2 | Build API contract tests for all public REST endpoints | `/tests/contract/public‑api.spec.ts` (verify OpenAPI spec matches implementation) | P2‑AICRM‑3‑1 | Medium |
| P2‑TEST‑3 | Implement visual regression testing for all domain pages | `/tests/visual/` (Playwright screenshots, compare with baseline) | P2‑TEST‑1 | Medium |
| P2‑TEST‑4 | Build load testing scripts for critical endpoints (API, auth, search) | `/tests/load/` (k6 or artillery scripts) | P2‑TEST‑1 | Medium |

---

## Task Group P2‑BILLING: Subscription & Usage Billing

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑BILLING‑1 | Build Stripe checkout session for subscription purchase (tier selection, success/cancel) | `/apps/web/src/routes/api/stripe/checkout.ts` | P0‑BILLING‑4 | Medium |
| P2‑BILLING‑2 | Build usage metering (track seats, storage GB, AI token consumption) | `/packages/db/src/schema/usage.ts`, `/apps/web/src/server/trpc/middleware/usage‑meter.ts` | P0‑BILLING‑4 | Medium |
| P2‑BILLING‑3 | Implement plan entitlement enforcement (gate features by active plan tier) | `/apps/web/src/server/trpc/middleware/entitlement.ts` | P2‑BILLING‑2 | Medium |
| P2‑BILLING‑4 | Build billing admin overview (subscription status, usage, invoice history) | `/apps/web/src/routes/dashboard/settings/billing/index.tsx` | P2‑BILLING‑1, P2‑BILLING‑2 | Medium |

---

## Task Group P2‑CAP: Capacity Management

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑CAP‑1 | Implement per‑tenant capacity limits (storage, API calls, records) and enforcement middleware | `/apps/web/src/server/trpc/middleware/capacity.ts`, `/packages/db/src/schema/tenant‑limits.ts` | P0‑TRPC‑7 | Medium |

---

## Task Group P2‑MON: Monitoring & Status

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑MON‑1 | Set up public status page (e.g., using open‑source status‑page generator) and health endpoint for external monitoring | Infrastructure, `/apps/web/src/routes/api/status.ts` | P0‑OBS‑4 | Small |
| P2‑ONCALL‑1 | Integrate on‑call alerting (PagerDuty/Opsgenie) for critical errors from Sentry and health check failures | Configuration outside repo; webhook endpoint in `/apps/web/src/routes/api/alerts.ts` | P0‑OBS‑1 | Small |

---

## Task Group P2‑AI‑GOV: AI Governance

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑AI‑GOV‑1 | Draft EU AI Act compliance framework – risk classification, transparency documentation, human‑oversight procedures for AI features | `/docs/compliance/ai‑act‑framework.md` | P3‑AI‑INFRA‑3 (if AI exists) | Small |

---

## Task Group P2‑QUOTE: Quote Management

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑QUOTE‑1 | Define Quote entity (schema, tRPC, basic UI) linking Deals, Contacts, and future Invoices | `/packages/db/src/schema/quotes.ts`, `/apps/web/src/server/trpc/routers/quotes.ts`, `/apps/web/src/routes/dashboard/crm/quotes/` | P1‑CRM‑SCHEMA‑1, P1‑FIN‑SCHEMA‑1 | Large |

---

## Task Group P2‑TEST‑5: Schema Compatibility Testing

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P2‑TEST‑5 | Schema versioning compatibility integration test – apply migrations, run app, verify schema matches expectations | `/tests/integration/schema‑compatibility.spec.ts` | P0‑MIG‑2 | Medium |

---

## Dependency Ordering (Phase 2)

1. **P2‑SEC‑1‑1 → P2‑SEC‑2‑5** (security hardening foundations)
2. **P2‑PORTAL‑1 → P2‑PORTAL‑2 → P2‑PORTAL‑3 → P2‑PORTAL‑4** (portal auth infrastructure)
3. **P2‑PORTAL‑5 → P2‑PORTAL‑6/7/8/9** (portal dashboards, parallel after portal auth)
4. **P2‑PORTAL‑10 → P2‑PORTAL‑11 → P2‑PORTAL‑12 → P2‑PORTAL‑CNAME** (portal payments, depends on Finance)
5. **P2‑ASSETS‑1 → P2‑ASSETS‑2 → P2‑ASSETS‑3/4/5/6/7/8** (asset management, parallel with portal)
6. **P2‑AICRM‑1‑1 → P2‑AICRM‑1‑2 → P2‑AICRM‑1‑3** (CRM email/sequences)
7. **P2‑AICRM‑2‑1 → P2‑AICRM‑2‑2 → P2‑AICRM‑2‑3** (CRM analytics)
8. **P2‑INTEG‑1 → P2‑INTEG‑2 → P2‑INTEG‑3/4/5/6** (integrations)
9. **P2‑AICRM‑3‑1 → P2‑TEST‑2** (public API → contract tests)
10. **P2‑TEST‑1 → P2‑TEST‑3/4 → P2‑TEST‑5** (E2E → visual/load tests → schema compatibility)
11. **P2‑BILLING → P2‑CAP → P2‑MON → P2‑AI‑GOV → P2‑QUOTE** (parallel with integrations, depends on Stripe from Phase 0)
12. **P2‑SEC‑8, P2‑SEC‑9** (compliance extensions, can run after P2‑SEC‑2‑2)

# Phase 3 — AI Intelligence, Automation Engine & Advanced Platform Features (Consolidated Master Task List)

This phase transforms UBOS from a functionally complete business platform into an intelligent, automated, and highly extensible operating system. All tasks are file‑path‑specific, sized, and dependency‑aware. The architecture leverages: Inngest for durable automation, pgvector for semantic search and AI context assembly, Yjs + Hocuspocus for collaborative editing, and SSE streams for agentic AI interactions.

---

## Task Group P3‑AI‑INFRA: AI Infrastructure & Provider Abstraction

*Purpose: Build the foundational layer for all AI features—embedding pipeline, vector storage, context assembly, and provider abstraction with fallback chains.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑AI‑INFRA‑1 | Integrate pgvector extension into Neon PostgreSQL (manual migration step) | `CREATE EXTENSION IF NOT EXISTS vector;` in a migration file | P0‑DB‑1 | Trivial |
| P3‑AI‑INFRA‑2 | Define embeddings table with pgvector column (document chunks, CRM notes, meeting transcripts) | `/packages/db/src/schema/embeddings.ts` (vector(1536) column, metadata JSONB, tenant isolation) | P3‑AI‑INFRA‑1 | Small |
| P3‑AI‑INFRA‑3 | Finalize AIProvider abstraction interface (complete, embed, classify, summarize) with provider adapters | `/apps/web/src/server/ai/providers.ts` (OpenAI, Anthropic, Gemini adapters; fallback chain primary→secondary→tertiary) | None | Medium |
| P3‑AI‑INFRA‑4 | Implement token budget management per operation type and response caching for idempotent queries | Extend `/apps/web/src/server/ai/providers.ts` with budget config and content‑hash‑based cache | P3‑AI‑INFRA‑3 | Medium |
| P3‑AI‑INFRA‑5 | Expose `AIProvider` instance via tRPC context for all domain procedures | `/apps/web/src/server/trpc/context.ts` (add `ai` to context, initialized once) | P3‑AI‑INFRA‑3, P0‑TRPC‑1 | Small |
| P3‑AI‑INFRA‑6 | Implement token consumption tracking per org/user (billing and rate limiting) | `/packages/db/src/schema/ai‑usage.ts`, `/apps/web/src/server/ai/billing.ts` (record tokens used) | P3‑AI‑INFRA‑5 | Medium |

### P3‑AI‑EMBED — Document & Text Embedding Pipeline

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑AI‑EMBED‑1 | Build document chunking utility (split text into semantic chunks with overlap) | `/apps/web/src/server/ai/chunker.ts` (configurable chunk size, overlap) | P3‑AI‑INFRA‑2 | Medium |
| P3‑AI‑EMBED‑2 | Build embedding generation Inngest function (on document upload, chunk → embed → store) | `/apps/web/src/server/inngest/functions/ai/embed‑document.ts` | P3‑AI‑EMBED‑1, P0‑INNGEST‑3, P1‑DOCS‑JOBS‑1 | Medium |
| P3‑AI‑EMBED‑3 | Build RAG re‑indexing function (when document is updated, regenerate embeddings) | `/apps/web/src/server/inngest/functions/ai/re‑embed.ts` (triggered by document version update) | P3‑AI‑EMBED‑2 | Medium |
| P3‑AI‑EMBED‑4 | Build semantic search tRPC procedure (pgvector cosine similarity across document chunks) | `/apps/web/src/server/trpc/routers/documents/search.ts` (extend with vector search) | P3‑AI‑INFRA‑2 | Medium |
| P3‑AI‑EMBED‑5 | Combine keyword + semantic search results via Reciprocal Rank Fusion (RRF) | `/apps/web/src/server/trpc/routers/search.ts` (merge and rank) | P3‑AI‑EMBED‑4, P1‑INTEG‑4 | Medium |

---

## Task Group P3‑AI‑COPILOT: AI Copilot & Contextual Intelligence

*Purpose: Build the AI assistant sidebar, context‑aware suggestions, and the agentic SSE streaming pipeline.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑AI‑COPILOT‑1 | Build unified AI context assembler (fetch user role, recent CRM contacts, open tasks, active documents) | `/apps/web/src/server/ai/context‑builder.ts` (assembles prompt system context window) | P3‑AI‑INFRA‑5, P3‑AI‑EMBED‑4 | Large |
| P3‑AI‑COPILOT‑2 | Build Copilot sidebar UI (collapsible right panel, chat input, suggested prompts, action confirmation cards) | `/apps/web/src/components/ai/CopilotSidebar.tsx` | P3‑AI‑COPILOT‑1 | Large |
| P3‑AI‑COPILOT‑3 | Build inline AI suggestions component (context‑aware floating toolbar for text fields) | `/apps/web/src/components/ai/InlineSuggest.tsx` (appears in deal notes, email compose, task descriptions) | P3‑AI‑COPILOT‑1 | Medium |
| P3‑AI‑COPILOT‑4 | Build Agent SSE Streaming endpoint (Hono route, executes multi‑step chains, emits agent opcodes to UI) | `/apps/web/src/routes/api/agent/stream.ts` (SSE stream, compact opcode protocol) | P3‑AI‑COPILOT‑1 | Large |
| P3‑AI‑COPILOT‑5 | Build AI explain mode (click AI output to see reasoning and source records) | `/apps/web/src/components/ai/ExplanationCard.tsx` | P3‑AI‑COPILOT‑2 | Small |
| P3‑AI‑COPILOT‑6 | Build AI evaluation (eval) framework (test prompt quality over time, regression detection) | `/apps/web/src/server/ai/eval.ts` (compare outputs against golden dataset) | P3‑AI‑INFRA‑3 | Medium |

---

## Task Group P3‑AUTO: Automation Engine

*Purpose: Build the visual workflow builder and the underlying event‑driven automation infrastructure powered by Inngest.*

### P3‑AUTO‑CORE — Core Engine

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑AUTO‑CORE‑1 | Define automation schema (automation_workflows, triggers, actions, runs, logs) | `/packages/db/src/schema/automation.ts` (workflow definitions as JSON, org‑scoped) | P0‑DB‑5 | Medium |
| P3‑AUTO‑CORE‑2 | Build automation engine core (event bus that receives triggers, evaluates conditions, dispatches actions via Inngest) | `/apps/web/src/server/automation/engine.ts` (workflow executor, step‑by‑step state machine) | P3‑AUTO‑CORE‑1, P0‑INNGEST‑3 | Large |
| P3‑AUTO‑CORE‑3 | Register all domain events as automation triggers (CRM, Projects, Documents, Finance, Portal, Scheduling) | `/apps/web/src/server/automation/triggers.ts` (event registry mapping) | P3‑AUTO‑CORE‑2 | Medium |

### P3‑AUTO‑ACTIONS — Action Library

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑AUTO‑ACT‑1 | Build "Send Email" action (template selection, variable injection, send via Resend) | `/apps/web/src/server/automation/actions/send‑email.ts` | P3‑AUTO‑CORE‑2, P0‑EMAIL‑3 | Medium |
| P3‑AUTO‑ACT‑2 | Build "Create Task" action (assign to owner, set due date, link to project/deal) | `/apps/web/src/server/automation/actions/create‑task.ts` | P3‑AUTO‑CORE‑2, P1‑PROJ‑TRPC‑2 | Medium |
| P3‑AUTO‑ACT‑3 | Build "Update Record" action (set field value on any CRM/Projects/Finance record) | `/apps/web/src/server/automation/actions/update‑record.ts` | P3‑AUTO‑CORE‑2 | Medium |
| P3‑AUTO‑ACT‑4 | Build "Send Notification" action (push/SMS/email to user or role) | `/apps/web/src/server/automation/actions/notify.ts` | P3‑AUTO‑CORE‑2, P1‑INTEG‑7 | Medium |
| P3‑AUTO‑ACT‑5 | Build "Create Invoice" action (auto‑generate invoice from deal or project context) | `/apps/web/src/server/automation/actions/create‑invoice.ts` | P3‑AUTO‑CORE‑2, P1‑FIN‑TRPC‑3 | Medium |
| P3‑AUTO‑ACT‑6 | Build "Share Document" action (grant portal access to file with expiry) | `/apps/web/src/server/automation/actions/share‑document.ts` | P3‑AUTO‑CORE‑2, P1‑DOCS‑TRPC‑4 | Medium |
| P3‑AUTO‑ACT‑7 | Build "Webhook" action (POST payload to external URL with retry logic) | `/apps/web/src/server/automation/actions/webhook‑call.ts` | P3‑AUTO‑CORE‑2, P2‑AICRM‑3‑2 | Medium |
| P3‑AUTO‑ACT‑8 | Build "Wait/Delay" and "Conditional Branch" actions | Part of workflow engine in P3‑AUTO‑CORE‑2 (Inngest waitForEvent/sleep) | P3‑AUTO‑CORE‑2 | Medium |

### P3‑AUTO‑UI — Visual Workflow Builder

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑AUTO‑UI‑1 | Build visual workflow builder canvas (drag‑and‑drop trigger → condition → action, connector lines) | `/apps/web/src/routes/dashboard/automation/builder.tsx` (react‑flow based) | P3‑AUTO‑CORE‑3, P3‑AUTO‑ACT‑1 | Large |
| P3‑AUTO‑UI‑2 | Build step configuration panels (trigger selection, filter conditions, action parameters) | `/apps/web/src/components/automation/StepConfig.tsx` | P3‑AUTO‑UI‑1 | Large |
| P3‑AUTO‑UI‑3 | Build workflow template library (pre‑built automations: deal won → send proposal, task overdue → notify manager) | `/apps/web/src/components/automation/TemplateLibrary.tsx` | P3‑AUTO‑UI‑1 | Medium |
| P3‑AUTO‑UI‑4 | Build automation run history and logs viewer | `/apps/web/src/routes/dashboard/automation/history.tsx` (filterable by status, error detail) | P3‑AUTO‑CORE‑2 | Medium |
| P3‑AUTO‑UI‑5 | Build automation testing sandbox (dry‑run workflow against sample record) | Part of builder UI: "Test Workflow" button | P3‑AUTO‑UI‑1 | Medium |

---

## Task Group P3‑SCHED: Scheduling Engine

*Purpose: Build a full Calendar‑sync‑integrated scheduling system with meeting types, availability rules, public booking pages, and resource booking.*

### P3‑SCHED‑SCHEMA & TRPC

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑SCHED‑1 | Define scheduling core schema (meeting_types, bookings, attendees, calendar_connections, availability_rules, meeting_outcomes, booking_page_settings) | `/packages/db/src/schema/scheduling.ts` (RLS, FKs to org/users) | P0‑DB‑5 | Large |
| P3‑SCHED‑2 | Build scheduling tRPC procedures (CRUD meeting types, create/cancel booking, check availability, list by user/team) | `/apps/web/src/server/trpc/routers/scheduling.ts` | P3‑SCHED‑1 | Large |
| P3‑SCHED‑3 | Build calendar sync procedures (read/write events to Google/Microsoft via OAuth tokens) | `/apps/web/src/server/inngest/functions/calendar/sync‑events.ts` | P3‑SCHED‑2, P2‑INTEG‑3, P2‑INTEG‑4 | Large |
| P3‑SCHED‑4 | Build availability resolution procedure (merge calendar events, availability rules, deep‑work blocks) | `/apps/web/src/server/trpc/routers/scheduling/availability.ts` | P3‑SCHED‑2, P3‑SCHED‑3 | Medium |
| P3‑SCHED‑5 | Implement CRM booking hook (on meeting booked, attach to CRM record, pre‑fill details) | `/apps/web/src/server/inngest/functions/scheduling/crm‑hook.ts` | P3‑SCHED‑2, P1‑CRM‑TRPC‑7 | Medium |
| P3‑SCHED‑6 | Build configurable reminders (multi‑channel, multi‑stage via Inngest) | `/apps/web/src/server/inngest/functions/scheduling/reminders.ts` | P3‑SCHED‑2, P0‑EMAIL‑3 | Medium |

### P3‑SCHED‑UI

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑SCHED‑7 | Build public booking page (meeting type selection, invitee details, confirmation) | `/apps/web/src/routes/public/book.tsx` (standalone page, tenant‑aware) | P3‑SCHED‑4, P2‑PORTAL‑2 (layout pattern) | Large |
| P3‑SCHED‑8 | Build meeting type management UI (create/edit types, duration, location, buffer, max bookings) | `/apps/web/src/routes/dashboard/settings/scheduling/types.tsx` | P3‑SCHED‑2 | Medium |
| P3‑SCHED‑9 | Build internal calendar view (week/month grid showing all bookings, CRM/project context on hover) | `/apps/web/src/routes/dashboard/scheduling/calendar.tsx` | P3‑SCHED‑3 | Large |
| P3‑SCHED‑10 | Build booking page branding builder (drag‑to‑reorder fields, color/font picker, logo upload) | `/apps/web/src/routes/dashboard/settings/scheduling/branding.tsx` | P3‑SCHED‑2 | Medium |
| P3‑SCHED‑11 | Build scheduling embed widget (JS snippet for inline/popup booking on external sites) | `/apps/web/src/components/scheduling/EmbedWidget.tsx` and `/public/embed.js` | P3‑SCHED‑7 | Large |

---

## Task Group P3‑ADV‑DOCS: Advanced Document Features (E‑Signature & Workflows)

*Purpose: Add real document workflows, e‑signature integration, and collaborative editing.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑ADV‑DOCS‑1 | Integrate e‑signature provider (DocuSign or open‑source alternative) with webhook handling | `/apps/web/src/server/routes/api/esign/webhook.ts` (initiate ceremony, receive status) | P1‑DOCS‑TRPC‑1 | Large |
| P3‑ADV‑DOCS‑2 | Build signing workflow UI (define signers, field placement, send for signature, tracker) | `/apps/web/src/routes/dashboard/documents/esign.tsx` (embedded signing) | P3‑ADV‑DOCS‑1 | Large |
| P3‑ADV‑DOCS‑3 | Extend automation engine for document workflows (Upload → Review → Approve → Sign → Archive) | `/apps/web/src/server/automation/triggers.ts` (add document events as triggers) | P3‑AUTO‑CORE‑3, P3‑ADV‑DOCS‑1 | Medium |
| P3‑ADV‑DOCS‑4 | Deploy Hocuspocus WebSocket server for collaborative editing (integrate Yjs) | `/apps/web/src/server/hocuspocus.ts` (Node.js or Cloudflare Worker, Yjs sync) | P1‑DOCS‑UI‑5 | Large |
| P3‑ADV‑DOCS‑5 | Build real‑time co‑editing embed (load document in collaborative editor, live cursor presence) | `/apps/web/src/components/documents/CollaborativeEditor.tsx` (using Yjs provider, markdown or rich text) | P3‑ADV‑DOCS‑4 | Large |
| P3‑ADV‑DOCS‑6 | Implement dynamic watermarking on document preview and downloaded PDF | `/apps/web/src/server/trpc/routers/documents/download.ts` (inject user email, timestamp) | P1‑DOCS‑TRPC‑4 | Medium |

---

## Task Group P3‑ADV‑FIN: Advanced Finance Features

*Purpose: Add expense management, multi‑currency, multi‑entity, and advanced accounting.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑ADV‑FIN‑1 | Define expense report schema (expense_reports, expense_items, expense_policies) | `/packages/db/src/schema/expenses.ts` | P0‑DB‑5 | Medium |
| P3‑ADV‑FIN‑2 | Build expense submission and approval workflow (create report, add items, submit, approve/reject) | `/apps/web/src/server/trpc/routers/expenses.ts` (with approval chain) | P3‑ADV‑FIN‑1, P1‑FIN‑TRPC‑2 | Large |
| P3‑ADV‑FIN‑3 | Build expense policy enforcement (flag out‑of‑policy amounts, missing receipts) | `/apps/web/src/server/trpc/routers/expenses.ts` (pre‑submission validation) | P3‑ADV‑FIN‑2 | Medium |
| P3‑ADV‑FIN‑4 | Implement multi‑currency FX rates cache and refresh job via Inngest | `/apps/web/src/server/inngest/functions/finance/fx‑rates.ts` (daily fetch) | P1‑FIN‑SCHEMA‑1, P0‑INNGEST‑2 | Medium |
| P3‑ADV‑FIN‑5 | Add legal_entity support for multi‑entity accounting (segregated vendor lists, bank accounts, reporting) | `/packages/db/src/schema/finance‑entities.ts`, extend existing finance tables with entity FK | P1‑FIN‑SCHEMA‑1 | Large |
| P3‑ADV‑FIN‑6 | Build consolidated multi‑entity financial reports (roll‑up AP/AR/Spend per entity, inter‑company elimination) | `/apps/web/src/server/trpc/routers/finance/reports.ts` (entity filter) | P3‑ADV‑FIN‑5 | Medium |
| P3‑ADV‑FIN‑7 | Build purchase requisition → PO → goods receipt → three‑way matching engine | `/apps/web/src/server/trpc/routers/finance/procurement.ts` | P1‑FIN‑TRPC‑2 | Large |

---

## Task Group P3‑COLLAB: Real‑Time Collaboration Infrastructure

*Purpose: Build the presence system, real‑time updates via SSE, and activity tracking for collaboration.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑COLLAB‑1 | Implement presence awareness system (who is viewing/editing what) via WebSocket/SSE | `/apps/web/src/server/presence.ts` (set presence, broadcast changes) | P3‑ADV‑DOCS‑4 | Medium |
| P3‑COLLAB‑2 | Build `useWebSocket` hook with TanStack Query cache integration and auto‑reconnect | `/apps/web/src/lib/websocket.ts` (push updates into query cache) | P3‑COLLAB‑1 | Medium |
| P3‑COLLAB‑3 | Build real‑time activity feed (document edits, deal stage changes, comments) via tRPC subscriptions | `/apps/web/src/server/trpc/subscriptions/activity.ts` (SSE stream) | P3‑COLLAB‑2 | Medium |
| P3‑COLLAB‑4 | Integrate @mention resolution across all text areas (parse, resolve to user, send notification) | `/apps/web/src/lib/mentions.ts` (autocomplete UI, notification trigger) | P1‑INTEG‑7 | Medium |

---

## Task Group P3‑REPORT: Custom Reporting & Dashboards

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑REPORT‑1 | Build reusable metric query engine (cross‑domain aggregated queries for CRM, Projects, Finance, Documents) | `/apps/web/src/server/trpc/routers/reports/metrics.ts` | P1‑CRM‑TRPC‑6, P1‑FIN‑TRPC‑5, P1‑PROJ‑TRPC‑3 | Large |
| P3‑REPORT‑2 | Build custom report builder UI (drag‑and‑drop metric and dimension selector, chart type picker, save/share) | `/apps/web/src/routes/dashboard/reports/builder.tsx` | P3‑REPORT‑1 | Large |
| P3‑REPORT‑3 | Build scheduled report delivery (PDF/CSV sent to stakeholders via Inngest + Resend) | `/apps/web/src/server/inngest/functions/reports/scheduled‑report.ts` | P3‑REPORT‑2, P0‑EMAIL‑3 | Medium |

---

## Task Group P3‑PLAT: Platform Administration & Feature Management

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑PLAT‑1 | Build admin user management UI (list all org members, change roles, deactivate, resend invites) | `/apps/web/src/routes/dashboard/admin/users.tsx` (super‑admin only) | P0‑TRPC‑3, P1‑ONBOARD‑3 | Medium |
| P3‑PLAT‑2 | Build admin audit log viewer (filter by user, module, action, date range) | `/apps/web/src/routes/dashboard/admin/audit.tsx` | P0‑TRPC‑6 | Medium |
| P3‑PLAT‑3 | Build admin feature flag management interface (enable/disable per org or globally) | `/apps/web/src/routes/dashboard/admin/features.tsx` (connected to PostHog or DB) | P0‑FEAT‑1 | Medium |
| P3‑PLAT‑4 | Build admin storage dashboard (R2 usage per org, per user, per module) | `/apps/web/src/routes/dashboard/admin/storage.tsx` | P0‑STORAGE‑2 | Small |
| P3‑PLAT‑5 | Build admin AI usage and billing dashboard (token consumption per feature per org, budget alerts) | `/apps/web/src/routes/dashboard/admin/ai‑usage.tsx` | P3‑AI‑INFRA‑6 | Small |
| P3‑PLAT‑6 | Implement IP allowlist enforcement (restrict org access to defined IP ranges; admin bypass with audit log) | `/apps/web/src/server/trpc/middleware/ip‑allowlist‑check.ts` | P2‑SEC‑3‑2 | Small |
| P3‑PLAT‑7 | Build API key management UI (generate, rotate, revoke org‑level keys with scope selection) | `/apps/web/src/routes/dashboard/settings/api‑keys.tsx` | P0‑SEC‑3 | Medium |
| P3‑ADMIN‑1 | Build admin data correction tools – super‑admin UI to edit any record (ledger, contact merge) with audit trail | `/apps/web/src/routes/dashboard/admin/data‑editor.tsx` | P3‑PLAT‑1, P0‑TRPC‑6 | Medium |
| P3‑TIME‑1 | Define time entries schema and basic time tracking UI (track hours against tasks/projects) | `/packages/db/src/schema/time‑entries.ts`, `/apps/web/src/server/trpc/routers/time‑entries.ts`, `/apps/web/src/components/projects/TimeTracker.tsx` | P1‑PROJ‑SCHEMA‑1 | Medium (optional) |

---

## Task Group P3‑TEST: Advanced Testing & CI/CD

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P3‑TEST‑1 | Implement full integration tests for automation workflows (trigger → action chain) | `/tests/integration/automation.spec.ts` | P3‑AUTO‑CORE‑3 | Medium |
| P3‑TEST‑2 | Build AI response quality regression tests (eval framework integration in CI) | `/tests/ai/eval‑regression.spec.ts` | P3‑AI‑COPILOT‑6 | Medium |
| P3‑TEST‑3 | Set up continuous deployment pipeline with blue‑green deployments and database migration compatibility checks | `.github/workflows/deploy.yml` (expand to production deployment) | P2‑TEST‑4 | Large |

---

## Dependency Ordering (Phase 3)

1. **P3‑AI‑INFRA‑1 → P3‑AI‑INFRA‑2/3/4/5/6** (AI foundation)
2. **P3‑AI‑EMBED‑1 → P3‑AI‑EMBED‑2/3/4/5** (embedding pipeline)
3. **P3‑AI‑COPILOT‑1 → P3‑AI‑COPILOT‑2/3/4** (assistant UI and streaming)
4. **P3‑AUTO‑CORE‑1 → P3‑AUTO‑CORE‑2 → P3‑AUTO‑CORE‑3 → P3‑AUTO‑ACT‑* → P3‑AUTO‑UI‑*** (automation engine, sequentially)
5. **P3‑SCHED‑1 → P3‑SCHED‑2 → P3‑SCHED‑4 → P3‑SCHED‑7** (scheduling core, parallel with AI and Auto)
6. **P3‑ADV‑DOCS‑1 → P3‑ADV‑DOCS‑2/3/4/5** (advanced documents, can start after AI embedding)
7. **P3‑ADV‑FIN‑1/4/5 → P3‑ADV‑FIN‑2/3/6/7** (advanced finance)
8. **P3‑COLLAB** (after Hocuspocus is up in P3‑ADV‑DOCS‑4)
9. **P3‑REPORT** (after domain metrics procedures exist)
10. **P3‑PLAT → P3‑ADMIN‑1 → P3‑TIME‑1** (platform administration, parallel with others)
11. **P3‑TEST** (final validation)

# Phase 4 — AI-Powered Intelligence, Enterprise Compliance & Platform Maturity (Consolidated Master Task List)

This final build phase elevates UBOS into an AI‑native, enterprise‑grade operating system. It delivers autonomous agents for Finance and CRM, deep document intelligence, advanced scheduling, cross‑module orchestration, and the compliance & administration tools demanded by large-scale deployments. All tasks remain file‑path‑specific, sized, and rigorously dependency‑aware.

---

## Task Group P4‑AI‑INFRA‑ADV: Advanced AI Infrastructure

*Purpose: Extend the AI layer with persistent memory, multi‑modal processing, and evaluation pipelines.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑AI‑ADV‑1 | Build Copilot memory layer (persist user preferences, frequently used commands, correction history in pgvector) | `/apps/web/src/server/ai/memory.ts` | P3‑AI‑INFRA‑2, P3‑AI‑COPILOT‑1 | Medium |
| P4‑AI‑ADV‑2 | Implement NL command parser for scheduling (“Find 30 min next week with Alex”) | `/apps/web/src/server/ai/parsers/scheduling‑nl.ts` (resolve against availability rules) | P3‑SCHED‑4, P3‑AI‑COPILOT‑1 | Medium |
| P4‑AI‑ADV‑3 | Build AI decision audit log (store full prompt, response, reasoning chain for every AI action) | `/packages/db/src/schema/ai‑decisions.ts` | P3‑AI‑INFRA‑6 | Small |
| P4‑AI‑ADV‑4 | Create evaluation leaderboard and regression test suite for all domain‑specific AI prompts | `/apps/web/src/server/ai/eval/domain‑tests/` (CRM, Docs, Finance, Projects) | P3‑AI‑COPILOT‑6 | Large |

---

## Task Group P4‑CRM‑AI: Autonomous CRM Intelligence

*Purpose: Transform CRM from a system of record into a proactive revenue acceleration engine.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑CRM‑AI‑1 | Build ML‑driven deal scoring (probability prediction trained on won/lost history, recency, engagement) | `/apps/web/src/server/ai/models/deal‑scorer.ts` (periodic batch inference via Inngest) | P2‑AICRM‑2‑1, P3‑AI‑INFRA‑3 | Large |
| P4‑CRM‑AI‑2 | Build next‑best‑action recommendation engine (suggest call, email, or proposal based on deal stage/history) | `/apps/web/src/server/ai/recommendations/crm.ts` | P4‑CRM‑AI‑1 | Medium |
| P4‑CRM‑AI‑3 | Build AI email draft generation (one‑click follow‑up, proposal, or check‑in populated with CRM context) | `/apps/web/src/components/crm/AIEmailComposer.tsx` (inline prompt → draft) | P3‑AI‑COPILOT‑3, P2‑AICRM‑1‑1 | Medium |
| P4‑CRM‑AI‑4 | Build AI churn risk indicator (flag contacts/accounts with disengagement signals) | `/apps/web/src/server/ai/models/churn‑predictor.ts` | P4‑CRM‑AI‑1 | Medium |
| P4‑CRM‑AI‑5 | Build competitive intelligence layer (extract competitor mentions from call transcripts, aggregate into battlecard) | `/apps/web/src/server/ai/analyzers/competitive.ts` (NLP on transcripts) | P3‑AI‑EMBED‑2 | Large |
| P4‑CRM‑AI‑6 | Build meeting recording upload + AI transcription pipeline (webhook from Zoom/Meet, store in R2, index) | `/apps/web/src/server/inngest/functions/crm/transcription.ts` | P0‑STORAGE‑2, P3‑AI‑EMBED‑2 | Medium |
| P4‑CRM‑AI‑7 | Build conversation intelligence summary (AI‑generated call summary, topics, sentiment, action items) | `/apps/web/src/server/ai/summarizers/call‑summarizer.ts` | P4‑CRM‑AI‑6 | Medium |
| P4‑CRM‑AI‑8 | Build contact enrichment AI (auto‑fill LinkedIn, company size, industry from public data) | `/apps/web/src/server/inngest/functions/crm/enrich‑contact.ts` (rate‑limited, opt‑in) | P1‑CRM‑TRPC‑1 | Medium |

---

## Task Group P4‑DOC‑AI: Intelligent Document Processing

*Purpose: Add autonomous document understanding, redaction, compliance, and lifecycle management.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑DOC‑AI‑1 | Build AI document summarization (one‑click summary with key points and action items) | `/apps/web/src/server/ai/summarizers/document‑summary.ts` (on‑demand and automatic) | P3‑AI‑EMBED‑2 | Medium |
| P4‑DOC‑AI‑2 | Implement AI content Q&A (“What are the payment terms in this contract?”) using pgvector retrieval | `/apps/web/src/server/ai/qa/document‑qa.ts` (RAG over document chunks) | P3‑AI‑EMBED‑4, P4‑DOC‑AI‑1 | Medium |
| P4‑DOC‑AI‑3 | Add AI document classification (auto‑tag by type: contract, invoice, NDA, report; suggest retention label) | `/apps/web/src/server/inngest/functions/ai/classify‑document.ts` | P3‑AI‑EMBED‑2 | Medium |
| P4‑DOC‑AI‑4 | Build AI PII detection and intelligent redaction (scan, highlight, one‑click redact) | `/apps/web/src/server/ai/redaction/pii‑scanner.ts`, `/apps/web/src/components/documents/RedactionTool.tsx` | P3‑AI‑INFRA‑3, P1‑DOCS‑UI‑5 | Large |
| P4‑DOC‑AI‑5 | Build conditional signing flow engine (if signed by A → route to B, else return to sender) | `/apps/web/src/server/automation/actions/e‑sign‑router.ts` (extends existing e‑sign) | P3‑ADV‑DOCS‑1, P3‑AUTO‑CORE‑2 | Medium |
| P4‑DOC‑AI‑6 | Implement eIDAS‑qualified electronic signature (QES) support for EU compliance | `/apps/web/src/server/routes/api/esign/qes.ts` (integrate certified trust service) | P3‑ADV‑DOCS‑1 | Large |
| P4‑DOC‑AI‑7 | Build document workflow templates (pre‑built flows: client onboarding, contract review, invoice approval) | Preconfigured automation workflows using document events | P3‑AUTO‑UI‑3, P3‑ADV‑DOCS‑3 | Small |
| P4‑DOC‑AI‑8 | Implement PDF annotation layer (highlight, strikeout, sticky notes stored separately from document binary) | `/packages/db/src/schema/annotations.ts`, `/apps/web/src/components/documents/AnnotationLayer.tsx` | P3‑ADV‑DOCS‑5 | Large |
| P4‑DOC‑AI‑9 | Build compliance hold enforcement middleware (block delete/overwrite on held documents) | `/apps/web/src/server/trpc/middleware/compliance‑hold.ts` | P2‑SEC‑2‑3 | Small |
| P4‑DOC‑AI‑10 | Build retention policy automation (auto‑archive or delete based on document type, age, project status) | `/apps/web/src/server/inngest/functions/compliance/retention‑executor.ts` | P2‑SEC‑2‑4 | Medium |

---

## Task Group P4‑FIN‑AI: Autonomous Finance & Treasury

*Purpose: Deploy AI agents for AP, fraud detection, cash‑flow forecasting, and tax compliance.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑FIN‑AI‑1 | Build AI invoice capture & classification agent (extract vendor, amount, date, line items from PDF/image; auto‑code to GL) | `/apps/web/src/server/ai/agents/invoice‑capture.ts` | P3‑AI‑INFRA‑5, P1‑FIN‑TRPC‑2 | Large |
| P4‑FIN‑AI‑2 | Build AI PO‑matching agent (two‑way and three‑way match with tolerance rules, exception flagging) | `/apps/web/src/server/ai/agents/po‑matcher.ts` | P3‑ADV‑FIN‑7, P4‑FIN‑AI‑1 | Large |
| P4‑FIN‑AI‑3 | Build AI approval routing agent (route invoice to correct approver based on policies, amount, department, vendor history) | `/apps/web/src/server/ai/agents/approval‑router.ts` | P3‑AUTO‑CORE‑2, P1‑FIN‑TRPC‑2 | Medium |
| P4‑FIN‑AI‑4 | Build AI learning feedback loop (capture human corrections to coding/routing, update classification weights) | Extend above agents with feedback ingestion | P4‑FIN‑AI‑1 | Medium |
| P4‑FIN‑AI‑5 | Build cash‑flow forecast model (ML projection using historical payments, upcoming bills, CRM pipeline probability) | `/apps/web/src/server/ai/models/cash‑flow‑forecast.ts` | P4‑CRM‑AI‑1, P1‑FIN‑TRPC‑5 | Large |
| P4‑FIN‑AI‑6 | Build fraud detection anomaly detector (flag vendor bank account changes, duplicate invoices, unusual amounts) | `/apps/web/src/server/ai/analyzers/fraud‑detector.ts` (Inngest scheduled scan) | P4‑FIN‑AI‑1 | Medium |
| P4‑FIN‑AI‑7 | Build vendor payment optimisation (AI suggests optimal method per vendor: card, ACH, check based on fees/float) | `/apps/web/src/server/ai/agents/payment‑optimizer.ts` | P3‑ADV‑FIN‑4, P0‑BILLING‑4 | Medium |
| P4‑FIN‑AI‑8 | Build W‑9 / W‑8 tax form collection workflow and TIN validation engine | `/apps/web/src/server/inngest/functions/finance/tax‑forms.ts` (auto‑request, validate, store) | P1‑FIN‑TRPC‑4 | Medium |
| P4‑FIN‑AI‑9 | Build 1099 e‑filing integration (submit NEC/MISC electronically, track filing status) | `/apps/web/src/server/inngest/functions/finance/efile‑1099.ts` | P4‑FIN‑AI‑8 | Large |
| P4‑FIN‑AI‑10 | Enhance financial dashboard builder (drag‑and‑drop widget layout, shared view, scheduled PDF delivery) | `/apps/web/src/routes/dashboard/finance/dashboards/builder.tsx` | P1‑FIN‑UI‑5, P3‑REPORT‑2 | Large |

---

## Task Group P4‑TAX: Tax Engine Integration

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P4‑TAX‑1 | Integrate Avalara or TaxJar for automated sales tax/VAT calculation | `/apps/web/src/server/plugins/tax.ts` (provider interface), `/apps/web/src/server/inngest/functions/finance/tax‑calculator.ts` | P0‑BILLING‑1, P1‑FIN‑TRPC‑3 | Large | Required for US multi‑state and EU VAT compliance |
| P4‑TAX‑2 | Build tax override and exemption certificate management UI | `/apps/web/src/routes/dashboard/finance/settings/tax.tsx` | P4‑TAX‑1 | Medium | Needed for B2B transactions with exemptions |

---

## Task Group P4‑REV‑REC: Revenue Recognition

| ID | Task | Files / Paths | Depends On | Effort | Rationale |
|----|------|---------------|------------|--------|-----------|
| P4‑REVREC‑1 | Implement revenue recognition engine (spread subscription payments over contract term) | `/apps/web/src/server/plugins/revenue‑recognition.ts` (schedules recognition entries), `/packages/db/src/schema/revenue‑schedules.ts` | P1‑FIN‑SCHEMA‑1, P0‑BILLING‑4 | Large | Critical for SaaS finance; without it, financial reports are inaccurate |
| P4‑REVREC‑2 | Build revenue waterfall report and deferred revenue dashboard | `/apps/web/src/routes/dashboard/finance/reports/revenue‑waterfall.tsx` | P4‑REVREC‑1 | Medium | Visibility for finance teams |

---

## Task Group P4‑SCHED‑AI: Intelligent Scheduling & Enterprise Calendar

*Purpose: Add AI‑powered scheduling optimization, round‑robin, resource booking, and enterprise compliance.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑SCHED‑AI‑1 | Build lead routing rules engine (route bookings based on CRM lead score, territory, product interest) | `/apps/web/src/server/ai/agents/lead‑router.ts` (rules engine + AI scoring) | P3‑SCHED‑5, P4‑CRM‑AI‑1 | Large |
| P4‑SCHED‑AI‑2 | Implement round‑robin distribution algorithm with custom weights (skill, capacity, CRM pipeline load) | `/apps/web/src/server/trpc/routers/scheduling/round‑robin.ts` | P3‑SCHED‑2 | Medium |
| P4‑SCHED‑AI‑3 | Build instant one‑click meeting links from CRM record (pre‑fill contact details, open booking flow) | `/apps/web/src/components/crm/InstantBook.tsx` | P3‑SCHED‑7, P1‑CRM‑UI‑2 | Small |
| P4‑SCHED‑AI‑4 | Assemble AI‑enhanced meeting prep brief (pull CRM contact details, last interaction, open deals, linked docs) | `/apps/web/src/server/ai/prep‑brief.ts` (deliver via email/in‑app 15 min before meeting) | P3‑AI‑COPILOT‑1, P3‑SCHED‑5 | Medium |
| P4‑SCHED‑AI‑5 | Build group scheduling / meeting poll (propose slots, share poll link, vote counts, confirm winner) | `/apps/web/src/routes/public/poll.tsx` (public page, real‑time updates) | P3‑SCHED‑7 | Large |
| P4‑SCHED‑AI‑6 | Build resource‑bookable scheduling (select room/equipment from Assets alongside meeting, conflict blocking) | Extend P3‑SCHED‑2 to include asset availability | P3‑SCHED‑2, P2‑ASSETS‑3 | Medium |
| P4‑SCHED‑AI‑7 | Build timezone conversion engine with travel‑time buffer (auto‑detect invitee timezone, show overlap) | `/apps/web/src/server/scheduling/timezone‑engine.ts` | P3‑SCHED‑7 | Small |
| P4‑SCHED‑AI‑8 | Build scheduling audit trail (log all booking/cancellation events, exportable CSV) | `/apps/web/src/server/trpc/routers/scheduling/audit.ts` | P3‑SCHED‑2, P0‑TRPC‑6 | Small |
| P4‑SCHED‑AI‑9 | Implement GDPR/CCPA retention policies for meeting data and recordings (auto‑expiry via Inngest) | `/apps/web/src/server/inngest/functions/compliance/meeting‑retention.ts` | P2‑SEC‑2‑4, P3‑SCHED‑2 | Small |

---

## Task Group P4‑PROJ‑AI: AI‑Driven Project Intelligence

*Purpose: Use AI to plan, track, and optimize projects and resources.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑PROJ‑AI‑1 | Build AI task breakdown (given a project goal/milestone, generate suggested task list with estimates and dependencies) | `/apps/web/src/server/ai/generators/task‑breakdown.ts` (integrate into project creation wizard) | P3‑AI‑INFRA‑5, P1‑PROJ‑TRPC‑2 | Medium |
| P4‑PROJ‑AI‑2 | Build AI risk detection (identify tasks with no assignee, overdue dependencies, budget overrun patterns) | `/apps/web/src/server/ai/analyzers/project‑risk.ts` (triggered by project update events) | P4‑PROJ‑AI‑1 | Medium |
| P4‑PROJ‑AI‑3 | Build AI project status narrative (auto‑generate plain‑English update from task completion, budget, milestone data) | `/apps/web/src/server/ai/generators/status‑update.ts` | P3‑AI‑COPILOT‑1, P1‑PROJ‑TRPC‑3 | Small |
| P4‑PROJ‑AI‑4 | Build AI sprint planning assistant (suggest optimal task assignment based on member capacity, skills, velocity) | `/apps/web/src/server/ai/agents/sprint‑planner.ts` | P4‑PROJ‑AI‑1 | Medium |
| P4‑PROJ‑AI‑5 | Build AI dependency conflict detector (proactively warn when new task creates circular dependency or schedule conflict) | `/apps/web/src/server/ai/analyzers/dependency‑conflict.ts` | P1‑PROJ‑TRPC‑2 | Small |
| P4‑PROJ‑AI‑6 | Build cross‑module custom report builder (combine metrics from CRM, Projects, Finance, Docs) | `/apps/web/src/routes/dashboard/reports/advanced‑builder.tsx` (full drag‑and‑drop, data blending) | P3‑REPORT‑2 | Large |

---

## Task Group P4‑HR: HR & People Module (Foundation)

*Purpose: Establish the HR domain for employee directories, org charts, time‑off, and leave management.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑HR‑1 | Define HR schema (employees, departments, positions, employment_history) | `/packages/db/src/schema/hr.ts` | P0‑DB‑5 | Medium |
| P4‑HR‑2 | Build employee directory (searchable list, avatar, role, department, contact links) | `/apps/web/src/routes/dashboard/hr/index.tsx` | P4‑HR‑1 | Medium |
| P4‑HR‑3 | Build org chart view (interactive hierarchical tree) | `/apps/web/src/components/hr/OrgChart.tsx` | P4‑HR‑1 | Medium |
| P4‑HR‑4 | Define leave schema (leave_types, leave_requests, leave_balances) | `/packages/db/src/schema/leave.ts` | P0‑DB‑5 | Medium |
| P4‑HR‑5 | Build leave request flow (employee submits, manager approves/rejects, balance deducted) | `/apps/web/src/server/trpc/routers/leave.ts` | P4‑HR‑4 | Medium |
| P4‑HR‑6 | Build leave calendar overlay (show approved leave alongside project workload) | `/apps/web/src/components/hr/LeaveCalendar.tsx` | P4‑HR‑5, P1‑PROJ‑UI‑2 | Medium |
| P4‑HR‑7 | Build leave balance dashboard (per‑employee accrual, used, remaining days) | `/apps/web/src/routes/dashboard/hr/balances.tsx` | P4‑HR‑5 | Small |

---

## Task Group P4‑PLAT‑ENT: Enterprise Platform Administration

*Purpose: Deliver the control plane required by large-scale organizations: advanced monitoring, data residency, usage analytics, and support tooling.*

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑PLAT‑ENT‑1 | Build multi‑region deployment automation (Cloudflare Workers / Fly.io edge routing based on tenant data residency) | `infra/edge‑routing/` (deployment scripts and routing config) | P2‑SEC‑2‑5 | Large |
| P4‑PLAT‑ENT‑2 | Implement global audit log with advanced filtering and export (field‑level diffs, CSV/PDF export) | `/apps/web/src/routes/dashboard/admin/audit.tsx` (enhanced viewer) | P3‑PLAT‑2, P0‑TRPC‑6 | Medium |
| P4‑PLAT‑ENT‑3 | Build admin cost allocation dashboard (break down infrastructure costs per org, per module) | `/apps/web/src/routes/dashboard/admin/costs.tsx` | P3‑PLAT‑4, P3‑PLAT‑5 | Small |
| P4‑PLAT‑ENT‑4 | Create support admin impersonation tool (temporary, fully audited, for troubleshooting) | `/apps/web/src/server/trpc/middleware/impersonate.ts` (with admin role gate) | P3‑PLAT‑1 | Medium |
| P4‑PLAT‑ENT‑5 | Add SAML SSO configuration UI for enterprise IdPs (Okta, Azure AD) | `/apps/web/src/routes/dashboard/settings/security/sso.tsx` | P0‑AUTH‑7 | Medium |
| P4‑PLAT‑ENT‑6 | Implement API subscription management and monetization (tiered rate limits, usage billing integration) | `/apps/web/src/server/trpc/middleware/api‑subscription.ts` | P2‑BILLING‑3, P2‑AICRM‑3‑1 | Large |

---

## Task Group P4‑INTEG: Advanced Integrations & Partner Platform

| ID | Task | Files / Paths | Depends On | Effort |
|----|------|---------------|------------|--------|
| P4‑INTEG‑1 | Build QuickBooks Online two‑way sync (push invoices/bills, pull chart of accounts, bank transactions) | `/apps/web/src/server/inngest/functions/integrations/qbo‑full‑sync.ts` | P2‑INTEG‑6 | Large |
| P4‑INTEG‑2 | Build Xero sync (push invoices/contacts, pull bank transactions for reconciliation) | `/apps/web/src/server/inngest/functions/integrations/xero‑sync.ts` | P4‑INTEG‑1 | Large |
| P4‑INTEG‑3 | Build BI tool integration (native connector for Metabase / PowerBI via read‑replica or API) | `/apps/web/src/server/api/public/v1/bi‑data.ts` (aggregated, cached endpoints) | P3‑REPORT‑2 | Large |
| P4‑INTEG‑4 | Build public Partner API with OAuth2.0 and scoped access for third‑party developers | `/apps/web/src/server/api/public/v2/partner/` (formal developer program) | P2‑AICRM‑3‑1, P3‑PLAT‑7 | Large |
| P4‑INTEG‑5 | Create App Directory / Marketplace (integrations that require user‑configurable OAuth) | `/apps/web/src/routes/dashboard/settings/integrations/marketplace.tsx` (discovery and installation) | P4‑INTEG‑4 | Medium |

---

## Task Group P4‑FUTURE: Research Spikes & Architecture Futures

*Purpose: Investigate emerging technologies without shipping commitment. Each is a Trivial spike.*

| ID | Task | Effort |
|----|------|--------|
| P4‑FUT‑1 | Research zero‑knowledge client‑side encryption for sensitive documents | Trivial |
| P4‑FUT‑2 | Evaluate blockchain‑notarized document timestamping | Trivial |
| P4‑FUT‑3 | Prototype AI contract negotiation agent (review clauses against playbooks, suggest language) | Trivial |
| P4‑FUT‑4 | Investigate autonomous treasury management (AI sweeps funds, optimises interest, hedges currency) | Trivial |
| P4‑FUT‑5 | Evaluate embedded financing (early payment discounts, supply‑chain financing within AP) | Trivial |
| P4‑FUT‑6 | Research voice‑activated finance and scheduling (“Pay Acme Corp invoice #4521 tomorrow”) | Trivial |
| P4‑FUT‑7 | Research predictive lead generation (AI identifies net‑new prospects from web signals) | Trivial |
| P4‑FUT‑8 | Evaluate autonomous SDR agent (AI conducts initial outreach, qualifies, hands off to human) | Trivial |
| P4‑FUT‑9 | Research federated identity across UBOS instances for enterprise multi‑org scenarios | Trivial |
| P4‑FUT‑10 | Investigate UBOS marketplace (third‑party app integrations installable per org) | Trivial |
| P4‑FUT‑11 | Research MCP compatibility – expose document storage via Model Context Protocol for external AI agents | Spike only, `/docs/research/mcp‑integration.md` | None | Trivial |
| P4‑ESG‑1 | Carbon reporting spike – evaluate integration of carbon‑accounting APIs | Spike, `/docs/research/esg‑reporting.md` | None | Trivial |
| P4‑ENGAGE‑1 | Add engagement‑level structure to Projects schema (client → engagement → project hierarchy) | `/packages/db/src/schema/engagements.ts` (if needed) | P1‑PROJ‑SCHEMA‑1 | Small |

---

## Dependency Ordering (Phase 4)

1. **P4‑AI‑ADV‑1** (memory) can start alongside domain AI tasks that need it.
2. **CRM AI** heavily depends on **P4‑CRM‑AI‑1** (deal scoring) which is foundational.
3. **Document AI** builds on embeddings from **P3‑AI‑EMBED**; PII detection and redaction are independent.
4. **Finance AI** agents depend on existing Finance routers and automation engine; cash‑flow forecast depends on deal scoring.
5. **Scheduling AI** builds on **P3‑SCHED**; lead routing requires CRM AI.
6. **Project AI** depends on existing project routers and AI context builder.
7. **HR** can be built independently once schema is ready.
8. **Enterprise platform** tasks extend Phase 3 admin features.
9. **Integrations** (Xero, BI) require stable public APIs and billing.
10. **P4‑FUT‑11, P4‑ESG‑1, P4‑ENGAGE‑1** (research spikes and schema extensions, can run independently)
11. **Futures** have no dependencies.

---

Phase 4 completes the UBOS platform: an AI‑native, enterprise‑grade business operating system spanning CRM, Projects, Documents, Finance, Assets, Portal, Scheduling, and HR—all with deep intelligence, robust compliance, and a rich integration ecosystem. The platform is now fully shippable as a market‑leading unified SaaS.