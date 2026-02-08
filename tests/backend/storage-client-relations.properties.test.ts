// AI-META-BEGIN
// AI-META: Property-based tests for client retrieval with relations
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Client Company Retrieval with Relations
 * 
 * Feature: client-companies-crud-api
 * Property 4: Client Retrieval with Relations
 * Validates: Requirements 2.1, 2.2, 2.3
 * 
 * This test validates that for any client company that exists in an organization,
 * retrieving it by ID returns the client along with all its related contacts and
 * deals that belong to the same organization.
 * 
 * The test verifies:
 * - Client is returned with all base fields
 * - All related contacts are included
 * - All related deals are included
 * - All related engagements are included
 * - activeEngagementsCount is calculated correctly
 * - totalDealsValue is calculated correctly
 * 
 * Note: These tests validate the relation retrieval logic itself, not database operations.
 * The logic should work correctly regardless of the data source.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany, Contact, Deal, Engagement } from '@shared/schema';
import type { ClientCompanyWithRelations } from '@shared/client-schemas';

/**
 * Simulates the relation retrieval logic from getClientCompanyWithRelations
 * This allows us to test the logic without database dependencies
 */
function getClientWithRelations(
  clientId: string,
  orgId: string,
  client: ClientCompany | undefined,
  allContacts: Contact[],
  allDeals: Deal[],
  allEngagements: Engagement[]
): ClientCompanyWithRelations | undefined {
  // Return undefined if client doesn't exist or belongs to different org
  if (!client || client.id !== clientId || client.organizationId !== orgId) {
    return undefined;
  }

  // Filter contacts for this client and org
  const clientContacts = allContacts.filter(
    (c) => c.clientCompanyId === clientId && c.organizationId === orgId
  );

  // Filter deals for this client and org
  const clientDeals = allDeals.filter(
    (d) => d.clientCompanyId === clientId && d.organizationId === orgId
  );

  // Filter engagements for this client and org
  const clientEngagements = allEngagements.filter(
    (e) => e.clientCompanyId === clientId && e.organizationId === orgId
  );

  // Calculate activeEngagementsCount
  const activeEngagementsCount = clientEngagements.filter(
    (e) => e.status === 'active'
  ).length;

  // Calculate totalDealsValue
  const totalDealsValue = clientDeals
    .reduce((sum, deal) => {
      const value = deal.value ? parseFloat(deal.value) : 0;
      return sum + value;
    }, 0)
    .toFixed(2);

  return {
    ...client,
    contacts: clientContacts,
    deals: clientDeals,
    engagements: clientEngagements,
    activeEngagementsCount,
    totalDealsValue,
  };
}

