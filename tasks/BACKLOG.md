# Project Backlog

<!--
SYSTEM INSTRUCTIONS — BACKLOG.md (agent-enforced)

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
-->

## group_begin [type:security][priority:critical]
## 🔐 Security — CRITICAL (Production Blockers)

<!-- Tasks TASK-20260204-001, TASK-20260204-002, TASK-20260204-003 moved to TODO.md on 2026-02-04 -->

## group_end

## group_begin [type:config][priority:critical]
## 🧰 Config & Tooling — CRITICAL

## task_begin
### # [id:TASK-20260203-001][type:config][priority:critical][component:repo] Create AGENTS governance pack
**Status:** todo  
**Description:** Create comprehensive governance pack per PLAN.md requirements. This is the foundation for all other work and must be completed first per PLAN.md "Step 1: Inspect the repository and create governance pack if missing."  
**Dependencies:** None (blocks all other work)
**Acceptance Criteria:**  
- [ ] /AGENTS/AGENTS.toon entrypoint created
- [ ] /AGENTS/policies/TOOL_POLICY.md created
- [ ] /AGENTS/policies/SAFETY_POLICY.md created
- [ ] /AGENTS/policies/ARCHITECTURE_RULES.md created
- [ ] /AGENTS/policies/CODING_STANDARDS.md created
- [ ] /AGENTS/tasks/TODO.toon created
- [ ] /AGENTS/tasks/BACKLOG.toon created
- [ ] /AGENTS/tasks/ARCHIVE.toon created
- [ ] Governance pack is enforceable and documented
**Definition of Done:**  
- [ ] All files created and validated
- [ ] PLAN.md requirements satisfied
- [ ] README.md links to governance pack
**Relevant Files:** `/AGENTS/*` (all new), `README.md`, `PLAN.md`
**Plan:**  
1. Create `/AGENTS/` directory structure
2. Create AGENTS.toon entrypoint (references PLAN.md)
3. Define TOOL_POLICY (tool usage guidelines)
4. Define SAFETY_POLICY (security, PII, credentials)
5. Define ARCHITECTURE_RULES (from PLAN.md: domain boundaries, no cross-domain reads, workflow orchestration)
6. Define CODING_STANDARDS (TypeScript, testing, documentation)
7. Create task management files (toon format)
8. Link from README.md
9. Validate against PLAN.md checklist
**Estimated Effort:** 1 week
## task_end

## group_end

## group_begin [type:infra][priority:high]
## 🐳 Infrastructure (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-004][type:infra][priority:high][component:server] Implement Stage 0 foundation - Identity module
**Status:** todo  
**Description:** Implement identity domain module with tenant management, users, RBAC, sessions, and OIDC readiness.  
**Acceptance Criteria:**  
- [ ] Identity domain module with separate schema
- [ ] Tenant management with tenant_id everywhere
- [ ] User management with RBAC system
- [ ] Session management and authentication
- [ ] OIDC-ready configuration
- [ ] Database migrations for identity schema
**Relevant Files:** `src/identity/**/*`, identity migrations, auth system
## task_end

## task_begin
### # [id:TASK-20260203-005][type:infra][priority:high][component:server] Implement Stage 0 foundation - Core infrastructure
**Status:** todo  
**Description:** Implement core infrastructure including application shell, database migrations, outbox pattern, timeline, and workflow skeleton.  
**Acceptance Criteria:**  
- [ ] Application shell framework for modular monolith
- [ ] Database migration system with domain schemas
- [ ] Outbox table + dispatcher worker implementation
- [ ] Timeline (activity_event append-only) system
- [ ] Workflow engine skeleton with triggers/conditions/actions
- [ ] Docker compose setup (postgres, redis, minio)
**Relevant Files:** `src/core/**/*`, infrastructure, docker-compose.yml
## task_end

## group_end

## group_begin [type:dev][priority:high]
## 🚀 Development (Unscheduled) — High

