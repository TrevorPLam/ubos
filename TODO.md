# UBOS Development TODO

This document tracks the implementation roadmap for UBOS, organized by priority and domain.

## Status Legend
- ✅ Complete
- 🔄 In Progress
- ⏳ Not Started
- 🔴 Blocked

---

## Phase 1: Core Domain Implementation (Priority: HIGH)

### 1.1 CRM Domain - Complete CRUD Operations ⏳

#### 1.1.1 Client Companies
- [ ] Implement GET /api/clients (list with pagination, filtering, search)
- [ ] Implement GET /api/clients/:id (single client with relations)
- [ ] Implement POST /api/clients (create with validation)
- [ ] Implement PUT /api/clients/:id (update with validation)
- [ ] Implement DELETE /api/clients/:id (soft delete with cascade checks)
- [ ] Add client company search/filter endpoints
- [ ] Add client company statistics endpoint

#### 1.1.2 Contacts
- [ ] Implement GET /api/contacts (list with company filtering)
- [ ] Implement GET /api/contacts/:id (single contact)
- [ ] Implement POST /api/contacts (create with company association)
- [ ] Implement PUT /api/contacts/:id (update)
- [ ] Implement DELETE /api/contacts/:id (soft delete)
- [ ] Add primary contact management logic
- [ ] Add contact search across companies

#### 1.1.3 Deals (Pipeline)
- [ ] Implement GET /api/deals (list with stage filtering)
- [ ] Implement GET /api/deals/:id (single deal with relations)
- [ ] Implement POST /api/deals (create with validation)
- [ ] Implement PUT /api/deals/:id (update with stage transitions)
- [ ] Implement DELETE /api/deals/:id (soft delete)
- [ ] Add deal stage transition validation
- [ ] Add pipeline analytics endpoint (deals by stage, conversion rates)
- [ ] Add deal value calculations and forecasting

### 1.2 Agreements Domain - Proposal & Contract Flow ⏳

#### 1.2.1 Proposals
- [ ] Implement GET /api/proposals (list with status filtering)
- [ ] Implement GET /api/proposals/:id (single proposal)
- [ ] Implement POST /api/proposals (create from deal)
- [ ] Implement PUT /api/proposals/:id (update content/status)
- [ ] Implement POST /api/proposals/:id/send (send to client)
- [ ] Implement POST /api/proposals/:id/accept (client acceptance)
- [ ] Implement POST /api/proposals/:id/reject (client rejection)
- [ ] Add proposal expiration logic
- [ ] Add proposal version history

#### 1.2.2 Contracts
- [ ] Implement GET /api/contracts (list with status filtering)
- [ ] Implement GET /api/contracts/:id (single contract)
- [ ] Implement POST /api/contracts (create from proposal)
- [ ] Implement PUT /api/contracts/:id (update)
- [ ] Implement POST /api/contracts/:id/send-for-signature (e-sign integration)
- [ ] Implement POST /api/contracts/:id/sign (signature capture)
- [ ] Add contract expiration and renewal logic
- [ ] Add contract document generation

### 1.3 Engagements Domain - The Hub ⏳

#### 1.3.1 Engagement Management
- [ ] Implement GET /api/engagements (list with status filtering)
- [ ] Implement GET /api/engagements/:id (full engagement view)
- [ ] Implement POST /api/engagements (create from contract)
- [ ] Implement PUT /api/engagements/:id (update)
- [ ] Implement POST /api/engagements/:id/activate (start engagement)
- [ ] Implement POST /api/engagements/:id/complete (close engagement)
- [ ] Add engagement dashboard endpoint (projects, invoices, files)
- [ ] Add engagement timeline aggregation

### 1.4 Projects Domain - Task Management ⏳

#### 1.4.1 Project Templates
- [ ] Implement GET /api/project-templates (list)
- [ ] Implement GET /api/project-templates/:id (single template)
- [ ] Implement POST /api/project-templates (create)
- [ ] Implement PUT /api/project-templates/:id (update)
- [ ] Implement DELETE /api/project-templates/:id (delete)
- [ ] Add template instantiation logic

#### 1.4.2 Projects
- [ ] Implement GET /api/projects (list by engagement)
- [ ] Implement GET /api/projects/:id (single project with tasks)
- [ ] Implement POST /api/projects (create from template)
- [ ] Implement PUT /api/projects/:id (update)
- [ ] Implement DELETE /api/projects/:id (soft delete)
- [ ] Add project progress calculation
- [ ] Add project status transitions

