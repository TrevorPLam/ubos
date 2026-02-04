# Evidence Map: Documentation ↔ Code

**Purpose**: Trace each doc section to the code files that define or implement it.

---

## 📍 Schema & Data Model

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Current State Overview** | [shared/schema.ts](../../shared/schema.ts) | All 23 entities with Drizzle table definitions |
| **Enums** | [shared/schema.ts](../../shared/schema.ts#L29-L56) | 12 pgEnum definitions (deal_stage, proposal_status, etc.) |
| **Foreign Keys** | [shared/schema.ts](../../shared/schema.ts#L110-L200) | FK definitions with cascade rules in table definitions |
| **Org Scoping** | [shared/schema.ts](../../shared/schema.ts) + [server/storage.ts](../../server/storage.ts) | organizationId field on 20 tables; WHERE filters in storage methods |
| **Insert Schemas** | [shared/schema.ts](../../shared/schema.ts#L800-L900) | Zod schemas auto-generated via `createInsertSchema()` |
| **Type Exports** | [shared/schema.ts](../../shared/schema.ts#L900-END) | TypeScript type exports (Organization, Deal, Invoice, etc.) |
| **User Table** | [shared/models/auth.ts](../../shared/models/auth.ts) | Global user store definition |

---

## 🗄️ Data Sources & Storage

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Database Connection** | [server/db.ts](../../server/db.ts) | Drizzle instance creation; environment variable usage |
| **Storage Layer** | [server/storage.ts](../../server/storage.ts) (719 lines) | IStorage interface; all CRUD methods for each entity |
| **Org Scoping Enforcement** | [server/storage.ts](../../server/storage.ts#L100-L150) | Every read/update/delete includes `eq(table.organizationId, orgId)` |
| **Multi-Tenant Isolation Tests** | [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts) | Test cases verifying org isolation |
| **Session Management** | [server/routes.ts](../../server/routes.ts#L50-L100) | `getUserIdFromRequest()`, cookie parsing |
| **Org Resolution** | [server/routes.ts](../../server/routes.ts#L106-L130) | `getOrCreateOrg()` function |

---

## 🌐 API Routes & Endpoints

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Route Index** | [server/routes.ts](../../server/routes.ts#L1-L50) | Comment section lists all endpoints by domain |
| **Auth Routes** | [server/routes.ts](../../server/routes.ts#L126-L160) | GET /api/login, /logout, /auth/user |
| **Dashboard Route** | [server/routes.ts](../../server/routes.ts#L159-L190) | GET /api/dashboard/stats with org stats |
| **Client CRUD** | [server/routes.ts](../../server/routes.ts#L191-L250) | GET/POST/PUT/DELETE /api/clients |
| **Contact CRUD** | [server/routes.ts](../../server/routes.ts#L251-L310) | GET/POST/PUT/DELETE /api/contacts |
| **Deal CRUD** | [server/routes.ts](../../server/routes.ts#L311-L370) | GET/POST/PUT/DELETE /api/deals |
| **Proposal CRUD** | [server/routes.ts](../../server/routes.ts#L371-L430) | GET/POST/PUT/DELETE /api/proposals |
| **Contract CRUD** | [server/routes.ts](../../server/routes.ts#L431-L490) | GET/POST/PUT/DELETE /api/contracts |
| **Engagement CRUD** | [server/routes.ts](../../server/routes.ts#L491-L550) | GET/POST/PUT/DELETE /api/engagements |
| **Project CRUD** | [server/routes.ts](../../server/routes.ts#L551-L610) | GET/POST/PUT/DELETE /api/projects |
| **Task CRUD** | [server/routes.ts](../../server/routes.ts#L611-L670) | GET/POST/PUT/DELETE /api/tasks |
| **Thread CRUD** | [server/routes.ts](../../server/routes.ts#L671-L730) | GET/POST/DELETE /api/threads |
| **Message CRUD** | [server/routes.ts](../../server/routes.ts#L731-L790) | GET/POST /api/threads/:id/messages |
| **Invoice CRUD** | [server/routes.ts](../../server/routes.ts#L791-L850) | GET/POST/PUT/DELETE /api/invoices |
| **Bill CRUD** | [server/routes.ts](../../server/routes.ts#L851-L910) | GET/POST/PUT/DELETE /api/bills |

---

## 🔐 Security & Validation

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Auth Middleware** | [server/routes.ts](../../server/routes.ts#L91-L105) | `requireAuth` middleware; `getUserIdFromRequest()` |
| **Header-Based Auth (Dev)** | [server/routes.ts](../../server/routes.ts#L59-L90) | x-user-id and x-user header parsing (dev only) |
| **Prod Auth Rejection** | [server/routes.ts](../../server/routes.ts#L70-L82) | Check for isProduction flag; reject header auth |
| **Security Middleware** | [server/security.ts](../../server/security.ts) | Helmet, rate limiting, CORS setup |
| **CSRF Protection** | [server/csrf.ts](../../server/csrf.ts) | CSRF token generation/validation |
| **CSRF Tests** | [tests/backend/csrf.test.ts](../../tests/backend/csrf.test.ts) | Test cases for CSRF |
| **Rate Limiting** | [server/security.ts](../../server/security.ts) | Rate limit config per THREAT_MODEL.md |
| **Request Logging** | [server/index.ts](../../server/index.ts#L60-L100) | Middleware logs API requests with redaction |
| **Sanitization Utils** | [server/security-utils.ts](../../server/security-utils.ts) | PII redaction functions |

---

## 📊 Testing & Validation

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **API Route Tests** | [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts) | Integration tests for endpoints |
| **Auth Middleware Tests** | [tests/backend/auth-middleware.test.ts](../../tests/backend/auth-middleware.test.ts) | Auth enforcement tests |
| **Multi-Tenant Isolation** | [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts) | Org scoping validation |
| **CSRF Tests** | [tests/backend/csrf.test.ts](../../tests/backend/csrf.test.ts) | CSRF token/validation |
| **Security Tests** | [tests/backend/security.test.ts](../../tests/backend/security.test.ts) | Headers, rate limiting, etc. |
| **Security Utils Tests** | [tests/backend/security-utils.test.ts](../../tests/backend/security-utils.test.ts) | PII redaction tests |
| **Setup: Backend** | [tests/setup/backend.setup.ts](../../tests/setup/backend.setup.ts) | Test database + fixtures |
| **Setup: Frontend** | [tests/setup/frontend.setup.ts](../../tests/setup/frontend.setup.ts) | React testing setup |
| **Test Utils: Express Mocks** | [tests/utils/express-mocks.ts](../../tests/utils/express-mocks.ts) | Mock req/res objects |
| **Test Utils: React** | [tests/utils/react-test-utils.tsx](../../tests/utils/react-test-utils.tsx) | Render helpers + providers |

---

## 📋 Gap Analysis Mapping

| Gap | Code Files to Change | Estimated Lines |
|-----|----------------------|-----------------|
| **Soft Deletes** | [shared/schema.ts](../../shared/schema.ts) (add deleted_at to 20 tables) | 20 columns |
| | [server/storage.ts](../../server/storage.ts) (add IS NULL filters + softDelete methods) | 200+ lines |
| | [server/routes.ts](../../server/routes.ts) (delete endpoints become soft delete) | 50 lines |
| | [tests/backend/](../../tests/backend/) (soft delete tests) | 100 lines |
| **Activity Event Auto-Logging** | [server/index.ts](../../server/index.ts) (middleware to capture pre/post state) | 100 lines |
| | [server/storage.ts](../../server/storage.ts) (helper to log activities) | 50 lines |
| | [tests/backend/](../../tests/backend/) (audit tests) | 100 lines |
| **Outbox Pattern** | [shared/schema.ts](../../shared/schema.ts) (new outbox table + deadLetterQueue) | 50 lines |
| | [server/outbox.ts](../../server/outbox.ts) (new file: dispatcher + storage methods) | 300 lines |
| | [server/jobs/outbox-dispatcher.ts](../../server/jobs/outbox-dispatcher.ts) (new job) | 200 lines |
| | [tests/backend/outbox.test.ts](../../tests/backend/outbox.test.ts) (new test file) | 150 lines |
| **Workflow Engine** | [shared/schema.ts](../../shared/schema.ts) (WorkflowTrigger, WorkflowRun, WorkflowAction tables) | 100 lines |
| | [server/workflow.ts](../../server/workflow.ts) (new file: executor + state mgmt) | 500 lines |
| | [server/workflows/](../../server/workflows/) (new folder: workflow definitions) | 1000+ lines |
| | [tests/backend/workflow.test.ts](../../tests/backend/workflow.test.ts) (new test file) | 300 lines |
| **Email Sync** | [shared/schema.ts](../../shared/schema.ts) (integration_config table) | 30 lines |
| | [server/integrations/email.ts](../../server/integrations/email.ts) (new file: Gmail/Graph API client) | 400 lines |
| | [server/jobs/email-sync.ts](../../server/jobs/email-sync.ts) (new job) | 200 lines |
| | [tests/backend/email-sync.test.ts](../../tests/backend/email-sync.test.ts) (new test file) | 150 lines |
| **File Upload + Presign** | [server/storage.ts](../../server/storage.ts) (add presign + upload methods) | 100 lines |
| | [server/routes.ts](../../server/routes.ts) (add upload/download endpoints) | 100 lines |
| | [server/s3.ts](../../server/s3.ts) (new file: S3 client) | 150 lines |
| | [tests/backend/file-upload.test.ts](../../tests/backend/file-upload.test.ts) (new test file) | 100 lines |

---

## 🔗 Domain Module Cross-References

### Identity Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 102–152)
- Storage: [server/storage.ts](../../server/storage.ts) (users, organizations, organizationMembers)
- Routes: [server/routes.ts](../../server/routes.ts) (login, logout, auth/user)
- Tests: [tests/backend/auth-middleware.test.ts](../../tests/backend/auth-middleware.test.ts)

### CRM Domain (Golden Record)
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 154–200)
- Storage: [server/storage.ts](../../server/storage.ts) (clientCompanies, contacts)
- Routes: [server/routes.ts](../../server/routes.ts) (/api/clients, /api/contacts)
- Tests: [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts)

### Sales Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 202–290)
- Storage: [server/storage.ts](../../server/storage.ts) (deals, proposals, contracts)
- Routes: [server/routes.ts](../../server/routes.ts) (/api/deals, /api/proposals, /api/contracts)
- Tests: [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts)

### Projects Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 292–385)
- Storage: [server/storage.ts](../../server/storage.ts) (projects, tasks, milestones, projectTemplates)
- Routes: [server/routes.ts](../../server/routes.ts) (/api/projects, /api/tasks)
- Tests: [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts)

### Communications Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 387–420)
- Storage: [server/storage.ts](../../server/storage.ts) (threads, messages)
- Routes: [server/routes.ts](../../server/routes.ts) (/api/threads, /api/messages)
- Tests: [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts)

### Revenue Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 530–700)
- Storage: [server/storage.ts](../../server/storage.ts) (invoices, bills, payments, vendors, invoiceSchedules)
- Routes: [server/routes.ts](../../server/routes.ts) (/api/invoices, /api/bills)
- Tests: [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts)

### Timeline Domain (Append-Only)
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 710–735)
- Storage: [server/storage.ts](../../server/storage.ts) (activityEvents)
- Routes: [server/routes.ts](../../server/routes.ts) (no dedicated endpoints; queried by engagement)
- Tests: TBD

### Files Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 422–445)
- Storage: [server/storage.ts](../../server/storage.ts) (fileObjects)
- Routes: [server/routes.ts](../../server/routes.ts) (no endpoints yet; TODO)
- Tests: TBD

### Portal Domain
- Schema: [shared/schema.ts](../../shared/schema.ts) (lines 785–800)
- Storage: [server/storage.ts](../../server/storage.ts) (clientPortalAccess)
- Routes: [server/routes.ts](../../server/routes.ts) (no endpoints yet; TODO)
- Tests: TBD

---

## 🏪 Frontend Component Mapping

| Component | File | Data Source | Displays Entity |
|-----------|------|-------------|-----------------|
| **App Header** | [client/src/components/app-header.tsx](../../client/src/components/app-header.tsx) | [use-auth.ts](../../client/src/hooks/use-auth.ts) | User + Org |
| **App Sidebar** | [client/src/components/app-sidebar.tsx](../../client/src/components/app-sidebar.tsx) | Route links | N/A |
| **Data Table** | [client/src/components/data-table.tsx](../../client/src/components/data-table.tsx) | Props | Any entity |
| **Empty State** | [client/src/components/empty-state.tsx](../../client/src/components/empty-state.tsx) | Props | N/A |
| **Page Header** | [client/src/components/page-header.tsx](../../client/src/components/page-header.tsx) | Props | N/A |
| **Stat Card** | [client/src/components/stat-card.tsx](../../client/src/components/stat-card.tsx) | Props | N/A (metrics) |
| **Status Badge** | [client/src/components/status-badge.tsx](../../client/src/components/status-badge.tsx) | Props | Status enum values |
| **Theme Provider** | [client/src/components/theme-provider.tsx](../../client/src/components/theme-provider.tsx) | Context | N/A |
| **Theme Toggle** | [client/src/components/theme-toggle.tsx](../../client/src/components/theme-toggle.tsx) | LocalStorage | N/A |

---

## 🔄 Hook Mapping

| Hook | File | Purpose | Returns |
|------|------|---------|---------|
| **useAuth** | [client/src/hooks/use-auth.ts](../../client/src/hooks/use-auth.ts) | Get current user + org | { user, org, logout() } |
| **useToast** | [client/src/hooks/use-toast.ts](../../client/src/hooks/use-toast.ts) | Show toast notifications | { toast() } |
| **useMobile** | [client/src/hooks/use-mobile.tsx](../../client/src/hooks/use-mobile.tsx) | Detect mobile viewport | boolean |

---

## 📚 Documentation Folder Structure

```
docs/
├── data/                          # This folder
│   ├── README.md                  # Entry point
│   ├── 00_plan_intent/
│   │   ├── PLAN_SUMMARY.md        # Extracted from PLAN.md
│   │   └── TARGET_DATA_MODEL.md   # Target entities
│   ├── 10_current_state/
│   │   ├── CURRENT_STATE_OVERVIEW.md
│   │   ├── DATA_SOURCES.md        # Storage locations
│   │   ├── TENANCY_AND_ACCESS.md
│   │   ├── DATA_FLOWS.md
│   │   ├── AUDIT_LOGGING_AND_REDACTION.md
│   │   ├── RETENTION_AND_DELETION.md
│   │   └── BACKUPS_AND_RECOVERY.md
│   ├── 20_entities/
│   │   ├── ENTITY_INDEX.md        # Master list
│   │   ├── Engagement.md          # Example entity doc
│   │   └── [23 other entity docs]
│   ├── 30_interfaces/
│   │   ├── API_CONTRACTS.md       # HTTP endpoints
│   │   ├── EVENTS_AND_WEBHOOKS.md
│   │   └── FILES_AND_UPLOADS.md
│   └── 40_gaps_and_roadmap/
│       ├── GAP_ANALYSIS.md        # Current vs target
│       ├── MIGRATION_NOTES.md
│       └── EVIDENCE_MAP.md        # This file
├── ARCHITECTURE.md
├── DOMAIN_CONTRACTS.md
├── SECURITY.md
├── RUNBOOK.md
```

---

## 🎯 How to Use This Map

**Scenario 1: "I'm implementing soft deletes"**
- Start: [40_gaps_and_roadmap/GAP_ANALYSIS.md](GAP_ANALYSIS.md#1-soft-deletes-critical-for-compliance)
- Find code to change: [shared/schema.ts](../../shared/schema.ts), [server/storage.ts](../../server/storage.ts)
- Tests: [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts) as reference

**Scenario 2: "I'm adding a new entity type"**
- Start: [20_entities/ENTITY_INDEX.md](../20_entities/ENTITY_INDEX.md)
- Add schema: [shared/schema.ts](../../shared/schema.ts) (follow pattern of existing entity)
- Add storage: [server/storage.ts](../../server/storage.ts) (follow getEntity, createEntity, etc. pattern)
- Add routes: [server/routes.ts](../../server/routes.ts) (follow existing route pattern)
- Add tests: [tests/backend/api-routes.test.ts](../../tests/backend/api-routes.test.ts)

**Scenario 3: "I'm debugging data not flowing correctly"**
- Start: [30_interfaces/API_CONTRACTS.md](../30_interfaces/API_CONTRACTS.md) (confirm request/response format)
- Check storage: [server/storage.ts](../../server/storage.ts) (verify org scoping)
- Check routes: [server/routes.ts](../../server/routes.ts) (verify auth + scoping)
- Check tests: [tests/backend/](../../tests/backend/) (does this scenario have a test?)

**Scenario 4: "I need to understand the full deal→contract→engagement flow"**
- Start: [00_plan_intent/PLAN_SUMMARY.md](../00_plan_intent/PLAN_SUMMARY.md#-flagship-workflows-data-transformations) (flagship workflows)
- Entities: [20_entities/Deal.md](../20_entities/Deal.md), [Contract.md](../20_entities/Contract.md), [Engagement.md](../20_entities/Engagement.md)
- Routes: [30_interfaces/API_CONTRACTS.md](../30_interfaces/API_CONTRACTS.md) (endpoints for each)
- Code: [server/routes.ts](../../server/routes.ts) (trace the flow through handlers)

---

**Last updated**: 2025-02-04
