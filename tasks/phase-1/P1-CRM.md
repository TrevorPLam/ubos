# tasks/phase-1/P1-CRM.md — Customer Relationship Management

This file covers database schema extension for all CRM entities (contacts, companies, deals, activities, pipelines, pipeline_stages, custom_fields), the polymorphic `entity_links` junction table for cross-domain attachments, tRPC CRUD routers with event emission, kanban board UI with drag‑and‑drop via `@dnd-kit`, contact import with CSV parsing and column mapping, full‑text search across CRM entities, and the complete UI suite for list/detail/board views. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑CRM (2026‑05‑06)

### 1. CRM Database Schema Architecture — The 2026 Consensus

The canonical CRM schema for PostgreSQL + Drizzle ORM in 2026 follows a **relational core with JSONB extension points**. Multiple production CRM implementations converge on the same architecture:

- **NocoBase Custom CRM Guide (2026‑03‑12)**: PostgreSQL is the standard because "it simultaneously provides: relational modeling (Foreign Key, Constraint), transaction consistency (ACID), and JSONB flexible field extension. This allows PostgreSQL to achieve a good balance between data consistency, query performance, and system extensibility."

- **Drizzle ORM 2026 Guide (ecosire.com, 2026‑03‑19)**: "Ce guide couvre tout, de la configuration initiale aux modèles de production, en s'appuyant sur une base de code contenant plus de 65 fichiers de schéma Drizzle." The guide demonstrates the use of `pgTable` with `foreignKey()` and `references()` for relational integrity.

- **Monsoft-Solutions/crm #83 (2026‑02‑19)**: Real‑world Drizzle schema migration for CRM — "Create contact_message Drizzle table schema with new enums - Generate and write SQL migration to: Create the new table, Copy data from contact_sms_message."

The UBOS CRM schema extends the existing `crm.ts` which already has `crmCompaniesTable`, `crmContactsTable`, `crmDealsTable`, and `crmLeadsTable` with RLS and organization scoping. The Phase 1 schema adds activities, pipelines, pipeline_stages, custom_fields, and entity_links.

### 2. Custom Fields — JSONB Pattern Over EAV

The 2026 consensus overwhelmingly favors **JSONB columns** over Entity-Attribute-Value (EAV) for CRM custom fields:

- **troykelly/openclaw-projects #1577 (2026‑02‑22)**: "JSONB column chosen over separate table for simplicity (no joins needed). Array format `[{"key": "...", "value": "..."}]` matches Google's userDefined structure. Max 50 custom fields per contact enforced by CHECK constraint. NOT NULL DEFAULT '[]' is metadata-only in PostgreSQL 11+ (no table rewrite). GIN index enables queries like 'find contacts with loyalty number ABC123'."

- **Anand Chowdhary CRM Schema Design (2025)**: "If you want users to define their own record types, custom fields, and relations, you need a different schema design. `data JSONB` → entire payload of custom attributes. Why JSONB? Easy whole-object storage, fast patching, and flexible schemas per tenant."

- **PostgreSQL JSONB Guide (Grizzly Peak Software, 2026‑02‑13)**: "JSONB is the preferred PostgreSQL option for semi-structured data such as settings, event payloads, flexible attributes, and API responses."

For UBOS, the custom_fields pattern applies to **all CRM entities** (contacts, companies, deals, leads). Each entity gets a `custom_fields JSONB` column with a GIN index and application‑level validation.

### 3. Kanban Board — `@dnd-kit` is the 2026 Standard

`@dnd-kit` has definitively replaced `react-beautiful-dnd` (now deprecated) as the React drag‑and‑drop library of choice:

- **marmelab.com Kanban Tutorial (2026‑01‑15)**: Comprehensive tutorial using shadcn/ui + `@hello-pangea/dnd` for kanban boards. "We'll build a Trello-like board application... Drag and drop cards between columns... See instant UI updates without waiting for the server."

- **ihanikos/the-best-nextjs-app #33 (2026‑02‑12)**: "Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities - Create KanbanBoard component with drag-and-drop."

- **motosan-dev/sage-dash #5 (2026‑03‑19)**: Real production kanban pattern: "Kanban board connected to GET /api/v1/clients + PATCH /api/v1/clients/:id/stage. Dependencies: @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities. Drag client card between columns → call moveStage()."

- **techinterview.org Performance Guide (2026‑05‑05)**: "For boards with hundreds of cards, virtualize columns. dnd-kit + react-window can compose, though it requires care to avoid drag handlers conflicting with virtualization."

- **@object-ui/plugin-kanban (2026‑02‑16)**: Lazy‑loaded kanban using `@dnd-kit`, automatically creates separate chunks for the heavy dnd-kit libraries. "The @dnd-kit libraries are only downloaded when a kanban component is actually rendered, not on initial page load."

**For UBOS**, the kanban board uses `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` with lazy loading to avoid increasing the initial bundle. The `onDragEnd` callback triggers a tRPC mutation to update the lead/deal stage with an optimistic update.

### 4. Activity Timeline — Unified Feed Pattern

The 2026 standard for CRM activity views is the **unified timeline**:

- **Twiddio/Recon-CRM #101 (2026‑03‑17)**: "Accounts and Contacts use the `UnifiedTimeline` component which merges activities (calls, emails, meetings, tasks), notes, and audit logs into a single chronological feed with date grouping, actor avatars, color-coded entry types, and pagination."

- **CRM Dashboard Templates Guide (2026‑04‑03)**: "A list of names isn't contact management. You need individual contact detail views with communication history, associated deals, tasks, notes, and tags."

The unified timeline approach means **all activity types** (calls, emails, meetings, notes, tasks, audit log entries) are stored in a single `activities` table with a `type` discriminator, rather than separate tables per activity type. This simplifies querying and enables chronological merging across types.

### 5. Full‑Text Search — PostgreSQL tsvector + GIN

The 2026 consensus for search in PostgreSQL‑based CRMs:

- **PostgreSQL Official Docs (2026‑02‑26)**: "Practical use of text searching usually requires creating an index. We can create a GIN index to speed up text searches."

- **dev.to FTS Guide (2026‑03‑24)**: "GIN (Generalized Inverted Index) is the standard index type for full-text search. The setup is straightforward: add a tsvector column, create a GIN index, write a trigger to keep it updated and use websearch_to_tsquery for your search endpoint."

- **alibabacloud Trigger Functions (2026‑03‑27)**: "tsvector_update_trigger_column() — Automatically updates a tsvector column from one or more plain-text source columns."

- **PHP.cn FTS Guide (2026‑05‑05)**: "优先使用内置 tsvector_update_trigger，它已处理空值、类型转换等边界；需字段加权时才用自定义函数；GIN索引应建在tsv列上以避免重复解析开销." — prefer the built‑in trigger; it handles nulls and type casting; only write custom functions when field weighting is needed.

For UBOS CRM search: each searchable entity gets a `search_vector tsvector` column with a GIN index, auto‑updated via PostgreSQL trigger. The search tRPC procedure uses `websearch_to_tsquery` for user‑friendly query syntax and `UNION ALL` for cross‑entity search with ranking.

### 6. CSV Contact Import — The 2026 Pattern

The established flow for CSV imports in 2026:

- **CSVBox Guide (2026‑03‑30)**: "In 2026, reliable CSV imports still boil down to a simple flow: file → map → validate → submit. Keep deduplication, normalization, and persistence logic on the server where you control business rules and DB constraints."

- **Dromo.io Best Importer (2026‑03‑06)**: "Most open-source CSV libraries handle parsing but not column mapping, validation, or error correction, leaving the hardest 80% to you."

- **Dev.to ImportKit (2026‑02‑05)**: "Users have different column names ('Email' vs 'email_address'). You need a UI for column mapping. Error handling has to be clear enough that non-technical users can fix their file."

- **PapaParse (2026‑04‑08)**: "Its chunking, worker support, and auto-detection make it unmatched for frontend CSV parsing. It excels at handling large files efficiently through web workers and chunked streaming."

**For UBOS**: Use PapaParse for client‑side CSV parsing, build a column mapping UI, validate on the server, detect duplicates by email, and provide clear error feedback.

### 7. Inngest Event‑Driven CRM Patterns

- **Inngest Free API Guide (2026‑03‑28)**: "Event-driven — trigger functions from events. Durable execution — survives crashes and restarts. Step functions — multi-step workflows with automatic retries."

- **Inngest Durable AI Agent Blog (2026‑03‑17)**: "step.run() — Execute a unit of work durably. Each step.run() is memoized: if the function resumes after a failure, completed steps return their cached results instantly." This is the pattern used for Quote‑to‑Cash: deal won → create invoice.

**For UBOS**: CRM mutations emit typed Inngest events (`crm/lead.created`, `crm/deal.won`, `crm/contact.created`). These drive cross‑module workflows like Quote‑to‑Cash (P1‑INTEG‑1).

### 8. TanStack Query Optimistic Updates — The Canonical Pattern

- **Boykai/github-workflows #4774 (2026‑03‑20)**: "The fix adds TanStack Query's optimistic update pattern (onMutate → snapshot → rollback on error) to every user-facing mutation."

- **Dev.to Optimistic Updates Guide (2026‑04‑07)**: "Always snapshot before mutating. Always rollback on error with user-visible feedback. Always eventually sync with server truth (onSettled invalidation)."

- **Zenn.dev Practical Patterns (2026‑03‑05)**: `useMutation` の `onMutate`、`onError`、`onSettled` の3つのコールバックを組み合わせて実装します。

This pattern is already implemented in the UBOS CRM leads module and extends to all Phase 1 CRM mutations.

---

## Task Definitions

