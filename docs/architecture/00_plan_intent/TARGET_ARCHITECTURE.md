# Target Architecture (Per PLAN.md)

**Purpose:** Define the target modular monolith architecture  
**Source:** [PLAN.md](../../../PLAN.md)  
**Last verified:** 2026-02-04

## High-Level Component Model

```
┌─────────────────────────────────────────────────────────────┐
│                      React SPA (Client)                      │
│  - Auth screens, Client Profile, Timeline, CRM, Projects    │
│  - Files, Scheduling, Portal, Agreements, Revenue           │
│  - Command-K global search, Integration Health dashboard    │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│                   Express API Server                         │
│  - Security middleware (Helmet, rate limiting, CORS)        │
│  - Session management + auth (OIDC-ready)                   │
│  - Domain API routes (scoped by organizationId)             │
└───────────┬─────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│                    Domain Modules                             │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ identity │ │   crm   │ │ projects │ │ communications   │ │
│  │  (RBAC)  │ │(Golden) │ │ (tasks)  │ │ (email sync)     │ │
│  └──────────┘ └─────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  files   │ │schedule │ │  portal  │ │   agreements     │ │
│  │(presign) │ │(appts)  │ │(magic ln)│ │(proposals/cntrct)│ │
│  └──────────┘ └─────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐                      │
│  │ revenue  │ │workflow │ │ timeline │                      │
│  │(AR/AP)   │ │(orchestr)│(append-log)                      │
│  └──────────┘ └─────────┘ └──────────┘                      │
└───────────┬──────────────────────────────────────────────────┘
            │ Outbox Pattern
┌───────────▼──────────────────────────────────────────────────┐
│                   Outbox Dispatcher (Worker)                  │
│  - Poll outbox table for new events                          │
│  - Deliver to event handlers (idempotent)                    │
│  - Retry with exponential backoff                            │
│  - Dead-letter queue for failures                            │
└───────────┬──────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│                 Unification Primitives                        │
│  - Timeline aggregator (all domain events)                   │
│  - Client Profile read model (materialized view)             │
│  - Global Search indexer (Postgres → OpenSearch future)      │
│  - Workflow engine (cross-domain orchestration)              │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      Data Layer                               │
│  Postgres: schema-per-domain + shared (tenants, outbox)     │
│  Redis: sessions, rate limiting, caching                     │
│  S3/MinIO: object storage for files                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  External Integrations                        │
│  - Email (Microsoft Graph, Gmail) via OAuth                  │
│  - Ledger (QuickBooks, Xero) via OAuth/API keys              │
│  - E-sign (DocuSign, Dropbox Sign, PandaDoc) via webhooks    │
└──────────────────────────────────────────────────────────────┘
```

## Domain Responsibilities

### identity (Authentication & Authorization)
- **Tables:** tenants, users, roles, permissions, sessions
- **Owns:** User authentication, RBAC, session management
- **Events emitted:** user.created, user.updated, session.started, session.ended
- **Dependencies:** None (foundational)

### crm (Golden Record)
- **Tables:** clients, contacts, relationships, tags, custom_fields (JSONB)
- **Owns:** Canonical client/contact data; ALL other domains reference `client_id`
- **Events emitted:** client.created, client.updated, contact.created, contact.updated
- **Dependencies:** identity (user references)

### projects (Task Management)
- **Tables:** projects, tasks, milestones, kanban_states
- **Owns:** Project planning, task tracking, denormalized `client_id`
- **Events emitted:** project.created, task.completed, milestone.reached
- **Dependencies:** crm (client_id), identity (assignee references)

### files (Document Storage)
- **Tables:** file_objects, blob_metadata, versions, request_links
- **Owns:** File upload, versioning, presigned URL generation
- **Events emitted:** file.uploaded, file.requested, file.request.completed
- **Dependencies:** crm (client_id), identity (uploader)

### communications (Email & Messaging)
- **Tables:** threads, messages, email_sync_jobs, email_accounts
- **Owns:** Email sync scaffolding, thread/message storage, link-to-client
- **Events emitted:** email.received, email.sent, thread.created
- **Dependencies:** crm (client/contact linking)

