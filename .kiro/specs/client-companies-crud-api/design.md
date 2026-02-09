# Design Document: Client Companies CRUD API

## Overview

The Client Companies CRUD API provides comprehensive management of client company records within the UBOS platform. This API serves as the foundation of the CRM domain, enabling users to create, read, update, and delete client companies with full support for pagination, search, filtering, and statistics.

**Key Features:**
- Full CRUD operations with RESTful endpoints
- Paginated list view with search and filtering
- Organization-level multi-tenancy isolation
- Relationship loading (contacts, deals, engagements)
- Aggregate statistics for dashboard views
- Cascade dependency checking for safe deletion
- Comprehensive input validation with Zod schemas

**Technology Stack:**
- Express 4 REST API endpoints
- Drizzle ORM for PostgreSQL database access
- Zod schemas for request/response validation
- Organization-scoped storage layer for multi-tenancy
- Structured error handling with security logging

**Design Philosophy:**
This API follows UBOS's modular monolith architecture with strict domain boundaries. All operations enforce organization-level isolation to ensure multi-tenant security. The design prioritizes security-by-default with comprehensive validation, structured error handling, and audit logging.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Client/Browser │
└────────┬────────┘
         │ HTTP/JSON
         ▼
┌─────────────────────────────────────────┐
│         Express Middleware Stack        │
│  ┌────────────────────────────────────┐ │
│  │  Security (Helmet, Rate Limit)     │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Authentication (requireAuth)      │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  CSRF Protection                   │ │
│  └────────────────────────────────────┘ │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      CRM Routes (server/domains/crm)    │
│  ┌────────────────────────────────────┐ │
│  │  GET    /api/clients               │ │
│  │  GET    /api/clients/stats         │ │
│  │  GET    /api/clients/:id           │ │
│  │  POST   /api/clients               │ │
│  │  PUT    /api/clients/:id           │ │
│  │  DELETE /api/clients/:id           │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Request Validation (Zod)          │ │
│  │  Error Handling                    │ │
│  │  Response Formatting               │ │
│  └────────────────────────────────────┘ │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Storage Layer (server/storage.ts)  │
│  ┌────────────────────────────────────┐ │
│  │  Organization Scoping (enforced)   │ │
│  │  Drizzle ORM Query Building        │ │
│  │  Relationship Loading              │ │
│  │  Dependency Checking               │ │
│  └────────────────────────────────────┘ │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      PostgreSQL Database                │
│  ┌────────────────────────────────────┐ │
│  │  client_companies table            │ │
│  │  contacts table                    │ │
│  │  deals table                       │ │
│  │  engagements table                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Request Flow

1. **Authentication**: `requireAuth` middleware validates session and extracts user ID
2. **Organization Resolution**: `getOrCreateOrg(userId)` retrieves user's organization ID
3. **Validation**: Zod schemas validate query parameters and request body
4. **Storage Access**: Organization-scoped storage methods query database
5. **Response**: Consistent JSON response with camelCase field names
6. **Error Handling**: Structured error handlers with security logging

### Multi-Tenancy Enforcement

Organization isolation is enforced at multiple layers:

- **Authentication Layer**: User session contains organization membership
- **Route Layer**: Every route resolves `orgId` before storage access
- **Storage Layer**: All queries include `WHERE organizationId = ?` clause
- **Database Layer**: Foreign key constraints and indexes on `organizationId`

This defense-in-depth approach ensures no cross-organization data leakage.

## Components and Interfaces

### API Endpoints

#### GET /api/clients

**Purpose**: List client companies with pagination, search, and filtering

**Query Parameters**:
```typescript
{
  page?: number;        // Page number (default: 1, min: 1)
  limit?: number;       // Items per page (default: 50, min: 1, max: 100)
  search?: string;      // Text search across multiple fields
  industry?: string;    // Filter by industry
  city?: string;        // Filter by city
  state?: string;       // Filter by state
  country?: string;     // Filter by country
}
```

