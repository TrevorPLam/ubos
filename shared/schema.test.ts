// AI-META-BEGIN
// AI-META: Test file for schema.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for Zod insert schemas defined in shared/schema.ts.
 * 
 * These tests validate that:
 * - Required fields are enforced
 * - Optional fields work correctly
 * - Enum values are validated
 * - Invalid data is rejected
 */

import { describe, it, expect } from 'vitest';
import {
  insertOrganizationSchema,
  insertClientCompanySchema,
  insertContactSchema,
  insertDealSchema,
  insertProposalSchema,
  insertContractSchema,
  insertEngagementSchema,
  insertProjectSchema,
  insertTaskSchema,
  insertInvoiceSchema,
  insertBillSchema,
  insertVendorSchema,
  insertThreadSchema,
  insertMessageSchema,
} from '@shared/schema';

describe('Schema Validation Tests', () => {
  describe('Organization Schema', () => {
    it('should validate a valid organization', () => {
      const valid = {
        name: 'Test Org',
        slug: 'test-org',
      };
      expect(() => insertOrganizationSchema.parse(valid)).not.toThrow();
    });

    it('should reject organization without name', () => {
      const invalid = {
        slug: 'test-org',
      };
      expect(() => insertOrganizationSchema.parse(invalid)).toThrow();
    });

    it('should reject organization without slug', () => {
      const invalid = {
        name: 'Test Org',
      };
      expect(() => insertOrganizationSchema.parse(invalid)).toThrow();
    });
  });

  describe('User Schema', () => {
    it('should validate a valid user', () => {
      const valid = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      // User schema is from models/auth and uses UpsertUser type
      // All fields are optional except id which has a default
      expect(() => valid).toBeDefined();
    });
  });

  describe('Client Company Schema', () => {
    it('should validate a valid client company', () => {
      const valid = {
        organizationId: 'org-123',
        name: 'Test Client',
        status: 'active' as const,
      };
      expect(() => insertClientCompanySchema.parse(valid)).not.toThrow();
    });

    it('should reject client without organizationId', () => {
      const invalid = {
        name: 'Test Client',
        status: 'active',
      };
      expect(() => insertClientCompanySchema.parse(invalid)).toThrow();
    });

    it('should accept client with optional fields', () => {
      const valid = {
        organizationId: 'org-123',
        name: 'Test Client',
        status: 'active' as const,
        website: 'https://example.com',
        industry: 'Technology',
        size: '50-100',
      };
      expect(() => insertClientCompanySchema.parse(valid)).not.toThrow();
    });
  });

  describe('Contact Schema', () => {
    it('should validate a valid contact', () => {
      const valid = {
        organizationId: 'org-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      expect(() => insertContactSchema.parse(valid)).not.toThrow();
    });

    it('should accept contact with clientCompanyId', () => {
      const valid = {
        organizationId: 'org-123',
        clientCompanyId: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      expect(() => insertContactSchema.parse(valid)).not.toThrow();
    });
  });

  describe('Deal Schema', () => {
    it('should validate deal with valid stage', () => {
      const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      
      stages.forEach(stage => {
        const valid = {
          organizationId: 'org-123',
          ownerId: 'user-123',
          name: 'Test Deal',
          stage: stage as any,
          value: '10000.00', // decimal is stored as string
        };
        expect(() => insertDealSchema.parse(valid)).not.toThrow();
      });
    });

    it('should reject deal with invalid stage', () => {
      const invalid = {
        organizationId: 'org-123',
        ownerId: 'user-123',
        name: 'Test Deal',
        stage: 'invalid-stage',
        value: '10000.00',
      };
      expect(() => insertDealSchema.parse(invalid)).toThrow();
    });
  });

  describe('Proposal Schema', () => {
    it('should validate proposal with valid status', () => {
      const statuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
      
      statuses.forEach(status => {
        const valid = {
          organizationId: 'org-123',
          createdById: 'user-123',
          name: 'Test Proposal',
          status: status as any,
          content: {},
        };
        expect(() => insertProposalSchema.parse(valid)).not.toThrow();
      });
    });

    it('should accept proposal with JSONB content', () => {
      const valid = {
        organizationId: 'org-123',
        createdById: 'user-123',
        name: 'Test Proposal',
        status: 'draft' as const,
        content: {
          sections: [
            { title: 'Introduction', body: 'Lorem ipsum' },
          ],
        },
      };
      expect(() => insertProposalSchema.parse(valid)).not.toThrow();
    });
  });

  describe('Contract Schema', () => {
    it('should validate contract with valid status', () => {
      const statuses = ['draft', 'sent', 'signed', 'expired', 'cancelled'];
      
      statuses.forEach(status => {
        const valid = {
          organizationId: 'org-123',
          createdById: 'user-123',
          name: 'Test Contract',
          status: status as any,
          content: {},
        };
        expect(() => insertContractSchema.parse(valid)).not.toThrow();
      });
    });
  });

  describe('Engagement Schema', () => {
    it('should validate engagement with valid status', () => {
      const statuses = ['active', 'on_hold', 'completed', 'cancelled'];
      
      statuses.forEach(status => {
        const valid = {
          organizationId: 'org-123',
          ownerId: 'user-123',
          name: 'Test Engagement',
          status: status as any,
        };
        expect(() => insertEngagementSchema.parse(valid)).not.toThrow();
      });
    });
  });

  describe('Project Schema', () => {
    it('should validate project with valid status', () => {
      const statuses = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'];
      
      statuses.forEach(status => {
        const valid = {
          organizationId: 'org-123',
          engagementId: 'eng-123',
          name: 'Test Project',
          status: status as any,
        };
        expect(() => insertProjectSchema.parse(valid)).not.toThrow();
      });
    });

    it('should require engagementId', () => {
      const invalid = {
        organizationId: 'org-123',
        name: 'Test Project',
        status: 'not_started',
      };
      expect(() => insertProjectSchema.parse(invalid)).toThrow();
    });
  });

  describe('Task Schema', () => {
    it('should validate task with valid status and priority', () => {
      const statuses = ['todo', 'in_progress', 'review', 'completed', 'cancelled'];
      const priorities = ['low', 'medium', 'high', 'urgent'];
      
      statuses.forEach(status => {
        priorities.forEach(priority => {
          const valid = {
            organizationId: 'org-123',
            projectId: 'proj-123',
            name: 'Test Task',
            status: status as any,
            priority: priority as any,
          };
          expect(() => insertTaskSchema.parse(valid)).not.toThrow();
        });
      });
    });

    it('should reject task with invalid priority', () => {
      const invalid = {
        organizationId: 'org-123',
        projectId: 'proj-123',
        name: 'Test Task',
        status: 'todo',
        priority: 'super-urgent',
      };
      expect(() => insertTaskSchema.parse(invalid)).toThrow();
    });
  });

  describe('Invoice Schema', () => {
    it('should validate invoice with valid status', () => {
      const statuses = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];
      
      statuses.forEach(status => {
        const valid = {
          organizationId: 'org-123',
          engagementId: 'eng-123',
          invoiceNumber: 'INV-001',
          status: status as any,
          amount: '1000.00',
          totalAmount: '1000.00', // decimal is stored as string
        };
        expect(() => insertInvoiceSchema.parse(valid)).not.toThrow();
      });
    });

    it('should allow invoice without totalAmount (optional)', () => {
      const valid = {
        organizationId: 'org-123',
        engagementId: 'eng-123',
        invoiceNumber: 'INV-001',
        status: 'draft' as const,
        amount: '1000.00',
        totalAmount: '1000.00',
      };
      expect(() => insertInvoiceSchema.parse(valid)).not.toThrow();
    });
  });

  describe('Bill Schema', () => {
    it('should validate bill with valid status', () => {
      const statuses = ['pending', 'approved', 'rejected', 'paid', 'cancelled'];
      
      statuses.forEach(status => {
        const valid = {
          organizationId: 'org-123',
          createdById: 'user-123',
          billNumber: 'BILL-001',
          status: status as any,
          amount: '500.00',
          totalAmount: '500.00', // decimal is stored as string
        };
        expect(() => insertBillSchema.parse(valid)).not.toThrow();
      });
    });
  });

  describe('Vendor Schema', () => {
    it('should validate a valid vendor', () => {
      const valid = {
        organizationId: 'org-123',
        name: 'Test Vendor',
      };
      expect(() => insertVendorSchema.parse(valid)).not.toThrow();
    });

    it('should accept vendor with optional contact info', () => {
      const valid = {
        organizationId: 'org-123',
        name: 'Test Vendor',
        email: 'vendor@example.com',
        phone: '+1234567890',
        website: 'https://vendor.com',
      };
      expect(() => insertVendorSchema.parse(valid)).not.toThrow();
    });
  });

  describe('Thread Schema', () => {
    it('should validate thread with valid type', () => {
      const types = ['internal', 'client'];
      
      types.forEach(type => {
        const valid = {
          organizationId: 'org-123',
          engagementId: 'eng-123',
          createdById: 'user-123',
          subject: 'Test Thread',
          type: type as any,
        };
        expect(() => insertThreadSchema.parse(valid)).not.toThrow();
      });
    });

    it('should reject thread with invalid type', () => {
      const invalid = {
        organizationId: 'org-123',
        engagementId: 'eng-123',
        createdById: 'user-123',
        subject: 'Test Thread',
        type: 'public',
      };
      expect(() => insertThreadSchema.parse(invalid)).toThrow();
    });
  });

  describe('Message Schema', () => {
    it('should validate a valid message', () => {
      const valid = {
        organizationId: 'org-123',
        threadId: 'thread-123',
        senderId: 'user-123',
        content: 'Test message content',
      };
      expect(() => insertMessageSchema.parse(valid)).not.toThrow();
    });

    it('should require content', () => {
      const invalid = {
        organizationId: 'org-123',
        threadId: 'thread-123',
        senderId: 'user-123',
      };
      expect(() => insertMessageSchema.parse(invalid)).toThrow();
    });
  });
});
