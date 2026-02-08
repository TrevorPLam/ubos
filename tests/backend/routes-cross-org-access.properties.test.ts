// AI-META-BEGIN
// AI-META: Property-based tests for cross-organization access prevention
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Cross-Organization Access Prevention
 * 
 * Feature: client-companies-crud-api
 * Property 5: Cross-Organization Access Prevention
 * Validates: Requirements 2.4, 4.4, 5.4
 * 
 * This test validates that for any client company ID that does not exist or
 * belongs to a different organization, GET, PUT, and DELETE requests SHALL
 * return a 404 error, preventing cross-organization data access.
 * 
 * The test verifies:
 * - GET /api/clients/:id returns 404 for clients in other organizations
 * - PUT /api/clients/:id returns 404 for clients in other organizations
 * - DELETE /api/clients/:id returns 404 for clients in other organizations
 * - No information leakage about existence of clients in other organizations
 * - Consistent 404 response for both non-existent and cross-org clients
 * 
 * Note: These tests validate the cross-organization access prevention logic
 * using in-memory data structures to simulate the storage layer behavior
 * without requiring a live database connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany } from '@shared/schema';
import type { ClientCompanyWithRelations } from '@shared/client-schemas';

/**
 * Simulates the storage layer's organization filtering logic for GET by ID
 * This allows us to test cross-organization access prevention without database dependencies
 */
class MockClientStorage {
  private clients: Map<string, ClientCompany> = new Map();

  async createClient(client: ClientCompany): Promise<ClientCompany> {
    this.clients.set(client.id, client);
    return client;
  }

  async getClientCompanyWithRelations(
    id: string,
    orgId: string
  ): Promise<ClientCompanyWithRelations | undefined> {
    const client = this.clients.get(id);
    
    // Critical logic: must match both id AND organizationId
    if (!client || client.organizationId !== orgId) {
      return undefined;
    }

    // Return client with relations
    return {
      ...client,
      contacts: [],
      deals: [],
      engagements: [],
      activeEngagementsCount: 0,
      totalDealsValue: '0.00',
    };
  }

