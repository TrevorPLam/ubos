import { betterTenant } from '@usebetterdev/tenant'
import { drizzleDatabase } from '@usebetterdev/tenant/drizzle'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema'
import { organizationsTable } from './schema'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

export const pool: pg.Pool | null = connectionString ? new Pool({ connectionString }) : null
export const db: ReturnType<typeof drizzle> | null = pool ? drizzle(pool, { schema }) : null

export const tenant: ReturnType<typeof betterTenant> | null = db
  ? betterTenant({
      database: drizzleDatabase(db, {
        table: organizationsTable as never,
      }),
      tenantResolver: {
        header: 'x-tenant-id',
        jwt: { claim: 'tenant_id' },
      },
    })
  : null

export function isDatabaseConfigured(): boolean {
  return db !== null
}

export function getDb(): NonNullable<typeof db> {
  if (!db) {
    throw new Error('DATABASE_URL is not configured.')
  }

  return db
}

export function getScopedDb() {
  if (tenant) {
    const tenantDb = tenant.getDatabase()
    if (tenantDb) {
      return tenantDb as ReturnType<typeof getDb>
    }
  }

  return getDb()
}

export async function withTenantDatabase<T>(
  tenantId: string | null | undefined,
  callback: (database: ReturnType<typeof getScopedDb>) => Promise<T>
): Promise<T> {
  if (tenant) {
    if (tenantId) {
      return tenant.runAs(tenantId, callback as never) as Promise<T>
    }

    const tenantDb = tenant.getDatabase()
    if (tenantDb) {
      return callback(tenantDb as ReturnType<typeof getDb>)
    }

    throw new Error('Tenant context is required for tenant-scoped database access.')
  }

  return callback(getScopedDb())
}

export async function withSystemDatabase<T>(
  callback: (database: ReturnType<typeof getDb>) => Promise<T>
): Promise<T> {
  if (tenant) {
    return tenant.runAsSystem(callback as never) as Promise<T>
  }

  return callback(getDb())
}

export * from './schema'