#### 1.4.3 Tasks & Milestones
- [ ] Implement GET /api/tasks (list with filtering)
- [ ] Implement GET /api/tasks/:id (single task)
- [ ] Implement POST /api/tasks (create)
- [ ] Implement PUT /api/tasks/:id (update status, assignee)
- [ ] Implement DELETE /api/tasks/:id (delete)
- [ ] Implement GET /api/milestones (list by project)
- [ ] Implement POST /api/milestones (create)
- [ ] Implement PUT /api/milestones/:id (update)
- [ ] Add task dependency logic
- [ ] Add milestone completion tracking

### 1.5 Revenue Domain - AR/AP Operations ⏳

#### 1.5.1 Invoices (AR)
- [ ] Implement GET /api/invoices (list with status filtering)
- [ ] Implement GET /api/invoices/:id (single invoice)
- [ ] Implement POST /api/invoices (create)
- [ ] Implement PUT /api/invoices/:id (update)
- [ ] Implement POST /api/invoices/:id/send (send to client)
- [ ] Implement POST /api/invoices/:id/mark-paid (record payment)
- [ ] Add invoice number generation
- [ ] Add invoice PDF generation
- [ ] Add overdue invoice detection

#### 1.5.2 Invoice Schedules
- [ ] Implement GET /api/invoice-schedules (list by engagement)
- [ ] Implement POST /api/invoice-schedules (create)
- [ ] Implement PUT /api/invoice-schedules/:id (update)
- [ ] Add automated invoice generation from schedules
- [ ] Add schedule execution worker

#### 1.5.3 Bills (AP)
- [ ] Implement GET /api/bills (list with status filtering)
- [ ] Implement GET /api/bills/:id (single bill)
- [ ] Implement POST /api/bills (create)
- [ ] Implement PUT /api/bills/:id (update)
- [ ] Implement POST /api/bills/:id/approve (approval workflow)
- [ ] Implement POST /api/bills/:id/reject (rejection)
- [ ] Implement POST /api/bills/:id/mark-paid (record payment)
- [ ] Add bill approval routing logic

#### 1.5.4 Vendors
- [ ] Implement GET /api/vendors (list)
- [ ] Implement GET /api/vendors/:id (single vendor)
- [ ] Implement POST /api/vendors (create)
- [ ] Implement PUT /api/vendors/:id (update)
- [ ] Implement DELETE /api/vendors/:id (soft delete)

### 1.6 Files Domain - Document Management ⏳

#### 1.6.1 File Operations
- [ ] Implement GET /api/files (list by engagement/folder)
- [ ] Implement GET /api/files/:id (single file metadata)
- [ ] Implement POST /api/files/upload (file upload with S3/MinIO)
- [ ] Implement GET /api/files/:id/download (presigned URL generation)
- [ ] Implement DELETE /api/files/:id (delete file)
- [ ] Add folder hierarchy management
- [ ] Add file versioning
- [ ] Add client visibility toggle

#### 1.6.2 File Storage Integration
- [ ] Configure MinIO for local development
- [ ] Implement S3-compatible storage service
- [ ] Add presigned URL generation
- [ ] Add file upload validation (size, type)
- [ ] Add virus scanning integration (optional)

### 1.7 Communications Domain - Messaging ⏳

#### 1.7.1 Message Threads
- [ ] Implement GET /api/threads (list by engagement)
- [ ] Implement GET /api/threads/:id (single thread with messages)
- [ ] Implement POST /api/threads (create thread)
- [ ] Implement POST /api/threads/:id/messages (add message)
- [ ] Add thread type filtering (internal/client)
- [ ] Add unread message tracking

#### 1.7.2 Email Integration (Scaffold)
- [ ] Create email sync service interface
- [ ] Add OAuth flow for Microsoft Graph
- [ ] Add OAuth flow for Gmail
- [ ] Implement email sync worker (stub)
- [ ] Add email-to-thread linking

---

## Phase 2: Workflow & Automation (Priority: HIGH)

### 2.1 Workflow Engine - Core Implementation ⏳

#### 2.1.1 Workflow Definitions
- [ ] Define workflow schema (triggers, conditions, actions)
- [ ] Implement workflow registration system
- [ ] Add workflow execution engine
- [ ] Add workflow state persistence
- [ ] Add workflow retry logic
- [ ] Add workflow error handling

#### 2.1.2 Flagship Workflows
- [ ] **Workflow 1**: appointment.booked → create contact/client → portal user → folder → project
- [ ] **Workflow 2**: proposal.accepted → contract.send_for_signature → activate project + invoice plan
- [ ] **Workflow 3**: file.request.completed → attach to project → create review task → notify
- [ ] **Workflow 4**: milestone.completed → invoice.drafted → approval → ledger sync → notify
- [ ] **Workflow 5**: invoice.paid → update CRM status → schedule follow-up
- [ ] **Workflow 6**: bill.received → approval routing → ledger sync → status update

