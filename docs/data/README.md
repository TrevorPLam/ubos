# Data Documentation System

Welcome. This folder contains the **single source of truth for all data** in the Unified Business Ops Suite (UBOS) monorepo.

## 🎯 Purpose

To enable any engineer to understand the system's data in **under 30 minutes** by providing:
- **Current state**: what exists today, where it lives, how it flows
- **Target state**: what PLAN.md expects the system to become
- **Gaps**: what must change to reach the target
- **Evidence**: direct links to code, tests, and CI

## 📂 Folder Structure

```
docs/data/
├── README.md                          # This file
├── 00_plan_intent/
│   ├── PLAN_SUMMARY.md               # Data-focused extraction of PLAN.md
│   └── TARGET_DATA_MODEL.md          # Target entities & relationships
├── 10_current_state/
│   ├── CURRENT_STATE_OVERVIEW.md     # High-level state today
│   ├── DATA_SOURCES.md               # DBs, storage, caches, queues
│   ├── TENANCY_AND_ACCESS.md         # Org scoping + authorization
│   ├── DATA_FLOWS.md                 # Read/write flows, integrations
│   ├── AUDIT_LOGGING_AND_REDACTION.md # What's logged, what's redacted
│   ├── RETENTION_AND_DELETION.md     # Retention policies
│   └── BACKUPS_AND_RECOVERY.md       # Backup posture
├── 20_entities/
│   ├── ENTITY_INDEX.md               # Master list of all entities
│   └── [EntityName].md               # One doc per entity
├── 30_interfaces/
│   ├── API_CONTRACTS.md              # HTTP endpoints & payloads
│   ├── EVENTS_AND_WEBHOOKS.md        # Events, messages, schemas
│   └── FILES_AND_UPLOADS.md          # Object storage, metadata, limits
└── 40_gaps_and_roadmap/
    ├── GAP_ANALYSIS.md               # Current vs target
    ├── MIGRATION_NOTES.md            # Data migrations needed
    └── EVIDENCE_MAP.md               # Doc section → code paths
```

## 🚀 Quick Start

1. **I need to understand what's stored**: Read [10_current_state/CURRENT_STATE_OVERVIEW.md](10_current_state/CURRENT_STATE_OVERVIEW.md)
2. **I'm adding a new entity**: Start with [20_entities/ENTITY_INDEX.md](20_entities/ENTITY_INDEX.md) to see what exists, then the entity's dedicated doc
3. **I'm integrating a 3rd party**: Check [30_interfaces/EVENTS_AND_WEBHOOKS.md](30_interfaces/EVENTS_AND_WEBHOOKS.md) and [30_interfaces/API_CONTRACTS.md](30_interfaces/API_CONTRACTS.md)
4. **I'm troubleshooting data issues**: See [40_gaps_and_roadmap/EVIDENCE_MAP.md](40_gaps_and_roadmap/EVIDENCE_MAP.md) to trace from docs to code
5. **I want to see what's coming**: Read [00_plan_intent/TARGET_DATA_MODEL.md](00_plan_intent/TARGET_DATA_MODEL.md)

## 📋 Key Principles

- **Evidence-based**: Every claim references concrete file paths (schema, routes, tests)
- **No guessing**: If something is UNKNOWN, we say so and list the file to check
- **Compact**: Tables and bullets, not prose
- **Current + Target**: Side-by-side comparison of today vs PLAN.md
- **Scoped by tenant**: All data is `organizationId`-scoped; we document the enforcement

## 🔍 What This System Does NOT Do

- ❌ Explain the frontend architecture (see `/docs/architecture`)
- ❌ Describe authentication/OIDC integration (see `/docs/security`)
- ❌ Cover third-party API contracts (see `/docs/api`)
- ❌ Detail DevOps/infrastructure (see `/docs/security` or `/RUNBOOK.md`)

---

**Last updated**: 2025-02-04  
**Schema version**: v1 (from shared/schema.ts)  
**Entities discovered**: 27 core tables + relations
