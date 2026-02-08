# Design Document: Client Companies CRUD API

## Overview

The Client Companies CRUD API provides comprehensive REST endpoints for managing client company records within the UBOS CRM domain. This design extends the existing basic CRUD operations in `server/domains/crm/routes.ts` to include advanced features such as pagination, filtering, search, statistics, and soft delete with cascade checks.

The API follows the established patterns in the UBOS codebase:
- Organization-scoped queries via the storage layer
- Zod schema validation for all inputs
- Express middleware for authentication and security
- Consistent error handling and response formats
- Integration with the existing multi-tenant architecture

This design maintains backward compatibility with existing client company endpoints while adding new capabilities required for a production-ready CRM system.

## Architecture

### Layered Architecture

The implementation follows a three-layer architecture consistent with the existing UBOS structure:

```
┌─────────────────────────────────────┐
│   API Layer (Express Routes)        │
│   - Request validation               │
│   - Authentication/Authorization     │
│   - Response formatting              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Storage Layer (DatabaseStorage)   │
│   - Organization scoping             │
│   - Database queries (Drizzle ORM)   │
│   - Transaction management           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Database (PostgreSQL)              │
│   - Multi-tenant data isolation      │
│   - Referential integrity            │
└─────────────────────────────────────┘
```

### Request Flow

1. **Authentication**: `requireAuth` middleware validates the user session
2. **Organization Resolution**: `getOrCreateOrg` retrieves the user's organization ID
3. **Input Validation**: Zod schemas validate request body/query parameters
4. **Storage Operation**: Storage layer executes org-scoped database query
5. **Response Formatting**: Results are serialized to JSON with consistent structure
6. **Error Handling**: Errors are caught, logged, and returned with appropriate status codes

### Multi-Tenancy Enforcement

All operations enforce organization-level isolation through:
- Storage layer methods that require `orgId` parameter
- Database queries that include `WHERE organizationId = ?` clauses
- Validation that prevents cross-organization data access

## Components and Interfaces

### API Endpoints

#### GET /api/clients
Lists client companies with pagination, filtering, and search.

**Query Parameters:**
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 50, max: 100)
  search?: string;      // Search across name, website, industry, city, country
  industry?: string;    // Filter by industry
  city?: string;        // Filter by city
  state?: string;       // Filter by state
  country?: string;     // Filter by country
}
```

**Response:**
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
  }
}
```

#### GET /api/clients/:id
Retrieves a single client company with related entities.

**Response:**
```typescript
{
  ...ClientCompany,
  contacts: Contact[];
  deals: Deal[];
  engagements: Engagement[];
  activeEngagementsCount: number;
  totalDealsValue: number;
}
```

#### POST /api/clients
Creates a new client company.

**Request Body:**
```typescript
{
  name: string;              // Required
  website?: string | null;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  notes?: string | null;
}
```

**Response:** Created ClientCompany with 201 status

#### PUT /api/clients/:id
Updates an existing client company.

**Request Body:** Same as POST (all fields optional)

**Response:** Updated ClientCompany with 200 status

#### DELETE /api/clients/:id
Soft deletes a client company after cascade checks.

**Response:**
- 204 No Content (success)
- 409 Conflict with details about dependent entities

#### GET /api/clients/stats
Retrieves aggregate statistics about client companies.

**Response:**
```typescript
{
  total: number;
  recentlyAdded: number;        // Last 30 days
  byIndustry: Record<string, number>;
  byCountry: Record<string, number>;
  withActiveEngagements: number;
  withoutContacts: number;
}
```

### Storage Layer Extensions

The storage layer (`server/storage.ts`) will be extended with new methods:

```typescript
interface IStorage {
  // Existing methods
  getClientCompanies(orgId: string): Promise<ClientCompany[]>;
  getClientCompany(id: string, orgId: string): Promise<ClientCompany | undefined>;
  createClientCompany(data: InsertClientCompany): Promise<ClientCompany>;
  updateClientCompany(id: string, orgId: string, data: Partial<InsertClientCompany>): Promise<ClientCompany | undefined>;
  deleteClientCompany(id: string, orgId: string): Promise<boolean>;
  
  // New methods to add
  getClientCompaniesPaginated(
    orgId: string,
    options: PaginationOptions & FilterOptions
  ): Promise<PaginatedResult<ClientCompany>>;
  
  getClientCompanyWithRelations(
    id: string,
    orgId: string
  ): Promise<ClientCompanyWithRelations | undefined>;
  
  checkClientCompanyDependencies(
    id: string,
    orgId: string
  ): Promise<DependencyCheckResult>;
  
  getClientCompanyStats(orgId: string): Promise<ClientCompanyStats>;
}
```