### 2.2 Event System - Outbox Pattern ⏳

#### 2.2.1 Event Dispatcher
- [ ] Implement event handler registration
- [ ] Add event processing worker
- [ ] Add dead-letter queue handling
- [ ] Add event replay capability
- [ ] Add event monitoring dashboard

#### 2.2.2 Domain Events
- [ ] Define canonical event types for each domain
- [ ] Implement event versioning
- [ ] Add event schema validation
- [ ] Add idempotency keys for handlers
- [ ] Add event audit trail

### 2.3 Activity Timeline - Audit Log ⏳

#### 2.3.1 Activity Tracking
- [ ] Implement activity event creation helpers
- [ ] Add automatic activity logging middleware
- [ ] Implement GET /api/activities (global timeline)
- [ ] Implement GET /api/engagements/:id/activities (engagement timeline)
- [ ] Add activity filtering and search
- [ ] Add activity aggregation for dashboards

---

## Phase 3: Frontend Integration (Priority: HIGH)

### 3.1 Data Layer - API Integration ⏳

#### 3.1.1 React Query Setup
- [ ] Create API client with authentication
- [ ] Add query hooks for all domains
- [ ] Add mutation hooks for CRUD operations
- [ ] Add optimistic updates
- [ ] Add error handling and retry logic
- [ ] Add loading states management

#### 3.1.2 Type Safety
- [ ] Generate TypeScript types from API schemas
- [ ] Add runtime validation for API responses
- [ ] Add type guards for domain entities

### 3.2 CRM Pages - Full Implementation ⏳

#### 3.2.1 Client Companies
- [ ] Build client list page with search/filter
- [ ] Build client detail page with tabs
- [ ] Build client create/edit forms
- [ ] Add client deletion confirmation
- [ ] Add client statistics cards

#### 3.2.2 Contacts
- [ ] Build contact list page
- [ ] Build contact detail page
- [ ] Build contact create/edit forms
- [ ] Add contact-to-company association UI
- [ ] Add primary contact indicator

#### 3.2.3 Deals (Pipeline)
- [ ] Build deal kanban board view
- [ ] Build deal list view with filtering
- [ ] Build deal detail page
- [ ] Build deal create/edit forms
- [ ] Add drag-and-drop stage transitions
- [ ] Add deal value forecasting charts

### 3.3 Agreements Pages ⏳

#### 3.3.1 Proposals
- [ ] Build proposal list page
- [ ] Build proposal detail/preview page
- [ ] Build proposal editor (rich text)
- [ ] Add proposal send workflow
- [ ] Add proposal status tracking

#### 3.3.2 Contracts
- [ ] Build contract list page
- [ ] Build contract detail page
- [ ] Build contract editor
- [ ] Add signature capture UI
- [ ] Add contract status timeline

### 3.4 Engagement Hub ⏳

#### 3.4.1 Engagement Dashboard
- [ ] Build engagement overview page
- [ ] Add projects widget
- [ ] Add invoices widget
- [ ] Add files widget
- [ ] Add messages widget
- [ ] Add activity timeline widget
- [ ] Add engagement metrics cards

### 3.5 Project Management Pages ⏳

#### 3.5.1 Projects
- [ ] Build project list page
- [ ] Build project detail page with tabs
- [ ] Build project create wizard
- [ ] Add project template selector
- [ ] Add project progress visualization

#### 3.5.2 Tasks
- [ ] Build task kanban board
- [ ] Build task list view
- [ ] Build task detail modal
- [ ] Build task create/edit forms
- [ ] Add task assignment UI
- [ ] Add task filtering and sorting

### 3.6 Revenue Pages ⏳

#### 3.6.1 Invoices
- [ ] Build invoice list page
- [ ] Build invoice detail page
- [ ] Build invoice create/edit forms
- [ ] Add invoice PDF preview
- [ ] Add payment recording UI
- [ ] Add invoice status badges

#### 3.6.2 Bills
- [ ] Build bill list page
- [ ] Build bill detail page
- [ ] Build bill create/edit forms
- [ ] Add bill approval workflow UI
- [ ] Add bill payment recording

### 3.7 Files & Documents ⏳

#### 3.7.1 File Management
- [ ] Build file browser with folder tree
- [ ] Add file upload with drag-and-drop
- [ ] Add file preview modal
- [ ] Add file download functionality
- [ ] Add file sharing controls
- [ ] Add client visibility toggle

