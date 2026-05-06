# tasks/phase-1/P1-FIN.md — Finance & Accounting

This file covers the core finance tables (chart_of_accounts, ledger_entries, invoices, bill_items, payments, vendors) with double-entry bookkeeping enforcing `amount > 0` CHECK and `credit != debit` constraints, the expense report schema with approval workflows, tRPC routers for AP/AR with idempotency‑guarded mutations, vendor master data management, financial reporting (P&L, balance sheet, AR/AP aging) via lazy aggregation queries, an AP inbox UI with approve/reject actions, bill creation/approval form with line items, AR invoicing workspace with comment thread panel, an invoice template builder, a basic financial dashboard, vendor management page, and threaded commenting on invoices and bills. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑FIN (2026‑05‑06)

### 1. Double-Entry Bookkeeping — The NYKevin Master Pattern

The canonical PostgreSQL double-entry schema, established by the NYKevin gist and validated across multiple 2026 production implementations, provides the fundamental architecture:

- **NYKevin Double-Entry Schema (2025‑04‑15)**: "CREATE TABLE accounts (id serial PRIMARY KEY, name VARCHAR(256) NOT NULL); CREATE TABLE entries (id serial PRIMARY KEY, description VARCHAR(1024), amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0.0), credit INTEGER NOT NULL REFERENCES accounts(id), debit INTEGER NOT NULL REFERENCES accounts(id))." This is the foundational pattern: every entry is a credit to one account AND a debit to another. A materialized view `account_balances` provides fast financial reporting with automatic refresh via triggers on `INSERT OR UPDATE OF amount, credit, debit` .

- **pg-ledger (2026‑01‑19)**: Extends this with a `transfers` layer: accounts → transfers (transactions between accounts) → entries (detailed information). "Create and manage accounts with unique IDs, names, currencies, and balances. Record transactions between accounts, including transfer amounts, timestamps. Store detailed information about each transaction. Enforce rules for account balances, such as preventing negative or positive balances." .

- **ERP SQL Schema (2025‑08‑24)**: Production ERP schema covering "chart of accounts, journals, journal entries (header + lines)." The journal entry header groups related entries, while lines hold the individual debit/credit amounts tied to specific accounts. This header+lines pattern is the standard for representing compound journal entries. .

- **MoonOrangePa/accounting #138 (2026‑02‑19)**: Modern Japanese implementation using `journal_entries` (仕訳台帳) and `account_masters` (勘定科目マスター) — the same header+lines pattern validated in a 2026 production context. .

**For UBOS**: The schema adapts the NYKevin double-entry pattern with Drizzle ORM. The core table is `ledgerEntries` with `credit_account_id`, `debit_account_id`, and `amount_cents` (integer cents to avoid floating-point issues). A `journalEntries` table groups related entries (header). `account_balances` is computed lazily via SQL aggregation rather than a materialized view, avoiding the need for trigger-managed refresh.

### 2. Chart of Accounts — Hierarchical Account Structure

The 2026 consensus for chart of accounts uses a flat table with a `parent_id` self-referencing FK for hierarchy:

- **ERP SQL Schema**: "chart of accounts" table with accounts organized hierarchically — parent relationships enable rollup reporting (e.g., "Current Assets" parent aggregating child accounts). .

- **Standard account types**: Assets, Liabilities, Equity, Revenue, Expenses. Each account has: `account_number` (text, e.g., "1000"), `name`, `type` (enum), `parent_id` (self-ref FK), `is_active`, and `description`.

- **Per‑organization defaults**: A standard chart of accounts is seeded on organization creation (P1‑ONBOARD‑1). Organizations can add custom accounts within their tenant scope.

### 3. Invoices, Bills, and Payments — The 2026 SaaS Pattern

The production‑grade invoice management pattern from ACTO‑LLC, rafaelfne, and the Dev.to back‑office SaaS guide converges on:

- **Invoice Status Workflow**: `draft → approved → sent → paid → overdue`. "Invoice Management: CRUD + status workflow (draft → approved → sent). tenant_id on every table for multi‑tenant isolation. Multi‑currency schema from day one." .

- **Bill Status Workflow**: `Draft, Open, Partial, Paid, Overdue`. "Bills automatically create journal entries on save. Payments reduce bill balance and create offsetting entries. Overdue status auto‑calculated based on due date." .

- **Idempotency at the Data Layer**: "Guarantee idempotency at the data layer: one record per subscription per billing period." Uses `UNIQUE` constraints on composite keys. . The Simplico guide advises generating idempotency keys client‑side: "Idempotency key = unique ID per payment intent, generated client-side, sent with every retry." .

