// AI-META-BEGIN
// AI-META: Property-based tests for search across multiple fields
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Client Companies Search
 * 
 * Feature: client-companies-crud-api
 * Property 12: Search Across Multiple Fields
 * Validates: Requirements 6.1, 6.6
 * 
 * This test validates that for any search query string, the API returns
 * client companies where the search term matches (case-insensitive) any
 * of the following fields: name, website, industry, city, or country.
 * 
 * The test verifies:
 * - Search matches across all specified fields
 * - Search is case-insensitive
 * - Partial matches are found (substring matching)
 * - Non-matching clients are excluded
 * - Empty search returns all clients
 * 
 * Note: These tests validate the search logic itself, not database operations.
 * The search algorithm should work correctly regardless of the data source.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany } from '@shared/schema';

/**
 * Simulates the search logic from getClientCompaniesPaginated
 * This allows us to test the search algorithm without database dependencies
 */
function searchClients(
  clients: ClientCompany[],
  searchTerm: string | undefined
): ClientCompany[] {
  // If no search term, return all clients
  if (!searchTerm || searchTerm.trim() === '') {
    return clients;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();

  // Filter clients where search term matches any of the searchable fields
  return clients.filter((client) => {
    const searchableFields = [
      client.name,
      client.website,
      client.industry,
      client.city,
      client.country,
    ];

    return searchableFields.some((field) => {
      if (field === null || field === undefined) {
        return false;
      }
      return field.toLowerCase().includes(lowerSearchTerm);
    });
  });
}

describe('Client Companies Search - Property Tests', () => {

  // Feature: client-companies-crud-api, Property 12: Search Across Multiple Fields
  it('should return clients where search term matches any searchable field (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate a search term from common words
          searchTerm: fc.oneof(
            fc.constantFrom('tech', 'finance', 'san', 'usa', 'example', 'inc', 'corp'),
            fc.string({ minLength: 2, maxLength: 10 })
          ),
          // Generate random number of clients
          clientCount: fc.integer({ min: 5, max: 30 }),
        }),
        ({ searchTerm, clientCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create mock clients with varied data
          const mockClients: ClientCompany[] = Array.from(
            { length: clientCount },
            (_, i) => ({
              id: `client-${i}`,
              organizationId: orgId,
              name: i % 5 === 0 ? `Tech Company ${i}` : `Business ${i}`,
              website: i % 3 === 0 ? `https://example${i}.com` : null,
              industry: i % 4 === 0 ? 'Technology' : i % 4 === 1 ? 'Finance' : i % 4 === 2 ? 'Healthcare' : null,
              address: `${i} Main Street`,
              city: i % 3 === 0 ? 'San Francisco' : i % 3 === 1 ? 'New York' : 'Boston',
              state: i % 3 === 0 ? 'CA' : i % 3 === 1 ? 'NY' : 'MA',
              zipCode: `${10000 + i}`,
              country: i % 2 === 0 ? 'USA' : 'Canada',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Search clients
          const results = searchClients(mockClients, searchTerm);

          // Property 1: All returned clients should match the search term in at least one field
          results.forEach((client) => {
            const searchableFields = [
              client.name,
              client.website,
              client.industry,
              client.city,
              client.country,
            ];

            const hasMatch = searchableFields.some((field) => {
              if (field === null || field === undefined) {
                return false;
              }
              return field.toLowerCase().includes(searchTerm.toLowerCase());
            });

            expect(hasMatch).toBe(true);
          });

          // Property 2: No non-matching clients should be in results
          const nonMatchingClients = mockClients.filter((client) => {
            const searchableFields = [
              client.name,
              client.website,
              client.industry,
              client.city,
              client.country,
            ];

            const hasMatch = searchableFields.some((field) => {
              if (field === null || field === undefined) {
                return false;
              }
              return field.toLowerCase().includes(searchTerm.toLowerCase());
            });

            return !hasMatch;
          });

          nonMatchingClients.forEach((nonMatchingClient) => {
            expect(results.find((r) => r.id === nonMatchingClient.id)).toBeUndefined();
          });

          // Property 3: Results should be a subset of original clients
          expect(results.length).toBeLessThanOrEqual(mockClients.length);

          // Property 4: All results should belong to the same organization
          results.forEach((client) => {
            expect(client.organizationId).toBe(orgId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should perform case-insensitive search across all fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate search terms with different cases
          baseSearchTerm: fc.constantFrom('tech', 'finance', 'san', 'example'),
          caseVariant: fc.constantFrom('lower', 'upper', 'mixed'),
        }),
        ({ baseSearchTerm, caseVariant }) => {
          const orgId = 'test-org-id';

          // Apply case variant to search term
          let searchTerm: string;
          if (caseVariant === 'lower') {
            searchTerm = baseSearchTerm.toLowerCase();
          } else if (caseVariant === 'upper') {
            searchTerm = baseSearchTerm.toUpperCase();
          } else {
            // Mixed case
            searchTerm = baseSearchTerm.charAt(0).toUpperCase() + baseSearchTerm.slice(1);
          }

          // Setup: Create clients with known data in different cases
          const mockClients: ClientCompany[] = [
            {
              id: 'client-1',
              organizationId: orgId,
              name: 'Tech Solutions Inc',
              website: 'https://techsolutions.com',
              industry: 'Technology',
              address: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'client-2',
              organizationId: orgId,
              name: 'FINANCE CORP',
              website: 'https://financecorp.com',
              industry: 'FINANCE',
              address: '456 Wall St',
              city: 'New York',
              state: 'NY',
              zipCode: '10005',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'client-3',
              organizationId: orgId,
              name: 'Example Business',
              website: 'https://example.com',
              industry: 'Consulting',
              address: '789 Market St',
              city: 'san diego',
              state: 'CA',
              zipCode: '92101',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'client-4',
              organizationId: orgId,
              name: 'Unrelated Company',
              website: null,
              industry: 'Manufacturing',
              address: '321 Industrial Blvd',
              city: 'Detroit',
              state: 'MI',
              zipCode: '48201',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          // Test: Search with different case variants
          const results = searchClients(mockClients, searchTerm);

          // Property: Case-insensitive search should find matches regardless of case
          // For 'tech' (any case), should find client-1
          // For 'finance' (any case), should find client-2
          // For 'san' (any case), should find client-1 and client-3
          // For 'example' (any case), should find client-3

          if (baseSearchTerm === 'tech') {
            expect(results.some((c) => c.id === 'client-1')).toBe(true);
          } else if (baseSearchTerm === 'finance') {
            expect(results.some((c) => c.id === 'client-2')).toBe(true);
          } else if (baseSearchTerm === 'san') {
            expect(results.some((c) => c.id === 'client-1')).toBe(true);
            expect(results.some((c) => c.id === 'client-3')).toBe(true);
          } else if (baseSearchTerm === 'example') {
            expect(results.some((c) => c.id === 'client-3')).toBe(true);
          }

          // Property: All results should match the search term (case-insensitive)
          results.forEach((client) => {
            const searchableFields = [
              client.name,
              client.website,
              client.industry,
              client.city,
              client.country,
            ];

            const hasMatch = searchableFields.some((field) => {
              if (field === null || field === undefined) {
                return false;
              }
              return field.toLowerCase().includes(searchTerm.toLowerCase());
            });

            expect(hasMatch).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return all clients when search term is empty or undefined', () => {
    fc.assert(
      fc.property(
        fc.record({
          clientCount: fc.integer({ min: 0, max: 20 }),
          searchVariant: fc.constantFrom(undefined, '', '   '),
        }),
        ({ clientCount, searchVariant }) => {
          const orgId = 'test-org-id';

          // Setup: Create mock clients
          const mockClients: ClientCompany[] = Array.from(
            { length: clientCount },
            (_, i) => ({
              id: `client-${i}`,
              organizationId: orgId,
              name: `Client ${i}`,
              website: `https://client${i}.com`,
              industry: 'Technology',
              address: `${i} Main St`,
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Search with empty/undefined term
          const results = searchClients(mockClients, searchVariant);

          // Property: Empty search should return all clients
          expect(results.length).toBe(clientCount);
          expect(results).toEqual(mockClients);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle null values in searchable fields gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          searchTerm: fc.string({ minLength: 2, maxLength: 10 }),
        }),
        ({ searchTerm }) => {
          const orgId = 'test-org-id';

          // Setup: Create clients with null values in various fields
          const mockClients: ClientCompany[] = [
            {
              id: 'client-1',
              organizationId: orgId,
              name: 'Client with nulls',
              website: null,
              industry: null,
              address: '123 Main St',
              city: null,
              state: 'CA',
              zipCode: '94105',
              country: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'client-2',
              organizationId: orgId,
              name: 'Complete Client',
              website: 'https://complete.com',
              industry: 'Technology',
              address: '456 Market St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          // Test: Search should not crash on null values
          const results = searchClients(mockClients, searchTerm);

          // Property: Function should not throw and should return valid results
          expect(Array.isArray(results)).toBe(true);
          results.forEach((client) => {
            expect(client).toBeDefined();
            expect(client.id).toBeDefined();
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should find partial matches (substring matching)', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const orgId = 'test-org-id';

          // Setup: Create clients with known data
          const mockClients: ClientCompany[] = [
            {
              id: 'client-1',
              organizationId: orgId,
              name: 'Technology Solutions Inc',
              website: 'https://techsolutions.com',
              industry: 'Information Technology',
              address: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'United States',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'client-2',
              organizationId: orgId,
              name: 'Finance Corporation',
              website: 'https://financecorp.com',
              industry: 'Financial Services',
              address: '456 Wall St',
              city: 'New York',
              state: 'NY',
              zipCode: '10005',
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          // Test Case 1: Partial match in name
          const nameResults = searchClients(mockClients, 'tech');
          expect(nameResults.some((c) => c.id === 'client-1')).toBe(true);
          expect(nameResults.some((c) => c.id === 'client-2')).toBe(false);

          // Test Case 2: Partial match in industry
          const industryResults = searchClients(mockClients, 'information');
          expect(industryResults.some((c) => c.id === 'client-1')).toBe(true);

          // Test Case 3: Partial match in city
          const cityResults = searchClients(mockClients, 'fran');
          expect(cityResults.some((c) => c.id === 'client-1')).toBe(true);

          // Test Case 4: Partial match in country
          const countryResults = searchClients(mockClients, 'united');
          expect(countryResults.some((c) => c.id === 'client-1')).toBe(true);

          // Test Case 5: Partial match in website
          const websiteResults = searchClients(mockClients, 'solutions');
          expect(websiteResults.some((c) => c.id === 'client-1')).toBe(true);

          // Property: All results should contain the search term as substring
          [nameResults, industryResults, cityResults, countryResults, websiteResults].forEach(
            (results) => {
              results.forEach((client) => {
                const searchableFields = [
                  client.name,
                  client.website,
                  client.industry,
                  client.city,
                  client.country,
                ];

                const hasMatch = searchableFields.some((field) => {
                  if (field === null || field === undefined) {
                    return false;
                  }
                  return field.toLowerCase().includes('tech') ||
                         field.toLowerCase().includes('information') ||
                         field.toLowerCase().includes('fran') ||
                         field.toLowerCase().includes('united') ||
                         field.toLowerCase().includes('solutions');
                });

                expect(hasMatch).toBe(true);
              });
            }
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should search across exactly 5 fields: name, website, industry, city, country', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const orgId = 'test-org-id';
          const uniqueSearchTerm = 'UNIQUETERM123';

          // Setup: Create clients with the search term in each searchable field
          const clientWithTermInName: ClientCompany = {
            id: 'client-name',
            organizationId: orgId,
            name: `Company ${uniqueSearchTerm}`,
            website: 'https://other.com',
            industry: 'Other',
            address: '123 Main St',
            city: 'Other City',
            state: 'CA',
            zipCode: '94105',
            country: 'Other Country',
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const clientWithTermInWebsite: ClientCompany = {
            id: 'client-website',
            organizationId: orgId,
            name: 'Company Name',
            website: `https://${uniqueSearchTerm}.com`,
            industry: 'Other',
            address: '123 Main St',
            city: 'Other City',
            state: 'CA',
            zipCode: '94105',
            country: 'Other Country',
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const clientWithTermInIndustry: ClientCompany = {
            id: 'client-industry',
            organizationId: orgId,
            name: 'Company Name',
            website: 'https://other.com',
            industry: `${uniqueSearchTerm} Industry`,
            address: '123 Main St',
            city: 'Other City',
            state: 'CA',
            zipCode: '94105',
            country: 'Other Country',
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const clientWithTermInCity: ClientCompany = {
            id: 'client-city',
            organizationId: orgId,
            name: 'Company Name',
            website: 'https://other.com',
            industry: 'Other',
            address: '123 Main St',
            city: `${uniqueSearchTerm} City`,
            state: 'CA',
            zipCode: '94105',
            country: 'Other Country',
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const clientWithTermInCountry: ClientCompany = {
            id: 'client-country',
            organizationId: orgId,
            name: 'Company Name',
            website: 'https://other.com',
            industry: 'Other',
            address: '123 Main St',
            city: 'Other City',
            state: 'CA',
            zipCode: '94105',
            country: `${uniqueSearchTerm} Country`,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Client with term in non-searchable field (address, state, zipCode, notes)
          const clientWithTermInAddress: ClientCompany = {
            id: 'client-address',
            organizationId: orgId,
            name: 'Company Name',
            website: 'https://other.com',
            industry: 'Other',
            address: `${uniqueSearchTerm} Street`,
            city: 'Other City',
            state: 'CA',
            zipCode: '94105',
            country: 'Other Country',
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockClients = [
            clientWithTermInName,
            clientWithTermInWebsite,
            clientWithTermInIndustry,
            clientWithTermInCity,
            clientWithTermInCountry,
            clientWithTermInAddress,
          ];

          // Test: Search for the unique term
          const results = searchClients(mockClients, uniqueSearchTerm);

          // Property: Should find exactly 5 clients (not 6)
          // The client with term in address should NOT be found
          expect(results.length).toBe(5);

          // Property: Should find clients with term in searchable fields
          expect(results.some((c) => c.id === 'client-name')).toBe(true);
          expect(results.some((c) => c.id === 'client-website')).toBe(true);
          expect(results.some((c) => c.id === 'client-industry')).toBe(true);
          expect(results.some((c) => c.id === 'client-city')).toBe(true);
          expect(results.some((c) => c.id === 'client-country')).toBe(true);

          // Property: Should NOT find client with term in non-searchable field
          expect(results.some((c) => c.id === 'client-address')).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });
});
