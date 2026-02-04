---
title: "Security Documentation Consolidation Plan"
version: "1.0.0"
last_updated: "2026-02-04"
status: "draft"
owner: "Security Team"
classification: "internal"
---

# Security Documentation Consolidation Plan

## Goals

1. Establish a clear folder system under the security documentation directory.
2. Inventory what exists in the repo and reconcile document references.
3. Create a documentation index that links controls and guidance to code artifacts.

---

## 1) Proposed Folder System (Target Structure)

```
/docs/security
  /_index
    INDEX.md
    CODE_MAP.md
  /00-overview
    README.md
    SECURITY_SUMMARY.md
  /10-controls
    CONTROLS_MATRIX.md
    SECURITY_VALIDATION.md
  /20-threat-model
    THREAT_MODEL.md
  /30-implementation-guides
    ACCESS_CONTROL.md
    APPLICATION_SECURITY.md
    DATA_PROTECTION.md
    SECURITY_MONITORING.md
    CONFIGURATION_GUIDE.md
    DEVELOPER_GUIDE.md
  /40-compliance
    SOC2_COMPLIANCE.md
    PCI_DSS_GUIDELINES.md
    HIPAA_COMPLIANCE.md
    GDPR_COMPLIANCE.md
  /50-incident-response
    INCIDENT_RESPONSE.md
  /90-archive
    (future: superseded or deprecated docs)
```

### Rationale

- **00-overview**: high-level entry points and summaries.
- **10-controls**: authoritative control mapping and validation procedures.
- **20-threat-model**: system threat modeling and risk register.
- **30-implementation-guides**: practical guidance for developers and operators.
- **40-compliance**: regulatory and framework documentation.
- **50-incident-response**: response planning and procedures.
- **_index**: navigation and code linkage artifacts.

---

## 2) Inventory of Existing Documents (Current State)

All documents currently reside in docs/security. The following are present:

- README.md
- SECURITY_SUMMARY_NEW.md
- CONTROLS_MATRIX.md
- SECURITY_VALIDATION.md
- THREAT_MODEL.md
- ACCESS_CONTROL.md
- APPLICATION_SECURITY.md
- DATA_PROTECTION.md
- SECURITY_MONITORING.md
- CONFIGURATION_GUIDE.md
- DEVELOPER_GUIDE.md
- INCIDENT_RESPONSE.md
- SOC2_COMPLIANCE.md
- PCI_DSS_GUIDELINES.md
- HIPAA_COMPLIANCE.md
- GDPR_COMPLIANCE.md

### Missing Files Referenced by README

The current README references the following, but they are not in repo:

- NETWORK_SECURITY.md
- DEPLOYMENT_SECURITY.md
- SECURITY_TESTING.md
- SECURITY_POLICY.md
- VULNERABILITY_MANAGEMENT.md
- CHANGE_MANAGEMENT.md

**Decision needed:**
- Either create these documents or remove the references.

---

## 3) Move Plan (Current → Target)

| Current File | Target Folder | Target Filename |
|---|---|---|
| README.md | 00-overview | README.md |
| SECURITY_SUMMARY_NEW.md | 00-overview | SECURITY_SUMMARY.md |
| CONTROLS_MATRIX.md | 10-controls | CONTROLS_MATRIX.md |
| SECURITY_VALIDATION.md | 10-controls | SECURITY_VALIDATION.md |
| THREAT_MODEL.md | 20-threat-model | THREAT_MODEL.md |
| ACCESS_CONTROL.md | 30-implementation-guides | ACCESS_CONTROL.md |
| APPLICATION_SECURITY.md | 30-implementation-guides | APPLICATION_SECURITY.md |
| DATA_PROTECTION.md | 30-implementation-guides | DATA_PROTECTION.md |
| SECURITY_MONITORING.md | 30-implementation-guides | SECURITY_MONITORING.md |
| CONFIGURATION_GUIDE.md | 30-implementation-guides | CONFIGURATION_GUIDE.md |
| DEVELOPER_GUIDE.md | 30-implementation-guides | DEVELOPER_GUIDE.md |
| INCIDENT_RESPONSE.md | 50-incident-response | INCIDENT_RESPONSE.md |
| SOC2_COMPLIANCE.md | 40-compliance | SOC2_COMPLIANCE.md |
| PCI_DSS_GUIDELINES.md | 40-compliance | PCI_DSS_GUIDELINES.md |
| HIPAA_COMPLIANCE.md | 40-compliance | HIPAA_COMPLIANCE.md |
| GDPR_COMPLIANCE.md | 40-compliance | GDPR_COMPLIANCE.md |

---

## 4) Documentation Index (Connect Docs → Code)

Create a central index under docs/security/_index with two files:

### A) INDEX.md (Navigation)

- High-level table of contents with links to each doc, grouped by section.
- Brief purpose statement for each doc.
- Explicit note on missing documents (if any).

### B) CODE_MAP.md (Documentation → Code Evidence)

A mapping of controls and claims to code artifacts, tests, and config. Use a table like:

| Area | Documentation | Code/Config Evidence | Tests | Notes |
|---|---|---|---|---|
| AuthN/AuthZ | ACCESS_CONTROL.md | server/routes.ts, server/session.ts | tests/backend/auth-middleware.test.ts | Confirm prod header auth disabled |
| CSRF | SECURITY_VALIDATION.md | server/csrf.ts | tests/backend/csrf.test.ts | Align status across docs |
| Tenant Isolation | THREAT_MODEL.md | server/storage.ts, server/routes.ts | tests/backend/multi-tenant-isolation.test.ts | Add RLS roadmap |
| Security Headers | CONFIGURATION_GUIDE.md | server/security.ts | tests/backend/security.test.ts | Verify HSTS/CSP |
| PII Redaction | DATA_PROTECTION.md | server/security-utils.ts | tests/backend/security-utils.test.ts | Centralized logger gap |
| Rate Limiting | SECURITY_SUMMARY.md | server/security.ts | tests/backend/security.test.ts | Redis TODO |

This is the single place where documentation claims map to repo evidence.

---

## 5) Reconciliation Tasks

### A) Fix Inconsistencies (Status Alignment)

Known inconsistencies to resolve across documents:

- Session timeout and rotation status
- CSRF enforcement status
- PII redaction/logging status
- RBAC implementation status

Target source of truth should be docs/security/10-controls/CONTROLS_MATRIX.md and docs/security/10-controls/SECURITY_VALIDATION.md after migration.

### B) Update References

- Update links in README and all docs to new relative paths.
- Ensure references to missing docs are removed or replaced.

---

## 6) Implementation Steps

1. Create folder structure under docs/security.
2. Move files to their target folders and rename SECURITY_SUMMARY_NEW.md → SECURITY_SUMMARY.md.
3. Add docs/security/_index/INDEX.md and docs/security/_index/CODE_MAP.md.
4. Update all internal links to reflect new paths.
5. Decide on missing docs: create or remove references.
6. Reconcile status inconsistencies by updating controls matrix and summary.

---

## 7) Acceptance Criteria

- All docs are placed in the target folder structure.
- A navigable index exists at docs/security/_index/INDEX.md.
- A code linkage map exists at docs/security/_index/CODE_MAP.md.
- No broken internal links.
- Missing-doc references resolved.
- Status inconsistencies reconciled and documented.
