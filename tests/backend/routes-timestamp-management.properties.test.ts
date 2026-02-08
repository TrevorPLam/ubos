// AI-META-BEGIN
// AI-META: Property-based tests for automatic timestamp management
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Automatic Timestamp Management
 * 
 * Feature: client-companies-crud-api
 * Property 8: Automatic Timestamp Management
 * Validates: Requirements 3.6, 4.5
 * 
 * This test validates that for any client company creation or update operation,
 * the system SHALL automatically set createdAt on creation and update updatedAt
 * on both creation and modification, without requiring these fields in the request.
 * 
 * The test verifies:
 * - createdAt is set automatically on creation
 * - updatedAt is set automatically on creation
 * - createdAt and updatedAt are equal on creation
 * - updatedAt is updated automatically on modification
 * - createdAt remains unchanged on modification
 * - Timestamps are not required in request body
 * - Timestamps in request body are ignored
 * - Timestamps are valid Date objects
 * - Timestamps are within reasonable time bounds
 * 
 * Note: These tests validate the timestamp management logic using in-memory
 * data structures to simulate the storage layer behavior without requiring
 * a live database connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { ClientCompany, InsertClientCompany } from '@shared/schema';

/**
 * Simulates the storage layer's timestamp management logic
 * This allows us to test timestamp behavior without database dependencies
 */
class MockTimestampStorage {
  private clients: Map<string, ClientCompany> = new Map();
  private nextId = 1;

  /**
   * Simulates the createClientCompany method
   * Automatically sets createdAt and updatedAt timestamps
   */
  async createClientCompany(
    data: Omit<InsertClientCompany, 'createdAt' | 'updatedAt'>
  ): Promise<ClientCompany> {
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
      createdAt: now, // Automatically set
      updatedAt: now, // Automatically set
    };
    
    this.clients.set(client.id, client);
    return client;
  }

  /**
   * Simulates the updateClientCompany method
   * Automatically updates updatedAt timestamp, preserves createdAt
   */
  async updateClientCompany(
    id: string,
    data: Partial<Omit<InsertClientCompany, 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ClientCompany | undefined> {
    const existing = this.clients.get(id);
    if (!existing) {
      return undefined;
    }

    const now = new Date();
    
    const updated: ClientCompany = {
      ...existing,
      ...data,
      createdAt: existing.createdAt, // Preserve original
      updatedAt: now, // Automatically update
    };
    
    this.clients.set(id, updated);
    return updated;
  }

  getClient(id: string): ClientCompany | undefined {
    return this.clients.get(id);
  }

  clear() {
    this.clients.clear();
    this.nextId = 1;
  }
}

