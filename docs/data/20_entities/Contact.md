# Entity: Contact

**Role**: Individual person at a client company; CRM contact record  
**Domain**: CRM  
**Schema**: [shared/schema.ts](/shared/schema.ts#L113-L160)  
**Storage**: [server/storage.ts](/server/storage.ts)  
**Routes**: [server/routes.ts](/server/routes.ts)

---

## 🎯 Purpose

**Contact** represents a person at a client company. It tracks:
- Name, email, phone, job title
- Which company (ClientCompany) they work for
- Communication history and engagement touchpoints
- Whether they are a key decision maker or stakeholder

Core to **relationship management and deal flow**.

---

## 📋 Full Schema

```typescript
export const contacts = pgTable(
  "contacts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    clientCompanyId: varchar("client_company_id")
      .references(() => clientCompanies.id, { onDelete: "cascade" })
      .notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    jobTitle: varchar("job_title", { length: 100 }),
    department: varchar("department", { length: 100 }),
    reportingTo: varchar("reporting_to", { length: 255 }),
    isDecisionMaker: boolean("is_decision_maker").default(false),
    notes: text("notes"),
    metadata: json("metadata").$type<Record<string, any>>(),
    lastContactedAt: timestamp("last_contacted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_contacts_company").on(table.clientCompanyId),
    index("idx_contacts_email").on(table.email),
    index("idx_contacts_decision_maker").on(table.isDecisionMaker),
  ],
);
```

---

## 🔑 Field Reference

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | VARCHAR (UUID) | ✅ | gen_random_uuid() | Primary key |
| `organizationId` | VARCHAR (UUID) | ✅ | — | FK → organizations; tenant scoping |
| `clientCompanyId` | VARCHAR (UUID) | ✅ | — | FK → clientCompanies; which company they work for |
| `firstName` | VARCHAR (100) | ✅ | — | Person's first name |
| `lastName` | VARCHAR (100) | ✅ | — | Person's last name |
| `email` | VARCHAR (255) | ✅ | — | Email address (should be unique per org, TODO) |
| `phone` | VARCHAR (20) | ❌ | NULL | Phone number (no formatting enforced) |
| `jobTitle` | VARCHAR (100) | ❌ | NULL | Their position (e.g., "Engineering Manager") |
| `department` | VARCHAR (100) | ❌ | NULL | Which dept (e.g., "Engineering", "Finance") |
| `reportingTo` | VARCHAR (255) | ❌ | NULL | Manager's name (free text; TODO: FK to another Contact) |
| `isDecisionMaker` | BOOLEAN | ✅ | false | Whether they can approve/reject deals |
| `notes` | TEXT | ❌ | NULL | Internal notes (personality, preferences, history) |
| `metadata` | JSON | ❌ | NULL | Flexible fields (LinkedIn URL, pronouns, timezone, etc.) |
| `lastContactedAt` | TIMESTAMP | ❌ | NULL | When we last communicated (email, call, meeting) |
| `createdAt` | TIMESTAMP | ✅ | now() | Auto-set on insert |
| `updatedAt` | TIMESTAMP | ✅ | now() | Auto-set on update |

---

## 🔗 Relationships

### Inbound
| Parent | FK | Cascade |
|--------|----|----|
| Organization | organizationId | CASCADE |
| ClientCompany | clientCompanyId | CASCADE (contact is tied to company; if company deleted, contact deleted) |

### Outbound
| Child | FK | Notes |
|-------|----|----|
| Engagement | client_contact_id | Engagement has multiple contacts (attendees, stakeholders) |
| Deal | primary_contact_id | Primary stakeholder for deal (1:N relationship) |
| Message | recipient_id | Email/message history tied to contact |
| ActivityEvent | contact_id | Timeline of all interactions (calls, emails, meetings) |
| Thread | participants | Contact can be participant in communication thread |

---

## 📈 Typical Contact Lifecycle

### New Contact Created
```json
{
  "id": "contact-001",
  "organizationId": "org-001",
  "clientCompanyId": "company-acme",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@acme.com",
  "phone": "+1-555-0100",
  "jobTitle": "VP of Engineering",
  "department": "Engineering",
  "reportingTo": "CEO",
  "isDecisionMaker": true,
  "notes": "Friendly, prefers email; budget approved through Q2",
  "metadata": {
    "linkedinUrl": "https://linkedin.com/in/johnsmith",
    "pronouns": "he/him",
    "timezone": "US/Pacific"
  },
  "lastContactedAt": null,
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-02-01T09:00:00Z"
}
```

### Contact Updated After First Meeting
```json
{
  // ... same ...
  "lastContactedAt": "2025-02-05T14:30:00Z",
  "notes": "Friendly, prefers email; budget approved through Q2. Met Feb 5—interested in platform; requested demo",
  "updatedAt": "2025-02-05T14:30:00Z"
}
```

### Contact Becomes Decision Maker
```json
{
  // ... same ...
  "isDecisionMaker": true,
  "notes": "Recently promoted to VP; now approves all tool purchases",
  "updatedAt": "2025-02-10T09:00:00Z"
}
```

---

## 🏪 Storage Methods

```typescript
getContacts(orgId: string): Promise<Contact[]>;
getContact(id: string, orgId: string): Promise<Contact | undefined>;
createContact(data: InsertContact): Promise<Contact>;
updateContact(id: string, orgId: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
deleteContact(id: string, orgId: string): Promise<boolean>;

// Specialized queries (TODO)
getContactsByCompany(companyId: string, orgId: string): Promise<Contact[]>;
getDecisionMakers(orgId: string): Promise<Contact[]>;
getRecentlyContacted(daysBack: number, orgId: string): Promise<Contact[]>;
searchContacts(query: string, orgId: string): Promise<Contact[]>;
```

---

## 🌐 API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/contacts` | List all contacts for org |
| POST | `/api/contacts` | Create new contact |
| GET | `/api/contacts/:id` | Fetch single contact with full details |
| PUT | `/api/contacts/:id` | Update contact (title change, new email, etc.) |
| DELETE | `/api/contacts/:id` | Delete contact (TODO: soft delete) |

**Example**: Update contact after meeting
```http
PUT /api/contacts/contact-001
Content-Type: application/json

{
  "lastContactedAt": "2025-02-05T14:30:00Z",
  "isDecisionMaker": true,
  "notes": "Met Feb 5—very interested in platform; requested demo"
}
```

---

## 📋 Validation Schema

```typescript
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Custom validations (TODO):
// - firstName and lastName are non-empty
// - email is valid email format
// - email + clientCompanyId is unique (no duplicate contacts in same company)
// - phone format (if provided) matches country standards
// - clientCompanyId must belong to org
// - isDecisionMaker is boolean
// - lastContactedAt (if provided) is in past
```

---

## 🔐 Audit & Workflow

### Auto-Triggered Events (TODO)
- When lastContactedAt updates: Log activity event
- When isDecisionMaker changes: Notify internal team
- When contact deleted: Archive all related activities

### Contact Enrichment (TODO)
- Email domain lookup (verify company domain matches clientCompany)
- LinkedIn profile auto-fetch (if LinkedIn URL in metadata)
- Title auto-classification (engineer, manager, executive, etc.)

---

## 📊 Query Patterns

| Query | Index | Rows | Notes |
|-------|-------|------|-------|
| All contacts for company | (client_company_id) | 1–1K | Browse contacts at target account |
| Decision makers | (is_decision_maker) | 5–100 | Focus on approvers |
| Recently contacted | (last_contacted_at) | 10–100 | Re-engagement candidates |
| Search by email | (email) | 0–1 | Find contact by email |
| Search by name | (last_name) | 1–10 | Fuzzy match on name |

---

## 🎨 UI Patterns (Frontend)

### Contact List (by Company)
```
ACME Corp
├─ John Smith (VP Engineering) [Decision Maker] ✓ Last: Feb 5
├─ Sarah Chen (Staff Engineer) Last: Jan 28
├─ Mike Johnson (Engineering Manager) Last: Dec 15
└─ (+ 2 more)
```

### Contact Card
```
┌─────────────────────────────────┐
│ John Smith                      │
│ VP of Engineering @ ACME Corp   │
│                                 │
│ john.smith@acme.com             │
│ +1-555-0100                     │
│                                 │
│ 🔵 Decision Maker               │
│ Last contacted: Feb 5, 2 days   │
│                                 │
│ Reports to: CEO                 │
│ "Friendly, prefers email"       │
└─────────────────────────────────┘
```

### Contact Timeline
- All emails sent to contact
- Meeting notes mentioning contact
- Deals involving contact
- Deal stages (contact approval, etc.)

---

## 📈 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Import** | Manual entry | ✅ Bulk CSV import |
| **Email dedup** | ❌ Can create duplicate | ✅ Unique (email, company) |
| **Email sync** | ❌ | ✅ Gmail sync + thread detection |
| **Soft delete** | ❌ Hard delete | ✅ Add deleted_at |
| **Activity logging** | Manual | ✅ Auto-log contact changes |
| **Org chart** | ❌ | ✅ reportingTo → hierarchy visualization |
| **Decision maker marking** | Manual flag | ✅ Auto-detect from deal stage progress |
| **Contact enrichment** | ❌ | ✅ LinkedIn/RocketReach auto-fetch |
| **Last contacted** | Manual update | ✅ Auto-update from email/call/meeting |
| **Engagement score** | ❌ | ✅ Frequency × recency score |
| **Search** | ❌ | ✅ Full-text search (name, email, company) |
| **Bulk actions** | ❌ | ✅ Assign to deal, tag, email list |

---

## 💡 Pro Tips for Implementation

### Avoiding Common Issues
1. **Duplicate emails**: Check email + clientCompanyId combo is unique
2. **Email validation**: Use regex or email validator; no hardcoding format
3. **Relationship tracking**: Use reportingTo (free text) for now; consider FK to Contact later
4. **Soft deletes**: Add deleted_at; filter in all queries
5. **Last contacted**: Don't rely on manual updates; hook into Message, Thread, ActivityEvent creation
6. **Cascade deletes**: When ClientCompany deletes, all Contacts cascade (FK)

### Testing
- Test unique constraint on (email, clientCompanyId)
- Test email format validation
- Test org scoping (org A can't see org B's contacts)
- Test cascading delete (delete company → contacts deleted)
- Test soft delete (add deleted_at, verify hidden from queries)
- Test decision maker filtering

---

**See also**: [ClientCompany.md](ClientCompany.md), [Deal.md](Deal.md), [Engagement.md](Engagement.md), [Thread.md](Thread.md)
