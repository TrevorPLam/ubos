# ADR-NNNN: [Short Title]

**Status:** Proposed | Accepted | Implemented | Deprecated | Rejected  
**Date:** YYYY-MM-DD  
**Deciders:** [Names/Roles]  
**Supersedes:** [ADR-XXXX] (if applicable)

---

## Context

What is the issue we're facing? What forces are at play (technical, political, business, social)?

**Examples:**
- What problem are we trying to solve?
- What constraints do we have?
- What are the current pain points?

---

## Decision

What is the change we're proposing or have agreed to?

**Format:** "We will [decision] because [rationale]."

**Examples:**
- "We will use Postgres schemas (one per domain) to enforce domain boundaries."
- "We will use the outbox pattern for event-driven communication."
- "We will use Redis for session storage instead of in-memory."

---

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive Consequences
- ✅ [Benefit 1]
- ✅ [Benefit 2]

### Negative Consequences
- ❌ [Trade-off 1]
- ❌ [Trade-off 2]

### Neutral Consequences
- ℹ️ [Neutral impact 1]
- ℹ️ [Neutral impact 2]

---

## Alternatives Considered

What other options did we consider?

### Alternative 1: [Name]
**Description:** ...  
**Pros:** ...  
**Cons:** ...  
**Rejected because:** ...

### Alternative 2: [Name]
**Description:** ...  
**Pros:** ...  
**Cons:** ...  
**Rejected because:** ...

---

## Implementation Notes

How will this decision be implemented? What steps are required?

**Examples:**
- Refactor `server/storage.ts` into domain modules
- Create Postgres schemas: `identity`, `crm`, `projects`, etc.
- Add architecture tests to enforce boundaries

**Estimated effort:** [time estimate]

---

## Verification

How will we know this decision was successful?

**Success criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

**Verification commands:**
```bash
# Example: Run architecture tests
npm run test:architecture
```

---

## References

- [Link to relevant code](../../../path/to/code.ts)
- [Link to related ADR](./ADR-XXXX-related-decision.md)
- [External resource](https://example.com)

---

**Navigation:**
- [ADR_INDEX.md](./ADR_INDEX.md): All ADRs
- [README.md](../README.md): Architecture docs home
