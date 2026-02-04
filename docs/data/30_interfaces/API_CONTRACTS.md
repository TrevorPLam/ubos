# API Contracts & Data Payloads

**Coverage**: HTTP endpoints that read/write data; request/response schemas  
**Source**: [server/routes.ts](../../server/routes.ts)  
**Validation**: [shared/schema.ts](../../shared/schema.ts) (Zod insert schemas)

---

## 🗂️ API Routes by Domain

### Authentication & Session

| Method | Path | Handler | Auth Required | Returns |
|--------|------|---------|---|---|
| GET | `/api/login` | Mint session | ❌ | { userId: string, orgId: string } |
| GET | `/api/logout` | Clear cookie | ✅ | { ok: true } |
| GET | `/api/auth/user` | Get current user | ✅ | User + Organization |

**Session storage**: HttpOnly cookie `ubos_user_id` (dev) or Bearer token (prod TODO)

---

### Dashboard & Stats

| Method | Path | Handler | Returns |
|--------|------|---------|---------|
| GET | `/api/dashboard/stats` | Org-level metrics | { clientCount, dealCount, engagementCount, invoiceCount } |

---

### CRM: Clients & Companies

#### GET /api/clients (List)
- **Auth**: ✅ Required
- **Query params**: None (TODO: add pagination)
- **Response**: `ClientCompany[]`
- **Example**:
  ```json
  {
    "clients": [
      {
        "id": "client-001",
        "organizationId": "org-001",
        "name": "Acme Corp",
        "website": "https://acme.com",
        "industry": "Technology",
        "address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94102",
        "country": "USA",
        "notes": "Preferred customer",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-02-01T00:00:00Z"
      }
    ]
  }
  ```

#### POST /api/clients (Create)
- **Auth**: ✅ Required
- **Body**: 
  ```json
  {
    "name": "Acme Corp",
    "website": "https://acme.com",
    "industry": "Technology",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "country": "USA",
    "notes": "Preferred customer"
  }
  ```
- **Validation**: [insertClientCompanySchema](../../shared/schema.ts)
- **Response**: Created `ClientCompany` with id, timestamps

#### GET /api/clients/:id (Fetch)
- **Auth**: ✅ Required
- **Params**: `id` (UUID)
- **Response**: Single `ClientCompany` or 404

#### PUT /api/clients/:id (Update)
- **Auth**: ✅ Required
- **Body**: Partial ClientCompany (any fields)
- **Response**: Updated `ClientCompany`

#### DELETE /api/clients/:id (Delete)
- **Auth**: ✅ Required
- **Response**: `{ ok: true }` or 404
- **Behavior**: Hard delete (TODO: implement soft delete)

---

### CRM: Contacts

| Method | Path | Validation Schema |
|--------|------|-------------------|
| GET | `/api/contacts` | — |
| POST | `/api/contacts` | [insertContactSchema](../../shared/schema.ts) |
| GET | `/api/contacts/:id` | — |
| PUT | `/api/contacts/:id` | Partial insertContactSchema |
| DELETE | `/api/contacts/:id` | — |

**Contact schema**:
```json
{
  "id": "contact-001",
  "organizationId": "org-001",
  "clientCompanyId": "client-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@acme.com",
  "phone": "+1-555-1234",
  "title": "CEO",
  "isPrimary": true,
  "notes": "Primary contact",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-02-01T00:00:00Z"
}
```

---

### Sales: Deals

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/deals` | — |
| POST | `/api/deals` | [insertDealSchema](../../shared/schema.ts) |
| GET | `/api/deals/:id` | — |
| PUT | `/api/deals/:id` | Partial insertDealSchema |
| DELETE | `/api/deals/:id` | — |

**Deal schema**:
```json
{
  "id": "deal-001",
  "organizationId": "org-001",
  "clientCompanyId": "client-001",
  "contactId": "contact-001",
  "ownerId": "user-alice",
  "name": "Acme Enterprise Deal",
  "description": "Full digital transformation",
  "value": "150000.00",
  "stage": "proposal",
  "probability": 75,
  "expectedCloseDate": "2025-03-31T00:00:00Z",
  "closedAt": null,
  "notes": "Waiting for stakeholder approval",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-02-01T00:00:00Z"
}
```

**Stage enum**: lead, qualified, proposal, negotiation, won, lost

---

### Agreements: Proposals

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/proposals` | — |
| POST | `/api/proposals` | [insertProposalSchema](../../shared/schema.ts) |
| GET | `/api/proposals/:id` | — |
| PUT | `/api/proposals/:id` | Partial insertProposalSchema |
| DELETE | `/api/proposals/:id` | — |