## task_begin
### # [id:TASK-20260203-006][type:dev][priority:high][component:server] Implement Stage 1 vertical slice - CRM module
**Status:** todo  
**Description:** Implement CRM domain module as golden record with client/contact/relationship management, tags, and custom fields.  
**Acceptance Criteria:**  
- [ ] CRM domain module with separate schema
- [ ] Client/Contact golden record implementation
- [ ] Relationship management system
- [ ] Tags and custom fields (JSONB) support
- [ ] API routes for CRM operations
- [ ] Client Profile read model integration
**Relevant Files:** `src/crm/**/*`, CRM migrations, client profile system
## task_end

## task_begin
### # [id:TASK-20260203-007][type:dev][priority:high][component:server] Implement Stage 1 vertical slice - Core modules
**Status:** todo  
**Description:** Implement Scheduling, Files, Portal, and Projects modules with proper domain boundaries.  
**Acceptance Criteria:**  
- [ ] Scheduling module with appointments and calendar integration
- [ ] Files module with tree nodes, blob metadata, presigned URLs
- [ ] Portal module with magic links and client-facing views
- [ ] Projects module with tasks and kanban states
- [ ] Search module with basic Postgres search interface
- [ ] All modules follow domain boundary rules
**Relevant Files:** `src/scheduling/**/*`, `src/files/**/*`, `src/portal/**/*`, `src/projects/**/*`, `src/search/**/*`
## task_end

## task_begin
### # [id:TASK-20260203-008][type:dev][priority:high][component:client] Implement Stage 1 vertical slice - Frontend shell
**Status:** todo  
**Description:** Implement React SPA shell with auth screens, client profile hub, timeline view, and basic module interfaces.  
**Acceptance Criteria:**  
- [ ] React SPA application shell
- [ ] Authentication screens (login/register)
- [ ] Client Profile hub interface
- [ ] Timeline view component
- [ ] Basic navigation and routing
- [ ] Command-K global search interface
- [ ] Responsive design with TailwindCSS
**Relevant Files:** `client/src/**/*`, React components, routing
## task_end

## group_end

## group_begin [type:dev][priority:medium]
## 🚀 Development (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-009][type:dev][priority:medium][component:server] Implement Agreements and Revenue modules
**Status:** todo  
**Description:** Implement Agreements module (templates, proposals, contracts) and Revenue module (AR/AP orchestration).  
**Acceptance Criteria:**  
- [ ] Agreements module with template and proposal management
- [ ] Contract management with signature packets
- [ ] Revenue module with billing accounts and invoices
- [ ] AR/AP orchestration with approval workflows
- [ ] Integration stubs for ledger systems
- [ ] Payment processing integration points
**Relevant Files:** `src/agreements/**/*`, `src/revenue/**/*`, billing system
## task_end

## task_begin
### # [id:TASK-20260203-010][type:dev][priority:medium][component:server] Implement flagship workflows
**Status:** todo  
**Description:** Implement 6 flagship workflows as first-class workflow definitions with proper orchestration.  
**Acceptance Criteria:**  
- [ ] Workflow: appointment.booked → client setup → project creation
- [ ] Workflow: proposal.accepted → contract signing → project activation
- [ ] Workflow: file.request → project attachment → review task
- [ ] Workflow: milestone completion → invoice drafting → approval
- [ ] Workflow: invoice.paid → CRM updates → follow-up scheduling
- [ ] Workflow: bill.received → approval → ledger sync
- [ ] All workflows use workflow engine (no cross-domain calls)
**Relevant Files:** `src/workflow/definitions/**/*`, workflow implementations
## task_end

## task_begin
### # [id:TASK-20260203-011][type:dev][priority:medium][component:server] Implement integration stubs and health
**Status:** todo  
**Description:** Implement integration stubs for email, ledger, e-sign, and object storage with health monitoring.  
**Acceptance Criteria:**  
- [ ] Email integration OAuth scaffolding (Graph/Gmail)
- [ ] Ledger integration stubs (QBO/Xero) with mapping
- [ ] E-sign provider abstraction with webhook support
- [ ] MinIO object storage with presign service
- [ ] Per-tenant Integration Health dashboard
- [ ] Integration token vault and security
**Relevant Files:** `src/integrations/**/*`, integration health system
## task_end

## group_end

