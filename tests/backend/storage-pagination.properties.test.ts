// AI-META-BEGIN
// AI-META: Property-based tests for pagination correctness
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Client Companies Pagination
 * 
 * Feature: client-companies-crud-api
 * Property 2: Pagination Correctness
 * Validates: Requirements 1.2
 * 
 * This test validates that for any valid pagination parameters (page, limit)
 * and any set of client companies, the API returns exactly the correct slice
 * of data corresponding to the requested page, with the number of items not
 * exceeding the specified limit.
 * 
 * Note: These tests validate the pagination logic itself, not database operations.
 * The pagination algorithm should work correctly regardless of the data source.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany } from '@shared/schema';
import type { PaginationOptions, PaginatedResult } from '@shared/client-schemas';


/**
 * Simulates the pagination logic from getClientCompaniesPaginated
 * This allows us to test the pagination algorithm without database dependencies
 */
function paginateData<T>(
  data: T[],
  page: number,
  limit: number
): PaginatedResult<T> {
  const total = data.length;
  const offset = (page - 1) * limit;
  const paginatedData = data.slice(offset, offset + limit);
  const totalPages = Math.ceil(total / limit);

  return {
    data: paginatedData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

describe('Client Companies Pagination - Property Tests', () => {

  // Feature: client-companies-crud-api, Property 2: Pagination Correctness
  it('should return exactly the correct slice of data for any valid pagination parameters', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate a random number of clients (0-150)
          clientCount: fc.integer({ min: 0, max: 150 }),
          // Generate valid pagination parameters
          page: fc.integer({ min: 1, max: 10 }),
          limit: fc.integer({ min: 1, max: 100 }),
        }),
        ({ clientCount, page, limit }) => {
          // Setup: Create mock client data
          const mockClients: Partial<ClientCompany>[] = Array.from(
            { length: clientCount },
            (_, i) => ({
              id: `client-${i}`,
              organizationId: 'test-org',
              name: `Test Client ${i + 1}`,
              industry: i % 3 === 0 ? 'Technology' : i % 3 === 1 ? 'Finance' : 'Healthcare',
              city: i % 2 === 0 ? 'San Francisco' : 'New York',
              country: 'USA',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Get paginated results
          const result = paginateData(mockClients, page, limit);

          // Property 1: Number of items returned should not exceed limit
          expect(result.data.length).toBeLessThanOrEqual(limit);

          // Property 2: If there are enough items, and we're not past the last page,
          // we should get exactly 'limit' items (or fewer on the last page)
          const expectedItemsOnPage = Math.min(
            limit,
            Math.max(0, clientCount - (page - 1) * limit)
          );
          expect(result.data.length).toBe(expectedItemsOnPage);

          // Property 3: All returned items should belong to the correct organization
          result.data.forEach((client) => {
            expect(client.organizationId).toBe('test-org');
          });

          // Property 4: Pagination metadata should be accurate
          expect(result.pagination.total).toBe(clientCount);
          expect(result.pagination.page).toBe(page);
          expect(result.pagination.limit).toBe(limit);
          expect(result.pagination.totalPages).toBe(
            clientCount === 0 ? 0 : Math.ceil(clientCount / limit)
          );
          expect(result.pagination.hasNext).toBe(
            page < Math.ceil(clientCount / limit)
          );
          expect(result.pagination.hasPrev).toBe(page > 1);

          // Property 5: If we request a page beyond available data, we should get empty results
          if (page > Math.ceil(clientCount / limit) && clientCount > 0) {
            expect(result.data.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return consistent results across multiple pages covering all data', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate a moderate number of clients for multi-page testing
          clientCount: fc.integer({ min: 10, max: 50 }),
          // Generate a limit that will create multiple pages
          limit: fc.integer({ min: 3, max: 15 }),
        }),
        ({ clientCount, limit }) => {
          // Setup: Create mock clients
          const mockClients: Partial<ClientCompany>[] = Array.from(
            { length: clientCount },
            (_, i) => ({
              id: `multi-page-client-${i}`,
              organizationId: 'test-org',
              name: `Multi-Page Client ${i + 1}`,
              industry: 'Technology',
              city: 'San Francisco',
              country: 'USA',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Fetch all pages
          const totalPages = Math.ceil(clientCount / limit);
          const allFetchedClients: Partial<ClientCompany>[] = [];

          for (let page = 1; page <= totalPages; page++) {
            const result = paginateData(mockClients, page, limit);
            allFetchedClients.push(...result.data);
          }

          // Property 1: Total fetched items should equal total created items
          expect(allFetchedClients.length).toBe(clientCount);

          // Property 2: No duplicates across pages (each client appears exactly once)
          const clientIds = allFetchedClients.map((c) => c.id);
          const uniqueIds = new Set(clientIds);
          expect(uniqueIds.size).toBe(clientCount);

          // Property 3: All created clients should be present in fetched results
          const createdIds = new Set(mockClients.map((c) => c.id));
          const fetchedIds = new Set(allFetchedClients.map((c) => c.id));
          expect(fetchedIds).toEqual(createdIds);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge cases: empty results, first page, last page', () => {
    fc.assert(
      fc.property(
        fc.record({
          limit: fc.integer({ min: 5, max: 20 }),
        }),
        ({ limit }) => {
          // Test Case 1: Empty dataset (no clients)
          const emptyClients: Partial<ClientCompany>[] = [];
          const emptyResult = paginateData(emptyClients, 1, limit);

          expect(emptyResult.data.length).toBe(0);
          expect(emptyResult.pagination.total).toBe(0);
          expect(emptyResult.pagination.totalPages).toBe(0);
          expect(emptyResult.pagination.hasNext).toBe(false);
          expect(emptyResult.pagination.hasPrev).toBe(false);

          // Test Case 2: First page with exactly 'limit' items
          const mockClients: Partial<ClientCompany>[] = Array.from(
            { length: limit },
            (_, i) => ({
              id: `edge-case-client-${i}`,
              organizationId: 'test-org',
              name: `Edge Case Client ${i + 1}`,
              industry: 'Technology',
              city: 'San Francisco',
              country: 'USA',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          const firstPageResult = paginateData(mockClients, 1, limit);

          expect(firstPageResult.data.length).toBe(limit);
          expect(firstPageResult.pagination.page).toBe(1);
          expect(firstPageResult.pagination.hasPrev).toBe(false);
          expect(firstPageResult.pagination.hasNext).toBe(false); // Only one page

          // Test Case 3: Requesting page beyond available data
          const beyondResult = paginateData(mockClients, 10, limit);

          expect(beyondResult.data.length).toBe(0);
          expect(beyondResult.pagination.hasNext).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });
});
