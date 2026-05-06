# tasks/phase-1/P1-INTEG.md — Cross‑Module Integration & Shared Services

This file covers the Inngest Quote‑to‑Cash function (deal won → auto‑create invoice via `step.run()`) using the fan‑out pattern for parallel workflows, the Inngest auto‑link function (document uploaded → attach to CRM entity via entity_links), PostgreSQL full‑text search with GIN indexes and `tsvector_update_trigger` across all domain tables, a federated global search tRPC procedure (`UNION ALL` across domain tsvectors with `websearch_to_tsquery` and `ts_rank` ranking), the global search UI with a `useGlobalSearch` hook (300ms debounce, TanStack Router query param sync, results grouped by module), the in‑app notification system with an activity_feed table and tRPC procedures, and an Inngest notification dispatcher that listens to all domain events and creates feed entries via the fan‑out pattern. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑INTEG (2026‑05‑06)

### 1. Quote‑to‑Cash — Inngest Fan‑Out Pattern with Durable step.run()

The 2026 industry‑standard pattern for cross‑module revenue workflows is the **fan‑out pattern** implemented via Inngest durable functions. Multiple independent sources converge on the same architecture:

- **Inngest Fan‑out Docs (2026)**: "The fan‑out pattern enables you to send a single event and trigger multiple functions in parallel (one‑to‑many). Since Inngest is powered by events, implementing fan‑out is as straightforward as defining multiple functions that use the same event trigger."  The canonical example is exactly UBOS's use case: "when a user signs up... Send a welcome email, Start a trial in Stripe, Add the user to your CRM." 

- **Inngest Durable AI Agent Blog (2026‑03‑17)**: "You only need three primitives: `step.run()` – Execute a unit of work durably. Each `step.run()` is memoized: if the function resumes after a failure, completed steps return their cached results instantly. `step.invoke()` – Call another Inngest function and wait for its result. `step.sendEvent()` – Emit an event that triggers other Inngest functions (fire‑and‑forget)." 

- **Inngest Durability DeepWiki**: "Automatic memoization: Steps executed via `step.run()` are cached and never re‑executed on retry. Built‑in retries: Failed steps automatically retry with exponential backoff. State persistence: Workflow state is managed by Inngest infrastructure." 

- **lobehub inngest‑events Skill (2026‑03‑05)**: "Fan‑Out Patterns – Use case: One event triggers multiple independent functions for reliability and parallel processing."  Events follow the Object‑Action naming pattern: `domain/noun.verb` — e.g., `billing/invoice.paid`, `crm/deal.won`. 

**For UBOS**: When `crm/deal.won` fires, a Quote‑to‑Cash Inngest function uses `step.run()` to durably create an invoice, and `step.sendEvent()` to fan‑out to the notification dispatcher. If the invoice creation step fails (e.g., chart of accounts missing), Inngest retries only that step — the deal is already marked won, so there's no double‑counting.

### 2. Auto‑Linking Documents to CRM via Inngest

The 2026 pattern for cross‑domain entity linking uses event‑driven background jobs:

- **Inngest Events Guide**: Events carry data between systems. When `document/uploaded` fires, a function can read the upload context (e.g., `dealId` in the event payload) and create an `entity_link` between the document and the deal. 

- **Inngest Triggers**: "Multiple triggers – Use a single function to handle multiple event types." A single `auto‑link` function can listen to both `document/uploaded` and `project/task.completed`, creating entity_links where context is provided. 

For UBOS: The `documents/auto‑link` function triggers on `document/uploaded`. If the event payload includes a `source_entity_type` and `source_entity_id` (e.g., uploaded from a CRM deal page), the function inserts an `entity_link` row. This is fire‑and‑forget — the upload confirmation doesn't wait for linking.

### 3. PostgreSQL Full‑Text Search — GIN + tsvector_update_trigger Pattern

The definitive 2026 production pattern for PostgreSQL FTS comes from five independent sources:

- **PostgreSQL Official Docs (2026‑02‑26)**: "Practical use of text searching usually requires creating an index. We can create a GIN index to speed up text searches: `CREATE INDEX pgweb_idx ON pgweb USING GIN (to_tsvector('english', body))`." Only the 2‑argument version of `to_tsvector` can be used in expression indexes. 

- **Alibaba Cloud Trigger Functions (2026‑03‑27)**: `tsvector_update_trigger_column()` — "Automatically updates a tsvector column from one or more plain‑text source columns. The text search configuration is read from a regconfig column in the same table, allowing per‑row configuration." 

- **PHP.cn FTS Best Practice (2026‑05‑05)**: "优先使用内置 `tsvector_update_trigger`，它已处理空值、类型转换、多字段拼接等边界情况。手写自定义函数仅在需要字段加权时才考虑。GIN索引应建在tsv列上以避免重复解析开销。" — Prefer the built‑in trigger; it handles nulls, type casting, and multi‑field concatenation edge cases. Only write custom functions when field weighting is needed. 

- **Team‑Proovy Production Pattern (2026‑02‑09)**: Korean production implementation: "messages 테이블에 `search_vector` 컬럼 추가 (tsvector 타입) – GIN 인덱스 생성 – 트리거 함수 생성 (INSERT/UPDATE 시 search_vector 자동 갱신)." 

- **Alibaba Cloud GIN Guide (2026‑03‑27)**: "For large tables, use a Generalized Inverted Index (GIN) to speed up tsvector queries. An inverted index stores the mapping from each word to its positions in the dataset, enabling fast lookups instead of full table scans." 

**Search across multiple tables**: The StackOverflow revision confirms that `UNION ALL` with ranking is possible, but there's no guarantee rankings are consistent between tables.  The solution: normalize rankings by computing a per‑table baseline and weighting results. PostgreSQL's `setweight()` function assigns weights (A, B, C, D) to different parts of a document; for cross‑table search, each table's tsvector can be weighted differently.

**`websearch_to_tsquery`**: The elysiate.com guide (2026‑04‑03) confirms: "For user‑facing search boxes, `websearch_to_tsquery` understands quoted phrases, OR, and dash‑style exclusion syntax."  The Synapse commit (2026‑04‑06) shows the production pattern: "If on PostgreSQL 11+, pass the user input to `websearch_to_tsquery`." 

### 4. Global Search — Debounced Hook + TanStack Router Integration

The vedovelli/ai‑dev‑team‑simulation issue #407 (2026‑03‑18) establishes the canonical global search pattern:

