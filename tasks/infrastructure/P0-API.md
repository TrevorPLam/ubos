# tasks/infrastructure/P0-API.md – API Versioning & Governance

This file covers the API versioning strategy definition (URL‑based `/api/v{N}/`), `Sunset` and `Deprecation` header middleware implementation per RFC 8594 and RFC 9745 for graceful endpoint lifecycle management, an `oasdiff`‑based OpenAPI breaking change detection step in CI, and extending the Speakeasy SDK generation pipeline to support versioned publishing. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑API (2026‑05‑06)

### 1. The 2026 Consensus on API Versioning Strategy

URL‑path versioning (`/api/v1/resource`) is the **consensus recommendation across every 2026 source**. The 2026‑03‑13 Apidog guide states unequivocally: "URL versioning (/v1/pets) is the most practical API versioning strategy for most teams. It's visible, cacheable, and easy to test." The 2026‑03‑21 Production Guide confirms: "Start with URL path versioning. It is explicit, debuggable, and every developer understands it. Move to date‑based versioning when you need fine‑grained control. Avoid query parameters." This is further validated by a 2026‑02‑26 Tech Leads Guide and the 2026‑04‑06 microservices practices article. 

**Stripe's date‑based versioning** (e.g., `Stripe‑Version: 2026‑03‑25.dahlia`) is widely recognized as "the gold standard" but requires more sophisticated infrastructure — each API key is pinned to the version at creation time, and clients upgrade by changing a header. "Stripe's API versioning is the gold standard: clients pin to a version; breaking changes are released as new versions; old versions are supported for years." For UBOS Phase 0, URL‑based versioning (`/api/v1/*`) is the pragmatic choice, with a documented path to date‑based versioning if needed in Phase 2+.

**The recommended pattern**: Move current routes to `/api/v1/*`. Keep `/api/*` as an alias for the latest version (backward compatibility). When breaking changes are needed, create `/api/v2/*` alongside v1. Support N‑1 versions minimum with a 6+ month migration window. Include migration guides with code examples and monitor version usage to inform deprecation timelines. 

### 2. Deprecation and Sunset Headers — RFC 8594 & RFC 9745

Two RFCs govern API deprecation signaling:

- **RFC 8594 — The Sunset HTTP Header Field**: Defines the `Sunset` header, which specifies the date/time after which a resource becomes undefined. Format: an HTTP‑date (e.g., `Sunset: Sat, 01 Jun 2026 00:00:00 GMT`). 
- **RFC 9745 — The Deprecation HTTP Response Header Field**: Defines the `Deprecation` header, which signals that a resource is or will be deprecated. Format: `@<unix-timestamp>` (e.g., `Deprecation: @1735689600`) or the string `true` when no specific date is given. 

**Critical format difference**: The two headers use different timestamp formats. "Because of reasons, the timestamps in these two header fields are using a different format." `Sunset` uses HTTP‑date (human‑readable), `Deprecation` uses Unix timestamp prefixed with `@`. This is confirmed across multiple 2026 sources. 

**Lifecycle state machine** (from the 2026‑04‑12 JSR package): **active → deprecated → sunset → removed**. Minimum 6‑month sunset period for enterprise SLA. During the deprecated stage, both headers are sent. After the sunset date, behavior becomes undefined. 

**Best practice — don't return 404**: "API providers should use HTTP 200 OK with Deprecation and Sunset headers instead of 404 for deprecated endpoints. This method keeps clients operational while giving a clear warning about the need to migrate." 

### 3. `versionkit` — A Hono‑Compatible, RFC‑Compliant Versioning Library

`versionkit` (npm, v0.1.0, 2026‑02‑21) is a "framework‑agnostic API versioning with full RFC compliance" library. It supports RFC 8594 (Sunset), RFC 9745 (Deprecation), and three version extraction strategies (URL, header, accept). It explicitly works with Hono, Fastify, Express, and "any framework using Web Standards Request/Response." 

For UBOS, `versionkit` can accelerate P0‑API‑2 (deprecation middleware) by providing pre‑built middleware that automatically injects RFC‑compliant `Sunset` and `Deprecation` headers based on version lifecycle configuration. However, given its early version (0.1.0), the decision is to evaluate it for the middleware task and fall back to a custom Hono middleware if it proves insufficiently mature.

### 4. `oasdiff` — The Gold Standard for OpenAPI Spec Diffing

`oasdiff` is "the gold standard for spec diffing" with 300+ change detection rules, 1M+ downloads, and 1,100+ GitHub stars. It is free and open source. 

