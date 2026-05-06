import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { organizationTablePolicies } from './policies'

export const organizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => organizationTablePolicies('organizations', table.id)
).enableRLS()

export const organizationIdColumn = {
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizationsTable.id)
    .default(sql`(current_setting('app.current_tenant', true))::uuid`),
} as const

export type OrganizationRecord = typeof organizationsTable.$inferSelect
export type NewOrganizationRecord = typeof organizationsTable.$inferInsert