### Data Types

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
}

interface FilterOptions {
  search?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ClientCompanyWithRelations extends ClientCompany {
  contacts: Contact[];
  deals: Deal[];
  engagements: Engagement[];
  activeEngagementsCount: number;
  totalDealsValue: number;
}

interface DependencyCheckResult {
  hasDependencies: boolean;
  dependencies: {
    contacts: number;
    deals: number;
    engagements: number;
    contracts: number;
    proposals: number;
    invoices: number;
  };
}

interface ClientCompanyStats {
  total: number;
  recentlyAdded: number;
  byIndustry: Record<string, number>;
  byCountry: Record<string, number>;
  withActiveEngagements: number;
  withoutContacts: number;
}
```

### Validation Schemas

Extend the existing Zod schemas in `shared/schema.ts`:

```typescript
// Query parameter validation
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const clientFilterQuerySchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

const clientListQuerySchema = paginationQuerySchema.merge(clientFilterQuerySchema);

// Update schema (all fields optional)
const updateClientCompanySchema = insertClientCompanySchema.partial().omit({
  organizationId: true,
});
```

## Data Models

### Database Schema

The existing `clientCompanies` table in `shared/schema.ts` already provides the necessary structure:

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
  (table) => [index("idx_clients_org").on(table.organizationId)],
);
```

### Indexes for Performance

Additional indexes should be added to support filtering and search operations:

```typescript
// Add to clientCompanies table definition
index("idx_clients_industry").on(table.industry),
index("idx_clients_country").on(table.country),
index("idx_clients_created_at").on(table.createdAt),
```

For full-text search across multiple fields, we'll use SQL ILIKE queries with OR conditions. For production scale, consider adding a PostgreSQL full-text search index or using a dedicated search service.

### Relationships

Client companies have the following relationships (already defined in schema):

- **One-to-Many with Contacts**: A client company can have multiple contacts
- **One-to-Many with Deals**: A client company can have multiple deals
- **One-to-Many with Engagements**: A client company can have multiple engagements
- **One-to-Many with Contracts**: A client company can have multiple contracts (via deals)
- **One-to-Many with Proposals**: A client company can have multiple proposals (via deals)
- **One-to-Many with Invoices**: A client company can have multiple invoices (via engagements)

### Soft Delete Strategy

Instead of implementing a traditional soft delete with a `deletedAt` column, this design uses a **cascade check and hard delete** approach:

1. Check for dependent entities before deletion
2. If dependencies exist, return 409 Conflict with details
3. If no dependencies, perform hard delete
4. User must manually remove dependencies before deleting the client company

This approach:
- Maintains referential integrity
- Prevents orphaned data
- Provides clear feedback to users about why deletion failed
- Avoids complexity of filtering out soft-deleted records in all queries

**Alternative:** If soft delete is required, add a `deletedAt` timestamp column and update all queries to filter `WHERE deletedAt IS NULL`.

## Data Models

### Query Patterns

#### Paginated List with Filters

```typescript
// Drizzle query structure
const query = db
  .select()
  .from(clientCompanies)
  .where(
    and(
      eq(clientCompanies.organizationId, orgId),
      search ? or(
        ilike(clientCompanies.name, `%${search}%`),
        ilike(clientCompanies.website, `%${search}%`),
        ilike(clientCompanies.industry, `%${search}%`),
        ilike(clientCompanies.city, `%${search}%`),
        ilike(clientCompanies.country, `%${search}%`)
      ) : undefined,
      industry ? eq(clientCompanies.industry, industry) : undefined,
      city ? eq(clientCompanies.city, city) : undefined,
      state ? eq(clientCompanies.state, state) : undefined,
      country ? eq(clientCompanies.country, country) : undefined
    )
  )
  .orderBy(desc(clientCompanies.createdAt))
  .limit(limit)
  .offset((page - 1) * limit);
```

#### Client with Relations

```typescript
// Use Promise.all for parallel queries
const [client, contacts, deals, engagements] = await Promise.all([
  db.select().from(clientCompanies).where(
    and(
      eq(clientCompanies.id, id),
      eq(clientCompanies.organizationId, orgId)
    )
  ).limit(1),
  db.select().from(contacts).where(
    and(
      eq(contacts.clientCompanyId, id),
      eq(contacts.organizationId, orgId)
    )
  ),
  db.select().from(deals).where(
    and(
      eq(deals.clientCompanyId, id),
      eq(deals.organizationId, orgId)
    )
  ),
  db.select().from(engagements).where(
    and(
      eq(engagements.clientCompanyId, id),
      eq(engagements.organizationId, orgId)
    )
  )
]);
```

#### Dependency Check

```typescript
// Count related entities
const [contactsCount, dealsCount, engagementsCount, contractsCount, proposalsCount, invoicesCount] = await Promise.all([
  db.select({ count: count() }).from(contacts).where(eq(contacts.clientCompanyId, id)),
  db.select({ count: count() }).from(deals).where(eq(deals.clientCompanyId, id)),
  db.select({ count: count() }).from(engagements).where(eq(engagements.clientCompanyId, id)),
  db.select({ count: count() }).from(contracts).where(eq(contracts.clientCompanyId, id)),
  db.select({ count: count() }).from(proposals).where(eq(proposals.clientCompanyId, id)),
  db.select({ count: count() }).from(invoices).where(eq(invoices.clientCompanyId, id))
]);
```

#### Statistics Aggregation

```typescript
// Use SQL aggregation functions
const stats = await db
  .select({
    total: count(),
    industry: clientCompanies.industry,
    country: clientCompanies.country,
  })
  .from(clientCompanies)
  .where(eq(clientCompanies.organizationId, orgId))
  .groupBy(clientCompanies.industry, clientCompanies.country);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Organization Isolation

*For any* API request to any client company endpoint, the response SHALL only include client companies and related entities that belong to the authenticated user's organization, never exposing data from other organizations.

**Validates: Requirements 1.5, 2.5, 5.6, 7.6**

### Property 2: Pagination Correctness

*For any* valid pagination parameters (page, limit) and any set of client companies, the API SHALL return exactly the correct slice of data corresponding to the requested page, with the number of items not exceeding the specified limit.

**Validates: Requirements 1.2**

### Property 3: Pagination Metadata Accuracy

*For any* paginated response, the pagination metadata (total, page, limit, totalPages, hasNext, hasPrev) SHALL accurately reflect the current page position and total dataset size.

**Validates: Requirements 1.4**

### Property 4: Client Retrieval with Relations

*For any* client company that exists in an organization, retrieving it by ID SHALL return the client along with all its related contacts and deals that belong to the same organization.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 5: Cross-Organization Access Prevention

*For any* client company ID that does not exist or belongs to a different organization, GET, PUT, and DELETE requests SHALL return a 404 error, preventing cross-organization data access.

**Validates: Requirements 2.4, 4.4, 5.4**

### Property 6: Create with Organization Assignment

*For any* valid client company data in a POST request, the created client company SHALL have its organizationId set to the authenticated user's organization, regardless of any organizationId value in the request body.

**Validates: Requirements 3.1, 3.4**

### Property 7: Input Validation

*For any* API endpoint that accepts input, invalid data SHALL be rejected with a 400 error containing specific field-level validation error messages from the Zod schema.

**Validates: Requirements 3.2, 3.3, 4.2, 4.3, 8.1, 8.2**

### Property 8: Automatic Timestamp Management

*For any* client company creation or update operation, the system SHALL automatically set createdAt on creation and update updatedAt on both creation and modification, without requiring these fields in the request.

**Validates: Requirements 3.6, 4.5**

### Property 9: Update Preserves Organization

*For any* valid update to an existing client company, the organizationId SHALL remain unchanged, preventing clients from being moved between organizations.

**Validates: Requirements 4.1**

### Property 10: Cascade Check Before Delete

*For any* client company, a DELETE request SHALL first check for related entities (contacts, deals, engagements, contracts, proposals, invoices), and if any exist, SHALL return a 409 error with details about the dependencies.

**Validates: Requirements 5.1, 5.2**

### Property 11: Successful Delete Response

*For any* client company with no dependencies, a successful DELETE request SHALL return a 204 status code with no response body.

**Validates: Requirements 5.3, 5.5**

### Property 12: Search Across Multiple Fields

*For any* search query string, the API SHALL return client companies where the search term matches (case-insensitive) any of the following fields: name, website, industry, city, or country.

**Validates: Requirements 6.1, 6.6**

### Property 13: Filter Combination with AND Logic

*For any* combination of filter parameters (industry, city, state, country), the API SHALL return only client companies that match ALL specified filters.

**Validates: Requirements 6.2, 6.3**

### Property 14: Search and Filter Combination

*For any* request that includes both search and filter parameters, the API SHALL return only client companies that match the search query AND all specified filters.

**Validates: Requirements 6.4**

### Property 15: Pagination with Search and Filters

*For any* search and filter combination, the results SHALL be paginated correctly with accurate pagination metadata reflecting the filtered result set size.

**Validates: Requirements 6.5**

### Property 16: Statistics Completeness

*For any* organization, the statistics endpoint SHALL return a response containing all required fields: total count, recently added count, breakdown by industry, breakdown by country, count with active engagements, and count without contacts.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 17: Authentication Required

*For any* API endpoint, requests without valid authentication SHALL be rejected before processing, enforcing the requireAuth middleware.

**Validates: Requirements 8.5**

### Property 18: Error Status Codes

*For any* error condition, the API SHALL return the appropriate HTTP status code: 400 for validation errors, 404 for not found, 409 for conflicts, and 500 for server errors.

**Validates: Requirements 9.2**

### Property 19: Error Response Format

*For any* error response, the response SHALL be JSON format containing an "error" field with a descriptive message, and SHALL NOT expose sensitive information such as stack traces or database details.

**Validates: Requirements 9.3, 9.4, 10.6**

### Property 20: Success Response Format

*For any* successful API response, the response SHALL be JSON with appropriate content-type headers, use camelCase field naming, include timestamps in ISO 8601 format, return null for missing optional fields, and return empty arrays [] for empty collections.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

## Error Handling

### Error Categories

The API implements comprehensive error handling across four categories:

#### 1. Validation Errors (400 Bad Request)

Triggered when:
- Required fields are missing
- Field values don't match expected types
- Field values violate constraints (e.g., negative numbers, invalid formats)
- Query parameters are malformed

Response format:
```typescript
{
  error: "Validation failed",
  details: [
    { field: "name", message: "Required" },
    { field: "email", message: "Invalid email format" }
  ]
}
```

Implementation:
- Use Zod's `.safeParse()` method to validate inputs
- Extract and format Zod error messages for client consumption
- Return early before database operations

#### 2. Not Found Errors (404 Not Found)

Triggered when:
- Client company ID doesn't exist
- Client company exists but belongs to different organization
- Attempting to update/delete non-existent client

Response format:
```typescript
{
  error: "Client not found"
}
```

Implementation:
- Check query results for undefined/null
- Verify organization ownership before operations
- Return 404 for both non-existent and cross-organization access (security through obscurity)

#### 3. Conflict Errors (409 Conflict)

Triggered when:
- Attempting to delete client with dependencies
- Business rule violations

Response format:
```typescript
{
  error: "Cannot delete client with existing dependencies",
  dependencies: {
    contacts: 5,
    deals: 3,
    engagements: 2,
    contracts: 1,
    proposals: 2,
    invoices: 4
  }
}
```

Implementation:
- Perform dependency checks before destructive operations
- Return detailed information about blocking dependencies
- Allow user to make informed decisions about cleanup

#### 4. Server Errors (500 Internal Server Error)

Triggered when:
- Database connection failures
- Unexpected exceptions
- System-level errors

Response format:
```typescript
{
  error: "An unexpected error occurred"
}
```

Implementation:
- Catch all unhandled exceptions in route handlers
- Log full error details server-side with context
- Return generic message to client (don't leak internals)
- Use structured logging for debugging

### Error Handling Pattern

All route handlers follow this pattern:

```typescript
try {
  // 1. Authenticate and get organization
  const userId = getUserIdFromRequest(req)!;
  const orgId = await getOrCreateOrg(userId);
  
  // 2. Validate input
  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: formatZodErrors(validation.error)
    });
  }
  
  // 3. Perform operation
  const result = await storage.operation(orgId, validation.data);
  
  // 4. Check result
  if (!result) {
    return res.status(404).json({ error: "Resource not found" });
  }
  
  // 5. Return success
  res.status(200).json(result);
  
} catch (error) {
  // 6. Handle unexpected errors
  console.error("Operation error:", error);
  res.status(500).json({ error: "An unexpected error occurred" });
}
```

### Logging Strategy

All errors are logged with structured context:

```typescript
logger.error("Client company operation failed", {
  operation: "create",
  userId,
  orgId,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

Sensitive data (passwords, tokens, PII) is redacted from logs using the existing `server/security-utils.ts` utilities.

## Testing Strategy

### Dual Testing Approach

The implementation requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples demonstrating correct behavior
- Edge cases (empty strings, null values, boundary conditions)
- Error conditions (invalid IDs, missing fields, malformed data)
- Integration points between API layer and storage layer
- Authentication and authorization flows

**Property-Based Tests:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each property test references its design document property

### Property-Based Testing Library

Use **fast-check** for TypeScript property-based testing:

```bash
npm install --save-dev fast-check
```

fast-check provides:
- Generators for primitive types (strings, numbers, booleans)
- Combinators for complex types (objects, arrays)
- Shrinking to find minimal failing examples
- Configurable iteration counts
- Integration with Vitest

### Test Organization

Tests are colocated with source files:

```
server/domains/crm/
├── routes.ts
├── routes.test.ts           # Unit tests
├── routes.properties.test.ts # Property-based tests
├── storage-extensions.ts
└── storage-extensions.test.ts
```

### Property Test Configuration

Each property test must:
1. Run minimum 100 iterations (configured in fast-check)
2. Include a comment tag referencing the design property
3. Use appropriate generators for input data
4. Assert the property holds for all generated inputs

Example property test structure:

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Client Companies API - Property Tests', () => {
  // Feature: client-companies-crud-api, Property 1: Organization Isolation
  it('should never return clients from other organizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgId: fc.uuid(),
          otherOrgId: fc.uuid(),
          clientData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }),
            industry: fc.option(fc.string({ maxLength: 100 })),
          })
        }),
        async ({ orgId, otherOrgId, clientData }) => {
          // Setup: Create client in otherOrgId
          const client = await storage.createClientCompany({
            ...clientData,
            organizationId: otherOrgId
          });
          
          // Test: Query from orgId should not return the client
          const clients = await storage.getClientCompanies(orgId);
          
          // Assert: Client from other org is not in results
          expect(clients.find(c => c.id === client.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage

Unit tests should cover:

1. **Happy Path Examples:**
   - Create client with minimal required fields
   - Create client with all optional fields
   - Update client with partial data
   - Delete client with no dependencies
   - List clients with default pagination
   - Search clients by name
   - Filter clients by industry

2. **Edge Cases:**
   - Empty search query
   - Page number beyond available pages
   - Limit of 1 and limit of 100
   - Client with no contacts or deals
   - Client with many related entities
   - Special characters in search queries
   - Unicode characters in client names

3. **Error Cases:**
   - Create with missing required field (name)
   - Create with invalid field types
   - Update non-existent client
   - Delete client with dependencies
   - Get client from different organization
   - Invalid pagination parameters (negative, zero)
   - Malformed query parameters

4. **Integration Tests:**
   - Full CRUD cycle (create, read, update, delete)
   - Pagination across multiple pages
   - Search with filters combined
   - Statistics calculation accuracy
   - Cascade check with multiple dependency types

### Test Data Management

Use factories for generating test data:

```typescript
// test-helpers/factories.ts
export const createTestClient = (overrides = {}) => ({
  name: 'Test Client Inc',
  website: 'https://example.com',
  industry: 'Technology',
  city: 'San Francisco',
  state: 'CA',
  country: 'USA',
  ...overrides
});

export const createTestOrganization = (overrides = {}) => ({
  name: 'Test Organization',
  slug: 'test-org',
  ...overrides
});
```

### Mocking Strategy

- Mock the storage layer for API route tests
- Use real database for storage layer tests (with test database)
- Mock authentication middleware for isolated route testing
- Use MSW (Mock Service Worker) for frontend integration tests

### Test Execution

```bash
# Run all tests
npm test

# Run only backend tests
npm run test:backend

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run coverage
```

### Coverage Goals

- Line coverage: > 80%
- Branch coverage: > 75%
- Function coverage: > 90%
- Property tests: 100% of identified properties implemented

### Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Every pull request (GitHub Actions)
- Before deployment (CI/CD pipeline)

Failed tests block merging and deployment.
