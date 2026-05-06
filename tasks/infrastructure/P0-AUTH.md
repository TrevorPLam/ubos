# tasks/infrastructure/P0-AUTH.md – Authentication & Multi‑Tenant Pipeline

This file covers Better Auth engine hardening, Cloudflare‑specific fixes, session strategy evaluation, password hashing benchmarking, MFA (TOTP), enterprise SSO configuration, email verification, password reset, account deletion, password policies, and session security extensions. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

### [ ] P0-AUTH-1: Audit and harden Better Auth engine

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** `packages/auth/src/index.ts` already initializes a Better Auth instance with the Drizzle adapter, organization plugin, TanStack Start cookies integration, and conditional enablement based on `DATABASE_URL`. The engine is operational but has not been audited against Better Auth v1.6.0 best practices. The `BETTER_AUTH_SECRET` may be using the development insecure fallback. Rate limiting defaults may not be sufficient for production. Cookie configuration may not be hardened for the Cloudflare reverse‑proxy environment.
**Size:** Medium

**Description:**
Audit and harden the Better Auth engine configuration in `packages/auth/src/index.ts` against v1.6.0 best practices and Cloudflare Workers requirements. Specifically:

1. **Version pin**: Pin `better-auth` to `^1.6.0` in `packages/auth/package.json` (latest stable as of 2026‑05‑06).
2. **Secret validation**: Ensure `BETTER_AUTH_SECRET` is validated at startup — reject the development insecure fallback in production (`process.env.NODE_ENV === 'production'`).
3. **Rate limiting**: Configure `rateLimit` with `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]` so that rate limiting correctly identifies client IPs behind Cloudflare. Enable `storage: "database"` (or `"secondary-storage"`) for serverless compatibility.
4. **Session configuration**: Set `session.expiresIn` to 7 days (604800 seconds), `session.updateAge` to 1 hour (3600 seconds). Enable `cookieCache` with the compact strategy for latency reduction.
5. **Cookie hardening**: Ensure `SameSite: "Lax"` (minimum; `Strict` may break OAuth redirects), `Secure: true` in production, `HttpOnly: true`. Verify the `__Secure-` cookie prefix works correctly behind Cloudflare — v1.5.0‑beta.12 fixed a leading‑semicolon cookie construction bug.
6. **Email verification**: Enable `emailAndPassword.requireEmailVerification: true` for production deployments.
7. **Password config**: Set `emailAndPassword.minPasswordLength: 12` (exceeding the 8‑character default for stronger security).
8. **Database joins optimization**: Enable `experimental.joins: true` for 2‑3× latency improvement on auth endpoints (stable enough in v1.6.0, enabled by default in next release).

**Research Findings (2026‑05‑06):**
- Better Auth v1.6.0 is latest stable (2026‑04‑06). Non‑blocking scrypt, OpenTelemetry, HaveIBeenPwned improvements.
- Rate limiting silently breaks behind Cloudflare without `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]`.
- `experimental.joins: true` improves 50+ endpoints by 2‑3× and will be default in next release.
- Cookie cache compact strategy: Base64+HMAC, minimal overhead.

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-4` (auth tables validated)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-5` (security headers configured)

**Blocks:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-3` (client auth wrapper)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-5` (session security)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-CF-1` (Cloudflare‑specific fixes)

**Related Files:**
- `packages/auth/src/index.ts`
- `packages/auth/package.json`
- `apps/web/src/server/api.ts` (where auth handler is mounted)

**Definition of Done**
- [ ] `better-auth` pinned to `^1.6.0` in `packages/auth/package.json`
- [ ] `BETTER_AUTH_SECRET` validated — throws in production if using insecure fallback
- [ ] Rate limiting configured with `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]` and `storage: "database"`
- [ ] Session configured: `expiresIn: 604800` (7d), `updateAge: 3600` (1h)
- [ ] Cookie cache enabled with compact strategy (`cookieCache: { enabled: true, strategy: "compact" }`)
- [ ] Cookie options: `sameSite: "lax"` (OAuth‑safe), `secure: process.env.NODE_ENV === 'production'`
- [ ] Email verification required in production: `requireEmailVerification: true`
- [ ] Password minimum length set to 12
- [ ] Experimental joins enabled: `experimental: { joins: true }`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Upgrading to v1.7.0‑beta (deferred until stable release)
- OAuth provider setup (P1‑AUTH‑1, P1‑AUTH‑2)
- Password hashing algorithm change (P0‑AUTH‑PERF‑1)

**Rules to Follow**
- Never use the development insecure secret in any deployed environment.
- `SameSite: "Strict"` breaks OAuth redirect flows — use `"Lax"`.
- All secrets must come from environment variables, never hard‑coded.

**Verification**
```bash
# Verify secret validation works
BETTER_AUTH_SECRET="" NODE_ENV=production pnpm dev
# Expected: Error thrown

# Verify rate limiting configured
grep "ipAddressHeaders" packages/auth/src/index.ts
grep "CF-Connecting-IP" packages/auth/src/index.ts

# Verify session configuration
grep "expiresIn" packages/auth/src/index.ts

# Verify cookie cache strategy
grep "cookieCache" packages/auth/src/index.ts

# Sign-in flow still works
# Manual: sign up, sign in, verify session persists
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can sign up, verify my email, and sign in with a session that persists for 7 days.

---

#### Subtasks

- [ ] P0-AUTH-1.0.25 (AGENT): Read current `packages/auth/src/index.ts`, `packages/auth/package.json`, and `apps/web/src/server/api.ts` to understand existing Better Auth configuration.
  **Verification:** Current configuration documented in task notes.

- [ ] P0-AUTH-1.0.5 (AGENT): Research Better Auth v1.6.0 configuration options, rate limiting best practices for Cloudflare, and cookie cache strategies.
  **Verification:** Research documented in task's Research Findings above.

- [ ] P0-AUTH-1.1 (AGENT): Pin `better-auth` to `^1.6.0` in `packages/auth/package.json` and run `pnpm install`.
  **File(s):** `packages/auth/package.json`
  **Verification:** `pnpm ls better-auth` shows 1.6.x.

- [ ] P0-AUTH-1.2 (AGENT): Add `BETTER_AUTH_SECRET` validation — throw in production if the dev insecure fallback is detected.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** App throws on startup with insecure secret in production mode.

- [ ] P0-AUTH-1.3 (AGENT): Configure rate limiting with `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]` and database storage.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Rate limiting functional; verified via `wrangler tail`.

- [ ] P0-AUTH-1.4 (AGENT): Set session expiration (7d), update age (1h), enable cookie cache (compact strategy).
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Session cookie has correct maxAge; cookie cache visible in DevTools.

- [ ] P0-AUTH-1.5 (AGENT): Enable email verification requirement, set min password length to 12.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Sign‑up sends verification email; passwords < 12 chars rejected.

- [ ] P0-AUTH-1.6 (AGENT): Enable `experimental.joins: true`.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Auth endpoints functional; no errors in logs.

- [ ] P0-AUTH-1.7 (HUMAN): Test full auth flow (sign‑up → verify email → sign‑in → session persistence). Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-CF-1: Apply Cloudflare‑specific Better Auth fixes

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The Better Auth instance runs on Cloudflare Workers via TanStack Start but two critical Cloudflare‑specific issues are not addressed: (1) the Worker can hang indefinitely on `getSession` calls due to missing `AbortSignal.timeout`, and (2) rate limiting silently does nothing because Better Auth's default `x-forwarded-for` header check does not find the real client IP behind Cloudflare (which uses `CF-Connecting-IP`). Additionally, brute‑force protection on sign‑in is effectively disabled without proper IP extraction.
**Size:** Small

**Description:**
Apply three Cloudflare‑specific fixes to the Better Auth integration:

**(a) `AbortSignal.timeout(5000)` on `getSession`**: Wrap the `getSession` call (or configure the auth handler) to abort with a 5‑second timeout. This prevents Worker CPU timeout hangs that occur when the database connection is slow or unresponsive. The timeout should be added in the server‑side auth handler (in `apps/web/src/server/api.ts` or dedicated middleware).