### [ ] P1-CRM-SCHEMA-1: Define and migrate complete CRM tables (contacts, companies, deals, activities, pipelines, pipeline_stages, custom_fields)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The existing `packages/db/src/schema/crm.ts` defines `crmCompaniesTable`, `crmContactsTable`, `crmDealsTable`, and `crmLeadsTable` with basic columns and RLS policies. However, only the leads table has full CRUD procedures. The contacts, companies, and deals tables exist but are not used by any tRPC procedures beyond the schema definition. Missing entirely: activities table (call logs, emails, meetings, notes), pipelines and pipeline_stages tables (configurable sales stages), and custom_fields definitions for flexible user‑defined fields on CRM entities.
**Size:** Large

**Description:**
Extend the existing CRM schema with all tables needed for a complete CRM system, following the 2026 consensus architecture of relational core with JSONB extension points.

**(a) Enhance existing tables — `crmContactsTable`**: Add columns: `title` (text), `department` (text), `source` (text), `tags` (text[]), `custom_fields` (jsonb NOT NULL DEFAULT '[]'::jsonb) following the openclaw pattern with CHECK constraint limiting to 50 fields, GIN index on `custom_fields jsonb_path_ops`.

**(b) Enhance existing tables — `crmCompaniesTable`**: Add columns: `industry` (text), `size` (text), `website` (text), `address` (text), `custom_fields` (jsonb with same pattern as contacts).

**(c) Enhance existing tables — `crmDealsTable`**: Add columns: `expected_close_date` (timestamptz), `probability` (integer 0–100), `lost_reason` (text), `won_reason` (text), `custom_fields` (jsonb).

**(d) Enhance existing tables — `crmLeadsTable`**: Add columns: `custom_fields` (jsonb with same pattern), `converted_contact_id` (uuid FK to contacts), `converted_deal_id` (uuid FK to deals), `converted_at` (timestamptz). This enables lead‑to‑contact/deal conversion.

**(e) Create `crmActivitiesTable`**: `id`, `org_id`, `entity_type` (text — 'contact', 'company', 'deal', 'lead'), `entity_id` (uuid), `type` (text — 'call', 'email', 'meeting', 'note', 'task'), `subject` (text), `body` (text), `metadata` (jsonb — call duration, email message ID, meeting location), `performed_by` (uuid FK to users), `performed_at` (timestamptz DEFAULT NOW()), `created_at`, `updated_at`. Follows the UnifiedTimeline pattern from Recon‑CRM. RLS enabled, organization scoped.

**(f) Create `crmPipelinesTable`**: `id`, `org_id`, `name` (text), `description` (text), `is_default` (boolean DEFAULT false), `sort_order` (integer), `created_at`, `updated_at`. RLS enabled.

**(g) Create `crmPipelineStagesTable`**: `id`, `org_id`, `pipeline_id` (uuid FK to pipelines), `name` (text), `sort_order` (integer), `color` (text — hex color for kanban column), `created_at`, `updated_at`. RLS enabled.

**(h) Add `pipeline_id` and `pipeline_stage_id` FKs** to `crmDealsTable` and `crmLeadsTable` referencing the new tables.

**(i) Zod schemas**: Create `packages/db/src/schema/crm.validation.ts` with Zod schemas for custom_fields validation per the openclaw pattern: array of `{key: string, value: string}`, max 50 items, key max 200 chars, value max 2000 chars. Export `validateCustomFields()` function.

**Research Findings (2026‑05‑06):**
- JSONB custom_fields with GIN index is the 2026 consensus over EAV
- CHECK constraint for max 50 custom fields, NOT NULL DEFAULT '[]' is metadata-only
- Unified activities table with entity_type + entity_id for polymorphic linking
- Pipelines + stages enable configurable sales processes
- `tsvector_update_trigger` is the recommended auto‑update mechanism for FTS
- All tables must have `org_id` with RLS enabled and tenant policies

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table verified)
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS helpers consolidated)

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-2` (entity_links table)
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3` (migration generation)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-*` (all CRM tRPC procedures)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-*` (all CRM UI tasks)

**Related Files:**
- `packages/db/src/schema/crm.ts` (extend significantly)
- `packages/db/src/schema/crm.validation.ts` (new — Zod validation for custom fields)
- `packages/db/drizzle/` (new migration after generation)

**Definition of Done**
- [ ] `crmContactsTable` enhanced: title, department, source, tags, custom_fields JSONB with CHECK(<=50), GIN index
- [ ] `crmCompaniesTable` enhanced: industry, size, website, address, custom_fields JSONB
- [ ] `crmDealsTable` enhanced: expected_close_date, probability, lost_reason, won_reason, pipeline_id, pipeline_stage_id FKs, custom_fields JSONB
- [ ] `crmLeadsTable` enhanced: custom_fields JSONB, converted_contact_id, converted_deal_id, converted_at
- [ ] `crmActivitiesTable` created: polymorphic entity_type/entity_id, type discriminator, unified timeline ready
- [ ] `crmPipelinesTable` created: configurable per-org pipelines
- [ ] `crmPipelineStagesTable` created: stages with sort_order and color
- [ ] All tables have `org_id` FK, `enableRLS()`, `tenantTablePolicies()`
- [ ] `crm.validation.ts` created with Zod custom_fields validator
- [ ] All tables have appropriate indexes on FK columns and searchable fields
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full‑text search tsvector columns (P1‑INTEG‑3)
- Entity links junction table (P1‑CRM‑SCHEMA‑2)
- Email sequence tables (Phase 2 — P2‑AICRM)
- Deal scoring model (Phase 2)

**Rules to Follow**
- All tables must be organization‑scoped with RLS enabled.
- `custom_fields` columns must use `jsonb NOT NULL DEFAULT '[]'::jsonb` with CHECK constraint.
- Foreign keys must reference existing tables with ON DELETE behavior documented.
- Activity `entity_type` must use a PostgreSQL CHECK constraint to validate allowed entity types.
- JSONB columns must never be used for relational data that requires referential integrity.
- Never commit migrations before `drizzle-kit generate` confirms correctness.

**Verification**
```bash
# Verify schema compiles
pnpm --filter @ubos/db run typecheck

# Generate migration
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate

# Verify migration SQL is valid
cat packages/db/drizzle/*.sql | head -50

# Apply migration to dev database
DATABASE_URL=$DATABASE_URL pnpm db:migrate

# Verify tables exist
psql $DATABASE_URL -c "\dt crm_*"

# Verify RLS enabled
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'crm_%';"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: CRM entities form a bounded context. Activities are the integration events between CRM sub‑domains. Pipelines model the sales process as a domain concept independent of any specific entity.

---

#### Subtasks

- [ ] P1-CRM-SCHEMA-1.0.25 (AGENT): Read current `packages/db/src/schema/crm.ts`, `organizations.ts`, `policies.ts`, and existing migration files. Catalog all existing columns, constraints, and indexes.
  **Verification:** Current CRM schema fully documented.

- [ ] P1-CRM-SCHEMA-1.0.5 (AGENT): Design complete CRM schema with all column types, constraints, foreign keys, and indexes. Research JSONB custom_fields patterns and GIN index usage.
  **Verification:** Full schema diagram documented.

- [ ] P1-CRM-SCHEMA-1.1 (AGENT): Enhance crmContactsTable, crmCompaniesTable, crmDealsTable, crmLeadsTable with new columns.
  **File(s):** `packages/db/src/schema/crm.ts`
  **Verification:** All four tables have enhanced columns with correct types.

- [ ] P1-CRM-SCHEMA-1.2 (AGENT): Create crmActivitiesTable with polymorphic entity_type/entity_id pattern.
  **File(s):** `packages/db/src/schema/crm.ts`
  **Verification:** Activities table supports all four entity types with CHECK constraint.

- [ ] P1-CRM-SCHEMA-1.3 (AGENT): Create crmPipelinesTable and crmPipelineStagesTable with FKs.
  **File(s):** `packages/db/src/schema/crm.ts`
  **Verification:** Pipeline and stage tables linked correctly.

- [ ] P1-CRM-SCHEMA-1.4 (AGENT): Add pipeline_id and pipeline_stage_id FKs to crmDealsTable and crmLeadsTable.
  **File(s):** `packages/db/src/schema/crm.ts`
  **Verification:** Deals and leads reference pipeline stages.

- [ ] P1-CRM-SCHEMA-1.5 (AGENT): Create Zod validation schemas for custom_fields in `crm.validation.ts`.
  **File(s):** `packages/db/src/schema/crm.validation.ts` (new)
  **Verification:** Validator rejects invalid custom field arrays.

- [ ] P1-CRM-SCHEMA-1.6 (AGENT): Add GIN indexes on all custom_fields JSONB columns.
  **File(s):** `packages/db/src/schema/crm.ts`
  **Verification:** GIN indexes created for querying custom field values.

- [ ] P1-CRM-SCHEMA-1.7 (HUMAN): Review complete schema, verify RLS coverage, approve for migration generation.
  **Verification:** Approved.

---

### [ ] P1-CRM-SCHEMA-2: Add polymorphic `entity_links` junction table for cross‑domain attachments

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No cross‑domain linking mechanism exists. Documents cannot be attached to CRM deals, contacts cannot be linked to projects, and there is no generic way to associate entities across domain boundaries. Each domain would need to create its own junction tables, leading to schema proliferation and inconsistent linking patterns.
**Size:** Small

**Description:**
Create `packages/db/src/schema/entity-links.ts` with a polymorphic junction table that enables any entity to be linked to any other entity across domains.

**(a) Table schema**: `entityLinksTable` with:
- `id` — UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `org_id` — UUID NOT NULL FK to organizations
- `entity_type` — text NOT NULL (e.g., 'crm.contact', 'crm.deal', 'documents.document', 'projects.task')
- `entity_id` — UUID NOT NULL
- `target_type` — text NOT NULL (same format)
- `target_id` — UUID NOT NULL
- `link_type` — text NOT NULL DEFAULT 'related' (e.g., 'attachment', 'reference', 'parent', 'related')
- `metadata` — JSONB (optional context about the link)
- `created_by` — UUID FK to users
- `created_at` — timestamptz DEFAULT NOW()

**(b) Constraints**: Unique constraint on `(org_id, entity_type, entity_id, target_type, target_id, link_type)` to prevent duplicate links. CHECK constraints on `entity_type` and `target_type` to validate format.

**(c) Indexes**: Composite index on `(org_id, entity_type, entity_id)` for finding all links from an entity. Composite index on `(org_id, target_type, target_id)` for finding all links to an entity.

**(d) RLS**: Enable RLS with `tenantTablePolicies()` for organization isolation.

**(e) Usage examples**:
- Attach a document to a CRM deal: `entity_type='documents.document', target_type='crm.deal', link_type='attachment'`
- Link a contact to a project: `entity_type='crm.contact', target_type='projects.project', link_type='reference'`
- Parent task linking: `entity_type='projects.task', target_type='projects.task', link_type='parent'`

**Research Findings (2026‑05‑06):**
- Drizzle supports polymorphic associations via separate FK columns per target type, but for a flexible cross‑domain linker, the string‑typed entity_type + entity_id pattern is the 2026 consensus
- PostgreSQL CHECK constraints validate entity_type values
- Composite unique constraint prevents duplicate links
- RLS ensures tenant isolation even when linking across domains

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table)
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-1` (CRM tables exist to validate entity types)

