import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { checkPermission, userHasPermission } from "./permissions";
import { AuthenticatedRequest } from "./auth";
import { db } from "../db";

// Mock the database
const mockInsertValues = vi.fn().mockResolvedValue(undefined);

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}));

describe("Permission Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: Response['status'];
  let jsonMock: Response['json'];

  const createResponseMocks = () => {
    const json = vi.fn() as unknown as Response['json'];
    const status = vi.fn().mockReturnValue({ json }) as unknown as Response['status'];
    return { status, json };
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock response
    const resp = createResponseMocks();
    statusMock = resp.status;
    jsonMock = resp.json;

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

    // Ensure db.insert is always available after clears
    (db as any).insert = vi.fn(() => ({ values: mockInsertValues }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkPermission middleware", () => {
    describe("Permission Granted Scenarios", () => {
      it("should call next() when user has the required permission", async () => {
        // Mock database responses for a user with permission
        (db.select as any) = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { hasPermission: true, organizationId: "org-123" },
              ]),
            }),
          }),
        });

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
        (db.select as any) = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { hasPermission: true, organizationId: "org-123" },
              ]),
            }),
          }),
        });

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
        (db.select as any) = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { hasPermission: true, organizationId: "org-123" },
              ]),
            }),
          }),
        });

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
        (db.select as any) = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { hasPermission: false, organizationId: "org-123" },
              ]),
            }),
          }),
        });

        const middleware = checkPermission("clients", "delete");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          code: "PERMISSION_DENIED",
          message: "Access denied",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 403 when user has role but permission doesn't exist", async () => {
        (db.select as any) = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { hasPermission: false, organizationId: "org-123" },
              ]),
            }),
          }),
        });

        const middleware = checkPermission("nonexistent", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          code: "PERMISSION_DENIED",
          message: "Access denied",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 403 when user has wrong permission type for feature", async () => {
        (db.select as any) = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { hasPermission: false, organizationId: "org-123" },
              ]),
            }),
          }),
        });

        const middleware = checkPermission("projects", "edit");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          code: "PERMISSION_DENIED",
          message: "Access denied",
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe("Missing Role Scenarios", () => {
      it("should return 403 when user has no roles assigned", async () => {
        const mockSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        (db.select as any) = mockSelect;

        const middleware = checkPermission("clients", "view");
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Access denied",
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
          code: "AUTH_REQUIRED",
          message: "Authentication required",
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
          code: "AUTH_REQUIRED",
          message: "Authentication required",
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
          code: "INTERNAL_ERROR",
          message: "Internal server error",
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
      const firstLimit = vi.fn().mockResolvedValue([
        { hasPermission: true, organizationId: "org-123" },
      ]);
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: firstLimit }),
        }),
      });

      const viewMiddleware = checkPermission("clients", "view");
      await viewMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset for second check: recreate mocks so we keep expectations isolated
      (db as any).insert = vi.fn(() => ({ values: mockInsertValues }));
      jsonMock = vi.fn() as unknown as Response['json'];
      statusMock = vi.fn().mockReturnValue({ json: jsonMock }) as unknown as Response['status'];
      mockResponse = {
        status: statusMock as any,
        json: jsonMock as any,
      } as unknown as Response;
      mockNext = vi.fn();

      // Second check: no permission
      const secondLimit = vi.fn().mockResolvedValue([
        { hasPermission: false, organizationId: "org-123" },
      ]);
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: secondLimit }),
        }),
      });

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
