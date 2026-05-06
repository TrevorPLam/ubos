# tasks/phase-1/P1-PROJ.md — Projects & Tasks

This file covers the projects, tasks, milestones, task_dependencies, and project_members database schema with RLS and self-referencing foreign keys, tRPC CRUD routers with circular dependency detection, milestone tracking with progress rollup, event emission for cross-module workflows, a kanban board using `@dnd-kit`, a hierarchical task list view, task detail panel, a Gantt chart placeholder using SVAR React Gantt (MIT), and a projects settings page for workflow statuses, issue types, and templates. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P1‑PROJ (2026‑05‑06)

### 1. Project Management Database Schema — Self-Referencing Task Hierarchies

The canonical project management schema in 2026 uses self-referencing foreign keys for task hierarchies and junction tables for many-to-many relationships:

- **Drizzle ORM Self-Referencing FK Pattern**: "Drizzle ORM provides two solutions for self-referencing foreign key type issues: explicitly type the referenced column within the foreign key definition closure, or use `references((): AnyPgColumn => table.id)` to bypass TypeScript's circular dependency check during initialization." This is the established pattern for `parent_task_id` on the tasks table.

- **Efficient Progress Aggregation in Deeply Nested Task Hierarchies (dev.to, 2025)**: The article identifies five design alternatives for task hierarchy progress: eager propagation (immediately update all parents), lazy aggregation (compute on-demand), partial propagation (update immediate parent only), selective caching (cache visible branches), and triggers/recursive CTEs (SQL-side recursive logic). For UBOS Phase 0/1, **lazy aggregation with a materialized path** (`ancestry` column) is the recommended approach: compute rollup progress via recursive CTE on read, not on write.

- **MakerKit Drizzle SaaS Schema (2026)**: "The Next.js Drizzle SaaS Kit uses a multi-tenant database schema with organization-based isolation. All tables are defined using Drizzle ORM in TypeScript, giving you full type safety from schema definition to queries. The core tables already include primary key and foreign key indexes."

- **JetStyle Task Tracker System (2026)**: "The Task Tracker System implements robust schema validation using Drizzle ORM combined with Zod for OpenAPI integration. Key features include flexible task and project data models."

### 2. Gantt Chart Libraries — SVAR React Gantt is the 2026 Standout

The 2026 landscape for React Gantt chart libraries is well-covered by a comprehensive dev.to comparison published May 5, 2026:

- **dev.to "Best React Gantt Chart Libraries" (2026-05-05)**: "Best for: Highly customizable SaaS dashboards and React apps requiring scalable scheduling logic." Evaluates libraries on architecture, scalability, integration, and licensing.

- **SVAR React Gantt** is the strongest fit for UBOS (MIT license, React 19 compatible, TypeScript):
  - "The open-source core includes essential functionality such as task management, dependencies, drag-and-drop timeline editing, and UI customization."
  - "SVAR React Gantt is a customizable, high-performance Gantt chart component written in React. It offers a developer-friendly API, full TypeScript support, React 19 compatibility, and flexible CSS styling."
  - Installation: `npm install @svar-ui/react-gantt`
  - MIT licensed since v2.4: "This means you can now use the Gantt component freely in personal projects, open-source applications or commercial products."
  - "The component includes light and dark themes and supports full customization via CSS and React-based API."

- **gantt-task-react** (MIT) is recommended by the HyperGenius project as a simpler alternative: "ガントチャート表示用コンポーネントの実装。ライブラリには gantt-task-react (MIT License) を採用する。"

- **Smart.Gantt** (Web Components, 2026): "Framework-agnostic. Interactive task bars with drag-and-drop editing. Task dependencies and hierarchical structures."

**Decision for UBOS Phase 1**: Use **SVAR React Gantt (MIT)** for the Gantt chart. Its React-native architecture, MIT license, theme support matching UBOS's dark theme, and built-in task dependency visualization make it the best fit. The Gantt chart is a **placeholder/basic implementation** in Phase 1 — full timeline editing deferred to Phase 2.

### 3. @dnd-kit Multi-Container Kanban — The Standard Pattern

The 2026 consensus for project task kanban boards uses `@dnd-kit` with multiple `SortableContext` providers within a single `DndContext`:

- **dnd-kit DeepWiki (2026-03-06)**: "For sortable lists with multiple containers (e.g., kanban boards), use multiple SortableContext providers within a single DndContext." The architecture requires: single `DndContext` managing all containers, each container with its own `SortableContext`, `useDroppable` zones for empty containers, and `onDragOver` callback for cross-container movement detection.

- **@object-ui/plugin-kanban (2026-02-16)**: "A lazy-loaded kanban board component based on @dnd-kit for drag-and-drop functionality. @dnd-kit libraries are loaded on-demand using React.lazy() and Suspense."

- **ihanikos/the-best-nextjs-app #33 (2026-02-12)**: "Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities - Create KanbanBoard component with drag-and-drop - Update Project interface to support task status."

- **Japanese Zenn tutorial (2026-02-17)**: "useDraggable + useDroppable を用いた場合の大まかな実装手順"

- **Key patterns for UBOS**:
  - `verticalListSortingStrategy` for task cards within columns
  - `useDroppable` wrappers for empty columns
  - `onDragOver` for cross-column movement detection
  - `arrayMove` from `@dnd-kit/sortable` for state updates
  - Optimistic updates via TanStack Query `onMutate`

### 4. Circular Dependency Detection — Topological Sort is Standard

For validating task dependencies (e.g., Task A depends on Task B which depends on Task A), the standard algorithm is **depth-first search (DFS) cycle detection** within topological sorting:

- **npm taskx (2025)**: "Circular Dependency Detection - Detect circular dependencies using topological sorting algorithm - Runtime automatic detection and prevention of infinite recursion - Provide clear error messages."

The DFS approach: when adding a dependency edge `A → B`, traverse from `B` checking if `A` is reachable. If yes, reject the dependency as circular. The check is `O(V + E)` where V is tasks in the subgraph and E is dependency edges. In production, this is applied at the application level (tRPC procedure) before inserting into the `task_dependencies` table, using a recursive CTE or iterative DFS.

### 5. Milestone Progress Rollup — Recursive CTE Pattern

The 2026 standard for computing milestone progress from child tasks uses PostgreSQL recursive CTEs:

- **dev.to Task Hierarchy Article (2025)**: "Lazy Aggregation: Only compute and propagate totals on-demand (e.g., when rendering UI or fetching aggregate data)." Also: "Triggers or Recursive CTEs: Use SQL-side recursive logic to compute aggregate durations only when queried."

