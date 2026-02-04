# Project Backlog

<!--
SYSTEM INSTRUCTIONS â€” BACKLOG.md (agent-enforced)

Purpose: Storage of unscheduled tasks. Agent replenishes TODO.md from here.

Canonical workflow + templates live in: TASKS.md

Global Rules:
1) All tasks MUST follow this header format:
   ### # [id:...][type:...][priority:...][component:...] Title
2) Task blocks MUST be wrapped with:
   ## task_begin
   ## task_end
3) Grouping rules (for deterministic batching):
   - Tasks are grouped using:
     ## group_begin [type:X][priority:Y]
     ## group_end
   - When replenishing TODO.md:
     a) Select ONE group only (single type).
     b) Take up to 5 tasks in listed order.
     c) MOVE tasks to TODO.md (copy then delete from BACKLOG.md).
4) Agent MUST NOT rewrite task content except to:
   - normalize formatting
   - fix obvious tag typos
   - add missing fields if absent
5) Do NOT reorder tasks inside a group.
6) REQUIRED FIELDS (per TASKS.md):
   - **Plan:** Minimum 3 numbered implementation steps
   - **Estimated Effort:** Time estimate (hours/days/weeks)
   - **Relevant Documentation:** Links to /docs/ files with context
   - If a task is missing these, it is incomplete and should not be promoted to TODO.md
-->

## group_begin [type:security][priority:critical]
## ðŸ” Security â€” CRITICAL (Production Blockers)

<!-- Tasks TASK-20260204-001, TASK-20260204-002, TASK-20260204-003 moved to TODO.md on 2026-02-04 -->

## group_end

## group_begin [type:config][priority:critical]
## ðŸ§° Config & Tooling â€” CRITICAL


## group_end

## group_begin [type:infra][priority:high]
## ðŸ³ Infrastructure (Unscheduled) â€” High



## group_end

## group_begin [type:dev][priority:high]
## ðŸš€ Development (Unscheduled) â€” High




## group_end

## group_begin [type:dev][priority:medium]
## ðŸš€ Development (Unscheduled) â€” Medium




## group_end

## group_begin [type:quality][priority:medium]
## âœ… Code Quality (Unscheduled) â€” Medium


## group_end

## group_begin [type:security][priority:high]
## ðŸ” Security â€” HIGH

