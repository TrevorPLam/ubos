## 1. Overall Structure of a Task File

```markdown
# tasks/<domain>/<FILE‑NAME>.md – Short Title
This file covers … 

> **Follow all rules in `../CROSS‑CUTTING‑RULES.md`.**
```

*Every* domain file starts with a heading, a one‑sentence scope statement, and the cross‑cutting‑rules reference line.

---

## 2. Optional Per‑File “Backlog Additions” Block

Some files contain a table of *newly added tasks* that were not present in the initial file creation. These entries follow the same dependency notation as regular tasks.

```markdown
## Backlog Additions – 2026‑05‑05

| Task ID | Description | Depends On |
|---------|-------------|------------|
| DB‑CRM‑012 | Add `lead_score` column … | `crm/CRM‑LEADS.md → DB‑CRM‑001` |
```

This block appears **at the top** of the file, before the first major task. Its subtasks are appended at the end of the file or within a dedicated “Subtasks” section immediately below the table.

---

## 3. Task ID Scheme

- Format: `{LAYER}-{CONTEXT}-{NNN}`  
  *Layer* examples: `DB`, `API`, `FRONT`, `INT`, `AUTO`, `ONBOARD`, `ARCH`, `ERROR`, `EVENT`, `AUTH`, `DEP`, `TOOLING`, `SEC`, `MON`, `A11Y`, `ENT`, `WS`, `JOB`, `DOCKER`, `BUILD`, `CI`, `ESLINT`, `DR`, `DORA`, `EU‑DATA`, `EMAIL`, `GDPR`, `I18N`, `MOBILE`, `IR`, `OBS`, `PENTEST`, `RESILIENCE`, `SF`, `MIGRATE`, `ENGAGE`, `CRM‑TO‑PROJ`, etc.  
  *Context*: abbreviated domain name (e.g., `ADMIN`, `ANALYTICS`, `APPT`, `ASSETS`, `CRM`, `DEALS`, `FIN`, `PROJ`, `DOCS`, `ESIGN`, `NOTIF`, `SETTINGS`, `RBAC`, `FLAG`, `SUB`, `VIDEO`, `STRIPE`, `PLAID`, etc.).  
  *NNN*: sequential number within that file.

  Full examples: `DB‑APPT‑001`, `API‑CRM‑022`, `FRONT‑PROJ‑006`, `AUTO‑FIN‑003`, `INT‑PAYMENT‑001`.

---

## 4. Single Task Entry Template (Every Field)

```markdown
### [ ] TASK-ID: Task Title
**Status:** ⏳ Not Started
**Actor:** AGENT | HUMAN | MIXED
**Priority:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
**Current State:** Description of what currently exists (emphasising the gap).
**Size:** Small | Medium | Large

**Description:**
Full description of what is to be built, the approach, and overall acceptance criteria.

**Depends on:** 
- `path/to/dependency.md → TASK‑ID`
- `another/task.md → TASK‑ID`
**Blocks:** 
- `future/task.md → TASK‑ID`     *(or `[N/A]`)*
**Related Files:** 
- `path/to/implementation/file.ts`
- `path/to/test/file.test.tsx`

**Definition of Done**
- [ ] Concrete verifiable item 1
- [ ] Concrete verifiable item 2
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Item explicitly excluded (avoids scope creep)
- Another exclusion

**Rules to Follow**
- Domain‑specific business / technical invariant
- Implementation constraint (e.g., “Never log passwords”)

**Verification**
```bash
# command(s) that must pass
pnpm test -- path/to/test.file
pnpm run typecheck
# Manual: check some condition or open a URL
```

**DDD / TDD / BDD / Deep Module notes**
- DDD: (aggregate root / bounded context / entity notes)
- TDD: (test strategy: red→green, mocking, specific test cases)
- BDD: (relevant Gherkin scenario or “As a … I want …” statement)
- Deep Module: (how complexity is hidden: “Service.method(param) hides …”)
```

**Important details on each field:**

- **Depends on** and **Blocks** always use the form `"path/to/file.md → TASK‑ID"`. If no downstream blocker, write `[N/A]`.  
- **Related Files** lists only the files that will be modified/created.  
- **Definition of Done** always ends with `- [ ] pnpm run typecheck passes` (or `pnpm run typecheck` …).  
- **Verification** often combines automated test commands and manual checks (marked “Manual: …”).  
- The **DDD / TDD / BDD / Deep Module** section is mandatory for all non‑infrastructure tasks.

---

## 5. Subtask Structure (Under Every Major Task)

When a task is large, it is broken into numbered subtasks. The pattern is:

