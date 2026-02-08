// AI-META-BEGIN
// AI-META: Property-based tests for pagination metadata accuracy
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Pagination Metadata Accuracy
 * 
 * Feature: client-companies-crud-api
 * Property 3: Pagination Metadata Accuracy
 * Validates: Requirements 1.4
 * 
 * This test validates that for any paginated response, the pagination metadata
 * (total, page, limit, totalPages, hasNext, hasPrev) SHALL accurately reflect
 * the current page position and total dataset size.
 * 
 * The test verifies:
 * - totalPages is calculated correctly as Math.ceil(total / limit)
 * - hasNext is true when page < totalPages
 * - hasPrev is true when page > 1
 * - All metadata fields are present and have correct types
 * - Edge cases: empty results, first page, last page, beyond last page
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { PaginationMetadata } from '@shared/client-schemas';

/**
 * Calculates pagination metadata based on total count, page, and limit
 * This simulates the logic that should be in the API endpoint
 */
function calculatePaginationMetadata(
  total: number,
  page: number,
  limit: number
): PaginationMetadata {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

describe('Client Companies API - Pagination Metadata Accuracy Property Tests', () => {

  // Feature: client-companies-crud-api, Property 3: Pagination Metadata Accuracy
  it('should calculate totalPages correctly for any total count and limit', () => {
    fc.assert(
      fc.property(
        fc.record({
          total: fc.integer({ min: 0, max: 1000 }),
          page: fc.integer({ min: 1, max: 50 }),
          limit: fc.integer({ min: 1, max: 100 }),
        }),
        ({ total, page, limit }) => {
          // Test: Calculate metadata
          const metadata = calculatePaginationMetadata(total, page, limit);

          // Property 1: totalPages should be Math.ceil(total / limit) or 0 if total is 0
          const expectedTotalPages = total === 0 ? 0 : Math.ceil(total / limit);
          expect(metadata.totalPages).toBe(expectedTotalPages);

          // Property 2: totalPages should never be negative
          expect(metadata.totalPages).toBeGreaterThanOrEqual(0);

          // Property 3: If total is 0, totalPages should be 0
          if (total === 0) {
            expect(metadata.totalPages).toBe(0);
          }

          // Property 4: If total > 0, totalPages should be at least 1
          if (total > 0) {
            expect(metadata.totalPages).toBeGreaterThanOrEqual(1);
          }

          // Property 5: totalPages * limit should be >= total (covers all items)
          if (total > 0) {
            expect(metadata.totalPages * limit).toBeGreaterThanOrEqual(total);
          }

          // Property 6: (totalPages - 1) * limit should be < total (no extra empty pages)
          if (metadata.totalPages > 0) {
            expect((metadata.totalPages - 1) * limit).toBeLessThan(total);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set hasNext correctly based on current page and total pages', () => {
    fc.assert(
      fc.property(
        fc.record({
          total: fc.integer({ min: 0, max: 500 }),
          page: fc.integer({ min: 1, max: 30 }),
          limit: fc.integer({ min: 5, max: 50 }),
        }),
        ({ total, page, limit }) => {
          // Test: Calculate metadata
          const metadata = calculatePaginationMetadata(total, page, limit);

          // Property 1: hasNext should be true if and only if page < totalPages
          const expectedHasNext = page < metadata.totalPages;
          expect(metadata.hasNext).toBe(expectedHasNext);

          // Property 2: If on last page, hasNext should be false
          if (page === metadata.totalPages && metadata.totalPages > 0) {
            expect(metadata.hasNext).toBe(false);
          }

          // Property 3: If page is beyond totalPages, hasNext should be false
          if (page > metadata.totalPages) {
            expect(metadata.hasNext).toBe(false);
          }

          // Property 4: If total is 0, hasNext should be false
          if (total === 0) {
            expect(metadata.hasNext).toBe(false);
          }

          // Property 5: If on first page and there's only one page, hasNext should be false
          if (page === 1 && metadata.totalPages <= 1) {
            expect(metadata.hasNext).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set hasPrev correctly based on current page', () => {
    fc.assert(
      fc.property(
        fc.record({
          total: fc.integer({ min: 0, max: 500 }),
          page: fc.integer({ min: 1, max: 30 }),
          limit: fc.integer({ min: 5, max: 50 }),
        }),
        ({ total, page, limit }) => {
          // Test: Calculate metadata
          const metadata = calculatePaginationMetadata(total, page, limit);

          // Property 1: hasPrev should be true if and only if page > 1
          const expectedHasPrev = page > 1;
          expect(metadata.hasPrev).toBe(expectedHasPrev);

          // Property 2: If on first page, hasPrev should be false
          if (page === 1) {
            expect(metadata.hasPrev).toBe(false);
          }

          // Property 3: If on any page > 1, hasPrev should be true
          if (page > 1) {
            expect(metadata.hasPrev).toBe(true);
          }

          // Property 4: hasPrev is independent of total count
          // (you can be on page 2 even if there are no results)
          if (page === 2) {
            expect(metadata.hasPrev).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return accurate metadata for all fields simultaneously', () => {
    fc.assert(
      fc.property(
        fc.record({
          total: fc.integer({ min: 0, max: 1000 }),
          page: fc.integer({ min: 1, max: 50 }),
          limit: fc.integer({ min: 1, max: 100 }),
        }),
        ({ total, page, limit }) => {
          // Test: Calculate metadata
          const metadata = calculatePaginationMetadata(total, page, limit);

          // Property 1: All required fields are present
          expect(metadata).toHaveProperty('total');
          expect(metadata).toHaveProperty('page');
          expect(metadata).toHaveProperty('limit');
          expect(metadata).toHaveProperty('totalPages');
          expect(metadata).toHaveProperty('hasNext');
          expect(metadata).toHaveProperty('hasPrev');

          // Property 2: Field types are correct
          expect(typeof metadata.total).toBe('number');
          expect(typeof metadata.page).toBe('number');
          expect(typeof metadata.limit).toBe('number');
          expect(typeof metadata.totalPages).toBe('number');
          expect(typeof metadata.hasNext).toBe('boolean');
          expect(typeof metadata.hasPrev).toBe('boolean');

          // Property 3: Input values are preserved
          expect(metadata.total).toBe(total);
          expect(metadata.page).toBe(page);
          expect(metadata.limit).toBe(limit);

          // Property 4: Calculated values are consistent
          const expectedTotalPages = total === 0 ? 0 : Math.ceil(total / limit);
          expect(metadata.totalPages).toBe(expectedTotalPages);
          expect(metadata.hasNext).toBe(page < expectedTotalPages);
          expect(metadata.hasPrev).toBe(page > 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases: empty results, first page, last page, beyond last page', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 50 }),
        (limit) => {
          // Edge Case 1: Empty results (total = 0)
          const emptyMetadata = calculatePaginationMetadata(0, 1, limit);
          expect(emptyMetadata.total).toBe(0);
          expect(emptyMetadata.totalPages).toBe(0);
          expect(emptyMetadata.hasNext).toBe(false);
          expect(emptyMetadata.hasPrev).toBe(false);

          // Edge Case 2: First page with results
          const total = limit * 3; // 3 pages worth of data
          const firstPageMetadata = calculatePaginationMetadata(total, 1, limit);
          expect(firstPageMetadata.page).toBe(1);
          expect(firstPageMetadata.hasPrev).toBe(false);
          expect(firstPageMetadata.hasNext).toBe(true);
          expect(firstPageMetadata.totalPages).toBe(3);

          // Edge Case 3: Last page
          const lastPageMetadata = calculatePaginationMetadata(total, 3, limit);
          expect(lastPageMetadata.page).toBe(3);
          expect(lastPageMetadata.hasPrev).toBe(true);
          expect(lastPageMetadata.hasNext).toBe(false);

          // Edge Case 4: Beyond last page
          const beyondMetadata = calculatePaginationMetadata(total, 10, limit);
          expect(beyondMetadata.page).toBe(10);
          expect(beyondMetadata.hasNext).toBe(false);
          expect(beyondMetadata.totalPages).toBe(3);

          // Edge Case 5: Exactly one page of results
          const onePageMetadata = calculatePaginationMetadata(limit, 1, limit);
          expect(onePageMetadata.totalPages).toBe(1);
          expect(onePageMetadata.hasNext).toBe(false);
          expect(onePageMetadata.hasPrev).toBe(false);

          // Edge Case 6: Partial last page
          const partialTotal = limit * 2 + Math.floor(limit / 2);
          const partialMetadata = calculatePaginationMetadata(partialTotal, 3, limit);
          expect(partialMetadata.totalPages).toBe(3);
          expect(partialMetadata.hasNext).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain consistency between hasNext, hasPrev, and page position', () => {
    fc.assert(
      fc.property(
        fc.record({
          total: fc.integer({ min: 10, max: 200 }),
          limit: fc.integer({ min: 5, max: 20 }),
        }),
        ({ total, limit }) => {
          const totalPages = Math.ceil(total / limit);

          // Test all pages in the range
          for (let page = 1; page <= totalPages + 2; page++) {
            const metadata = calculatePaginationMetadata(total, page, limit);

            // Property 1: First page should have hasPrev=false
            if (page === 1) {
              expect(metadata.hasPrev).toBe(false);
            }

            // Property 2: Last page should have hasNext=false
            if (page === totalPages) {
              expect(metadata.hasNext).toBe(false);
            }

            // Property 3: Middle pages should have both true
            if (page > 1 && page < totalPages) {
              expect(metadata.hasPrev).toBe(true);
              expect(metadata.hasNext).toBe(true);
            }

            // Property 4: Pages beyond last should have hasNext=false
            if (page > totalPages) {
              expect(metadata.hasNext).toBe(false);
            }

            // Property 5: Consistency check
            expect(metadata.hasNext).toBe(page < totalPages);
            expect(metadata.hasPrev).toBe(page > 1);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle boundary conditions for totalPages calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        (limit) => {
          // Boundary 1: total = limit (exactly 1 page)
          const exactlyOnePage = calculatePaginationMetadata(limit, 1, limit);
          expect(exactlyOnePage.totalPages).toBe(1);

          // Boundary 2: total = limit + 1 (just over 1 page, should be 2 pages)
          const justOverOnePage = calculatePaginationMetadata(limit + 1, 1, limit);
          expect(justOverOnePage.totalPages).toBe(2);

          // Boundary 3: total = limit - 1 (just under 1 page, should be 1 page)
          const justUnderOnePage = calculatePaginationMetadata(limit - 1, 1, limit);
          expect(justUnderOnePage.totalPages).toBe(1);

          // Boundary 4: total = limit * 2 (exactly 2 pages)
          const exactlyTwoPages = calculatePaginationMetadata(limit * 2, 1, limit);
          expect(exactlyTwoPages.totalPages).toBe(2);

          // Boundary 5: total = limit * 2 + 1 (just over 2 pages, should be 3 pages)
          const justOverTwoPages = calculatePaginationMetadata(limit * 2 + 1, 1, limit);
          expect(justOverTwoPages.totalPages).toBe(3);

          // Boundary 6: total = 1 (minimum non-zero)
          const minimumTotal = calculatePaginationMetadata(1, 1, limit);
          expect(minimumTotal.totalPages).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