**Response**:
```typescript
{
  data: ClientCompany[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

**Behavior**:
- Returns only clients belonging to authenticated user's organization
- Search performs case-insensitive partial match on: name, website, industry, city, country
- Filters use AND logic (all specified filters must match)
- Results ordered by `createdAt DESC` (newest first)

#### GET /api/clients/stats

**Purpose**: Aggregate statistics for dashboard views

**Response**:
```typescript
{
  total: number;
  recentlyAdded: number;              // Last 30 days
  byIndustry: Record<string, number>;
  byCountry: Record<string, number>;
  withActiveEngagements: number;
  withoutContacts: number;
}
```

**Behavior**:
- All statistics scoped to authenticated user's organization
- `recentlyAdded` counts clients created in last 30 days
- `byIndustry` and `byCountry` group counts by non-null values
- `withActiveEngagements` counts clients with at least one active engagement
- `withoutContacts` counts clients with zero associated contacts

#### GET /api/clients/:id

**Purpose**: Retrieve single client with related entities

**Response**:
```typescript
{
  id: string;
  organizationId: string;
  name: string;
  website: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contacts: Contact[];
  deals: Deal[];
  engagements: Engagement[];
  activeEngagementsCount: number;
  totalDealsValue: string;
}
```

**Behavior**:
- Returns 404 if client not found or belongs to different organization
- Loads all related contacts, deals, and engagements
- Calculates `activeEngagementsCount` (status = 'active')
- Calculates `totalDealsValue` (sum of all deal values)

#### POST /api/clients

**Purpose**: Create new client company

**Request Body**:
```typescript
{
  name: string;              // Required, max 255 chars
  website?: string | null;
  industry?: string | null;  // Max 100 chars
  address?: string | null;
  city?: string | null;      // Max 100 chars
  state?: string | null;     // Max 100 chars
  zipCode?: string | null;   // Max 20 chars
  country?: string | null;   // Max 100 chars
  notes?: string | null;
}
```

**Response**: Created client company (201 status)

**Behavior**:
- `organizationId` automatically set from authenticated user (request body value ignored)
- `id`, `createdAt`, `updatedAt` automatically generated
- Returns 400 if validation fails with field-level error details

#### PUT /api/clients/:id

**Purpose**: Update existing client company

**Request Body**: Same as POST, but all fields optional

**Response**: Updated client company (200 status)

**Behavior**:
- Returns 404 if client not found or belongs to different organization
- `organizationId` cannot be changed (omitted from update schema)
- `updatedAt` automatically updated
- Partial updates supported (only provided fields updated)

#### DELETE /api/clients/:id

**Purpose**: Delete client company with dependency checking

**Response**: 204 No Content on success

**Behavior**:
- Returns 404 if client not found or belongs to different organization
- Performs cascade dependency check before deletion
- Returns 409 Conflict if dependencies exist:
  ```typescript
  {
    error: string;
    dependencies: {
      contacts: number;
      deals: number;
      engagements: number;
      contracts: number;
      proposals: number;
      invoices: number;
    };
  }
  ```
- Soft delete: Sets `deletedAt` timestamp (not implemented yet, currently hard delete)

### Storage Layer Methods

The storage layer (`server/storage.ts`) provides organization-scoped data access:

```typescript
interface StorageLayer {
  // List with pagination and filtering
  getClientCompaniesPaginated(
    orgId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      industry?: string;
      city?: string;
      state?: string;
      country?: string;
    }
  ): Promise<PaginatedResult<ClientCompany>>;

  // Get single client with relations
  getClientCompanyWithRelations(
    id: string,
    orgId: string
  ): Promise<ClientCompanyWithRelations | null>;

  // Create new client
  createClientCompany(
    data: InsertClientCompany
  ): Promise<ClientCompany>;

  // Update existing client
  updateClientCompany(
    id: string,
    orgId: string,
    data: Partial<UpdateClientCompany>
  ): Promise<ClientCompany | null>;

  // Check dependencies before delete
  checkClientCompanyDependencies(
    id: string,
    orgId: string
  ): Promise<DependencyCheckResult>;

  // Delete client
  deleteClientCompany(
    id: string,
    orgId: string
  ): Promise<boolean>;

  // Get aggregate statistics
  getClientCompanyStats(
    orgId: string
  ): Promise<ClientCompanyStats>;
}
```

### Error Handling

Structured error handlers in `server/domains/crm/error-handlers.ts`:

```typescript
// Validation errors (400)
handleValidationError(
  res: Response,
  error: ZodError,
  context: ErrorContext
): void;