## task_begin
### # [id:TASK-20260204-004][type:security][priority:high][component:server] Implement RBAC (Role-Based Access Control)
**Status:** todo  
**Description:** Implement role-based access control system with granular user permissions beyond org-level isolation.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Role model documented (Admin, Editor, Viewer, custom roles)
- [ ] Roles table in database with proper indexes
- [ ] RBAC middleware implemented for authorization checks
- [ ] Permission checks on all API endpoints
- [ ] Tests validate role-based access (50+ scenarios)
- [ ] Admin panel for role/permission management
- [ ] Audit logging for role changes
- [ ] Documentation updated
**Definition of Done:**  
- [ ] All tests pass
- [ ] Security review complete
- [ ] Documentation updated
**Relevant Files:** `shared/schema.ts`, `server/middleware/rbac.ts` (new), `server/routes.ts`, `shared/models/auth.ts`
**Relevant Documentation:** `docs/security/10-controls/RBAC.md` â€” RBAC requirements and implementation, `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md` â€” Authentication architecture, `docs/data/20_entities/OrganizationMember.md` â€” User-role associations, `docs/security/10-controls/SECURITY_TESTING.md` â€” Security test requirements
**Plan:**  
1. Define role model and permission matrix
2. Create roles/permissions tables in schema
3. Create migration for roles tables
4. Implement RBAC middleware
5. Add permission checks to all routes
6. Write comprehensive tests (50+ scenarios)
7. Build admin UI for role management
8. Add audit logging for role changes
9. Update documentation
**Estimated Effort:** 4-6 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-005][type:security][priority:high][component:server] Implement encryption at rest for sensitive data
**Status:** todo  
**Description:** Implement field-level encryption for sensitive data (credentials, PII, payment data) at rest in database.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Encryption library selected and integrated (Argon2id/nacl.js)
- [ ] Key management implemented (KMS or env-based)
- [ ] All CRITICAL data encrypted (passwords, PAN, API keys, tokens)
- [ ] Transparent encryption/decryption for app code
- [ ] Search works for encrypted fields (via hash)
- [ ] Tests validate encryption/decryption
- [ ] Performance impact < 10ms per operation
- [ ] Documentation updated
**Definition of Done:**  
- [ ] All critical PII encrypted
- [ ] Tests pass
- [ ] Performance validated
- [ ] Security review complete
**Relevant Files:** `server/crypto.ts` (new), `server/storage.ts`, `shared/schema.ts`, `.env.example`
**Relevant Documentation:** `docs/security/10-controls/ENCRYPTION.md` â€” Encryption requirements, `docs/security/40-compliance/GDPR.md` â€” Data protection requirements, `docs/data/PII_INVENTORY.md` â€” PII fields requiring encryption, `docs/security/30-implementation-guides/KEY_MANAGEMENT.md` â€” Key management practices
**Plan:**  
1. Select encryption library (recommend nacl.js)
2. Implement key management system
3. Classify data (CRITICAL/HIGH/MEDIUM)
4. Add encryption/decryption middleware
5. Migrate existing sensitive data
6. Implement search via hashing
7. Write encryption tests
8. Performance test
9. Documentation
**Estimated Effort:** 3-4 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-006][type:security][priority:high][component:server] Implement key rotation and escrow
**Status:** todo  
**Description:** Implement automated key rotation for encryption keys with proper escrow procedures.  
**Dependencies:** TASK-20260204-005 (encryption at rest)  
**Acceptance Criteria:**  
- [ ] Key versioning system implemented
- [ ] Automated rotation schedule configured (30/60/90 day policy)
- [ ] Old keys retained with metadata for historical data
- [ ] Key escrow/backup procedure documented
- [ ] Key recovery procedures tested
- [ ] Audit logs track all key operations
- [ ] Tests validate rotation without data loss
- [ ] Documentation updated
**Definition of Done:**  
- [ ] Rotation tested in staging
- [ ] Escrow procedure validated
- [ ] Tests pass
- [ ] Documentation complete
**Relevant Files:** `server/crypto.ts`, `server/key-rotation.ts` (new), docs/security/
**Relevant Documentation:** `docs/security/30-implementation-guides/KEY_MANAGEMENT.md` â€” Key rotation procedures, `docs/security/10-controls/ENCRYPTION.md` â€” Encryption architecture, `docs/security/40-compliance/GDPR.md` â€” Compliance requirements
**Plan:**  
1. Design key versioning system
2. Create key metadata table
3. Implement rotation scheduler
4. Implement old key retention logic
5. Document escrow procedure
6. Test key recovery
7. Add audit logging
8. Write rotation tests
9. Documentation
**Estimated Effort:** 2-3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-007][type:security][priority:high][component:server] Implement enhanced audit logging
**Status:** todo  
**Description:** Expand audit logging to capture all security-relevant events with tamper-evident protections.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Audit log schema designed (immutable append-only)
- [ ] All security events logged (auth, authz, data access, config, admin, security events)
- [ ] Structured JSON format
- [ ] Append-only enforcement (no updates/deletes)
- [ ] HMAC integrity checking implemented
- [ ] Log rotation configured
- [ ] Tests validate audit completeness
- [ ] Performance impact < 5ms per log
- [ ] Documentation updated
**Definition of Done:**  
- [ ] All events logged
- [ ] Integrity protection working
- [ ] Tests pass
- [ ] Performance validated
**Relevant Files:** `server/audit-log.ts` (new), `shared/schema.ts`, `server/middleware/audit.ts` (new)
**Relevant Documentation:** `docs/data/10_current_state/AUDIT_LOGGING_AND_REDACTION.md` â€” Audit log architecture, `docs/security/10-controls/AUDIT_LOGGING.md` â€” Audit requirements, `docs/security/40-compliance/GDPR.md` â€” Compliance audit trail, `docs/data/20_entities/ActivityEvent.md` â€” Timeline/audit schema
**Plan:**  
1. Design audit log schema
2. Create audit_logs table
3. Implement HMAC integrity
4. Add audit middleware
5. Capture all security events
6. Configure log rotation
7. Write completeness tests
8. Performance test
9. Documentation
**Estimated Effort:** 3-4 weeks
## task_end

## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security â€” MEDIUM

