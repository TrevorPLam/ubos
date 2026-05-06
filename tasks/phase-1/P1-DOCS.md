# tasks/phase-1/P1-DOCS.md — Documents & Storage

This file covers the documents, document_versions, and document_folders database schema with materialized path hierarchy, RLS, and soft-delete; tRPC CRUD routers with presigned upload/download URL procedures, document search via GIN-indexed tsvector, version history procedures, and pinning/starring; Inngest background jobs for virus scanning, OCR text extraction, and thumbnail generation; the repository page with folder tree navigation and file list, drag-and-drop upload zone, document detail panel with version history and sharing, file preview modal, and document search UI; plus extended UX features including pinning/stars/smart collections, permission badges, share link generation, request-file widget, bulk permissions, and threaded commenting. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑DOCS (2026‑05‑06)

### 1. Document Metadata Schema — The Nexus Pattern with Materialized Path Folders

The canonical 2026 file metadata schema pattern is established by the Nexus project and validated across multiple production DB designs:

- **thomasreichmann/nexus #14 (2026‑01‑13)**: A comprehensive `files` table schema using Drizzle ORM with PostgreSQL. Key columns: `id` (text PK, nanoid), `user_id` (FK with cascade delete), `name` (original filename), `size` (bigint in bytes), `mime_type` (text, nullable), `s3_key` (text UNIQUE — one file per object), `storage_tier` (enum: standard/glacier/deep_archive), `status` (enum: uploading/available/restoring/deleted), `created_at`, `updated_at`, `last_accessed_at`, `deleted_at` (soft delete). Indexes on user_id, status, storage_tier.

- **Folder hierarchy — Materialized Path over Adjacency List for read-heavy workloads**: The 2026 consensus from kindatechnical.com is "Use materialized path when you need fast subtree queries and the hierarchy does not change frequently". The EverPlay guide confirms: "Materialized Path is easy to implement, fast for subtree reads, but moving nodes is expensive because you must update all descendants' paths." For UBOS documents, folders change infrequently (create/delete, rarely move), making materialized path ideal. The `ancestry` column stores paths like `/rootId/parentId/`, enabling `WHERE ancestry LIKE '/parentId/%'` for subtree queries.

- **Dev.to Drizzle ORM 2026 Guide**: "Drizzle ORM works with PostgreSQL, MySQL, SQLite, and more. Supports serverless environments natively (Cloudflare Workers, Vercel Edge, Bun). Has a Drizzle Kit for migrations."

**For UBOS**, the schema follows the Nexus pattern but adapted for multi-tenancy: replace `user_id` with `org_id` (tenant scoping), add `folder_id` (self-referencing FK), and `ancestry` (materialized path). Document versions use an append-only model: "all data变更操作统一转化为追加只写语义，更新并非覆盖原有记录，而是创建一条携带新时间戳的数据版本".

### 2. R2 Presigned URLs — The Content-Type Trap and CORS Requirement

The definitive 2026 production guide from Ishan.page and Cloudflare's official docs converge on critical implementation details:

- **Content-Type Trap**: "if you include `Content-Type` in the signed headers, the browser upload will fail even though curl works fine. When you use `signQuery: true` with aws4fetch, it only signs the host header. Don't sign Content-Type. Don't send it manually from the browser either. Just let the browser handle it automatically."

- **aws4fetch library**: `npm install aws4fetch` — "built specifically for Workers and uses the Web APIs that Workers actually support." Uses `AwsClient` with `service: 's3', region: 'auto'`.

- **CORS is make-or-break**: "Even with a perfect presigned URL, R2 blocks browser requests unless you configure CORS." Required: `AllowedOrigins`, `AllowedMethods: ["GET", "PUT"]`, `AllowedHeaders: ["*"]`, `ExposeHeaders: ["ETag"]`, `MaxAgeSeconds: 3600`.

- **@mesilicon7/simple-r2-utils (2026‑04‑14)**: JSR package providing "secure upload and download URLs without exposing credentials to the client-side."

### 3. Virus Scanning — Cloudflare WAF vs Container ClamAV

- **Cloudflare WAF Malicious Uploads Detection (2026‑04‑16)**: "scans files and other content uploaded to your application for malware. The WAF inspects incoming uploads and checks them for malicious signatures." Uses the same AV scanner as Cloudflare Zero Trust. Available as a WAF feature — requires WAF subscription. EICAR test file in ZIP format for validation.

- **Container-based ClamAV**: Google Cloud Architecture Center recommends "ClamAV running in a Docker container" for on-demand scanning of cloud storage files. Files are streamed from R2 directly into the ClamAV daemon. Works for files up to 200 MB without writing to disk.

- **EICAR Test File**: Industry-standard anti-malware test file available for validating scanning implementations. Multiple formats including ZIP for testing different scanning scenarios.

### 4. OCR Text Extraction — Kreuzberg (2026)