**(b) `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]`**: Configure Better Auth's `rateLimit` option to read the real client IP from Cloudflare's `CF-Connecting-IP` header instead of the default `x-forwarded-for`. This is already covered in P0‑AUTH‑1 but is explicitly verified here.

**(c) Verify rate limiting active**: After both fixes, run `wrangler tail` in production‑like mode and verify that rate limiting events are being logged (and brute‑force protection is functional). Test by sending rapid sign‑in requests — should receive `429 Too Many Requests` after exceeding the threshold (3 req/10s for `/sign-in/email`).

**Research Findings (2026‑05‑06):**
- The hanging Worker issue is documented in KB‑005 of the community knowledge base
- Without `CF-Connecting-IP`, Better Auth logs "No IP address found for rate limiting" and silently skips all per‑endpoint rate limits including brute‑force protection
- The `CF-Connecting-IP` header is only present on traffic passing through Cloudflare's edge; internal health checks will not have it

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`

**Blocks:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-EVAL-1` (session strategy evaluation — needs stable auth first)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-5` (session security extensions)

**Related Files:**
- `apps/web/src/server/api.ts` (auth handler — add timeout)
- `packages/auth/src/index.ts` (verify `ipAddressHeaders` config)
- `apps/web/src/server/trpc/middleware/brute-force.ts` (reference for additional brute‑force layer)

**Definition of Done**
- [ ] `AbortSignal.timeout(5000)` applied to `getSession` call path (in auth handler or middleware)
- [ ] `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]` confirmed in rate limit config (via P0‑AUTH‑1)
- [ ] `wrangler tail` shows rate limiting events firing (no "No IP address found" warnings)
- [ ] Rapid sign‑in attempts (4+ in 10 seconds) receive `429 Too Many Requests`
- [ ] No Worker CPU timeout errors in logs over a 24‑hour period
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Custom brute‑force middleware (P0‑AUTH‑5‑EXT)
- DDoS protection at Cloudflare level (configured separately)

**Rules to Follow**
- `AbortSignal.timeout` must be applied to the fetch handler, not inside Better Auth (which doesn't expose the signal).
- The timeout should be configurable via environment variable (`AUTH_SESSION_TIMEOUT_MS`).
- Rate limit verification should be done in a staging environment, not production.

**Verification**
```bash
# Verify timeout configuration
grep "AbortSignal.timeout" apps/web/src/server/api.ts

# Verify ipAddressHeaders
grep "ipAddressHeaders" packages/auth/src/index.ts

# Test rate limiting (staging)
for i in 1 2 3 4; do
  curl -X POST https://staging.ubos.app/api/auth/sign-in/email \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nHTTP %{http_code}\n"
done
# Expected: 4th request returns 429

# Check wrangler tail for rate limit events
wrangler tail | grep "rate"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security administrator, I want sign‑in endpoints protected by rate limiting so that brute‑force attacks are automatically throttled.

---

#### Subtasks

- [ ] P0-AUTH-CF-1.0.25 (AGENT): Read current auth handler in `apps/web/src/server/api.ts` and understand where `getSession` is called.
  **Verification:** Current request handling flow documented.

- [ ] P0-AUTH-CF-1.0.5 (AGENT): Research the hanging Worker issue (KB‑005) and the `CF-Connecting-IP` configuration pattern.
  **Verification:** Research documented in task's Research Findings above.

- [ ] P0-AUTH-CF-1.1 (AGENT): Add `AbortSignal.timeout(5000)` to the auth handler or a wrapping middleware. Make timeout configurable via `AUTH_SESSION_TIMEOUT_MS`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Timeout functional; Worker does not hang when DB is slow.

- [ ] P0-AUTH-CF-1.2 (AGENT): Confirm `ipAddress.ipAddressHeaders: ["CF-Connecting-IP"]` is in the rate limit config (from P0‑AUTH‑1).
  **File(s):** `packages/auth/src/index.ts` (verify)
  **Verification:** Configuration present.

- [ ] P0-AUTH-CF-1.3 (AGENT): Test rate limiting in staging: send rapid sign‑in requests, verify 429 response and `wrangler tail` events.
  **Verification:** Rate limiting active and logging.

- [ ] P0-AUTH-CF-1.4 (HUMAN): Monitor Worker logs for 24 hours; confirm no CPU timeout errors or "No IP address found" warnings. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-EVAL-1: Evaluate Better Auth stateless sessions for Workers performance AND evaluate `better-auth-cloudflare` package

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** UBOS uses database‑backed sessions (the default). Better Auth v1.4+ supports stateless sessions without any database, storing session data in signed/encrypted cookies. Additionally, the community package `better-auth-cloudflare` v0.3.0 provides Cloudflare‑native integrations (D1, Hyperdrive, KV, R2, IP detection, geolocation). Neither option has been evaluated for UBOS's specific architecture (Neon Postgres + Drizzle on Cloudflare Workers via TanStack Start).
**Size:** Small

**Description:**
Evaluate two session architecture decisions and document findings in an ADR (`docs/adr/021‑session‑strategy.md`):

**Decision 1 — Stateless vs Database‑backed sessions:**
- Stateless: No database queries for session validation (faster cold starts, no DB dependency for auth). Session data lives in the cookie (signed/encrypted). Trade‑off: cannot revoke individual sessions server‑side without a blocklist; cookie size increases; all session data must fit in cookie limits (~4KB).
- Database‑backed: Sessions stored in PostgreSQL (current approach). With cookie cache enabled (P0‑AUTH‑1), most session reads avoid DB queries. Trade‑off: cold starts require DB query; session revocation is instant.
- **Performance impact on Workers**: Stateless eliminates one round‑trip to Neon (~100ms on cold start). With warm cookie cache, database‑backed also avoids the round‑trip. The difference is primarily at the 99th percentile on cold starts.

**Decision 2 — `better-auth-cloudflare` adoption:**
- Provides: D1, Hyperdrive, KV, R2 support, IP detection, geolocation. For UBOS (Neon Postgres, not D1), the IP detection feature is already handled by manual `CF-Connecting-IP` config. R2 file storage is already managed by our own storage layer (P0‑STORAGE).
- **Recommendation**: Do not adopt `better-auth-cloudflare`. UBOS's architecture (Neon + Drizzle + custom R2 layer) duplicates most of what it provides. The IP detection is trivially configured manually. Adding it would introduce an unnecessary dependency.

**Research Findings (2026‑05‑06):**
- Stateless sessions: no database queries for session validation; session stored in signed cookie
- Cookie cache strategies: compact (default), JWT, JWE. Compact uses Base64+HMAC for integrity
- `better-auth-cloudflare` v0.3.0: primarily designed for D1 + KV setups

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-CF-1` (Cloudflare fixes applied)

**Blocks:** [N/A]

**Related Files:**
- `docs/adr/021‑session‑strategy.md` (new)

**Definition of Done**
- [ ] ADR `docs/adr/021‑session‑strategy.md` created covering both decisions
- [ ] Decision 1 analysis: stateless vs database‑backed trade‑offs, performance estimates, revocation capability, cookie size limits
- [ ] Decision 2 analysis: `better-auth-cloudflare` feature overlap with UBOS's existing stack
- [ ] Clear recommendation with rationale for each decision
- [ ] Trigger criteria for re‑evaluation documented (e.g., "when growing to 100K+ users" or "when D1 becomes primary DB")
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Implementing stateless sessions (deferred based on ADR decision)
- Benchmarking (can be done as follow‑up if stateless is recommended)

**Rules to Follow**
- ADR must consider UBOS's specific architecture: Neon Postgres (not D1), Cloudflare Workers, Drizzle ORM.
- Decision must account for the existing cookie cache optimization (already reduces DB queries).

**Verification**
```bash
ls docs/adr/021-session-strategy.md
# Manual: review ADR for completeness and clear recommendation
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (architecture evaluation)

---

#### Subtasks

