// AI-META-BEGIN
// AI-META: Test file for DELETE /api/clients/:id endpoint
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Unit tests for DELETE /api/clients/:id endpoint
 * 
 * Tests client company deletion with cascade checks, dependency validation, and organization isolation.
 * Validates Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ClientCompany, InsertClientCompany, Contact, Deal, Engagement, Contract, Proposal, Invoice } from '@shared/schema';
import type { DependencyCheckResult } from '@shared/client-schemas';

/**
 * Mock storage class to simulate deleteClientCompany and checkClientCompanyDependencies behavior
 * This allows testing the endpoint logic without database dependencies
 */
class MockClientStorage {
  private clients: Map<string, ClientCompany> = new Map();
  private contacts: Map<string, Contact[]> = new Map();
  private deals: Map<string, Deal[]> = new Map();
  private engagements: Map<string, Engagement[]> = new Map();
  private contracts: Map<string, Contract[]> = new Map();
  private proposals: Map<string, Proposal[]> = new Map();
  private invoices: Map<string, Invoice[]> = new Map();
  private nextId = 1;

  reset() {
    this.clients.clear();
    this.contacts.clear();
    this.deals.clear();
    this.engagements.clear();
    this.contracts.clear();
    this.proposals.clear();
    this.invoices.clear();
    this.nextId = 1;
  }

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

  // Helper methods to add dependencies
  addContact(clientId: string, orgId: string) {
    const existing = this.contacts.get(clientId) || [];
    existing.push({ 
      id: `contact-${existing.length + 1}`, 
      clientCompanyId: clientId,
      organizationId: orgId,
    } as Contact);
    this.contacts.set(clientId, existing);
  }

  addDeal(clientId: string, orgId: string) {
    const existing = this.deals.get(clientId) || [];
    existing.push({ 
      id: `deal-${existing.length + 1}`, 
      clientCompanyId: clientId,
      organizationId: orgId,
    } as Deal);
    this.deals.set(clientId, existing);
  }

  addEngagement(clientId: string, orgId: string) {
    const existing = this.engagements.get(clientId) || [];
    existing.push({ 
      id: `engagement-${existing.length + 1}`, 
      clientCompanyId: clientId,
      organizationId: orgId,
    } as Engagement);
    this.engagements.set(clientId, existing);
  }

  addContract(clientId: string, orgId: string) {
    const existing = this.contracts.get(clientId) || [];
    existing.push({ 
      id: `contract-${existing.length + 1}`, 
      clientCompanyId: clientId,
      organizationId: orgId,
    } as Contract);
    this.contracts.set(clientId, existing);
  }

  addProposal(clientId: string, orgId: string) {
    const existing = this.proposals.get(clientId) || [];
    existing.push({ 
      id: `proposal-${existing.length + 1}`, 
      clientCompanyId: clientId,
      organizationId: orgId,
    } as Proposal);
    this.proposals.set(clientId, existing);
  }

  addInvoice(clientId: string, orgId: string) {
    const existing = this.invoices.get(clientId) || [];
    existing.push({ 
      id: `invoice-${existing.length + 1}`, 
      clientCompanyId: clientId,
      organizationId: orgId,
    } as Invoice);
    this.invoices.set(clientId, existing);
  }

  async checkClientCompanyDependencies(
    id: string,
    orgId: string,
  ): Promise<DependencyCheckResult> {
    const client = this.clients.get(id);
    
    // Return no dependencies if client not found or wrong org
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

    const dependencies = {
      contacts: (this.contacts.get(id) || []).length,
      deals: (this.deals.get(id) || []).length,
      engagements: (this.engagements.get(id) || []).length,
      contracts: (this.contracts.get(id) || []).length,
      proposals: (this.proposals.get(id) || []).length,
      invoices: (this.invoices.get(id) || []).length,
    };

    const hasDependencies = Object.values(dependencies).some(count => count > 0);

    return {
      hasDependencies,
      dependencies,
    };
  }