## group_begin [type:quality][priority:medium]
## ✅ Code Quality (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-012][type:quality][priority:medium][component:repo] Harden and finalize implementation
**Status:** todo  
**Description:** Complete hardening with comprehensive tests, observability, seed data, and security validation.  
**Acceptance Criteria:**  
- [ ] Unit tests for core domain services and workflow engine
- [ ] Integration tests for DB migrations and key endpoints
- [ ] Static checks: lint, typecheck, security audit
- [ ] Seed data + demo tenant generator
- [ ] Observability: structured logs, request IDs, metrics
- [ ] Security validation: tenant isolation, audit logs
- [ ] Complete documentation and runbook
**Relevant Files:** Test suites, monitoring, security configurations
## task_end

## group_end

## group_begin [type:security][priority:high]
## 🔐 Security — HIGH

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
## 🔐 Security — MEDIUM

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
## ✅ Code Quality (Unscheduled) — High

## group_end

## group_begin [type:ci][priority:high]
## 🧪 CI (Unscheduled) — High

## group_end

## group_begin [type:test][priority:high]
## 🧱 Testing (Unscheduled) — High

## group_end

## group_begin [type:devex][priority:medium]
## 🧭 Developer Experience (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-012][type:devex][priority:medium][component:tooling] Pin package manager + document install expectations
**Status:** todo  
**Description:** Ensure reproducible installs by explicitly pinning a package manager and documenting it.
**Acceptance Criteria:**  
- [ ] `package.json` includes `packageManager` (and/or docs specify npm version)
- [ ] README describes the expected install command (`npm ci` vs `npm install`)
**Relevant Files:** `package.json`, `README.md`
## task_end

## group_end

## group_begin [type:security][priority:medium]
## 🔐 Security & Governance (Unscheduled) — Medium

## task_begin
### # [id:TASK-20260203-013][type:security][priority:medium][component:repo] Add SECURITY.md and vulnerability reporting guidance
**Status:** todo  
**Description:** Document how to report security issues and the supported disclosure process.
**Acceptance Criteria:**  
- [ ] `SECURITY.md` exists with contact/process
- [ ] README links to the security policy
**Relevant Files:** `SECURITY.md`, `README.md`
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
## task_end

## group_end

## group_begin [type:docs][priority:high]
## 📚 Documentation — HIGH

## task_begin
### # [id:TASK-20260204-015][type:docs][priority:high][component:security] Create SECURITY_POLICY.md
**Status:** todo  
**Description:** Document organizational security policies and procedures.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Code of conduct defined
- [ ] Security responsibilities documented
- [ ] Incident reporting procedures created
- [ ] Policy enforcement guidelines specified
- [ ] Training requirements defined
**Definition of Done:**  
- [ ] Document complete and approved
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/00-overview/SECURITY_POLICY.md` (new)
**Plan:**  
1. Define code of conduct
2. Document responsibilities
3. Create reporting procedures
4. Define enforcement
5. Specify training
6. Review and link
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-016][type:docs][priority:high][component:security] Create SECURITY_TESTING.md
**Status:** todo  
**Description:** Document SAST/DAST, dependency scanning, pen testing procedures.  
**Dependencies:** TASK-20260204-012 (SAST implementation)  
**Acceptance Criteria:**  
- [ ] SAST configuration documented
- [ ] DAST procedures defined
- [ ] Dependency scanning documented
- [ ] Pen testing guidelines created
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/10-controls/SECURITY_TESTING.md` (new)
**Plan:**  
1. Document SAST
2. Define DAST
3. Document dependency scanning
4. Create pen test guidelines
5. Review and link
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-017][type:docs][priority:high][component:security] Create VULNERABILITY_MANAGEMENT.md
**Status:** todo  
**Description:** Document vulnerability discovery, assessment, remediation workflows.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Discovery sources documented
- [ ] Assessment methodology defined
- [ ] Remediation procedures specified
- [ ] SLAs established
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/20-threat-model/VULNERABILITY_MANAGEMENT.md` (new)
**Plan:**  
1. Document discovery
2. Define assessment
3. Create procedures
4. Establish SLAs
5. Review and link
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-018][type:docs][priority:high][component:security] Create NETWORK_SECURITY.md
**Status:** todo  
**Description:** Document network architecture, segmentation, firewall, IDS/IPS.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Architecture diagram created
- [ ] Segmentation documented
- [ ] Firewall rules defined
- [ ] IDS/IPS rules specified
**Definition of Done:**  
- [ ] Document complete with diagrams
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/30-implementation-guides/NETWORK_SECURITY.md` (new)
**Plan:**  
1. Create architecture diagram
2. Document segmentation
3. Define firewall rules
4. Define IDS/IPS
5. Review and link
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-019][type:docs][priority:high][component:security] Create DEPLOYMENT_SECURITY.md
**Status:** todo  
**Description:** Document CI/CD security, secrets management, IaC security.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] CI/CD pipeline security documented
- [ ] Secrets management procedures defined
- [ ] IaC security guidelines created
- [ ] Container security documented
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/30-implementation-guides/DEPLOYMENT_SECURITY.md` (new)
**Plan:**  
1. Document CI/CD security
2. Document secrets management
3. Define IaC security
4. Create container guidelines
5. Review and link
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-020][type:docs][priority:high][component:security] Create CHANGE_MANAGEMENT.md
**Status:** todo  
**Description:** Document change control, approval workflows, rollback procedures.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Change types defined
- [ ] Approval workflow documented
- [ ] Emergency procedures created
- [ ] Rollback procedures specified
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/30-implementation-guides/CHANGE_MANAGEMENT.md` (new)
**Plan:**  
1. Define change types
2. Document approval
3. Create emergency procedures
4. Document rollback
5. Review and link
**Estimated Effort:** 1-2 weeks
## task_end

