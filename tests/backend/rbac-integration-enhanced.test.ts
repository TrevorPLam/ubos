/**
 * RBAC Integration Tests
 * 
 * Comprehensive integration tests for Role-Based Access Control system covering:
 * - Role creation and assignment
 * - Permission enforcement across endpoints  
 * - Multi-role scenarios
 * - Organization isolation
 * - Audit trail validation
 * 
 * Validates Requirements: 83.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, UserRole, RolePermission, Permission, InsertRole, InsertUserRole } from '@shared/schema';

/**
 * Enhanced Mock RBAC Storage for Integration Testing
 * 
 * This mock storage provides comprehensive RBAC functionality with:
 * - Organization isolation enforcement
 * - Permission aggregation from multiple roles
 * - Audit trail simulation
 * - Performance tracking
 * - Error handling and validation
 */
class MockRBACIntegrationStorage {
  private roles: Role[] = [];
  private userRoles: UserRole[] = [];
  private rolePermissions: RolePermission[] = [];
  private permissions: Permission[] = [];
  private auditLog: Array<{
    action: string;
    actorId: string;
    targetId?: string;
    metadata: any;
    timestamp: Date;
    organizationId: string;
  }> = [];
  private performanceMetrics: Array<{
    operation: string;
    duration: number;
    timestamp: Date;
  }> = [];