// Not found errors (404)
handleNotFoundError(
  res: Response,
  resourceType: string,
  context: ErrorContext
): void;

// Dependency errors (409)
handleDependencyError(
  res: Response,
  message: string,
  dependencies: DependencyCheckResult['dependencies'],
  context: ErrorContext
): void;

// Server errors (500)
handleServerError(
  res: Response,
  error: unknown,
  context: ErrorContext
): void;
```

All error handlers:
- Log errors with structured context (operation, userId, orgId, resourceId)
- Redact sensitive information from logs
- Return consistent JSON error responses
- Include appropriate HTTP status codes

## Data Models

### Database Schema

```sql
CREATE TABLE client_companies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website TEXT,
  industry VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON client_companies(organization_id);
CREATE INDEX idx_clients_industry ON client_companies(industry);
CREATE INDEX idx_clients_country ON client_companies(country);
```

### Drizzle Schema Definition

```typescript
export const clientCompanies = pgTable(
  "client_companies",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    website: text("website"),
    industry: varchar("industry", { length: 100 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    zipCode: varchar("zip_code", { length: 20 }),
    country: varchar("country", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_clients_org").on(table.organizationId),
    index("idx_clients_industry").on(table.industry),
    index("idx_clients_country").on(table.country),
  ]
);
```

### Validation Schemas

**Insert Schema** (POST /api/clients):
```typescript
export const insertClientCompanySchema = z.object({
  organizationId: z.string(),  // Set by server, not from request
  name: z.string().max(255),
  website: z.string().nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zipCode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});
```

**Update Schema** (PUT /api/clients/:id):
```typescript
export const updateClientCompanySchema = z.object({
  name: z.string().max(255).optional(),
  website: z.string().nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zipCode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});
// Note: organizationId omitted - cannot be changed
```

**Query Schema** (GET /api/clients):
```typescript
export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});
```

### Relationships

```typescript
export const clientCompaniesRelations = relations(clientCompanies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clientCompanies.organizationId],
    references: [organizations.id],
  }),
  contacts: many(contacts),
  deals: many(deals),
  engagements: many(engagements),
  proposals: many(proposals),
  contracts: many(contracts),
  invoices: many(invoices),
}));
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Organization Isolation

*For any* API operation (list, get, create, update, delete, stats) and any two different organizations, users from organization A should never be able to access, modify, or see data from organization B.

**Validates: Requirements 1.1, 1.12**

### Property 2: Pagination Correctness

*For any* dataset of client companies and any valid pagination parameters (page, limit), the returned data should contain exactly the correct slice of results, and pagination metadata should accurately reflect the total count, current page, total pages, and navigation flags.

**Validates: Requirements 1.2, 1.4**

### Property 3: Relationship Loading Completeness

*For any* client company with associated contacts, deals, and engagements, retrieving that client by ID should return all related entities without omission.

**Validates: Requirements 1.5**

### Property 4: Creation Preserves Organization

*For any* valid client company data and any authenticated user, creating a client should always assign the client to the user's organization, regardless of any organizationId value in the request body.

**Validates: Requirements 1.6**

### Property 5: Update Preserves Organization

*For any* existing client company and any valid update data, updating the client should never change its organizationId, even if organizationId is included in the request body.

**Validates: Requirements 1.7**

### Property 6: Deletion Respects Dependencies

