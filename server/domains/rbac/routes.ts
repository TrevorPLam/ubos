import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import {
  requireAuth,
  getUserIdFromRequest,
  getOrCreateOrg,
} from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";
import { insertRoleSchema, insertUserRoleSchema } from "@shared/schema";
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
  checkPermission("roles", "view"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);

      const roles = await storage.getRoles(orgId);

      res.json({ data: roles });
    } catch (error) {
      console.error("Error listing roles:", error);
      res.status(500).json({ message: "Failed to list roles" });
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
          errors: validation.error.errors,
        });
      }

      const role = await storage.createRole(validation.data);

      res.status(201).json({ data: role });
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
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
  checkPermission("roles", "edit"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { id } = req.params;

      // Check if role exists and belongs to org
      const existingRole = await storage.getRole(id, orgId);
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Prevent editing default roles' core properties
      if (existingRole.isDefault && (req.body.name || req.body.isDefault !== undefined)) {
        return res.status(400).json({
          message: "Cannot modify name or default status of system roles",
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
          errors: validation.error.errors,
        });
      }

      const { permissionIds, ...roleData } = validation.data;

      // Update role basic info
      const updatedRole = await storage.updateRole(id, orgId, roleData);

      // Update permissions if provided
      if (permissionIds) {
        await storage.assignPermissionsToRole(id, permissionIds);
      }

      // Fetch updated role with permissions
      const roleWithPermissions = await storage.getRoleWithPermissions(
        id,
        orgId
      );

      res.json({ data: roleWithPermissions });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
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
  checkPermission("roles", "delete"),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const { id } = req.params;

      // Check if role exists and belongs to org
      const existingRole = await storage.getRole(id, orgId);
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Prevent deleting default roles
      if (existingRole.isDefault) {
        return res.status(400).json({
          message: "Cannot delete system default roles",
        });
      }

      const deleted = await storage.deleteRole(id, orgId);

      if (!deleted) {
        return res.status(400).json({
          message: "Cannot delete role that is assigned to users",
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
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
  checkPermission("roles", "view"),
  async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getPermissions();

      res.json({ data: permissions });
    } catch (error) {
      console.error("Error listing permissions:", error);
      res.status(500).json({ message: "Failed to list permissions" });
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
          errors: validation.error.errors,
        });
      }

      const { roleId } = validation.data;

      // Verify role exists and belongs to org
      const role = await storage.getRole(roleId, orgId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Assign role to user
      const userRole = await storage.assignRoleToUser({
        userId: targetUserId,
        roleId,
        organizationId: orgId,
        assignedById: userId,
      });

      res.status(201).json({ data: userRole });
    } catch (error) {
      console.error("Error assigning role to user:", error);
      res.status(500).json({ message: "Failed to assign role to user" });
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
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing role from user:", error);
      res.status(500).json({ message: "Failed to remove role from user" });
    }
  }
);
