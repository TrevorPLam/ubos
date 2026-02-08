# Implementation Plan: Client Companies CRUD API

## Overview

This implementation plan extends the existing Client Companies CRUD endpoints in the UBOS CRM domain with advanced features including pagination, filtering, search, statistics, and cascade delete checks. The implementation follows the established patterns in the codebase and maintains backward compatibility while adding production-ready capabilities.

**Status Update:** Tasks 1-6 are complete. The validation schemas, storage layer methods, and GET endpoints (list and by-id) are fully implemented with comprehensive property-based and unit tests. Remaining work focuses on POST/PUT/DELETE endpoints, statistics endpoint, error handling utilities, and documentation.

## Tasks

- [x] 1. Create validation schemas and types
  - Create `shared/client-schemas.ts` for client-specific Zod schemas
  - Define `paginationQuerySchema` for page and limit validation
  - Define `clientFilterQuerySchema` for search and filter parameters
  - Define `clientListQuerySchema` combining pagination and filters
  - Define `updateClientCompanySchema` as partial of insertClientCompanySchema
  - Export TypeScript types for all schemas
  - _Requirements: 3.2, 4.2, 8.1_

- [x] 2. Extend storage layer with new methods
  - [x] 2.1 Add pagination and filtering method
    - Implement `getClientCompaniesPaginated` in `server/storage.ts`
    - Accept orgId, pagination options, and filter options
    - Build dynamic Drizzle query with AND/OR conditions for search and filters
    - Implement case-insensitive search using ILIKE across name, website, industry, city, country
    - Calculate total count for pagination metadata
    - Return paginated result with data and pagination metadata
    - _Requirements: 1.1, 1.2, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 2.2 Write property test for pagination correctness
    - **Property 2: Pagination Correctness**
    - **Validates: Requirements 1.2**
  
  - [x] 2.3 Write property test for search across multiple fields
    - **Property 12: Search Across Multiple Fields**
    - **Validates: Requirements 6.1, 6.6**
  
  - [x] 2.4 Add method to get client with relations
    - Implement `getClientCompanyWithRelations` in `server/storage.ts`
    - Use Promise.all to fetch client, contacts, deals, and engagements in parallel
    - Calculate activeEngagementsCount (status = 'active')
    - Calculate totalDealsValue (sum of deal values)
    - Return combined object with all relations
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.5 Write property test for client retrieval with relations
    - **Property 4: Client Retrieval with Relations**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [x] 2.6 Add method to check dependencies before delete
    - Implement `checkClientCompanyDependencies` in `server/storage.ts`
    - Use Promise.all to count related contacts, deals, engagements, contracts, proposals, invoices
    - Return object with hasDependencies boolean and counts for each entity type
    - _Requirements: 5.1, 5.2_
  
  - [x] 2.7 Write property test for cascade check
    - **Property 10: Cascade Check Before Delete**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 2.8 Add method to get client statistics
    - Implement `getClientCompanyStats` in `server/storage.ts`
    - Calculate total count of clients
    - Calculate count of clients added in last 30 days
    - Group by industry and country for breakdowns
    - Count clients with active engagements
    - Count clients without contacts
    - Return statistics object
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 2.9 Write property test for statistics completeness
    - **Property 16: Statistics Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 3. Update IStorage interface
  - Add type definitions for new methods in `server/storage.ts`
  - Define `PaginationOptions`, `FilterOptions`, `PaginatedResult` interfaces
  - Define `ClientCompanyWithRelations`, `DependencyCheckResult`, `ClientCompanyStats` interfaces
  - Add method signatures to IStorage interface
  - _Requirements: 1.1, 2.1, 5.1, 7.1_

