# Plan Intent: Data-Focused Summary

**Source**: [PLAN.md](/PLAN.md)  
**Date extracted**: 2025-02-04

## 🎯 Product Vision (Data Perspective)

The Unified Business Ops Suite (UBOS) is a **modular monolith SaaS platform** for small business operations orchestration. It integrates CRM, project management, financial orchestration (AR/AP), e-signatures, and communications into a **single tenant-aware system**.

**Core value propositions (data-driven)**:
- Single source of truth for client/contact data (golden record in CRM domain)
- Unified timeline of all business events (append-only activity log)
- Workflow-driven orchestration of multi-domain processes
- Integration hub for email, ledger (QBO/Xero), e-sign (DocuSign/Dropbox/PandaDoc)
- Client-facing portal with selective data visibility

## 🏗️ Target Architecture (11 Core Domains)

Each domain owns its database schema. All cross-domain communication happens via **outbox events** + **workflow engine**.

| Domain | Owns | Primary Entities | Golden Record Ref |
|--------|------|------------------|-------------------|
| **identity** | Tenant, users, RBAC, sessions | Organization, OrganizationMember, User | — |
| **crm** | Client/contact management | ClientCompany, Contact, Deal, Engagement | `client_id`, `contact_id` |
| **projects** | Project/task/milestone mgmt | Project, Task, Milestone, ProjectTemplate | Denorm `client_id` |
| **files** | Document storage, versioning, shares | FileObject, blob metadata, versions, request links | Denorm `client_id` |
| **communications** | Email thread/message storage | Thread, Message, email sync metadata | Denorm `client_id` |
| **scheduling** | Appointments, calendar IDs, booking | Appointment, CalendarSync (STUB) | Denorm `client_id` |
| **portal** | Client-facing views, magic links | ClientPortalAccess, PortalView (future) | Denorm `engagement_id` |
| **agreements** | Templates, proposals, contracts, e-sigs | Proposal, Contract, ProposalVersion (future) | Denorm `contract_id`, `deal_id` |
| **revenue** | AR/AP, billing, payments, vendor mgmt | Invoice, InvoiceSchedule, Bill, Payment, Vendor, LedgerSyncMap (future) | Denorm `engagement_id` |
| **workflow** | Orchestration engine, runs, retries | WorkflowTrigger, WorkflowRun, WorkflowAction (STUB) | Cross-domain |
| **timeline** | Append-only activity events | ActivityEvent | Denorm to any entity |

## 📊 Flagship Workflows (Data Transformations)

These define the **critical data flows**. Each is a state machine of events:

1. **appointment.booked**
   - Create contact + client (if missing) → Create folder template → Create project skeleton → Create portal user
   - Data movement: external calendar → Scheduling → CRM, Projects, Files, Portal

2. **proposal.accepted**
   - Contract.send_for_signature → on signed: activate project + invoice plan
   - Data movement: Agreements → Workflow → Projects + Revenue

3. **file.request.completed**
   - Attach file to project → Create review task → Notify assignee
   - Data movement: Files → Projects → Workflow → Communications

4. **milestone/task.completed OR time threshold**
   - Invoice.drafted → Approval routing → Issue to ledger (stub) → Notify portal
   - Data movement: Projects + Revenue → Workflow → Integration stub

5. **invoice.paid**
   - Update CRM client status/timeline + schedule follow-up
   - Data movement: Revenue → CRM + Timeline + Workflow

6. **bill.received**
   - Approval routing → Push to ledger (stub) → Status/timeline update
   - Data movement: Revenue → Workflow → Integration stub

## 📦 Integration Points (MVP = Stubs + Contracts)

| Provider | Function | Stub Status | Data Movement |
|----------|----------|-------------|-----------------|
| **Email** | OAuth connect + sync (Graph/Gmail) | ✓ Contracts defined | Inbox → Communications, CRM |
| **Ledger** | QBO/Xero integration + mapping | ✓ Stubs + mapping | Revenue → GL (async) |
| **E-sign** | DocuSign/Dropbox/PandaDoc | ✓ Provider abstraction | Agreements → SigProvider → Timeline |
| **Object Storage** | MinIO (local), S3-compatible | ✓ Configured | Files upload/presign |

## 🔐 Security & Compliance Requirements (Data)

- **Multi-tenancy**: All queries must include `organizationId` filter
- **Audit logging**: Who, what, when, where for sensitive operations (Agreements, Revenue, Account changes)
- **Data redaction**: Passwords, API keys, signatures in logs redacted
- **Presigned URLs**: File access via time-limited signed URLs, not direct download
- **Least privilege**: Integration tokens stored per-tenant in vault
- **Per-tenant integration health**: Last sync, errors, reauth CTA

## 📈 Data Lifecycle Expectations (from PLAN.md)