- **All Money in Integer Cents**: "All money is stored as integer cents (amount_cents). Currency is a string enum-like field." This avoids floating‑point rounding errors in financial calculations. .

- **Multi-Currency**: The ACTO‑LLC schema and the dev.to guide both enforce "Multi-currency schema from day one." Each invoice/bill stores `currency` alongside `amount_cents`. .

### 4. Vendor Management — Master Data Pattern

- **DistinctCodes/AssetsUp #124 (2025‑07‑21)**: "Create a vendor management system to store and retrieve information about external vendors. PostgreSQL entity for vendors: name, contact, category, region, etc. Endpoints to create, fetch, update, delete vendor profiles." .

- **SupplyAI Nile Schema**: vendors table with `tenant_id`, `name`, `contact_name`, `email`, `phone`, `address`, `tax_id`, `payment_terms`, `category`. .

### 5. Expense Reports — Approval Workflow Pattern

- **SmartSpend AI (Nile)**: Schema defines `expenses`, `receipts`, `expense_reports`, `expense_report_details` tables. "The AI agent will process receipts, categorize expenses, flag anomalies, and generate expense reports." Key fields: amount, category, description, expense_date, status. .

- **Expense Report Workflow**: Created by employee → submitted for approval → manager reviews → approved/ rejected/ returned → if approved → creates journal entry. The `status` field tracks: `draft`, `submitted`, `approved`, `rejected`, `paid`.

### 6. Financial Reporting — Lazy Aggregation Over Materialized Views

Building on the NYKevin materialized view approach, the 2026 consensus for SaaS financial reporting favors **lazy aggregation**:

- **pg_accumulator (2026‑04‑19)**: "Declarative accumulation registers that provide instant access to balances and turnovers across arbitrary dimensions." Provides "historical balance queries using hierarchical totals optimization." .

- **P&L Report**: Computed as `SUM(ledger_entries WHERE account_type IN ('Revenue', 'Expense'))` grouped by account, period. Revenue accounts contribute positive amounts; expense accounts contribute negative amounts. Net Income = Total Revenue − Total Expenses.

- **Balance Sheet**: Computed as `SUM(ledger_entries WHERE account_type IN ('Asset', 'Liability', 'Equity'))` grouped by account. The fundamental equation: Assets = Liabilities + Equity. The difference is the retained earnings check.

- **AR/AP Aging**: Invoices/bills grouped by age bucket: Current (≤30 days), 31‑60 days, 61‑90 days, >90 days. Uses PostgreSQL `CASE WHEN` with `CURRENT_DATE - due_date`. Complements the Railz.ai standard aging endpoint pattern..

### 7. Idempotency for Finance Mutations — The Three-Layer Defense

The 2026 consensus from Simplico, the Dev.to mobile payment guide, and the DZone Idempotency Barrier pattern:

- **Client‑side key generation**: UUID generated per payment intent, stored in `localStorage`, reused on retry. "Idempotency key = unique ID per payment intent, generated client-side, sent with every retry." .

- **Server‑side PostgreSQL upsert**: `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING` for atomicity. The Idempotency Barrier pattern from DZone ensures "database-backed persistence for correctness, single‑transaction state changes, atomic claiming to eliminate races." .

- **Cached response**: On duplicate, return the previously successful response (idempotency_keys table stores `response JSONB` alongside `status`). Keys auto‑expire after 24 hours..

This is already implemented in P0‑TRPC‑5 (idempotency key middleware). All finance mutations reuse that middleware.

### 8. Currency Display — `Intl.NumberFormat` Over Manual Formatting

- **Dev.to Currency Fix (2026)**: "Everything showed $ instead of ¥. Currency fix became Phase 4's first task." Solution: use `Intl.NumberFormat` for locale‑aware formatting. .

- **For UBOS**: The `Intl` formatting utilities from P0‑I18N‑3 (`formatCurrency`) are used throughout finance UI. Currency symbol position and spacing are locale‑dependent — `Intl.NumberFormat` handles this automatically.

### 9. Drizzle ORM with Numeric for Finance

- **Drizzle PostgreSQL Column Types**: Use `numeric(precision, scale)` for financial amounts in Drizzle via `pgNumeric()`. For integer‑cents storage, use `integer()` column with `amount_cents` naming. The `decimal()` type from MySQL maps to `numeric` in PostgreSQL. .

- **Drizzle DeepWiki (2026‑02‑10)**: "The `numeric(p, s)` type is an exact fixed‑point number. For financial data, this is preferred over `float8`/`double precision` to avoid rounding errors." .

### 10. TanStack Query for Finance — Optimistic Updates with Rollback