*For any* client company, deletion should succeed if and only if the client has no dependencies (contacts, deals, engagements, contracts, proposals, invoices). If dependencies exist, deletion should fail with a 409 status and detailed dependency counts.

**Validates: Requirements 1.8**

### Property 7: Search Coverage

*For any* search query string, all returned results should contain the search term (case-insensitive) in at least one of these fields: name, website, industry, city, or country.

**Validates: Requirements 1.9**

### Property 8: Filter Conjunction

*For any* combination of filter parameters (industry, city, state, country), all returned results should match ALL specified filters (AND logic, not OR).

**Validates: Requirements 1.10**

### Property 9: Statistics Accuracy

*For any* set of client companies in an organization, the statistics endpoint should return counts that exactly match the actual data: total count, recently added count (last 30 days), counts by industry, counts by country, clients with active engagements, and clients without contacts.

**Validates: Requirements 1.11**

### Property 10: Input Validation Rejection

*For any* invalid input data (missing required fields, exceeding length limits, wrong types), the API should reject the request with a 400 status and include field-level error details from Zod validation.

**Validates: Requirements 1.13**

### Property 11: Response Format Consistency

*For any* successful API response, all field names should be in camelCase format (not snake_case), matching TypeScript conventions.

**Validates: Requirements 1.14**

## Error Handling

### Error Response Format

All errors return consistent JSON structure:

```typescript
{
  error: string;              // Human-readable error message
  details?: any;              // Additional context (validation errors, dependencies)
  code?: string;              // Machine-readable error code
}
```

### HTTP Status Codes

- **200 OK**: Successful GET, PUT operations
- **201 Created**: Successful POST operation
- **204 No Content**: Successful DELETE operation
- **400 Bad Request**: Validation errors, malformed requests
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Resource not found or cross-organization access attempt
- **409 Conflict**: Deletion blocked by dependencies
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server errors

### Validation Error Example

```json
{
  "error": "Validation failed",
  "details": {
    "name": ["Required"],
    "website": ["Invalid URL format"],
    "zipCode": ["String must contain at most 20 character(s)"]
  }
}
```

### Dependency Error Example

```json
{
  "error": "Cannot delete client with existing dependencies",
  "dependencies": {
    "contacts": 5,
    "deals": 3,
    "engagements": 2,
    "contracts": 1,
    "proposals": 2,
    "invoices": 4
  }
}
```

### Security Considerations

- Never expose internal error details to clients (stack traces, SQL queries)
- Log full error context server-side with structured logging
- Redact sensitive information from logs (PII, credentials)
- Use consistent 404 responses for both "not found" and "wrong organization" to prevent information leakage
- Rate limit all endpoints to prevent abuse

## Testing Strategy

### Dual Testing Approach

This API requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific pagination scenarios (first page, last page, empty results)
- Specific search queries (exact matches, partial matches, no matches)
- Specific validation failures (missing name, invalid URL, length violations)
- Specific dependency scenarios (client with contacts, client without dependencies)
- Integration points between routes and storage layer

**Property-Based Tests**: Verify universal properties across all inputs
- Organization isolation across random organizations and operations
- Pagination correctness across random datasets and page parameters
- Search and filter correctness across random queries and data
- Statistics accuracy across random datasets
- Input validation across random invalid inputs

Together, unit tests catch concrete bugs while property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: client-companies-crud-api, Property {number}: {property_text}`

**Example Property Test Structure**:

```typescript
import fc from 'fast-check';
import { describe, it } from 'vitest';