### scheduling (Appointments & Calendar)
- **Tables:** appointments, calendar_events, external_calendar_ids
- **Owns:** Appointment booking, external calendar sync
- **Events emitted:** appointment.booked, appointment.cancelled, appointment.completed
- **Dependencies:** crm (client/contact), identity (attendees)

### portal (Client-Facing Views)
- **Tables:** portal_users, magic_links, portal_sessions, portal_views
- **Owns:** Magic link generation, client-facing views, approvals
- **Events emitted:** portal.accessed, portal.approval.submitted
- **Dependencies:** crm (client/contact), identity (portal user mapping)

### agreements (Proposals & Contracts)
- **Tables:** templates, proposals, proposal_versions, contracts, signature_packets
- **Owns:** Proposal generation, contract templates, e-signature orchestration
- **Events emitted:** proposal.sent, proposal.accepted, contract.signed
- **Dependencies:** crm (client/contact), files (attachments)

### revenue (AR/AP Orchestration)
- **Tables:** billing_accounts, invoices, invoice_lines, payments, vendors, bills, approvals, ledger_sync_map
- **Owns:** Invoice generation, payment tracking, bill approvals, ledger sync
- **Events emitted:** invoice.drafted, invoice.paid, bill.approved, bill.paid
- **Dependencies:** crm (client), agreements (contracts), ledger (external)

### workflow (Cross-Domain Orchestration)
- **Tables:** workflows, triggers, conditions, actions, runs, run_steps, retries
- **Owns:** Multi-domain workflow orchestration, retries, idempotency
- **Events emitted:** workflow.started, workflow.completed, workflow.failed
- **Dependencies:** ALL domains (orchestrates cross-domain processes)

### timeline (Audit Log)
- **Tables:** activity_events (append-only)
- **Owns:** Unified audit log for all domain mutations
- **Events emitted:** None (consumes all domain events)
- **Dependencies:** ALL domains (subscribes to all events)

### search (Global Search)
- **Tables:** search_index (Postgres baseline), search_config
- **Owns:** Cross-domain search (clients, projects, files, invoices)
- **Events emitted:** None (consumes domain events for indexing)
- **Dependencies:** ALL domains (indexes data from all domains)

## Domain Boundaries (Enforcement Rules)

1. **No cross-domain DB reads:** Domain A may NOT `SELECT` from domain B's tables
2. **Event-based communication:** Domains communicate via outbox events only
3. **Workflow orchestrates:** Only workflow engine may call multiple domains in sequence
4. **Client ID reference:** All domains store `client_id` (NOT full client data)
5. **Idempotent events:** Event handlers must be idempotent (support replay)

## Data Layer Architecture

### Postgres (Multi-Schema)
```
Database: ubos
├── schema: shared (tenants, outbox, migrations)
├── schema: identity (users, roles, sessions)
├── schema: crm (clients, contacts)
├── schema: projects (projects, tasks, milestones)
├── schema: files (file_objects, blob_metadata)
├── schema: communications (threads, messages)
├── schema: scheduling (appointments, calendar_events)
├── schema: portal (portal_users, magic_links)
├── schema: agreements (proposals, contracts)
├── schema: revenue (invoices, bills, payments)
├── schema: workflow (workflows, runs, actions)
├── schema: timeline (activity_events)
└── schema: search (search_index)
```

### Redis (Caching & Jobs)
- **Session store:** User sessions (HttpOnly cookies)
- **Rate limiting:** Per-IP, per-user, per-tenant counters
- **Cache:** Hot data (client profiles, project lists)
- **Pub/sub:** Real-time notifications (optional)

### S3/MinIO (Object Storage)
- **Bucket structure:** `{tenant_id}/{domain}/{entity_id}/{file_id}`
- **Access:** Presigned URLs only (no direct access)
- **Versioning:** Enabled for audit compliance

## Integration Architecture

### Email Integration (OAuth)
- **Providers:** Microsoft Graph, Gmail
- **Auth:** OAuth 2.0 (per-tenant credentials in vault)
- **Sync:** Background jobs poll for new emails → create threads/messages
- **Linking:** Manual/auto-link emails to clients via UI

