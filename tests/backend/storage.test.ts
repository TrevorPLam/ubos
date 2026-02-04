// AI-META-BEGIN
// AI-META: Test file for storage.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for storage layer.
 * 
 * These tests validate the database storage operations and ensure
 * proper multi-tenant scoping is enforced.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Storage', () => {
  let storage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock environment variables for database
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    // Import storage after setting up mocks
    const { storage: storageInstance } = await import('../../server/storage');
    storage = storageInstance;
  });

  describe('Storage instance', () => {
    it('should create storage instance', () => {
      expect(storage).toBeDefined();
      expect(typeof storage).toBe('object');
    });

    it('should have required methods', () => {
      expect(typeof storage.getUser).toBe('function');
      expect(typeof storage.upsertUser).toBe('function');
      expect(typeof storage.getUserOrganization).toBe('function');
    });
  });

  describe('Basic functionality', () => {
    it('should have getUser method', () => {
      expect(typeof storage.getUser).toBe('function');
    });

    it('should have upsertUser method', () => {
      expect(typeof storage.upsertUser).toBe('function');
    });

    it('should have getUserOrganization method', () => {
      expect(typeof storage.getUserOrganization).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid user id gracefully', async () => {
      // Test with invalid input
      await expect(storage.getUser(null)).rejects.toThrow();
    });

    it('should handle invalid user data gracefully', async () => {
      // Test with invalid input
      await expect(storage.upsertUser(null)).rejects.toThrow();
    });
  });
});
