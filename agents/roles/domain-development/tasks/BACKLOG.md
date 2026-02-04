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

## task_begin
### # [id:TASK-20260204-147][type:dev][priority:high][component:server] Implement CRM Contact and Client Management APIs
**Status:** todo  
**Description:** Build core CRM functionality including contact and client CRUD operations, relationship management, custom fields, and activity tracking with proper tenant isolation.  
**Acceptance Criteria:**  
- [ ] Contact CRUD API with tenant scoping
- [ ] Client (organization) CRUD API
- [ ] Contact-Client relationship management
- [ ] Custom field support for extensibility
- [ ] Activity timeline integration
**Relevant Files:** `server/routes/crm/`, `server/db/schema/crm/`, `shared/schema/crm/`  
**Relevant Documentation:** `docs/api/crm/README.md`, `docs/data/20_entities/Contact.md`  
**Plan:**  
1. Design CRM schema with contacts, clients, and relationships
2. Implement contact CRUD with tenant scoping and RLS
3. Build client (organization) management APIs
4. Add custom field support for flexible data model
5. Integrate with timeline for activity tracking
**Estimated Effort:** 4 days
## task_end

---

## task_begin
### # [id:TASK-20260204-148][type:dev][priority:high][component:server] Build Project Management Domain APIs
**Status:** todo  
**Description:** Implement project management functionality including projects, tasks, milestones, time tracking, and resource allocation with workflow integration.  
**Acceptance Criteria:**  
- [ ] Project CRUD API with tenant scoping
- [ ] Task management with status workflows
- [ ] Milestone tracking and dependencies
- [ ] Time tracking and resource allocation
- [ ] Integration with workflow engine for approvals
**Relevant Files:** `server/routes/projects/`, `server/db/schema/projects/`, `shared/schema/projects/`  
**Relevant Documentation:** `docs/api/projects/README.md`, `docs/data/20_entities/Task.md`  
**Plan:**  
1. Design project management schema (projects, tasks, milestones)
2. Implement project CRUD with tenant isolation
3. Build task management with customizable status workflows
4. Add time tracking and resource allocation features
5. Integrate with workflow engine for approval processes
**Estimated Effort:** 5 days
## task_end

---

## task_begin
### # [id:TASK-20260204-149][type:dev][priority:high][component:server] Implement Revenue Management (AR/AP) APIs
**Status:** todo  
**Description:** Build revenue management functionality including invoices, bills, payments, and accounts receivable/payable tracking with proper financial controls.  
**Acceptance Criteria:**  
- [ ] Invoice CRUD with line items and tax calculations
- [ ] Bill management for accounts payable
- [ ] Payment tracking and reconciliation
- [ ] Aging reports for AR/AP
- [ ] Integration with accounting ledger
**Relevant Files:** `server/routes/revenue/`, `server/db/schema/revenue/`, `shared/schema/revenue/`  
**Relevant Documentation:** `docs/api/revenue/README.md`, `docs/data/20_entities/Invoice.md`, `docs/data/20_entities/Bill.md`  
**Plan:**  
1. Design revenue schema (invoices, bills, payments, line items)
2. Implement invoice CRUD with tax calculation logic
3. Build bill management and approval workflows
4. Add payment tracking and reconciliation features
5. Create aging reports and integrate with ledger
**Estimated Effort:** 5 days
## task_end

---
## group_end

## group_begin [type:dev][priority:medium]
## ðŸš€ Development (Unscheduled) â€” Medium

## task_begin
### # [id:TASK-20260204-150][type:dev][priority:medium][component:server] Build Communications and Email Tracking Domain
**Status:** todo  
**Description:** Implement communications domain for email tracking, SMS, and internal messaging with contact history and workflow integration.  
**Acceptance Criteria:**  
- [ ] Email tracking with send/receive/open/click events
- [ ] SMS messaging integration
- [ ] Internal messaging and comments
- [ ] Communication history on contact timeline
- [ ] Template management for emails
**Relevant Files:** `server/routes/communications/`, `server/db/schema/communications/`, `shared/schema/communications/`  
**Relevant Documentation:** `docs/api/communications/README.md`, `docs/api/timeline/README.md`  
**Plan:**  
1. Design communications schema (emails, SMS, templates)
2. Implement email tracking with event capture
3. Build SMS messaging integration
4. Add template management for common emails
5. Integrate communication history with timeline
**Estimated Effort:** 3 days
## task_end

---

## task_begin
### # [id:TASK-20260204-151][type:dev][priority:medium][component:server] Implement File Management and Document Storage
**Status:** todo  
**Description:** Build file management domain with secure file upload, storage in S3, presigned URLs, versioning, and access control.  
**Acceptance Criteria:**  
- [ ] File upload API with virus scanning
- [ ] S3 storage integration with presigned URLs
- [ ] File versioning and metadata
- [ ] Access control and sharing permissions
- [ ] File search and organization (folders/tags)
**Relevant Files:** `server/routes/files/`, `server/db/schema/files/`, `shared/schema/files/`  
**Relevant Documentation:** `docs/api/files/README.md`, `docs/security/30-implementation-guides/DATA_PROTECTION.md`  
**Plan:**  
1. Design file management schema with metadata and versions
2. Implement secure file upload with virus scanning
3. Integrate S3 storage with presigned URL generation
4. Build access control and sharing features
5. Add file search, organization, and lifecycle management
**Estimated Effort:** 4 days
## task_end

---
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

