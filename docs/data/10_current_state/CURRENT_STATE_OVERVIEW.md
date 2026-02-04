# Current State Overview

**As of**: 2025-02-04  
**Evidence base**: [shared/schema.ts](../../shared/schema.ts), [server/storage.ts](../../server/storage.ts), [server/routes.ts](../../server/routes.ts)

## 🎯 Current Implementation Status

| Domain | MVP Entities | Status | Stub/Partial | Missing |
|--------|--------------|--------|--------------|---------|
| **Identity** | Organization, OrganizationMember, User | ✅ Complete | — | OIDC, session persistence, RBAC enforcement |
| **CRM** | ClientCompany, Contact, Deal, Engagement | ✅ Complete | — | Custom fields JSONB, merge/dedupe |
| **Projects** | Project, ProjectTemplate, Task, Milestone | ✅ Complete | — | Kanban view, task dependencies, time tracking |
| **Files** | FileObject | ✅ Schema | ❓ Upload endpoint, presigned URLs | Version control, folder hierarchy |
| **Communications** | Thread, Message | ✅ Schema | ✅ Routes exist | Email sync, OAuth integration, attachment handling |
| **Scheduling** | Appointment | ❌ NOT CREATED | — | External calendar IDs, booking endpoints |
| **Portal** | ClientPortalAccess | ✅ Schema | ❓ Magic link endpoint | Client-facing UI, selective visibility |
| **Agreements** | Proposal, Contract | ✅ Complete | — | ProposalVersion, ContractVersion, e-sign webhooks |
| **Revenue** | Invoice, InvoiceSchedule, Payment, Bill, Vendor | ✅ Complete | ✅ Stubs for ledger sync | Recurring bills, tax calc, ledger export |
| **Timeline** | ActivityEvent | ✅ Schema | ✅ Logging middleware | Webhook support for external events |
| **Workflow** | (WorkflowTrigger, WorkflowRun, WorkflowAction) | ❌ NOT CREATED | — | Engine + scheduler |
| **Outbox** | (OutboxEvent) | ❌ NOT CREATED | — | Event dispatcher, dead-letter queue |

---

## 📊 Entities Implemented (27 Total)

### Schema Location: [shared/schema.ts](../../shared/schema.ts)

#### Identity & Tenancy (3 tables)
1. **organizations** — Tenant root; no FK to other table
2. **organizationMembers** — Join of user→org + role
3. **users** (in [shared/models/auth.ts](../../shared/models/auth.ts)) — Global user store

#### CRM Golden Record (3 tables)
4. **clientCompanies** — Canonical client; FK organization
5. **contacts** — Canonical contact; FK organization + clientCompany
6. **deals** — Sales pipeline; FK organization, clientCompany, contact, ownerId (string)

#### Sales Workflow (3 tables)
7. **proposals** — Sales doc; FK organization, deal, clientCompany, contact, createdById
8. **contracts** — Legal doc; FK organization, proposal, deal, clientCompany, contact, createdById
9. **engagements** — Project hub; FK organization, contract, deal, clientCompany, contact, ownerId

#### Projects (4 tables)
10. **projects** — Container; FK organization, engagement, templateId
11. **projectTemplates** — Reusable tasks/milestones; FK organization
12. **tasks** — Work units; FK organization, project, milestone, assigneeId
13. **milestones** — Checkpoints; FK project

#### Communications (2 tables)
14. **threads** — Conversation container; FK organization, engagement, type enum
15. **messages** — Individual message; FK thread, senderId (string)

#### Documents (1 table)
16. **fileObjects** — File metadata; FK organization, engagement, uploadedById (string)

#### Revenue (6 tables)
17. **invoiceSchedules** — Recurring template; FK organization, engagement, contract
18. **invoices** — AR ledger; FK organization, engagement, schedule, clientCompany
19. **payments** — Payment allocation; FK invoice
20. **vendors** — AP counterparty; FK organization
21. **bills** — AP ledger; FK organization, engagement, vendor, createdById, approvedById

#### Audit & Timeline (2 tables)
22. **activityEvents** — Append-only; FK organization, engagement, actorId, entityType + entityId
23. **clientPortalAccess** — Magic links; FK organization, engagement, contact