- [ ] P0-AUTH-EVAL-1.0.25 (AGENT): Read Better Auth stateless session documentation, cookie cache strategies, and `better-auth-cloudflare` README.
  **Verification:** Features and trade‑offs documented.

- [ ] P0-AUTH-EVAL-1.0.5 (AGENT): Research community experiences with stateless sessions on Workers and `better-auth-cloudflare` adoption.
  **Verification:** Research documented.

- [ ] P0-AUTH-EVAL-1.1 (AGENT): Write ADR `docs/adr/021‑session‑strategy.md` with both decision analyses.
  **File(s):** `docs/adr/021‑session‑strategy.md`
  **Verification:** ADR covers all required topics.

- [ ] P0-AUTH-EVAL-1.2 (HUMAN): Review ADR and approve session strategy recommendation. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-PERF-1: Benchmark password hashing on Workers (Argon2id vs scrypt)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Better Auth v1.6.0 uses non‑blocking `node:crypto.scrypt` (available via `nodejs_compat` on Workers). Argon2id is the OWASP‑recommended algorithm but is 2‑10× slower in pure JavaScript on Workers. The community has developed a pattern using a separate hasher Worker + Service Bindings to run Argon2id in Rust/WASM without blocking the main auth Worker. UBOS has not benchmarked either approach.
**Size:** Small

**Description:**
Benchmark both password hashing approaches on Cloudflare Workers and document the decision in `docs/adr/021‑session‑strategy.md` (extend the existing ADR with a password hashing section):

**Approach A — scrypt (default, v1.6.0+)**: Uses `node:crypto.scrypt` (non‑blocking). Available via `nodejs_compat` flag in Workers. CPU time per hash: estimated 50‑200ms on Workers Paid plan. Simpler setup — no additional Worker needed.

**Approach B — Argon2id via Service Binding**: Dedicated hasher Worker using Rust/WASM kernel, called via Service Binding RPC (`hashPassword()` / `verifyPassword()`). Better security (OWASP recommended) but requires a second Worker, adds operational complexity, and increases cold‑start latency.

**Benchmark method**: Write a small benchmark script that hashes 100 passwords with each approach (or the chosen default), measuring P50/P95/P99 latency. Run on Workers Paid plan (30s CPU limit). Record results in the ADR.

**Decision**: If scrypt's P95 latency on Workers is under 500ms and the `nodejs_compat` polyfill is stable, recommend staying with scrypt for Phase 0. If Argon2id is required for compliance (e.g., FedRAMP, certain enterprise contracts), document the Service Binding pattern as the upgrade path.

**Research Findings (2026‑05‑06):**
- v1.6.0: non‑blocking scrypt via `node:crypto.scrypt`
- Argon2id on Workers: 2‑10× slower than native code unless using WASM
- Community template: separate private hasher Worker via Service Bindings with Rust/WASM kernel
- Free plan CPU limits may be insufficient for Argon2id defaults; Paid plan recommended

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-CF-1` (nodejs_compat flag confirmed)

**Blocks:** [N/A]

**Related Files:**
- `docs/adr/021‑session‑strategy.md` (extend with hashing section)
- `packages/auth/src/index.ts` (reference for hash configuration)

**Definition of Done**
- [ ] Benchmark script runs 100 password hashes with scrypt on Workers, records P50/P95/P99
- [ ] Benchmark results documented in ADR
- [ ] Decision documented: stay with scrypt or plan Argon2id migration
- [ ] If scrypt chosen: document `nodejs_compat` requirement and upgrade trigger criteria for Argon2id
- [ ] If Argon2id chosen: document Service Binding pattern and implementation plan
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Implementing Service Binding hasher Worker (deferred based on decision)
- Gradual password re‑hashing migration (deferred based on decision)

**Rules to Follow**
- Benchmark must run on Workers Paid plan (not Free — CPU limits differ significantly).
- Record both warm and cold‑start latencies.
- Document the `nodejs_compat` flag requirement clearly.

**Verification**
```bash
# Manual: run benchmark on staging Worker
# Check ADR for benchmark results
grep -A 10 "scrypt" docs/adr/021-session-strategy.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (performance benchmarking)

---

#### Subtasks

- [ ] P0-AUTH-PERF-1.0.25 (AGENT): Research scrypt vs Argon2id performance on Cloudflare Workers; read the community hasher Worker template.
  **Verification:** Research documented.

- [ ] P0-AUTH-PERF-1.0.5 (AGENT): Create a benchmark script that tests scrypt hashing on the staging Worker.
  **Verification:** Benchmark script executes and records latencies.

- [ ] P0-AUTH-PERF-1.1 (AGENT): Run benchmark and record P50/P95/P99 results in the ADR.
  **File(s):** `docs/adr/021‑session‑strategy.md` (extend)
  **Verification:** Results documented with date and Worker plan.

- [ ] P0-AUTH-PERF-1.2 (AGENT): Write hashing strategy decision with scoping recommendation and upgrade triggers.
  **File(s):** `docs/adr/021‑session‑strategy.md` (extend)
  **Verification:** Decision clearly stated with rationale.

- [ ] P0-AUTH-PERF-1.3 (HUMAN): Review benchmark results and approve hashing strategy. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-3: Extend client auth wrapper with missing hooks

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** `apps/web/src/lib/auth/client.ts` creates a Better Auth client with the organization plugin and dynamic `baseURL` detection. It exports `authClient` for use throughout the frontend. `apps/web/src/lib/auth/session.functions.ts` provides a server‑side `getAuthState` function. However, the client may be missing: (1) organization switching hook with automatic tenant ID persistence, (2) token refresh handling, (3) typed session state accessor with `useSession` from `better-auth/react`, and (4) a unified `AuthProvider` component wrapping the React tree with session context.
**Size:** Medium

**Description:**
Extend the client‑side auth wrapper to provide:

1. **Organization switching hook** (`useOrganization`): Calls `authClient.organization.setActive({ organizationId })`, updates `localStorage.setItem('x-tenant-id', organizationId)`, and triggers `router.invalidate()` to re‑run route auth guards. The existing CRM module already injects `x-tenant-id` into tRPC headers — this hook ensures that switching organizations updates the stored tenant ID.

2. **Token refresh**: Better Auth client automatically refreshes sessions. Verify this works in the TanStack Start SSR context. If not, add a wrapper that calls `authClient.getSession()` on `401` responses.

3. **`useSession` hook**: Better Auth v1.6+ provides `useSession` from `better-auth/react` for reactive session access. Integrate this into the root route and expose it via a custom `useUBOSSession` hook that adds organization context.

4. **`AuthProvider` component**: Create `apps/web/src/components/auth/AuthProvider.tsx` that wraps children with the Better Auth session provider, organization context, and tenant ID sync. This should be used in `__root.tsx` instead of the manual session logic.

**Research Findings (2026‑05‑06):**
- Better Auth React integration: `import { useSession } from "better-auth/react"` provides reactive session state.
- Organization plugin client: `authClient.organization.setActive({ organizationId })` switches active org. The session's `activeOrganizationId` is automatically updated by the server.
- `router.invalidate()` forces TanStack Router to re‑run `beforeLoad` guards on organization change.

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-6` (root route layout)

**Blocks:**
- `tasks/infrastructure/P1-ONBOARD.md → P1-ONBOARD-1` (organization creation wizard needs org switching)

**Related Files:**
- `apps/web/src/lib/auth/client.ts`
- `apps/web/src/lib/auth/session.functions.ts`
- `apps/web/src/components/auth/AuthProvider.tsx` (new)
- `apps/web/src/routes/__root.tsx` (integrate AuthProvider)

**Definition of Done**
- [ ] `useOrganization` hook created: exposes `activeOrganization`, `organizations`, `switchOrganization(orgId)`, `isLoading`
- [ ] Organization switch updates `localStorage.setItem('x-tenant-id', orgId)` synchronously
- [ ] Organization switch calls `router.invalidate()` to re‑run route guards
- [ ] `useUBOSSession` hook created: wraps `useSession` from Better Auth with typed UBOS session context
- [ ] `AuthProvider` component created: wraps children with session and organization providers
- [ ] `AuthProvider` integrated into `__root.tsx` (replaces manual session logic where applicable)
- [ ] Token refresh verified: session persists correctly across page reloads in SSR context
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- UI for organization switcher (already exists in Header.tsx; integration only)
- Organization creation (P1‑ONBOARD‑1)
- Multi‑org invitation acceptance (P1‑ONBOARD‑3)

**Rules to Follow**
- Never store sensitive session data in `localStorage` — only the tenant ID.
- The `AuthProvider` must not break the existing auth guard logic in `__root.tsx`.
- All hooks must handle loading, error, and empty states.

**Verification**
```bash
# Test organization switching
# 1. Sign in → verify tenant ID in localStorage
# 2. Switch organization → verify tenant ID updated
# 3. Navigate to CRM → verify leads filtered by new organization
# 4. Reload page → verify organization persists

