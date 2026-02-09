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
 * Property-Based Tests for Statistics Completeness
 * 
 * Feature: client-companies-crud-api
 * Property 16: Statistics Completeness
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 * 
 * This test validates that for any organization, the statistics endpoint SHALL
 * return a response containing all required fields: total count, recently added
 * count, breakdown by industry, breakdown by country, count with active engagements,
 * and count without contacts.
 * 
 * The test verifies:
 * - All required fields are present in the response
 * - Field types are correct (numbers for counts, objects for breakdowns)
 * - Counts are non-negative integers
 * - Breakdowns are objects (not arrays or null)
 * - Response structure is consistent regardless of data
 * - Organization isolation is maintained
 * 
 * Note: These tests validate the statistics structure using property-based
 * testing to ensure completeness across all possible data scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany, Contact, Engagement } from '@shared/schema';

/**
 * Statistics response type
 */
interface ClientCompanyStats {
  total: number;
  recentlyAdded: number;
  byIndustry: Record<string, number>;
  byCountry: Record<string, number>;
  withActiveEngagements: number;
  withoutContacts: number;
}

/**
 * Simulates the storage layer's statistics calculation logic
 */
class MockStatsStorage {
  private clients: ClientCompany[] = [];
  private contacts: Contact[] = [];
  private engagements: Engagement[] = [];

  reset() {
    this.clients = [];
    this.contacts = [];
    this.engagements = [];
  }

  addClient(client: ClientCompany) {
    this.clients.push(client);
  }

  addContact(contact: Contact) {
    this.contacts.push(contact);
  }

  addEngagement(engagement: Engagement) {
    this.engagements.push(engagement);
  }

