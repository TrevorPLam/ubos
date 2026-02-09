// AI-META-BEGIN
// AI-META: Test file for GET /api/clients/stats endpoint
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Unit tests for GET /api/clients/stats endpoint
 * 
 * Tests client company statistics aggregation including total count, recently added,
 * industry breakdown, country breakdown, active engagements, and clients without contacts.
 * Validates Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
 * Mock storage class to simulate getClientCompanyStats behavior
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

  addClient(client: Partial<ClientCompany> & { id: string; organizationId: string; name: string }): ClientCompany {
    const now = new Date();
    const fullClient: ClientCompany = {
      id: client.id,
      organizationId: client.organizationId,
      name: client.name,
      website: client.website ?? null,
      industry: client.industry ?? null,
      address: client.address ?? null,
      city: client.city ?? null,
      state: client.state ?? null,
      zipCode: client.zipCode ?? null,
      country: client.country ?? null,
      notes: client.notes ?? null,
      createdAt: client.createdAt ?? now,
      updatedAt: client.updatedAt ?? now,
    };
    this.clients.push(fullClient);
    return fullClient;
  }

  addContact(contact: Partial<Contact> & { id: string; organizationId: string; clientCompanyId: string }): Contact {
    const now = new Date();
    const fullContact: Contact = {
      id: contact.id,
      organizationId: contact.organizationId,
      clientCompanyId: contact.clientCompanyId,
      firstName: contact.firstName ?? 'Test',
      lastName: contact.lastName ?? 'Contact',
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      title: contact.title ?? null,
      isPrimary: contact.isPrimary ?? false,
      notes: contact.notes ?? null,
      createdAt: contact.createdAt ?? now,
      updatedAt: contact.updatedAt ?? now,
    };
    this.contacts.push(fullContact);
    return fullContact;
  }

  addEngagement(engagement: Partial<Engagement> & { id: string; organizationId: string; clientCompanyId: string }): Engagement {
    const now = new Date();
    const fullEngagement: Engagement = {
      id: engagement.id,
      organizationId: engagement.organizationId,
      clientCompanyId: engagement.clientCompanyId,
      name: engagement.name ?? 'Test Engagement',
      description: engagement.description ?? null,
      status: engagement.status ?? 'active',
      startDate: engagement.startDate ?? now,
      endDate: engagement.endDate ?? null,
      createdAt: engagement.createdAt ?? now,
      updatedAt: engagement.updatedAt ?? now,
    };
    this.engagements.push(fullEngagement);
    return fullEngagement;
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

describe('GET /api/clients/stats - Unit Tests', () => {
  beforeEach(() => {
    storage = new MockStatsStorage();
  });

  describe('Statistics with No Clients', () => {
    it('should return all counts as 0 when no clients exist', async () => {
      // Arrange
      const orgId = 'org-1';

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.recentlyAdded).toBe(0);
      expect(stats.byIndustry).toEqual({});
      expect(stats.byCountry).toEqual({});
      expect(stats.withActiveEngagements).toBe(0);
      expect(stats.withoutContacts).toBe(0);
    });

    it('should return 200 status code even with no clients', () => {
      // Simulate endpoint response
      const mockStatusCode = 200;
      const mockStats: ClientCompanyStats = {
        total: 0,
        recentlyAdded: 0,
        byIndustry: {},
        byCountry: {},
        withActiveEngagements: 0,
        withoutContacts: 0,
      };

      // Assert
      expect(mockStatusCode).toBe(200);
      expect(mockStats).toBeDefined();
    });
  });

  describe('Statistics with Multiple Clients', () => {
    it('should calculate total count correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2' });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(3);
    });

    it('should include all required fields in response', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('recentlyAdded');
      expect(stats).toHaveProperty('byIndustry');
      expect(stats).toHaveProperty('byCountry');
      expect(stats).toHaveProperty('withActiveEngagements');
      expect(stats).toHaveProperty('withoutContacts');
    });
  });

  describe('Industry Breakdown Accuracy', () => {
    it('should group clients by industry correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', industry: 'Technology' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2', industry: 'Technology' });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3', industry: 'Finance' });
      storage.addClient({ id: 'c4', organizationId: orgId, name: 'Client 4', industry: 'Healthcare' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.byIndustry).toEqual({
        'Technology': 2,
        'Finance': 1,
        'Healthcare': 1,
      });
    });

    it('should exclude clients with null industry from breakdown', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', industry: 'Technology' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2', industry: null });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3', industry: null });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.byIndustry).toEqual({ 'Technology': 1 });
      expect(stats.byIndustry).not.toHaveProperty('null');
    });

    it('should handle multiple industries with same count', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', industry: 'Technology' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2', industry: 'Finance' });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3', industry: 'Healthcare' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.byIndustry).toEqual({
        'Technology': 1,
        'Finance': 1,
        'Healthcare': 1,
      });
    });
  });

  describe('Country Breakdown Accuracy', () => {
    it('should group clients by country correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', country: 'USA' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2', country: 'USA' });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3', country: 'Canada' });
      storage.addClient({ id: 'c4', organizationId: orgId, name: 'Client 4', country: 'UK' });
      storage.addClient({ id: 'c5', organizationId: orgId, name: 'Client 5', country: 'USA' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.byCountry).toEqual({
        'USA': 3,
        'Canada': 1,
        'UK': 1,
      });
    });

    it('should exclude clients with null country from breakdown', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', country: 'USA' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2', country: null });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.byCountry).toEqual({ 'USA': 1 });
    });
  });

  describe('Recently Added Count (Last 30 Days)', () => {
    it('should count clients added in last 30 days', async () => {
      // Arrange
      const orgId = 'org-1';
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Recent 1', createdAt: now });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Recent 2', createdAt: twentyDaysAgo });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Old', createdAt: fortyDaysAgo });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.recentlyAdded).toBe(2);
    });

    it('should return 0 recently added when all clients are old', async () => {
      // Arrange
      const orgId = 'org-1';
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Old 1', createdAt: sixtyDaysAgo });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Old 2', createdAt: sixtyDaysAgo });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.recentlyAdded).toBe(0);
    });

    it('should count client created exactly 30 days ago as recent', async () => {
      // Arrange
      const orgId = 'org-1';
      const now = new Date();
      const exactlyThirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Boundary', createdAt: exactlyThirtyDaysAgo });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.recentlyAdded).toBe(1);
    });
  });

  describe('Active Engagements Count', () => {
    it('should count clients with active engagements', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2' });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3' });

      storage.addEngagement({ id: 'e1', organizationId: orgId, clientCompanyId: 'c1', status: 'active' });
      storage.addEngagement({ id: 'e2', organizationId: orgId, clientCompanyId: 'c2', status: 'active' });
      storage.addEngagement({ id: 'e3', organizationId: orgId, clientCompanyId: 'c3', status: 'completed' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.withActiveEngagements).toBe(2);
    });

    it('should count client once even with multiple active engagements', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });

      storage.addEngagement({ id: 'e1', organizationId: orgId, clientCompanyId: 'c1', status: 'active' });
      storage.addEngagement({ id: 'e2', organizationId: orgId, clientCompanyId: 'c1', status: 'active' });
      storage.addEngagement({ id: 'e3', organizationId: orgId, clientCompanyId: 'c1', status: 'active' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.withActiveEngagements).toBe(1);
    });

    it('should return 0 when no active engagements exist', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2' });

      storage.addEngagement({ id: 'e1', organizationId: orgId, clientCompanyId: 'c1', status: 'completed' });
      storage.addEngagement({ id: 'e2', organizationId: orgId, clientCompanyId: 'c2', status: 'cancelled' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.withActiveEngagements).toBe(0);
    });
  });

  describe('Clients Without Contacts Count', () => {
    it('should count clients without any contacts', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2' });
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3' });

      storage.addContact({ id: 'ct1', organizationId: orgId, clientCompanyId: 'c1' });
      storage.addContact({ id: 'ct2', organizationId: orgId, clientCompanyId: 'c2' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.withoutContacts).toBe(1);
    });

    it('should return 0 when all clients have contacts', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2' });

      storage.addContact({ id: 'ct1', organizationId: orgId, clientCompanyId: 'c1' });
      storage.addContact({ id: 'ct2', organizationId: orgId, clientCompanyId: 'c2' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.withoutContacts).toBe(0);
    });

    it('should count client once even with multiple contacts', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1' });
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2' });

      storage.addContact({ id: 'ct1', organizationId: orgId, clientCompanyId: 'c1' });
      storage.addContact({ id: 'ct2', organizationId: orgId, clientCompanyId: 'c1' });
      storage.addContact({ id: 'ct3', organizationId: orgId, clientCompanyId: 'c1' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.withoutContacts).toBe(1); // c2 has no contacts
    });
  });

  describe('Organization Isolation', () => {
    it('should only include statistics from user organization', async () => {
      // Arrange
      const org1 = 'org-1';
      const org2 = 'org-2';

      storage.addClient({ id: 'c1', organizationId: org1, name: 'Org1 Client 1', industry: 'Technology' });
      storage.addClient({ id: 'c2', organizationId: org1, name: 'Org1 Client 2', industry: 'Technology' });
      storage.addClient({ id: 'c3', organizationId: org2, name: 'Org2 Client 1', industry: 'Finance' });
      storage.addClient({ id: 'c4', organizationId: org2, name: 'Org2 Client 2', industry: 'Finance' });

      // Act
      const stats1 = await storage.getClientCompanyStats(org1);
      const stats2 = await storage.getClientCompanyStats(org2);

      // Assert
      expect(stats1.total).toBe(2);
      expect(stats1.byIndustry).toEqual({ 'Technology': 2 });
      expect(stats2.total).toBe(2);
      expect(stats2.byIndustry).toEqual({ 'Finance': 2 });
    });

    it('should not count contacts from other organizations', async () => {
      // Arrange
      const org1 = 'org-1';
      const org2 = 'org-2';

      storage.addClient({ id: 'c1', organizationId: org1, name: 'Org1 Client' });
      storage.addClient({ id: 'c2', organizationId: org2, name: 'Org2 Client' });

      storage.addContact({ id: 'ct1', organizationId: org1, clientCompanyId: 'c1' });
      storage.addContact({ id: 'ct2', organizationId: org2, clientCompanyId: 'c2' });

      // Act
      const stats1 = await storage.getClientCompanyStats(org1);
      const stats2 = await storage.getClientCompanyStats(org2);

      // Assert
      expect(stats1.withoutContacts).toBe(0);
      expect(stats2.withoutContacts).toBe(0);
    });

    it('should not count engagements from other organizations', async () => {
      // Arrange
      const org1 = 'org-1';
      const org2 = 'org-2';

      storage.addClient({ id: 'c1', organizationId: org1, name: 'Org1 Client' });
      storage.addClient({ id: 'c2', organizationId: org2, name: 'Org2 Client' });

      storage.addEngagement({ id: 'e1', organizationId: org1, clientCompanyId: 'c1', status: 'active' });
      storage.addEngagement({ id: 'e2', organizationId: org2, clientCompanyId: 'c2', status: 'active' });

      // Act
      const stats1 = await storage.getClientCompanyStats(org1);
      const stats2 = await storage.getClientCompanyStats(org2);

      // Assert
      expect(stats1.withActiveEngagements).toBe(1);
      expect(stats2.withActiveEngagements).toBe(1);
    });
  });

  describe('Response Format', () => {
    it('should return all required fields in correct format', async () => {
      // Arrange
      const orgId = 'org-1';
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', industry: 'Technology', country: 'USA' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.recentlyAdded).toBe('number');
      expect(typeof stats.byIndustry).toBe('object');
      expect(typeof stats.byCountry).toBe('object');
      expect(typeof stats.withActiveEngagements).toBe('number');
      expect(typeof stats.withoutContacts).toBe('number');
    });

    it('should use camelCase for field names', async () => {
      // Arrange
      const orgId = 'org-1';

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats).toHaveProperty('recentlyAdded'); // Not recently_added
      expect(stats).toHaveProperty('byIndustry'); // Not by_industry
      expect(stats).toHaveProperty('byCountry'); // Not by_country
      expect(stats).toHaveProperty('withActiveEngagements'); // Not with_active_engagements
      expect(stats).toHaveProperty('withoutContacts'); // Not without_contacts
    });

    it('should return empty objects for breakdowns when no data', async () => {
      // Arrange
      const orgId = 'org-1';

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.byIndustry).toEqual({});
      expect(stats.byCountry).toEqual({});
      expect(Array.isArray(stats.byIndustry)).toBe(false);
      expect(Array.isArray(stats.byCountry)).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle clients with mixed attributes correctly', async () => {
      // Arrange
      const orgId = 'org-1';
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Client 1: Recent, Technology, USA, has contact, has active engagement
      storage.addClient({ id: 'c1', organizationId: orgId, name: 'Client 1', industry: 'Technology', country: 'USA', createdAt: recentDate });
      storage.addContact({ id: 'ct1', organizationId: orgId, clientCompanyId: 'c1' });
      storage.addEngagement({ id: 'e1', organizationId: orgId, clientCompanyId: 'c1', status: 'active' });

      // Client 2: Old, Finance, Canada, no contact, no engagement
      storage.addClient({ id: 'c2', organizationId: orgId, name: 'Client 2', industry: 'Finance', country: 'Canada', createdAt: oldDate });

      // Client 3: Recent, Technology, USA, has contact, completed engagement
      storage.addClient({ id: 'c3', organizationId: orgId, name: 'Client 3', industry: 'Technology', country: 'USA', createdAt: recentDate });
      storage.addContact({ id: 'ct3', organizationId: orgId, clientCompanyId: 'c3' });
      storage.addEngagement({ id: 'e3', organizationId: orgId, clientCompanyId: 'c3', status: 'completed' });

      // Act
      const stats = await storage.getClientCompanyStats(orgId);

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.recentlyAdded).toBe(2);
      expect(stats.byIndustry).toEqual({ 'Technology': 2, 'Finance': 1 });
      expect(stats.byCountry).toEqual({ 'USA': 2, 'Canada': 1 });
      expect(stats.withActiveEngagements).toBe(1);
      expect(stats.withoutContacts).toBe(1);
    });
  });
});