- **PostgreSQL ROLLUP and GROUPING SETS guide (2026-01-07)**: "ROLLUP is designed for hierarchical aggregations where data naturally follows a parent–child relationship. It automatically produces subtotals and grand totals by progressively reducing the grouping columns."

For UBOS milestones, the progress percentage is computed as: `COUNT(tasks WHERE status='done') / COUNT(tasks) * 100` for all leaf tasks linked to the milestone, computed on read via a SQL query (not eagerly propagated). This avoids the write amplification described in the dev.to article.

### 6. Project Settings — Workflow Statuses, Issue Types, Templates

The 2026 consensus from production SaaS PM tools:

- **ServiceDesk Plus (2026-04-27)**: "Project Settings - You can now configure scheduling and closure behavior for your projects from the new Settings tab in projects and project templates. Introducing a new ProjectConfig role that allows users to customize project fields, configure templates, triggers, notifications, tasks, custom functions, webhooks, notification rules, types, status, and roles."

- **Agiled (2026-02-01)**: "Project Templates Save project structures as templates. Spin up new projects with pre-defined tasks and milestones."

- **Hornbill Docs**: "Project Templates allow you to define re-usable settings that can be used to quickly create new projects."

For UBOS Phase 1, the Projects Settings page covers three sub-pages:
1. **Workflow Statuses**: Define and reorder task statuses per project or org-wide (e.g., Backlog, Todo, In Progress, Review, Done)
2. **Issue Types**: Define task categories per project (e.g., Bug, Feature, Task, Epic)
3. **Templates**: Save project structure as reusable template

### 7. TanStack Router Nested Project Routes

- **TanStack Router File-Based Routing**: "Dynamic segments are created by starting the parameter name with a `$` inside the filename. The dynamic parameter can then be accessed inside the route using the `useParams` method or in a loader."

- **vedovelli/ai-dev-team-simulation #416 (2026-03-18)**: "Implement nested routes: /settings, /settings/profile, /settings/notifications, /settings/display - Define query key hierarchy for settings endpoints."

For UBOS projects, the nested route structure is:
```
_dashboard/
  projects/
    index.tsx           # /projects (project list)
    $projectId.tsx      # /projects/$projectId (project overview)
    $projectId/
      board.tsx         # /projects/$projectId/board (kanban)
      list.tsx          # /projects/$projectId/list (hierarchical list)
```

---

## Task Definitions

### [ ] P1-PROJ-SCHEMA-1: Define projects, tasks, milestones, task_dependencies, project_members tables

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No project management tables exist in the database schema. The projects page currently renders static mock data from `projectsData` with no persistence. There is no way to create, update, or delete projects, tasks, or milestones through the API.
**Size:** Medium

**Description:**
Create `packages/db/src/schema/projects.ts` with all tables needed for project management, following the 2026 consensus architecture of hierarchical task storage with self-referencing FKs and materialized paths.

**(a) `projectsTable`**: `id` (UUID PK), `org_id` (UUID FK to organizations), `name` (text NOT NULL), `description` (text), `status` (text DEFAULT 'active' — 'active', 'completed', 'on_hold', 'cancelled'), `start_date` (timestamptz), `end_date` (timestamptz), `owner_id` (UUID FK to users), `budget` (integer — in cents), `is_template` (boolean DEFAULT false), `template_id` (UUID self-ref FK, nullable), `custom_fields` (jsonb DEFAULT '[]'::jsonb), `created_at`, `updated_at`. RLS enabled with `tenantTablePolicies()`.

**(b) `tasksTable`**: `id` (UUID PK), `org_id` (UUID FK), `project_id` (UUID FK to projects), `title` (text NOT NULL), `description` (text), `status` (text DEFAULT 'todo'), `priority` (text DEFAULT 'medium' — 'low', 'medium', 'high', 'urgent'), `assignee_id` (UUID FK to users), `parent_task_id` (UUID self-ref FK — nullable, for hierarchy), `sort_order` (integer), `ancestry` (text — materialized path, e.g., `/rootId/parentId/` for fast subtree queries), `due_date` (timestamptz), `estimated_hours` (numeric), `actual_hours` (numeric), `custom_fields` (jsonb DEFAULT '[]'::jsonb), `created_at`, `updated_at`. Self-referencing FK uses the Drizzle pattern: `references((): AnyPgColumn => tasksTable.id)` to bypass TypeScript circular dependency. RLS enabled.

**(c) `milestonesTable`**: `id` (UUID PK), `org_id` (UUID FK), `project_id` (UUID FK to projects), `name` (text NOT NULL), `description` (text), `due_date` (timestamptz), `status` (text DEFAULT 'pending' — 'pending', 'in_progress', 'completed'), `sort_order` (integer), `created_at`, `updated_at`. RLS enabled.

**(d) `taskDependenciesTable`**: `id` (UUID PK), `org_id` (UUID FK), `task_id` (UUID FK to tasks), `depends_on_task_id` (UUID FK to tasks), `dependency_type` (text DEFAULT 'blocks' — 'blocks', 'is_blocked_by', 'relates_to'), `created_at`. UNIQUE constraint on `(task_id, depends_on_task_id)`. CHECK constraint preventing self-dependency (`task_id != depends_on_task_id`). RLS enabled.

**(e) `projectMembersTable`**: `id` (UUID PK), `org_id` (UUID FK), `project_id` (UUID FK to projects), `user_id` (UUID FK to users), `role` (text DEFAULT 'member' — 'owner', 'manager', 'member', 'viewer'), `created_at`. UNIQUE constraint on `(project_id, user_id)`. RLS enabled.

**(f) `projectSettingsTable`**: `id` (UUID PK), `org_id` (UUID FK), `project_id` (UUID FK to projects — nullable for org-wide defaults), `workflow_statuses` (jsonb — array of `{ name, color, sort_order }`), `issue_types` (jsonb — array of `{ name, icon, color }`), `created_at`, `updated_at`. UNIQUE on `(org_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'))`.

**(g) Indexes**: 
- `tasksTable`: composite index `(project_id, sort_order)` for ordered list queries, `(parent_task_id)` for hierarchy, `(ancestry)` for subtree queries, `(assignee_id)` for my-tasks filter
- `milestonesTable`: `(project_id, sort_order)`
- `taskDependenciesTable`: `(task_id)`, `(depends_on_task_id)`
- `projectMembersTable`: `(user_id)` for "my projects" queries

**Research Findings (2026‑05‑06):**
- Self-referencing FKs use `references((): AnyPgColumn => table.id)` pattern for TypeScript compatibility
- Materialized path (`ancestry`) is the 2026 consensus for fast subtree queries without expensive recursive CTEs
- Lazy aggregation for milestone progress: compute on read, not on write
- JSONB `workflow_statuses` and `issue_types` enable per-project customization
- All tables must be org-scoped with RLS enabled

