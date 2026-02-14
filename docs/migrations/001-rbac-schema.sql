-- Migration: RBAC Schema
-- Task: 1.1 Create permissions schema and database tables
-- Requirements: 83.1, 83.2, 83.4
-- Description: Adds Role-Based Access Control tables for permissions, roles, and user role assignments

-- Create permission type enum
CREATE TYPE permission_type AS ENUM ('view', 'create', 'edit', 'delete', 'export');

-- Create permissions table
-- Stores available permissions for different feature areas
CREATE TABLE permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_area VARCHAR(100) NOT NULL,
  permission_type permission_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_feature ON permissions(feature_area);
CREATE INDEX idx_permissions_unique ON permissions(feature_area, permission_type);

-- Create roles table
-- Stores roles per organization (supports default and custom roles)
CREATE TABLE roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_roles_org_name ON roles(organization_id, name);

-- Create role_permissions junction table
-- Links roles to their permissions
CREATE TABLE role_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id VARCHAR NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_unique ON role_permissions(role_id, permission_id);

-- Create user_roles junction table
-- Links users to roles within organizations (users can have multiple roles)
CREATE TABLE user_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by_id VARCHAR,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_unique ON user_roles(user_id, role_id, organization_id);

-- Insert default permissions for all feature areas
-- CRM permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('clients', 'view', 'View client companies'),
  ('clients', 'create', 'Create client companies'),
  ('clients', 'edit', 'Edit client companies'),
  ('clients', 'delete', 'Delete client companies'),
  ('clients', 'export', 'Export client data'),
  ('contacts', 'view', 'View contacts'),
  ('contacts', 'create', 'Create contacts'),
  ('contacts', 'edit', 'Edit contacts'),
  ('contacts', 'delete', 'Delete contacts'),
  ('contacts', 'export', 'Export contact data'),
  ('deals', 'view', 'View deals'),
  ('deals', 'create', 'Create deals'),
  ('deals', 'edit', 'Edit deals'),
  ('deals', 'delete', 'Delete deals'),
  ('deals', 'export', 'Export deal data');

-- Proposals & Contracts permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('proposals', 'view', 'View proposals'),
  ('proposals', 'create', 'Create proposals'),
  ('proposals', 'edit', 'Edit proposals'),
  ('proposals', 'delete', 'Delete proposals'),
  ('proposals', 'export', 'Export proposal data'),
  ('contracts', 'view', 'View contracts'),
  ('contracts', 'create', 'Create contracts'),
  ('contracts', 'edit', 'Edit contracts'),
  ('contracts', 'delete', 'Delete contracts'),
  ('contracts', 'export', 'Export contract data');

-- Project Management permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('projects', 'view', 'View projects'),
  ('projects', 'create', 'Create projects'),
  ('projects', 'edit', 'Edit projects'),
  ('projects', 'delete', 'Delete projects'),
  ('projects', 'export', 'Export project data'),
  ('tasks', 'view', 'View tasks'),
  ('tasks', 'create', 'Create tasks'),
  ('tasks', 'edit', 'Edit tasks'),
  ('tasks', 'delete', 'Delete tasks'),
  ('tasks', 'export', 'Export task data');

-- Revenue Management permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('invoices', 'view', 'View invoices'),
  ('invoices', 'create', 'Create invoices'),
  ('invoices', 'edit', 'Edit invoices'),
  ('invoices', 'delete', 'Delete invoices'),
  ('invoices', 'export', 'Export invoice data'),
  ('bills', 'view', 'View bills'),
  ('bills', 'create', 'Create bills'),
  ('bills', 'edit', 'Edit bills'),
  ('bills', 'delete', 'Delete bills'),
  ('bills', 'export', 'Export bill data');

-- Document Management permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('files', 'view', 'View files'),
  ('files', 'create', 'Upload files'),
  ('files', 'edit', 'Edit file metadata'),
  ('files', 'delete', 'Delete files'),
  ('files', 'export', 'Download files');

-- Communication permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('messages', 'view', 'View messages'),
  ('messages', 'create', 'Send messages'),
  ('messages', 'edit', 'Edit messages'),
  ('messages', 'delete', 'Delete messages'),
  ('messages', 'export', 'Export message data');

-- Thread-based Communication permissions (2026 enhancement)
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('threads', 'view', 'View communication threads'),
  ('threads', 'create', 'Create communication threads'),
  ('threads', 'edit', 'Edit communication threads'),
  ('threads', 'delete', 'Delete communication threads'),
  ('threads', 'export', 'Export thread data');

-- Organization Management permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('organizations', 'view', 'View organization details'),
  ('organizations', 'create', 'Create organizations'),
  ('organizations', 'edit', 'Edit organization settings'),
  ('organizations', 'delete', 'Delete organizations'),
  ('organizations', 'export', 'Export organization data');

-- Dashboard Analytics permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('dashboard', 'view', 'View dashboard analytics and stats');

-- Engagement Management permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('engagements', 'view', 'View client engagements'),
  ('engagements', 'create', 'Create client engagements'),
  ('engagements', 'edit', 'Edit client engagements'),
  ('engagements', 'delete', 'Delete client engagements'),
  ('engagements', 'export', 'Export engagement data');

-- Vendor Management permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('vendors', 'view', 'View vendor information'),
  ('vendors', 'create', 'Create vendor records'),
  ('vendors', 'edit', 'Edit vendor information'),
  ('vendors', 'delete', 'Delete vendor records'),
  ('vendors', 'export', 'Export vendor data');

-- Settings & Admin permissions
INSERT INTO permissions (feature_area, permission_type, description) VALUES
  ('settings', 'view', 'View organization settings'),
  ('settings', 'edit', 'Edit organization settings'),
  ('users', 'view', 'View users'),
  ('users', 'create', 'Invite users'),
  ('users', 'edit', 'Edit user roles'),
  ('users', 'delete', 'Remove users'),
  ('roles', 'view', 'View roles'),
  ('roles', 'create', 'Create custom roles'),
  ('roles', 'edit', 'Edit role permissions'),
  ('roles', 'delete', 'Delete custom roles');

-- Note: Default roles (Admin, Manager, Team Member, Client) will be created
-- per organization when the organization is created, with appropriate permissions
-- assigned based on the role type. This will be handled in application code.

-- Default role permission mappings (to be implemented in seed data):
-- 
-- Admin: All permissions
-- Manager: All permissions except user/role management
-- Team Member: View/create/edit on most entities, no delete or export
-- Client: View only on client portal accessible items (files, invoices, messages)
