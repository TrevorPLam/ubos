---
title: "UBOS Threat Model"
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "confidential"
framework: "STRIDE + OWASP Top 10"
---

# UBOS Threat Model

## Executive Summary

This document identifies trust boundaries, assets, threats, and mitigations for the UBOS platform. It follows STRIDE methodology combined with OWASP Top 10 and multi-tenant specific threats.

## System Overview

**Architecture**: Full-stack TypeScript monorepo
- **Frontend**: React (Vite) with client-side routing
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Cookie-based sessions
- **Multi-tenancy**: Organization-scoped data isolation

**Deployment Model**: 
- Development: Single process (Vite dev server + Express API)
- Production: Separate static assets (CDN) + Node.js API server behind load balancer

## Trust Boundaries

### TB1: Internet → Load Balancer/CDN
- **Boundary**: Public internet to application edge
- **Trust Level**: Untrusted
- **Controls**: DDoS protection, TLS termination, rate limiting

### TB2: Load Balancer → Application Server
- **Boundary**: Reverse proxy to Node.js process
- **Trust Level**: Semi-trusted (internal network)
- **Controls**: Proxy protocol, internal TLS (optional), firewall rules

### TB3: Application Server → Database
- **Boundary**: Express app to PostgreSQL
- **Trust Level**: Trusted (backend-to-backend)
- **Controls**: Connection pooling, TLS encryption, credential management

### TB4: Multi-Tenant Boundary
- **Boundary**: Organization A's data ↔ Organization B's data
- **Trust Level**: Zero trust between tenants
- **Controls**: Organization ID scoping in all queries, row-level security

### TB5: User Session Boundary
- **Boundary**: Authenticated user ↔ Application state
- **Trust Level**: Authenticated but verify
- **Controls**: Session validation, CSRF tokens, authorization checks

## Assets & Data Classification

### Critical Assets (Tier 1)

#### A1: Authentication Tokens
- **Type**: Session cookies, API keys (future)
- **Sensitivity**: CRITICAL
- **Threats**: Theft, replay, session fixation
- **Storage**: HttpOnly cookies, encrypted at rest (future)
- **Protection**: 
  - HttpOnly + Secure + SameSite cookies ✅
  - Session timeout (TODO)
  - Token rotation (TODO)

#### A2: User Credentials
- **Type**: Passwords (future), OAuth tokens (future)
- **Sensitivity**: CRITICAL  
- **Threats**: Brute force, credential stuffing, phishing
- **Storage**: Hashed with Argon2/bcrypt (TODO - currently no passwords)
- **Protection**:
  - Rate limiting on auth endpoints ✅
  - Password complexity requirements (TODO)
  - MFA support (TODO)

#### A3: Tenant Data (PII/PHI/Financial)
- **Type**: Client records, deals, invoices, personal information
- **Sensitivity**: HIGH (potentially PII/PHI/payment data)
- **Threats**: Unauthorized access, data leakage, cross-tenant reads
- **Storage**: PostgreSQL with organization_id scoping
- **Protection**:
  - Multi-tenant isolation ✅
  - Encryption at rest (database level) (TODO)
  - Field-level encryption for sensitive fields (TODO)
  - Access logging ✅

### High-Value Assets (Tier 2)

#### A4: Audit Logs
- **Type**: Security events, access logs, change history
- **Sensitivity**: HIGH
- **Threats**: Tampering, deletion, information disclosure
- **Storage**: Database + external SIEM (future)
- **Protection**:
  - Append-only logs (TODO)
  - Log integrity (TODO)
  - PII redaction ✅

#### A5: Database Credentials & Secrets
- **Type**: DATABASE_URL, API keys, encryption keys
- **Sensitivity**: CRITICAL
- **Threats**: Exposure in code, logs, or version control
- **Storage**: Environment variables, secrets manager (future)
- **Protection**:
  - No secrets in code ✅
  - No secrets in logs (TODO: verify)
  - Secret scanning in CI (TODO)

### Medium-Value Assets (Tier 3)

#### A6: Business Logic & Code
- **Type**: Application source code
- **Sensitivity**: MEDIUM
- **Threats**: Intellectual property theft, vulnerability discovery
- **Storage**: GitHub (private repo)
- **Protection**:
  - Access controls on repository ✅
  - Dependency scanning ✅
  - SAST scanning (TODO: enforce)

## Entry Points