```markdown
### Subtasks
- [ ] TASK‑ID.0.25 (AGENT): Read related files / context. No action – pause.
  **Verification:** (none, just a reading checkpoint)

- [ ] TASK‑ID.0.5 (AGENT): Research latest best practices. *Document findings briefly.*
  **Verification:** Findings documented.

- [ ] TASK‑ID.0.75 (AGENT): Reason about the task. If ambiguous, ask user.
  **Verification:** Reasoning complete.

- [ ] TASK‑ID.1 (AGENT): First implementation step.
  **File(s):** `path/to/file.ts`
  **Verification:** `pnpm test -- some.test.ts` RED (or GREEN after implementation)

- [ ] TASK‑ID.2 (AGENT): Second implementation step.
  **File(s):** `another/file.ts`
  **Verification:** `pnpm test -- another.test.ts` GREEN

- [ ] TASK‑ID.N (HUMAN): Final review and sign‑off.
  **Verification:** Approved.
```

- The final subtask **always** has `(HUMAN)` as actor and ends with “**Verification:** Approved.”  
- Subtask numbering can skip numbers (e.g., `API‑APPT‑001.1`, `.2`, `.3`).  
- Each subtask that writes code must specify the exact **File(s)**.  
- Verification for subtasks is a command or a condition, never a general statement.

---

## 6. Shared Path Conventions

- **Repository root:** `lib/db/src/` → for database schemas and repositories.  
- **API server root:** `artifacts/api-server/src/` → for services, routes, middlewares, tests.  
- **Frontend root:** `artifacts/apex‑os/src/` → for pages, components, hooks, tests.  
- **OpenAPI spec:** `lib/api-spec/openapi.yaml` → all endpoint definitions.  
- **Codegen output:** `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` – never hand‑edit.  
- **Documentation:** `docs/` (ADRs, glossary, bounded‑contexts.md, feature files).  

All file references in `Related Files`, `File(s)` within subtasks, and `Verification` commands follow these root‑relative paths.

---

## 7. Dependency Notation Across Files

Dependencies and blockers are always expressed as:

```
path/to/file.md → TASK‑ID
```

The `→` separates the file that owns the defining task from the specific ID. This is used consistently, even when the task is in the same file (`crm/CRM‑LEADS.md → DB‑CRM‑001`).

If a task is **not yet defined** but a pointer is needed, the notation `infrastructure/DATABASE.md → DB‑ORG‑001` is used even if DB‑ORG‑001 is inside that same file.

---

## 8. Priority & Size Guidelines

- **Priority**:  
  - 🔴 **Critical** – blocks multiple other tasks; no work‑around.  
  - 🟠 **High** – required for a major feature milestone.  
  - 🟡 **Medium** – important but can be deferred one phase.  
  - 🟢 **Low** – nice‑to‑have, no blockers.

- **Size**:  
  - **Small** – a single schema/endpoint, <4 hours.  
  - **Medium** – a complete API layer (spec + service + repo + routes).  
  - **Large** – a full bounded‑context depth migration (e.g., all CRM sub‑tasks).

---

## 9. Actor Definitions

- **AGENT** – autonomous implementation (machine / CI).  
- **HUMAN** – requires manual execution (e.g., DNS changes, contract review, stakeholder sign‑off).  
- **MIXED** – both agent and human steps; often AGENT drafts, HUMAN approves.

---

## 10. The “Red‑Green” TDD Pattern

For API tasks, the typical order is:

1. **Spec** – `API‑xxx‑001` defines OpenAPI contract and runs codegen.  
2. **Red integration tests** – `API‑xxx‑002` writes supertest tests; all must fail.  
3. **Service & Repository** – `API‑xxx‑003` implements domain logic; unit tests pass.  
4. **Routes & Green Tests** – `API‑xxx‑004` wires routes and turns integration tests green.  

This pattern is consistently repeated across CRM, Finance, Projects, Assets, Documents, etc.

---

## 11. Always‑Present Requirements

- **`pnpm run typecheck`** (or `pnpm typecheck`) is a DoD item for every task and subtask that adds/edits TypeScript.  
- **Codegen** (`pnpm --filter @workspace/api‑spec run codegen`) must succeed after any OpenAPI change.  
- **Checks for sensitive data**: tasks dealing with credentials note that secrets must be environment variables, and `Sentry` / logs must strip tokens.  
- **Audit log** entries are required for any mutating admin action (though this is sometimes deferred to a subscriber task).

---

## 12. Integration / Automation Task Variations

- Tasks under `automation/` use IDs like `AUTO‑001`, `AUTO‑CRM‑001`; they often reference background jobs and event handlers.  
- Integration tasks (`integrations/`) follow the same template but have an extra emphasis on OAuth PKCE flow, webhook signature verification, and encrypted token storage. Their ID prefix is `INT‑*`.

---

This fully captures the **task‑planning blueprint** – from file layout to task ID formation, dependency tracking, subtask breakdown, and the precise format of every field.