- **`useGlobalSearch` hook**: 300ms debounce using TanStack Query, URL state managed via TanStack Router query params (`?q=term&type=task|sprint|agent&status=active`), browser history/back‑forward navigation preserves search state, results include `matchedField` metadata for highlighting. 

- **Debounce best practice** (2026‑04‑17): "Batch client‑side keystrokes with debounce to reduce unnecessary server round trips. In search联想 scenarios, debounce compresses 10 API calls into 1."  The 2026 consensus is 300ms idle time.

- **Typeahead Service design (2026‑04‑17)**: "A typeahead service extends basic search suggest by adding session context awareness, distributed prefix indexing across multiple data domains, and intelligent debounce batching." 

For UBOS: The `search.global` tRPC procedure accepts `query`, `entityTypes[]` (optional filter), and returns ranked results grouped by module (CRM, Projects, Documents, Finance). Results include entity type icon, title, subtitle, relevance snippet, and navigation URL. The `useGlobalSearch` hook manages debounce and TanStack Router sync.

### 5. Notification System — Unified Feed with Inngest Dispatcher

The 2026 consensus for SaaS notification systems from four independent sources:

- **Spin‑Forge #27 (2026‑01‑18)**: "Create a system to track meaningful user actions. Activity Model: id, actor (User), action_type, target_type, target_id, created_at. Notification Model: id, recipient (User), actor (User), notification_type, message, is_read, created_at." 

- **JaredCH/socialsecure #477 (2026‑03‑20)**: Unified notification platform handling "event‑driven notification publishing, preference resolution, template formatting, delivery orchestration, scheduling, retries, logging, and frontend client consumption." Key: "One schema including categories, channel toggles, quiet hours, digest mode." 

- **Mejba SaaS Notification Designer (2026‑03‑23)**: Notification dropdown grouped by time (Today, Yesterday, This Week, Earlier). Each notification: icon by type, title, description, timestamp, action button. Types: task assigned, comment mention, status change, deadline approaching, approval request, file shared, team join. Mark as read (individual + bulk). 

- **GetStream Activity Feed Architecture (2026‑02‑11)**: "The Foundational Principle: Separate Event Capture From Feed Serving. Three distinct layers: (1) Immutable activity events written to primary datastore and emitted to a durable message queue, (2) A serving view built by consuming those events, (3) Hydration — batch‑fetch full objects from caches." Two implementation strategies: read‑time aggregation (simple, works early) and fan‑out‑on‑write (pre‑computed per‑user timelines). 

- **lucasrudi/mindtrack #340 (2026‑03‑20)**: "In‑app notification entity + Flyway migration — notifications table with user_id, type, title, body, read, created_at, link." 

**For UBOS Phase 1**: Use the **read‑time aggregation** approach. All domain events are captured by a single Inngest dispatcher function that listens to ALL CRM, Projects, Documents, Finance, and Platform events. For each event, the dispatcher creates an `activity_feed` row with actor, action_type, target entity reference, and message. The frontend fetches the feed via a paginated tRPC query and groups entries by time period. No WebSocket in Phase 1 — updates are polled (refetch on interval or focus). Future Phase 3 adds SSE for real‑time.

### 6. Inngest Fan‑Out for Notification Dispatch

- **Inngest Multiple Triggers**: "Use a single function to handle multiple event types." A single notification dispatcher can list all domain events as triggers. 

- **Fan‑out Pattern Implementation (2026‑04‑01)**: "Fan‑out pattern — triggers multiple independent functions from a single event. Inngest's fan‑out pattern means multiple functions can listen to the same event." 

For UBOS: The `notifications/dispatcher` Inngest function uses a single function definition with multiple triggers: `crm/lead.created`, `crm/deal.won`, `project/task.assigned`, `project/task.completed`, `document/uploaded`, `finance/invoice.paid`, `finance/bill.approved`. For each event, it maps the event to a notification template (title, body, action link), resolves recipients (based on entity context — e.g., task assignee, deal owner), checks notification preferences, and creates `activity_feed` rows.

### 7. GIN Indexes Across All Domain Tables

Following the Team‑Proovy production pattern, every searchable domain table gets:
1. A `search_vector` tsvector column
2. A GIN index on that column
3. A `BEFORE INSERT OR UPDATE` trigger using `tsvector_update_trigger()` or `tsvector_update_trigger_column()`

Tables to index: `crm_contacts`, `crm_companies`, `crm_deals`, `crm_leads`, `projects`, `tasks` (title + description), `documents` (name + content_text), `invoices`, `bills`, `vendors`.

The SQL pattern per table (using PostgreSQL built‑in trigger function):
```sql
ALTER TABLE crm_contacts ADD COLUMN search_vector tsvector;
CREATE INDEX idx_crm_contacts_search ON crm_contacts USING GIN (search_vector);
CREATE TRIGGER trg_crm_contacts_search_vector
  BEFORE INSERT OR UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', first_name, last_name, email, title);
```

Per the PHP.cn best practice: "优先使用内置tsvector_update_trigger" — prefer the built‑in trigger; it handles nulls and multi‑field concatenation automatically.

---

## Task Definitions

### [ ] P1-INTEG-1: Build Inngest function for Quote‑to‑Cash — on `crm/deal.won` → auto‑create invoice

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No cross‑module automation exists. When a deal is marked as won in CRM, there is no automatic invoicing. Sales reps must manually switch to the Finance module and create an invoice from scratch, duplicating deal data. The Inngest infrastructure (P0‑INNGEST), CRM event emission (P1‑CRM‑TRPC‑7), and finance tRPC procedures (P1‑FIN‑TRPC‑3) all exist independently but are not connected.
**Size:** Medium

**Description:**
Create `apps/web/src/server/inngest/functions/crm/deal-won.ts` — an Inngest function triggered by `crm/deal.won` that durably creates an AR invoice, following the Inngest fan‑out pattern with `step.run()` for memoized, retry‑safe execution.

