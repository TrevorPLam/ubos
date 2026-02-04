# Entity Index

**Master list of all data entities in UBOS.**  
**Last updated**: 2025-02-04  
**Evidence**: [shared/schema.ts](/shared/schema.ts)

---

## Quick Navigation

| Entity | Domain | Type | Scoped | Status | Docs |
|--------|--------|------|--------|--------|------|
| **Organization** | Identity | Root | N/A | ✅ MVP | [Organization.md](Organization.md) |
| **OrganizationMember** | Identity | Junction | YES | ✅ MVP | [OrganizationMember.md](OrganizationMember.md) |
| **User** | Identity | Global | NO | ✅ MVP | [User.md](User.md) |
| **ClientCompany** | CRM | Entity | YES | ✅ MVP | [ClientCompany.md](ClientCompany.md) |
| **Contact** | CRM | Entity | YES | ✅ Documented | [Contact.md](Contact.md) |
| **Deal** | Sales | Entity | YES | ✅ Documented | [Deal.md](Deal.md) |
| **Proposal** | Agreements | Entity | YES | ⏳ Pending | [Proposal.md](Proposal.md) |
| **Contract** | Agreements | Entity | YES | ⏳ Pending | [Contract.md](Contract.md) |
| **Engagement** | Hub | Entity | YES | ✅ Documented | [Engagement.md](Engagement.md) |
| **Project** | Projects | Entity | YES | ⏳ Pending | [Project.md](Project.md) |
| **ProjectTemplate** | Projects | Entity | YES | ⏳ Pending | [ProjectTemplate.md](ProjectTemplate.md) |
| **Task** | Projects | Entity | YES | ✅ Documented | [Task.md](Task.md) |
| **Milestone** | Projects | Entity | NO* | ⏳ Pending | [Milestone.md](Milestone.md) |
| **Thread** | Communications | Entity | YES | ⏳ Pending | [Thread.md](Thread.md) |
| **Message** | Communications | Entity | NO* | ⏳ Pending | [Message.md](Message.md) |
| **FileObject** | Files | Entity | YES | ⏳ Pending | [FileObject.md](FileObject.md) |
| **InvoiceSchedule** | Revenue | Entity | YES | ⏳ Pending | [InvoiceSchedule.md](InvoiceSchedule.md) |
| **Invoice** | Revenue | Entity | YES | ✅ Documented | [Invoice.md](Invoice.md) |
| **Payment** | Revenue | Entity | NO* | ⏳ Pending | [Payment.md](Payment.md) |
| **Vendor** | Revenue | Entity | YES | ⏳ Pending | [Vendor.md](Vendor.md) |
| **Bill** | Revenue | Entity | YES | ✅ Documented | [Bill.md](Bill.md) |
| **ActivityEvent** | Timeline | Entity | YES | ✅ Schema | [ActivityEvent.md](ActivityEvent.md) |
| **ClientPortalAccess** | Portal | Entity | YES | ✅ Schema | [ClientPortalAccess.md](ClientPortalAccess.md) |

**Legend**:
- **Type**: Root (tenant), Entity (main data), Junction (join), Global (not scoped)
- **Scoped**: YES = includes `organizationId`; NO = scoped via parent FK
- **Status**: ✅ = schema defined; 🔴 = missing
- `*` = scoped transitively through parent FK

---

## By Domain

### Identity (3 entities)
1. [Organization](Organization.md) — Tenant root
2. [OrganizationMember](OrganizationMember.md) — Role-based access
3. [User](User.md) — Global user record

### CRM / Golden Record (3 entities)
4. [ClientCompany](ClientCompany.md) — Client organization (canonical)
5. [Contact](Contact.md) — Person at client (canonical)
6. [Deal](Deal.md) — Sales opportunity

### Sales / Agreements (3 entities)
7. [Proposal](Proposal.md) — Sales proposal document
8. [Contract](Contract.md) — Legal agreement
9. [Engagement](Engagement.md) — Project hub (cross-domain glue)