### EP1: HTTP API Endpoints
- **Path**: `/api/*`
- **Method**: GET, POST, PUT, DELETE, PATCH
- **Authentication**: Required (via cookie or x-user-id header)
- **Trust**: Untrusted input
- **Threats**: 
  - SQL injection → Mitigated by ORM parameterization ✅
  - XSS → Mitigated by React escaping + CSP ✅
  - Authentication bypass → Mitigated by requireAuth middleware ✅
  - Authorization bypass → Mitigated by org scoping (VERIFY)
  - CSRF → Partially mitigated by SameSite cookies (IMPROVE)
  - Rate limiting bypass → Mitigated by express-rate-limit (IMPROVE for production)

### EP2: Public Login Endpoint
- **Path**: `/api/login`
- **Method**: GET (currently generates random user)
- **Authentication**: None (by design for dev)
- **Trust**: Untrusted
- **Threats**:
  - Brute force → Mitigated by rate limiting ✅
  - Credential stuffing → N/A (no passwords yet)
  - Account enumeration → Low risk (dev-only endpoint)
- **TODO**: Replace with real authentication for production

### EP3: File Uploads (Future)
- **Path**: TBD
- **Method**: POST with multipart/form-data
- **Authentication**: Required
- **Trust**: Untrusted
- **Threats**:
  - Malicious file upload → TODO: Add file type validation, size limits, virus scanning
  - Path traversal → TODO: Add filename sanitization
  - Storage exhaustion → TODO: Add per-tenant quotas

### EP4: Webhooks (Future)
- **Path**: `/api/webhooks/*`
- **Method**: POST
- **Authentication**: HMAC signature verification
- **Trust**: Partially trusted (verified signature)
- **Threats**:
  - Replay attacks → TODO: Add timestamp validation
  - Signature bypass → TODO: Implement HMAC verification
  - DoS → Mitigated by rate limiting ✅

### EP5: Admin Routes (Future)
- **Path**: `/api/admin/*`
- **Method**: Various
- **Authentication**: Required + admin role
- **Trust**: Trusted (after AuthN/AuthZ)
- **Threats**:
  - Privilege escalation → TODO: Add role-based access control
  - Audit bypass → TODO: Enhanced logging for admin actions

## Threat Analysis (STRIDE + OWASP)

### T1: Spoofing (Authentication Bypass)

#### T1.1: Session Cookie Theft
- **Severity**: CRITICAL
- **Vector**: XSS, network sniffing, physical access
- **Impact**: Account takeover, unauthorized access
- **Mitigations**:
  - ✅ HttpOnly cookies (prevents XSS theft)
  - ✅ Secure flag (HTTPS only - TODO: verify enforcement)
  - ✅ SameSite=Strict (prevents CSRF)
  - TODO: Session timeout and rotation
  - TODO: Device fingerprinting
  - TODO: Anomaly detection
- **Residual Risk**: MEDIUM (no session timeout, no rotation)
- **Evidence**: server/routes.ts:36-68, tests/backend/auth-middleware.test.ts

#### T1.2: Authentication Header Forgery
- **Severity**: HIGH
- **Vector**: Spoofed x-user-id header
- **Impact**: Impersonation in non-production environments
- **Mitigations**:
  - ⚠️ Header auth is for dev/testing only
  - TODO: Disable x-user-id header auth in production
  - TODO: Add environment-based auth configuration
- **Residual Risk**: HIGH (header auth enabled in all environments)
- **Evidence**: server/routes.ts:59-63

### T2: Tampering (Data Integrity)

#### T2.1: SQL Injection
- **Severity**: CRITICAL
- **Vector**: Malicious input in API parameters
- **Impact**: Data breach, data corruption, privilege escalation
- **Mitigations**:
  - ✅ Drizzle ORM parameterized queries
  - ✅ Zod input validation
  - ✅ No raw SQL string concatenation
- **Residual Risk**: LOW
- **Evidence**: shared/schema.ts, server/storage.ts (parameterized queries throughout)

#### T2.2: Cross-Tenant Data Modification
- **Severity**: CRITICAL
- **Vector**: Missing or incorrect org ID in query
- **Impact**: Data corruption across tenant boundaries
- **Mitigations**:
  - ✅ Organization scoping in queries
  - ✅ Multi-tenant isolation tests
  - TODO: Database-level row security
  - TODO: Automated org ID presence validation
- **Residual Risk**: MEDIUM (relies on developer discipline)
- **Evidence**: tests/backend/multi-tenant-isolation.test.ts (15 tests)

### T3: Repudiation (Audit Trail)

#### T3.1: Action Repudiation
- **Severity**: MEDIUM
- **Vector**: Insufficient or tampered audit logs
- **Impact**: Inability to investigate security incidents
- **Mitigations**:
  - ✅ Request logging (basic)
  - TODO: Comprehensive audit logging
  - TODO: Tamper-evident logs
  - TODO: External log shipping (SIEM)
