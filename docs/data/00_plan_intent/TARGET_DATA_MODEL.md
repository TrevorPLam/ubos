# Target Data Model (Per PLAN.md)

**Source**: [PLAN.md](/PLAN.md) → Stages 0–3  
**Phase**: Foundation (Stage 0) through Revenue (Stage 2)

## 📋 Complete Entity List (Target State)

### Identity & Tenancy (Stage 0)
- `Organization` — Tenant container; root of multi-tenancy
- `OrganizationMember` — Role-based access; owns member_role enum
- `User` — Global user record; independent of org

### CRM (Stage 0–1, Golden Record)
- `ClientCompany` — Org-scoped business entity; canonical for all cross-domain refs
- `Contact` — Org-scoped person; primary contact for ClientCompany
- `Deal` — Sales pipeline; linked to client; state machine (lead→won/lost)

### Projects (Stage 1)
- `ProjectTemplate` — Reusable task/milestone structure
- `Project` — Tied to engagement; holds tasks/milestones
- `Milestone` — Grouped within project; checkpoint for invoicing
- `Task` — Individual work unit; state machine (todo→completed/cancelled)

### Files (Stage 1)
- `FileObject` — Document metadata; S3-compatible path + presign support

### Communications (Stage 1)
- `Thread` — Email thread or internal discussion; internal/client enum
- `Message` — Single message in thread; sender, content, attachments JSONB

### Scheduling (Stage 1, Stub)
- `Appointment` — (SCHEMA NOT YET CREATED; requires external calendar IDs)

### Portal (Stage 1)
- `ClientPortalAccess` — Magic link + token for client-facing views
- `PortalView` — (FUTURE; denorm of tasks/files visible to client)

### Agreements (Stage 1–2)
- `Proposal` — Sales proposal; state machine (draft→accepted/rejected)
- `ProposalVersion` — (FUTURE; amendment tracking)
- `Contract` — Legal agreement; state machine (draft→signed)
- `ContractVersion` — (FUTURE; amendment tracking)
- `SignaturePacket` — (FUTURE; e-sign provider integration)

### Revenue (Stage 2)
- `InvoiceSchedule` — Recurring billing template
- `Invoice` — AR record; state machine (draft→paid/overdue)
- `Payment` — Payment allocation to invoice
- `Vendor` — AP counterparty
- `Bill` — AP record; state machine (pending→paid)
- `LedgerSyncMap` — (FUTURE; mapping between local GL + QuickBooks/Xero GL)

### Engagement Hub (Stage 1, Cross-Domain Glue)
- `Engagement` — Project + Invoice + Timeline scope; links Deal→Contract→Project
  - Denormalizes `client_id`, `contact_id`, `contract_id`, `deal_id` for fast queries

### Workflow (Stage 2, Orchestration)
- `WorkflowTrigger` — (STUB; event-based rule definition)
- `WorkflowRun` — (STUB; execution instance of workflow)
- `WorkflowAction` — (STUB; action within run; retry logic)

### Timeline (Stage 1, Append-Only)
- `ActivityEvent` — Immutable activity log; linked to any entity by `entity_type` + `entity_id`

### Outbox (Stage 0, Event Transport)
- `OutboxEvent` — (STUB; stores events for eventual consistency dispatcher)

---

## 📊 Entity Relationship Diagram (Target, Simplified)

```
Organization (root tenant)
├── OrganizationMember (RBAC)
├── ClientCompany
│   └── Contact (1→many)
├── Deal (pipeline)
│   ├── Proposal (proposal flow)
│   │   └── Contract (signed)
│   │       └── Engagement (hub)
│   │           ├── Project (containers)
│   │           │   ├── Milestone
│   │           │   └── Task
│   │           ├── InvoiceSchedule (recurring)
│   │           │   └── Invoice (individual)
│   │           │       └── Payment
│   │           ├── FileObject (docs)
│   │           ├── Thread (comms)
│   │           │   └── Message
│   │           └── ActivityEvent (append-only)
└── [Other entities denorm client_id for denorm queries]

Vendor (independent of client)
└── Bill (AP; may or may not link to engagement)

Workflow (cross-domain orchestrator)
├── WorkflowTrigger
├── WorkflowRun
└── WorkflowAction

ClientPortalAccess (magic links)
└── Contact + Engagement (for client view scope)
```