- **kreuzberg (2026‑03‑22)**: "A polyglot document intelligence framework with a Rust core. Extract text, metadata, and structured information from PDFs, Office documents, images, and 88+ formats." Multiple OCR backends (Tesseract, EasyOCR, PaddleOCR) with intelligent table detection. Available for TypeScript (Node/Bun/Wasm/Deno) and via REST API.

- **Tesseract OCR**: The open-source standard. "Can be trained to recognize more than 100 languages, compatible with many programming languages." For UBOS, OCR is an optional Phase 1 enhancement — enabled only for PDF and image files, storing extracted text in the document record for search indexing.

### 5. Thumbnail Generation

- **@terrxo/thumbnail-generator (2025‑07‑05)**: TypeScript client library for thumbnail generation API built with Hono and Cloudflare Workers.

- **Cloudflare Browser Rendering (2026‑02‑24)**: "headless browser automation API for screenshots, PDFs, web scraping, and testing."

- **Cloudflare Image Resizing (2026‑04‑16)**: "programmatically generate custom thumbnail using Cloudflare Workers and Cloudflare Image Resizing." For UBOS, thumbnail generation leverages Cloudflare Image Resizing for image files (generating 200×200 thumbnails) and Browser Rendering for PDF first-page previews.

### 6. PDF Preview — react-pdf (pdf.js)

- **react-pdf**: The standard React PDF viewer built on Mozilla's PDF.js. "Open, preview, and navigate multi-page documents." Supports page navigation, zoom controls, and mobile-friendly modals. For UBOS, the file preview modal uses react-pdf for PDF rendering with presigned download URLs feeding the PDF binary.

- **shadcn.io Document Preview**: "File links need context—this React hover card displays PDF document details with colored icon background, size, type, description, and modification date on file name hover."

### 7. Document Version History — Append-Only Immutable Pattern

The 2026 consensus for document versioning uses an **append-only model** with a separate `document_versions` table:

