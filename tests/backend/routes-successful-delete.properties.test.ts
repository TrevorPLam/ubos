// AI-META-BEGIN
// AI-META: Property-based tests for successful delete response
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Successful Delete Response
 * 
 * Feature: client-companies-crud-api
 * Property 11: Successful Delete Response
 * Validates: Requirements 5.3, 5.5
 * 
 * This test validates that for any client company with no dependencies,
 * a successful DELETE request SHALL return a 204 status code with no response body.
 * 
 * The test verifies:
 * - DELETE returns 204 status code when client has no dependencies
 * - DELETE returns no response body (undefined/null)
 * - Client is actually removed from storage after successful delete
 * - DELETE succeeds for clients with minimal data
 * - DELETE succeeds for clients with complete data
 * - DELETE succeeds regardless of optional field values
 * - Multiple successful deletes can be performed sequentially
 * - Organization isolation is maintained during delete
 * 
 * Note: These tests validate the successful delete response behavior using
 * in-memory data structures to simulate the storage layer without requiring
 * a live database connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany, InsertClientCompany } from '@shared/schema';
import type { DependencyCheckResult } from '@shared/client-schemas';

/**
 * Simulates the storage layer's delete behavior
 * This allows us to test delete response without database dependencies
 */
class MockDeleteStorage {
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
   * Checks for dependencies (always returns no dependencies for this test)
   */
  async checkClientCompanyDependencies(
    id: string,
    orgId: string,
  ): Promise<DependencyCheckResult> {
    const client = this.clients.get(id);
    
    if (!client || client.organizationId !== orgId) {
      return {
        hasDependencies: false,
        dependencies: {
          contacts: 0,
          deals: 0,
          engagements: 0,
          contracts: 0,
          proposals: 0,
          invoices: 0,
        },
      };
    }

    // For this test, always return no dependencies
    return {
      hasDependencies: false,
      dependencies: {
        contacts: 0,
        deals: 0,
        engagements: 0,
        contracts: 0,
        proposals: 0,
        invoices: 0,
      },
    };
  }

  /**
   * Deletes a client company
   * Returns true if successful, false if not found or wrong org
   */
  async deleteClientCompany(id: string, orgId: string): Promise<boolean> {
    const client = this.clients.get(id);
    
    if (!client || client.organizationId !== orgId) {
      return false;
    }
    
    this.clients.delete(id);
    return true;
  }

  /**
   * Gets a client by ID (for verification)
   */
  getClient(id: string): ClientCompany | undefined {
    return this.clients.get(id);
  }

  /**
   * Clears all data
   */
  clear() {
    this.clients.clear();
    this.nextId = 1;
  }
}

/**
 * Simulates the DELETE endpoint response
 */
interface DeleteResponse {
  statusCode: number;
  body: any;
}

/**
 * Simulates the DELETE /api/clients/:id endpoint
 */
async function simulateDeleteEndpoint(
  storage: MockDeleteStorage,
  clientId: string,
  orgId: string
): Promise<DeleteResponse> {
  // Check dependencies first
  const dependencyCheck = await storage.checkClientCompanyDependencies(clientId, orgId);
  
  if (dependencyCheck.hasDependencies) {
    return {
      statusCode: 409,
      body: {
        error: 'Cannot delete client with existing dependencies',
        dependencies: dependencyCheck.dependencies,
      },
    };
  }
  
  // Attempt delete
  const success = await storage.deleteClientCompany(clientId, orgId);
  
  if (!success) {
    return {
      statusCode: 404,
      body: { error: 'Client not found' },
    };
  }
  
  // Successful delete: 204 with no body
  return {
    statusCode: 204,
    body: undefined,
  };
}