**Key capabilities**:
- Compares two OpenAPI spec files and reports breaking changes, deprecations, and additions
- Default output format: human‑readable text; also supports `--format json` and `--format yaml`
- `--breaking-only` flag to display breaking changes only
- `--deprecation-days` flag to warn about pending deprecations
- Exit codes: non‑zero when breaking changes detected
- GitHub Actions: both `oasdiff/oasdiff-action` (official) and `LimeFlight/openapi-diff-action` (PR comments + labels) 

**For UBOS CI**: The recommended pattern is to generate the OpenAPI spec from the `appRouter` (via `@trpc/openapi`, done in P0‑TRPC‑10), commit it to the repository, and run `oasdiff` in CI comparing the PR's spec against the base branch's spec. If breaking changes are detected, the CI build fails and a comment is posted on the PR.

### 5. Speakeasy Versioned SDK Generation

Speakeasy supports versioned SDK generation from OpenAPI specs. Key facts:
- Latest CLI version: **v1.761.1** (April 2, 2026) 
- Free tier: 1 SDK with unlimited generations in 1 language
- "speakeasy quickstart initializes a new SDK project — this is the ONLY correct command for new projects; it creates both the SDK and the essential .speakeasy/workflow.yaml configuration file" 
- SDK generation workflow automatically triggers on OpenAPI spec changes
- Supports publishing to npm, PyPI, Maven Central, and other package registries

**Versioned publishing**: When UBOS introduces `/api/v2/*`, the OpenAPI spec can be versioned per major version. Speakeasy generates separate SDK packages or a single SDK that handles version switching. The SDK versioning can mirror the API versioning (`@ubos/sdk@1.x` for v1 API, `@ubos/sdk@2.x` for v2 API).

---

## Task Definitions

### [ ] P0-API-1: Define API versioning strategy (URL‑based `/api/v{N}/`)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P0‑TRPC‑10 generated an OpenAPI spec at `/api/v1/openapi.json`, but this is a nominal version — there is no formal versioning strategy, no versioned route structure, no `/api/*` alias for backward compatibility, and no documented versioning policy. The existing tRPC routes are served at `/api/trpc/*` without version prefix. The REST compatibility routes from CRM (`/api/crm/leads`, `/api/rest/crm/leads`) lack versioning entirely. There is no plan for how breaking changes will be introduced across API versions.
**Size:** Medium

**Description:**
Define and document UBOS's formal API versioning strategy. This is the governance foundation that every API change will reference. The strategy covers version identification, routing structure, backward‑compatibility guarantees, deprecation policy, and migration support.

**(a) Strategy document**: Create `docs/api/versioning.md` with the following sections:

**Versioning method**: URL‑path versioning (`/api/v{major}/*`). This is chosen per the 2026 consensus: "URL versioning is the most practical API versioning strategy for most teams. It's visible, cacheable, and easy to test." Major version only (v1, v2, v3). Minor and patch changes must be backward‑compatible within a major version.

**Routing structure**:
- All API routes live under `/api/v1/*` (tRPC, REST, webhook endpoints)
- `/api/*` (without version prefix) serves as an alias for the latest stable version — this ensures backward compatibility for existing consumers
- When v2 is introduced: `/api/v1/*` continues serving v1 behavior, `/api/v2/*` serves new behavior, `/api/*` points to v2 (latest)
- Each version has its own OpenAPI spec: `/api/v1/openapi.json`, `/api/v2/openapi.json`

**Backward‑compatibility guarantees**: Within a major version (v1), changes are additive only. Breaking changes require a new major version (v2). Breaking changes include: removing or renaming fields, changing field types, changing response structure, modifying URL patterns, changing authentication methods. Additive changes (new endpoints, new optional fields, new query parameters) are safe within a version.

**Version lifecycle**: active → deprecated → sunset → removed. At least N‑1 versions supported at any time (current and previous major version). Minimum 6‑month deprecation period with documented migration path. During deprecation, `Sunset` and `Deprecation` headers are sent (per P0‑API‑2). After sunset date, the deprecated version returns 410 Gone. 

**(b) Route restructuring**: Move all existing API routes to `/api/v1/*`:
- tRPC: `/api/v1/trpc/*`
- REST CRM: `/api/v1/crm/leads`, `/api/v1/rest/crm/leads`
- Health: `/api/v1/health`
- Auth: `/api/v1/auth/*`
- Stripe webhook: `/api/v1/stripe/webhook`
- Email webhook: `/api/v1/email/webhook`
- Inngest: `/api/v1/inngest`
- OpenAPI: `/api/v1/openapi.json`
- Scalar docs: `/api/v1/docs`

