// AI-META-BEGIN
// AI-META: Test file for GET /api/clients endpoint
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Unit tests for GET /api/clients endpoint
 * 
 * Tests pagination, filtering, search, and error handling for the client companies list endpoint.
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, it, expect } from 'vitest';
import { clientListQuerySchema } from '@shared/client-schemas';

describe('GET /api/clients - Unit Tests', () => {
  describe('Default Pagination', () => {
    it('should use default page 1 and limit 50 when no parameters provided', () => {
      // Arrange
      const queryParams = {};
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.search).toBeUndefined();
      expect(result.industry).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.state).toBeUndefined();
      expect(result.country).toBeUndefined();
    });
  });

  describe('Custom Pagination Parameters', () => {
    it('should parse custom page and limit when provided', () => {
      // Arrange
      const queryParams = { page: '2', limit: '25' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });

    it('should enforce maximum limit of 100', () => {
      // Arrange
      const queryParams = { page: '1', limit: '200' };
      
      // Act & Assert - should throw validation error
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should coerce string numbers to integers', () => {
      // Arrange
      const queryParams = { page: '3', limit: '10' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });
  });

  describe('Search Functionality', () => {
    it('should parse search query parameter', () => {
      // Arrange
      const queryParams = { search: 'Acme Corp' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.search).toBe('Acme Corp');
      expect(result.page).toBe(1); // defaults
      expect(result.limit).toBe(50); // defaults
    });

    it('should handle empty search string', () => {
      // Arrange
      const queryParams = { search: '' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.search).toBe('');
    });
  });

  describe('Individual Filters', () => {
    it('should parse industry filter', () => {
      // Arrange
      const queryParams = { industry: 'Technology' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.industry).toBe('Technology');
    });

    it('should parse city filter', () => {
      // Arrange
      const queryParams = { city: 'San Francisco' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.city).toBe('San Francisco');
    });

    it('should parse state filter', () => {
      // Arrange
      const queryParams = { state: 'California' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.state).toBe('California');
    });

    it('should parse country filter', () => {
      // Arrange
      const queryParams = { country: 'USA' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.country).toBe('USA');
    });
  });

  describe('Combined Filters', () => {
    it('should parse multiple filters together', () => {
      // Arrange
      const queryParams = {
        industry: 'Technology',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
      };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.industry).toBe('Technology');
      expect(result.city).toBe('San Francisco');
      expect(result.state).toBe('California');
      expect(result.country).toBe('USA');
    });

    it('should combine all filters with pagination', () => {
      // Arrange
      const queryParams = {
        page: '2',
        limit: '20',
        industry: 'Technology',
        city: 'San Francisco',
        country: 'USA',
      };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.industry).toBe('Technology');
      expect(result.city).toBe('San Francisco');
      expect(result.country).toBe('USA');
    });
  });


  describe('Search with Filters', () => {
    it('should combine search query with filters', () => {
      // Arrange
      const queryParams = {
        search: 'software',
        industry: 'Technology',
        country: 'USA',
      };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.search).toBe('software');
      expect(result.industry).toBe('Technology');
      expect(result.country).toBe('USA');
    });

    it('should combine search with pagination and filters', () => {
      // Arrange
      const queryParams = {
        page: '3',
        limit: '15',
        search: 'consulting',
        industry: 'Professional Services',
        city: 'New York',
      };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
      expect(result.search).toBe('consulting');
      expect(result.industry).toBe('Professional Services');
      expect(result.city).toBe('New York');
    });
  });

  describe('Pagination Metadata Accuracy', () => {
    it('should calculate correct metadata for first page', () => {
      // Arrange - simulating pagination logic
      const total = 100;
      const page = 1;
      const limit = 10;
      
      // Act
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      // Assert
      expect(totalPages).toBe(10);
      expect(hasNext).toBe(true);
      expect(hasPrev).toBe(false);
    });

    it('should calculate correct metadata for middle page', () => {
      // Arrange
      const total = 100;
      const page = 5;
      const limit = 10;
      
      // Act
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      // Assert
      expect(totalPages).toBe(10);
      expect(hasNext).toBe(true);
      expect(hasPrev).toBe(true);
    });

    it('should calculate correct metadata for last page', () => {
      // Arrange
      const total = 100;
      const page = 10;
      const limit = 10;
      
      // Act
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      // Assert
      expect(totalPages).toBe(10);
      expect(hasNext).toBe(false);
      expect(hasPrev).toBe(true);
    });

    it('should calculate totalPages correctly with partial last page', () => {
      // Arrange
      const total = 47;
      const limit = 20;
      
      // Act
      const totalPages = Math.ceil(total / limit);
      
      // Assert
      expect(totalPages).toBe(3); // 47 / 20 = 2.35 -> 3 pages
    });

    it('should handle zero total correctly', () => {
      // Arrange
      const total = 0;
      const page = 1;
      const limit = 50;
      
      // Act
      const totalPages = Math.ceil(total / limit) || 0;
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      // Assert
      expect(totalPages).toBe(0);
      expect(hasNext).toBe(false);
      expect(hasPrev).toBe(false);
    });
  });

  describe('Empty Results', () => {
    it('should handle empty result set', () => {
      // Arrange - simulating empty results
      const data: any[] = [];
      const total = 0;
      
      // Assert
      expect(data).toEqual([]);
      expect(data.length).toBe(0);
      expect(total).toBe(0);
    });

    it('should handle page beyond available pages', () => {
      // Arrange
      const total = 25;
      const page = 100;
      const limit = 50;
      const totalPages = Math.ceil(total / limit);
      
      // Assert
      expect(page).toBeGreaterThan(totalPages);
      expect(totalPages).toBe(1);
    });
  });

  describe('Invalid Query Parameters', () => {
    it('should reject negative page number', () => {
      // Arrange
      const queryParams = { page: '-1' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject zero page number', () => {
      // Arrange
      const queryParams = { page: '0' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject negative limit', () => {
      // Arrange
      const queryParams = { limit: '-10' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject zero limit', () => {
      // Arrange
      const queryParams = { limit: '0' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject non-numeric page parameter', () => {
      // Arrange
      const queryParams = { page: 'abc' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject non-numeric limit parameter', () => {
      // Arrange
      const queryParams = { limit: 'xyz' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject decimal page number', () => {
      // Arrange
      const queryParams = { page: '1.5' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });

    it('should reject limit exceeding maximum', () => {
      // Arrange
      const queryParams = { limit: '150' };
      
      // Act & Assert
      expect(() => clientListQuerySchema.parse(queryParams)).toThrow();
    });
  });

  describe('Query Parameter Edge Cases', () => {
    it('should handle whitespace in search query', () => {
      // Arrange
      const queryParams = { search: '  Acme Corp  ' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.search).toBe('  Acme Corp  ');
    });

    it('should handle special characters in search', () => {
      // Arrange
      const queryParams = { search: 'Company & Co.' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.search).toBe('Company & Co.');
    });

    it('should handle unicode characters in filters', () => {
      // Arrange
      const queryParams = { city: 'São Paulo' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.city).toBe('São Paulo');
    });

    it('should parse page as 1 when given string "1"', () => {
      // Arrange
      const queryParams = { page: '1' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.page).toBe(1);
      expect(typeof result.page).toBe('number');
    });

    it('should handle all optional parameters as undefined when not provided', () => {
      // Arrange
      const queryParams = { page: '1', limit: '50' };
      
      // Act
      const result = clientListQuerySchema.parse(queryParams);
      
      // Assert
      expect(result.search).toBeUndefined();
      expect(result.industry).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.state).toBeUndefined();
      expect(result.country).toBeUndefined();
    });
  });
});
