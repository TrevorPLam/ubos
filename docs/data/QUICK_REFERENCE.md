# Quick Reference Guide

**Start here to navigate the data documentation system.**

---

## 🎯 I Want to...

### Understand the system in 30 minutes
1. Read [README.md](README.md) — Folder structure + how to use (5 min)
2. Read [10_current_state/CURRENT_STATE_OVERVIEW.md](10_current_state/CURRENT_STATE_OVERVIEW.md) — What exists today (15 min)
3. Skim [20_entities/ENTITY_INDEX.md](20_entities/ENTITY_INDEX.md) — Master entity list (10 min)

### Add a new feature
1. Find entity in [20_entities/ENTITY_INDEX.md](20_entities/ENTITY_INDEX.md)
2. Read entity doc (e.g., [20_entities/Engagement.md](20_entities/Engagement.md))
3. Find API endpoint in [30_interfaces/API_CONTRACTS.md](30_interfaces/API_CONTRACTS.md)
4. Locate code via [40_gaps_and_roadmap/EVIDENCE_MAP.md](40_gaps_and_roadmap/EVIDENCE_MAP.md)
5. Edit schema → storage → routes → tests

### Implement a gap (soft deletes, workflows, etc.)
1. Read [40_gaps_and_roadmap/GAP_ANALYSIS.md](40_gaps_and_roadmap/GAP_ANALYSIS.md)
2. Find your gap (e.g., "Soft Deletes")
3. Follow the checklist
4. Use EVIDENCE_MAP to find code files

### Debug data issues
1. Check [30_interfaces/API_CONTRACTS.md](30_interfaces/API_CONTRACTS.md) — Is request/response correct?
2. Check [10_current_state/DATA_SOURCES.md](10_current_state/DATA_SOURCES.md) — Is org scoping enforced?
3. Trace to code via [40_gaps_and_roadmap/EVIDENCE_MAP.md](40_gaps_and_roadmap/EVIDENCE_MAP.md)
4. Run [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts)

### See what's coming
1. Read [00_plan_intent/PLAN_SUMMARY.md](00_plan_intent/PLAN_SUMMARY.md) — Vision from PLAN.md
2. Read [00_plan_intent/TARGET_DATA_MODEL.md](00_plan_intent/TARGET_DATA_MODEL.md) — Target entities
3. Compare to [10_current_state/CURRENT_STATE_OVERVIEW.md](10_current_state/CURRENT_STATE_OVERVIEW.md) — See gaps

### Understand tenancy
1. Read [10_current_state/TENANCY_AND_ACCESS.md](10_current_state/TENANCY_AND_ACCESS.md)
2. Check tests: [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts)

### Find API endpoints
→ [30_interfaces/API_CONTRACTS.md](30_interfaces/API_CONTRACTS.md)

### See the roadmap
→ [40_gaps_and_roadmap/GAP_ANALYSIS.md](40_gaps_and_roadmap/GAP_ANALYSIS.md)

### Map doc sections to code
→ [40_gaps_and_roadmap/EVIDENCE_MAP.md](40_gaps_and_roadmap/EVIDENCE_MAP.md)

---

## 📚 Document Index

### Phase 0: Intent & Planning
- [00_plan_intent/PLAN_SUMMARY.md](00_plan_intent/PLAN_SUMMARY.md) — Extracted from PLAN.md (10–25 bullet points)
- [00_plan_intent/TARGET_DATA_MODEL.md](00_plan_intent/TARGET_DATA_MODEL.md) — Target entities, enums, relationships

### Phase 1: Current State
- [10_current_state/CURRENT_STATE_OVERVIEW.md](10_current_state/CURRENT_STATE_OVERVIEW.md) — High-level state today (23 entities, 70+ APIs)
- [10_current_state/DATA_SOURCES.md](10_current_state/DATA_SOURCES.md) — DBs, storage, caches, queues, ownership
- [10_current_state/TENANCY_AND_ACCESS.md](10_current_state/TENANCY_AND_ACCESS.md) — Org scoping + RBAC

