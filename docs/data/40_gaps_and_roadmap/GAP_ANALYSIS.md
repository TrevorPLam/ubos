# Gap Analysis: Current vs. Target

**Scope**: Data layer gaps between what exists today and what PLAN.md requires  
**Date**: 2025-02-04  
**Evidence**: [CURRENT_STATE_OVERVIEW.md](../10_current_state/CURRENT_STATE_OVERVIEW.md), [TARGET_DATA_MODEL.md](../00_plan_intent/TARGET_DATA_MODEL.md)

---

## Executive Summary

**Current state**: 23 of 30 target entities exist; MVP vertical slice is mostly complete.  
**Gaps**: Missing workflow engine, outbox pattern, soft deletes, automation, and integration stubs.  
**Risk**: Hard-deletes destroy audit trails; no event-driven architecture yet.  
**Priority**: Implement soft deletes first, then outbox + workflow, then integrations.

---

## 🎯 Gap Priority Matrix

| Gap | Severity | Effort | Blocks | Target Phase |
|-----|----------|--------|--------|--------------|
| **Soft Deletes (deleted_at)** | 🔴 HIGH | 🟡 MEDIUM | Compliance, audit trail | Phase 1 |
| **Activity Event Auto-Logging** | 🔴 HIGH | 🟡 MEDIUM | Compliance, timeline | Phase 1 |
| **Outbox Pattern + Dispatcher** | 🔴 HIGH | 🔴 HIGH | Event-driven, all workflows | Phase 2 |
| **Workflow Engine** | 🔴 HIGH | 🔴 HIGH | All automated flows | Phase 2 |
| **Email Sync (OAuth + Job)** | 🟡 MEDIUM | 🔴 HIGH | Communications, integration | Phase 2 |
| **Ledger Sync (QBO/Xero)** | 🟡 MEDIUM | 🔴 HIGH | Revenue, integration | Phase 2 |
| **E-Sign Webhook Handler** | 🟡 MEDIUM | 🟡 MEDIUM | Agreements automation | Phase 1.5 |
| **File Upload + Presign** | 🟡 MEDIUM | 🟡 MEDIUM | Files, portal | Phase 1 |
| **Client Portal UI** | 🟡 MEDIUM | 🔴 HIGH | Portal, client-facing | Phase 1 |
| **Appointment Entity** | 🟢 LOW | 🟢 LOW | Scheduling domain | Phase 2 |
| **Search (FTS)** | 🟢 LOW | 🟡 MEDIUM | Discoverability | Phase 2 |
| **Pagination** | 🟢 LOW | 🟡 MEDIUM | Scalability | Phase 1 |

---

## 📊 Missing Entities (7)

| Entity | Domain | Purpose | Impact | Target Phase |
|--------|--------|---------|--------|--------------|
| **Appointment** | Scheduling | Calendar sync + booking | Scheduling workflows blocked | Phase 2 |
| **WorkflowTrigger** | Workflow | Rule definition | Automation blocked | Phase 2 |
| **WorkflowRun** | Workflow | Execution instance | Automation blocked | Phase 2 |
| **WorkflowAction** | Workflow | Action execution + retry | Automation blocked | Phase 2 |
| **OutboxEvent** | Eventing | Event transport | Event-driven arch blocked | Phase 2 |
| **ProposalVersion** | Agreements | Amendment tracking | Proposal versioning | Phase 2 |
| **ContractVersion** | Agreements | Amendment tracking | Contract versioning | Phase 2 |

**Impact**: Workflow-driven features (auto-create project on contract signed, auto-draft invoice on date) cannot be built until these exist.

---

## 🔴 High-Priority Data Gaps

### 1. Soft Deletes (Critical for Compliance)

**Current**: Hard delete only (`DELETE FROM table WHERE id = ?`)  
**Issue**: Destroys audit trail, violates GDPR/HIPAA compliance requirements  
**Target**: Add `deleted_at` timestamp column

**Required Changes**:

```sql
-- Add to all org-scoped tables
ALTER TABLE client_companies ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE deals ADD COLUMN deleted_at TIMESTAMP;
-- ... etc for all business entities
```

**Storage Layer Changes**:
- Rename `delete*()` to `softDelete*()` (mark with deleted_at = now())
- Add filter to all `get*()` queries: `WHERE deleted_at IS NULL`
- Add new methods `permanentlyDelete*()` for GDPR right-to-be-forgotten
- Add `restore*()` method (optional)

**Estimated effort**: 40 hours (schema, storage, tests, UI)  
**Blocks**: Compliance, audit, data recovery

### 2. Activity Event Auto-Logging (Critical for Audit)

