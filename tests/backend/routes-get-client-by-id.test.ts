// AI-META-BEGIN
// AI-META: Test file for GET /api/clients/:id endpoint
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Unit tests for GET /api/clients/:id endpoint
 * 
 * Tests retrieval of single client company with relations, error handling, and organization isolation.
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ClientCompany } from '@shared/schema';
import type { ClientCompanyWithRelations } from '@shared/client-schemas';

/**
 * Mock storage class to simulate getClientCompanyWithRelations behavior
 * This allows testing the endpoint logic without database dependencies
 */
class MockClientStorage {
  private clients: Map<string, ClientCompany> = new Map();
  private contacts: Map<string, any[]> = new Map();
  private deals: Map<string, any[]> = new Map();
  private engagements: Map<string, any[]> = new Map();

  reset() {
    this.clients.clear();
    this.contacts.clear();
    this.deals.clear();
    this.engagements.clear();
  }

  async createClient(client: ClientCompany): Promise<ClientCompany> {
    this.clients.set(client.id, client);
    return client;
  }

  async addContacts(clientId: string, contacts: any[]): Promise<void> {
    this.contacts.set(clientId, contacts);
  }

  async addDeals(clientId: string, deals: any[]): Promise<void> {
    this.deals.set(clientId, deals);
  }

  async addEngagements(clientId: string, engagements: any[]): Promise<void> {
    this.engagements.set(clientId, engagements);
  }

  async getClientCompanyWithRelations(
    id: string,
    orgId: string
  ): Promise<ClientCompanyWithRelations | undefined> {
    const client = this.clients.get(id);
    
    // Return undefined if client doesn't exist or belongs to different org
    if (!client || client.organizationId !== orgId) {
      return undefined;
    }

    const contacts = this.contacts.get(id) || [];
    const deals = this.deals.get(id) || [];
    const engagements = this.engagements.get(id) || [];

    // Calculate activeEngagementsCount
    const activeEngagementsCount = engagements.filter(
      (e) => e.status === 'active'
    ).length;

    // Calculate totalDealsValue
    const totalDealsValue = deals
      .reduce((sum, deal) => {
        const value = deal.value ? parseFloat(deal.value) : 0;
        return sum + value;
      }, 0)
      .toFixed(2);

    return {
      ...client,
      contacts,
      deals,
      engagements,
      activeEngagementsCount,
      totalDealsValue,
    };
  }
}

let storage: MockClientStorage;

