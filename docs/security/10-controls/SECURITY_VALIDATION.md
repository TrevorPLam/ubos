---
title: "Security Validation Guide"
version: "2.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Security Validation Guide

## Purpose

This document provides the single source of truth for validating security controls in the UBOS application. It defines the commands, expected outputs, and evidence artifacts that prove each control is working.

## Single Truth Command

**Command**: `npm run validate:security`

This aggregator command runs ALL security validation checks in the correct order:

```bash
npm run validate:security
```

**What it runs**:
1. Type checking (`npm run check`)
2. Backend tests (`npm run test:backend`)
3. Frontend tests (`npm run test:frontend`)
4. Coverage generation (`npm run coverage`)
5. Build verification (`npm run build`)
6. Test quality checks (`npm run security:check-tests`)

**Expected outcome**: All steps must pass with exit code 0.

**CI Alignment**: The `.github/workflows/test.yml` CI workflow calls this exact command.

## Validation Steps

### 1. Type Safety

**Command**: `npm run check`

**What it validates**:
- TypeScript compilation without errors
- Type correctness across client and server code
- No `any` types where strong typing is required

**Expected output**:
```
> rest-express@1.0.0 check
> tsc -p tsconfig.json && tsc -p tsconfig.node.json
```
(No errors = success)

**Evidence**: Clean TypeScript compilation

**Controls proven**:
- IV-4 (Memory, string, and code protection)
- CF-1 (Build process)

---

### 2. Backend Security Tests

**Command**: `npm run test:backend`

**What it validates**:
- Authentication middleware (11 tests)
- Multi-tenant isolation (15 tests)
- Security middleware (32 tests)
- Security utilities/PII redaction (32 tests)
- CSRF protection (25 tests)
- API routes (15 tests)
- Schema validation (28 tests)

**Expected output**:
```
Test Files  7 passed (7)
Tests  158 passed (158)
```

**Evidence**: All security tests passing

**Controls proven**:
- AC-1 through AC-12 (Authentication & Authorization)
- AZ-1 through AZ-6 (Authorization & Access Control)
- IV-1 through IV-7 (Input Validation)
- DP-1 through DP-9 (Data Protection)
- EL-1 through EL-9 (Error Handling & Logging)
- API-1 through API-3 (API Security)

**Key test suites**:
- `tests/backend/auth-middleware.test.ts` → AC-2, AC-5, AC-12
- `tests/backend/multi-tenant-isolation.test.ts` → AZ-3, MT1
- `tests/backend/security.test.ts` → CF-4, API-2
- `tests/backend/security-utils.test.ts` → DP-3, EL-4
- `tests/backend/csrf.test.ts` → AC-8
- `tests/backend/api-routes.test.ts` → API-1, AZ-4

---

### 3. Frontend Security Tests

**Command**: `npm run test:frontend`

**What it validates**:
- Client-side form validation
- UI component security
- XSS prevention (React escaping)

**Expected output**:
```
Test Files  N passed (N)
Tests  N passed (N)
```

**Evidence**: Frontend tests passing

**Controls proven**:
- IV-3 (Output encoding via React)
- DP-2 (Client-side data protection)

---

### 4. Coverage Generation

**Command**: `npm run coverage`

**What it validates**:
- Code coverage metrics are generated
- Coverage reports are artifact-able
- Baseline coverage is maintained

**Expected output**:
```
Coverage report generated in ./coverage/
```

**Evidence**: `coverage/lcov.info` exists and is non-empty

**Controls proven**:
- MC-4 (Secure development process)
- Documentation of test coverage

**Future**: Add thresholds (lines 70%, functions 70%, branches 70%)

---

### 5. Build Verification

**Command**: `npm run build`

**What it validates**:
- Application builds successfully for production
- No build-time errors
- Assets are properly bundled
- Tree-shaking and optimization work

**Expected output**:
```
Build completed successfully
```

**Evidence**: `dist/` directory contains compiled assets

**Controls proven**:
- CF-1 (Build process)
- MC-3 (Application integrity - partial)

---

### 6. Test Quality Checks

**Command**: `npm run security:check-tests`

**What it validates**:
- No focused tests (`.only()`) committed
- No skipped tests (`.skip()`) committed
- Test suite is complete and comprehensive