**Current**: Manual `storage.createActivityEvent()` calls (rarely used)  
**Issue**: No automatic audit trail; activities must be manually logged by routes  
**Target**: Auto-log all CRUD operations

**Required Changes**:

```typescript
// Middleware to capture pre/post state
app.use((req, res, next) => {
  req.preState = { /* ... */ };
  const originalSend = res.send;
  res.send = function(data) {
    req.postState = data;
    logActivity(req, res); // Auto-log
    return originalSend.call(this, data);
  };
  next();
});
```

**Or: Trigger-based** (at DB level):
```sql
CREATE TRIGGER log_activity_on_insert
AFTER INSERT ON deals
FOR EACH ROW
EXECUTE FUNCTION insert_activity_event('created', NEW.id, 'deals');
```

**Estimated effort**: 30 hours (middleware or triggers, schema, tests)  
**Blocks**: Compliance, timeline feature, debugging

### 3. Outbox Pattern + Event Dispatcher (Critical for Event-Driven)

**Current**: None; all mutations are synchronous, in-process  
**Issue**: No way to trigger workflows, no eventual consistency, no integration jobs  
**Target**: Implement outbox table + async dispatcher

**Required Changes**:

```typescript
// New table: outbox
pgTable("outbox", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aggregateId: varchar("aggregate_id").notNull(),
  aggregateType: varchar("aggregate_type").notNull(),
  eventType: varchar("event_type").notNull(),
  eventVersion: integer("event_version").default(1),
  eventData: jsonb("event_data").notNull(),
  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"), // NULL = unprocessed
  error: text("error"), // NULL = success
});
```

**Dispatcher job** (runs every 1 second):
1. SELECT * FROM outbox WHERE processed_at IS NULL LIMIT 100
2. For each event:
   - Publish to subscribers (workflow, email sync, ledger sync)
   - Handle retries + dead-letter queue
   - Mark as processed_at = now()

**Estimated effort**: 60 hours (schema, dispatcher, tests, monitoring)  
**Blocks**: Workflows, integrations, event-driven features

### 4. Workflow Engine (Critical for Orchestration)

**Current**: None  
**Issue**: Cannot automate: "proposal accepted → create project", "invoice.paid → update CRM", etc.  
**Target**: Implement WorkflowTrigger + WorkflowRun + WorkflowAction

**Required Changes**:

```typescript
// Workflow definition (store in DB or code)
const workflowDefinition = {
  name: "contract_signed",
  trigger: { event: "ContractSigned" },
  actions: [
    { type: "create_engagement", payload: { /* ... */ } },
    { type: "create_project", payload: { /* ... */ } },
    { type: "send_email", payload: { /* ... */ } },
  ],
};

// Execution (triggered by outbox dispatcher)
function runWorkflow(event: OutboxEvent) {
  const run = createWorkflowRun(event);
  for (const action of workflow.actions) {
    try {
      executeAction(action, event, run);
    } catch (err) {
      createWorkflowActionError(run, action, err);
      // Retry logic
    }
  }
}
```

**Estimated effort**: 80 hours (schema, executor, tests, monitoring)  
**Blocks**: All 6 flagship workflows, automation

---

## 🟡 Medium-Priority Data Gaps

### 5. Email Sync (OAuth + Background Job)

**Current**: Schema ready (threads, messages); no OAuth or sync job  
**Issue**: Cannot pull emails from Gmail/Graph API or push notifications  
**Target**: Implement OAuth + sync job (every 5 min)

**Required Changes**:

```typescript
// New table: integration_config
pgTable("integration_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  providerType: varchar("provider_type").notNull(), // "gmail", "graph", "mailgun"
  accessToken: varchar("access_token").notNull(), // Encrypted
  refreshToken: varchar("refresh_token"),
  expiresAt: timestamp("expires_at"),
  lastSyncAt: timestamp("last_sync_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sync job
async function syncEmailsForOrg(orgId: string) {
  const config = await storage.getIntegrationConfig(orgId, "gmail");
  if (!config) return;
  const emails = await gmail.fetchEmails(config.accessToken, since: config.lastSyncAt);
  for (const email of emails) {
    await storage.createOrUpdateThread(orgId, email);
  }
  await storage.updateIntegrationConfig(orgId, { lastSyncAt: now() });
}
```

**Estimated effort**: 100 hours (OAuth flow, sync job, threading logic, error handling)  
**Blocks**: Communications domain, integration

### 6. Ledger Sync (QBO/Xero)

**Current**: Schema ready (invoices, bills); no OAuth or sync job  
**Issue**: Cannot sync invoices/bills to accounting software  
**Target**: Implement OAuth + sync job (daily)