- **Residual Risk**: HIGH (basic logging only)
- **Evidence**: server/index.ts:54-78 (request logging)

### T4: Information Disclosure (Data Exposure)

#### T4.1: Error Message Leakage
- **Severity**: MEDIUM
- **Vector**: Stack traces, database errors in responses
- **Impact**: Information gathering for attackers
- **Mitigations**:
  - ✅ Generic error messages in production
  - ✅ No stack traces to client
  - TODO: Verify all error paths
- **Residual Risk**: LOW
- **Evidence**: server/index.ts:83-101 (error handler)

#### T4.2: Sensitive Data in Logs
- **Severity**: HIGH
- **Vector**: Passwords, tokens, PII in application logs
- **Impact**: Data breach via log access
- **Mitigations**:
  - ⚠️ Basic logging without explicit redaction
  - TODO: Implement log redaction for PII/secrets
  - TODO: Audit all log statements
- **Residual Risk**: HIGH
- **Evidence**: server/index.ts:67-73 (logs response JSON)

#### T4.3: Cross-Tenant Information Leakage
- **Severity**: CRITICAL
- **Vector**: Missing org ID filter in query
- **Impact**: Access to another tenant's data
- **Mitigations**:
  - ✅ Organization scoping enforcement
  - ✅ Multi-tenant isolation tests
  - TODO: Query analyzer to detect missing org filters
- **Residual Risk**: MEDIUM
- **Evidence**: tests/backend/multi-tenant-isolation.test.ts

### T5: Denial of Service (Availability)

#### T5.1: API Rate Limit Bypass
- **Severity**: HIGH
- **Vector**: Distributed requests, proxy manipulation
- **Impact**: Service degradation or outage
- **Mitigations**:
  - ✅ express-rate-limit (in-memory)
  - ⚠️ Single-instance only (not production-ready)
  - TODO: Redis-backed rate limiting for multi-instance
  - TODO: Per-user and per-tenant limits
- **Residual Risk**: HIGH (memory-based, single instance)
- **Evidence**: server/security.ts:100-157

#### T5.2: Resource Exhaustion
- **Severity**: MEDIUM
- **Vector**: Large payloads, slow requests, connection exhaustion
- **Impact**: Service degradation
- **Mitigations**:
  - TODO: Request body size limits
  - TODO: Request timeout configuration
  - TODO: Connection pool limits
- **Residual Risk**: HIGH (no explicit limits)

#### T5.3: JSON Bomb / Payload Attack
- **Severity**: MEDIUM
- **Vector**: Deeply nested JSON, very large arrays
- **Impact**: CPU/memory exhaustion
- **Mitigations**:
  - TODO: JSON payload depth/size limits
  - TODO: Request parsing timeout
- **Residual Risk**: HIGH

### T6: Elevation of Privilege (Authorization)

#### T6.1: Horizontal Privilege Escalation
- **Severity**: CRITICAL
- **Vector**: Accessing another user's resources in same org
- **Impact**: Unauthorized data access
- **Mitigations**:
  - ⚠️ No fine-grained RBAC implemented
  - TODO: User-level authorization checks
  - TODO: Resource ownership validation
- **Residual Risk**: HIGH (org-level only, no user-level checks)

#### T6.2: Vertical Privilege Escalation
- **Severity**: CRITICAL
- **Vector**: Regular user accessing admin functions
- **Impact**: System compromise
- **Mitigations**:
  - TODO: Role-based access control (RBAC)
  - TODO: Admin route protection
- **Residual Risk**: CRITICAL (no RBAC implemented)

#### T6.3: Cross-Tenant Access
- **Severity**: CRITICAL
- **Vector**: Manipulating org ID in requests
- **Impact**: Access to other tenant's data
- **Mitigations**:
  - ✅ Server-side org resolution (not from client)
  - ✅ Multi-tenant tests
  - TODO: Additional validation and monitoring
- **Residual Risk**: LOW (good design)
- **Evidence**: server/routes.ts:86-97

## OWASP Top 10 (2021) Coverage

### A01:2021 - Broken Access Control
- **Status**: PARTIALLY MITIGATED
- **Gaps**: No RBAC, limited user-level authz, no admin protection
- **Mitigations**: Org scoping ✅, requireAuth ✅
- **TODO**: Implement RBAC, user-level authz, admin routes

### A02:2021 - Cryptographic Failures
- **Status**: PARTIALLY MITIGATED
- **Gaps**: No field-level encryption, unclear TLS enforcement
- **Mitigations**: HTTPS/TLS ✅, secure cookies ✅
- **TODO**: Enforce TLS, field encryption for PII/PHI, key management