**(c) Backward‑compatible aliases**: Keep `/api/*` as an alias that internally routes to the latest version (currently v1). This is transparent to existing consumers — no URLs break. Implement using a Hono middleware that rewrites `/api/trpc/*` to `/api/v1/trpc/*` internally.

**(d) `API-Version` response header**: Add `API-Version: v1` to all API responses so clients can programmatically determine which version they're receiving. This is in addition to the URL‑based versioning.

**(e) Webhook stability**: Pin webhook registrations to specific API versions. External callers (Stripe, Resend, Inngest) always hit a versioned endpoint (`/api/v1/stripe/webhook`). When v2 is introduced, webhook endpoints are re‑registered at `/api/v2/stripe/webhook`.

**Research Findings (2026‑05‑06):**
- "URL versioning (/v1/pets) is the most practical API versioning strategy for most teams" (2026‑03‑13)
- "Start with URL path versioning. It is explicit, debuggable, and every developer understands it" (2026‑03‑21)
- "Support N‑1 versions minimum — Provide 6+ months migration window — Include migration guides with code examples" (2026‑04‑11)
- "Keep `/api/*` as an alias for the latest version (backwards compatibility)" (2026‑03‑02)
- Stripe's date‑based approach is the gold standard but requires more infrastructure

**Depends on:**
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-10` (OpenAPI document generated)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-5` (API handler structure)

**Blocks:**
- `tasks/infrastructure/P0-API.md → P0-API-2` (deprecation middleware)
- `tasks/infrastructure/P0-API.md → P0-API-3` (OpenAPI diff CI)

**Related Files:**
- `docs/api/versioning.md` (new)
- `apps/web/src/server/api.ts` (add version prefixes and aliases)
- `apps/web/src/server/trpc/init.ts` (update base path)
- `apps/web/wrangler.jsonc` (update webhook URLs if needed)

**Definition of Done**
- [ ] `docs/api/versioning.md` created with all sections: versioning method, routing structure, backward‑compatibility guarantees, version lifecycle, webhook stability
- [ ] All API routes moved to `/api/v1/*` prefix
- [ ] `/api/*` alias routes to v1 internally (backward compatible)
- [ ] `API-Version: v1` header added to all API responses
- [ ] All existing functional tests pass with versioned routes
- [ ] OpenAPI spec at `/api/v1/openapi.json` references the correct base URL
- [ ] Scalar docs at `/api/v1/docs` accessible and functional
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Implementing v2 (the infrastructure supports it but no v2 endpoints are created)
- Date‑based versioning (Stripe‑style) — deferred to Phase 2 evaluation
- Query parameter versioning (`?version=2`) — not recommended per 2026 consensus
- Client SDK version negotiation logic

**Rules to Follow**
- Major version only in URL path (`v1`, `v2`) — minor/patch changes are backward‑compatible.
- `/api/*` must always point to the latest stable version — never remove it.
- Webhook endpoints must be versioned to ensure external services (Stripe, Resend) can migrate independently.
- The `API-Version` header is informational — the URL path is the authoritative version identifier.

