# Entity: Engagement

**Role**: Cross-domain hub; links Deal → Contract → Project → Invoice → Timeline  
**Domain**: Engagement (Hub)  
**Schema**: [shared/schema.ts](../../shared/schema.ts#L324-L354)  
**Storage**: [server/storage.ts](../../server/storage.ts)  
**Routes**: [server/routes.ts](../../server/routes.ts)  
**Validation**: [shared/schema.ts](../../shared/schema.ts#L824)

---

## 🎯 Purpose

**Engagement** is the central hub that connects multiple business domains:
- **Sales**: Links a Deal to its Contract (proposal → signed)
- **Projects**: Container for all Project work on the engagement
- **Revenue**: Container for all Invoices on the engagement
- **Communications**: Scope for Threads/Messages related to the engagement
- **Files**: Scope for FileObjects related to the engagement
- **Timeline**: Scope for ActivityEvents related to the engagement
- **Portal**: Scope for client access to engagement resources

**It represents a single business engagement with a client.**

---

## 📋 Full Schema

```typescript
export const engagements = pgTable(
  "engagements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    contractId: varchar("contract_id")
      .references(() => contracts.id, { onDelete: "set null" }),
    dealId: varchar("deal_id")
      .references(() => deals.id, { onDelete: "set null" }),
    clientCompanyId: varchar("client_company_id")
      .references(() => clientCompanies.id, { onDelete: "set null" }),
    contactId: varchar("contact_id")
      .references(() => contacts.id, { onDelete: "set null" }),
    ownerId: varchar("owner_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: engagementStatusEnum("status").default("active").notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    totalValue: decimal("total_value", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_engagements_org").on(table.organizationId),
    index("idx_engagements_client").on(table.clientCompanyId),
    index("idx_engagements_status").on(table.status),
  ],
);
```

---

## 🔑 Field Reference

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | VARCHAR (UUID) | ✅ | gen_random_uuid() | Primary key |
| `organizationId` | VARCHAR (UUID) | ✅ | — | FK → organizations; enforces tenant scoping |
| `contractId` | VARCHAR (UUID) | ❌ | NULL | FK → contracts; nullable (engagement can exist before signed contract) |
| `dealId` | VARCHAR (UUID) | ❌ | NULL | FK → deals; nullable (engagement may not link to a deal) |
| `clientCompanyId` | VARCHAR (UUID) | ❌ | NULL | FK → clientCompanies; denormalized for query efficiency |
| `contactId` | VARCHAR (UUID) | ❌ | NULL | FK → contacts; denormalized for query efficiency |
| `ownerId` | VARCHAR (255) | ✅ | — | User ID (string); not a FK; assigned via CRM |
| `name` | VARCHAR (255) | ✅ | — | Human-readable engagement name (e.g., "Acme Corp Project Q1") |
| `description` | TEXT | ❌ | NULL | Long-form details |
| `status` | ENUM | ✅ | "active" | active, on_hold, completed, cancelled |
| `startDate` | TIMESTAMP | ❌ | NULL | Project start date |
| `endDate` | TIMESTAMP | ❌ | NULL | Project expected end date |
| `totalValue` | DECIMAL(12,2) | ❌ | NULL | Total engagement value (contract value or estimated revenue) |
| `createdAt` | TIMESTAMP | ✅ | now() | Auto-set on insert |
| `updatedAt` | TIMESTAMP | ✅ | now() | Auto-set on update |

---

## 🔗 Foreign Keys & Relationships

### Inbound (Parent References)

| Parent | FK | Cascade Rule | Implication |
|--------|----|----|---|
| Organization | organizationId | CASCADE | Deleting org deletes all engagements |
| Contract | contractId | SET NULL | Deleting contract orphans engagement (can exist without contract) |
| Deal | dealId | SET NULL | Deleting deal orphans engagement (engagement is independent) |
| ClientCompany | clientCompanyId | SET NULL | Deleting client orphans engagement (data remains for reporting) |
| Contact | contactId | SET NULL | Deleting contact orphans engagement (data remains) |

### Outbound (Child References)

| Child | FK | Cascade Rule | Implication |
|-------|----|----|---|
| Project | engagement_id | CASCADE | Deleting engagement deletes all projects |
| Thread | engagement_id | CASCADE | Deleting engagement deletes all threads |
| Message | (via thread) | CASCADE | Deleting engagement deletes all messages |
| Invoice | engagement_id | CASCADE | Deleting engagement deletes all invoices |
| InvoiceSchedule | engagement_id | CASCADE | Deleting engagement deletes all schedules |
| FileObject | engagement_id | CASCADE | Deleting engagement deletes all files |
| ActivityEvent | engagement_id | CASCADE | Deleting engagement deletes all timeline events |
| ClientPortalAccess | engagement_id | CASCADE | Deleting engagement deletes all portal access |

---

## 📊 Enums & State Machine

### Status Enum

```typescript
export const engagementStatusEnum = pgEnum("engagement_status", [
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);
```

**State Transitions**:
```
active ──→ on_hold ──→ active
  ↓          ↓
  └────→ completed
  ↓
  └────→ cancelled (from any state)
```

**Semantics**:
- **active**: Engagement is ongoing; invoices can be issued, tasks assigned, etc.
- **on_hold**: Temporarily paused; no new work scheduled, but not completed
- **completed**: Engagement finished successfully; no new invoices or tasks
- **cancelled**: Engagement terminated; data retained for audit

---

## 🔐 Validation Schema (Zod)

```typescript
export const insertEngagementSchema = createInsertSchema(engagements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Inferred type:
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
// = {
//   organizationId: string;
//   contractId?: string | null;
//   dealId?: string | null;
//   clientCompanyId?: string | null;
//   contactId?: string | null;
//   ownerId: string;
//   name: string;
//   description?: string | null;
//   status?: "active" | "on_hold" | "completed" | "cancelled";
//   startDate?: Date | null;
//   endDate?: Date | null;
//   totalValue?: Decimal | null;
// }
```

### Custom Validations (Currently Not Enforced; TODO)
- ❓ `startDate` should not be in the past
- ❓ `endDate` >= `startDate`
- ❓ `name` should be non-empty
- ❓ `status` transition should be valid (e.g., can't go from completed → active)

---

## 🏪 Storage Layer Interface

**File**: [server/storage.ts](../../server/storage.ts)

```typescript
// Read operations
getEngagements(orgId: string): Promise<Engagement[]>;
getEngagement(id: string, orgId: string): Promise<Engagement | undefined>;

// Create
createEngagement(data: InsertEngagement): Promise<Engagement>;

// Update
updateEngagement(
  id: string,
  orgId: string,
  data: Partial<InsertEngagement>,
): Promise<Engagement | undefined>;

// Delete (hard delete)
deleteEngagement(id: string, orgId: string): Promise<boolean>;
```

**Org Scoping Enforced**:
```typescript
getEngagements(orgId: string) {
  return db.query.engagements.findMany({
    where: eq(engagements.organizationId, orgId),
  });
}
```

---

## 🌐 API Routes

**File**: [server/routes.ts](../../server/routes.ts)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/engagements` | list | Fetch all engagements for org (no pagination yet) |
| POST | `/api/engagements` | create | Create new engagement |
| GET | `/api/engagements/:id` | fetch | Fetch single engagement |
| PUT | `/api/engagements/:id` | update | Update engagement (name, status, dates, etc.) |
| DELETE | `/api/engagements/:id` | delete | Hard delete engagement (cascades to projects, invoices, etc.) |

### Example Request (Create)

```http
POST /api/engagements
Content-Type: application/json

{
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "contractId": "660e8400-e29b-41d4-a716-446655440001",
  "dealId": "770e8400-e29b-41d4-a716-446655440002",
  "clientCompanyId": "880e8400-e29b-41d4-a716-446655440003",
  "contactId": "990e8400-e29b-41d4-a716-446655440004",
  "ownerId": "alice-user-id",
  "name": "Acme Corp Q1 2025 Project",
  "description": "Full digital transformation engagement",
  "status": "active",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-03-31T00:00:00Z",
  "totalValue": "50000.00"
}
```

### Example Response

```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "contractId": "660e8400-e29b-41d4-a716-446655440001",
  "dealId": "770e8400-e29b-41d4-a716-446655440002",
  "clientCompanyId": "880e8400-e29b-41d4-a716-446655440003",
  "contactId": "990e8400-e29b-41d4-a716-446655440004",
  "ownerId": "alice-user-id",
  "name": "Acme Corp Q1 2025 Project",
  "description": "Full digital transformation engagement",
  "status": "active",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-03-31T00:00:00Z",
  "totalValue": "50000.00",
  "createdAt": "2025-02-04T10:30:00Z",
  "updatedAt": "2025-02-04T10:30:00Z"
}
```

---

## 📊 Sample Data

### Scenario 1: Contract Signed, Project Active

```json
{
  "id": "eng-001",
  "organizationId": "org-acme",
  "contractId": "con-001",
  "dealId": "deal-001",
  "clientCompanyId": "client-acme",
  "contactId": "contact-bob",
  "ownerId": "user-alice",
  "name": "Acme Corp Digital Transformation",
  "status": "active",
  "startDate": "2025-01-15",
  "endDate": "2025-06-30",
  "totalValue": "150000.00",
  "createdAt": "2025-01-10",
  "updatedAt": "2025-01-15"
}
```

**Child entities created automatically**:
- Projects (via create engagement flow)
- InvoiceSchedule (milestone-based invoicing)
- Thread (engagement-level discussion)
- ClientPortalAccess (for contact access)

---

## 🔄 Lifecycle & Workflows

### Creation

**Trigger**: Proposal accepted → Contract signed  
**Process**:
1. Contract reaches "signed" status
2. System creates Engagement (manually via route or auto via workflow)
3. Engagement links contract + deal + client + contact
4. Engagement.startDate set to now() or contract.startDate
5. Engagement.endDate set to contract.endDate (if available)
6. Engagement.status = "active"

**Related Events**:
- `ContractSigned` event published
- ProjectTemplate may auto-create Project
- InvoiceSchedule may auto-create based on contract terms
- ClientPortalAccess may auto-create for primary contact

### Update

**Common transitions**:
- **active → on_hold**: Client requests pause (keep date; no new invoices)
- **on_hold → active**: Resume work
- **active → completed**: Engagement finished; final invoices issued
- **active → cancelled**: Engagement terminated early

**Manual updates**:
- Status (via CRM UI or workflow)
- Name, description, totalValue (manual data entry)
- StartDate, endDate (reschedule if needed)
- Owner (reassign to different account manager)

### Deletion

**Hard delete** (cascades):
- All Projects deleted
- All Tasks deleted
- All Invoices deleted (AR data lost! use soft-delete in prod)
- All Threads/Messages deleted (comms lost!)
- All Files deleted
- All ActivityEvents deleted (audit trail lost!)

**⚠️ TODO**: Implement soft-delete (add `deleted_at` column) to preserve data for compliance.

---

## 📈 Query Patterns

### High-Volume Queries
| Query | Index | Expected Rows |
|-------|-------|---|
| All active engagements | `(organization_id, status)` | 100–1K |
| All engagements for a client | `(client_company_id)` | 1–10 |
| Engagements with active projects | `(status)` + JOIN | 100–1K |
| Timeline for engagement | `(engagement_id, created_at)` on activityEvents | 100–10K |

### Denormalization Notes
- **clientCompanyId** and **contactId** stored to avoid expensive JOINs when filtering by client
- **ownerId** stored as string (no FK) to avoid forcing user table schema changes

---

## 🔐 Audit & Security

### Logged Activities
- ✅ Created (auto-logged via timestamp)
- ✅ Updated (auto-logged via timestamp, check diffs)
- ✅ Deleted (hard-deleted; no audit trail unless using soft-delete)
- ❓ Status changes (should log to activityEvents)
- ❓ Access by client (should log portal access)

### Sensitive Fields
- None typically sensitive
- If engagement.totalValue is secret, may need to redact in logs

### Tenant Isolation
- All queries enforced by `organizationId` filter
- No cross-org data visibility possible

---

## 🚀 Data Model Evolution (Per PLAN.md)

### MVP (Current)
- ✅ Basic engagement CRUD
- ✅ Status enum
- ❓ Manual creation (not auto-triggered by workflow yet)

### Stage 1 (Target)
- Auto-creation on contract signed
- Status transition validation
- Soft-delete support
- Activity event auto-logging

### Stage 2 (Future)
- Engagement templates (auto-create project structure)
- Multi-contract engagements
- Engagement health dashboard (invoice overdue, tasks overdue)
- Custom engagement fields (JSONB)

---

## 🔗 Related Entities

| Entity | Relationship | Via | Purpose |
|--------|---------|------|---------|
| Deal | 1:1 | dealId | Source of engagement; pipeline tracking |
| Contract | 1:1 | contractId | Legal agreement; engagement activator |
| ClientCompany | M:1 | clientCompanyId | Golden record; billing, portfolio tracking |
| Contact | M:1 | contactId | Primary contact; communication hub |
| Project | 1:M | engagementId (FK) | Work container; deliverables |
| InvoiceSchedule | 1:M | engagementId (FK) | Recurring billing template |
| Invoice | 1:M | engagementId (FK) | AR; billing records |
| Thread | 1:M | engagementId (FK) | Communications |
| FileObject | 1:M | engagementId (FK) | Documents, uploads |
| ActivityEvent | 1:M | engagementId (FK) | Timeline; audit |
| ClientPortalAccess | 1:M | engagementId (FK) | Client access tokens |

---

## 📋 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Creation** | Manual API | Manual API + auto-trigger on contract signed |
| **Status transitions** | Free-form (no validation) | State machine validation |
| **Soft delete** | ❌ Hard delete only | ✅ Add `deleted_at` + soft-delete logic |
| **Activity logging** | Manual (not done) | Auto-logged on all state changes |
| **Client portal** | Schema only | ✅ Portal UI + access management |
| **Multi-contract** | Not supported | ✅ Allow multiple contracts per engagement |
| **Custom fields** | None | ✅ JSONB for custom data |

---

**See also**: [Project.md](Project.md), [Invoice.md](Invoice.md), [Deal.md](Deal.md), [Contract.md](Contract.md)
