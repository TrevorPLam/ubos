/**
 * Storage/data-access layer.
 *
 * This is the only place that should “know” about the database.
 * Route handlers call `storage.*` methods; those methods:
 * - apply multi-tenant scoping via `organizationId`
 * - perform CRUD using Drizzle
 * - return typed entities from `@shared/schema`
 *
 * AI iteration notes:
 * - When adding a new entity:
 *   1) add the table + types in `shared/schema.ts`
 *   2) add storage methods here that always take `orgId` for reads/updates/deletes
 *   3) call those methods from `server/routes.ts`
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  organizations,
  organizationMembers,
  clientCompanies,
  contacts,
  deals,
  proposals,
  contracts,
  engagements,
  projects,
  tasks,
  milestones,
  threads,
  messages,
  invoices,
  bills,
  vendors,
  fileObjects,
  activityEvents,
  projectTemplates,
  invoiceSchedules,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type ClientCompany,
  type InsertClientCompany,
  type Contact,
  type InsertContact,
  type Deal,
  type InsertDeal,
  type Proposal,
  type InsertProposal,
  type Contract,
  type InsertContract,
  type Engagement,
  type InsertEngagement,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type Thread,
  type InsertThread,
  type Message,
  type InsertMessage,
  type Invoice,
  type InsertInvoice,
  type Bill,
  type InsertBill,
  type Vendor,
  type InsertVendor,
  type ActivityEvent,
  type InsertActivityEvent,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserOrganization(userId: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;

  getClientCompanies(orgId: string): Promise<ClientCompany[]>;
  getClientCompany(id: string, orgId: string): Promise<ClientCompany | undefined>;
  createClientCompany(data: InsertClientCompany): Promise<ClientCompany>;
  updateClientCompany(
    id: string,
    orgId: string,
    data: Partial<InsertClientCompany>,
  ): Promise<ClientCompany | undefined>;
  deleteClientCompany(id: string, orgId: string): Promise<boolean>;

  getContacts(orgId: string): Promise<Contact[]>;
  getContact(id: string, orgId: string): Promise<Contact | undefined>;
  createContact(data: InsertContact): Promise<Contact>;
  updateContact(
    id: string,
    orgId: string,
    data: Partial<InsertContact>,
  ): Promise<Contact | undefined>;
  deleteContact(id: string, orgId: string): Promise<boolean>;

  getDeals(orgId: string): Promise<Deal[]>;
  getDeal(id: string, orgId: string): Promise<Deal | undefined>;
  createDeal(data: InsertDeal): Promise<Deal>;
  updateDeal(id: string, orgId: string, data: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string, orgId: string): Promise<boolean>;

  getProposals(orgId: string): Promise<Proposal[]>;
  getProposal(id: string, orgId: string): Promise<Proposal | undefined>;
  createProposal(data: InsertProposal): Promise<Proposal>;
  updateProposal(
    id: string,
    orgId: string,
    data: Partial<InsertProposal>,
  ): Promise<Proposal | undefined>;
  deleteProposal(id: string, orgId: string): Promise<boolean>;

  getContracts(orgId: string): Promise<Contract[]>;
  getContract(id: string, orgId: string): Promise<Contract | undefined>;
  createContract(data: InsertContract): Promise<Contract>;
  updateContract(
    id: string,
    orgId: string,
    data: Partial<InsertContract>,
  ): Promise<Contract | undefined>;
  deleteContract(id: string, orgId: string): Promise<boolean>;

  getEngagements(orgId: string): Promise<Engagement[]>;
  getEngagement(id: string, orgId: string): Promise<Engagement | undefined>;
  createEngagement(data: InsertEngagement): Promise<Engagement>;
  updateEngagement(
    id: string,
    orgId: string,
    data: Partial<InsertEngagement>,
  ): Promise<Engagement | undefined>;
  deleteEngagement(id: string, orgId: string): Promise<boolean>;

  getProjects(orgId: string): Promise<Project[]>;
  getProject(id: string, orgId: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(
    id: string,
    orgId: string,
    data: Partial<InsertProject>,
  ): Promise<Project | undefined>;
  deleteProject(id: string, orgId: string): Promise<boolean>;

  getTasks(orgId: string, projectId?: string): Promise<Task[]>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, orgId: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string, orgId: string): Promise<boolean>;

  getThreads(orgId: string): Promise<Thread[]>;
  getThread(id: string, orgId: string): Promise<Thread | undefined>;
  createThread(data: InsertThread): Promise<Thread>;

  getMessages(threadId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  getInvoices(orgId: string): Promise<Invoice[]>;
  getInvoice(id: string, orgId: string): Promise<Invoice | undefined>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(
    id: string,
    orgId: string,
    data: Partial<InsertInvoice>,
  ): Promise<Invoice | undefined>;
  deleteInvoice(id: string, orgId: string): Promise<boolean>;

  getBills(orgId: string): Promise<Bill[]>;
  getBill(id: string, orgId: string): Promise<Bill | undefined>;
  createBill(data: InsertBill): Promise<Bill>;
  updateBill(id: string, orgId: string, data: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: string, orgId: string): Promise<boolean>;

  getVendors(orgId: string): Promise<Vendor[]>;
  createVendor(data: InsertVendor): Promise<Vendor>;

  createActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent>;
  getActivityEvents(orgId: string, engagementId?: string): Promise<ActivityEvent[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    // Users are not org-scoped; they represent identities.
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserOrganization(userId: string): Promise<Organization | undefined> {
    // Membership drives tenancy: a user can belong to 0..n organizations.
    // Today we pick the first match; upgrade later if you add org switching.
    const result = await db
      .select({ organization: organizations })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);
    return result[0]?.organization;
  }

  async createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();

    // Ensure the creator can immediately access the org’s data.
    await db.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: ownerId,
      role: "owner",
    });
    return newOrg;
  }

  async getClientCompanies(orgId: string): Promise<ClientCompany[]> {
    return db
      .select()
      .from(clientCompanies)
      .where(eq(clientCompanies.organizationId, orgId))
      .orderBy(desc(clientCompanies.createdAt));
  }

  async getClientCompany(id: string, orgId: string): Promise<ClientCompany | undefined> {
    const [client] = await db
      .select()
      .from(clientCompanies)
      .where(and(eq(clientCompanies.id, id), eq(clientCompanies.organizationId, orgId)));
    return client;
  }

  async createClientCompany(data: InsertClientCompany): Promise<ClientCompany> {
    const [client] = await db.insert(clientCompanies).values(data).returning();
    return client;
  }

  async updateClientCompany(
    id: string,
    orgId: string,
    data: Partial<InsertClientCompany>,
  ): Promise<ClientCompany | undefined> {
    // Always bump `updatedAt` so lists and caches can rely on it.
    const [client] = await db
      .update(clientCompanies)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(clientCompanies.id, id), eq(clientCompanies.organizationId, orgId)))
      .returning();
    return client;
  }

  async deleteClientCompany(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(clientCompanies)
      .where(and(eq(clientCompanies.id, id), eq(clientCompanies.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getContacts(orgId: string): Promise<Contact[]> {
    return db
      .select()
      .from(contacts)
      .where(eq(contacts.organizationId, orgId))
      .orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string, orgId: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)));
    return contact;
  }

  async createContact(data: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
  }

  async updateContact(
    id: string,
    orgId: string,
    data: Partial<InsertContact>,
  ): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
      .returning();
    return contact;
  }

  async deleteContact(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getDeals(orgId: string): Promise<Deal[]> {
    return db
      .select()
      .from(deals)
      .where(eq(deals.organizationId, orgId))
      .orderBy(desc(deals.createdAt));
  }

  async getDeal(id: string, orgId: string): Promise<Deal | undefined> {
    const [deal] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)));
    return deal;
  }

  async createDeal(data: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(deals).values(data).returning();
    return deal;
  }

  async updateDeal(
    id: string,
    orgId: string,
    data: Partial<InsertDeal>,
  ): Promise<Deal | undefined> {
    const [deal] = await db
      .update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
      .returning();
    return deal;
  }

  async deleteDeal(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(deals)
      .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getProposals(orgId: string): Promise<Proposal[]> {
    return db
      .select()
      .from(proposals)
      .where(eq(proposals.organizationId, orgId))
      .orderBy(desc(proposals.createdAt));
  }

  async getProposal(id: string, orgId: string): Promise<Proposal | undefined> {
    const [proposal] = await db
      .select()
      .from(proposals)
      .where(and(eq(proposals.id, id), eq(proposals.organizationId, orgId)));
    return proposal;
  }

  async createProposal(data: InsertProposal): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values(data).returning();
    return proposal;
  }

  async updateProposal(
    id: string,
    orgId: string,
    data: Partial<InsertProposal>,
  ): Promise<Proposal | undefined> {
    const [proposal] = await db
      .update(proposals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(proposals.id, id), eq(proposals.organizationId, orgId)))
      .returning();
    return proposal;
  }

  async deleteProposal(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(proposals)
      .where(and(eq(proposals.id, id), eq(proposals.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getContracts(orgId: string): Promise<Contract[]> {
    return db
      .select()
      .from(contracts)
      .where(eq(contracts.organizationId, orgId))
      .orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string, orgId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.organizationId, orgId)));
    return contract;
  }

  async createContract(data: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(data).returning();
    return contract;
  }

  async updateContract(
    id: string,
    orgId: string,
    data: Partial<InsertContract>,
  ): Promise<Contract | undefined> {
    const [contract] = await db
      .update(contracts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.organizationId, orgId)))
      .returning();
    return contract;
  }

  async deleteContract(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getEngagements(orgId: string): Promise<Engagement[]> {
    return db
      .select()
      .from(engagements)
      .where(eq(engagements.organizationId, orgId))
      .orderBy(desc(engagements.createdAt));
  }

  async getEngagement(id: string, orgId: string): Promise<Engagement | undefined> {
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, id), eq(engagements.organizationId, orgId)));
    return engagement;
  }

  async createEngagement(data: InsertEngagement): Promise<Engagement> {
    const [engagement] = await db.insert(engagements).values(data).returning();
    return engagement;
  }

  async updateEngagement(
    id: string,
    orgId: string,
    data: Partial<InsertEngagement>,
  ): Promise<Engagement | undefined> {
    const [engagement] = await db
      .update(engagements)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(engagements.id, id), eq(engagements.organizationId, orgId)))
      .returning();
    return engagement;
  }

  async deleteEngagement(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(engagements)
      .where(and(eq(engagements.id, id), eq(engagements.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getProjects(orgId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, orgId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string, orgId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
    return project;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(
    id: string,
    orgId: string,
    data: Partial<InsertProject>,
  ): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)))
      .returning();
    return project;
  }

  async deleteProject(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getTasks(orgId: string, projectId?: string): Promise<Task[]> {
    if (projectId) {
      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.organizationId, orgId), eq(tasks.projectId, projectId)))
        .orderBy(desc(tasks.createdAt));
    }
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, orgId))
      .orderBy(desc(tasks.createdAt));
  }

  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  }

  async updateTask(
    id: string,
    orgId: string,
    data: Partial<InsertTask>,
  ): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, orgId)))
      .returning();
    return task;
  }

  async deleteTask(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getThreads(orgId: string): Promise<Thread[]> {
    return db
      .select()
      .from(threads)
      .where(eq(threads.organizationId, orgId))
      .orderBy(desc(threads.lastMessageAt));
  }

  async getThread(id: string, orgId: string): Promise<Thread | undefined> {
    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, id), eq(threads.organizationId, orgId)));
    return thread;
  }

  async createThread(data: InsertThread): Promise<Thread> {
    const [thread] = await db.insert(threads).values(data).returning();
    return thread;
  }

  async getMessages(threadId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    await db
      .update(threads)
      .set({ lastMessageAt: new Date() })
      .where(eq(threads.id, data.threadId));
    return message;
  }

  async getInvoices(orgId: string): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, orgId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string, orgId: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, orgId)));
    return invoice;
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async updateInvoice(
    id: string,
    orgId: string,
    data: Partial<InsertInvoice>,
  ): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, orgId)))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getBills(orgId: string): Promise<Bill[]> {
    return db
      .select()
      .from(bills)
      .where(eq(bills.organizationId, orgId))
      .orderBy(desc(bills.createdAt));
  }

  async getBill(id: string, orgId: string): Promise<Bill | undefined> {
    const [bill] = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, id), eq(bills.organizationId, orgId)));
    return bill;
  }

  async createBill(data: InsertBill): Promise<Bill> {
    const [bill] = await db.insert(bills).values(data).returning();
    return bill;
  }

  async updateBill(
    id: string,
    orgId: string,
    data: Partial<InsertBill>,
  ): Promise<Bill | undefined> {
    const [bill] = await db
      .update(bills)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bills.id, id), eq(bills.organizationId, orgId)))
      .returning();
    return bill;
  }

  async deleteBill(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(bills)
      .where(and(eq(bills.id, id), eq(bills.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getVendors(orgId: string): Promise<Vendor[]> {
    return db
      .select()
      .from(vendors)
      .where(eq(vendors.organizationId, orgId))
      .orderBy(desc(vendors.createdAt));
  }

  async createVendor(data: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values(data).returning();
    return vendor;
  }

  async createActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent> {
    const [event] = await db.insert(activityEvents).values(data).returning();
    return event;
  }

  async getActivityEvents(orgId: string, engagementId?: string): Promise<ActivityEvent[]> {
    if (engagementId) {
      return db
        .select()
        .from(activityEvents)
        .where(
          and(
            eq(activityEvents.organizationId, orgId),
            eq(activityEvents.engagementId, engagementId),
          ),
        )
        .orderBy(desc(activityEvents.createdAt));
    }
    return db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.organizationId, orgId))
      .orderBy(desc(activityEvents.createdAt));
  }
}

export const storage = new DatabaseStorage();
