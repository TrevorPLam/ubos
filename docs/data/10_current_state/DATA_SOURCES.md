# Data Sources & Storage Locations

**Coverage**: Where all data lives, how it's stored, who owns it, and how it's accessed.

---

## 🗄️ Authoritative Data Stores

### Primary: PostgreSQL

**Purpose**: Relational data for all business entities  
**Connection**: [server/db.ts](../../server/db.ts)  
**Config**: `DATABASE_URL` environment variable  
**Tables**: 23 tables defined in [shared/schema.ts](../../shared/schema.ts)

**Access Patterns**:
- All reads/writes go through [server/storage.ts](../../server/storage.ts)
- Storage methods enforce `organizationId` scoping
- Drizzle ORM handles type safety + migrations (push-based)

**Initialization**:
```typescript
// From server/db.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
```

**Schema Management**:
- Definitions: [shared/schema.ts](../../shared/schema.ts) (Drizzle table definitions)
- Insert schemas: Generated via `createInsertSchema()` for Zod validation
- Migrations: ❓ UNKNOWN — no migration files in repo; likely using Drizzle push or manual SQL

**Backup & Recovery**:
- ❓ UNKNOWN — no backup strategy documented
- Assumed: Standard Postgres pg_dump or managed DB backup

---

## 🗂️ Object Storage (Planned)

**Type**: S3-compatible (MinIO local)  
**Purpose**: Store file blobs; keep DB references only  
**Status**: 🔴 **NOT IMPLEMENTED** (schema ready; no S3 client)

**What SHOULD be there**:
```typescript
// Expected but missing:
import AWS from 'aws-sdk';
const s3 = new AWS.S3({ ... });
```

**Integration Point**: [server/storage.ts](../../server/storage.ts)  
**Related table**: fileObjects (stores path, name, mimeType, size)  
**Missing functionality**:
- Upload handler → S3
- Presigned URL service
- Download handler
- Versioning
- Garbage collection (orphaned blobs)

---

## 🔴 Cache Layer (Planned, Not Implemented)

**Type**: Redis  
**Purpose**: Session store, rate limiting, query cache  
**Status**: 🔴 **NOT IMPLEMENTED**

**Expected usage**:
- Sessions: Store `userId → orgId` mapping with TTL
- Rate limiting: Counter per IP + user
- Query cache: Invalidate on writes (opt-in)

---

## 🔴 Job Queue (Planned, Not Implemented)

**Type**: Redis-backed queue (Bull, RabbitMQ, or similar)  
**Purpose**: Async jobs (email sync, ledger sync, outbox dispatch)  
**Status**: 🔴 **NOT IMPLEMENTED**

**Expected jobs**:
- Email sync (every 5min): Poll Gmail/Graph API, create threads/messages
- Ledger sync (daily): Push invoices/bills to QBO/Xero
- Outbox dispatch (every 1s): Process outbox table, emit events to subscribers
- Invoice reminder (daily): Draft overdue invoice reminders
- Bill approval routing: Route bills by rules

---

## 📊 Data Ownership & Governance

### By Domain

| Domain | Primary Tables | Owner | Mutations | Read-Only Refs |
|--------|---|---|---|---|
| **Identity** | organizations, users, organizationMembers | System/Auth | Routes (login/logout) | All other domains |
| **CRM** | clientCompanies, contacts, deals | Sales/CRM team | API routes + workflow | All other domains |
| **Projects** | projects, tasks, milestones, projectTemplates | Project mgmt | API routes + workflow | Files, communications, timeline |
| **Agreements** | proposals, contracts | Legal/Sales | API routes + workflow | Revenue, Projects, timeline |
| **Revenue** | invoices, invoiceSchedules, payments, bills, vendors | Finance/Accounting | API routes + workflow | CRM (client status), timeline |
| **Communications** | threads, messages | Communications | API routes + email sync | CRM, timeline |
| **Files** | fileObjects | Document mgmt | API routes + upload | Communications, projects, revenue |
| **Portal** | clientPortalAccess | Product/Portal | API routes + workflow | Communications |
| **Timeline** | activityEvents | System/Audit | Middleware + workflow | All domains (query only) |
| **Workflow** | (not yet) | System | Workflow engine | All domains |
| **Outbox** | (not yet) | System | Workflow + domain services | Workflow dispatcher |

