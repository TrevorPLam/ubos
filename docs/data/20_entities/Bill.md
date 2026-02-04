# Entity: Bill

**Role**: Vendor invoice received; accounts payable  
**Domain**: Revenue (Accounts Payable)  
**Schema**: [shared/schema.ts](../../shared/schema.ts#L684-L721)  
**Storage**: [server/storage.ts](../../server/storage.ts)  
**Routes**: [server/routes.ts](../../server/routes.ts)

---

## 🎯 Purpose

**Bill** represents an accounts payable document—an invoice from a vendor/supplier that must be paid. It tracks:
- Vendor who issued the bill
- Line items and amounts owed
- Payment status (unpaid → paid)
- Due date and payment date
- Relation to projects (if billable to specific project)

Mirror of **Invoice** (which is customer receivable); core to **cash outflow management**.

---

## 📋 Full Schema

```typescript
export const bills = pgTable(
  "bills",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    vendorId: varchar("vendor_id")
      .references(() => vendors.id, { onDelete: "restrict" })
      .notNull(),
    projectId: varchar("project_id")
      .references(() => projects.id, { onDelete: "set null" }),
    billNumber: varchar("bill_number", { length: 50 }).notNull(),
    issueDate: timestamp("issue_date").notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidDate: timestamp("paid_date"),
    status: billStatusEnum("status").default("unpaid").notNull(),
    amount: numeric("amount", { precision: 19, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 19, scale: 2 }).default("0"),
    discount: numeric("discount", { precision: 19, scale: 2 }).default("0"),
    notes: text("notes"),
    lineItems: json("line_items").$type<BillLineItem[]>(),
    attachments: json("attachments").$type<Attachment[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bills_vendor").on(table.vendorId),
    index("idx_bills_project").on(table.projectId),
    index("idx_bills_status").on(table.status),
    index("idx_bills_due_date").on(table.dueDate),
  ],
);
```

---

## 🔑 Field Reference

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | VARCHAR (UUID) | ✅ | gen_random_uuid() | Primary key |
| `organizationId` | VARCHAR (UUID) | ✅ | — | FK → organizations; tenant scoping |
| `vendorId` | VARCHAR (UUID) | ✅ | — | FK → vendors; who issued this bill |
| `projectId` | VARCHAR (UUID) | ❌ | NULL | FK → projects; optional (bill may not tie to project) |
| `billNumber` | VARCHAR (50) | ✅ | — | Vendor's bill ID (e.g., "INV-2025-001234") |
| `issueDate` | TIMESTAMP | ✅ | — | When vendor issued bill |
| `dueDate` | TIMESTAMP | ✅ | — | When payment is due |
| `paidDate` | TIMESTAMP | ❌ | NULL | When bill was paid (null if unpaid) |
| `status` | ENUM | ✅ | "unpaid" | unpaid, overdue, paid, disputed, cancelled |
| `amount` | NUMERIC(19,2) | ✅ | — | Total amount due (before tax + discount) |
| `tax` | NUMERIC(19,2) | ✅ | 0 | Tax amount (added to amount) |
| `discount` | NUMERIC(19,2) | ✅ | 0 | Discount (subtracted from amount) |
| `notes` | TEXT | ❌ | NULL | Internal notes (payment terms, special instructions) |
| `lineItems` | JSON | ❌ | NULL | Array of {itemName, quantity, unitPrice, amount, description} |
| `attachments` | JSON | ❌ | NULL | Array of {fileId, fileName, url, uploadedAt} |
| `createdAt` | TIMESTAMP | ✅ | now() | Auto-set on insert |
| `updatedAt` | TIMESTAMP | ✅ | now() | Auto-set on update |

---

## 📊 Enums & State Machines

### Status Enum
```typescript
export const billStatusEnum = pgEnum("bill_status", [
  "unpaid",
  "overdue",
  "paid",
  "disputed",
  "cancelled",
]);
```

**State Transitions**:
```
unpaid ──→ overdue ──→ paid
  ↓
(disputed) ← ← ← ← (from unpaid)
  ↓
(cancelled) ← ← ← ← (from any state)
```

**Semantics**:
- **unpaid**: Received and awaiting payment; due date not yet passed
- **overdue**: Due date has passed; payment is late
- **paid**: Payment completed and matched to bill
- **disputed**: Vendor and company disagree on amount; under negotiation
- **cancelled**: Bill void or determined not payable

### Line Item Schema
```typescript
interface BillLineItem {
  id: string; // UUID
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number; // = quantity × unitPrice
  category?: string; // e.g., "Materials", "Labor", "Consulting"
  projectId?: string; // Which project this line item relates to
}
```

---

## 🔗 Relationships

### Inbound
| Parent | FK | Cascade |
|--------|----|----|
| Organization | organizationId | CASCADE |
| Vendor | vendorId | RESTRICT (can't delete vendor with unpaid bills) |
| Project | projectId | SET NULL |

### Outbound
| Child | FK | Notes |
|-------|----|----|
| Payment | bill_id | Records actual payment (1:N, one bill, multiple payments) |
| ActivityEvent | bill_id | Timeline entries (marked paid, disputed, etc.) |

---

## 📈 Typical Bill Lifecycle

### New Bill (Unpaid)
```json
{
  "id": "bill-001",
  "organizationId": "org-001",
  "vendorId": "vendor-acme",
  "projectId": "project-website",
  "billNumber": "INV-2025-001234",
  "issueDate": "2025-02-01T00:00:00Z",
  "dueDate": "2025-03-01T00:00:00Z",
  "paidDate": null,
  "status": "unpaid",
  "amount": 5000.00,
  "tax": 400.00,
  "discount": 100.00,
  "notes": "Net 30 terms; contact john@acme.com for questions",
  "lineItems": [
    {
      "id": "li-001",
      "itemName": "Web Design Services",
      "quantity": 40,
      "unitPrice": 125.00,
      "amount": 5000.00,
      "category": "Consulting"
    }
  ],
  "attachments": [
    {
      "fileId": "file-001",
      "fileName": "INV-2025-001234.pdf",
      "url": "https://s3.example.com/bills/INV-2025-001234.pdf",
      "uploadedAt": "2025-02-01T09:00:00Z"
    }
  ],
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-02-01T09:00:00Z"
}
```

### Bill Overdue (Due date passed)
```json
{
  // ... same ...
  "status": "overdue",
  "updatedAt": "2025-03-02T00:00:00Z"
}
```

### Bill Paid
```json
{
  // ... same ...
  "status": "paid",
  "paidDate": "2025-02-28T14:30:00Z",
  "updatedAt": "2025-02-28T14:30:00Z"
}
```

### Disputed
```json
{
  // ... same ...
  "status": "disputed",
  "notes": "Vendor double-billed; negotiating refund of $2500",
  "updatedAt": "2025-02-20T11:00:00Z"
}
```

---

## 🏪 Storage Methods

```typescript
getBills(orgId: string): Promise<Bill[]>;
getBill(id: string, orgId: string): Promise<Bill | undefined>;
createBill(data: InsertBill): Promise<Bill>;
updateBill(id: string, orgId: string, data: Partial<InsertBill>): Promise<Bill | undefined>;
deleteBill(id: string, orgId: string): Promise<boolean>;

// Specialized queries (TODO)
getUnpaidBills(orgId: string): Promise<Bill[]>;
getOverdueBills(orgId: string): Promise<Bill[]>;
getBillsByVendor(vendorId: string, orgId: string): Promise<Bill[]>;
getBillsByProject(projectId: string, orgId: string): Promise<Bill[]>;
getBillsDueWithin(daysAhead: number, orgId: string): Promise<Bill[]>;
```

---

## 🌐 API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/bills` | List all bills for org |
| POST | `/api/bills` | Create new bill (from vendor invoice upload) |
| GET | `/api/bills/:id` | Fetch single bill with line items |
| PUT | `/api/bills/:id` | Update bill (mark paid, dispute, change vendor, etc.) |
| DELETE | `/api/bills/:id` | Cancel/delete bill (TODO: soft delete) |

**Example**: Mark bill as paid
```http
PUT /api/bills/bill-001
Content-Type: application/json

{
  "status": "paid",
  "paidDate": "2025-02-28T14:30:00Z"
}
```

---

## 📋 Validation Schema

```typescript
export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Custom validations (TODO):
// - billNumber is unique per vendor (no duplicate invoice IDs)
// - dueDate ≥ issueDate (due date is in future relative to issue)
// - amount > 0
// - tax ≥ 0
// - discount ≥ 0 and ≤ amount
// - lineItems sum to amount (validation of line item total)
// - vendorId must belong to org
// - projectId (if provided) must belong to org
```

---

## 🔐 Audit & Workflow

### Auto-Triggered Events (TODO)
- When status → "paid": Create Payment record, update vendor balance
- When dueDate passes and status ≠ "paid": Auto-transition to "overdue", send vendor reminder
- When status changes: Log activity event
- When lineItems added/removed: Log item-level changes

### Reconciliation (TODO)
- Match bills to payments (1:N; one bill can have partial payments)
- Verify total bill amount = sum of line items
- Flag duplicate bill numbers for same vendor

### Reporting (TODO)
- Aged payables report (unpaid bills grouped by age: 0–30, 30–60, 60+)
- Cash flow projection (upcoming bill due dates)
- Vendor invoice analysis (top vendors by spend)

---

## 📊 Query Patterns

| Query | Index | Rows | Notes |
|-------|-------|------|-------|
| All bills for org | (organization_id) | 100–100K | Filter by status/vendor in WHERE |
| Unpaid bills | (status) | 10–1K | Accounts payable |
| Overdue bills | (status, due_date) | 0–100 | Priority follow-up |
| Bills due within 7 days | (due_date) | 1–50 | Upcoming payments |
| Bills by vendor | (vendor_id) | 1–10K | Vendor spend analysis |

---

## 💰 Financial Calculations

### Total Amount Due (Invoice Base)
```
totalDue = amount + tax - discount
```

### Aged Payables
```
If status = unpaid:
  age = today - issueDate
  bucket = if age ≤ 30 then "current"
           else if age ≤ 60 then "30+ days"
           else "60+ days overdue"
```

### Cash Flow Projection
```
Sum of bills WHERE dueDate BETWEEN today AND today + 30 days
= predicted cash outflow for month
```

---

## 🎨 UI Patterns (Frontend)

### Payables Dashboard
```
├─ Unpaid Bills: $52,350
├─ Overdue Bills: $8,200 (URGENT)
├─ Due in 7 Days: $15,600 (WATCH)
└─ Paid This Month: $42,100

Aging Breakdown:
├─ Current (0–30): $28,150
├─ 30–60 days: $16,200
└─ 60+ days: $8,200
```

### Bill List View
- Sort by dueDate, status, vendor, amount
- Filter by vendor, status, project
- Bulk actions (mark paid, dispute multiple)
- Export to CSV/PDF

### Bill Detail View
- Vendor info + contact
- Line item breakdown
- Payment history (linked Payments)
- Attached invoice PDF
- Comments/activity timeline

---

## 📈 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Import** | Manual entry | ✅ PDF upload + OCR parsing |
| **Line items** | JSON column | ✅ Structured + validation |
| **Payment matching** | Manual | ✅ Auto-match to Payments |
| **Soft delete** | ❌ Hard delete | ✅ Add deleted_at |
| **Activity logging** | Manual | ✅ Auto-log all changes |
| **Overdue tracking** | Manual | ✅ Auto-detect on dueDate pass |
| **Aged payables** | ❌ | ✅ Dashboard report |
| **Cash flow forecast** | ❌ | ✅ Predict outflow for next 30/90 days |
| **Vendor reconciliation** | ❌ | ✅ Match invoices received to POs |
| **Multi-bill payment** | ❌ | ✅ Pay multiple bills in one batch |
| **Approval workflow** | ❌ | ✅ Route to manager for approval |
| **Ledger sync** | ❌ | ✅ Auto-post to accounting software (Xero/QBO) |

---

## 💡 Pro Tips for Implementation

### Avoiding Common Issues
1. **Duplicate bills**: Check billNumber + vendorId is unique before insert
2. **Line item totals**: Validate lineItems array sums to amount
3. **Date logic**: issueDate ≤ dueDate always
4. **Soft deletes**: Add deleted_at; filter in all queries
5. **Payment matching**: Use Payment.billId FK; allow partial payments (multiple Payment records for one Bill)
6. **Vendor restrictions**: Can't delete vendor with unpaid bills (FK RESTRICT)
7. **Overdue calculation**: Don't hard-code today; always check dueDate < now()

### Testing
- Test status transitions (valid + invalid)
- Test line item sum validation
- Test duplicate bill number detection (same vendor)
- Test org scoping (org A can't see org B's bills)
- Test vendor deletion blocking (can't delete vendor with unpaid bills)
- Test soft delete (add deleted_at, verify hidden from queries)

---

**See also**: [Invoice.md](Invoice.md), [Vendor.md](Vendor.md), [Payment.md](Payment.md)
