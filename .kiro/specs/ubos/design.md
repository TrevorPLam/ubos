# Design Document: UBOS Professional Services Platform

## Overview

UBOS is a full-stack professional services management platform built as a modular monolith with strict multi-tenant isolation. The platform provides end-to-end workflow management from lead capture through project delivery to payment collection.

### Design Philosophy

**Modular Monolith Architecture**: Single deployable unit with clear domain boundaries, designed to be shippable now while maintaining the option to extract microservices later.

**Security-by-Default**: Every layer enforces security controls - input validation with Zod schemas, organization-scoped database queries, comprehensive audit logging.

**Multi-Tenancy First**: Organization isolation enforced at the storage layer. Every query includes `organizationId` filtering.

**Event-Driven Workflows**: Outbox pattern enables reliable event processing for automation, integrations, and audit trails.

### Current Implementation Status

**Implemented (19 P0 requirements)**: Multi-tenant architecture, CRM basics (Client Companies, Contacts, Deals), Proposals/Contracts CRUD, Project Management (Projects, Tasks, Milestones, Templates), Revenue Management (Invoices, Bills), File storage, Message threads, Activity logging, Workflow engine foundation, Client portal access, Security foundation.

**Remaining MVP (4 P0 requirements)**: RBAC, User invitation/onboarding, User profile management, Organization settings.


## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  React UI (Vite) │ Client Portal │ Mobile PWA (Future)      │
└─────────────────────────────────────────────────────────────┘
                         │ HTTPS/TLS 1.3
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Security Middleware Layer                       │
│  Helmet │ CORS │ Rate Limiting │ CSRF │ Validation         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                           │
│  CRM │ Projects │ Revenue │ Documents │ Comms │ Portal      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Storage Layer (Organization-Scoped)                  │
│  Enforces organizationId filtering on all queries           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  PostgreSQL (Drizzle) │ Redis (Sessions) │ File Store       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Background Workers                            │
│  Event Dispatcher │ Workflow Engine │ Scheduled Jobs        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Runtime**: Node.js 20.x LTS, TypeScript 5.6 (strict mode)

**Frontend**: React 18 + Vite 7, Wouter (routing), TanStack Query (state), Radix UI + Tailwind CSS

**Backend**: Express 4, Drizzle ORM, Zod validation

**Database**: PostgreSQL (primary), Redis (sessions/cache)

**Security**: Helmet, express-rate-limit, csurf, cookie-parser

**Testing**: Vitest, Testing Library, MSW

**Build**: esbuild (server), Vite (client), ESLint + Prettier

### Multi-Tenancy Architecture

**Organization Isolation Strategy**: Every data table (except `users` and `organizations`) includes `organizationId`. Storage layer enforces organization scoping on all queries.

**Enforcement Points**:
1. Storage Layer: All methods require `orgId` parameter
2. API Layer: Routes extract `orgId` from authenticated user session
3. Database Indexes: Composite indexes on `(organizationId, id)`
4. Testing: Property-based tests verify isolation

**User-Organization Relationship**: Users can belong to multiple organizations via `organizationMembers` table. Current implementation picks first organization (future: org switching UI).


### Security Architecture

**Defense in Depth**: Multiple security layers protect against common vulnerabilities.

**Layer 1 - Network Security**:
- TLS 1.3 for all connections
- Trust proxy configuration for correct client IP extraction
- Rate limiting per IP address (prevents brute force, DoS)

**Layer 2 - Application Security**:
- Helmet middleware (HSTS, CSP, X-Frame-Options, etc.)
- CORS configuration for cross-origin requests
- CSRF protection on state-changing endpoints
- Request body size limits (100kb) prevent JSON bomb attacks

**Layer 3 - Input Validation**:
- Zod schemas validate all API inputs
- Sanitization prevents XSS attacks
- Parameterized queries prevent SQL injection (Drizzle ORM)

**Layer 4 - Authorization**:
- Session-based authentication with secure cookies
- Organization-scoped queries prevent cross-tenant access
- RBAC enforcement (P0 requirement, not yet implemented)

**Layer 5 - Audit & Monitoring**:
- Comprehensive activity event logging
- PII redaction in logs (GDPR compliance)
- Security event tracking for SOC2 compliance

