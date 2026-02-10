import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthenticatedRequest } from "./auth";
import { db } from "../db";
import { userRoles, rolePermissions, permissions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Permission checking middleware for RBAC enforcement
 * 
 * This middleware checks if the authenticated user has the required permission
 * to perform an action on a specific feature area.
 * 
 * @param featureArea - The feature area being accessed (e.g., 'clients', 'projects', 'invoices')
 * @param action - The action being performed (e.g., 'view', 'create', 'edit', 'delete', 'export')
 * @returns Express middleware function
 * 
 * @example
 * router.get('/api/clients', requireAuth, checkPermission('clients', 'view'), listClients);
 * router.post('/api/clients', requireAuth, checkPermission('clients', 'create'), createClient);
 */
export function checkPermission(
  featureArea: string,
  action: string
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.claims.sub;

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Get the user's organization from session or request context
      // For now, we'll get it from the first organization the user belongs to
      const userRoleRecords = await db
        .select({
          roleId: userRoles.roleId,
          organizationId: userRoles.organizationId,
        })
        .from(userRoles)
        .where(eq(userRoles.userId, userId));

      if (!userRoleRecords || userRoleRecords.length === 0) {
        res.status(403).json({ 
          message: "Forbidden: No roles assigned",
          details: "User has no roles assigned in any organization"
        });
        return;
      }

      // Get all role IDs for the user
      const roleIds = userRoleRecords.map((r) => r.roleId);

      // Query for the specific permission across all user's roles
      const userPermissions = await db
        .select({
          permissionId: permissions.id,
          featureArea: permissions.featureArea,
          permissionType: permissions.permissionType,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(
          and(
            eq(permissions.featureArea, featureArea),
            eq(permissions.permissionType, action as "view" | "create" | "edit" | "delete" | "export")
          )
        );

      // Check if any of the user's roles have this permission
      const hasPermission = userPermissions.some((perm) =>
        roleIds.some((roleId) =>
          userRoleRecords.some(
            (ur) => ur.roleId === roleId
          )
        )
      );

      // Actually check if the permission exists in the role permissions
      const rolePermissionRecords = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.permissionId, userPermissions[0]?.permissionId || ""));

      const hasRolePermission = rolePermissionRecords.some((rp) =>
        roleIds.includes(rp.roleId)
      );

      if (!hasRolePermission) {
        res.status(403).json({
          message: "Forbidden: Insufficient permissions",
          details: `User does not have '${action}' permission for '${featureArea}'`
        });
        return;
      }

      // Permission granted, proceed to next middleware
      next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      res.status(500).json({ 
        message: "Internal server error while checking permissions" 
      });
    }
  };
}

/**
 * Helper function to check if a user has a specific permission
 * Useful for programmatic permission checks outside of middleware
 * 
 * @param userId - The user ID to check
 * @param featureArea - The feature area being accessed
 * @param action - The action being performed
 * @returns Promise<boolean> - True if user has permission, false otherwise
 */
export async function userHasPermission(
  userId: string,
  featureArea: string,
  action: string
): Promise<boolean> {
  try {
    // Get user's roles
    const userRoleRecords = await db
      .select({
        roleId: userRoles.roleId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    if (!userRoleRecords || userRoleRecords.length === 0) {
      return false;
    }

    const roleIds = userRoleRecords.map((r) => r.roleId);

    // Get the permission
    const permissionRecords = await db
      .select()
      .from(permissions)
      .where(
        and(
          eq(permissions.featureArea, featureArea),
          eq(permissions.permissionType, action as "view" | "create" | "edit" | "delete" | "export")
        )
      );

    if (!permissionRecords || permissionRecords.length === 0) {
      return false;
    }

    const permissionId = permissionRecords[0].id;

    // Check if any of the user's roles have this permission
    const rolePermissionRecords = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.permissionId, permissionId));

    return rolePermissionRecords.some((rp) => roleIds.includes(rp.roleId));
  } catch (error) {
    console.error("Error checking user permission:", error);
    return false;
  }
}
