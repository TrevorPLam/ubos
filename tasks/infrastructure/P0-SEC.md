# tasks/infrastructure/P0-SEC.md – Security Hardening

This file covers Content Security Policy (CSP) and CORS header configuration, HTTPS/HSTS enforcement, API key management for programmatic access, automated tenant isolation test suite, file upload security hardening (CVE‑2026‑34750 mitigation), supply‑chain hardening (pnpm audit, Dependabot, `minimumReleaseAge`), and CSRF protection for tRPC endpoints. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑SEC (2026‑05‑06)

### 1. Content Security Policy (CSP) for SPAs in 2026

The 2026 consensus for CSP in SPAs and SSR‑enabled applications is unequivocal: **start with `Content-Security-Policy-Report-Only` mode, audit violations, then enforce**. The `report-uri` directive (or the newer `report-to` with Reporting API) sends violation reports to a collection endpoint for monitoring. Nonce‑based CSP is the recommended approach for dynamic applications — per the BreachFin guide, "use Nonces Instead of Hashes for SPAs" because nonce values can be rotated with each server response, whereas hash‑based approaches require rebuilding when inline scripts change. However, nonce‑based CSP **requires SSR** to inject a fresh nonce into every response. UBOS uses TanStack Start with SSR, making nonce‑based CSP feasible.

**Minimal safe default**:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Key directives: `script-src` must not contain `'unsafe-inline'` if nonce‑based; `object-src: 'none'` blocks legacy plugin attacks; `base-uri: 'self'` prevents base‑tag hijacking; `frame-ancestors: 'none'` stops clickjacking.

### 2. CORS Headers on Cloudflare Workers with Hono