### 3.8 Dashboard & Analytics ⏳

#### 3.8.1 Main Dashboard
- [ ] Build dashboard layout
- [ ] Add revenue metrics cards
- [ ] Add pipeline metrics cards
- [ ] Add recent activity feed
- [ ] Add upcoming tasks widget
- [ ] Add charts (revenue, pipeline, projects)

---

## Phase 4: Client Portal (Priority: MEDIUM)

### 4.1 Portal Access Management ⏳

#### 4.1.1 Magic Link Authentication
- [ ] Implement magic link generation
- [ ] Implement magic link validation
- [ ] Add portal session management
- [ ] Add portal access expiration
- [ ] Add portal access revocation

#### 4.1.2 Portal Routes
- [ ] Create portal layout (separate from main app)
- [ ] Add portal authentication guard
- [ ] Add portal navigation

### 4.2 Portal Features ⏳

#### 4.2.1 Client Views
- [ ] Build portal dashboard
- [ ] Build project view (read-only)
- [ ] Build task view (with status updates)
- [ ] Build file browser (client-visible only)
- [ ] Build invoice view
- [ ] Build message thread view

#### 4.2.2 Client Actions
- [ ] Add task status update capability
- [ ] Add file upload capability
- [ ] Add message sending capability
- [ ] Add invoice payment initiation

---

## Phase 5: Integrations (Priority: MEDIUM)

### 5.1 Email Integration ⏳

#### 5.1.1 Microsoft Graph
- [ ] Implement OAuth 2.0 flow
- [ ] Add token storage and refresh
- [ ] Implement email sync service
- [ ] Add email-to-thread mapping
- [ ] Add send email capability

#### 5.1.2 Gmail API
- [ ] Implement OAuth 2.0 flow
- [ ] Add token storage and refresh
- [ ] Implement email sync service
- [ ] Add email-to-thread mapping
- [ ] Add send email capability

### 5.2 Accounting/Ledger Integration ⏳

#### 5.2.1 QuickBooks Online
- [ ] Create integration interface
- [ ] Implement OAuth flow
- [ ] Add invoice sync (UBOS → QBO)
- [ ] Add payment sync (QBO → UBOS)
- [ ] Add bill sync
- [ ] Add vendor sync
- [ ] Add mapping configuration UI

#### 5.2.2 Xero
- [ ] Create integration interface
- [ ] Implement OAuth flow
- [ ] Add invoice sync
- [ ] Add payment sync
- [ ] Add bill sync
- [ ] Add vendor sync
- [ ] Add mapping configuration UI

### 5.3 E-Signature Integration ⏳

#### 5.3.1 DocuSign
- [ ] Create integration interface
- [ ] Implement OAuth flow
- [ ] Add envelope creation
- [ ] Add webhook receiver
- [ ] Add signature status tracking

#### 5.3.2 Dropbox Sign (HelloSign)
- [ ] Create integration interface
- [ ] Implement API authentication
- [ ] Add signature request creation
- [ ] Add webhook receiver
- [ ] Add signature status tracking

### 5.4 Integration Health Dashboard ⏳

#### 5.4.1 Health Monitoring
- [ ] Build integration status page
- [ ] Add last sync timestamp tracking
- [ ] Add error logging and display
- [ ] Add reauthorization flow
- [ ] Add manual sync triggers
- [ ] Add integration metrics

---

## Phase 6: Search & Discovery (Priority: MEDIUM)

### 6.1 Global Search ⏳

#### 6.1.1 Search Implementation
- [ ] Implement Postgres full-text search
- [ ] Add search indexing for all entities
- [ ] Create unified search endpoint
- [ ] Add search result ranking
- [ ] Add search filters by entity type

#### 6.1.2 Command Palette
- [ ] Build command palette UI (Cmd+K)
- [ ] Add quick navigation commands
- [ ] Add quick action commands
- [ ] Add search integration
- [ ] Add keyboard shortcuts

### 6.2 Advanced Search ⏳

#### 6.2.1 Search Features
- [ ] Add saved searches
- [ ] Add search history
- [ ] Add advanced filters
- [ ] Add search suggestions
- [ ] Add search analytics

---

## Phase 7: Testing & Quality (Priority: HIGH)

### 7.1 Backend Testing ⏳

#### 7.1.1 Integration Tests
- [ ] Add tests for CRM endpoints
- [ ] Add tests for agreements endpoints
- [ ] Add tests for engagements endpoints
- [ ] Add tests for projects endpoints
- [ ] Add tests for revenue endpoints
- [ ] Add tests for files endpoints
- [ ] Add tests for workflow execution

