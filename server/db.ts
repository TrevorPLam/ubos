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
import { newDb } from "pg-mem";
import * as schema from "@shared/schema";

const isTest = process.env.NODE_ENV === "test";
const testDbDriver = process.env.TEST_DB_DRIVER?.toLowerCase();

/**
 * Create a Pool implementation.
 * - Test: use in-memory pg-mem when DATABASE_URL is absent (no user setup required)
 * - Other envs: require DATABASE_URL for safety
 */
function createPool(): pg.Pool {
  const preferPgMem = isTest && testDbDriver !== "postgres";

  if (preferPgMem) {
    const memDb = newDb({ autoCreateForeignKeyIndices: true });
    const pgMem = memDb.adapters.createPg();
    return new pgMem.Pool();
  }

  const databaseUrl = process.env.DATABASE_URL;

  // Prevent brittle auth failures when tests request postgres but only provide the
  // placeholder/local URL (common in CI without a running service).
  // In that scenario, transparently fall back to pg-mem to keep the suite hermetic.
  const isPlaceholderTestUrl = (url?: string) =>
    !url || /postgresql:\/\/test:test@localhost\/?/i.test(url) || url.includes("@localhost/test_db");

  if (isTest && testDbDriver === "postgres" && isPlaceholderTestUrl(databaseUrl)) {
    console.warn(
      "TEST_DB_DRIVER=postgres requested but DATABASE_URL is placeholder/localhost; falling back to pg-mem for safety"
    );
    const memDb = newDb({ autoCreateForeignKeyIndices: true });
    const pgMem = memDb.adapters.createPg();
    return new pgMem.Pool();
  }

  if (!databaseUrl) {
    if (isTest) {
      // Fall back to pg-mem if tests forgot to set a URL but explicitly requested postgres
      const memDb = newDb({ autoCreateForeignKeyIndices: true });
      const pgMem = memDb.adapters.createPg();
      return new pgMem.Pool();
    }

    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  const { Pool } = pg;
  return new Pool({ connectionString: databaseUrl });
}

export const pool = createPool();
export const db = drizzle(pool, { schema });
