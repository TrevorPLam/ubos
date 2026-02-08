# Requirements Document

## Introduction

This document specifies the requirements for the Client Companies CRUD API, a core component of the UBOS CRM domain. Client Companies represent business clients in the professional services management platform and require comprehensive API endpoints for listing, creating, reading, updating, and deleting client records. The API must support multi-tenancy with organization-level isolation, provide pagination and filtering capabilities, implement soft delete with cascade checks, and expose statistics for dashboard metrics.

## Glossary

- **Client_Company**: A business entity that is a client of the organization using UBOS
- **Organization**: A tenant in the multi-tenant system; all data is scoped to an organization
- **API**: Application Programming Interface - the HTTP REST endpoints for client company operations
- **Soft_Delete**: Marking a record as deleted without physically removing it from the database
- **Cascade_Check**: Verification that deleting a record won't orphan related records
- **Pagination**: Dividing large result sets into pages with configurable page size
- **Filter**: Query parameter that restricts results based on field values
- **Search**: Text-based query that matches against multiple fields
- **Statistics**: Aggregate metrics about client companies for dashboard display
- **Validation**: Ensuring input data meets schema requirements before processing
- **Storage_Layer**: The data access layer (server/storage.ts) that enforces org-scoping

## Requirements

### Requirement 1: List Client Companies with Pagination

**User Story:** As a user, I want to retrieve a paginated list of client companies, so that I can view all clients in my organization without overwhelming the UI.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/clients, THE API SHALL return a paginated list of client companies for the authenticated user's organization
2. WHEN pagination parameters are provided (page, limit), THE API SHALL return the specified page of results with the specified number of items
3. WHEN no pagination parameters are provided, THE API SHALL return the first page with a default limit of 50 items
4. THE API SHALL include pagination metadata (total count, current page, total pages, has next page, has previous page) in the response
5. THE API SHALL enforce organization-level isolation ensuring users only see clients from their organization

### Requirement 2: Retrieve Single Client Company with Relations

**User Story:** As a user, I want to retrieve a single client company with its related data, so that I can view complete client information including contacts and deals.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/clients/:id, THE API SHALL return the client company with the specified ID if it belongs to the user's organization
2. WHEN the client company includes related contacts, THE API SHALL include the contacts in the response
3. WHEN the client company includes related deals, THE API SHALL include the deals in the response
4. IF the client company does not exist or does not belong to the user's organization, THEN THE API SHALL return a 404 error
5. THE API SHALL enforce organization-level isolation for both the client company and all related entities

### Requirement 3: Create Client Company with Validation

**User Story:** As a user, I want to create a new client company with validated data, so that I can add clients to my CRM with confidence that the data is correct.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/clients with valid data, THE API SHALL create a new client company in the user's organization
2. WHEN the request body is validated, THE API SHALL use the Zod insertClientCompanySchema to ensure all required fields are present and valid
3. WHEN validation fails, THE API SHALL return a 400 error with detailed validation error messages
4. WHEN a client company is created, THE API SHALL automatically set the organizationId to the authenticated user's organization
5. WHEN a client company is created, THE API SHALL return the created client company with a 201 status code
6. THE API SHALL set createdAt and updatedAt timestamps automatically

### Requirement 4: Update Client Company with Validation

**User Story:** As a user, I want to update an existing client company with validated data, so that I can keep client information current and accurate.

#### Acceptance Criteria

1. WHEN a PUT request is made to /api/clients/:id with valid data, THE API SHALL update the client company if it belongs to the user's organization
2. WHEN the request body is validated, THE API SHALL use a Zod schema to ensure all fields are valid
3. WHEN validation fails, THE API SHALL return a 400 error with detailed validation error messages
4. IF the client company does not exist or does not belong to the user's organization, THEN THE API SHALL return a 404 error
5. WHEN a client company is updated, THE API SHALL automatically update the updatedAt timestamp
6. WHEN a client company is updated, THE API SHALL return the updated client company with a 200 status code