---

## 🔑 Table Specifications (Summary)

See [20_entities/ENTITY_INDEX.md](../20_entities/ENTITY_INDEX.md) for full field-level docs.

| Table | Row Count Estimate | Primary Key | Org Scoping | Storage Location |
|-------|-------------------|-------------|------------|------------------|
| organizations | 1–10K | UUID | Self | PostgreSQL |
| organizationMembers | 5–50K | UUID | YES | PostgreSQL |
| users | 100–1M | UUID | NO (global) | PostgreSQL |
| clientCompanies | 100–1M | UUID | YES | PostgreSQL |
| contacts | 1K–10M | UUID | YES | PostgreSQL |
| deals | 100–1M | UUID | YES | PostgreSQL |
| proposals | 100–1M | UUID | YES | PostgreSQL |
| contracts | 100–1M | UUID | YES | PostgreSQL |
| engagements | 10–1M | UUID | YES | PostgreSQL |
| projects | 100–10M | UUID | YES | PostgreSQL |
| projectTemplates | 10–1K | UUID | YES | PostgreSQL |
| tasks | 1K–100M | UUID | YES | PostgreSQL |
| milestones | 100–10M | UUID | NO (via project) | PostgreSQL |
| threads | 100–10M | UUID | YES | PostgreSQL |
| messages | 1K–100M | UUID | NO (via thread) | PostgreSQL |
| fileObjects | 100–10M | UUID | YES | PostgreSQL |
| invoiceSchedules | 10–100K | UUID | YES | PostgreSQL |
| invoices | 1K–100M | UUID | YES | PostgreSQL |
| payments | 1K–10M | UUID | NO (via invoice) | PostgreSQL |
| vendors | 10–10K | UUID | YES | PostgreSQL |
| bills | 100–1M | UUID | YES | PostgreSQL |
| activityEvents | 10K–1B | UUID | YES | PostgreSQL |
| clientPortalAccess | 1K–100K | UUID | YES | PostgreSQL |

---

## 🗄️ Data Storage Layers

### Primary Data Store
- **Database**: PostgreSQL (single instance, no replication configured)
- **Connection**: [server/db.ts](../../server/db.ts) creates Drizzle ORM instance
- **Connection string**: `DATABASE_URL` environment variable
- **Schema definition**: [shared/schema.ts](../../shared/schema.ts) (Drizzle table definitions)
- **Migrations**: UNKNOWN (no migration files found in current structure; assumed Drizzle push or manual)

### Object Storage (Planned)
- **Type**: S3-compatible (MinIO local)
- **Implementation**: [server/storage.ts](../../server/storage.ts) has stubs for presign, but no S3 client
- **Usage**: FileObject paths stored in DB; actual blobs in S3
- **Status**: 🔴 NOT IMPLEMENTED

### Cache (Planned)
- **Type**: Redis
- **Usage**: Session store, rate limiting, query cache (TBD)
- **Status**: 🔴 REFERENCED in PLAN but not wired

### Job Queue (Planned)
- **Type**: Redis-backed job queue
- **Usage**: Email sync, ledger sync, outbox dispatcher
- **Status**: 🔴 NOT IMPLEMENTED

---

## 🔐 Multi-Tenant Scoping (Current)

### Enforcement Model
- **Primary key**: `organizationId` on all org-scoped tables
- **Enforcement point**: [server/storage.ts](../../server/storage.ts) — every read/update/delete includes `WHERE organizationId = ?`
- **Route-level check**: [server/routes.ts](../../server/routes.ts) — `requireAuth` middleware + `getOrCreateOrg()` to resolve org
- **Test coverage**: [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts)

### Tenant ID Resolution
```typescript
// From server/routes.ts, getOrCreateOrg():
1. Get userId from request (cookie or header)
2. Query: SELECT organization_id FROM organization_members WHERE user_id = ?
3. If not found, create new org (org_name defaults to "Org")
4. Return org_id for all subsequent queries
```