### Ledger Integration (QuickBooks/Xero)
- **Providers:** QuickBooks Online, Xero
- **Auth:** OAuth 2.0 (per-tenant credentials in vault)
- **Sync:** Push invoices/bills to ledger, pull payments
- **Mapping:** `ledger_sync_map` table stores external IDs

### E-Sign Integration (DocuSign, etc.)
- **Providers:** DocuSign, Dropbox Sign, PandaDoc
- **Auth:** OAuth 2.0 or API keys (per-tenant)
- **Webhook:** Receive signature events → update contract status
- **Mapping:** `signature_packets` table stores external envelope IDs

## Eventing Architecture

### Outbox Pattern
1. Domain service creates entity + inserts event into `outbox` table (same transaction)
2. Outbox dispatcher (background worker) polls `outbox` table
3. Dispatcher delivers event to registered handlers
4. Handlers process idempotently (check event ID)
5. Failed events → retry with exponential backoff → dead-letter queue

### Event Schema
```typescript
interface DomainEvent {
  id: string;               // UUID
  tenant_id: string;        // Multi-tenancy
  event_type: string;       // e.g., "client.created"
  version: number;          // Event schema version
  payload: Record<string, any>;
  metadata: {
    actor_id: string;       // Who triggered the event
    timestamp: string;      // ISO 8601
    correlation_id: string; // Trace multi-step workflows
  };
}
```

## Workflow Engine

### Workflow Definition
```typescript
interface Workflow {
  id: string;
  name: string;
  trigger: WorkflowTrigger;   // Event type + conditions
  actions: WorkflowAction[];  // Sequential steps
  retry_policy: RetryPolicy;
}

interface WorkflowTrigger {
  event_type: string;         // e.g., "appointment.booked"
  conditions: Condition[];    // Filter criteria
}

interface WorkflowAction {
  type: "create_entity" | "send_email" | "call_api";
  domain: string;             // Target domain
  parameters: Record<string, any>;
  idempotency_key: string;    // Prevent duplicate execution
}
```

### Example: Appointment Booked Workflow
```yaml
trigger:
  event_type: "appointment.booked"
actions:
  - type: create_entity
    domain: crm
    entity: client
    parameters:
      name: "{{ event.payload.client_name }}"
  - type: create_entity
    domain: portal
    entity: portal_user
    parameters:
      client_id: "{{ step1.result.client_id }}"
  - type: create_entity
    domain: files
    entity: folder
    parameters:
      client_id: "{{ step1.result.client_id }}"
      template: "onboarding"
  - type: create_entity
    domain: projects
    entity: project
    parameters:
      client_id: "{{ step1.result.client_id }}"
      template: "onboarding_project"
```

## Security Architecture

### Multi-Tenancy
- **Tenant ID:** Every business table has `tenant_id` or `organization_id`
- **RLS:** Postgres Row-Level Security policies enforce tenant isolation
- **API:** All endpoints resolve `tenant_id` from session/token FIRST

### Authentication
- **Development:** Cookie-based (HttpOnly, Secure in prod)
- **Production:** OIDC-ready (Auth0, Okta, Azure AD)
- **Sessions:** Redis-backed, 24h TTL, refresh on activity

### Authorization
- **RBAC:** Roles (owner, admin, member, viewer) with permissions
- **Resource-level:** Fine-grained permissions (e.g., can_edit_project)
- **Enforcement:** Middleware + domain service checks

### Audit
- **Timeline:** All mutations logged to `activity_events` table
- **Immutable:** Append-only (no updates/deletes)
- **Retention:** 7 years for compliance

### Integration Security
- **Token Vault:** Encrypted per-tenant credentials (AES-256)
- **Least Privilege:** Minimum scopes for OAuth tokens
- **Health Dashboard:** Per-tenant integration status + reauth CTA

---

**Next Steps:**
1. See [GAP_ANALYSIS.md](../60_gaps_and_roadmap/GAP_ANALYSIS.md) to compare with current state
2. See [MIGRATION_PLAN.md](../60_gaps_and_roadmap/MIGRATION_PLAN.md) for implementation roadmap
