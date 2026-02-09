# Client Companies API

## Overview

The Client Companies API provides comprehensive CRUD operations for managing client company records within the UBOS CRM domain. This API supports pagination, filtering, search, statistics, and safe deletion with cascade checks.

**Base Path:** `/api/clients`

**Authentication:** All endpoints require authentication via the `requireAuth` middleware. Authentication is provided through:
- `x-user-id` header, OR
- `ubos_user_id` HttpOnly cookie

**Organization Isolation:** All operations are automatically scoped to the authenticated user's organization. Users can only access client companies that belong to their organization.

**Response Format:** All responses are JSON with `Content-Type: application/json`. Field names use camelCase. Timestamps are in ISO 8601 format. Optional fields return `null` when empty. Empty collections return `[]`.

## Table of Contents

- [List Client Companies](#list-client-companies)
- [Get Client Company by ID](#get-client-company-by-id)
- [Create Client Company](#create-client-company)
- [Update Client Company](#update-client-company)
- [Delete Client Company](#delete-client-company)
- [Get Client Statistics](#get-client-statistics)
- [Error Responses](#error-responses)
- [Query Parameters](#query-parameters)

---

## List Client Companies

Retrieve a paginated list of client companies with optional filtering and search.

**Endpoint:** `GET /api/clients`

**Query Parameters:**

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `page` | integer | No | 1 | - | Page number (must be positive) |
| `limit` | integer | No | 50 | 100 | Items per page (must be positive) |
| `search` | string | No | - | - | Search across name, website, industry, city, country (case-insensitive) |
| `industry` | string | No | - | - | Filter by industry (exact match, case-insensitive) |
| `city` | string | No | - | - | Filter by city (exact match, case-insensitive) |
| `state` | string | No | - | - | Filter by state (exact match, case-insensitive) |
| `country` | string | No | - | - | Filter by country (exact match, case-insensitive) |

**Filter Logic:**
- Multiple filters are combined with AND logic (all must match)
- Search and filters can be combined (search AND all filters must match)
- Search uses OR logic across fields (matches any of: name, website, industry, city, country)

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "organizationId": "org-123",
      "name": "Acme Corporation",
      "website": "https://acme.com",
      "industry": "Technology",
      "address": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94105",
      "country": "USA",
      "notes": "Key client for enterprise solutions",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Pagination Metadata:**
- `total`: Total number of client companies matching the filters
- `page`: Current page number
- `limit`: Number of items per page
- `totalPages`: Total number of pages available
- `hasNext`: Boolean indicating if there's a next page
- `hasPrev`: Boolean indicating if there's a previous page

**Examples:**

```bash
# Get first page with default limit (50)
GET /api/clients

# Get page 2 with 25 items per page
GET /api/clients?page=2&limit=25

# Search for clients containing "tech"
GET /api/clients?search=tech

# Filter by industry
GET /api/clients?industry=Technology

# Combine search and filters
GET /api/clients?search=acme&country=USA&industry=Technology

# Multiple filters with pagination
GET /api/clients?industry=Healthcare&state=CA&page=1&limit=20
```

---

## Get Client Company by ID

Retrieve a single client company with all related entities (contacts, deals, engagements).

**Endpoint:** `GET /api/clients/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Client company ID |

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-123",
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "country": "USA",
  "notes": "Key client for enterprise solutions",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z",
  "contacts": [
    {
      "id": "contact-1",
      "clientCompanyId": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@acme.com",
      "phone": "+1-555-0100",
      "title": "CTO",
      "isPrimary": true,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "deals": [
    {
      "id": "deal-1",
      "clientCompanyId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Q1 Enterprise License",
      "value": 50000,
      "stage": "negotiation",
      "probability": 75,
      "expectedCloseDate": "2024-03-31",
      "createdAt": "2024-01-16T09:00:00.000Z",
      "updatedAt": "2024-01-25T16:30:00.000Z"
    }
  ],
  "engagements": [
    {
      "id": "engagement-1",
      "clientCompanyId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Implementation Project",
      "status": "active",
      "startDate": "2024-02-01",
      "endDate": "2024-06-30",
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "activeEngagementsCount": 1,
  "totalDealsValue": 50000
}
```

**Response Fields:**
- All client company fields (see List endpoint)
- `contacts`: Array of contact records associated with this client
- `deals`: Array of deal records associated with this client
- `engagements`: Array of engagement records associated with this client
- `activeEngagementsCount`: Number of engagements with status = 'active'
- `totalDealsValue`: Sum of all deal values for this client

**Error Responses:**
- `404 Not Found`: Client company does not exist or belongs to a different organization

**Examples:**

```bash
# Get client by ID
GET /api/clients/550e8400-e29b-41d4-a716-446655440000
```

---

## Create Client Company

Create a new client company in the authenticated user's organization.

**Endpoint:** `POST /api/clients`

**Request Body:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "country": "USA",
  "notes": "Key client for enterprise solutions"
}
```

**Request Body Schema:**

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `name` | string | **Yes** | 255 | Client company name |
| `website` | string | No | - | Company website URL |
| `industry` | string | No | 100 | Industry classification |
| `address` | string | No | - | Street address |
| `city` | string | No | 100 | City |
| `state` | string | No | 100 | State or province |
| `zipCode` | string | No | 20 | Postal/ZIP code |
| `country` | string | No | 100 | Country |
| `notes` | string | No | - | Additional notes |

**Important Notes:**
- `organizationId` is automatically set from the authenticated user and cannot be specified in the request
- `createdAt` and `updatedAt` timestamps are automatically set
- `id` is automatically generated as a UUID

**Success Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-123",
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "country": "USA",
  "notes": "Key client for enterprise solutions",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed (see validation error format below)

**Validation Rules:**
- `name` is required and cannot be empty
- All string fields are trimmed of leading/trailing whitespace
- Optional fields can be omitted or set to `null`

**Examples:**

```bash
# Create with minimal required fields
POST /api/clients
Content-Type: application/json

{
  "name": "New Client Inc"
}

# Create with all fields
POST /api/clients
Content-Type: application/json

{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "country": "USA",
  "notes": "Key client for enterprise solutions"
}
```

---

## Update Client Company

Update an existing client company. All fields are optional; only provided fields will be updated.

**Endpoint:** `PUT /api/clients/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Client company ID |

**Request Body:**

```json
{
  "name": "Acme Corporation (Updated)",
  "industry": "Software",
  "notes": "Updated notes"
}
```

**Request Body Schema:**

All fields from the Create endpoint are supported, but all are optional. Only include fields you want to update.

**Important Notes:**
- `organizationId` cannot be changed and will be ignored if provided
- `updatedAt` timestamp is automatically updated
- `createdAt` timestamp is never modified
- Partial updates are supported (only send fields to change)

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-123",
  "name": "Acme Corporation (Updated)",
  "website": "https://acme.com",
  "industry": "Software",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "country": "USA",
  "notes": "Updated notes",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-25T16:45:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed
- `404 Not Found`: Client company does not exist or belongs to a different organization

**Examples:**

```bash
# Update single field
PUT /api/clients/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "industry": "Software"
}

# Update multiple fields
PUT /api/clients/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "Acme Corporation (Updated)",
  "website": "https://newacme.com",
  "notes": "Updated contact information"
}
```

---

## Delete Client Company

Delete a client company after checking for dependent entities. Deletion is blocked if the client has related records.

**Endpoint:** `DELETE /api/clients/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Client company ID |

**Cascade Check Behavior:**

Before deletion, the API checks for related entities:
- Contacts
- Deals
- Engagements
- Contracts
- Proposals
- Invoices

If any related entities exist, deletion is blocked and a 409 Conflict response is returned with details about the dependencies.

**Success Response (204 No Content):**

No response body. The client company has been successfully deleted.

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Client not found"
}
```

**409 Conflict (Has Dependencies):**
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

The `dependencies` object shows the count of each type of related entity. Only non-zero counts are included.

**Deletion Workflow:**

1. Check for dependencies
2. If dependencies exist, return 409 with details
3. User must manually delete or reassign dependent entities
4. Retry deletion after dependencies are removed
5. Successful deletion returns 204

**Examples:**

```bash
# Attempt to delete client (may fail if dependencies exist)
DELETE /api/clients/550e8400-e29b-41d4-a716-446655440000

# Response if dependencies exist (409 Conflict):
{
  "error": "Cannot delete client with existing dependencies",
  "dependencies": {
    "contacts": 5,
    "deals": 3
  }
}

# After removing dependencies, deletion succeeds (204 No Content)
DELETE /api/clients/550e8400-e29b-41d4-a716-446655440000
# No response body
```

---

## Get Client Statistics

Retrieve aggregate statistics about client companies for dashboard metrics.

**Endpoint:** `GET /api/clients/stats`

**Query Parameters:** None

**Success Response (200 OK):**

```json
{
  "total": 150,
  "recentlyAdded": 12,
  "byIndustry": {
    "Technology": 45,
    "Healthcare": 30,
    "Finance": 25,
    "Manufacturing": 20,
    "Retail": 15,
    "Other": 15
  },
  "byCountry": {
    "USA": 100,
    "Canada": 25,
    "UK": 15,
    "Germany": 10
  },
  "withActiveEngagements": 35,
  "withoutContacts": 8
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of client companies in the organization |
| `recentlyAdded` | integer | Number of clients added in the last 30 days |
| `byIndustry` | object | Count of clients grouped by industry (only non-null industries) |
| `byCountry` | object | Count of clients grouped by country (only non-null countries) |
| `withActiveEngagements` | integer | Number of clients with at least one active engagement |
| `withoutContacts` | integer | Number of clients with no associated contacts |

**Notes:**
- All statistics are scoped to the authenticated user's organization
- Empty categories are omitted from `byIndustry` and `byCountry` objects
- Clients with `null` industry or country are not included in the respective breakdowns

**Examples:**

```bash
# Get client statistics
GET /api/clients/stats
```

---

## Error Responses

All error responses follow a consistent JSON format with an `error` field containing a descriptive message.

### 400 Bad Request - Validation Error

Returned when request validation fails (invalid query parameters, missing required fields, invalid field types).

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Required"
    },
    {
      "field": "page",
      "message": "Expected number, received string"
    }
  ]
}
```

**Common Validation Errors:**
- Missing required field (`name` is required for POST)
- Invalid data type (e.g., string instead of number for `page`)
- Value out of range (e.g., `limit` > 100, negative `page`)
- Invalid format (e.g., malformed UUID)

### 404 Not Found

Returned when:
- Client company ID does not exist
- Client company exists but belongs to a different organization (security through obscurity)

```json
{
  "error": "Client not found"
}
```

### 409 Conflict - Dependency Error

Returned when attempting to delete a client company that has dependent entities.

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

### 500 Internal Server Error

Returned when an unexpected server error occurs.

```json
{
  "error": "An unexpected error occurred"
}
```

**Note:** Error responses never expose sensitive information such as stack traces, database details, or internal system information.

---

## Query Parameters

### Pagination Parameters

**page** (integer, optional, default: 1)
- Current page number
- Must be a positive integer (≥ 1)
- If page exceeds available pages, returns empty data array with correct pagination metadata

**limit** (integer, optional, default: 50, max: 100)
- Number of items per page
- Must be a positive integer between 1 and 100
- Values > 100 will be rejected with validation error

### Filter Parameters

All filter parameters are optional and case-insensitive. Multiple filters use AND logic.

**search** (string, optional)
- Full-text search across multiple fields
- Searches in: `name`, `website`, `industry`, `city`, `country`
- Uses case-insensitive partial matching (ILIKE)
- Matches if search term appears anywhere in any of the searched fields

**industry** (string, optional)
- Filter by exact industry match (case-insensitive)
- Only returns clients where industry exactly matches the provided value
- Clients with `null` industry are excluded

**city** (string, optional)
- Filter by exact city match (case-insensitive)
- Only returns clients where city exactly matches the provided value
- Clients with `null` city are excluded

**state** (string, optional)
- Filter by exact state/province match (case-insensitive)
- Only returns clients where state exactly matches the provided value
- Clients with `null` state are excluded

**country** (string, optional)
- Filter by exact country match (case-insensitive)
- Only returns clients where country exactly matches the provided value
- Clients with `null` country are excluded

### Query Parameter Examples

```bash
# Pagination only
GET /api/clients?page=2&limit=25

# Search only
GET /api/clients?search=technology

# Single filter
GET /api/clients?industry=Healthcare

# Multiple filters (AND logic)
GET /api/clients?industry=Technology&country=USA&state=CA

# Search with filters
GET /api/clients?search=acme&industry=Technology

# Everything combined
GET /api/clients?search=software&industry=Technology&country=USA&page=1&limit=20
```

---

## Authentication Requirements

All Client Companies API endpoints require authentication. Requests must include one of the following:

**Option 1: HTTP Header**
```
x-user-id: <user-id>
```

**Option 2: HttpOnly Cookie**
```
ubos_user_id=<user-id>
```

**Unauthenticated Requests:**

If authentication is missing or invalid, the API returns:

```json
{
  "error": "Unauthorized"
}
```

Status Code: `401 Unauthorized`

**Authentication Flow:**

1. User authenticates via `/api/login`
2. Server sets `ubos_user_id` HttpOnly cookie
3. Subsequent requests automatically include the cookie
4. Server validates authentication on each request
5. User's organization is resolved from their user ID
6. All data operations are scoped to that organization

---

## Organization Isolation

**Multi-Tenancy Enforcement:**

All Client Companies API operations enforce strict organization-level isolation:

- Users can only access client companies belonging to their organization
- The `organizationId` is automatically determined from the authenticated user
- Cross-organization access is prevented at the database query level
- Attempting to access another organization's data returns `404 Not Found` (not `403 Forbidden` for security)

**Security Through Obscurity:**

When a client company exists but belongs to a different organization, the API returns `404 Not Found` rather than `403 Forbidden`. This prevents information disclosure about the existence of resources in other organizations.

**Automatic Organization Assignment:**

- On POST (create), `organizationId` is automatically set from the authenticated user
- Any `organizationId` value in the request body is ignored
- On PUT (update), `organizationId` cannot be changed
- On DELETE, only clients in the user's organization can be deleted

**Storage Layer Enforcement:**

All database queries include `WHERE organizationId = ?` clauses, enforced by the storage layer (`server/storage.ts`). This provides defense-in-depth against accidental cross-organization data access.

---

## Response Format Consistency

All API responses follow consistent formatting conventions:

### Field Naming

**camelCase for JSON:**
- All JSON field names use camelCase: `clientCompanyId`, `createdAt`, `organizationId`
- Database columns use snake_case: `client_company_id`, `created_at`, `organization_id`
- Drizzle ORM automatically handles the conversion

### Timestamps

**ISO 8601 Format:**
- All timestamps are returned in ISO 8601 format with milliseconds and UTC timezone
- Example: `"2024-01-15T10:30:00.000Z"`
- Fields: `createdAt`, `updatedAt`, `expectedCloseDate`, `startDate`, `endDate`

### Null vs Undefined

**Explicit Null Values:**
- Optional fields with no value return `null` (not omitted)
- Example: `"website": null` (not missing from response)
- This ensures consistent response structure for frontend parsing

### Empty Collections

**Empty Arrays:**
- Empty collections return `[]` (not `null`)
- Example: `"contacts": []` when a client has no contacts
- This prevents null pointer errors in frontend code

### Content-Type

**JSON Responses:**
- All responses include `Content-Type: application/json` header
- Except `204 No Content` responses which have no body

### Example Response Structure

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-123",
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "address": null,
  "city": "San Francisco",
  "state": "CA",
  "zipCode": null,
  "country": "USA",
  "notes": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z",
  "contacts": [],
  "deals": [],
  "engagements": []
}
```

Note:
- `address`, `zipCode`, `notes` are `null` (not omitted)
- `contacts`, `deals`, `engagements` are `[]` (not `null`)
- Timestamps are ISO 8601 format
- All field names are camelCase

---

## Rate Limiting

All Client Companies API endpoints are protected by rate limiting to prevent abuse.

**Rate Limit Configuration:**
- Applied via `express-rate-limit` middleware
- Configured in `server/security.ts`
- Limits are enforced per IP address

**Rate Limit Headers:**

Responses include rate limit information in headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

**Rate Limit Exceeded:**

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests, please try again later"
}
```

Status Code: `429 Too Many Requests`

---

## Security Features

### Input Validation

**Zod Schema Validation:**
- All request bodies validated with Zod schemas before processing
- Query parameters validated for type and range
- Validation errors return detailed field-level error messages
- Invalid data is rejected before reaching the database

### SQL Injection Prevention

**Parameterized Queries:**
- All database queries use Drizzle ORM with parameterized queries
- User input is never concatenated into SQL strings
- Protection against SQL injection attacks is built-in

### XSS Prevention

**Input Sanitization:**
- Text inputs are sanitized to prevent XSS attacks
- Implemented via `server/security-utils.ts`
- Dangerous characters and scripts are escaped or removed

### CSRF Protection

**State-Changing Endpoints:**
- POST, PUT, DELETE endpoints protected by CSRF tokens
- Configured in `server/csrf.ts`
- GET requests (read-only) do not require CSRF tokens

### Sensitive Data Protection

**Logging:**
- Error logs include context for debugging
- Sensitive data (passwords, tokens, PII) is redacted from logs
- Stack traces and database details are never exposed in API responses
- Implemented via `server/security-utils.ts`

### Security Headers

**Helmet Middleware:**
- Security headers applied to all responses
- Configured in `server/security.ts`
- Includes: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.

---

## Usage Examples

### Complete CRUD Workflow

```bash
# 1. Create a new client
POST /api/clients
Content-Type: application/json

{
  "name": "TechStart Inc",
  "website": "https://techstart.io",
  "industry": "Technology",
  "city": "Austin",
  "state": "TX",
  "country": "USA"
}

# Response: 201 Created
{
  "id": "abc-123",
  "organizationId": "org-456",
  "name": "TechStart Inc",
  ...
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}

# 2. Retrieve the client with relations
GET /api/clients/abc-123

# Response: 200 OK
{
  "id": "abc-123",
  "name": "TechStart Inc",
  ...
  "contacts": [],
  "deals": [],
  "engagements": [],
  "activeEngagementsCount": 0,
  "totalDealsValue": 0
}

# 3. Update the client
PUT /api/clients/abc-123
Content-Type: application/json

{
  "notes": "Potential for Q2 expansion"
}

# Response: 200 OK
{
  "id": "abc-123",
  "name": "TechStart Inc",
  "notes": "Potential for Q2 expansion",
  ...
  "updatedAt": "2024-01-16T09:15:00.000Z"
}

# 4. Attempt to delete (may fail if dependencies exist)
DELETE /api/clients/abc-123

# Response: 204 No Content (success)
# OR
# Response: 409 Conflict (has dependencies)
{
  "error": "Cannot delete client with existing dependencies",
  "dependencies": {
    "contacts": 2
  }
}
```

### Pagination Workflow

```bash
# 1. Get first page with default limit (50)
GET /api/clients

# Response:
{
  "data": [ /* 50 clients */ ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}

# 2. Get next page
GET /api/clients?page=2

# Response:
{
  "data": [ /* next 50 clients */ ],
  "pagination": {
    "total": 150,
    "page": 2,
    "limit": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": true
  }
}

# 3. Get last page
GET /api/clients?page=3

# Response:
{
  "data": [ /* last 50 clients */ ],
  "pagination": {
    "total": 150,
    "page": 3,
    "limit": 50,
    "totalPages": 3,
    "hasNext": false,
    "hasPrev": true
  }
}

# 4. Custom page size
GET /api/clients?page=1&limit=25

# Response:
{
  "data": [ /* 25 clients */ ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 25,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Search and Filter Workflow

```bash
# 1. Search across multiple fields
GET /api/clients?search=tech

# Returns clients where "tech" appears in:
# - name (e.g., "TechStart Inc")
# - website (e.g., "https://mytech.com")
# - industry (e.g., "Technology")
# - city (e.g., "Tech Valley")
# - country (e.g., "Techland")

# 2. Filter by single field
GET /api/clients?industry=Healthcare

# Returns only clients with industry = "Healthcare"

# 3. Multiple filters (AND logic)
GET /api/clients?industry=Technology&country=USA&state=CA

# Returns clients where:
# - industry = "Technology" AND
# - country = "USA" AND
# - state = "CA"

# 4. Search with filters
GET /api/clients?search=software&industry=Technology&country=USA

# Returns clients where:
# - ("software" appears in name/website/industry/city/country) AND
# - industry = "Technology" AND
# - country = "USA"

# 5. Search and filter with pagination
GET /api/clients?search=consulting&industry=Professional%20Services&page=1&limit=20

# Returns first 20 clients matching search and filter criteria
```

### Statistics Workflow

```bash
# Get dashboard statistics
GET /api/clients/stats

# Response:
{
  "total": 150,
  "recentlyAdded": 12,
  "byIndustry": {
    "Technology": 45,
    "Healthcare": 30,
    "Finance": 25,
    "Manufacturing": 20,
    "Retail": 15,
    "Other": 15
  },
  "byCountry": {
    "USA": 100,
    "Canada": 25,
    "UK": 15,
    "Germany": 10
  },
  "withActiveEngagements": 35,
  "withoutContacts": 8
}

# Use this data to populate dashboard widgets:
# - Total clients: 150
# - New this month: 12
# - Top industry: Technology (45 clients)
# - Clients needing attention: 8 (no contacts)
# - Active engagements: 35 clients
```

### Error Handling Workflow

```bash
# 1. Validation error - missing required field
POST /api/clients
Content-Type: application/json

{
  "website": "https://example.com"
}

# Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Required"
    }
  ]
}

# 2. Validation error - invalid query parameter
GET /api/clients?page=-1

# Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "page",
      "message": "Number must be greater than 0"
    }
  ]
}

