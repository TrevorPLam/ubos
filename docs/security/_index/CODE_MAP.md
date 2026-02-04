---
title: "Security Documentation to Code Map"
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Security Documentation to Code Map

This map links security documentation claims to code, configuration, and tests that provide evidence.

## Core Controls Mapping

| Area | Documentation | Code / Config Evidence | Tests | Notes |
|---|---|---|---|---|
| Authentication & Sessions | [Access Control](../30-implementation-guides/ACCESS_CONTROL.md) | [server/routes.ts](../../../server/routes.ts), [server/session.ts](../../../server/session.ts) | [tests/backend/auth-middleware.test.ts](../../../tests/backend/auth-middleware.test.ts) | Ensure production disables header auth |
| CSRF Protection | [Security Validation](../10-controls/SECURITY_VALIDATION.md) | [server/csrf.ts](../../../server/csrf.ts) | [tests/backend/csrf.test.ts](../../../tests/backend/csrf.test.ts) | Token validation coverage |
| Multi-Tenant Isolation | [Threat Model](../20-threat-model/THREAT_MODEL.md) | [server/routes.ts](../../../server/routes.ts), [server/storage.ts](../../../server/storage.ts) | [tests/backend/multi-tenant-isolation.test.ts](../../../tests/backend/multi-tenant-isolation.test.ts) | Add DB RLS roadmap |
| Input Validation | [Application Security](../30-implementation-guides/APPLICATION_SECURITY.md) | [shared/schema.ts](../../../shared/schema.ts) | [shared/schema.test.ts](../../../shared/schema.test.ts) | Zod schemas enforce allowlists |
| SQL Injection Prevention | [Application Security](../30-implementation-guides/APPLICATION_SECURITY.md) | [server/storage.ts](../../../server/storage.ts) | [tests/backend/api-routes.test.ts](../../../tests/backend/api-routes.test.ts) | Drizzle parameterization |
| Security Headers | [Configuration Guide](../30-implementation-guides/CONFIGURATION_GUIDE.md) | [server/security.ts](../../../server/security.ts) | [tests/backend/security.test.ts](../../../tests/backend/security.test.ts) | HSTS/CSP/Frame options |
| Rate Limiting | [Security Summary](../00-overview/SECURITY_SUMMARY.md) | [server/security.ts](../../../server/security.ts) | [tests/backend/security.test.ts](../../../tests/backend/security.test.ts) | Redis migration pending |
| PII Redaction | [Data Protection](../30-implementation-guides/DATA_PROTECTION.md) | [server/security-utils.ts](../../../server/security-utils.ts) | [tests/backend/security-utils.test.ts](../../../tests/backend/security-utils.test.ts) | Centralized logger gap |
| Error Handling | [Application Security](../30-implementation-guides/APPLICATION_SECURITY.md) | [server/index.ts](../../../server/index.ts) | [tests/backend/api-routes.test.ts](../../../tests/backend/api-routes.test.ts) | No stack traces in prod |
| Security Monitoring | [Security Monitoring](../30-implementation-guides/SECURITY_MONITORING.md) | [server/index.ts](../../../server/index.ts) | [tests/backend/security-utils.test.ts](../../../tests/backend/security-utils.test.ts) | SIEM integration future |

## Validation & Evidence

- Validation entry point: [docs/security/10-controls/SECURITY_VALIDATION.md](../10-controls/SECURITY_VALIDATION.md)
- CI workflow: [.github/workflows/test.yml](../../../.github/workflows/test.yml)

## Compliance Cross-References

- SOC2: [SOC2 Compliance](../40-compliance/SOC2_COMPLIANCE.md)
- PCI-DSS: [PCI-DSS Guidelines](../40-compliance/PCI_DSS_GUIDELINES.md)
- HIPAA: [HIPAA Compliance](../40-compliance/HIPAA_COMPLIANCE.md)
- GDPR: [GDPR Compliance](../40-compliance/GDPR_COMPLIANCE.md)