# Test session reactivity
# In browser console, check useSession is reactive
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user belonging to multiple organizations, I can switch between them and see the correct data for each.

---

#### Subtasks

- [ ] P0-AUTH-3.0.25 (AGENT): Read current `auth/client.ts`, `session.functions.ts`, and `__root.tsx` to understand existing auth integration.
  **Verification:** Current auth client usage documented.

- [ ] P0-AUTH-3.0.5 (AGENT): Research Better Auth React hooks (`useSession`, `useOrganization`), client organization plugin API, and TanStack Router invalidation patterns.
  **Verification:** Research documented.

- [ ] P0-AUTH-3.1 (AGENT): Create `useOrganization` hook with `switchOrganization`, `activeOrganization`, and tenant ID sync.
  **File(s):** `apps/web/src/lib/auth/client.ts` (extend)
  **Verification:** Hook functional; organization switch updates localStorage and invalidates router.

- [ ] P0-AUTH-3.2 (AGENT): Create `useUBOSSession` hook wrapping Better Auth's `useSession` with typed context.
  **File(s):** `apps/web/src/lib/auth/client.ts` (extend)
  **Verification:** Hook returns typed session object.

- [ ] P0-AUTH-3.3 (AGENT): Create `AuthProvider` component integrating session and organization providers.
  **File(s):** `apps/web/src/components/auth/AuthProvider.tsx` (new)
  **Verification:** Component renders children with session context.

- [ ] P0-AUTH-3.4 (AGENT): Integrate `AuthProvider` into `__root.tsx`, replacing manual session logic where safe.
  **File(s):** `apps/web/src/routes/__root.tsx`
  **Verification:** Auth guards still function; session available throughout app.

- [ ] P0-AUTH-3.5 (HUMAN): Test organization switching, session persistence, and token refresh. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-5: Strengthen session security (timeout tiers, refresh token rotation, brute‑force protection)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** Better Auth's session defaults (7‑day expiry, 1‑hour update window) are configured in P0‑AUTH‑1. However, there is no differentiated session timeout for admin vs regular users, no explicit refresh token rotation policy, and no additional brute‑force protection beyond Better Auth's built‑in rate limiting. The existing `apps/web/src/server/trpc/middleware/brute-force.ts` is referenced in TASKS.md but may not yet exist.
**Size:** Medium

**Description:**
Implement session security hardening in three areas:

**1. Session timeout tiers**: Configure Better Auth to use shorter session lifetimes for admin‑level operations. While Better Auth does not natively support per‑role session expiry, implement this at the middleware level: create an admin‑session check in `apps/web/src/server/trpc/middleware/admin-session.ts` that requires the session to be "fresh" (within `freshAge`, default 1 day) for admin mutations. Regular users retain the 7‑day session expiry.

**2. Refresh token rotation**: Verify that Better Auth's session refresh mechanism (automatic on every request after `updateAge` is reached) provides implicit token rotation. Document the rotation behavior. If explicit refresh token rotation is needed (e.g., for mobile clients), note that Better Auth's session tokens serve as both access and refresh tokens in its cookie‑based model.

**3. Brute‑force detection middleware**: Create (or extend) `apps/web/src/server/trpc/middleware/brute-force.ts` to add account‑level lockout: after 10 failed sign‑in attempts from the same IP within 15 minutes, lock the account for 15 minutes. This complements Better Auth's IP‑based rate limiting (3 req/10s per endpoint) with account‑level protection. Store attempt counts in the database (PostgreSQL) rather than in‑memory for serverless compatibility. On successful sign‑in, reset the attempt counter.

**Research Findings (2026‑05‑06):**
- Better Auth rate limiting protects endpoints globally (100 req/60s) and per‑endpoint (/sign‑in/email: 3 req/10s). This is IP‑based, not account‑based.
- Account‑level brute‑force protection requires custom middleware — Better Auth does not provide it out‑of‑the‑box
- Session `freshAge` is calculated from `createdAt` since v1.6.0
- Freshness check can be used to require recent authentication for sensitive operations.

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-CF-1` (rate limiting verified)

**Blocks:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-5-EXT` (extended security features)

**Related Files:**
- `packages/auth/src/index.ts` (session config reference)
- `apps/web/src/server/trpc/middleware/brute-force.ts` (new or extend)
- `apps/web/src/server/trpc/middleware/admin-session.ts` (new)
- `packages/db/src/schema/auth.ts` (reference for brute‑force table if needed)

**Definition of Done**
- [ ] `admin-session.ts` middleware created: checks `session.createdAt` within `freshAge` for admin‑tagged procedures
- [ ] `brute-force.ts` middleware created: tracks failed sign‑in attempts per (IP + email), locks after 10 failures in 15 minutes
- [ ] Brute‑force state stored in database (PostgreSQL), not in‑memory
- [ ] Successful sign‑in resets the attempt counter
- [ ] Session rotation behavior documented in code comments
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- IP allowlist enforcement (P2‑SEC‑3‑2)
- MFA step‑up for privileged operations (P2‑SEC‑1‑1)
- Full account lockout notification emails (deferred to notification system)

**Rules to Follow**
- Brute‑force state must persist across Worker invocations — do not use in‑memory storage.
- Never expose whether an account is locked in the API response (information leak).
- Lockout should be on the (IP + email) tuple, not just IP or just email, to prevent both targeted and collateral denial‑of‑service.

**Verification**
```bash
# Test brute-force lockout (staging)
for i in $(seq 1 11); do
  curl -X POST .../sign-in/email \
    -d '{"email":"locked@test.com","password":"wrong"}' \
    -w "Attempt $i: %{http_code}\n"
done
# Expected: attempts 1-10 return 401, attempt 11 returns 429 or 423

# Test admin session freshness
# 1. Sign in as admin
# 2. Attempt admin mutation > 1 day after session creation
# 3. Expected: rejected with "session not fresh" error

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security administrator, I want accounts to be automatically locked after repeated failed sign‑in attempts so that brute‑force attacks are ineffective.

---

#### Subtasks

- [ ] P0-AUTH-5.0.25 (AGENT): Read Better Auth session management docs, rate limiting architecture, and community brute‑force patterns.
  **Verification:** Current capabilities and gaps documented.

- [ ] P0-AUTH-5.0.5 (AGENT): Research account‑level brute‑force protection patterns for serverless environments.
  **Verification:** Research documented.

- [ ] P0-AUTH-5.1 (AGENT): Create `admin-session.ts` middleware that enforces session freshness for admin procedures.
  **File(s):** `apps/web/src/server/trpc/middleware/admin-session.ts` (new)
  **Verification:** Middleware rejects stale admin sessions.

- [ ] P0-AUTH-5.2 (AGENT): Create `brute-force.ts` middleware with database‑backed attempt tracking, IP+email lockout after 10 failures in 15 minutes.
  **File(s):** `apps/web/src/server/trpc/middleware/brute-force.ts` (new or extend)
  **Verification:** Middleware locks account after 10 failed attempts.

- [ ] P0-AUTH-5.3 (AGENT): Document session rotation behavior in `packages/auth/src/index.ts` comments.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Comments document the rotation mechanism.

- [ ] P0-AUTH-5.4 (HUMAN): Test brute‑force lockout and admin session freshness. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-5-EXT: Extend session security — invalidate all sessions on password change; extend brute‑force detection

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Better Auth's built‑in `changePassword` endpoint has a `revokeOtherSessions` option but it may not be configured or enforced. The brute‑force middleware from P0‑AUTH‑5 covers IP+email lockout but may not cover additional attack vectors (e.g., distributed attacks across many IPs targeting a single account).
**Size:** Small

**Description:**
Extend the session security enhancements from P0‑AUTH‑5:

1. **Invalidate all sessions on password change**: Configure Better Auth's `changePassword` to always set `revokeOtherSessions: true`. Add a server‑side hook (`onPasswordChanged`) that calls `auth.api.revokeUserSessions(userId)` to ensure all sessions except the current one are invalidated. This prevents session hijackers from maintaining access after a password change.

2. **Extend brute‑force detection**: Add global account‑level lockout (across all IPs) if an account receives failed attempts from many different IPs within a short window. This defends against distributed brute‑force attacks. Track: `(email, total_failures, window_start)`. If total failures exceed 30 in 15 minutes (regardless of IP), lock the account. This is a secondary layer on top of the IP+email lockout from P0‑AUTH‑5.

**Research Findings (2026‑05‑06):**
- Better Auth `changePassword` endpoint accepts `revokeOtherSessions: boolean`
- `auth.api.revokeUserSessions(userId)` revokes all sessions for a user
- Distributed brute‑force: attackers use botnets to distribute attempts across many IPs, bypassing per‑IP rate limits

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-5`

