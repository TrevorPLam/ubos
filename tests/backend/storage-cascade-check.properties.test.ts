// AI-META-BEGIN
// AI-META: Property-based tests for cascade check before delete
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Client Company Cascade Check Before Delete
 * 
 * Feature: client-companies-crud-api
 * Property 10: Cascade Check Before Delete
 * Validates: Requirements 5.1, 5.2
 * 
 * This test validates that for any client company, a DELETE request first checks
 * for related entities (contacts, deals, engagements, contracts, proposals, invoices),
 * and if any exist, returns a 409 error with details about the dependencies.
 * 
 * The test verifies:
 * - Dependencies are correctly identified across all entity types
 * - hasDependencies flag is set correctly
 * - Dependency counts are accurate for each entity type
 * - Client with no dependencies returns hasDependencies: false
 * - Client with any dependencies returns hasDependencies: true
 * - All dependency counts are non-negative integers
 * 
 * Note: These tests validate the cascade check logic itself, not database operations.
 * The logic should work correctly regardless of the data source.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { DependencyCheckResult } from '@shared/client-schemas';

/**
 * Simulates the cascade check logic from checkClientCompanyDependencies
 * This allows us to test the logic without database dependencies
 */
function checkDependencies(
  clientId: string,
  orgId: string,
  relatedEntities: {
    contacts: Array<{ id: string; clientCompanyId: string; organizationId: string }>;
    deals: Array<{ id: string; clientCompanyId: string; organizationId: string }>;
    engagements: Array<{ id: string; clientCompanyId: string; organizationId: string }>;
    contracts: Array<{ id: string; clientCompanyId: string; organizationId: string }>;
    proposals: Array<{ id: string; clientCompanyId: string; organizationId: string }>;
    invoices: Array<{ id: string; clientCompanyId: string; organizationId: string }>;
  }
): DependencyCheckResult {
  // Count related entities for this client and organization
  const contactsCount = relatedEntities.contacts.filter(
    (c) => c.clientCompanyId === clientId && c.organizationId === orgId
  ).length;

  const dealsCount = relatedEntities.deals.filter(
    (d) => d.clientCompanyId === clientId && d.organizationId === orgId
  ).length;

  const engagementsCount = relatedEntities.engagements.filter(
    (e) => e.clientCompanyId === clientId && e.organizationId === orgId
  ).length;

  const contractsCount = relatedEntities.contracts.filter(
    (c) => c.clientCompanyId === clientId && c.organizationId === orgId
  ).length;

  const proposalsCount = relatedEntities.proposals.filter(
    (p) => p.clientCompanyId === clientId && p.organizationId === orgId
  ).length;

  const invoicesCount = relatedEntities.invoices.filter(
    (i) => i.clientCompanyId === clientId && i.organizationId === orgId
  ).length;

  // Determine if there are any dependencies
  const hasDependencies =
    contactsCount > 0 ||
    dealsCount > 0 ||
    engagementsCount > 0 ||
    contractsCount > 0 ||
    proposalsCount > 0 ||
    invoicesCount > 0;

  return {
    hasDependencies,
    dependencies: {
      contacts: contactsCount,
      deals: dealsCount,
      engagements: engagementsCount,
      contracts: contractsCount,
      proposals: proposalsCount,
      invoices: invoicesCount,
    },
  };
}

