/**
 * Test data factories for generating consistent test entities.
 * 
 * These factories create valid test data that matches the database schema.
 * Use these instead of manually creating test objects to ensure consistency.
 */

import type {
  InsertOrganization,
  UpsertUser,
  InsertClientCompany,
  InsertContact,
  InsertDeal,
  InsertProposal,
  InsertContract,
  InsertEngagement,
  InsertProject,
  InsertTask,
  InsertInvoice,
  InsertBill,
  InsertVendor,
  InsertThread,
  InsertMessage,
} from '@shared/schema';

let idCounter = 1;
const uniqueId = () => `test-${Date.now()}-${idCounter++}`;

export const factories = {
  organization: (overrides: Partial<InsertOrganization> = {}): InsertOrganization => ({
    name: `Test Org ${uniqueId()}`,
    slug: `test-org-${uniqueId()}`,
    ...overrides,
  }),

  user: (overrides: Partial<UpsertUser> = {}): UpsertUser => ({
    id: uniqueId(),
    email: `user-${uniqueId()}@test.com`,
    name: `Test User ${idCounter}`,
    ...overrides,
  }),

  clientCompany: (organizationId: string, overrides: Partial<InsertClientCompany> = {}): InsertClientCompany => ({
    organizationId,
    name: `Test Client ${uniqueId()}`,
    status: 'active',
    ...overrides,
  }),

  contact: (organizationId: string, overrides: Partial<InsertContact> = {}): InsertContact => ({
    organizationId,
    firstName: `First${idCounter}`,
    lastName: `Last${idCounter}`,
    email: `contact-${uniqueId()}@test.com`,
    ...overrides,
  }),

  deal: (organizationId: string, overrides: Partial<InsertDeal> = {}): InsertDeal => ({
    organizationId,
    ownerId: 'test-owner-id',
    name: `Test Deal ${uniqueId()}`,
    stage: 'lead',
    value: '10000.00',
    ...overrides,
  }),

  proposal: (organizationId: string, overrides: Partial<InsertProposal> = {}): InsertProposal => ({
    organizationId,
    createdById: 'test-creator-id',
    name: `Test Proposal ${uniqueId()}`,
    status: 'draft',
    content: { sections: [] },
    ...overrides,
  }),

  contract: (organizationId: string, overrides: Partial<InsertContract> = {}): InsertContract => ({
    organizationId,
    createdById: 'test-creator-id',
    name: `Test Contract ${uniqueId()}`,
    status: 'draft',
    content: { terms: [] },
    ...overrides,
  }),

  engagement: (organizationId: string, overrides: Partial<InsertEngagement> = {}): InsertEngagement => ({
    organizationId,
    ownerId: 'test-owner-id',
    name: `Test Engagement ${uniqueId()}`,
    status: 'active',
    ...overrides,
  }),

  project: (organizationId: string, engagementId: string, overrides: Partial<InsertProject> = {}): InsertProject => ({
    organizationId,
    engagementId,
    name: `Test Project ${uniqueId()}`,
    status: 'not_started',
    ...overrides,
  }),

  task: (organizationId: string, projectId: string, overrides: Partial<InsertTask> = {}): InsertTask => ({
    organizationId,
    projectId,
    name: `Test Task ${uniqueId()}`,
    status: 'todo',
    priority: 'medium',
    ...overrides,
  }),

  invoice: (organizationId: string, engagementId: string, overrides: Partial<InsertInvoice> = {}): InsertInvoice => ({
    organizationId,
    engagementId,
    invoiceNumber: `INV-${uniqueId()}`,
    status: 'draft',
    amount: '1000.00',
    totalAmount: '1000.00',
    ...overrides,
  }),

  bill: (organizationId: string, overrides: Partial<InsertBill> = {}): InsertBill => ({
    organizationId,
    createdById: 'test-creator-id',
    billNumber: `BILL-${uniqueId()}`,
    status: 'pending',
    amount: '500.00',
    totalAmount: '500.00',
    ...overrides,
  }),

  vendor: (organizationId: string, overrides: Partial<InsertVendor> = {}): InsertVendor => ({
    organizationId,
    name: `Test Vendor ${uniqueId()}`,
    ...overrides,
  }),

  thread: (organizationId: string, engagementId: string, overrides: Partial<InsertThread> = {}): InsertThread => ({
    organizationId,
    engagementId,
    createdById: 'test-creator-id',
    subject: `Test Thread ${uniqueId()}`,
    type: 'internal',
    ...overrides,
  }),

  message: (organizationId: string, threadId: string, overrides: Partial<InsertMessage> = {}): InsertMessage => ({
    organizationId,
    threadId,
    senderId: 'test-sender-id',
    content: `Test message content ${uniqueId()}`,
    ...overrides,
  }),
};

/**
 * Reset the ID counter between tests if needed for deterministic IDs.
 */
export const resetFactoryIds = () => {
  idCounter = 1;
};