---

## 🔑 Key Identifiers & Scoping

### Primary Keys
- All entities use `id: UUID` (gen_random_uuid())
- Exception: User table may use email or external provider ID (TBD)

### Tenant Scoping
- All tables EXCEPT `users`, `organizations` include `organizationId` foreign key
- **Storage enforcement point**: [server/storage.ts](/server/storage.ts) — all read/update/delete queries include `organizationId` filter
- **Test coverage**: [tests/backend/multi-tenant-isolation.test.ts](/tests/backend/multi-tenant-isolation.test.ts)

### Foreign Keys (Cross-Domain References)
| Referencing Table | Foreign Key(s) | Target | Enforcement |
|-------------------|-----------------|--------|-------------|
| Deal | `client_company_id` | ClientCompany | Cascade |
| Deal | `contact_id` | Contact | Cascade |
| Proposal | `deal_id` | Deal | Nullable (proposal can exist without deal) |
| Proposal | `client_company_id` | ClientCompany | Nullable |
| Proposal | `contact_id` | Contact | Nullable |
| Contract | `proposal_id` | Proposal | Nullable |
| Contract | `deal_id` | Deal | Nullable |
| Contract | `client_company_id` | ClientCompany | Nullable |
| Engagement | `contract_id` | Contract | Nullable |
| Engagement | `deal_id` | Deal | Nullable |
| Engagement | `client_company_id` | ClientCompany | Nullable |
| Project | `engagement_id` | Engagement | Cascade |
| Task | `project_id` | Project | Cascade |
| Task | `milestone_id` | Milestone | Nullable |
| Milestone | `project_id` | Project | Cascade |
| Thread | `engagement_id` | Engagement | Cascade |
| FileObject | `engagement_id` | Engagement | Nullable (file may exist outside engagement) |
| Invoice | `engagement_id` | Engagement | Cascade |
| Invoice | `schedule_id` | InvoiceSchedule | Nullable |
| Bill | `engagement_id` | Engagement | Nullable |
| Bill | `vendor_id` | Vendor | Nullable |
| ActivityEvent | `engagement_id` | Engagement | Nullable (activity may be org-level) |
| ClientPortalAccess | `engagement_id` | Engagement | Cascade |
| ClientPortalAccess | `contact_id` | Contact | Cascade |

---

## 📝 Enum Types (Finite State Machines)

| Enum | Values | Used By | Transitions |
|------|--------|---------|-------------|
| `deal_stage` | lead, qualified, proposal, negotiation, won, lost | Deal.stage | Sequential + backtrack |
| `proposal_status` | draft, sent, viewed, accepted, rejected, expired | Proposal.status | draft→sent→viewed→(accepted\|rejected\|expired) |
| `contract_status` | draft, sent, signed, expired, cancelled | Contract.status | draft→sent→signed OR draft→cancelled |
| `project_status` | not_started, in_progress, completed, on_hold, cancelled | Project.status | not_started→in_progress OR on_hold→in_progress→completed |
| `task_status` | todo, in_progress, review, completed, cancelled | Task.status | todo→in_progress→review→completed OR (any→cancelled) |
| `task_priority` | low, medium, high, urgent | Task.priority | User-driven, not state machine |
| `engagement_status` | active, on_hold, completed, cancelled | Engagement.status | active→(on_hold→active\|completed\|cancelled) |
| `invoice_status` | draft, sent, viewed, paid, overdue, cancelled | Invoice.status | draft→sent→viewed→(paid\|overdue) OR (any→cancelled) |
| `bill_status` | pending, approved, rejected, paid, cancelled | Bill.status | pending→(approved→paid\|rejected) OR (any→cancelled) |
| `thread_type` | internal, client | Thread.type | Set at creation; not mutable |
| `member_role` | owner, admin, member, viewer | OrganizationMember.role | User-driven |
| `activity_type` | created, updated, deleted, status_changed, signed, sent, viewed, paid, approved, rejected, comment | ActivityEvent.type | Emitted by system; represents what happened |

---

## 📦 JSONB Columns (Semi-Structured Data)