**Blocks:** [N/A]

**Related Files:**
- `packages/auth/src/index.ts` (hooks configuration)
- `apps/web/src/server/trpc/middleware/brute-force.ts` (extend)

**Definition of Done**
- [ ] Password change always revokes other sessions (`revokeOtherSessions: true` enforced)
- [ ] `onPasswordChanged` hook calls `auth.api.revokeUserSessions`
- [ ] Brute‑force middleware extended with global account‑level lockout (30 failures/15 min across all IPs)
- [ ] Global lockout is independent of IP‑based lockout (both must be cleared on successful sign‑in)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Notification emails on account lockout (deferred to notification system)
- Admin manual unlock (P3‑PLAT‑1)

**Rules to Follow**
- Session revocation must happen after password change, never before (to not lock out the changing user).
- Global lockout threshold should be higher than IP‑based to avoid false positives from legitimate multi‑device usage.

**Verification**
```bash
# Test session revocation on password change
# 1. Sign in from 2 devices
# 2. Change password on device 1
# 3. Refresh device 2 → session invalidated, redirected to sign‑in

# Test global lockout (staging)
# Simulate 30 failed attempts from different IPs
# Verify account locked

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, when I change my password, I expect all my other devices to be signed out automatically.

---

#### Subtasks

- [ ] P0-AUTH-5-EXT.0.25 (AGENT): Read Better Auth `changePassword` API and session revocation docs.
  **Verification:** API understood.

- [ ] P0-AUTH-5-EXT.0.5 (AGENT): Research distributed brute‑force attack patterns and defense mechanisms.
  **Verification:** Research documented.

- [ ] P0-AUTH-5-EXT.1 (AGENT): Configure `changePassword` with forced `revokeOtherSessions: true` and add `onPasswordChanged` hook.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Password change invalidates other sessions.

- [ ] P0-AUTH-5-EXT.2 (AGENT): Extend brute‑force middleware with global account‑level lockout (30 failures/15 min across IPs).
  **File(s):** `apps/web/src/server/trpc/middleware/brute-force.ts`
  **Verification:** Distributed brute‑force attempts trigger global lockout.

- [ ] P0-AUTH-5-EXT.3 (HUMAN): Test session revocation and global lockout scenarios. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-6: Implement TOTP Multi‑Factor Authentication (MFA)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Better Auth's `twoFactor` plugin is not enabled in the UBOS auth configuration. The `twoFactor` table does not exist in the database schema. Users can only authenticate with email/password. There is no MFA enrollment UI or verification flow.
**Size:** Medium

**Description:**
Enable Better Auth's built‑in `twoFactor` plugin for TOTP‑based multi‑factor authentication. This involves:

**Server‑side**: Import and configure the `twoFactor` plugin in `packages/auth/src/index.ts`. Add `twoFactor` to the plugins array. Generate the required database table (run migration). Configure `issuer: "UBOS"` and `totpOptions: { period: 30, digits: 6 }`.

**Client‑side**: Add the `twoFactorClient()` plugin to the auth client in `apps/web/src/lib/auth/client.ts`.

**UI — Enrollment Flow**: Build `apps/web/src/routes/dashboard/settings/security/mfa.tsx` with: (1) "Enable MFA" button that calls `authClient.twoFactor.enable()`, (2) QR code display (using `react-qr-code`), (3) manual secret copy option, (4) backup codes display with download capability, (5) TOTP verification input to confirm enrollment.

**UI — Login Challenge**: After successful primary authentication (email/password), if the session has `twoFactorVerified: false`, redirect to a 2FA verification page. The verification page accepts TOTP code or backup code, with an optional "Trust this device" checkbox (30‑day bypass).

**UI — Settings Management**: Add "Disable MFA" and "Regenerate Backup Codes" options in the security settings page.

Install `react-qr-code` as a dependency (web only, conditional on 2FA being enabled).

**Research Findings (2026‑05‑06):**
- `twoFactor` plugin: TOTP generation/verification, backup codes, trust device (30‑day bypass), session‑level `twoFactorVerified` flag
- v1.7.0‑beta.0 breaking change: `enableTwoFactor` now accepts `method` ("otp" | "totp", default "totp"). Pin to v1.6.x API to avoid breaking change for now
- Client integration: `twoFactorClient()` with `onTwoFactorRedirect` callback
- QR code: `react-qr-code` is the community‑standard dependency

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-6` (root route for auth guards)

**Blocks:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-4` (MFA step‑up middleware)

**Related Files:**
- `packages/auth/src/index.ts` (add twoFactor plugin)
- `apps/web/src/lib/auth/client.ts` (add twoFactorClient)
- `apps/web/src/routes/dashboard/settings/security/mfa.tsx` (new)
- `apps/web/src/routes/signin.tsx` (add 2FA challenge redirect)
- `apps/web/src/components/auth/MFAVerification.tsx` (new — 2FA verification component)
- `apps/web/package.json` (add `react-qr-code` dep)

**Definition of Done**
- [ ] `twoFactor` plugin configured in `packages/auth/src/index.ts` with `issuer: "UBOS"`, `totpOptions: { period: 30, digits: 6 }`
- [ ] `twoFactor` database table created via migration
- [ ] `twoFactorClient()` added to auth client in `apps/web/src/lib/auth/client.ts`
- [ ] MFA enrollment page (`mfa.tsx`) built with: enable button, QR code display, secret copy, backup codes display/download, TOTP verification
- [ ] Login flow detects `twoFactorVerified: false` and redirects to verification page
- [ ] Verification page accepts TOTP code and backup codes, with "Trust this device" option
- [ ] Settings page includes disable MFA and regenerate backup codes options
- [ ] `react-qr-code` installed as dependency
- [ ] Full MFA flow tested: enable → verify during enrollment → sign out → sign in → verify TOTP → access app
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- OTP delivery via email/SMS (requires `otpOptions.sendOTP` callback — deferred)
- MFA enforcement at organization level (P2‑SEC‑1‑3)

**Rules to Follow**
- Backup codes must be displayed only once (at enrollment) and stored hashed.
- "Trust this device" sets a cookie with 30‑day expiry, implemented by Better Auth's `trustDevice` feature.
- TOTP secrets must never be exposed to the client after enrollment.

**Verification**
```bash
# Test MFA flow
# 1. Sign in → enable MFA in settings
# 2. Scan QR code with authenticator app
# 3. Verify TOTP code → backup codes displayed
# 4. Sign out
# 5. Sign in again → redirected to MFA verification
# 6. Enter TOTP code → redirected to dashboard
# 7. Test backup code fallback
# 8. Test "Trust this device" bypass