**Required Changes**: Similar to email sync, but for GL sync.

**Estimated effort**: 120 hours (OAuth, provider clients, mapping, error handling)  
**Blocks**: Revenue domain, accounting workflow

### 7. E-Sign Webhook Handler

**Current**: Schema ready (contracts.signatureData); no provider abstraction or webhook  
**Issue**: Cannot receive signature events from DocuSign/Dropbox Sign/PandaDoc  
**Target**: Implement provider abstraction + webhook receiver

**Required Changes**:

```typescript
// Webhook handler
app.post("/api/webhooks/esign/:provider", (req, res) => {
  const { provider } = req.params;
  const signature = req.header("x-signature"); // Verify signature per provider
  const event = parseEvent(provider, req.body);
  
  if (event.type === "signature_completed") {
    const contract = await storage.getContract(event.contractId, orgId);
    await storage.updateContract(contract.id, orgId, {
      status: "signed",
      signedAt: now(),
      signatureData: event.signatureData,
    });
    publishEvent("ContractSigned", { contractId: contract.id });
  }
  res.json({ ok: true });
});
```

**Estimated effort**: 60 hours (provider abstraction, webhook verification, error handling)  
**Blocks**: Agreements automation, signature workflows

### 8. File Upload + Presigned URLs

**Current**: Schema ready (fileObjects); no S3 client or presign service  
**Issue**: Cannot upload or download files securely  
**Target**: Implement S3 integration + presigned URLs

**Required Changes**:

```typescript
// Upload handler
app.post("/api/upload", (req, res) => {
  const file = req.file;
  const { engagementId } = req.body;
  const path = `${orgId}/${engagementId}/${randomUUID()}-${file.originalname}`;
  
  // Upload to S3
  await s3.putObject({ Bucket: "ubos-files", Key: path, Body: file.buffer });
  
  // Create metadata record
  const fileObj = await storage.createFileObject({
    organizationId: orgId,
    engagementId,
    name: file.originalname,
    path,
    mimeType: file.mimetype,
    size: file.size,
  });
  res.json(fileObj);
});

// Presigned download
app.get("/api/files/:id/download", (req, res) => {
  const file = await storage.getFileObject(req.params.id, orgId);
  const presignedUrl = s3.getSignedUrl("getObject", {
    Bucket: "ubos-files",
    Key: file.path,
    Expires: 3600, // 1 hour
  });
  res.json({ url: presignedUrl });
});
```

**Estimated effort**: 40 hours (S3 client, upload/download routes, presign service, tests)  
**Blocks**: Files domain, document sharing

---

## 🟢 Low-Priority Data Gaps

### 9. Client Portal UI

**Current**: Schema ready (clientPortalAccess); no routes or UI  
**Issue**: Cannot generate magic links or show client view  
**Target**: Implement magic link route + portal views

**Estimated effort**: 80 hours (backend routes, UI components, access control)  
**Blocks**: Portal domain, client-facing features

### 10. Search (FTS)

**Current**: No search endpoints  
**Issue**: Users cannot find entities quickly  
**Target**: Implement Postgres FTS or OpenSearch

**Estimated effort**: 40 hours (FTS index, search endpoint, UI)  
**Blocks**: Discoverability (low impact initially)

### 11. Pagination

**Current**: All list endpoints return all rows (no limit/offset)  
**Issue**: Scalability issue; large orgs with 100K+ records will be slow  
**Target**: Add limit/offset (or cursor-based) pagination

**Estimated effort**: 30 hours (schema, routes, tests)  
**Blocks**: Scalability (low impact until 10K+ rows per table)

---

## 📋 Detailed Gap-by-Gap Checklist

### Soft Deletes
- [ ] Add `deleted_at: timestamp` to all org-scoped tables (20 tables)
- [ ] Update all storage `get*()` methods to filter `WHERE deleted_at IS NULL`
- [ ] Rename `delete*()` to `softDelete*()` (mark deleted_at = now())
- [ ] Add `permanentlyDelete*()` for GDPR right-to-be-forgotten
- [ ] Add tests for soft delete
- [ ] Add UI for "show deleted" toggle
- [ ] Add UI for restore (optional)

**Files to change**:
- [shared/schema.ts](/shared/schema.ts)
- [server/storage.ts](/server/storage.ts) (all methods)
- [server/routes.ts](/server/routes.ts) (delete endpoints)
- [tests/backend/](/tests/backend/) (add soft-delete tests)