- **Zenn Practical Patterns (2026‑03‑05)**: `useMutation` の `onMutate`、`onError`、`onSettled` パターン. "楽観的更新とは、サーバーのレスポンスを待たずに UI を先に更新し、エラーが発生した場合にロールバックするパターンです。" .

- **For UBOS**: AP approval mutations use optimistic updates — the approve/reject button updates immediately, and the mutation rolls back on error with a toast notification. Idempotency keys prevent duplicate processing on retry.

---

## Task Definitions

### [ ] P1-FIN-SCHEMA-1: Define core finance tables — chart_of_accounts, ledger_entries (double‑entry), invoices, bill_items, payments, vendors

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No finance tables exist in the database schema. The finance page renders static mock data from `financeData` with no persistence. There is no chart of accounts, no ledger, no invoice/bill tracking, and no vendor management. The Stripe billing infrastructure (P0-BILLING) handles subscription payments but not AP/AR accounting.
**Size:** Large

**Description:**
Create `packages/db/src/schema/finance.ts` with all tables needed for double-entry accounting, AP/AR, and vendor management, following the NYKevin double-entry pattern adapted for Drizzle ORM.

**(a) `chartOfAccountsTable`**: `id` (UUID PK), `org_id` (UUID FK), `account_number` (text NOT NULL — e.g., "1000"), `name` (text NOT NULL), `type` (text NOT NULL — CHECK IN: 'asset', 'liability', 'equity', 'revenue', 'expense'), `parent_id` (UUID self-ref FK nullable — for hierarchical rollup), `description` (text), `is_active` (boolean DEFAULT true), `is_system` (boolean DEFAULT false — system accounts cannot be deleted), `created_at`, `updated_at`. UNIQUE on `(org_id, account_number)`. RLS enabled.

**(b) `journalEntriesTable`**: `id` (UUID PK), `org_id` (UUID FK), `entry_number` (text — sequential per org), `description` (text NOT NULL), `entry_date` (date NOT NULL DEFAULT CURRENT_DATE), `source_type` (text — 'manual', 'invoice', 'bill', 'payment', 'expense'), `source_id` (UUID — polymorphic reference to source document), `created_by` (UUID FK to users), `created_at`, `updated_at`. RLS enabled.

**(c) `ledgerEntriesTable`**: `id` (UUID PK), `org_id` (UUID FK), `journal_entry_id` (UUID FK to journal_entries NOT NULL), `account_id` (UUID FK to chart_of_accounts NOT NULL), `amount_cents` (integer NOT NULL — in cents, never negative for individual line), `side` (text NOT NULL CHECK IN: 'debit', 'credit'), `description` (text), `created_at`. The double‑entry invariant is enforced application‑side: the sum of debits must equal the sum of credits within a journal entry. RLS enabled.

**(d) `invoicesTable` (AR)**: `id` (UUID PK), `org_id` (UUID FK), `invoice_number` (text — sequential per org, e.g., "INV-0001"), `contact_id` (UUID nullable — FK to crm_contacts or a customer reference), `customer_name` (text NOT NULL), `customer_email` (text), `status` (text DEFAULT 'draft' CHECK IN: 'draft', 'sent', 'partial', 'paid', 'overdue', 'void'), `issue_date` (date NOT NULL), `due_date` (date NOT NULL), `subtotal_cents` (integer NOT NULL), `tax_cents` (integer DEFAULT 0), `total_cents` (integer NOT NULL), `currency` (text DEFAULT 'USD'), `notes` (text), `created_by` (UUID FK), `created_at`, `updated_at`. CHECK: `due_date >= issue_date`, `total_cents >= 0`. RLS enabled.

**(e) `invoiceLineItemsTable`**: `id` (UUID PK), `org_id` (UUID FK), `invoice_id` (UUID FK to invoices NOT NULL), `description` (text NOT NULL), `quantity` (numeric DEFAULT 1), `unit_price_cents` (integer NOT NULL), `amount_cents` (integer NOT NULL), `account_id` (UUID FK to chart_of_accounts — for GL coding), `tax_rate` (numeric DEFAULT 0), `sort_order` (integer DEFAULT 0). RLS enabled.

**(f) `billsTable` (AP)**: `id` (UUID PK), `org_id` (UUID FK), `bill_number` (text), `vendor_id` (UUID FK to vendors NOT NULL), `status` (text DEFAULT 'draft' CHECK IN: 'draft', 'open', 'partial', 'paid', 'overdue', 'void'), `bill_date` (date NOT NULL), `due_date` (date NOT NULL), `subtotal_cents` (integer NOT NULL), `tax_cents` (integer DEFAULT 0), `total_cents` (integer NOT NULL), `amount_paid_cents` (integer DEFAULT 0), `currency` (text DEFAULT 'USD'), `terms` (text), `memo` (text), `created_by` (UUID FK), `created_at`, `updated_at`. CHECK: `due_date >= bill_date`. RLS enabled. Following ACTO‑LLC schema: "Bills automatically create journal entries on save. Overdue status auto‑calculated based on due date.".

