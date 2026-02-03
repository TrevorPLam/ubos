/**
 * Shared database schema + types.
 *
 * This file defines:
 * - Drizzle table schemas (Postgres)
 * - Enums used by tables
 * - Zod insert schemas (via drizzle-zod)
 * - Exported TS types consumed by both server and client
 *
 * Multi-tenancy:
 * - Most tables include `organizationId` and should always be queried/updated with that scope.
 * - Storage methods in `server/storage.ts` are the enforcement point for org scoping.
 *
 * AI iteration notes:
 * - When adding a table: include `organizationId` if it represents tenant-owned data.
 * - Keep naming consistent: `created_at`/`updated_at` columns map to `createdAt`/`updatedAt`.
 * - Prefer enums for finite state (status/stage) so UI and API stay in sync.
 */

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, jsonb, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ==================== ENUMS ====================
export const dealStageEnum = pgEnum("deal_stage", ["lead", "qualified", "proposal", "negotiation", "won", "lost"]);
export const proposalStatusEnum = pgEnum("proposal_status", ["draft", "sent", "viewed", "accepted", "rejected", "expired"]);
export const contractStatusEnum = pgEnum("contract_status", ["draft", "sent", "signed", "expired", "cancelled"]);
export const engagementStatusEnum = pgEnum("engagement_status", ["active", "on_hold", "completed", "cancelled"]);
export const projectStatusEnum = pgEnum("project_status", ["not_started", "in_progress", "completed", "on_hold", "cancelled"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "completed", "cancelled"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "viewed", "paid", "overdue", "cancelled"]);
export const billStatusEnum = pgEnum("bill_status", ["pending", "approved", "rejected", "paid", "cancelled"]);
export const threadTypeEnum = pgEnum("thread_type", ["internal", "client"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member", "viewer"]);
export const activityTypeEnum = pgEnum("activity_type", ["created", "updated", "deleted", "status_changed", "signed", "sent", "viewed", "paid", "approved", "rejected", "comment"]);

// ==================== ORGANIZATIONS (Multi-tenancy) ====================
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== ORGANIZATION MEMBERS ====================
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").notNull(),
  role: memberRoleEnum("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_org_members_org").on(table.organizationId),
  index("idx_org_members_user").on(table.userId),
]);

// ==================== CLIENT COMPANIES ====================
export const clientCompanies = pgTable("client_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  website: text("website"),
  industry: varchar("industry", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_clients_org").on(table.organizationId),
]);

// ==================== CONTACTS ====================
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  clientCompanyId: varchar("client_company_id").references(() => clientCompanies.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  title: varchar("title", { length: 100 }),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_contacts_org").on(table.organizationId),
  index("idx_contacts_company").on(table.clientCompanyId),
]);

// ==================== DEALS (Pipeline) ====================
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  clientCompanyId: varchar("client_company_id").references(() => clientCompanies.id, { onDelete: "set null" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  ownerId: varchar("owner_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  value: decimal("value", { precision: 12, scale: 2 }),
  stage: dealStageEnum("stage").default("lead").notNull(),
  probability: integer("probability").default(0),
  expectedCloseDate: timestamp("expected_close_date"),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_deals_org").on(table.organizationId),
  index("idx_deals_stage").on(table.stage),
  index("idx_deals_client").on(table.clientCompanyId),
]);

// ==================== PROPOSALS ====================
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "set null" }),
  clientCompanyId: varchar("client_company_id").references(() => clientCompanies.id, { onDelete: "set null" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: proposalStatusEnum("status").default("draft").notNull(),
  content: jsonb("content"),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }),
  validUntil: timestamp("valid_until"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_proposals_org").on(table.organizationId),
  index("idx_proposals_deal").on(table.dealId),
]);

// ==================== CONTRACTS ====================
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  proposalId: varchar("proposal_id").references(() => proposals.id, { onDelete: "set null" }),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "set null" }),
  clientCompanyId: varchar("client_company_id").references(() => clientCompanies.id, { onDelete: "set null" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: contractStatusEnum("status").default("draft").notNull(),
  content: jsonb("content"),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  signedAt: timestamp("signed_at"),
  signedByName: varchar("signed_by_name", { length: 255 }),
  signatureData: text("signature_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_contracts_org").on(table.organizationId),
  index("idx_contracts_proposal").on(table.proposalId),
]);

// ==================== ENGAGEMENTS (The Hub) ====================
export const engagements = pgTable("engagements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "set null" }),
  clientCompanyId: varchar("client_company_id").references(() => clientCompanies.id, { onDelete: "set null" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  ownerId: varchar("owner_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: engagementStatusEnum("status").default("active").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_engagements_org").on(table.organizationId),
  index("idx_engagements_client").on(table.clientCompanyId),
  index("idx_engagements_status").on(table.status),
]);

// ==================== PROJECT TEMPLATES ====================
export const projectTemplates = pgTable("project_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tasksTemplate: jsonb("tasks_template"),
  milestonesTemplate: jsonb("milestones_template"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_templates_org").on(table.organizationId),
]);

// ==================== PROJECTS ====================
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id").references(() => projectTemplates.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("not_started").notNull(),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_projects_org").on(table.organizationId),
  index("idx_projects_engagement").on(table.engagementId),
]);

// ==================== MILESTONES ====================
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_milestones_project").on(table.projectId),
]);

// ==================== TASKS ====================
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  milestoneId: varchar("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  assigneeId: varchar("assignee_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("todo").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tasks_project").on(table.projectId),
  index("idx_tasks_assignee").on(table.assigneeId),
  index("idx_tasks_status").on(table.status),
]);