- [x] 4. Implement enhanced GET /api/clients endpoint
  - [x] 4.1 Update GET /api/clients route in `server/domains/crm/routes.ts`
    - Parse and validate query parameters using clientListQuerySchema
    - Extract pagination parameters (page, limit) with defaults
    - Extract filter parameters (search, industry, city, state, country)
    - Call storage.getClientCompaniesPaginated with orgId and options
    - Return paginated response with data and pagination metadata
    - Handle validation errors with 400 status
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 4.2 Write unit tests for GET /api/clients
    - Test default pagination (page 1, limit 50)
    - Test custom pagination parameters
    - Test search functionality
    - Test individual filters (industry, city, state, country)
    - Test combined filters
    - Test search with filters
    - Test pagination metadata accuracy
    - Test empty results
    - Test invalid query parameters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 4.3 Write property test for organization isolation
    - **Property 1: Organization Isolation**
    - **Validates: Requirements 1.5, 2.5, 5.6, 7.6**
  
  - [x] 4.4 Write property test for pagination metadata accuracy
    - **Property 3: Pagination Metadata Accuracy**
    - **Validates: Requirements 1.4**

- [x] 5. Implement enhanced GET /api/clients/:id endpoint
  - [x] 5.1 Update GET /api/clients/:id route in `server/domains/crm/routes.ts`
    - Validate id parameter
    - Call storage.getClientCompanyWithRelations with id and orgId
    - Return 404 if client not found or belongs to different org
    - Return client with all relations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 5.2 Write unit tests for GET /api/clients/:id
    - Test successful retrieval with relations
    - Test client with no contacts or deals
    - Test client with multiple contacts and deals
    - Test non-existent client ID
    - Test client from different organization
    - Test calculated fields (activeEngagementsCount, totalDealsValue)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 5.3 Write property test for cross-organization access prevention
    - **Property 5: Cross-Organization Access Prevention**
    - **Validates: Requirements 2.4, 4.4, 5.4**

- [x] 6. Implement enhanced POST /api/clients endpoint
  - [x] 6.1 Update POST /api/clients route in `server/domains/crm/routes.ts`
    - Validate request body using insertClientCompanySchema
    - Ensure organizationId is set from authenticated user (ignore request body value)
    - Call storage.createClientCompany with validated data
    - Return created client with 201 status
    - Handle validation errors with 400 status
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 6.2 Write unit tests for POST /api/clients
    - Test successful creation with minimal fields
    - Test successful creation with all fields
    - Test missing required field (name)
    - Test invalid field types
    - Test organizationId is set from auth, not request body
    - Test timestamps are set automatically
    - Test 201 status code
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 6.3 Write property test for create with organization assignment
    - **Property 6: Create with Organization Assignment**
    - **Validates: Requirements 3.1, 3.4**
  
  - [x] 6.4 Write property test for input validation
    - **Property 7: Input Validation**
    - **Validates: Requirements 3.2, 3.3, 4.2, 4.3, 8.1, 8.2**
  
  - [x] 6.5 Write property test for automatic timestamp management
    - **Property 8: Automatic Timestamp Management**
    - **Validates: Requirements 3.6, 4.5**

- [-] 7. Implement enhanced PUT /api/clients/:id endpoint
  - [x] 7.1 Update PUT /api/clients/:id route in `server/domains/crm/routes.ts`
    - Replace existing PATCH endpoint with PUT endpoint
    - Validate request body using updateClientCompanySchema
    - Ensure organizationId cannot be changed (omit from schema)
    - Call storage.updateClientCompany with id, orgId, and validated data
    - Return 404 if client not found or belongs to different org
    - Return updated client with 200 status
    - Handle validation errors with 400 status
    - Ensure updatedAt timestamp is automatically updated
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 7.2 Write unit tests for PUT /api/clients/:id
    - Test successful update with partial data
    - Test successful update with all fields
    - Test update non-existent client
    - Test update client from different organization
    - Test invalid field values
    - Test updatedAt timestamp changes
    - Test organizationId cannot be changed
    - Test 200 status code
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 7.3 Write property test for update preserves organization
    - **Property 9: Update Preserves Organization**
    - **Validates: Requirements 4.1**
  
  - [x] 7.4 Write property test for input validation on update
    - **Property 7: Input Validation** (applies to PUT as well)
    - **Validates: Requirements 4.2, 4.3, 8.1, 8.2**

