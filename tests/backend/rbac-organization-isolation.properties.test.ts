// AI-META-BEGIN
// AI-META: Property-based tests for RBAC organization isolation
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { Role, UserRole, RolePermission, Permission } from '@shared/schema';

class MockRBACStorage {
  private roles: Role[] = [];
  private userRoles: UserRole[] = [];
  private rolePermissions: RolePermission[] = [];
  private permissions: Permission[] = [];

  async createRole(role: Role): Promise<Role> {
    this.roles.push(role);
    return role;
  }

  async getRolesByOrg(orgId: string): Promise<Role[]> {
    return this.roles.filter(r => r.organizationId === orgId);
  }

  async getRoleById(roleId: string, orgId: string): Promise<Role | undefined> {
    return this.roles.find(r => r.id === roleId && r.organizationId === orgId);
  }

  async assignUserRole(userRole: UserRole): Promise<UserRole> {
    this.userRoles.push(userRole);
    return userRole;
  }

  async getUserRoles(userId: string, orgId: string): Promise<UserRole[]> {
    return this.userRoles.filter(ur => ur.userId === userId && ur.organizationId === orgId);
  }

  async removeUserRole(userId: string, roleId: string, orgId: string): Promise<boolean> {
    const index = this.userRoles.findIndex(
      ur => ur.userId === userId && ur.roleId === roleId && ur.organizationId === orgId
    );
    if (index === -1) return false;
    this.userRoles.splice(index, 1);
    return true;
  }

  async createPermission(permission: Permission): Promise<Permission> {
    this.permissions.push(permission);
    return permission;
  }

  async assignRolePermission(rolePermission: RolePermission): Promise<RolePermission> {
    this.rolePermissions.push(rolePermission);
    return rolePermission;
  }

  async getUserPermissions(userId: string, orgId: string): Promise<Permission[]> {
    const userRoles = await this.getUserRoles(userId, orgId);
    const roleIds = userRoles.map(ur => ur.roleId);
    const rolePerms = this.rolePermissions.filter(rp => roleIds.includes(rp.roleId));
    const permissionIds = rolePerms.map(rp => rp.permissionId);
    return this.permissions.filter(p => permissionIds.includes(p.id));
  }

  clear() {
    this.roles = [];
    this.userRoles = [];
    this.rolePermissions = [];
    this.permissions = [];
  }
}

describe('RBAC - Organization Isolation Property Tests', () => {
  let storage: MockRBACStorage;

  beforeEach(() => {
    storage = new MockRBACStorage();
  });

  it('should never return roles from other organizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgId1: fc.uuid(),
          orgId2: fc.uuid(),
          rolesForOrg1: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          rolesForOrg2: fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        async ({ orgId1, orgId2, rolesForOrg1, rolesForOrg2 }) => {
          fc.pre(orgId1 !== orgId2);

          const createdOrg1: Role[] = [];
          for (const data of rolesForOrg1) {
            const role = await storage.createRole({
              ...data,
              organizationId: orgId1,
              description: null,
              isDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            createdOrg1.push(role);
          }

          const createdOrg2: Role[] = [];
          for (const data of rolesForOrg2) {
            const role = await storage.createRole({
              ...data,
              organizationId: orgId2,
              description: null,
              isDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            createdOrg2.push(role);
          }

          const org1Results = await storage.getRolesByOrg(orgId1);
          const org2Results = await storage.getRolesByOrg(orgId2);

          org1Results.forEach(r => expect(r.organizationId).toBe(orgId1));
          org2Results.forEach(r => expect(r.organizationId).toBe(orgId2));

          const org2Ids = new Set(createdOrg2.map(r => r.id));
          const org1Ids = new Set(createdOrg1.map(r => r.id));
          org1Results.forEach(r => expect(org2Ids.has(r.id)).toBe(false));
          org2Results.forEach(r => expect(org1Ids.has(r.id)).toBe(false));
        }
      ),
      { numRuns: 100 }
    );
  });
});