## task_begin
### # [id:TASK-20260204-008][type:security][priority:medium][component:server] Implement MFA (Multi-Factor Authentication)
**Status:** todo  
**Description:** Add MFA support for high-risk operations (admin actions, sensitive data access).  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] MFA enrollment/setup UI
- [ ] TOTP library integrated (speakeasy or similar)
- [ ] Backup code generation and validation
- [ ] Admin MFA requirement enforced
- [ ] Optional MFA for regular users
- [ ] Device trust configuration
- [ ] Tests validate MFA flows
- [ ] Documentation updated
**Definition of Done:**  
- [ ] MFA working for admins
- [ ] Tests pass
- [ ] Documentation complete
**Relevant Files:** `server/mfa.ts` (new), `client/src/pages/mfa/` (new), `shared/models/auth.ts`
**Relevant Documentation:** `docs/security/10-controls/MFA.md` â€” MFA requirements, `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md` â€” Authentication architecture, `docs/security/10-controls/SECURITY_TESTING.md` â€” MFA test scenarios
**Plan:**  
1. Install TOTP library (speakeasy)
2. Create MFA enrollment flow
3. Implement TOTP validation
4. Generate backup codes
5. Enforce for admins
6. Add device trust
7. Build enrollment UI
8. Write MFA tests
9. Documentation
**Estimated Effort:** 2-3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-009][type:security][priority:medium][component:server] Implement database Row-Level Security (RLS)
**Status:** todo  
**Description:** Add PostgreSQL row-level security for defense-in-depth multi-tenant isolation.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] RLS policies created for all sensitive tables
- [ ] User roles defined (user, org_admin, super_admin)
- [ ] Application queries work with RLS enabled
- [ ] Cross-tenant access blocked at DB level (tested)
- [ ] Performance impact acceptable (< 10% overhead)
- [ ] Documentation updated
- [ ] Security testing validates isolation
**Definition of Done:**  
- [ ] RLS policies active
- [ ] Tests pass
- [ ] Performance validated
- [ ] Security review complete
**Relevant Files:** LIKELY: `shared/migrations/` (RLS policies), docs/data/, docs/security/
**Relevant Documentation:** `docs/security/10-controls/TENANT_ISOLATION.md` â€” Multi-tenant security, `docs/data/10_current_state/DATA_FLOWS.md` â€” Data access patterns, `docs/security/20-threat-model/THREAT_MODEL.md` â€” Defense-in-depth strategy, `docs/data/20_entities/ENTITY_INDEX.md` â€” All tables requiring RLS
**Plan:**  
1. Design RLS policies per table
2. Define user role hierarchy
3. Create RLS migration
4. Test application queries with RLS
5. Test cross-tenant blocking
6. Performance validation
7. Security testing
8. Documentation
**Estimated Effort:** 2-3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-010][type:security][priority:medium][component:server] Implement anomaly detection and alerting
**Status:** todo  
**Description:** Implement anomaly detection to identify suspicious behavior patterns (unusual logins, failed attempts, bulk access, off-hours admin actions).  
**Dependencies:** TASK-20260204-007 (enhanced audit logging)  
**Acceptance Criteria:**  
- [ ] Baseline established for normal user behavior
- [ ] Anomaly detection rules configured
- [ ] Alert mechanism working (email/Slack/PagerDuty)
- [ ] False positive rate acceptable (< 5%)
- [ ] Tests validate detection accuracy
- [ ] Documentation updated
**Definition of Done:**  
- [ ] Detection working
- [ ] Alerts configured
- [ ] Tests pass
- [ ] Documentation complete
**Relevant Files:** `server/anomaly-detection.ts` (new), `server/alerts.ts` (new)
**Relevant Documentation:** `docs/security/10-controls/INTRUSION_DETECTION.md` â€” Anomaly detection rules, `docs/data/10_current_state/AUDIT_LOGGING_AND_REDACTION.md` â€” Audit log source, `docs/security/50-incident-response/INCIDENT_RESPONSE.md` â€” Alert response procedures
**Plan:**  
1. Establish behavioral baselines
2. Define anomaly rules
3. Implement statistical analysis
4. Configure alerting mechanism
5. Test detection accuracy
6. Tune false positive rate
7. Documentation
**Estimated Effort:** 3-4 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-011][type:security][priority:medium][component:infra] Implement SIEM integration
**Status:** todo  
**Description:** Integrate with external SIEM (Datadog/ELK/Splunk) for centralized logging and alerting.  
**Dependencies:** TASK-20260204-007 (enhanced audit logging)  
**Acceptance Criteria:**  
- [ ] Logs forwarded to SIEM
- [ ] Parsing rules working
- [ ] Key dashboards created
- [ ] Alert rules configured
- [ ] Retention policy enforced
- [ ] Documentation updated
**Definition of Done:**  
- [ ] SIEM integration working
- [ ] Dashboards validated
- [ ] Tests pass
- [ ] Documentation complete
**Relevant Files:** `server/siem.ts` (new), `.env.example`, docs/security/
**Relevant Documentation:** `docs/security/30-implementation-guides/SIEM_INTEGRATION.md` â€” SIEM setup guide, `docs/data/10_current_state/AUDIT_LOGGING_AND_REDACTION.md` â€” Log format, `docs/security/10-controls/SECURITY_MONITORING.md` â€” Monitoring requirements
**Plan:**  
1. Select SIEM (recommend Datadog or ELK)
2. Configure log forwarding
3. Create parsing rules
4. Build dashboards
5. Configure alerts
6. Set retention policy
7. Documentation
**Estimated Effort:** 2-3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-012][type:security][priority:medium][component:ci] Implement SAST in CI/CD pipeline
**Status:** todo  
**Description:** Enforce static application security testing (SAST) in CI/CD pipeline to catch vulnerabilities early.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] SAST tool integrated in CI/CD (CodeQL/SonarQube/Snyk)
- [ ] Failing on critical vulnerabilities
- [ ] Dependency scanning enforced
- [ ] Secret scanning working (no credentials in code)
- [ ] Build dashboard showing scan results
- [ ] Documentation updated
**Definition of Done:**  
- [ ] SAST running in CI
- [ ] Build fails on critical vulns
- [ ] Tests pass
- [ ] Documentation complete
**Relevant Files:** `.github/workflows/ci.yml`, `package.json`, docs/security/
**Relevant Documentation:** `docs/security/10-controls/SECURITY_TESTING.md` â€” SAST requirements, `docs/security/30-implementation-guides/CI_CD_SECURITY.md` â€” CI/CD security guide, `docs/architecture/10_current_state/BUILD_AND_TOOLING.md` â€” Build pipeline
**Plan:**  
1. Select SAST tool (recommend CodeQL for GitHub)
2. Configure in CI/CD pipeline
3. Set failure thresholds
4. Enable dependency scanning
5. Enable secret scanning
6. Create dashboard
7. Documentation
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-013][type:security][priority:medium][component:server] Implement password hashing (when auth added)
**Status:** todo  
**Description:** Implement secure password storage with Argon2id hashing when password authentication is added.  
**Dependencies:** None (future - when real auth implemented)  
**Acceptance Criteria:**  
- [ ] Argon2id hashing implemented
- [ ] Password strength validation enforced
- [ ] Password history tracked (prevent reuse)
- [ ] Secure password reset flow
- [ ] Rate limiting on password checks
- [ ] Tests validate hashing
- [ ] Documentation updated
**Definition of Done:**  
- [ ] Hashing working
- [ ] Tests pass
- [ ] Security review complete
**Relevant Files:** `server/auth/password.ts` (new), `shared/models/auth.ts`
**Relevant Documentation:** `docs/security/10-controls/PASSWORD_POLICY.md` â€” Password requirements, `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md` â€” Authentication architecture, `docs/security/10-controls/SECURITY_TESTING.md` â€” Password security tests
**Plan:**  
1. Install Argon2id library
2. Implement hashing functions
3. Add password strength validation
4. Track password history
5. Implement reset flow
6. Add rate limiting
7. Write tests
8. Documentation
**Estimated Effort:** 2-3 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-014][type:security][priority:medium][component:server] Implement file upload security
**Status:** todo  
**Description:** Add file upload handling with type validation, virus scanning, and secure storage.  
**Dependencies:** None (when file uploads needed)  
**Acceptance Criteria:**  
- [ ] File type validation (whitelist)
- [ ] File size limits enforced
- [ ] Virus/malware scanning integrated
- [ ] Secure storage (not web-accessible)
- [ ] MIME type checking
- [ ] Path traversal prevention tested
- [ ] Quarantine for suspicious files
- [ ] Tests validate all scenarios
- [ ] Documentation updated
**Definition of Done:**  
- [ ] All validations working
- [ ] Virus scanning active
- [ ] Tests pass
- [ ] Documentation complete
**Relevant Files:** `server/upload.ts` (new), `server/storage/files.ts` (new)
**Relevant Documentation:** `docs/security/10-controls/FILE_UPLOAD_SECURITY.md` â€” Upload security requirements, `docs/api/files/README.md` â€” Files API contracts, `docs/data/30_interfaces/FILES_AND_UPLOADS.md` â€” File handling patterns, `docs/security/20-threat-model/THREAT_MODEL.md` â€” File upload threats
**Plan:**  
1. Configure file type whitelist
2. Implement size limits
3. Integrate virus scanner (ClamAV)
4. Configure secure storage
5. Add MIME checking
6. Test path traversal prevention
7. Implement quarantine
8. Write tests
9. Documentation
**Estimated Effort:** 3-4 weeks
## task_end