**Depends on:**
- `tasks/infrastructure/P0-DB.md → P0-DB-5` (organizations table verified)
- `tasks/infrastructure/P0-DB.md → P0-DB-3` (RLS helpers consolidated)

**Blocks:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SCHEMA-2` (migration generation)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-*` (all project tRPC procedures)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-*` (all project UI tasks)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SETTINGS-1` (project settings)

**Related Files:**
- `packages/db/src/schema/projects.ts` (new)
- `packages/db/src/schema/index.ts` (add re-export)

**Definition of Done**
- [ ] `packages/db/src/schema/projects.ts` created with all six tables
- [ ] `projectsTable`: name, status, dates, budget, is_template, template_id, custom_fields
- [ ] `tasksTable`: title, status, priority, assignee, parent_task_id (self‑ref FK), sort_order, ancestry, due_date, estimated_hours
- [ ] `milestonesTable`: name, due_date, status, sort_order
- [ ] `taskDependenciesTable`: task_id + depends_on_task_id with UNIQUE constraint and self‑dependency CHECK
- [ ] `projectMembersTable`: project_id + user_id with UNIQUE and role field
- [ ] `projectSettingsTable`: workflow_statuses (JSONB), issue_types (JSONB) with per‑project or org‑wide scope
- [ ] Self‑referencing FK on `tasksTable.parent_task_id` uses `AnyPgColumn` pattern
- [ ] All tables have `org_id` FK, `enableRLS()`, `tenantTablePolicies()`
- [ ] All appropriate composite indexes created
- [ ] Schema re‑exported from `schema/index.ts`
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Time entries table (Phase 2 — P3‑TIME‑1)
- Gantt‑specific scheduling fields (Phase 2)
- Resource allocation and workload tracking (Phase 2)
- Project template cloning (Phase 2 — P1‑PROJ‑SETTINGS‑1 covers template definition only)

**Rules to Follow**
- Self‑referencing FKs must use the `references((): AnyPgColumn => ...)` pattern to avoid TypeScript circular dependency errors.
- `ancestry` must be updated on parent_task_id changes — application‑level responsibility.
- `taskDependenciesTable` must have CHECK `task_id != depends_on_task_id` enforced at database level.
- JSONB columns must use `NOT NULL DEFAULT '[]'::jsonb` — never `NULL`.
- Never commit migrations before `drizzle-kit generate` confirms correctness.