| Table | Column | Purpose | Schema |
|-------|--------|---------|--------|
| Proposal | content | Proposal HTML/rich text | UNKNOWN (no Zod schema defined yet) |
| Contract | content | Contract HTML/rich text | UNKNOWN |
| Message | attachments | File references in message | UNKNOWN |
| Invoice | line_items | Item breakdown | UNKNOWN (should be array of {description, qty, unit_price, amount}) |
| Bill | (no JSONB yet) | — | — |
| Task | (no JSONB yet) | — | — |
| Contact | (no custom_fields JSONB yet) | Per PLAN: extensible fields | FUTURE |
| ClientCompany | (no custom_fields JSONB yet) | Per PLAN: extensible fields | FUTURE |
| ProjectTemplate | tasks_template | Template tasks structure | UNKNOWN |
| ProjectTemplate | milestones_template | Template milestones structure | UNKNOWN |
| ActivityEvent | metadata | Event-specific details | UNKNOWN |

---

## 🔄 State Machine Diagrams (Key Entities)

### Deal Lifecycle
```
lead ──→ qualified ──→ proposal ──→ negotiation ──→ won
 ↓
(lost) ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← 
```

### Proposal → Contract → Project → Invoice Flow
```
Proposal                    Contract                Engagement
draft → sent → viewed →  (if accepted)  →  draft → sent → signed  →  active (project+invoice schedule created)
  ↓                          ↓                 ↓
(rejected/expired)      (expired/cancelled)  (completed/on_hold/cancelled)
```

### Invoice Lifecycle
```
draft → sent → viewed → paid
         ↓
      (overdue) ────→ paid
         ↓
      (cancelled)
```

### Task Lifecycle
```
todo → in_progress → review → completed
  ↓
(cancelled) ← ← ← ← ← ← ← ← ← ← (from any state)
```

---

## 🔐 Sensitive Data & Redaction Points (Target)

| Data | Stored Where | Redacted Where | Rule |
|------|---------------|-----------------|------|
| API Keys / Integration tokens | `integration_token_vault` (FUTURE) | All logs | Never log raw tokens; use token_id |
| Signature data | Contract.signature_data | Logs | Never log signatures; only log "signed" event |
| SSN / Tax ID | Contact, Vendor (FUTURE) | All logs | Redact to last 4 digits |
| Credit card | Payment (FUTURE; if stored) | All logs + DB dumps | Use provider tokens only |
| Email (PII) | Contact.email, Message content | Logs for non-auth context | Redact to domain only in debug logs |
| Phone (PII) | Contact.phone, Vendor.phone | Logs | Redact to last 4 digits |
| File content | S3 (FileObject) | Logs | Never log file content; only path + metadata |

---

## 📏 Scalability & Indexing Expectations (Target)

### Indexes Required
- `(organization_id)` on most tables (fast tenant isolation)
- `(organization_id, status)` on state-machine tables (Deal, Invoice, Bill, Task, Project)
- `(engagement_id)` on Project, Task, Thread, Invoice, FileObject, ActivityEvent
- `(client_company_id)` on Deal, Engagement, Contact
- `(created_at)` on ActivityEvent (timeline queries are usually ordered by date)
- `(entity_type, entity_id)` on ActivityEvent (query by entity)
- Composite on heavily-joined tables

### Partitioning (FUTURE)
- ActivityEvent table may grow quickly; consider time-based partitioning after 1M rows
- Audit log archival strategy TBD (move to cold storage after 2 years)

---

## 🚫 What's NOT in Target (Explicitly Out of Scope)

- ❌ User profile pictures (stored in auth provider or separate file service)
- ❌ Email bodies (synced from Gmail/Graph API; not stored locally unless explicitly archived)
- ❌ Full text search (planned as separate search domain; current plan is Postgres FTS)
- ❌ User-to-user relationships / internal org structure (just role-based)
- ❌ Assets / product catalog (revenue is project-based, not item-based)
- ❌ Multi-currency support (all decimals default to USD; currency_code FUTURE)
- ❌ Tax calculations (line_items.tax is stored, but calculation is external)
- ❌ Recurring bill templates (InvoiceSchedule exists; Bill recurrence is FUTURE)

---

**Next**: See [10_current_state/CURRENT_STATE_OVERVIEW.md](../10_current_state/CURRENT_STATE_OVERVIEW.md) to compare target vs. reality.