describe('Client Companies API - Property Tests', () => {
  // Feature: client-companies-crud-api, Property 1: Organization Isolation
  it('should enforce organization isolation for all operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgA: fc.uuid(),
          orgB: fc.uuid(),
          clientData: arbitraryClientCompany(),
        }),
        async ({ orgA, orgB, clientData }) => {
          // Test that orgA cannot access orgB's data
          // ... test implementation
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Requirements

**Unit Test Coverage**:
- All API endpoints (GET, POST, PUT, DELETE)
- All validation scenarios (valid, invalid, edge cases)
- All error conditions (404, 400, 409, 500)
- All pagination scenarios (defaults, custom, boundaries)
- All filter combinations (single, multiple, none)
- All dependency scenarios (with/without dependencies)

**Property Test Coverage**:
- All 11 correctness properties from design document
- Each property implemented as a single property-based test
- Minimum 100 iterations per property test
- Random data generation for comprehensive input coverage

### Integration Testing

**Database Integration**:
- Use test database with migrations applied
- Clean database state between tests
- Test actual Drizzle ORM queries
- Verify indexes are used for performance

**API Integration**:
- Test full request/response cycle
- Verify middleware execution order
- Test authentication and authorization
- Verify CSRF protection on state-changing endpoints

### Performance Testing

**Pagination Performance**:
- Test with large datasets (1000+ clients)
- Verify query performance with EXPLAIN ANALYZE
- Ensure indexes are used for filtering and sorting

**Search Performance**:
- Test search with various query lengths
- Verify case-insensitive search performance
- Consider full-text search for large datasets

**Statistics Performance**:
- Test with large datasets and many aggregations
- Consider caching for frequently accessed stats
- Verify query optimization for complex aggregations

---

## Implementation Notes

### Current Implementation Status

✅ **Implemented**:
- All 6 API endpoints (list, stats, get, create, update, delete)
- Organization-scoped storage layer methods
- Zod validation schemas
- Structured error handling
- Pagination with metadata
- Search and filtering
- Relationship loading
- Dependency checking
- Statistics aggregation

### Future Enhancements

**Soft Delete**:
- Add `deletedAt` timestamp column
- Filter out deleted records in queries
- Add "restore" endpoint for undeleting

**Audit Logging**:
- Log all CRUD operations to `activity_events` table
- Track who created/updated/deleted each client
- Provide audit trail for compliance

**Bulk Operations**:
- Bulk create endpoint (POST /api/clients/bulk)
- Bulk update endpoint (PUT /api/clients/bulk)
- Bulk delete endpoint (DELETE /api/clients/bulk)

**Advanced Search**:
- Full-text search with PostgreSQL tsvector
- Fuzzy matching for typo tolerance
- Search across related entities (contacts, deals)

**Export/Import**:
- CSV export endpoint
- CSV import with validation
- Excel export with formatting

**Caching**:
- Cache statistics for performance
- Cache frequently accessed clients
- Invalidate cache on updates

### Security Hardening

**Rate Limiting**:
- Per-user rate limits (already implemented globally)
- Per-organization rate limits for fairness
- Stricter limits on expensive operations (stats, search)

**Input Sanitization**:
- HTML sanitization for text fields
- URL validation for website field
- SQL injection prevention (already handled by Drizzle ORM)

**Access Control**:
- Role-based permissions (owner, admin, member, viewer)
- Field-level permissions (e.g., only admins can delete)
- Audit log for sensitive operations

### Performance Optimization

**Database Indexes**:
- Composite index on (organizationId, createdAt) for sorted lists
- Full-text index on searchable fields
- Partial index on active engagements

**Query Optimization**:
- Use `SELECT` with specific columns instead of `SELECT *`
- Batch relationship loading to avoid N+1 queries
- Use database-level aggregations for statistics

**Caching Strategy**:
- Cache statistics with 5-minute TTL
- Cache client lists with pagination key
- Invalidate cache on write operations

---

## Conclusion

The Client Companies CRUD API provides a robust, secure, and performant foundation for the UBOS CRM domain. The design enforces multi-tenant isolation at every layer, provides comprehensive validation and error handling, and supports advanced features like pagination, search, filtering, and statistics.

The dual testing approach (unit tests + property-based tests) ensures both concrete correctness and universal properties hold across all inputs. The modular architecture allows for future enhancements while maintaining backward compatibility.

This API serves as a reference implementation for other CRUD APIs in the UBOS platform, demonstrating best practices for security, validation, error handling, and testing.