**Verification**
```bash
# Verify schema compiles
pnpm --filter @ubos/db run typecheck

# Generate migration
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate

# Review generated SQL
cat packages/db/drizzle/*.sql | tail -100

# Apply migration
DATABASE_URL=$DATABASE_URL pnpm db:migrate

# Verify tables exist
psql $DATABASE_URL -c "\dt projects tasks milestones task_dependencies project_members project_settings"

# Verify RLS
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'project%' OR tablename LIKE 'task%' OR tablename LIKE 'milestone%';"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: Projects form a bounded context. Tasks are entities within that context. Milestones are value objects that aggregate task progress. Task dependencies enforce domain invariants (no circular chains).

---

#### Subtasks

- [ ] P1-PROJ-SCHEMA-1.0.25 (AGENT): Read current `packages/db/src/schema/policies.ts`, `organizations.ts`, and `crm.ts` for pattern reference. Catalog RLS helper usage.
  **Verification:** Current patterns documented.

- [ ] P1-PROJ-SCHEMA-1.0.5 (AGENT): Design complete projects schema with all column types, constraints, indexes. Research self‑referencing FK patterns and materialized path design.
  **Verification:** Full schema diagram documented.

- [ ] P1-PROJ-SCHEMA-1.1 (AGENT): Create `projectsTable` and `tasksTable` with self‑referencing FK and ancestry column.
  **File(s):** `packages/db/src/schema/projects.ts` (new)
  **Verification:** Tables compile with correct FK relationships.

- [ ] P1-PROJ-SCHEMA-1.2 (AGENT): Create `milestonesTable`, `taskDependenciesTable`, `projectMembersTable`, `projectSettingsTable`.
  **File(s):** `packages/db/src/schema/projects.ts`
  **Verification:** All constraints and indexes in place.

- [ ] P1-PROJ-SCHEMA-1.3 (AGENT): Add re‑export to `schema/index.ts`.
  **File(s):** `packages/db/src/schema/index.ts`
  **Verification:** All tables importable from barrel.

- [ ] P1-PROJ-SCHEMA-1.4 (HUMAN): Review complete schema, verify RLS coverage and self‑referencing FK pattern. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-SCHEMA-2: Create migration and apply

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P1‑PROJ‑SCHEMA‑1 defines new tables but no migration has been generated.
**Size:** Small

**Description:**
Generate and apply the Drizzle migration for the projects schema. Same pattern as P1‑CRM‑SCHEMA‑3.

**Depends on:** P1‑PROJ‑SCHEMA‑1
**Blocks:** All P1‑PROJ‑TRPC‑* and P1‑PROJ‑UI‑* tasks

**Related Files:**
- `packages/db/drizzle/` (new migration files)

**Definition of Done**
- [ ] `drizzle-kit generate` creates a migration with all projects/tasks/milestones tables
- [ ] Generated SQL reviewed for correctness: all tables, columns, constraints, FKs, self‑referencing FK, indexes, RLS policies
- [ ] Migration applied to development database via `pnpm db:migrate`
- [ ] All new tables queryable via `psql`
- [ ] Migration files committed to repository
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Generate migration
cd packages/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit generate
# Apply
DATABASE_URL=$DATABASE_URL pnpm db:migrate
# Verify
psql $DATABASE_URL -c "\dt project*"
psql $DATABASE_URL -c "\dt task*"
psql $DATABASE_URL -c "\dt milestone*"
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-SCHEMA-2.1 (AGENT): Run `drizzle-kit generate`, review SQL, apply migration, commit files.
  **Verification:** Migration applied; tables exist.

- [ ] P1-PROJ-SCHEMA-2.2 (HUMAN): Verify all tables created with correct schema. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-SETTINGS-1: Build Projects Settings section (Workflow Statuses, Issue Types, Templates)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No project‑specific settings exist. All projects use hardcoded statuses ("Focus", "This Week", "Later") and issue types. There is no way to customize workflows per project.
**Size:** Medium

**Description:**
Build the Projects Settings section under the settings layout (from P1‑SETTINGS‑ARCH‑1) with three sub‑pages accessible at `/settings/projects/workflow`, `/settings/projects/issue-types`, `/settings/projects/templates`.

**(a) Workflow Statuses page** (`routes/_dashboard/settings/projects/workflow.tsx`):
- List of statuses with name, color swatch, and drag‑to‑reorder
- Each status: editable name, color picker (preset palette)
- "Add Status" button
- Default statuses: Backlog, Todo, In Progress, In Review, Done
- WIP limits toggle per status (optional — Phase 2)

**(b) Issue Types page** (`routes/_dashboard/settings/projects/issue-types.tsx`):
- List of issue types with name, icon, color
- Edit/delete existing types
- "Add Issue Type" button
- Default types: Task, Bug, Feature, Improvement, Epic
- Each type has: name, Lucide icon selector, color

**(c) Templates page** (`routes/_dashboard/settings/projects/templates.tsx`):
- List of saved project templates
- "Save as Template" button: saves current project structure (statuses, tasks, milestones) as a reusable template
- "Create Project from Template" action
- Template detail: shows included task counts, milestone counts

**(d) Data persistence**: Project settings stored in `projectSettingsTable`. CRUD via tRPC procedures: `projects.settings.get`, `projects.settings.updateWorkflow`, `projects.settings.updateIssueTypes`, `projects.settings.saveTemplate`, `projects.settings.listTemplates`.

**Research Findings (2026‑05‑06):**
- ServiceDesk Plus 2026: "Project Settings - configure scheduling, closure behavior, project fields, templates, types, status."
- Agiled 2026: "Save project structures as templates. Spin up new projects with pre-defined tasks and milestones."

**Depends on:**
- `tasks/phase-1/P1-SETTINGS.md → P1-SETTINGS-ARCH-1` (settings layout)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SCHEMA-2` (schema migrated)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/_dashboard/settings/projects/workflow.tsx` (new)
- `apps/web/src/routes/_dashboard/settings/projects/issue-types.tsx` (new)
- `apps/web/src/routes/_dashboard/settings/projects/templates.tsx` (new)
- `apps/web/src/server/trpc/routers/projects/settings.ts` (new)

**Definition of Done**
- [ ] Three settings sub‑pages at `/settings/projects/workflow`, `/settings/projects/issue-types`, `/settings/projects/templates`
- [ ] Workflow statuses: drag‑to‑reorder, name editing, color picker, default statuses
- [ ] Issue types: CRUD with icon selector and color
- [ ] Templates: save current project as template, list templates, create from template
- [ ] Settings sidebar updated with "Projects" group under settings (or a sub‑nav)
- [ ] tRPC procedures for all settings operations
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /settings/projects/workflow
# Drag status to reorder → persists on refresh
# Navigate to /settings/projects/issue-types
# Add new issue type "Incident" with red color
# Navigate to /settings/projects/templates
# Save current project as template → appears in list

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a PM, I can customize task workflows and issue types per project, and save project structures as reusable templates.

---

#### Subtasks

- [ ] P1-PROJ-SETTINGS-1.0.25 (AGENT): Read P1‑SETTINGS‑ARCH‑1 output and `projectSettingsTable` schema.
  **Verification:** Settings layout and schema understood.

- [ ] P1-PROJ-SETTINGS-1.0.5 (AGENT): Design workflow statuses, issue types, and templates UX.
  **Verification:** Design documented.

- [ ] P1-PROJ-SETTINGS-1.1 (AGENT): Build workflow statuses settings page with drag‑to‑reorder and color picker.
  **File(s):** `apps/web/src/routes/_dashboard/settings/projects/workflow.tsx` (new)
  **Verification:** Status CRUD functional.

- [ ] P1-PROJ-SETTINGS-1.2 (AGENT): Build issue types settings page with icon selector.
  **File(s):** `apps/web/src/routes/_dashboard/settings/projects/issue-types.tsx` (new)
  **Verification:** Issue type CRUD functional.

- [ ] P1-PROJ-SETTINGS-1.3 (AGENT): Build templates settings page with save/create from template.
  **File(s):** `apps/web/src/routes/_dashboard/settings/projects/templates.tsx` (new)
  **Verification:** Templates save and load correctly.

- [ ] P1-PROJ-SETTINGS-1.4 (HUMAN): Test all three settings pages. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-TRPC-1: Build projects CRUD router (list, create, update, delete)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No projects tRPC router exists. All project data is static mock data.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/projects/index.ts` with full CRUD for projects, following the established CRM pattern.

**(a) Procedures**:
- `projects.list` — query: paginated list with filters (status, owner, search by name), optional include member count and task completion percentage
- `projects.getById` — query: single project with loaded relations (member count, milestone count, task counts by status)
- `projects.create` — mutation: create project with Zod‑validated input, auto‑add creator as owner member
- `projects.update` — mutation: update project fields, validate tenant ownership
- `projects.delete` — mutation: soft‑delete project (set `status = 'archived'`), validate tenant ownership
- `projects.listByMember` — query: list projects where current user is a member (for "My Projects")

**(b) Member management**:
- `projects.members.list` — query: list project members with roles
- `projects.members.add` — mutation: add user to project with role
- `projects.members.remove` — mutation: remove member
- `projects.members.updateRole` — mutation: change member role

**(c) RBAC**: All procedures use `tenantProcedure`. Member management restricted to project owners and managers.

**Research Findings (2026‑05‑06):**
- Standard tRPC CRUD pattern from CRM router
- Cursor‑based pagination for list endpoints

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SCHEMA-2`
- `tasks/infrastructure/P0-TRPC.md → P0-TRPC-8` (root router)

**Blocks:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-1` (project list page)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-2` (project overview)

**Related Files:**
- `apps/web/src/server/trpc/routers/projects/index.ts` (new)
- `apps/web/src/server/trpc/routers/_app.ts` (add projects router)

**Definition of Done**
- [ ] `projects.ts` router created with list, getById, create, update, delete, listByMember procedures
- [ ] Member management procedures: members.list, members.add, members.remove, members.updateRole
- [ ] Owner/manager RBAC for member management
- [ ] Task completion percentage included in getById via lazy aggregation (NOT eager propagation)
- [ ] All standard validation and tenant scoping
- [ ] Registered in root app router at `projects.*` namespace
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl http://localhost:3000/api/trpc/projects.list?input={}
curl -X POST http://localhost:3000/api/trpc/projects.create \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "description": "Q3 initiative"}'
curl http://localhost:3000/api/trpc/projects.getById?input={"projectId":"..."}
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a PM, I can create projects, invite team members, and see project progress at a glance.

---

#### Subtasks

- [ ] P1-PROJ-TRPC-1.0.25 (AGENT): Reference CRM routers for pattern consistency.
  **Verification:** Patterns documented.

- [ ] P1-PROJ-TRPC-1.1 (AGENT): Create `projects/index.ts` router with all procedures.
  **File(s):** `apps/web/src/server/trpc/routers/projects/index.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-PROJ-TRPC-1.2 (AGENT): Register in root app router.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Projects procedures accessible.

