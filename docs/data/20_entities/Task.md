# Entity: Task

**Role**: Individual work unit; project execution  
**Domain**: Projects  
**Schema**: [shared/schema.ts](../../shared/schema.ts#L449-L484)  
**Storage**: [server/storage.ts](../../server/storage.ts)  
**Routes**: [server/routes.ts](../../server/routes.ts)

---

## 🎯 Purpose

**Task** represents a single unit of work within a project. It tracks:
- What work needs to be done
- Who is assigned to do it
- Progress status (todo → completed)
- Priority and due date
- Link to project and optional milestone

Core to **project execution and team coordination**.

---

## 📋 Full Schema

```typescript
export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: varchar("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    milestoneId: varchar("milestone_id")
      .references(() => milestones.id, { onDelete: "set null" }),
    assigneeId: varchar("assignee_id"),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tasks_project").on(table.projectId),
    index("idx_tasks_assignee").on(table.assigneeId),
    index("idx_tasks_status").on(table.status),
  ],
);
```

---

## 🔑 Field Reference

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | VARCHAR (UUID) | ✅ | gen_random_uuid() | Primary key |
| `organizationId` | VARCHAR (UUID) | ✅ | — | FK → organizations; tenant scoping |
| `projectId` | VARCHAR (UUID) | ✅ | — | FK → projects; required (task must belong to project) |
| `milestoneId` | VARCHAR (UUID) | ❌ | NULL | FK → milestones; optional (task may not be tied to milestone) |
| `assigneeId` | VARCHAR (255) | ❌ | NULL | User ID (string); who is assigned to task |
| `name` | VARCHAR (255) | ✅ | — | Task title (e.g., "Design homepage mockups") |
| `description` | TEXT | ❌ | NULL | Long-form task details; acceptance criteria |
| `status` | ENUM | ✅ | "todo" | todo, in_progress, review, completed, cancelled |
| `priority` | ENUM | ✅ | "medium" | low, medium, high, urgent |
| `dueDate` | TIMESTAMP | ❌ | NULL | When task should be completed |
| `completedAt` | TIMESTAMP | ❌ | NULL | When task was actually completed |
| `sortOrder` | INTEGER | ✅ | 0 | Display order in project (lower = earlier) |
| `createdAt` | TIMESTAMP | ✅ | now() | Auto-set on insert |
| `updatedAt` | TIMESTAMP | ✅ | now() | Auto-set on update |

---

## 📊 Enums & State Machines

### Status Enum
```typescript
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "completed",
  "cancelled",
]);
```

**State Transitions**:
```
todo ──→ in_progress ──→ review ──→ completed
  ↓
(cancelled) ← ← ← ← ← ← ← ← ← (from any state)
```

**Semantics**:
- **todo**: Not started; unassigned or assigned but not begun
- **in_progress**: Work in progress; assignee actively working
- **review**: Complete but awaiting approval; code review, QA, etc.
- **completed**: Done; approved and released
- **cancelled**: Not doing this; task abandoned

### Priority Enum
```typescript
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
```

**Semantics**:
- **low**: Nice-to-have; can slip
- **medium**: Important; do it this sprint
- **high**: Critical; block other work if necessary
- **urgent**: Do now; highest priority

---

## 🔗 Relationships

### Inbound
| Parent | FK | Cascade |
|--------|----|----|
| Organization | organizationId | CASCADE |
| Project | projectId | CASCADE |
| Milestone | milestoneId | SET NULL |

### Outbound
| Child | FK | Notes |
|-------|----|----|
| ActivityEvent | task_id | Timeline entries tied to task |
| (none) | — | Tasks are leaf nodes |

---

## 📈 Typical Task Lifecycle

### New Task (Todo)
```json
{
  "id": "task-001",
  "organizationId": "org-001",
  "projectId": "project-001",
  "milestoneId": "milestone-001",
  "assigneeId": null,
  "name": "Design homepage mockups",
  "description": "Create 3 design mockup variations for stakeholder review",
  "status": "todo",
  "priority": "high",
  "dueDate": "2025-02-28T00:00:00Z",
  "completedAt": null,
  "sortOrder": 0,
  "createdAt": "2025-02-01T00:00:00Z",
  "updatedAt": "2025-02-01T00:00:00Z"
}
```

### Assigned to Developer (In Progress)
```json
{
  // ... same ...
  "assigneeId": "user-bob",
  "status": "in_progress",
  "updatedAt": "2025-02-05T09:00:00Z"
}
```

### Under Review
```json
{
  // ... same ...
  "status": "review",
  "updatedAt": "2025-02-25T17:30:00Z"
}
```

### Completed
```json
{
  // ... same ...
  "status": "completed",
  "completedAt": "2025-02-27T14:15:00Z",
  "updatedAt": "2025-02-27T14:15:00Z"
}
```

---

## 🏪 Storage Methods

```typescript
getTasks(orgId: string): Promise<Task[]>;
getTask(id: string, orgId: string): Promise<Task | undefined>;
createTask(data: InsertTask): Promise<Task>;
updateTask(id: string, orgId: string, data: Partial<InsertTask>): Promise<Task | undefined>;
deleteTask(id: string, orgId: string): Promise<boolean>;

// Bulk operations (TODO)
getTasksByProject(projectId: string, orgId: string): Promise<Task[]>;
getTasksByAssignee(assigneeId: string, orgId: string): Promise<Task[]>;
getOverdueTasks(orgId: string): Promise<Task[]>;
```

---

## 🌐 API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tasks` | List all tasks for org (no filtering yet) |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/:id` | Fetch single task |
| PUT | `/api/tasks/:id` | Update task (assign, change status, etc.) |
| DELETE | `/api/tasks/:id` | Hard delete (TODO: soft delete) |

**Example**: Assign task and mark in progress
```http
PUT /api/tasks/task-001
Content-Type: application/json

{
  "assigneeId": "user-bob",
  "status": "in_progress"
}
```

---

## 📋 Validation Schema

```typescript
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Custom validations (TODO):
// - name is non-empty
// - dueDate in future (optional; can be in past for overdue tracking)
// - status transitions are valid (no review → todo)
// - assigneeId must belong to org (if not null)
// - priority is one of {low, medium, high, urgent}
```

---

## 🔐 Audit & Workflow

### Auto-Triggered Events (TODO)
- When status → "completed": Mark milestone progress, check if milestone complete
- When dueDate passes and status ≠ "completed": Mark as overdue (TODO: track via notification)
- When assigneeId changes: Send notification to new assignee
- When status changes: Log activity event

### Overdue Tracking (TODO)
- Daily job queries tasks where dueDate < now() and status ≠ "completed"
- Send reminder emails to assignee
- Surface in dashboard

---

## 📊 Query Patterns

| Query | Index | Rows | Notes |
|-------|-------|------|-------|
| All tasks for project | (project_id) | 10–10K | Filter by status in WHERE |
| Tasks for assignee | (assignee_id) | 5–100 | User's workload |
| Overdue tasks | (status) + WHERE dueDate < now() | 0–100 | High priority |
| High priority tasks | (priority) | 10–1K | Urgent work |
| Tasks by milestone | (milestone_id) | 1–1K | Milestone progress |

---

## 🎨 UI Patterns (Frontend)

### Kanban View
```
TODO             IN_PROGRESS      REVIEW           COMPLETED
────────────────────────────────────────────────────────────
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Task A       │ │ Task B       │ │ Task C       │ │ Task D       │
│ Priority: H  │ │ Assigned: Bob│ │ Waiting for: │ │ Done         │
│ Due: Feb 28  │ │ Due: Feb 20  │ │ Alice        │ │ Completed:   │
│              │ │ 60% done     │ │ Due: Feb 22  │ │ Feb 27       │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### List View (Backlog)
- Sort by priority, dueDate, status
- Filter by assignee, status
- Bulk actions (assign multiple, change priority)

### Detail View
- Task name + description
- Assignee + status
- Due date + completion date
- Comments/activity timeline
- Related items (milestone, project, files)

---

## 📈 Metrics & Analytics

### Task Velocity (TODO)
```
completed_tasks_per_week / sprint_duration = velocity
```

### Burndown Chart (TODO)
```
Remaining points (Y) vs Days in sprint (X)
Track ideal vs actual progress
```

### Cycle Time (TODO)
```
avg(completedAt - createdAt) = how long tasks take on average
```

---

## 🔄 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Creation** | Manual API | Manual API + bulk import from template |
| **Status transitions** | Free-form | State machine validation |
| **Soft delete** | ❌ Hard delete | ✅ Add deleted_at |
| **Activity logging** | Manual | Auto-log on all changes |
| **Kanban view** | ❌ | ✅ Drag-drop kanban |
| **Bulk assignment** | ❌ | ✅ Assign multiple at once |
| **Time tracking** | ❌ | ✅ Track hours spent |
| **Dependencies** | ❌ | ✅ Task A blocks Task B |
| **Subtasks** | ❌ | ✅ Nested tasks |
| **Recurring** | ❌ | ✅ Create weekly/monthly tasks |
| **Notifications** | ❌ | ✅ Email on due date / overdue |
| **Mobile** | ❌ | ✅ Mobile-friendly kanban |

---

## 💡 Pro Tips for Implementation

### Avoiding Common Issues
1. **Overdue tracking**: Don't hard-code today; always check `dueDate < now()`
2. **Status transitions**: Use enum switch/case to validate transitions
3. **Cascade deletes**: When project deletes, tasks cascade automatically (FK)
4. **Assignee validation**: Check user belongs to org before assigning
5. **Sort order**: Use sortOrder for kanban column ordering; update on drag
6. **Soft deletes**: Add deleted_at column; filter in all queries

### Testing
- Test all status transitions (valid + invalid)
- Test cascading deletes (delete project → tasks gone)
- Test org scoping (org A can't see org B's tasks)
- Test overdue date logic (edge case: due date = today)
- Test bulk operations (assign 100 tasks at once)

---

**See also**: [Project.md](Project.md), [Milestone.md](Milestone.md), [Engagement.md](Engagement.md)