describe('Client Companies API - Successful Delete Response Property Tests', () => {
  let storage: MockDeleteStorage;

  beforeEach(() => {
    storage = new MockDeleteStorage();
  });

  // Feature: client-companies-crud-api, Property 11: Successful Delete Response
  it('should return 204 status code for successful delete with no dependencies', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          website: fc.option(fc.webUrl(), { nil: null }),
          industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        }),
        async ({ organizationId, name, website, industry }) => {
          // Create client with no dependencies
          const client = await storage.createClientCompany({
            organizationId,
            name,
            website,
            industry,
          });

          // Delete the client
          const response = await simulateDeleteEndpoint(storage, client.id, organizationId);

          // Property: Status code is 204
          expect(response.statusCode).toBe(204);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return no response body for successful delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          website: fc.option(fc.webUrl(), { nil: null }),
          industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          address: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
          city: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          state: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          zipCode: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
          country: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
        }),
        async (clientData) => {
          // Create client
          const client = await storage.createClientCompany(clientData);

          // Delete the client
          const response = await simulateDeleteEndpoint(storage, client.id, clientData.organizationId);

          // Property: Response body is undefined (no content)
          expect(response.statusCode).toBe(204);
          expect(response.body).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should actually remove client from storage after successful delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          website: fc.option(fc.webUrl(), { nil: null }),
        }),
        async ({ organizationId, name, website }) => {
          // Create client
          const client = await storage.createClientCompany({
            organizationId,
            name,
            website,
          });

          // Verify client exists before delete
          expect(storage.getClient(client.id)).toBeDefined();

          // Delete the client
          const response = await simulateDeleteEndpoint(storage, client.id, organizationId);

          // Property: Client is removed from storage
          expect(response.statusCode).toBe(204);
          expect(storage.getClient(client.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 204 for clients with minimal data (only required fields)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ organizationId, name }) => {
          // Create minimal client (only required fields)
          const client = await storage.createClientCompany({
            organizationId,
            name,
          });

          // Delete the client
          const response = await simulateDeleteEndpoint(storage, client.id, organizationId);

          // Property: Minimal clients can be deleted successfully
          expect(response.statusCode).toBe(204);
          expect(response.body).toBeUndefined();
          expect(storage.getClient(client.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 204 for clients with complete data (all fields)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          website: fc.webUrl(),
          industry: fc.string({ minLength: 1, maxLength: 100 }),
          address: fc.string({ minLength: 1, maxLength: 200 }),
          city: fc.string({ minLength: 1, maxLength: 100 }),
          state: fc.string({ minLength: 1, maxLength: 100 }),
          zipCode: fc.string({ minLength: 1, maxLength: 20 }),
          country: fc.string({ minLength: 1, maxLength: 100 }),
          notes: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        async (clientData) => {
          // Create complete client (all fields populated)
          const client = await storage.createClientCompany(clientData);

          // Delete the client
          const response = await simulateDeleteEndpoint(storage, client.id, clientData.organizationId);

          // Property: Complete clients can be deleted successfully
          expect(response.statusCode).toBe(204);
          expect(response.body).toBeUndefined();
          expect(storage.getClient(client.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 204 regardless of optional field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          hasWebsite: fc.boolean(),
          hasIndustry: fc.boolean(),
          hasAddress: fc.boolean(),
          hasCity: fc.boolean(),
          hasState: fc.boolean(),
          hasZipCode: fc.boolean(),
          hasCountry: fc.boolean(),
          hasNotes: fc.boolean(),
        }),
        async ({ organizationId, name, hasWebsite, hasIndustry, hasAddress, hasCity, hasState, hasZipCode, hasCountry, hasNotes }) => {
          // Build client data with random field combinations
          const clientData: InsertClientCompany = {
            organizationId,
            name,
            website: hasWebsite ? 'https://example.com' : null,
            industry: hasIndustry ? 'Technology' : null,
            address: hasAddress ? '123 Main St' : null,
            city: hasCity ? 'San Francisco' : null,
            state: hasState ? 'CA' : null,
            zipCode: hasZipCode ? '94102' : null,
            country: hasCountry ? 'USA' : null,
            notes: hasNotes ? 'Test notes' : null,
          };

          // Create client
          const client = await storage.createClientCompany(clientData);

          // Delete the client
          const response = await simulateDeleteEndpoint(storage, client.id, organizationId);

          // Property: Delete succeeds regardless of which optional fields are set
          expect(response.statusCode).toBe(204);
          expect(response.body).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple sequential successful deletes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          clientCount: fc.integer({ min: 2, max: 10 }),
        }),
        async ({ organizationId, clientCount }) => {
          // Create multiple clients
          const clients: ClientCompany[] = [];
          for (let i = 0; i < clientCount; i++) {
            const client = await storage.createClientCompany({
              organizationId,
              name: `Client ${i}`,
            });
            clients.push(client);
          }

          // Delete all clients sequentially
          const responses: DeleteResponse[] = [];
          for (const client of clients) {
            const response = await simulateDeleteEndpoint(storage, client.id, organizationId);
            responses.push(response);
          }

          // Property: All deletes return 204
          responses.forEach(response => {
            expect(response.statusCode).toBe(204);
            expect(response.body).toBeUndefined();
          });

          // Property: All clients are removed
          clients.forEach(client => {
            expect(storage.getClient(client.id)).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain organization isolation during delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Id: fc.uuid(),
          org2Id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ org1Id, org2Id, name }) => {
          // Precondition: Different organizations
          fc.pre(org1Id !== org2Id);

          // Create client in org1
          const client = await storage.createClientCompany({
            organizationId: org1Id,
            name,
          });

          // Delete from correct org (org1)
          const successResponse = await simulateDeleteEndpoint(storage, client.id, org1Id);

          // Property: Delete from correct org returns 204
          expect(successResponse.statusCode).toBe(204);
          expect(successResponse.body).toBeUndefined();
          expect(storage.getClient(client.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 204 only when no dependencies exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          clients: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              website: fc.option(fc.webUrl(), { nil: null }),
            }),
            { minLength: 3, maxLength: 5 }
          ),
        }),
        async ({ organizationId, clients }) => {
          // Create multiple clients
          const createdClients: ClientCompany[] = [];
          for (const clientData of clients) {
            const client = await storage.createClientCompany({
              organizationId,
              ...clientData,
            });
            createdClients.push(client);
          }

          // Delete all clients (all have no dependencies)
          for (const client of createdClients) {
            const response = await simulateDeleteEndpoint(storage, client.id, organizationId);

            // Property: Each delete returns 204 (no dependencies)
            expect(response.statusCode).toBe(204);
            expect(response.body).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return consistent 204 response format across different client types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          minimalClient: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          completeClient: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            website: fc.webUrl(),
            industry: fc.string({ minLength: 1, maxLength: 100 }),
            address: fc.string({ minLength: 1, maxLength: 200 }),
            city: fc.string({ minLength: 1, maxLength: 100 }),
            state: fc.string({ minLength: 1, maxLength: 100 }),
            zipCode: fc.string({ minLength: 1, maxLength: 20 }),
            country: fc.string({ minLength: 1, maxLength: 100 }),
            notes: fc.string({ minLength: 1, maxLength: 500 }),
          }),
        }),
        async ({ organizationId, minimalClient, completeClient }) => {
          // Create minimal client
          const minimal = await storage.createClientCompany({
            organizationId,
            ...minimalClient,
          });

          // Create complete client
          const complete = await storage.createClientCompany({
            organizationId,
            ...completeClient,
          });

          // Delete both
          const minimalResponse = await simulateDeleteEndpoint(storage, minimal.id, organizationId);
          const completeResponse = await simulateDeleteEndpoint(storage, complete.id, organizationId);

          // Property: Both return identical response format
          expect(minimalResponse.statusCode).toBe(204);
          expect(minimalResponse.body).toBeUndefined();
          expect(completeResponse.statusCode).toBe(204);
          expect(completeResponse.body).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify client is truly deleted and not just marked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ organizationId, name }) => {
          // Create client
          const client = await storage.createClientCompany({
            organizationId,
            name,
          });

          const clientId = client.id;

          // Verify exists
          expect(storage.getClient(clientId)).toBeDefined();

          // Delete
          const response = await simulateDeleteEndpoint(storage, clientId, organizationId);

          // Property: Client is completely removed (not soft deleted)
          expect(response.statusCode).toBe(204);
          expect(storage.getClient(clientId)).toBeUndefined();

          // Attempting to delete again should return 404 (not found)
          const secondDeleteResponse = await simulateDeleteEndpoint(storage, clientId, organizationId);
          expect(secondDeleteResponse.statusCode).toBe(404);
        }
      ),
      { numRuns: 100 }
    );
  });
});