**Blocks:**
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-UI-3` (document detail panel shows linked CRM entities)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-2` (auto‑link documents to CRM on upload)

**Related Files:**
- `packages/db/src/schema/entity-links.ts` (new)
- `packages/db/src/schema/index.ts` (add re‑export)

**Definition of Done**
- [ ] `packages/db/src/schema/entity-links.ts` created with `entityLinksTable`
- [ ] Table has polymorphic entity_type/entity_id + target_type/target_id columns
- [ ] UNIQUE constraint on (org_id, entity_type, entity_id, target_type, target_id, link_type)
- [ ] CHECK constraints validate entity_type and target_type format
- [ ] Composite indexes on both (entity) and (target) sides
- [ ] RLS enabled with tenant isolation
- [ ] Schema re‑exported from `schema/index.ts`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Link‑type enumeration (flexible text field; enumeration may be added later)
- Cascade deletion logic (handled at application level)
- Link analytics or usage tracking

**Rules to Follow**
- Entity types must follow the format `{domain}.{entity}` (e.g., `crm.contact`, `documents.document`).
- The UNIQUE constraint must include `org_id` to allow the same link to exist in different organizations.
- Never allow `entity_type` = `target_type` AND `entity_id` = `target_id` (self‑links) unless explicitly intended.
- RLS must be on by default — no bypass for entity_links.

**Verification**
```bash
# Verify table creation
psql $DATABASE_URL -c "\d entity_links"

# Verify unique constraint
psql $DATABASE_URL -c "\d entity_links" | grep -A 2 "unique"

# Verify RLS
psql $DATABASE_URL -c "SELECT rowsecurity FROM pg_tables WHERE tablename = 'entity_links';"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: Entity links serve as the shared kernel between bounded contexts, enabling cross‑domain associations without coupling domain schemas.

---

#### Subtasks

- [ ] P1-CRM-SCHEMA-2.0.25 (AGENT): Read P1‑CRM‑SCHEMA‑1 output and current schema barrel export. Design entity_links table schema.
  **Verification:** Schema design documented.

- [ ] P1-CRM-SCHEMA-2.1 (AGENT): Create `entity-links.ts` with table definition, constraints, indexes, and RLS.
  **File(s):** `packages/db/src/schema/entity-links.ts` (new)
  **Verification:** Table definition compiles.

- [ ] P1-CRM-SCHEMA-2.2 (AGENT): Add re‑export to `schema/index.ts`.
  **File(s):** `packages/db/src/schema/index.ts`
  **Verification:** entityLinksTable importable from schema barrel.

- [ ] P1-CRM-SCHEMA-2.3 (HUMAN): Review entity_links design, verify cross‑domain use cases. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-SCHEMA-3: Create generated migration and apply to staging/development

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P1‑CRM‑SCHEMA‑1 and P1‑CRM‑SCHEMA‑2 define new tables and columns but no migration has been generated or applied. Without the migration, the database schema does not match the TypeScript definitions, and no tRPC procedures can be built against the new tables.
**Size:** Small

**Description:**
Generate a Drizzle migration from the updated CRM schema and entity_links schema, then apply it to the development and staging databases.

**Implementation steps:**
1. Ensure `DATABASE_URL` points to the non‑pooled Neon endpoint (for DDL operations).
2. Run `drizzle-kit generate` from `packages/db` to diff the TypeScript schema against the last migration snapshot and generate SQL.
3. Review the generated SQL migration for correctness — verify all new tables, columns, constraints, indexes, and RLS policies.
4. Run `pnpm db:migrate` to apply the migration to the development database.
5. Verify all tables exist with the correct schema via `psql` or Drizzle Studio.
6. Commit the generated migration files and updated snapshot to the repository.

**Research Findings (2026‑05‑06):**
- `drizzle-kit generate` diffs TypeScript schema against local meta snapshot, not live DB
- Migration must use non‑pooled URL (PgBouncer blocks DDL)
- Generated SQL includes CREATE TABLE, ALTER TABLE ADD COLUMN, CREATE INDEX, CREATE POLICY
- New migration appears as `0001_<name>.sql` in the drizzle folder

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-1` (CRM schema complete)
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-2` (entity_links schema complete)
- `tasks/infrastructure/P0-DB.md → P0-DB-1a` (programmatic migration script)

**Blocks:**
- All `P1-CRM-TRPC-*` tasks (procedures depend on migrated tables)
- All `P1-CRM-UI-*` tasks (UI depends on functional tRPC procedures)

**Related Files:**
- `packages/db/drizzle/` (new migration files)
- `packages/db/drizzle/meta/` (updated snapshot and journal)

**Definition of Done**
- [ ] `drizzle-kit generate` creates a migration with all schema changes
- [ ] Generated SQL reviewed for correctness: all new tables, columns, constraints, indexes, RLS policies present
- [ ] Migration applied to development database via `pnpm db:migrate`
- [ ] All new tables queryable via `psql`
- [ ] Migration files committed to repository
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Seeding data into new tables (P0‑DX‑3 extends seed script for CRM)
- Neon branching for PR preview (already configured in P0‑DB‑7)

**Rules to Follow**
- Never run `drizzle-kit generate` against the pooled URL — use non‑pooled `DATABASE_URL`.
- Never manually edit the generated SQL migration file.
- Always review the generated SQL before applying — `drizzle-kit` can sometimes generate unexpected DDL.
- Commit the migration files and updated snapshot together in one commit.

**Verification**
```bash
# Generate migration
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate

# Review generated SQL
cat packages/db/drizzle/0001_*.sql

# Apply migration
DATABASE_URL=$DATABASE_URL pnpm db:migrate

# Verify all new tables
psql $DATABASE_URL -c "\dt crm_*"

# Verify custom_fields columns
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'custom_fields';"

# Verify RLS on new tables
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'crm_%' AND rowsecurity = true;"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure)

---

#### Subtasks

- [ ] P1-CRM-SCHEMA-3.0.25 (AGENT): Verify P1‑CRM‑SCHEMA‑1 and P1‑CRM‑SCHEMA‑2 are complete. Ensure DATABASE_URL is non‑pooled.
  **Verification:** All schema changes documented; database URL confirmed non‑pooled.

- [ ] P1-CRM-SCHEMA-3.1 (AGENT): Run `drizzle-kit generate` and review the generated SQL.
  **File(s):** `packages/db/drizzle/0001_*.sql` (new)
  **Verification:** SQL reviewed for correctness.

- [ ] P1-CRM-SCHEMA-3.2 (AGENT): Apply migration via `pnpm db:migrate`.
  **Verification:** Migration applied without errors.

- [ ] P1-CRM-SCHEMA-3.3 (AGENT): Commit migration files and updated snapshot.
  **File(s):** `packages/db/drizzle/`, `packages/db/drizzle/meta/`
  **Verification:** Files committed to git.

