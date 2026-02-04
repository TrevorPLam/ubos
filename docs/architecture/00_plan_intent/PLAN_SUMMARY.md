# PLAN Intent Summary

**Purpose:** Extract architecture-relevant requirements from PLAN.md.  
**Source:** [PLAN.md](../../../PLAN.md)  
**Last verified:** 2026-02-04

## Architecture Overview

**Model:** Modular monolith → microservices-ready  
**Golden Record:** CRM domain owns canonical Client/Contact entities  
**Cross-domain communication:** Event-based via outbox pattern + workflow orchestration

## Product Modules & Boundaries

| Domain | Responsibility | Key Entities |
|--------|---------------|--------------|
| **identity** | Tenancy, users, RBAC, sessions, OIDC-ready | tenant, user, role, session |
| **crm** | Golden record: client/contact/relationship, tags, custom fields | client, contact, relationship |
| **projects** | Projects, tasks, kanban states | project, task, milestone |
| **files** | Document storage, versions, presigned URLs, request links | file_object, blob_metadata, version |
| **communications** | Email sync, thread/message storage, link-to-client | thread, message, email_sync |
| **scheduling** | Appointments, external calendar IDs, booking | appointment, calendar_event |
| **portal** | Client-facing views, magic links, approvals | portal_user, magic_link |
| **agreements** | Templates, proposals, contracts, signature packets | proposal, contract, signature_packet |
| **revenue** | AR/AP orchestration, billing, invoices, payments, vendor bills | invoice, payment, bill, billing_account |
| **workflow** | Triggers, conditions, actions, runs, retries, idempotency | workflow, trigger, action, run |
| **timeline** | Append-only activity events | activity_event |
| **search** | Global search (Postgres baseline, OpenSearch future) | search_index |

## Architectural Constraints

1. **No cross-domain DB reads:** Domains may NOT query other domains' tables directly
2. **Schema-per-domain:** Each domain has its own schema namespace in Postgres
3. **Event-driven integration:** Domains communicate via outbox events
4. **Workflow as orchestrator:** Only the workflow engine may orchestrate multi-domain processes
5. **Client ID everywhere:** All tenant data references `client_id` from CRM golden record

## Unification Primitives (Cross-Domain)

- **Timeline:** Append-only log of all domain events (for audit + client profile)
- **Client Profile:** Materialized read model aggregating client data from all domains
- **Global Search:** Unified search index across all domains
- **Workflow Engine:** Cross-domain orchestration without coupling

## Integration Strategy (External)

- **Email:** OAuth APIs (Microsoft Graph, Gmail) — sync scaffolding + thread/message storage
- **Ledger:** QuickBooks/Xero integration stubs + mapping + sync jobs
- **E-sign:** Provider abstraction (DocuSign/Dropbox Sign/PandaDoc) + webhook receivers
- **Files:** S3-compatible object storage (MinIO local, S3 production)

## Non-Functional Requirements

### Security
- **Tenant isolation:** `tenant_id` on every business table + RLS enforcement
- **Audit logs:** All mutations logged to timeline
- **Presigned URLs:** No direct S3 access; presigned URLs generated per-request
- **Least privilege:** Integration tokens scoped to minimum permissions
- **Token vault:** Per-tenant integration credentials encrypted at rest
- **Integration health:** Per-tenant dashboard showing sync status/errors/reauth

### Performance
- **Outbox dispatcher:** Background worker processes events asynchronously
- **Idempotent handlers:** Events can be replayed safely
- **Dead-letter queue:** Failed events retried with exponential backoff
- **Caching:** Redis for sessions, rate limiting, hot data

### Reliability
- **Retries:** Automatic retry with exponential backoff for transient failures
- **Circuit breakers:** Disable failing integrations to prevent cascading failures
- **Health checks:** Per-integration health monitoring + alerting

### Compliance
- **SOC2-ready:** Audit logs, RBAC, encryption at rest/in transit
- **GDPR-ready:** Data deletion workflows, consent tracking, PII redaction in logs

## Target Deployment Model

- **Development:** Single process (Express + Vite), Postgres + Redis + MinIO all local via Docker Compose
- **Production:** Single-server deployment initially, horizontally scalable
- **Environments:** dev, staging, production
- **CI/CD:** GitHub Actions (or equivalent) — typecheck, lint, test, build, deploy

## Flagship Workflows (Vertical Slices)

1. **Appointment Booked:** Create/attach contact+client → create portal user → create folder template → create project skeleton
2. **Proposal Accepted:** Contract send for signature → on signed activate project + invoice plan
3. **File Request Completed:** Attach file to project → create review task → notify assignee
4. **Milestone/Task Completed:** Invoice drafted → approval → issue to ledger → notify portal
5. **Invoice Paid:** Update CRM client status/timeline + schedule follow-up
6. **Bill Received:** Approval routing → push to ledger → status/timeline update

## Architecture Principles

- **Simple, correct, observable** over clever
- **Contracts-first:** Define events + API DTOs before implementing business logic
- **MVP-thin but correct:** Avoid full GL/CPQ; focus on essential features
- **Local-first development:** Everything runs in Docker Compose
- **Extractability:** Modular design allows future extraction to microservices

---

**Next Steps:**
1. See [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md) for detailed component model
2. See [GAP_ANALYSIS.md](../60_gaps_and_roadmap/GAP_ANALYSIS.md) for current vs target delta
