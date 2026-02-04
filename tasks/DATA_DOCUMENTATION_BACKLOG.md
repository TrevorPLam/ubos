# Data Documentation Backlog

**Consolidated backlog of all pending data documentation, unknown resolution, and gap implementation tasks.**

**Created:** 2025-02-04  
**Status:** Active  
**Total Effort:** ~900 minutes (15 hours) for documentation + roadmaps

---

## Priority 1: Resolve 10 Blocking Unknowns (30 min) ⚡ **DO FIRST**

### Unknown Resolution Commands

Run these in PowerShell to verify current system state:

```powershell
# 1. Migration strategy
Select-String -Path package.json -Pattern "migrate|migration|drizzle-kit"

# 2. Soft delete status
Select-String -Path shared/schema.ts,server/storage.ts,server/routes.ts -Pattern "deleted_at|soft_delete"

# 3. Activity logging coverage
$count = (Select-String -Path server/routes.ts -Pattern "createActivityEvent" | Measure-Object).Count
Write-Host "Activity events called: $count times"

# 4. CSRF protection
Get-Content server/csrf.ts | Select-Object -First 30
(Select-String -Path server/routes.ts -Pattern "csrf" | Measure-Object).Count

# 5. Rate limiting config
Select-String -Path server/security.ts -Pattern "rateLimit|limiter" -Context 0,5

# 6. Request body logging
Select-String -Path server/index.ts -Pattern "req.body|payload" | Select-String "log"

# 7. Presigned URLs
Get-ChildItem server -Filter "*.ts" -Recurse | Select-String -Pattern "presign|getSignedUrl|s3.*sign"

# 8. Pagination
Select-String -Path server/routes.ts -Pattern "limit|offset|skip|take" | Select-Object -First 20

# 9. Full-text search
Get-ChildItem server,shared -Filter "*.ts" -Recurse | Select-String -Pattern "search|fulltext|fts|ilike"

# 10. Export/import
Select-String -Path server/routes.ts -Pattern "export|import" | Select-String "POST|GET" | Select-Object -First 20
```

**Acceptance Criteria:**
- [ ] All 10 commands executed
- [ ] Results documented
- [ ] COMPLETION_SUMMARY.md updated with findings
- [ ] Blockers identified for gap roadmaps

**Impact:** Unblocks all gap implementation planning

---

## Priority 2: Entity Documentation (17 remaining / 23 total) — 225 min

**Status:** 6/23 complete (Engagement, Deal, Invoice, Task, Bill, Contact)  
**Remaining:** 17 entities

### Batch 1: High-Impact Sales & Project (45 min)

| Entity | Domain | Template | Effort |
|--------|--------|----------|--------|
| **Proposal** | Sales | Invoice.md | 15 min |
| **Contract** | Agreements | Invoice.md | 15 min |
| **Project** | Projects | Task.md | 15 min |

### Batch 2: Communications (30 min)

| Entity | Domain | Template | Effort |
|--------|--------|----------|--------|
| **Thread** | Communications | Engagement.md | 15 min |
| **Message** | Communications | Engagement.md | 15 min |

### Batch 3: Revenue (45 min)

| Entity | Domain | Template | Effort |
|--------|--------|----------|--------|
| **InvoiceSchedule** | Revenue | Invoice.md | 15 min |
| **Payment** | Revenue | Invoice.md | 15 min |
| **Vendor** | Revenue | Deal.md | 15 min |

### Batch 4: Identity (45 min)

| Entity | Domain | Template | Effort |
|--------|--------|----------|--------|
| **Organization** | Identity | Engagement.md | 15 min |
| **OrganizationMember** | Identity | Deal.md | 15 min |
| **User** | Identity | Deal.md | 15 min |

### Batch 5: Core & Portal (60 min)

| Entity | Domain | Template | Effort |
|--------|--------|----------|--------|
| **ClientCompany** | CRM | Deal.md | 15 min |
| **FileObject** | Files | Contact.md | 15 min |
| **ActivityEvent** | Timeline | Task.md | 15 min |
| **ClientPortalAccess** | Portal | Engagement.md | 15 min |
| **ProjectTemplate** | Projects | Project.md | 15 min |
| **Milestone** | Projects | Task.md | 15 min |

---

## Priority 3: Current State Template Docs (240 min)

**Status:** 0/6 complete (6 templates stubbed in folder)

### Templates to Populate