- [ ] 8. Implement enhanced DELETE /api/clients/:id endpoint
  - [ ] 8.1 Update DELETE /api/clients/:id route in `server/domains/crm/routes.ts`
    - Validate id parameter
    - Call storage.checkClientCompanyDependencies with id and orgId first
    - If dependencies exist, return 409 with dependency details in response body
    - If no dependencies, call storage.deleteClientCompany
    - Return 404 if client not found or belongs to different org
    - Return 204 on successful deletion with no content
    - Enforce organization-level isolation for deletion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 8.2 Write unit tests for DELETE /api/clients/:id
    - Test successful deletion with no dependencies (204 status)
    - Test deletion blocked by contacts (409 status)
    - Test deletion blocked by deals (409 status)
    - Test deletion blocked by engagements (409 status)
    - Test deletion blocked by contracts (409 status)
    - Test deletion blocked by proposals (409 status)
    - Test deletion blocked by invoices (409 status)
    - Test deletion blocked by multiple dependency types
    - Test delete non-existent client (404 status)
    - Test delete client from different organization (404 status)
    - Test dependency details format in 409 response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 8.3 Write property test for cascade check before delete
    - **Property 10: Cascade Check Before Delete**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 8.4 Write property test for successful delete response
    - **Property 11: Successful Delete Response**
    - **Validates: Requirements 5.3, 5.5**