### Rules
- ✅ All org-scoped queries include `organizationId` filter
- ✅ No cross-org data visibility
- ✅ Foreign keys allow cascading deletes to isolate data
- ❓ User-to-user within org (e.g., assigning tasks)? Assumed no validation beyond org scope

---

## 🔄 Data Flows (Current Routes)

See [30_interfaces/API_CONTRACTS.md](../30_interfaces/API_CONTRACTS.md) for full endpoint list.

### Authentication
- `GET /api/login` → Mint random userId, set cookie
- `GET /api/logout` → Clear cookie
- `GET /api/auth/user` → Return current user + org

### Dashboard
- `GET /api/dashboard/stats` → Counts of clients, deals, engagements, invoices

### CRM
- `GET /api/clients` → List ClientCompanies
- `POST /api/clients` → Create ClientCompany
- `GET /api/clients/:id` → Fetch ClientCompany
- `PUT /api/clients/:id` → Update ClientCompany
- `DELETE /api/clients/:id` → Soft delete (TBD)
- `GET /api/contacts` → List Contacts
- `POST /api/contacts` → Create Contact
- [... more CRUD endpoints]

### Sales Pipeline
- `GET /api/deals` → List Deals
- `POST /api/deals` → Create Deal
- `PUT /api/deals/:id` → Update Deal (stage changes, etc.)
- `GET /api/proposals` → List Proposals
- `POST /api/proposals` → Create Proposal
- `GET /api/contracts` → List Contracts
- `POST /api/contracts` → Create Contract

### Projects
- `GET /api/engagements` → List Engagements
- `POST /api/engagements` → Create Engagement
- `GET /api/projects` → List Projects
- `POST /api/projects` → Create Project
- `GET /api/tasks` → List Tasks
- `POST /api/tasks` → Create Task
- `PUT /api/tasks/:id` → Update Task

### Revenue
- `GET /api/invoices` → List Invoices
- `POST /api/invoices` → Create Invoice
- `GET /api/bills` → List Bills
- `POST /api/bills` → Create Bill

### Communications
- `GET /api/threads` → List Threads
- `POST /api/threads` → Create Thread
- `GET /api/threads/:id/messages` → List Messages in Thread
- `POST /api/threads/:id/messages` → Add Message

---

## 🔍 Data Validation (Current)

### Schema Layer
- **Framework**: Zod (for insert schemas)
- **Source**: [shared/schema.ts](../../shared/schema.ts) — auto-generated via `createInsertSchema()`
- **Example**: 
  ```typescript
  export const insertClientCompanySchema = createInsertSchema(clientCompanies).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });
  ```

### Route-Level Validation
- Most routes parse JSON and assume it's valid (TBD: add explicit Zod parsing)
- No explicit request body validation observed in routes.ts

### Database Constraints
- Foreign key cascades (enforced at DB level)
- Nullable vs NOT NULL constraints (defined in schema)
- Unique constraints (e.g., `slug` on organizations, `accessToken` on clientPortalAccess)
- Enum constraints (via `pgEnum()`)

---

## 📝 Audit & Logging (Current)

### Activity Events
- **Table**: activityEvents (append-only)
- **Triggered by**: Manual `storage.createActivityEvent()` calls (TBD: auto-trigger from route handlers)
- **Fields**: entityType, entityId, actorId, type (enum), description, metadata JSONB
- **No automatic trigger**: Currently, routes must explicitly log activities; not integrated into entity CRUD

### Request Logging
- **Middleware**: [server/index.ts](../../server/index.ts) logs all `/api` requests
- **Format**: METHOD PATH STATUS DURATION_MS
- **Redaction**: Basic redaction via `sanitizeRequestForLog()` (TBD: full implementation)
- **Issue**: Headers + request body logged (may include secrets)

### Error Logging
- **Handler**: [server/index.ts](../../server/index.ts) middleware captures errors
- **Redaction**: TBD (currently may log sensitive data)

---

## 🗑️ Retention & Deletion (Current)

### Hard Delete
- No soft delete implemented; DELETE removes data entirely
- Cascade deletes via foreign keys (if a parent is deleted, children are auto-deleted)