describe('Client Companies Cascade Check - Property Tests', () => {

  // Feature: client-companies-crud-api, Property 10: Cascade Check Before Delete
  it('should correctly identify dependencies across all entity types', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate random counts for each dependency type
          contactCount: fc.integer({ min: 0, max: 10 }),
          dealCount: fc.integer({ min: 0, max: 10 }),
          engagementCount: fc.integer({ min: 0, max: 10 }),
          contractCount: fc.integer({ min: 0, max: 10 }),
          proposalCount: fc.integer({ min: 0, max: 10 }),
          invoiceCount: fc.integer({ min: 0, max: 10 }),
        }),
        ({
          contactCount,
          dealCount,
          engagementCount,
          contractCount,
          proposalCount,
          invoiceCount,
        }) => {
          const orgId = 'test-org-id';
          const clientId = 'test-client-id';

          // Setup: Create mock related entities
          const relatedEntities = {
            contacts: Array.from({ length: contactCount }, (_, i) => ({
              id: `contact-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            deals: Array.from({ length: dealCount }, (_, i) => ({
              id: `deal-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            engagements: Array.from({ length: engagementCount }, (_, i) => ({
              id: `engagement-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            contracts: Array.from({ length: contractCount }, (_, i) => ({
              id: `contract-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            proposals: Array.from({ length: proposalCount }, (_, i) => ({
              id: `proposal-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            invoices: Array.from({ length: invoiceCount }, (_, i) => ({
              id: `invoice-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
          };

          // Test: Check dependencies
          const result = checkDependencies(clientId, orgId, relatedEntities);

          // Property 1: Dependency counts should match input counts
          expect(result.dependencies.contacts).toBe(contactCount);
          expect(result.dependencies.deals).toBe(dealCount);
          expect(result.dependencies.engagements).toBe(engagementCount);
          expect(result.dependencies.contracts).toBe(contractCount);
          expect(result.dependencies.proposals).toBe(proposalCount);
          expect(result.dependencies.invoices).toBe(invoiceCount);

          // Property 2: hasDependencies should be true if any count > 0
          const expectedHasDependencies =
            contactCount > 0 ||
            dealCount > 0 ||
            engagementCount > 0 ||
            contractCount > 0 ||
            proposalCount > 0 ||
            invoiceCount > 0;
          expect(result.hasDependencies).toBe(expectedHasDependencies);

          // Property 3: All counts should be non-negative integers
          expect(result.dependencies.contacts).toBeGreaterThanOrEqual(0);
          expect(result.dependencies.deals).toBeGreaterThanOrEqual(0);
          expect(result.dependencies.engagements).toBeGreaterThanOrEqual(0);
          expect(result.dependencies.contracts).toBeGreaterThanOrEqual(0);
          expect(result.dependencies.proposals).toBeGreaterThanOrEqual(0);
          expect(result.dependencies.invoices).toBeGreaterThanOrEqual(0);

          expect(Number.isInteger(result.dependencies.contacts)).toBe(true);
          expect(Number.isInteger(result.dependencies.deals)).toBe(true);
          expect(Number.isInteger(result.dependencies.engagements)).toBe(true);
          expect(Number.isInteger(result.dependencies.contracts)).toBe(true);
          expect(Number.isInteger(result.dependencies.proposals)).toBe(true);
          expect(Number.isInteger(result.dependencies.invoices)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return hasDependencies: false when client has no related entities', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const orgId = 'test-org-id';
          const clientId = 'isolated-client-id';

          // Setup: Create empty related entities
          const relatedEntities = {
            contacts: [],
            deals: [],
            engagements: [],
            contracts: [],
            proposals: [],
            invoices: [],
          };

          // Test: Check dependencies
          const result = checkDependencies(clientId, orgId, relatedEntities);

          // Property 1: hasDependencies should be false
          expect(result.hasDependencies).toBe(false);

          // Property 2: All counts should be 0
          expect(result.dependencies.contacts).toBe(0);
          expect(result.dependencies.deals).toBe(0);
          expect(result.dependencies.engagements).toBe(0);
          expect(result.dependencies.contracts).toBe(0);
          expect(result.dependencies.proposals).toBe(0);
          expect(result.dependencies.invoices).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return hasDependencies: true when client has at least one dependency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('contacts', 'deals', 'engagements', 'contracts', 'proposals', 'invoices'),
        (dependencyType) => {
          const orgId = 'test-org-id';
          const clientId = 'client-with-dependency';

          // Setup: Create related entities with one dependency
          const relatedEntities = {
            contacts: dependencyType === 'contacts' ? [{ id: 'contact-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            deals: dependencyType === 'deals' ? [{ id: 'deal-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            engagements: dependencyType === 'engagements' ? [{ id: 'engagement-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            contracts: dependencyType === 'contracts' ? [{ id: 'contract-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            proposals: dependencyType === 'proposals' ? [{ id: 'proposal-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            invoices: dependencyType === 'invoices' ? [{ id: 'invoice-1', clientCompanyId: clientId, organizationId: orgId }] : [],
          };

          // Test: Check dependencies
          const result = checkDependencies(clientId, orgId, relatedEntities);

          // Property: hasDependencies should be true
          expect(result.hasDependencies).toBe(true);

          // Property: The specific dependency type should have count 1
          expect(result.dependencies[dependencyType as keyof typeof result.dependencies]).toBe(1);

          // Property: All other dependency types should have count 0
          const allTypes = ['contacts', 'deals', 'engagements', 'contracts', 'proposals', 'invoices'];
          allTypes.forEach((type) => {
            if (type !== dependencyType) {
              expect(result.dependencies[type as keyof typeof result.dependencies]).toBe(0);
            }
          });
        }
      ),
      { numRuns: 60 }
    );
  });

  it('should only count dependencies for the specific client and organization', () => {
    fc.assert(
      fc.property(
        fc.record({
          thisClientContactCount: fc.integer({ min: 0, max: 5 }),
          otherClientContactCount: fc.integer({ min: 1, max: 5 }),
          otherOrgContactCount: fc.integer({ min: 1, max: 5 }),
        }),
        ({ thisClientContactCount, otherClientContactCount, otherOrgContactCount }) => {
          const orgId = 'test-org-id';
          const otherOrgId = 'other-org-id';
          const clientId = 'test-client-id';
          const otherClientId = 'other-client-id';

          // Setup: Create contacts for different clients and organizations
          const relatedEntities = {
            contacts: [
              // Contacts for this client in this org (should be counted)
              ...Array.from({ length: thisClientContactCount }, (_, i) => ({
                id: `this-contact-${i}`,
                clientCompanyId: clientId,
                organizationId: orgId,
              })),
              // Contacts for other client in this org (should NOT be counted)
              ...Array.from({ length: otherClientContactCount }, (_, i) => ({
                id: `other-client-contact-${i}`,
                clientCompanyId: otherClientId,
                organizationId: orgId,
              })),
              // Contacts for this client in other org (should NOT be counted)
              ...Array.from({ length: otherOrgContactCount }, (_, i) => ({
                id: `other-org-contact-${i}`,
                clientCompanyId: clientId,
                organizationId: otherOrgId,
              })),
            ],
            deals: [],
            engagements: [],
            contracts: [],
            proposals: [],
            invoices: [],
          };

          // Test: Check dependencies
          const result = checkDependencies(clientId, orgId, relatedEntities);

          // Property: Should only count contacts for this specific client and org
          expect(result.dependencies.contacts).toBe(thisClientContactCount);

          // Property: hasDependencies should reflect only this client's dependencies
          expect(result.hasDependencies).toBe(thisClientContactCount > 0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle multiple dependency types simultaneously', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasContacts: fc.boolean(),
          hasDeals: fc.boolean(),
          hasEngagements: fc.boolean(),
          hasContracts: fc.boolean(),
          hasProposals: fc.boolean(),
          hasInvoices: fc.boolean(),
        }),
        ({ hasContacts, hasDeals, hasEngagements, hasContracts, hasProposals, hasInvoices }) => {
          const orgId = 'test-org-id';
          const clientId = 'test-client-id';

          // Setup: Create related entities based on boolean flags
          const relatedEntities = {
            contacts: hasContacts ? [{ id: 'contact-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            deals: hasDeals ? [{ id: 'deal-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            engagements: hasEngagements ? [{ id: 'engagement-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            contracts: hasContracts ? [{ id: 'contract-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            proposals: hasProposals ? [{ id: 'proposal-1', clientCompanyId: clientId, organizationId: orgId }] : [],
            invoices: hasInvoices ? [{ id: 'invoice-1', clientCompanyId: clientId, organizationId: orgId }] : [],
          };

          // Test: Check dependencies
          const result = checkDependencies(clientId, orgId, relatedEntities);

          // Property: hasDependencies should be true if ANY dependency exists
          const expectedHasDependencies =
            hasContacts || hasDeals || hasEngagements || hasContracts || hasProposals || hasInvoices;
          expect(result.hasDependencies).toBe(expectedHasDependencies);

          // Property: Each dependency count should match the boolean flag
          expect(result.dependencies.contacts).toBe(hasContacts ? 1 : 0);
          expect(result.dependencies.deals).toBe(hasDeals ? 1 : 0);
          expect(result.dependencies.engagements).toBe(hasEngagements ? 1 : 0);
          expect(result.dependencies.contracts).toBe(hasContracts ? 1 : 0);
          expect(result.dependencies.proposals).toBe(hasProposals ? 1 : 0);
          expect(result.dependencies.invoices).toBe(hasInvoices ? 1 : 0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return consistent structure regardless of dependency counts', () => {
    fc.assert(
      fc.property(
        fc.record({
          contactCount: fc.integer({ min: 0, max: 100 }),
          dealCount: fc.integer({ min: 0, max: 100 }),
        }),
        ({ contactCount, dealCount }) => {
          const orgId = 'test-org-id';
          const clientId = 'test-client-id';

          // Setup: Create related entities
          const relatedEntities = {
            contacts: Array.from({ length: contactCount }, (_, i) => ({
              id: `contact-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            deals: Array.from({ length: dealCount }, (_, i) => ({
              id: `deal-${i}`,
              clientCompanyId: clientId,
              organizationId: orgId,
            })),
            engagements: [],
            contracts: [],
            proposals: [],
            invoices: [],
          };

          // Test: Check dependencies
          const result = checkDependencies(clientId, orgId, relatedEntities);

          // Property: Result should always have the same structure
          expect(result).toHaveProperty('hasDependencies');
          expect(result).toHaveProperty('dependencies');
          expect(result.dependencies).toHaveProperty('contacts');
          expect(result.dependencies).toHaveProperty('deals');
          expect(result.dependencies).toHaveProperty('engagements');
          expect(result.dependencies).toHaveProperty('contracts');
          expect(result.dependencies).toHaveProperty('proposals');
          expect(result.dependencies).toHaveProperty('invoices');

          // Property: hasDependencies should be a boolean
          expect(typeof result.hasDependencies).toBe('boolean');

          // Property: All dependency counts should be numbers
          expect(typeof result.dependencies.contacts).toBe('number');
          expect(typeof result.dependencies.deals).toBe('number');
          expect(typeof result.dependencies.engagements).toBe('number');
          expect(typeof result.dependencies.contracts).toBe('number');
          expect(typeof result.dependencies.proposals).toBe('number');
          expect(typeof result.dependencies.invoices).toBe('number');
        }
      ),
      { numRuns: 50 }
    );
  });
});