# Verify twoFactor tables exist
psql $DATABASE_URL -c "\dt *twoFactor*"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security‑conscious user, I want to enable two‑factor authentication so that my account is protected even if my password is compromised.

---

#### Subtasks

- [ ] P0-AUTH-6.0.25 (AGENT): Read Better Auth `twoFactor` plugin documentation and v1.6.x API.
  **Verification:** Plugin API and endpoints documented.

- [ ] P0-AUTH-6.0.5 (AGENT): Research community MFA UI patterns for Better Auth (QR code, backup codes, trust device).
  **Verification:** Research documented.

- [ ] P0-AUTH-6.1 (AGENT): Enable `twoFactor` plugin in Better Auth config, generate migration for `twoFactor` table.
  **File(s):** `packages/auth/src/index.ts`, migration files
  **Verification:** Plugin active; table exists in database.

- [ ] P0-AUTH-6.2 (AGENT): Add `twoFactorClient()` to auth client.
  **File(s):** `apps/web/src/lib/auth/client.ts`
  **Verification:** Client has `twoFactor` methods available.

- [ ] P0-AUTH-6.3 (AGENT): Build MFA enrollment page with QR code, secret, backup codes, and verification.
  **File(s):** `apps/web/src/routes/dashboard/settings/security/mfa.tsx` (new)
  **Verification:** Enrollment flow works end‑to‑end.

- [ ] P0-AUTH-6.4 (AGENT): Build MFA verification component and integrate into sign‑in flow with redirect.
  **File(s):** `apps/web/src/components/auth/MFAVerification.tsx` (new), `apps/web/src/routes/signin.tsx`
  **Verification:** Post‑login 2FA challenge works.

- [ ] P0-AUTH-6.5 (AGENT): Add disable MFA and regenerate backup codes to settings page.
  **File(s):** `apps/web/src/routes/dashboard/settings/security/mfa.tsx`
  **Verification:** Disable and regenerate work.

- [ ] P0-AUTH-6.6 (HUMAN): Test full MFA enrollment, verification, backup code, and trust device flows. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-7: Configure enterprise SSO plugin (SAML 2.0, OIDC) for future use

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟢 Low
**Current State:** The `@better-auth/sso` package is not installed or configured. Enterprise SSO (SAML/OIDC) is a Phase 2 feature (P2‑SEC‑1‑5, P4‑PLAT‑ENT‑5) but the plugin can be pre‑configured now to validate compatibility and document the integration pattern. No SSO UI exists.
**Size:** Small

**Description:**
Install `@better-auth/sso` and add it to the Better Auth plugins array in a **disabled‑by‑default** state (gated behind an `ENABLE_SSO` environment variable or feature flag). This validates that:

1. The package is compatible with UBOS's stack (TanStack Start, Cloudflare Workers, Drizzle adapter).
2. The required database schema can be generated.
3. Documentation can be written for future enablement.

Additionally, write an SSO setup guide at `docs/enterprise/sso-setup.md` covering: SAML 2.0 configuration (entity ID, ACS URL, certificate management), OIDC configuration (client ID, client secret, discovery URL), supported IdPs (Okta, Azure AD, Google Workspace), and step‑by‑step instructions for each.

**Research Findings (2026‑05‑06):**
- `@better-auth/sso` is a separate package: `pnpm add @better-auth/sso`
- Supports SAML 2.0 (via `samlify`) + OIDC (via `jose`)
- v1.7.0‑beta.0: hardened SAML validation — `allowIdpInitiated` defaults to `false`
- Domain‑based auto‑provisioning supported

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`

**Blocks:**
- `tasks/infrastructure/P2-SEC.md → P2-SEC-1-5` (enterprise SSO setup guide)
- `tasks/infrastructure/P4-PLAT-ENT.md → P4-PLAT-ENT-5` (SAML SSO configuration UI)

**Related Files:**
- `packages/auth/package.json` (add `@better-auth/sso`)
- `packages/auth/src/index.ts` (add SSO plugin, gated)
- `docs/enterprise/sso-setup.md` (new)

**Definition of Done**
- [ ] `@better-auth/sso` installed in `packages/auth/package.json`
- [ ] SSO plugin added to Better Auth config, gated behind `ENABLE_SSO` env var (disabled by default)
- [ ] SSO plugin does not break existing auth flows when disabled
- [ ] `docs/enterprise/sso-setup.md` written with SAML and OIDC setup instructions for major IdPs
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- SSO configuration UI (P4‑PLAT‑ENT‑5)
- Actual SSO provider registration and testing
- SCIM provisioning (P2‑SEC‑1‑4)

**Rules to Follow**
- The SSO plugin must not be active in development or staging environments.
- All SSO configuration must remain as environment variables, never hard‑coded.
- The setup guide must be written for an operator (someone setting up SSO for an enterprise customer), not a developer.

**Verification**
```bash
# Verify SSO package installed
pnpm ls @better-auth/sso

# Verify SSO plugin gated
grep "ENABLE_SSO" packages/auth/src/index.ts

# Verify auth still works with SSO disabled
# Manual: sign in, access CRM, etc.

ls docs/enterprise/sso-setup.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (pre‑configuration and documentation)

---

#### Subtasks

- [ ] P0-AUTH-7.0.25 (AGENT): Read `@better-auth/sso` documentation and understand SAML/OIDC configuration requirements.
  **Verification:** SSO plugin API documented.

- [ ] P0-AUTH-7.0.5 (AGENT): Research enterprise SSO best practices and major IdP configuration guides (Okta, Azure AD).
  **Verification:** Research documented.

- [ ] P0-AUTH-7.1 (AGENT): Install `@better-auth/sso` and add to plugins array, gated behind `ENABLE_SSO`.
  **File(s):** `packages/auth/package.json`, `packages/auth/src/index.ts`
  **Verification:** SSO plugin loads when `ENABLE_SSO=true`; auth works when disabled.

- [ ] P0-AUTH-7.2 (AGENT): Write `docs/enterprise/sso-setup.md` with SAML and OIDC setup guides.
  **File(s):** `docs/enterprise/sso-setup.md` (new)
  **Verification:** Document covers all required topics.

- [ ] P0-AUTH-7.3 (HUMAN): Review SSO integration pattern and setup guide. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-8: Build email verification flow

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Better Auth supports email verification via `requireEmailVerification: true` (configured in P0‑AUTH‑1) and a `sendVerificationEmail` callback. However, the callback is not implemented. When a user signs up, they should receive a verification email with a link. Without this, users cannot verify their email, and `requireEmailVerification` cannot be enforced. No verification page exists.
**Size:** Medium

**Description:**
Implement the email verification flow:

1. **Server‑side**: Implement `sendVerificationEmail` callback in the Better Auth config that enqueues a verification email via the email queue system (P0‑EMAIL‑0). The email should contain a verification link pointing to `/verify-email?token=...`. Better Auth handles token generation and validation internally.

2. **Verification page**: Build `apps/web/src/routes/verify-email.tsx` that reads the token from the URL query parameter, calls the verification endpoint, and shows success/error states. On success, redirect to `/dashboard` after 3 seconds.

3. **Guard middleware**: Create `apps/web/src/server/trpc/middleware/email-verified.ts` that checks if the user's email is verified and rejects unverified users from accessing protected routes (optional — can be added later as a tRPC middleware). For Phase 0, the verification guard is visual (a banner reminding users to verify their email) rather than hard‑blocking.

4. **Resend verification**: Add a "Resend verification email" button on the settings page or dashboard banner for users who haven't verified.

