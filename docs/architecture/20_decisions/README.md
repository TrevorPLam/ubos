# Architecture Decision Records (ADRs)

**Purpose**: Document significant architectural decisions with context, consequences, and rationale  
**Audience**: All engineers, technical leaders, future maintainers  
**Status**: Living record - continuously updated as decisions are made

---

## 📋 Overview

This folder contains **Architecture Decision Records (ADRs)** - lightweight documents that capture important architectural decisions, the context in which they were made, and their consequences.

**Philosophy**: "If it wasn't documented, it didn't happen." Every significant architectural decision should be recorded here so future engineers understand *why* the system is the way it is.

---

## 📚 Documents in This Folder

### Core Documents

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [ADR_INDEX.md](ADR_INDEX.md) | Master index of all ADRs with status | 5 min |
| [ADR_TEMPLATE.md](ADR_TEMPLATE.md) | Template for creating new ADRs | 2 min |
| ADR-0001-*.md through ADR-NNNN-*.md | Individual decision records | 5-10 min each |

---

## 🎯 What is an ADR?

### Industry Standard: ADR Format

An ADR is a document that captures a single **architectural decision** - a design choice that affects the structure, non-functional characteristics, dependencies, interfaces, or construction techniques of the system.

**Popularized by**: Michael Nygard (2011) - "Documenting Architecture Decisions"

**Core Principles**:
1. **Lightweight**: Short documents (1-2 pages)
2. **Immutable**: Once written, ADRs are not changed (only superseded)
3. **Numbered**: Sequential numbering for easy reference
4. **Timestamped**: Capture when decision was made
5. **Linked**: Reference other ADRs, documents, tickets

### ADR Structure (Industry Standard)

```markdown
# ADR-NNNN: [Decision Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]  
**Date**: YYYY-MM-DD  
**Deciders**: [List of people involved]  
**Tags**: [e.g., database, security, performance]

## Context

What is the issue we're facing? What factors are in play? What constraints exist?

## Decision

What did we decide to do? Be specific and concrete.

## Consequences

What becomes easier or harder as a result of this decision?
- Positive consequences
- Negative consequences  
- Neutral consequences
```

---

## 🏗️ Best Practices (Enterprise Level)

### When to Write an ADR

**Write an ADR when**:
- ✅ Choosing between multiple viable options (databases, frameworks, patterns)
- ✅ Making a decision that's expensive to reverse (cloud provider, language, storage)
- ✅ Establishing a system-wide standard (API design, error handling, logging)
- ✅ Accepting technical debt with explicit rationale
- ✅ Deprecating a pattern or technology

**Don't write an ADR for**:
- ❌ Trivial decisions (naming a variable, formatting)
- ❌ Decisions that are obviously right (fix a bug, improve performance)
- ❌ Implementation details that don't affect architecture
- ❌ Decisions that are easily reversible

### ADR Lifecycle

```
┌─────────────┐
│  Proposed   │ ← New ADR drafted, under discussion
└─────┬───────┘
      │
      ├─→ ┌──────────┐
      │   │ Accepted │ ← Decision made, implementation ongoing
      │   └────┬─────┘
      │        │
      │        ├─→ ┌─────────────┐
      │        │   │ Implemented │ ← Fully implemented, in production
      │        │   └─────────────┘
      │        │
      │        └─→ ┌──────────────┐
      │            │ Superseded   │ ← Better solution found, see ADR-XXXX
      │            └──────────────┘
      │
      └─→ ┌──────────────┐
          │ Deprecated   │ ← Decision withdrawn, not implemented
          └──────────────┘
```

### ADR Status Definitions

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| **Proposed** | Under discussion | Review and decide |
| **Accepted** | Decision made | Implement |
| **Implemented** | In production | Monitor and maintain |
| **Superseded** | Replaced by newer ADR | Migrate to new approach |
| **Deprecated** | No longer valid | Remove old implementation |

### Writing High-Quality ADRs

**Context Section** should answer:
- What is the problem or opportunity?
- What constraints must we respect? (time, money, skills, regulations)
- What assumptions are we making?
- What alternatives did we consider?

