# Entity: Invoice

**Role**: Accounts receivable; billing records  
**Domain**: Revenue  
**Schema**: [shared/schema.ts](/shared/schema.ts#L530-L575)  
**Storage**: [server/storage.ts](/server/storage.ts)  
**Routes**: [server/routes.ts](/server/routes.ts)

---

## 🎯 Purpose

**Invoice** represents a bill sent to a client for work completed. It tracks:
- What work/items are being billed
- Amount, tax, and total due
- Payment status and dates
- Link to engagement and client
- Recurring invoices via InvoiceSchedule

Core to **revenue recognition and cash flow**.

---

## 📋 Full Schema

```typescript
export const invoices = pgTable(
  "invoices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    engagementId: varchar("engagement_id")
      .references(() => engagements.id, { onDelete: "cascade" })
      .notNull(),
    scheduleId: varchar("schedule_id")
      .references(() => invoiceSchedules.id, { onDelete: "set null" }),
    clientCompanyId: varchar("client_company_id")
      .references(() => clientCompanies.id, { onDelete: "set null" }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    lineItems: jsonb("line_items"),
    dueDate: timestamp("due_date"),
    sentAt: timestamp("sent_at"),
    paidAt: timestamp("paid_at"),
    paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_invoices_org").on(table.organizationId),
    index("idx_invoices_engagement").on(table.engagementId),
    index("idx_invoices_status").on(table.status),
  ],
);
```

---

## 🔑 Field Reference

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | VARCHAR (UUID) | ✅ | gen_random_uuid() | Primary key |
| `organizationId` | VARCHAR (UUID) | ✅ | — | FK → organizations; tenant scoping |
| `engagementId` | VARCHAR (UUID) | ✅ | — | FK → engagements; required (invoice must belong to engagement) |
| `scheduleId` | VARCHAR (UUID) | ❌ | NULL | FK → invoiceSchedules; nullable (invoice can exist without schedule) |
| `clientCompanyId` | VARCHAR (UUID) | ❌ | NULL | FK → clientCompanies; denormalized for query efficiency |
| `invoiceNumber` | VARCHAR (50) | ✅ | — | Human-readable invoice ID (e.g., "INV-2025-001") |
| `status` | ENUM | ✅ | "draft" | draft, sent, viewed, paid, overdue, cancelled |
| `amount` | DECIMAL(12,2) | ✅ | — | Subtotal before tax |
| `tax` | DECIMAL(12,2) | ✅ | 0 | Tax amount |
| `totalAmount` | DECIMAL(12,2) | ✅ | — | amount + tax |
| `lineItems` | JSONB | ❌ | NULL | Array of {description, qty, unitPrice, amount} |
| `dueDate` | TIMESTAMP | ❌ | NULL | When payment is due |
| `sentAt` | TIMESTAMP | ❌ | NULL | When sent to client |
| `paidAt` | TIMESTAMP | ❌ | NULL | When payment received |
| `paidAmount` | DECIMAL(12,2) | ❌ | NULL | Amount actually paid (may differ from total) |
| `notes` | TEXT | ❌ | NULL | Internal notes or payment terms |
| `createdAt` | TIMESTAMP | ✅ | now() | Auto-set on insert |
| `updatedAt` | TIMESTAMP | ✅ | now() | Auto-set on update |

---

## 📊 Status Enum & State Machine

```typescript
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
]);
```

**State Transitions**:
```
draft → sent → viewed → paid
              ↓
           overdue (if dueDate passed)
              ↓
            (paid)

(any state) → cancelled
```

**Semantics**:
- **draft**: Unsent; can be edited
- **sent**: Sent to client; awaiting payment
- **viewed**: Client has opened invoice (tracked by webhook or manual mark)
- **paid**: Payment received
- **overdue**: Past due date; still unpaid
- **cancelled**: Invoice voided (credit memo issued)

---

## 🔗 Relationships

### Inbound
| Parent | FK | Cascade |
|--------|----|----|
| Organization | organizationId | CASCADE |
| Engagement | engagementId | CASCADE |
| InvoiceSchedule | scheduleId | SET NULL |
| ClientCompany | clientCompanyId | SET NULL |

### Outbound
| Child | FK | Cascade |
|-------|----|----|
| Payment | invoice_id | CASCADE |

---

## 📈 Typical Invoice Lifecycle

### Draft
```json
{
  "id": "inv-001",
  "organizationId": "org-001",
  "engagementId": "eng-001",
  "scheduleId": "sched-001",
  "clientCompanyId": "client-001",
  "invoiceNumber": "INV-2025-001",
  "status": "draft",
  "amount": "10000.00",
  "tax": "800.00",
  "totalAmount": "10800.00",
  "lineItems": [
    { "description": "Consulting - 40 hours", "qty": 40, "unitPrice": "250.00", "amount": "10000.00" }
  ],
  "dueDate": "2025-03-15",
  "sentAt": null,
  "paidAt": null,
  "createdAt": "2025-02-01"
}
```

### Sent
```json
{
  // ... same ...
  "status": "sent",
  "sentAt": "2025-02-01T15:30:00Z"
}
```

### Paid
```json
{
  // ... same ...
  "status": "paid",
  "paidAt": "2025-03-10T09:45:00Z",
  "paidAmount": "10800.00"
}
```

---

## 💰 Line Items (JSONB)

**Schema** (not yet validated):
```json
[
  {
    "description": "Consulting - 40 hours",
    "quantity": 40,
    "unitPrice": "250.00",
    "amount": "10000.00"
  },
  {
    "description": "Expenses",
    "quantity": 1,
    "unitPrice": "250.00",
    "amount": "250.00"
  }
]
```

**TODO**: Define Zod schema for line items; add validation

---

## 🏪 Storage Methods

```typescript
getInvoices(orgId: string): Promise<Invoice[]>;
getInvoice(id: string, orgId: string): Promise<Invoice | undefined>;
createInvoice(data: InsertInvoice): Promise<Invoice>;
updateInvoice(id: string, orgId: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
deleteInvoice(id: string, orgId: string): Promise<boolean>;
```

---

## 🌐 API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/invoices` | List all invoices for org |
| POST | `/api/invoices` | Create new invoice |
| GET | `/api/invoices/:id` | Fetch single invoice |
| PUT | `/api/invoices/:id` | Update invoice |
| DELETE | `/api/invoices/:id` | Hard delete (TODO: soft delete) |

---

## 📋 Validation Schema

```typescript
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Custom validations (TODO):
// - totalAmount === amount + tax
// - dueDate in future
// - lineItems is valid array
// - status transitions are valid
```

---

## 🔐 Audit & Workflow

### Auto-Triggered Events (TODO)
- When status → "sent": Create activity event + notify client
- When status → "paid": Update engagement status, notify account manager
- When status → "overdue": Create reminder task, log activity

### Payment Reconciliation (TODO)
- Match received payment to invoice
- Handle partial payments (paidAmount < totalAmount)
- Create credit memos for overpayments

---

## 📊 Query Patterns

| Query | Index | Rows |
|-------|-------|------|
| All invoices for org | (organization_id) | 100–1M |
| Invoices by status | (organization_id, status) | 10–1M (varies by status) |
| Overdue invoices | (status) + WHERE dueDate < now() | 0–100 |
| Invoices for engagement | (engagement_id) | 1–100 |
| Unpaid invoices | (status) | 100–10K |

---

## 💡 Financial Calculations

### Aging Report (TODO)
```typescript
function getInvoiceAging(invoices: Invoice[]): {
  current: decimal;    // 0-30 days
  thirtyPlus: decimal; // 31-60 days
  sixtyPlus: decimal;  // 61-90 days
  ninetyPlus: decimal; // 90+ days
} {
  // Group invoices by days overdue
  // Sum totalAmount for each bucket
}
```

### Revenue Recognition (TODO)
- Draft: Not recognized
- Sent: Recognized (ASC 606)
- Paid: Marked as realized

---

## 🔄 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Creation** | Manual API | Manual API + auto-create from schedule |
| **Status transitions** | Free-form | State machine validation |
| **Line items** | JSONB (no schema) | Zod-validated array |
| **Recurring** | InvoiceSchedule exists | Auto-generate from schedule |
| **Soft delete** | ❌ Hard delete | ✅ Add deleted_at |
| **Activity logging** | Manual | Auto-log on all changes |
| **Email notification** | ❌ | ✅ Send when status changes |
| **Payment matching** | ❌ | ✅ Reconcile payments to invoice |
| **Ledger sync** | Stub only | ✅ Push to QBO/Xero |
| **Tax calculation** | Manual | Integrate with tax service |

---

**See also**: [InvoiceSchedule.md](InvoiceSchedule.md), [Payment.md](Payment.md), [Engagement.md](Engagement.md)
