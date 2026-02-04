# Coverage to 100% — Work Plan

This file tracks all work needed to reach **100% coverage** across:

- `server/**/*.ts`
- `shared/**/*.ts`
- `client/src/**/*.{ts,tsx}`

Coverage is enforced by Vitest configs:

- Backend: `vitest.config.ts` (includes `server/**/*.ts`, `shared/**/*.ts`)
- Frontend: `vitest.config.client.ts` (includes `client/src/**/*.{ts,tsx}`)

---

## 0) Unblock coverage reporting (must be green first)

- [ ] **Fix `tests/backend/security.test.ts` (9 failing tests)**
  - [ ] Replace `require(...)` usages with ESM-friendly imports (`import helmet from "helmet"`, etc.) or `await vi.importMock(...)`.
  - [ ] Ensure mocks match how production code imports modules.
    - `server/security.ts` imports `./logger`, so the test should mock the same resolved module (verify with Vitest module resolution).
  - [ ] Use `vi.mocked(...)` to access `.mock.calls` safely.
  - [ ] Add assertions that verify middleware functions are installed via `app.use(...)` without depending on fragile `.mock.calls` ordering.
  - **Acceptance**: `npm run test:backend` passes.

- [ ] **Stop using invalid `--reporter=basic` in commands/docs**
  - Vitest treats unknown reporters as custom modules (current error: “Failed to load custom Reporter from basic”).
  - **Acceptance**: all documented commands use supported reporters (or omit reporter).

- [ ] **Generate an authoritative coverage report after tests pass**
  - Backend: `npm run test:backend -- --coverage`
  - Frontend: `npm run test:frontend -- --coverage`
  - **Acceptance**:
    - Coverage artifacts present (`coverage/` directory)
    - A concrete list of uncovered lines exists (use `coverage/coverage-final.json`)

---

## 1) Backend coverage to 100% (`server/**/*.ts`, `shared/**/*.ts`)

### 1.1 Security + platform middleware

- [ ] **`server/security.ts` — reach 100%**
  - [ ] `setupSecurityHeaders`
    - [ ] Verify Helmet called with expected key directives.
    - [ ] Verify “additional headers” middleware sets:
      - `X-XSS-Protection`
      - `Permissions-Policy`
  - [ ] `setupRateLimiting`
    - [ ] Verify all three limiters are created and mounted at the correct paths.
    - [ ] Verify `skip` logic for `/health` + `/api/health`.
  - [ ] `setupCORS`
    - [ ] Production path:
      - [ ] Allows only configured origins.
      - [ ] Denies when `ALLOWED_ORIGINS` missing and logs `logger.warn`.
    - [ ] Development path:
      - [ ] Allows localhost/127.0.0.1/0.0.0.0.
      - [ ] Denies other origins.
    - [ ] “Other environments” path denies.
  - [ ] `setupRequestSanitization`
    - [ ] Assert it sanitizes `req.query`, `req.body`, `req.params` (null bytes, `<script>`, `javascript:`, `on*=`).
  - [ ] `setupSecurityMiddleware`
    - [ ] Assert middleware is applied in order: CORS → headers → rate limiting → sanitization.

- [ ] **`server/csrf.ts` — verify 100%**
  - [ ] Ensure all branches for safe methods, token generation, and failure handling are tested.
  - [ ] Add tests for cookie/header interactions as implemented.

- [ ] **`server/logger.ts` — confirm 100%**
  - [ ] Verify all log levels and all formatting branches.
  - [ ] Verify production guardrails (PII redaction cannot be disabled in prod).

### 1.2 Server entry + wiring (likely requires refactor for testability)

- [ ] **`server/index.ts` — make testable and reach 100%**
  - [ ] Refactor to export a pure `createApp()` or `createServer()` that does not call `listen()`.
  - [ ] Add tests for:
    - [ ] Config validation behavior.
    - [ ] `trust proxy` configuration.
    - [ ] Middleware ordering (security before routes).
    - [ ] Error handler behavior and safe logging.
    - [ ] Static/Vite dev hosting branch behavior.

- [ ] **`server/routes.ts` — reach 100%**
  - [ ] Inventory all routes and branches.
  - [ ] Add route tests covering:
    - [ ] Happy paths and error paths.
    - [ ] Auth-required vs public routes.
    - [ ] Validation failures.
    - [ ] Multi-tenant enforcement (no cross-tenant reads/writes).
  - Note: For 100%, you may need to split large route handlers into smaller pure functions and unit test them.

### 1.3 Data / persistence

- [ ] **`server/db.ts` — reach 100%**
  - [ ] Tests for connection creation and any environment-driven branching.

- [ ] **`server/storage.ts` — reach 100%**
  - [ ] Add unit tests for all storage functions.
  - [ ] Add tests for failure modes (DB errors, not found, validation errors).
  - [ ] Ensure tenant scoping is enforced everywhere.

- [ ] **`server/session.ts` — raise from ~5% to 100%**
  - [ ] Unit tests for session cookie flags and environment-specific behavior.
  - [ ] Tests for session lifecycle flows used by auth routes.

### 1.4 Supporting modules

- [ ] **`server/config-validation.ts` — confirm 100%**
- [ ] **`server/static.ts` — reach 100%**
- [ ] **`server/vite.ts` — reach 100%**

---

## 2) Shared coverage to 100% (`shared/**/*.ts`)

- [ ] **`shared/schema.ts` — reach 100%**
  - [ ] Cover every schema branch and all transforms/refinements.
  - [ ] Ensure error formatting branches covered.

- [ ] **`shared/models/*` — reach 100%**
  - [ ] Add tests for model helpers/guards (if present).

---

## 3) Frontend coverage to 100% (`client/src/**/*.{ts,tsx}`)

### 3.1 App + routing

- [ ] **`client/src/main.tsx` — reach 100%**
- [ ] **`client/src/App.tsx` — reach 100%**
  - [ ] Route rendering branches.
  - [ ] Auth gating branches.

### 3.2 Pages

- [ ] **`client/src/pages/*` — reach 100%**
  - [ ] Empty states, error states, loading states.
  - [ ] Form validation and submission error handling.

### 3.3 Hooks + lib

- [ ] **`client/src/hooks/*` — reach 100%**
- [ ] **`client/src/lib/*` — reach 100%**
  - [ ] HTTP wrapper behavior
  - [ ] Serialization helpers
  - [ ] Error mapping utilities

### 3.4 Components

- [ ] **`client/src/components/*` — reach 100%**
  - [ ] Prioritize non-UI-library components first.
  - [ ] Avoid testing `client/src/components/ui/**/*` unless explicitly included (currently excluded by config).

---

## 4) CI + enforcement

- [ ] **Turn on strict coverage thresholds once 100% is achieved**
  - Backend + shared: enforce 100% lines/branches/functions/statements.
  - Frontend: enforce 100% lines/branches/functions/statements.

- [ ] **Ensure `npm run validate:security` is green locally and in CI**
  - Runs: `check`, backend tests, frontend tests, coverage, build, focused-test check.

---

## 5) Required validation commands (run before marking complete)

- [ ] `npm run check`
- [ ] `npm run lint`
- [ ] `npm run test:backend`
- [ ] `npm run test:frontend`
- [ ] `npm run coverage`
- [ ] `npm run build`

---

## Notes / Current blockers

- `tests/backend/security.test.ts` is currently failing due to ESM + mocking issues (`require(...)` and spy access on undefined). Coverage cannot be trusted until this file is green.
- Unknown: exact uncovered line list for many modules until coverage artifacts are generated successfully (run the commands in section 0).