**Decision Section** should be:
- **Specific**: "Use PostgreSQL 14+" not "Use a relational database"
- **Actionable**: Clear what to implement
- **Testable**: Can verify it's done correctly
- **Justified**: Briefly explain why this option

**Consequences Section** should cover:
- **Positive**: Benefits we gain
- **Negative**: Trade-offs we accept
- **Risks**: What could go wrong
- **Dependencies**: What else must change
- **Alternatives Rejected**: Why we didn't choose other options

---

## 💡 Unique Differentiators (Novel Approaches)

### 1. **Living ADRs with Implementation Status**

Traditional ADRs are write-once documents. Ours include:

```markdown
## Implementation Status

**Status**: 🟢 Fully Implemented  
**Implementation Date**: 2026-02-04  
**Evidence**: 
- Multi-tenant isolation: tests/backend/multi-tenant-isolation.test.ts
- Storage layer scoping: server/storage.ts:42-78
- Schema enforcement: shared/schema.ts (all tables have organizationId)

**Metrics**:
- Test coverage: 100% for tenant isolation
- Performance impact: < 1ms overhead per query
- Bug reports: 0 tenant data leakage incidents

**Lessons Learned**:
- ✅ Early decision prevented major refactoring
- ⚠️ Requires discipline from all developers
- 💡 Consider database-level RLS for defense in depth
```

### 2. **ADR Health Dashboard**

We track ADR metrics:

| Metric | Value | Trend |
|--------|-------|-------|
| **Total ADRs** | TBD | ↗️ |
| **Proposed** | TBD | → |
| **Accepted Not Implemented** | TBD | ⚠️ |
| **Implemented** | TBD | ↗️ |
| **Superseded** | TBD | → |
| **Average Age (Proposed→Accepted)** | TBD days | ↘️ |
| **Average Age (Accepted→Implemented)** | TBD days | ↘️ |

**Alerts**:
- 🚨 Proposed ADRs > 30 days old (decision paralysis)
- ⚠️ Accepted ADRs > 90 days old (implementation lag)

### 3. **AI-Readable ADR Metadata**

ADRs include structured metadata for AI tools:

```yaml
---
adr_number: 42
title: "Choose PostgreSQL for Primary Data Store"
date: 2026-01-15
status: implemented
deciders: ["alice@example.com", "bob@example.com"]
tags: ["database", "infrastructure", "data"]
impact: high
reversibility: hard
implementation_cost: medium
alternatives: ["MySQL", "MongoDB", "DynamoDB"]
related_adrs: [12, 18, 35]
evidence_files:
  - "server/db.ts"
  - "shared/schema.ts"
  - "docker-compose.yml"
---
```

**Benefits**:
- AI can find relevant ADRs instantly
- Automated consistency checking
- Dependency graph generation
- Impact analysis automation

### 4. **ADR-Driven Code Review**

Pull requests that make architectural decisions must:
1. Reference or create an ADR
2. ADR must be reviewed before code is reviewed
3. CI checks that ADR exists for significant changes

**Detection Rules**:
- New external dependency → ADR required
- New infrastructure component → ADR required
- New cross-cutting concern → ADR required
- Breaking API change → ADR required

### 5. **Retrospective ADRs**

For legacy code without ADRs:
- Document decisions that *were* made
- Mark with [RETROSPECTIVE] tag
- Estimate decision date from git history
- Note: "Decision was implicit, now explicit"

**Purpose**: Understand why old code is the way it is

---

## 🔬 ADR Categories & Tags

### Standard Tags

| Category | Tags | Examples |
|----------|------|----------|
| **Technology** | `database`, `framework`, `language`, `library` | PostgreSQL, React, TypeScript |
| **Pattern** | `architecture`, `design-pattern`, `integration` | Modular monolith, Repository pattern |
| **Cross-Cutting** | `security`, `performance`, `monitoring`, `testing` | Authentication, Caching, Logging |
| **Infrastructure** | `deployment`, `ci-cd`, `cloud`, `networking` | Docker, GitHub Actions, AWS |
| **Process** | `workflow`, `standards`, `governance` | Code review, Versioning, Documentation |

### Impact Levels

| Level | Meaning | Examples |
|-------|---------|----------|
| **Critical** | Affects entire system, hard to reverse | Choose cloud provider, Select programming language |
| **High** | Affects multiple domains | Choose database, Authentication strategy |
| **Medium** | Affects single domain | API design pattern, State management |
| **Low** | Localized impact | Utility function approach, Testing library |

