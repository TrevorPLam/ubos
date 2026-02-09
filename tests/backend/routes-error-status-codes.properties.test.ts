/**
 * Property-Based Tests for Error Status Codes
 * 
 * Feature: client-companies-crud-api
 * Property 18: Error Status Codes
 * 
 * **Validates: Requirements 9.2**
 * 
 * For any error condition, the API SHALL return the appropriate HTTP status code:
 * - 400 for validation errors
 * - 404 for not found
 * - 409 for conflicts
 * - 500 for server errors
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";
import { ZodError } from "zod";
import { insertClientCompanySchema } from "@shared/schema";
import {
  formatZodErrors,
  handleValidationError,
  handleNotFoundError,
  handleDependencyError,
  handleServerError
} from "../../server/domains/crm/error-handlers";

// Mock the logger to suppress console output during tests
vi.mock("../../server/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Mock Response object for testing error handlers
 */
class MockResponse {
  public statusCode: number = 200;
  public body: any = null;
  public sent: boolean = false;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(data: any): this {
    this.body = data;
    this.sent = true;
    return this;
  }

  send(): this {
    this.sent = true;
    return this;
  }
}

describe("Client Companies API - Property 18: Error Status Codes", () => {
  let mockRes: MockResponse;

  beforeEach(() => {
    mockRes = new MockResponse();
  });

  it("should return 400 for validation errors", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate invalid data that will fail validation
          name: fc.oneof(
            fc.constant(undefined),  // Missing required field
            fc.constant(null),       // Null value
            fc.constant(""),         // Empty string
            fc.integer(),            // Wrong type
            fc.array(fc.string())    // Wrong type
          )
        }),
        async (invalidData) => {
          // Validate with schema
          const validation = insertClientCompanySchema.safeParse(invalidData);
          
          if (!validation.success) {
            // Use error handler
            handleValidationError(mockRes as any, validation.error, {
              operation: "create_client",
              userId: "test-user",
              orgId: "test-org"
            });

            // Should return 400 for validation errors
            expect(mockRes.statusCode).toBe(400);
            expect(mockRes.body).toHaveProperty("error");
            expect(mockRes.body.error).toContain("Validation");
            expect(mockRes.body).toHaveProperty("details");
            expect(Array.isArray(mockRes.body.details)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 404 for not found errors", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom("Client", "Contact", "Deal"),
        async (resourceId, resourceType) => {
          // Use error handler
          handleNotFoundError(mockRes as any, resourceType, {
            operation: "get_resource",
            userId: "test-user",
            orgId: "test-org",
            resourceId
          });

          // Should return 404 for not found
          expect(mockRes.statusCode).toBe(404);
          expect(mockRes.body).toHaveProperty("error");
          expect(mockRes.body.error).toContain("not found");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 409 for conflict/dependency errors", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contacts: fc.integer({ min: 1, max: 100 }),
          deals: fc.integer({ min: 0, max: 50 }),
          engagements: fc.integer({ min: 0, max: 30 })
        }),
        async (dependencies) => {
          // Use error handler
          handleDependencyError(
            mockRes as any,
            "Cannot delete client with existing dependencies",
            dependencies,
            {
              operation: "delete_client",
              userId: "test-user",
              orgId: "test-org",
              resourceId: "client-123"
            }
          );

          // Should return 409 for conflict
          expect(mockRes.statusCode).toBe(409);
          expect(mockRes.body).toHaveProperty("error");
          expect(mockRes.body.error).toContain("dependencies");
          expect(mockRes.body).toHaveProperty("dependencies");
          expect(mockRes.body.dependencies).toEqual(dependencies);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 500 for server errors", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(new Error("Database connection failed")),
          fc.constant(new Error("Unexpected error")),
          fc.constant(new TypeError("Cannot read property of undefined")),
          fc.constant("String error")
        ),
        async (error) => {
          // Use error handler
          handleServerError(mockRes as any, error, {
            operation: "some_operation",
            userId: "test-user",
            orgId: "test-org"
          });

          // Should return 500 for server errors
          expect(mockRes.statusCode).toBe(500);
          expect(mockRes.body).toHaveProperty("error");
          expect(mockRes.body.error).toBe("An unexpected error occurred");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should format Zod errors correctly", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.oneof(fc.constant(undefined), fc.integer()),
          website: fc.oneof(fc.integer(), fc.boolean()),
          industry: fc.array(fc.string())
        }),
        async (invalidData) => {
          const validation = insertClientCompanySchema.safeParse(invalidData);
          
          if (!validation.success) {
            const formatted = formatZodErrors(validation.error);
            
            // Should return array of field/message pairs
            expect(Array.isArray(formatted)).toBe(true);
            expect(formatted.length).toBeGreaterThan(0);
            
            for (const detail of formatted) {
              expect(detail).toHaveProperty("field");
              expect(detail).toHaveProperty("message");
              expect(typeof detail.field).toBe("string");
              expect(typeof detail.message).toBe("string");
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always return JSON error responses with error field", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: "validation", handler: "handleValidationError" },
          { type: "notFound", handler: "handleNotFoundError" },
          { type: "conflict", handler: "handleDependencyError" },
          { type: "server", handler: "handleServerError" }
        ),
        async ({ type }) => {
          const res = new MockResponse();

          switch (type) {
            case "validation":
              const validation = insertClientCompanySchema.safeParse({ name: 123 });
              if (!validation.success) {
                handleValidationError(res as any, validation.error, {
                  operation: "test",
                  userId: "test-user",
                  orgId: "test-org"
                });
              }
              break;

            case "notFound":
              handleNotFoundError(res as any, "Client", {
                operation: "test",
                userId: "test-user",
                orgId: "test-org",
                resourceId: "123"
              });
              break;

            case "conflict":
              handleDependencyError(
                res as any,
                "Cannot delete",
                { contacts: 5 },
                {
                  operation: "test",
                  userId: "test-user",
                  orgId: "test-org",
                  resourceId: "123"
                }
              );
              break;

            case "server":
              handleServerError(res as any, new Error("Test error"), {
                operation: "test",
                userId: "test-user",
                orgId: "test-org"
              });
              break;
          }

          // All error responses should have an error field
          expect(res.body).toHaveProperty("error");
          expect(typeof res.body.error).toBe("string");
          expect(res.body.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return appropriate status codes for all error types", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: "validation", expectedStatus: 400 },
          { type: "notFound", expectedStatus: 404 },
          { type: "conflict", expectedStatus: 409 },
          { type: "server", expectedStatus: 500 }
        ),
        async ({ type, expectedStatus }) => {
          const res = new MockResponse();

          switch (type) {
            case "validation":
              const validation = insertClientCompanySchema.safeParse({ name: 123 });
              if (!validation.success) {
                handleValidationError(res as any, validation.error, {
                  operation: "test",
                  userId: "test-user",
                  orgId: "test-org"
                });
              }
              break;

            case "notFound":
              handleNotFoundError(res as any, "Client", {
                operation: "test",
                userId: "test-user",
                orgId: "test-org",
                resourceId: "123"
              });
              break;

            case "conflict":
              handleDependencyError(
                res as any,
                "Cannot delete",
                { contacts: 5 },
                {
                  operation: "test",
                  userId: "test-user",
                  orgId: "test-org",
                  resourceId: "123"
                }
              );
              break;

            case "server":
              handleServerError(res as any, new Error("Test error"), {
                operation: "test",
                userId: "test-user",
                orgId: "test-org"
              });
              break;
          }

          // Verify correct status code
          expect(res.statusCode).toBe(expectedStatus);
          expect(res.body).toHaveProperty("error");
          expect(typeof res.body.error).toBe("string");
        }
      ),
      { numRuns: 100 }
    );
  });
});