### A03:2021 - Injection
- **Status**: WELL MITIGATED
- **Gaps**: None identified
- **Mitigations**: Drizzle ORM ✅, Zod validation ✅, React escaping ✅, CSP ✅
- **Evidence**: All queries use parameterization

### A04:2021 - Insecure Design
- **Status**: GOOD
- **Gaps**: Missing threat model (this doc addresses it)
- **Mitigations**: Multi-tenant by design ✅, defense in depth ✅
- **TODO**: Security architecture review

### A05:2021 - Security Misconfiguration
- **Status**: PARTIALLY MITIGATED
- **Gaps**: Dev auth in prod, unclear proxy config, missing hardening
- **Mitigations**: Security headers ✅, CSP ✅
- **TODO**: Environment-specific config, proxy trust configuration, header auth restrictions

### A06:2021 - Vulnerable and Outdated Components
- **Status**: PARTIALLY MITIGATED
- **Gaps**: No CI enforcement, no SBOM
- **Mitigations**: npm audit ✅, Dependabot (assumed)
- **TODO**: Dependency scanning in CI with failures, SBOM generation, Renovate

### A07:2021 - Identification and Authentication Failures
- **Status**: HIGH RISK
- **Gaps**: Weak auth, no session management, no MFA, dev auth in prod
- **Mitigations**: Rate limiting ✅, HttpOnly cookies ✅
- **TODO**: Real authentication, session timeout, MFA, password policies

### A08:2021 - Software and Data Integrity Failures
- **Status**: PARTIALLY MITIGATED
- **Gaps**: No CI/CD signing, no SBOM, limited verification
- **Mitigations**: Lockfile ✅, npm ci ✅
- **TODO**: Artifact signing, SBOM, dependency verification

### A09:2021 - Security Logging and Monitoring Failures
- **Status**: HIGH RISK
- **Gaps**: Basic logging only, no SIEM, no alerting, PII in logs
- **Mitigations**: Request logging ✅
- **TODO**: Comprehensive audit logging, log redaction, SIEM integration, alerting

### A10:2021 - Server-Side Request Forgery (SSRF)
- **Status**: LOW RISK
- **Gaps**: No current functionality that makes external requests
- **Mitigations**: N/A currently
- **TODO**: Add SSRF protections if/when adding external HTTP calls

## Multi-Tenant Specific Threats

### MT1: Tenant Isolation Bypass
- **Severity**: CRITICAL
- **Description**: Attacker accesses data from other tenants
- **Attack Vectors**:
  - Missing org ID in query
  - Org ID manipulation in request
  - SQL injection bypassing filters
  - API route missing org scoping
- **Mitigations**:
  - ✅ Server-side org resolution
  - ✅ All queries filtered by org ID
  - ✅ 15 multi-tenant isolation tests
  - TODO: Automated query validation
  - TODO: Database row-level security
- **Evidence**: tests/backend/multi-tenant-isolation.test.ts

### MT2: Resource Exhaustion by Tenant
- **Severity**: MEDIUM
- **Description**: One tenant consumes resources affecting others
- **Attack Vectors**:
  - Large data volumes
  - Excessive API calls
  - Storage exhaustion
- **Mitigations**:
  - ✅ Global rate limiting
  - TODO: Per-tenant quotas
  - TODO: Per-tenant rate limiting
  - TODO: Storage limits
- **Residual Risk**: HIGH

### MT3: Subdomain/Path Confusion
- **Severity**: LOW
- **Description**: Routing errors lead to cross-tenant access
- **Attack Vectors**:
  - Subdomain takeover
  - Path traversal
- **Mitigations**:
  - N/A (currently no subdomain routing)
  - TODO: If implementing subdomains, validate tenant routing
- **Residual Risk**: LOW (not applicable yet)

## Supply Chain Threats

### SC1: Malicious Dependencies
- **Severity**: HIGH
- **Description**: Compromised npm packages introduce vulnerabilities
- **Mitigations**:
  - ✅ package-lock.json for reproducible builds
  - ✅ npm audit checks
  - TODO: Dependency scanning in CI with failures
  - TODO: SBOM generation
  - TODO: Provenance verification
- **Residual Risk**: MEDIUM

### SC2: Build/Deploy Pipeline Compromise
- **Severity**: CRITICAL
- **Description**: Attacker injects malicious code during build/deploy
- **Mitigations**:
  - ✅ GitHub Actions (trusted platform)
  - TODO: Artifact signing
  - TODO: Immutable build artifacts
  - TODO: Deploy verification