---

## task_begin
### # [id:TASK-20260204-021][type:docs][priority:high][component:architecture] Create BUILD_AND_TOOLING.md
**Status:** todo  
**Description:** Document build system, scripts, bundlers, tooling pipeline.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Build commands documented
- [ ] Build pipeline explained (Vite + esbuild)
- [ ] Scripts documented
- [ ] Bundler configuration explained
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/architecture/README.md
**Relevant Files:** `docs/architecture/10_current_state/BUILD_AND_TOOLING.md` (new), Evidence: `script/build.ts`, `vite.config.ts`
**Plan:**  
1. Document build commands
2. Explain pipeline
3. Document scripts
4. Explain bundler
5. Review and link
**Estimated Effort:** 1-2 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-022][type:docs][priority:high][component:architecture] Create CONFIGURATION_MODEL.md
**Status:** todo  
**Description:** Document environment variables, config files, secrets management.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Environment variables documented
- [ ] Config files explained
- [ ] Secrets management documented
- [ ] Dev vs prod differences specified
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/architecture/README.md
**Relevant Files:** `docs/architecture/10_current_state/CONFIGURATION_MODEL.md` (new), Evidence: `server/index.ts`, `.env.example`
**Plan:**  
1. Document env vars
2. Explain config files
3. Document secrets
4. Specify differences
5. Review and link
**Estimated Effort:** 1 hour
## task_end

---