#### 7.1.2 E2E Tests
- [ ] Add deal-to-engagement flow test
- [ ] Add proposal-to-contract flow test
- [ ] Add invoice generation flow test
- [ ] Add bill approval flow test

### 7.2 Frontend Testing ⏳

#### 7.2.1 Component Tests
- [ ] Add tests for form components
- [ ] Add tests for data tables
- [ ] Add tests for charts
- [ ] Add tests for modals/dialogs

#### 7.2.2 Integration Tests
- [ ] Add tests for page flows
- [ ] Add tests for API integration
- [ ] Add tests for authentication
- [ ] Add tests for error handling

### 7.3 Performance Testing ⏳

#### 7.3.1 Load Testing
- [ ] Add load tests for API endpoints
- [ ] Add database query optimization
- [ ] Add caching strategy
- [ ] Add pagination optimization

---

## Phase 8: DevOps & Deployment (Priority: MEDIUM)

### 8.1 Database Migrations ⏳

#### 8.1.1 Migration System
- [ ] Set up Drizzle migrations
- [ ] Create initial migration from schema
- [ ] Add migration rollback capability
- [ ] Add migration testing
- [ ] Document migration process

### 8.2 Docker & Compose ⏳

#### 8.2.1 Containerization
- [ ] Create Dockerfile for backend
- [ ] Create Dockerfile for frontend
- [ ] Create docker-compose.yml (postgres, redis, minio)
- [ ] Add development docker-compose
- [ ] Add production docker-compose
- [ ] Document Docker setup

### 8.3 CI/CD Pipeline ⏳

#### 8.3.1 GitHub Actions
- [ ] Add lint workflow
- [ ] Add test workflow
- [ ] Add build workflow
- [ ] Add security scan workflow
- [ ] Add deployment workflow

### 8.4 Monitoring & Observability ⏳

#### 8.4.1 Logging
- [ ] Add structured logging
- [ ] Add log aggregation
- [ ] Add log search capability

#### 8.4.2 Metrics
- [ ] Add application metrics
- [ ] Add database metrics
- [ ] Add API performance metrics
- [ ] Add error rate tracking

#### 8.4.3 Alerting
- [ ] Add error alerting
- [ ] Add performance alerting
- [ ] Add uptime monitoring

---

## Phase 9: Documentation (Priority: MEDIUM)

### 9.1 API Documentation ⏳

#### 9.1.1 OpenAPI Spec
- [ ] Generate OpenAPI spec from routes
- [ ] Add endpoint descriptions
- [ ] Add request/response examples
- [ ] Add authentication documentation
- [ ] Set up API documentation UI (Swagger/Redoc)

### 9.2 Developer Documentation ⏳

#### 9.2.1 Guides
- [ ] Write local development setup guide
- [ ] Write database schema documentation
- [ ] Write API integration guide
- [ ] Write testing guide
- [ ] Write deployment guide

### 9.3 User Documentation ⏳

#### 9.3.1 User Guides
- [ ] Write user onboarding guide
- [ ] Write feature documentation
- [ ] Write workflow guides
- [ ] Write troubleshooting guide

---

## Phase 10: Polish & Optimization (Priority: LOW)

### 10.1 UI/UX Improvements ⏳

#### 10.1.1 Enhancements
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error boundaries
- [ ] Add toast notifications
- [ ] Add confirmation dialogs
- [ ] Add keyboard shortcuts
- [ ] Add accessibility improvements

### 10.2 Performance Optimization ⏳

#### 10.2.1 Frontend
- [ ] Add code splitting
- [ ] Add lazy loading
- [ ] Add image optimization
- [ ] Add bundle size optimization

#### 10.2.2 Backend
- [ ] Add database query optimization
- [ ] Add caching layer (Redis)
- [ ] Add rate limiting per user
- [ ] Add connection pooling

### 10.3 Security Hardening ⏳

#### 10.3.1 Additional Security
- [ ] Add rate limiting per endpoint
- [ ] Add request signing
- [ ] Add API key management
- [ ] Add audit log export
- [ ] Add security headers review
- [ ] Add penetration testing

---

## Notes

- **Priority Levels**: HIGH = Core functionality, MEDIUM = Important but not blocking, LOW = Nice to have
- **Dependencies**: Some tasks depend on others (e.g., frontend pages depend on backend APIs)
- **Parallel Work**: Many domains can be developed in parallel by different team members
- **Testing**: Add tests as you implement features, not as a separate phase

## Progress Tracking

- Total Tasks: ~300+
- Completed: 0
- In Progress: 0
- Not Started: ~300+

Last Updated: 2026-02-07
