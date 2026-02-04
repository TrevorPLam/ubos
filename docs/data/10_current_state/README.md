# Current State - Data Implementation

**Purpose**: Document actual data model, storage, flows as implemented today  
**Audience**: All engineers, data analysts, DBAs  
**Status**: Living documents - evidence-based data documentation

---

## 📋 Overview

Documents the **"as is"** data layer - actual schemas, indexes, constraints, data flows, and storage systems currently in production.

---

## 📚 Documents in This Folder

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [CURRENT_STATE_OVERVIEW.md](CURRENT_STATE_OVERVIEW.md) | High-level data landscape | 10 min | ✅ Complete |
| [DATA_SOURCES.md](DATA_SOURCES.md) | DBs, caches, queues, storage | 10 min | 🟡 Planned |
| [TENANCY_AND_ACCESS.md](TENANCY_AND_ACCESS.md) | Org scoping, authorization | 10 min | ✅ Complete |
| [DATA_FLOWS.md](DATA_FLOWS.md) | Read/write paths, integrations | 10 min | 🟡 Planned |
| [AUDIT_LOGGING_AND_REDACTION.md](AUDIT_LOGGING_AND_REDACTION.md) | What's logged, PII handling | 10 min | 🟡 Planned |
| [RETENTION_AND_DELETION.md](RETENTION_AND_DELETION.md) | Data lifecycle policies | 5 min | 🟡 Planned |
| [BACKUPS_AND_RECOVERY.md](BACKUPS_AND_RECOVERY.md) | Backup strategy, RTO/RPO | 5 min | 🟡 Planned |

---

## 🎯 Key Principles

**Evidence-Based**: Every claim includes file reference or query to verify  
**Current Reality**: What exists now, not what we wish existed  
**Tenant-Scoped**: organizationId enforcement documented everywhere  
**Performance-Aware**: Query patterns, indexes, optimization strategies

---

## 🏗️ Current Data Architecture

### Storage Systems

**Primary**: PostgreSQL 14+ (relational data)  
- All business entities  
- ACID transactions  
- JSONB for flexible fields  
- Connection pooling via Drizzle ORM

**Cache**: Redis (planned)  
- Session data  
- Query result cache  
- Rate limiting counters

**Object Storage**: MinIO / S3 (planned)  
- File uploads  
- Presigned URLs  
- Per-tenant buckets

**Queue**: PostgreSQL (via outbox pattern)  
- Background jobs  
- Event dispatching  
- Async integrations

---

## 💡 Current Implementation Highlights

### 1. **Drizzle ORM** (Type-Safe SQL)

**Benefit**: TypeScript types generated from schema  
**Evidence**: `shared/schema.ts` defines all tables  
**Pattern**: Schema-first development

```typescript
// Type-safe queries
const clients = await db.select()
  .from(schema.clients)
  .where(eq(schema.clients.organizationId, orgId));
```

### 2. **Organization-Scoped Queries** (Security)

**Pattern**: Storage layer enforces tenant isolation  
**Evidence**: `server/storage.ts` wraps all DB access  
**Guarantee**: Impossible to accidentally query cross-tenant

```typescript
// All queries automatically scoped
storage.getClients(organizationId) // Only org's clients
```

### 3. **Activity Events** (Append-Only Audit)

**Pattern**: Immutable audit log of all changes  
**Evidence**: `activity_events` table in schema  
**Benefit**: Complete audit trail, time-travel queries

### 4. **Soft Deletes** (Data Recovery)

**Pattern**: deleted_at timestamp instead of DELETE  
**Evidence**: Many tables have deleted_at column  
**Benefit**: Accidental deletion recovery, compliance

---

## 📊 Current Data Quality Metrics

| Metric | Current Value | Target | Status |
|--------|---------------|--------|--------|
| **Tables Defined** | 27+ | Per PLAN.md | ✅ |
| **Tenant Isolation** | 100% of tables | 100% | ✅ |
| **Indexes on FK** | TBD | 100% | 🟡 |
| **Query Performance (p95)** | TBD | < 50ms | 🟡 |

---

## 🔗 Related Documentation

- **Parent**: [docs/data/README.md](../README.md)
- **Target State**: [docs/data/00_plan_intent/](../00_plan_intent/)
- **Entities**: [docs/data/20_entities/](../20_entities/)

---

**Quick Navigation**: [Back to Data Docs](../README.md) | [Target State](../00_plan_intent/README.md) | [Entities](../20_entities/README.md)