## task_begin
### # [id:TASK-20260204-023][type:docs][priority:high][component:architecture] Create DEPENDENCY_GRAPH.md
**Status:** todo  
**Description:** Document package dependencies, coupling hotspots, import relationships.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Dependencies categorized
- [ ] Client/server/shared deps listed
- [ ] Coupling hotspots identified
- [ ] Update policy documented
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/architecture/README.md
**Relevant Files:** `docs/architecture/10_current_state/DEPENDENCY_GRAPH.md` (new), Evidence: `package.json`
**Plan:**  
1. Analyze package.json
2. Categorize dependencies
3. Identify hotspots
4. Define policy
5. Review and link
**Estimated Effort:** 1-2 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-024][type:docs][priority:high][component:architecture] Create AUTH_AND_SESSION.md
**Status:** todo  
**Description:** Document auth model, session storage, multi-tenancy, production requirements.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Current auth model documented
- [ ] Session storage explained
- [ ] Multi-tenancy documented
- [ ] Production OIDC requirements specified
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/architecture/README.md
**Relevant Files:** `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md` (new), Evidence: `server/routes.ts`, `server/session.ts`
**Plan:**  
1. Document current auth
2. Explain sessions
3. Document multi-tenancy
4. Specify production requirements
5. Review and link
**Estimated Effort:** 1-2 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-025][type:docs][priority:high][component:architecture] Create SECURITY_BASELINE.md
**Status:** todo  
**Description:** Document security headers, rate limiting, CORS, PII redaction, threat model.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Security headers documented
- [ ] Rate limiting explained
- [ ] CORS policy documented
- [ ] PII redaction explained
**Definition of Done:**  
- [ ] Document complete
- [ ] Linked from docs/architecture/README.md
**Relevant Files:** `docs/architecture/30_cross_cutting/SECURITY_BASELINE.md` (new), Evidence: `server/security.ts`
**Plan:**  
1. Document headers
2. Explain rate limiting
3. Document CORS
4. Explain PII redaction
5. Review and link
**Estimated Effort:** 1-2 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-026][type:docs][priority:high][component:data] Resolve 10 data unknowns
**Status:** todo  
**Description:** Run verification commands to resolve 10 blocking unknowns about data layer.  
**Dependencies:** None (UNBLOCKS other data tasks)  
**Acceptance Criteria:**  
- [ ] All 10 commands executed
- [ ] Results documented
- [ ] COMPLETION_SUMMARY.md updated
- [ ] Blockers identified
**Definition of Done:**  
- [ ] All commands run
- [ ] Findings documented
**Relevant Files:** `docs/data/COMPLETION_SUMMARY.md`
**Plan:**  
1. Run migration verification
2. Check soft delete status
3. Check activity logging
4. Check CSRF protection
5. Check rate limiting
6. Check request logging
7. Check presigned URLs
8. Check pagination
9. Check full-text search
10. Check export/import
11. Document findings
**Estimated Effort:** 30 minutes
## task_end

---

## task_begin
### # [id:TASK-20260204-027][type:docs][priority:high][component:data] Document 17 remaining entities
**Status:** todo  
**Description:** Create entity documentation for 17 remaining entities.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] All 17 entity docs created
- [ ] Indexed in ENTITY_INDEX.md
- [ ] Examples provided
**Definition of Done:**  
- [ ] All docs complete
- [ ] Index updated
**Relevant Files:** `docs/data/20_entities/*.md` (17 new), `docs/data/20_entities/ENTITY_INDEX.md`
**Plan:**  
1. Batch 1: Proposal, Contract, Project
2. Batch 2: Thread, Message
3. Batch 3: InvoiceSchedule, Payment, Vendor
4. Batch 4: Organization, OrganizationMember, User
5. Batch 5: ClientCompany, FileObject, ActivityEvent, ClientPortalAccess, ProjectTemplate, Milestone
6. Update index
**Estimated Effort:** 3.75 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-028][type:docs][priority:high][component:data] Create 6 current state docs
**Status:** todo  
**Description:** Populate 6 current state documentation templates.  
**Dependencies:** TASK-20260204-026 (unknowns)  
**Acceptance Criteria:**  
- [ ] DATA_FLOWS.md complete
- [ ] AUDIT_LOGGING_AND_REDACTION.md complete
- [ ] RETENTION_AND_DELETION.md complete
- [ ] BACKUPS_AND_RECOVERY.md complete
- [ ] EVENTS_AND_WEBHOOKS.md complete
- [ ] FILES_AND_UPLOADS.md complete
**Definition of Done:**  
- [ ] All 6 docs complete
- [ ] Linked from index
**Relevant Files:** `docs/data/10_current_state/*.md` (4 files), `docs/data/30_interfaces/*.md` (2 files)
**Plan:**  
1. Populate DATA_FLOWS.md
2. Populate AUDIT_LOGGING_AND_REDACTION.md
3. Populate RETENTION_AND_DELETION.md
4. Populate BACKUPS_AND_RECOVERY.md
5. Populate EVENTS_AND_WEBHOOKS.md
6. Populate FILES_AND_UPLOADS.md
7. Link from index
**Estimated Effort:** 4 hours
## task_end