- [ ] 9. Implement GET /api/clients/stats endpoint
  - [ ] 9.1 Add GET /api/clients/stats route in `server/domains/crm/routes.ts`
    - Add route BEFORE the /api/clients/:id route (to avoid path conflict with :id)
    - Get orgId from authenticated user
    - Call storage.getClientCompanyStats with orgId
    - Return statistics object with 200 status
    - Enforce organization-level isolation for all statistics
    - Handle errors with appropriate status codes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 9.2 Write unit tests for GET /api/clients/stats
    - Test statistics with no clients (all counts should be 0)
    - Test statistics with multiple clients
    - Test industry breakdown accuracy
    - Test country breakdown accuracy
    - Test recently added count (last 30 days)
    - Test active engagements count
    - Test clients without contacts count
    - Test organization isolation (stats only from user's org)
    - Test response format includes all required fields
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 9.3 Write property test for statistics completeness
    - **Property 16: Statistics Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 10. Add comprehensive error handling
  - [ ] 10.1 Create error handling utilities
    - Create `server/domains/crm/error-handlers.ts` for CRM-specific error handling
    - Implement `formatZodErrors` to convert Zod errors to client-friendly format with field-level details
    - Implement `handleDependencyError` to format 409 responses with dependency details
    - Implement `handleNotFoundError` to format 404 responses consistently
    - Implement `handleValidationError` to format 400 responses with validation details
    - Add error logging with structured context using existing logger (userId, orgId, operation, timestamp)
    - Ensure sensitive data is redacted from logs using security-utils
    - Return appropriate HTTP status codes (400, 404, 409, 500)
    - Ensure error responses don't expose sensitive information (stack traces, database details)
    - _Requirements: 8.2, 9.1, 9.2, 9.3, 9.4, 10.6_
  
  - [ ] 10.2 Apply error handling to all endpoints
    - Update all client endpoints to use error handling utilities
    - Wrap all route handlers in try-catch blocks
    - Ensure consistent error response format across all endpoints (JSON with "error" field)
    - Add proper error logging with context for all operations (create, update, delete)
    - Ensure validation errors return 400 with field-level details
    - Ensure not found errors return 404 with descriptive message
    - Ensure conflict errors return 409 with dependency details
    - Ensure server errors return 500 with generic message (no sensitive data)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.6_
  
  - [ ]* 10.3 Write property test for error status codes
    - **Property 18: Error Status Codes**
    - **Validates: Requirements 9.2**
  
  - [ ]* 10.4 Write property test for error response format
    - **Property 19: Error Response Format**
    - **Validates: Requirements 9.3, 9.4, 10.6**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Run `npm test` to verify all unit tests pass
  - Run property-based tests with 100+ iterations
  - Verify TypeScript compilation with `npm run check`
  - Check for any linting errors with `npm run lint`
  - Verify all endpoints return correct status codes
  - Verify error handling is consistent across all endpoints
  - Ask the user if questions arise

- [ ]* 12. Add database indexes for performance (optional)
  - [ ]* 12.1 Create migration for new indexes
    - Add index on clientCompanies.industry for filter performance
    - Add index on clientCompanies.country for filter performance
    - Add index on clientCompanies.createdAt for sorting and date filtering
    - Document indexes in schema comments
    - Note: This requires database migration tooling
    - _Requirements: 6.1, 6.2, 7.3, 7.4_
  
  - [ ]* 12.2 Write performance tests
    - Test query performance with large datasets (1000+ clients)
    - Verify indexes are used in query plans (EXPLAIN ANALYZE)
    - Test pagination performance across pages
    - Test search performance with various query lengths
    - Note: These are optional performance validation tests

- [ ]* 13. Add integration tests (optional)
  - [ ]* 13.1 Write end-to-end CRUD flow test
    - Create client → Read client → Update client → Delete client
    - Verify data consistency throughout flow
    - Test with authentication middleware
    - Verify all timestamps and calculated fields
    - Verify organization isolation throughout flow
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
  
  - [ ]* 13.2 Write pagination integration test
    - Create 150 clients across multiple pages
    - Paginate through all pages sequentially
    - Verify all clients are returned exactly once
    - Verify pagination metadata on each page
    - Test edge cases (last page with partial results)
    - Test with different page sizes (10, 50, 100)
    - _Requirements: 1.2, 1.4_
  
  - [ ]* 13.3 Write search and filter integration test
    - Create clients with various industries and locations
    - Test search across multiple fields (name, website, industry, city, country)
    - Test filter combinations (industry + city, state + country, etc.)
    - Test search with filters combined
    - Verify result accuracy and ordering
    - Test case-insensitive matching
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 13.4 Write cascade delete integration test
    - Create client with contacts, deals, engagements, contracts, proposals, invoices
    - Attempt to delete client (should fail with 409)
    - Remove all dependencies one by one
    - Delete client successfully (should return 204)
    - Verify client is actually deleted
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 14. Update API documentation
  - Create or update `docs/api/crm.md` with client companies endpoints
  - Document GET /api/clients with all query parameters (page, limit, search, industry, city, state, country)
  - Document GET /api/clients/:id with relations response structure
  - Document POST /api/clients with request body schema and response example
  - Document PUT /api/clients/:id with request body schema and response example
  - Document DELETE /api/clients/:id with cascade check behavior and dependency response format
  - Document GET /api/clients/stats with statistics response structure
  - Include query parameter validation rules and defaults
  - Document all error responses with status codes (400, 404, 409, 500) and example responses
  - Add examples of pagination usage (first page, last page, custom page size)
  - Add examples of search usage (single field, multiple fields)
  - Add examples of filtering usage (single filter, multiple filters, search + filters)
  - Document authentication requirements (requireAuth middleware)
  - Document organization isolation behavior
  - Document response format consistency (camelCase, ISO 8601 dates, null vs empty arrays)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Run full test suite with `npm test`
  - Run coverage report with `npm run coverage`
  - Verify coverage meets goals (>80% line coverage)
  - Run security validation with `npm run validate:security`
  - Ensure all property tests pass with 100+ iterations
  - Verify no TypeScript errors with `npm run check`
  - Verify no linting errors with `npm run lint`
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation extends existing code in `server/domains/crm/routes.ts` and `server/storage.ts`
- All new code follows existing patterns and conventions in the UBOS codebase
- Multi-tenancy and organization isolation are enforced at every layer

## Completed Work (Tasks 1-6)

✅ Validation schemas created in `shared/client-schemas.ts`
✅ Storage layer extended with 4 new methods (pagination, relations, dependencies, stats)
✅ IStorage interface updated with new method signatures
✅ GET /api/clients endpoint implemented with pagination and filtering
✅ GET /api/clients/:id endpoint implemented with relations
✅ POST /api/clients endpoint implemented with validation
✅ Comprehensive property-based tests written (8 test files)
✅ Unit tests written for GET endpoints

## Remaining Work (Tasks 7-15)

🔲 PUT /api/clients/:id endpoint (replace existing PATCH)
🔲 DELETE /api/clients/:id endpoint with cascade checks
🔲 GET /api/clients/stats endpoint
🔲 Error handling utilities
🔲 API documentation
🔲 Optional: Database indexes, integration tests, performance tests