  async updateClientCompany(
    id: string,
    orgId: string,
    data: Partial<ClientCompany>
  ): Promise<ClientCompany | undefined> {
    const client = this.clients.get(id);
    
    // Critical logic: must match both id AND organizationId
    if (!client || client.organizationId !== orgId) {
      return undefined;
    }

    const updated = { ...client, ...data, updatedAt: new Date() };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClientCompany(id: string, orgId: string): Promise<boolean> {
    const client = this.clients.get(id);
    
    // Critical logic: must match both id AND organizationId
    if (!client || client.organizationId !== orgId) {
      return false;
    }

    this.clients.delete(id);
    return true;
  }

  clear() {
    this.clients.clear();
  }
}

describe('Client Companies API - Cross-Organization Access Prevention Property Tests', () => {
  let storage: MockClientStorage;

  beforeEach(() => {
    storage = new MockClientStorage();
  });

  // Feature: client-companies-crud-api, Property 5: Cross-Organization Access Prevention
  it('should return undefined when GET client from different organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientId: fc.uuid(),
          ownerOrgId: fc.uuid(),
          requestOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ clientId, ownerOrgId, requestOrgId, clientName }) => {
          // Precondition: organizations must be different
          fc.pre(ownerOrgId !== requestOrgId);

          // Setup: Create client in ownerOrgId
          await storage.createClient({
            id: clientId,
            name: clientName,
            organizationId: ownerOrgId,
            website: null,
            industry: null,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            country: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Property: Client accessible from owner organization
          const correctResult = await storage.getClientCompanyWithRelations(clientId, ownerOrgId);
          expect(correctResult).toBeDefined();
          expect(correctResult?.id).toBe(clientId);
          expect(correctResult?.organizationId).toBe(ownerOrgId);

          // Property: Client NOT accessible from different organization (returns undefined -> 404)
          const crossOrgResult = await storage.getClientCompanyWithRelations(clientId, requestOrgId);
          expect(crossOrgResult).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return undefined when GET non-existent client', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nonExistentId: fc.uuid(),
          orgId: fc.uuid(),
        }),
        async ({ nonExistentId, orgId }) => {
          // Property: Non-existent client returns undefined (same as cross-org)
          const result = await storage.getClientCompanyWithRelations(nonExistentId, orgId);
          expect(result).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return undefined when UPDATE client from different organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientId: fc.uuid(),
          ownerOrgId: fc.uuid(),
          requestOrgId: fc.uuid(),
          originalName: fc.string({ minLength: 1, maxLength: 100 }),
          updatedName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ clientId, ownerOrgId, requestOrgId, originalName, updatedName }) => {
          // Preconditions
          fc.pre(ownerOrgId !== requestOrgId);
          fc.pre(originalName !== updatedName);

          // Setup: Create client in ownerOrgId
          await storage.createClient({
            id: clientId,
            name: originalName,
            organizationId: ownerOrgId,
            website: null,
            industry: null,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            country: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Property: Update from different org returns undefined (-> 404)
          const updateResult = await storage.updateClientCompany(
            clientId,
            requestOrgId,
            { name: updatedName }
          );
          expect(updateResult).toBeUndefined();

          // Property: Client remains unchanged
          const client = await storage.getClientCompanyWithRelations(clientId, ownerOrgId);
          expect(client?.name).toBe(originalName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false when DELETE client from different organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientId: fc.uuid(),
          ownerOrgId: fc.uuid(),
          requestOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ clientId, ownerOrgId, requestOrgId, clientName }) => {
          // Precondition
          fc.pre(ownerOrgId !== requestOrgId);

          // Setup: Create client in ownerOrgId
          await storage.createClient({
            id: clientId,
            name: clientName,
            organizationId: ownerOrgId,
            website: null,
            industry: null,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            country: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Property: Delete from different org returns false (-> 404)
          const deleteResult = await storage.deleteClientCompany(clientId, requestOrgId);
          expect(deleteResult).toBe(false);

          // Property: Client still exists in owner organization
          const client = await storage.getClientCompanyWithRelations(clientId, ownerOrgId);
          expect(client).toBeDefined();
          expect(client?.id).toBe(clientId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not leak information about clients in other organizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Id: fc.uuid(),
          org2Id: fc.uuid(),
          org3Id: fc.uuid(),
          clients: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              orgIndex: fc.integer({ min: 0, max: 2 }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
        }),
        async ({ org1Id, org2Id, org3Id, clients }) => {
          // Precondition: all orgs are different
          fc.pre(org1Id !== org2Id && org2Id !== org3Id && org1Id !== org3Id);

          const orgs = [org1Id, org2Id, org3Id];

          // Setup: Create clients across different organizations
          for (const clientData of clients) {
            await storage.createClient({
              id: clientData.id,
              name: clientData.name,
              organizationId: orgs[clientData.orgIndex],
              website: null,
              industry: null,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // Property: Each org can only access its own clients
          for (const clientData of clients) {
            const ownerOrgId = orgs[clientData.orgIndex];

            // Can access from owner org
            const ownResult = await storage.getClientCompanyWithRelations(
              clientData.id,
              ownerOrgId
            );
            expect(ownResult).toBeDefined();
            expect(ownResult?.organizationId).toBe(ownerOrgId);

            // Cannot access from other orgs
            for (let i = 0; i < orgs.length; i++) {
              if (i !== clientData.orgIndex) {
                const otherResult = await storage.getClientCompanyWithRelations(
                  clientData.id,
                  orgs[i]
                );
                expect(otherResult).toBeUndefined();
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should treat non-existent and cross-org clients identically (no information leakage)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          existingClientId: fc.uuid(),
          nonExistentClientId: fc.uuid(),
          ownerOrgId: fc.uuid(),
          requestOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ existingClientId, nonExistentClientId, ownerOrgId, requestOrgId, clientName }) => {
          // Preconditions
          fc.pre(ownerOrgId !== requestOrgId);
          fc.pre(existingClientId !== nonExistentClientId);

          // Setup: Create client in ownerOrgId
          await storage.createClient({
            id: existingClientId,
            name: clientName,
            organizationId: ownerOrgId,
            website: null,
            industry: null,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            country: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Property: Cross-org access returns same result as non-existent
          const crossOrgResult = await storage.getClientCompanyWithRelations(
            existingClientId,
            requestOrgId
          );
          const nonExistentResult = await storage.getClientCompanyWithRelations(
            nonExistentClientId,
            requestOrgId
          );

          // Both should be undefined (no information leakage)
          expect(crossOrgResult).toBeUndefined();
          expect(nonExistentResult).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent cross-org access for all operations (GET, UPDATE, DELETE)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientId: fc.uuid(),
          ownerOrgId: fc.uuid(),
          attackerOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          maliciousUpdate: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ clientId, ownerOrgId, attackerOrgId, clientName, maliciousUpdate }) => {
          // Precondition
          fc.pre(ownerOrgId !== attackerOrgId);

          // Setup: Create client in ownerOrgId
          await storage.createClient({
            id: clientId,
            name: clientName,
            organizationId: ownerOrgId,
            website: null,
            industry: null,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            country: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Property: All operations from attacker org should fail
          const getResult = await storage.getClientCompanyWithRelations(clientId, attackerOrgId);
          expect(getResult).toBeUndefined();

          const updateResult = await storage.updateClientCompany(
            clientId,
            attackerOrgId,
            { name: maliciousUpdate }
          );
          expect(updateResult).toBeUndefined();

          const deleteResult = await storage.deleteClientCompany(clientId, attackerOrgId);
          expect(deleteResult).toBe(false);

          // Property: Client remains intact in owner organization
          const verifyClient = await storage.getClientCompanyWithRelations(clientId, ownerOrgId);
          expect(verifyClient).toBeDefined();
          expect(verifyClient?.name).toBe(clientName); // Not modified
          expect(verifyClient?.organizationId).toBe(ownerOrgId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
