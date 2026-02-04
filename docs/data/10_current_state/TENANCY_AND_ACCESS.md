# Tenancy & Access Control

**Coverage**: How organizations own and access data; authorization rules  
**Evidence**: [shared/schema.ts](../../shared/schema.ts), [server/storage.ts](../../server/storage.ts), [server/routes.ts](../../server/routes.ts)

---

## 🏢 Multi-Tenancy Model

### Tenant Root
- **Entity**: `Organization`
- **Scope**: Top-level container for all tenant data
- **Uniqueness**: One org per tenant (1:1 relationship)
- **Fields**: id, name, slug, logo, createdAt, updatedAt

### Tenant Membership
- **Entity**: `OrganizationMember`
- **Purpose**: Map user → org + role
- **Fields**: userId, organizationId, role (enum: owner, admin, member, viewer)
- **Create**: Admin manually adds users OR user auto-creates org on login

---

## 🔐 Scoping Rules (Current)

### Rule 1: organizationId on All Tenant Data
**All tables except `users` include `organizationId` and require it in queries.**

```typescript
// ✅ Correct
storage.getDeals("org-123") // Implicit: WHERE organizationId = 'org-123'

// ❌ Wrong
storage.getDeals() // Would violate scoping
```

**Tables with organizationId** (20 total):
- organizations, organizationMembers
- clientCompanies, contacts, deals
- proposals, contracts, engagements
- projects, projectTemplates, tasks
- threads, invoices, invoiceSchedules, payments, bills, vendors
- fileObjects, activityEvents, clientPortalAccess

**Tables without organizationId** (3 total):
- `users` — Global user store (not org-scoped)
- `milestones` — Scoped via FK to project (no direct org column)
- `messages` — Scoped via FK to thread (no direct org column)

### Rule 2: Implicit Cascading Scoping
For entities without direct `organizationId` column, scoping is implicit through FK chains:

```
messages
  └─ thread (FK)
      └─ engagement (FK)
          └─ organization (FK) ← Scoping enforced here
```

**Storage layer must validate** at each level:
```typescript
// Get message: must validate thread.organizationId = orgId
const message = await db.query.messages.findFirst({
  where: and(
    eq(messages.id, messageId),
    eq(threads.organizationId, orgId) // Implicit join + scoping
  ),
});
```

### Rule 3: Every Route Gets orgId Resolved
**Before calling storage, every authenticated route must:**

```typescript
const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  (req as AuthenticatedRequest).user = { claims: { sub: userId } };
  next();
};

// Then in route handler:
app.get("/api/deals", requireAuth, async (req, res) => {
  const userId = getUserIdFromRequest(req)!;
  const orgId = await getOrCreateOrg(userId);  // ← Always resolve orgId first
  
  const deals = await storage.getDeals(orgId);  // ← Pass orgId to every storage call
  res.json(deals);
});
```

---

## 👥 Role-Based Access Control (RBAC)

### Current Implementation
- **Storage**: Roles stored in `organizationMembers.role` enum
- **Enforcement**: ❓ UNKNOWN — no route-level RBAC checks found

### Defined Roles
```typescript
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);
```

**Intended semantics** (not yet enforced):
| Role | Can Create | Can Update | Can Delete | Can Invite | Can Export |
|------|-----------|-----------|-----------|-----------|-----------|
| **owner** | ✅ All | ✅ All | ✅ All | ✅ | ✅ |
| **admin** | ✅ All | ✅ All | ✅ All | ✅ | ✅ |
| **member** | ✅ Most | ✅ Own | ❓ No | ❌ | ❓ |
| **viewer** | ❌ | ❌ | ❌ | ❌ | ✅ |

### TODO: Implement RBAC Middleware
```typescript
// Needed in server/routes.ts
function requireRole(...roles: MemberRole[]) {
  return async (req, res, next) => {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    const member = await storage.getOrganizationMember(userId, orgId);
    
    if (!member || !roles.includes(member.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

// Usage:
app.delete("/api/clients/:id", requireAuth, requireRole("admin", "owner"), async (req, res) => {
  // Only admins and owners can delete
});
```

---

## 🔏 Tenant Isolation Enforcement Points

### Storage Layer (Strongest)
```typescript
// server/storage.ts — Every method includes orgId in WHERE clause

getClientCompanies(orgId: string) {
  return db.query.clientCompanies.findMany({
    where: eq(clientCompanies.organizationId, orgId),
  });
}
```
✅ **Enforced**: Cannot query without org filter

### Route Layer (Medium)
```typescript
// server/routes.ts — Every handler resolves orgId and passes to storage

app.get("/api/clients", requireAuth, async (req, res) => {
  const userId = getUserIdFromRequest(req)!;
  const orgId = await getOrCreateOrg(userId); // ← Tenant resolution
  const clients = await storage.getClientCompanies(orgId); // ← Org filter
  res.json(clients);
});
```
✅ **Enforced at code level**: Developers must call storage with orgId

### Database Layer (Weak — NO FK CONSTRAINT)
```sql
-- Postgres doesn't prevent cross-org queries
-- If a query is written without WHERE organizationId = ..., it would leak data
```
❌ **Not enforced**: SQL-level constraints don't exist

### Tests (Coverage)
```typescript
// tests/backend/multi-tenant-isolation.test.ts
// Verifies org A cannot see org B's data
```
✅ **Tested**: Multi-tenant isolation has test coverage

