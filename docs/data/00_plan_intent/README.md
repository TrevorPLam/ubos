# Plan & Intent - Data Architecture Vision

**Purpose**: Define target data model and strategic data architecture  
**Audience**: Data architects, backend engineers, database administrators  
**Status**: Living documents - north star for data design

---

## 📋 Overview

This folder captures the **target data architecture** - what the ideal data model, storage strategy, and data flows should look like. This is extracted from PLAN.md and represents our data architecture goals.

---

## 📚 Documents in This Folder

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [PLAN_SUMMARY.md](PLAN_SUMMARY.md) | Data requirements from PLAN.md | 5 min | 🟡 Planned |
| [TARGET_DATA_MODEL.md](TARGET_DATA_MODEL.md) | Complete target entity model | 15 min | 🟡 Planned |

---

## 🎯 Data Architecture Principles

### Industry Standards Applied

1. **Normalized Database Design** (Codd's Normal Forms)
   - 1NF: Atomic values, no repeating groups
   - 2NF: No partial dependencies
   - 3NF: No transitive dependencies
   - BCNF: Every determinant is a candidate key

2. **Entity-Relationship Modeling** (Chen's ER Model)
   - Entities: Things we store (Client, Project, Invoice)
   - Relationships: How entities connect (Client has many Projects)
   - Attributes: Entity properties (Client.name, Project.status)
   - Cardinality: One-to-one, one-to-many, many-to-many

3. **Multi-Tenant Data Architecture** (SaaS Patterns)
   - **Shared Database, Shared Schema**: One database, organizationId everywhere (our approach)
   - **Shared Database, Separate Schema**: One database, schema per tenant
   - **Separate Database**: Database per tenant (highest isolation)

4. **Event Sourcing** (Append-Only Audit Trail)
   - ActivityEvent table: Immutable log of all changes
   - Current state derived from event history
   - Time-travel capabilities (view data at any point in time)

---

## 🏗️ Target Data Model Highlights

### Core Domains

```
Identity Domain (organizationId, users, roles)
       ↓
CRM Domain (clients, contacts, deals)
       ↓
Agreements Domain (proposals, contracts)
       ↓
Engagements Domain (engagements)
       ↓
Projects Domain (projects, tasks, milestones)
       ↓
Revenue Domain (invoices, payments, bills)
       ↓
Communication Domain (threads, messages)
       ↓
Files Domain (file_objects, presigned URLs)
       ↓
Workflow Domain (workflows, runs, triggers)
       ↓
Timeline Domain (activity_events - append-only)
```

### Key Patterns

**1. Tenant Isolation**
```sql
-- Every table has organizationId
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,  -- Tenant isolation
  name VARCHAR(255) NOT NULL,
  ...
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Index for fast tenant queries
CREATE INDEX idx_clients_org ON clients(organization_id);
```

**2. Soft Deletes**
```sql
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP;

-- Queries exclude soft-deleted records
SELECT * FROM clients 
WHERE organization_id = ? 
  AND deleted_at IS NULL;
```

**3. Audit Trail**
```sql
CREATE TABLE activity_events (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,  -- 'client', 'project', etc.
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,       -- 'created', 'updated', 'deleted'
  changes JSONB NOT NULL,            -- What changed
  timestamp TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Immutable: No UPDATE or DELETE allowed
```

**4. JSONB for Flexibility**
```sql
-- Custom fields per tenant
ALTER TABLE clients ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- Query custom fields
SELECT * FROM clients 
WHERE custom_fields->>'industry' = 'Technology';
```

---

## 💡 Unique Differentiators

### 1. **Golden Record Pattern** (CRM Module)

**Problem**: Client data comes from many sources (proposals, invoices, integrations)

**Solution**: CRM is the **golden record** (single source of truth)
- All client data canonical in CRM
- Other modules reference via foreign key
- Updates flow through CRM, not direct
- Conflicts resolved in CRM module

### 2. **Workflow-Driven Data Changes**

**Traditional**: Services call each other directly  
**Our Approach**: Services emit events, workflow engine orchestrates

**Example**: Proposal Acceptance Flow
```
1. User accepts proposal → Proposal service emits ProposalAccepted event
2. Workflow engine picks up event
3. Workflow creates contract (Agreements service)
4. Workflow creates project (Projects service)
5. Workflow sends notification (Communications service)
6. All orchestrated without direct service calls
```

**Benefits**: Loose coupling, easy to modify flows, natural audit trail

### 3. **Temporal Data** (Time-Travel Queries)

**Pattern**: Track every version of every record

```sql
CREATE TABLE clients_history (
  id UUID,
  version INT,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,
  organization_id UUID,
  name VARCHAR(255),
  ...
  PRIMARY KEY (id, version)
);

-- Query: What was client data on 2024-01-15?
SELECT * FROM clients_history
WHERE id = ?
  AND valid_from <= '2024-01-15'
  AND (valid_to IS NULL OR valid_to > '2024-01-15');
```

**Use Cases**: Compliance, audits, debugging, analytics

### 4. **Per-Tenant Schema Versioning**

**Problem**: SaaS needs to update schema but some tenants on old version

**Solution**: Schema version per tenant
```sql
ALTER TABLE organizations ADD COLUMN schema_version INT DEFAULT 1;

-- Application checks schema version
if (org.schema_version < 2) {
  // Use old field names
} else {
  // Use new field names
}
```

**Benefits**: Gradual migration, tenant-specific rollout, zero downtime

### 5. **Integration Data Separation**

**Pattern**: External data separate from canonical data

```sql
-- Canonical client data
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  ...
);

-- QuickBooks integration data
CREATE TABLE integration_quickbooks_customers (
  ubos_client_id UUID REFERENCES clients(id),
  qb_customer_id VARCHAR(255),
  qb_sync_token VARCHAR(255),
  last_synced_at TIMESTAMP,
  ...
);
```

**Benefits**: Clean separation, easy to disconnect integration, no pollution of core data

---

## 🔬 Enterprise Data Patterns

### 1. **Connection Pooling** (Performance)

**Pattern**: Reuse database connections
```typescript
const pool = new Pool({
  max: 20,                  // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000
});
```

**Best Practices**:
- Pool size = (core_count * 2) + effective_spindle_count
- For CPU-bound: core_count * 2
- For I/O-bound: higher (20-50)
- Monitor pool exhaustion

### 2. **Query Optimization** (Performance)

**Techniques**:
- Indexes on foreign keys
- Composite indexes for common queries
- Covering indexes (include all selected columns)
- EXPLAIN ANALYZE to profile queries
- Query result caching (Redis)

**Example**:
```sql
-- Slow: No index
SELECT * FROM clients WHERE organization_id = ? AND status = 'active';

-- Fast: Composite index
CREATE INDEX idx_clients_org_status ON clients(organization_id, status);
```

### 3. **Transactions** (ACID Compliance)

**Pattern**: Multi-step operations are atomic
```typescript
await db.transaction(async (trx) => {
  const client = await trx.insert(clients).values({...});
  const contact = await trx.insert(contacts).values({...});
  const deal = await trx.insert(deals).values({...});
  // All or nothing
});
```

### 4. **Eventual Consistency** (Distributed Systems)

**Pattern**: Accept temporary inconsistency for availability

**Example**: Integration sync
```
1. Client updated in UBOS
2. Update queued for QuickBooks sync (Outbox pattern)
3. Worker picks up queue item
4. Sync to QuickBooks (may take seconds/minutes)
5. Mark as synced
```

---

## 📊 Target Data Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Data Completeness** | > 95% | Required fields populated |
| **Data Accuracy** | > 99% | Validation rules pass |
| **Data Freshness** | < 1 hour | Integration sync lag |
| **Query Performance (p95)** | < 50ms | Database query latency |
| **Schema Migration Time** | < 5 min | Downtime for schema change |

---

## 🔗 Related Documentation

- **Parent**: [docs/data/README.md](../README.md)
- **Current State**: [docs/data/10_current_state/](../10_current_state/)
- **Entities**: [docs/data/20_entities/](../20_entities/)
- **Gaps**: [docs/data/40_gaps_and_roadmap/](../40_gaps_and_roadmap/)

---

**Quick Navigation**: [Back to Data Docs](../README.md) | [Current State](../10_current_state/README.md) | [Entities](../20_entities/README.md)