## group_end

## group_begin [type:docs][priority:medium]
## 📚 Documentation — MEDIUM (P1 Remaining)

## task_begin
### # [id:TASK-20260204-029][type:docs][priority:medium][component:api] Create OpenAPI specification
**Status:** todo  
**Description:** Generate OpenAPI 3.0 specification from current API routes for machine-readable API documentation.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] docs/api/openapi/openapi.yaml created with full API spec
- [ ] All endpoints documented with request/response schemas
- [ ] Authentication schemes documented
- [ ] Error responses documented
- [ ] Examples provided for all endpoints
- [ ] CI validation added to check spec validity
**Definition of Done:**  
- [ ] OpenAPI spec complete and valid
- [ ] Spec passes OpenAPI validator
- [ ] Linked from docs/api/README.md
**Relevant Files:** `docs/api/openapi/openapi.yaml` (new), Evidence: `server/routes.ts`, `shared/schema.ts`
**Plan:**  
1. Install OpenAPI tooling (swagger-jsdoc or manual)
2. Document authentication schemes
3. Document all GET endpoints with query params
4. Document all POST/PATCH endpoints with request bodies
5. Document all responses and error codes
6. Add request/response examples
7. Validate spec with OpenAPI validator
8. Add CI validation
9. Link from API README
**Estimated Effort:** 6-8 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-030][type:docs][priority:medium][component:tests] Consolidate test documentation
**Status:** todo  
**Description:** Organize test reports and documentation into consistent structure.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Test reports organized in docs/tests/reports/ OR kept at docs/ root with clear index
- [ ] docs/tests/README.md clearly links to all reports
- [ ] No duplicate or conflicting test documentation
- [ ] All test reports are dated and referenced
**Definition of Done:**  
- [ ] Test docs consolidated
- [ ] Navigation clear
- [ ] No duplicates
**Relevant Files:** `docs/tests/README.md`, `docs/archive/*_REPORT.md`, `docs/tests/reports/` (new)
**Plan:**  
1. Decide on location (docs/tests/reports/ vs docs/ root)
2. Move or link test reports consistently
3. Update docs/tests/README.md with clear navigation
4. Add report index with dates
5. Remove or archive duplicates
**Estimated Effort:** 1-2 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-031][type:docs][priority:medium][component:data] Complete missing entity documentation (17 entities)
**Status:** todo  
**Description:** Create complete documentation for 17 remaining entities per standard template.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] Organization.md complete
- [ ] OrganizationMember.md complete
- [ ] User.md complete
- [ ] ClientCompany.md complete
- [ ] Proposal.md complete
- [ ] Contract.md complete
- [ ] Project.md complete
- [ ] ProjectTemplate.md complete
- [ ] Milestone.md complete
- [ ] Thread.md complete
- [ ] Message.md complete
- [ ] FileObject.md complete
- [ ] InvoiceSchedule.md complete
- [ ] Payment.md complete
- [ ] Vendor.md complete
- [ ] ActivityEvent.md complete
- [ ] ClientPortalAccess.md complete
- [ ] All docs follow standard template (fields, constraints, tenancy, API endpoints, UI surfaces, tests, migration notes)
- [ ] ENTITY_INDEX.md updated with ✅ status for all
**Definition of Done:**  
- [ ] All 17 entity docs complete
- [ ] Index updated
- [ ] All docs linked and navigable
**Relevant Files:** `docs/data/20_entities/*.md` (17 new files), `docs/data/20_entities/ENTITY_INDEX.md`
**Plan:**  
1. Create Organization.md (tenant root)
2. Create OrganizationMember.md (RBAC)
3. Create User.md (global user)
4. Create ClientCompany.md (CRM)
5. Create Proposal.md (Agreements)
6. Create Contract.md (Agreements)
7. Create Project.md (Projects)
8. Create ProjectTemplate.md (Projects)
9. Create Milestone.md (Projects)
10. Create Thread.md (Communications)
11. Create Message.md (Communications)
12. Create FileObject.md (Files)
13. Create InvoiceSchedule.md (Revenue)
14. Create Payment.md (Revenue)
15. Create Vendor.md (Revenue)
16. Create ActivityEvent.md (Timeline)
17. Create ClientPortalAccess.md (Portal)
18. Update ENTITY_INDEX.md status
**Estimated Effort:** 8-10 hours
## task_end