### Projects (4 entities)
10. [Project](Project.md) — Container for work
11. [ProjectTemplate](ProjectTemplate.md) — Reusable project structure
12. [Task](Task.md) — Individual work unit
13. [Milestone](Milestone.md) — Project checkpoint

### Communications (2 entities)
14. [Thread](Thread.md) — Conversation container
15. [Message](Message.md) — Individual message

### Files (1 entity)
16. [FileObject](FileObject.md) — Document metadata + S3 reference

### Revenue (5 entities)
17. [Invoice](Invoice.md) — AR ledger (accounts receivable)
18. [InvoiceSchedule](InvoiceSchedule.md) — Recurring billing template
19. [Payment](Payment.md) — Payment allocation
20. [Bill](Bill.md) — AP ledger (accounts payable)
21. [Vendor](Vendor.md) — Vendor/supplier

### Timeline (1 entity)
22. [ActivityEvent](ActivityEvent.md) — Append-only activity log

### Portal (1 entity)
23. [ClientPortalAccess](ClientPortalAccess.md) — Magic link for client access

---

## Schema Statistics

| Metric | Count |
|--------|-------|
| Total entities | 23 |
| Org-scoped entities | 20 |
| Global entities | 1 (users) |
| Junction tables | 1 (organizationMembers) |
| Enums | 12 |
| JSONB columns | 7 (content, attachments, metadata, custom fields) |
| Foreign keys | ~30 |
| Indexes | ~40 |
| Timestamps (created_at) | 23 |
| Timestamps (updated_at) | 13 |

---

## Enum Reference

| Enum Name | Values | Entity | Notes |
|-----------|--------|--------|-------|
| `deal_stage` | lead, qualified, proposal, negotiation, won, lost | Deal | Sales pipeline state machine |
| `proposal_status` | draft, sent, viewed, accepted, rejected, expired | Proposal | Sales doc state |
| `contract_status` | draft, sent, signed, expired, cancelled | Contract | Legal doc state |
| `engagement_status` | active, on_hold, completed, cancelled | Engagement | Project lifecycle state |
| `project_status` | not_started, in_progress, completed, on_hold, cancelled | Project | Project state |
| `task_status` | todo, in_progress, review, completed, cancelled | Task | Task state |
| `task_priority` | low, medium, high, urgent | Task | Priority level |
| `invoice_status` | draft, sent, viewed, paid, overdue, cancelled | Invoice | AR state |
| `bill_status` | pending, approved, rejected, paid, cancelled | Bill | AP state |
| `thread_type` | internal, client | Thread | Communication scope |
| `member_role` | owner, admin, member, viewer | OrganizationMember | Org role |
| `activity_type` | created, updated, deleted, status_changed, signed, sent, viewed, paid, approved, rejected, comment | ActivityEvent | Event type |

---

## Relationships at a Glance

### Hierarchy (Parent → Child)
```
Organization
├── OrganizationMember (user + role)
├── ClientCompany
│   └── Contact (1:many)
├── Deal (1:many)
│   ├── Proposal
│   │   └── Contract
│   │       └── Engagement (hub)
│   │           ├── Project
│   │           │   ├── Task
│   │           │   └── Milestone
│   │           ├── InvoiceSchedule
│   │           │   └── Invoice
│   │           │       └── Payment
│   │           ├── Thread
│   │           │   └── Message
│   │           ├── FileObject
│   │           └── ActivityEvent
│   └── Contract (can exist without proposal)
│       └── Engagement
├── Vendor
│   └── Bill (may or may not link to engagement)
└── ClientPortalAccess (links engagement + contact)
```

### Cross-Domain References (Denormalized Keys)
```
Engagement
├── denorm client_company_id (ref ClientCompany)
├── denorm contact_id (ref Contact)
├── denorm contract_id (ref Contract)
└── denorm deal_id (ref Deal)

Project
├── denorm organization_id (scoping)
└── ref engagement_id (strict FK)

Task
├── denorm organization_id (scoping)
├── ref project_id (strict FK)
├── ref milestone_id (optional)
└── assignee_id (string, denorm user)

Invoice
├── denorm organization_id (scoping)
├── ref engagement_id (strict FK)
├── ref schedule_id (optional)
└── denorm client_company_id (for query efficiency)
```