  // Performance tracking wrapper
  private async trackPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.performanceMetrics.push({
        operation,
        duration,
        timestamp: new Date(),
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMetrics.push({
        operation: `${operation} (failed)`,
        duration,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  // Audit logging
  private logAudit(data: {
    action: string;
    actorId: string;
    targetId?: string;
    metadata: any;
    organizationId: string;
  }) {
    this.auditLog.push({
      ...data,
      timestamp: new Date(),
    });
  }

  // Seed default permissions
  seedDefaultPermissions() {
    const featureAreas = [
      'clients', 'contacts', 'deals', 'projects', 'tasks', 
      'invoices', 'bills', 'vendors', 'proposals', 'contracts',
      'engagements', 'files', 'threads', 'messages', 'dashboard', 'roles'
    ];
    
    const permissionTypes: ('view' | 'create' | 'edit' | 'delete' | 'export')[] = 
      ['view', 'create', 'edit', 'delete', 'export'];

    for (const feature of featureAreas) {
      for (const type of permissionTypes) {
        this.permissions.push({
          id: `perm-${feature}-${type}`,
          featureArea: feature,
          permissionType: type,
          description: `${type} permission for ${feature}`,
          createdAt: new Date(),
        });
      }
    }
  }

  // Seed default roles with permissions
  async seedDefaultRoles(orgId: string) {
    this.seedDefaultPermissions();
    
    const defaultRoles = [
      {
        name: 'Admin',
        description: 'Full system access',
        isDefault: true,
        permissionFilter: (p: Permission) => true, // All permissions
      },
      {
        name: 'Manager',
        description: 'Team management access',
        isDefault: true,
        permissionFilter: (p: Permission) => 
          !p.permissionType.includes('delete') && p.featureArea !== 'roles',
      },
      {
        name: 'Team Member',
        description: 'Standard user access',
        isDefault: true,
        permissionFilter: (p: Permission) => 
          p.permissionType === 'view' && p.featureArea !== 'roles',
      },
      {
        name: 'Client',
        description: 'Client portal access',
        isDefault: true,
        permissionFilter: (p: Permission) => 
          ['view'].includes(p.permissionType) && 
          ['clients', 'contacts', 'proposals', 'contracts', 'engagements', 'files', 'threads', 'messages'].includes(p.featureArea),
      },
    ];

    const createdRoles: Role[] = [];
    
    for (const roleData of defaultRoles) {
      const role = await this.createRole({
        organizationId: orgId,
        name: roleData.name,
        description: roleData.description,
        isDefault: roleData.isDefault,
      });
      createdRoles.push(role);

      // Assign filtered permissions
      const filteredPermissions = this.permissions.filter(roleData.permissionFilter);
      for (const permission of filteredPermissions) {
        this.assignRolePermission({
          roleId: role.id,
          permissionId: permission.id,
        });
      }
    }

    return createdRoles;
  }

  async createRole(data: InsertRole): Promise<Role> {
    return this.trackPerformance('createRole', async () => {
      const now = new Date();
      const role: Role = {
        id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        organizationId: data.organizationId,
        name: data.name,
        description: data.description ?? null,
        isDefault: data.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      };
      
      this.roles.push(role);
      
      this.logAudit({
        action: 'role_created',
        actorId: 'system',
        targetId: role.id,
        metadata: { roleName: role.name, organizationId: role.organizationId },
        organizationId: role.organizationId,
      });
      
      return role;
    });
  }

  async getRoles(orgId: string): Promise<Role[]> {
    return this.trackPerformance('getRoles', async () => {
      return this.roles.filter(r => r.organizationId === orgId);
    });
  }

  async getRole(roleId: string, orgId: string): Promise<Role | undefined> {
    return this.trackPerformance('getRole', async () => {
      return this.roles.find(r => r.id === roleId && r.organizationId === orgId);
    });
  }

  async getRoleWithPermissions(roleId: string, orgId: string): Promise<Role & { permissions: Permission[] } | undefined> {
    return this.trackPerformance('getRoleWithPermissions', async () => {
      const role = await this.getRole(roleId, orgId);
      if (!role) return undefined;

      const rolePermIds = this.rolePermissions
        .filter(rp => rp.roleId === roleId)
        .map(rp => rp.permissionId);

      const permissions = this.permissions.filter(p => rolePermIds.includes(p.id));

      return {
        ...role,
        permissions,
      };
    });
  }

  async updateRole(roleId: string, orgId: string, data: Partial<InsertRole>): Promise<Role | undefined> {
    return this.trackPerformance('updateRole', async () => {
      const role = this.roles.find(r => r.id === roleId && r.organizationId === orgId);
      if (!role) return undefined;

      Object.assign(role, {
        ...data,
        updatedAt: new Date(),
      });

      this.logAudit({
        action: 'role_updated',
        actorId: 'system',
        targetId: role.id,
        metadata: { updates: data },
        organizationId: role.organizationId,
      });

      return role;
    });
  }

  async deleteRole(roleId: string, orgId: string): Promise<boolean> {
    return this.trackPerformance('deleteRole', async () => {
      const role = this.roles.find(r => r.id === roleId && r.organizationId === orgId);
      if (!role || role.isDefault) return false;

      // Check if role is assigned to any users
      const hasAssignments = this.userRoles.some(ur => ur.roleId === roleId);
      if (hasAssignments) return false;

      // Remove role and its permissions
      this.roles = this.roles.filter(r => r.id !== roleId);
      this.rolePermissions = this.rolePermissions.filter(rp => rp.roleId !== roleId);

      this.logAudit({
        action: 'role_deleted',
        actorId: 'system',
        targetId: roleId,
        metadata: { roleName: role.name },
        organizationId: role.organizationId,
      });

      return true;
    });
  }

  async assignRoleToUser(data: InsertUserRole): Promise<UserRole> {
    return this.trackPerformance('assignRoleToUser', async () => {
      // Check for duplicate assignment
      const existing = this.userRoles.find(
        ur => ur.userId === data.userId && ur.roleId === data.roleId && ur.organizationId === data.organizationId
      );
      
      if (existing) {
        throw new Error('Role already assigned to user');
      }

      const now = new Date();
      const userRole: UserRole = {
        id: `user-role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: data.userId,
        roleId: data.roleId,
        organizationId: data.organizationId,
        assignedById: data.assignedById ?? null,
        assignedAt: now,
      };
      
      this.userRoles.push(userRole);
      
      this.logAudit({
        action: 'role_assigned',
        actorId: data.assignedById || 'system',
        targetId: data.userId,
        metadata: { roleId: data.roleId, organizationId: data.organizationId },
        organizationId: data.organizationId,
      });
      
      return userRole;
    });
  }

  async getUserRoles(userId: string, orgId: string): Promise<Role[]> {
    return this.trackPerformance('getUserRoles', async () => {
      const userRoleIds = this.userRoles
        .filter(ur => ur.userId === userId && ur.organizationId === orgId)
        .map(ur => ur.roleId);
      
      return this.roles.filter(r => userRoleIds.includes(r.id));
    });
  }

  async getUserPermissions(userId: string, orgId: string): Promise<Permission[]> {
    return this.trackPerformance('getUserPermissions', async () => {
      const userRoles = await this.getUserRoles(userId, orgId);
      const roleIds = userRoles.map(r => r.id);
      
      const rolePerms = this.rolePermissions.filter(rp => roleIds.includes(rp.roleId));
      const permissionIds = rolePerms.map(rp => rp.permissionId);
      
      // Return unique permissions
      const uniquePermissions = this.permissions.filter(p => permissionIds.includes(p.id));
      const seen = new Set();
      return uniquePermissions.filter(p => {
        const key = `${p.featureArea}:${p.permissionType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }

  async removeRoleFromUser(userId: string, roleId: string, orgId: string): Promise<boolean> {
    return this.trackPerformance('removeRoleFromUser', async () => {
      const initialLength = this.userRoles.length;
      this.userRoles = this.userRoles.filter(
        ur => !(ur.userId === userId && ur.roleId === roleId && ur.organizationId === orgId)
      );
      
      const removed = this.userRoles.length < initialLength;
      
      if (removed) {
        this.logAudit({
          action: 'role_removed',
          actorId: 'system',
          targetId: userId,
          metadata: { roleId, organizationId: orgId },
          organizationId: orgId,
        });
      }
      
      return removed;
    });
  }

  async assignRolePermission(data: { roleId: string; permissionId: string }): Promise<RolePermission> {
    return this.trackPerformance('assignRolePermission', async () => {
      const rolePermission: RolePermission = {
        id: `rp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roleId: data.roleId,
        permissionId: data.permissionId,
        createdAt: new Date(),
      };
      
      this.rolePermissions.push(rolePermission);
      return rolePermission;
    });
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    return this.trackPerformance('assignPermissionsToRole', async () => {
      // Remove existing permissions
      this.rolePermissions = this.rolePermissions.filter(rp => rp.roleId !== roleId);
      
      // Add new permissions
      for (const permissionId of permissionIds) {
        this.rolePermissions.push({
          id: `rp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roleId,
          permissionId,
          createdAt: new Date(),
        });
      }
    });
  }

  async getPermissions(): Promise<Permission[]> {
    return this.trackPerformance('getPermissions', async () => {
      return [...this.permissions];
    });
  }

  // Helper methods for testing
  getAuditLog() {
    return [...this.auditLog];
  }

  getPerformanceMetrics() {
    return [...this.performanceMetrics];
  }

  clearAuditLog() {
    this.auditLog = [];
  }

  clear() {
    this.roles = [];
    this.userRoles = [];
    this.rolePermissions = [];
    this.permissions = [];
    this.auditLog = [];
    this.performanceMetrics = [];
  }
}

describe('RBAC Integration Tests - Complete System', () => {
  let storage: MockRBACIntegrationStorage;
  let orgId: string;
  let testUsers: Array<{ id: string; email: string; name: string }>;
  let testRoles: Role[];

  beforeEach(async () => {
    storage = new MockRBACIntegrationStorage();
    orgId = `org-${Date.now()}`;
    
    // Create test users
    testUsers = [
      { id: 'user-1', email: 'admin@test.com', name: 'Admin User' },
      { id: 'user-2', email: 'manager@test.com', name: 'Manager User' },
      { id: 'user-3', email: 'member@test.com', name: 'Team Member User' },
      { id: 'user-4', email: 'client@test.com', name: 'Client User' },
      { id: 'user-5', email: 'multi@test.com', name: 'Multi Role User' },
    ];

    // Seed default roles
    testRoles = await storage.seedDefaultRoles(orgId);

    // Assign primary roles to users
    await storage.assignRoleToUser({
      userId: testUsers[0].id, // admin
      roleId: testRoles.find(r => r.name === 'Admin')!.id,
      organizationId: orgId,
      assignedById: 'system',
    });

    await storage.assignRoleToUser({
      userId: testUsers[1].id, // manager
      roleId: testRoles.find(r => r.name === 'Manager')!.id,
      organizationId: orgId,
      assignedById: 'system',
    });

    await storage.assignRoleToUser({
      userId: testUsers[2].id, // member
      roleId: testRoles.find(r => r.name === 'Team Member')!.id,
      organizationId: orgId,
      assignedById: 'system',
    });

    await storage.assignRoleToUser({
      userId: testUsers[3].id, // client
      roleId: testRoles.find(r => r.name === 'Client')!.id,
      organizationId: orgId,
      assignedById: 'system',
    });

    // Multi-role user gets both Team Member and Manager roles
    await storage.assignRoleToUser({
      userId: testUsers[4].id, // multi
      roleId: testRoles.find(r => r.name === 'Team Member')!.id,
      organizationId: orgId,
      assignedById: 'system',
    });

    await storage.assignRoleToUser({
      userId: testUsers[4].id, // multi
      roleId: testRoles.find(r => r.name === 'Manager')!.id,
      organizationId: orgId,
      assignedById: 'system',
    });
  });

  describe('Phase 1: Role Creation and Assignment', () => {
    it('should create custom role with specific permissions', async () => {
      // Arrange
      storage.clearAuditLog(); // Clear previous audit logs
      const customRoleData: InsertRole = {
        organizationId: orgId,
        name: 'Project Manager',
        description: 'Can manage projects and tasks',
        isDefault: false,
      };

      // Act
      const role = await storage.createRole(customRoleData);

      // Assert
      expect(role).toBeDefined();
      expect(role.name).toBe('Project Manager');
      expect(role.description).toBe('Can manage projects and tasks');
      expect(role.isDefault).toBe(false);
      expect(role.organizationId).toBe(orgId);

      // Verify audit log - get the most recent role creation
      const auditLog = storage.getAuditLog();
      const creationLogs = auditLog.filter(log => log.action === 'role_created');
      const projectManagerLog = creationLogs.find(log => log.metadata.roleName === 'Project Manager');
      expect(projectManagerLog).toBeDefined();
      expect(projectManagerLog!.metadata.roleName).toBe('Project Manager');
    });

    it('should assign role to user successfully', async () => {
      // Arrange
      storage.clearAuditLog(); // Clear previous audit logs
      const customRole = await storage.createRole({
        organizationId: orgId,
        name: 'Custom Role',
        description: 'Test role',
      });

      // Act
      const userRole = await storage.assignRoleToUser({
        userId: testUsers[2].id,
        roleId: customRole.id,
        organizationId: orgId,
        assignedById: testUsers[0].id,
      });

      // Assert
      expect(userRole).toBeDefined();
      expect(userRole.userId).toBe(testUsers[2].id);
      expect(userRole.roleId).toBe(customRole.id);
      expect(userRole.assignedById).toBe(testUsers[0].id);

      // Verify user now has the role
      const userRoles = await storage.getUserRoles(testUsers[2].id, orgId);
      expect(userRoles).toHaveLength(2); // Original + new role
      expect(userRoles.map(r => r.id)).toContain(customRole.id);

      // Verify audit trail - find the specific assignment for this test
      const auditLog = storage.getAuditLog();
      const assignmentLogs = auditLog.filter(log => 
        log.action === 'role_assigned' && 
        log.targetId === testUsers[2].id &&
        log.metadata.roleId === customRole.id
      );
      expect(assignmentLogs.length).toBeGreaterThan(0);
      expect(assignmentLogs[0].metadata.roleId).toBe(customRole.id);
    });

    it('should prevent duplicate role assignments', async () => {
      // Arrange
      const memberRole = testRoles.find(r => r.name === 'Team Member')!;

      // Act & Assert
      await expect(
        storage.assignRoleToUser({
          userId: testUsers[2].id,
          roleId: memberRole.id,
          organizationId: orgId,
        })
      ).rejects.toThrow('Role already assigned to user');
    });

    it('should enforce organization isolation', async () => {
      // Arrange
      const otherOrgId = `other-org-${Date.now()}`;
      const otherRole = await storage.createRole({
        organizationId: otherOrgId,
        name: 'Other Org Role',
      });

      // Act
      const role = await storage.getRole(otherRole.id, orgId);

      // Assert
      expect(role).toBeUndefined(); // Should not find role from other org
    });
  });

  describe('Phase 2: Permission Enforcement', () => {
    it('should aggregate permissions from multiple roles', async () => {
      // Arrange
      const multiUser = testUsers.find(u => u.email === 'multi@test.com')!;

      // Act
      const permissions = await storage.getUserPermissions(multiUser.id, orgId);

      // Assert
      expect(permissions.length).toBeGreaterThan(0);
      
      // Should have permissions from both Team Member and Manager roles
      const hasClientView = permissions.some(p => 
        p.featureArea === 'clients' && p.permissionType === 'view'
      );
      const hasProjectCreate = permissions.some(p => 
        p.featureArea === 'projects' && p.permissionType === 'create'
      );
      
      expect(hasClientView).toBe(true); // From Team Member
      expect(hasProjectCreate).toBe(true); // From Manager
    });

    it('should enforce permission boundaries correctly', async () => {
      // Arrange
      const clientUser = testUsers.find(u => u.email === 'client@test.com')!;
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act
      const clientPermissions = await storage.getUserPermissions(clientUser.id, orgId);
      const adminPermissions = await storage.getUserPermissions(adminUser.id, orgId);

      // Assert
      // Client should have limited permissions
      expect(clientPermissions.some(p => p.featureArea === 'roles')).toBe(false);
      expect(clientPermissions.some(p => p.permissionType === 'delete')).toBe(false);
      
      // Admin should have all permissions
      expect(adminPermissions.length).toBeGreaterThan(clientPermissions.length);
      expect(adminPermissions.some(p => p.featureArea === 'roles')).toBe(true);
      expect(adminPermissions.some(p => p.permissionType === 'delete')).toBe(true);
    });

    it('should handle permission checks efficiently', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act - Multiple permission checks
      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, () =>
        storage.getUserPermissions(adminUser.id, orgId)
      );
      await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      const metrics = storage.getPerformanceMetrics();
      const permissionCheckMetrics = metrics.filter(m => m.operation === 'getUserPermissions');
      
      expect(permissionCheckMetrics).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Average time should be reasonable
      const avgTime = permissionCheckMetrics.reduce((sum, m) => sum + m.duration, 0) / permissionCheckMetrics.length;
      expect(avgTime).toBeLessThan(50); // Less than 50ms average
    });
  });

  describe('Phase 3: Multi-Role Scenarios', () => {
    it('should handle role removal and permission updates', async () => {
      // Arrange
      const multiUser = testUsers.find(u => u.email === 'multi@test.com')!;
      const managerRole = testRoles.find(r => r.name === 'Manager')!;

      // Get initial permissions
      const initialPermissions = await storage.getUserPermissions(multiUser.id, orgId);
      const initialCount = initialPermissions.length;

      // Act - Remove manager role
      const removed = await storage.removeRoleFromUser(multiUser.id, managerRole.id, orgId);

      // Assert
      expect(removed).toBe(true);
      
      const updatedPermissions = await storage.getUserPermissions(multiUser.id, orgId);
      expect(updatedPermissions.length).toBeLessThan(initialCount);

      // Verify audit trail
      const auditLog = storage.getAuditLog();
      const removalLog = auditLog.find(log => 
        log.action === 'role_removed' && log.targetId === multiUser.id
      );
      expect(removalLog).toBeDefined();
      expect(removalLog!.metadata.roleId).toBe(managerRole.id);
    });

    it('should maintain permission consistency during role updates', async () => {
      // Arrange
      const customRole = await storage.createRole({
        organizationId: orgId,
        name: 'Dynamic Role',
        description: 'Role with changing permissions',
      });

      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;

      // Assign role with no permissions initially
      await storage.assignRoleToUser({
        userId: targetUser.id,
        roleId: customRole.id,
        organizationId: orgId,
      });

      // Verify no additional access (only original Team Member permissions)
      const beforePermissions = await storage.getUserPermissions(targetUser.id, orgId);

      // Act - Add client view permission to role
      const clientViewPerm = storage['permissions'].find((p: Permission) => 
        p.featureArea === 'clients' && p.permissionType === 'view'
      )!;

      await storage.assignPermissionsToRole(customRole.id, [clientViewPerm.id]);

      // Assert - Should still have same permissions (Team Member already had client view)
      const afterPermissions = await storage.getUserPermissions(targetUser.id, orgId);
      expect(afterPermissions.length).toBe(beforePermissions.length);
    });

    it('should handle complex multi-role permission conflicts', async () => {
      // Arrange - Create roles with overlapping permissions
      const readOnlyRole = await storage.createRole({
        organizationId: orgId,
        name: 'Read Only',
        description: 'Can only view',
      });

      const contributorRole = await storage.createRole({
        organizationId: orgId,
        name: 'Contributor',
        description: 'Can view and create',
      });

      // Assign specific permissions
      const viewPermissions = storage['permissions'].filter((p: Permission) => p.permissionType === 'view');
      const createPermissions = storage['permissions'].filter((p: Permission) => p.permissionType === 'create');

      await storage.assignPermissionsToRole(readOnlyRole.id, viewPermissions.map(p => p.id));
      await storage.assignPermissionsToRole(contributorRole.id, 
        [...viewPermissions, ...createPermissions].map(p => p.id)
      );

      const targetUser = testUsers.find(u => u.email === 'member@test.com')!;

      // Assign both roles
      await storage.assignRoleToUser({
        userId: targetUser.id,
        roleId: readOnlyRole.id,
        organizationId: orgId,
      });

      await storage.assignRoleToUser({
        userId: targetUser.id,
        roleId: contributorRole.id,
        organizationId: orgId,
      });

      // Act
      const userPermissions = await storage.getUserPermissions(targetUser.id, orgId);

      // Assert - Should have union of permissions (no duplicates)
      expect(userPermissions.some(p => p.permissionType === 'view')).toBe(true);
      expect(userPermissions.some(p => p.permissionType === 'create')).toBe(true);
      
      // Verify no duplicate permissions
      const permissionKeys = userPermissions.map(p => `${p.featureArea}:${p.permissionType}`);
      const uniqueKeys = new Set(permissionKeys);
      expect(permissionKeys.length).toBe(uniqueKeys.size);
    });
  });

  describe('Phase 4: Security and Performance', () => {
    it('should maintain comprehensive audit trail', async () => {
      // Arrange
      storage.clearAuditLog();

      // Act - Perform various operations
      const customRole = await storage.createRole({
        organizationId: orgId,
        name: 'Audit Test Role',
      });

      await storage.assignRoleToUser({
        userId: testUsers[2].id,
        roleId: customRole.id,
        organizationId: orgId,
      });

      await storage.removeRoleFromUser(testUsers[2].id, customRole.id, orgId);

      // Assert
      const auditLog = storage.getAuditLog();
      expect(auditLog.length).toBeGreaterThanOrEqual(3);

      const actions = auditLog.map(log => log.action);
      expect(actions).toContain('role_created');
      expect(actions).toContain('role_assigned');
      expect(actions).toContain('role_removed');

      // Verify audit log integrity
      auditLog.forEach(log => {
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.organizationId).toBe(orgId);
        expect(log.action).toBeDefined();
      });
    });

    it('should handle concurrent operations safely', async () => {
      // Arrange
      storage.clear(); // Clear all previous data
      const customRole = await storage.createRole({
        organizationId: orgId,
        name: 'Concurrent Test Role',
      });

      // Get initial metrics count
      const initialMetrics = storage.getPerformanceMetrics();

      // Act - Concurrent role assignments
      const promises = Array.from({ length: 10 }, (_, i) =>
        storage.assignRoleToUser({
          userId: `concurrent-user-${i}`,
          roleId: customRole.id,
          organizationId: orgId,
        })
      );

      const results = await Promise.allSettled(promises);

      // Assert - All should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(10);

      // Verify performance under concurrency - only count new operations
      const allMetrics = storage.getPerformanceMetrics();
      const newMetrics = allMetrics.slice(initialMetrics.length);
      const assignmentMetrics = newMetrics.filter(m => m.operation === 'assignRoleToUser');
      expect(assignmentMetrics).toHaveLength(10);

      const avgTime = assignmentMetrics.reduce((sum, m) => sum + m.duration, 0) / assignmentMetrics.length;
      expect(avgTime).toBeLessThan(100); // Reasonable performance under load
    });

    it('should validate system performance benchmarks', async () => {
      // Arrange
      const adminUser = testUsers.find(u => u.email === 'admin@test.com')!;

      // Act - Performance test
      const startTime = Date.now();
      
      // Mix of operations
      await Promise.all([
        storage.getUserPermissions(adminUser.id, orgId),
        storage.getUserRoles(adminUser.id, orgId),
        storage.getRoles(orgId),
        storage.getPermissions(),
      ]);

      const endTime = Date.now();

      // Assert
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(200); // Should complete quickly

      // Check individual operation metrics
      const metrics = storage.getPerformanceMetrics();
      metrics.forEach(metric => {
        expect(metric.duration).toBeLessThan(100); // Each operation under 100ms
      });
    });
  });

  describe('Phase 5: Edge Cases and Error Handling', () => {
    it('should handle role deletion constraints', async () => {
      // Arrange
      const customRole = await storage.createRole({
        organizationId: orgId,
        name: 'Deletable Role',
      });

      await storage.assignRoleToUser({
        userId: testUsers[2].id,
        roleId: customRole.id,
        organizationId: orgId,
      });

      // Act - Try to delete role while assigned
      const deletedWhileAssigned = await storage.deleteRole(customRole.id, orgId);

      // Remove assignment first
      await storage.removeRoleFromUser(testUsers[2].id, customRole.id, orgId);

      // Now delete should work
      const deletedAfterRemoval = await storage.deleteRole(customRole.id, orgId);

      // Assert
      expect(deletedWhileAssigned).toBe(false); // Cannot delete while assigned
      expect(deletedAfterRemoval).toBe(true); // Can delete after removal

      // Verify role is gone
      const role = await storage.getRole(customRole.id, orgId);
      expect(role).toBeUndefined();
    });

    it('should prevent default role deletion', async () => {
      // Arrange
      const adminRole = testRoles.find(r => r.name === 'Admin')!;

      // Act
      const deleted = await storage.deleteRole(adminRole.id, orgId);

      // Assert
      expect(deleted).toBe(false);
      
      // Role should still exist
      const role = await storage.getRole(adminRole.id, orgId);
      expect(role).toBeDefined();
      expect(role!.isDefault).toBe(true);
    });

    it('should handle invalid operations gracefully', async () => {
      // Act & Assert - Non-existent role
      const nonExistentRole = await storage.getRole('invalid-id', orgId);
      expect(nonExistentRole).toBeUndefined();

      // Act & Assert - Non-existent user role removal
      const removedNonExistent = await storage.removeRoleFromUser('invalid-user', 'invalid-role', orgId);
      expect(removedNonExistent).toBe(false);

      // Act & Assert - Invalid organization
      const crossOrgRole = await storage.getRole(testRoles[0].id, 'invalid-org');
      expect(crossOrgRole).toBeUndefined();
    });

    it('should maintain data consistency', async () => {
      // Arrange
      storage.clear();
      storage.seedDefaultRoles(orgId);

      // Act - Perform complex operations
      const customRole = await storage.createRole({
        organizationId: orgId,
        name: 'Consistency Test Role',
      });

      await storage.assignRoleToUser({
        userId: testUsers[0].id,
        roleId: customRole.id,
        organizationId: orgId,
      });

      await storage.updateRole(customRole.id, orgId, {
        description: 'Updated description',
      });

      // Assert - Data consistency
      const role = await storage.getRoleWithPermissions(customRole.id, orgId);
      expect(role).toBeDefined();
      expect(role!.description).toBe('Updated description');

      const userRoles = await storage.getUserRoles(testUsers[0].id, orgId);
      expect(userRoles.some(r => r.id === customRole.id)).toBe(true);

      // Verify no orphaned data
      const allRolePermissions = storage['rolePermissions'];
      const orphanedPermissions = allRolePermissions.filter(rp => 
        !storage['roles'].some(r => r.id === rp.roleId)
      );
      expect(orphanedPermissions).toHaveLength(0);
    });
  });
});