**Verification**
```bash
# Verify versioned endpoints respond
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/trpc/crm.listLeadBoard

# Verify backward‑compatible aliases
curl http://localhost:3000/api/health
# Expected: same response as /api/v1/health

# Verify API-Version header
curl -I http://localhost:3000/api/v1/health | grep API-Version
# Expected: API-Version: v1

# Verify docs accessible
curl http://localhost:3000/api/v1/docs

# Verify existing functional tests pass with versioned routes
pnpm test

ls docs/api/versioning.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an external API consumer, I can pin my integration to `/api/v1/*` and know that my code will continue working unchanged until I explicitly upgrade to `/api/v2/*`.

---

#### Subtasks

- [ ] P0-API-1.0.25 (AGENT): Read current `apps/web/src/server/api.ts` route structure and P0‑TRPC‑10 output. Research URL‑based API versioning strategies and best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-API-1.0.5 (AGENT): Inventory all existing API routes and their consumers (tRPC, REST, webhooks, health, auth, Inngest).
  **Verification:** Route inventory documented.

- [ ] P0-API-1.1 (AGENT): Write `docs/api/versioning.md` with all sections.
  **File(s):** `docs/api/versioning.md` (new)
  **Verification:** Document covers all required topics.

- [ ] P0-API-1.2 (AGENT): Refactor `api.ts` to support `/api/v1/*` route prefix and `/api/*` backward‑compatible aliases.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Both `/api/v1/health` and `/api/health` return identical responses.

- [ ] P0-API-1.3 (AGENT): Add `API-Version: v1` header middleware to all responses.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** All API responses include the header.

- [ ] P0-API-1.4 (AGENT): Update tRPC base path, webhook endpoints, and OpenAPI spec references.
  **File(s):** `apps/web/src/server/trpc/init.ts`, `apps/web/src/server/api.ts`, webhook route files
  **Verification:** All endpoints functional at v1 paths.

- [ ] P0-API-1.5 (HUMAN): Verify backward compatibility, run functional tests, approve versioning strategy.
  **Verification:** Approved.

---

### [ ] P0-API-2: Implement deprecation header injection (`Sunset`, `Deprecation`) on older endpoints

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No deprecation mechanism exists for UBOS API endpoints. When a breaking change is introduced (e.g., v1 → v2) and v1 enters deprecation, there is no programmatic way to communicate this to API consumers. Clients are not warned about impending removals, sunset dates are not advertised, and there is no migration path signaling. Without deprecation headers, API consumers discover breaking changes through production failures.
**Size:** Small

**Description:**
Build a deprecation middleware for the Hono API that injects RFC 8594 (`Sunset`) and RFC 9745 (`Deprecation`) response headers on deprecated API endpoints. This enables programmatic communication of the deprecation timeline to API consumers (SDKs, webhook handlers, third‑party integrations).

**(a) Deprecation middleware**: Create `apps/web/src/server/api/middleware/deprecation.ts` — a Hono middleware that can be applied to specific route groups or individual routes. The middleware accepts a configuration object:
```typescript
interface DeprecationConfig {
  deprecatedAt?: Date;    // when deprecation started (for Deprecation header)
  sunsetAt: Date;         // when the endpoint will be removed (for Sunset header)
  replacement?: string;   // URL of the replacement endpoint (for Link header)
  docs?: string;          // URL of migration documentation
}
```

**(b) Header injection**: Based on the config, the middleware injects:
- **`Deprecation` header**: Format `@<unix-timestamp>` (per RFC 9745). If `deprecatedAt` is in the past, value is `true`. If a future date, value is `@<future_timestamp>`. 
- **`Sunset` header**: Format `<HTTP-date>` (per RFC 8594). Always the planned removal date. 
- **`Link` header**: If `replacement` is provided, adds `Link: <replacement-url>; rel="successor-version"`. If `docs` is provided, adds `Link: <docs-url>; rel="deprecation"`.

**Critical format note**: `Deprecation` uses Unix timestamp with `@` prefix (`@1735689600`). `Sunset` uses HTTP‑date (`Sat, 01 Jun 2026 00:00:00 GMT`). These formats MUST NOT be swapped. 

**(c) Route‑level application**: Apply the middleware to specific version group handlers. When v2 is introduced and v1 enters deprecation, the v1 route group gets the deprecation middleware:
```typescript
const v1Deprecation = deprecationMiddleware({
  deprecatedAt: new Date('2026-06-01'),
  sunsetAt: new Date('2026-12-01'),
  replacement: '/api/v2',
  docs: 'https://docs.ubos.app/api/migration/v1-to-v2',
});

app.use('/api/v1/*', v1Deprecation);
```

**(d) No 404 for deprecated endpoints**: Following the 2026‑01‑08 best practice: "API providers should use HTTP 200 OK with Deprecation and Sunset headers instead of 404 for deprecated endpoints." The middleware adds headers to the response but does not block or modify the response body. The endpoint continues to function normally.

**(e) `versionkit` evaluation**: Evaluate `versionkit` (v0.1.0, 2026‑02‑21) as a potential implementation accelerator. If it meets UBOS's requirements (Hono compatibility, RFC‑compliant header injection, version lifecycle management), use it. If it is insufficiently mature for production use, implement a custom middleware. Document the evaluation decision. 

**Research Findings (2026‑05‑06):**
- RFC 8594: `Sunset: Sat, 01 Jun 2026 00:00:00 GMT` 
- RFC 9745: `Deprecation: @1735689600` (Unix timestamp with `@` prefix) or `true` 
- "The timestamps in these two header fields are using a different format" 
- Lifecycle: active → deprecated → sunset → removed (6‑month minimum sunset period) 
- "API providers should use HTTP 200 OK with Deprecation and Sunset headers instead of 404 for deprecated endpoints" 
- `versionkit` v0.1.0: framework‑agnostic, Hono‑compatible, full RFC compliance 

**Depends on:**
- `tasks/infrastructure/P0-API.md → P0-API-1` (versioning strategy and v1 route structure)

**Blocks:**
- Phase 2 v2 API introduction (when v1 will need deprecation headers)

**Related Files:**
- `apps/web/src/server/api/middleware/deprecation.ts` (new)
- `apps/web/src/server/api.ts` (apply middleware to version groups)

**Definition of Done**
- [ ] `apps/web/src/server/api/middleware/deprecation.ts` created with RFC 8594 and RFC 9745 compliant header injection
- [ ] Middleware accepts `DeprecationConfig`: `deprecatedAt`, `sunsetAt`, `replacement`, `docs`
- [ ] `Deprecation` header format: `@<unix-timestamp>` (RFC 9745)
- [ ] `Sunset` header format: `<HTTP-date>` (RFC 8594)
- [ ] `Link` header with `rel="successor-version"` and `rel="deprecation"` when configured
- [ ] Middleware adds headers but does NOT block or modify the response (200 OK with headers)
- [ ] `versionkit` evaluation documented in code comments or a brief decision note
- [ ] At least one test route configured with deprecation middleware (for future v1 deprecation)
- [ ] Unit tests: verify header formats, verify response body unchanged, verify 200 status
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Automatic sunset enforcement (blocking requests after sunset date) — deferred to Phase 2
- Per‑API‑key sunset grace periods
- Usage monitoring for deprecated endpoints (Phase 3)
- Client SDK deprecation detection logic (SDK consumers read headers independently)

**Rules to Follow**
- `Deprecation` and `Sunset` format must be exactly per RFC 9745 and RFC 8594 — do not invent custom formats.
- The middleware must never modify the response body — only add response headers.
- Deprecated endpoints must continue to function normally — the headers are warnings, not blocks.
- The `sunsetAt` date must always be after the `deprecatedAt` date.

**Verification**
```bash
# Verify deprecation headers on a deprecated route
curl -I http://localhost:3000/api/v1/test-deprecated
# Expected headers:
# Deprecation: @<unix-timestamp> or Deprecation: true
# Sunset: Sat, 01 Jun 2026 00:00:00 GMT
# Link: <https://docs.ubos.app/api/migration>; rel="deprecation"

# Verify response body unchanged
curl http://localhost:3000/api/v1/test-deprecated
# Expected: normal response body with 200 OK

# Run unit tests
pnpm test -- apps/web/src/server/api/middleware/deprecation.test.ts

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an API consumer, I receive `Sunset` and `Deprecation` headers on deprecated endpoints so that my SDK can automatically warn me and I can plan my migration before the endpoint is removed.

---

#### Subtasks

- [ ] P0-API-2.0.25 (AGENT): Read P0‑API‑1 output (`docs/api/versioning.md`). Research RFC 8594 and RFC 9745 header formats and `versionkit` library.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-API-2.0.5 (AGENT): Evaluate `versionkit` v0.1.0 against UBOS requirements. Document decision.
  **Verification:** Decision documented.

- [ ] P0-API-2.1 (AGENT): Create `apps/web/src/server/api/middleware/deprecation.ts` with RFC‑compliant header injection.
  **File(s):** `apps/web/src/server/api/middleware/deprecation.ts` (new)
  **Verification:** Middleware adds correct header formats.

- [ ] P0-API-2.2 (AGENT): Write unit tests verifying header formats, response body preservation, and 200 status.
  **File(s):** `apps/web/src/server/api/middleware/deprecation.test.ts` (new)
  **Verification:** Tests pass.

- [ ] P0-API-2.3 (AGENT): Configure a test deprecated route to validate middleware integration.
  **File(s):** `apps/web/src/server/api.ts`
  **Verification:** Test route returns deprecation headers.

- [ ] P0-API-2.4 (HUMAN): Verify RFC compliance, test header output, approve.
  **Verification:** Approved.

---

### [ ] P0-API-3: Add OpenAPI diff step to CI to detect breaking changes

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No automated detection of breaking API changes exists in the CI pipeline. Developers can modify tRPC procedures (add/remove fields, change types) without realizing they've introduced a breaking change to the OpenAPI contract. The OpenAPI spec is generated automatically from tRPC routers (P0‑TRPC‑10), but the spec is not checked against the previous version for backward compatibility. "Catching breaking changes before merge seems worth the 30‑second CI step." 
**Size:** Small

**Description:**
Create a GitHub Actions workflow step (or extend the existing CI workflow) that runs `oasdiff` to compare the OpenAPI spec from the PR branch against the base branch and fails the build if breaking changes are detected.

**(a) OpenAPI spec committed to repository**: The auto‑generated OpenAPI spec (from P0‑TRPC‑10, served at `/api/v1/openapi.json`) must be committed to the repository — not just served at runtime. Add a CI step (or pre‑commit hook) that regenerates the spec and commits it alongside the code changes. The spec lives at `apps/web/openapi/v1.json`. When v2 is introduced, `apps/web/openapi/v2.json` is added.

**(b) `oasdiff` installation and usage**: `oasdiff` is a Go binary available via Homebrew (`brew install oasdiff`) or direct download. It can also run via Docker (`docker run --rm -v $(pwd):/specs tufin/oasdiff`). For CI, use the `oasdiff/oasdiff-action` GitHub Action or install it directly. The command: `oasdiff breaking base-spec.json head-spec.json --format json`.

**(c) CI workflow**: Create `.github/workflows/api-diff.yml` (or extend `.github/workflows/ci.yml`) that:
1. Checks out both the PR branch (HEAD) and the base branch (BASE)
2. Locates the OpenAPI spec in each checkout: `base/apps/web/openapi/v1.json` and `head/apps/web/openapi/v1.json`
3. Runs `oasdiff breaking base-spec.json head-spec.json --format json`
4. If `oasdiff` returns exit code non‑zero (breaking changes detected), the build fails
5. A comment is posted on the PR with the breaking changes report

**(d) PR comment integration**: Use the `LimeFlight/openapi-diff-action` GitHub Action which automatically posts a PR comment with the backward compatibility report and adds a label (`major`, `minor`, or `patch`) to the PR. This gives reviewers immediate visibility into the API impact. The action requires both spec files, a `github-token`, and an `output-path`. 

**(e) Exception handling**: Some breaking changes are intentional and planned (e.g., v2 introduction). In these cases, the `oasdiff` check can be bypassed by adding a `[skip-api-check]` flag in the PR description or commit message. Document this in the API versioning guide.

**(f) Adoption of PR comment labels**: The `LimeFlight/openapi-diff-action` automatically adds a label to the PR (`major`, `minor`, `patch`). "When running on pull_request events, a label will also be added to the PR with the classification (major, minor, or patch) of the diff." This classification helps teams understand the impact scope without examining the full diff.

**Research Findings (2026‑05‑06):**
- oasdiff: 300+ change detection rules, 1M+ downloads, free, open source 
- "The gold standard for spec diffing. If you maintain OpenAPI specs and want CI guardrails, start here." 
- LimeFlight/openapi-diff-action: automatic PR comments with breaking change reports + labels 
- oasdiff exit codes: 0 (no changes / compatible), 1 (error), 102–105 (breaking changes) 
- "Catching breaking changes before merge seems worth the 30-second CI step" (2026‑03‑15) 
- "Run spec diffing on every PR. Tools like oasdiff compare spec versions and flag breaking changes" (2026‑04‑14) 

**Depends on:**
- `tasks/infrastructure/P0-API.md → P0-API-1` (versioning strategy and spec location)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-10` (OpenAPI spec generation)

**Blocks:** [N/A]

**Related Files:**
- `.github/workflows/api-diff.yml` (new)
- `apps/web/openapi/v1.json` (committed to repo)
- `docs/api/versioning.md` (update with CI check instructions)

**Definition of Done**
- [ ] OpenAPI spec (`apps/web/openapi/v1.json`) regenerated and committed to the repository
- [ ] `.github/workflows/api‑diff.yml` created: checks out both branches, runs `oasdiff breaking`, posts PR comment
- [ ] CI build fails when a PR introduces breaking changes to v1 spec without explicit bypass
- [ ] PR comment posted with breaking changes report and classification label
- [ ] `[skip-api-check]` bypass mechanism documented
- [ ] Test: create a PR that removes a field from a CRM endpoint → CI fails with breaking change report
- [ ] Test: create a PR that adds a new optional field → CI passes
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Checking v2 spec (when v2 is introduced, add a separate check)
- Runtime spec‑to‑reality monitoring (live API vs spec comparison — Phase 3)
- Spec diff for non‑OpenAPI endpoints (tRPC native endpoints)
- `oasdiff` as a pre‑commit hook (CI is sufficient; pre‑commit would add latency)

**Rules to Follow**
- The OpenAPI spec must be committed to the repository — it is the source of truth for API contracts.
- The spec must be regenerated whenever tRPC procedure signatures change.
- Breaking changes must be intentional and documented — never allow accidental breaking changes to merge silently.
- The `[skip-api-check]` bypass must be audited — use it sparingly and only for planned major version bumps.

**Verification**
```bash
# Test breaking change detection
# 1. Modify a CRM procedure to remove a response field
# 2. Regenerate the OpenAPI spec
# 3. Open a PR
# Expected: CI fails, PR comment lists breaking change

# Test compatible change
# 1. Add a new optional field to a CRM procedure
# 2. Regenerate the spec
# 3. Open a PR
# Expected: CI passes

# Verify bypass
# 1. Add [skip-api-check] to PR description
# 2. CI skips oasdiff check

ls .github/workflows/api-diff.yml
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an API designer, I want every PR checked for breaking API changes so that I never accidentally break the contract my API consumers depend on.

---

#### Subtasks

- [ ] P0-API-3.0.25 (AGENT): Read P0‑TRPC‑10 output. Research `oasdiff` CLI, GitHub Action, and PR comment integration.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-API-3.0.5 (AGENT): Research `LimeFlight/openapi-diff-action` configuration, `oasdiff/oasdiff-action`, and CI patterns for multi‑branch spec comparison.
  **Verification:** Action configuration documented.

- [ ] P0-API-3.1 (AGENT): Regenerate and commit `apps/web/openapi/v1.json`.
  **File(s):** `apps/web/openapi/v1.json` (commit to repo)
  **Verification:** Spec file present in repository.

- [ ] P0-API-3.2 (AGENT): Create `.github/workflows/api‑diff.yml` with `oasdiff breaking` check and PR comment.
  **File(s):** `.github/workflows/api‑diff.yml` (new)
  **Verification:** Workflow triggers on PR events.

- [ ] P0-API-3.3 (AGENT): Test with breaking change PR and compatible change PR.
  **Verification:** Breaking change fails CI; compatible change passes.

- [ ] P0-API-3.4 (AGENT): Document `[skip-api-check]` bypass in `docs/api/versioning.md`.
  **File(s):** `docs/api/versioning.md`
  **Verification:** Bypass mechanism documented.

- [ ] P0-API-3.5 (HUMAN): Review CI workflow, test breaking/compatible changes, approve.
  **Verification:** Approved.

---

### [ ] P0-API-4: Generate and publish versioned SDKs automatically

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** P0‑DX‑2 set up Speakeasy SDK generation from the UBOS OpenAPI spec with a CI pipeline. However, the SDK generation is not version‑aware — it always generates from the latest spec. When UBOS introduces v2 of the API (with `/api/v2/*` endpoints and a separate `openapi/v2.json` spec), the SDK generation pipeline must support generating separate SDK versions that correspond to API versions.
**Size:** Small

**Description:**
Extend the Speakeasy SDK generation pipeline (from P0‑DX‑2) to support versioned SDK publishing. The SDK versioning strategy mirrors the API versioning strategy (`@ubos/sdk@1.x` for v1 API, `@ubos/sdk@2.x` for v2 API).

**(a) SDK versioning strategy** (documented in `docs/api/versioning.md`):

| API Version | SDK Package | SDK Version | Source Spec |
|---|---|---|---|
| v1 | `@ubos/sdk` | 1.x (latest) | `openapi/v1.json` |
| v2 | `@ubos/sdk` | 2.x (latest) | `openapi/v2.json` |

When only v1 exists, `@ubos/sdk@1.x` is the default. When v2 is introduced, `@ubos/sdk@2.x` is published alongside v1. `npm install @ubos/sdk` (without version) installs the latest major version (v2). Consumers pinned to v1 use `npm install @ubos/sdk@1.x`.

**(b) Multi‑spec workflow**: Extend `.github/workflows/sdk‑publish.yml` to accept a `spec-path` input parameter (default: `apps/web/openapi/v1.json`). When v2 is added, the workflow can be triggered for v2 by passing `spec-path: apps/web/openapi/v2.json`. Alternatively, create a matrix workflow that generates SDKs for all active API versions.

**(c) Speakeasy version pinning**: The `speakeasy quickstart` command generates a `.speakeasy/workflow.yaml` that includes the OpenAPI spec source. For versioned SDKs, each API version gets its own workflow configuration, pointing to the version‑specific spec file. The SDK package version is configured in the workflow or the Speakeasy dashboard.

**(d) npm dist‑tags**: When publishing versioned SDKs to npm:
- `@ubos/sdk@1.x` — published with npm dist‑tag `v1` and `latest‑1`
- `@ubos/sdk@2.x` — published with npm dist‑tag `latest` (default for new installs)
- `npm install @ubos/sdk@v1` installs the latest v1 SDK

**(e) Deprecation metadata in SDK**: When v1 enters deprecation, the v1 SDK's README and package metadata should reference the migration path. The SDK can also read the `Deprecation` and `Sunset` headers from the API and log warnings for developers.

**Research Findings (2026‑05‑06):**
- Speakeasy CLI v1.761.1 (April 2, 2026) supports automated SDK generation from OpenAPI specs
- `speakeasy quickstart` is the recommended initialization command for new SDK projects
- Speakeasy SDK comparison (2026‑04‑20): supports 9+ languages, $250/month per SDK
- Free tier: 1 SDK, unlimited generations in 1 language
- npm supports dist‑tags for version aliasing (`latest`, `v1`, `next`)
- SDK consumers should pin to a major version to avoid breaking changes

**Depends on:**
- `tasks/infrastructure/P0-DX.md → P0-DX-2` (Speakeasy SDK generation pipeline)
- `tasks/infrastructure/P0-API.md → P0-API-1` (versioning strategy)

**Blocks:** [N/A]

**Related Files:**
- `.github/workflows/sdk‑publish.yml` (extend for multi‑version support)
- `docs/api/versioning.md` (add SDK versioning section)

**Definition of Done**
- [ ] `docs/api/versioning.md` updated with SDK versioning strategy section
- [ ] `.github/workflows/sdk‑publish.yml` extended to support `spec-path` input parameter
- [ ] SDK versioning strategy documented: `@ubos/sdk@1.x` for v1, `@ubos/sdk@2.x` for v2
- [ ] npm dist‑tag strategy documented: `latest` for current version, `v1` for legacy
- [ ] When v2 is introduced: the workflow generates both SDK versions, publishes with correct dist‑tags
- [ ] CI workflow tested: generates v1 SDK from `openapi/v1.json`, publishes with correct version
- [ ] `pnpm run typecheck` passes (workflows only)

**Out of Scope**
- Generating v2 SDK (v2 API is not yet introduced — infrastructure only)
- SDK deprecation warning logic (implemented when v1 enters deprecation in Phase 2)
- Multi‑language SDK versioning (TypeScript only for Phase 0)
- SDK changelog generation (Speakeasy handles this automatically)

**Rules to Follow**
- SDK major version must correspond to API major version — `@ubos/sdk@1.x` for API v1.
- npm dist‑tags must be managed carefully — `latest` must point to the current stable version.
- Never delete an old SDK version from npm — consumers pinned to it would break.
- The SDK versioning must be documented alongside the API versioning in `docs/api/versioning.md`.

**Verification**
```bash
# Verify workflow accepts spec-path input
grep "spec-path" .github/workflows/sdk-publish.yml

# Verify SDK versioning documented
grep -A 10 "SDK Versioning" docs/api/versioning.md

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As an API consumer, I can install `@ubos/sdk@1.x` and know that my integration will not break when v2 of the API is released.

---

#### Subtasks

- [ ] P0-API-4.0.25 (AGENT): Read P0‑DX‑2 output (Speakeasy workflow). Research npm dist‑tags, Speakeasy multi‑version SDK generation, and SDK versioning best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-API-4.1 (AGENT): Update `docs/api/versioning.md` with SDK versioning section.
  **File(s):** `docs/api/versioning.md`
  **Verification:** Document covers SDK versioning strategy.

- [ ] P0-API-4.2 (AGENT): Extend `.github/workflows/sdk‑publish.yml` with `spec-path` input parameter for multi‑version support.
  **File(s):** `.github/workflows/sdk‑publish.yml`
  **Verification:** Workflow accepts spec-path input.

- [ ] P0-API-4.3 (AGENT): Document npm dist‑tag strategy (`latest`, `v1`, `v2`) in workflow and docs.
  **File(s):** `.github/workflows/sdk‑publish.yml`, `docs/api/versioning.md`
  **Verification:** Dist‑tag strategy clear.

- [ ] P0-API-4.4 (HUMAN): Review SDK versioning strategy, npm dist‑tag plan, approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑API group are covered.*

---