**Proposal schema**:
```json
{
  "id": "proposal-001",
  "organizationId": "org-001",
  "dealId": "deal-001",
  "clientCompanyId": "client-001",
  "contactId": "contact-001",
  "createdById": "user-alice",
  "name": "Proposal: Acme Digital Transformation",
  "status": "sent",
  "content": "<html>...</html>",
  "totalValue": "150000.00",
  "validUntil": "2025-02-28T00:00:00Z",
  "sentAt": "2025-02-01T00:00:00Z",
  "viewedAt": "2025-02-02T00:00:00Z",
  "respondedAt": null,
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-01T00:00:00Z"
}
```

**Status enum**: draft, sent, viewed, accepted, rejected, expired

---

### Agreements: Contracts

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/contracts` | — |
| POST | `/api/contracts` | [insertContractSchema](../../shared/schema.ts) |
| GET | `/api/contracts/:id` | — |
| PUT | `/api/contracts/:id` | Partial insertContractSchema |
| DELETE | `/api/contracts/:id` | — |

**Contract schema**:
```json
{
  "id": "contract-001",
  "organizationId": "org-001",
  "proposalId": "proposal-001",
  "dealId": "deal-001",
  "clientCompanyId": "client-001",
  "contactId": "contact-001",
  "createdById": "user-alice",
  "name": "Master Service Agreement - Acme",
  "status": "signed",
  "content": "<html>...</html>",
  "totalValue": "150000.00",
  "startDate": "2025-03-01T00:00:00Z",
  "endDate": "2026-02-28T00:00:00Z",
  "signedAt": "2025-02-15T00:00:00Z",
  "signedByName": "John Doe",
  "signatureData": "signature_base64_encoded",
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-15T00:00:00Z"
}
```

**Status enum**: draft, sent, signed, expired, cancelled

---

### Engagement Hub

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/engagements` | — |
| POST | `/api/engagements` | [insertEngagementSchema](../../shared/schema.ts) |
| GET | `/api/engagements/:id` | — |
| PUT | `/api/engagements/:id` | Partial insertEngagementSchema |
| DELETE | `/api/engagements/:id` | — |

**Engagement schema**: See [20_entities/Engagement.md](../20_entities/Engagement.md)

---

### Projects

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/projects` | — |
| POST | `/api/projects` | [insertProjectSchema](../../shared/schema.ts) |
| GET | `/api/projects/:id` | — |
| PUT | `/api/projects/:id` | Partial insertProjectSchema |
| DELETE | `/api/projects/:id` | — |

**Project schema**:
```json
{
  "id": "project-001",
  "organizationId": "org-001",
  "engagementId": "engagement-001",
  "templateId": null,
  "name": "Website Redesign",
  "description": "Complete redesign of marketing website",
  "status": "in_progress",
  "startDate": "2025-02-01T00:00:00Z",
  "dueDate": "2025-04-30T00:00:00Z",
  "completedAt": null,
  "progress": 45,
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-15T00:00:00Z"
}
```

**Status enum**: not_started, in_progress, completed, on_hold, cancelled

---

### Tasks

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/tasks` | — |
| POST | `/api/tasks` | [insertTaskSchema](../../shared/schema.ts) |
| GET | `/api/tasks/:id` | — |
| PUT | `/api/tasks/:id` | Partial insertTaskSchema |
| DELETE | `/api/tasks/:id` | — |

**Task schema**:
```json
{
  "id": "task-001",
  "organizationId": "org-001",
  "projectId": "project-001",
  "milestoneId": "milestone-001",
  "assigneeId": "user-bob",
  "name": "Design homepage mockups",
  "description": "Create 3 mockup variations for stakeholder review",
  "status": "in_progress",
  "priority": "high",
  "dueDate": "2025-02-28T00:00:00Z",
  "completedAt": null,
  "sortOrder": 0,
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-15T00:00:00Z"
}
```

**Status enum**: todo, in_progress, review, completed, cancelled  
**Priority enum**: low, medium, high, urgent

---

### Communications: Threads

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/threads` | — |
| POST | `/api/threads` | [insertThreadSchema](../../shared/schema.ts) |
| GET | `/api/threads/:id` | — |
| DELETE | `/api/threads/:id` | — |

**Thread schema**:
```json
{
  "id": "thread-001",
  "organizationId": "org-001",
  "engagementId": "engagement-001",
  "type": "client",
  "subject": "Project status update",
  "createdById": "user-alice",
  "lastMessageAt": "2025-02-15T10:30:00Z",
  "createdAt": "2025-02-01T00:00:00Z"
}
```

**Type enum**: internal, client

---

### Communications: Messages

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/threads/:threadId/messages` | — |
| POST | `/api/threads/:threadId/messages` | [insertMessageSchema](../../shared/schema.ts) |
| DELETE | `/api/threads/:threadId/messages/:id` | — |