**(g) `billLineItemsTable`**: Same structure as invoice line items but referencing `bill_id`.

**(h) `billPaymentsTable`**: `id` (UUID PK), `org_id` (UUID FK), `bill_id` (UUID FK to bills NOT NULL), `payment_date` (date NOT NULL), `amount_cents` (integer NOT NULL), `payment_method` (text — 'bank_transfer', 'check', 'cash', 'credit_card'), `reference_number` (text), `account_id` (UUID FK — bank/cash account for GL coding). Following ACTO‑LLC: "Payments reduce bill balance and create offsetting entries.".

**(i) `vendorsTable`**: `id` (UUID PK), `org_id` (UUID FK), `name` (text NOT NULL), `contact_name` (text), `email` (text), `phone` (text), `address` (text), `tax_id` (text), `payment_terms` (text — e.g., 'Net 30'), `category` (text), `notes` (text), `is_active` (boolean DEFAULT true), `created_at`, `updated_at`. RLS enabled. Following DistinctCodes/AssetsUp and SupplyAI patterns..

**(j) `expenseReportsTable` (Phase 2 stub)**: `id` (UUID PK), `org_id` (UUID FK), `user_id` (UUID FK), `report_name`, `start_date`, `end_date`, `status` (text DEFAULT 'draft' CHECK IN: 'draft', 'submitted', 'approved', 'rejected', 'paid'), `total_cents`, `created_at`, `updated_at`. RLS enabled. Following SmartSpend AI schema. .

**(k) All money in integer cents** (`amount_cents: integer`), following the rafaelfne billing model: "All money is stored as integer cents (amount_cents). Currency is a string enum-like field." . Use `integer()` for cents columns.

**(l) Indexes**:
- `chartOfAccountsTable`: `(org_id, type)` for filtering by account type, `(org_id, account_number)` UNIQUE
- `ledgerEntriesTable`: `(journal_entry_id)` for line items, `(account_id, created_at)` for account history
- `invoicesTable`: `(org_id, status)` for AP aging, `(org_id, due_date)` for overdue tracking, `(customer_name)` for search
- `billsTable`: `(org_id, status)` for AP aging, `(org_id, vendor_id)` for vendor history, `(org_id, due_date)` for overdue
- `vendorsTable`: `(org_id, name)` for search

**Research Findings (2026‑05‑06):**
- NYKevin pattern: `amount > 0`, credit + debit to different accounts, materialized view for balances
- pg-ledger: accounts → transfers → entries with balance constraints
- ERP schema: chart of accounts with journals (header + lines)
- All money in integer cents to avoid floating‑point errors
- Invoice status workflow: draft → sent → partial → paid → overdue
- Bill status workflow: draft → open → partial → paid → overdue
- Expense reports with approval workflow (stub for Phase 2)

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table)
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS helpers)

**Blocks:**
- `tasks/phase-1/P1-FIN.md → P1-FIN-SCHEMA-2` (entity_links integration)
- `tasks/phase-1/P1-FIN.md → P1-FIN-SCHEMA-3` (migration)
- All `P1-FIN-TRPC-*` and `P1-FIN-UI-*` tasks

**Related Files:**
- `packages/db/src/schema/finance.ts` (new)
- `packages/db/src/schema/index.ts` (add re-export)

**Definition of Done**
- [ ] `packages/db/src/schema/finance.ts` created with 10 tables
- [ ] `chartOfAccountsTable`: hierarchical with self-ref parent_id, account_number UNIQUE per org
- [ ] `journalEntriesTable`: groups ledger entries, links to source documents
- [ ] `ledgerEntriesTable`: double‑entry with credit/debit accounts, integer cents
- [ ] `invoicesTable` (AR): status workflow with CHECK constraint, integer cents
- [ ] `invoiceLineItemsTable`: linked to invoices with GL account coding
- [ ] `billsTable` (AP): status workflow with CHECK constraint, vendor FK
- [ ] `billLineItemsTable`: linked to bills with GL account coding
- [ ] `billPaymentsTable`: references bills, single‑payment or partial
- [ ] `vendorsTable`: master data with contact info and payment terms
- [ ] `expenseReportsTable`: stub with status workflow (Phase 2 implementation)
- [ ] All money columns use `integer()` — no floating‑point
- [ ] All tables have `org_id` FK, `enableRLS()`, `tenantTablePolicies()`
- [ ] All appropriate composite indexes
- [ ] Schema re‑exported from `schema/index.ts`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Bank accounts / cash management tables (Phase 2)
- Tax codes / tax rates table (Phase 2 — P3‑TAX‑1)
- Multi‑currency exchange rates table (Phase 2 — P3‑ADV‑FIN‑4)
- Revenue schedules / deferred revenue (Phase 2 — P4‑REVREC‑1)
- Budget tables (Phase 2)
- Three‑way matching (purchase order → goods receipt → invoice) — Phase 2 P3‑ADV‑FIN‑7