**Session Management**:
- Secure, httpOnly, sameSite cookies
- Configurable session timeout (default 8 hours)
- Session invalidation on password change
- Redis-backed sessions for horizontal scaling

### Event-Driven Architecture

**Outbox Pattern**: Ensures reliable event processing without blocking user requests.

**Flow**:
1. User action creates/updates entity
2. Transaction writes entity + outbox event atomically
3. Background worker polls outbox for unprocessed events
4. Worker processes event (triggers workflows, sends notifications)
5. Worker marks event as processed

**Benefits**:
- Guaranteed event delivery (transactional outbox)
- Decoupled workflows (async processing)
- Retry logic for failed events
- Audit trail of all system events

**Event Types**:
- `deal.created`, `deal.updated` (triggers workflow automation)
- `invoice.paid` (triggers project status updates)
- `contract.signed` (triggers engagement creation)
- `task.completed` (triggers milestone progress updates)

**Workflow Engine**: Subscribes to events and executes registered handlers. Foundation implemented (P0), visual builder planned (P1).


## Components and Interfaces

### Domain Organization

The application is organized into logical domains, each with clear boundaries and responsibilities:

**1. CRM Domain** (`/api/clients`, `/api/contacts`, `/api/deals`):
- Client company management with pagination, search, filtering
- Contact management linked to client companies
- Deal pipeline with stage tracking (lead → qualified → proposal → negotiation → won/lost)
- Statistics and analytics (clients by industry, country, active engagements)

**2. Proposals & Contracts Domain** (`/api/proposals`, `/api/contracts`):
- Proposal lifecycle (draft → sent → viewed → accepted/rejected/expired)
- Contract lifecycle (draft → sent → signed → expired/cancelled)
- Linking to deals and client companies
- Content storage as JSONB for flexibility

**3. Engagement Domain** (`/api/engagements`):
- Central hub linking contracts, projects, and billing
- Status tracking (active → on_hold → completed → cancelled)
- Aggregates all engagement-related data (projects, invoices, files, messages)

**4. Project Management Domain** (`/api/projects`, `/api/tasks`, `/api/milestones`, `/api/project-templates`):
- Project lifecycle with status tracking
- Task management with assignments, priorities, status
- Milestone tracking for deliverables
- Project templates for quick project creation

**5. Revenue Management Domain** (`/api/invoices`, `/api/bills`, `/api/vendors`):
- Invoices (AR) with line items, status tracking, payment tracking
- Bills (AP) with approval workflow
- Vendor management
- Invoice schedules for recurring billing (foundation)

**6. Document Management Domain** (`/api/files`):
- File upload and storage
- Client visibility flags for portal access
- Linking to engagements
- Metadata tracking (name, size, type, uploader)

**7. Communication Domain** (`/api/threads`, `/api/messages`):
- Message threads (internal/client)
- Messages within threads
- Thread types for access control
- Last message timestamp tracking

**8. Client Portal Domain** (`/api/portal`):
- Magic link authentication (passwordless)
- Secure token generation with expiration
- Access tracking (last accessed timestamp)
- Engagement-scoped access

**9. Activity & Audit Domain** (`/api/activity-events`):
- Comprehensive activity logging
- Event types (created, updated, deleted, status_changed, etc.)
- Entity tracking (type, ID, engagement linkage)
- Actor attribution with timestamps

**10. Workflow Domain** (background workers):
- Event dispatcher (polls outbox)
- Workflow engine (executes handlers)
- Retry logic for failed events

### API Design Patterns

**RESTful Conventions**:
- `GET /api/resource` - List resources (paginated)
- `GET /api/resource/:id` - Get single resource
- `POST /api/resource` - Create resource
- `PUT /api/resource/:id` - Update resource
- `DELETE /api/resource/:id` - Delete resource

**Consistent Response Format**:
```typescript
// Success response
{
  data: T | T[],
  pagination?: {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}

// Error response
{
  message: string,
  requestId?: string  // For support tracking
}
```

**Pagination**:
- Query params: `?page=1&limit=50`
- Default limit: 50 items
- Metadata includes total count, page info, navigation flags

**Filtering & Search**:
- Search: `?search=term` (searches across multiple fields)
- Filters: `?industry=tech&country=USA` (AND logic)
- Case-insensitive matching with `ilike`

**Organization Scoping**:
- All endpoints extract `organizationId` from session
- Storage methods enforce org filtering
- No cross-tenant data access possible


