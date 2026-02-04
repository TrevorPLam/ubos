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
## group_begin [type:dev][priority:critical]
## 🚀 Development — CRITICAL (Blocking Scale)

## task_begin
### # [id:TASK-20260204-281][type:dev][priority:critical][p_level:P0][component:server] Implement Backend Pagination
**Status:** todo  
**Description:** Add pagination support to all list endpoints to prevent unbounded queries and enable the system to scale beyond thousands of records per tenant. Current implementation loads all records in memory, which will fail at scale.  
**Acceptance Criteria:**  
- [ ] Pagination interface defined (limit, offset, cursor-based)
- [ ] All storage layer list methods accept pagination parameters
- [ ] All API endpoints return paginated responses with metadata (total, hasMore)
- [ ] Client-side React Query hooks updated to support pagination
- [ ] Documentation updated with pagination examples
**Relevant Files:** `server/storage.ts`, `server/routes.ts`, `client/src/lib/queryClient.ts`, `client/src/pages/*.tsx`  
**Relevant Documentation:** `docs/api/README.md` — API patterns, `docs/architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md` — Current architecture, `docs/data/10_current_state/DATA_FLOWS.md` — Data access patterns  
**Plan:**  
1. Define PaginationParams interface in shared/schema.ts
2. Update IStorage interface with pagination parameters for all list methods
3. Implement pagination in storage layer (limit/offset queries with count)
4. Update all API routes to accept and pass pagination querystring params
5. Return paginated response format: `{ data: [], total: number, hasMore: boolean }`
6. Update frontend useQuery hooks to handle pagination
7. Add pagination controls to DataTable component
8. Write integration tests for paginated endpoints
**Estimated Effort:** 3 days
## task_end

---

## task_begin
### # [id:TASK-20260204-282][type:dev][priority:critical][p_level:P0][component:server] Add API Input Validation Middleware
**Status:** todo  
**Description:** Implement Zod-based input validation middleware for all API endpoints to prevent invalid data from reaching business logic and provide clear validation error messages to clients. Currently, req.body passes through directly to Drizzle, risking cryptic DB errors.  
**Acceptance Criteria:**  
- [ ] validateBody middleware function created using Zod
- [ ] All POST/PATCH endpoints use validateBody middleware
- [ ] Validation errors return 400 with field-specific error details
- [ ] Zod schemas reused from shared/schema.ts insert schemas
- [ ] Tests added for validation edge cases
**Relevant Files:** `server/routes.ts`, `server/middleware/validation.ts` (new), `shared/schema.ts`  
**Relevant Documentation:** `docs/api/README.md` — API error handling, `docs/security/30-implementation-guides/APPLICATION_SECURITY.md` — Input validation requirements, `ANALYSIS.md` — Critical quality issues  
**Plan:**  
1. Create server/middleware/validation.ts with validateBody function
2. Implement Zod schema parsing with proper error formatting
3. Add middleware to all POST endpoints (creates)
4. Add middleware to all PATCH endpoints (updates)
5. Update error responses to include field-level validation details
6. Write unit tests for validation middleware
7. Write integration tests for validation error responses
8. Document validation patterns in docs/api/VALIDATION.md
**Estimated Effort:** 2 days
## task_end

---

## group_end
## group_begin [type:infra][priority:high]
## ðŸ³ Infrastructure (Unscheduled) â€” High



## group_end

## group_begin [type:dev][priority:high]
## ðŸš€ Development (Unscheduled) â€” High

## task_begin### # [id:TASK-20260204-283][type:dev][priority:high][component:server] Begin Domain Module Extraction - CRM Domain
**Status:** todo  
**Description:** Extract CRM routes from the monolithic routes.ts into a proper domain module structure with separate router, service layer, and repository. This is the first step toward the modular monolith architecture described in README.md.  
**Acceptance Criteria:**  
- [ ] server/domains/crm/ directory structure created
- [ ] CRM routes moved to crm.routes.ts with Express sub-router
- [ ] CRM business logic extracted to crm.service.ts
- [ ] CRM data access moved to crm.repository.ts
- [ ] All CRM tests still passing
- [ ] No cross-domain imports (only via shared/)
**Relevant Files:** `server/routes.ts` (existing CRM routes), `server/domains/crm/` (new), `server/storage.ts` (CRM methods)  
**Relevant Documentation:** `docs/architecture/20_decisions/` — Modular monolith decisions, `ANALYSIS.md` — Architecture gaps section, `README.md` — Domain module vision  
**Plan:**  
1. Create server/domains/crm/ directory structure
2. Create crm.routes.ts with Express Router
3. Move all /api/clients, /api/contacts, /api/deals routes to CRM router
4. Create crm.service.ts and extract business logic from route handlers
5. Create crm.repository.ts and move CRM storage methods
6. Update server/index.ts to mount crmRouter at /api/crm
7. Refactor tests to match new structure
8. Document domain module pattern in docs/architecture/
**Estimated Effort:** 4 days
## task_end

---