**(a) Function definition**:
```typescript
export const dealWonToInvoice = inngest.createFunction(
  {
    id: 'deal-won-to-invoice',
    triggers: [crmDealWon],
  },
  async ({ event, step }) => {
    const { dealId, orgId, userId, value } = event.data;

    // Step 1: Fetch deal details (memoized)
    const deal = await step.run('fetch-deal', async () => {
      return await getDealById(dealId, orgId);
    });

    // Step 2: Create invoice from deal data (memoized, retry-safe)
    const invoice = await step.run('create-invoice', async () => {
      return await createInvoice({
        orgId,
        customerName: deal.contactName || deal.companyName,
        customerEmail: deal.contactEmail,
        lineItems: [{
          description: `Deal: ${deal.name}`,
          amountCents: deal.valueCents,
        }],
        dueDate: addDays(new Date(), 30),
        notes: `Auto‑generated from won deal #${deal.dealNumber}`,
        createdBy: userId,
      });
    });

    // Step 3: Record the invoice creation in activity log
    await step.run('log-activity', async () => {
      await createActivity({
        orgId,
        entityType: 'crm.deal',
        entityId: dealId,
        type: 'note',
        subject: 'Invoice auto‑created',
        body: `Invoice ${invoice.invoiceNumber} was automatically created for $${(deal.valueCents / 100).toFixed(2)}`,
        performedBy: 'system',
      });
    });

    return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
  }
);
```

**(b) Durable Execution**: Each `step.run()` is independently memoized. If `create‑invoice` fails (e.g., chart of accounts not configured for the org), Inngest retries only that step — `fetch‑deal` returns its cached result instantly.  If the function crashes after invoice creation but before `log‑activity`, the invoice is NOT re‑created on retry (step memoization), and the activity log is eventually written.

**(c) Error Handling**: If the invoice can't be created (e.g., no revenue account configured), the function logs a warning and creates an activity note: "Automatic invoice creation failed: [reason]. Please manually create an invoice for this deal." The function does NOT retry indefinitely — it surfaces the error.

**(d) Alternative Path**: Add an `autoCreateInvoice` boolean to the `crm/deal.won` event payload. Sales reps can opt out of auto‑invoicing when marking a deal won (e.g., for deals that need custom invoicing).

**Research Findings (2026‑05‑06):**
- Inngest `step.run()` is memoized — if the function restarts, completed steps return cached results 
- Fan‑out pattern: one event triggers multiple independent functions in parallel 
- `step.invoke()` for calling other Inngest functions and waiting for results 
- `step.sendEvent()` for fire‑and‑forget (used to trigger notification dispatcher) 

**Depends on:**
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-2` (serve handler mounted)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-3` (event registry)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-7` (CRM event emission — `crm/deal.won`)
- `tasks/phase-1/P1-FIN.md → P1-FIN-TRPC-3` (AR invoice creation procedures)

**Blocks:**
- `tasks/phase-1/P1-INTEG.md → P1-TEST-SMOKE` (cross‑module smoke test)

**Related Files:**
- `apps/web/src/server/inngest/functions/crm/deal-won.ts` (new)
- `apps/web/src/server/inngest/functions/index.ts` (add to barrel export)

**Definition of Done**
- [ ] `deal-won.ts` Inngest function created with id `'deal-won-to-invoice'`
- [ ] Triggers on `crm/deal.won` event
- [ ] Uses `step.run()` for all external operations (fetch deal, create invoice, log activity)
- [ ] Auto‑creates invoice with line items from deal value
- [ ] Logs activity on the deal when invoice is created (or when creation fails)
- [ ] Registered in functions barrel and served via `/api/inngest`
- [ ] Tested: mark a deal won → invoice appears in AR invoice list
- [ ] Tested: invoice creation failure → error activity logged on deal
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Mark a deal as won via tRPC
curl -X POST http://localhost:3000/api/trpc/crm.deals.markWon \
  -d '{"dealId": "...", "wonReason": "Signed contract"}'

# Check Inngest dashboard
open http://localhost:8288
# Verify: 'deal-won-to-invoice' function run appears

# Verify invoice created
curl http://localhost:3000/api/trpc/finance.invoices.list
# Expected: new invoice with deal name appears

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: Quote‑to‑Cash is a cross‑bounded‑context saga. CRM emits `deal.won` as an integration event; Finance handles it by creating an invoice. The saga is orchestrated by Inngest, keeping domains decoupled.
- BDD: As a sales manager, when I mark a deal as won, an invoice is automatically created in Finance without me needing to re‑enter all the deal details.

---

#### Subtasks

- [ ] P1-INTEG-1.0.25 (AGENT): Read P1‑CRM‑TRPC‑7 event types and P1‑FIN‑TRPC‑3 invoice creation API. Research Inngest `step.run()` patterns.
  **Verification:** APIs and patterns documented.

- [ ] P1-INTEG-1.0.5 (AGENT): Design the Quote‑to‑Cash workflow: step sequence, error handling, alternative path (opt‑out flag).
  **Verification:** Workflow design documented.

- [ ] P1-INTEG-1.1 (AGENT): Create `deal-won.ts` Inngest function with `step.run()` for deal fetch, invoice creation, and activity logging.
  **File(s):** `apps/web/src/server/inngest/functions/crm/deal-won.ts` (new)
  **Verification:** Function compiles and is discoverable by Inngest Dev Server.

- [ ] P1-INTEG-1.2 (AGENT): Add function to barrel export.
  **File(s):** `apps/web/src/server/inngest/functions/index.ts`
  **Verification:** Function served via `/api/inngest`.

- [ ] P1-INTEG-1.3 (AGENT): Test end‑to‑end: mark deal won → invoice created → activity logged.
  **Verification:** Full pipeline functional.

- [ ] P1-INTEG-1.4 (HUMAN): Test with Inngest Dev Server, verify observability. Approve.
  **Verification:** Approved.

---

### [ ] P1-INTEG-2: Build Inngest function — on `document/uploaded` → attach to related CRM deal/project via entity_links

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** Documents uploaded through the application are not linked to any CRM or project context. If a user uploads a contract from a deal page, the document appears in the Documents module but has no association with the deal.
**Size:** Small

**Description:**
Create `apps/web/src/server/inngest/functions/documents/auto-link.ts` — an Inngest function triggered by `document/uploaded` that checks if the upload context includes a source entity reference and automatically creates an `entity_link`.

**(a) Event payload enrichment**: The `document/uploaded` event (from P1‑DOCS‑TRPC‑7) includes optional `sourceEntityType` and `sourceEntityId` fields. When a document is uploaded from a CRM deal detail page, these fields are populated.

**(b) Function logic**:
```typescript
export const autoLinkDocument = inngest.createFunction(
  {
    id: 'auto-link-document',
    triggers: [documentUploaded],
  },
  async ({ event, step }) => {
    const { documentId, orgId, sourceEntityType, sourceEntityId } = event.data;
    
    // Only link if context was provided
    if (!sourceEntityType || !sourceEntityId) return;
    
    await step.run('create-entity-link', async () => {
      await createEntityLink({
        orgId,
        entityType: 'documents.document',
        entityId: documentId,
        targetType: sourceEntityType,
        targetId: sourceEntityId,
        linkType: 'attachment',
      });
    });
  }
);
```