### Phase 2: Entities
- [20_entities/ENTITY_INDEX.md](20_entities/ENTITY_INDEX.md) — Master list of all 23 entities + relationships
- [20_entities/Engagement.md](20_entities/Engagement.md) — Example entity doc (full schema, lifecycle, API)
- [20_entities/Deal.md](20_entities/Deal.md) — Example entity doc (sales pipeline)
- *21 more entity docs* — To be created (templates ready)

### Phase 3: Interfaces
- [30_interfaces/API_CONTRACTS.md](30_interfaces/API_CONTRACTS.md) — All 70+ HTTP endpoints + payloads

### Phase 4: Gaps & Roadmap
- [40_gaps_and_roadmap/GAP_ANALYSIS.md](40_gaps_and_roadmap/GAP_ANALYSIS.md) — Current vs target gaps + effort estimates
- [40_gaps_and_roadmap/EVIDENCE_MAP.md](40_gaps_and_roadmap/EVIDENCE_MAP.md) — Doc sections linked to code files

---

## 🔍 Quick Lookups

### By Entity
| Entity | Type | Domain | Doc | API | Status |
|--------|------|--------|-----|-----|--------|
| Organization | Root | Identity | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| User | Global | Identity | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| ClientCompany | Entity | CRM | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Contact | Entity | CRM | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Deal | Entity | Sales | [Deal.md](20_entities/Deal.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Proposal | Entity | Agreements | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Contract | Entity | Agreements | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Engagement | Entity | Hub | [Engagement.md](20_entities/Engagement.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Project | Entity | Projects | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Task | Entity | Projects | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Milestone | Entity | Projects | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | — | ✅ |
| Thread | Entity | Communications | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Message | Entity | Communications | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| FileObject | Entity | Files | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | 🔴 STUB | ✅ Schema |
| Invoice | Entity | Revenue | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Bill | Entity | Revenue | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Vendor | Entity | Revenue | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| Payment | Entity | Revenue | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) | ✅ |
| InvoiceSchedule | Entity | Revenue | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | — | ✅ |
| ActivityEvent | Entity | Timeline | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | — | ✅ Schema |
| ClientPortalAccess | Entity | Portal | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | 🔴 STUB | ✅ Schema |
| ProjectTemplate | Entity | Projects | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | — | ✅ |
| OrganizationMember | Junction | Identity | [ENTITY_INDEX](20_entities/ENTITY_INDEX.md) | — | ✅ |

### By Domain
| Domain | Entities | Doc | Status |
|--------|----------|-----|--------|
| Identity | Organization, User, OrganizationMember | [TENANCY_AND_ACCESS](10_current_state/TENANCY_AND_ACCESS.md) | ✅ Complete |
| CRM | ClientCompany, Contact, Deal | [PLAN_SUMMARY](00_plan_intent/PLAN_SUMMARY.md) | ✅ MVP |
| Sales | Proposal, Contract | [PLAN_SUMMARY](00_plan_intent/PLAN_SUMMARY.md) | ✅ MVP |
| Hub | Engagement | [Engagement.md](20_entities/Engagement.md) | ✅ Complete |
| Projects | Project, ProjectTemplate, Task, Milestone | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | ✅ MVP |
| Communications | Thread, Message | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | ✅ Schema |
| Files | FileObject | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | 🔴 Stub |
| Revenue | Invoice, InvoiceSchedule, Bill, Payment, Vendor | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | ✅ MVP |
| Timeline | ActivityEvent | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | 🟡 Schema |
| Portal | ClientPortalAccess | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | 🔴 Stub |
| Workflow | (WorkflowTrigger, WorkflowRun, WorkflowAction) | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | 🔴 Missing |

### By Phase
| Phase | Work | Docs | Effort |
|-------|------|------|--------|
| **0 (Foundation)** | Identity + session | [TENANCY_AND_ACCESS](10_current_state/TENANCY_AND_ACCESS.md) | ✅ Done |
| **1 (MVP Vertical)** | CRM + Projects + Files + Communications + Portal + Revenue | [CURRENT_STATE_OVERVIEW](10_current_state/CURRENT_STATE_OVERVIEW.md) | ✅ Done |
| **2 (Agreements + Revenue)** | Proposals + Contracts + Invoices + Bills | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | ✅ Schema done |
| **2 (Integrations)** | Email + Ledger + E-sign + Object Storage | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | 🔴 Stubs only |
| **2 (Workflow)** | Outbox + WorkflowEngine + 6 workflows | [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) | 🔴 Missing |

---

## ❓ Top 10 Unknowns

See [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md#-critical-findings) for details.

1. Are migrations applied at startup?
2. Is soft delete implemented?
3. Are activities auto-logged?
4. Is CSRF protection enforced?
5. Is rate limiting enforced?
6. Are request bodies logged?
7. Is presign URL service implemented?
8. Is pagination implemented?
9. Is search implemented?
10. Is export/import implemented?

**How to resolve**: Run commands in [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md#this-week-resolve-top-10-unknowns)

---

## 📊 Coverage Summary

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Entities** | 23 | 30 | 7 missing (Appointment, WorkflowTrigger, WorkflowRun, WorkflowAction, OutboxEvent, ProposalVersion, ContractVersion) |
| **API Endpoints** | 70+ | TBD | Pagination + search + file upload |
| **Soft Deletes** | ❌ | ✅ | Add `deleted_at` to 20 tables |
| **Activity Logging** | Manual | Auto | Wire to all CRUD |
| **Outbox Pattern** | ❌ | ✅ | Build from scratch |
| **Workflow Engine** | ❌ | ✅ | Build from scratch |
| **Email Sync** | Stub | OAuth + Job | 100 hours |
| **Ledger Sync** | Stub | OAuth + Job | 120 hours |
| **E-Sign Webhook** | Stub | Webhook handler | 60 hours |
| **File Upload + Presign** | Stub | S3 integration | 40 hours |

---

## 🎓 Learning Path

**Week 1: Understand the System**
1. Read [README.md](README.md) → [CURRENT_STATE_OVERVIEW](10_current_state/CURRENT_STATE_OVERVIEW.md) → [ENTITY_INDEX](20_entities/ENTITY_INDEX.md)
2. Pick one domain (e.g., CRM) and read all entity docs
3. Read [API_CONTRACTS](30_interfaces/API_CONTRACTS.md) and run the API locally

**Week 2: Implement a Small Feature**
1. Identify a small entity (e.g., adding a field to Deal)
2. Use [EVIDENCE_MAP](40_gaps_and_roadmap/EVIDENCE_MAP.md) to find schema, storage, routes
3. Implement: schema → storage → routes → tests
4. Verify: org scoping + multi-tenant isolation

**Week 3: Close a Gap**
1. Pick a medium gap (e.g., pagination or soft deletes)
2. Read [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) checklist
3. Follow checklist; update tests
4. Verify: all tests pass

**Week 4+: Implement Workflow/Integrations**
1. Read [PLAN_SUMMARY](00_plan_intent/PLAN_SUMMARY.md) (flagship workflows)
2. Read [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md#-workflow-engine-critical-for-orchestration)
3. Build outbox + workflow engine
4. Implement 6 flagship workflows

---

## 🚀 Next Steps

1. **Review this documentation**: Does it answer your questions about the data?
2. **Resolve unknowns**: Run the commands in [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) to confirm status
3. **Plan implementation**: Use [GAP_ANALYSIS](40_gaps_and_roadmap/GAP_ANALYSIS.md) to prioritize
4. **Expand entity docs**: 21 entities need full documentation (use templates)
5. **Create missing docs**: DATA_FLOWS.md, EVENTS_AND_WEBHOOKS.md, etc.

---

**Start with**: [README.md](README.md)  
**Questions?**: Check [EVIDENCE_MAP](40_gaps_and_roadmap/EVIDENCE_MAP.md) or [COMPLETION_SUMMARY](COMPLETION_SUMMARY.md#-questions-to-ask-engineering-team)