## group_end

## group_begin [type:quality][priority:high]
## âœ… Code Quality (Unscheduled) â€” High

## group_end

## group_begin [type:ci][priority:high]
## ðŸ§ª CI (Unscheduled) â€” High

## group_end

## group_begin [type:test][priority:high]
## ðŸ§± Testing (Unscheduled) â€” High

## group_end

## group_begin [type:devex][priority:medium]
## ðŸ§­ Developer Experience (Unscheduled) â€” Medium


## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security & Governance (Unscheduled) â€” Medium

## task_begin
### # [id:TASK-20260203-013][type:security][priority:medium][component:repo] Add SECURITY.md and vulnerability reporting guidance
**Status:** todo  
**Description:** Document how to report security issues and the supported disclosure process.
**Acceptance Criteria:**  
- [ ] `SECURITY.md` exists with contact/process
- [ ] README links to the security policy
**Relevant Files:** `SECURITY.md`, `README.md`
**Relevant Documentation:** `docs/security/00-overview/SECURITY_POLICY.md` â€” Security policy details, `docs/security/50-incident-response/README.md` â€” Incident response procedures
**Plan:**  
1. Create SECURITY.md in repo root
2. Add security contact information
3. Document vulnerability disclosure process
4. Specify response SLAs
5. Link to full security documentation
6. Add link from README.md
**Estimated Effort:** 1 hour
## task_end