| Entity | Create | Update | Delete | Archive | Retention |
|--------|--------|--------|--------|---------|-----------|
| Client/Contact | Manual, import, or workflow | Manual, merge, or workflow | Soft-delete or manual | N/A | Keep indefinitely |
| Deal | Manual | Status updates via workflow | Soft-delete | Archive when lost/won | Keep indefinitely |
| Proposal | Manual | Status via e-sign flow | Manual soft-delete | N/A | Keep 7 years (contract audit) |
| Contract | Manual or auto from proposal | Amendments (version history) | Manual soft-delete | N/A | Keep 7 years (contract audit) |
| Project | Auto from engagement/workflow | Manual + workflow-driven | Soft-delete | Completed → Archive | Keep 3 years |
| Task | Manual or bulk from template | Manual + workflow | Soft-delete | Completed → Archive | Keep 1 year |
| Invoice | Manual or auto from schedule | Manual + ledger sync | Manual soft-delete | N/A | Keep 7 years (accounting) |
| Bill | Manual | Manual + approval workflow | Manual soft-delete | N/A | Keep 7 years (accounting) |
| Activity Event | Append-only (no update) | Never | Never | N/A | Keep 2 years |

## 🎯 Key Data Model Decisions

1. **Golden Record**: CRM owns `ClientCompany` and `Contact`. All other domains **reference** these by ID, never replicate.
2. **Denormalization**: Projects, Files, Communications, Portal, Revenue store `client_id` / `engagement_id` for query efficiency (no cross-domain reads).
3. **Outbox Pattern**: All domain events (e.g., `ContractSigned`, `InvoiceDrafted`) written to outbox table; dispatcher pushes to workflow + event handlers.
4. **Timeline as Read Model**: `ActivityEvent` is append-only; queried by `entityType`, `entityId`, `engagementId`. Core for client-facing timeline view.
5. **Workflow as Orchestrator**: Only the workflow domain can directly trigger actions in other domains (no direct route-to-route calls).
6. **No Cross-Domain DB Reads**: If Domain A needs data from Domain B, it uses an event or reads from a denorm column (e.g., `engagement.client_id`).

## 🚀 MVP Vertical Slice (Phase 1)

Data entities that MUST be present in MVP:
- ✓ Organization, User, OrganizationMember (identity)
- ✓ ClientCompany, Contact (CRM golden record)
- ✓ Deal (pipeline)
- ✓ Engagement (hub; links deal→project→invoice)
- ✓ Project, Task, Milestone (project mgmt)
- ✓ FileObject (document storage)
- ✓ Thread, Message (comms)
- ✓ Invoice, InvoiceSchedule (AR)
- ✓ ActivityEvent (timeline)
- ✓ ClientPortalAccess (portal)
- ✓ Proposal, Contract (agreements, minimal)

**NOT in MVP**: WorkflowTrigger/Run, full ledger sync, e-sign webhook handling, full calendar sync, custom fields JSONB.

## 📋 Event & DTO Contracts (v1, MVP)

Events the system must publish (to outbox):
- `ContractSigned` → Projects, Revenue, Portal updated
- `InvoiceDrafted` → Approval workflow, timeline event
- `InvoicePaid` → CRM status updated, follow-up scheduled
- `BillReceived` → Approval workflow triggered
- `ProjectCompleted` → Timeline event, client notified
- `TaskCompleted` → Timeline event, assignee notified
- `AppointmentBooked` → CRM, Projects, Portal auto-created

## 🔍 Data Requirements We Know

- **Tenancy**: Every table (except `users`, `organizations`) includes `organizationId`
- **Audit**: ActivityEvent table + middleware logging captures who/what/when
- **Soft deletes**: Likely needed for deals, projects, tasks (no hard deletes on business data)
- **Versioning**: Proposals and Contracts may need version tracking (FUTURE)
- **Timestamps**: All tables have `created_at`, `updated_at`
- **UUIDs**: Primary keys are `gen_random_uuid()`
- **Statuses**: Finite enums for states (deal_stage, proposal_status, invoice_status, etc.)
- **Relationships**: Strong foreign keys for hierarchy (engagement→project→task); nullable for cross-domain refs

## 📊 Data Quality Unknowns

These must be clarified to finalize data design:

- ❓ **Duplicate handling**: How should CRM deduplicate contacts by email? Merge strategy?
- ❓ **Soft delete vs hard delete**: All entities? Just contracts/invoices? Retention timeline?
- ❓ **Custom fields**: JSONB on ClientCompany/Contact? If so, validation schema?
- ❓ **Historical amendments**: Do Contracts track versions? Proposals?
- ❓ **Billing on usage**: Does system track usage events for metered billing?
- ❓ **Search scope**: Should global search include archived entities?
- ❓ **Notification preferences**: Per-user, per-org, per-entity?
- ❓ **Export/import**: Bulk import of clients/deals? Export formats?

---

**Alignment**: This summary aligns with PLAN.md Stage 0-1 (foundation + MVP vertical slice). Stages 2-3 (Agreements detail, Revenue detail, Integration stubs) will introduce additional entities and schema extensions.