### Soft Delete (Planned)
- UNKNOWN: No `deleted_at` column observed in any table
- PLAN.md suggests soft deletes for deals, projects, tasks (not yet implemented)

### Archival
- UNKNOWN: No archive table or archive_at column

### Data Retention Policies
- **Current**: No automatic retention/purge logic
- **Expected per PLAN.md**: 
  - Contracts/Proposals: 7 years
  - Invoices/Bills: 7 years
  - Projects/Tasks: 1–3 years
  - Activity events: 2 years

---

## 🔗 Integration Points (Current)

### Email (Planned)
- **Status**: 🔴 STUB ONLY
- **Tables**: threads, messages (schema ready)
- **Missing**: OAuth flow, Gmail/Graph API client, sync job

### Ledger (Planned)
- **Status**: 🔴 STUB ONLY
- **Tables**: invoices, bills (schema ready)
- **Missing**: QBO/Xero OAuth, mapping, sync job

### E-Sign (Planned)
- **Status**: 🔴 STUB ONLY
- **Tables**: contracts (schema ready)
- **Missing**: Provider abstraction, webhook receiver, signature_data parsing

### Object Storage (Planned)
- **Status**: 🔴 STUB ONLY
- **Tables**: fileObjects (schema ready)
- **Missing**: S3 client, presign service, upload endpoint

---

## ❓ Critical Unknowns

| Question | Impact | Where to Check |
|----------|--------|-----------------|
| Are migrations applied at startup? | Data schema consistency | No migrations folder found; check DB init script or Dockerfile |
| Is soft delete implemented? | Data recovery, compliance | Search for `deleted_at` column |
| Are activity events auto-logged? | Auditability | Check all CRUD routes for `createActivityEvent()` calls |
| Is CSRF protection enabled? | Security | [server/security.ts](../../server/security.ts) + [tests/backend/csrf.test.ts](../../tests/backend/csrf.test.ts) |
| Is rate limiting enforced? | DoS protection | [server/security.ts](../../server/security.ts) |
| Are requests body logged? | Security risk | [server/index.ts](../../server/index.ts) middleware |
| Is presign URL service implemented? | File security | Search codebase for "presign" |
| Is pagination implemented? | Query performance | Check routes for limit/offset |
| Is search implemented? | Discoverability | Check for full-text search or LIKE queries |
| Is export/import implemented? | Data portability | Check for CSV/JSON export endpoints |

---

## 📊 Comparison: Target vs. Current

| Aspect | Target (PLAN.md) | Current | Gap |
|--------|------------------|---------|-----|
| **Entities** | 30+ | 23 | Appointment, WorkflowTrigger, OutboxEvent missing |
| **Soft deletes** | Yes (compliance) | No | Must add `deleted_at` column |
| **Audit logging** | Auto + middleware | Manual + basic | Must wire activityEvent to all CRUD |
| **Email sync** | OAuth + job | Stub | Must implement Graph/Gmail client |
| **Ledger sync** | QBO/Xero + mapping | Stub | Must implement provider clients |
| **E-sign** | Webhook handler | Stub | Must implement provider abstraction |
| **Object storage** | S3 + presign | Stub | Must implement S3 client + presign service |
| **Workflow engine** | Central orchestrator | None | Must build WorkflowTrigger + Run + Action |
| **Outbox pattern** | Central event transport | None | Must implement OutboxEvent + dispatcher |
| **Client portal** | Magic link + views | Schema only | Must implement portal UI + magic link route |
| **Custom fields** | JSONB on Contact/Client | None | Must add schema + validation |
| **Versioning** | Proposals, Contracts | None | Must add ProposalVersion, ContractVersion |
| **Search** | Global + per-domain | None | Must implement Postgres FTS or OpenSearch |
| **Sessions** | Redis or DB | Dev-only cookies | Must implement session persistence |
| **OIDC** | Planned | Dev auth only | Must implement OAuth provider |

---

**Next**: See [DATA_SOURCES.md](DATA_SOURCES.md) for storage details, or [20_entities/ENTITY_INDEX.md](../20_entities/ENTITY_INDEX.md) for entity breakdown.
