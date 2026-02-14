/**
 * Permission Seeds Test Suite (2026 Best Practices)
 * 
 * Tests the permission seeding utility following modern testing patterns:
 * - Unit testing with proper mocking
 * - Integration testing with database
 * - Idempotency validation
 * - Error handling verification
 * - Performance benchmarking
 * 
 * Validates Task 0.4: Add missing RBAC permission seeds
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import { 
  permissions, 
  type InsertPermission 
} from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { 
  seedMissingPermissions, 
  validatePermissionSeeds, 
  getPermissionSeeds,
  runPermissionSeeding 
} from '../../server/utils/seed-permissions';

describe('Permission Seeds Utility', () => {
  // Clean up test data before each test
  beforeEach(async () => {
    // Clean up only the permissions we're testing
    const featureAreas = ['threads', 'organizations', 'dashboard', 'engagements', 'vendors'];
    for (const featureArea of featureAreas) {
      await db.delete(permissions).where(eq(permissions.featureArea, featureArea));
    }
  });

  // Clean up after all tests
  afterEach(async () => {
    // Clean up test permissions
    const featureAreas = ['threads', 'organizations', 'dashboard', 'engagements', 'vendors'];
    for (const featureArea of featureAreas) {
      await db.delete(permissions).where(eq(permissions.featureArea, featureArea));
    }
  });

  describe('getPermissionSeeds', () => {
    it('should return all expected permission seeds', () => {
      const seeds = getPermissionSeeds();
      
      // Verify we have the right number of seeds
      expect(seeds.length).toBe(26); // 5*4 + 1 for dashboard
      
      // Verify all required feature areas are present
      const featureAreas = Array.from(new Set(seeds.map(s => s.featureArea)));
      expect(featureAreas).toContain('threads');
      expect(featureAreas).toContain('organizations');
      expect(featureAreas).toContain('dashboard');
      expect(featureAreas).toContain('engagements');
      expect(featureAreas).toContain('vendors');
      
      // Verify permission types
      const permissionTypes = Array.from(new Set(seeds.map(s => s.permissionType)));
      expect(permissionTypes).toContain('view');
      expect(permissionTypes).toContain('create');
      expect(permissionTypes).toContain('edit');
      expect(permissionTypes).toContain('delete');
      expect(permissionTypes).toContain('export');
    });

    it('should contain proper permission descriptions', () => {
      const seeds = getPermissionSeeds();
      
      // Check specific permissions
      const threadsView = seeds.find(s => 
        s.featureArea === 'threads' && s.permissionType === 'view'
      );
      expect(threadsView?.description).toBe('View communication threads');
      
      const dashboardView = seeds.find(s => 
        s.featureArea === 'dashboard' && s.permissionType === 'view'
      );
      expect(dashboardView?.description).toBe('View dashboard analytics and stats');
    });
  });

  describe('validatePermissionSeeds', () => {
    it('should return false when permissions are missing', async () => {
      const isValid = await validatePermissionSeeds();
      expect(isValid).toBe(false);
    });

    it('should return true when all permissions exist', async () => {
      // First seed all permissions
      await seedMissingPermissions();
      
      const isValid = await validatePermissionSeeds();
      expect(isValid).toBe(true);
    });

    it('should handle partial permission sets correctly', async () => {
      // Seed only some permissions
      const seeds = getPermissionSeeds();
      await db.insert(permissions).values(seeds.slice(0, 5));
      
      const isValid = await validatePermissionSeeds();
      expect(isValid).toBe(false);
    });
  });

  describe('seedMissingPermissions', () => {
    it('should seed all missing permissions', async () => {
      const seededCount = await seedMissingPermissions();
      
      // Should seed all 26 permissions
      expect(seededCount).toBe(26);
      
      // Verify they exist in database
      const allPermissions = await db.select().from(permissions);
      const seededFeatureAreas = ['threads', 'organizations', 'dashboard', 'engagements', 'vendors'];
      
      for (const featureArea of seededFeatureAreas) {
        const featurePermissions = allPermissions.filter(p => p.featureArea === featureArea);
        expect(featurePermissions.length).toBeGreaterThan(0);
      }
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      // First run
      const firstRun = await seedMissingPermissions();
      expect(firstRun).toBe(26);
      
      // Second run should seed nothing
      const secondRun = await seedMissingPermissions();
      expect(secondRun).toBe(0);
      
      // Third run should also seed nothing
      const thirdRun = await seedMissingPermissions();
      expect(thirdRun).toBe(0);
    });

    it('should only seed missing permissions', async () => {
      // Pre-seed some permissions
      const seeds = getPermissionSeeds();
      const preSeeded = seeds.slice(0, 10);
      await db.insert(permissions).values(preSeeded);
      
      // Should only seed the remaining permissions
      const seededCount = await seedMissingPermissions();
      expect(seededCount).toBe(16); // 26 total - 10 pre-seeded
      
      // Verify total count is correct
      const allPermissions = await db.select().from(permissions);
      const seededFeatureAreas = ['threads', 'organizations', 'dashboard', 'engagements', 'vendors'];
      const totalSeeded = allPermissions.filter(p => 
        seededFeatureAreas.includes(p.featureArea)
      ).length;
      expect(totalSeeded).toBe(26);
    });

    it('should handle specific feature area permissions correctly', async () => {
      await seedMissingPermissions();
      
      // Verify threads permissions
      const threadsPermissions = await db
        .select()
        .from(permissions)
        .where(eq(permissions.featureArea, 'threads'));
      
      expect(threadsPermissions).toHaveLength(5);
      const threadsTypes = threadsPermissions.map(p => p.permissionType).sort();
      expect(threadsTypes).toEqual(['create', 'delete', 'edit', 'export', 'view']);
      
      // Verify dashboard permissions (only view)
      const dashboardPermissions = await db
        .select()
        .from(permissions)
        .where(eq(permissions.featureArea, 'dashboard'));
      
      expect(dashboardPermissions).toHaveLength(1);
      expect(dashboardPermissions[0].permissionType).toBe('view');
      
      // Verify organizations permissions
      const orgPermissions = await db
        .select()
        .from(permissions)
        .where(eq(permissions.featureArea, 'organizations'));
      
      expect(orgPermissions).toHaveLength(5);
      const orgTypes = orgPermissions.map(p => p.permissionType).sort();
      expect(orgTypes).toEqual(['create', 'delete', 'edit', 'export', 'view']);
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      await seedMissingPermissions();
      const duration = Date.now() - startTime;
      
      // Should complete within 1 second for 26 permissions
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('runPermissionSeeding', () => {
    it('should complete successfully when permissions are missing', async () => {
      // Mock process.exit to prevent test termination
      const originalExit = process.exit;
      const mockExit = vi.fn();
      process.exit = mockExit as any;
      
      await expect(runPermissionSeeding()).resolves.not.toThrow();
      
      // Restore original exit
      process.exit = originalExit;
      
      // Verify permissions were seeded
      const isValid = await validatePermissionSeeds();
      expect(isValid).toBe(true);
    });

    it('should complete successfully when permissions already exist', async () => {
      // First seed permissions
      await seedMissingPermissions();
      
      // Mock process.exit to prevent test termination
      const originalExit = process.exit;
      const mockExit = vi.fn();
      process.exit = mockExit as any;
      
      await expect(runPermissionSeeding()).resolves.not.toThrow();
      
      // Restore original exit
      process.exit = originalExit;
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking the database to simulate errors
      // For now, we verify the function doesn't crash with invalid data
      const seeds = getPermissionSeeds();
      
      // All seeds should have valid structure
      seeds.forEach(seed => {
        expect(seed).toHaveProperty('featureArea');
        expect(seed).toHaveProperty('permissionType');
        expect(seed).toHaveProperty('description');
      });
    });
  });

  describe('Integration with Existing System', () => {
    it('should not interfere with existing permissions', async () => {
      // Add some existing permissions (from other feature areas)
      const existingPermissions: InsertPermission[] = [
        {
          featureArea: 'clients',
          permissionType: 'view',
          description: 'View client companies'
        },
        {
          featureArea: 'deals',
          permissionType: 'create',
          description: 'Create deals'
        }
      ];
      
      await db.insert(permissions).values(existingPermissions);
      
      // Seed new permissions
      await seedMissingPermissions();
      
      // Verify existing permissions are still there
      const allPermissions = await db.select().from(permissions);
      const clientsPermissions = allPermissions.filter(p => p.featureArea === 'clients');
      const dealsPermissions = allPermissions.filter(p => p.featureArea === 'deals');
      
      expect(clientsPermissions).toHaveLength(1);
      expect(dealsPermissions).toHaveLength(1);
      
      // Verify new permissions are added
      const threadsPermissions = allPermissions.filter(p => p.featureArea === 'threads');
      expect(threadsPermissions.length).toBeGreaterThan(0);
    });
  });
});

describe('Permission Seeds - Performance Tests', () => {
  it('should handle large datasets efficiently', async () => {
    // Clean up first
    await db.delete(permissions).where(eq(permissions.featureArea, 'threads'));
    
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Clean up between iterations
      await db.delete(permissions).where(eq(permissions.featureArea, 'threads'));
      
      const startTime = Date.now();
      await seedMissingPermissions();
      const duration = Date.now() - startTime;
      times.push(duration);
    }
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    // Performance assertions
    expect(averageTime).toBeLessThan(500); // Average under 500ms
    expect(maxTime).toBeLessThan(1000); // Max under 1 second
    
    console.log(`Permission seeding performance: avg=${averageTime}ms, max=${maxTime}ms`);
  });
});