**Rules to Follow**
- All monetary amounts must be integer cents — never float/double.
- Double‑entry integrity must be enforced: within a journal entry, SUM(debits) = SUM(credits).
- `credit_account_id != debit_account_id` — never allow same‑account entries.
- `due_date >= issue_date` (or `bill_date`) — enforced by CHECK constraint.
- Never delete ledger entries — financial records are append‑only. Use void/reversal entries instead.
- All tables must be organization‑scoped with RLS.

**Verification**
```bash
pnpm --filter @ubos/db run typecheck
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate
DATABASE_URL=$DATABASE_URL pnpm db:migrate
psql $DATABASE_URL -c "\dt chart_of_accounts journal_entries ledger_entries invoices invoice_line_items bills bill_line_items bill_payments vendors expense_reports"
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('chart_of_accounts', 'ledger_entries', 'invoices', 'bills', 'vendors');"
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: Finance is a bounded context. The ledger is the core domain — all AR/AP operations ultimately post to the ledger. Chart of accounts is the reference data. Invoices and bills are transactional documents that generate ledger entries on approval.

---

#### Subtasks

- [ ] P1-FIN-SCHEMA-1.0.25 (AGENT): Read existing CRM schema and RLS helpers for pattern consistency. Research NYKevin double‑entry, pg‑ledger, and ERP schema patterns.
  **Verification:** Current patterns and financial schema designs documented.

- [ ] P1-FIN-SCHEMA-1.0.5 (AGENT): Design complete finance schema with all columns, constraints, CHECKs, indexes. Research integer‑cents pattern and invoice/bill status workflows.
  **Verification:** Full schema diagram documented.

- [ ] P1-FIN-SCHEMA-1.1 (AGENT): Create `chartOfAccountsTable`, `journalEntriesTable`, `ledgerEntriesTable` with self‑ref FK and double‑entry columns.
  **File(s):** `packages/db/src/schema/finance.ts` (new)
  **Verification:** Double‑entry tables compile with correct constraints.

- [ ] P1-FIN-SCHEMA-1.2 (AGENT): Create `invoicesTable`, `invoiceLineItemsTable` with GL coding and status workflow.
  **File(s):** `packages/db/src/schema/finance.ts`
  **Verification:** AR tables with CHECK constraints.

- [ ] P1-FIN-SCHEMA-1.3 (AGENT): Create `billsTable`, `billLineItemsTable`, `billPaymentsTable` with vendor FK.
  **File(s):** `packages/db/src/schema/finance.ts`
  **Verification:** AP tables with payment tracking.

- [ ] P1-FIN-SCHEMA-1.4 (AGENT): Create `vendorsTable` and `expenseReportsTable` (stub).
  **File(s):** `packages/db/src/schema/finance.ts`
  **Verification:** Supporting tables created.

- [ ] P1-FIN-SCHEMA-1.5 (AGENT): Add re‑export to `schema/index.ts`.
  **File(s):** `packages/db/src/schema/index.ts`
  **Verification:** All tables importable.

- [ ] P1-FIN-SCHEMA-1.6 (HUMAN): Review complete schema, verify double‑entry integrity rules and RLS. Approve.
  **Verification:** Approved.

---

### [ ] P1-FIN-SCHEMA-2: Add invoice/supporting document attachment via entity_links

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No mechanism to attach supporting documents to invoices or bills. The `entity_links` table (P1‑CRM‑SCHEMA‑2) enables this generically.
**Size:** Small

**Description:**
Document the finance entity types in the `entity_links` system and add any finance‑specific attachment convenience procedures. No new schema table needed — `entity_links` already handles polymorphic linking.

**(a) Documented entity types**: 
- `finance.invoice` — link documents to invoices (supporting PDFs, signed contracts)
- `finance.bill` — link receipts, vendor invoices to bills
- `finance.vendor` — link vendor contracts, W‑9 forms

**(b) Convenience procedures** (in P1‑FIN‑TRPC‑3/2): 
- `invoices.attachDocument(invoiceId, documentId)` — creates entity_link
- `invoices.listAttachments(invoiceId)` — lists linked documents
- `bills.attachDocument(billId, documentId)` — creates entity_link
- `bills.listAttachments(billId)` — lists linked documents

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-2` (entity_links table)
- `tasks/phase-1/P1-FIN.md → P1-FIN-SCHEMA-1`