- **Residual Risk**: MEDIUM

## Risk Register Summary

| ID | Threat | Severity | Likelihood | Risk | Status | Residual |
|----|--------|----------|------------|------|--------|----------|
| T1.1 | Session theft | CRITICAL | MEDIUM | HIGH | PARTIAL | MEDIUM |
| T1.2 | Header auth forgery | HIGH | HIGH | CRITICAL | NONE | HIGH |
| T2.1 | SQL injection | CRITICAL | LOW | MEDIUM | MITIGATED | LOW |
| T2.2 | Cross-tenant modify | CRITICAL | MEDIUM | HIGH | PARTIAL | MEDIUM |
| T3.1 | Action repudiation | MEDIUM | HIGH | MEDIUM | PARTIAL | HIGH |
| T4.1 | Error leakage | MEDIUM | MEDIUM | MEDIUM | MITIGATED | LOW |
| T4.2 | Sensitive logs | HIGH | HIGH | CRITICAL | NONE | HIGH |
| T4.3 | Tenant info leak | CRITICAL | MEDIUM | HIGH | PARTIAL | MEDIUM |
| T5.1 | Rate limit bypass | HIGH | HIGH | CRITICAL | PARTIAL | HIGH |
| T5.2 | Resource exhaustion | MEDIUM | MEDIUM | MEDIUM | NONE | HIGH |
| T5.3 | JSON bomb | MEDIUM | LOW | LOW | NONE | HIGH |
| T6.1 | Horizontal escalation | CRITICAL | HIGH | CRITICAL | NONE | HIGH |
| T6.2 | Vertical escalation | CRITICAL | LOW | HIGH | NONE | CRITICAL |
| T6.3 | Cross-tenant access | CRITICAL | LOW | MEDIUM | MITIGATED | LOW |
| MT1 | Tenant isolation | CRITICAL | MEDIUM | HIGH | PARTIAL | MEDIUM |
| MT2 | Resource per tenant | MEDIUM | MEDIUM | MEDIUM | PARTIAL | HIGH |
| SC1 | Malicious deps | HIGH | LOW | MEDIUM | PARTIAL | MEDIUM |
| SC2 | Pipeline compromise | CRITICAL | LOW | MEDIUM | PARTIAL | MEDIUM |

## Priority Recommendations

### P0 (Critical - Immediate)
1. **Disable header-based auth in production** (T1.2)
2. **Implement session timeout and rotation** (T1.1)
3. **Add comprehensive audit logging with PII redaction** (T3.1, T4.2)
4. **Implement RBAC with user-level authorization** (T6.1, T6.2)
5. **Production-ready rate limiting (Redis-backed)** (T5.1)
6. **Add request body size and timeout limits** (T5.2, T5.3)

### P1 (High - Near-term)
7. **Dependency scanning CI gates with failure** (SC1)
8. **Implement CSRF token validation** (T1.1)
9. **Per-tenant rate limiting and quotas** (MT2)
10. **Database row-level security** (MT1, T2.2)
11. **Automated org ID validation in queries** (MT1, T4.3)

### P2 (Medium - Roadmap)
12. **MFA implementation** (T1.1)
13. **Field-level encryption for PII/PHI** (T4.2)
14. **SIEM integration** (T3.1)
15. **SBOM generation and provenance** (SC1, SC2)

## Testing Evidence Requirements

For each threat mitigation, require:
1. **Unit test**: Proves control works in isolation
2. **Integration test**: Proves control works in context
3. **Negative test**: Proves attack is blocked
4. **Evidence artifact**: Log, metric, or config proving deployment

Example for T2.2 (Cross-tenant modification):
- Unit: `tests/backend/multi-tenant-isolation.test.ts` (15 tests) ✅
- Integration: API test attempting cross-tenant write (TODO)
- Negative: Test with missing org ID fails (TODO)
- Evidence: Query audit showing org ID present (TODO)

## Deployment Assumptions

This threat model assumes:
1. **TLS termination** at load balancer with HTTPS enforcement
2. **Internal network** between LB and app server
3. **Database** in isolated subnet with firewall rules
4. **Secrets management** via environment variables (ephemeral)
5. **No public database access**
6. **DDoS protection** at CDN/infrastructure layer

If any assumption is violated, residual risks increase significantly.

## Review Schedule

- **Quarterly**: Full threat model review
- **After major features**: Targeted threat analysis
- **After incidents**: Lessons learned integration
- **Annually**: External security assessment

---

**Document Control**
- **Created**: 2026-02-04
- **Next Review**: 2026-05-04
- **Owner**: Security Team
- **Approvers**: Engineering Leadership, Security Engineering
