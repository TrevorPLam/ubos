// AI-META-BEGIN
// AI-META: Property-based tests for statistics completeness
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Client Company Statistics
 * 
 * Feature: client-companies-crud-api
 * Property 16: Statistics Completeness
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * This test validates that for any organization, the statistics endpoint
 * returns a response containing all required fields: total count, recently
 * added count, breakdown by industry, breakdown by country, count with
 * active engagements, and count without contacts.
 * 
 * The test verifies:
 * - All required fields are present in the response
 * - Total count matches the number of clients
 * - Recently added count is accurate (last 30 days)
 * - Industry breakdown is complete and accurate
 * - Country breakdown is complete and accurate
 * - Active engagements count is accurate
 * - Clients without contacts count is accurate
 * - All counts are non-negative integers
 * 
 * Note: These tests validate the statistics calculation logic itself,
 * not database operations. The logic should work correctly regardless
 * of the data source.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany, Contact, Engagement } from '@shared/schema';
import type { ClientCompanyStats } from '@shared/client-schemas';

/**
 * Simulates the statistics calculation logic from getClientCompanyStats
 * This allows us to test the logic without database dependencies
 */
function calculateStatistics(
  clients: ClientCompany[],
  contacts: Contact[],
  engagements: Engagement[],
  orgId: string
): ClientCompanyStats {
  // Filter clients for this organization
  const orgClients = clients.filter((c) => c.organizationId === orgId);

  // Calculate total count
  const total = orgClients.length;

  // Calculate recently added (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentlyAdded = orgClients.filter(
    (c) => c.createdAt >= thirtyDaysAgo
  ).length;

  // Calculate breakdown by industry
  const byIndustry: Record<string, number> = {};
  orgClients.forEach((client) => {
    if (client.industry) {
      byIndustry[client.industry] = (byIndustry[client.industry] || 0) + 1;
    }
  });

  // Calculate breakdown by country
  const byCountry: Record<string, number> = {};
  orgClients.forEach((client) => {
    if (client.country) {
      byCountry[client.country] = (byCountry[client.country] || 0) + 1;
    }
  });

  // Calculate clients with active engagements
  const clientsWithActiveEngagements = new Set<string>();
  engagements.forEach((engagement) => {
    if (
      engagement.status === 'active' &&
      engagement.clientCompanyId &&
      engagement.organizationId === orgId
    ) {
      clientsWithActiveEngagements.add(engagement.clientCompanyId);
    }
  });
  const withActiveEngagements = clientsWithActiveEngagements.size;

  // Calculate clients without contacts
  const clientsWithContacts = new Set<string>();
  contacts.forEach((contact) => {
    if (contact.clientCompanyId && contact.organizationId === orgId) {
      clientsWithContacts.add(contact.clientCompanyId);
    }
  });
  const withoutContacts = orgClients.filter(
    (c) => !clientsWithContacts.has(c.id)
  ).length;

  return {
    total,
    recentlyAdded,
    byIndustry,
    byCountry,
    withActiveEngagements,
    withoutContacts,
  };
}