### Requirement 5: Delete Client Company with Cascade Checks

**User Story:** As a user, I want to delete a client company with safety checks, so that I can remove clients while being warned about dependent data.

#### Acceptance Criteria

1. WHEN a DELETE request is made to /api/clients/:id, THE API SHALL check for related entities (contacts, deals, engagements, contracts, proposals, invoices) before deletion
2. IF the client company has related entities, THEN THE API SHALL return a 409 error with details about the dependent entities
3. IF the client company has no related entities, THEN THE API SHALL perform a soft delete by marking the record as deleted
4. IF the client company does not exist or does not belong to the user's organization, THEN THE API SHALL return a 404 error
5. WHEN a client company is successfully deleted, THE API SHALL return a 204 status code with no content
6. THE API SHALL enforce organization-level isolation for the deletion operation

### Requirement 6: Search and Filter Client Companies

**User Story:** As a user, I want to search and filter client companies, so that I can quickly find specific clients based on various criteria.

#### Acceptance Criteria

1. WHEN a search query parameter is provided, THE API SHALL search across client company name, website, industry, city, and country fields
2. WHEN filter parameters are provided (industry, city, state, country), THE API SHALL filter results to match the specified criteria
3. WHEN multiple filters are provided, THE API SHALL apply all filters using AND logic
4. WHEN search and filters are combined, THE API SHALL apply both search and filters to the results
5. THE API SHALL return filtered and searched results with pagination support
6. THE API SHALL perform case-insensitive matching for search and filter operations

### Requirement 7: Retrieve Client Company Statistics

**User Story:** As a user, I want to view aggregate statistics about client companies, so that I can see key metrics on my dashboard.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/clients/stats, THE API SHALL return aggregate statistics for the user's organization
2. THE API SHALL include the total count of client companies in the statistics
3. THE API SHALL include the count of client companies by industry in the statistics
4. THE API SHALL include the count of client companies by country in the statistics
5. THE API SHALL include the count of recently added client companies (last 30 days) in the statistics
6. THE API SHALL enforce organization-level isolation for all statistics calculations

### Requirement 8: Input Validation and Security

**User Story:** As a system administrator, I want all API inputs validated and sanitized, so that the system is protected from malicious input and data integrity is maintained.

#### Acceptance Criteria

1. WHEN any API endpoint receives input, THE API SHALL validate the input using Zod schemas before processing
2. WHEN validation fails, THE API SHALL return a 400 error with specific field-level error messages
3. THE API SHALL sanitize all text inputs to prevent XSS attacks
4. THE API SHALL use parameterized queries via Drizzle ORM to prevent SQL injection
5. THE API SHALL enforce authentication on all endpoints using the requireAuth middleware
6. THE API SHALL enforce rate limiting on all endpoints to prevent abuse

### Requirement 9: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose issues and maintain system reliability.

#### Acceptance Criteria

1. WHEN an error occurs in any endpoint, THE API SHALL log the error with sufficient context for debugging
2. WHEN an error occurs, THE API SHALL return an appropriate HTTP status code (400, 404, 409, 500)
3. WHEN an error occurs, THE API SHALL return a JSON response with an error message
4. THE API SHALL not expose sensitive information (stack traces, database details) in error responses
5. THE API SHALL log all client company operations (create, update, delete) for audit purposes
6. THE API SHALL use structured logging with consistent format across all endpoints

### Requirement 10: API Response Format Consistency

**User Story:** As a frontend developer, I want consistent API response formats, so that I can reliably parse and display data in the UI.

#### Acceptance Criteria

1. THE API SHALL return all successful responses as JSON with appropriate content-type headers
2. THE API SHALL use consistent field naming (camelCase) in all JSON responses
3. THE API SHALL include timestamps in ISO 8601 format for all date/time fields
4. THE API SHALL return null for optional fields that have no value rather than omitting them
5. THE API SHALL return arrays as empty arrays [] rather than null when no items exist
6. THE API SHALL include consistent error response format with "error" field containing the message