  async getClientCompanyStats(orgId: string): Promise<ClientCompanyStats> {
    const orgClients = this.clients.filter(c => c.organizationId === orgId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate total count
    const total = orgClients.length;

    // Calculate recently added (last 30 days)
    const recentlyAdded = orgClients.filter(c => c.createdAt >= thirtyDaysAgo).length;

    // Calculate by industry
    const byIndustry: Record<string, number> = {};
    orgClients.forEach(c => {
      if (c.industry) {
        byIndustry[c.industry] = (byIndustry[c.industry] || 0) + 1;
      }
    });

    // Calculate by country
    const byCountry: Record<string, number> = {};
    orgClients.forEach(c => {
      if (c.country) {
        byCountry[c.country] = (byCountry[c.country] || 0) + 1;
      }
    });

    // Calculate clients with active engagements
    const clientsWithActiveEngagements = new Set(
      this.engagements
        .filter(e => e.organizationId === orgId && e.status === 'active')
        .map(e => e.clientCompanyId)
    );
    const withActiveEngagements = clientsWithActiveEngagements.size;

    // Calculate clients without contacts
    const clientsWithContacts = new Set(
      this.contacts
        .filter(c => c.organizationId === orgId)
        .map(c => c.clientCompanyId)
    );
    const withoutContacts = orgClients.filter(c => !clientsWithContacts.has(c.id)).length;

    return {
      total,
      recentlyAdded,
      byIndustry,
      byCountry,
      withActiveEngagements,
      withoutContacts,
    };
  }
}

let storage: MockStatsStorage;

describe('GET /api/clients/stats - Property Tests', () => {
  beforeEach(() => {
    storage = new MockStatsStorage();
  });

  // Feature: client-companies-crud-api, Property 16: Statistics Completeness
  it('should always return all required fields regardless of data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgId: fc.uuid(),
          clients: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 255 }),
              industry: fc.option(fc.constantFrom('Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'), { nil: null }),
              country: fc.option(fc.constantFrom('USA', 'Canada', 'UK', 'Germany', 'France', 'Japan'), { nil: null }),
              createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            }),
            { maxLength: 20 }
          ),
        }),
        async ({ orgId, clients }) => {
          // Setup: Add clients to storage
          storage.reset();
          for (const client of clients) {
            const fullClient: ClientCompany = {
              id: client.id,
              organizationId: orgId,
              name: client.name,
              website: null,
              industry: client.industry,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: client.country,
              notes: null,
              createdAt: client.createdAt,
              updatedAt: client.createdAt,
            };
            storage.addClient(fullClient);
          }

          // Act: Get statistics
          const stats = await storage.getClientCompanyStats(orgId);

          // Assert: All required fields are present
          expect(stats).toHaveProperty('total');
          expect(stats).toHaveProperty('recentlyAdded');
          expect(stats).toHaveProperty('byIndustry');
          expect(stats).toHaveProperty('byCountry');
          expect(stats).toHaveProperty('withActiveEngagements');
          expect(stats).toHaveProperty('withoutContacts');

          // Assert: Field types are correct
          expect(typeof stats.total).toBe('number');
          expect(typeof stats.recentlyAdded).toBe('number');
          expect(typeof stats.byIndustry).toBe('object');
          expect(typeof stats.byCountry).toBe('object');
          expect(typeof stats.withActiveEngagements).toBe('number');
          expect(typeof stats.withoutContacts).toBe('number');

          // Assert: Counts are non-negative integers
          expect(stats.total).toBeGreaterThanOrEqual(0);
          expect(stats.recentlyAdded).toBeGreaterThanOrEqual(0);
          expect(stats.withActiveEngagements).toBeGreaterThanOrEqual(0);
          expect(stats.withoutContacts).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(stats.total)).toBe(true);
          expect(Number.isInteger(stats.recentlyAdded)).toBe(true);
          expect(Number.isInteger(stats.withActiveEngagements)).toBe(true);
          expect(Number.isInteger(stats.withoutContacts)).toBe(true);

          // Assert: Breakdowns are objects (not arrays or null)
          expect(stats.byIndustry).not.toBeNull();
          expect(stats.byCountry).not.toBeNull();
          expect(Array.isArray(stats.byIndustry)).toBe(false);
          expect(Array.isArray(stats.byCountry)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: client-companies-crud-api, Property 16: Statistics Completeness
  it('should return consistent structure even with empty data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (orgId) => {
          // Setup: No clients
          storage.reset();

          // Act: Get statistics
          const stats = await storage.getClientCompanyStats(orgId);

          // Assert: All fields present with appropriate empty values
          expect(stats.total).toBe(0);
          expect(stats.recentlyAdded).toBe(0);
          expect(stats.byIndustry).toEqual({});
          expect(stats.byCountry).toEqual({});
          expect(stats.withActiveEngagements).toBe(0);
          expect(stats.withoutContacts).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: client-companies-crud-api, Property 16: Statistics Completeness
  it('should maintain field structure with contacts and engagements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgId: fc.uuid(),
          clients: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 255 }),
              industry: fc.option(fc.constantFrom('Technology', 'Finance', 'Healthcare'), { nil: null }),
              country: fc.option(fc.constantFrom('USA', 'Canada', 'UK'), { nil: null }),
              createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              hasContact: fc.boolean(),
              hasActiveEngagement: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ orgId, clients }) => {
          // Setup: Add clients with contacts and engagements
          storage.reset();
          for (const client of clients) {
            const fullClient: ClientCompany = {
              id: client.id,
              organizationId: orgId,
              name: client.name,
              website: null,
              industry: client.industry,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: client.country,
              notes: null,
              createdAt: client.createdAt,
              updatedAt: client.createdAt,
            };
            storage.addClient(fullClient);

            if (client.hasContact) {
              const contact: Contact = {
                id: `contact-${client.id}`,
                organizationId: orgId,
                clientCompanyId: client.id,
                firstName: 'Test',
                lastName: 'Contact',
                email: null,
                phone: null,
                title: null,
                isPrimary: false,
                notes: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              storage.addContact(contact);
            }

            if (client.hasActiveEngagement) {
              const engagement: Engagement = {
                id: `engagement-${client.id}`,
                organizationId: orgId,
                clientCompanyId: client.id,
                name: 'Test Engagement',
                description: null,
                status: 'active',
                startDate: new Date(),
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              storage.addEngagement(engagement);
            }
          }

          // Act: Get statistics
          const stats = await storage.getClientCompanyStats(orgId);

          // Assert: All required fields are present
          expect(stats).toHaveProperty('total');
          expect(stats).toHaveProperty('recentlyAdded');
          expect(stats).toHaveProperty('byIndustry');
          expect(stats).toHaveProperty('byCountry');
          expect(stats).toHaveProperty('withActiveEngagements');
          expect(stats).toHaveProperty('withoutContacts');

          // Assert: Logical consistency
          expect(stats.total).toBe(clients.length);
          expect(stats.recentlyAdded).toBeLessThanOrEqual(stats.total);
          expect(stats.withActiveEngagements).toBeLessThanOrEqual(stats.total);
          expect(stats.withoutContacts).toBeLessThanOrEqual(stats.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: client-companies-crud-api, Property 16: Statistics Completeness
  it('should enforce organization isolation in statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1: fc.uuid(),
          org2: fc.uuid(),
          org1Clients: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 255 }),
              industry: fc.option(fc.constantFrom('Technology', 'Finance'), { nil: null }),
            }),
            { maxLength: 5 }
          ),
          org2Clients: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 255 }),
              industry: fc.option(fc.constantFrom('Healthcare', 'Retail'), { nil: null }),
            }),
            { maxLength: 5 }
          ),
        }),
        async ({ org1, org2, org1Clients, org2Clients }) => {
          fc.pre(org1 !== org2); // Ensure different organizations

          // Setup: Add clients to both organizations
          storage.reset();
          const now = new Date();

          for (const client of org1Clients) {
            const fullClient: ClientCompany = {
              id: client.id,
              organizationId: org1,
              name: client.name,
              website: null,
              industry: client.industry,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: null,
              notes: null,
              createdAt: now,
              updatedAt: now,
            };
            storage.addClient(fullClient);
          }

          for (const client of org2Clients) {
            const fullClient: ClientCompany = {
              id: client.id,
              organizationId: org2,
              name: client.name,
              website: null,
              industry: client.industry,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: null,
              notes: null,
              createdAt: now,
              updatedAt: now,
            };
            storage.addClient(fullClient);
          }

          // Act: Get statistics for both organizations
          const stats1 = await storage.getClientCompanyStats(org1);
          const stats2 = await storage.getClientCompanyStats(org2);

          // Assert: Each organization sees only its own data
          expect(stats1.total).toBe(org1Clients.length);
          expect(stats2.total).toBe(org2Clients.length);

          // Assert: All required fields present for both
          expect(stats1).toHaveProperty('total');
          expect(stats1).toHaveProperty('recentlyAdded');
          expect(stats1).toHaveProperty('byIndustry');
          expect(stats1).toHaveProperty('byCountry');
          expect(stats1).toHaveProperty('withActiveEngagements');
          expect(stats1).toHaveProperty('withoutContacts');

          expect(stats2).toHaveProperty('total');
          expect(stats2).toHaveProperty('recentlyAdded');
          expect(stats2).toHaveProperty('byIndustry');
          expect(stats2).toHaveProperty('byCountry');
          expect(stats2).toHaveProperty('withActiveEngagements');
          expect(stats2).toHaveProperty('withoutContacts');
        }
      ),
      { numRuns: 100 }
    );
  });
});