- [ ] P1-CRM-SCHEMA-3.4 (HUMAN): Verify migration applied correctly, all tables exist, RLS active. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-1: Build contacts CRUD router (list, create, update, delete, search)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No contacts tRPC router exists. The contacts table is defined in the schema but has no API surface. The current CRM router only handles leads. Contacts exist as static mock data in the UI.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/crm/contacts.ts` with full CRUD procedures for contact management. The router follows the established pattern from the existing leads router.

**(a) Procedures**:
- `contacts.list` — query: list contacts with pagination (cursor‑based, default 50 per page), optional search filter, optional status filter, optional sort. Returns `{ items: Contact[], nextCursor: string | null }`.
- `contacts.getById` — query: fetch a single contact by ID with loaded relations (company name via JOIN).
- `contacts.create` — mutation: create a new contact with Zod‑validated input. Auto‑associates with tenant org.
- `contacts.update` — mutation: update an existing contact. Validates the contact belongs to the tenant org.
- `contacts.delete` — mutation: soft‑delete or hard‑delete a contact. Validates tenant ownership.
- `contacts.search` — query: simple text search across name, email, phone fields using ILIKE (full‑text search via tsvector is P1‑INTEG‑3).

**(b) Input validation**: Zod schemas for create/update with: first_name (required), last_name (required), email (email format), phone, title, department, source, company_id (optional FK), tags (string array, max 10), custom_fields (validated against `validateCustomFields()` from `crm.validation.ts`).

**(c) Output types**: Full Contact type with all columns including custom_fields, company name (resolved via JOIN), created_at, updated_at.

**(d) RBAC**: All procedures use `tenantProcedure` (authenticated + tenant‑scoped). Admin vs member distinction deferred to RBAC middleware.

**Research Findings (2026‑05‑06):**
- tRPC v11 CRUD patterns: `tenantProcedure` with Zod input/output validation
- Cursor‑based pagination is the 2026 standard for list endpoints
- custom_fields validation via `validateCustomFields()` from shared schema package

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3` (migration applied)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-8` (root router with CRM namespace)
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-2` (tenant middleware)

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-1` (contacts list page)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-2` (contact detail page)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/contacts.ts` (new)
- `apps/web/src/server/trpc/routers/crm/index.ts` (new — barrel for CRM sub‑routers)
- `apps/web/src/server/trpc/routers/_app.ts` (add contacts router)

**Definition of Done**
- [ ] `apps/web/src/server/trpc/routers/crm/contacts.ts` created with six procedures
- [ ] All procedures use `tenantProcedure` for auth + tenant scoping
- [ ] Zod input validation for create/update with custom_fields validation
- [ ] Cursor‑based pagination on `contacts.list`
- [ ] Company name resolved via JOIN in `contacts.getById`
- [ ] Tenant ownership validated on update/delete
- [ ] Router registered in CRM barrel and root app router
- [ ] All procedures return properly typed responses
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Contact import via CSV (P1‑CRM‑UI‑8)
- Full‑text search via tsvector (P1‑INTEG‑4)
- Contact merge/deduplication (Phase 2)
- Bulk operations (Phase 2)

**Rules to Follow**
- All mutations must validate tenant ownership before modifying data.
- custom_fields must be validated server‑side — client validation is supplementary.
- Pagination cursors must be opaque (base64‑encoded offset or timestamp‑based).
- Search must use parameterized queries (no SQL injection via string concatenation).

**Verification**
```bash
# Test contacts.list
curl http://localhost:3000/api/trpc/crm.contacts.list?input={}

# Test contacts.create
curl -X POST http://localhost:3000/api/trpc/crm.contacts.create \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Jane", "lastName": "Doe", "email": "jane@example.com"}'

# Test tenant isolation
# Create contact as Org A → should not appear in Org B's list

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, I can create, search, and manage my contacts with all their details and custom fields.

---

#### Subtasks

- [ ] P1-CRM-TRPC-1.0.25 (AGENT): Read existing leads router (`routers/crm.ts`), tenant middleware, and CRM schema. Understand the established patterns.
  **Verification:** Existing patterns documented.

- [ ] P1-CRM-TRPC-1.0.5 (AGENT): Design Zod schemas for contact input/output including custom_fields.
  **Verification:** Zod schemas designed.

- [ ] P1-CRM-TRPC-1.1 (AGENT): Create `contacts.ts` router with list, getById, create, update, delete, search procedures.
  **File(s):** `apps/web/src/server/trpc/routers/crm/contacts.ts` (new)
  **Verification:** All six procedures functional.

- [ ] P1-CRM-TRPC-1.2 (AGENT): Create CRM barrel export and register contacts router.
  **File(s):** `apps/web/src/server/trpc/routers/crm/index.ts` (new), `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Contacts procedures accessible via tRPC client.

- [ ] P1-CRM-TRPC-1.3 (HUMAN): Test all procedures with curl, verify tenant isolation. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-2: Build companies CRUD router

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No companies tRPC router exists. Companies are defined in schema but not exposed via API.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/crm/companies.ts` following the same pattern as the contacts router. Procedures: `companies.list`, `companies.getById`, `companies.create`, `companies.update`, `companies.delete`. Includes industry, size, website, address fields from the enhanced schema. `companies.getById` resolves associated contacts count via JOIN.

**Research Findings (2026‑05‑06):**
- Same patterns as contacts router
- Company needs associated contacts count for list view

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3`
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (CRM barrel structure established)

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-3` (companies list/detail pages)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/companies.ts` (new)

**Definition of Done**
- [ ] `companies.ts` router created with five procedures
- [ ] Company list includes associated contacts count
- [ ] All standard validation and tenant scoping applied
- [ ] Registered in CRM barrel and root router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl http://localhost:3000/api/trpc/crm.companies.list?input={}
curl -X POST http://localhost:3000/api/trpc/crm.companies.create \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "industry": "Technology"}'
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (consistent with contacts pattern)

---

#### Subtasks

- [ ] P1-CRM-TRPC-2.0.25 (AGENT): Reference contacts router for pattern consistency.
  **Verification:** Pattern documented.

- [ ] P1-CRM-TRPC-2.1 (AGENT): Create `companies.ts` router with five procedures.
  **File(s):** `apps/web/src/server/trpc/routers/crm/companies.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-CRM-TRPC-2.2 (AGENT): Register in CRM barrel and root router.
  **File(s):** `apps/web/src/server/trpc/routers/crm/index.ts`, `_app.ts`
  **Verification:** Companies procedures accessible.

- [ ] P1-CRM-TRPC-2.3 (HUMAN): Test all procedures, verify tenant isolation. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-3: Build deals CRUD router with stage transitions (won/lost)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No deals tRPC router exists. The deals table is defined but has no API surface.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/crm/deals.ts` with full CRUD plus stage transition logic.

**(a) Standard procedures**: `deals.list` (paginated, filterable by stage/pipeline/owner), `deals.getById` (with contact, company, stage info), `deals.create`, `deals.update`, `deals.delete`.

**(b) Stage transition procedures**:
- `deals.moveStage` — mutation: move a deal to a different pipeline stage. Validates the stage belongs to the deal's pipeline. Records the transition in activities.
- `deals.markWon` — mutation: mark a deal as won. Sets `won_reason`, records close date, emits `crm/deal.won` event via Inngest.
- `deals.markLost` — mutation: mark a deal as lost. Sets `lost_reason`, records close date, emits audit log entry.

**(c) Event emission**: `deals.markWon` calls `inngest.send(crmDealWon.create({ dealId, orgId, userId, value: deal.value_cents }))`. This drives the Quote‑to‑Cash flow (P1‑INTEG‑1).

**(d) Pipeline context**: `deals.list` accepts optional `pipelineId` filter. `deals.listByStage` returns deals grouped by stage for kanban board rendering.

**Research Findings (2026‑05‑06):**
- Stage transitions must validate pipeline context
- Won/Lost events drive cross‑module workflows via Inngest
- `inngest.send()` should be fire‑and‑forget (not awaited) per Phase 0 patterns

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3`
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-3` (event types defined)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (CRM barrel structure)

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-4` (kanban board)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-5` (deal detail page)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-1` (quote‑to‑cash)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/deals.ts` (new)
- `apps/web/src/server/inngest/events/crm.ts` (reference — event types)

**Definition of Done**
- [ ] `deals.ts` router created with list, getById, create, update, delete procedures
- [ ] `deals.moveStage` validates stage belongs to pipeline
- [ ] `deals.markWon` emits `crm/deal.won` event via Inngest
- [ ] `deals.markLost` records lost reason
- [ ] `deals.listByStage` returns pipeline‑grouped deals
- [ ] All standard validation and tenant scoping
- [ ] Registered in CRM barrel and root router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl http://localhost:3000/api/trpc/crm.deals.list?input={"pipelineId": "..."}
curl -X POST http://localhost:3000/api/trpc/crm.deals.markWon \
  -H "Content-Type: application/json" \
  -d '{"dealId": "...", "wonReason": "Best Price"}'
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales manager, I can move deals through pipeline stages and mark them won or lost. When a deal is won, the system automatically triggers invoicing.

---

#### Subtasks

- [ ] P1-CRM-TRPC-3.0.25 (AGENT): Reference contacts/companies router patterns and Inngest event types.
  **Verification:** Patterns and events documented.

- [ ] P1-CRM-TRPC-3.1 (AGENT): Create `deals.ts` router with all procedures including stage transitions.
  **File(s):** `apps/web/src/server/trpc/routers/crm/deals.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-CRM-TRPC-3.2 (AGENT): Add Inngest event emission for deal won.
  **File(s):** `apps/web/src/server/trpc/routers/crm/deals.ts`
  **Verification:** Event sent on deal won.

- [ ] P1-CRM-TRPC-3.3 (AGENT): Register in CRM barrel and root router.
  **File(s):** `apps/web/src/server/trpc/routers/crm/index.ts`, `_app.ts`
  **Verification:** Deals procedures accessible.

- [ ] P1-CRM-TRPC-3.4 (HUMAN): Test all procedures including stage transitions and event emission. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-4: Build activities CRUD router (log call, email, meeting, note)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No activities API exists. The unified activities table created in P1‑CRM‑SCHEMA‑1 has no tRPC surface.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/crm/activities.ts` with procedures for logging and retrieving activities on any CRM entity.

**(a) Procedures**:
- `activities.listByEntity` — query: list all activities for a given entity (contact, company, deal, lead), paginated, ordered by `performed_at` DESC. Returns unified timeline data.
- `activities.create` — mutation: log a new activity. Accepts `entity_type`, `entity_id`, `type` (call/email/meeting/note/task), `subject`, `body`, `metadata`.
- `activities.getById` — query: single activity detail.
- `activities.delete` — mutation: delete an activity (author or admin only).

**(b) Unified timeline**: `activities.listByEntity` returns a merged chronological feed across all activity types (calls, emails, meetings, notes, tasks) with type‑specific icons/colors. This feeds the `UnifiedTimeline` UI component.

**(c) Metadata by type**: Each activity type has structured metadata:
- call: `{ durationSeconds, phoneNumber, direction }`
- email: `{ messageId, to, cc, bcc }`
- meeting: `{ location, attendees, durationMinutes }`
- note: `{}` (no structured metadata)
- task: `{ dueDate, completed, assignedTo }`

**Research Findings (2026‑05‑06):**
- UnifiedTimeline pattern from Recon‑CRM: single component merging all activity types
- Chronological feed with date grouping, actor avatars, color‑coded entry types, pagination

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3`
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1`

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-2` (contact detail with timeline)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-5` (deal detail with timeline)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/activities.ts` (new)

