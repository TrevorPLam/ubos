import { sql } from 'drizzle-orm'
import { pgPolicy, type AnyPgColumn } from 'drizzle-orm/pg-core'

const bypassRlsCondition = sql`coalesce(current_setting('app.bypass_rls', true), 'false') = 'true'`
const publicAccessCondition = sql`true`

function tenantScopeCondition(organizationId: AnyPgColumn) {
  return sql`${organizationId} = (current_setting('app.current_tenant', true))::uuid`
}

function tenantOrSystemCondition(organizationId: AnyPgColumn) {
  const tenantCondition = tenantScopeCondition(organizationId)

  return sql`(${bypassRlsCondition}) or (${tenantCondition})`
}

export function tenantTablePolicies(tableName: string, organizationId: AnyPgColumn) {
  const tenantCondition = tenantScopeCondition(organizationId)

  return {
    bypassRlsPolicy: pgPolicy(`${tableName}_bypass_rls`, {
      as: 'permissive',
      for: 'all',
      using: bypassRlsCondition,
      withCheck: bypassRlsCondition,
    }),
    tenantScopePolicy: pgPolicy(`${tableName}_tenant_scope`, {
      as: 'permissive',
      for: 'all',
      using: tenantCondition,
      withCheck: tenantCondition,
    }),
  }
}

export function organizationTablePolicies(tableName: string, organizationId: AnyPgColumn) {
  const scopedCondition = tenantOrSystemCondition(organizationId)

  return {
    publicReadPolicy: pgPolicy(`${tableName}_public_read`, {
      as: 'permissive',
      for: 'select',
      using: publicAccessCondition,
    }),
    publicInsertPolicy: pgPolicy(`${tableName}_public_insert`, {
      as: 'permissive',
      for: 'insert',
      withCheck: publicAccessCondition,
    }),
    scopedUpdatePolicy: pgPolicy(`${tableName}_scoped_update`, {
      as: 'permissive',
      for: 'update',
      using: scopedCondition,
      withCheck: scopedCondition,
    }),
    scopedDeletePolicy: pgPolicy(`${tableName}_scoped_delete`, {
      as: 'permissive',
      for: 'delete',
      using: scopedCondition,
    }),
  }
}