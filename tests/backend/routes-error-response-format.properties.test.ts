/**
 * Property-Based Tests for Error Response Format
 * 
 * Feature: client-companies-crud-api
 * Property 19: Error Response Format
 * 
 * **Validates: Requirements 9.3, 9.4, 10.6**
 * 
 * For any error response, the response SHALL be JSON format containing an "error" field
 * with a descriptive message, and SHALL NOT expose sensitive information such as stack
 * traces or database details.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";
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

// Sensitive patterns that should NEVER appear in error responses
const SENSITIVE_PATTERNS = [
  /stack trace/i,
  /at\s+\w+\s+\([^)]+:\d+:\d+\)/,  // Stack trace line format
  /Error:\s+\w+\s+at/,              // Error with stack
  /node_modules/i,
  /server\//i,                       // Internal paths
  /database/i,
  /postgres/i,
  /sql/i,
  /query/i,
  /connection/i,
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /DATABASE_URL/i,
  /\.env/i,
  /process\.env/i
];

/**
 * Check if response contains any sensitive information
 */
function containsSensitiveInfo(responseBody: any): boolean {
  const responseStr = JSON.stringify(responseBody);
  
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(responseStr)) {
      return true;
    }
  }
  
  return false;
}

describe("Client Companies API - Property 19: Error Response Format", () => {
  let mockRes: MockResponse;

  beforeEach(() => {
    mockRes = new MockResponse();
  });

  it("should return JSON format with error field for all error responses", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: "validation" },
          { type: "notFound" },
          { type: "conflict" },
          { type: "server" }
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

          // Must have error field
          expect(res.body).toHaveProperty("error");
          expect(typeof res.body.error).toBe("string");
          expect(res.body.error.length).toBeGreaterThan(0);
          
          // Error message should be descriptive but not expose internals
          expect(res.body.error).not.toContain("undefined");
          expect(res.body.error).not.toContain("null");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never expose stack traces in error responses", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(new Error("Test error with stack")),
          fc.constant(new TypeError("Type error")),
          fc.constant(new ReferenceError("Reference error"))
        ),
        async (error) => {
          const res = new MockResponse();
          
          handleServerError(res as any, error, {
            operation: "test",
            userId: "test-user",
            orgId: "test-org"
          });

          // Should not contain stack trace patterns
          const responseStr = JSON.stringify(res.body);
          expect(responseStr).not.toMatch(/at\s+\w+\s+\([^)]+:\d+:\d+\)/);
          expect(responseStr).not.toMatch(/Error:\s+\w+\s+at/);
          expect(responseStr).not.toContain("stack");
          expect(responseStr).not.toContain("Stack");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never expose database details in error responses", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(new Error("postgres connection failed")),
          fc.constant(new Error("SQL query error")),
          fc.constant(new Error("database timeout"))
        ),
        async (error) => {
          const res = new MockResponse();
          
          handleServerError(res as any, error, {
            operation: "test",
            userId: "test-user",
            orgId: "test-org"
          });

          // Should not contain database-related terms
          const responseStr = JSON.stringify(res.body).toLowerCase();
          expect(responseStr).not.toContain("postgres");
          expect(responseStr).not.toContain("sql");
          expect(responseStr).not.toContain("query");
          expect(responseStr).not.toContain("database");
          expect(responseStr).not.toContain("connection");
          expect(responseStr).not.toContain("table");
          expect(responseStr).not.toContain("column");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never expose internal paths or file names in error responses", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(new Error("Error in server/routes.ts")),
          fc.constant(new Error("Failed at node_modules/package/index.js")),
          fc.constant(new Error("Error in dist/index.cjs"))
        ),
        async (error) => {
          const res = new MockResponse();
          
          handleServerError(res as any, error, {
            operation: "test",
            userId: "test-user",
            orgId: "test-org"
          });

          // Should not contain internal paths
          const responseStr = JSON.stringify(res.body);
          expect(responseStr).not.toContain("node_modules");
          expect(responseStr).not.toContain("server/");
          expect(responseStr).not.toContain("dist/");
          expect(responseStr).not.toContain(".ts");
          expect(responseStr).not.toContain(".js");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never expose sensitive credentials in error responses", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: "validation" },
          { type: "notFound" },
          { type: "server" }
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

            case "server":
              handleServerError(res as any, new Error("Test error"), {
                operation: "test",
                userId: "test-user",
                orgId: "test-org"
              });
              break;
          }

          // Should not contain sensitive credential terms
          const responseStr = JSON.stringify(res.body).toLowerCase();
          expect(responseStr).not.toContain("password");
          expect(responseStr).not.toContain("secret");
          expect(responseStr).not.toContain("token");
          expect(responseStr).not.toContain("api_key");
          expect(responseStr).not.toContain("apikey");
          expect(responseStr).not.toContain("database_url");
          expect(responseStr).not.toContain(".env");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should have consistent error format across all endpoints", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: "validation" },
          { type: "notFound" },
          { type: "conflict" },
          { type: "server" }
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

          // All error responses must have consistent structure
          expect(res.body).toHaveProperty("error");
          expect(typeof res.body.error).toBe("string");
          
          // Error field should be a non-empty string
          expect(res.body.error.length).toBeGreaterThan(0);
          
          // Should not have unexpected fields that might leak info
          const allowedFields = ["error", "details", "dependencies"];
          const actualFields = Object.keys(res.body);
          
          for (const field of actualFields) {
            expect(allowedFields).toContain(field);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should provide descriptive error messages without exposing internals", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(""),
            fc.integer()
          )
        }),
        async (invalidData) => {
          const res = new MockResponse();
          const validation = insertClientCompanySchema.safeParse(invalidData);
          
          if (!validation.success) {
            handleValidationError(res as any, validation.error, {
              operation: "test",
              userId: "test-user",
              orgId: "test-org"
            });

            // Error message should be descriptive
            expect(res.body.error).toBeTruthy();
            expect(typeof res.body.error).toBe("string");
            
            // Should contain helpful information
            expect(res.body.error.length).toBeGreaterThan(5);
            
            // But should not expose sensitive information
            expect(containsSensitiveInfo(res.body)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should include validation details without exposing internals", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.oneof(
            fc.constant(undefined),
            fc.integer(),
            fc.array(fc.string())
          ),
          website: fc.oneof(
            fc.integer(),
            fc.boolean()
          )
        }),
        async (invalidData) => {
          const res = new MockResponse();
          const validation = insertClientCompanySchema.safeParse(invalidData);
          
          if (!validation.success) {
            handleValidationError(res as any, validation.error, {
              operation: "test",
              userId: "test-user",
              orgId: "test-org"
            });

            // Should have validation details
            if (res.body.details) {
              expect(Array.isArray(res.body.details)).toBe(true);
              
              for (const detail of res.body.details) {
                // Each detail should have field and message
                expect(detail).toHaveProperty("field");
                expect(detail).toHaveProperty("message");
                expect(typeof detail.field).toBe("string");
                expect(typeof detail.message).toBe("string");
                
                // Should not expose internals
                expect(detail.message).not.toContain("stack");
                expect(detail.message).not.toContain("database");
                expect(detail.message).not.toContain("server/");
              }
            }
            
            // Overall response should not contain sensitive info
            expect(containsSensitiveInfo(res.body)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should include dependency details in conflict errors without exposing internals", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contacts: fc.integer({ min: 1, max: 100 }),
          deals: fc.integer({ min: 0, max: 50 }),
          engagements: fc.integer({ min: 0, max: 30 })
        }),
        async (dependencies) => {
          const res = new MockResponse();
          
          handleDependencyError(
            res as any,
            "Cannot delete client with existing dependencies",
            dependencies,
            {
              operation: "test",
              userId: "test-user",
              orgId: "test-org",
              resourceId: "123"
            }
          );

          // Should have dependency details
          expect(res.statusCode).toBe(409);
          expect(res.body).toHaveProperty("error");
          expect(res.body).toHaveProperty("dependencies");
          
          // Dependencies should be an object with counts
          expect(typeof res.body.dependencies).toBe("object");
          expect(res.body.dependencies.contacts).toBeGreaterThan(0);
          
          // Should not expose internals
          expect(containsSensitiveInfo(res.body)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
