---
title: "API Evidence Map"
last_updated: "2026-02-04"
status: "active"
owner: "API Team"
classification: "internal"
---

# API Evidence Map: Documentation ↔ Code

**Purpose**: Trace API documentation to implementation (routes, handlers, schemas, tests)  
**Status**: ACTIVE  
**Last Updated**: 2026-02-04

---

## API Documentation → Code Mapping

### Authentication & Session

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/login` | [docs/api/auth/README.md](/docs/api/auth/README.md) | [server/routes.ts](/server/routes.ts#L126-L160) | N/A | [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts) |
| `GET /api/logout` | [docs/api/auth/README.md](/docs/api/auth/README.md) | [server/routes.ts](/server/routes.ts#L126-L160) | N/A | [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts) |
| `GET /api/auth/user` | [docs/api/auth/README.md](/docs/api/auth/README.md) | [server/routes.ts](/server/routes.ts#L126-L160) | [shared/models/auth.ts](/shared/models/auth.ts) | [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts) |

### Dashboard

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/dashboard/stats` | [docs/api/platform/README.md](/docs/api/platform/README.md) | [server/routes.ts](/server/routes.ts#L159-L190) | N/A (aggregated) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### CRM - Clients

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/clients` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L191-L250) | [shared/schema.ts](/shared/schema.ts) clients table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/clients` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L191-L250) | insertClientSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/clients/:id` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L191-L250) | insertClientSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/clients/:id` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L191-L250) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### CRM - Contacts

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/contacts` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L251-L310) | [shared/schema.ts](/shared/schema.ts) contacts table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/contacts` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L251-L310) | insertContactSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/contacts/:id` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L251-L310) | insertContactSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/contacts/:id` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L251-L310) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### CRM - Deals

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/deals` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L311-L370) | [shared/schema.ts](/shared/schema.ts) deals table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/deals` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L311-L370) | insertDealSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/deals/:id` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L311-L370) | insertDealSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/deals/:id` | [docs/api/crm/README.md](/docs/api/crm/README.md) | [server/routes.ts](/server/routes.ts#L311-L370) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Agreements - Proposals

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/proposals` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L371-L430) | [shared/schema.ts](/shared/schema.ts) proposals table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/proposals` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L371-L430) | insertProposalSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/proposals/:id` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L371-L430) | insertProposalSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/proposals/:id/send` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L371-L430) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/proposals/:id` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L371-L430) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Agreements - Contracts

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/contracts` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L431-L490) | [shared/schema.ts](/shared/schema.ts) contracts table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/contracts` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L431-L490) | insertContractSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/contracts/:id` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L431-L490) | insertContractSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/contracts/:id/send` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L431-L490) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/contracts/:id/sign` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L431-L490) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/contracts/:id` | [docs/api/agreements/README.md](/docs/api/agreements/README.md) | [server/routes.ts](/server/routes.ts#L431-L490) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Engagements

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/engagements` | [docs/api/engagements/README.md](/docs/api/engagements/README.md) | [server/routes.ts](/server/routes.ts#L491-L550) | [shared/schema.ts](/shared/schema.ts) engagements table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/engagements` | [docs/api/engagements/README.md](/docs/api/engagements/README.md) | [server/routes.ts](/server/routes.ts#L491-L550) | insertEngagementSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/engagements/:id` | [docs/api/engagements/README.md](/docs/api/engagements/README.md) | [server/routes.ts](/server/routes.ts#L491-L550) | insertEngagementSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/engagements/:id` | [docs/api/engagements/README.md](/docs/api/engagements/README.md) | [server/routes.ts](/server/routes.ts#L491-L550) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Projects

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/projects` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L551-L610) | [shared/schema.ts](/shared/schema.ts) projects table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/projects` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L551-L610) | insertProjectSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/projects/:id` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L551-L610) | insertProjectSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/projects/:id` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L551-L610) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Projects - Tasks

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/tasks` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L611-L670) | [shared/schema.ts](/shared/schema.ts) tasks table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/tasks` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L611-L670) | insertTaskSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/tasks/:id` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L611-L670) | insertTaskSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/tasks/:id` | [docs/api/projects/README.md](/docs/api/projects/README.md) | [server/routes.ts](/server/routes.ts#L611-L670) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Communications - Threads

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/threads` | [docs/api/communications/README.md](/docs/api/communications/README.md) | [server/routes.ts](/server/routes.ts#L671-L730) | [shared/schema.ts](/shared/schema.ts) threads table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/threads` | [docs/api/communications/README.md](/docs/api/communications/README.md) | [server/routes.ts](/server/routes.ts#L671-L730) | insertThreadSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/threads/:id` | [docs/api/communications/README.md](/docs/api/communications/README.md) | [server/routes.ts](/server/routes.ts#L671-L730) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Communications - Messages

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/threads/:id/messages` | [docs/api/communications/README.md](/docs/api/communications/README.md) | [server/routes.ts](/server/routes.ts#L731-L790) | [shared/schema.ts](/shared/schema.ts) messages table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/threads/:id/messages` | [docs/api/communications/README.md](/docs/api/communications/README.md) | [server/routes.ts](/server/routes.ts#L731-L790) | insertMessageSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Revenue - Invoices

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/invoices` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L791-L850) | [shared/schema.ts](/shared/schema.ts) invoices table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/invoices` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L791-L850) | insertInvoiceSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/invoices/:id` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L791-L850) | insertInvoiceSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/invoices/:id` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L791-L850) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

### Revenue - Bills

| API Endpoint | Documentation | Implementation | Schema | Tests |
|--------------|---------------|----------------|--------|-------|
| `GET /api/bills` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L851-L910) | [shared/schema.ts](/shared/schema.ts) bills table | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `POST /api/bills` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L851-L910) | insertBillSchema | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `PATCH /api/bills/:id` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L851-L910) | insertBillSchema (partial) | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |
| `DELETE /api/bills/:id` | [docs/api/revenue/README.md](/docs/api/revenue/README.md) | [server/routes.ts](/server/routes.ts#L851-L910) | N/A | [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) |

---

## Storage Layer Mapping

| Storage Method | Route Usage | Schema | Tests |
|----------------|-------------|--------|-------|
| `storage.getClients()` | GET /api/clients | clients table | Multi-tenant isolation tests |
| `storage.createClient()` | POST /api/clients | insertClientSchema | API routes tests |
| `storage.updateClient()` | PATCH /api/clients/:id | insertClientSchema | API routes tests |
| `storage.deleteClient()` | DELETE /api/clients/:id | N/A | API routes tests |

(Pattern repeats for all entities)

**Evidence**: [server/storage.ts](/server/storage.ts) - complete IStorage interface

---

## Schema Validation Mapping

| Schema | Usage | Definition | Tests |
|--------|-------|------------|-------|
| `insertClientSchema` | POST/PATCH /api/clients | [shared/schema.ts](/shared/schema.ts) | [shared/schema.test.ts](/shared/schema.test.ts) |
| `insertContactSchema` | POST/PATCH /api/contacts | [shared/schema.ts](/shared/schema.ts) | [shared/schema.test.ts](/shared/schema.test.ts) |
| `insertDealSchema` | POST/PATCH /api/deals | [shared/schema.ts](/shared/schema.ts) | [shared/schema.test.ts](/shared/schema.test.ts) |

(Pattern repeats for all entities)

---

## Security Controls Mapping

| Control | API Implementation | Documentation | Tests |
|---------|-------------------|---------------|-------|
| **Authentication** | requireAuth middleware | [docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md](/docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md) | [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts) |
| **Multi-Tenant Isolation** | organizationId scoping | [docs/data/10_current_state/TENANCY_AND_ACCESS.md](/docs/data/10_current_state/TENANCY_AND_ACCESS.md) | [tests/backend/multi-tenant-isolation.test.ts](/tests/backend/multi-tenant-isolation.test.ts) |
| **CSRF Protection** | CSRF middleware | [docs/security/10-controls/CONTROLS_MATRIX.md](/docs/security/10-controls/CONTROLS_MATRIX.md) | [tests/backend/csrf.test.ts](/tests/backend/csrf.test.ts) |
| **Rate Limiting** | Rate limit middleware | [server/security.ts](/server/security.ts) | [tests/backend/security.test.ts](/tests/backend/security.test.ts) |
| **Input Validation** | Zod schemas | [docs/security/30-implementation-guides/APPLICATION_SECURITY.md](/docs/security/30-implementation-guides/APPLICATION_SECURITY.md) | [shared/schema.test.ts](/shared/schema.test.ts) |

---

## Verification Commands

```bash
# Verify all API routes work
npm run test:backend -- api-routes.test.ts

# Verify authentication enforcement
npm run test:backend -- auth-middleware.test.ts

# Verify multi-tenant isolation
npm run test:backend -- multi-tenant-isolation.test.ts

# Verify schema validation
npm test -- schema.test.ts

# Type check entire codebase
npm run check
```

---

**Last Verified**: 2026-02-04  
**Verification**: Routes → handlers → schemas → tests mapping confirmed via test execution