## group_end

## group_begin [type:docs][priority:low]
## 📚 Documentation — LOW (P2 "Wise Extras")

## task_begin
### # [id:TASK-20260204-032][type:docs][priority:low][component:ops] Create Operations & Reliability documentation
**Status:** todo  
**Description:** Create operational runbooks, SLOs, and environment variable reference for production operations.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] docs/ops/RUNBOOK.md created (boot, deploy, rollback, incident checklist)
- [ ] docs/ops/SLOS_AND_ALERTS.md created (SLOs, SLIs, alert rules)
- [ ] docs/ops/ENV_VARS.md created (complete environment variable reference + validation rules)
- [ ] All docs linked from docs/README.md
**Definition of Done:**  
- [ ] All 3 ops docs complete
- [ ] Runbook tested for accuracy
- [ ] SLOs defined and measurable
- [ ] All env vars documented
**Relevant Files:** `docs/ops/RUNBOOK.md` (new), `docs/ops/SLOS_AND_ALERTS.md` (new), `docs/ops/ENV_VARS.md` (new)
**Plan:**  
1. Create docs/ops/ directory
2. Document startup/shutdown procedures
3. Document deployment procedures
4. Document rollback procedures
5. Create incident response checklist
6. Define SLOs (availability, latency, error rate)
7. Define SLIs (metrics to track)
8. Document alert rules and thresholds
9. Document all environment variables
10. Document validation rules
11. Link from master docs/README.md
**Estimated Effort:** 6-8 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-033][type:docs][priority:low][component:data] Create Data Governance documentation
**Status:** todo  
**Description:** Create data governance docs including glossary, PII inventory, and retention matrix.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] docs/data/GLOSSARY.md created (canonical terms: client vs contact vs org, etc.)
- [ ] docs/data/PII_INVENTORY.md created (fields containing PII + redaction rules)
- [ ] docs/data/RETENTION_MATRIX.md created (entity → retention → deletion method)
- [ ] All docs linked from docs/data/README.md
**Definition of Done:**  
- [ ] All 3 governance docs complete
- [ ] Glossary defines all ambiguous terms
- [ ] PII inventory complete and accurate
- [ ] Retention policies defined for all entities
**Relevant Files:** `docs/data/GLOSSARY.md` (new), `docs/data/PII_INVENTORY.md` (new), `docs/data/RETENTION_MATRIX.md` (new)
**Plan:**  
1. Create GLOSSARY.md
2. Define all ambiguous terms (client, contact, organization, deal, engagement, etc.)
3. Add cross-references
4. Create PII_INVENTORY.md
5. Audit all entities for PII fields
6. Document redaction rules per field
7. Map to security controls
8. Create RETENTION_MATRIX.md
9. Define retention policy per entity
10. Document deletion methods (soft delete, hard delete, archival)
11. Document compliance requirements (GDPR, CCPA, etc.)
12. Link from data README
**Estimated Effort:** 4-6 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-034][type:docs][priority:low][component:security] Create Security Evidence Pack automation
**Status:** todo  
**Description:** Create automation documentation for generating security evidence pack with exact commands.  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] docs/security/EVIDENCE_PACK.md created with exact commands
- [ ] Commands to generate SBOM documented
- [ ] Commands to generate CodeQL reports documented
- [ ] Commands to generate dependency scan output documented
- [ ] Commands to generate coverage reports documented
- [ ] Commands to generate audit log samples documented
- [ ] Script created to run all commands in sequence
**Definition of Done:**  
- [ ] EVIDENCE_PACK.md complete with all commands
- [ ] All commands tested and working
- [ ] Automation script created and tested
- [ ] Linked from docs/security/README.md
**Relevant Files:** `docs/security/EVIDENCE_PACK.md` (new), `script/generate-security-evidence.sh` (new)
**Plan:**  
1. Create EVIDENCE_PACK.md
2. Document SBOM generation (npm list, sbom-tool, etc.)
3. Document CodeQL scan commands
4. Document dependency scanning (npm audit, snyk, etc.)
5. Document coverage report generation
6. Document audit log export
7. Create automation script
8. Test all commands
9. Add output format documentation
10. Link from security README
**Estimated Effort:** 3-4 hours
## task_end