**Message schema**:
```json
{
  "id": "message-001",
  "threadId": "thread-001",
  "senderId": "user-alice",
  "senderName": "Alice Smith",
  "content": "Here's the project status update...",
  "attachments": [
    { "fileName": "status.pdf", "path": "/files/status.pdf", "mimeType": "application/pdf" }
  ],
  "createdAt": "2025-02-15T10:30:00Z"
}
```

---

### Revenue: Invoices

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/invoices` | — |
| POST | `/api/invoices` | [insertInvoiceSchema](../../shared/schema.ts) |
| GET | `/api/invoices/:id` | — |
| PUT | `/api/invoices/:id` | Partial insertInvoiceSchema |
| DELETE | `/api/invoices/:id` | — |

**Invoice schema**:
```json
{
  "id": "invoice-001",
  "organizationId": "org-001",
  "engagementId": "engagement-001",
  "scheduleId": "schedule-001",
  "clientCompanyId": "client-001",
  "invoiceNumber": "INV-2025-001",
  "status": "sent",
  "amount": "15000.00",
  "tax": "1200.00",
  "totalAmount": "16200.00",
  "lineItems": [
    { "description": "Consulting services", "quantity": 40, "unitPrice": "350.00", "amount": "14000.00" },
    { "description": "Expenses", "quantity": 1, "unitPrice": "1000.00", "amount": "1000.00" }
  ],
  "dueDate": "2025-03-15T00:00:00Z",
  "sentAt": "2025-02-01T00:00:00Z",
  "paidAt": null,
  "paidAmount": null,
  "notes": "Payment terms: Net 30",
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-01T00:00:00Z"
}
```

**Status enum**: draft, sent, viewed, paid, overdue, cancelled

---

### Revenue: Bills

| Method | Path | Schema |
|--------|------|--------|
| GET | `/api/bills` | — |
| POST | `/api/bills` | [insertBillSchema](../../shared/schema.ts) |
| GET | `/api/bills/:id` | — |
| PUT | `/api/bills/:id` | Partial insertBillSchema |
| DELETE | `/api/bills/:id` | — |

**Bill schema**:
```json
{
  "id": "bill-001",
  "organizationId": "org-001",
  "engagementId": null,
  "vendorId": "vendor-001",
  "createdById": "user-alice",
  "billNumber": "BILL-2025-001",
  "status": "pending",
  "amount": "5000.00",
  "dueDate": "2025-03-15T00:00:00Z",
  "description": "Hosting and infrastructure costs",
  "attachmentPath": "/files/bill-001.pdf",
  "approvedById": null,
  "approvedAt": null,
  "paidAt": null,
  "notes": "Q1 hosting renewal",
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-01T00:00:00Z"
}
```

**Status enum**: pending, approved, rejected, paid, cancelled

---

## 🔐 Error Responses

All endpoints return standard error format:

```json
{
  "message": "Error message here",
  "status": 400,
  "error": "validation_error" // or "not_found", "unauthorized", "internal_server_error"
}
```

**Common status codes**:
- `200` — Success
- `201` — Created
- `400` — Bad request (validation failed)
- `401` — Unauthorized (not authenticated)
- `403` — Forbidden (authenticated but not authorized)
- `404` — Not found
- `409` — Conflict (e.g., duplicate unique constraint)
- `500` — Internal server error

---

## 📝 Request Headers (All Routes)

| Header | Required | Example | Notes |
|--------|----------|---------|-------|
| `Content-Type` | ✅ (POST/PUT) | `application/json` | For JSON payloads |
| `x-user-id` | ❌ (dev only) | `user-alice` | Dev header auth (disabled in prod) |
| `x-user` | ❌ (dev only) | `user-alice` | Alternative to x-user-id |
| `Authorization` | ❌ (future) | `Bearer <token>` | For OIDC/JWT (not yet implemented) |

---

## 🔄 Pagination (Current: NOT IMPLEMENTED)

**Issue**: All list endpoints return all rows (no limit/offset).

**TODO**: Add pagination support:
```
GET /api/clients?limit=50&offset=0
GET /api/clients?cursor=<token>&limit=50
```

---

## 📚 Response Structure (Current)

**List endpoints**:
```json
{
  "items": [ /* array of entities */ ]
}
```

**Single entity**:
```json
{
  "id": "...",
  "name": "...",
  /* ... other fields */
}
```

---

## 🔗 Related Documents

- [EVENTS_AND_WEBHOOKS.md](EVENTS_AND_WEBHOOKS.md) — Event schemas
- [FILES_AND_UPLOADS.md](FILES_AND_UPLOADS.md) — File endpoints
- [../20_entities/ENTITY_INDEX.md](../20_entities/ENTITY_INDEX.md) — Entity specs
- [../../server/routes.ts](../../server/routes.ts) — Implementation

---

**Last updated**: 2025-02-04  
**Total endpoints**: ~70 (CRUD × 10 primary entities)