| Doc | Path | Purpose | Effort |
|-----|------|---------|--------|
| **DATA_FLOWS** | docs/data/10_current_state/ | CRUD flows, integrations, async, webhooks | 45 min |
| **AUDIT_LOGGING_AND_REDACTION** | docs/data/10_current_state/ | ActivityEvent, request logging, PII redaction, compliance | 45 min |
| **RETENTION_AND_DELETION** | docs/data/10_current_state/ | Retention policies, soft vs. hard delete, archival | 30 min |
| **BACKUPS_AND_RECOVERY** | docs/data/10_current_state/ | Backup strategy, recovery procedures, RTO/RPO, DR checklist | 30 min |
| **EVENTS_AND_WEBHOOKS** | docs/data/30_interfaces/ | Event types, webhook receivers, payload examples, outbox gap | 45 min |
| **FILES_AND_UPLOADS** | docs/data/30_interfaces/ | Upload/download endpoints, S3 integration, presigns, lifecycle | 45 min |

---

## Priority 4: Gap Implementation Roadmaps (225 min)

**Status:** 0/5 roadmaps created

### Critical Gaps (Documentation + Implementation Roadmap)

#### Gap 1: Soft Deletes (Compliance Critical) ⚠️

**Effort:** 30 min documentation + 120–180 min implementation  
**Current State:** Hard DELETE removes audit trail; no recovery possible  
**Target State:** deleted_at TIMESTAMP on 20 tables; soft delete enforced at storage layer  

**Roadmap Tasks:**
- [ ] Schema changes: Add deleted_at to 20 org-scoped tables
- [ ] Storage layer: Update all WHERE clauses to `deleted_at IS NULL`
- [ ] Routes: Update all GET/LIST endpoints to filter deleted_at
- [ ] Migrations: Create migration script to add column + default
- [ ] Testing: Verify query performance, cascading deletes
- [ ] Documentation: Update entity docs with soft delete pattern

**Blocked By:** Unknown #2 (soft delete status)

---

#### Gap 2: Activity Auto-Logging (Audit Trail) ⚠️

**Effort:** 30 min documentation + 90–120 min implementation  
**Current State:** Manual createActivityEvent() calls; inconsistent coverage  
**Target State:** Auto-log all CRUD mutations; changelog tracking  

**Roadmap Tasks:**
- [ ] Middleware strategy: Intercept storage.updateEntity()
- [ ] Event mapping: task.created → TASK_CREATED, etc.
- [ ] Changelog: Track field changes (from/to values)
- [ ] Code locations: storage.ts middleware insertion point
- [ ] Testing: Verify auto-logging for all entity types
- [ ] Documentation: Update GAP_ANALYSIS.md with roadmap

**Blocked By:** Unknown #3 (auto-logging coverage)

---

#### Gap 3: Outbox Pattern (Event-Driven Architecture) 🔴 **HIGHEST PRIORITY**

**Effort:** 45 min documentation + 240–360 min implementation  
**Current State:** All mutations synchronous; no event-driven architecture  
**Target State:** OutboxEvent table + 1–5s dispatcher job + async subscribers  

**Unblocks:** Workflow engine, email sync, ledger sync, integrations

**Roadmap Tasks:**
- [ ] Schema: Design OutboxEvent (id, aggregateType, aggregateId, eventType, payload, createdAt, processedAt)
- [ ] Dispatcher: Poll every 1–5s, publish to subscribers, mark processed
- [ ] Subscribers: Workflow engine, integrations, email service, ledger sync
- [ ] Idempotency: Dedup via aggregateId + eventType
- [ ] Code locations: New table, new job, integration points in storage.ts
- [ ] Testing: Event ordering, idempotency, subscriber reliability
- [ ] Documentation: Create OUTBOX_IMPLEMENTATION.md

**Blocked By:** Unknown resolution (no blockers, can start immediately)

---

#### Gap 4: JSONB Schema Validation (Data Quality)

**Effort:** 60 min documentation  
**Current State:** 7 JSONB columns with undefined schemas  
**Target State:** Zod validation schemas for all JSONB columns  

**JSONB Columns:**
1. `contracts.content` — Contract document text
2. `proposals.content` — Proposal document text
3. `threads.attachments` — File references
4. `invoices.line_items` — Invoice line items (schema TBD)
5. `projects.tasks_template` — Task template structure
6. `projects.milestones_template` — Milestone template structure
7. `generic.metadata` — Flexible key-value pairs

**Roadmap Tasks:**
- [ ] Identify current schema for each JSONB column (read code + DB)
- [ ] Create Zod validation schemas
- [ ] Document examples (valid + invalid data)
- [ ] Identify validation strategy (client, server, database)
- [ ] Create JSONB_SCHEMAS.md guide
- [ ] Implementation: Wire Zod validation into routes

---

#### Gap 5: Test Coverage Audit (Quality Assurance)

**Effort:** 60 min documentation  
**Current State:** Partial test coverage; missing soft delete, outbox, activity logging tests  
**Target State:** Comprehensive test strategy document; identified gaps  

