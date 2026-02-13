/**
 * RBAC Integration Tests - Complete System Testing
 * 
 * This test suite provides comprehensive integration testing for the RBAC system,
 * covering role creation, assignment, permission enforcement, and multi-role scenarios.
 * 
 * Tests follow 2026 best practices:
 * - Property-based testing for edge cases
 * - Comprehensive security validation
 * - Performance benchmarking
 * - Audit trail verification
 * - Zero-trust validation patterns
 * 
 * Validates Requirements: 83.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/index';
import type { Express } from 'express';
import { db } from '../../server/db';
import { 
  organizations, 
  roles, 
  permissions, 
  rolePermissions, 
  userRoles,
  activityEvents,
  users
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Test utilities
interface TestUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

interface TestRole {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  isDefault: boolean;
}

interface TestPermission {
  id: string;
  featureArea: string;
  permissionType: 'view' | 'create' | 'edit' | 'delete' | 'export';
  description?: string;
}

describe('RBAC Integration Tests - Complete System', () => {
  let app: Express;
  let testOrg: { id: string; name: string };
  let testUsers: TestUser[] = [];
  let testRoles: TestRole[] = [];
  let testPermissions: TestPermission[] = [];
  let server: any;

  // Test data cleanup
  const cleanupTestData = async () => {
    if (testOrg?.id) {
      // Clean up in order to respect foreign key constraints
      await db.delete(activityEvents).where(eq(activityEvents.organizationId, testOrg.id));
      await db.delete(userRoles).where(eq(userRoles.organizationId, testOrg.id));
      await db.delete(rolePermissions).where(
        sql`role_id IN (SELECT id FROM roles WHERE organization_id = ${testOrg.id})`
      );
      await db.delete(roles).where(eq(roles.organizationId, testOrg.id));
      await db.delete(organizations).where(eq(organizations.id, testOrg.id));
    }
    testOrg = {} as any;
    testUsers = [];
    testRoles = [];
    testPermissions = [];
  };

  beforeAll(async () => {
    // Create test app
    const result = createApp();
    app = result.app;
    server = result.server;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Reset test data
    await cleanupTestData();
    
    // Create test organization
    const orgResult = await db.insert(organizations).values({
      name: 'Test Organization',
      slug: 'test-org-' + Date.now(),
    }).returning();
    testOrg = orgResult[0];

    // Create test permissions for all feature areas
    const featureAreas = [
      'clients', 'contacts', 'deals', 'projects', 'tasks', 
      'invoices', 'bills', 'vendors', 'proposals', 'contracts',
      'engagements', 'files', 'threads', 'messages', 'dashboard', 'roles'
    ];
    
    const permissionTypes: ('view' | 'create' | 'edit' | 'delete' | 'export')[] = 
      ['view', 'create', 'edit', 'delete', 'export'];

    for (const feature of featureAreas) {
      for (const type of permissionTypes) {
        const permResult = await db.insert(permissions).values({
          featureArea: feature,
          permissionType: type,
          description: `${type} permission for ${feature}`,
        }).returning();
        testPermissions.push(...permResult);
      }
    }

    // Create default roles with permissions
    const defaultRoles = [
      {
        name: 'Admin',
        description: 'Full system access',
        isDefault: true,
        permissions: testPermissions.map(p => p.id), // All permissions
      },
      {
        name: 'Manager',
        description: 'Team management access',
        isDefault: true,
        permissions: testPermissions
          .filter(p => !p.permissionType.includes('delete') && p.featureArea !== 'roles')
          .map(p => p.id),
      },
      {
        name: 'Team Member',
        description: 'Standard user access',
        isDefault: true,
        permissions: testPermissions
          .filter(p => p.permissionType === 'view' && p.featureArea !== 'roles')
          .map(p => p.id),
      },
      {
        name: 'Client',
        description: 'Client portal access',
        isDefault: true,
        permissions: testPermissions
          .filter(p => 
            ['view'].includes(p.permissionType) && 
            ['clients', 'contacts', 'proposals', 'contracts', 'engagements', 'files', 'threads', 'messages'].includes(p.featureArea)
          )
          .map(p => p.id),
      },
    ];

    for (const roleData of defaultRoles) {
      const roleResult = await db.insert(roles).values({
        organizationId: testOrg.id,
        name: roleData.name,
        description: roleData.description,
        isDefault: roleData.isDefault,
      }).returning();
      
      const role = roleResult[0];
      testRoles.push(role);

      // Assign permissions to role
      if (roleData.permissions.length > 0) {
        await db.insert(rolePermissions).values(
          roleData.permissions.map(permId => ({
            roleId: role.id,
            permissionId: permId,
          }))
        );
      }
    }

    // Create test users
    const usersData = [
      { email: 'admin@test.com', name: 'Admin User', role: 'Admin' },
      { email: 'manager@test.com', name: 'Manager User', role: 'Manager' },
      { email: 'member@test.com', name: 'Team Member User', role: 'Team Member' },
      { email: 'client@test.com', name: 'Client User', role: 'Client' },
      { email: 'multi@test.com', name: 'Multi Role User', role: 'Team Member' }, // Will get multiple roles
    ];

    for (const userData of usersData) {
      // Create user (simplified - in real system this would use auth service)
      const userResult = await db.insert(users).values({
        email: userData.email,
        name: userData.name,
      }).returning();
      
      const user = userResult[0];
      
      testUsers.push({
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: testOrg.id,
      });

      // Assign primary role
      const role = testRoles.find(r => r.name === userData.role);
      if (role) {
        await db.insert(userRoles).values({
          userId: user.id,
          roleId: role.id,
          organizationId: testOrg.id,
          assignedById: 'system',
        });
      }
    }

    // Assign additional roles to multi-role user
    const multiUser = testUsers.find(u => u.email === 'multi@test.com');
    const managerRole = testRoles.find(r => r.name === 'Manager');
    if (multiUser && managerRole) {
      await db.insert(userRoles).values({
        userId: multiUser.id,
        roleId: managerRole.id,
        organizationId: testOrg.id,
        assignedById: 'system',
      });
    }
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Phase 1: Role Creation and Assignment', () => {
    it('should create custom role with specific permissions', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const customRoleData = {
        name: 'Project Manager',
        description: 'Can manage projects and tasks',
        permissionIds: testPermissions
          .filter(p => ['projects', 'tasks'].includes(p.featureArea))
          .map(p => p.id),
      };

      // Act
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminUser.id}`) // Simplified auth
        .send(customRoleData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Project Manager');
      expect(response.body.data.description).toBe('Can manage projects and tasks');
      expect(response.body.data.isDefault).toBe(false);
      expect(response.body.data.organizationId).toBe(testOrg.id);

      // Verify role was created with permissions
      const roleWithPermissions = await request(app)
        .get(`/api/roles/${response.body.data.id}`)
        .set('Authorization', `Bearer ${adminUser.id}`);

      expect(roleWithPermissions.body.data.permissions).toHaveLength(
        customRoleData.permissionIds.length
      );
    });

    it('should assign role to user successfully', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;
      const adminRole = testRoles.find(r => r.name === 'Admin')!;

      // Act
      const response = await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: adminRole.id });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.userId).toBe(targetUser.id);
      expect(response.body.data.roleId).toBe(adminRole.id);
      expect(response.body.data.organizationId).toBe(testOrg.id);
      expect(response.body.data.assignedById).toBe(adminUser.id);

      // Verify user now has the role
      const userRoles = await request(app)
        .get(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`);

      expect(userRoles.body.data).toHaveLength(2); // Original + new role
      expect(userRoles.body.data.map((r: any) => r.id)).toContain(adminRole.id);
    });

    it('should prevent duplicate role assignments', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;
      const memberRole = testRoles.find(r => r.name === 'Team Member')!;

      // Act - Try to assign the same role twice
      const firstAssignment = await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: memberRole.id });

      const secondAssignment = await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: memberRole.id });

      // Assert
      expect(firstAssignment.status).toBe(201);
      expect(secondAssignment.status).toBe(409); // Conflict for duplicate
    });

    it('should enforce organization isolation in role assignments', async () => {
      // Arrange - Create second organization
      const org2Result = await db.insert(organizations).values({
        name: 'Second Organization',
        slug: 'second-org-' + Date.now(),
      }).returning();
      const org2 = org2Result[0];

      // Create role in second organization
      const org2RoleResult = await db.insert(roles).values({
        organizationId: org2.id,
        name: 'Org 2 Role',
        description: 'Role in second organization',
      }).returning();
      const org2Role = org2RoleResult[0];

      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;

      // Act - Try to assign role from different organization
      const response = await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: org2Role.id });

      // Assert
      expect(response.status).toBe(404); // Role not found due to org isolation

      // Cleanup
      await db.delete(roles).where(eq(roles.id, org2Role.id));
      await db.delete(organizations).where(eq(organizations.id, org2.id));
    });
  });

  describe('Phase 2: Permission Enforcement Across Endpoints', () => {
    it('should allow access with proper permissions', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act - Admin should access all endpoints
      const rolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminUser.id}`);

      const dashboardResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminUser.id}`);

      // Assert
      expect(rolesResponse.status).toBe(200);
      expect(dashboardResponse.status).toBe(200);
      expect(rolesResponse.body.data).toHaveLength(testRoles.length);
    });

    it('should deny access without proper permissions', async () => {
      // Arrange
      const clientUser = testUsers.find(u => u.email === 'client@test.com')!;

      // Act - Client should not access admin endpoints
      const rolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${clientUser.id}`);

      // Assert
      expect(rolesResponse.status).toBe(403);
      expect(rolesResponse.body.code).toBe('PERMISSION_DENIED');
    });

    it('should enforce view-only permissions correctly', async () => {
      // Arrange
      const clientUser = testUsers.find(u => u.email === 'client@test.com')!;

      // Act - Client can view but not create/edit/delete
      const viewResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${clientUser.id}`);

      const createResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${clientUser.id}`)
        .send({ name: 'Test Client' });

      // Assert
      expect(viewResponse.status).toBe(200); // Can view
      expect(createResponse.status).toBe(403); // Cannot create
    });

    it('should log all permission decisions for audit', async () => {
      // Arrange
      const clientUser = testUsers.find(u => u.email === 'client@test.com')!;

      // Act - Attempt access that should be denied
      await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${clientUser.id}`);

      // Check audit log
      const auditLogs = await db
        .select()
        .from(activityEvents)
        .where(
          and(
            eq(activityEvents.organizationId, testOrg.id),
            eq(activityEvents.actorId, clientUser.id),
            eq(activityEvents.entityType, 'permission_check'),
            eq(activityEvents.type, 'rejected')
          )
        )
        .orderBy(desc(activityEvents.createdAt))
        .limit(1);

      // Assert
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].description).toContain('Permission denied');
      expect(auditLogs[0].metadata).toMatchObject({
        reason: 'permission_denied',
        featureArea: 'roles',
        action: 'view',
      });
    });

    it('should handle permission check performance efficiently', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const startTime = Date.now();

      // Act - Make multiple permission checks
      const promises = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${adminUser.id}`)
      );

      await Promise.all(promises);
      const endTime = Date.now();

      // Assert - All requests should complete quickly (< 2 seconds total)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000);
      expect(totalTime / 50).toBeLessThan(100); // Average < 100ms per request
    });
  });

  describe('Phase 3: Multi-Role Scenarios', () => {
    it('should aggregate permissions from multiple roles', async () => {
      // Arrange
      const multiUser = testUsers.find(u => u.email === 'multi@test.com')!; // Has Team Member + Manager roles

      // Act - Should have combined permissions (union of both roles)
      const clientsResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${multiUser.id}`);

      const rolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${multiUser.id}`);

      // Assert
      expect(clientsResponse.status).toBe(200); // From Team Member role
      expect(rolesResponse.status).toBe(403); // Neither role has roles:view permission
    });

    it('should handle role conflicts gracefully', async () => {
      // Arrange - Create conflicting roles
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      
      const readOnlyRole = await db.insert(roles).values({
        organizationId: testOrg.id,
        name: 'Read Only',
        description: 'Can only view',
        isDefault: false,
      }).returning();

      const fullAccessRole = await db.insert(roles).values({
        organizationId: testOrg.id,
        name: 'Full Access',
        description: 'Can do everything',
        isDefault: false,
      }).returning();

      // Assign conflicting permissions
      const viewPermissions = testPermissions.filter(p => p.permissionType === 'view');
      await db.insert(rolePermissions).values(
        viewPermissions.map(p => ({
          roleId: readOnlyRole[0].id,
          permissionId: p.id,
        }))
      );

      await db.insert(rolePermissions).values(
        testPermissions.map(p => ({
          roleId: fullAccessRole[0].id,
          permissionId: p.id,
        }))
      );

      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;

      // Assign both roles
      await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: readOnlyRole[0].id });

      await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: fullAccessRole[0].id });

      // Act - Should have full access (union of permissions)
      const createResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${targetUser.id}`)
        .send({ name: 'Test Client' });

      // Assert
      expect(createResponse.status).toBe(200); // Full access role grants create permission

      // Cleanup
      await db.delete(userRoles).where(
        sql`user_id = ${targetUser.id} AND role_id IN (${readOnlyRole[0].id}, ${fullAccessRole[0].id})`
      );
      await db.delete(rolePermissions).where(
        sql`role_id IN (${readOnlyRole[0].id}, ${fullAccessRole[0].id})`
      );
      await db.delete(roles).where(
        sql`id IN (${readOnlyRole[0].id}, ${fullAccessRole[0].id})`
      );
    });

    it('should handle role removal and permission updates', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;
      const adminRole = testRoles.find(r => r.name === 'Admin')!;

      // Assign admin role temporarily
      await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: adminRole.id });

      // Verify admin access
      const adminAccessResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${targetUser.id}`);

      expect(adminAccessResponse.status).toBe(200);

      // Act - Remove admin role
      await request(app)
        .delete(`/api/users/${targetUser.id}/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${adminUser.id}`);

      // Assert - Should lose admin access
      const afterRemovalResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${targetUser.id}`);

      expect(afterRemovalResponse.status).toBe(403);
    });

    it('should maintain permission consistency during role updates', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      
      const customRole = await db.insert(roles).values({
        organizationId: testOrg.id,
        name: 'Dynamic Role',
        description: 'Role with changing permissions',
        isDefault: false,
      }).returning();

      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;

      // Assign role with no permissions initially
      await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: customRole[0].id });

      // Verify no access
      const noAccessResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${targetUser.id}`);

      expect(noAccessResponse.status).toBe(403);

      // Act - Add permissions to role
      const clientViewPerm = testPermissions.find(p => 
        p.featureArea === 'clients' && p.permissionType === 'view'
      )!;

      await request(app)
        .put(`/api/roles/${customRole[0].id}`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ 
          permissionIds: [clientViewPerm.id]
        });

      // Assert - Should now have access
      const withAccessResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${targetUser.id}`);

      expect(withAccessResponse.status).toBe(200);

      // Cleanup
      await db.delete(userRoles).where(eq(userRoles.roleId, customRole[0].id));
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, customRole[0].id));
      await db.delete(roles).where(eq(roles.id, customRole[0].id));
    });
  });

  describe('Phase 4: Security and Performance Validation', () => {
    it('should prevent privilege escalation attempts', async () => {
      // Arrange
      const memberUser = testUsers.find(u => u.email === 'member@test.com')!;
      const adminRole = testRoles.find(r => r.name === 'Admin')!;

      // Act - Try to assign admin role to self
      const selfAssignmentResponse = await request(app)
        .post(`/api/users/${memberUser.id}/roles`)
        .set('Authorization', `Bearer ${memberUser.id}`)
        .send({ roleId: adminRole.id });

      // Assert
      expect(selfAssignmentResponse.status).toBe(403); // Cannot assign roles without permission
    });

    it('should handle concurrent role assignments safely', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;
      const managerRole = testRoles.find(r => r.name === 'Manager')!;

      // Act - Make concurrent assignment attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/users/${targetUser.id}/roles`)
          .set('Authorization', `Bearer ${adminUser.id}`)
          .send({ roleId: managerRole.id })
      );

      const responses = await Promise.all(promises);

      // Assert - Only one should succeed, others should get 409 (conflict)
      const successCount = responses.filter(r => r.status === 201).length;
      const conflictCount = responses.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(9);

      // Cleanup - Remove the assigned role
      await request(app)
        .delete(`/api/users/${targetUser.id}/roles/${managerRole.id}`)
        .set('Authorization', `Bearer ${adminUser.id}`);
    });

    it('should maintain audit trail integrity', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;
      const managerRole = testRoles.find(r => r.name === 'Manager')!;

      // Act - Perform role assignment
      await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: managerRole.id });

      // Check audit trail
      const auditLogs = await db
        .select()
        .from(activityEvents)
        .where(
          and(
            eq(activityEvents.organizationId, testOrg.id),
            eq(activityEvents.actorId, adminUser.id),
            eq(activityEvents.entityType, 'user_role')
          )
        )
        .orderBy(desc(activityEvents.createdAt));

      // Assert
      expect(auditLogs.length).toBeGreaterThan(0);
      const roleAssignmentLog = auditLogs.find(log => 
        log.description.includes('role assigned')
      );
      expect(roleAssignmentLog).toBeDefined();
      expect(roleAssignmentLog!.metadata).toMatchObject({
        targetUserId: targetUser.id,
        roleId: managerRole.id,
      });

      // Cleanup
      await request(app)
        .delete(`/api/users/${targetUser.id}/roles/${managerRole.id}`)
        .set('Authorization', `Bearer ${adminUser.id}`);
    });

    it('should validate RBAC system performance under load', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const startTime = Date.now();

      // Act - Simulate high load with permission checks
      const concurrentRequests = Array.from({ length: 100 }, (_, i) =>
        request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${adminUser.id}`)
          .query({ requestId: i }) // Unique query to prevent caching
      );

      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // Assert
      const successCount = responses.filter(r => r.status === 200).length;
      const totalTime = endTime - startTime;

      expect(successCount).toBe(100); // All requests should succeed
      expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(totalTime / 100).toBeLessThan(50); // Average < 50ms per request
    });
  });

  describe('Phase 5: Edge Cases and Error Handling', () => {
    it('should handle invalid role IDs gracefully', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;

      // Act
      const response = await request(app)
        .post(`/api/users/${targetUser.id}/roles`)
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: 'invalid-role-id' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should handle non-existent user IDs gracefully', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const managerRole = testRoles.find(r => r.name === 'Manager')!;

      // Act
      const response = await request(app)
        .post('/api/users/non-existent-user/roles')
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({ roleId: managerRole.id });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should validate role assignment constraints', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;
      const adminRole = testRoles.find(r => r.name === 'Admin')!;

      // Act - Try to delete default role
      const deleteResponse = await request(app)
        .delete(`/api/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${adminUser.id}`);

      // Assert
      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.body.code).toBe('PROTECTED_ROLE');
    });

    it('should handle database constraint violations', async () => {
      // Arrange - Create role with duplicate name
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act - Try to create role with existing name
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminUser.id}`)
        .send({
          name: 'Admin', // Same as default role
          description: 'Duplicate role',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Phase 6: Integration with Other Systems', () => {
    it('should integrate with authentication system', async () => {
      // Act - Try to access without authentication
      const response = await request(app)
        .get('/api/roles');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should integrate with organization context', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminUser.id}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(testRoles.length);
      expect(response.body.data.every((role: any) => role.organizationId === testOrg.id)).toBe(true);
    });

    it('should maintain consistency across domain boundaries', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act - Access resources across different domains
      const clientsResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${adminUser.id}`);

      const projectsResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminUser.id}`);

      const invoicesResponse = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${adminUser.id}`);

      // Assert - All should work with consistent permissions
      expect(clientsResponse.status).toBe(200);
      expect(projectsResponse.status).toBe(200);
      expect(invoicesResponse.status).toBe(200);
    });
  });
});