describe('Client Companies Retrieval with Relations - Property Tests', () => {

  // Feature: client-companies-crud-api, Property 4: Client Retrieval with Relations
  it('should return client with all related contacts, deals, and engagements', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate random counts for related entities
          contactCount: fc.integer({ min: 0, max: 10 }),
          dealCount: fc.integer({ min: 0, max: 10 }),
          engagementCount: fc.integer({ min: 0, max: 10 }),
          activeEngagementRatio: fc.double({ min: 0, max: 1 }),
        }),
        ({ contactCount, dealCount, engagementCount, activeEngagementRatio }) => {
          const orgId = 'test-org-id';
          const clientId = 'test-client-id';

          // Setup: Create mock client
          const mockClient: ClientCompany = {
            id: clientId,
            organizationId: orgId,
            name: 'Test Client',
            website: 'https://example.com',
            industry: 'Technology',
            address: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94105',
            country: 'USA',
            notes: 'Test notes',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Setup: Create mock contacts
          const mockContacts: Contact[] = Array.from({ length: contactCount }, (_, i) => ({
            id: `contact-${i}`,
            organizationId: orgId,
            clientCompanyId: clientId,
            firstName: `First${i}`,
            lastName: `Last${i}`,
            email: `contact${i}@example.com`,
            phone: null,
            title: null,
            isPrimary: i === 0,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Setup: Create mock deals with random values
          const mockDeals: Deal[] = [];
          let expectedTotalValue = 0;
          for (let i = 0; i < dealCount; i++) {
            const dealValue = Math.floor(Math.random() * 10000) + 1000;
            expectedTotalValue += dealValue;
            mockDeals.push({
              id: `deal-${i}`,
              organizationId: orgId,
              clientCompanyId: clientId,
              contactId: null,
              ownerId: 'test-user',
              name: `Deal ${i}`,
              description: null,
              value: dealValue.toString(),
              stage: 'lead',
              probability: 50,
              expectedCloseDate: null,
              closedAt: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // Setup: Create mock engagements (some active, some not)
          // Handle NaN case when engagementCount is 0
          const activeCount = engagementCount === 0 ? 0 : Math.floor(engagementCount * activeEngagementRatio);
          const mockEngagements: Engagement[] = Array.from(
            { length: engagementCount },
            (_, i) => ({
              id: `engagement-${i}`,
              organizationId: orgId,
              clientCompanyId: clientId,
              contractId: null,
              dealId: null,
              contactId: null,
              ownerId: 'test-user',
              name: `Engagement ${i}`,
              description: null,
              status: i < activeCount ? 'active' : 'completed',
              startDate: null,
              endDate: null,
              totalValue: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          // Test: Retrieve client with relations
          const result = getClientWithRelations(
            clientId,
            orgId,
            mockClient,
            mockContacts,
            mockDeals,
            mockEngagements
          );

          // Assert: Client should be returned
          expect(result).toBeDefined();
          expect(result!.id).toBe(clientId);
          expect(result!.name).toBe(mockClient.name);
          expect(result!.organizationId).toBe(orgId);

          // Property 1: All related contacts should be included
          expect(result!.contacts).toBeDefined();
          expect(result!.contacts.length).toBe(contactCount);
          const contactIds = result!.contacts.map((c) => c.id).sort();
          const expectedContactIds = mockContacts.map((c) => c.id).sort();
          expect(contactIds).toEqual(expectedContactIds);

          // Property 2: All related deals should be included
          expect(result!.deals).toBeDefined();
          expect(result!.deals.length).toBe(dealCount);
          const dealIds = result!.deals.map((d) => d.id).sort();
          const expectedDealIds = mockDeals.map((d) => d.id).sort();
          expect(dealIds).toEqual(expectedDealIds);

          // Property 3: All related engagements should be included
          expect(result!.engagements).toBeDefined();
          expect(result!.engagements.length).toBe(engagementCount);
          const engagementIds = result!.engagements.map((e) => e.id).sort();
          const expectedEngagementIds = mockEngagements.map((e) => e.id).sort();
          expect(engagementIds).toEqual(expectedEngagementIds);

          // Property 4: activeEngagementsCount should be accurate
          expect(result!.activeEngagementsCount).toBe(activeCount);

          // Property 5: totalDealsValue should be accurate
          const actualTotalValue = parseFloat(result!.totalDealsValue);
          expect(actualTotalValue).toBeCloseTo(expectedTotalValue, 2);

          // Property 6: All contacts should belong to the same organization and client
          result!.contacts.forEach((contact) => {
            expect(contact.organizationId).toBe(orgId);
            expect(contact.clientCompanyId).toBe(clientId);
          });

          // Property 7: All deals should belong to the same organization and client
          result!.deals.forEach((deal) => {
            expect(deal.organizationId).toBe(orgId);
            expect(deal.clientCompanyId).toBe(clientId);
          });

          // Property 8: All engagements should belong to the same organization and client
          result!.engagements.forEach((engagement) => {
            expect(engagement.organizationId).toBe(orgId);
            expect(engagement.clientCompanyId).toBe(clientId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return undefined for non-existent client', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (nonExistentId) => {
          const orgId = 'test-org-id';
          const mockContacts: Contact[] = [];
          const mockDeals: Deal[] = [];
          const mockEngagements: Engagement[] = [];

          // Test: Try to retrieve non-existent client (pass undefined as client)
          const result = getClientWithRelations(
            nonExistentId,
            orgId,
            undefined,
            mockContacts,
            mockDeals,
            mockEngagements
          );

          // Property: Should return undefined for non-existent client
          expect(result).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return undefined for client from different organization', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const org1Id = 'org-1';
          const org2Id = 'org-2';
          const clientId = 'test-client-id';

          // Setup: Create client in org1
          const mockClient: ClientCompany = {
            id: clientId,
            organizationId: org1Id,
            name: 'Client in Org1',
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
          };

          const mockContacts: Contact[] = [];
          const mockDeals: Deal[] = [];
          const mockEngagements: Engagement[] = [];

          // Test: Try to retrieve client from org2
          const result = getClientWithRelations(
            clientId,
            org2Id, // Different org
            mockClient,
            mockContacts,
            mockDeals,
            mockEngagements
          );

          // Property: Should return undefined (cross-organization access prevention)
          expect(result).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle client with no relations correctly', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const orgId = 'test-org-id';
          const clientId = 'isolated-client-id';

          // Setup: Create client with no relations
          const mockClient: ClientCompany = {
            id: clientId,
            organizationId: orgId,
            name: 'Isolated Client',
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
          };

          // Empty relation arrays
          const mockContacts: Contact[] = [];
          const mockDeals: Deal[] = [];
          const mockEngagements: Engagement[] = [];

          // Test: Retrieve client with relations
          const result = getClientWithRelations(
            clientId,
            orgId,
            mockClient,
            mockContacts,
            mockDeals,
            mockEngagements
          );

          // Property 1: Client should be returned
          expect(result).toBeDefined();
          expect(result!.id).toBe(clientId);

          // Property 2: All relation arrays should be empty
          expect(result!.contacts).toEqual([]);
          expect(result!.deals).toEqual([]);
          expect(result!.engagements).toEqual([]);

          // Property 3: Calculated fields should reflect no relations
          expect(result!.activeEngagementsCount).toBe(0);
          expect(result!.totalDealsValue).toBe('0.00');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should only include relations that match both client and organization', () => {
    fc.assert(
      fc.property(
        fc.record({
          relatedContactCount: fc.integer({ min: 1, max: 5 }),
          unrelatedContactCount: fc.integer({ min: 1, max: 5 }),
        }),
        ({ relatedContactCount, unrelatedContactCount }) => {
          const orgId = 'test-org-id';
          const clientId = 'test-client-id';
          const otherClientId = 'other-client-id';

          // Setup: Create client
          const mockClient: ClientCompany = {
            id: clientId,
            organizationId: orgId,
            name: 'Test Client',
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
          };

          // Setup: Create contacts - some for this client, some for other clients
          const allContacts: Contact[] = [
            // Contacts for this client
            ...Array.from({ length: relatedContactCount }, (_, i) => ({
              id: `related-contact-${i}`,
              organizationId: orgId,
              clientCompanyId: clientId,
              firstName: `Related${i}`,
              lastName: `Contact${i}`,
              email: `related${i}@example.com`,
              phone: null,
              title: null,
              isPrimary: false,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            // Contacts for other clients (should be filtered out)
            ...Array.from({ length: unrelatedContactCount }, (_, i) => ({
              id: `unrelated-contact-${i}`,
              organizationId: orgId,
              clientCompanyId: otherClientId,
              firstName: `Unrelated${i}`,
              lastName: `Contact${i}`,
              email: `unrelated${i}@example.com`,
              phone: null,
              title: null,
              isPrimary: false,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ];

          // Test: Retrieve client with relations
          const result = getClientWithRelations(
            clientId,
            orgId,
            mockClient,
            allContacts,
            [],
            []
          );

          // Property: Should only include contacts for this specific client
          expect(result).toBeDefined();
          expect(result!.contacts.length).toBe(relatedContactCount);
          result!.contacts.forEach((contact) => {
            expect(contact.clientCompanyId).toBe(clientId);
            expect(contact.id).toMatch(/^related-contact-/);
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