### Golden Record (CRM)

- **Source of truth**: clientCompanies, contacts
- **Referenced by**: deals, proposals, contracts, engagements, invoices, threads, etc.
- **Rules**:
  - Only CRM domain can create/update contacts
  - Workflow can trigger contact creation (e.g., on appointment.booked)
  - All other domains DENORMALIZE `client_id` / `contact_id` for query performance
  - No cross-domain DB reads for contact data

---

## 🔍 Query Patterns & Performance

### High-Volume Queries (Expected)

| Query | Table | Key Index | Estimated Rows | Optimization |
|-------|-------|-----------|-----------------|---------------|
| List all tasks for project | tasks | `(project_id, status)` | 100–10K | Filter by status in WHERE |
| List all invoices for org | invoices | `(organization_id, status)` | 100–1M | Filter by status; paginate |
| List timeline for engagement | activityEvents | `(engagement_id, created_at DESC)` | 100–100K | Index on created_at; consider partitioning |
| Find all contacts for client | contacts | `(client_company_id)` | 1–100 | Simple FK lookup |
| Get all org members | organizationMembers | `(organization_id)` | 1–100 | Simple org filter |
| Search deals by stage | deals | `(organization_id, stage)` | 100–10K | Composite index |

### Pagination Expectations

- **Route handling**: ❓ NOT YET IMPLEMENTED (routes return all results)
- **Frontend handling**: React may filter/paginate in memory (scales poorly)
- **TODO**: Add limit/offset or cursor-based pagination to all list endpoints

---

## 🔐 Data Access Control

### Route-Level Enforcement

All routes require `requireAuth` middleware:
```typescript
// From server/routes.ts
const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
};
```

### Organization Scope Resolution

```typescript
// From server/routes.ts
async function getOrCreateOrg(userId: string): Promise<string> {
  let org = await storage.getUserOrganization(userId);
  if (!org) {
    org = await storage.createOrganization(
      { name: "Org", slug: `org-${randomUUID().substring(0, 8)}` },
      userId,
    );
  }
  return org.id;
}
```

**Process**:
1. Extract userId from cookie or header
2. Query `organizationMembers` to find user's org
3. If not found, auto-create org (simple onboarding)
4. Pass `orgId` to all storage methods

### Storage-Level Enforcement

Every storage method includes `organizationId` in WHERE clause:

**Example from server/storage.ts**:
```typescript
getClientCompanies(orgId: string): Promise<ClientCompany[]> {
  return db.query.clientCompanies.findMany({
    where: eq(clientCompanies.organizationId, orgId),
  });
}
```

**Invariant**: No storage method should accept data without validating `organizationId`.

---

## 🔗 Foreign Key Relationships & Cascades

### Direct FK References