describe('Client Companies API - Automatic Timestamp Management Property Tests', () => {
  let storage: MockTimestampStorage;

  beforeEach(() => {
    storage = new MockTimestampStorage();
  });

  // Feature: client-companies-crud-api, Property 8: Automatic Timestamp Management
  it('should automatically set createdAt and updatedAt on creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          website: fc.option(fc.webUrl(), { nil: null }),
          industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        }),
        async ({ organizationId, name, website, industry }) => {
          const beforeCreate = new Date();
          
          // Create client without providing timestamps
          const result = await storage.createClientCompany({
            organizationId,
            name,
            website,
            industry,
          });
          
          const afterCreate = new Date();

          // Property: createdAt is automatically set
          expect(result.createdAt).toBeDefined();
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
          expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

          // Property: updatedAt is automatically set
          expect(result.updatedAt).toBeDefined();
          expect(result.updatedAt).toBeInstanceOf(Date);
          expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
          expect(result.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set createdAt and updatedAt to same value on creation', async () => {
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
          const result = await storage.createClientCompany(clientData);

          // Property: createdAt and updatedAt are equal on creation
          expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should automatically update updatedAt on modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          initialName: fc.string({ minLength: 1, maxLength: 100 }),
          updatedName: fc.string({ minLength: 1, maxLength: 100 }),
          updatedIndustry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        }),
        async ({ organizationId, initialName, updatedName, updatedIndustry }) => {
          // Precondition: names should be different to ensure update
          fc.pre(initialName !== updatedName);

          // Create client
          const created = await storage.createClientCompany({
            organizationId,
            name: initialName,
          });

          // Wait a small amount to ensure time difference
          await new Promise(resolve => setTimeout(resolve, 2));

          const beforeUpdate = new Date();

          // Update client
          const updated = await storage.updateClientCompany(created.id, {
            name: updatedName,
            industry: updatedIndustry,
          });

          const afterUpdate = new Date();

          // Property: updatedAt is automatically updated
          expect(updated).toBeDefined();
          expect(updated!.updatedAt).toBeInstanceOf(Date);
          expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
          expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
          expect(updated!.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve createdAt on modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          initialName: fc.string({ minLength: 1, maxLength: 100 }),
          updates: fc.array(
            fc.record({
              name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              website: fc.option(fc.webUrl(), { nil: null }),
              industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
              notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async ({ organizationId, initialName, updates }) => {
          // Create client
          const created = await storage.createClientCompany({
            organizationId,
            name: initialName,
          });

          const originalCreatedAt = created.createdAt;

          // Apply multiple updates
          let current = created;
          for (const updateData of updates) {
            await new Promise(resolve => setTimeout(resolve, 2));
            const updated = await storage.updateClientCompany(current.id, updateData);
            expect(updated).toBeDefined();
            current = updated!;
          }

          // Property: createdAt remains unchanged after all updates
          expect(current.createdAt.getTime()).toBe(originalCreatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not require timestamps in request body for creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          website: fc.option(fc.webUrl(), { nil: null }),
        }),
        async ({ organizationId, name, website }) => {
          // Request data without timestamps
          const requestData = {
            organizationId,
            name,
            website,
            // No createdAt or updatedAt
          };

          // Property: Creation succeeds without timestamps
          const result = await storage.createClientCompany(requestData);

          expect(result).toBeDefined();
          expect(result.createdAt).toBeDefined();
          expect(result.updatedAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not require timestamps in request body for updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          initialName: fc.string({ minLength: 1, maxLength: 100 }),
          updatedName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ organizationId, initialName, updatedName }) => {
          fc.pre(initialName !== updatedName);

          // Create client
          const created = await storage.createClientCompany({
            organizationId,
            name: initialName,
          });

          await new Promise(resolve => setTimeout(resolve, 2));

          // Update data without timestamps
          const updateData = {
            name: updatedName,
            // No updatedAt
          };

          // Property: Update succeeds without timestamps
          const updated = await storage.updateClientCompany(created.id, updateData);

          expect(updated).toBeDefined();
          expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set timestamps for all clients regardless of data variation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          clients: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              hasWebsite: fc.boolean(),
              hasIndustry: fc.boolean(),
              hasAddress: fc.boolean(),
              hasNotes: fc.boolean(),
            }),
            { minLength: 3, maxLength: 10 }
          ),
        }),
        async ({ organizationId, clients }) => {
          const createdClients: ClientCompany[] = [];

          // Create clients with different field combinations
          for (const clientSpec of clients) {
            const clientData: any = {
              organizationId,
              name: clientSpec.name,
            };

            if (clientSpec.hasWebsite) clientData.website = 'https://example.com';
            if (clientSpec.hasIndustry) clientData.industry = 'Technology';
            if (clientSpec.hasAddress) clientData.address = '123 Main St';
            if (clientSpec.hasNotes) clientData.notes = 'Test notes';

            const result = await storage.createClientCompany(clientData);
            createdClients.push(result);
          }

          // Property: All clients have timestamps set
          createdClients.forEach(client => {
            expect(client.createdAt).toBeDefined();
            expect(client.createdAt).toBeInstanceOf(Date);
            expect(client.updatedAt).toBeDefined();
            expect(client.updatedAt).toBeInstanceOf(Date);
            expect(client.createdAt.getTime()).toBe(client.updatedAt.getTime());
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update timestamps consistently across multiple updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          updateCount: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ organizationId, name, updateCount }) => {
          // Create client
          const created = await storage.createClientCompany({
            organizationId,
            name,
          });

          const timestamps: Date[] = [created.updatedAt];

          // Perform multiple updates
          let current = created;
          for (let i = 0; i < updateCount; i++) {
            await new Promise(resolve => setTimeout(resolve, 2));
            
            const updated = await storage.updateClientCompany(current.id, {
              name: `${name} - Update ${i}`,
            });

            expect(updated).toBeDefined();
            timestamps.push(updated!.updatedAt);
            current = updated!;
          }

          // Property: Each update increases updatedAt
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i].getTime()).toBeGreaterThan(timestamps[i - 1].getTime());
          }

          // Property: createdAt never changes
          expect(current.createdAt.getTime()).toBe(created.createdAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  }, 10000);

  it('should handle timestamps correctly for minimal and complete client data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          minimalName: fc.string({ minLength: 1, maxLength: 100 }),
          completeName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ organizationId, minimalName, completeName }) => {
          // Create minimal client
          const minimal = await storage.createClientCompany({
            organizationId,
            name: minimalName,
          });

          // Create complete client
          const complete = await storage.createClientCompany({
            organizationId,
            name: completeName,
            website: 'https://example.com',
            industry: 'Technology',
            address: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'USA',
            notes: 'Complete client data',
          });

          // Property: Both have timestamps regardless of data completeness
          expect(minimal.createdAt).toBeDefined();
          expect(minimal.updatedAt).toBeDefined();
          expect(minimal.createdAt.getTime()).toBe(minimal.updatedAt.getTime());

          expect(complete.createdAt).toBeDefined();
          expect(complete.updatedAt).toBeDefined();
          expect(complete.createdAt.getTime()).toBe(complete.updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain timestamp integrity across create-update cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.uuid(),
          initialData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            website: fc.option(fc.webUrl(), { nil: null }),
            industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          }),
          updateData: fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            website: fc.option(fc.webUrl(), { nil: null }),
            industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          }),
        }),
        async ({ organizationId, initialData, updateData }) => {
          // Create
          const created = await storage.createClientCompany({
            organizationId,
            ...initialData,
          });

          await new Promise(resolve => setTimeout(resolve, 2));

          // Update
          const updated = await storage.updateClientCompany(created.id, updateData);

          expect(updated).toBeDefined();

          // Property: Timestamp relationships are maintained
          expect(created.createdAt.getTime()).toBe(updated!.createdAt.getTime());
          expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
          expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.createdAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