**Expected output**:
```
✓ No focused/skipped tests found
```

**Evidence**: Clean test suite without test pollution

**Controls proven**:
- MC-4 (Secure development)
- Quality assurance process

**Rationale**: Focused/skipped tests can hide failures in CI. This check ensures the full test suite runs.

---

## Evidence Index

This table maps each P0 security control to its implementation, test file, and CI job:

| Control ID | Control Name | Implementation | Test Evidence | CI Job | Status |
|------------|--------------|----------------|---------------|--------|--------|
| **Authentication & Session** |
| AC-2 | Anti-automation | server/security.ts:119-127 | tests/backend/security.test.ts | validate:security | ✅ PASS |
| AC-3 | Session timeout | server/session.ts | tests/backend/session.test.ts | validate:security | ✅ IMPL |
| AC-4 | Session termination | server/session.ts:destroySession | tests/backend/session.test.ts | validate:security | ✅ IMPL |
| AC-5 | HttpOnly cookies | server/session.ts:setSessionCookie | tests/backend/session.test.ts | validate:security | ✅ IMPL |
| AC-6 | Secure flag | server/session.ts (env-aware) | tests/backend/session.test.ts | validate:security | ✅ IMPL |
| AC-7 | SameSite attribute | server/session.ts | tests/backend/session.test.ts | validate:security | ✅ IMPL |
| AC-8 | CSRF protection | server/csrf.ts | tests/backend/csrf.test.ts (25 tests) | validate:security | ✅ PASS |
| AC-12 | Centralized auth | server/routes.ts:70-81 | tests/backend/auth-middleware.test.ts | validate:security | ✅ PASS |
| **Authorization & Access** |
| AZ-3 | Multi-tenant isolation | server/routes.ts:86-97 | tests/backend/multi-tenant-isolation.test.ts (15 tests) | validate:security | ✅ PASS |
| **Input Validation** |
| IV-1 | Allowlist validation | shared/schema.ts (Zod) | shared/schema.test.ts (28 tests) | validate:security | ✅ PASS |
| IV-2 | Serialization security | server/index.ts:35-46 (limits) | tests/backend/api-routes.test.ts | validate:security | ✅ PASS |
| IV-3 | Output encoding | React auto-escaping | client tests | validate:security | ✅ PASS |
| **Data Protection** |
| DP-3 | Sensitive data in logs | server/security-utils.ts | tests/backend/security-utils.test.ts (32 tests) | validate:security | ✅ PASS |
| DP-5 | Data access controls | server/routes.ts | tests/backend/multi-tenant-isolation.test.ts | validate:security | ✅ PASS |
| **Error Handling & Logging** |
| EL-1 | Error logging | server/index.ts:54-91 | tests/backend/api-routes.test.ts | validate:security | ✅ PASS |
| EL-2 | Error handling | server/index.ts:93-115 | tests/backend/security-utils.test.ts | validate:security | ✅ PASS |
| EL-3 | Security logging | server/index.ts (with redaction) | tests/backend/security-utils.test.ts | validate:security | ✅ PASS |
| **Communications Security** |
| CS-1 | TLS configuration | server/security.ts:41-45 | tests/backend/security.test.ts | validate:security | ⚠️ PARTIAL |
| CS-4 | Transmission confidentiality | Deployment (HTTPS) | Deployment docs | Manual | ⚠️ ASSUMED |
| **API Security** |
| API-1 | RESTful security | server/routes.ts:70-81 | tests/backend/api-routes.test.ts | validate:security | ✅ PASS |
| API-2 | RESTful input validation | shared/schema.ts | shared/schema.test.ts | validate:security | ✅ PASS |
| **Configuration** |
| CF-1 | Build process | package.json scripts | CI: npm run build | validate:security | ✅ PASS |
| CF-4 | HTTP security headers | server/security.ts:35-82 | tests/backend/security.test.ts | validate:security | ✅ PASS |
| CF-5 | Request validation | shared/schema.ts + server/security.ts | tests/backend | validate:security | ✅ PASS |

## CI Integration

### GitHub Actions Workflow

File: `.github/workflows/test.yml`

**Job Name**: Security Validation

**Steps**:
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies (`npm ci`)
4. **Run security validation** (`npm run validate:security`)
5. Run linter (continue-on-error)
6. Upload coverage to Codecov