| Child Table | Parent Table | Cascade Rule | Implication |
|-------------|--------------|--------------|-------------|
| contacts | organizations | CASCADE | Deleting org deletes all contacts |
| contacts | clientCompanies | CASCADE | Deleting client deletes all contacts |
| deals | organizations | CASCADE | Deleting org deletes all deals |
| deals | clientCompanies | SET NULL | Deleting client leaves orphaned deal |
| deals | contacts | SET NULL | Deleting contact leaves orphaned deal |
| proposals | organizations | CASCADE | Deleting org deletes all proposals |
| proposals | deals | SET NULL | Deleting deal leaves orphaned proposal |
| proposals | clientCompanies | SET NULL | Deleting client leaves orphaned proposal |
| proposals | contacts | SET NULL | Deleting contact leaves orphaned proposal |
| contracts | organizations | CASCADE | Deleting org deletes all contracts |
| contracts | proposals | SET NULL | Deleting proposal leaves orphaned contract |
| engagements | organizations | CASCADE | Deleting org deletes all engagements |
| engagements | contracts | SET NULL | Deleting contract leaves orphaned engagement |
| engagements | deals | SET NULL | Deleting deal leaves orphaned engagement |
| engagements | clientCompanies | SET NULL | Deleting client leaves orphaned engagement |
| projects | organizations | CASCADE | Deleting org deletes all projects |
| projects | engagements | CASCADE | Deleting engagement deletes all projects |
| tasks | organizations | CASCADE | Deleting org deletes all tasks |
| tasks | projects | CASCADE | Deleting project deletes all tasks |
| tasks | milestones | SET NULL | Deleting milestone leaves orphaned task |
| milestones | projects | CASCADE | Deleting project deletes all milestones |
| threads | organizations | CASCADE | Deleting org deletes all threads |
| threads | engagements | CASCADE | Deleting engagement deletes all threads |
| messages | threads | CASCADE | Deleting thread deletes all messages |
| fileObjects | organizations | CASCADE | Deleting org deletes all files |
| fileObjects | engagements | CASCADE | Deleting engagement deletes all files |
| invoiceSchedules | organizations | CASCADE | Deleting org deletes all schedules |
| invoiceSchedules | engagements | CASCADE | Deleting engagement deletes all schedules |
| invoiceSchedules | contracts | SET NULL | Deleting contract leaves orphaned schedule |
| invoices | organizations | CASCADE | Deleting org deletes all invoices |
| invoices | engagements | CASCADE | Deleting engagement deletes all invoices |
| invoices | schedules | SET NULL | Deleting schedule leaves orphaned invoice |
| invoices | clientCompanies | SET NULL | Deleting client leaves orphaned invoice |
| payments | invoices | CASCADE | Deleting invoice deletes all payments |
| bills | organizations | CASCADE | Deleting org deletes all bills |
| bills | engagements | SET NULL | Deleting engagement leaves orphaned bill |
| bills | vendors | SET NULL | Deleting vendor leaves orphaned bill |
| activityEvents | organizations | CASCADE | Deleting org deletes all events |
| activityEvents | engagements | CASCADE | Deleting engagement deletes all events (if scoped) |
| clientPortalAccess | organizations | CASCADE | Deleting org deletes all access |
| clientPortalAccess | engagements | CASCADE | Deleting engagement deletes all access |
| clientPortalAccess | contacts | CASCADE | Deleting contact deletes all access |

---

## 📈 Data Volume Assumptions

| Table | Initial | 1-Year | 5-Year | Notes |
|-------|---------|--------|--------|-------|
| organizations | 1–10 | 10–100 | 100–1K | One per tenant |
| users | 10 | 50–200 | 200–1K | Grows with customer base |
| clientCompanies | 100 | 1K–10K | 10K–100K | Depends on customer industry |
| contacts | 500 | 5K–50K | 50K–500K | 5–10 contacts per company |
| deals | 100 | 1K–10K | 10K–100K | Pipeline growth |
| proposals | 50 | 500–5K | 5K–50K | Some proposals not converted |
| contracts | 50 | 500–5K | 5K–50K | Active contracts |
| engagements | 50 | 500–5K | 5K–50K | One per active deal/contract |
| projects | 100 | 1K–10K | 10K–100K | Multiple per engagement |
| tasks | 1K | 10K–100K | 100K–1M | Many per project |
| invoices | 100 | 1K–10K | 10K–100K | Monthly volume × customers |
| activityEvents | 10K | 100K–1M | 1M–10M | Many per entity/month (partition candidate) |

---

## 🔄 Sync & Consistency Patterns (Current)

### No Eventual Consistency (Yet)

