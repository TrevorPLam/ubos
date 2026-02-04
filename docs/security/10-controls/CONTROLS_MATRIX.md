---
title: "Security Controls Matrix"
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Security Controls Matrix

## Purpose

This document maps security requirements from various standards (SOC2, OWASP ASVS, NIST, CIS) to implemented controls and evidence artifacts.

## Control Framework

| ID | Standard | Control | Implementation | Evidence | Status |
|----|----------|---------|----------------|----------|--------|
| **Authentication & Session Management** |
| AC-1 | OWASP ASVS 2.1 | Secure password storage | TODO: Implement Argon2id hashing | N/A | NOT_IMPL |
| AC-2 | OWASP ASVS 2.2 | Anti-automation | ✅ Rate limiting on /api/login | server/security.ts:119-127, tests/backend/security.test.ts | IMPLEMENTED |
| AC-3 | OWASP ASVS 2.3 | Session timeout | ✅ 15min idle, 24h absolute max, 1h rotation, startup validation | server/session.ts:54-56, server/config-validation.ts (2026-02-04) | IMPLEMENTED |
| AC-4 | OWASP ASVS 2.4 | Session termination | ✅ Logout invalidates via sessionStore.delete() | server/session.ts:198-202 (invalidateSession) | IMPLEMENTED |
| AC-5 | OWASP ASVS 2.5 | HttpOnly cookies | ✅ Cookies are HttpOnly | server/routes.ts:104-108 | IMPLEMENTED |
| AC-6 | OWASP ASVS 2.6 | Secure flag | ⚠️ Needs verification in production | server/routes.ts:106 (TODO: env check) | PARTIAL |
| AC-7 | OWASP ASVS 2.7 | SameSite attribute | ✅ SameSite=Lax | server/routes.ts:107 | IMPLEMENTED |
| AC-8 | OWASP ASVS 2.8 | CSRF protection | ✅ Synchronizer token pattern (generateCsrfToken, validateCsrfToken) | server/csrf.ts:52-90 (token generation and validation) | IMPLEMENTED |
| AC-9 | SOC2 CC6.1 | Multi-factor authentication | TODO: MFA for sensitive operations | N/A | NOT_IMPL |
| AC-10 | NIST AC-2 | Account management | ✅ User-org association | server/routes.ts:86-97 | IMPLEMENTED |
| AC-11 | NIST AC-7 | Unsuccessful login attempts | ⚠️ Rate limiting only | server/security.ts:119-127 | PARTIAL |
| AC-12 | CIS 5.1 | Centralized authentication | ✅ requireAuth middleware | server/routes.ts:70-81 | IMPLEMENTED |
| **Authorization & Access Control** |
| AZ-1 | OWASP ASVS 4.1 | Default deny | ⚠️ Middleware required, not all routes | server/routes.ts:70-81 | PARTIAL |
| AZ-2 | OWASP ASVS 4.2 | Least privilege | TODO: RBAC implementation | N/A | NOT_IMPL |
| AZ-3 | OWASP ASVS 4.3 | Multi-tenant isolation | ✅ Org ID scoping | server/routes.ts:86-97, tests/backend/multi-tenant-isolation.test.ts (15 tests) | IMPLEMENTED |
| AZ-4 | SOC2 CC6.1 | Authorization enforcement | ⚠️ Org-level only, no user-level | server/routes.ts:86-97 | PARTIAL |
| AZ-5 | NIST AC-3 | Access enforcement | ⚠️ No RBAC | N/A | PARTIAL |
| AZ-6 | CIS 14.6 | Segregation of duties | TODO: Admin role separation | N/A | NOT_IMPL |
| **Input Validation** |
| IV-1 | OWASP ASVS 5.1 | Allowlist validation | ✅ Zod schemas | shared/schema.ts | IMPLEMENTED |
| IV-2 | OWASP ASVS 5.2 | Serialization security | ✅ JSON.parse with size limits (TODO: enforce) | server/index.ts:46-51 | PARTIAL |
| IV-3 | OWASP ASVS 5.3 | Output encoding | ✅ React auto-escaping | CLIENT (React) | IMPLEMENTED |
| IV-4 | OWASP ASVS 5.4 | Memory, string, and code protection | ⚠️ Node.js defaults | N/A | PARTIAL |
| IV-5 | OWASP ASVS 5.5 | Deserialization | ✅ No unsafe deserialization | N/A | IMPLEMENTED |
| IV-6 | SOC2 PI1 | Input completeness | ✅ Zod required fields | shared/schema.ts | IMPLEMENTED |
| IV-7 | SOC2 PI1 | Input accuracy | ✅ Zod type/format validation | shared/schema.ts | IMPLEMENTED |
| **Cryptography** |
| CR-1 | OWASP ASVS 6.1 | Data classification | ⚠️ Defined in threat model, not enforced | docs/security/20-threat-model/THREAT_MODEL.md | PARTIAL |
| CR-2 | OWASP ASVS 6.2 | Cryptographic algorithms | ✅ TLS 1.2+, modern ciphers (TODO: verify) | server/security.ts (TODO: explicit config) | PARTIAL |
| CR-3 | OWASP ASVS 6.3 | Random values | ✅ crypto.randomUUID() | server/routes.ts:33 | IMPLEMENTED |
| CR-4 | OWASP ASVS 6.4 | Secret management | ⚠️ Env vars, no rotation | process.env.DATABASE_URL | PARTIAL |
| CR-5 | SOC2 CC6.6 | Encryption at rest | TODO: Field-level encryption | N/A | NOT_IMPL |
| CR-6 | SOC2 CC6.7 | Encryption in transit | ✅ TLS (TODO: enforce) | Deployment config | PARTIAL |
| CR-7 | NIST SC-12 | Key management | TODO: Key rotation, escrow | N/A | NOT_IMPL |
| **Error Handling & Logging** |
| EL-1 | OWASP ASVS 7.1 | Error logging | ✅ Server-side logging | server/index.ts:54-78, server/logger.ts | IMPLEMENTED |
| EL-2 | OWASP ASVS 7.2 | Error handling | ✅ No stack traces to client in production | server/index.ts:83-101 | IMPLEMENTED |
| EL-3 | OWASP ASVS 7.3 | Security logging | ✅ Centralized structured logging with PII redaction | server/logger.ts (2026-02-04) | IMPLEMENTED |
| EL-4 | OWASP ASVS 7.4 | Log protection | TODO: Tamper-evident logs, external SIEM | N/A | NOT_IMPL |
| EL-5 | SOC2 CC7.1 | System monitoring | ⚠️ Basic logging, no alerting | server/index.ts:54-78 | PARTIAL |
| EL-6 | SOC2 A1.2 | Incident detection | TODO: Anomaly detection, SIEM | N/A | NOT_IMPL |
| EL-7 | NIST AU-2 | Audit logging | ⚠️ Basic access logs | server/index.ts:67-73 | PARTIAL |
| EL-8 | NIST AU-3 | Content of audit records | TODO: User, timestamp, action, result | N/A | PARTIAL |
| EL-9 | NIST AU-9 | Audit log protection | TODO: Append-only, integrity checks | N/A | NOT_IMPL |
| **Data Protection** |
| DP-1 | OWASP ASVS 8.1 | Sensitive data classification | ⚠️ Defined, not tagged | docs/security/20-threat-model/THREAT_MODEL.md | PARTIAL |
| DP-2 | OWASP ASVS 8.2 | Client-side data protection | ✅ No sensitive data in client storage | N/A | IMPLEMENTED |
| DP-3 | OWASP ASVS 8.3 | Sensitive data in logs | ✅ Centralized logger with mandatory PII redaction | server/logger.ts:100-140, server/security-utils.ts:92-120 (2026-02-04) | IMPLEMENTED |
| DP-4 | SOC2 C1.2 | Data encryption | ⚠️ TLS in transit, TODO: at rest | Deployment | PARTIAL |
| DP-5 | SOC2 C1.3 | Data access controls | ✅ Org-level scoping | server/routes.ts:86-97 | IMPLEMENTED |
| DP-6 | SOC2 C1.4 | Data disposal | TODO: Secure deletion, retention policy | N/A | NOT_IMPL |
| DP-7 | GDPR Art 32 | Security of processing | ⚠️ Partial implementation | Multiple files | PARTIAL |
| DP-8 | HIPAA 164.312(a) | Access controls | ⚠️ Org-level only | server/routes.ts:70-81 | PARTIAL |
| DP-9 | PCI-DSS 3.4 | Render PAN unreadable | N/A (no payment data) | N/A | NOT_APPLICABLE |
| **Communications Security** |
| CS-1 | OWASP ASVS 9.1 | TLS configuration | ✅ Proxy trust configured with validation | server/index.ts:23-50, server/config-validation.ts (2026-02-04) | IMPLEMENTED |
| CS-2 | OWASP ASVS 9.2 | Server communications | ✅ HTTPS enforced with HSTS | server/security.ts:41-45 | IMPLEMENTED |
| CS-3 | SOC2 CC6.7 | Transmission security | ⚠️ TLS assumed, not enforced | N/A | PARTIAL |
| CS-4 | NIST SC-8 | Transmission confidentiality | ✅ TLS for all communications | Deployment | IMPLEMENTED |
| **Malicious Code Protection** |
| MC-1 | OWASP ASVS 10.1 | Code analysis | ⚠️ CodeQL exists, not enforced | .github/workflows (TODO: enforce) | PARTIAL |
| MC-2 | OWASP ASVS 10.2 | Malicious code search | ⚠️ npm audit, no CI gate | package.json:19 | PARTIAL |
| MC-3 | OWASP ASVS 10.3 | Application integrity | TODO: SBOM, signed artifacts | N/A | NOT_IMPL |
| MC-4 | SOC2 CC8.1 | Secure development | ✅ Code review, testing | PR process | IMPLEMENTED |
| MC-5 | NIST SI-3 | Malicious code protection | ⚠️ Dependency scanning | npm audit | PARTIAL |
| **Business Logic Security** |
| BL-1 | OWASP ASVS 11.1 | Business logic flow | ✅ Sequential workflow enforced | Application logic | IMPLEMENTED |
| BL-2 | OWASP ASVS 11.2 | Anti-automation | ✅ Rate limiting | server/security.ts:100-157 | IMPLEMENTED |
| BL-3 | SOC2 PI1 | Processing completeness | ✅ Transaction handling | Database transactions | IMPLEMENTED |
| **File and Resources** |
| FR-1 | OWASP ASVS 12.1 | File upload | TODO: File type validation, size limits | N/A | NOT_IMPL |
| FR-2 | OWASP ASVS 12.2 | File integrity | TODO: Checksum validation | N/A | NOT_IMPL |
| FR-3 | OWASP ASVS 12.3 | File execution | TODO: No execution of uploads | N/A | NOT_IMPL |
| FR-4 | OWASP ASVS 12.4 | File storage | TODO: Secure storage, quotas | N/A | NOT_IMPL |
| FR-5 | OWASP ASVS 12.5 | File download | TODO: Prevent path traversal | N/A | NOT_IMPL |
| **API Security** |
| API-1 | OWASP ASVS 13.1 | RESTful security | ✅ Authentication required | server/routes.ts:70-81 | IMPLEMENTED |
| API-2 | OWASP ASVS 13.2 | RESTful input validation | ✅ Zod schemas | shared/schema.ts | IMPLEMENTED |
| API-3 | OWASP ASVS 13.3 | RESTful output encoding | ✅ JSON serialization | Express default | IMPLEMENTED |
| API-4 | OWASP ASVS 13.4 | GraphQL/other | N/A | N/A | NOT_APPLICABLE |
| **Configuration** |
| CF-1 | OWASP ASVS 14.1 | Build process | ✅ npm ci, reproducible | .github/workflows/test.yml | IMPLEMENTED |
| CF-2 | OWASP ASVS 14.2 | Dependency check | ⚠️ npm audit, no CI gate | package.json | PARTIAL |
| CF-3 | OWASP ASVS 14.3 | Unintended security disclosure | ✅ No X-Powered-By, error handling | server/security.ts:79 | IMPLEMENTED |
| CF-4 | OWASP ASVS 14.4 | HTTP security headers | ✅ Helmet implementation | server/security.ts:35-82 | IMPLEMENTED |
| CF-5 | OWASP ASVS 14.5 | Request validation | ✅ Zod schemas, sanitization | shared/schema.ts, server/security.ts | IMPLEMENTED |
| CF-6 | SOC2 CC5.2 | Configuration management | ⚠️ Code-based, needs formal CM | Git versioning | PARTIAL |
| CF-7 | NIST CM-2 | Baseline configuration | TODO: Security configuration baseline | N/A | NOT_IMPL |
| CF-8 | CIS 5.1 | Secure configuration | ⚠️ Partial hardening | server/security.ts | PARTIAL |