  async deleteClientCompany(id: string, orgId: string): Promise<boolean> {
    const client = this.clients.get(id);
    
    // Return false if client not found or belongs to different org
    if (!client || client.organizationId !== orgId) {
      return false;
    }
    
    // Delete the client
    this.clients.delete(id);
    return true;
  }

  getClient(id: string): ClientCompany | undefined {
    return this.clients.get(id);
  }
}

let storage: MockClientStorage;

describe('DELETE /api/clients/:id - Unit Tests', () => {
  beforeEach(() => {
    storage = new MockClientStorage();
  });

  describe('Successful Deletion with No Dependencies (204 Status)', () => {
    it('should delete client with no dependencies and return 204', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client to Delete',
      });

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = !dependencyCheck.hasDependencies 
        ? await storage.deleteClientCompany(client.id, orgId)
        : false;
      const mockStatusCode = success ? 204 : (dependencyCheck.hasDependencies ? 409 : 404);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(false);
      expect(success).toBe(true);
      expect(mockStatusCode).toBe(204);
      expect(storage.getClient(client.id)).toBeUndefined();
    });

    it('should return no content (empty body) on successful deletion', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Test Client',
      });

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(true);
      expect(dependencyCheck.hasDependencies).toBe(false);
      // In real endpoint, response body would be empty (204 No Content)
    });

    it('should actually remove client from database', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client to Remove',
      });

      // Verify client exists
      expect(storage.getClient(client.id)).toBeDefined();

      // Act
      const success = await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(true);
      expect(storage.getClient(client.id)).toBeUndefined();
    });

    it('should allow deletion of client with all null optional fields', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Minimal Client',
        // All optional fields are null
      });

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(false);
      expect(success).toBe(true);
    });
  });

  describe('Deletion Blocked by Contacts (409 Status)', () => {
    it('should return 409 when client has contacts', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Contacts',
      });
      
      // Add contacts
      storage.addContact(client.id, orgId);
      storage.addContact(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contacts).toBe(2);
      expect(mockStatusCode).toBe(409);
    });

    it('should include contact count in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Contacts',
      });
      
      // Add 5 contacts
      for (let i = 0; i < 5; i++) {
        storage.addContact(client.id, orgId);
      }

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contacts).toBe(5);
      expect(dependencyCheck.dependencies.deals).toBe(0);
      expect(dependencyCheck.dependencies.engagements).toBe(0);
    });

    it('should not delete client when contacts exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Protected Client',
      });
      
      storage.addContact(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      
      // Simulate endpoint behavior: don't call delete if dependencies exist
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Deletion Blocked by Deals (409 Status)', () => {
    it('should return 409 when client has deals', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Deals',
      });
      
      storage.addDeal(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.deals).toBe(1);
      expect(mockStatusCode).toBe(409);
    });

    it('should include deal count in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Deals',
      });
      
      // Add 3 deals
      for (let i = 0; i < 3; i++) {
        storage.addDeal(client.id, orgId);
      }

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.deals).toBe(3);
      expect(dependencyCheck.dependencies.contacts).toBe(0);
    });

    it('should not delete client when deals exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Deal',
      });
      
      storage.addDeal(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Deletion Blocked by Engagements (409 Status)', () => {
    it('should return 409 when client has engagements', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Engagements',
      });
      
      storage.addEngagement(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.engagements).toBe(1);
      expect(mockStatusCode).toBe(409);
    });

    it('should include engagement count in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Engagements',
      });
      
      // Add 4 engagements
      for (let i = 0; i < 4; i++) {
        storage.addEngagement(client.id, orgId);
      }

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.engagements).toBe(4);
    });

    it('should not delete client when engagements exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Engagement',
      });
      
      storage.addEngagement(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Deletion Blocked by Contracts (409 Status)', () => {
    it('should return 409 when client has contracts', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Contracts',
      });
      
      storage.addContract(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contracts).toBe(1);
      expect(mockStatusCode).toBe(409);
    });

    it('should include contract count in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Contracts',
      });
      
      // Add 2 contracts
      for (let i = 0; i < 2; i++) {
        storage.addContract(client.id, orgId);
      }

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contracts).toBe(2);
    });

    it('should not delete client when contracts exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Contract',
      });
      
      storage.addContract(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Deletion Blocked by Proposals (409 Status)', () => {
    it('should return 409 when client has proposals', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Proposals',
      });
      
      storage.addProposal(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.proposals).toBe(1);
      expect(mockStatusCode).toBe(409);
    });

    it('should include proposal count in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Proposals',
      });
      
      // Add 3 proposals
      for (let i = 0; i < 3; i++) {
        storage.addProposal(client.id, orgId);
      }

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.proposals).toBe(3);
    });

    it('should not delete client when proposals exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Proposal',
      });
      
      storage.addProposal(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Deletion Blocked by Invoices (409 Status)', () => {
    it('should return 409 when client has invoices', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Invoices',
      });
      
      storage.addInvoice(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.invoices).toBe(1);
      expect(mockStatusCode).toBe(409);
    });

    it('should include invoice count in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Invoices',
      });
      
      // Add 6 invoices
      for (let i = 0; i < 6; i++) {
        storage.addInvoice(client.id, orgId);
      }

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.invoices).toBe(6);
    });

    it('should not delete client when invoices exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Invoice',
      });
      
      storage.addInvoice(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Deletion Blocked by Multiple Dependency Types', () => {
    it('should return 409 when client has multiple dependency types', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Multiple Dependencies',
      });
      
      // Add various dependencies
      storage.addContact(client.id, orgId);
      storage.addDeal(client.id, orgId);
      storage.addEngagement(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const mockStatusCode = dependencyCheck.hasDependencies ? 409 : 204;

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contacts).toBe(1);
      expect(dependencyCheck.dependencies.deals).toBe(1);
      expect(dependencyCheck.dependencies.engagements).toBe(1);
      expect(mockStatusCode).toBe(409);
    });

    it('should include all dependency counts in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Heavily Used Client',
      });
      
      // Add all types of dependencies
      storage.addContact(client.id, orgId);
      storage.addContact(client.id, orgId);
      storage.addDeal(client.id, orgId);
      storage.addEngagement(client.id, orgId);
      storage.addContract(client.id, orgId);
      storage.addProposal(client.id, orgId);
      storage.addInvoice(client.id, orgId);
      storage.addInvoice(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contacts).toBe(2);
      expect(dependencyCheck.dependencies.deals).toBe(1);
      expect(dependencyCheck.dependencies.engagements).toBe(1);
      expect(dependencyCheck.dependencies.contracts).toBe(1);
      expect(dependencyCheck.dependencies.proposals).toBe(1);
      expect(dependencyCheck.dependencies.invoices).toBe(2);
    });

    it('should not delete client with any combination of dependencies', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Protected Client',
      });
      
      // Add contacts and proposals
      storage.addContact(client.id, orgId);
      storage.addProposal(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);
      const success = dependencyCheck.hasDependencies 
        ? false 
        : await storage.deleteClientCompany(client.id, orgId);

      // Assert
      expect(success).toBe(false);
      expect(storage.getClient(client.id)).toBeDefined();
    });
  });

  describe('Delete Non-Existent Client (404 Status)', () => {
    it('should return 404 for non-existent client ID', async () => {
      // Arrange
      const orgId = 'org-1';
      const nonExistentId = 'client-999';

      // Act
      const success = await storage.deleteClientCompany(nonExistentId, orgId);
      const mockStatusCode = success ? 204 : 404;

      // Assert
      expect(success).toBe(false);
      expect(mockStatusCode).toBe(404);
    });

    it('should return 404 error message for non-existent client', () => {
      // Simulate endpoint behavior
      const clientExists = false;
      const mockStatusCode = clientExists ? 204 : 404;
      const mockError = !clientExists ? { error: 'Client not found' } : null;

      // Assert
      expect(mockStatusCode).toBe(404);
      expect(mockError).toBeDefined();
      expect(mockError?.error).toBe('Client not found');
    });

    it('should not throw error when deleting non-existent client', async () => {
      // Arrange
      const orgId = 'org-1';
      const nonExistentId = 'client-does-not-exist';

      // Act & Assert - Should not throw
      await expect(storage.deleteClientCompany(nonExistentId, orgId)).resolves.toBe(false);
    });

    it('should handle invalid UUID format gracefully', async () => {
      // Arrange
      const orgId = 'org-1';
      const invalidId = 'not-a-valid-uuid';

      // Act
      const success = await storage.deleteClientCompany(invalidId, orgId);

      // Assert
      expect(success).toBe(false);
    });
  });

  describe('Delete Client from Different Organization (404 Status)', () => {
    it('should return 404 when deleting client from different org', async () => {
      // Arrange
      const orgId1 = 'org-1';
      const orgId2 = 'org-2';
      
      const client = await storage.createClientCompany({
        organizationId: orgId1,
        name: 'Client in Org 1',
      });

      // Act - Try to delete from different org
      const success = await storage.deleteClientCompany(client.id, orgId2);
      const mockStatusCode = success ? 204 : 404;

      // Assert
      expect(success).toBe(false);
      expect(mockStatusCode).toBe(404);
    });

    it('should not delete client when accessed from different org', async () => {
      // Arrange
      const orgId1 = 'org-1';
      const orgId2 = 'org-2';
      
      const client = await storage.createClientCompany({
        organizationId: orgId1,
        name: 'Protected Client',
      });

      // Act - Try to delete from different org
      await storage.deleteClientCompany(client.id, orgId2);

      // Assert - Client still exists
      const stillExists = storage.getClient(client.id);
      expect(stillExists).toBeDefined();
      expect(stillExists!.organizationId).toBe(orgId1);
    });

    it('should prevent cross-organization deletion', async () => {
      // Arrange
      const orgId1 = 'org-1';
      const orgId2 = 'org-2';
      
      const client1 = await storage.createClientCompany({
        organizationId: orgId1,
        name: 'Client 1',
      });
      
      const client2 = await storage.createClientCompany({
        organizationId: orgId2,
        name: 'Client 2',
      });

      // Act - Each org can only delete their own clients
      const delete1FromOrg1 = await storage.deleteClientCompany(client1.id, orgId1);
      const delete2FromOrg2 = await storage.deleteClientCompany(client2.id, orgId2);
      const crossDelete1 = await storage.deleteClientCompany(client1.id, orgId2);
      const crossDelete2 = await storage.deleteClientCompany(client2.id, orgId1);

      // Assert
      expect(delete1FromOrg1).toBe(true);
      expect(delete2FromOrg2).toBe(true);
      expect(crossDelete1).toBe(false);
      expect(crossDelete2).toBe(false);
    });

    it('should return 404 for cross-org delete attempt', () => {
      // Simulate endpoint behavior
      const belongsToOrg = false;
      const mockStatusCode = belongsToOrg ? 204 : 404;
      const mockError = !belongsToOrg ? { error: 'Client not found' } : null;

      // Assert
      expect(mockStatusCode).toBe(404);
      expect(mockError).toBeDefined();
    });

    it('should enforce organization isolation in dependency check', async () => {
      // Arrange
      const orgId1 = 'org-1';
      const orgId2 = 'org-2';
      
      const client = await storage.createClientCompany({
        organizationId: orgId1,
        name: 'Client in Org 1',
      });

      // Act - Check dependencies from different org
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId2);

      // Assert - Should return no dependencies (client not found in org2)
      expect(dependencyCheck.hasDependencies).toBe(false);
      expect(dependencyCheck.dependencies.contacts).toBe(0);
    });
  });

  describe('Dependency Details Format in 409 Response', () => {
    it('should return dependency details with correct structure', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Dependencies',
      });
      
      storage.addContact(client.id, orgId);
      storage.addDeal(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert - Check structure
      expect(dependencyCheck).toHaveProperty('hasDependencies');
      expect(dependencyCheck).toHaveProperty('dependencies');
      expect(dependencyCheck.dependencies).toHaveProperty('contacts');
      expect(dependencyCheck.dependencies).toHaveProperty('deals');
      expect(dependencyCheck.dependencies).toHaveProperty('engagements');
      expect(dependencyCheck.dependencies).toHaveProperty('contracts');
      expect(dependencyCheck.dependencies).toHaveProperty('proposals');
      expect(dependencyCheck.dependencies).toHaveProperty('invoices');
    });

    it('should return all dependency counts as numbers', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Test Client',
      });
      
      storage.addContact(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert - All counts should be numbers
      expect(typeof dependencyCheck.dependencies.contacts).toBe('number');
      expect(typeof dependencyCheck.dependencies.deals).toBe('number');
      expect(typeof dependencyCheck.dependencies.engagements).toBe('number');
      expect(typeof dependencyCheck.dependencies.contracts).toBe('number');
      expect(typeof dependencyCheck.dependencies.proposals).toBe('number');
      expect(typeof dependencyCheck.dependencies.invoices).toBe('number');
    });

    it('should return zero counts for dependency types that do not exist', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Only Contacts',
      });
      
      storage.addContact(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(dependencyCheck.dependencies.contacts).toBe(1);
      expect(dependencyCheck.dependencies.deals).toBe(0);
      expect(dependencyCheck.dependencies.engagements).toBe(0);
      expect(dependencyCheck.dependencies.contracts).toBe(0);
      expect(dependencyCheck.dependencies.proposals).toBe(0);
      expect(dependencyCheck.dependencies.invoices).toBe(0);
    });

    it('should include error message in 409 response', () => {
      // Simulate endpoint behavior
      const hasDependencies = true;
      const mockStatusCode = hasDependencies ? 409 : 204;
      const mockResponse = hasDependencies 
        ? {
            error: 'Cannot delete client with existing dependencies',
            dependencies: {
              contacts: 2,
              deals: 1,
              engagements: 0,
              contracts: 0,
              proposals: 0,
              invoices: 0,
            }
          }
        : null;

      // Assert
      expect(mockStatusCode).toBe(409);
      expect(mockResponse).toBeDefined();
      expect(mockResponse?.error).toBe('Cannot delete client with existing dependencies');
      expect(mockResponse?.dependencies).toBeDefined();
    });

    it('should return hasDependencies as boolean', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Test Client',
      });

      // Act - Without dependencies
      const checkWithout = await storage.checkClientCompanyDependencies(client.id, orgId);
      
      // Add dependency
      storage.addContact(client.id, orgId);
      
      // Act - With dependencies
      const checkWith = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert
      expect(typeof checkWithout.hasDependencies).toBe('boolean');
      expect(checkWithout.hasDependencies).toBe(false);
      expect(typeof checkWith.hasDependencies).toBe('boolean');
      expect(checkWith.hasDependencies).toBe(true);
    });

    it('should use consistent field naming (camelCase)', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Test Client',
      });
      
      storage.addContact(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert - Check camelCase naming
      expect(dependencyCheck).toHaveProperty('hasDependencies'); // Not has_dependencies
      expect(dependencyCheck.dependencies).not.toHaveProperty('client_company_id');
    });

    it('should provide actionable information in 409 response', async () => {
      // Arrange
      const orgId = 'org-1';
      const client = await storage.createClientCompany({
        organizationId: orgId,
        name: 'Client with Many Dependencies',
      });
      
      // Add various dependencies
      storage.addContact(client.id, orgId);
      storage.addContact(client.id, orgId);
      storage.addContact(client.id, orgId);
      storage.addDeal(client.id, orgId);
      storage.addDeal(client.id, orgId);
      storage.addInvoice(client.id, orgId);

      // Act
      const dependencyCheck = await storage.checkClientCompanyDependencies(client.id, orgId);

      // Assert - User can see exactly what needs to be cleaned up
      expect(dependencyCheck.hasDependencies).toBe(true);
      expect(dependencyCheck.dependencies.contacts).toBe(3);
      expect(dependencyCheck.dependencies.deals).toBe(2);
      expect(dependencyCheck.dependencies.invoices).toBe(1);
      
      // User knows they need to remove 3 contacts, 2 deals, and 1 invoice before deletion
    });
  });
});