- [ ] P1-PROJ-TRPC-1.3 (HUMAN): Test all procedures, verify tenant isolation. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-TRPC-2: Build tasks CRUD router with dependency validation

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No tasks tRPC router exists. The "My Week" tab shows mock data distributed by array index.
**Size:** Large

**Description:**
Create `apps/web/src/server/trpc/routers/projects/tasks.ts` with full CRUD for tasks plus dependency management and circular dependency prevention.

**(a) Standard procedures**:
- `tasks.listByProject` — query: all tasks for a project, paginated, filterable by status/assignee/priority, ordered by sort_order
- `tasks.listByStatus` — query: tasks grouped by status for kanban board (returns `Record<Status, Task[]>`)
- `tasks.getById` — query: single task with subtasks and dependencies loaded
- `tasks.create` — mutation: create task, auto‑set sort_order to end of list, optionally set parent_task_id (validates parent exists)
- `tasks.update` — mutation: update task fields, validate tenant ownership
- `tasks.delete` — mutation: delete task and all subtasks (cascade in application logic)
- `tasks.reorder` — mutation: batch update sort_order for multiple tasks (drag‑and‑drop reorder)

**(b) Hierarchy procedures**:
- `tasks.getSubtasks` — query: get all child tasks of a parent, recursively up to N levels
- `tasks.moveTask` — mutation: change parent_task_id, update ancestry materialized path, validate no circular reference

**(c) Dependency procedures**:
- `tasks.dependencies.list` — query: all dependencies for a task (both directions)
- `tasks.dependencies.add` — mutation: add a dependency edge (validates no circular dependency)
- `tasks.dependencies.remove` — mutation: remove a dependency

**(d) Circular dependency detection**: `tasks.dependencies.add` calls `detectCircularDependency(taskId, dependsOnId)` which performs DFS from `dependsOnId` checking if `taskId` is in the reachable subgraph. Returns error `"Adding this dependency would create a circular chain"` with the chain path.

**(e) Ancestry management**: On `tasks.moveTask`, recalculate the `ancestry` materialized path for the moved task and all its descendants. The ancestry is used for fast subtree queries without expensive recursive CTEs.

**Research Findings (2026‑05‑06):**
- Circular dependency detection via DFS topological sort applied at application level
- Materialized path (`ancestry`) enables `WHERE ancestry LIKE '/parentId/%'` for subtree queries
- Drag‑and‑drop reorder uses batch `sort_order` update for atomicity

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SCHEMA-2`
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-1` (projects router for barrel)

**Blocks:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-3` (kanban board)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-4` (hierarchical list)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-5` (task detail)

**Related Files:**
- `apps/web/src/server/trpc/routers/projects/tasks.ts` (new)
- `apps/web/src/server/projects/circular-dependency.ts` (new — DFS detection utility)

**Definition of Done**
- [ ] `tasks.ts` router created with all procedures
- [ ] `tasks.listByStatus` returns status‑grouped tasks for kanban
- [ ] `tasks.reorder` batch updates sort_order
- [ ] `tasks.moveTask` updates ancestry for moved task and descendants
- [ ] `tasks.dependencies.add` validates no circular dependency via DFS
- [ ] Circular dependency error includes the conflicting chain path
- [ ] Self‑dependency prevented by CHECK constraint + application validation
- [ ] All standard validation and tenant scoping
- [ ] Registered in root app router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Create tasks
curl -X POST http://localhost:3000/api/trpc/projects.tasks.create \
  -d '{"projectId": "...", "title": "Design homepage"}'

# Create subtask
curl -X POST http://localhost:3000/api/trpc/projects.tasks.create \
  -d '{"projectId": "...", "title": "Mobile nav", "parentTaskId": "..."}'

# Test circular dependency prevention
curl -X POST http://localhost:3000/api/trpc/projects.tasks.dependencies.add \
  -d '{"taskId": "parent", "dependsOnTaskId": "child"}'
# → success

curl -X POST http://localhost:3000/api/trpc/projects.tasks.dependencies.add \
  -d '{"taskId": "child", "dependsOnTaskId": "parent"}'
# → error: "circular dependency detected"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a PM, I can organize tasks into a hierarchy and define dependencies between them. The system prevents impossible circular chains.

---

#### Subtasks

- [ ] P1-PROJ-TRPC-2.0.25 (AGENT): Research DFS circular dependency detection and ancestry materialized path patterns. Design the algorithm.
  **Verification:** Algorithm design documented.

- [ ] P1-PROJ-TRPC-2.1 (AGENT): Create `circular-dependency.ts` utility with `detectCircularDependency()` function.
  **File(s):** `apps/web/src/server/projects/circular-dependency.ts` (new)
  **Verification:** DFS correctly detects cycles in test cases.

- [ ] P1-PROJ-TRPC-2.2 (AGENT): Create `tasks.ts` router with all procedures.
  **File(s):** `apps/web/src/server/trpc/routers/projects/tasks.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-PROJ-TRPC-2.3 (AGENT): Register in root app router.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Tasks procedures accessible.

- [ ] P1-PROJ-TRPC-2.4 (HUMAN): Test task CRUD, hierarchy, dependencies, circular detection. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-TRPC-3: Build milestone tracking procedures (create milestone, link tasks, % complete rollup)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No milestone tracking API exists.
**Size:** Medium

**Description:**
Create `apps/web/src/server/trpc/routers/projects/milestones.ts` with milestone management and progress rollup.

**(a) Procedures**:
- `milestones.listByProject` — query: all milestones for a project, ordered by sort_order, with computed progress percentage
- `milestones.getById` — query: single milestone with linked tasks
- `milestones.create` — mutation: create milestone, auto‑set sort_order
- `milestones.update` — mutation: update milestone fields
- `milestones.delete` — mutation: delete milestone (tasks remain, unlinked)
- `milestones.linkTask` — mutation: add task to milestone (adds task_id to milestone's linked tasks or uses entity_links)
- `milestones.unlinkTask` — mutation: remove task from milestone
- `milestones.reorder` — mutation: batch update sort_order

**(b) Progress rollup**: The `getById` and `listByProject` procedures compute completion percentage using **lazy aggregation**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE t.status = 'done')::float / NULLIF(COUNT(*), 0) * 100 AS progress_pct
FROM tasks t
WHERE t.id IN (SELECT task_id FROM milestone_tasks WHERE milestone_id = $1)
```
This avoids the write amplification of eager propagation. Progress is always current (computed on read) and never stale.

**(c) Status update**: `milestones.update` with status `'completed'` sets `completed_at` timestamp. Status transitions validated: `pending → in_progress → completed`.

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-SCHEMA-2`
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-1`

**Blocks:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-7` (milestone UI)