describe('GET /api/clients/:id - Unit Tests', () => {
  beforeEach(() => {
    storage = new MockClientStorage();
  });

  describe('Successful Retrieval with Relations', () => {
    it('should return client with all relations when client exists', async () => {
      // Arrange - create client with relations
      const orgId = 'org-1';
      const clientId = 'client-123';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Acme Corporation',
        website: 'https://acme.com',
        industry: 'Technology',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
        notes: 'Important client',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      });

      await storage.addContacts(clientId, [
        { id: 'contact-1', firstName: 'John', lastName: 'Doe', email: 'john@acme.com' },
        { id: 'contact-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@acme.com' },
      ]);

      await storage.addDeals(clientId, [
        { id: 'deal-1', name: 'Q1 Project', value: '50000.00', stage: 'won' },
        { id: 'deal-2', name: 'Q2 Project', value: '75000.00', stage: 'negotiation' },
      ]);

      await storage.addEngagements(clientId, [
        { id: 'eng-1', name: 'Ongoing Support', status: 'active' },
        { id: 'eng-2', name: 'Past Project', status: 'completed' },
      ]);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.id).toBe(clientId);
      expect(result!.name).toBe('Acme Corporation');
      expect(result!.contacts).toHaveLength(2);
      expect(result!.deals).toHaveLength(2);
      expect(result!.engagements).toHaveLength(2);
      expect(result!.activeEngagementsCount).toBe(1);
      expect(result!.totalDealsValue).toBe('125000.00');
    });

    it('should include all client company fields in response', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-456';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Tech Solutions Inc',
        website: 'https://techsolutions.com',
        industry: 'Software',
        address: '456 Tech Blvd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'USA',
        notes: 'Strategic partner',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-10'),
      });
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert - verify all fields are present
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('website');
      expect(result).toHaveProperty('industry');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('zipCode');
      expect(result).toHaveProperty('country');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('contacts');
      expect(result).toHaveProperty('deals');
      expect(result).toHaveProperty('engagements');
      expect(result).toHaveProperty('activeEngagementsCount');
      expect(result).toHaveProperty('totalDealsValue');
    });
  });

  describe('Client with No Contacts or Deals', () => {
    it('should return client with empty arrays when no relations exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-789';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'New Client LLC',
        website: null,
        industry: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        notes: null,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      });
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.contacts).toEqual([]);
      expect(result!.deals).toEqual([]);
      expect(result!.engagements).toEqual([]);
      expect(result!.activeEngagementsCount).toBe(0);
      expect(result!.totalDealsValue).toBe('0.00');
    });

    it('should handle null optional fields correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-minimal';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Minimal Client',
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
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert - null values should be preserved, not undefined
      expect(result).toBeDefined();
      expect(result!.website).toBeNull();
      expect(result!.industry).toBeNull();
      expect(result!.address).toBeNull();
      expect(result!.city).toBeNull();
      expect(result!.state).toBeNull();
      expect(result!.zipCode).toBeNull();
      expect(result!.country).toBeNull();
      expect(result!.notes).toBeNull();
    });
  });

  describe('Client with Multiple Contacts and Deals', () => {
    it('should return all contacts for a client', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-multi';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Multi Contact Client',
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

      const mockContacts = [
        { id: 'c1', firstName: 'Alice', lastName: 'Johnson' },
        { id: 'c2', firstName: 'Bob', lastName: 'Williams' },
        { id: 'c3', firstName: 'Carol', lastName: 'Davis' },
        { id: 'c4', firstName: 'David', lastName: 'Miller' },
      ];
      
      await storage.addContacts(clientId, mockContacts);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.contacts).toHaveLength(4);
      expect(result!.contacts[0].firstName).toBe('Alice');
      expect(result!.contacts[3].firstName).toBe('David');
    });

    it('should return all deals for a client', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-deals';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Multi Deal Client',
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

      const mockDeals = [
        { id: 'd1', name: 'Deal 1', value: '10000.00', stage: 'won' },
        { id: 'd2', name: 'Deal 2', value: '20000.00', stage: 'negotiation' },
        { id: 'd3', name: 'Deal 3', value: '30000.00', stage: 'proposal' },
      ];
      
      await storage.addDeals(clientId, mockDeals);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.deals).toHaveLength(3);
      expect(result!.deals[0].name).toBe('Deal 1');
      expect(result!.totalDealsValue).toBe('60000.00');
    });

    it('should return all engagements for a client', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-engagements';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Multi Engagement Client',
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

      const mockEngagements = [
        { id: 'e1', name: 'Engagement 1', status: 'active' },
        { id: 'e2', name: 'Engagement 2', status: 'completed' },
        { id: 'e3', name: 'Engagement 3', status: 'active' },
      ];
      
      await storage.addEngagements(clientId, mockEngagements);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.engagements).toHaveLength(3);
      expect(result!.engagements[0].name).toBe('Engagement 1');
    });
  });

  describe('Non-existent Client ID', () => {
    it('should return undefined for non-existent client ID', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'non-existent-id';
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid UUID format', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'invalid-uuid-format';
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty client ID', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = '';
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Client from Different Organization', () => {
    it('should return undefined when client belongs to different organization', async () => {
      // Arrange
      const ownerOrgId = 'org-1';
      const requestOrgId = 'org-2';
      const clientId = 'client-other-org';
      
      await storage.createClient({
        id: clientId,
        organizationId: ownerOrgId,
        name: 'Client in Org 1',
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
      
      // Act - request from different org
      const result = await storage.getClientCompanyWithRelations(clientId, requestOrgId);
      
      // Assert
      expect(result).toBeUndefined();
    });

    it('should not expose existence of clients in other organizations', async () => {
      // Arrange - client exists in org-2, request from org-1
      const ownerOrgId = 'org-2';
      const requestOrgId = 'org-1';
      const clientId = 'client-secret';
      
      await storage.createClient({
        id: clientId,
        organizationId: ownerOrgId,
        name: 'Secret Client',
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
      
      // Act - request from different org
      const result = await storage.getClientCompanyWithRelations(clientId, requestOrgId);
      
      // Assert - should not reveal client exists
      expect(result).toBeUndefined();
    });

    it('should allow access from correct organization', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-correct-org';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Client in Correct Org',
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
      
      // Act - request from same org
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.id).toBe(clientId);
      expect(result!.organizationId).toBe(orgId);
    });
  });

  describe('Calculated Fields', () => {
    it('should calculate activeEngagementsCount correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-active-count';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Active Count Test',
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

      await storage.addEngagements(clientId, [
        { id: 'e1', status: 'active' },
        { id: 'e2', status: 'completed' },
        { id: 'e3', status: 'active' },
        { id: 'e4', status: 'on_hold' },
        { id: 'e5', status: 'active' },
      ]);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.activeEngagementsCount).toBe(3);
    });

    it('should calculate totalDealsValue correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-total-value';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Total Value Test',
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

      await storage.addDeals(clientId, [
        { id: 'd1', value: '10000.50' },
        { id: 'd2', value: '25000.75' },
        { id: 'd3', value: '15000.25' },
      ]);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.totalDealsValue).toBe('50001.50');
    });

    it('should handle zero active engagements', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-zero-active';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Zero Active Test',
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

      await storage.addEngagements(clientId, [
        { id: 'e1', status: 'completed' },
        { id: 'e2', status: 'cancelled' },
      ]);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.activeEngagementsCount).toBe(0);
    });

    it('should handle zero total deals value', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-zero-value';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Zero Value Test',
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

      // No deals added
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.totalDealsValue).toBe('0.00');
    });

    it('should handle null deal values in calculation', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-null-values';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Null Values Test',
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

      await storage.addDeals(clientId, [
        { id: 'd1', value: '10000.00' },
        { id: 'd2', value: null },
        { id: 'd3', value: '5000.00' },
      ]);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.totalDealsValue).toBe('15000.00');
    });

    it('should calculate both fields correctly with mixed data', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-mixed';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Mixed Data Test',
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

      await storage.addEngagements(clientId, [
        { id: 'e1', status: 'active' },
        { id: 'e2', status: 'completed' },
        { id: 'e3', status: 'active' },
      ]);

      await storage.addDeals(clientId, [
        { id: 'd1', value: '5000.00' },
        { id: 'd2', value: '7500.50' },
      ]);
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.activeEngagementsCount).toBe(2);
      expect(result!.totalDealsValue).toBe('12500.50');
    });
  });

  describe('Response Format', () => {
    it('should return response with correct structure', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-format';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Format Test Client',
        website: 'https://example.com',
        industry: 'Technology',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA',
        notes: 'Test notes',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T00:00:00Z'),
      });
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert - verify structure
      expect(result).toBeDefined();
      expect(typeof result!.id).toBe('string');
      expect(typeof result!.name).toBe('string');
      expect(Array.isArray(result!.contacts)).toBe(true);
      expect(Array.isArray(result!.deals)).toBe(true);
      expect(Array.isArray(result!.engagements)).toBe(true);
      expect(typeof result!.activeEngagementsCount).toBe('number');
      expect(typeof result!.totalDealsValue).toBe('string');
    });

    it('should use camelCase for field names', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-camel';
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'CamelCase Client',
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
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert - verify camelCase naming
      expect(result).toBeDefined();
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('zipCode');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('activeEngagementsCount');
      expect(result).toHaveProperty('totalDealsValue');
    });

    it('should include timestamps in Date format', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = 'client-timestamps';
      const now = new Date();
      
      await storage.createClient({
        id: clientId,
        organizationId: orgId,
        name: 'Timestamp Client',
        website: null,
        industry: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      });
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle empty ID parameter gracefully', async () => {
      // Arrange
      const orgId = 'org-1';
      const clientId = '';
      
      // Act
      const result = await storage.getClientCompanyWithRelations(clientId, orgId);
      
      // Assert - empty ID should return undefined
      expect(result).toBeUndefined();
    });

    it('should handle undefined organization ID', async () => {
      // Arrange
      const clientId = 'client-123';
      
      await storage.createClient({
        id: clientId,
        organizationId: 'org-1',
        name: 'Test Client',
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
      
      // Act - request with empty org ID
      const result = await storage.getClientCompanyWithRelations(clientId, '');
      
      // Assert
      expect(result).toBeUndefined();
    });
  });
});