**Related Files:**
- No schema changes — documentation and convenience procedures only

**Definition of Done**
- [ ] Finance entity types documented for entity_links
- [ ] Attachment procedures included in invoice and bill routers
- [ ] `pnpm run typecheck` passes

---

#### Subtasks

- [ ] P1-FIN-SCHEMA-2.1 (AGENT): Document finance entity types. Add attachment convenience procedures to invoice/bill routers.
  **Verification:** Documents linkable to invoices and bills.

- [ ] P1-FIN-SCHEMA-2.2 (HUMAN): Verify document attachment flow. Approve.
  **Verification:** Approved.

---

### [ ] P1-FIN-SCHEMA-3: Create migration and apply

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P1‑FIN‑SCHEMA‑1 defines new tables but no migration generated.
**Size:** Small

**Description:**
Generate and apply Drizzle migration for finance schema. Same pattern as previous schema tasks.

**Depends on:** P1‑FIN‑SCHEMA‑1
**Blocks:** All P1‑FIN‑TRPC‑* and P1‑FIN‑UI‑* tasks

**Definition of Done**
- [ ] Migration generated, reviewed, applied, committed
- [ ] All finance tables queryable
- [ ] `pnpm run typecheck` passes

---

#### Subtasks

- [ ] P1-FIN-SCHEMA-3.1 (AGENT): Generate migration, review SQL, apply, commit.
  **Verification:** Tables exist.

- [ ] P1-FIN-SCHEMA-3.2 (HUMAN): Verify all tables created correctly. Approve.
  **Verification:** Approved.

---