**Related Files:**
- `apps/web/src/server/trpc/routers/projects/milestones.ts` (new)

**Definition of Done**
- [ ] `milestones.ts` router created with all procedures
- [ ] Progress percentage computed via lazy aggregation on read
- [ ] Milestone‑task linking via junction or entity_links
- [ ] Status transition validation
- [ ] All standard validation and tenant scoping
- [ ] Registered in root app router
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
curl http://localhost:3000/api/trpc/projects.milestones.listByProject?input={"projectId":"..."}
# Verify: each milestone includes progress_pct computed from linked tasks
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a PM, I can track milestones with live progress percentages that reflect the real state of linked tasks.

---

#### Subtasks

- [ ] P1-PROJ-TRPC-3.0.25 (AGENT): Research lazy aggregation patterns and milestone‑task linking approaches.
  **Verification:** Approach documented.

- [ ] P1-PROJ-TRPC-3.1 (AGENT): Create `milestones.ts` router.
  **File(s):** `apps/web/src/server/trpc/routers/projects/milestones.ts` (new)
  **Verification:** All procedures functional.

- [ ] P1-PROJ-TRPC-3.2 (AGENT): Register in root app router.
  **File(s):** `apps/web/src/server/trpc/routers/_app.ts`
  **Verification:** Milestone procedures accessible.

- [ ] P1-PROJ-TRPC-3.3 (HUMAN): Test milestone progress rollup with varied task statuses. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-TRPC-4: Emit `project.task.completed` and `project.milestone.reached` events via Inngest client

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No project events are emitted for cross‑module workflows.
**Size:** Small

**Description:**
Add `inngest.send()` calls to relevant project mutation procedures following the same pattern as P1‑CRM‑TRPC‑7.

**(a) Events to emit**:
- `project/task.completed` — in `tasks.update` when status changes to 'done'. Payload: `{ taskId, projectId, orgId, userId }`.
- `project/task.assigned` — in `tasks.update` when assignee_id changes. Payload: `{ taskId, projectId, orgId, assigneeId }`.
- `project/milestone.reached` — in `milestones.update` when status changes to 'completed'. Payload: `{ milestoneId, projectId, orgId }`.

**(b) Fire‑and‑forget**: All `inngest.send()` calls are not awaited.

**(c) Event type definitions**: Create `apps/web/src/server/inngest/events/projects.ts` with Zod‑validated event types using v4 `eventType()`.

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-2` (tasks router)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-3` (milestones router)
- `tasks/infrastructure/P0-INNGEST.md → P0-INNGEST-3` (event registry)

**Blocks:**
- `tasks/phase-1/P1-INTEG.md → P1-INTEG-7` (notification dispatcher)

**Related Files:**
- `apps/web/src/server/trpc/routers/projects/tasks.ts` (add event emission)
- `apps/web/src/server/trpc/routers/projects/milestones.ts` (add event emission)
- `apps/web/src/server/inngest/events/projects.ts` (new)

**Definition of Done**
- [ ] `project/task.completed` event emitted from tasks.update on status = 'done'
- [ ] `project/task.assigned` event emitted from tasks.update on assignee change
- [ ] `project/milestone.reached` event emitted from milestones.update on status = 'completed'
- [ ] All emissions fire‑and‑forget
- [ ] Event types defined with Zod schemas
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Complete a task → check Inngest dashboard for project/task.completed
open http://localhost:8288
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-TRPC-4.0.25 (AGENT): Reference P1‑CRM‑TRPC‑7 pattern for event emission.
  **Verification:** Patterns documented.

- [ ] P1-PROJ-TRPC-4.1 (AGENT): Create projects event types in event registry.
  **File(s):** `apps/web/src/server/inngest/events/projects.ts` (new)
  **Verification:** Event types compile.

- [ ] P1-PROJ-TRPC-4.2 (AGENT): Add event emission to tasks.update and milestones.update.
  **File(s):** `tasks.ts`, `milestones.ts`
  **Verification:** Events emitted on relevant mutations.

- [ ] P1-PROJ-TRPC-4.3 (HUMAN): Trigger events, verify in Inngest dashboard. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-1: Build project list page (card/table view, status filters, progress bars)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The projects page shows a "Projects" tab with a static table from mock data. There is no real data, no filters, and no card view.
**Size:** Medium

**Description:**
Build the project list page at `routes/_dashboard/projects/index.tsx` with card/table toggle view.

**(a) View toggle**: Switch between card grid and table view. Card view shows project cards with: name, description preview, progress bar, member avatars (first 3 + "+N"), status badge, due date. Table view shows sortable columns.

**(b) Filters**: Status filter (active, completed, on_hold, archived), owner filter, search by name.

**(c) Progress bar**: Uses shadcn `Progress` component. Color‑coded: green (>75%), yellow (30‑75%), red (<30%).

**(d) "New Project" button**: Opens create modal with name, description, dates, owner fields.

**(e) Empty state**: "No projects yet. Create your first project!"