Hono's built‑in `cors` middleware is the canonical approach. **The middleware must be called before routes** — `app.use('/api/*', cors())`. For production, the `origin` should be an explicit allowlist (not `*`), especially when `credentials: true` is set, because browsers reject `*` with credentials per the Fetch specification. The Authorization header must be listed explicitly in `allowHeaders` — it cannot be represented by a wildcard. On Vite dev servers, disable the built‑in CORS feature by setting `server.cors: false` in `vite.config.ts` to prevent conflicts with Hono's CORS middleware. The **CORS vs CSRF distinction** is critical: CORS governs read protection (which origins can read responses), while CSRF governs write protection (preventing unauthorized actions). For JSON‑based APIs (like tRPC), `application/json` content type triggers a CORS preflight, which naturally blocks cross‑origin writes from unauthorized origins.

### 3. HSTS (HTTP Strict Transport Security)

The recommended 2026 configuration is `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. The `max-age` of one year (31,536,000 seconds) is the minimum required for browser preload lists. `includeSubDomains` extends the policy to all subdomains. The `preload` directive opts into browser preload lists — **permanent and difficult to undo**, so it should only be added after confirming all subdomains support HTTPS. On Cloudflare, HSTS can be configured at the edge (SSL/TLS → Edge Certificates) or via Workers response headers. The edge‑level configuration is simpler but less flexible; the Worker‑level header gives programmatic control.

### 4. API Key Management (2026 Best Practices)

The 2026 consensus emphasizes **short‑lived credentials over permanent API keys**. For UBOS's programmatic access use case, the API key pattern should: generate keys via `crypto.randomUUID()`, store only the SHA‑256 hash in the database (never the plaintext), display the key once at creation with a human‑readable prefix (`ubos_`), associate scoped permissions with each key, and enforce automated rotation every 30–90 days. The key should be transmitted in the `Authorization: Bearer ubos_<key>` header. Rate limiting should be per‑key. Keys must never appear in logs, error messages, or client‑side code. The `x-api-key` header approach is legacy — Bearer tokens are the modern standard.

### 5. File Upload Security — CVE‑2026‑34750 Mitigation

CVE‑2026‑34750, published April 1, 2026, is a **path traversal vulnerability** (CWE‑22, CVSS 6.5) in Payload CMS's client‑upload signed‑URL endpoints. The affected storage adapters (`@payloadcms/storage-r2`, `-s3`, `-azure`, `-gcs`) failed to properly sanitize filenames, allowing authenticated attackers to craft filenames with traversal sequences (`../`) to escape the intended storage directory. The vulnerability was patched in v3.78.0 of all storage adapters.

Although UBOS does not use Payload CMS, the **same class of vulnerability applies to our R2 presigned‑URL upload flow** (P0‑STORAGE‑2). Standard mitigations from the security research community include:
1. Reject filenames containing path traversal sequences: `../`, `..\`, `%2e%2e%2f`, null bytes (`%00`), and control characters
2. Enforce a safe character set: `[a-zA-Z0-9._-]` only
3. Generate **server‑side filenames** (UUID‑based) for storage, storing the original sanitized filename as metadata
4. Validate that the resolved storage path stays within the intended upload bucket or directory prefix
5. Apply defense‑in‑depth: validate at the application level even if the storage layer (R2) is not path‑based

### 6. CSRF Protection for tRPC

The modern 2026 approach to CSRF protection for JSON APIs uses multiple layers:

**Custom Header Defense**: tRPC requests carry custom headers (e.g., `x-trpc-source`). The browser's Same-Origin Policy prevents cross‑origin JavaScript from setting custom headers. A middleware can verify that a custom header is present — if absent, the request originated from a cross‑origin `<form>` or similar. This is the most common anti‑CSRF pattern for SPAs.

**SameSite Cookies**: Better Auth's session cookies should use `SameSite=Strict` (or `Lax` when OAuth redirects are needed). `SameSite=Strict` prevents the browser from sending cookies on any cross‑site request, neutralising CSRF at the cookie level. The `Secure` attribute must accompany `SameSite=None`; for `Strict`/`Lax`, it is still strongly recommended.

**Content‑Type Preflight**: tRPC uses `application/json` content type, which triggers a CORS preflight (`OPTIONS`) for cross‑origin requests. If the origin is not in the CORS allowlist, the browser blocks the request before it reaches the server.

**CSRF Middleware**: An additional tRPC middleware that checks for a custom header (e.g., `x-csrf-token`) provides defense‑in‑depth. The middleware is optional — `SameSite=Strict` cookies handle the primary threat, but the custom header check provides an additional layer for non‑cookie authentication contexts or misconfigured browsers.

### 7. Supply‑Chain Hardening

**pnpm `minimumReleaseAge`**: pnpm v10.16+ supports `minimumReleaseAge` (in minutes). It delays adoption of newly published package versions — since malware is typically detected and removed within hours, a 24‑hour delay (1440 minutes) prevents most supply‑chain attacks. pnpm v11 makes this the default (1440 = 1 day). For UBOS on pnpm v10, configure `minimumReleaseAge: 1440` in `pnpm-workspace.yaml`.

**`pnpm audit` in CI**: The audit command checks installed packages against the npm registry's vulnerability database. Use `pnpm audit --audit-level critical --prod` in CI and fail the build on critical vulnerabilities. The `--ignore-unfixable` flag skips vulnerabilities with no available patch. The `auditConfig.ignoreCves` setting in `pnpm-workspace.yaml` allows known‑safe exceptions.

**Dependabot**: Configure weekly `dependabot.yml` for `npm` ecosystem with `directory: "/"` and `open-pull-requests-limit: 5`. Dependabot's **cooldown feature** adds a delay before opening PRs for new dependency versions — a valuable additional protection layer. The Cloudsmith analysis notes that "Dependabot is great at keeping dependencies current, but update automation and ingestion control solve different problems."

**`blockExoticSubdeps`**: Setting `blockExoticSubdeps: true` prevents transitive dependencies from using non‑registry sources (git repos, direct tarball URLs), reducing the attack surface.

**`allowBuilds`**: pnpm v11 replaces the legacy `onlyBuiltDependencies` / `neverBuiltDependencies` settings with a unified `allowBuilds` map. For v10, use `onlyBuiltDependencies` to whitelist trusted packages that need postinstall scripts.

### 8. Tenant Isolation Testing

The 2026 standard for tenant isolation validation is a multi‑layer approach: "Tenant isolation must be validated continuously across UI, API, and background processes to prevent data leakage." The test pattern from enterprise security implementations follows a clear structure: spawn two tenants, create data in tenant A, attempt cross‑tenant API calls from tenant B's context, and verify 403/empty results. This must cover every API endpoint and storage layer verification (PostgreSQL RLS, object store prefixes). The Aetheris enterprise hardening issue provides the canonical test template: "spawn two tenants, cross‑call APIs, verify 403 on all cross‑tenant attempts."

---

## Task Definitions

### [ ] P0-SEC-1: Configure Content Security Policy (CSP) and CORS headers

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P0‑SHELL‑5 added basic security headers via Hono's `secureHeaders()` middleware, including a CSP with `'unsafe-inline'` for scripts and styles (a known technical debt item). The CORS middleware from Hono was also added. However, the CSP is not fully validated against 2026 best practices: it uses `'unsafe-inline'` rather than nonces, does not have a `report-uri` or `report-to` endpoint for violation monitoring, and may not cover all required directives. The CORS configuration may use a wildcard `*` origin rather than an explicit allowlist.
**Size:** Medium

**Description:**
Harden the Content Security Policy and CORS configuration established in P0‑SHELL‑5 to meet 2026 production security standards.

**(a) CSP — Nonce‑based approach**: Replace `'unsafe-inline'` for `script-src` with a nonce‑based approach. Since UBOS uses TanStack Start with SSR, a fresh nonce can be generated per request and injected into both the CSP header and the HTML (`<script nonce="...">`). For Phase 0, implement the nonce generation and injection in the Hono middleware. If full SSR nonce injection proves too complex, retain `'unsafe-inline'` with a documented technical debt tracking issue for Phase 1 resolution. In either case, add the following directives:
- `default-src 'self'`
- `script-src 'self'` (plus `'nonce-{random}'` if nonce‑based)
- `style-src 'self' 'unsafe-inline'` (ShadCN components require inline styles)
- `object-src 'none'` (block legacy plugins)
- `base-uri 'self'` (prevent base‑tag injection)
- `form-action 'self'` (restrict form submissions)
- `frame-ancestors 'none'` (prevent clickjacking)

**(b) CSP — Violation reporting**: Add a `report-uri /api/csp-report` directive. Create a simple Hono route `POST /api/csp-report` that logs violations to the structured logger (P0‑OBS‑2) without blocking. This enables monitoring before enforcement.

**(c) CSP — Report‑Only mode for development**: In development and staging, use `Content-Security-Policy-Report-Only` instead of the enforcing `Content-Security-Policy` header. This allows developers to see violations in the browser console without breaking functionality. In production, use the enforcing header.

**(d) CORS — Explicit origin allowlist**: Replace any wildcard `*` origin with an explicit allowlist: `https://ubos.app`, `https://api.ubos.app`, and `http://localhost:3000` (development). For environments with dynamic origins (preview deployments), use the callback function `origin: (origin, c) => { return allowedOrigins.includes(origin) ? origin : 'https://ubos.app' }`.

**(e) CORS — Explicit headers**: Add required headers to `allowHeaders`: `Content-Type`, `Authorization`, `x-tenant-id`, `x-request-id`, `x-csrf-token`.

**Research Findings (2026‑05‑06):**
- Nonce‑based CSP is the recommended approach for SSR‑enabled apps; nonces must be unique per request
- CSP report‑only mode enables auditing before enforcement
- CORS wildcard `*` is incompatible with `credentials: true` and must be replaced with explicit origins
- The Authorization header requires explicit listing in `allowHeaders`
- Vite's built‑in CORS must be disabled when using Hono's CORS middleware

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-5` (basic security headers in place)

**Blocks:**
- `tasks/infrastructure/P0-SEC.md → P0-SEC-2` (HSTS builds on header infrastructure)

**Related Files:**
- `apps/web/src/server/api.ts` (CSP and CORS middleware)
- `apps/web/src/entry-server.tsx` (if nonce generation is centralized here)
- `apps/web/vite.config.ts` (disable Vite CORS: `server.cors: false`)

**Definition of Done**
- [ ] CSP header configured on all responses: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
- [ ] If nonce‑based CSP: nonce injected into header and HTML via SSR; `'unsafe-inline'` removed from `script-src`
- [ ] If nonce not yet feasible: technical debt issue created, `'unsafe-inline'` retained temporarily
- [ ] `report-uri /api/csp-report` directive present; POST endpoint logs violations
- [ ] Development/staging uses `Content-Security-Policy-Report-Only`; production uses enforcing header
- [ ] CORS origin is explicit allowlist (not `*`); dynamic origin callback for preview environments
- [ ] CORS `allowHeaders` includes `Content-Type`, `Authorization`, `x-tenant-id`, `x-request-id`, `x-csrf-token`
- [ ] Vite `server.cors: false` set in `vite.config.ts` to prevent conflicts
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full strict CSP with zero `'unsafe-inline'` for styles (ShadCN components currently rely on inline styles)
- Integration with Reporting API (`report-to`) — `report-uri` is simpler and sufficient for Phase 0
- Per‑page CSP variations (global CSP for all routes)

**Rules to Follow**
- Never deploy `Access-Control-Allow-Origin: *` with `credentials: true` — browsers will reject it
- CSP report endpoint must not be rate‑limited (to avoid losing violation data)
- CORS preflight responses must be cacheable (`Access-Control-Max-Age`) for performance
- CSP changes must be tested with `Content-Security-Policy-Report-Only` first

**Verification**
```bash
# Verify CSP header
curl -I http://localhost:3000/ | grep -i content-security-policy

# Verify CSP report-only in dev
curl -I http://localhost:3000/ | grep -i content-security-policy-report-only

# Verify CORS preflight
curl -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" http://localhost:3000/api/trpc/crm.listLeadBoard -I

# Verify CORS allows production origin
curl -X OPTIONS -H "Origin: https://ubos.app" http://localhost:3000/api/trpc/crm.listLeadBoard -I | grep Access-Control-Allow-Origin

# Verify CSP report endpoint
curl -X POST http://localhost:3000/api/csp-report -H "Content-Type: application/json" -d '{"csp-report": {"blocked-uri": "http://evil.com/script.js"}}'
# Expected: 204 No Content

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The security headers middleware encapsulates CSP nonce generation, report‑only vs enforcing logic, and CORS origin validation behind a single middleware layer, hiding the complexity of per‑environment header configuration from the application.

---

#### Subtasks

- [ ] P0-SEC-1.0.25 (AGENT): Read current `api.ts` security header configuration from P0‑SHELL‑5. Research CSP nonce‑based patterns for TanStack Start SSR and Hono middleware.
  **Verification:** Current header configuration and nonce approach documented.

- [ ] P0-SEC-1.0.5 (AGENT): Research nonce‑based CSP with TanStack Start: how to generate per‑request nonce and inject into both header and SSR output.
  **Verification:** Feasibility assessment documented.

- [ ] P0-SEC-1.1 (AGENT): Implement CSP with all directives: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. Add `report-uri /api/csp-report`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** CSP header present on all responses.

- [ ] P0-SEC-1.2 (AGENT): Implement nonce‑based CSP if feasible: generate fresh nonce per request, inject into header and SSR HTML. If not feasible, document technical debt.
  **File(s):** `apps/web/src/server/api.ts`, `apps/web/src/entry-server.tsx`
  **Verification:** Nonce rotation working, or debt issue created.

- [ ] P0-SEC-1.3 (AGENT): Create `POST /api/csp-report` route logging violations to structured logger.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Violations visible in logs.

- [ ] P0-SEC-1.4 (AGENT): Configure report‑only mode for development/staging, enforcing mode for production.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Header type changes with `NODE_ENV`.

- [ ] P0-SEC-1.5 (AGENT): Replace CORS wildcard with explicit origin allowlist and dynamic callback.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** CORS header returns specific origin, not `*`.

- [ ] P0-SEC-1.6 (AGENT): Add explicit `allowHeaders` for `Content-Type`, `Authorization`, `x-tenant-id`, `x-request-id`, `x-csrf-token`.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Preflight response includes all listed headers.

- [ ] P0-SEC-1.7 (AGENT): Disable Vite's built‑in CORS: `server.cors: false` in `vite.config.ts`.
  **File(s):** `apps/web/vite.config.ts`
  **Verification:** No conflicting CORS headers from Vite dev server.

- [ ] P0-SEC-1.8 (HUMAN): Test CSP with Report‑Only mode in staging, review violations, approve enforcement.
  **Verification:** Approved.

---

### [ ] P0-SEC-2: Enforce HTTPS and HSTS headers

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** The `secureHeaders()` middleware from P0‑SHELL‑5 already sets `Strict-Transport-Security` with a default value. However, the configuration may not include `includeSubDomains` and `preload` directives, and the `max-age` might use a shorter duration than the 1‑year minimum required by browser preload lists. Additionally, the `upgrade-insecure-requests` CSP directive may not be present.
**Size:** Small

**Description:**
Configure HSTS and HTTPS enforcement across the application. This involves two complementary protections:

**(a) HSTS Header**: Verify that `Strict-Transport-Security: max-age=31536000; includeSubDomains` is set on all responses. The `max-age` of 31,536,000 seconds (1 year) is the minimum required for browser preload lists. Include `includeSubDomains` to extend protection to all subdomains (verify all subdomains support HTTPS first). Add the `preload` directive only after confirming all subdomains are HTTPS‑ready and the team commits to permanent HTTPS — preload is difficult to reverse.

**Platform‑level note**: Cloudflare offers HSTS configuration at the edge (SSL/TLS → Edge Certificates) which applies HSTS to all traffic passing through Cloudflare before reaching the Worker. For UBOS, configure HSTS at both levels: the Worker header (application‑level) and Cloudflare dashboard (platform‑level defense‑in‑depth). When testing locally, HSTS is ignored over HTTP.

**(b) CSP HTTPS enforcement**: Add `upgrade-insecure-requests` to the CSP directive set. This instructs browsers to automatically upgrade HTTP requests to HTTPS, preventing mixed‑content issues.

**Research Findings (2026‑05‑06):**
- Standard HSTS: `max-age=31536000; includeSubDomains; preload`
- Preload requires 1‑year max‑age minimum, is permanent and difficult to undo
- HSTS is ignored over HTTP — only activates over HTTPS
- Cloudflare can also enforce HSTS at the edge level
- `upgrade-insecure-requests` CSP directive auto‑upgrades HTTP links to HTTPS

**Depends on:**
- `tasks/infrastructure/P0-SEC.md → P0-SEC-1` (CSP infrastructure in place)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/api.ts` (HSTS header in middleware)
- `apps/web/src/entry-server.tsx` (if headers are set here)

**Definition of Done**
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` header present on all HTTPS responses
- [ ] `preload` directive considered and documented (whether to include or defer)
- [ ] `upgrade-insecure-requests` CSP directive added
- [ ] HSTS header **not** sent over HTTP (development) — only production
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Submitting to HSTS preload list at hstspreload.org (requires stable production domain)
- Cloudflare dashboard HSTS configuration (external to codebase, documented in deployment guide)

**Rules to Follow**
- `max-age` must be at least 31536000 (1 year) for preload eligibility
- Do not add `preload` directive until production domain is stable and all subdomains use HTTPS
- HSTS must never be sent over plain HTTP (it would be ignored, but wasting bytes)
- `includeSubDomains` requires all subdomains to be HTTPS‑ready

**Verification**
```bash
# Verify HSTS header in production (HTTPS)
curl -s -I https://staging.ubos.app | grep Strict-Transport-Security
# Expected: max-age=31536000; includeSubDomains

# Verify HSTS NOT sent in development (HTTP)
curl -s -I http://localhost:3000 | grep Strict-Transport-Security
# Expected: no output

# Verify upgrade-insecure-requests in CSP
curl -s -I https://staging.ubos.app | grep -i content-security-policy | grep upgrade-insecure-requests

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

#### Subtasks

- [ ] P0-SEC-2.0.25 (AGENT): Read current HSTS configuration from P0‑SHELL‑5. Research HSTS best practices and preload requirements.
  **Verification:** Current configuration and requirements documented.

- [ ] P0-SEC-2.0.5 (AGENT): Determine if `preload` directive should be added now or deferred.
  **Verification:** Decision documented with rationale.

- [ ] P0-SEC-2.1 (AGENT): Configure HSTS with `max-age=31536000; includeSubDomains`. Conditionally exclude in development (HTTP).
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** HSTS header present on HTTPS responses.

- [ ] P0-SEC-2.2 (AGENT): Add `upgrade-insecure-requests` to CSP directives.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** CSP includes `upgrade-insecure-requests`.

- [ ] P0-SEC-2.3 (HUMAN): Verify HSTS on staging deployment, review preload decision. Approve.
  **Verification:** Approved.

---

### [ ] P0-SEC-3: Implement API key management for programmatic access

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No API key infrastructure exists. External applications cannot authenticate programmatically — only user sessions via Better Auth are supported. This blocks API access for CI/CD pipelines, third‑party integrations, and automation. The TASKS.md references `packages/db/src/schema/api-keys.ts` and `apps/web/src/server/trpc/middleware/api-key.ts`, neither of which exist.
**Size:** Medium

**Description:**
Build an API key management system that enables programmatic access to the UBOS API. The system follows 2026 best practices for API key security:

**(a) Database schema**: Create `packages/db/src/schema/api-keys.ts` with `apiKeysTable`: `id` (UUID), `org_id` (FK to organizations), `name` (human‑readable label), `key_hash` (SHA‑256 hash of the plaintext key), `key_prefix` (first 8 characters for identification, e.g., `ubos_a1b2c3d4`), `permissions` (JSONB array of scoped permissions), `created_by` (user ID), `last_used_at`, `expires_at` (optional), `revoked_at` (optional, for soft‑delete), `created_at`, `updated_at`. The plaintext key is **never stored** — only the hash.

**(b) Key generation**: Use `crypto.randomUUID()` to generate the key. Format: `ubos_${randomUUID.replace(/-/g, '')}`. The `key_prefix` is the first 15 characters for display (`ubos_a1b2c...`). Hash with SHA‑256 before storage. The full plaintext key is returned once at creation — the API response must include a prominent warning to copy the key now.

**(c) Middleware**: Create `apps/web/src/server/trpc/middleware/api-key.ts` that extracts the key from the `Authorization: Bearer ubos_...` header, hashes it with SHA‑256, and looks up the matching hash in the database. If the key is valid (not revoked, not expired), inject the associated `org_id` and `permissions` into the context. The tenant middleware (P0‑TRPC‑2) uses the `org_id` to scope queries. If the key is invalid or revoked, throw `TRPCError({ code: 'UNAUTHORIZED' })`.

**(d) Management tRPC procedures**: Add procedures to the settings router: `apiKeys.list` (list keys for org, showing prefix/name/created/last_used, never showing full key), `apiKeys.create` (generate new key, return plaintext once), `apiKeys.revoke` (soft‑delete by setting `revoked_at`). These must be admin‑only (`.meta({ requiredRole: 'admin' })`).

**(e) API key rotation**: Document that keys should be rotated every 90 days. The rotation procedure: create a new key, update integration, revoke old key. A `apiKeys.rotate` procedure can be added later (Phase 2).

**Research Findings (2026‑05‑06):**
- SHA‑256 hashing for API key storage is industry standard
- Keys should be displayed once at creation
- `crypto.randomUUID()` is sufficient for API key generation
- Bearer token in `Authorization` header is the modern standard (not `x-api-key`)
- Automated rotation every 30–90 days recommended
- Scoped permissions limit blast radius of compromised keys

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-3` (RBAC middleware)

**Blocks:**
- `tasks/infrastructure/P3-PLAT.md → P3-PLAT-7` (API key management UI)

**Related Files:**
- `packages/db/src/schema/api-keys.ts` (new)
- `apps/web/src/server/trpc/middleware/api-key.ts` (new)
- `apps/web/src/server/trpc/routers/settings.ts` (add API key procedures)
- `apps/web/src/server/trpc/context.ts` (add `apiKey` to context type)

**Definition of Done**
- [ ] `packages/db/src/schema/api-keys.ts` created with `apiKeysTable`: id, org_id, name, key_hash, key_prefix, permissions, created_by, last_used_at, expires_at, revoked_at
- [ ] Migration generated and applied
- [ ] `apps/web/src/server/trpc/middleware/api-key.ts` created: extracts key from Authorization header, hashes with SHA‑256, looks up, injects org_id/permissions
- [ ] Key generation uses `crypto.randomUUID()` with `ubos_` prefix
- [ ] Plaintext key returned once at creation with copy warning
- [ ] API key procedures added: `settings.apiKeys.list`, `settings.apiKeys.create`, `settings.apiKeys.revoke`
- [ ] All procedures are admin‑only
- [ ] API key authentication works: `curl -H "Authorization: Bearer ubos_..."` returns scoped data
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- API key usage analytics (Phase 3)
- Key rotation automation (deferred)
- UI for API key management (P3‑PLAT‑7)

**Rules to Follow**
- Never store plaintext API keys in the database — hash with SHA‑256 before storage.
- Never log API keys or key hashes in logs.
- API key creation response must prominently warn: "Copy this key now. It will not be shown again."
- Revoked keys must not be reusable — `revoked_at` is a soft‑delete.
- API key middleware must run after auth middleware but before tenant middleware, so the tenant can be derived from the API key's org.

**Verification**
```bash
# Test API key creation (admin)
# 1. Sign in as admin → create API key
# 2. Copy plaintext key

# Test API key authentication
curl -H "Authorization: Bearer ubos_a1b2c3d4e5f6..." \
  http://localhost:3000/api/trpc/crm.listLeadBoard
# Expected: leads for the key's organization

# Test revoked key
# 3. Revoke the key
# 4. Retry the same request → UNAUTHORIZED

# Test key not in logs
grep "ubos_" apps/web/src/server/trpc/middleware/api-key.ts
# Expected: no plaintext keys logged

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an integration developer, I can generate an API key with scoped permissions and use it to programmatically access UBOS APIs.
- Deep Module: The API key middleware encapsulates key extraction, hashing, lookup, and context injection behind the standard `Authorization: Bearer` header, hiding the complexity of key management from individual procedures.

---

#### Subtasks

- [ ] P0-SEC-3.0.25 (AGENT): Research API key management best practices: hashing, generation, rotation, scoped permissions.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-SEC-3.0.5 (AGENT): Design `apiKeysTable` schema and key generation/hashing approach.
  **Verification:** Design documented.

- [ ] P0-SEC-3.1 (AGENT): Create `packages/db/src/schema/api-keys.ts` and generate migration.
  **File(s):** `packages/db/src/schema/api-keys.ts` (new), migration files
  **Verification:** Table created with correct schema.

- [ ] P0-SEC-3.2 (AGENT): Create `apps/web/src/server/trpc/middleware/api-key.ts` with extraction, hashing, lookup, and context injection.
  **File(s):** `apps/web/src/server/trpc/middleware/api-key.ts` (new)
  **Verification:** API key authentication works end‑to‑end.

- [ ] P0-SEC-3.3 (AGENT): Add API key management procedures to settings router.
  **File(s):** `apps/web/src/server/trpc/routers/settings.ts` (new or extend)
  **Verification:** Create, list, revoke procedures functional.

- [ ] P0-SEC-3.4 (HUMAN): Test API key creation, authentication, and revocation. Approve.
  **Verification:** Approved.

---

### [ ] P0-SEC-4: Build automated tenant isolation test suite

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No automated tenant isolation tests exist. The `tests/e2e/` directory contains only `auth-crm.spec.mjs` which tests auth and CRM lead creation within a single tenant. There is no test that verifies cross‑tenant data blindness — the most critical security property of a multi‑tenant SaaS. Without this, a regression that leaks data between tenants would go undetected until discovered by a customer or attacker.
**Size:** Medium

**Description:**
Build a Playwright E2E test suite that validates tenant isolation at both the API and storage layers. The test follows the standard enterprise pattern: "spawn two tenants, cross‑call APIs, verify 403 on all cross‑tenant attempts."

**Test structure** (`tests/e2e/tenant‑isolation.spec.ts`):

**(a) Setup phase**: Seed two test organizations (Org‑A and Org‑B) via the database seed script (P0‑DB‑6) or direct API calls. Each org has at least one user member.

**(b) Authentication phase**: Sign in as Org‑A's user in one browser context, sign in as Org‑B's user in another browser context. Store auth state (cookies/tokens) for each context. Use `browser.newContext()` for isolated Playwright contexts.

**(c) Data creation phase**: As Org‑A, create CRM leads via the application UI and API. Verify the leads are visible to Org‑A.

**(d) API‑layer isolation tests**: As Org‑B, attempt to:
- List Org‑A's leads via tRPC → expect empty result (RLS filters)
- Access Org‑A's lead by ID → expect NOT_FOUND or empty
- Update Org‑A's lead → expect NOT_FOUND
- Delete Org‑A's lead → expect NOT_FOUND
- Attempt to switch tenant ID in `x-tenant-id` header → expect auth error or empty results

**(e) Cross‑domain isolation tests**: Repeat the isolation check for any other domain that has test data (documents, projects — as they become available in Phase 1).

**(f) Direct database verification**: After API tests, verify that the database itself contains Org‑A's data but Org‑B's connection (via RLS) cannot see it. This is a manual or integration‑test step; for E2E, verify through the API layer.

**Test assertions**: Every cross‑tenant API call must return `403 FORBIDDEN` or empty results, never data from the other tenant. The test must fail if any data leaks.

**Integration**: Run this test in CI after every deployment. The test should be part of the required checks for production deployment.

**Research Findings (2026‑05‑06):**
- Standard pattern: spawn two tenants, cross‑call APIs, verify 403/empty
- "Tenant isolation must be validated continuously across UI, API, and background processes"
- Playwright with separate `browser.newContext()` per tenant is the established pattern
- Aetheris enterprise hardening issue provides the canonical test template

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-6` (database seeding)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant middleware)
- `tests/e2e/auth-crm.spec.mjs` (existing E2E test infrastructure)

**Blocks:** [N/A]

**Related Files:**
- `tests/e2e/tenant-isolation.spec.ts` (new)
- `playwright.config.mjs` (update test match pattern)

**Definition of Done**
- [ ] `tests/e2e/tenant-isolation.spec.ts` created with setup, auth, data creation, and cross‑tenant API isolation tests
- [ ] Test creates two tenants with seeded users
- [ ] CRM lead isolation verified: Org‑B cannot see/modify/delete Org‑A's leads
- [ ] `x-tenant-id` header tampering rejected
- [ ] Test passes consistently (0 flakiness) in CI
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- UI‑level isolation tests (e.g., verifying that Org‑B's browser never renders Org‑A's data visually — API‑level is sufficient for Phase 0)
- Storage‑level isolation tests (RLS verification via direct SQL — deferred to integration test suite)
- Cross‑domain isolation for unimplemented domains (will be added in Phase 1)

**Rules to Follow**
- Each test must run in its own Playwright context (`browser.newContext()`) to ensure clean auth state
- Never hard‑code tenant IDs — generate via seed script or API
- Test assertions must be strict: expect `403` or empty arrays, never `200` with another tenant's data
- The test must fail if any cross‑tenant access succeeds

**Verification**
```bash
# Run tenant isolation tests
npx playwright test tests/e2e/tenant-isolation.spec.ts

# Expected: all tests pass, no cross-tenant data leakage

# Run in CI
# Verify test passes in GitHub Actions

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a platform security auditor, I want automated tests that prove tenant A's data is never accessible to tenant B through any API endpoint.
- TDD: Write the test first (RED — cross‑tenant access returns data), then verify it passes (GREEN — cross‑tenant access returns 403/empty).

---

#### Subtasks

- [ ] P0-SEC-4.0.25 (AGENT): Read existing `tests/e2e/auth-crm.spec.mjs` and `playwright.config.mjs`. Research Playwright multi‑context patterns and tenant isolation testing best practices.
  **Verification:** Current test infrastructure and patterns documented.

- [ ] P0-SEC-4.0.5 (AGENT): Design test cases: what API calls constitute a comprehensive tenant isolation test suite.
  **Verification:** Test case inventory documented.

- [ ] P0-SEC-4.1 (AGENT): Create `tests/e2e/tenant-isolation.spec.ts` with setup (seed two tenants, sign in both), data creation (Org‑A creates CRM leads), and cross‑tenant API tests.
  **File(s):** `tests/e2e/tenant-isolation.spec.ts` (new)
  **Verification:** Test runs and passes; cross‑tenant access returns 403/empty.

- [ ] P0-SEC-4.2 (AGENT): Add tenant ID header tampering test case.
  **File(s):** `tests/e2e/tenant-isolation.spec.ts`
  **Verification:** Tampered header rejected.

- [ ] P0-SEC-4.3 (AGENT): Integrate tenant isolation test into CI workflow.
  **File(s):** `.github/workflows/ci.yml`
  **Verification:** Test runs in CI on every PR/push.

- [ ] P0-SEC-4.4 (HUMAN): Review test suite, verify all cross‑tenant access is blocked, approve.
  **Verification:** Approved.

---

### [ ] P0-SEC-5: Harden file upload security (filename sanitization, CVE‑2026‑34750 mitigation)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** File upload functionality is planned but not yet implemented (P0‑STORAGE‑2 will build the R2 presigned URL operations wrapper). When implemented, filenames from user uploads will be used to generate storage keys. Without proactive hardening, this introduces a path traversal vulnerability surface identical to CVE‑2026‑34750 (Payload CMS storage adapter vulnerability, April 2026). No filename validation or sanitization utilities exist.
**Size:** Small

**Description:**
Build a filename sanitization utility at `apps/web/src/server/storage/validation.ts` that implements defense‑in‑depth protection against path traversal attacks in user‑supplied filenames. The utility will be used by the R2 presigned‑URL operations wrapper (P0‑STORAGE‑2) and any future file upload functionality.

**Sanitization rules** (sourced from CVE‑2026‑34750 research):

1. **Reject path traversal sequences**: Strip or reject `../`, `..\`, `%2e%2e%2f`, `%2e%2e/`, `..%2f`, `..%5c`, and any URL‑encoded traversal variants
2. **Reject null bytes**: Null bytes (`%00`, `\0`) can terminate strings prematurely in some systems — reject them
3. **Reject control characters**: Characters with ASCII codes below 32 (space is allowed but trimmed at boundaries) — reject for safety
4. **Enforce safe character set**: Allow only `[a-zA-Z0-9._-]`. Replace spaces with underscores. Strip everything else
5. **Strip leading dots and separators**: Filenames starting with `.` or `-` can be interpreted as hidden files or options on Unix — strip them
6. **Enforce length limits**: Maximum filename 255 characters (filesystem limit); return an error if exceeded
7. **Generate server‑controlled storage keys**: Use `crypto.randomUUID()` for the actual R2 object key, storing the sanitized original filename as metadata. This eliminates the path traversal surface entirely — even if sanitization is bypassed, the storage path is not attacker‑controlled

**Utility API**: `sanitizeFilename(rawFilename: string): { sanitized: string; storageKey: string }`. The `sanitized` field is the cleaned display name; `storageKey` is the UUID‑based object key.

**Integration**: The utility is called in the R2 presigned‑URL operations wrapper (P0‑STORAGE‑2). It throws `TRPCError({ code: 'BAD_REQUEST', message: 'Filename contains invalid characters' })` if sanitization fails (e.g., filename becomes empty after stripping invalid characters).

**Research Findings (2026‑05‑06):**
- CVE‑2026‑34750: path traversal in Payload CMS R2 adapter via insufficient filename validation
- Mitigations confirmed across multiple security advisories: reject traversal sequences, enforce safe character set, generate server‑side keys
- Multiple 2026 CVEs confirm the same vulnerability pattern across different frameworks (NiceGUI, AdonisJS, Langflow)

**Depends on:**
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-2` (R2 operations wrapper — integration point)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/storage/validation.ts` (new)
- `apps/web/src/server/storage/r2.ts` (will use validation utility when built in P0‑STORAGE‑2)

**Definition of Done**
- [ ] `apps/web/src/server/storage/validation.ts` created with `sanitizeFilename(rawFilename)` function
- [ ] Rejects path traversal sequences: `../`, `..\`, URL‑encoded variants
- [ ] Rejects null bytes and control characters
- [ ] Enforces safe character set: `[a-zA-Z0-9._-]`; replaces spaces with underscores
- [ ] Strips leading dots and hyphens
- [ ] Enforces 255‑character maximum; throws on empty result
- [ ] Returns `{ sanitized, storageKey }` with UUID‑based storage key
- [ ] Unit tests: tests against the CVE‑2026‑34750 attack payloads, common traversal sequences, Unicode bypass attempts
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Virus scanning integration (P0‑STORAGE‑3)
- Content‑type validation (handled by the R2 presigned URL upload wrapper)
- File size limits (handled by the R2 wrapper)

**Rules to Follow**
- Sanitization must happen server‑side, never rely on client‑side validation alone
- The storage key must never include user‑supplied data — always use `crypto.randomUUID()`
- The `sanitized` filename is for display and metadata only, never for storage path construction
- Sanitization must be applied before the filename reaches any storage API call

**Verification**
```bash
# Unit tests
pnpm test -- apps/web/src/server/storage/validation.test.ts

# Test attack payloads
node -e "
  const { sanitizeFilename } = require('./apps/web/src/server/storage/validation.ts');
  console.log(sanitizeFilename('../../../etc/passwd'));  // storageKey is UUID
  console.log(sanitizeFilename('file%2e%2e%2fname.txt'));  // sanitized: 'filename.txt'
  console.log(sanitizeFilename('normal-file.pdf'));  // ok
"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The `sanitizeFilename` utility encapsulates all path traversal defense logic behind a single function, ensuring that any upload endpoint that calls it is automatically protected without understanding CWE‑22 attack vectors.

---

#### Subtasks

- [ ] P0-SEC-5.0.25 (AGENT): Research CVE‑2026‑34750 attack vectors and filename sanitization best practices. Review other 2026 path traversal CVEs (NiceGUI, AdonisJS, Langflow) for additional bypass techniques.
  **Verification:** Attack vector inventory documented.

- [ ] P0-SEC-5.0.5 (AGENT): Design the `sanitizeFilename` API and test cases.
  **Verification:** API design and test plan documented.

- [ ] P0-SEC-5.1 (AGENT): Create `apps/web/src/server/storage/validation.ts` with `sanitizeFilename()` implementing all sanitization rules.
  **File(s):** `apps/web/src/server/storage/validation.ts` (new)
  **Verification:** Function sanitizes according to all rules.

- [ ] P0-SEC-5.2 (AGENT): Write unit tests covering: `../` traversal, URL‑encoded traversal, null bytes, control characters, unsafe characters, leading dots, length limits, Unicode bypass attempts.
  **File(s):** `apps/web/src/server/storage/validation.test.ts` (new)
  **Verification:** All tests pass; attack payloads correctly rejected.

- [ ] P0-SEC-5.3 (HUMAN): Review sanitization rules, verify against CVE‑2026‑34750 advisory, approve.
  **Verification:** Approved.

---

### [ ] P0-SEC-6: Supply‑chain hardening — pin pnpm, add `pnpm audit` to CI, configure Dependabot weekly, document `minimumReleaseAge` trade‑off

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** The workspace uses pnpm (pinned to v10.33.3 via P0‑FOUND‑1) and has a lockfile (`pnpm-lock.yaml`). However, there is no `pnpm audit` step in CI, no Dependabot configuration, and `minimumReleaseAge` is not configured in `pnpm-workspace.yaml`. The project is vulnerable to supply‑chain attacks that could introduce malicious packages via new dependency versions.
**Size:** Medium

**Description:**
Implement a three‑layer supply‑chain security strategy:

**(a) `pnpm audit` in CI**: Add a step to `.github/workflows/ci.yml` that runs `pnpm audit --audit-level critical --prod` and fails the build on critical vulnerabilities. Use `--ignore-unfixable` to skip vulnerabilities without patches. Add `auditConfig.ignoreCves` to `pnpm-workspace.yaml` for known‑safe exceptions with documentation for each.

**(b) Dependabot configuration**: Create `.github/dependabot.yml` with:
- `package-ecosystem: "npm"` (pnpm uses npm ecosystem for Dependabot)
- `directory: "/"` (root workspace)
- `schedule: { interval: "weekly" }`
- `open-pull-requests-limit: 5`
- `versioning-strategy: increase` (lockfile‑only updates)
- `labels: ["dependencies"]`
- Group updates by type: security updates, minor/patch updates, major updates

**(c) `minimumReleaseAge`**: Configure `minimumReleaseAge: 1440` (1 day = 1440 minutes) in `pnpm-workspace.yaml`. This delays adoption of newly published package versions — since malware is typically detected and removed within hours, a 24‑hour delay prevents most supply‑chain attacks. Document the trade‑off in `docs/adr/018-turbo-watch-remote-cache.md` (or a new ADR): faster updates vs supply‑chain safety. This feature requires pnpm ≥10.16 (confirmed: pnpm v10.33.3 installed).

**(d) `blockExoticSubdeps`**: Set `blockExoticSubdeps: true` in `pnpm-workspace.yaml` to prevent transitive dependencies from using non‑registry sources (git repos, direct tarball URLs).

**Research Findings (2026‑05‑06):**
- pnpm v11 defaults `minimumReleaseAge` to 1440 (1 day) — in v10, it must be configured manually
- pnpm's own supply‑chain security guide recommends `minimumReleaseAge`, `blockExoticSubdeps`, and `allowBuilds`
- The Axios supply‑chain attack (April 2026) lacked `minimumReleaseAge`, allowing malicious code to spread before detection
- `pnpm audit --fail-on-critical` combined with Dependabot creates a layered defense: Dependabot opens update PRs, CI audit blocks merges if vulnerabilities remain
- Dependabot cooldown adds delay before suggesting new package versions — a complementary protection

**Depends on:**
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-1` (pnpm version pinned)
- `tasks/infrastructure/P0-FOUND.md → P0-FOUND-4` (pnpm v11 migration path documented)

**Blocks:** [N/A]

**Related Files:**
- `.github/workflows/ci.yml` (add audit step)
- `.github/dependabot.yml` (new)
- `pnpm-workspace.yaml` (add `minimumReleaseAge`, `blockExoticSubdeps`, `auditConfig`)
- `docs/adr/019-pnpm-migration.md` (reference `minimumReleaseAge` decision)

**Definition of Done**
- [ ] `pnpm audit --audit-level critical --prod` step added to CI workflow, fails build on critical vulnerabilities
- [ ] `.github/dependabot.yml` created with weekly schedule, limit 5 PRs, appropriate labels
- [ ] `minimumReleaseAge: 1440` configured in `pnpm-workspace.yaml`
- [ ] `blockExoticSubdeps: true` configured in `pnpm-workspace.yaml`
- [ ] `auditConfig.ignoreCves` configured with documented exceptions (if any)
- [ ] `minimumReleaseAge` trade‑off documented (in ADR or a new section in the migration ADR)
- [ ] Manual test: new version of a dependency published <24h ago is not installed by `pnpm install`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- `trustPolicy` configuration (pnpm v10+; evaluates publisher trust — deferred as advanced hardening)
- `allowBuilds` migration to v11 format (deferred until pnpm v11 upgrade)
- Socket.dev / Snyk integration (external tools; optional)

**Rules to Follow**
- `minimumReleaseAge` must not block security patches — configure exclusions via `minimumReleaseAgeExclude` for critical CVEs
- CI audit must never silently skip — use `--ignore-registry-errors: false` (default)
- Dependabot must not be treated as a replacement for `pnpm audit` — they solve different problems (proactive updates vs gatekeeping)
- Document every exception in `auditConfig.ignoreCves` with a reason

**Verification**
```bash
# Verify pnpm audit in CI
pnpm audit --audit-level critical --prod
# Expected: exit code 0 if no critical vulnerabilities

# Verify minimumReleaseAge
# 1. Note a package published recently (<24h)
# 2. Run pnpm install
# 3. Verify older version installed (not the newest)

# Verify Dependabot config
cat .github/dependabot.yml

# Verify CI step exists
grep "pnpm audit" .github/workflows/ci.yml

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

#### Subtasks

- [ ] P0-SEC-6.0.25 (AGENT): Read current `pnpm-workspace.yaml`, CI workflow, and research pnpm supply‑chain security features.
  **Verification:** Current state and best practices documented.

- [ ] P0-SEC-6.0.5 (AGENT): Research `minimumReleaseAge` trade‑offs, Dependabot vs Renovate, and layered supply‑chain security.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-SEC-6.1 (AGENT): Add `pnpm audit --audit-level critical --prod` step to CI workflow.
  **File(s):** `.github/workflows/ci.yml`
  **Verification:** CI fails on critical vulnerabilities.

- [ ] P0-SEC-6.2 (AGENT): Create `.github/dependabot.yml` with weekly schedule and grouping.
  **File(s):** `.github/dependabot.yml` (new)
  **Verification:** Dependabot opens PRs for outdated dependencies.

- [ ] P0-SEC-6.3 (AGENT): Configure `minimumReleaseAge: 1440` and `blockExoticSubdeps: true` in `pnpm-workspace.yaml`.
  **File(s):** `pnpm-workspace.yaml`
  **Verification:** `pnpm install` delays new packages.

- [ ] P0-SEC-6.4 (AGENT): Configure `auditConfig.ignoreCves` with documented exceptions.
  **File(s):** `pnpm-workspace.yaml`
  **Verification:** Exceptions documented with rationale.

- [ ] P0-SEC-6.5 (HUMAN): Review supply‑chain security configuration, approve trade‑offs.
  **Verification:** Approved.

---

### [ ] P0-SEC-7: CSRF protection for tRPC — set `SameSite=Strict` on auth cookies, add custom header check middleware

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** P0‑AUTH‑1 configured Better Auth session cookies with `SameSite: "Lax"` (OAuth‑safe default). No CSRF‑specific middleware exists for tRPC. The `application/json` content type used by tRPC triggers CORS preflight, which provides natural CSRF protection for cross‑origin requests — but same‑origin CSRF vectors (e.g., malicious forms on the same domain) could still bypass this. A custom header check middleware is recommended as defense‑in‑depth.
**Size:** Small

**Description:**
Implement a two‑layer CSRF defense for tRPC endpoints:

**(a) Cookie hardening**: Review the Better Auth session cookie configuration. For a SaaS application where OAuth is not yet enabled (P1‑AUTH‑1), `SameSite=Strict` is appropriate and provides the strongest CSRF protection. `Strict` prevents the browser from sending cookies on any cross‑site request, including top‑level navigations. If OAuth providers require `Lax` for redirect flows, keep `Lax` — it still blocks cross‑site POST requests (the CSRF vector). The `Secure` attribute must be set in production (already configured in P0‑AUTH‑1). Ensure `HttpOnly` prevents JavaScript access to the session cookie.

**(b) Custom header middleware**: Create `apps/web/src/server/trpc/middleware/csrf.ts` that verifies a custom header (e.g., `x-csrf-token`) is present on all mutation requests. The browser's Same-Origin Policy prevents cross‑origin JavaScript from setting custom headers. If the header is absent, the request likely originated from a cross‑origin `<form>` or similar CSRF vector — reject with `TRPCError({ code: 'FORBIDDEN' })`. The token value can be a constant derived from the session (or a value sent from the server). For Phase 0, simply check for the header's presence — the token's value is secondary to the defense (the core defense is that cross‑origin scripts cannot set custom headers at all).

**(c) Client‑side**: Configure the tRPC client (`apps/web/src/lib/trpc/client.ts`) to include `x-csrf-token: '1'` (or a session‑derived value) in every request. This is a one‑line change.

**Why not CSRF tokens in cookies?** The custom header approach is simpler for SPAs and avoids the complexity of token generation, storage, and double‑submit cookie patterns. Combined with `SameSite=Strict` and the `application/json` preflight, it provides three layers of CSRF defense.

**Research Findings (2026‑05‑06):**
- CSRF for JSON APIs: custom header defense is well‑suited for AJAX/API endpoints
- SameSite=Strict on session cookies provides the strongest browser‑level CSRF protection
- `application/json` content type triggers CORS preflight, blocking cross‑origin writes
- CSRF protection is about write protection; CORS is about read protection — both are needed
- The `x-csrf-token` custom header check is a standard pattern for SPAs

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-1` (session cookie configuration)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/server/trpc/middleware/csrf.ts` (new)
- `apps/web/src/lib/trpc/client.ts` (add `x-csrf-token` header)
- `packages/auth/src/index.ts` (verify `sameSite` setting)

**Definition of Done**
- [ ] Better Auth session cookie `sameSite` verified as `"Strict"` (or `"Lax"` if OAuth requires)
- [ ] `apps/web/src/server/trpc/middleware/csrf.ts` created: checks for `x-csrf-token` header on mutations
- [ ] Missing header returns `FORBIDDEN` error
- [ ] CSRF middleware added to `tenantProcedure` chain (after auth, before procedure execution)
- [ ] tRPC client configured to include `x-csrf-token: '1'` in all requests
- [ ] GET/query procedures are exempt (CSRF only applies to state‑changing mutations)
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- CSRF token rotation or per‑session token values (deferred; presence check is sufficient for Phase 0)
- Double‑submit cookie pattern (unnecessary when custom header defense is in place)

**Rules to Follow**
- CSRF middleware must only check mutations (`type === 'mutation'`) — queries are safe
- The custom header check must run after auth middleware (to know the user) but before the mutation executes
- The `x-csrf-token` value is not secret — the defense is that cross‑origin scripts cannot set custom headers, not that the token value is unpredictable
- Do not reject requests missing the header in development mode (convenience for API testing)

**Verification**
```bash
# Test CSRF protection
# 1. Send a mutation without x-csrf-token header
curl -X POST http://localhost:3000/api/trpc/crm.createLead \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ..." \
  -d '{"name": "Test Lead"}'
# Expected: FORBIDDEN (missing x-csrf-token)

# 2. Send a mutation with x-csrf-token
curl -X POST ... \
  -H "x-csrf-token: 1" \
  ...
# Expected: success

# 3. Send a query without x-csrf-token
curl http://localhost:3000/api/trpc/crm.listLeadBoard?input={}
# Expected: success (queries exempt)

# Verify client includes header
grep "x-csrf-token" apps/web/src/lib/trpc/client.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a security architect, I want CSRF protection on all mutation endpoints so that malicious websites cannot perform actions on behalf of authenticated users.
- Deep Module: The CSRF middleware encapsulates cross‑origin request verification behind a simple header check, making CSRF protection transparent to individual procedure implementations.

---

#### Subtasks

- [ ] P0-SEC-7.0.25 (AGENT): Read current Better Auth session cookie configuration. Research CSRF protection patterns for SPAs with tRPC.
  **Verification:** Current configuration and best practices documented.

- [ ] P0-SEC-7.0.5 (AGENT): Research custom header CSRF defense, SameSite cookie attributes, and tRPC‑specific considerations.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-SEC-7.1 (AGENT): Verify and harden Better Auth cookie `sameSite` setting (`Strict` or `Lax` as appropriate).
  **File(s):** `packages/auth/src/index.ts`
  **Verification:** Cookie has correct `sameSite` value.

- [ ] P0-SEC-7.2 (AGENT): Create `apps/web/src/server/trpc/middleware/csrf.ts` with custom header check on mutations.
  **File(s):** `apps/web/src/server/trpc/middleware/csrf.ts` (new)
  **Verification:** Mutations without header rejected.

- [ ] P0-SEC-7.3 (AGENT): Add CSRF middleware to `tenantProcedure` chain in `init.ts`.
  **File(s):** `apps/web/src/server/trpc/init.ts`
  **Verification:** All tenant‑scoped mutations protected.

- [ ] P0-SEC-7.4 (AGENT): Configure tRPC client to include `x-csrf-token` header.
  **File(s):** `apps/web/src/lib/trpc/client.ts`
  **Verification:** Browser requests include the header.

- [ ] P0-SEC-7.5 (HUMAN): Test CSRF protection with and without header, verify queries are exempt. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑SEC group are covered.*

---