### Activity Event Auto-Logging
- [ ] Add middleware to capture pre/post state
- [ ] Wire middleware to create activityEvents for all CRUD
- [ ] Define event type mappings (create, update, delete, status_changed, etc.)
- [ ] Add redaction rules (no passwords, API keys, signatures)
- [ ] Add tests for auto-logging
- [ ] Update timeline UI to fetch activityEvents

**Files to change**:
- [server/index.ts](/server/index.ts) (middleware)
- [server/storage.ts](/server/storage.ts) (add helper for batch activity creation)
- [tests/backend/](/tests/backend/) (add audit tests)

### Outbox Pattern
- [ ] Create `outbox` table schema
- [ ] Add `storage.createOutboxEvent()` method
- [ ] Implement dispatcher job (runs every 1 second in background)
- [ ] Add dead-letter queue for failed events
- [ ] Add event versioning support
- [ ] Add monitoring/alerting (queue depth, lag)
- [ ] Add tests for outbox + dispatcher
- [ ] Update all domain services to write outbox instead of direct updates

**Files to create**:
- [server/outbox.ts](/server/outbox.ts) (schema + dispatcher)
- [server/jobs/outbox-dispatcher.ts](/server/jobs/outbox-dispatcher.ts) (job)
- [tests/backend/outbox.test.ts](/tests/backend/outbox.test.ts)

### Workflow Engine
- [ ] Create `workflow_trigger`, `workflow_run`, `workflow_action` tables
- [ ] Define workflow DSL (JSON or TypeScript)
- [ ] Implement action executor (create, update, send email, etc.)
- [ ] Implement retry logic + exponential backoff
- [ ] Add workflow runner (triggered by outbox dispatcher)
- [ ] Add tests for workflow execution
- [ ] Implement the 6 flagship workflows

**Files to create**:
- [server/workflow.ts](/server/workflow.ts) (engine)
- [server/workflows/](/server/workflows/) (workflow definitions)
- [tests/backend/workflow.test.ts](/tests/backend/workflow.test.ts)

---

## 🔗 Dependency Graph

```
Soft Deletes
  ↓
Activity Event Auto-Logging
  ↓
Outbox Pattern
  ├→ Workflow Engine
  │   └→ Email Sync Job
  │   └→ Ledger Sync Job
  │   └→ E-Sign Webhook Handler
  │
  └→ Search (FTS)

Pagination (independent)
File Upload + Presign (independent)
Client Portal (depends on soft deletes + pagination)
Appointment Entity (independent)
```

---

## 📈 Impact Summary

| Gap | Risk if not addressed | Estimated ROI of fixing |
|-----|----------------------|------------------------|
| Soft deletes | Compliance violation, audit trail loss | 🔴 Critical |
| Activity logging | Cannot debug, audit trail missing | 🔴 Critical |
| Outbox | Cannot scale beyond 1 instance, no event replay | 🔴 Critical |
| Workflow engine | Manual steps required, cannot automate PLAN.md flows | 🔴 Critical |
| Email sync | Cannot communicate via email | 🟡 High |
| Ledger sync | Cannot sync to accounting software | 🟡 High |
| E-sign webhook | Cannot receive signatures, manual verification | 🟡 High |
| File upload | Cannot share documents | 🟡 High |
| Pagination | Slow UX for large orgs (100K+ rows) | 🟢 Low |
| Search | Users cannot find entities | 🟢 Low |
| Client portal | Cannot give client portal access | 🟢 Low |

---

## 🎯 Recommended Phase-In

### Phase 1 (Weeks 1–4): Foundation
1. **Week 1**: Soft deletes (add deleted_at column, update all storage methods)
2. **Week 2**: Activity event auto-logging (middleware + tests)
3. **Week 3**: File upload + presign service
4. **Week 4**: Pagination + client portal magic links

### Phase 2 (Weeks 5–8): Event-Driven Architecture
1. **Week 5**: Outbox table + dispatcher
2. **Week 6**: Workflow engine + trigger system
3. **Week 7**: Email sync job scaffold
4. **Week 8**: Ledger sync job scaffold

### Phase 3 (Weeks 9–12): Integrations
1. **Week 9**: E-sign webhook handler
2. **Week 10**: Email OAuth flow (Gmail/Graph API)
3. **Week 11**: Ledger OAuth flow (QBO/Xero)
4. **Week 12**: Implement 6 flagship workflows

### Phase 4+ (Beyond): Polish
- Search (FTS)
- Appointment entity + calendar sync
- Custom fields
- Versioning (proposals, contracts)

---

**Next**: See [EVIDENCE_MAP.md](EVIDENCE_MAP.md) to trace each gap to the code files that need changes.