### Authentication & Authorization

**Current Implementation (Session-Based)**:
- User authentication via session cookies
- `organizationId` stored in session
- Session validation on every request
- Secure cookie configuration (httpOnly, sameSite, secure in production)

**User Model**:
```typescript
{
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  profileImageUrl?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Organization Membership**:
```typescript
{
  id: string,
  organizationId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' | 'viewer',
  createdAt: Date
}
```

**RBAC (P0 - Not Yet Implemented)**:
- Default roles: Admin, Manager, Team Member, Client
- Granular permissions per feature area
- API-level enforcement (not just UI)
- Permission types: view, create, edit, delete, export

**Client Portal Authentication**:
- Magic link tokens (passwordless)
- Token expiration for security
- Engagement-scoped access
- Access tracking for audit

### File Storage

**Storage Strategy**:
- Local filesystem in development
- S3-compatible storage in production (planned)
- Presigned URLs for secure downloads (planned)

**File Metadata**:
```typescript
{
  id: string,
  organizationId: string,
  engagementId?: string,
  uploadedById: string,
  name: string,
  originalName: string,
  mimeType: string,
  size: number,
  path: string,
  folder: string,  // Default: "/"
  isClientVisible: boolean,  // Portal access flag
  createdAt: Date
}
```

**Client Visibility**: Files marked `isClientVisible=true` are accessible via client portal. Enforced at API layer.

**Future Enhancements (P1)**:
- Hierarchical folder structure (Cabinet/Drawer/Folder)
- Version control with change tracking
- Advanced permissions (view, download, edit, delete, share)
- Secure external sharing with expiration


## Data Models

### Core Entity Relationships

```
Organization (Tenant)
  ├── OrganizationMembers (Users)
  ├── ClientCompanies
  │     ├── Contacts
  │     ├── Deals
  │     │     ├── Proposals
  │     │     └── Contracts
  │     └── Engagements (Hub)
  │           ├── Projects
  │           │     ├── Tasks
  │           │     └── Milestones
  │           ├── Invoices
  │           ├── Files
  │           ├── Threads
  │           │     └── Messages
  │           └── ActivityEvents
  ├── Bills
  │     └── Vendors
  ├── ProjectTemplates
  └── Outbox (Events)
