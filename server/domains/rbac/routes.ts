import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import {
  requireAuth,
  getUserIdFromRequest,
  getOrCreateOrg,
} from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";
import { generalRateLimit, adminRateLimit } from "../../middleware/rateLimit";
import { insertRoleSchema } from "@shared/schema";
import { z } from "zod";

export const rbacRoutes = Router();

// ==================== ROLES ====================

/**
 * GET /api/roles
 * List all roles for the authenticated user's organization
 */
rbacRoutes.get(
  "/api/roles",
  requireAuth,
  generalRateLimit,
  checkPermission("roles", "view"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);

      const roles = await storage.getRoles(orgId);

      res.json({ 
        data: roles,
        meta: {
          count: roles.length,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error listing roles:", error);
      res.status(500).json({ 
        message: "Failed to list roles",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * GET /api/roles/:id
 * Get a single role with its permissions
 */
rbacRoutes.get(
  "/api/roles/:id",
  requireAuth,
  checkPermission("roles", "view"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { id } = req.params;

      const roleWithPermissions = await storage.getRoleWithPermissions(
        id,
        orgId
      );

      if (!roleWithPermissions) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json({ data: roleWithPermissions });
    } catch (error) {
      console.error("Error getting role:", error);
      res.status(500).json({ message: "Failed to get role" });
    }
  }
);

/**
 * POST /api/roles
 * Create a new custom role
 */
rbacRoutes.post(
  "/api/roles",
  requireAuth,
  adminRateLimit,
  checkPermission("roles", "create"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);

      // Validate request body
      const validation = insertRoleSchema.safeParse({
        ...req.body,
        organizationId: orgId,
        isDefault: false, // Custom roles are never default
      });

      if (!validation.success) {
        return res.status(400).json({
          message: "Validation error",
          code: "VALIDATION_ERROR",
          errors: validation.error.errors,
        });
      }

      const role = await storage.createRole(validation.data);

      res.status(201).json({ 
        data: role,
        meta: {
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ 
        message: "Failed to create role",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * PUT /api/roles/:id
 * Update a role's name, description, or permissions
 */
rbacRoutes.put(
  "/api/roles/:id",
  requireAuth,
  adminRateLimit,
  checkPermission("roles", "edit"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { id } = req.params;

      // Check if role exists and belongs to org
      const existingRole = await storage.getRole(id, orgId);
      if (!existingRole) {
        return res.status(404).json({ 
          message: "Role not found",
          code: "NOT_FOUND"
        });
      }

      // Prevent editing default roles' core properties
      if (existingRole.isDefault && (req.body.name || req.body.isDefault !== undefined)) {
        return res.status(400).json({
          message: "Cannot modify name or default status of system roles",
          code: "PROTECTED_ROLE"
        });
      }

      // Validate update data
      const updateSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        permissionIds: z.array(z.string()).optional(),
      });

      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation error",
          code: "VALIDATION_ERROR",
          errors: validation.error.errors,
        });
      }

      const { permissionIds, ...roleData } = validation.data;

      // Update role basic info
      await storage.updateRole(id, orgId, roleData);

      // Update permissions if provided
      if (permissionIds) {
        await storage.assignPermissionsToRole(id, permissionIds);
      }

      // Fetch updated role with permissions
      const roleWithPermissions = await storage.getRoleWithPermissions(
        id,
        orgId
      );

      res.json({ 
        data: roleWithPermissions,
        meta: {
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ 
        message: "Failed to update role",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * DELETE /api/roles/:id
 * Delete a custom role (only if not assigned to any users)
 */
rbacRoutes.delete(
  "/api/roles/:id",
  requireAuth,
  adminRateLimit,
  checkPermission("roles", "delete"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { id } = req.params;

      // Check if role exists and belongs to org
      const existingRole = await storage.getRole(id, orgId);
      if (!existingRole) {
        return res.status(404).json({ 
          message: "Role not found",
          code: "NOT_FOUND"
        });
      }

      // Prevent deleting default roles
      if (existingRole.isDefault) {
        return res.status(400).json({
          message: "Cannot delete system default roles",
          code: "PROTECTED_ROLE"
        });
      }

      const deleted = await storage.deleteRole(id, orgId);

      if (!deleted) {
        return res.status(400).json({
          message: "Cannot delete role that is assigned to users",
          code: "ROLE_IN_USE"
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ 
        message: "Failed to delete role",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

// ==================== PERMISSIONS ====================

/**
 * GET /api/permissions
 * List all available permissions (system-wide)
 */
rbacRoutes.get(
  "/api/permissions",
  requireAuth,
  generalRateLimit,
  checkPermission("roles", "view"),
  async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getPermissions();

      res.json({ 
        data: permissions,
        meta: {
          count: permissions.length,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error listing permissions:", error);
      res.status(500).json({ 
        message: "Failed to list permissions",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

// ==================== USER ROLES ====================

/**
 * GET /api/users/:userId/roles
 * Get all roles assigned to a user
 */
rbacRoutes.get(
  "/api/users/:userId/roles",
  requireAuth,
  checkPermission("roles", "view"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { userId: targetUserId } = req.params;

      const roles = await storage.getUserRoles(targetUserId, orgId);

      res.json({ data: roles });
    } catch (error) {
      console.error("Error getting user roles:", error);
      res.status(500).json({ message: "Failed to get user roles" });
    }
  }
);

/**
 * POST /api/users/:userId/roles
 * Assign a role to a user
 */
rbacRoutes.post(
  "/api/users/:userId/roles",
  requireAuth,
  adminRateLimit,
  checkPermission("roles", "edit"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { userId: targetUserId } = req.params;

      // Validate request body
      const validation = z
        .object({
          roleId: z.string().min(1),
        })
        .safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          message: "Validation error",
          code: "VALIDATION_ERROR",
          errors: validation.error.errors,
        });
      }

      const { roleId } = validation.data;

      // Verify role exists and belongs to org
      const role = await storage.getRole(roleId, orgId);
      if (!role) {
        return res.status(404).json({ 
          message: "Role not found",
          code: "NOT_FOUND"
        });
      }

      // Assign role to user
      const userRole = await storage.assignRoleToUser({
        userId: targetUserId,
        roleId,
        organizationId: orgId,
        assignedById: userId,
      });

      res.status(201).json({ 
        data: userRole,
        meta: {
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error assigning role to user:", error);
      res.status(500).json({ 
        message: "Failed to assign role to user",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * DELETE /api/users/:userId/roles/:roleId
 * Remove a role from a user
 */
rbacRoutes.delete(
  "/api/users/:userId/roles/:roleId",
  requireAuth,
  adminRateLimit,
  checkPermission("roles", "edit"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { userId: targetUserId, roleId } = req.params;

      const removed = await storage.removeRoleFromUser(
        targetUserId,
        roleId,
        orgId
      );

      if (!removed) {
        return res.status(404).json({
          message: "Role assignment not found",
          code: "NOT_FOUND"
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing role from user:", error);
      res.status(500).json({ 
        message: "Failed to remove role from user",
        code: "INTERNAL_ERROR"
      });
    }
  }
);