**Definition of Done**
- [ ] `activities.ts` router created with four procedures
- [ ] `activities.listByEntity` returns unified chronological feed
- [ ] `activities.create` validates entity_type against allowed types
- [ ] Metadata validated per activity type
- [ ] All standard validation and tenant scoping
- [ ] Registered in CRM barrel and root router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl http://localhost:3000/api/trpc/crm.activities.listByEntity?input={"entityType":"contact","entityId":"..."}
curl -X POST http://localhost:3000/api/trpc/crm.activities.create \
  -H "Content-Type: application/json" \
  -d '{"entityType": "contact", "entityId": "...", "type": "call", "subject": "Follow-up call"}'
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, I can log calls, emails, and notes against any contact or deal, and see a unified timeline of all interactions.

---

#### Subtasks

- [ ] P1-CRM-TRPC-4.0.25 (AGENT): Reference pattern from contacts router and unified timeline design.
  **Verification:** Patterns documented.

- [ ] P1-CRM-TRPC-4.1 (AGENT): Create `activities.ts` router with listByEntity, create, getById, delete.
  **File(s):** `apps/web/src/server/trpc/routers/crm/activities.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-CRM-TRPC-4.2 (AGENT): Register in CRM barrel and root router.
  **File(s):** `apps/web/src/server/trpc/routers/crm/index.ts`, `_app.ts`
  **Verification:** Activities procedures accessible.

- [ ] P1-CRM-TRPC-4.3 (HUMAN): Test activity logging and timeline retrieval. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-5: Build pipeline management router (create pipeline, reorder stages)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No pipeline management API. The pipelines and pipeline_stages tables have no tRPC surface.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/crm/pipelines.ts` with procedures for managing sales pipelines and their stages.

**(a) Procedures**:
- `pipelines.list` — query: all pipelines for the org with stage counts
- `pipelines.getById` — query: single pipeline with ordered stages
- `pipelines.create` — mutation: create a pipeline with default stages (New, Qualified, Proposal, Closed Won, Closed Lost)
- `pipelines.update` — mutation: rename pipeline
- `pipelines.delete` — mutation: delete pipeline (only if no deals are using it)
- `stages.create` — mutation: add a stage to a pipeline
- `stages.update` — mutation: rename stage or change color
- `stages.reorder` — mutation: update `sort_order` for multiple stages at once (drag‑and‑drop reorder)
- `stages.delete` — mutation: delete stage (only if no deals are in it)

**(b) Default pipeline**: When an org is created, a default pipeline with standard stages is auto‑created via the onboarding flow (P1‑ONBOARD‑1).

**Research Findings (2026‑05‑06):**
- Pipeline stages with sort_order enable drag‑and‑drop reordering
- Stage color is used for kanban column headers
- Default pipeline creation on org setup is a standard SaaS pattern

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3`
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1`

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-6` (pipeline management interface)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-4` (kanban board uses pipeline stages)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/pipelines.ts` (new)

**Definition of Done**
- [ ] `pipelines.ts` router created with nine procedures
- [ ] `pipelines.create` auto‑generates five default stages
- [ ] `stages.reorder` accepts array of `{ id, sort_order }` for batch reorder
- [ ] Deletion validates no active deals in pipeline/stage
- [ ] All standard validation and tenant scoping
- [ ] Registered in CRM barrel and root router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl -X POST http://localhost:3000/api/trpc/crm.pipelines.create \
  -H "Content-Type: application/json" \
  -d '{"name": "Enterprise Sales"}'
# Verify five stages auto-created
curl http://localhost:3000/api/trpc/crm.pipelines.list?input={}
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales ops admin, I can create custom pipelines with stages that match our sales process.

---

#### Subtasks

- [ ] P1-CRM-TRPC-5.0.25 (AGENT): Reference pattern from deals router.
  **Verification:** Pattern documented.

- [ ] P1-CRM-TRPC-5.1 (AGENT): Create `pipelines.ts` router with all nine procedures.
  **File(s):** `apps/web/src/server/trpc/routers/crm/pipelines.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-CRM-TRPC-5.2 (AGENT): Register in CRM barrel and root router.
  **File(s):** `apps/web/src/server/trpc/routers/crm/index.ts`, `_app.ts`
  **Verification:** Pipeline procedures accessible.

- [ ] P1-CRM-TRPC-5.3 (HUMAN): Test pipeline creation, stage reordering, deletion guards. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-6: Build CRM full‑text search procedure (cross‑entity)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No cross‑entity CRM search exists. Each entity's search is limited to ILIKE on its own table.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/crm/search.ts` with a cross‑entity CRM search procedure that searches contacts, companies, deals, and leads in a single query.

**(a) Search approach**: Uses PostgreSQL `websearch_to_tsquery` with `ts_rank` for relevance scoring. The search runs against pre‑built `search_vector` tsvector columns (created by P1‑INTEG‑3) on each CRM table.

**(b) Procedure**: `crm.search` — query: accepts `query` (string), `entityTypes` (optional string array to restrict search scope), `limit` (default 20). Returns ranked results with entity type, entity ID, title/name, and a relevance snippet.

**(c) Fallback**: If tsvector columns are not yet created (P1‑INTEG‑3 not complete), use ILIKE fallback across name/description fields with UNION ALL.

**(d) Result format**: Each result includes `{ entityType, entityId, title, subtitle, snippet, url }` for rendering in search results and linking to the entity detail page.

