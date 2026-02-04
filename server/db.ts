// AI-META-BEGIN
// AI-META: PostgreSQL connection via Drizzle ORM
// OWNERSHIP: server/persistence
// ENTRYPOINTS: All server DB access
// DEPENDENCIES: drizzle-orm, pg
// DANGER: Connection pool exhaustion, SQL injection
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: tests/backend/multi-tenant-isolation.test.ts
// AI-META-END

/**
 * Database initialization.
 *
 * Exports:
 * - `pool`: node-postgres Pool (shared across the app)
 * - `db`: drizzle instance with the full schema attached
 *
 * AI iteration notes:
 * - Migrations/DDL live in the schema + migration tooling (see project scripts).
 * - Always keep `DATABASE_URL` as the single source of truth for connection config.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
