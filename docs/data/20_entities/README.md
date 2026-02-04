# Entity Documentation

**Purpose**: Document each data entity - schema, relationships, validations, business rules  
**Audience**: All engineers working with data  
**Status**: Living documents - one file per entity

---

## 📋 Overview

This folder contains **one markdown file per entity** documenting its structure, relationships, validation rules, and usage patterns.

---

## 📚 Entity Index

See [ENTITY_INDEX.md](ENTITY_INDEX.md) for complete alphabetical list of all entities with links to their detailed documentation.

**Entity Count**: 27+ core entities across 9 domains

---

## 🎯 Entity Documentation Template

Each entity doc follows this standard structure:

### 1. **Overview**
- Entity purpose and business meaning
- Which domain it belongs to
- Key business rules

### 2. **Schema**
- Table name
- All columns with types
- Primary key
- Foreign keys
- Indexes
- Constraints

### 3. **Relationships**
- One-to-many
- Many-to-one
- Many-to-many
- Self-referential

### 4. **Validations**
- Required vs optional fields
- Format constraints (email, phone, URL)
- Business rule validations
- Cross-field validations

### 5. **Lifecycle**
- How records are created
- How they're updated
- Soft delete or hard delete
- Archival policy

### 6. **Usage Examples**
- Common queries
- CRUD operations
- Edge cases

### 7. **Evidence**
- Schema definition file
- Related tests
- API endpoints using this entity

---

## 🏗️ Entity Categories (by Domain)

### Identity Domain
- **organizations**: Tenants in multi-tenant system
- **users**: User accounts
- **organization_members**: User-to-org relationships (RBAC future)

### CRM Domain
- **client_companies**: Business entities (golden record)
- **contacts**: People at client companies
- **deals**: Sales pipeline opportunities

### Agreements Domain
- **proposals**: Service proposals sent to clients
- **contracts**: Signed agreements

### Engagements Domain
- **engagements**: Overarching client engagement

### Projects Domain
- **projects**: Work being done for clients
- **tasks**: Individual work items
- **milestones**: Project checkpoints
- **project_templates**: Reusable project structures

### Revenue Domain
- **invoices**: Accounts receivable
- **invoice_schedules**: Recurring billing
- **payments**: Payment records
- **bills**: Accounts payable
- **vendors**: Supplier records

### Communication Domain
- **threads**: Conversation threads
- **messages**: Individual messages

### Files Domain
- **file_objects**: File metadata and storage refs

### Timeline Domain
- **activity_events**: Append-only audit log

### Portal Domain
- **client_portal_access**: Client self-service access

---

## 💡 Entity Design Patterns

### 1. **Tenant Isolation Pattern**
Every entity has `organization_id`:
```sql
organization_id UUID NOT NULL REFERENCES organizations(id)
```

### 2. **Soft Delete Pattern**
Many entities support recovery:
```sql
deleted_at TIMESTAMP NULL
```

### 3. **Audit Metadata Pattern**
Track who/when:
```sql
created_at TIMESTAMP NOT NULL DEFAULT NOW()
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
created_by UUID REFERENCES users(id)
updated_by UUID REFERENCES users(id)
```

### 4. **Status Enum Pattern**
Type-safe status values:
```typescript
status: pgEnum('proposal_status', [
  'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
])
```

### 5. **JSONB Flexibility Pattern**
Extensible fields per tenant:
```sql
custom_fields JSONB DEFAULT '{}'
metadata JSONB DEFAULT '{}'
```

---

## 📊 Entity Documentation Health

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Entities with Docs** | 100% | ~30% | 🟡 In Progress |
| **Schema Completeness** | 100% | 100% | ✅ |
| **Examples Included** | 100% | TBD | 🟡 |
| **Evidence Links** | 100% | TBD | 🟡 |

---

## 🔗 Related Documentation

- **Parent**: [docs/data/README.md](../README.md)
- **Schema Code**: [shared/schema.ts](../../../shared/schema.ts)
- **Entity Index**: [ENTITY_INDEX.md](ENTITY_INDEX.md)
- **API Docs**: [docs/api/](../../api/)

---

**Quick Navigation**: [Back to Data Docs](../README.md) | [Entity Index](ENTITY_INDEX.md) | [Current State](../10_current_state/README.md)
