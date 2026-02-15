// AI-META-BEGIN
// AI-META: File storage with presigned URLs
// OWNERSHIP: server/files
// ENTRYPOINTS: API routes for files
// DEPENDENCIES: cloud storage SDK
// DANGER: Unauthorized file access
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: manual testing
// AI-META-END

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

import { eq, and, desc, isNull, asc, sql, or, ilike, count, inArray } from "drizzle-orm";
import { db } from "./db";
import { randomUUID } from "crypto";
import { 
  users, organizations, organizationMembers, clientCompanies, contacts, deals, proposals,
  contracts, engagements, projects, tasks, milestones, threads, messages, invoices,
  bills, vendors, fileObjects, activityEvents, outbox, projectTemplates, invoiceSchedules,
  permissions, roles, rolePermissions, userRoles, invitations,
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
  type OutboxEvent,
  type InsertOutboxEvent,
  type InsertFileObject,
  type FileObject,
  type Permission,
  type InsertPermission,
  type Role,
  type InsertRole,
  type RolePermission,
  type InsertRolePermission,
  type UserRole,
  type InsertUserRole,
  type Invitation,
  type InsertInvitation,
} from "@shared/schema";
import type {
  PaginationOptions,
  FilterOptions,
  PaginatedResult,
  ClientCompanyWithRelations,
  DependencyCheckResult,
  ClientCompanyStats,
} from "@shared/client-schemas";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>; // 2026 security: Email-based authentication
  upsertUser(user: UpsertUser): Promise<User>;
  getUserOrganization(userId: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;

  // Organization lookup
  getOrganization(orgId: string): Promise<Organization | undefined>;

  // Organization Settings Management (Requirements 94.1, 94.2)
  getOrganizationSettings(orgId: string): Promise<Organization>;
  updateOrganizationSettings(orgId: string, data: Partial<Organization>): Promise<Organization>;
  updateOrganizationLogo(orgId: string, logoUrl: string): Promise<Organization>;

  // User Profile Management (2026 privacy-by-design)
  updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    timezone?: string;
  }): Promise<User | undefined>;
  updateUserPassword(userId: string, currentPassword: string | null, newPassword: string): Promise<boolean>;
  updateUserNotificationPreferences(userId: string, preferences: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    projectUpdates?: boolean;
    taskReminders?: boolean;
    invoiceNotifications?: boolean;
  }): Promise<User | undefined>;
  updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined>;
  checkEmailExists(email: string, excludeUserId?: string): Promise<boolean>;
  sendEmailChangeConfirmation(userId: string, newEmail: string): Promise<void>;

  getClientCompanies(orgId: string): Promise<ClientCompany[]>;
  getClientCompany(id: string, orgId: string): Promise<ClientCompany | undefined>;
  getClientCompaniesPaginated(
    orgId: string,
    options: PaginationOptions & FilterOptions,
  ): Promise<PaginatedResult<ClientCompany>>;
  getClientCompanyWithRelations(
    id: string,
    orgId: string,
  ): Promise<ClientCompanyWithRelations | undefined>;
  checkClientCompanyDependencies(
    id: string,
    orgId: string,
  ): Promise<DependencyCheckResult>;
  getClientCompanyStats(orgId: string): Promise<ClientCompanyStats>;
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

  createFileObject(data: InsertFileObject): Promise<FileObject>;
  getFileObject(id: string): Promise<FileObject | undefined>;
  getFileObjects(orgId: string, engagementId?: string): Promise<FileObject[]>;

  createActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent>;
  getActivityEvents(orgId: string, engagementId?: string): Promise<ActivityEvent[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    // Users are not org-scoped; they represent identities.
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // 2026 security: Get user by email for authentication
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
          phone: userData.phone,
          timezone: userData.timezone,
          notificationPreferences: userData.notificationPreferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User Profile Management (2026 privacy-by-design implementation)
  async updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    timezone?: string;
  }): Promise<User | undefined> {
    // 2026 privacy-by-design: Check email uniqueness if changing email
    if (data.email) {
      const emailExists = await this.checkEmailExists(data.email, userId);
      if (emailExists) {
        throw new Error("Email address is already in use by another account");
      }
      
      // 2026 best practice: Send confirmation email for email changes
      if (data.email !== (await this.getUser(userId))?.email) {
        await this.sendEmailChangeConfirmation(userId, data.email);
      }
    }

    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async checkEmailExists(email: string, excludeUserId?: string): Promise<boolean> {
    let query = db.select().from(users).where(eq(users.email, email));
    
    if (excludeUserId) {
      query = db.select().from(users).where(and(eq(users.email, email), sql`${users.id} != ${excludeUserId}`));
    }
    
    const existingUser = await query.limit(1);
    return existingUser.length > 0;
  }

  async sendEmailChangeConfirmation(userId: string, newEmail: string): Promise<void> {
    // Generate confirmation token
    const token = randomUUID();
    const _expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store token (would need emailVerificationTokens table)
    // For now, just log - implementation would depend on email service
    console.log(`Email change confirmation token for user ${userId}: ${token} -> ${newEmail}`);
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const argon2 = await import('argon2');
      
      // Get user with password hash
      const user = await db
        .select({
          id: users.id,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].passwordHash) {
        return false;
      }

      // Verify password using Argon2id
      return await argon2.verify(user[0].passwordHash, password);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  async updateUserPassword(userId: string, currentPassword: string | null, newPassword: string): Promise<boolean> {
    // 2026 security best practice: Implement proper password hashing with Argon2id
    // OWASP recommended configuration: m=19456 (19 MiB), t=2, p=1
    try {
      const argon2 = await import('argon2');
      
      // Get current user to verify existing password (if provided)
      const currentUser = await this.getUser(userId);
      if (!currentUser) {
        return false;
      }
      
      // For existing users with current password, verify it first
      if (currentPassword && currentUser.passwordHash) {
        const isValidPassword = await argon2.verify(currentUser.passwordHash, currentPassword);
        if (!isValidPassword) {
          return false; // Current password is incorrect
        }
      }
      
      // Hash new password with 2026 OWASP standards
      const passwordHash = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2, // iterations
        parallelism: 1, // threads
        hashLength: 32, // output length
      });
      
      // Update user with hashed password
      const result = await db
        .update(users)
        .set({
          passwordHash: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to update password');
    }
  }

  async updateUserNotificationPreferences(userId: string, preferences: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    projectUpdates?: boolean;
    taskReminders?: boolean;
    invoiceNotifications?: boolean;
  }): Promise<User | undefined> {
    // Get current user to merge with new preferences
    const currentUser = await this.getUser(userId);
    if (!currentUser) {
      return undefined;
    }

    const mergedPreferences = {
      ...currentUser.notificationPreferences,
      ...preferences,
    };

    const [user] = await db
      .update(users)
      .set({
        notificationPreferences: mergedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        profileImageUrl: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async getUserOrganization(userId: string): Promise<Organization | undefined> {
    // Membership drives tenancy: a user can belong to 0..n organizations.
    // Today we pick the first match; upgrade later if you add org switching.
    const [membership] = await db
      .select({ org: organizations })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);
    return membership?.org;
  }

  async createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values({
      ...org,
      id: org.id || randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Add owner as organization member
    await db.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: ownerId,
      role: "owner",
      createdAt: new Date(),
    });

    return newOrg;
  }

  // Organization lookup
  async getOrganization(orgId: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    return org;
  }

  // Organization Settings Management (Requirements 94.1, 94.2)
  async getOrganizationSettings(orgId: string): Promise<Organization> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    
    if (!org) {
      throw new Error("Organization not found");
    }
    
    return org;
  }

  async updateOrganizationSettings(orgId: string, data: Partial<Organization>): Promise<Organization> {
    const [updatedOrg] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning();
    
    if (!updatedOrg) {
      throw new Error("Organization not found");
    }
    
    return updatedOrg;
  }

  async updateOrganizationLogo(orgId: string, logoUrl: string): Promise<Organization> {
    const [updatedOrg] = await db
      .update(organizations)
      .set({ logo: logoUrl, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning();
    
    if (!updatedOrg) {
      throw new Error("Organization not found");
    }
    
    return updatedOrg;
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

  async getClientCompaniesPaginated(
    orgId: string,
    options: PaginationOptions & FilterOptions,
  ): Promise<PaginatedResult<ClientCompany>> {
    const { page, limit, search, industry, city, state, country } = options;

    // Build WHERE conditions
    const conditions = [eq(clientCompanies.organizationId, orgId)];

    // Add search condition (case-insensitive across multiple fields)
    if (search) {
      conditions.push(
        or(
          ilike(clientCompanies.name, `%${search}%`),
          ilike(clientCompanies.website, `%${search}%`),
          ilike(clientCompanies.industry, `%${search}%`),
          ilike(clientCompanies.city, `%${search}%`),
          ilike(clientCompanies.country, `%${search}%`),
        )!,
      );
    }

    // Add filter conditions
    if (industry) {
      conditions.push(eq(clientCompanies.industry, industry));
    }
    if (city) {
      conditions.push(eq(clientCompanies.city, city));
    }
    if (state) {
      conditions.push(eq(clientCompanies.state, state));
    }
    if (country) {
      conditions.push(eq(clientCompanies.country, country));
    }

    // Get total count for pagination metadata
    const [{ total }] = await db
      .select({ total: count() })
      .from(clientCompanies)
      .where(and(...conditions));

    // Get paginated data
    const data = await db
      .select()
      .from(clientCompanies)
      .where(and(...conditions))
      .orderBy(desc(clientCompanies.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
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

  async getClientCompanyWithRelations(
    id: string,
    orgId: string,
  ): Promise<ClientCompanyWithRelations | undefined> {
    // Fetch client and related entities in parallel
    const [clientResult, clientContacts, clientDeals, clientEngagements] = await Promise.all([
      db
        .select()
        .from(clientCompanies)
        .where(and(eq(clientCompanies.id, id), eq(clientCompanies.organizationId, orgId)))
        .limit(1),
      db
        .select()
        .from(contacts)
        .where(and(eq(contacts.clientCompanyId, id), eq(contacts.organizationId, orgId))),
      db
        .select()
        .from(deals)
        .where(and(eq(deals.clientCompanyId, id), eq(deals.organizationId, orgId))),
      db
        .select()
        .from(engagements)
        .where(and(eq(engagements.clientCompanyId, id), eq(engagements.organizationId, orgId))),
    ]);

    const client = clientResult[0];
    if (!client) {
      return undefined;
    }

    // Calculate activeEngagementsCount (status = 'active')
    const activeEngagementsCount = clientEngagements.filter(
      (e) => e.status === "active",
    ).length;

    // Calculate totalDealsValue (sum of deal values)
    const totalDealsValue = clientDeals
      .reduce((sum, deal) => {
        const value = deal.value ? parseFloat(deal.value) : 0;
        return sum + value;
      }, 0)
      .toFixed(2);

    return {
      ...client,
      contacts: clientContacts,
      deals: clientDeals,
      engagements: clientEngagements,
      activeEngagementsCount,
      totalDealsValue,
    };
  }

  async checkClientCompanyDependencies(
    id: string,
    orgId: string,
  ): Promise<DependencyCheckResult> {
    // Count related entities in parallel
    const [
      contactsCount,
      dealsCount,
      engagementsCount,
      contractsCount,
      proposalsCount,
      invoicesCount,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(contacts)
        .where(and(eq(contacts.clientCompanyId, id), eq(contacts.organizationId, orgId)))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(deals)
        .where(and(eq(deals.clientCompanyId, id), eq(deals.organizationId, orgId)))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(engagements)
        .where(and(eq(engagements.clientCompanyId, id), eq(engagements.organizationId, orgId)))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(contracts)
        .where(and(eq(contracts.clientCompanyId, id), eq(contracts.organizationId, orgId)))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(proposals)
        .where(and(eq(proposals.clientCompanyId, id), eq(proposals.organizationId, orgId)))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(invoices)
        .where(and(eq(invoices.clientCompanyId, id), eq(invoices.organizationId, orgId)))
        .then((r) => r[0]?.count ?? 0),
    ]);

    const dependencies = {
      contacts: contactsCount,
      deals: dealsCount,
      engagements: engagementsCount,
      contracts: contractsCount,
      proposals: proposalsCount,
      invoices: invoicesCount,
    };

    const hasDependencies =
      contactsCount > 0 ||
      dealsCount > 0 ||
      engagementsCount > 0 ||
      contractsCount > 0 ||
      proposalsCount > 0 ||
      invoicesCount > 0;

    return {
      hasDependencies,
      dependencies,
    };
  }

  async getClientCompanyStats(orgId: string): Promise<ClientCompanyStats> {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all clients for the organization
    const allClients = await db
      .select()
      .from(clientCompanies)
      .where(eq(clientCompanies.organizationId, orgId));

    // Calculate total count
    const total = allClients.length;

    // Calculate recently added (last 30 days)
    const recentlyAdded = allClients.filter(
      (client) => client.createdAt >= thirtyDaysAgo,
    ).length;

    // Group by industry
    const byIndustry: Record<string, number> = {};
    allClients.forEach((client) => {
      if (client.industry) {
        byIndustry[client.industry] = (byIndustry[client.industry] || 0) + 1;
      }
    });

    // Group by country
    const byCountry: Record<string, number> = {};
    allClients.forEach((client) => {
      if (client.country) {
        byCountry[client.country] = (byCountry[client.country] || 0) + 1;
      }
    });

    // Count clients with active engagements
    const clientsWithActiveEngagements = await db
      .select({ clientCompanyId: engagements.clientCompanyId })
      .from(engagements)
      .where(
        and(eq(engagements.organizationId, orgId), eq(engagements.status, "active")),
      );

    const uniqueClientsWithActiveEngagements = new Set(
      clientsWithActiveEngagements
        .map((e) => e.clientCompanyId)
        .filter((id): id is string => id !== null),
    );
    const withActiveEngagements = uniqueClientsWithActiveEngagements.size;

    // Count clients without contacts
    const clientsWithContacts = await db
      .select({ clientCompanyId: contacts.clientCompanyId })
      .from(contacts)
      .where(eq(contacts.organizationId, orgId));

    const uniqueClientsWithContacts = new Set(
      clientsWithContacts
        .map((c) => c.clientCompanyId)
        .filter((id): id is string => id !== null),
    );
    const withoutContacts = total - uniqueClientsWithContacts.size;

    return {
      total,
      recentlyAdded,
      byIndustry,
      byCountry,
      withActiveEngagements,
      withoutContacts,
    };
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
    await this.createOutboxEvent({
      organizationId: deal.organizationId,
      eventType: "deal.created",
      payload: deal,
      metadata: { source: "storage" },
    });
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
    
    if (deal) {
      await this.createOutboxEvent({
        organizationId: orgId,
        eventType: "deal.updated",
        payload: deal,
        metadata: { source: "storage" },
      });
    }
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

  async getFileObject(id: string): Promise<FileObject | undefined> {
    const [file] = await db.select().from(fileObjects).where(eq(fileObjects.id, id));
    return file;
  }

  async getFileObject(id: string, orgId: string): Promise<FileObject | undefined> {
    const [file] = await db
      .select()
      .from(fileObjects)
      .where(and(eq(fileObjects.id, id), eq(fileObjects.organizationId, orgId)));
    return file;
  }

  async createFileObject(data: InsertFileObject): Promise<FileObject> {
    const [file] = await db.insert(fileObjects).values(data).returning();
    return file;
  }

  async getFileObjectByPath(path: string, orgId: string): Promise<FileObject | undefined> {
    const [file] = await db
      .select()
      .from(fileObjects)
      .where(and(eq(fileObjects.path, path), eq(fileObjects.organizationId, orgId)));
    return file;
  }

  async deleteFileObject(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .delete(fileObjects)
      .where(and(eq(fileObjects.id, id), eq(fileObjects.organizationId, orgId)));
    return (result.rowCount ?? 0) > 0;
  }

  async updateFileObject(
    id: string,
    orgId: string,
    data: Partial<InsertFileObject>,
  ): Promise<FileObject | undefined> {
    const [file] = await db
      .update(fileObjects)
      .set(data)
      .where(and(eq(fileObjects.id, id), eq(fileObjects.organizationId, orgId)))
      .returning();
    return file;
  }

  async getFileObjects(orgId: string, engagementId?: string): Promise<FileObject[]> {
    if (engagementId) {
      return db
        .select()
        .from(fileObjects)
        .where(
          and(
            eq(fileObjects.organizationId, orgId),
            eq(fileObjects.engagementId, engagementId),
          ),
        )
        .orderBy(desc(fileObjects.createdAt));
    }
    return db
      .select()
      .from(fileObjects)
      .where(eq(fileObjects.organizationId, orgId))
      .orderBy(desc(fileObjects.createdAt));
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

  async createOutboxEvent(data: InsertOutboxEvent): Promise<OutboxEvent> {
    const [event] = await db.insert(outbox).values(data).returning();
    return event;
  }

  async getUnprocessedEvents(limit = 50): Promise<OutboxEvent[]> {
    return db
      .select()
      .from(outbox)
      .where(isNull(outbox.processedAt))
      .orderBy(asc(outbox.createdAt))
      .limit(limit);
  }

  async markEventProcessed(id: string): Promise<void> {
    await db
      .update(outbox)
      .set({ processedAt: new Date() })
      .where(eq(outbox.id, id));
  }

  async updateEventRetry(id: string, error: string): Promise<void> {
    await db
      .update(outbox)
      .set({
        lastError: error,
        retryCount: sql`${outbox.retryCount} + 1`,
      })
      .where(eq(outbox.id, id));
  }

  // ==================== RBAC METHODS ====================

  /**
   * Get all roles for an organization
   */
  async getRoles(orgId: string): Promise<Role[]> {
    return db
      .select()
      .from(roles)
      .where(eq(roles.organizationId, orgId))
      .orderBy(asc(roles.name));
  }

  /**
   * Get a single role by ID (with org scoping)
   */
  async getRole(roleId: string, orgId: string): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)));
    return role;
  }

  /**
   * Get a role with its permissions
   */
  async getRoleWithPermissions(roleId: string, orgId: string): Promise<{
    role: Role;
    permissions: Permission[];
  } | undefined> {
    const role = await this.getRole(roleId, orgId);
    if (!role) return undefined;

    const rolePerms = await db
      .select({
        permission: permissions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return {
      role,
      permissions: rolePerms.map((rp) => rp.permission),
    };
  }

  /**
   * Create a new role
   */
  async createRole(data: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(data).returning();
    return role;
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: string,
    orgId: string,
    data: Partial<InsertRole>
  ): Promise<Role | undefined> {
    const [role] = await db
      .update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .returning();
    return role;
  }

  /**
   * Delete a role (only if not assigned to any users)
   */
  async deleteRole(roleId: string, orgId: string): Promise<boolean> {
    // Check if role is assigned to any users
    const assignments = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId))
      .limit(1);

    if (assignments.length > 0) {
      return false; // Cannot delete role with active assignments
    }

    const result = await db
      .delete(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Get all permissions (system-wide, not org-scoped)
   */
  async getPermissions(): Promise<Permission[]> {
    return db.select().from(permissions).orderBy(asc(permissions.featureArea));
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    // Remove existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // Add new permissions
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        }))
      );
    }
  }

  /**
   * Get user roles for a specific user in an organization
   */
  async getUserRoles(userId: string, orgId: string): Promise<Role[]> {
    const userRoleRecords = await db
      .select({
        role: roles,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.organizationId, orgId))
      );

    return userRoleRecords.map((ur) => ur.role);
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(data: InsertUserRole): Promise<UserRole> {
    // Check if assignment already exists
    const existing = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, data.userId),
          eq(userRoles.roleId, data.roleId),
          eq(userRoles.organizationId, data.organizationId)
        )
      );

    if (existing.length > 0) {
      return existing[0]; // Return existing assignment
    }

    const [userRole] = await db.insert(userRoles).values(data).returning();
    return userRole;
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    orgId: string
  ): Promise<boolean> {
    const result = await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.organizationId, orgId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * ==================== INVITATIONS ====================
   */

  /**
   * Create a new invitation
   */
  async createInvitation(data: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db.insert(invitations).values({
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(),
    }).returning();
    return invitation;
  }

  /**
   * Get invitations for an organization
   */
  async getInvitations(
    orgId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<Invitation[]> {
    const conditions = [eq(invitations.organizationId, orgId)];
    
    if (options?.status) {
      conditions.push(eq(invitations.status, options.status));
    }

    return db
      .select({
        id: invitations.id,
        organizationId: invitations.organizationId,
        email: invitations.email,
        roleId: invitations.roleId,
        token: invitations.token,
        status: invitations.status,
        invitedById: invitations.invitedById,
        acceptedById: invitations.acceptedById,
        acceptedAt: invitations.acceptedAt,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        updatedAt: invitations.updatedAt,
      })
      .from(invitations)
      .where(and(...conditions))
      .orderBy(desc(invitations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    
    return invitation || null;
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(orgId: string, id: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)))
      .limit(1);
    
    return invitation || null;
  }

  /**
   * Update invitation status
   */
  async updateInvitationStatus(
    orgId: string,
    id: string,
    status: string,
    updates?: { acceptedById?: string; acceptedAt?: Date }
  ): Promise<Invitation | null> {
    const [invitation] = await db
      .update(invitations)
      .set({
        status,
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)))
      .returning();
    
    return invitation || null;
  }

  /**
   * Delete invitation
   */
  async deleteInvitation(orgId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)))
      .returning();
    
    return result.length > 0;
  }

  /**
   * Check if email already has a pending invitation
   */
  async getPendingInvitationByEmail(orgId: string, email: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, orgId),
          eq(invitations.email, email),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);
    
    return invitation || null;
  }

  /**
   * Get invitation statistics for an organization
   */
  async getInvitationStats(orgId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
  }> {
    const stats = await db
      .select({
        status: invitations.status,
        count: count(invitations.id).as("count"),
      })
      .from(invitations)
      .where(eq(invitations.organizationId, orgId))
      .groupBy(invitations.status);

    const result = {
      total: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
    };

    stats.forEach((stat) => {
      const count = Number(stat.count);
      result.total += count;
      
      switch (stat.status) {
        case "pending":
          result.pending = count;
          break;
        case "accepted":
          result.accepted = count;
          break;
        case "expired":
          result.expired = count;
          break;
      }
    });

    return result;
  }
}

export const storage = new DatabaseStorage();
export { db };