## Status Definitions

- **IMPLEMENTED**: Control is fully implemented with evidence
- **PARTIAL**: Control is partially implemented or needs hardening
- **AT_RISK**: Control has known gaps that pose risk
- **NOT_IMPL**: Control is not implemented
- **NOT_APPLICABLE**: Control does not apply to current system

## Summary Statistics

- **Total Controls**: 78
- **Implemented**: 21 (27%)
- **Partial**: 37 (47%)
- **At Risk**: 1 (1%)
- **Not Implemented**: 18 (23%)
- **Not Applicable**: 1 (1%)

## High-Priority Gaps (P0)

### Critical Gaps Requiring Immediate Action

1. **DP-3 (AT_RISK)**: Sensitive data in logs - Response JSON logged without redaction
   - **Risk**: PII/PHI exposure in log files
   - **Evidence Gap**: server/index.ts:67-73 logs full response
   - **Fix**: Implement log redaction middleware

2. **AC-3 (NOT_IMPL)**: Session timeout
   - **Risk**: Session hijacking window unlimited
   - **Evidence Gap**: No session expiry logic
   - **Fix**: Implement 15min inactivity + 24h max session

3. **AC-8 (PARTIAL)**: CSRF protection
   - **Risk**: State-changing operations vulnerable
   - **Evidence Gap**: No CSRF token validation
   - **Fix**: Implement CSRF token middleware

