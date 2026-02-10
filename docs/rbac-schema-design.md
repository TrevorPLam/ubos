# RBAC Schema Design

## Overview

This document describes the Role-Based Access Control (RBAC) schema implementation for UBOS, fulfilling requirements 83.1, 83.2, and 83.4.

## Schema Components

### 1. Permission Type Enum

```typescript
export const permissionTypeEnum = pgEnum("permission_type", [
  "view",
  "create",
  "edit",
  "delete",
  "export",
]);
```

Defines the five types of permissions that can be granted on any feature area.

### 2. Permissions Table

**Purpose**: Stores all available permissions in the system.

**Structure**:
- `id`: UUID primary key
- `featureArea`: The feature/module (e.g., 'clients', 'projects', 'invoices')
- `permissionType`: One of view, create, edit, delete, export
- `description`: Human-readable description
- `createdAt`: Timestamp

**Key Points**:
- Permissions are **global** (not organization-scoped)
- Each feature area has up to 5 permissions (one per type)
- Indexed on `(feature_area, permission_type)` for uniqueness
- Seeded with default permissions for all feature areas

**Feature Areas**:
- CRM: `clients`, `contacts`, `deals`
- Proposals & Contracts: `proposals`, `contracts`
- Projects: `projects`, `tasks`
- Revenue: `invoices`, `bills`
- Documents: `files`
- Communication: `messages`
- Admin: `settings`, `users`, `roles`

### 3. Roles Table

**Purpose**: Stores roles per organization (both default and custom).

**Structure**:
- `id`: UUID primary key
- `organizationId`: Foreign key to organizations (CASCADE delete)
- `name`: Role name (e.g., 'Admin', 'Manager', 'Team Member', 'Client')
- `description`: Role description
- `isDefault`: Boolean flag for system-provided roles
- `createdAt`, `updatedAt`: Timestamps

**Key Points**:
- Roles are **organization-scoped** (multi-tenant)
- Supports both default roles (Admin, Manager, Team Member, Client) and custom roles
- Indexed on `(organization_id, name)` for uniqueness per org
- Default roles created automatically when organization is created

### 4. Role Permissions Table (Junction)

**Purpose**: Links roles to their permissions (many-to-many).

**Structure**:
- `id`: UUID primary key
- `roleId`: Foreign key to roles (CASCADE delete)
- `permissionId`: Foreign key to permissions (CASCADE delete)
- `createdAt`: Timestamp

**Key Points**:
- Junction table implementing many-to-many relationship
- Indexed on `(role_id, permission_id)` for uniqueness
- When a role is deleted, all its permissions are removed
- When a permission is deleted (rare), it's removed from all roles

### 5. User Roles Table (Junction)

**Purpose**: Links users to roles within organizations (many-to-many).

**Structure**:
- `id`: UUID primary key
- `userId`: User identifier (not FK to allow external auth systems)
- `roleId`: Foreign key to roles (CASCADE delete)
- `organizationId`: Foreign key to organizations (CASCADE delete)
- `assignedById`: User who assigned this role (audit trail)
- `assignedAt`: Timestamp

**Key Points**:
- Users can have **multiple roles** per organization (Requirement 83.6)
- Organization-scoped for multi-tenancy
- Indexed on `(user_id, role_id, organization_id)` for uniqueness
- Tracks who assigned the role and when (audit trail for Requirement 83.7)

## Default Roles and Permissions

### Admin Role
**Permissions**: All permissions across all feature areas
- Full access to everything
- Can manage users and roles
- Can modify organization settings

### Manager Role
**Permissions**: All permissions except user/role management
- Full CRUD on clients, deals, projects, invoices, etc.
- Cannot invite users or modify roles
- Cannot change organization settings

### Team Member Role
**Permissions**: View, create, edit on most entities
- Can view and work on assigned tasks
- Can create deals, proposals, projects
- Cannot delete entities or export data
- Cannot access admin features

### Client Role
**Permissions**: View only on client portal items
- Can view files marked as client-visible
- Can view invoices for their engagements
- Can view and send messages in client threads
- Cannot access internal data

## Multi-Tenancy Considerations

### Organization Isolation
- **Permissions**: Global (shared across all organizations)
- **Roles**: Organization-scoped (each org has its own roles)
- **Role Permissions**: Scoped via role's organization
- **User Roles**: Explicitly organization-scoped

### Cross-Organization Users
- Users can belong to multiple organizations
- Each organization membership has independent role assignments
- User can be Admin in Org A and Team Member in Org B

## Permission Checking Flow

1. User makes API request
2. Extract `userId` and `organizationId` from session
3. Query `user_roles` for user's roles in that organization
4. Query `role_permissions` for all permissions granted by those roles
5. Check if required permission exists in the set
6. Allow or deny request

## Audit Trail (Requirement 83.7)

All permission changes are logged via:
- `user_roles.assigned_by_id`: Who assigned the role
- `user_roles.assigned_at`: When the role was assigned
- Activity events table: Log role assignments/removals
- Activity events table: Log role permission changes

## Database Indexes

### Performance Optimization
- `idx_permissions_feature`: Fast lookup by feature area
- `idx_permissions_unique`: Ensure unique (feature, type) combinations
- `idx_roles_org`: Fast lookup of roles per organization
- `idx_roles_org_name`: Ensure unique role names per org
- `idx_role_permissions_role`: Fast lookup of permissions for a role
- `idx_role_permissions_permission`: Fast lookup of roles with a permission
- `idx_role_permissions_unique`: Ensure unique role-permission pairs
- `idx_user_roles_user`: Fast lookup of user's roles
- `idx_user_roles_role`: Fast lookup of users with a role
- `idx_user_roles_org`: Fast lookup of roles in an organization
- `idx_user_roles_unique`: Ensure unique user-role-org combinations

## Zod Validation Schemas

All tables have corresponding Zod schemas for input validation:
- `insertPermissionSchema`: Validates permission creation
- `insertRoleSchema`: Validates role creation
- `insertRolePermissionSchema`: Validates role-permission assignment
- `insertUserRoleSchema`: Validates user-role assignment

## TypeScript Types

All tables have corresponding TypeScript types:
- `Permission`, `InsertPermission`: Permission entity types
- `Role`, `InsertRole`: Role entity types
- `RolePermission`, `InsertRolePermission`: Role-permission junction types
- `UserRole`, `InsertUserRole`: User-role junction types

## Next Steps

After this schema is implemented:
1. **Task 1.2**: Write property test for RBAC schema (organization isolation)
2. **Task 1.3**: Implement permission checking middleware
3. **Task 1.4**: Write unit tests for permission middleware
4. **Task 1.5**: Add RBAC to all existing API routes
5. **Task 1.6**: Create role management API endpoints
6. **Task 1.7**: Write integration tests for RBAC

## Migration Notes

To apply this schema:
1. Run the migration SQL in `docs/migrations/001-rbac-schema.sql`
2. Seed default permissions (included in migration)
3. Create default roles for each existing organization
4. Assign existing users to appropriate roles based on their current `organization_members.role`

## References

- **Requirements**: 83.1, 83.2, 83.4, 83.5, 83.6, 83.7
- **Design Document**: `.kiro/specs/ubos/design.md`
- **Tasks**: `.kiro/specs/ubos/tasks.md` - Task 1.1
