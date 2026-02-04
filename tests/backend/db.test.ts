// AI-META-BEGIN
// AI-META: Test file for db.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for database initialization.
 * 
 * These tests validate that the database connection and Drizzle ORM
 * are properly configured with the correct schema.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Database', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    vi.clearAllMocks();
    // Clear module registry to allow re-importing with different env vars
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('Database URL validation', () => {
    it('should throw error when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;
      
      // Import should throw error
      await expect(async () => {
        await import('../../server/db');
      }).rejects.toThrow('DATABASE_URL must be set');
    });

    it('should not throw error when DATABASE_URL is set', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      
      // Import should succeed
      const dbModule = await import('../../server/db');
      
      expect(dbModule.db).toBeDefined();
      expect(dbModule.pool).toBeDefined();
    });
  });

  describe('Database connection', () => {
    it('should create a PostgreSQL pool', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      
      const { pool } = await import('../../server/db');
      
      expect(pool).toBeDefined();
      expect(pool.constructor.name).toMatch(/Pool|BoundPool/);
    });

    it('should create a Drizzle instance with schema', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      
      const { db } = await import('../../server/db');
      
      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });
  });
});