4. **AZ-2 (NOT_IMPL)**: Least privilege / RBAC
   - **Risk**: No user-level authorization
   - **Evidence Gap**: Only org-level checks
   - **Fix**: Implement role-based access control

5. **EL-4 (NOT_IMPL)**: Log protection
   - **Risk**: Log tampering, PII exposure
   - **Evidence Gap**: No tamper-evident logs
   - **Fix**: Implement log integrity + PII redaction

## Evidence Mapping

### Testing Evidence
- **Unit Tests**: 101 tests (69 existing + 32 security)
- **Integration Tests**: tests/backend/*.test.ts
- **Security Tests**: tests/backend/security.test.ts (32 tests)
- **Multi-Tenant Tests**: tests/backend/multi-tenant-isolation.test.ts (15 tests)

### Configuration Evidence
- **Security Middleware**: server/security.ts
- **Authentication**: server/routes.ts:70-81
- **CI/CD**: .github/workflows/test.yml
- **Dependencies**: package-lock.json

### Documentation Evidence
- **Threat Model**: docs/security/20-threat-model/THREAT_MODEL.md
- **Security Controls**: docs/security/10-controls/CONTROLS_MATRIX.md (this document)
- **Compliance**: docs/security/40-compliance/{SOC2,PCI_DSS,HIPAA,GDPR}_COMPLIANCE.md

## Remediation Roadmap

### Phase 1 (Week 1-2): P0 Critical Gaps
- [ ] Implement log redaction (DP-3)
- [ ] Add session timeout (AC-3)
- [ ] Implement CSRF tokens (AC-8)
- [ ] Add request size/timeout limits (DoS controls)
- [ ] Disable header auth in production (AC-12)
- [ ] Production-ready rate limiting with Redis (API-2)

### Phase 2 (Week 3-4): P1 High Priority
- [ ] Implement RBAC framework (AZ-2, AZ-5)
- [ ] Add comprehensive audit logging (EL-3, EL-7, EL-8)
- [ ] Implement log integrity (EL-9)
- [ ] Add dependency scanning CI gates (MC-2)
- [ ] Automated org ID validation (AZ-3)

### Phase 3 (Month 2): P2 Medium Priority
- [ ] Field-level encryption (CR-5)
- [ ] SIEM integration (EL-6)
- [ ] SBOM generation (MC-3)
- [ ] File upload controls (FR-1 through FR-5)
- [ ] Key management (CR-7)

## Compliance Mapping

### SOC2 Trust Service Criteria
- **CC1-CC5**: Organizational controls (policies, communication, risk, monitoring, activities)
- **CC6**: Logical and physical access (AC-*, AZ-*, CS-*)
- **CC7**: System operations (EL-*, CF-*)
- **CC8**: Change management (MC-4, CF-6)
- **A1**: Availability (API-2, BL-2)
- **PI1**: Processing integrity (IV-6, IV-7, BL-3)
- **C1**: Confidentiality (CR-*, DP-*)
- **P1**: Privacy (DP-*, GDPR controls)

### OWASP ASVS L2 Target
- **Current Level**: L1 (basic security)
- **Target Level**: L2 (standard security for most apps)
- **L2 Requirements**: 217 controls
- **Current Coverage**: ~35% of L2 requirements

### PCI-DSS (if handling payment data)
- **Req 1-2**: Network/config security (CS-*, CF-*)
- **Req 3-4**: Data protection (CR-*, DP-*)
- **Req 5-6**: Vulnerability management (MC-*)
- **Req 7-8**: Access control (AC-*, AZ-*)
- **Req 9**: Physical security (deployment)
- **Req 10**: Logging/monitoring (EL-*)
- **Req 11**: Security testing (MC-1, testing)
- **Req 12**: Security policy (documentation)

### HIPAA (if handling PHI)
- **164.308(a)**: Administrative (policies, risk management)
- **164.310**: Physical (access controls, facility)
- **164.312**: Technical (AC-*, AZ-*, CR-*, EL-*)
- **164.314**: Organizational (BAAs)
- **164.316**: Policies and documentation

## Review and Maintenance

- **Monthly**: Review P0/P1 control status
- **Quarterly**: Full controls matrix review
- **After incidents**: Update controls and evidence
- **Before audits**: Verify all evidence artifacts
- **Continuous**: CI enforcement of implemented controls

---

**Document Owner**: Security Engineering Team
**Next Review**: 2026-03-04
**Approval**: Required before production deployment
