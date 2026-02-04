# Architecture Decision Records (ADR) Index

**Purpose:** Track significant architectural decisions  
**Last updated:** 2026-02-04

---

## What is an ADR?

An **Architecture Decision Record (ADR)** captures a significant architectural decision along with its context and consequences. ADRs are **immutable** — once merged, they are never edited. To change a decision, create a new ADR that supersedes the old one.

---

## When to Create an ADR

Create an ADR for decisions that:
- ✅ Impact multiple domains or teams
- ✅ Have long-term consequences
- ✅ Involve trade-offs
- ✅ Need to be explained to future engineers

**Examples:**
- ✅ "Use Postgres schemas for domain isolation"
- ✅ "Use outbox pattern for event-driven communication"
- ✅ "Use Redis for session storage"
- ❌ "Use Radix UI for components" (library choice, not architecture)
- ❌ "Add index to `clients.email`" (implementation detail)

---

## ADR List

| ADR | Title | Status | Date | Supersedes |
|-----|-------|--------|------|------------|
| [ADR-0000](./ADR_TEMPLATE.md) | ADR Template | Template | N/A | N/A |

<!-- Add new ADRs above this line in reverse chronological order -->

---

## Status Definitions

- **Proposed:** Under discussion, not yet approved
- **Accepted:** Approved and being implemented
- **Implemented:** Fully implemented in codebase
- **Deprecated:** No longer recommended, superseded by newer ADR
- **Superseded:** Replaced by newer ADR (link in "Supersedes" column)
- **Rejected:** Proposed but not approved

---

## How to Create an ADR

1. Copy [ADR_TEMPLATE.md](./ADR_TEMPLATE.md)
2. Name: `ADR-NNNN-<short-title>.md` (use next sequential number)
3. Fill out sections: Context, Decision, Consequences
4. Set Status to "Proposed"
5. Get review from tech lead/architect
6. Update status to "Accepted" after approval
7. Commit to `docs/architecture/20_decisions/`
8. Update this index with a new row
9. **Never edit after merge** (create superseding ADR if needed)

---

## ADR Template

See [ADR_TEMPLATE.md](./ADR_TEMPLATE.md) for the standard template.

---

**Navigation:**
- [README.md](../README.md): Architecture docs home
- [GAP_ANALYSIS.md](../60_gaps_and_roadmap/GAP_ANALYSIS.md): Current vs target state