### [ ] P1-FIN-TRPC-1: Build chart of accounts CRUD and query procedures

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No chart of accounts API exists.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/finance/accounts.ts` with chart of accounts management.

**(a) Procedures**:
- `accounts.list` — query: all accounts for org, hierarchical (nested by parent_id), filterable by type
- `accounts.getById` — query: single account with parent name
- `accounts.create` — mutation: create account (admin or finance‑admin)
- `accounts.update` — mutation: update name, description, type, parent_id
- `accounts.deactivate` — mutation: soft‑deactivate (set `is_active = false`). Cannot deactivate if has ledger entries (informational warning).
- `accounts.getDefaults` — query: returns standard chart of accounts template for seeding

**(b) Default CoA seeding**: Standard accounts seeded per org: Assets (1000‑1999), Liabilities (2000‑2999), Equity (3000‑3999), Revenue (4000‑4999), Expenses (5000‑5999). Min 20 standard accounts.

**Depends on:** P1‑FIN‑SCHEMA‑3, P0‑TRPC‑8

**Related Files:**
- `apps/web/src/server/trpc/routers/finance/accounts.ts` (new)
- `apps/web/src/server/trpc/routers/_app.ts`

**Definition of Done**
- [ ] CRUD procedures for chart of accounts
- [ ] Hierarchical list with parent/child nesting
- [ ] Default CoA template with 20+ standard accounts
- [ ] System accounts cannot be deleted
- [ ] `pnpm run typecheck` passes

---

### [ ] P1-FIN-TRPC-2: Build AP procedures — create bill, list unpaid, approve/reject, schedule payment

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No AP procedures exist. All finance data is mock.
**Size:** Large

**Description:**
Create `apps/web/src/server/trpc/routers/finance/ap.ts` with accounts payable operations. All bill mutations use idempotency middleware (P0‑TRPC‑5).

**(a) Procedures**:
- `bills.list` — query: paginated, filterable by status/vendor/due_date
- `bills.getById` — query: bill with line items, payments, and vendor info
- `bills.create` — mutation: create bill from vendor with line items. Idempotency‑guarded.
- `bills.update` — mutation: update bill fields before approval
- `bills.approve` — mutation: approve bill → creates journal entry (debit expense/asset, credit AP). Idempotency‑guarded.
- `bills.reject` — mutation: reject bill with reason
- `bills.recordPayment` — mutation: record full or partial payment → creates journal entry (debit AP, credit cash/bank)
- `bills.listOverdue` — query: bills past due date, grouped by age bucket
- `bills.getAgingReport` — query: AP aging report — bills grouped by: Current, 1‑30, 31‑60, 61‑90, >90 days

**(b) Journal entry auto‑creation**: On `bills.approve`, auto‑create a journal entry:
- Debit: expense/inventory account (from bill line items' GL coding) — total amount
- Credit: Accounts Payable account — total amount

On `bills.recordPayment`:
- Debit: Accounts Payable — payment amount
- Credit: Cash/Bank account — payment amount

**Research Findings (2026‑05‑06):**
- ACTO‑LLC: "Bills automatically create journal entries on save. Payments reduce bill balance and create offsetting entries. Overdue status auto‑calculated based on due date.".

**Depends on:** P1‑FIN‑SCHEMA‑3, P0‑TRPC‑5 (idempotency), P1‑FIN‑TRPC‑1

**Related Files:**
- `apps/web/src/server/trpc/routers/finance/ap.ts` (new)

**Definition of Done**
- [ ] Full AP CRUD with idempotency‑guarded mutations
- [ ] `bills.approve` auto‑creates journal entry
- [ ] `bills.recordPayment` auto‑creates payment journal entry
- [ ] AP aging report with age buckets
- [ ] Auto‑calculated overdue status
- [ ] `pnpm run typecheck` passes

---

### [ ] P1-FIN-TRPC-3: Build AR procedures — create invoice, record payment, aging report

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No AR procedures exist.
**Size:** Large

**Description:**
Create `apps/web/src/server/trpc/routers/finance/ar.ts` with accounts receivable operations.

**(a) Procedures**:
- `invoices.list` — query: paginated, filterable by status/customer/due_date
- `invoices.getById` — query: invoice with line items, payments, contact info
- `invoices.create` — mutation: create invoice with line items, auto‑generate invoice_number. Idempotency‑guarded.
- `invoices.update` — mutation: update draft invoice fields
- `invoices.send` — mutation: mark as sent, optionally email via Resend (uses enqueueEmail helper)
- `invoices.recordPayment` — mutation: record payment → creates journal entry (debit cash/bank, credit AR)
- `invoices.void` — mutation: void invoice (reversal entries)
- `invoices.listOverdue` — query: invoices past due date with age buckets
- `invoices.getAgingReport` — query: AR aging report — invoices grouped by: Current, 1‑30, 31‑60, 61‑90, >90 days

**(b) Attachment procedures**: `invoices.attachDocument`, `invoices.listAttachments` — using entity_links.

**(c) Invoice numbering**: Auto‑generated sequential per org: `INV-{YYYY}-{0001}`. Stored in `invoice_number`. Unique per org.

**Research Findings (2026‑05‑06):**
- Dev.to: "CRUD + status workflow (draft → approved → sent). PDFs stored in MinIO, metadata in PostgreSQL. tenant_id on every table.".

**Depends on:** P1‑FIN‑SCHEMA‑3, P0‑TRPC‑5, P1‑FIN‑TRPC‑1

**Related Files:**
- `apps/web/src/server/trpc/routers/finance/ar.ts` (new)

**Definition of Done**
- [ ] Full AR CRUD with idempotency‑guarded mutations
- [ ] Invoice auto‑numbering (sequential per org)
- [ ] `invoices.recordPayment` auto‑creates journal entry
- [ ] AR aging report with age buckets
- [ ] Document attachment via entity_links
- [ ] `pnpm run typecheck` passes

---

### [ ] P1-FIN-TRPC-4: Build vendor master data procedures (CRUD, tax info)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No vendor API exists.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/finance/vendors.ts` with vendor CRUD.

**(a) Procedures**: `vendors.list` (paginated, searchable), `vendors.getById` (with bill count and total), `vendors.create`, `vendors.update`, `vendors.deactivate`.

**Depends on:** P1‑FIN‑SCHEMA‑3

**Related Files:**
- `apps/web/src/server/trpc/routers/finance/vendors.ts` (new)

**Definition of Done**
- [ ] Vendor CRUD with search
- [ ] Vendor detail shows bill history
- [ ] `pnpm run typecheck` passes

---

### [ ] P1-FIN-TRPC-5: Build financial reporting procedures (P&L, balance sheet, AR/AP aging)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No financial reporting procedures exist.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/finance/reports.ts` with financial report queries via lazy aggregation.

**(a) P&L Report**: `reports.profitLoss` — query accepting `startDate` and `endDate`. SUMs ledger entries for Revenue accounts (positive) and Expense accounts (negative). Returns: `{ revenue: [{ account, amount }], expenses: [{ account, amount }], netIncome }`.

**(b) Balance Sheet**: `reports.balanceSheet` — query accepting `asOfDate`. SUMs ledger entries for Asset, Liability, Equity accounts. Returns: `{ assets: [...], liabilities: [...], equity: [...] }`.