---

## task_begin
### # [id:TASK-20260203-014][type:security][priority:medium][component:repo] Add CONTRIBUTING + PR/issue templates
**Status:** todo  
**Description:** Add contributor guidance and lightweight GitHub templates to standardize changes.
**Acceptance Criteria:**  
- [ ] `CONTRIBUTING.md` exists (workflow, coding standards, how to run checks)
- [ ] PR template exists and prompts for tests/screenshots
- [ ] Issue templates exist for bugs and feature requests
**Relevant Files:** `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*`
**Relevant Documentation:** `docs/standards/README.md` â€” Documentation standards, `docs/architecture/README.md` â€” Architecture patterns, `docs/tests/README.md` â€” Testing standards
**Plan:**  
1. Create CONTRIBUTING.md with workflow and coding standards
2. Document how to run tests, lint, typecheck
3. Create .github/PULL_REQUEST_TEMPLATE.md
4. Create .github/ISSUE_TEMPLATE/bug_report.md
5. Create .github/ISSUE_TEMPLATE/feature_request.md
6. Link from README.md
**Estimated Effort:** 2-3 hours
## task_end

## group_end

## group_begin [type:docs][priority:high]
## ðŸ“š Documentation â€” HIGH


---


---


---


---


---


---


---


---


---


---


---


---


---


## group_end

## group_begin [type:docs][priority:medium]
## ðŸ“š Documentation â€” MEDIUM (P1 Remaining)


---


---


## group_end

## group_begin [type:docs][priority:low]
## ðŸ“š Documentation â€” LOW (P2 "Wise Extras")


---


---


---


## group_end

## group_begin [type:ci][priority:medium]
## ðŸ§ª CI (Unscheduled) â€” Medium

## group_end

## group_begin [type:reliability][priority:low]
## ðŸ›¡ï¸ Reliability (Unscheduled) â€” Low


## group_end

## group_begin [type:release][priority:low]
## ðŸ·ï¸ Release Management (Unscheduled) â€” Low


## group_end

## group_begin [type:infra][priority:low]
## ðŸ³ Infrastructure (Unscheduled) â€” Low


## group_end

## group_begin [type:config][priority:low]
## ðŸ§° Config & Tooling (Unscheduled) â€” Low


## group_end

