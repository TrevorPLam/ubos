# Entity: Deal

**Role**: Sales pipeline; opportunity tracking  
**Domain**: Sales  
**Schema**: [shared/schema.ts](/shared/schema.ts#L202-L240)  
**Storage**: [server/storage.ts](/server/storage.ts)  
**Routes**: [server/routes.ts](/server/routes.ts)

---

## 🎯 Purpose

**Deal** represents a sales opportunity in the pipeline. It tracks:
- Which client/contact is involved
- Sales stage (lead → won/lost)
- Expected value and close date
- Owner (account manager)
- Links to proposals and contracts

It's the source of truth for **sales pipeline reporting**.

---

## 📋 Full Schema

```typescript
export const deals = pgTable(
  "deals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    clientCompanyId: varchar("client_company_id")
      .references(() => clientCompanies.id, { onDelete: "set null" }),
    contactId: varchar("contact_id")
      .references(() => contacts.id, { onDelete: "set null" }),
    ownerId: varchar("owner_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    value: decimal("value", { precision: 12, scale: 2 }),
    stage: dealStageEnum("stage").default("lead").notNull(),
    probability: integer("probability").default(0),
    expectedCloseDate: timestamp("expected_close_date"),
    closedAt: timestamp("closed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_deals_org").on(table.organizationId),
    index("idx_deals_stage").on(table.stage),
    index("idx_deals_client").on(table.clientCompanyId),
  ],
);
```

---

## 🔑 Field Reference

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | VARCHAR (UUID) | ✅ | gen_random_uuid() | Primary key |
| `organizationId` | VARCHAR (UUID) | ✅ | — | FK → organizations; tenant scoping |
| `clientCompanyId` | VARCHAR (UUID) | ❌ | NULL | FK → clientCompanies; golden record ref |
| `contactId` | VARCHAR (UUID) | ❌ | NULL | FK → contacts; golden record ref |
| `ownerId` | VARCHAR (255) | ✅ | — | User ID (string); account manager |
| `name` | VARCHAR (255) | ✅ | — | Deal name (e.g., "Acme Enterprise Transformation") |
| `description` | TEXT | ❌ | NULL | Long-form deal details |
| `value` | DECIMAL(12,2) | ❌ | NULL | Expected deal value (ARR or one-time) |
| `stage` | ENUM | ✅ | "lead" | Sales pipeline stage (see enum below) |
| `probability` | INTEGER | ✅ | 0 | Win probability 0–100% |
| `expectedCloseDate` | TIMESTAMP | ❌ | NULL | Expected close date |
| `closedAt` | TIMESTAMP | ❌ | NULL | Actual close date (only set when stage = won/lost) |
| `notes` | TEXT | ❌ | NULL | Internal notes |
| `createdAt` | TIMESTAMP | ✅ | now() | Auto-set on insert |
| `updatedAt` | TIMESTAMP | ✅ | now() | Auto-set on update |

---

## 📊 Stage Enum & State Machine

```typescript
export const dealStageEnum = pgEnum("deal_stage", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);
```

**State Transitions**:
```
lead ──→ qualified ──→ proposal ──→ negotiation ──→ won
  ↓
  └────→ lost (can revert from any stage)
```

**Semantics**:
- **lead**: Initial contact; no qualification yet
- **qualified**: Prospect meets ideal customer profile; budget confirmed
- **proposal**: Formal proposal sent; awaiting response
- **negotiation**: Terms being discussed; deal likely to close
- **won**: Contract signed; deal closed
- **lost**: Prospect declined; deal closed

**Workflow notes**:
- Cannot go directly from lead → won (must progress through stages)
- Can revert from any stage back to lead/lost (re-open deal)
- Only move to "won" when contract is signed
- When moved to "won", create Engagement automatically (TODO)

---

## 🔗 Relationships

### Inbound
| Parent | FK | Cascade | Notes |
|--------|----|----|---|
| Organization | organizationId | CASCADE | Deleting org deletes all deals |
| ClientCompany | clientCompanyId | SET NULL | Deal orphaned if client deleted |
| Contact | contactId | SET NULL | Deal orphaned if contact deleted |

### Outbound
| Child | FK | Cascade | Notes |
|-------|----|----|---|
| Proposal | deal_id | SET NULL | Proposals remain if deal deleted |
| Contract | deal_id | SET NULL | Contracts remain if deal deleted |
| Engagement | deal_id | SET NULL | Engagement remains if deal deleted |

---

## 📈 Typical Deal Lifecycle

### Example: Acme Enterprise Deal

**Week 1: Lead**
```json
{
  "id": "deal-001",
  "organizationId": "org-acme",
  "clientCompanyId": "client-acme",
  "contactId": "contact-john",
  "ownerId": "user-alice",
  "name": "Acme Enterprise Digital Transformation",
  "stage": "lead",
  "value": "250000.00",
  "probability": 20,
  "expectedCloseDate": "2025-06-30",
  "closedAt": null,
  "notes": "Initial discovery call scheduled"
}
```

**Week 3: Qualified**
```json
{
  // ... same fields ...
  "stage": "qualified",
  "probability": 50,
  "notes": "Confirmed budget, 3 stakeholders engaged, 3-month timeline"
}
```

**Week 4: Proposal**
```json
{
  // ... same fields ...
  "stage": "proposal",
  "probability": 70,
  "notes": "Proposal sent on 2025-02-04, awaiting feedback"
}
```

**Week 5: Negotiation**
```json
{
  // ... same fields ...
  "stage": "negotiation",
  "probability": 85,
  "notes": "Negotiating payment terms (quarterly vs monthly billing)"
}
```

**Week 6: Won**
```json
{
  // ... same fields ...
  "stage": "won",
  "probability": 100,
  "closedAt": "2025-02-28T00:00:00Z",
  "notes": "Contract signed; engagement created"
}
```

---

## 🏪 Storage Methods

**File**: [server/storage.ts](/server/storage.ts)

```typescript
getDeals(orgId: string): Promise<Deal[]>;
getDeal(id: string, orgId: string): Promise<Deal | undefined>;
createDeal(data: InsertDeal): Promise<Deal>;
updateDeal(id: string, orgId: string, data: Partial<InsertDeal>): Promise<Deal | undefined>;
deleteDeal(id: string, orgId: string): Promise<boolean>;
```

---

## 🌐 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/deals` | List all deals for org (filtered by stage TODO) |
| POST | `/api/deals` | Create new deal |
| GET | `/api/deals/:id` | Fetch single deal |
| PUT | `/api/deals/:id` | Update deal (stage, value, notes, etc.) |
| DELETE | `/api/deals/:id` | Hard delete (TODO: soft delete) |

**Example**: Update deal stage
```http
PUT /api/deals/deal-001
Content-Type: application/json

{
  "stage": "proposal",
  "probability": 70,
  "updatedAt": "2025-02-04T10:00:00Z"
}
```

---

## 🔐 Audit & Workflow

### Auto-Triggered Events (TODO)
- When stage moves to "won": Create Engagement (if not exists)
- When stage moves to "lost": Archive engagement (if active)
- When value changes significantly: Log activity event

### Manual Logging (Current)
- Currently, no automatic activity logging
- TODO: Wire activityEvents to track stage transitions

---

## 📊 Query Patterns

| Query | Index | Rows | Notes |
|-------|-------|------|-------|
| All deals for org | (organization_id) | 100–10K | Unfiltered (could be slow) |
| Deals in stage "negotiation" | (organization_id, stage) | 10–100 | Filter for sales dashboard |
| Deals for a client | (client_company_id) | 1–10 | Often queried together with client |
| Deals owned by user | ownerId (string, not indexed) | 10–100 | TODO: Add index |

---

## 🔄 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Creation** | Manual API | Manual API + import (CSV/Zapier) |
| **Stage transitions** | Free-form (no validation) | State machine validation |
| **Auto-engagement creation** | Manual | Auto-create on stage = "won" |
| **Win probability** | Manual input | AI-suggested based on deal age + stage |
| **Soft delete** | ❌ Hard delete | ✅ Add deleted_at |
| **Activity logging** | Manual (not done) | Auto-logged on all updates |
| **Deal versioning** | None | Track amendments (FUTURE) |
| **Forecasting** | Not built | Weighted revenue forecast (FUTURE) |

---

**See also**: [Proposal.md](Proposal.md), [Contract.md](Contract.md), [Engagement.md](Engagement.md)