---

## 📋 Tenant Onboarding Flow

### Current (Auto-Create)
```typescript
// From server/routes.ts: getOrCreateOrg()

async function getOrCreateOrg(userId: string): Promise<string> {
  // 1. Look up user's org
  let org = await storage.getUserOrganization(userId);
  
  if (!org) {
    // 2. User has no org; create one automatically
    org = await storage.createOrganization(
      { 
        name: "Org",  // ← Default name (should be improved)
        slug: `org-${randomUUID().substring(0, 8)}`, // ← Auto-slug
      },
      userId, // ← User becomes owner
    );
  }
  
  return org.id;
}
```

**User Journey**:
1. User clicks "Login"
2. Minted with random userId
3. First request to any API triggers getOrCreateOrg()
4. If no org exists, one is auto-created
5. User is auto-added as owner

**Issues**:
- ❌ Every user gets their own org (no team sharing)
- ❌ org.name defaults to "Org" (not user-friendly)
- ❌ No invite/signup flow (not multi-tenant friendly)

### Target (Invite-Based)
- Admin creates org manually
- Admin invites users by email
- Invited user clicks link, creates account, joins org
- Multiple users can share single org

---

## 🔄 User-Entity Ownership

### Owner References (Denormalized)
Some entities store user IDs directly (not FKs):

| Entity | Field | Purpose | Type |
|--------|-------|---------|------|
| Deal | ownerId | Account manager | VARCHAR (string) |
| Proposal | createdById | Who created | VARCHAR (string) |
| Contract | createdById | Who created | VARCHAR (string) |
| Engagement | ownerId | Account manager | VARCHAR (string) |
| Task | assigneeId | Who assigned | VARCHAR (string) |
| Invoice | (no owner field) | — | — |
| Bill | createdById | Who created | VARCHAR (string) |
| FileObject | uploadedById | Who uploaded | VARCHAR (string) |
| Thread | createdById | Who started | VARCHAR (string) |
| Message | senderId | Who sent | VARCHAR (string) |
| ActivityEvent | actorId | Who acted | VARCHAR (string) |

**Why strings, not FKs?**
- User table may be external (OIDC provider)
- Simplifies querying (no JOIN needed to filter by owner)
- Handles user deletion gracefully (orphaned records don't cascade)

**Implications**:
- ✅ Can delete a user without cascading deletes
- ✅ Can query "tasks assigned to me" without JOIN
- ❌ No referential integrity; orphaned ownerId if user is deleted
- ❌ Cannot directly enforce "user must belong to org"

---

## 🔍 Cross-Tenant Data Leakage Risks

### Risk 1: Missing organizationId Filter
**Code**:
```typescript
// ❌ DANGEROUS
const deals = await db.query.deals.findMany(); // No WHERE clause!
```
**Mitigation**: Code review + tests enforce filters

### Risk 2: Implicit org Scope Chains
**Example**: Getting messages for a user who isn't in the org
```typescript
// ❌ DANGEROUS
const messages = await db.query.messages.findMany({
  where: eq(messages.senderId, userId),
});
// Returns messages from all orgs where userId has sent messages!
```
**Mitigation**: Always validate the thread's org scope

### Risk 3: Denormalized User IDs
**Example**: Assigning task to user not in org
```typescript
// ❌ DANGEROUS
const task = await storage.updateTask(taskId, orgId, {
  assigneeId: "attacker-user-id",
});
// No check that "attacker-user-id" belongs to orgId!
```
**Mitigation**: Add validation middleware to check user membership

### Risk 4: Cascading Deletes Across Org Boundary
**Example**: Deleting a client could cascade incorrectly
```typescript
// If FK is set to CASCADE, deleting a client (from org A)
// that's somehow referenced in org B could delete org B's data
```
**Mitigation**: Cascade rules already set to SET NULL where needed

---

## ✅ Test Coverage

**File**: [tests/backend/multi-tenant-isolation.test.ts](../../tests/backend/multi-tenant-isolation.test.ts)

**Tests**: 
- ✅ Org A cannot read org B's clients
- ✅ Org A cannot read org B's deals
- ✅ Org A cannot update org B's entities
- ✅ Org A cannot delete org B's entities
- (TODO: Add more entity types; currently covers basic CRUD)

---

## 🛡️ Authorization Checklist

| Check | Current | TODO |
|-------|---------|------|
| **org scoping on reads** | ✅ | — |
| **org scoping on writes** | ✅ | — |
| **org scoping on deletes** | ✅ | — |
| **RBAC enforcement** | ❌ | Implement requireRole middleware |
| **User membership validation** | ❌ | Check user in org before allowing changes |
| **Cascading delete safety** | ✅ | Already set to SET NULL where risky |
| **Multi-tenant tests** | ✅ | Expand coverage |
| **Audit logging** | ❌ | Log who accessed what, when (TODO) |

---

## 📊 Current Tenant Limits (Soft)

| Metric | Limit | Justification |
|--------|-------|---|
| Users per org | Unlimited | No quota built in |
| Entities per org | Unlimited | Scaling considerations TBD |
| Max org size | Unlimited | No partitioning/sharding yet |
| Concurrent users | Limited by server capacity | No explicit limit |
| Data retention | Unlimited | No auto-purge; GDPR right-to-delete manual |

---

**Next**: See [DATA_FLOWS.md](DATA_FLOWS.md) for how data moves through the system.