**Research Findings (2026‑05‑06):**
- Better Auth's `sendVerificationEmail` callback receives `{ user, url, token }` — the `url` is a pre‑built verification link.
- Email verification flow: user signs up → verification email sent → user clicks link → `GET /api/auth/verify-email?token=...` → email marked verified.
- Verification endpoints (from Better Auth internals): `/verify-email`, `/send-verification-email`.

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0` (email queue infrastructure)

**Blocks:** [N/A]

**Related Files:**
- `packages/auth/src/index.ts` (implement `sendVerificationEmail`)
- `apps/web/src/server/email/templates/verify-email.ts` (new — email template)
- `apps/web/src/routes/verify-email.tsx` (new)
- `apps/web/src/server/trpc/middleware/email-verified.ts` (new)

**Definition of Done**
- [ ] `sendVerificationEmail` callback implemented — enqueues verification email via queue
- [ ] Email template `verify-email.ts` created with UBOS branding, verification link, and expiration note
- [ ] `apps/web/src/routes/verify-email.tsx` created: reads token, verifies, shows success/error
- [ ] Successful verification redirects to `/dashboard` after 3 seconds
- [ ] "Resend verification email" button added to settings page or dashboard banner
- [ ] Unverified users see a banner on dashboard (not hard‑blocked)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Hard‑blocking unverified users (deferred — requires tRPC middleware integration)
- Custom verification email templates with rich HTML (Phase 1 enhancement)

**Rules to Follow**
- The verification token is generated and validated by Better Auth — do not re‑implement token logic.
- The `sendVerificationEmail` must be non‑blocking (do not `await` it in the sign‑up flow).
- The verification page must handle invalid/expired tokens gracefully.

**Verification**
```bash
# Test verification flow
# 1. Sign up with email that receives test emails
# 2. Check email inbox for verification email
# 3. Click verification link
# 4. Verify redirected to /dashboard
# 5. Check emailVerified in database

# Test unverified banner
# 1. Sign up but don't verify
# 2. Navigate to /dashboard
# 3. Verify banner is visible

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a new user, I want to verify my email address after signing up so that my account is fully activated.

---

#### Subtasks

- [ ] P0-AUTH-8.0.25 (AGENT): Read Better Auth email verification documentation and the email queue infrastructure design.
  **Verification:** Verification flow and queue API understood.

- [ ] P0-AUTH-8.0.5 (AGENT): Research email verification UX best practices (banners vs hard blocks, resend, expiry).
  **Verification:** Research documented.

- [ ] P0-AUTH-8.1 (AGENT): Implement `sendVerificationEmail` callback using email queue.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Sign‑up triggers email enqueue.

- [ ] P0-AUTH-8.2 (AGENT): Create verification email template.
  **File(s):** `apps/web/src/server/email/templates/verify-email.ts` (new)
  **Verification:** Template renders with UBOS branding.

- [ ] P0-AUTH-8.3 (AGENT): Build `verify-email.tsx` page with token handling, success/error states, and redirect.
  **File(s):** `apps/web/src/routes/verify-email.tsx` (new)
  **Verification:** Verification link works end‑to‑end.

- [ ] P0-AUTH-8.4 (AGENT): Add unverified banner to dashboard and resend button to settings.
  **File(s):** `apps/web/src/routes/dashboard.lazy.tsx`, `apps/web/src/routes/dashboard/settings/security/mfa.tsx`
  **Verification:** Banner visible for unverified users; resend works.

- [ ] P0-AUTH-8.5 (HUMAN): Test full verification flow from sign‑up to verified dashboard. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-9: Build password reset flow

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Better Auth provides built‑in endpoints for password reset (`forgetPassword`, `resetPassword`) but the UI pages and email templates are not implemented. Users who forget their password have no way to reset it through the application.
**Size:** Medium

**Description:**
Build the complete password reset flow:

1. **"Forgot Password" page**: `apps/web/src/routes/forgot-password.tsx` — a simple form with email input and "Send Reset Link" button. Calls `authClient.forgetPassword({ email, redirectTo: '/reset-password' })`. Shows success message regardless of whether the email exists (prevent email enumeration).

2. **Reset password page**: `apps/web/src/routes/reset-password.tsx` — reads the reset token from the URL query parameter, shows a form with "New Password" and "Confirm Password" fields. Validates password minimum length (12 characters, per P0‑AUTH‑1). Calls `authClient.resetPassword({ newPassword })`. On success, redirects to `/signin`.

3. **Email template**: `apps/web/src/server/email/templates/reset-password.ts` — reset email with UBOS branding, reset link, and expiration note (token expires after 1 hour).

4. **Server‑side callback**: Implement `sendResetPasswordEmail` callback in Better Auth config (or use the built‑in `sendEmailVerification` pattern for password reset). Better Auth handles token generation and validation internally.

**Research Findings (2026‑05‑06):**
- Client API: `authClient.forgetPassword({ email, redirectTo: '/reset-password' })`
- Reset callback: `authClient.resetPassword({ newPassword })`
- Better Auth endpoints: `/forget-password`, `/reset-password`
- v1.5.0‑beta.11: stricter default rate limits for password reset endpoints (3 req/60s)
- Email enumeration protection: always return success from `forgetPassword` page

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`
- `tasks/infrastructure/P0-EMAIL.md → P0-EMAIL-0` (email queue)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/forgot-password.tsx` (new)
- `apps/web/src/routes/reset-password.tsx` (new)
- `apps/web/src/server/email/templates/reset-password.ts` (new)
- `packages/auth/src/index.ts` (add sendResetPasswordEmail callback if needed)

**Definition of Done**
- [ ] `forgot-password.tsx` created with email input and "Send Reset Link" button
- [ ] Forgot password page shows success message regardless of email existence (enumeration protection)
- [ ] `reset-password.tsx` created with token handling, new password form, validation (≥12 chars), and confirmation
- [ ] Successful reset redirects to `/signin`
- [ ] Reset password email template created with UBOS branding and expiration note
- [ ] Reset token properly validated; invalid/expired tokens show error
- [ ] Rate limiting active on password reset endpoints (3 req/60s, built‑in)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Password strength meter in UI (future enhancement)
- SMS‑based password reset (deferred)

**Rules to Follow**
- Never reveal whether an email is registered in the forgot‑password flow.
- Reset tokens must be single‑use (Better Auth handles this automatically).
- The reset password page must not be accessible without a valid token.