**Roadmap Tasks:**
- [ ] Audit existing tests (review tests/backend/, tests/frontend/)
- [ ] Verify multi-tenant isolation (re-run multi-tenant-isolation.test.ts)
- [ ] Map CRUD coverage (storage methods vs. tests)
- [ ] Create TEST_STRATEGY.md (unit, integration, e2e, performance)
- [ ] List gaps (soft deletes, activity logging, outbox, pagination)
- [ ] Implementation plan for test expansion

---

## Summary: Total Effort Estimate

| Category | Tasks | Effort | Status |
|----------|-------|--------|--------|
| **Unknowns** | 10 | 30 min | ⏳ Not started |
| **Entity Docs** | 17 | 225 min | ⏳ 6/23 complete |
| **Template Docs** | 6 | 240 min | ⏳ Not started |
| **Gap Roadmaps** | 5 | 225 min | ⏳ Not started |
| **TOTAL DOCUMENTATION** | — | **720 min (12 hours)** | — |
| **Gap Implementation** | 5 | 480–720 min | 📋 After roadmaps |
| **GRAND TOTAL** | — | **1200–1440 min (20–24 hours)** | — |

---

## Recommended Execution Plan

### Phase 1: Unknowns (30 min) ✅ **Start here**
1. Run 10 verification commands
2. Document findings
3. Update COMPLETION_SUMMARY.md

### Phase 2: Entity Docs (225 min) 🔄 **Parallel with Phase 1**
1. Batch 1: Proposal, Contract, Project (45 min)
2. Batch 2: Thread, Message (30 min)
3. Batch 3: InvoiceSchedule, Payment, Vendor (45 min)
4. Batch 4: Organization, OrganizationMember, User (45 min)
5. Batch 5: ClientCompany, FileObject, ActivityEvent, ClientPortalAccess, ProjectTemplate, Milestone (60 min)

### Phase 3: Template Docs (240 min) 🔄 **After Phase 1**
1. Populate all 6 templates in parallel (40 min each)
2. Quality review (quality + consistency check)

### Phase 4: Gap Roadmaps (225 min) 🔄 **After Phase 1 unknowns**
1. Soft Deletes roadmap (30 min) — implementation after
2. Activity auto-logging roadmap (30 min) — implementation after
3. Outbox Pattern roadmap (45 min) — implementation after (HIGHEST PRIORITY)
4. JSONB Validation roadmap (60 min)
5. Test Coverage roadmap (60 min)

### Phase 5: Gap Implementation (480–720 min) 📋 **After roadmaps**
- Implement gaps in priority order
- Outbox Pattern first (unblocks everything else)
- Soft deletes next (compliance)
- Activity logging next (audit trail)

---

## Quick Reference: Task IDs

| ID | Title | Status | Effort |
|----|----|--------|--------|
| DATA-DOC-001 | Proposal, Contract, Project docs | ⏳ | 45 min |
| DATA-DOC-002 | Thread, Message docs | ⏳ | 30 min |
| DATA-DOC-003 | Revenue docs (InvoiceSchedule, Payment, Vendor) | ⏳ | 45 min |
| DATA-DOC-004 | Identity docs (Organization, Member, User) | ⏳ | 45 min |
| DATA-DOC-005 | Core docs (ClientCompany, FileObject, ActivityEvent, ClientPortalAccess, ProjectTemplate, Milestone) | ⏳ | 60 min |
| DATA-DOC-006 | Template docs (DATA_FLOWS, AUDIT_LOGGING, RETENTION, BACKUPS, EVENTS, FILES) | ⏳ | 240 min |
| DATA-DOC-007 | Resolve 10 unknowns | ⏳ | 30 min |
| DATA-DOC-008 | Soft Deletes roadmap + implementation | ⏳ | 150–210 min |
| DATA-DOC-009 | Activity auto-logging roadmap + implementation | ⏳ | 120–150 min |
| DATA-DOC-010 | Outbox Pattern roadmap + implementation | ⏳ | 285–405 min |
| DATA-DOC-011 | JSONB Validation guide | ⏳ | 60 min |
| DATA-DOC-012 | Test Coverage roadmap | ⏳ | 60 min |

---

## Next Steps

1. **[Run unknowns verification commands](#priority-1-resolve-10-blocking-unknowns-30-min--do-first)** (30 min)
2. **Create Proposal, Contract, Project entity docs** (45 min) — batch with step 1
3. **Create Thread, Message entity docs** (30 min)
4. **Populate all 6 template docs** (240 min) — parallel tasks
5. **Create Outbox Pattern roadmap** (45 min) — HIGHEST PRIORITY gap
6. **Implement gaps in order** — after roadmaps complete

---

**Owner:** Data Documentation Team  
**Repository:** ubos  
**Last Updated:** 2025-02-04