**Research Findings (2026‑05‑06):**
- `websearch_to_tsquery` is the recommended function for user‑friendly search syntax
- `ts_rank` provides relevance scoring
- `ts_headline` generates highlighted snippets
- UNION ALL with per‑entity weighting enables cross‑entity search

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-3`
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (CRM barrel structure)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-3` (tsvector columns — can work with ILIKE fallback until then)

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-9` (global search integration)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-4` (global search uses CRM search)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/search.ts` (new)

**Definition of Done**
- [ ] `search.ts` router created with `crm.search` procedure
- [ ] Cross‑entity search across contacts, companies, deals, leads
- [ ] Result ranking by relevance using ts_rank (or ILIKE ordering as fallback)
- [ ] Entity type filter support
- [ ] Result format includes URL for navigation
- [ ] Registered in CRM barrel and root router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl "http://localhost:3000/api/trpc/crm.search?input={\"query\":\"acme\"}"
# Verify: results ranked by relevance with entity type labels
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can search across all CRM records from a single search bar and see ranked results grouped by entity type.

---

#### Subtasks

- [ ] P1-CRM-TRPC-6.0.25 (AGENT): Research PostgreSQL websearch_to_tsquery and ts_rank patterns for cross‑entity search.
  **Verification:** Search approach documented.

- [ ] P1-CRM-TRPC-6.1 (AGENT): Create `search.ts` router with cross‑entity search procedure.
  **File(s):** `apps/web/src/server/trpc/routers/crm/search.ts` (new)
  **Verification:** Cross‑entity search functional.

- [ ] P1-CRM-TRPC-6.2 (AGENT): Register in CRM barrel and root router.
  **File(s):** `apps/web/src/server/trpc/routers/crm/index.ts`, `_app.ts`
  **Verification:** Search procedure accessible.

- [ ] P1-CRM-TRPC-6.3 (HUMAN): Test search with various queries and entity type filters. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-TRPC-7: Emit `crm.deal.won` and `crm.contact.created` events via Inngest client on relevant mutations

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No Inngest events are emitted from CRM mutations. Cross‑module workflows (quote‑to‑cash, document auto‑linking) cannot function without event triggers.
**Size:** Small

**Description:**
Add `inngest.send()` calls to relevant CRM mutation procedures to emit typed events for cross‑module workflows.

**(a) Events to emit**:
- `crm/contact.created` — in `contacts.create`, after successful insert. Payload: `{ contactId, orgId, userId, email, companyName }`.
- `crm/deal.won` — in `deals.markWon`, after successful update. Payload: `{ dealId, orgId, userId, value }`.
- `crm/deal.stageChanged` — in `deals.moveStage`, after successful stage transition. Payload: `{ dealId, orgId, userId, fromStageId, toStageId }`.
- `crm/lead.created` — in the existing leads router `createLead` procedure (already exists, just add event emission).

**(b) Fire‑and‑forget**: All `inngest.send()` calls use `void` or are not awaited — per Phase 0 Inngest patterns, event emission must never block the user‑facing response.

**(c) Event type definitions**: Use existing event types from `apps/web/src/server/inngest/events/crm.ts` (created in P0‑INNGEST‑3). If event types don't yet exist, create them following the v4 `eventType()` pattern.

**Research Findings (2026‑05‑06):**
- Inngest `send()` is fire‑and‑forget — do not await it in mutation handlers
- Events must use Zod schemas for runtime validation
- Event naming follows `{domain}/{entity}.{action}` convention

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (contacts router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-3` (deals router)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-3` (event registry)

**Blocks:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-1` (quote‑to‑cash Inngest function)
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-7` (notification dispatcher)

**Related Files:**
- `apps/web/src/server/trpc/routers/crm/contacts.ts` (add event emission)
- `apps/web/src/server/trpc/routers/crm/deals.ts` (add event emission)
- `apps/web/src/server/trpc/routers/crm.ts` (existing leads router — add event emission)
- `apps/web/src/server/inngest/events/crm.ts` (verify event types exist)

**Definition of Done**
- [ ] `crm/contact.created` event emitted from `contacts.create`
- [ ] `crm/deal.won` event emitted from `deals.markWon`
- [ ] `crm/deal.stageChanged` event emitted from `deals.moveStage`
- [ ] `crm/lead.created` event emitted from existing `createLead` procedure
- [ ] All emissions are fire‑and‑forget (not blocking)
- [ ] Event types defined with Zod schemas in event registry
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Trigger deal won
curl -X POST http://localhost:3000/api/trpc/crm.deals.markWon \
  -H "Content-Type: application/json" \
  -d '{"dealId": "...", "wonReason": "Best Features"}'

# Check Inngest dashboard for event
open http://localhost:8288
# Verify: crm/deal.won event appears in the event stream

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: CRM events are the integration events that enable cross‑bounded‑context workflows without tight coupling.

---

#### Subtasks

- [ ] P1-CRM-TRPC-7.0.25 (AGENT): Read existing Inngest event types and P0‑INNGEST‑3 output.
  **Verification:** Event types and emission patterns documented.

- [ ] P1-CRM-TRPC-7.1 (AGENT): Add event emission to contacts.create, deals.markWon, deals.moveStage, and leads.createLead.
  **File(s):** `contacts.ts`, `deals.ts`, `crm.ts`
  **Verification:** Events emitted on all relevant mutations.

- [ ] P1-CRM-TRPC-7.2 (HUMAN): Trigger each mutation, verify events appear in Inngest dashboard. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-1: Build contacts list page with search, filter, and inline edit

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The CRM page has a "Contacts" tab that renders a static table from mock data with visual‑only toolbar buttons. There is no real data, no search, no filtering, and no editable fields.
**Size:** Large

**Description:**
Build a fully functional contacts list page at `routes/_dashboard/crm/contacts/index.tsx` that replaces the static contacts tab in the CRM page.

**(a) Page structure**: A table view with:
- Search bar with debounced input (300ms) across name, email, company
- Filter chips: status (active/inactive), source, tags
- Sortable columns: Name, Email, Company, Title, Created Date
- Pagination (cursor‑based, 50 per page)
- Row click navigates to contact detail page (`/crm/contacts/$contactId`)
- "Add Contact" button opens a create modal

**(b) Inline edit**: Clicking on a cell (name, email, phone, title) activates inline editing with auto‑save on blur. Uses optimistic update pattern: update UI immediately, call mutation, rollback on error with toast.

**(c) TanStack Query integration**: Uses `useSuspenseQuery` for the contacts list (tRPC v11 default recommendation). Mutations use `useMutation` with `onMutate` (snapshot), `onError` (rollback), `onSettled` (invalidate) pattern.

**(d) Empty state**: When no contacts exist, show an empty state with illustration and "Add your first contact" CTA button.

**(e) Mobile responsive**: Table becomes a card list on mobile. Search and filters collapse into a filter sheet.

**Research Findings (2026‑05‑06):**
- shadcn/ui DataTable with TanStack Table for sortable, filterable lists
- Debounced search at 300ms is the 2026 standard
- Optimistic updates: onMutate → snapshot → rollback on error → invalidate on settled

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (contacts router)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1` (route structure)

**Blocks:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-2` (contact detail — navigated from list)

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/contacts/index.tsx` (new)
- `apps/web/src/routes/_dashboard/crm/contacts/$contactId.tsx` (new — detail page stub)
- `apps/web/src/components/crm/ContactTable.tsx` (new)
- `apps/web/src/components/crm/ContactCreateModal.tsx` (new)

**Definition of Done**
- [ ] Contacts list page renders with real data from tRPC
- [ ] Debounced search filters contacts by name, email, company
- [ ] Filter chips work for status, source, tags
- [ ] Sortable columns toggle ascending/descending
- [ ] Cursor‑based pagination with "Load more" or infinite scroll
- [ ] Inline edit with auto‑save and optimistic update
- [ ] "Add Contact" modal with Zod‑validated form
- [ ] Empty state for new organizations
- [ ] Mobile responsive: card view, filter sheet
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Contact import (P1‑CRM‑UI‑8)
- Contact merge (Phase 2)
- Bulk operations (Phase 2)
- Advanced search via FTS (P1‑INTEG‑3)

**Rules to Follow**
- All user‑facing strings must use i18n `t()` calls.
- Inline edit must auto‑save — no explicit save button.
- Optimistic updates must always roll back on error with user‑visible feedback.
- Search must be debounced to avoid excessive API calls.
- The table must be keyboard navigable (Tab through cells, Enter to open detail).

