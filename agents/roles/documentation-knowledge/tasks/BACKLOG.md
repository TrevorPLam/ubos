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


---


---


---


## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security â€” MEDIUM


---


---


---


---


---


---


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


---


## group_end

## group_begin [type:docs][priority:high]
## ðŸ“š Documentation â€” HIGH

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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `docs/standards/README.md` â€” Documentation standards, `SECURITY.md` â€” Public security policy
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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `docs/tests/README.md` â€” Testing documentation, `.github/workflows/ci.yml` â€” Current CI configuration
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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `docs/security/50-incident-response/INCIDENT_RESPONSE.md` â€” Incident response procedures, `SECURITY.md` â€” Vulnerability disclosure
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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Deployment architecture, `docs/security/20-threat-model/THREAT_MODEL.md` â€” Network threats
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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Deployment guide, `.github/workflows/ci.yml` â€” CI/CD pipeline, `docs/architecture/10_current_state/CONFIGURATION_MODEL.md` â€” Secrets management
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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `CONTRIBUTING.md` â€” Contribution workflow, `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Deployment procedures
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
**Relevant Documentation:** `docs/architecture/README.md` â€” Architecture documentation index, `README.md` â€” Quick start guide, `package.json` â€” Build scripts, `vite.config.ts` â€” Vite configuration
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
**Relevant Documentation:** `docs/architecture/README.md` â€” Architecture documentation index, `server/config-validation.ts` â€” Config validation code, `.env.example` â€” Environment variables, `README.md` â€” Setup instructions
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
**Relevant Documentation:** `docs/architecture/README.md` â€” Architecture documentation index, `package.json` â€” Dependencies list, `docs/security/10-controls/SECURITY_TESTING.md` â€” Dependency scanning
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
**Relevant Documentation:** `docs/architecture/README.md` â€” Architecture documentation index, `server/session.ts` â€” Session implementation, `server/security.ts` â€” Security middleware, `docs/security/10-controls/authentication.md` â€” Auth requirements
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
**Relevant Documentation:** `docs/architecture/README.md` â€” Architecture documentation index, `server/security.ts` â€” Security implementation, `docs/security/10-controls/` â€” Security controls documentation
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
**Relevant Documentation:** `docs/data/README.md` â€” Data documentation index, `docs/data/COMPLETION_SUMMARY.md` â€” Current status with unknowns list, `shared/schema.ts` â€” Database schema, `server/storage.ts` â€” Storage layer implementation
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
**Relevant Documentation:** `docs/data/README.md` â€” Data documentation index, `docs/data/20_entities/ENTITY_INDEX.md` â€” Entity documentation checklist, `docs/data/20_entities/Client.md` â€” Example complete entity doc, `shared/schema.ts` â€” Schema definitions
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
**Relevant Documentation:** `docs/data/README.md` â€” Data documentation index, `docs/data/COMPLETION_SUMMARY.md` â€” Current completion status, `shared/schema.ts` â€” Schema implementation, `server/storage.ts` â€” Storage implementation
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
## ðŸ“š Documentation â€” MEDIUM (P1 Remaining)

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
**Relevant Documentation:** `docs/api/README.md` â€” API documentation index, `docs/api/examples/` â€” API examples, `docs/standards/README.md` â€” API documentation standards, `server/routes.ts` â€” Route implementations
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
**Relevant Documentation:** `docs/tests/README.md` â€” Test documentation index, `docs/standards/diataxis-framework/` â€” Documentation framework, `docs/archive/` â€” Archived test reports
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
- [ ] ENTITY_INDEX.md updated with âœ… status for all
**Definition of Done:**  
- [ ] All 17 entity docs complete
- [ ] Index updated
- [ ] All docs linked and navigable
**Relevant Files:** `docs/data/20_entities/*.md` (17 new files), `docs/data/20_entities/ENTITY_INDEX.md`
**Relevant Documentation:** `docs/data/README.md` â€” Data documentation index, `docs/data/20_entities/ENTITY_INDEX.md` â€” Entity template and checklist, `docs/data/20_entities/Client.md` â€” Example complete entity, `shared/schema.ts` â€” Schema definitions, `docs/standards/README.md` â€” Documentation standards
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
## ðŸ“š Documentation â€” LOW (P2 "Wise Extras")

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
**Relevant Documentation:** `docs/README.md` â€” Documentation index, `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Deployment procedures, `docs/architecture/10_current_state/CONFIGURATION_MODEL.md` â€” Configuration, `server/config-validation.ts` â€” Config validation, `.env.example` â€” Environment variables
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
- [ ] docs/data/RETENTION_MATRIX.md created (entity â†’ retention â†’ deletion method)
- [ ] All docs linked from docs/data/README.md
**Definition of Done:**  
- [ ] All 3 governance docs complete
- [ ] Glossary defines all ambiguous terms
- [ ] PII inventory complete and accurate
- [ ] Retention policies defined for all entities
**Relevant Files:** `docs/data/GLOSSARY.md` (new), `docs/data/PII_INVENTORY.md` (new), `docs/data/RETENTION_MATRIX.md` (new)
**Relevant Documentation:** `docs/data/README.md` â€” Data documentation index, `docs/data/20_entities/ENTITY_INDEX.md` â€” All entities, `docs/security/40-compliance/GDPR.md` â€” GDPR requirements, `docs/data/10_current_state/RETENTION_AND_DELETION.md` â€” Retention policies
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
**Relevant Documentation:** `docs/security/README.md` â€” Security documentation index, `docs/security/10-controls/SECURITY_TESTING.md` â€” Testing procedures, `docs/security/40-compliance/` â€” Compliance requirements, `.github/workflows/ci.yml` â€” CI automation
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
**Relevant Documentation:** `docs/standards/README.md` â€” Documentation standards, `docs/README.md` â€” Documentation structure, `CONTRIBUTING.md` â€” Contribution guidelines, `docs/standards/diataxis-framework/` â€” Documentation framework
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