- **Immutable Append-Only Data Persistence (Issue #50, 2026‑01‑08)**: "All tables must include Immutability Headers: `row_id` (PK UUID for specific version entry), `entity_id` (Stable ID for the object persisting across versions)."

- **知乎 Immutable数据模型调研 (2026‑03‑18)**: "所有的数据变更操作统一转化为追加只写语义。更新并非覆盖原有记录，而是创建一条携带新时间戳的数据版本，原有数据作为历史事实永久保留。"

For UBOS: `document_versions` table stores each version with `document_id` (FK), `version_number` (integer auto-increment), `s3_key` (R2 key for that version's binary), `size`, `created_by`, and `created_at`. The document record's `current_version_id` points to the latest.

### 8. Collaborative Editing — Yjs + Hocuspocus (Phase 2 Foundation)

- **Hocuspocus (2026‑04‑30)**: "A plug & play collaboration backend based on Y.js. The Hocuspocus Server is a WebSocket backend, which has everything to get started quickly, to integrate Y.js in your existing infrastructure and to scale to a million users."

- **Collaborative editing with Yjs (2026‑03‑02)**: Four‑layer progressive enhancement architecture with Layer 3 being "Real-time cursors + selections requiring WebSocket/Hocuspocus."

For UBOS Phase 1, Hocuspocus is **documented but deferred** — the infrastructure is set up (Hocuspocus server deployed as a separate Worker), but the collaborative editing UI is Phase 2 (P3‑ADV‑DOCS‑4).

### 9. Full‑Text Search — PostgreSQL tsvector with GIN

- **PostgreSQL Official Docs (2026‑02‑26)**: "Practical use of text searching usually requires creating an index. We can create a GIN index to speed up text searches: `CREATE INDEX pgweb_idx ON pgweb USING GIN (to_tsvector('english', body))`."

- **Alibaba Cloud FTS Guide (2026‑03‑27)**: "For large tables, use a Generalized Inverted Index (GIN) to speed up tsvector queries. An inverted index stores the mapping from each word to its positions in the dataset."

- **Korean dev team (2026‑02‑09)**: Production tsvector pattern: "search_vector 컬럼 추가 (tsvector 타입), GIN 인덱스 생성, 트리거 함수 생성 (INSERT/UPDATE 시 search_vector 자동 갱신)."

For UBOS documents: `search_vector` column on `documents` table, GIN index, auto-updated via PostgreSQL trigger from `name` and OCR-extracted `content_text`.

### 10. Document Sharing — Configurable Expiry, Password, Permissions

- **AuraPix #10 (2026‑02‑23)**: "Share link creation with expiry/password/access-mode options. Share links can be created, validated, and revoked. Expiry/password policies are enforced server-side."

- **FileRun 2026.1.0**: "One unified sharing panel (users + links) with role-based permissions. Collections can now be shared via links with file editing permission."

- **Shadcn.io Permission Matrix (2026)**: "Manage access control with permission matrix table component. Role columns, permission rows grouped by module, checkbox toggles for granting access."

For UBOS: Share links stored in database with `token` (UUID), `document_id`, `permission` (view/download/edit), `expires_at`, `password_hash` (optional), `max_downloads` (optional), `created_by`, `created_at`.

### 11. Drag‑and‑Drop Upload — react-dropzone

- **shadcn.io Stepper File Upload Flow (2026‑03‑24)**: "A multi-step file upload wizard with drag-drop zone, file preview grid, configuration options, and upload progress bars."

- **react-dropzone (2026‑03‑15)**: "react-dropzone provides a low-level hook that handles drag-and-drop events." The 2026 standard for React file upload components. Used with native HTML5 drag events.

- **jagoral/scrollect #13 (2026‑03‑07)**: "Use existing shadcn/ui components: Card for the drop zone, Button for file picker, sonner toast for notifications. For drag-and-drop, use native HTML5 drag events — no need for a library."

For UBOS: UploadZone component uses react-dropzone + shadcn Card/Button/Progress, uploads directly to R2 via presigned PUT URLs, shows progress via XMLHttpRequest.upload.onprogress.

### 12. PDF Annotation Layer — Separate Storage from Binary

- **Syncfusion React PDF Viewer (2026‑04‑29)**: "Sticky notes and comments anywhere in a PDF file. Annotations can be exported as JSON or XFDF and stored in the database." Supports 20+ annotation types including highlight, underline, strikeout, text markup, free text, ink, shapes, stamps.

- **Annotations stored separately (2026‑02‑23)**: "Replace the sidecar JSON file approach with a database for annotation storage. This is the foundational change that enables multi-user support, version history, and simplifies deployment."

For UBOS Phase 1, annotations are stored as JSONB in a separate `document_annotations` table, referencing document_id, page_number, and user_id — not modifying the original R2 binary.

---

## Task Definitions

### [ ] P1-DOCS-SCHEMA-1: Define documents, document_versions, document_folders, document_links tables

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No document management tables exist in the database schema. The documents page renders static mock data from `documentsData` with no persistence. There is no way to upload, store, version, or search real documents. The R2 bucket and presigned URL infrastructure exists (P0-STORAGE-1, P0-STORAGE-2) but has no database backing or API surface.
**Size:** Large

**Description:**
Create `packages/db/src/schema/documents.ts` with all tables needed for document management, following the Nexus file metadata pattern adapted for multi-tenancy and enhanced with folder hierarchy and version history.

**(a) `documentsTable`**: `id` (UUID PK), `org_id` (UUID FK to organizations), `name` (text NOT NULL — original filename), `size` (bigint NOT NULL — bytes), `mime_type` (text), `r2_key` (text NOT NULL UNIQUE — R2 object key, e.g., `orgs/{orgId}/docs/{uuid}`), `folder_id` (UUID self-ref FK nullable — parent folder), `ancestry` (text — materialized path for subtree queries, e.g., `/rootId/parentId/`), `status` (text DEFAULT 'uploading' — 'uploading', 'available', 'processing', 'deleted'), `description` (text), `tags` (text[]), `is_pinned` (boolean DEFAULT false), `is_starred` (boolean DEFAULT false), `current_version_id` (UUID nullable — FK to document_versions, for latest), `content_text` (text — OCR extracted text for search), `search_vector` (tsvector — auto-generated via PostgreSQL trigger), `created_by` (UUID FK to users), `last_accessed_at` (timestamptz), `deleted_at` (timestamptz — soft delete), `created_at`, `updated_at`. RLS enabled with `tenantTablePolicies()`.

**(b) `documentVersionsTable`**: `id` (UUID PK), `org_id` (UUID FK), `document_id` (UUID FK to documents, NOT NULL), `version_number` (integer NOT NULL), `r2_key` (text NOT NULL — R2 key for this version's binary), `size` (bigint NOT NULL), `mime_type` (text), `change_summary` (text — user-provided description of changes), `created_by` (UUID FK to users), `created_at` (timestamptz DEFAULT NOW()). UNIQUE constraint on `(document_id, version_number)`. The append-only pattern ensures "更新并非覆盖原有记录，而是创建一条携带新时间戳的数据版本".

**(c) `documentFoldersTable`**: `id` (UUID PK), `org_id` (UUID FK), `name` (text NOT NULL), `parent_id` (UUID self-ref FK nullable), `ancestry` (text — materialized path), `sort_order` (integer DEFAULT 0), `color` (text — hex color for UI), `created_by` (UUID FK to users), `created_at`, `updated_at`. RLS enabled.

**(d) `documentShareLinksTable`**: `id` (UUID PK), `org_id` (UUID FK), `document_id` (UUID FK to documents), `token` (text NOT NULL UNIQUE — UUID for share URL), `permission` (text DEFAULT 'view' — 'view', 'download', 'edit'), `password_hash` (text nullable — bcrypt hash), `expires_at` (timestamptz nullable), `max_downloads` (integer nullable), `download_count` (integer DEFAULT 0), `is_revoked` (boolean DEFAULT false), `created_by` (UUID FK to users), `created_at`. RLS enabled.

**(e) `documentAnnotationsTable`**: `id` (UUID PK), `org_id` (UUID FK), `document_id` (UUID FK to documents), `user_id` (UUID FK to users), `page_number` (integer NOT NULL), `annotation_data` (jsonb NOT NULL — stores highlight, strikeout, sticky note, drawing data following JSON/XFDF format), `created_at`, `updated_at`. Stored separately from R2 binary per 2026 best practice.

**(f) `documentCommentsTable`**: `id` (UUID PK), `org_id` (UUID FK), `document_id` (UUID FK to documents), `user_id` (UUID FK to users), `parent_comment_id` (UUID self-ref FK nullable — for threaded replies), `body` (text NOT NULL), `annotation_reference` (jsonb nullable — links to specific annotation), `is_resolved` (boolean DEFAULT false), `created_at`, `updated_at`. RLS enabled.

**(g) Indexes**:
- `documentsTable`: `(org_id, folder_id)` for folder listing, `(org_id, status)` for filtering, `(ancestry)` for subtree queries, `(r2_key)` UNIQUE, `(search_vector)` GIN for full-text search, `(created_by)` for "my files"
- `documentVersionsTable`: `(document_id, version_number)` UNIQUE, `(document_id, created_at)` for version history timeline
- `documentFoldersTable`: `(org_id, parent_id)`, `(ancestry)` for subtree queries
- `documentShareLinksTable`: `(token)` UNIQUE, `(document_id)` for listing shares
- `documentAnnotationsTable`: `(document_id, page_number)` for loading page annotations
- `documentCommentsTable`: `(document_id, created_at)` for comment timeline, `(parent_comment_id)` for threaded view

**(h) PostgreSQL trigger**: Auto-generate `search_vector` from `name` and `content_text` using `to_tsvector('english', coalesce(name, '') || ' ' || coalesce(content_text, ''))`. Trigger fires on INSERT and UPDATE. This follows the Korean production pattern.

**Research Findings (2026‑05‑06):**
- Nexus files table: `s3_key UNIQUE`, `status` enum, `deleted_at` soft delete, user_id FK with cascade
- Materialized path (`ancestry`) for folder hierarchy: `WHERE ancestry LIKE '/parentId/%'` for subtree
- Append-only document versions: immutable records, `version_number` auto-increment, UNIQUE constraint
- Share links: token, permission, password_hash, expires_at, max_downloads, revocation flag
- Annotations stored as JSONB separate from binary — enables multi-user without duplicating files
- PostgreSQL trigger auto-generates tsvector for full-text search
- All tables org‑scoped with RLS

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table verified)
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS helpers consolidated)
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-1` (R2 bucket configured)

**Blocks:**
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-SCHEMA-2` (migration generation)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-TRPC-*` (all document tRPC procedures)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-UI-*` (all document UI tasks)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-JOBS-*` (background processing)
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-2` (entity_links — documents can link to CRM entities)

**Related Files:**
- `packages/db/src/schema/documents.ts` (new)
- `packages/db/src/schema/index.ts` (add re-export)

**Definition of Done**
- [ ] `packages/db/src/schema/documents.ts` created with all six tables
- [ ] `documentsTable`: r2_key UNIQUE, folder_id self-ref FK, ancestry materialized path, status enum, soft delete, search_vector tsvector
- [ ] `documentVersionsTable`: append-only with (document_id, version_number) UNIQUE, separate r2_key per version
- [ ] `documentFoldersTable`: self-referencing parent_id, ancestry for subtree queries, sort_order
- [ ] `documentShareLinksTable`: token UNIQUE, permission enum, password_hash, expires_at, revocation
- [ ] `documentAnnotationsTable`: JSONB annotation_data, (document_id, page_number) composite index
- [ ] `documentCommentsTable`: self-referencing parent_comment_id for threaded replies, is_resolved flag
- [ ] PostgreSQL trigger for auto-generating search_vector from name + content_text
- [ ] GIN index on search_vector for full-text search
- [ ] All tables have `org_id` FK, `enableRLS()`, `tenantTablePolicies()`
- [ ] Self-referencing FKs use `AnyPgColumn` pattern for TypeScript compatibility
- [ ] Schema re-exported from `schema/index.ts`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Storage tier management (standard/glacier — deferred to Phase 2; all files use standard tier)
- File tagging taxonomy (tags are free-text array; structured taxonomy deferred)
- `storage_usage` tracking table (Phase 2 billing)
- Document workflow states (Phase 2 — P3‑ADV‑DOCS‑3)
- E‑signature integration (Phase 2 — P3‑ADV‑DOCS‑1)

**Rules to Follow**
- `r2_key` must follow pattern `orgs/{orgId}/docs/{uuid}` — never user‑supplied filenames.
- `ancestry` must be updated on `folder_id` changes — application‑level responsibility.
- Document versions are append-only — never UPDATE existing version records, only INSERT new ones.
- `search_vector` must be auto‑generated via trigger — never manually maintained.
- `deleted_at` implements soft delete — hard delete deferred to retention policy (Phase 2).
- Never commit migrations before `drizzle-kit generate` confirms correctness.

**Verification**
```bash
# Verify schema compiles
pnpm --filter @ubos/db run typecheck

# Generate migration
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate

# Review generated SQL
cat packages/db/drizzle/*.sql | grep -E "CREATE TABLE|CREATE INDEX|CREATE TRIGGER" | tail -30

# Apply migration
DATABASE_URL=$DATABASE_URL pnpm db:migrate

# Verify tables
psql $DATABASE_URL -c "\dt document*"

# Verify trigger
psql $DATABASE_URL -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%search_vector%';"

# Verify GIN index
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'documents' AND indexdef LIKE '%gin%';"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: Documents form a bounded context. Folders are entities with hierarchical relationships. Document versions are value objects in an append-only event stream. Share links are entities with a defined lifecycle (active → expired → revoked).

---

#### Subtasks

- [ ] P1-DOCS-SCHEMA-1.0.25 (AGENT): Read current R2 infrastructure (P0-STORAGE-1, P0-STORAGE-2), existing `crm.ts` schema patterns, Nexus files table schema, and materialized path hierarchy patterns.
  **Verification:** Current infrastructure and schema patterns documented.

- [ ] P1-DOCS-SCHEMA-1.0.5 (AGENT): Design complete documents schema with all column types, constraints, indexes, triggers. Research materialized path, append-only versioning, share link patterns.
  **Verification:** Full schema diagram documented.

- [ ] P1-DOCS-SCHEMA-1.1 (AGENT): Create `documentsTable` with r2_key, folder_id, ancestry, status, search_vector, and GIN index.
  **File(s):** `packages/db/src/schema/documents.ts` (new)
  **Verification:** Table compiles with all columns and constraints.

- [ ] P1-DOCS-SCHEMA-1.2 (AGENT): Create `documentVersionsTable` with append-only pattern and UNIQUE constraint.
  **File(s):** `packages/db/src/schema/documents.ts`
  **Verification:** Version table follows immutable append-only design.

- [ ] P1-DOCS-SCHEMA-1.3 (AGENT): Create `documentFoldersTable` with self-referencing FK and materialized path.
  **File(s):** `packages/db/src/schema/documents.ts`
  **Verification:** Folder hierarchy with ancestry column.

- [ ] P1-DOCS-SCHEMA-1.4 (AGENT): Create `documentShareLinksTable`, `documentAnnotationsTable`, `documentCommentsTable`.
  **File(s):** `packages/db/src/schema/documents.ts`
  **Verification:** All supporting tables created with appropriate constraints.

- [ ] P1-DOCS-SCHEMA-1.5 (AGENT): Create PostgreSQL trigger function for auto-generating search_vector.
  **File(s):** `packages/db/src/schema/documents.ts`
  **Verification:** Trigger fires on INSERT and UPDATE.

- [ ] P1-DOCS-SCHEMA-1.6 (AGENT): Add re-export to `schema/index.ts`.
  **File(s):** `packages/db/src/schema/index.ts`
  **Verification:** All tables importable from barrel.

- [ ] P1-DOCS-SCHEMA-1.7 (HUMAN): Review complete schema, verify RLS coverage and hierarchy design. Approve.
  **Verification:** Approved.

---

### [ ] P1-DOCS-SCHEMA-2: Create migration and apply

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P1‑DOCS‑SCHEMA‑1 defines new tables but no migration has been generated.
**Size:** Small

**Description:**
Generate and apply the Drizzle migration for the documents schema. Same pattern as P1‑CRM‑SCHEMA‑3.

**Depends on:** P1‑DOCS‑SCHEMA‑1
**Blocks:** All P1‑DOCS‑TRPC‑* and P1‑DOCS‑UI‑* tasks

**Related Files:**
- `packages/db/drizzle/` (new migration files)

**Definition of Done**
- [ ] `drizzle-kit generate` creates a migration with all documents/versions/folders/shares/annotations/comments tables
- [ ] Generated SQL reviewed for correctness: all tables, columns, constraints, FKs, self-referencing FKs, GIN index, trigger, RLS policies
- [ ] Migration applied to development database via `pnpm db:migrate`
- [ ] All new tables queryable via `psql`
- [ ] Trigger functional: INSERT a document → search_vector populated
- [ ] Migration files committed to repository
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate
DATABASE_URL=$DATABASE_URL pnpm db:migrate
psql $DATABASE_URL -c "\dt document*"
# Test trigger
psql $DATABASE_URL -c "INSERT INTO documents (id, org_id, name, size, r2_key) VALUES (gen_random_uuid(), '...', 'test.pdf', 1024, 'orgs/test/docs/test') RETURNING search_vector;"
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-DOCS-SCHEMA-2.1 (AGENT): Run `drizzle-kit generate`, review SQL, apply migration, commit files.
  **Verification:** Migration applied; tables and trigger exist.

- [ ] P1-DOCS-SCHEMA-2.2 (HUMAN): Verify all tables and trigger created correctly. Approve.
  **Verification:** Approved.

---

### [ ] P1-DOCS-TRPC-1: Build documents CRUD router (list, create, update, delete, pagination, filters)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No documents tRPC router exists. All document data is static mock data.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/documents/index.ts` with full CRUD for documents, following the established CRM pattern.

**(a) Procedures**:
- `documents.list` — query: paginated list with filters (folder_id, status, mime_type, is_pinned, is_starred), sort by name/date/size. Returns `{ items: Document[], nextCursor }`.
- `documents.listByFolder` — query: all documents in a folder (or root), with folder breadcrumb trail computed from ancestry.
- `documents.getById` — query: single document with loaded relations (folder, current version, share links count, comment count).
- `documents.create` — mutation: create document metadata record. Called after successful upload confirmation.
- `documents.update` — mutation: update name, description, tags, folder_id (moves document to new folder, updates ancestry).
- `documents.delete` — mutation: soft-delete (sets `deleted_at`). Hard delete via background job after retention period.
- `documents.restore` — mutation: restore soft-deleted document (clears `deleted_at`).
- `documents.togglePin` — mutation: toggle `is_pinned` flag.
- `documents.toggleStar` — mutation: toggle `is_starred` flag.

**(b) Folder procedures**:
- `documents.folders.list` — query: all folders in a parent folder (or root), ordered by sort_order.
- `documents.folders.create` — mutation: create folder with name, optional parent_id, auto‑compute ancestry.
- `documents.folders.update` — mutation: rename folder or change color.
- `documents.folders.delete` — mutation: delete folder (only if empty). Validate no child documents/folders exist.
- `documents.folders.move` — mutation: move folder to new parent. Updates ancestry for folder and all descendants.

**(c) RBAC**: All procedures use `tenantProcedure`.

**Research Findings (2026‑05‑06):**
- Nexus pattern: metadata record in DB, binary in R2
- Materialized path ancestry updates on folder move
- Soft delete with restore capability

**Depends on:**
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-SCHEMA-2`
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-8` (root router)

**Blocks:**
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-UI-1` (repository page)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-TRPC-*` (other tRPC tasks depend on barrel)

**Related Files:**
- `apps/web/src/server/trpc/routers/documents/index.ts` (new)
- `apps/web/src/server/trpc/routers/_app.ts` (add documents router)

**Definition of Done**
- [ ] `documents/index.ts` router created with document CRUD, folder CRUD, pin/star toggles
- [ ] `documents.listByFolder` includes breadcrumb trail
- [ ] `documents.folders.move` updates ancestry for all descendants
- [ ] Soft delete with restore
- [ ] All standard validation and tenant scoping
- [ ] Registered in root app router at `documents.*` namespace
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl http://localhost:3000/api/trpc/documents.list?input={}
curl -X POST http://localhost:3000/api/trpc/documents.folders.create \
  -H "Content-Type: application/json" \
  -d '{"name": "Contracts", "parentId": null}'
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can create folders, upload documents, move them between folders, and pin important files.

---

#### Subtasks

- [ ] P1-DOCS-TRPC-1.0.25 (AGENT): Reference CRM routers for pattern consistency. Research folder hierarchy query patterns.
  **Verification:** Patterns documented.

- [ ] P1-DOCS-TRPC-1.1 (AGENT): Create `documents/index.ts` router with all document and folder procedures.
  **File(s):** `apps/web/src/server/trpc/routers/documents/index.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-DOCS-TRPC-1.2 (AGENT): Register in root app router.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Documents procedures accessible.

- [ ] P1-DOCS-TRPC-1.3 (HUMAN): Test document CRUD, folder operations, move/ancestry updates. Approve.
  **Verification:** Approved.

---

### [ ] P1-DOCS-TRPC-2: Build presigned upload URL procedure

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No upload workflow exists. Users cannot upload files through the application.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/documents/upload.ts` with presigned URL generation for direct-to-R2 uploads, following the ishan.page 2026 production pattern.

**(a) `documents.requestUpload` procedure**:
- Accepts: `{ filename: string, contentType: string, size: number, folderId?: string }`
- Validates: filename (P0‑SEC‑5 sanitization), content type (whitelist: PDF, images, Office docs, text), size (max 50 MB default)
- Generates server‑side `r2Key`: `orgs/{orgId}/docs/{uuid}.{ext}`
- Generates presigned PUT URL via `generatePresignedUploadUrl()` from `r2.ts`, following the aws4fetch pattern with `signQuery: true` — **not** signing Content‑Type
- Returns: `{ uploadUrl, r2Key, documentId }` (document record pre‑created with status `'uploading'`)

**(b) `documents.confirmUpload` procedure**:
- Accepts: `{ documentId: string }`
- Verifies the file was actually uploaded (HEAD request to R2)
- Updates document status from `'uploading'` to `'available'`
- Creates initial version record (version_number = 1) with the same r2Key
- Emits `document/uploaded` event (P1‑DOCS‑TRPC‑7)
- Returns: updated document record

**(c) Content-Type Trap Mitigation**: Following the ishan.page guide exactly — "Don't sign Content-Type. Don't send it manually from the browser either. Just let the browser handle it automatically."

**Research Findings (2026‑05‑06):**
- aws4fetch: `signQuery: true` only signs host header
- Do NOT include Content-Type in signed headers
- CORS must be configured on R2 bucket (done in P0‑STORAGE‑1)
- Browser uploads via XMLHttpRequest or fetch PUT

**Depends on:**
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-2` (R2 presigned URL wrapper)
- `tasks/infrastructure/P0-SEC.md → P0-SEC-5` (filename sanitization)
- `tasks/phase-1/P1-DOCS.md → P1-DOCS-TRPC-1` (documents router for barrel)

**Related Files:**
- `apps/web/src/server/trpc/routers/documents/upload.ts` (new)

**Definition of Done**
- [ ] `documents.requestUpload` validates and returns presigned PUT URL
- [ ] `documents.confirmUpload` verifies upload and creates version record
- [ ] Content-Type NOT signed (following aws4fetch trap mitigation)
- [ ] Pre‑creates document record with status `'uploading'`
- [ ] Emits `document/uploaded` event on confirmation
- [ ] All standard validation and tenant scoping
- [ ] Registered in root app router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Request upload URL
curl -X POST http://localhost:3000/api/trpc/documents.requestUpload \
  -H "Content-Type: application/json" \
  -d '{"filename": "contract.pdf", "contentType": "application/pdf", "size": 204800}'
# → { uploadUrl, r2Key, documentId }

# Upload directly to R2
curl -X PUT "<uploadUrl>" --data-binary "@contract.pdf"

# Confirm upload
curl -X POST http://localhost:3000/api/trpc/documents.confirmUpload \
  -d '{"documentId": "..."}'
# → document status = "available"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can upload files directly to cloud storage through a secure, time‑limited URL without my file ever touching the application server.

---

#### Subtasks

- [ ] P1-DOCS-TRPC-2.0.25 (AGENT): Read P0‑STORAGE‑2 (R2 wrapper) and ishan.page presigned URL guide.
  **Verification:** R2 wrapper API and Content-Type trap understood.

- [ ] P1-DOCS-TRPC-2.1 (AGENT): Create `upload.ts` with requestUpload and confirmUpload procedures.
  **File(s):** `apps/web/src/server/trpc/routers/documents/upload.ts` (new)
  **Verification:** Upload flow functional end‑to‑end.

- [ ] P1-DOCS-TRPC-2.2 (AGENT): Register in root app router.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Upload procedures accessible.

- [ ] P1-DOCS-TRPC-2.3 (HUMAN): Test full upload flow with various file types and sizes. Approve.
  **Verification:** Approved.

---

### [ ] P1-DOCS-TRPC-3 through P1-DOCS-TRPC-8: Build additional document procedures

*(Due to the extensive size of this section, I will create abbreviated definitions for the remaining tRPC tasks following the same pattern as CRM tasks.)*

**P1-DOCS-TRPC-3 — Upload registration**: `documents.registerUpload` — Called after browser upload completes. Verifies R2 object exists via HEAD, updates metadata. (Small)

**P1-DOCS-TRPC-4 — Presigned download/view URL**: `documents.getDownloadUrl` — Generates time‑limited GET presigned URL. Accepts `documentId` or `versionId`. Records access in `last_accessed_at`. (Small)

**P1-DOCS-TRPC-5 — Document search**: `documents.search` — Full‑text search via PostgreSQL `websearch_to_tsquery` against `search_vector` column. Returns ranked results with highlighted snippets using `ts_headline`. Falls back to ILIKE if tsvector not yet populated. (Medium)

**P1-DOCS-TRPC-6 — Version history**: `documents.versions.list` (paginated timeline), `documents.versions.getById`, `documents.versions.restore` (creates new version from historical one — append-only, never overwrites). (Medium)

**P1-DOCS-TRPC-7 — Event emission**: `document/uploaded` and `document/deleted` events via Inngest for cross‑module workflows. (Small)

**P1-DOCS-TRPC-8 — Pinning/starring**: `documents.togglePin`, `documents.toggleStar` — included in P1‑DOCS‑TRPC‑1. (Already covered)

---

### [ ] P1-DOCS-JOBS-1 through P1-DOCS-JOBS-3: Background Processing

**P1-DOCS-JOBS-1 — Virus scanning Inngest function**: On `document/uploaded` event → check file type (scan only PDF, Office, archives). For Cloudflare WAF plan: configure WAF malicious uploads detection (no code). For non-WAF: call ClamAV container via HTTP API to stream from R2 and scan. On virus detection: set document status to `'quarantined'`, notify uploader, delete from R2. Uses EICAR test file for validation. (Medium)

**P1-DOCS-JOBS-2 — OCR text extraction job**: On `document/uploaded` event (PDF and image files only) → download from R2 → extract text via Tesseract or kreuzberg API → store in `content_text` column → trigger search_vector update. Optional Phase 1 enhancement — enabled via feature flag. (Medium)

**P1-DOCS-JOBS-3 — Thumbnail generation job**: On `document/uploaded` event → for images: use Cloudflare Image Resizing to generate 200×200 thumbnail, store in R2 at `orgs/{orgId}/thumbnails/{uuid}`. For PDFs: use Cloudflare Browser Rendering for first‑page screenshot. Store `thumbnail_key` on document record. (Small)

---

### [ ] P1-DOCS-UI-1 through P1-DOCS-UI-6: User Interfaces

**P1-DOCS-UI-1 — Repository page**: Full folder tree navigation (left sidebar) with expand/collapse, file list table (right) with configurable columns (Name, Size, Type, Modified, Actions). Breadcrumb trail. "Upload" and "New Folder" buttons. Context menu (right‑click) on files/folders. Drag files into folders. Empty state for new organizations. Responsive: tree collapses into Sheet drawer on mobile. (Large)

**P1-DOCS-UI-2 — Upload zone**: Drag‑and‑drop zone using react-dropzone, file type validation, per‑file upload progress bars via XMLHttpRequest.upload.onprogress. Multiple file upload support. "Browse files" button as fallback. Preview thumbnails in upload queue. (Medium)

**P1-DOCS-UI-3 — Document detail panel**: Slide‑out Sheet or full page showing: file preview (PDF/image), metadata (name, size, type, dates), version history timeline, share links management, comments tab, activity log. Actions: Download, Share, Rename, Move, Delete, New Version. (Medium)

**P1-DOCS-UI-4 — Version history timeline**: Chronological list of versions with version number, size, change summary, uploader avatar, date. "Download this version" link. "Restore this version" button (creates new version, doesn't overwrite). Diff viewer placeholder for text files. (Medium)

**P1-DOCS-UI-5 — File preview modal**: Full‑screen modal using react‑pdf (pdf.js) for PDFs with page navigation, zoom controls, and mobile‑friendly toolbar. For images: lightbox viewer with zoom. For unsupported types: file type icon with download button. Uses presigned GET URLs for accessing R2 binary. (Medium)

**P1-DOCS-UI-6 — Document search UI**: Search bar with debounced input (200ms). Results grouped by: file name matches, content matches (from OCR). Highlighted search terms. Filters: file type, date range, folder scope. Recent searches list. (Small)

---

### [ ] P1-DOCS-UI-EXT-1 through P1-DOCS-UI-EXT-6: Extended UX Features

**P1-DOCS-UI-EXT-1 — Smart collections**: "Pinned" tab (is_pinned=true), "Starred" tab (is_starred=true), "Recent" tab (last_accessed_at, last 7 days), "Shared with me" tab. Auto‑grouped by client/project/deal if entity_links exist. (Medium)

**P1-DOCS-UI-EXT-2 — Permission badge**: Visual badge on files/folders showing sharing status: Private (lock icon), Shared (users icon + count), Public link (link icon). Click opens sharing panel. (Small)

**P1-DOCS-UI-EXT-3 — Share link dialog**: Modal with: "Create Share Link" button → generates token/password/expiry options. Copy link button. Link settings: permission level (view/download/edit), expiry date picker, optional password, max downloads counter. Revoke button. List of existing share links with status. (Medium)

**P1-DOCS-UI-EXT-4 — Request file widget**: Embeddable component for external users to upload files without an account. Generates a temporary upload token. Uploaded files appear in a designated "Requests" folder. Email notification to document owner. (Medium)

**P1-DOCS-UI-EXT-5 — Bulk permissions**: Multi‑select files/folders → "Manage Permissions" action. Batch add/remove user access. Batch create share links. Batch move to folder. Batch delete. (Small)

**P1-DOCS-UI-EXT-6 — Threaded commenting**: Comment panel in document detail. Threaded replies. @mentions with user autocomplete. Mark comments as resolved. Comment activity in document activity feed. (Large)

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P1‑DOCS group are covered.*