**Success criteria**: Security validation must pass (exit 0)

**Failure handling**: 
- PR cannot merge if security validation fails
- Linter failures are non-blocking (documented as tech debt)

---

## Manual Validation Checklist

For pre-production deployments, validate these additional controls manually:

### Production Configuration

- [ ] `NODE_ENV=production` is set
- [ ] `ALLOWED_ORIGINS` environment variable is configured with explicit domain list
- [ ] `DATABASE_URL` uses TLS connection (verify with `?sslmode=require`)
- [ ] No `.env` files committed to repository
- [ ] Secrets are managed via secrets manager or environment variables

### Security Headers

Run against deployed application:

```bash
curl -I https://your-domain.com/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 0
# Content-Security-Policy: (should be present)
```

### CSRF Protection

Test CSRF enforcement:

```bash
# POST without CSRF token (should fail with 403)
curl -X POST https://your-domain.com/api/resource \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}' \
  -c cookies.txt

# Expected: 403 Forbidden with CSRF_VALIDATION_FAILED
```

### Rate Limiting

Test rate limit enforcement:

```bash
# Rapid requests to auth endpoint
for i in {1..15}; do
  curl https://your-domain.com/api/login
done

# Expected: 429 Too Many Requests after 10 requests
# Expected header: Retry-After: <seconds>
```

### Session Management

Test session timeout:

```bash
# 1. Login and get session cookie
# 2. Wait 15+ minutes (idle timeout)
# 3. Try authenticated request
# Expected: 401 Unauthorized (session expired)
```

### Log Redaction

Check production logs for sensitive data:

```bash
# Review recent logs
grep -i "password\|token\|secret\|credit.card\|ssn" production.log

# Expected: No actual sensitive values, only [REDACTED] or masked values
```

---

## Deployment Assumptions

These security controls assume the following deployment configuration:

### Required

1. **HTTPS/TLS**: Application is served over HTTPS with valid certificate
2. **Load Balancer**: Express `trust proxy` configured correctly for proxy deployment
3. **Environment Variables**:
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS="https://domain1.com,https://domain2.com"`
   - `DATABASE_URL` with TLS enabled

### Recommended

4. **Redis**: For production-ready rate limiting and session storage
5. **SIEM Integration**: For security log aggregation and alerting
6. **DDoS Protection**: At CDN/infrastructure layer
7. **Database Encryption**: Encryption at rest enabled

### Future

8. **SBOM Generation**: Software Bill of Materials for supply chain security
9. **Secret Scanning**: Automated secret detection in CI
10. **SAST Gates**: CodeQL with fail-on-high-severity

---

## Troubleshooting

### Validation Fails

**Problem**: `npm run validate:security` fails

**Diagnosis**:
1. Check which step failed (check, test:backend, test:frontend, coverage, build)
2. Run failing step individually for detailed output
3. Review error messages and stack traces

**Common issues**:
- Type errors: Fix TypeScript compilation issues
- Test failures: Debug failing tests individually
- Build errors: Check for missing dependencies or configuration

### Tests Pass Locally, Fail in CI

**Problem**: Tests pass on local machine but fail in CI

**Diagnosis**:
1. Check Node.js version matches (20.x)
2. Ensure `npm ci` is used (not `npm install`)
3. Check for environment-specific code (NODE_ENV)
4. Look for timing issues or race conditions

**Solution**: Use CI-specific timeouts or environment variables

### Coverage Generation Fails

**Problem**: Coverage report not generated

**Diagnosis**:
1. Check if vitest is installed correctly
2. Ensure coverage tool is configured in vitest.config.ts
3. Verify no permission issues writing to `./coverage/`

---

## Review Schedule

- **Daily**: CI runs on every PR
- **Weekly**: Review security test coverage and add missing tests
- **Monthly**: Update this validation guide with new controls
- **Quarterly**: Full security audit with external validation

---

## Contacts

- **Security Team**: security@example.com
- **On-Call Engineer**: oncall@example.com
- **CI/CD Issues**: devops@example.com

---

**Document Control**
- **Created**: 2026-02-04
- **Next Review**: 2026-03-04
- **Owner**: Security Engineering Team
- **Approval Required**: Before production deployment