---

## task_begin
### # [id:TASK-20260204-035][type:docs][priority:low][component:ci] Add docs quality gates in CI
**Status:** todo  
**Description:** Create CI script to validate documentation quality (links, frontmatter, freshness).  
**Dependencies:** None  
**Acceptance Criteria:**  
- [ ] docs:check script created in package.json
- [ ] Script validates markdown links (internal) using markdown-link-check or similar
- [ ] Script enforces frontmatter on system docs using remark or custom validator
- [ ] Script flags stale "Last verified" dates beyond N days for critical docs
- [ ] CI workflow added to run docs:check on pull requests
- [ ] Documentation for maintaining docs quality added
**Definition of Done:**  
- [ ] Script complete and working
- [ ] CI integration active
- [ ] Documentation updated
**Relevant Files:** `package.json`, `script/docs-check.ts` (new), `.github/workflows/docs.yml` (new), `docs/CONTRIBUTING.md`
**Plan:**  
1. Install markdown-link-check or equivalent
2. Create docs:check script
3. Add link validation for internal links
4. Add frontmatter validation (require: title, last_updated, status, owner)
5. Add freshness check (warn if last_updated > 90 days for critical docs)
6. Add CI workflow to run on PRs
7. Document quality standards
8. Document how to fix common issues
9. Add to pre-commit hooks (optional)
**Estimated Effort:** 4-6 hours
## task_end

## group_end

## group_begin [type:ci][priority:medium]
## 🧪 CI (Unscheduled) — Medium

## group_end

## group_begin [type:reliability][priority:low]
## 🛡️ Reliability (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-017][type:reliability][priority:low][component:server] Avoid crashing the process in the Express error handler
**Status:** todo  
**Description:** The current error middleware throws after sending a response, which can crash the server for handled errors.
**Acceptance Criteria:**  
- [ ] Error handler returns a response without throwing
- [ ] Logging remains intact (and does not leak sensitive data)
**Relevant Files:** `server/index.ts`
## task_end

## group_end

## group_begin [type:release][priority:low]
## 🏷️ Release Management (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-018][type:release][priority:low][component:repo] Add versioning + release notes automation
**Status:** todo  
**Description:** Introduce a lightweight release process (e.g., Changesets or semantic-release) to standardize changelogs and releases.
**Acceptance Criteria:**  
- [ ] Release tooling is chosen and configured
- [ ] A minimal workflow exists to generate/update release notes
- [ ] Maintainer instructions are documented
**Relevant Files:** `package.json`, `.github/workflows/*`, `README.md`
## task_end

## group_end

## group_begin [type:infra][priority:low]
## 🐳 Infrastructure (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-019][type:infra][priority:low][component:dev] Add Docker + compose for local Postgres
**Status:** todo  
**Description:** Provide an optional containerized local environment for consistent onboarding.
**Acceptance Criteria:**  
- [ ] Dockerfile and/or `docker-compose.yml` exist for local dev
- [ ] Compose provisions Postgres with a documented `DATABASE_URL`
- [ ] README includes steps to use containers
**Relevant Files:** `Dockerfile`, `docker-compose.yml`, `README.md`
## task_end

## group_end

## group_begin [type:config][priority:low]
## 🧰 Config & Tooling (Unscheduled) — Low

## task_begin
### # [id:TASK-20260203-004][type:config][priority:low][component:tooling] Declare supported Node.js versions
**Status:** todo  
**Description:** Add a clear Node.js version requirement so installs/builds don’t fail unexpectedly on older Node versions.  
**Acceptance Criteria:**  
- [ ] `package.json` declares `engines.node` (minimum supported version)
- [ ] Local dev and CI use a compatible Node version
**Relevant Files:** `package.json`
## task_end

## group_end