**(c) Supported sources**: CRM contacts, CRM deals, CRM companies, Projects, Invoices, Bills. Any entity that has a document upload widget can pass its type and ID in the upload context.

**(d) Idempotency**: The `entity_links` table has a UNIQUE constraint on `(org_id, entity_type, entity_id, target_type, target_id, link_type)`. Duplicate links are silently ignored.

**Research Findings (2026‑05‑06):**
- Inngest functions can fire on events and be entirely idempotent
- entity_links UNIQUE constraint prevents duplicates
- Optional source context in event payload enables context‑aware linking

**Depends on:**
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-TRPC-7` (document/uploaded event)
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-2` (entity_links table)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-1` (Inngest function pattern)

**Related Files:**
- `apps/web/src/server/inngest/functions/documents/auto-link.ts` (new)

**Definition of Done**
- [ ] `auto-link.ts` Inngest function created
- [ ] Creates entity_link when source context is provided
- [ ] Silently skips when no source context
- [ ] Idempotent — duplicate links ignored
- [ ] Registered in functions barrel
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Upload a document from a deal detail page (with dealId in context)
# Verify: document appears linked in the deal's attachments section
# Upload a document from the main repository (no context)
# Verify: no entity_link created (no error)
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, when I upload a signed contract from a deal page, it automatically appears in the deal's attachments without me manually linking it.

---

#### Subtasks

- [ ] P1-INTEG-2.0.25 (AGENT): Read entity_links schema and document/uploaded event type.
  **Verification:** Schema and event understood.

- [ ] P1-INTEG-2.1 (AGENT): Create `auto-link.ts` Inngest function.
  **File(s):** `apps/web/src/server/inngest/functions/documents/auto-link.ts` (new)
  **Verification:** Function compiles and is discoverable.

- [ ] P1-INTEG-2.2 (AGENT): Test with and without source context.
  **Verification:** Context‑aware linking works.

- [ ] P1-INTEG-2.3 (HUMAN): Verify linked documents appear in deal/project attachments. Approve.
  **Verification:** Approved.

---

### [ ] P1-INTEG-3: Set up PostgreSQL full‑text search (GIN indexes) across all domain tables for global search

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No full‑text search indexes exist on any domain table. Search across CRM entities uses ILIKE, which requires full table scans and doesn't support relevance ranking. Documents have a `search_vector` column with a GIN index (set up in P1‑DOCS‑SCHEMA‑1), but other domains (CRM, Projects, Finance) have no FTS infrastructure. Cross‑domain search is impossible without manually querying each table separately.
**Size:** Large

**Description:**
Add `search_vector` tsvector columns, GIN indexes, and auto‑update triggers to all searchable domain tables across CRM, Projects, and Finance, following the Team‑Proovy Korean production pattern and the PHP.cn best practice of using the built‑in `tsvector_update_trigger`.

**(a) Tables to index and their source columns**:

| Table | Source Columns | Search Configuration |
|---|---|---|
| `crm_contacts` | `first_name`, `last_name`, `email`, `title`, `department` | `pg_catalog.english` |
| `crm_companies` | `name`, `industry`, `website` | `pg_catalog.english` |
| `crm_deals` | `name` | `pg_catalog.english` |
| `crm_leads` | `name`, `email` | `pg_catalog.english` |
| `projects` | `name`, `description` | `pg_catalog.english` |
| `tasks` | `title`, `description` | `pg_catalog.english` |
| `invoices` | `customer_name`, `customer_email`, `notes` | `pg_catalog.english` |
| `bills` | `memo`, `terms` (and vendor name via JOIN) | `pg_catalog.english` |
| `vendors` | `name`, `contact_name`, `email` | `pg_catalog.english` |

**(b) SQL pattern per table** (example for `crm_contacts`):
```sql
-- Add tsvector column
ALTER TABLE crm_contacts ADD COLUMN search_vector tsvector;

-- Create GIN index
CREATE INDEX idx_crm_contacts_search ON crm_contacts USING GIN (search_vector);

-- Create trigger for auto‑update
CREATE TRIGGER trg_crm_contacts_search_vector
  BEFORE INSERT OR UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', first_name, last_name, email, title, department);