**(f) TanStack Query**: `useSuspenseQuery` for data, `useMutation` for create with optimistic update.

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-1` (projects router)
- `tasks/phase-1/P1-ROUTE.md → P1-ROUTE-1`

**Related Files:**
- `apps/web/src/routes/_dashboard/projects/index.tsx` (new)
- `apps/web/src/components/projects/ProjectCard.tsx` (new)

**Definition of Done**
- [ ] Card/table toggle view
- [ ] Progress bars with color coding
- [ ] Status and owner filters
- [ ] "New Project" modal with Zod‑validated form
- [ ] Empty state
- [ ] Mobile responsive
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /projects
# Toggle card/table view
# Create a project → appears in list
# Filter by status
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-UI-1.1 (AGENT): Build project list page with card/table toggle, filters, progress bars, create modal.
  **File(s):** `apps/web/src/routes/_dashboard/projects/index.tsx`, `ProjectCard.tsx` (new)
  **Verification:** Full list page functional.

- [ ] P1-PROJ-UI-1.2 (HUMAN): Test view toggle, filters, create, mobile. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-2: Build project overview dashboard (progress, budget placeholder, recent activity)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No project detail page exists beyond the slide‑out drawer from the mock data implementation.
**Size:** Medium

**Description:**
Build the project overview at `routes/_dashboard/projects/$projectId.tsx`.

**(a) Header**: Project name, status badge, dates, actions (Edit, Delete). Tab strip: Overview, Board, List, Timeline, Settings.

**(b) Overview tab content**:
- KPI cards: Task completion %, Milestone progress, Members count, Days remaining
- Progress chart (simple bar or donut showing task status breakdown)
- Recent activity feed (last 10 task updates, status changes, comments)
- Upcoming milestones list with due dates
- Member avatars row

**(c) Nested routes**: The `$projectId.tsx` acts as a layout for sub‑routes:
- `$projectId/board.tsx` — kanban (P1‑PROJ‑UI‑3)
- `$projectId/list.tsx` — hierarchical list (P1‑PROJ‑UI‑4)

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-1`
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-3` (milestones)

**Related Files:**
- `apps/web/src/routes/_dashboard/projects/$projectId.tsx` (new)
- `apps/web/src/routes/_dashboard/projects/$projectId/board.tsx` (new — stub for P1‑PROJ‑UI‑3)
- `apps/web/src/routes/_dashboard/projects/$projectId/list.tsx` (new — stub for P1‑PROJ‑UI‑4)

**Definition of Done**
- [ ] Project header with status badge and action buttons
- [ ] KPI cards: task completion, milestone progress, members, days remaining
- [ ] Task status breakdown chart
- [ ] Recent activity feed
- [ ] Upcoming milestones list
- [ ] Tab navigation to Board and List sub‑routes
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /projects/{projectId}
# Verify KPI cards, activity feed, milestones
# Click Board tab → navigates to /projects/{projectId}/board
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-UI-2.1 (AGENT): Build project overview page with KPI cards, charts, activity feed, tab navigation.
  **File(s):** `$projectId.tsx`, `$projectId/board.tsx`, `$projectId/list.tsx` (new)
  **Verification:** Overview functional with tab navigation.

- [ ] P1-PROJ-UI-2.2 (HUMAN): Test overview dashboard and tab navigation. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-3: Build Kanban task board (drag‑and‑drop status columns)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** The "Board" tab shows a "Board view coming soon" placeholder.
**Size:** Large

**Description:**
Build the kanban board at `routes/_dashboard/projects/$projectId/board.tsx` using `@dnd-kit` with multi‑container drag‑and‑drop.

**(a) Columns**: One column per workflow status. Uses project settings workflow_statuses or org defaults. Each column header shows status name, color dot, and task count.

**(b) Task cards**: Title, priority badge, assignee avatar, due date (overdue warning). Cards are compact and show all key info at a glance.

**(c) Drag‑and‑drop**: Uses `@dnd-kit` with multiple `SortableContext` providers within a single `DndContext`:
- Cards draggable between columns
- `onDragOver` moves item to new container during drag
- `onDragEnd` calls `tasks.update` for status change (optimistic update)
- `arrayMove` for within‑column reordering
- `useDroppable` wrappers for empty columns
- Keyboard accessible (Tab, Space, Arrow keys)

**(d) Lazy loading**: `@dnd-kit` loaded via `React.lazy()` following the `@object-ui/plugin-kanban` pattern

**(e) "Add Task"**: Quick‑add button in each column header opens inline input.

**(f) Mobile**: Horizontal scroll with sticky column headers.

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-2` (tasks router)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-2` (project overview with tab nav)

**Related Files:**
- `apps/web/src/routes/_dashboard/projects/$projectId/board.tsx` (replace stub)
- `apps/web/src/components/projects/KanbanBoard.tsx` (new)
- `apps/web/src/components/projects/TaskCard.tsx` (new)

**Definition of Done**
- [ ] Kanban board renders status columns from workflow settings
- [ ] Drag‑and‑drop between columns triggers status update (optimistic)
- [ ] Within‑column reorder via drag‑and‑drop
- [ ] Empty columns have droppable zones
- [ ] Lazy‑loaded @dnd-kit with skeleton fallback
- [ ] Keyboard accessible
- [ ] Quick‑add task in column header
- [ ] Mobile: horizontal scroll
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /projects/{projectId}/board
# Drag a card to another column → card moves → success toast
# Add a task via quick‑add → appears in column
# Test keyboard: Tab → Space → Arrow → Space → task moved

pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-UI-3.0.25 (AGENT): Research @dnd-kit multi‑container patterns and lazy loading.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P1-PROJ-UI-3.1 (AGENT): Create `KanbanBoard` and `TaskCard` components with @dnd-kit integration.
  **File(s):** `KanbanBoard.tsx`, `TaskCard.tsx` (new)
  **Verification:** Drag‑and‑drop functional.

- [ ] P1-PROJ-UI-3.2 (AGENT): Build board route replacing stub.
  **File(s):** `$projectId/board.tsx`
  **Verification:** Full kanban page functional.

- [ ] P1-PROJ-UI-3.3 (HUMAN): Test drag‑and‑drop, keyboard navigation, mobile. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-4: Build hierarchical task list view (indent, expand/collapse, inline edit)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No hierarchical task list exists. The "Projects" table shows flat task data.
**Size:** Medium

**Description:**
Build the hierarchical task list at `routes/_dashboard/projects/$projectId/list.tsx`.

**(a) Tree view**: Indented task rows based on `parent_task_id`. Expand/collapse subtrees. Each row shows: checkbox (status), title, priority badge, assignee avatar, due date, subtask count.

**(b) Inline editing**: Click title to edit. Click status checkbox to toggle todo/done. Drag‑to‑reorder within parent.

**(c) Indentation levels**: Unlimited nesting supported via ancestry materialized path. Visual indent proportional to depth (up to 5 visible levels, deeper levels use `…` indicator).

**(d) "Add Subtask"**: Plus icon on each row to add child task. "Add Task" at root level.

**(e) Dependencies**: Dependency icon on tasks with blockers. Hover shows dependency chain.

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-2` (tasks router with hierarchy)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-2` (project overview)

**Related Files:**
- `apps/web/src/routes/_dashboard/projects/$projectId/list.tsx` (replace stub)
- `apps/web/src/components/projects/TaskTree.tsx` (new)

**Definition of Done**
- [ ] Hierarchical tree with expand/collapse
- [ ] Inline editing: title, status checkbox
- [ ] Drag‑to‑reorder within parent
- [ ] Add subtask at any level
- [ ] Dependency indicators
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /projects/{projectId}/list
# Expand parent task → see subtasks indented
# Click subtask title → inline edit
# Drag task to reorder
# Add subtask → appears under parent
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-UI-4.1 (AGENT): Build `TaskTree` component and list route.
  **File(s):** `TaskTree.tsx` (new), `$projectId/list.tsx`
  **Verification:** Hierarchical list functional.

- [ ] P1-PROJ-UI-4.2 (HUMAN): Test expand/collapse, inline edit, reorder, add subtask. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-5: Build task detail panel (description, subtasks, comments, attachments)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No task detail panel exists.
**Size:** Medium

**Description:**
Build `apps/web/src/components/projects/TaskDetail.tsx` — a slide‑out panel (shadcn Sheet/Drawer) showing full task details.

**(a) Panel sections**: Description (rich text or markdown), Subtasks list (with inline add/complete), Dependencies (linked tasks with status), Comments (placeholder for Phase 2), Attachments (linked documents via entity_links), Activity log (status changes, assignments).

**(b) Actions**: Edit (opens inline or modal), Change status, Change priority, Assign, Set due date, Add dependency, Link document.

**(c) Meta info**: Created by, created at, updated at, task ID (copyable).

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-2` (tasks router)
- `tasks/phase-1/P1-CRM.md → P1-CRM-SCHEMA-2` (entity_links)