## task_begin
### # [id:TASK-20260204-284][type:dev][priority:high][p_level:P1][component:server] Implement Activity Timeline System
**Status:** todo  
**Description:** Wire up the existing activityEvents table to capture all state changes and create a timeline UI. This enables audit trail, customer visibility, and workflow debugging. Currently the schema exists but is unused.  
**Acceptance Criteria:**  
- [ ] Activity event creation added after all state changes (contract signed, invoice sent, etc.)
- [ ] GET /api/activity endpoint with filtering by engagement/entity
- [ ] Timeline page in client showing chronological activity feed
- [ ] Activity types properly categorized and displayed with icons
- [ ] Tests for activity event capture and retrieval
**Relevant Files:** `server/routes.ts` (add event creation), `server/storage.ts` (activity methods), `client/src/pages/timeline.tsx` (new), `shared/schema.ts` (activityEvents table)  
**Relevant Documentation:** `docs/data/20_entities/ActivityEvent.md` — Activity event schema, `ANALYSIS.md` — Partial implementations section  
**Plan:**  
1. Create storage methods for activity events (create, list, filter)
2. Add activity event creation after key state changes in route handlers
3. Define activity event types and metadata structure
4. Create GET /api/activity endpoint with filtering
5. Build timeline.tsx page with activity feed UI
6. Add activity icons and formatting by type
7. Write tests for event capture and retrieval
8. Document activity event patterns
**Estimated Effort:** 3 days
## task_end

---

## task_begin
### # [id:TASK-20260204-285][type:dev][priority:high][p_level:P1][component:server] Add Client Portal Routes and Authentication
**Status:** todo  
**Description:** Implement the client portal feature using the existing clientPortalAccess table. Allow clients to view their engagement details, files, and tasks via magic link authentication without requiring user accounts.  
**Acceptance Criteria:**  
- [ ] POST /api/engagements/:id/portal-access generates access token
- [ ] GET /api/portal/:token validates token and returns engagement data
- [ ] Client portal pages created (dashboard, files, tasks)
- [ ] Token expiration and validation implemented
- [ ] Tests for portal access and authentication
**Relevant Files:** `server/routes.ts` (add portal routes), `shared/schema.ts` (clientPortalAccess table), `client/src/pages/portal/` (new)  
**Relevant Documentation:** `docs/data/20_entities/ClientPortalAccess.md` — Portal access schema, `ANALYSIS.md` — Partial implementations  
**Plan:**  
1. Create portal access token generation endpoint
2. Implement token validation middleware
3. Create portal routes (GET /api/portal/:token/*)
4. Build client portal pages (dashboard, files, tasks)
5. Add portal navigation and branding
6. Implement token expiration checks
7. Write tests for portal authentication
8. Document portal access patterns
**Estimated Effort:** 4 days
## task_end

---

## task_begin### # [id:TASK-20260204-147][type:dev][priority:high][component:server] Implement CRM Contact and Client Management APIs
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

## task_begin### # [id:TASK-20260204-286][type:dev][priority:medium][component:architecture] Design Workflow Engine Architecture
**Status:** todo  
**Description:** Design the workflow engine architecture to enable the flagship workflows described in README (proposal.accepted → contract, milestone.completed → invoice, etc.). Define trigger/condition/action DSL, persistence strategy, and execution model.  
**Acceptance Criteria:**  
- [ ] Workflow engine architecture document created
- [ ] Trigger/condition/action DSL defined
- [ ] Workflow definition storage schema designed
- [ ] Execution model documented (sync vs async, retries, idempotency)
- [ ] Integration points with domain modules identified
- [ ] Technology evaluation (BullMQ, Temporal.io, custom) documented
**Relevant Files:** `docs/architecture/20_decisions/WORKFLOW_ENGINE.md` (new), `shared/schema.ts` (workflow tables)  
**Relevant Documentation:** `README.md` — Workflow engine vision, `ANALYSIS.md` — Missing workflow engine, `docs/architecture/` — Architecture decisions  
**Plan:**  
1. Research workflow engine patterns (saga, orchestration, choreography)
2. Evaluate technologies (Temporal.io, BullMQ, custom DSL)
3. Design workflow definition format (JSON/YAML DSL)
4. Design workflow execution model (worker pools, retries, timeouts)
5. Define integration points with domain events
6. Document workflow engine architecture
7. Create proof-of-concept for one workflow
8. Document decision and next steps
**Estimated Effort:** 2 weeks (research + design)
## task_end

---

## task_begin
### # [id:TASK-20260204-287][type:dev][priority:medium][p_level:P2][component:architecture] Plan Outbox Pattern Implementation
**Status:** todo  
**Description:** Design and plan the outbox pattern implementation for reliable event emission to enable integrations, cross-module communication, and audit timeline. The README promises this as a core architectural pattern.  
**Acceptance Criteria:**  
- [ ] Outbox pattern architecture document created
- [ ] Outbox table schema designed (event type, payload, status, retries)
- [ ] Dispatcher worker design documented
- [ ] Event consumer registration pattern defined
- [ ] Idempotency strategy documented
- [ ] Integration with activity timeline planned
**Relevant Files:** `docs/architecture/20_decisions/OUTBOX_PATTERN.md` (new), `docs/data/10_current_state/DATA_FLOWS.md` — Event flows  
**Relevant Documentation:** `README.md` — Outbox pattern vision, `ANALYSIS.md` — Missing outbox pattern, `docs/data/10_current_state/EVENTS_AND_WEBHOOKS.md` — Events  
**Plan:**  
1. Research outbox pattern implementations (Debezium, custom polling)
2. Design outbox table schema
3. Design dispatcher worker (polling vs CDC)
4. Define event consumer interface
5. Plan idempotency strategy (event IDs, deduplication)
6. Plan integration with existing activityEvents table
7. Document outbox pattern architecture
8. Estimate implementation effort
**Estimated Effort:** 1.5 weeks (research + design)
## task_end

---

## task_begin### # [id:TASK-20260204-150][type:dev][priority:medium][component:server] Build Communications and Email Tracking Domain
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