---

## 🔍 How to Use ADRs

### Scenario 1: Making a New Architectural Decision

1. **Research**: Understand the problem and options
2. **Draft**: Use [ADR_TEMPLATE.md](ADR_TEMPLATE.md) to create ADR-NNNN-title.md
3. **Collaborate**: Share with team for feedback
4. **Decide**: Get approval from appropriate deciders
5. **Update Status**: Mark as "Accepted"
6. **Implement**: Build the solution
7. **Update Status**: Mark as "Implemented" with evidence
8. **Review**: Include in monthly ADR health review

### Scenario 2: Understanding Why System is Designed a Certain Way

1. **Check**: [ADR_INDEX.md](ADR_INDEX.md) for relevant ADRs
2. **Read**: The specific ADR(s)
3. **Validate**: Check if "Implementation Status" section exists
4. **Verify**: Run verification commands if provided
5. **Question**: If ADR seems outdated, propose superseding ADR

### Scenario 3: Changing an Existing Architectural Decision

1. **Document Current**: Ensure current decision has an ADR
2. **Propose New**: Create new ADR proposing change
3. **Justify**: Explain why context has changed or new info available
4. **Impact Analysis**: Document what needs to change
5. **Decide**: Get approval for change
6. **Update Old ADR**: Mark as "Superseded by ADR-XXXX"
7. **Implement**: Make the change
8. **Update New ADR**: Mark as "Implemented"

### Scenario 4: Onboarding - Understanding Architecture Decisions

**Week 1**: Read all "Critical" and "High" impact ADRs  
**Week 2**: Read ADRs related to your domain  
**Month 1**: Read all ADRs chronologically to understand evolution  
**Ongoing**: Read new ADRs as they're created

---

## 📊 ADR Metrics & Analytics

### Decision Velocity

```
Average time from Proposed → Accepted: Target < 14 days
Average time from Accepted → Implemented: Target < 90 days
```

### Decision Quality

```
ADRs superseded within 6 months: Target < 10%
ADRs with implementation evidence: Target 100%
ADR compliance in code reviews: Target 100%
```

### Decision Coverage

```
External dependencies with ADRs: Target 100%
Cross-cutting concerns with ADRs: Target 100%
Domain patterns with ADRs: Target > 80%
```

---

## 🎓 Learning Resources

### ADR Methodology

- **Original Article**: "Documenting Architecture Decisions" by Michael Nygard
  - https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

- **ADR GitHub Organization**: Collection of ADR tools and examples
  - https://adr.github.io/

- **ThoughtWorks Technology Radar**: ADR as a recommended practice
  - https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records

### Books on Architectural Decision Making

- "Design It!" by Michael Keeling
- "Software Architecture for Developers" by Simon Brown
- "Fundamentals of Software Architecture" by Mark Richards & Neal Ford

---

## 🔗 Related Documentation

- **Parent**: [docs/architecture/README.md](../README.md) - Architecture documentation hub
- **Current State**: [docs/architecture/10_current_state/](../10_current_state/) - Implementation of decisions
- **Target State**: [docs/architecture/00_plan_intent/](../00_plan_intent/) - Future decisions
- **Gaps**: [docs/architecture/60_gaps_and_roadmap/](../60_gaps_and_roadmap/) - Decisions needed to reach target

---

## 📝 Maintenance

**Update Frequency**: 
- New ADR: As decisions are made
- Status updates: After implementation milestones
- Health review: Monthly

**Owners**: All engineers (create ADRs), Technical Lead (approve ADRs)

**Review Process**:
- All ADRs reviewed by 2+ senior engineers
- Critical ADRs reviewed by tech lead + architect
- Monthly: Review all "Proposed" and "Accepted" ADRs for status

**Last Major Update**: 2026-02-04 (Documentation reorganization)  
**Next Scheduled Review**: 2026-03-01

---

**Quick Navigation**: [Back to Architecture](../README.md) | [ADR Index](ADR_INDEX.md) | [ADR Template](ADR_TEMPLATE.md) | [Current State](../10_current_state/README.md)
