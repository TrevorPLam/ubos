import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { checkPermission, userHasPermission } from "./permissions";
import { AuthenticatedRequest } from "./auth";
import { db } from "../db";

// Mock the database
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("Permission Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock response
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      user: {
        claims: {
          sub: "user-123",
        },
      },
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkPermission middleware", () => {
    describe("Permission Granted Scenarios", () => {
      it("should call next() when user has the required permission", async () => {
        // Mock database responses for a user with permission
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();
        const mockInnerJoin = vi.fn();

        // First query: get user roles
        mockWhere.mockResolvedValueOnce([
          { roleId: "role-admin", organizationId: "org-123" },
        ]);

        // Second query: get permissions
        mockWhere.mockResolvedValueOnce([
          {
            permissionId: "perm-123",
            featureArea: "clients",
            permissionType: "view",
          },
        ]);

        // Third query: get role permissions
        mockWhere.mockResolvedValueOnce([
          { roleId: "role-admin", permissionId: "perm-123" },
        ]);

        mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
        mockInnerJoin.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(statusMock).not.toHaveBeenCalled();
      });

      it("should grant access when user has multiple roles with the permission", async () => {
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();
        const mockInnerJoin = vi.fn();

        // User has multiple roles
        mockWhere.mockResolvedValueOnce([
          { roleId: "role-admin", organizationId: "org-123" },
          { roleId: "role-manager", organizationId: "org-123" },
        ]);

        // Permission exists
        mockWhere.mockResolvedValueOnce([
          {
            permissionId: "perm-123",
            featureArea: "projects",
            permissionType: "edit",
          },
        ]);

        // One of the roles has the permission
        mockWhere.mockResolvedValueOnce([
          { roleId: "role-manager", permissionId: "perm-123" },
        ]);

        mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
        mockInnerJoin.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("projects", "edit");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(statusMock).not.toHaveBeenCalled();
      });

      it("should grant access for different permission types on same feature", async () => {
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();
        const mockInnerJoin = vi.fn();

        mockWhere.mockResolvedValueOnce([
          { roleId: "role-admin", organizationId: "org-123" },
        ]);

        mockWhere.mockResolvedValueOnce([
          {
            permissionId: "perm-delete",
            featureArea: "invoices",
            permissionType: "delete",
          },
        ]);

        mockWhere.mockResolvedValueOnce([
          { roleId: "role-admin", permissionId: "perm-delete" },
        ]);

        mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
        mockInnerJoin.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("invoices", "delete");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe("Permission Denied Scenarios", () => {
      it("should return 403 when user lacks the required permission", async () => {
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();
        const mockInnerJoin = vi.fn();

        // User has a role
        mockWhere.mockResolvedValueOnce([
          { roleId: "role-viewer", organizationId: "org-123" },
        ]);

        // Permission exists
        mockWhere.mockResolvedValueOnce([
          {
            permissionId: "perm-delete",
            featureArea: "clients",
            permissionType: "delete",
          },
        ]);

        // But user's role doesn't have this permission
        mockWhere.mockResolvedValueOnce([]);

        mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
        mockInnerJoin.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("clients", "delete");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          message: "Forbidden: Insufficient permissions",
          details: "User does not have 'delete' permission for 'clients'",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 403 when user has role but permission doesn't exist", async () => {
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();
        const mockInnerJoin = vi.fn();

        mockWhere.mockResolvedValueOnce([
          { roleId: "role-admin", organizationId: "org-123" },
        ]);

        // Permission doesn't exist in the system
        mockWhere.mockResolvedValueOnce([]);

        // No role permissions to check
        mockWhere.mockResolvedValueOnce([]);

        mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
        mockInnerJoin.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("nonexistent", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 403 when user has wrong permission type for feature", async () => {
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();
        const mockInnerJoin = vi.fn();

        mockWhere.mockResolvedValueOnce([
          { roleId: "role-viewer", organizationId: "org-123" },
        ]);

        // User has 'view' permission but trying to 'edit'
        mockWhere.mockResolvedValueOnce([
          {
            permissionId: "perm-edit",
            featureArea: "projects",
            permissionType: "edit",
          },
        ]);

        mockWhere.mockResolvedValueOnce([]);

        mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
        mockInnerJoin.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("projects", "edit");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Forbidden: Insufficient permissions",
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Missing Role Scenarios", () => {
      it("should return 403 when user has no roles assigned", async () => {
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();

        // User has no roles
        mockWhere.mockResolvedValueOnce([]);

        mockFrom.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          message: "Forbidden: No roles assigned",
          details: "User has no roles assigned in any organization",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 when user is not authenticated", async () => {
        mockRequest.user = undefined;

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          message: "Unauthorized",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 401 when user claims are missing", async () => {
        mockRequest.user = { claims: { sub: "" } };

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          message: "Unauthorized",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      it("should return 500 when database query fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mockSelect = vi.fn();
        const mockFrom = vi.fn();
        const mockWhere = vi.fn();

        // Simulate database error
        mockWhere.mockRejectedValueOnce(new Error("Database connection failed"));

        mockFrom.mockReturnValue({ where: mockWhere });
        mockSelect.mockReturnValue({ from: mockFrom });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
          message: "Internal server error while checking permissions",
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it("should handle unexpected errors gracefully", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mockSelect = vi.fn();
        mockSelect.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(mockNext).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe("userHasPermission helper function", () => {
    it("should return true when user has permission", async () => {
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();

      // User has roles
      mockWhere.mockResolvedValueOnce([{ roleId: "role-admin" }]);

      // Permission exists
      mockWhere.mockResolvedValueOnce([
        {
          id: "perm-123",
          featureArea: "clients",
          permissionType: "view",
        },
      ]);

      // Role has permission
      mockWhere.mockResolvedValueOnce([
        { roleId: "role-admin", permissionId: "perm-123" },
      ]);

      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await userHasPermission("user-123", "clients", "view");

      expect(result).toBe(true);
    });

    it("should return false when user has no roles", async () => {
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();

      mockWhere.mockResolvedValueOnce([]);

      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await userHasPermission("user-123", "clients", "view");

      expect(result).toBe(false);
    });

    it("should return false when permission doesn't exist", async () => {
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();

      mockWhere.mockResolvedValueOnce([{ roleId: "role-admin" }]);
      mockWhere.mockResolvedValueOnce([]);

      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await userHasPermission("user-123", "nonexistent", "view");

      expect(result).toBe(false);
    });

    it("should return false when role doesn't have permission", async () => {
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();

      mockWhere.mockResolvedValueOnce([{ roleId: "role-viewer" }]);
      mockWhere.mockResolvedValueOnce([
        {
          id: "perm-delete",
          featureArea: "clients",
          permissionType: "delete",
        },
      ]);
      mockWhere.mockResolvedValueOnce([]);

      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await userHasPermission("user-123", "clients", "delete");

      expect(result).toBe(false);
    });

    it("should return false and log error when database fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();

      mockWhere.mockRejectedValueOnce(new Error("Database error"));

      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const result = await userHasPermission("user-123", "clients", "view");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error checking user permission:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle multiple permission checks for same user", async () => {
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();
      const mockInnerJoin = vi.fn();

      // Setup for first permission check (view)
      mockWhere.mockResolvedValueOnce([
        { roleId: "role-admin", organizationId: "org-123" },
      ]);
      mockWhere.mockResolvedValueOnce([
        {
          permissionId: "perm-view",
          featureArea: "clients",
          permissionType: "view",
        },
      ]);
      mockWhere.mockResolvedValueOnce([
        { roleId: "role-admin", permissionId: "perm-view" },
      ]);

      mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
      mockInnerJoin.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const viewMiddleware = checkPermission("clients", "view");
      await viewMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset for second check
      vi.clearAllMocks();

      // Setup for second permission check (edit) - should fail
      mockWhere.mockResolvedValueOnce([
        { roleId: "role-admin", organizationId: "org-123" },
      ]);
      mockWhere.mockResolvedValueOnce([
        {
          permissionId: "perm-edit",
          featureArea: "clients",
          permissionType: "edit",
        },
      ]);
      mockWhere.mockResolvedValueOnce([]);

      mockFrom.mockReturnValue({ where: mockWhere, innerJoin: mockInnerJoin });
      mockInnerJoin.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      (db.select as any) = mockSelect;

      const editMiddleware = checkPermission("clients", "edit");
      await editMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