```

### Entity Schemas

**Organization** (Multi-tenant root):
```typescript
{
  id: string (UUID),
  name: string,
  slug: string (unique),
  logo?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**ClientCompany**:
```typescript
{
  id: string (UUID),
  organizationId: string,  // Tenant isolation
  name: string,
  website?: string,
  industry?: string,
  address?: string,
  city?: string,
  state?: string,
  zipCode?: string,
  country?: string,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Contact**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  clientCompanyId?: string,
  firstName: string,
  lastName: string,
  email?: string,
  phone?: string,
  title?: string,
  isPrimary: boolean,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Deal** (Sales Pipeline):
```typescript
{
  id: string (UUID),
  organizationId: string,
  clientCompanyId?: string,
  contactId?: string,
  ownerId: string,
  name: string,
  description?: string,
  value?: Decimal,
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost',
  probability: number (0-100),
  expectedCloseDate?: Date,
  closedAt?: Date,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Proposal**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  dealId?: string,
  clientCompanyId?: string,
  contactId?: string,
  createdById: string,
  name: string,
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired',
  content?: JSONB,  // Flexible content structure
  totalValue?: Decimal,
  validUntil?: Date,
  sentAt?: Date,
  viewedAt?: Date,
  respondedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Contract**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  proposalId?: string,
  dealId?: string,
  clientCompanyId?: string,
  contactId?: string,
  createdById: string,
  name: string,
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'cancelled',
  content?: JSONB,
  totalValue?: Decimal,
  startDate?: Date,
  endDate?: Date,
  signedAt?: Date,
  signedByName?: string,
  signatureData?: string,  // E-signature data
  createdAt: Date,
  updatedAt: Date
}
```

**Engagement** (Central Hub):
```typescript
{
  id: string (UUID),
  organizationId: string,
  contractId?: string,
  dealId?: string,
  clientCompanyId?: string,
  contactId?: string,
  ownerId: string,
  name: string,
  description?: string,
  status: 'active' | 'on_hold' | 'completed' | 'cancelled',
  startDate?: Date,
  endDate?: Date,
  totalValue?: Decimal,
  createdAt: Date,
  updatedAt: Date
}
```

**Project**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  engagementId: string,  // Required - projects belong to engagements
  templateId?: string,
  name: string,
  description?: string,
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled',
  startDate?: Date,
  dueDate?: Date,
  completedAt?: Date,
  progress: number (0-100),
  createdAt: Date,
  updatedAt: Date
}
```

**Task**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  projectId: string,
  milestoneId?: string,
  assigneeId?: string,
  name: string,
  description?: string,
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  dueDate?: Date,
  completedAt?: Date,
  sortOrder: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Milestone**:
```typescript
{
  id: string (UUID),
  projectId: string,
  name: string,
  description?: string,
  dueDate?: Date,
  completedAt?: Date,
  sortOrder: number,
  createdAt: Date
}
```

**Invoice** (Accounts Receivable):
```typescript
{
  id: string (UUID),
  organizationId: string,
  engagementId: string,
  scheduleId?: string,  // For recurring invoices
  clientCompanyId?: string,
  invoiceNumber: string,
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled',
  amount: Decimal,
  tax: Decimal,
  totalAmount: Decimal,
  lineItems?: JSONB,
  dueDate?: Date,
  sentAt?: Date,
  paidAt?: Date,
  paidAmount?: Decimal,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Bill** (Accounts Payable):
```typescript
{
  id: string (UUID),
  organizationId: string,
  engagementId?: string,
  vendorId?: string,
  createdById: string,
  billNumber: string,
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled',
  amount: Decimal,
  dueDate?: Date,
  description?: string,
  attachmentPath?: string,
  approvedById?: string,
  approvedAt?: Date,
  paidAt?: Date,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Vendor**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  name: string,
  email?: string,
  phone?: string,
  address?: string,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Thread** (Communication):
```typescript
{
  id: string (UUID),
  organizationId: string,
  engagementId: string,
  type: 'internal' | 'client',
  subject: string,
  createdById: string,
  lastMessageAt?: Date,
  createdAt: Date
}
```

**Message**:
```typescript
{
  id: string (UUID),
  threadId: string,
  senderId: string,
  senderName?: string,
  content: string,
  attachments?: JSONB,
  createdAt: Date
}
```

**ActivityEvent** (Audit Trail):
```typescript
{
  id: string (UUID),
  organizationId: string,
  entityType: string,  // 'client', 'deal', 'project', etc.
  entityId: string,
  engagementId?: string,
  actorId: string,
  actorName?: string,
  type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'signed' | 'sent' | 'viewed' | 'paid' | 'approved' | 'rejected' | 'comment',
  description?: string,
  metadata?: JSONB,
  createdAt: Date
}
```

**OutboxEvent** (Event Bus):
```typescript
{
  id: string (UUID),
  organizationId: string,
  eventType: string,  // 'deal.created', 'invoice.paid', etc.
  version: number,
  payload: JSONB,
  metadata?: JSONB,
  createdAt: Date,
  processedAt?: Date,
  retryCount: number,
  lastError?: string
}
```

**ProjectTemplate**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  name: string,
  description?: string,
  tasksTemplate?: JSONB,
  milestonesTemplate?: JSONB,
  isDefault: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**ClientPortalAccess**:
```typescript
{
  id: string (UUID),
  organizationId: string,
  engagementId: string,
  contactId: string,
  accessToken: string (unique),
  expiresAt?: Date,
  lastAccessedAt?: Date,
  createdAt: Date
}
```

### Database Indexes

**Performance Optimization**: Composite indexes on frequently queried columns.

**Key Indexes**:
- `(organizationId, id)` on all tenant-scoped tables
- `(organizationId, clientCompanyId)` on contacts, deals, engagements
- `(organizationId, engagementId)` on projects, invoices, files, threads
- `(organizationId, status)` on deals, invoices, bills
- `(organizationId, stage)` on deals
- `(projectId)` on tasks, milestones
- `(threadId)` on messages
- `(entityType, entityId)` on activity events
- `(createdAt)` on outbox where `processedAt IS NULL` (unprocessed events)

**Multi-Tenancy Performance**: All queries use `(organizationId, ...)` indexes for fast tenant-scoped lookups.