**Verification**
```bash
# Test password reset flow
# 1. Navigate to /forgot-password
# 2. Enter email → "If that email is registered, a reset link has been sent"
# 3. Check email for reset link
# 4. Click link → /reset-password?token=...
# 5. Enter new password (≥12 chars) → success → redirected to /signin
# 6. Sign in with new password → works
# 7. Test expired/invalid token → error shown

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user who forgot my password, I want to request a reset link and set a new password so that I can regain access to my account.

---

#### Subtasks

- [ ] P0-AUTH-9.0.25 (AGENT): Read Better Auth password reset documentation and email template patterns.
  **Verification:** Reset flow API understood.

- [ ] P0-AUTH-9.0.5 (AGENT): Research password reset UX best practices (enumeration protection, token expiry, rate limiting).
  **Verification:** Research documented.

- [ ] P0-AUTH-9.1 (AGENT): Build `forgot-password.tsx` with email form, enumeration protection, and loading/error states.
  **File(s):** `apps/web/src/routes/forgot-password.tsx` (new)
  **Verification:** Page functional; always returns success message.

- [ ] P0-AUTH-9.2 (AGENT): Build `reset-password.tsx` with token handling, password form (≥12 char validation), and success redirect.
  **File(s):** `apps/web/src/routes/reset-password.tsx` (new)
  **Verification:** Reset flow works end‑to‑end.

- [ ] P0-AUTH-9.3 (AGENT): Create reset password email template.
  **File(s):** `apps/web/src/server/email/templates/reset-password.ts` (new)
  **Verification:** Template renders with UBOS branding.

- [ ] P0-AUTH-9.4 (AGENT): Implement `sendResetPasswordEmail` callback if needed (may be handled by Better Auth's built‑in email sending).
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Password reset email enqueued.

- [ ] P0-AUTH-9.5 (HUMAN): Test full password reset flow. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-10: Build account deactivation/deletion

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Better Auth provides `authClient.deleteUser()` with optional `sendDeleteAccountVerification` callback, but no UI exists for account deletion. Users cannot request deletion of their account or data through the application. GDPR requires that users be able to delete their account and associated data.
**Size:** Small

**Description:**
Build the account deletion flow:

1. **Deletion request page**: Add a "Delete Account" section to the settings/account page (or create `apps/web/src/routes/dashboard/settings/account.tsx`). The section includes: a warning about data loss, a confirmation dialog, and a "Delete My Account" button.

2. **Soft‑delete with grace period**: When a user requests deletion, call `authClient.deleteUser()` with `sendDeleteAccountVerification` callback. Better Auth sends a verification email. The user clicks the link to confirm. On confirmation:
   - Set `deletedAt` timestamp on the user record (now + 30 days).
   - Disable sign‑ins immediately.
   - After 30 days, a background job (Inngest) permanently deletes the user data.
   - The user can cancel deletion within the 30‑day grace period by signing in (which reactivates the account).

3. **GDPR data deletion stub**: Create `apps/web/src/server/auth/delete-account.ts` that will be extended in Phase 2 (P2‑SEC‑2‑2) to cascade‑delete all user‑associated data across tenant tables. For Phase 0, it deletes the user record, sessions, and accounts via Better Auth's built‑in deletion.

**Research Findings (2026‑05‑06):**
- `authClient.deleteUser()` with `sendDeleteAccountVerification` callback sends a verification email
- `deleteUser(userId)` removes sessions, accounts, and user record
- Soft‑delete pattern: `deletedAt` field disables sign‑ins but preserves data for grace period
- GDPR: users have the right to erasure; 30‑day grace period is a common pattern

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/dashboard/settings/account.tsx` (new or extend existing)
- `apps/web/src/server/auth/delete-account.ts` (new)
- `packages/auth/src/index.ts` (add `sendDeleteAccountVerification` callback)

**Definition of Done**
- [ ] "Delete Account" section added to settings page with warning and confirmation dialog
- [ ] `sendDeleteAccountVerification` callback implemented — sends verification email
- [ ] On confirmed deletion: user's `deletedAt` set to now + 30 days, sign‑ins disabled
- [ ] User can cancel deletion within grace period by signing in
- [ ] `delete-account.ts` stub created for GDPR cascade deletion
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full GDPR cascade deletion across tenant tables (P2‑SEC‑2‑2)
- Admin‑initiated account deletion (P3‑PLAT‑1)
- Deletion of data from third‑party systems (Stripe, Resend — P2‑SEC‑8)

**Rules to Follow**
- Deletion must require email verification (not just a button click).
- The grace period (30 days) must be clearly communicated to the user.
- Never hard‑delete immediately without a grace period for user‑initiated deletion.

**Verification**
```bash
# Test account deletion
# 1. Navigate to settings/account
# 2. Click "Delete My Account" → confirmation dialog
# 3. Confirm → verification email sent
# 4. Click verification link → account soft‑deleted
# 5. Attempt sign‑in → rejected
# 6. Check database: deletedAt set, user record still exists

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user concerned about privacy, I want to delete my account so that my personal data is removed from the platform.

---

#### Subtasks

- [ ] P0-AUTH-10.0.25 (AGENT): Read Better Auth user deletion documentation and soft‑delete patterns.
  **Verification:** Deletion API understood.

- [ ] P0-AUTH-10.0.5 (AGENT): Research GDPR account deletion best practices and community patterns.
  **Verification:** Research documented.

- [ ] P0-AUTH-10.1 (AGENT): Add "Delete Account" section to settings/account page with warning, confirmation, and grace period explanation.
  **File(s):** `apps/web/src/routes/dashboard/settings/account.tsx` (new or extend)
  **Verification:** Deletion UI present and functional.

- [ ] P0-AUTH-10.2 (AGENT): Implement `sendDeleteAccountVerification` callback and soft‑delete logic.
  **File(s):** `packages/auth/src/index.ts`, `apps/web/src/server/auth/delete-account.ts` (new)
  **Verification:** Account soft‑deleted after verified confirmation.

- [ ] P0-AUTH-10.3 (AGENT): Create GDPR data deletion stub with cascade‑deletion placeholder.
  **File(s):** `apps/web/src/server/auth/delete-account.ts`
  **Verification:** Stub exists; documented for Phase 2 extension.

- [ ] P0-AUTH-10.4 (HUMAN): Test full account deletion and cancellation within grace period. Approve.
  **Verification:** Approved.

---

### [ ] P0-AUTH-11: Enforce password policies — minimum length 12, check against HaveIBeenPwned API

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟢 Low
**Current State:** Password minimum length is configured to 12 in P0‑AUTH‑1. However, the HaveIBeenPwned plugin is not enabled. There is no additional password complexity enforcement beyond minimum length. Users could use passwords that have been exposed in known data breaches.
**Size:** Small

**Description:**
Integrate Better Auth's `haveibeenpwned` plugin to check passwords against the HaveIBeenPwned breach database during registration and password changes. The plugin uses k‑anonymity (only the first 5 characters of the SHA‑1 password hash are sent to the API), ensuring the full password hash never leaves the server.

Configure the plugin with `minBreaches: 1` (block any password found in any breach). Add this configuration to `packages/auth/src/index.ts`.

Additionally, document the password policy in `packages/auth/src/password-policy.ts`: minimum length 12, checked against HIBP, and any future complexity requirements.

**Research Findings (2026‑05‑06):**
- Import: `import { haveibeenpwned } from "better-auth/plugins/haveibeenpwned"`
- k‑anonymity model: only 5‑char SHA‑1 hash prefix sent to API
- Configurable `minBreaches` threshold: `minBreaches: 1` blocks any password found in any breach
- Enable/disable per endpoint

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1`

**Blocks:** [N/A]

**Related Files:**
- `packages/auth/src/index.ts` (add haveibeenpwned plugin)
- `packages/auth/src/password-policy.ts` (new — documented policy)

**Definition of Done**
- [ ] `haveibeenpwned` plugin added to Better Auth plugins array
- [ ] Plugin configured with `minBreaches: 1`
- [ ] Passwords found in HIBP database rejected during sign‑up and password change
- [ ] `packages/auth/src/password-policy.ts` created documenting: minimum length 12, HIBP check, k‑anonymity privacy note
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Custom password complexity rules (uppercase, digit, symbol requirements — deferred to policy discussion)
- HIBP checks on existing passwords (only checked on change/set)

**Rules to Follow**
- The HIBP check must not block the sign‑up flow if the HIBP API is unreachable (fail open with warning).
- Privacy note must explain k‑anonymity to users.

**Verification**
```bash
# Test HIBP check
# 1. Sign up with a known compromised password (e.g., "password123")
# 2. Expected: rejected with "This password has been found in X data breaches"
# 3. Sign up with a strong unique password
# 4. Expected: accepted

# Test sign-up continues if HIBP API is unreachable
# (mock or block API temporarily)
# Expected: sign-up succeeds with warning logged

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security‑conscious user, I want the system to check that my password hasn't been exposed in a data breach before accepting it.

---

#### Subtasks

- [ ] P0-AUTH-11.0.25 (AGENT): Read Better Auth `haveibeenpwned` plugin documentation.
  **Verification:** Plugin API understood.

- [ ] P0-AUTH-11.0.5 (AGENT): Research k‑anonymity model and privacy implications.
  **Verification:** Research documented.

- [ ] P0-AUTH-11.1 (AGENT): Add `haveibeenpwned` plugin to Better Auth config with `minBreaches: 1`.
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** HIBP blocking active on sign‑up.

- [ ] P0-AUTH-11.2 (AGENT): Create `password-policy.ts` documenting all password requirements.
  **File(s):** `packages/auth/src/password-policy.ts` (new)
  **Verification:** Policy documented.

- [ ] P0-AUTH-11.3 (HUMAN): Test HIBP blocking and fail‑open behavior. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑AUTH group are covered.*

---
