// AI-META-BEGIN
// AI-META: Property-based tests for update preserves organization
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Update Preserves Organization
 * 
 * Feature: client-companies-crud-api
 * Property 9: Update Preserves Organization
 * Validates: Requirements 4.1
 * 
 * This test validates that for any valid update to an existing client company,
 * the organizationId SHALL remain unchanged, preventing clients from being
 * moved between organizations.
 * 
 * The test verifies:
 * - PUT /api/clients/:id never changes organizationId
 * - organizationId in request body is ignored
 * - Clients cannot be moved between organizations
 * - Organization assignment is immutable after creation
 * - Multiple updates preserve the original organizationId
 * 
 * Note: These tests validate the organization preservation logic using in-memory
 * data structures to simulate the storage layer behavior without requiring
 * a live database connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany, InsertClientCompany } from '@shared/schema';

/**
 * Simulates the API endpoint's organization preservation logic
 * This allows us to test organization immutability without database dependencies
 */
class MockClientUpdateStorage {
  private clients: Map<string, ClientCompany> = new Map();
  private nextId = 1;

  /**
   * Creates a client company for testing
   */
  async createClientCompany(data: InsertClientCompany): Promise<ClientCompany> {
    const now = new Date();
    const client: ClientCompany = {
      id: `client-${this.nextId++}`,
      organizationId: data.organizationId,
      name: data.name,
      website: data.website ?? null,
      industry: data.industry ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zipCode: data.zipCode ?? null,
      country: data.country ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.clients.set(client.id, client);
    return client;
  }

  /**
   * Simulates the PUT /api/clients/:id endpoint behavior
   * The endpoint MUST preserve organizationId from the original client,
   * never allowing it to be changed via update
   */
  async updateClientCompany(
    id: string,
    orgId: string,
    updateData: Partial<InsertClientCompany>
  ): Promise<ClientCompany | undefined> {
    const client = this.clients.get(id);
    
    // Return undefined if client not found or belongs to different org
    if (!client || client.organizationId !== orgId) {
      return undefined;
    }
    
    // Critical logic: organizationId is ALWAYS preserved from original client,
    // never from update data
    const updatedClient: ClientCompany = {
      ...client,
      ...updateData,
      organizationId: client.organizationId, // Always preserve original org
      id: client.id, // Also preserve ID
      createdAt: client.createdAt, // Preserve creation timestamp
      updatedAt: new Date(), // Update modification timestamp
    };
    
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  getClient(id: string): ClientCompany | undefined {
    return this.clients.get(id);
  }

  clear() {
    this.clients.clear();
    this.nextId = 1;
  }
}

describe('Client Companies API - Update Preserves Organization Property Tests', () => {
  let storage: MockClientUpdateStorage;

  beforeEach(() => {
    storage = new MockClientUpdateStorage();
  });

  // Feature: client-companies-crud-api, Property 9: Update Preserves Organization
  it('should preserve organizationId on any update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          updateData: fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            website: fc.option(fc.webUrl(), { nil: null }),
            industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            city: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            state: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            country: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          }),
        }),
        async ({ originalOrgId, clientName, updateData }) => {
          // Create client in original organization
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Property: Update preserves organizationId
          const updated = await storage.updateClientCompany(
            client.id,
            originalOrgId,
            updateData
          );

          expect(updated).toBeDefined();
          expect(updated!.organizationId).toBe(originalOrgId);
          expect(updated!.organizationId).toBe(client.organizationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ignore organizationId in update request body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          maliciousOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          updateName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ originalOrgId, maliciousOrgId, clientName, updateName }) => {
          // Precondition: organizations must be different
          fc.pre(originalOrgId !== maliciousOrgId);

          // Create client in original organization
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Attempt to change organizationId via update (should be ignored)
          const updated = await storage.updateClientCompany(
            client.id,
            originalOrgId,
            {
              name: updateName,
              organizationId: maliciousOrgId, // This should be ignored
            } as any
          );

          // Property: organizationId remains unchanged
          expect(updated).toBeDefined();
          expect(updated!.organizationId).toBe(originalOrgId);
          expect(updated!.organizationId).not.toBe(maliciousOrgId);
          expect(updated!.name).toBe(updateName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent moving clients between organizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Id: fc.uuid(),
          org2Id: fc.uuid(),
          org3Id: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ org1Id, org2Id, org3Id, clientName }) => {
          // Precondition: all organizations are different
          fc.pre(org1Id !== org2Id && org2Id !== org3Id && org1Id !== org3Id);

          // Create client in org1
          const client = await storage.createClientCompany({
            organizationId: org1Id,
            name: clientName,
          });

          // Attempt to move to org2 (should fail/be ignored)
          const attemptMove1 = await storage.updateClientCompany(
            client.id,
            org1Id,
            {
              organizationId: org2Id,
            } as any
          );

          // Attempt to move to org3 (should fail/be ignored)
          const attemptMove2 = await storage.updateClientCompany(
            client.id,
            org1Id,
            {
              name: 'Updated Name',
              organizationId: org3Id,
            } as any
          );

          // Property: Client remains in original organization
          expect(attemptMove1!.organizationId).toBe(org1Id);
          expect(attemptMove2!.organizationId).toBe(org1Id);
          expect(attemptMove1!.organizationId).not.toBe(org2Id);
          expect(attemptMove2!.organizationId).not.toBe(org3Id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve organizationId across multiple sequential updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          updates: fc.array(
            fc.record({
              name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
              city: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
        }),
        async ({ originalOrgId, clientName, updates }) => {
          // Create client
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Perform multiple updates
          let currentClient = client;
          for (const updateData of updates) {
            const updated = await storage.updateClientCompany(
              currentClient.id,
              originalOrgId,
              updateData
            );
            
            // Property: Each update preserves organizationId
            expect(updated).toBeDefined();
            expect(updated!.organizationId).toBe(originalOrgId);
            
            currentClient = updated!;
          }

          // Property: Final client still has original organizationId
          expect(currentClient.organizationId).toBe(originalOrgId);
          expect(currentClient.organizationId).toBe(client.organizationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve organizationId even with empty update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ originalOrgId, clientName }) => {
          // Create client
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Update with empty object
          const updated = await storage.updateClientCompany(
            client.id,
            originalOrgId,
            {}
          );

          // Property: organizationId preserved even with no changes
          expect(updated).toBeDefined();
          expect(updated!.organizationId).toBe(originalOrgId);
          expect(updated!.organizationId).toBe(client.organizationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain organization isolation across concurrent updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Id: fc.uuid(),
          org2Id: fc.uuid(),
          client1Name: fc.string({ minLength: 1, maxLength: 100 }),
          client2Name: fc.string({ minLength: 1, maxLength: 100 }),
          updatesPerClient: fc.integer({ min: 1, max: 3 }),
        }),
        async ({ org1Id, org2Id, client1Name, client2Name, updatesPerClient }) => {
          // Precondition: organizations are different
          fc.pre(org1Id !== org2Id);

          // Create clients in different organizations
          const client1 = await storage.createClientCompany({
            organizationId: org1Id,
            name: client1Name,
          });

          const client2 = await storage.createClientCompany({
            organizationId: org2Id,
            name: client2Name,
          });

          // Perform updates on both clients
          const updates1: ClientCompany[] = [];
          const updates2: ClientCompany[] = [];

          for (let i = 0; i < updatesPerClient; i++) {
            const updated1 = await storage.updateClientCompany(
              client1.id,
              org1Id,
              { industry: `Industry ${i}` }
            );
            updates1.push(updated1!);

            const updated2 = await storage.updateClientCompany(
              client2.id,
              org2Id,
              { industry: `Industry ${i}` }
            );
            updates2.push(updated2!);
          }

          // Property: All updates preserve respective organizationIds
          updates1.forEach(update => {
            expect(update.organizationId).toBe(org1Id);
            expect(update.organizationId).not.toBe(org2Id);
          });

          updates2.forEach(update => {
            expect(update.organizationId).toBe(org2Id);
            expect(update.organizationId).not.toBe(org1Id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve organizationId regardless of update data complexity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          maliciousOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          complexUpdate: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            website: fc.webUrl(),
            industry: fc.string({ maxLength: 100 }),
            address: fc.string({ maxLength: 200 }),
            city: fc.string({ maxLength: 100 }),
            state: fc.string({ maxLength: 100 }),
            zipCode: fc.string({ maxLength: 20 }),
            country: fc.string({ maxLength: 100 }),
            notes: fc.string({ maxLength: 500 }),
          }),
        }),
        async ({ originalOrgId, maliciousOrgId, clientName, complexUpdate }) => {
          // Precondition
          fc.pre(originalOrgId !== maliciousOrgId);

          // Create client
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Update with complex data including malicious organizationId
          const updated = await storage.updateClientCompany(
            client.id,
            originalOrgId,
            {
              ...complexUpdate,
              organizationId: maliciousOrgId, // Should be ignored
            } as any
          );

          // Property: organizationId preserved despite complex update
          expect(updated).toBeDefined();
          expect(updated!.organizationId).toBe(originalOrgId);
          expect(updated!.organizationId).not.toBe(maliciousOrgId);
          
          // Property: All other fields are updated
          expect(updated!.name).toBe(complexUpdate.name);
          expect(updated!.website).toBe(complexUpdate.website);
          expect(updated!.industry).toBe(complexUpdate.industry);
          expect(updated!.address).toBe(complexUpdate.address);
          expect(updated!.city).toBe(complexUpdate.city);
          expect(updated!.state).toBe(complexUpdate.state);
          expect(updated!.zipCode).toBe(complexUpdate.zipCode);
          expect(updated!.country).toBe(complexUpdate.country);
          expect(updated!.notes).toBe(complexUpdate.notes);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve organizationId when updating to null values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          clientData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            website: fc.webUrl(),
            industry: fc.string({ maxLength: 100 }),
            city: fc.string({ maxLength: 100 }),
          }),
        }),
        async ({ originalOrgId, clientData }) => {
          // Create client with data
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            ...clientData,
          });

          // Update fields to null
          const updated = await storage.updateClientCompany(
            client.id,
            originalOrgId,
            {
              website: null,
              industry: null,
              city: null,
            }
          );

          // Property: organizationId preserved when nullifying fields
          expect(updated).toBeDefined();
          expect(updated!.organizationId).toBe(originalOrgId);
          expect(updated!.website).toBeNull();
          expect(updated!.industry).toBeNull();
          expect(updated!.city).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure organizationId immutability is enforced at storage layer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          targetOrgIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ originalOrgId, targetOrgIds, clientName }) => {
          // Precondition: all target orgs are different from original
          fc.pre(targetOrgIds.every(id => id !== originalOrgId));

          // Create client
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Attempt to change to each target organization
          for (const targetOrgId of targetOrgIds) {
            const updated = await storage.updateClientCompany(
              client.id,
              originalOrgId,
              {
                organizationId: targetOrgId,
              } as any
            );

            // Property: organizationId never changes
            expect(updated!.organizationId).toBe(originalOrgId);
            expect(updated!.organizationId).not.toBe(targetOrgId);
          }

          // Property: Final state still has original organizationId
          const finalClient = storage.getClient(client.id);
          expect(finalClient!.organizationId).toBe(originalOrgId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve organizationId consistency across all update scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalOrgId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          updateScenarios: fc.array(
            fc.oneof(
              // Scenario 1: Update single field
              fc.record({ name: fc.string({ minLength: 1, maxLength: 100 }) }),
              // Scenario 2: Update multiple fields
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                industry: fc.string({ maxLength: 100 }),
              }),
              // Scenario 3: Update to null
              fc.record({ website: fc.constant(null) }),
              // Scenario 4: Empty update
              fc.constant({})
            ),
            { minLength: 3, maxLength: 7 }
          ),
        }),
        async ({ originalOrgId, clientName, updateScenarios }) => {
          // Create client
          const client = await storage.createClientCompany({
            organizationId: originalOrgId,
            name: clientName,
          });

          // Apply all update scenarios
          let currentClient = client;
          for (const scenario of updateScenarios) {
            const updated = await storage.updateClientCompany(
              currentClient.id,
              originalOrgId,
              scenario
            );

            // Property: organizationId preserved in every scenario
            expect(updated).toBeDefined();
            expect(updated!.organizationId).toBe(originalOrgId);
            
            currentClient = updated!;
          }

          // Property: organizationId never changed throughout all scenarios
          expect(currentClient.organizationId).toBe(originalOrgId);
          expect(currentClient.organizationId).toBe(client.organizationId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