Currently, all data mutations are **synchronous**:
1. Route receives request
2. Validation passes
3. Storage method updates DB
4. Response sent immediately

**Issues**:
- No event-driven architecture yet (PLAN.md calls for outbox)
- No async job processing
- Manual activity event logging (not automatic)

### TODO: Outbox Pattern

Per PLAN.md, must implement:
1. All domain-state changes write to `outbox` table
2. Dispatcher job reads outbox every 1s
3. Dispatches to:
   - Workflow trigger rules
   - Event subscribers (email, ledger sync, etc.)
   - Activity event logger
4. Marks outbox row as processed
5. Dead-letter queue for failed events

---

## 🚨 Data Quality & Validation Rules (Current)

### Database Constraints
- **NOT NULL**: Enforced on mandatory fields (e.g., Deal.name, Invoice.amount)
- **UNIQUE**: Enforced on unique_id fields (e.g., organizations.slug, clientPortalAccess.accessToken)
- **FK**: Enforced on all foreign keys (cascade/set-null per definition)
- **ENUM**: Enforced on status/stage fields (pgEnum)

### Application-Level Validation
- **Zod schemas**: Generated for inserts, but not always used in routes
- **No explicit validation**: Routes accept JSON, assume valid, call storage
- **TODO**: Add route-level Zod validation for all endpoints

### Data Integrity Issues (Known)

| Issue | Table | Impact | TODO |
|-------|-------|--------|------|
| Orphaned tasks | tasks | Tasks belong to deleted projects | Implement CASCADE more widely |
| Orphaned messages | messages | Messages without thread | Ensure thread FK is NOT NULL |
| Orphaned invoices | invoices | Invoices without engagement | Ensure engagement FK is NOT NULL |
| Duplicate contacts | contacts | Multiple records for same person | Implement merge/dedup logic |
| Denorm client_id stale | projects, files, etc. | client_id doesn't match engagement.client_id | Add reconciliation job |

---

## 📊 Storage Layer Implementation Details

**File**: [server/storage.ts](../../server/storage.ts) (719 lines)  
**Interface**: `IStorage` (defines all methods)  
**Implementation**: Stateless functions using Drizzle ORM

**Key methods**:
- `getUser(id)`, `upsertUser(data)`, `getUserOrganization(userId)`
- `get*` methods for each entity (return array or single)
- `create*` methods for each entity
- `update*` methods for each entity (partial update)
- `delete*` methods for each entity (hard delete, no soft-delete logic)
- `createActivityEvent()` — append to timeline
- TBD: `createOutboxEvent()` — append to outbox (not yet)

**Org scoping pattern**:
```typescript
// All queries include organizationId filter
getDeals(orgId: string): Promise<Deal[]> {
  return db.query.deals.findMany({
    where: eq(deals.organizationId, orgId),
  });
}
```

---

## 🔐 Sensitive Data Storage Locations

| Data Type | Stored In | Access Control | Risk | TODO |
|-----------|-----------|-----------------|------|------|
| Passwords | `users.password` (UNKNOWN) | ❓ | HIGH | Use OAuth/OIDC; hash if stored |
| API keys | NOT STORED (stub) | — | LOW (not yet) | Use integration_token_vault + encryption |
| Signatures | contracts.signature_data | Storage layer only | MEDIUM | Consider external e-sign provider |
| Email content | threads.content (partial) | Storage layer | MEDIUM | Store in external email service |
| File content | S3 (stub) | ❓ | MEDIUM | Implement presigned URLs + ACLs |
| SSN/Tax ID | NOT YET | — | N/A | Encrypt if stored; prefer external service |
| Credit cards | NOT STORED (stub) | — | LOW | Use payment provider (Stripe) |

---

**Next**: See [ENTITY_INDEX.md](../20_entities/ENTITY_INDEX.md) for entity-by-entity breakdown, or [DATA_FLOWS.md](DATA_FLOWS.md) for read/write patterns.