**Related Files:**
- `apps/web/src/components/projects/TaskDetail.tsx` (new)

**Definition of Done**
- [ ] Slide‑out panel with all sections
- [ ] Subtasks: list with inline add/complete
- [ ] Dependencies: list with add/remove
- [ ] Attachments: linked documents from entity_links
- [ ] Activity log
- [ ] Actions: edit, status, priority, assign, due date
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Click a task in kanban or list → detail panel opens
# Add a subtask → appears in subtasks list
# Change priority → updates in real time
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-UI-5.1 (AGENT): Build `TaskDetail` component with all sections.
  **File(s):** `apps/web/src/components/projects/TaskDetail.tsx` (new)
  **Verification:** Detail panel functional.

- [ ] P1-PROJ-UI-5.2 (HUMAN): Test all sections and actions. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-6: Build Gantt chart placeholder (basic timeline rendering, will be enhanced in Phase 2)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟢 Low
**Current State:** No Gantt chart exists.
**Size:** Small

**Description:**
Build `apps/web/src/components/projects/GanttChart.tsx` using **SVAR React Gantt (MIT)** for basic timeline rendering of project tasks and milestones.

**(a) Features (Phase 1)**:
- Read‑only timeline displaying tasks with start/end dates
- Milestones shown as diamond markers
- Dependencies shown as connecting lines (SVAR supports task dependencies out of the box)
- Dark theme via SVAR's built‑in theme support
- Zoom in/out (default SVAR feature)
- Tooltip on hover showing task name and dates

**(b) Not yet implemented (Phase 2)**:
- Drag‑and‑drop editing on the timeline (SVAR supports it but deferred)
- Auto‑scheduling with dependency resolution
- Critical path visualization
- Resource allocation view
- Baselines

**(c) Lazy loading**: The Gantt component and its library are loaded via `React.lazy()` with a skeleton fallback to avoid impacting the initial bundle.

**(d) Data integration**: Consumes `tasks.listByProject` and `milestones.listByProject`, maps to SVAR's expected data format.

**Research Findings (2026‑05‑06):**
- SVAR React Gantt: MIT license, React 19 compatible, TypeScript, dark theme, dependencies display, `npm install @svar-ui/react-gantt`
- "The open-source core includes essential functionality such as task management, dependencies, drag-and-drop timeline editing, and UI customization."

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-2` (tasks router)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-3` (milestones router)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-2` (project overview — Gantt accessible from tab)

**Related Files:**
- `apps/web/src/components/projects/GanttChart.tsx` (new)
- `apps/web/package.json` (add `@svar-ui/react-gantt`)

**Definition of Done**
- [ ] `@svar-ui/react-gantt` installed
- [ ] Gantt chart renders tasks as bars and milestones as diamonds
- [ ] Dependencies shown as connecting lines
- [ ] Dark theme via SVAR's theme support
- [ ] Zoom in/out
- [ ] Tooltip on hover
- [ ] Lazy‑loaded with skeleton fallback
- [ ] Responsive: horizontal scroll
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Navigate to /projects/{projectId}/gantt (or Timeline tab)
# Verify: task bars and milestone diamonds rendered
# Verify: dependency lines connecting related tasks
# Hover a task bar → tooltip with name and dates
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- Deep Module: The GanttChart component encapsulates SVAR React Gantt's complex API (data format, theme, localization) behind a simple `tasks` + `milestones` prop interface.

---

#### Subtasks

- [ ] P1-PROJ-UI-6.0.25 (AGENT): Research SVAR React Gantt data format, theme configuration, and lazy loading.
  **Verification:** SVAR API understood.

- [ ] P1-PROJ-UI-6.1 (AGENT): Install `@svar-ui/react-gantt` and build `GanttChart` component.
  **File(s):** `apps/web/package.json`, `GanttChart.tsx` (new)
  **Verification:** Gantt renders tasks and milestones.

- [ ] P1-PROJ-UI-6.2 (HUMAN): Test Gantt rendering, zoom, tooltips, responsive. Approve.
  **Verification:** Approved.

---

### [ ] P1-PROJ-UI-7: Build milestone list and create/edit UI

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No milestone UI exists.
**Size:** Small

**Description:**
Build `apps/web/src/components/projects/MilestoneManager.tsx` — a component for managing project milestones.

**(a) Milestone list**: Chronological list with: name, due date, progress bar (computed from linked tasks), status badge, task count. Drag‑to‑reorder.

**(b) Create/Edit modal**: Fields: name, description, due date, linked tasks (multi‑select from project tasks).

**(c) Integration**: Used in the project overview page and accessible from a "Milestones" tab or section.

**Depends on:**
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-TRPC-3` (milestones router)
- `tasks/phase-1/P1-PROJ.md → P1-PROJ-UI-2` (project overview)

**Related Files:**
- `apps/web/src/components/projects/MilestoneManager.tsx` (new)

**Definition of Done**
- [ ] Milestone list with progress bars and status badges
- [ ] Create/Edit modal with linked task multi‑select
- [ ] Drag‑to‑reorder
- [ ] Progress computed from linked tasks
- [ ] `pnpm run typecheck` passes

**Verification**
```bash
# Open milestone manager
# Create "Beta Launch" milestone → link 5 tasks
# Complete 3 of 5 tasks → milestone progress shows 60%
pnpm run typecheck
```

---

#### Subtasks

- [ ] P1-PROJ-UI-7.1 (AGENT): Build `MilestoneManager` component.
  **File(s):** `apps/web/src/components/projects/MilestoneManager.tsx` (new)
  **Verification:** Milestone CRUD functional.

- [ ] P1-PROJ-UI-7.2 (HUMAN): Test milestone creation, task linking, progress rollup. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P1‑PROJ group are covered.*