```

**(c) Drizzle schema updates**: Each domain schema file gets:
- A `search_vector: tsvector('search_vector')` column added to the table definition
- The trigger and index defined in the migration SQL (triggers and GIN indexes are better expressed in raw SQL than in Drizzle's schema DSL)

**(d) Migration**: A single migration file adds all columns, indexes, and triggers. The migration uses `ALTER TABLE ... ADD COLUMN` and `CREATE INDEX IF NOT EXISTS` for idempotent application.

**(e) Backfill**: For existing rows, a one‑time `UPDATE` statement populates the `search_vector` after the trigger is created:
```sql
UPDATE crm_contacts SET search_vector = to_tsvector('pg_catalog.english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(title, '') || ' ' || coalesce(department, ''));
```
After backfill, the trigger handles all future INSERT/UPDATE operations automatically.

**Research Findings (2026‑05‑06):**
- PostgreSQL official docs: GIN index with `to_tsvector('english', body)` — only 2‑argument version usable in expression indexes 
- Alibaba Cloud: `tsvector_update_trigger_column()` for per‑row config 
- PHP.cn: 优先使用内置 `tsvector_update_trigger`; 它已处理空值、类型转换、多字段拼接 — prefer built‑in; it handles nulls and type casting 
- Korean production pattern: search_vector 컬럼 추가 → GIN 인덱스 생성 → 트리거 함수 생성 
- Alibaba Cloud GIN guide: "For large tables, use a GIN index to speed up tsvector queries" 

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3` (CRM migration applied)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SCHEMA-2` (Projects migration applied)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-SCHEMA-2` (Documents migration applied — `search_vector` already added)
- `tasks/phase-1/P1-FIN.md → P1-FIN-SCHEMA-3` (Finance migration applied)
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (programmatic migration)

**Blocks:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-4` (global search tRPC procedure)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-5` (global search UI)

**Related Files:**
- `packages/db/src/schema/crm.ts` (add search_vector columns)
- `packages/db/src/schema/projects.ts` (add search_vector columns)
- `packages/db/src/schema/finance.ts` (add search_vector columns)
- `packages/db/drizzle/` (new migration)

**Definition of Done**
- [ ] `search_vector` tsvector columns added to all 9 domain tables
- [ ] GIN indexes created on all `search_vector` columns
- [ ] `BEFORE INSERT OR UPDATE` triggers created for auto‑update on all 9 tables
- [ ] Existing data backfilled via one‑time UPDATE
- [ ] Migration generated, reviewed, applied, and committed
- [ ] Verify: INSERT a new CRM contact → `search_vector` auto‑populated
- [ ] Verify: UPDATE a project name → `search_vector` auto‑updated
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Multi‑language search configurations (English only for Phase 1)
- `pg_trgm` extension for trigram fuzzy matching (Phase 2 enhancement)
- Field‑weighted tsvectors (`setweight`) — defer to global search procedure (P1‑INTEG‑4)

**Rules to Follow**
- Always use the built‑in `tsvector_update_trigger` — never hand‑roll trigger functions.
- GIN indexes must use the 2‑argument `to_tsvector('pg_catalog.english', ...)` for expression index compatibility.
- Backfill must happen AFTER triggers are created to avoid double‑work.
- The migration must be idempotent: use `IF NOT EXISTS` on indexes and `DROP TRIGGER IF EXISTS ... CREATE TRIGGER` for triggers.

**Verification**
```bash
# Generate migration
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate
DATABASE_URL=$DATABASE_URL pnpm db:migrate

# Verify columns
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'search_vector';"

# Verify GIN indexes
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'crm_contacts' AND indexdef LIKE '%gin%';"

# Verify triggers
psql $DATABASE_URL -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%search_vector%';"

# Verify auto‑update
psql $DATABASE_URL -c "INSERT INTO crm_contacts (id, org_id, first_name, last_name) VALUES (gen_random_uuid(), '...', 'Test', 'User') RETURNING search_vector;"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure — enables P1‑INTEG‑4 and P1‑INTEG‑5)

---

#### Subtasks

- [ ] P1-INTEG-3.0.25 (AGENT): Read all domain schema files and existing document search_vector implementation. Catalog current FTS state.
  **Verification:** FTS gap analysis documented.

- [ ] P1-INTEG-3.0.5 (AGENT): Design tsvector column additions, trigger definitions, and migration strategy for all 9 tables.
  **Verification:** Design documented.

- [ ] P1-INTEG-3.1 (AGENT): Add `search_vector` columns to Drizzle schema definitions in crm.ts, projects.ts, finance.ts.
  **File(s):** `packages/db/src/schema/crm.ts`, `projects.ts`, `finance.ts`
  **Verification:** Schema compiles with new columns.

- [ ] P1-INTEG-3.2 (AGENT): Write migration SQL with ALTER TABLE ADD COLUMN, CREATE INDEX (GIN), CREATE TRIGGER, and backfill UPDATE for all 9 tables.
  **File(s):** `packages/db/drizzle/` (new migration)
  **Verification:** Migration applies without errors.

- [ ] P1-INTEG-3.3 (AGENT): Apply migration and verify trigger functionality on all tables.
  **Verification:** INSERT and UPDATE auto‑populate search_vector.

- [ ] P1-INTEG-3.4 (HUMAN): Review all triggers, GIN indexes, and backfill. Approve.
  **Verification:** Approved.

---

### [ ] P1-INTEG-4: Build global search tRPC procedure (federated query across domains)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No global search exists. The CRM search procedure (P1‑CRM‑TRPC‑6) is limited to CRM entities. There is no way to search across Projects, Documents, and Finance from a single query.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/search.ts` with a single `search.global` procedure that federates search across all domain tables using `UNION ALL` with `websearch_to_tsquery` and `ts_rank` ranking.

**(a) `search.global` procedure**:
- **Input**: `{ query: string, entityTypes?: string[], limit?: number, offset?: number }`
- **Output**: `{ results: SearchResult[], totalCount: number }` where `SearchResult = { entityType, entityId, title, subtitle, snippet, url, rank }`

**(b) Query pattern** (simplified — each sub‑query is a SELECT on one table):
```sql
SELECT 
  'crm.contact' AS entity_type,
  id AS entity_id,
  (first_name || ' ' || last_name) AS title,
  email AS subtitle,
  ts_headline('pg_catalog.english', first_name || ' ' || last_name || ' ' || coalesce(email, ''), websearch_to_tsquery('pg_catalog.english', $1)) AS snippet,
  '/crm/contacts/' || id AS url,
  ts_rank(search_vector, websearch_to_tsquery('pg_catalog.english', $1)) AS rank
FROM crm_contacts
WHERE search_vector @@ websearch_to_tsquery('pg_catalog.english', $1)
  AND org_id = $2

UNION ALL

-- ... repeat for crm_companies, crm_deals, crm_leads, projects, tasks, documents, invoices, bills, vendors
ORDER BY rank DESC
LIMIT $3 OFFSET $4
```

**(c) Ranking normalization**: Because `ts_rank` produces different score ranges across tables (different document sizes), apply a simple normalization: divide each sub‑query's rank by the maximum rank within that sub‑query using a window function, or apply per‑table weights. For Phase 1, the raw `ts_rank` is sufficient — results are ordered by relevance within each table's context.

**(d) `entityTypes` filter**: When provided, only include sub‑queries for the specified entity types. When omitted (`undefined`), search all tables.

**(e) `websearch_to_tsquery`**: Uses user‑friendly syntax — supports quoted phrases (`"exact match"`), OR (`term1 OR term2`), and dash‑style exclusion (`-exclude`).  The Synapse production pattern confirms: "If on PostgreSQL 11+, pass the user input to `websearch_to_tsquery`." 

**(f) ILIKE fallback**: When `search_vector` is NULL (e.g., rows before backfill, or the column hasn't been populated), fall back to ILIKE on the source text columns. The fallback produces lower‑ranked results and is transparent to the caller.

**(g) Performance**: With GIN indexes on all `search_vector` columns (P1‑INTEG‑3), each sub‑query uses an index scan. The `UNION ALL` with `ORDER BY rank DESC LIMIT` allows PostgreSQL to push the limit into each sub‑query via a top‑N heapsort or incremental merge.

**Research Findings (2026‑05‑06):**
- `websearch_to_tsquery` for user‑friendly search (quoted phrases, OR, exclusion) 
- `ts_rank` for relevance scoring 
- `ts_headline` for highlighted snippets 
- UNION ALL with per‑table ranking — possible but needs normalization 

**Depends on:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-3` (GIN indexes and triggers on all tables)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-8` (root router)

**Blocks:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-5` (global search UI)

**Related Files:**
- `apps/web/src/server/trpc/routers/search.ts` (new)
- `apps/web/src/server/trpc/routers/_app.ts` (add search router)

**Definition of Done**
- [ ] `search.ts` router created with `search.global` procedure
- [ ] Federated query across CRM, Projects, Documents, Finance tables via UNION ALL
- [ ] Uses `websearch_to_tsquery` for user‑friendly query syntax
- [ ] Results ranked by `ts_rank` with `ts_headline` snippets
- [ ] `entityTypes` filter support
- [ ] ILIKE fallback for NULL search_vector rows
- [ ] Pagination via `limit`/`offset`
- [ ] Registered in root app router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Search across all domains
curl "http://localhost:3000/api/trpc/search.global?input={\"query\":\"acme\"}"
# Verify: results from CRM contacts, companies, deals, projects, documents, invoices, vendors

# Search with entity filter
curl "http://localhost:3000/api/trpc/search.global?input={\"query\":\"contract\",\"entityTypes\":[\"crm.deal\",\"documents.document\"]}"
# Verify: only deals and documents

# Test websearch syntax
curl "http://localhost:3000/api/trpc/search.global?input={\"query\":\"acme OR globex\"}"
# Verify: results matching either term

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can type "Acme contract" into the global search bar and instantly see the Acme company record, related deals, the signed contract PDF, and associated invoices — all ranked by relevance and grouped by module.

---

#### Subtasks

- [ ] P1-INTEG-4.0.25 (AGENT): Read P1‑INTEG‑3 output, CRM search procedure, and PostgreSQL FTS documentation. Design the federated query.
  **Verification:** Query design documented.

- [ ] P1-INTEG-4.0.5 (AGENT): Research `websearch_to_tsquery`, `ts_rank`, `ts_headline`, and UNION ALL ranking normalization.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-INTEG-4.1 (AGENT): Create `search.ts` router with `search.global` procedure supporting all entity types.
  **File(s):** `apps/web/src/server/trpc/routers/search.ts` (new)
  **Verification:** Cross‑domain search functional.

- [ ] P1-INTEG-4.2 (AGENT): Register in root app router.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Search procedure accessible.

- [ ] P1-INTEG-4.3 (HUMAN): Test search with various queries, entity filters, websearch syntax, pagination. Approve.
  **Verification:** Approved.

---

### [ ] P1-INTEG-5: Build global search UI (command palette results grouped by module)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The existing command palette (`CommandPalette.tsx`) only navigates to pages. CRM search integration was added in P1‑CRM‑UI‑9, but only for CRM results. There is no cross‑domain global search UI.
**Size:** Medium

**Description:**
Enhance the existing command palette and build a `useGlobalSearch` hook to provide cross‑domain search directly from the command palette, following the vedovelli #407 pattern with 300ms debounce and TanStack Router query param sync.

**(a) `useGlobalSearch` hook** (`apps/web/src/hooks/useGlobalSearch.ts`):
- Uses TanStack Query with `queryKey: ['search', debouncedQuery, entityTypes]`
- 300ms debounce on input before firing query (following )
- Returns: `{ results, isLoading, isFetching, error, totalCount, hasMore }`
- TanStack Router integration via `useSearch` and `useNavigate` to sync `?q=term&type=entityType` to URL

**(b) Command palette integration** (`apps/web/src/components/CommandPalette.tsx`):
- When user types in the command palette, call `search.global` via `useGlobalSearch`
- Show results grouped by module under headings: "CRM", "Projects", "Documents", "Finance"
- Each result shows: entity type icon (using Lucide icons distinct per type), title, subtitle, and highlighted snippet
- Navigation: Enter or click → navigates to the entity's detail page using `router.navigate({ to: result.url })`
- Limit to top 5 results per module in the palette (configurable)
- "See all results" link at the bottom → navigates to a dedicated search page (or opens expanded view)

**(c) Module grouping icons**:

| Module | Icon |
|---|---|
| CRM (Contact) | `User` |
| CRM (Company) | `Building2` |
| CRM (Deal) | `Handshake` |
| CRM (Lead) | `Users` |
| Projects | `FolderKanban` |
| Tasks | `CheckSquare` |
| Documents | `FileText` |
| Finance (Invoice) | `Receipt` |
| Finance (Bill) | `CreditCard` |
| Finance (Vendor) | `Truck` |

**(d) Empty state**: No results → "No results found for 'query'. Try a different search term."

**(e) Performance**: Results from `search.global` are cached by TanStack Query with 60s stale time (following ). The debounce prevents excessive API calls while typing.

**Research Findings (2026‑05‑06):**
- vedovelli #407: `useGlobalSearch` hook with 300ms debounce, TanStack Router query param sync, stale time 60s 
- Debounce best practice: "debounce compresses 10 API calls into 1" 

**Depends on:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-4` (global search tRPC procedure)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-9` (CRM search groundwork — extend to all domains)

**Related Files:**
- `apps/web/src/hooks/useGlobalSearch.ts` (new)
- `apps/web/src/components/CommandPalette.tsx` (enhance)

**Definition of Done**
- [ ] `useGlobalSearch` hook with 300ms debounce and TanStack Query caching
- [ ] Command palette shows cross‑domain search results grouped by module
- [ ] Each result has entity type icon, title, subtitle, snippet
- [ ] Navigation to entity detail on selection
- [ ] TanStack Router query param sync (search query persisted in URL)
- [ ] Empty state for no results
- [ ] Keyboard navigation: Arrow keys to move between results, Enter to select, Escape to close
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Open command palette (cmd+K)
# Type "acme contract" → results from CRM companies, deals, documents, invoices
# Arrow down to a result → press Enter → navigates to entity detail
# Verify URL has ?q=acme+contract

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can press cmd+K, type "acme", and instantly see the Acme company, all related deals, the signed contract, and associated invoices — without knowing which module each belongs to.

---

#### Subtasks

- [ ] P1-INTEG-5.0.25 (AGENT): Read P1‑INTEG‑4 output and current CommandPalette implementation.
  **Verification:** Current state documented.

- [ ] P1-INTEG-5.1 (AGENT): Create `useGlobalSearch` hook with debounce, TanStack Query, and router sync.
  **File(s):** `apps/web/src/hooks/useGlobalSearch.ts` (new)
  **Verification:** Hook returns typed search results.

- [ ] P1-INTEG-5.2 (AGENT): Enhance command palette with cross‑domain results grouped by module.
  **File(s):** `apps/web/src/components/CommandPalette.tsx`
  **Verification:** Global search results appear in palette.

- [ ] P1-INTEG-5.3 (HUMAN): Test global search with various queries, keyboard navigation, router sync. Approve.
  **Verification:** Approved.

---

### [ ] P1-INTEG-6: Build in‑app notification system — activity_feed table, tRPC subscription for real‑time delivery

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No notification system exists beyond the static notification bell icon in the header. There is no activity tracking, no notification list, and no read/unread states. Users have no way to know about events that happened while they were away.
**Size:** Large

**Description:**
Build the in‑app notification system with database schema, tRPC procedures, and a frontend notification bell dropdown, following the Spin‑Forge activity model and the Mejba SaaS notification designer pattern.

**(a) Schema — `activityFeedTable`** (`packages/db/src/schema/notifications.ts`):
- `id` (UUID PK)
- `org_id` (UUID FK)
- `recipient_id` (UUID FK to users — who receives the notification)
- `actor_id` (UUID FK to users nullable — who performed the action, null for system)
- `action_type` (text NOT NULL — e.g., 'deal.won', 'task.assigned', 'document.uploaded', 'comment.mentioned')
- `entity_type` (text — e.g., 'crm.deal', 'projects.task')
- `entity_id` (UUID)
- `title` (text NOT NULL — e.g., "Deal won: Acme Contract")
- `body` (text — e.g., "John marked the Acme Corp deal as won for $50,000")
- `action_url` (text — deep link to the entity, e.g., '/crm/deals/xxx')
- `is_read` (boolean DEFAULT false)
- `is_archived` (boolean DEFAULT false)
- `created_at` (timestamptz DEFAULT NOW())
- Indexes: `(recipient_id, is_read, created_at)` for inbox queries, `(org_id, created_at)` for activity feeds

Following Spin‑Forge #27: "Activity Model: id, actor (User), action_type, target_type, target_id, created_at. Notification Model: id, recipient, actor, notification_type, message, is_read." 

**(b) tRPC procedures** (`apps/web/src/server/trpc/routers/notifications.ts`):
- `notifications.list` — query: paginated list for current user, filterable by read/unread, ordered by created_at DESC. Returns `{ items, unreadCount }`.
- `notifications.getUnreadCount` — query: returns `{ count: number }` for the badge
- `notifications.markRead` — mutation: mark a single notification as read
- `notifications.markAllRead` — mutation: mark all as read for current user
- `notifications.archive` — mutation: archive a notification (soft‑delete)
- `notifications.getPreferences` — query: current user's notification preferences
- `notifications.updatePreference` — mutation: update a preference

**(c) Notification bell component** — Enhance existing `Header.tsx` notification bell:
- Unread count badge with animation on new notifications
- Dropdown showing recent 5 notifications grouped by time: Today, Yesterday, Earlier
- Each notification: icon by type, title, body, relative timestamp ("2 hours ago"), action button (e.g., "View Deal")
- "Mark all as read" button
- "View all notifications" link → `/notifications` (future page, or settings)
- Empty state: "You're all caught up! 🎉"
- Polling: refetch unread count every 30 seconds (no WebSocket for Phase 1)

Following Mejba SaaS Notifications: "Notification Bell & Badge: unread count badge with animation, click behavior dropdown on desktop. Notification Dropdown: grouped by time (Today, Yesterday, This Week, Earlier), each notification has icon by type, title, description, timestamp, action button." 

**(d) Notification types and their icons/colors**:

| Action Type | Icon | Color | Example Title |
|---|---|---|---|
| `deal.won` | `Trophy` | Green | "Deal won: Acme Contract" |
| `deal.stageChanged` | `ArrowRightLeft` | Blue | "Deal moved: Acme → Proposal" |
| `task.assigned` | `UserPlus` | Indigo | "Task assigned: Design homepage" |
| `task.completed` | `CheckCircle` | Green | "Task completed: API integration" |
| `document.uploaded` | `Upload` | Orange | "New document: Q3 Report.pdf" |
| `document.shared` | `Share2` | Purple | "Document shared: Contract v2" |
| `invoice.paid` | `DollarSign` | Green | "Invoice paid: INV‑2026‑0042" |
| `bill.approved` | `ThumbsUp` | Blue | "Bill approved: Office Supplies" |
| `comment.mentioned` | `AtSign` | Yellow | "You were mentioned by John" |
| `member.added` | `UserPlus` | Indigo | "Added to project: Website" |
| `milestone.reached` | `Flag` | Green | "Milestone reached: Beta Launch" |

**Research Findings (2026‑05‑06):**
- Spin‑Forge: activity_feed table with actor/action_type/target, paginated API, notification bell with unread badge 
- Mejba: grouped by time, icon per type, action buttons, mark read (individual + bulk) 
- GetStream: read‑time aggregation (simple, works early) — no fan‑out‑on‑write needed for Phase 1 
- mindtrack #340: notifications table with user_id, type, title, body, read, created_at, link 
- Polling for Phase 1; WebSocket/SSE deferred to Phase 3

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1` (route structure)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-7` (notification dispatcher — creates the feed entries)

**Blocks:** [N/A]

**Related Files:**
- `packages/db/src/schema/notifications.ts` (new)
- `packages/db/src/schema/index.ts` (add re‑export)
- `apps/web/src/server/trpc/routers/notifications.ts` (new)
- `apps/web/src/server/trpc/routers/_app.ts` (add notifications router)
- `apps/web/src/components/layout/Header.tsx` (enhance notification bell)
- `apps/web/src/components/notifications/NotificationDropdown.tsx` (new)

**Definition of Done**
- [ ] `notifications.ts` schema created with `activityFeedTable` and migration applied
- [ ] tRPC procedures: list, getUnreadCount, markRead, markAllRead, archive, getPreferences, updatePreference
- [ ] Notification bell in header shows unread count badge with animation
- [ ] Notification dropdown grouped by time with icons, titles, body, timestamps, action buttons
- [ ] Mark as read (individual and bulk)
- [ ] "View all notifications" link
- [ ] Empty state: "You're all caught up!"
- [ ] Polling: unread count refetches every 30 seconds
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Verify schema
psql $DATABASE_URL -c "\dt activity_feed"

# Create a notification via tRPC (test)
# Verify notification appears in bell dropdown
# Click notification → marked as read → badge count decreases
# Click "Mark all as read" → all marked read → badge disappears

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, when I return to UBOS after a weekend, I see a notification bell with a count, and I can quickly scan what happened while I was away — deals won, tasks assigned, documents shared.

---

#### Subtasks

- [ ] P1-INTEG-6.0.25 (AGENT): Read existing notification patterns in the codebase. Research Spin‑Forge, Mejba, GetStream notification architectures.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-INTEG-6.1 (AGENT): Create `notifications.ts` schema with migration.
  **File(s):** `packages/db/src/schema/notifications.ts` (new), migration files
  **Verification:** Table created with indexes.

- [ ] P1-INTEG-6.2 (AGENT): Create notifications tRPC router with all procedures.
  **File(s):** `apps/web/src/server/trpc/routers/notifications.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-INTEG-6.3 (AGENT): Register in root app router and re‑export schema.
  **File(s):** `_app.ts`, `schema/index.ts`
  **Verification:** Notifications accessible.

- [ ] P1-INTEG-6.4 (AGENT): Build `NotificationDropdown` component and enhance header bell.
  **File(s):** `NotificationDropdown.tsx` (new), `Header.tsx`
  **Verification:** Notification bell functional.

- [ ] P1-INTEG-6.5 (HUMAN): Test notification creation, bell badge, dropdown, mark read, polling. Approve.
  **Verification:** Approved.

---

### [ ] P1-INTEG-7: Create notification dispatch Inngest function (listens to all domain events, creates feed entries)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No automated notification creation exists. The `activity_feed` table is empty. Domain events are emitted (CRM, Projects, Documents, Finance) but not consumed for notification purposes.
**Size:** Medium

**Description:**
Create `apps/web/src/server/inngest/functions/notifications/dispatcher.ts` — a single Inngest function that listens to ALL domain events and creates `activity_feed` rows for each, following the Inngest fan‑out pattern of "multiple triggers → single function"  and the JaredCH unified notification platform pattern of "event‑driven notification publishing, preference resolution, template formatting." 

**(a) Function triggers** — all domain events:
```typescript
triggers: [
  crmLeadCreated,       // crm/lead.created
  crmDealWon,           // crm/deal.won
  crmDealStageChanged,  // crm/deal.stageChanged
  crmContactCreated,    // crm/contact.created
  projectTaskAssigned,  // project/task.assigned
  projectTaskCompleted, // project/task.completed
  projectMilestoneReached, // project/milestone.reached
  documentUploaded,     // document/uploaded
  documentDeleted,      // document/deleted
  financeInvoicePaid,   // finance/invoice.paid
  financeInvoiceSent,   // finance/invoice.sent
  financeBillApproved,   // finance/bill.approved
  financeBillPaid,       // finance/bill.paid
]
```

**(b) Event‑to‑notification mapping**: For each event, the dispatcher determines:
- **Recipient(s)**: From event payload context (e.g., task assignee for task assigned, deal owner for deal won, project members for milestone reached)
- **Title template**: e.g., `"Deal won: {dealName}"`
- **Body template**: e.g., `"{actorName} marked the {dealName} deal as won for {value}"`
- **Action URL**: Deep link to the entity (e.g., `/crm/deals/{dealId}`)
- **Actor**: From event payload (who performed the action)

**(c) Preference check**: Before creating a notification, the dispatcher checks the recipient's notification preferences (stored via P1‑INTEG‑6). If the recipient has disabled notifications for that category/channel, skip creation.

**(d) Deduplication**: Use `(recipient_id, action_type, entity_type, entity_id)` as a logical dedup key. For rapid‑fire events (e.g., same deal updated twice in 30 seconds), group or throttle.

**(e) Fire‑and‑forget**: The dispatcher is triggered asynchronously by the event. Domain mutation procedures don't wait for notification creation.

**Research Findings (2026‑05‑06):**
- Inngest multiple triggers: "Use a single function to handle multiple event types" 
- Fan‑out: one event can trigger many functions, but also many events can trigger one function
- JaredCH #477: "Build a single orchestrator service handling recipient eligibility, dedupe/grouping, delivery channels, rate limits." 
- Spin‑Forge #27: "Trigger notifications for: comments, replies, feedback, content publishing." 

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-7` (CRM events)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-4` (Project events)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-TRPC-7` (Document events)
- `tasks/phase-1/P1-FIN.md → P1-FIN-TRPC-6` (Finance events)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-6` (activity_feed table and notification preferences)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-2` (Inngest serve handler)

**Related Files:**
- `apps/web/src/server/inngest/functions/notifications/dispatcher.ts` (new)
- `apps/web/src/server/inngest/functions/index.ts` (add to barrel)

**Definition of Done**
- [ ] `dispatcher.ts` Inngest function created with all 13 domain event triggers
- [ ] Event‑to‑notification mapping for all event types with templates
- [ ] Recipient resolution from event context
- [ ] Notification preference check before creation
- [ ] Deduplication for rapid‑fire events
- [ ] Registered in functions barrel
- [ ] Tested: trigger a domain event → notification appears in activity_feed
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Trigger a domain event (e.g., mark a deal as won)
# Check activity_feed table
psql $DATABASE_URL -c "SELECT * FROM activity_feed ORDER BY created_at DESC LIMIT 5;"
# Verify notification appears for the deal owner

# Check Inngest dashboard for dispatcher function run
open http://localhost:8288

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a project manager, when a developer completes a task, I automatically receive an in‑app notification without anyone manually sending it.

---

#### Subtasks

- [ ] P1-INTEG-7.0.25 (AGENT): Inventory all domain events from CRM, Projects, Documents, Finance — catalog payloads and recipient contexts.
  **Verification:** Event inventory documented.

- [ ] P1-INTEG-7.0.5 (AGENT): Design event‑to‑notification mapping with templates, recipient resolution, and dedup strategy.
  **Verification:** Mapping table documented.

- [ ] P1-INTEG-7.1 (AGENT): Create `dispatcher.ts` Inngest function with all 13 triggers.
  **File(s):** `apps/web/src/server/inngest/functions/notifications/dispatcher.ts` (new)
  **Verification:** Function compiles and is discoverable.

- [ ] P1-INTEG-7.2 (AGENT): Add to functions barrel.
  **File(s):** `apps/web/src/server/inngest/functions/index.ts`
  **Verification:** Function served via `/api/inngest`.

- [ ] P1-INTEG-7.3 (HUMAN): Trigger each event type, verify notifications created correctly, test dedup. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P1‑INTEG group are covered.*