**(c) AR/AP Aging**: Already covered in P1‑FIN‑TRPC‑2 and P1‑FIN‑TRPC‑3 via `getAgingReport`.

**(d) Trial Balance**: `reports.trialBalance` — all accounts with debit/credit totals and net balance.

**(e) Implementation**: All reports use lazy aggregation — queries run on demand against the ledger, not materialized views. This avoids stale data and trigger-management complexity.

**Research Findings (2026‑05‑06):**
- NYKevin: materialized view `account_balances` for fast reports, refreshed by trigger
- UBOS: lazy aggregation — compute on read for accuracy, cache results client‑side via TanStack Query

**Depends on:** P1‑FIN‑SCHEMA‑3, P1‑FIN‑TRPC‑1

**Related Files:**
- `apps/web/src/server/trpc/routers/finance/reports.ts` (new)

**Definition of Done**
- [ ] P&L report with revenue/expense/net income
- [ ] Balance sheet with assets/liabilities/equity
- [ ] Trial balance with per‑account totals
- [ ] All computed via lazy aggregation
- [ ] `pnpm run typecheck` passes

---

### [ ] P1-FIN-TRPC-6: Emit `finance.invoice.paid`, `finance.bill.approved` events

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No finance events emitted.
**Size:** Small

**Description:**
Add Inngest event emission to key finance mutations, following P1‑CRM‑TRPC‑7 pattern. Events: `finance/invoice.paid`, `finance/invoice.sent`, `finance/bill.approved`, `finance/bill.paid`. Fire‑and‑forget, Zod‑validated event types.

**Depends on:** P1‑FIN‑TRPC‑2, P1‑FIN‑TRPC‑3, P0‑INNGEST‑3

**Related Files:**
- `apps/web/src/server/trpc/routers/finance/ar.ts`, `ap.ts`
- `apps/web/src/server/inngest/events/finance.ts` (new)

**Definition of Done**
- [ ] Four finance events emitted on relevant mutations
- [ ] Event types defined with Zod schemas
- [ ] `pnpm run typecheck` passes

---

### [ ] P1-FIN-UI-1 through P1-FIN-UI-6: Finance User Interfaces

**P1-FIN-UI-1 — AP Inbox View**: Bills list with status filtering (Open, Overdue, Paid), vendor name, amount, due date. Color‑coded overdue warnings. Approve/Reject icon buttons with optimistic update. Batch payment button (select multiple bills → record payment). "New Bill" button opens create form. Pagination. (Medium)

**P1-FIN-UI-2 — Bill Creation/Approval Form**: Modal or full‑page form with: vendor selector (searchable dropdown), bill date, due date, line items table (description, GL account, amount), tax, memo. Validation: at least one line item, totals match. Approve button triggers journal entry creation. (Medium)

**P1-FIN-UI-3 — AR Invoicing Workspace**: Full‑page with: invoices list (status, customer, amount, due date), "Create Invoice" button, invoice preview panel. Create invoice form with: customer info, line items, due date, notes. Send button emails via Resend. Record payment button. Threaded comment panel (P1‑FIN‑COMM‑2). (Large)

**P1-FIN-UI-4 — Invoice Template Builder**: Drag‑and‑drop layout builder with: logo upload, company name, address fields, color picker, font selector, "Save as Default" button. Preview panel renders live invoice using template. Templates stored as JSONB. (Medium)

**P1-FIN-UI-5 — Financial Dashboard**: Summary cards: Total Revenue (MTD), Total Expenses (MTD), Net Income, Outstanding AR, Outstanding AP. Mini P&L bar chart (Revenue vs Expenses by month). AP aging donut chart. AR aging bar chart. Quick links to AP Inbox and AR Invoicing. (Medium)

**P1-FIN-UI-6 — Vendor Management Page**: Vendor list with search, filter by category. Vendor detail: contact info, payment terms, bill history (paginated), total outstanding. Create/Edit vendor form. (Small)

---

### [ ] P1-FIN-COMM-1 and P1-FIN-COMM-2: Invoice & Bill Commenting

**P1-FIN-COMM-1 — Comment Schema and tRPC**: `invoiceCommentsTable` with `invoice_id` (or `bill_id`), `user_id`, `body`, `parent_comment_id` (self‑ref for threading), `created_at`. CRUD procedures: `comments.list` (by invoice/bill, threaded), `comments.create`, `comments.resolve`. (Medium)

**P1-FIN-COMM-2 — Threaded Comment UI**: Comment panel in invoice detail and bill detail. Threaded replies with indent. @mentions with user autocomplete. Resolve button. Activity feed integration. (Medium)

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P1‑FIN group are covered.*