// ==================== FILE OBJECTS (Documents) ====================
export const fileObjects = pgTable("file_objects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }),
  uploadedById: varchar("uploaded_by_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"),
  path: text("path").notNull(),
  folder: varchar("folder", { length: 255 }).default("/"),
  isClientVisible: boolean("is_client_visible").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_files_org").on(table.organizationId),
  index("idx_files_engagement").on(table.engagementId),
]);

// ==================== MESSAGE THREADS ====================
export const threads = pgTable("threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }).notNull(),
  type: threadTypeEnum("type").default("internal").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  createdById: varchar("created_by_id").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_threads_engagement").on(table.engagementId),
  index("idx_threads_type").on(table.type),
]);

// ==================== MESSAGES ====================
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => threads.id, { onDelete: "cascade" }).notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_messages_thread").on(table.threadId),
]);

// ==================== INVOICE SCHEDULES ====================
export const invoiceSchedules = pgTable("invoice_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }).notNull(),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }),
  nextInvoiceDate: timestamp("next_invoice_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_schedules_engagement").on(table.engagementId),
]);

// ==================== INVOICES (AR) ====================
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }).notNull(),
  scheduleId: varchar("schedule_id").references(() => invoiceSchedules.id, { onDelete: "set null" }),
  clientCompanyId: varchar("client_company_id").references(() => clientCompanies.id, { onDelete: "set null" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  lineItems: jsonb("line_items"),
  dueDate: timestamp("due_date"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_invoices_org").on(table.organizationId),
  index("idx_invoices_engagement").on(table.engagementId),
  index("idx_invoices_status").on(table.status),
]);

// ==================== PAYMENTS ====================
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_payments_invoice").on(table.invoiceId),
]);

// ==================== VENDORS ====================
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_vendors_org").on(table.organizationId),
]);

// ==================== BILLS (AP) ====================
export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "set null" }),
  vendorId: varchar("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull(),
  billNumber: varchar("bill_number", { length: 50 }).notNull(),
  status: billStatusEnum("status").default("pending").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  description: text("description"),
  attachmentPath: text("attachment_path"),
  approvedById: varchar("approved_by_id"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bills_org").on(table.organizationId),
  index("idx_bills_engagement").on(table.engagementId),
  index("idx_bills_status").on(table.status),
]);

// ==================== ACTIVITY EVENTS (Audit Timeline) ====================
export const activityEvents = pgTable("activity_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }),
  actorId: varchar("actor_id").notNull(),
  actorName: varchar("actor_name", { length: 255 }),
  type: activityTypeEnum("type").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_activity_org").on(table.organizationId),
  index("idx_activity_entity").on(table.entityType, table.entityId),
  index("idx_activity_engagement").on(table.engagementId),
]);

// ==================== CLIENT PORTAL ACCESS ====================
export const clientPortalAccess = pgTable("client_portal_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  engagementId: varchar("engagement_id").references(() => engagements.id, { onDelete: "cascade" }).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
  accessToken: varchar("access_token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_portal_engagement").on(table.engagementId),
  index("idx_portal_token").on(table.accessToken),
]);

// ==================== RELATIONS ====================
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  clientCompanies: many(clientCompanies),
  deals: many(deals),
  engagements: many(engagements),
}));

export const clientCompaniesRelations = relations(clientCompanies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clientCompanies.organizationId],
    references: [organizations.id],
  }),
  contacts: many(contacts),
  deals: many(deals),
  engagements: many(engagements),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  clientCompany: one(clientCompanies, {
    fields: [deals.clientCompanyId],
    references: [clientCompanies.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  proposals: many(proposals),
  contracts: many(contracts),
}));

export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [engagements.organizationId],
    references: [organizations.id],
  }),
  clientCompany: one(clientCompanies, {
    fields: [engagements.clientCompanyId],
    references: [clientCompanies.id],
  }),
  contract: one(contracts, {
    fields: [engagements.contractId],
    references: [contracts.id],
  }),
  projects: many(projects),
  threads: many(threads),
  invoices: many(invoices),
  files: many(fileObjects),
  activities: many(activityEvents),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  engagement: one(engagements, {
    fields: [projects.engagementId],
    references: [engagements.id],
  }),
  tasks: many(tasks),
  milestones: many(milestones),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  engagement: one(engagements, {
    fields: [threads.engagementId],
    references: [engagements.id],
  }),
  messages: many(messages),
}));

// ==================== INSERT SCHEMAS ====================
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientCompanySchema = createInsertSchema(clientCompanies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEngagementSchema = createInsertSchema(engagements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true });
export const insertThreadSchema = createInsertSchema(threads).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFileObjectSchema = createInsertSchema(fileObjects).omit({ id: true, createdAt: true });
export const insertActivityEventSchema = createInsertSchema(activityEvents).omit({ id: true, createdAt: true });
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceScheduleSchema = createInsertSchema(invoiceSchedules).omit({ id: true, createdAt: true });

// ==================== TYPES ====================
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertClientCompany = z.infer<typeof insertClientCompanySchema>;
export type ClientCompany = typeof clientCompanies.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Engagement = typeof engagements.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertFileObject = z.infer<typeof insertFileObjectSchema>;
export type FileObject = typeof fileObjects.$inferSelect;
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertInvoiceSchedule = z.infer<typeof insertInvoiceScheduleSchema>;
export type InvoiceSchedule = typeof invoiceSchedules.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;