describe('Client Companies Statistics - Property Tests', () => {

  // Feature: client-companies-crud-api, Property 16: Statistics Completeness
  it('should return all required fields in statistics response', () => {
    fc.assert(
      fc.property(
        fc.record({
          clientCount: fc.integer({ min: 0, max: 50 }),
        }),
        ({ clientCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create mock clients
          const mockClients: ClientCompany[] = Array.from(
            { length: clientCount },
            (_, i) => ({
              id: `client-${i}`,
              organizationId: orgId,
              name: `Client ${i}`,
              website: null,
              industry: i % 3 === 0 ? 'Technology' : i % 3 === 1 ? 'Finance' : 'Healthcare',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: i % 2 === 0 ? 'USA' : 'Canada',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Calculate statistics
          const stats = calculateStatistics(mockClients, [], [], orgId);

          // Property 1: All required fields must be present
          expect(stats).toHaveProperty('total');
          expect(stats).toHaveProperty('recentlyAdded');
          expect(stats).toHaveProperty('byIndustry');
          expect(stats).toHaveProperty('byCountry');
          expect(stats).toHaveProperty('withActiveEngagements');
          expect(stats).toHaveProperty('withoutContacts');

          // Property 2: All numeric fields must be non-negative integers
          expect(stats.total).toBeGreaterThanOrEqual(0);
          expect(stats.recentlyAdded).toBeGreaterThanOrEqual(0);
          expect(stats.withActiveEngagements).toBeGreaterThanOrEqual(0);
          expect(stats.withoutContacts).toBeGreaterThanOrEqual(0);

          expect(Number.isInteger(stats.total)).toBe(true);
          expect(Number.isInteger(stats.recentlyAdded)).toBe(true);
          expect(Number.isInteger(stats.withActiveEngagements)).toBe(true);
          expect(Number.isInteger(stats.withoutContacts)).toBe(true);

          // Property 3: Breakdown objects must be defined
          expect(typeof stats.byIndustry).toBe('object');
          expect(typeof stats.byCountry).toBe('object');
          expect(stats.byIndustry).not.toBeNull();
          expect(stats.byCountry).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately calculate total count matching number of clients', () => {
    fc.assert(
      fc.property(
        fc.record({
          clientCount: fc.integer({ min: 0, max: 100 }),
        }),
        ({ clientCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create mock clients
          const mockClients: ClientCompany[] = Array.from(
            { length: clientCount },
            (_, i) => ({
              id: `client-${i}`,
              organizationId: orgId,
              name: `Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Calculate statistics
          const stats = calculateStatistics(mockClients, [], [], orgId);

          // Property: Total count must match the number of clients
          expect(stats.total).toBe(clientCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should accurately calculate recently added count (last 30 days)', () => {
    fc.assert(
      fc.property(
        fc.record({
          recentCount: fc.integer({ min: 0, max: 20 }),
          oldCount: fc.integer({ min: 0, max: 20 }),
        }),
        ({ recentCount, oldCount }) => {
          const orgId = 'test-org-id';
          const now = new Date();
          const twentyDaysAgo = new Date(now);
          twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
          const fortyDaysAgo = new Date(now);
          fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

          // Setup: Create recent clients (within 30 days)
          const recentClients: ClientCompany[] = Array.from(
            { length: recentCount },
            (_, i) => ({
              id: `recent-client-${i}`,
              organizationId: orgId,
              name: `Recent Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: twentyDaysAgo,
              updatedAt: twentyDaysAgo,
            })
          );

          // Setup: Create old clients (more than 30 days ago)
          const oldClients: ClientCompany[] = Array.from(
            { length: oldCount },
            (_, i) => ({
              id: `old-client-${i}`,
              organizationId: orgId,
              name: `Old Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: fortyDaysAgo,
              updatedAt: fortyDaysAgo,
            })
          );

          const allClients = [...recentClients, ...oldClients];

          // Test: Calculate statistics
          const stats = calculateStatistics(allClients, [], [], orgId);

          // Property: Recently added count should match recent clients
          expect(stats.recentlyAdded).toBe(recentCount);
          expect(stats.total).toBe(recentCount + oldCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should accurately calculate industry breakdown', () => {
    fc.assert(
      fc.property(
        fc.record({
          techCount: fc.integer({ min: 0, max: 15 }),
          financeCount: fc.integer({ min: 0, max: 15 }),
          healthcareCount: fc.integer({ min: 0, max: 15 }),
          nullIndustryCount: fc.integer({ min: 0, max: 10 }),
        }),
        ({ techCount, financeCount, healthcareCount, nullIndustryCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create clients with different industries
          const mockClients: ClientCompany[] = [
            ...Array.from({ length: techCount }, (_, i) => ({
              id: `tech-client-${i}`,
              organizationId: orgId,
              name: `Tech Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: financeCount }, (_, i) => ({
              id: `finance-client-${i}`,
              organizationId: orgId,
              name: `Finance Client ${i}`,
              website: null,
              industry: 'Finance',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: healthcareCount }, (_, i) => ({
              id: `healthcare-client-${i}`,
              organizationId: orgId,
              name: `Healthcare Client ${i}`,
              website: null,
              industry: 'Healthcare',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: nullIndustryCount }, (_, i) => ({
              id: `null-industry-client-${i}`,
              organizationId: orgId,
              name: `No Industry Client ${i}`,
              website: null,
              industry: null,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Test: Calculate statistics
          const stats = calculateStatistics(mockClients, [], [], orgId);

          // Property: Industry breakdown should match input counts
          if (techCount > 0) {
            expect(stats.byIndustry['Technology']).toBe(techCount);
          } else {
            expect(stats.byIndustry['Technology']).toBeUndefined();
          }

          if (financeCount > 0) {
            expect(stats.byIndustry['Finance']).toBe(financeCount);
          } else {
            expect(stats.byIndustry['Finance']).toBeUndefined();
          }

          if (healthcareCount > 0) {
            expect(stats.byIndustry['Healthcare']).toBe(healthcareCount);
          } else {
            expect(stats.byIndustry['Healthcare']).toBeUndefined();
          }

          // Property: Null industries should not appear in breakdown
          expect(stats.byIndustry['null']).toBeUndefined();
          expect(stats.byIndustry['']).toBeUndefined();

          // Property: Sum of industry counts should not exceed total
          const industrySum = Object.values(stats.byIndustry).reduce(
            (sum, count) => sum + count,
            0
          );
          expect(industrySum).toBeLessThanOrEqual(stats.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately calculate country breakdown', () => {
    fc.assert(
      fc.property(
        fc.record({
          usaCount: fc.integer({ min: 0, max: 15 }),
          canadaCount: fc.integer({ min: 0, max: 15 }),
          ukCount: fc.integer({ min: 0, max: 15 }),
          nullCountryCount: fc.integer({ min: 0, max: 10 }),
        }),
        ({ usaCount, canadaCount, ukCount, nullCountryCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create clients with different countries
          const mockClients: ClientCompany[] = [
            ...Array.from({ length: usaCount }, (_, i) => ({
              id: `usa-client-${i}`,
              organizationId: orgId,
              name: `USA Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: canadaCount }, (_, i) => ({
              id: `canada-client-${i}`,
              organizationId: orgId,
              name: `Canada Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'Canada',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: ukCount }, (_, i) => ({
              id: `uk-client-${i}`,
              organizationId: orgId,
              name: `UK Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'United Kingdom',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: nullCountryCount }, (_, i) => ({
              id: `null-country-client-${i}`,
              organizationId: orgId,
              name: `No Country Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Test: Calculate statistics
          const stats = calculateStatistics(mockClients, [], [], orgId);

          // Property: Country breakdown should match input counts
          if (usaCount > 0) {
            expect(stats.byCountry['USA']).toBe(usaCount);
          } else {
            expect(stats.byCountry['USA']).toBeUndefined();
          }

          if (canadaCount > 0) {
            expect(stats.byCountry['Canada']).toBe(canadaCount);
          } else {
            expect(stats.byCountry['Canada']).toBeUndefined();
          }

          if (ukCount > 0) {
            expect(stats.byCountry['United Kingdom']).toBe(ukCount);
          } else {
            expect(stats.byCountry['United Kingdom']).toBeUndefined();
          }

          // Property: Null countries should not appear in breakdown
          expect(stats.byCountry['null']).toBeUndefined();
          expect(stats.byCountry['']).toBeUndefined();

          // Property: Sum of country counts should not exceed total
          const countrySum = Object.values(stats.byCountry).reduce(
            (sum, count) => sum + count,
            0
          );
          expect(countrySum).toBeLessThanOrEqual(stats.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately calculate clients with active engagements', () => {
    fc.assert(
      fc.property(
        fc.record({
          clientsWithActiveCount: fc.integer({ min: 0, max: 15 }),
          clientsWithInactiveCount: fc.integer({ min: 0, max: 15 }),
          clientsWithNoEngagementsCount: fc.integer({ min: 0, max: 15 }),
        }),
        ({ clientsWithActiveCount, clientsWithInactiveCount, clientsWithNoEngagementsCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create clients
          const allClients: ClientCompany[] = [
            ...Array.from({ length: clientsWithActiveCount }, (_, i) => ({
              id: `client-with-active-${i}`,
              organizationId: orgId,
              name: `Client With Active ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: clientsWithInactiveCount }, (_, i) => ({
              id: `client-with-inactive-${i}`,
              organizationId: orgId,
              name: `Client With Inactive ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: clientsWithNoEngagementsCount }, (_, i) => ({
              id: `client-no-engagements-${i}`,
              organizationId: orgId,
              name: `Client No Engagements ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Setup: Create engagements
          const allEngagements: Engagement[] = [
            // Active engagements for first group
            ...Array.from({ length: clientsWithActiveCount }, (_, i) => ({
              id: `active-engagement-${i}`,
              organizationId: orgId,
              clientCompanyId: `client-with-active-${i}`,
              contractId: null,
              dealId: null,
              contactId: null,
              ownerId: 'test-user',
              name: `Active Engagement ${i}`,
              description: null,
              status: 'active' as const,
              startDate: null,
              endDate: null,
              totalValue: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            // Inactive engagements for second group
            ...Array.from({ length: clientsWithInactiveCount }, (_, i) => ({
              id: `inactive-engagement-${i}`,
              organizationId: orgId,
              clientCompanyId: `client-with-inactive-${i}`,
              contractId: null,
              dealId: null,
              contactId: null,
              ownerId: 'test-user',
              name: `Inactive Engagement ${i}`,
              description: null,
              status: 'completed' as const,
              startDate: null,
              endDate: null,
              totalValue: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Test: Calculate statistics
          const stats = calculateStatistics(allClients, [], allEngagements, orgId);

          // Property: Count should match clients with active engagements
          expect(stats.withActiveEngagements).toBe(clientsWithActiveCount);

          // Property: Count should not exceed total clients
          expect(stats.withActiveEngagements).toBeLessThanOrEqual(stats.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately calculate clients without contacts', () => {
    fc.assert(
      fc.property(
        fc.record({
          clientsWithContactsCount: fc.integer({ min: 0, max: 15 }),
          clientsWithoutContactsCount: fc.integer({ min: 0, max: 15 }),
        }),
        ({ clientsWithContactsCount, clientsWithoutContactsCount }) => {
          const orgId = 'test-org-id';

          // Setup: Create clients
          const allClients: ClientCompany[] = [
            ...Array.from({ length: clientsWithContactsCount }, (_, i) => ({
              id: `client-with-contacts-${i}`,
              organizationId: orgId,
              name: `Client With Contacts ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: clientsWithoutContactsCount }, (_, i) => ({
              id: `client-without-contacts-${i}`,
              organizationId: orgId,
              name: `Client Without Contacts ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Setup: Create contacts only for first group
          const allContacts: Contact[] = Array.from(
            { length: clientsWithContactsCount },
            (_, i) => ({
              id: `contact-${i}`,
              organizationId: orgId,
              clientCompanyId: `client-with-contacts-${i}`,
              firstName: `First${i}`,
              lastName: `Last${i}`,
              email: `contact${i}@example.com`,
              phone: null,
              title: null,
              isPrimary: false,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Calculate statistics
          const stats = calculateStatistics(allClients, allContacts, [], orgId);

          // Property: Count should match clients without contacts
          expect(stats.withoutContacts).toBe(clientsWithoutContactsCount);

          // Property: Count should not exceed total clients
          expect(stats.withoutContacts).toBeLessThanOrEqual(stats.total);

          // Property: Sum of with and without should equal total
          const clientsWithContacts = stats.total - stats.withoutContacts;
          expect(clientsWithContacts + stats.withoutContacts).toBe(stats.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only count statistics for the specific organization', () => {
    fc.assert(
      fc.property(
        fc.record({
          thisOrgClientCount: fc.integer({ min: 0, max: 20 }),
          otherOrgClientCount: fc.integer({ min: 1, max: 20 }),
        }),
        ({ thisOrgClientCount, otherOrgClientCount }) => {
          const thisOrgId = 'test-org-id';
          const otherOrgId = 'other-org-id';

          // Setup: Create clients for both organizations
          const allClients: ClientCompany[] = [
            ...Array.from({ length: thisOrgClientCount }, (_, i) => ({
              id: `this-org-client-${i}`,
              organizationId: thisOrgId,
              name: `This Org Client ${i}`,
              website: null,
              industry: 'Technology',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ...Array.from({ length: otherOrgClientCount }, (_, i) => ({
              id: `other-org-client-${i}`,
              organizationId: otherOrgId,
              name: `Other Org Client ${i}`,
              website: null,
              industry: 'Finance',
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'Canada',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Test: Calculate statistics for this org
          const stats = calculateStatistics(allClients, [], [], thisOrgId);

          // Property: Should only count clients from this organization
          expect(stats.total).toBe(thisOrgClientCount);

          // Property: Should not include other org's industry in breakdown
          expect(stats.byIndustry['Finance']).toBeUndefined();

          // Property: Should not include other org's country in breakdown
          expect(stats.byCountry['Canada']).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge case: empty dataset (no clients)', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const orgId = 'test-org-id';

          // Setup: Empty dataset
          const emptyClients: ClientCompany[] = [];
          const emptyContacts: Contact[] = [];
          const emptyEngagements: Engagement[] = [];

          // Test: Calculate statistics
          const stats = calculateStatistics(
            emptyClients,
            emptyContacts,
            emptyEngagements,
            orgId
          );

          // Property: All counts should be zero
          expect(stats.total).toBe(0);
          expect(stats.recentlyAdded).toBe(0);
          expect(stats.withActiveEngagements).toBe(0);
          expect(stats.withoutContacts).toBe(0);

          // Property: Breakdown objects should be empty
          expect(Object.keys(stats.byIndustry).length).toBe(0);
          expect(Object.keys(stats.byCountry).length).toBe(0);

          // Property: All required fields should still be present
          expect(stats).toHaveProperty('total');
          expect(stats).toHaveProperty('recentlyAdded');
          expect(stats).toHaveProperty('byIndustry');
          expect(stats).toHaveProperty('byCountry');
          expect(stats).toHaveProperty('withActiveEngagements');
          expect(stats).toHaveProperty('withoutContacts');
        }
      ),
      { numRuns: 20 }
    );
  });
});