# 3. Not found error
GET /api/clients/non-existent-id

# Response: 404 Not Found
{
  "error": "Client not found"
}

# 4. Conflict error - delete with dependencies
DELETE /api/clients/abc-123

# Response: 409 Conflict
{
  "error": "Cannot delete client with existing dependencies",
  "dependencies": {
    "contacts": 5,
    "deals": 3,
    "engagements": 2
  }
}

# Solution: Remove dependencies first
DELETE /api/contacts/contact-1
DELETE /api/contacts/contact-2
# ... remove all contacts, deals, engagements

# Then retry deletion
DELETE /api/clients/abc-123

# Response: 204 No Content (success)
```

---

## Implementation Details

### Technology Stack

- **Backend Framework:** Express 4
- **Database:** PostgreSQL via Drizzle ORM
- **Validation:** Zod schemas
- **Authentication:** Custom middleware (`requireAuth`)
- **Security:** Helmet, express-rate-limit, CSRF protection
- **Logging:** Structured logging with sensitive data redaction

### File Locations

- **Routes:** `server/domains/crm/routes.ts`
- **Storage Layer:** `server/storage.ts`
- **Validation Schemas:** `shared/client-schemas.ts`
- **Database Schema:** `shared/schema.ts`
- **Error Handlers:** `server/domains/crm/error-handlers.ts`

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
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_clients_org ON client_companies(organization_id);
CREATE INDEX idx_clients_industry ON client_companies(industry);
CREATE INDEX idx_clients_country ON client_companies(country);
CREATE INDEX idx_clients_created_at ON client_companies(created_at);
```

---

## Related Documentation

- [CRM API Overview](./README.md)
- [Contacts API](./contacts.md) *(planned)*
- [Deals API](./deals.md) *(planned)*
- [Authentication API](../auth/README.md)
- [API Documentation Index](../README.md)

---

## Changelog

### Version 1.0 (Current)

**Implemented:**
- GET /api/clients - List with pagination, search, and filters
- GET /api/clients/:id - Get single client with relations
- POST /api/clients - Create client
- PUT /api/clients/:id - Update client
- DELETE /api/clients/:id - Delete with cascade checks
- GET /api/clients/stats - Statistics endpoint

**Features:**
- Pagination with metadata
- Multi-field search (name, website, industry, city, country)
- Filtering by industry, city, state, country
- Organization-level isolation
- Cascade delete checks
- Comprehensive error handling
- Input validation with Zod
- Rate limiting
- Security headers

**Future Enhancements:**
- Custom fields support
- Tags and labels
- Bulk operations
- Export functionality
- Advanced search with operators
- Relationship visualization
- Activity timeline integration