**Verification**
```bash
# Navigate to /crm/contacts
# Verify: table renders with real data
# Type in search bar → results filter after 300ms
# Click a cell → inline edit activates → change value → blur → auto‑save → success toast
# Click "Add Contact" → fill form → submit → contact appears in table

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, I can search, filter, and quickly edit my contacts without navigating away from the list.

---

#### Subtasks

- [ ] P1-CRM-UI-1.0.25 (AGENT): Read existing CRM leads UI patterns for optimistic updates and TanStack Query integration.
  **Verification:** Existing patterns documented.

- [ ] P1-CRM-UI-1.0.5 (AGENT): Design contacts list UX: search, filters, sorting, pagination, inline edit, mobile.
  **Verification:** Design documented.

- [ ] P1-CRM-UI-1.1 (AGENT): Create `ContactTable` component with sortable columns, cursor pagination, and inline edit.
  **File(s):** `apps/web/src/components/crm/ContactTable.tsx` (new)
  **Verification:** Table renders contacts with real data.

- [ ] P1-CRM-UI-1.2 (AGENT): Create `ContactCreateModal` component with Zod‑validated form.
  **File(s):** `apps/web/src/components/crm/ContactCreateModal.tsx` (new)
  **Verification:** Modal creates contacts with validation.

- [ ] P1-CRM-UI-1.3 (AGENT): Build contacts index route with search, filters, and TanStack Query integration.
  **File(s):** `apps/web/src/routes/_dashboard/crm/contacts/index.tsx` (new)
  **Verification:** Full contacts list page functional.

- [ ] P1-CRM-UI-1.4 (AGENT): Create contact detail route stub.
  **File(s):** `apps/web/src/routes/_dashboard/crm/contacts/$contactId.tsx` (new — stub)
  **Verification:** Clicking a contact row navigates to detail page.

- [ ] P1-CRM-UI-1.5 (HUMAN): Test search, filtering, sorting, inline edit, create, mobile responsive. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-2: Build contact detail page with activity timeline, deals panel, and attached documents

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No contact detail page exists. The contacts tab shows a table only.
**Size:** Large

**Description:**
Build the contact detail page at `routes/_dashboard/crm/contacts/$contactId.tsx` following the 2026 CRM detail pattern.

**(a) Page layout**: Two‑column layout on desktop, single column on mobile:
- Left column (2/3 width): Contact header (name, avatar, title, company, tags), Activity timeline (UnifiedTimeline component), custom fields display
- Right column (1/3 width): Deals panel (list of associated deals with stage and value), Actions card (log call, send email, schedule meeting, add note), Attachments section (documents linked via entity_links)

**(b) Contact header**: Displays avatar (computed initials fallback), full name, title + company, email + phone (clickable), tags as badges, "Edit" button opens update modal.

**(c) Activity timeline**: Uses `UnifiedTimeline` component that merges activities from `crm.activities.listByEntity` with date grouping, actor avatars, color‑coded entry types, and pagination. Activity types have distinct visual treatments: calls (phone icon, green dot), emails (mail icon, blue dot), meetings (calendar icon, orange dot), notes (pencil icon, gray dot).

**(d) Deals panel**: Lists associated deals from `crm.deals.list` filtered by contact ID. Each deal card shows: name, stage badge, value, close date. Clicking a deal navigates to the deal detail page.

**(e) Quick actions**: Buttons in the actions card: "Log Call", "Send Email", "Schedule Meeting", "Add Note". Each opens a modal pre‑filled with the contact context.

**(f) Attachments**: Lists documents linked via entity_links. Shows document name, type icon, upload date. "Attach Document" button opens file picker or document search.

**Research Findings (2026‑05‑06):**
- CRM detail pages use two‑column layout: activity timeline (main) + related records (sidebar)
- UnifiedTimeline merges all activity types into chronological feed with date grouping
- Avatar initials fallback is the standard pattern

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (contacts router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-4` (activities router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-3` (deals router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-1` (contacts list — navigated from)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/contacts/$contactId.tsx` (replace stub)
- `apps/web/src/components/crm/UnifiedTimeline.tsx` (new)
- `apps/web/src/components/crm/ActivityCreateModal.tsx` (new)

**Definition of Done**
- [ ] Contact detail page renders with header, timeline, deals panel, and actions
- [ ] Activity timeline shows merged chronological feed with date grouping
- [ ] Deals panel shows associated deals with stage and value
- [ ] Quick actions open pre‑filled modals
- [ ] Attachments section shows linked documents
- [ ] Edit button opens update modal
- [ ] Two‑column on desktop, single column on mobile
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /crm/contacts/{contactId}
# Verify: header with avatar, name, title, company, tags
# Verify: activity timeline with date grouping
# Verify: deals panel with associated deals
# Click "Log Call" → modal opens with contact pre‑filled

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, I can see a contact's complete history, associated deals, and linked documents in one place.

---

#### Subtasks

- [ ] P1-CRM-UI-2.0.25 (AGENT): Research contact detail page patterns from production CRMs.
  **Verification:** Design documented.

- [ ] P1-CRM-UI-2.1 (AGENT): Create `UnifiedTimeline` component with activity type icons, date grouping, and pagination.
  **File(s):** `apps/web/src/components/crm/UnifiedTimeline.tsx` (new)
  **Verification:** Timeline renders all activity types.

- [ ] P1-CRM-UI-2.2 (AGENT): Create `ActivityCreateModal` with type selector and pre‑filled entity context.
  **File(s):** `apps/web/src/components/crm/ActivityCreateModal.tsx` (new)
  **Verification:** Modal creates activities linked to contact.

- [ ] P1-CRM-UI-2.3 (AGENT): Build contact detail page with two‑column layout.
  **File(s):** `apps/web/src/routes/_dashboard/crm/contacts/$contactId.tsx`
  **Verification:** Full detail page functional.

- [ ] P1-CRM-UI-2.4 (HUMAN): Test detail page, activity logging, deal linking, mobile layout. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-3: Build companies list and detail pages

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No dedicated companies page. The companies table exists but has no UI beyond mock data references.
**Size:** Medium

**Description:**
Build companies list (`routes/_dashboard/crm/companies/index.tsx`) and detail (`routes/_dashboard/crm/companies/$companyId.tsx`) pages following the same pattern as contacts.

**(a) List page**: Table with search, filters (industry, size), sortable columns, pagination. Each row shows company name, industry, size, associated contacts count, and status.

**(b) Detail page**: Company header (name, logo/initials, industry, size, website), contacts list (associated contacts with inline actions), deals panel (associated deals), activity timeline, attachments.

**(c) Create/Edit modal**: Company form with all enhanced fields (industry, size, website, address, custom_fields).

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-2` (companies router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-1` (contacts UI — pattern reference)

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/companies/index.tsx` (new)
- `apps/web/src/routes/_dashboard/crm/companies/$companyId.tsx` (new)

**Definition of Done**
- [ ] Companies list page with search, filters, pagination
- [ ] Company detail page with contacts, deals, timeline
- [ ] Create/Edit modal with all enhanced fields
- [ ] Consistent with contacts UI patterns
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Verify companies list
curl http://localhost:3000/crm/companies
# Verify company detail
curl http://localhost:3000/crm/companies/{companyId}
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, I can manage companies and see all associated contacts and deals.

---

#### Subtasks

- [ ] P1-CRM-UI-3.0.25 (AGENT): Reference contacts UI patterns for consistency.
  **Verification:** Patterns documented.

- [ ] P1-CRM-UI-3.1 (AGENT): Build companies list and detail pages.
  **File(s):** `apps/web/src/routes/_dashboard/crm/companies/index.tsx`, `$companyId.tsx` (new)
  **Verification:** Both pages functional.

- [ ] P1-CRM-UI-3.2 (HUMAN): Test companies CRUD, associations, mobile. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-4: Build interactive Kanban board for deals (drag‑and‑drop stages, deal cards)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The existing CRM leads kanban uses a basic implementation. There is no deals kanban with pipeline‑aware stages.
**Size:** Large

**Description:**
Build an interactive kanban board for deals at `routes/_dashboard/crm/deals/board.tsx` using `@dnd-kit` for drag‑and‑drop.

**(a) Board structure**: Columns represent pipeline stages (from `pipelines.getById`). Each column shows the stage name, deal count, and a vertical list of deal cards. The board auto‑sizes columns to fill available width.

**(b) Deal cards**: Each card displays: deal name, company name, value (formatted as currency), close date (with overdue warning if past expected_close_date), contact avatar(s), and priority badge. Cards are color‑coded by deal health (on‑track, at‑risk, stalled).

**(c) Drag‑and‑drop**: Using `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`:
- Cards are draggable between columns and within columns
- `onDragEnd` calls `deals.moveStage` mutation
- Optimistic update: card moves immediately, rolls back on error
- Visual feedback: drop indicator, card lift shadow, column highlight on hover
- Keyboard accessible: cards can be moved via keyboard (Tab to card → Space to pick up → Arrow keys to move → Space to drop)

**(d) Lazy loading**: `@dnd-kit` is loaded lazily to avoid increasing the initial bundle. Following the `@object-ui/plugin-kanban` pattern: `React.lazy()` wrapper for the board implementation, skeleton shown while loading.

**(e) Column limits**: Optional `maxWip` setting per stage (Work‑In‑Progress limit). Column turns red when limit is exceeded.

**(f) Filters**: Pipeline selector (switch between pipelines), owner filter (show only my deals or all deals), date range filter.

**Research Findings (2026‑05‑06):**
- `@dnd-kit` is the 2026 standard for React drag‑and‑drop; `react-beautiful-dnd` is deprecated
- Lazy‑loaded `@dnd-kit` avoids ~100‑150 KB initial bundle impact
- Optimistic UI update immediately, rollback on mutation failure
- Keyboard navigation for accessibility per WCAG AA
- For 100+ cards, virtualize columns with react‑window

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-3` (deals router with moveStage)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-5` (pipelines router for stages)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1`

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/deals/board.tsx` (new)
- `apps/web/src/components/crm/KanbanBoard.tsx` (new)
- `apps/web/src/components/crm/DealCard.tsx` (new)
- `apps/web/package.json` (add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)

**Definition of Done**
- [ ] `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` installed
- [ ] Kanban board renders pipeline stages as columns with deal cards
- [ ] Drag‑and‑drop between columns triggers `deals.moveStage` with optimistic update
- [ ] Cards display name, company, value, close date, contacts, priority
- [ ] Lazy‑loaded `@dnd-kit` with skeleton fallback
- [ ] Keyboard accessible (Tab, Space, Arrow keys)
- [ ] Pipeline switcher and owner filter
- [ ] Column WIP limits with visual warning
- [ ] Responsive: horizontal scroll on mobile
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /crm/deals/board
# Verify: columns for each pipeline stage
# Drag a card from one column to another → card moves immediately → success toast
# Click a card → navigates to deal detail
# Switch pipeline → columns update
# Filter by owner → cards filter

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales manager, I can drag deals between pipeline stages and see the board update instantly, even on slow connections, because the UI optimistically reflects my action.

---

#### Subtasks

- [ ] P1-CRM-UI-4.0.25 (AGENT): Research @dnd-kit kanban patterns, lazy loading, keyboard accessibility.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-CRM-UI-4.1 (AGENT): Install @dnd-kit packages.
  **File(s):** `apps/web/package.json`
  **Verification:** Packages installed.

- [ ] P1-CRM-UI-4.2 (AGENT): Create `DealCard` component with all display fields and drag handle.
  **File(s):** `apps/web/src/components/crm/DealCard.tsx` (new)
  **Verification:** Cards display deal info correctly.

- [ ] P1-CRM-UI-4.3 (AGENT): Create `KanbanBoard` component with lazy‑loaded @dnd-kit, columns, drag‑and‑drop, optimistic updates.
  **File(s):** `apps/web/src/components/crm/KanbanBoard.tsx` (new)
  **Verification:** Drag‑and‑drop moves deals between stages.

- [ ] P1-CRM-UI-4.4 (AGENT): Build deals board route with filters and pipeline switcher.
  **File(s):** `apps/web/src/routes/_dashboard/crm/deals/board.tsx` (new)
  **Verification:** Full kanban page functional.

- [ ] P1-CRM-UI-4.5 (HUMAN): Test drag‑and‑drop, keyboard navigation, filters, mobile, WIP limits. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-5: Build deal detail workspace (timeline, linked contacts, products, tasks)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No deal detail page exists.
**Size:** Medium

**Description:**
Build the deal detail page at `routes/_dashboard/crm/deals/$dealId.tsx` following the same pattern as the contact detail page.

**(a) Layout**: Two‑column. Left: Deal header (name, stage, value, probability, expected close date, pipeline), Activity timeline, Stage history (visual progression bar). Right: Linked contacts, Products/line items (placeholder for Phase 2), Tasks, Attachments.

**(b) Stage history**: Visual timeline showing each stage transition with date, duration in stage, and who moved it. Color‑coded by stage.

**(c) Won/Lost buttons**: Prominent buttons for marking deal as won or lost. Won opens modal with `won_reason` and actual revenue. Lost opens modal with `lost_reason` and competitor info.

**(d) Value formatting**: Deal value formatted as currency using locale‑aware formatter (from P0‑I18N‑3).

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-3` (deals router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-4` (activities router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-4` (kanban board — navigated from)

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/deals/$dealId.tsx` (new)

**Definition of Done**
- [ ] Deal detail page with header, timeline, stage history, linked contacts
- [ ] Won/Lost buttons with reason modals
- [ ] Stage history visual timeline
- [ ] Consistent with contact detail UI patterns
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /crm/deals/{dealId}
# Verify: stage history timeline
# Click "Mark as Won" → modal → confirm → deal updates
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales rep, I can see a deal's full history, manage its pipeline stage, and mark it won or lost.

---

#### Subtasks

- [ ] P1-CRM-UI-5.0.25 (AGENT): Reference contact detail page patterns.
  **Verification:** Patterns documented.

- [ ] P1-CRM-UI-5.1 (AGENT): Build deal detail page.
  **File(s):** `apps/web/src/routes/_dashboard/crm/deals/$dealId.tsx` (new)
  **Verification:** Full deal detail functional.

- [ ] P1-CRM-UI-5.2 (HUMAN): Test deal detail, stage history, won/lost flow. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-6: Build pipeline management interface (create/edit pipelines and stages)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No pipeline management UI. Pipelines are configured via direct database access only.
**Size:** Small

**Description:**
Build pipeline management at `routes/_dashboard/crm/settings/pipelines.tsx` within the CRM settings section.

**(a) Pipeline list**: List of existing pipelines with name, stage count, default indicator. "Create Pipeline" button.

**(b) Pipeline editor**: Click a pipeline → shows ordered list of stages. Drag‑to‑reorder stages. Edit stage name and color inline. "Add Stage" button. "Delete Pipeline" button (with confirmation if deals exist).

**(c) Default pipeline**: Radio button to set default pipeline for new deals.

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-5` (pipelines router)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1`

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/settings/pipelines.tsx` (new)

**Definition of Done**
- [ ] Pipeline list with create/edit/delete
- [ ] Stage reordering via drag‑and‑drop
- [ ] Inline stage name and color editing
- [ ] Default pipeline selection
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /crm/settings/pipelines
# Create a pipeline → verify stages auto‑created
# Drag stage to reorder → verify order persists
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-CRM-UI-6.1 (AGENT): Build pipeline management page.
  **File(s):** `apps/web/src/routes/_dashboard/crm/settings/pipelines.tsx` (new)
  **Verification:** Full pipeline management functional.

- [ ] P1-CRM-UI-6.2 (HUMAN): Test pipeline CRUD, stage reorder, default selection. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-7: Build custom fields admin UI (add/edit/delete field definitions per entity)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No custom fields management. The custom_fields JSONB column exists but users cannot define which fields are available.
**Size:** Small

**Description:**
Build custom fields configuration at `routes/_dashboard/crm/settings/fields.tsx`.

**(a) Entity selector**: Tabs for each CRM entity type (Contacts, Companies, Deals, Leads).

**(b) Field list**: Shows currently configured custom fields for the selected entity. Each field shows: key (name), type (text, number, date, dropdown), "Required" toggle, order.

**(c) Field editor**: Add/edit modal with: key name, type selector, required toggle, dropdown options (if type is dropdown).

**(d) Storage**: Field definitions stored as organization‑level configuration (separate table or in organization settings JSONB). This is about which fields exist — the values themselves are in entity `custom_fields`.

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-1` (custom_fields columns exist)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1`

**Related Files:**
- `apps/web/src/routes/_dashboard/crm/settings/fields.tsx` (new)

**Definition of Done**
- [ ] Entity tab selector for four CRM entities
- [ ] Field list per entity with key, type, required toggle
- [ ] Add/edit/delete field definitions
- [ ] Dropdown options configurator for dropdown type
- [ ] Field definitions stored per organization
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /crm/settings/fields
# Select "Contacts" tab
# Add a custom field "Loyalty Number" type text
# Go to contact detail → verify custom field appears
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-CRM-UI-7.1 (AGENT): Build custom fields admin page.
  **File(s):** `apps/web/src/routes/_dashboard/crm/settings/fields.tsx` (new)
  **Verification:** Custom field definitions managed per entity.

- [ ] P1-CRM-UI-7.2 (HUMAN): Test field creation, entity switching, field display on records. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-8: Implement contact import (CSV upload with column mapping and duplicate detection)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No contact import functionality. Users must manually create each contact.
**Size:** Medium

**Description:**
Build a CSV import wizard at `apps/web/src/components/crm/ImportWizard.tsx` following the 2026 import pattern: file → map → validate → submit.

**(a) Step 1 — File upload**: Drag‑and‑drop zone or file picker. Accepts `.csv` files. Uses PapaParse for client‑side parsing with chunked streaming for large files. Shows preview of first 5 rows after parsing.

**(b) Step 2 — Column mapping**: For each required field in the contacts schema (first_name, last_name, email), let the user map CSV columns to contact fields. Auto‑detect matches by header name (case‑insensitive). Optional fields (phone, title, department, company) can also be mapped. Shows unmapped columns warning.

**(c) Step 3 — Validation & preview**: Client‑side validation of mapped data: email format, required fields, field lengths. Shows validation errors per row with ability to fix inline. Duplicate detection: checks for existing contacts with the same email.

**(d) Step 4 — Import**: Sends validated rows to a tRPC procedure `contacts.import` which: validates server‑side, upserts (update if email exists, create if new), returns summary: `{ created: number, updated: number, skipped: number, errors: RowError[] }`.

**(e) Error handling**: If some rows fail and some succeed, show partial success with error details. All valid rows are imported; invalid rows are skipped with clear reasons. Download error report as CSV option.

**(f) Deduplication strategy**: Server‑side dedup by email (unique constraint). If an imported email matches an existing contact, update the existing record rather than creating a duplicate. Follows the CSVBox 2026 pattern: "Keep deduplication, normalization, and persistence logic on the server where you control business rules and DB constraints."

**Research Findings (2026‑05‑06):**
- PapaParse for client‑side CSV parsing with chunked streaming for large files
- Column mapping UI is the hardest part — auto‑detect by header name
- Deduplication by email on the server
- Partial success: import valid rows, report invalid rows
- "file → map → validate → submit" flow

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-1` (contacts router with import procedure)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1`

**Related Files:**
- `apps/web/src/components/crm/ImportWizard.tsx` (new)
- `apps/web/src/server/trpc/routers/crm/contacts.ts` (add `contacts.import` procedure)

**Definition of Done**
- [ ] PapaParse installed for CSV parsing
- [ ] Four‑step import wizard: upload → map → validate → import
- [ ] Column mapping UI with auto‑detection
- [ ] Client‑side validation with inline errors
- [ ] Server‑side `contacts.import` procedure with upsert logic
- [ ] Duplicate detection by email
- [ ] Partial success handling with error report download
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Upload a CSV with 10 contacts (2 duplicates, 1 invalid email)
# Verify: mapping auto‑detects columns
# Verify: validation flags invalid email
# Verify: import creates 7 new, updates 2, skips 1 with error
# Verify: summary shows correct counts
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a sales ops admin, I can upload a CSV of contacts, map columns, and import them with clear feedback on which rows succeeded and which failed.

---

#### Subtasks

- [ ] P1-CRM-UI-8.0.25 (AGENT): Research PapaParse CSV parsing, column mapping patterns, and deduplication strategies.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-CRM-UI-8.1 (AGENT): Install PapaParse and create `contacts.import` tRPC procedure.
  **File(s):** `apps/web/package.json`, `apps/web/src/server/trpc/routers/crm/contacts.ts`
  **Verification:** Import procedure functional.

- [ ] P1-CRM-UI-8.2 (AGENT): Build `ImportWizard` component with four‑step flow.
  **File(s):** `apps/web/src/components/crm/ImportWizard.tsx` (new)
  **Verification:** Full import flow functional.

- [ ] P1-CRM-UI-8.3 (HUMAN): Test import with various CSV files, duplicate handling, error scenarios. Approve.
  **Verification:** Approved.

---

### [ ] P1-CRM-UI-9: Integrate CRM full‑text search results into global search command palette and CRM list pages

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** CRM search exists only within individual entity list pages. The global command palette (`CommandPalette.tsx`) only navigates to pages, not search results.
**Size:** Small

**Description:**
Integrate CRM search results into:
1. The **global command palette** (`apps/web/src/components/CommandPalette.tsx`): add a "Search CRM" section that shows top 5 results from `crm.search` when the user types a query.
2. **CRM list pages**: add a cross‑entity search bar above the contacts/companies/deals tables that searches all CRM entities and shows results grouped by entity type.

**(a) Command palette integration**: When the user types a query in the command palette, call `crm.search` with the query. Show results grouped under a "CRM" heading with entity type icon, title, and subtitle. Clicking a result navigates to the entity detail page.

**(b) Search results component**: `apps/web/src/components/crm/SearchResults.tsx` — reusable component for displaying CRM search results with entity type grouping, avatars/icons, snippet highlighting, and navigation on click.

**(c) Performance**: Debounce search input at 200ms. Limit to 5 results in command palette, 20 in dedicated search.

**Depends on:**
- `tasks/phase-1/P1-CRM.md → P1-CRM-TRPC-6` (CRM search procedure)
- `tasks/phase-1/P1-CRM.md → P1-CRM-UI-1` (CRM list pages)

**Related Files:**
- `apps/web/src/components/CommandPalette.tsx` (add CRM results section)
- `apps/web/src/components/crm/SearchResults.tsx` (new)

**Definition of Done**
- [ ] Command palette shows CRM search results when query typed
- [ ] Results grouped by entity type with icons
- [ ] Clicking result navigates to entity detail
- [ ] `SearchResults` component reusable across CRM pages
- [ ] Debounced at 200ms
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Open command palette (cmd+K)
# Type "acme" → CRM section appears with matching contacts, companies, deals
# Click a result → navigates to entity detail page
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can search across all CRM records from anywhere in the application using the command palette.

---

#### Subtasks

- [ ] P1-CRM-UI-9.0.25 (AGENT): Read current `CommandPalette.tsx` implementation.
  **Verification:** Current command palette structure documented.

- [ ] P1-CRM-UI-9.1 (AGENT): Create `SearchResults` component with entity type grouping.
  **File(s):** `apps/web/src/components/crm/SearchResults.tsx` (new)
  **Verification:** Search results render with grouping.

- [ ] P1-CRM-UI-9.2 (AGENT): Integrate CRM search into command palette.
  **File(s):** `apps/web/src/components/CommandPalette.tsx`
  **Verification:** Command palette shows CRM results.

- [ ] P1-CRM-UI-9.3 (HUMAN): Test command palette search, result navigation, debounce. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P1‑CRM group are covered.*