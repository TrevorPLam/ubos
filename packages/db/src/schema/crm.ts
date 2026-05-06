import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { organizationIdColumn } from './organizations'
import { tenantTablePolicies } from './policies'

export const crmLeadStageEnum = pgEnum('crm_lead_stage', [
  'new',
  'contacted',
  'qualified',
])

export const crmContactStatusEnum = pgEnum('crm_contact_status', [
  'active',
  'inactive',
  'hot',
])

export const crmDealStageEnum = pgEnum('crm_deal_stage', [
  'pipeline',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
])

export const crmCompaniesTable = pgTable(
  'crm_companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ...organizationIdColumn,
    name: text('name').notNull(),
    website: text('website'),
    industry: text('industry'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('crm_companies_organization_id_idx').on(table.organizationId),
    ...tenantTablePolicies('crm_companies', table.organizationId),
  })
).enableRLS()

export const crmContactsTable = pgTable(
  'crm_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ...organizationIdColumn,
    companyId: uuid('company_id').references(() => crmCompaniesTable.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    status: crmContactStatusEnum('status').notNull().default('active'),
    lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('crm_contacts_organization_id_idx').on(table.organizationId),
    companyIdx: index('crm_contacts_company_id_idx').on(table.companyId),
    ...tenantTablePolicies('crm_contacts', table.organizationId),
  })
).enableRLS()

export const crmDealsTable = pgTable(
  'crm_deals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ...organizationIdColumn,
    companyId: uuid('company_id').references(() => crmCompaniesTable.id, {
      onDelete: 'set null',
    }),
    contactId: uuid('contact_id').references(() => crmContactsTable.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    valueCents: integer('value_cents').notNull().default(0),
    stage: crmDealStageEnum('stage').notNull().default('pipeline'),
    closeDate: timestamp('close_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('crm_deals_organization_id_idx').on(table.organizationId),
    companyIdx: index('crm_deals_company_id_idx').on(table.companyId),
    contactIdx: index('crm_deals_contact_id_idx').on(table.contactId),
    ...tenantTablePolicies('crm_deals', table.organizationId),
  })
).enableRLS()

export const crmLeadsTable = pgTable(
  'crm_leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ...organizationIdColumn,
    companyId: uuid('company_id').references(() => crmCompaniesTable.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    company: text('company').notNull(),
    value: text('value').notNull(),
    source: text('source').notNull(),
    notes: text('notes'),
    stage: crmLeadStageEnum('stage').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('crm_leads_organization_id_idx').on(table.organizationId),
    companyIdx: index('crm_leads_company_id_idx').on(table.companyId),
    stageIdx: index('crm_leads_stage_idx').on(table.stage),
    ...tenantTablePolicies('crm_leads', table.organizationId),
  })
).enableRLS()

export type CrmLeadRecord = typeof crmLeadsTable.$inferSelect
export type NewCrmLeadRecord = typeof crmLeadsTable.$inferInsert