---

## Lifecycle Patterns

### Create-Update-Delete (All Entities)
| Entity | Create Via | Update Via | Delete Via | Soft Delete |
|--------|------------|-----------|-----------|------------|
| ClientCompany | API + manual | API + merge | API | ❓ NO |
| Contact | API + workflow | API + merge | API | ❓ NO |
| Deal | API + import | API + workflow | API | ❓ NO |
| Proposal | API | API + e-sign flow | API | ❓ NO |
| Contract | API + proposal flow | API + amendments | API | ❓ NO |
| Engagement | API + workflow | API | API | ❓ NO |
| Project | API + template | API + workflow | API | ❓ NO |
| Task | API + template | API + workflow | API | ❓ NO |
| Invoice | API + schedule | API + ledger sync | API | ❓ NO |
| Bill | API + vendor import | API + approval | API | ❓ NO |
| Message | API + email sync | ❌ NO | ❌ NO | Implicit (thread delete) |
| ActivityEvent | ✅ Auto-logged | ❌ NO | ❌ NO | ✅ Implicit (parent delete) |

---

## Field Naming Conventions

| Pattern | Example | Notes |
|---------|---------|-------|
| Foreign keys | `clientCompanyId`, `organizationId` | camelCase, ForeignKeyId |
| Timestamps | `createdAt`, `updatedAt` | camelCase, defaultNow() |
| Status fields | `status`, `stage` | enum, never string |
| Booleans | `isPrimary`, `isClientVisible` | is + noun |
| IDs (string) | `ownerId`, `uploadedById`, `actorId` | noun + Id, typically denorm user |
| Text fields | `name`, `description`, `notes`, `content` | descriptive, nullable if optional |
| Decimals (money) | `amount`, `totalAmount`, `value` | decimal(12, 2), no cents rounding |

---

## Data Model Constraints & Invariants

### Invariants Enforced at DB Level
- ✅ All FKs cascade or set-null per specification
- ✅ UUIDs generated via `gen_random_uuid()`
- ✅ Timestamps default to `now()`
- ✅ Enums enforce valid transitions (at application level)
- ❓ No soft delete (deleted_at) column yet

### Invariants Enforced at Storage Layer
- ✅ All org-scoped queries include `organizationId` filter
- ✅ All creates include `organizationId` unless global
- ❓ No validation of enum transitions (app should check)
- ❓ No deduplication logic (merge strategy not yet defined)

### Invariants Expected at Application Level
- ❓ Cannot add task to completed project
- ❓ Cannot send proposal after expiration
- ❓ Cannot pay invoice twice
- ❓ Cannot delete engagement with active invoices
- ❓ (TBD: Add state machine validators)

---

## Discovery Roadmap

**Start here** if you're:
- **New to the system**: Read [Organization.md](Organization.md), [Deal.md](Deal.md), [Engagement.md](Engagement.md)
- **Adding a feature**: Find the entity in this table, read its doc, check [../30_interfaces/API_CONTRACTS.md](../30_interfaces/API_CONTRACTS.md) for related routes
- **Debugging data**: Search [../40_gaps_and_roadmap/EVIDENCE_MAP.md](../40_gaps_and_roadmap/EVIDENCE_MAP.md) for the entity and trace to code
- **Implementing workflows**: Read [Engagement.md](Engagement.md), then [Invoice.md](Invoice.md) or [Task.md](Task.md) depending on the flow

---

**Individual entity docs are generated below. Each includes**:
- Full schema (fields, types, defaults)
- FK relationships & cascade rules
- Validation schemas (Zod)
- Storage methods (CRUD)
- API endpoints
- Sample records
- Lifecycle state machine
