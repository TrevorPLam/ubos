---
title: "Security Baseline"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Security Baseline

**Purpose**: Document baseline security controls and assumptions for UBOS  
**Status**: ACTIVE - reflects current implementation  
**Last Updated**: 2026-02-04

---

## Overview

UBOS implements defense-in-depth security with multiple layers of protection.

For comprehensive security documentation, see [docs/security/](/docs/security/).

---

## Security Assumptions

### Trust Boundaries

1. **Client → Server**: Untrusted boundary - all input validated
2. **Server → Database**: Trusted boundary - server controls all queries
3. **User → Organization**: Trusted within tenant - but still validated

### Threat Model

See [docs/security/20-threat-model/THREAT_MODEL.md](/docs/security/20-threat-model/THREAT_MODEL.md) for full threat analysis.

**Key Threats**:
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Authentication bypass
- Multi-tenant data leakage
- Sensitive data exposure

---

## Security Controls

### 1. Input Validation

**Implementation**: Zod schemas for all API inputs

```typescript
// Example from shared/schema.ts
const insertClientSchema = createInsertSchema(clients);
```

**Evidence**: [shared/schema.ts](/shared/schema.ts), [server/routes.ts](/server/routes.ts)

### 2. Output Encoding

**Implementation**: React automatic escaping, Content-Security-Policy headers

**Evidence**: [server/security.ts](/server/security.ts) (Helmet middleware)

### 3. Authentication

**Implementation**: Session-based auth with HttpOnly cookies

**Evidence**: [docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md](/docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md)

### 4. Authorization

**Implementation**: Multi-tenant isolation via organizationId scoping

**Evidence**: 
- [server/storage.ts](/server/storage.ts) (all queries scoped)
- [tests/backend/multi-tenant-isolation.test.ts](/tests/backend/multi-tenant-isolation.test.ts)

### 5. CSRF Protection

**Implementation**: Double-submit cookie pattern

**Evidence**: [server/csrf.ts](/server/csrf.ts), [tests/backend/csrf.test.ts](/tests/backend/csrf.test.ts)

### 6. Rate Limiting

**Implementation**: express-rate-limit per endpoint

**Evidence**: [server/security.ts](/server/security.ts)

### 7. Security Headers

**Implementation**: Helmet.js for standard security headers

**Evidence**: [server/security.ts](/server/security.ts)

Headers set:
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (HSTS)

### 8. SQL Injection Prevention

**Implementation**: Parameterized queries via Drizzle ORM

**Evidence**: [server/storage.ts](/server/storage.ts) (no raw SQL)

### 9. Sensitive Data Handling

**Implementation**: PII redaction in logs

**Evidence**: [server/security-utils.ts](/server/security-utils.ts), [tests/backend/security-utils.test.ts](/tests/backend/security-utils.test.ts)

### 10. HTTPS Enforcement

**Implementation**: Redirect to HTTPS in production, HSTS header

**Evidence**: [server/security.ts](/server/security.ts)

---

## Security Testing

### Automated Tests

- **Auth Tests**: [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts)
- **CSRF Tests**: [tests/backend/csrf.test.ts](/tests/backend/csrf.test.ts)
- **Security Tests**: [tests/backend/security.test.ts](/tests/backend/security.test.ts)
- **Multi-Tenant Tests**: [tests/backend/multi-tenant-isolation.test.ts](/tests/backend/multi-tenant-isolation.test.ts)

### Manual Testing

**TODO**: Add penetration testing procedures

---

## Security Gaps

### Known Issues

See [docs/security/10-controls/SECURITY_VALIDATION.md](/docs/security/10-controls/SECURITY_VALIDATION.md) for current security posture.

**High Priority Gaps**:
1. OAuth/OIDC integration (using dev headers currently)
2. Role-based access control (RBAC)
3. API rate limiting per user/org
4. Audit logging for all sensitive operations
5. Secret rotation procedures

---

## Compliance

### Standards Alignment

- **OWASP Top 10**: See [docs/security/30-implementation-guides/APPLICATION_SECURITY.md](/docs/security/30-implementation-guides/APPLICATION_SECURITY.md)
- **SOC 2**: See [docs/security/40-compliance/SOC2_COMPLIANCE.md](/docs/security/40-compliance/SOC2_COMPLIANCE.md)
- **GDPR**: See [docs/security/40-compliance/GDPR_COMPLIANCE.md](/docs/security/40-compliance/GDPR_COMPLIANCE.md)

---

## Security Contacts

**Security Issues**: File issue with `security` label  
**Vulnerabilities**: TODO: Add security@ubos.com or security disclosure process

---

## Evidence Links

- **Security Implementation**: [server/security.ts](/server/security.ts)
- **CSRF Protection**: [server/csrf.ts](/server/csrf.ts)
- **Security Utils**: [server/security-utils.ts](/server/security-utils.ts)
- **Controls Matrix**: [docs/security/10-controls/CONTROLS_MATRIX.md](/docs/security/10-controls/CONTROLS_MATRIX.md)
- **Threat Model**: [docs/security/20-threat-model/THREAT_MODEL.md](/docs/security/20-threat-model/THREAT_MODEL.md)

---

**Last Verified**: 2026-02-04  
**Verification Command**: `npm run test:backend -- security`
