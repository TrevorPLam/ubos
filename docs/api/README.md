# API Documentation Index

Purpose: track the current API surface in this repo and define the intended documentation layout as the backend evolves.

## Planned folder structure for docs/api

```
docs/api/
  README.md                (this file)
  _plan.md                 (documentation roadmap + ownership)
  auth/README.md           (auth flows, headers, session behavior)
  platform/README.md       (health, diagnostics, metadata)
  crm/README.md            (clients, contacts, deals)
  agreements/README.md     (proposals, contracts)
  engagements/README.md    (engagements)
  projects/README.md       (projects, tasks)
  communications/README.md (threads, messages)
  revenue/README.md        (invoices, bills, vendors)
  scheduling/README.md     (appointments booking)
  files/README.md          (files, presign, requests)
  workflow/README.md       (workflows, runs)
  timeline/README.md       (activity event append-only)
  search/README.md         (search endpoints)
  integrations/README.md   (email, ledger, e-sign stubs + health)
  examples/                (request/response samples)
  openapi/                 (OpenAPI source + exported JSON)
  changelog.md             (versioned API changes)
```

Notes:
- This plan aligns with the modular monolith domains in [PLAN.md](PLAN.md).

## Domain docs

- [docs/api/_plan.md](docs/api/_plan.md)
- [docs/api/auth/README.md](docs/api/auth/README.md)
- [docs/api/platform/README.md](docs/api/platform/README.md)
- [docs/api/crm/README.md](docs/api/crm/README.md)
- [docs/api/agreements/README.md](docs/api/agreements/README.md)
- [docs/api/engagements/README.md](docs/api/engagements/README.md)
- [docs/api/projects/README.md](docs/api/projects/README.md)
- [docs/api/communications/README.md](docs/api/communications/README.md)
- [docs/api/revenue/README.md](docs/api/revenue/README.md)
- [docs/api/scheduling/README.md](docs/api/scheduling/README.md)
- [docs/api/files/README.md](docs/api/files/README.md)
- [docs/api/workflow/README.md](docs/api/workflow/README.md)
- [docs/api/timeline/README.md](docs/api/timeline/README.md)
- [docs/api/search/README.md](docs/api/search/README.md)
- [docs/api/integrations/README.md](docs/api/integrations/README.md)
- [docs/api/examples/README.md](docs/api/examples/README.md)
- [docs/api/openapi/README.md](docs/api/openapi/README.md)
- [docs/api/changelog.md](docs/api/changelog.md)
- Some planned domains are not implemented yet; they will remain empty until their API routes exist.

## Current API inventory (implemented today)

Source of truth: [server/routes.ts](server/routes.ts).

### Auth + session
- GET /api/login (sets HttpOnly cookie and redirects)
- GET /api/logout (clears cookie and redirects)
- GET /api/auth/user (returns current user)

Auth behavior:
- Use `x-user-id` / `x-user` header or the `ubos_user_id` HttpOnly cookie.
- All business data is scoped by `organizationId`, derived from the authenticated user.

### Dashboard
- GET /api/dashboard/stats

### CRM (clients + contacts + deals)
- GET /api/clients
- POST /api/clients
- PATCH /api/clients/:id
- DELETE /api/clients/:id

- GET /api/contacts
- POST /api/contacts
- PATCH /api/contacts/:id
- DELETE /api/contacts/:id

- GET /api/deals
- POST /api/deals
- PATCH /api/deals/:id
- DELETE /api/deals/:id

### Agreements (proposals + contracts)
- GET /api/proposals
- POST /api/proposals
- PATCH /api/proposals/:id
- POST /api/proposals/:id/send
- DELETE /api/proposals/:id

- GET /api/contracts
- POST /api/contracts
- PATCH /api/contracts/:id
- POST /api/contracts/:id/send
- POST /api/contracts/:id/sign
- DELETE /api/contracts/:id

### Engagements
- GET /api/engagements
- POST /api/engagements
- PATCH /api/engagements/:id
- DELETE /api/engagements/:id

### Projects + tasks
- GET /api/projects
- POST /api/projects
- PATCH /api/projects/:id
- DELETE /api/projects/:id

- GET /api/tasks
- POST /api/tasks

### Communications (threads + messages)
- GET /api/threads
- POST /api/threads
- GET /api/threads/:id/messages
- POST /api/threads/:id/messages

### Revenue (invoices + bills + vendors)
- GET /api/invoices
- POST /api/invoices
- PATCH /api/invoices/:id
- POST /api/invoices/:id/send
- POST /api/invoices/:id/mark-paid
- DELETE /api/invoices/:id

- GET /api/bills
- POST /api/bills
- PATCH /api/bills/:id
- POST /api/bills/:id/approve
- POST /api/bills/:id/reject
- POST /api/bills/:id/mark-paid
- DELETE /api/bills/:id

- GET /api/vendors
- POST /api/vendors

## Gaps vs PLAN.md

Planned but not yet present in the API routes:
- identity (beyond basic local auth)
- files, scheduling, portal, timeline, search
- workflow engine endpoints
- integrations (email, ledger, e-sign) + integration health
- global search and client profile read model

When new routes are added, document them under their domain folder and update the inventory above.
