// AI-META-BEGIN
// AI-META: Property-based tests for input validation
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, fast-check
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Property-Based Tests for Input Validation
 * 
 * Feature: client-companies-crud-api
 * Property 7: Input Validation
 * Validates: Requirements 3.2, 3.3, 4.2, 4.3, 8.1, 8.2
 * 
 * This test validates that for any API endpoint that accepts input,
 * invalid data SHALL be rejected with a 400 error containing specific
 * field-level validation error messages from the Zod schema.
 * 
 * The test verifies:
 * - POST /api/clients rejects invalid input with 400 status
 * - PUT /api/clients/:id rejects invalid input with 400 status
 * - Validation errors include field-level details
 * - Missing required fields are caught
 * - Invalid field types are caught
 * - Field length constraints are enforced
 * - All validation errors are reported, not just the first one
 * 
 * Note: These tests validate the validation logic using Zod schemas
 * to simulate the API endpoint behavior without requiring a live
 * database connection.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { z } from 'zod';
import { insertClientCompanySchema } from '@shared/schema';
import { updateClientCompanySchema } from '@shared/client-schemas';

/**
 * Simulates the API endpoint's validation behavior
 * Returns validation result with status code and error details
 */
interface ValidationResult {
  success: boolean;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
  data?: any;
}

/**
 * Simulates POST /api/clients validation
 */
function validateCreateRequest(requestBody: any): ValidationResult {
  const validation = insertClientCompanySchema.safeParse(requestBody);
  
  if (!validation.success) {
    const errors = validation.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return {
      success: false,
      statusCode: 400,
      errors,
    };
  }
  
  return {
    success: true,
    statusCode: 201,
    data: validation.data,
  };
}

/**
 * Simulates PUT /api/clients/:id validation
 */
function validateUpdateRequest(requestBody: any): ValidationResult {
  const validation = updateClientCompanySchema.safeParse(requestBody);
  
  if (!validation.success) {
    const errors = validation.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return {
      success: false,
      statusCode: 400,
      errors,
    };
  }
  
  return {
    success: true,
    statusCode: 200,
    data: validation.data,
  };
}

describe('Client Companies API - Input Validation Property Tests', () => {
  // Feature: client-companies-crud-api, Property 7: Input Validation
  describe('POST /api/clients - Create Validation', () => {
    it('should reject requests with missing required name field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            website: fc.option(fc.webUrl(), { nil: undefined }),
            industry: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
            city: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          }),
          async (requestBody) => {
            // Property: Request without name field is rejected with 400
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
            
            // Property: Error includes field-level detail for 'name'
            const nameError = result.errors!.find(e => e.field === 'name');
            expect(nameError).toBeDefined();
            expect(nameError!.message).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with invalid field types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // name as number
            fc.record({
              organizationId: fc.uuid(),
              name: fc.integer(),
            }),
            // name as boolean
            fc.record({
              organizationId: fc.uuid(),
              name: fc.boolean(),
            }),
            // name as array
            fc.record({
              organizationId: fc.uuid(),
              name: fc.array(fc.string()),
            }),
            // name as object
            fc.record({
              organizationId: fc.uuid(),
              name: fc.record({ value: fc.string() }),
            })
          ),
          async (requestBody) => {
            // Property: Invalid type is rejected with 400
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
            
            // Property: Error message indicates type mismatch
            const nameError = result.errors!.find(e => e.field === 'name');
            expect(nameError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with name exceeding max length', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            name: fc.string({ minLength: 256, maxLength: 500 }), // Exceeds 255 limit
          }),
          async (requestBody) => {
            // Property: Name exceeding 255 chars is rejected with 400
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            
            // Property: Error indicates length constraint violation
            const nameError = result.errors!.find(e => e.field === 'name');
            expect(nameError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with industry exceeding max length', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            industry: fc.string({ minLength: 101, maxLength: 200 }), // Exceeds 100 limit
          }),
          async (requestBody) => {
            // Property: Industry exceeding 100 chars is rejected with 400
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            
            // Property: Error indicates length constraint violation
            const industryError = result.errors!.find(e => e.field === 'industry');
            expect(industryError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with multiple validation errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            // Missing name (required)
            industry: fc.string({ minLength: 101, maxLength: 200 }), // Too long
            city: fc.string({ minLength: 101, maxLength: 200 }), // Too long
          }),
          async (requestBody) => {
            // Property: Multiple errors are all reported
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            
            // Property: At least 2 errors (missing name + at least one length violation)
            expect(result.errors!.length).toBeGreaterThanOrEqual(2);
            
            // Property: Each error has field and message
            result.errors!.forEach(error => {
              expect(error.field).toBeTruthy();
              expect(error.message).toBeTruthy();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid requests with all constraints satisfied', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 255 }),
            website: fc.option(fc.webUrl(), { nil: null }),
            industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            address: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
            city: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            state: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            zipCode: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
            country: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
          }),
          async (requestBody) => {
            // Property: Valid data is accepted
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(201);
            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide field-level error details for all invalid fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            name: fc.integer(), // Invalid type
            industry: fc.string({ minLength: 101, maxLength: 200 }), // Too long
            city: fc.boolean(), // Invalid type
          }),
          async (requestBody) => {
            // Property: Each invalid field has an error entry
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            
            // Property: Errors are structured with field and message
            result.errors!.forEach(error => {
              expect(error).toHaveProperty('field');
              expect(error).toHaveProperty('message');
              expect(typeof error.field).toBe('string');
              expect(typeof error.message).toBe('string');
              expect(error.field.length).toBeGreaterThan(0);
              expect(error.message.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PUT /api/clients/:id - Update Validation', () => {
    it('should reject requests with invalid field types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // name as number
            fc.record({
              name: fc.integer(),
            }),
            // industry as boolean
            fc.record({
              industry: fc.boolean(),
            }),
            // city as array
            fc.record({
              city: fc.array(fc.string()),
            })
          ),
          async (requestBody) => {
            // Property: Invalid type is rejected with 400
            const result = validateUpdateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with fields exceeding max length', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.record({
              name: fc.string({ minLength: 256, maxLength: 500 }), // Exceeds 255
            }),
            fc.record({
              industry: fc.string({ minLength: 101, maxLength: 200 }), // Exceeds 100
            }),
            fc.record({
              city: fc.string({ minLength: 101, maxLength: 200 }), // Exceeds 100
            }),
            fc.record({
              state: fc.string({ minLength: 101, maxLength: 200 }), // Exceeds 100
            }),
            fc.record({
              zipCode: fc.string({ minLength: 21, maxLength: 50 }), // Exceeds 20
            }),
            fc.record({
              country: fc.string({ minLength: 101, maxLength: 200 }), // Exceeds 100
            })
          ),
          async (requestBody) => {
            // Property: Length constraint violation is rejected with 400
            const result = validateUpdateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
            
            // Property: Error indicates which field violated constraint
            const fieldName = Object.keys(requestBody)[0];
            const fieldError = result.errors!.find(e => e.field === fieldName);
            expect(fieldError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid partial updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: undefined }),
            website: fc.option(fc.webUrl(), { nil: null }),
            industry: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            city: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            state: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            zipCode: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
            country: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
          }),
          async (requestBody) => {
            // Property: Valid partial update is accepted
            const result = validateUpdateRequest(requestBody);
            
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept empty update request (all fields optional)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant({}),
          async (requestBody) => {
            // Property: Empty update is valid (all fields optional)
            const result = validateUpdateRequest(requestBody);
            
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.errors).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject update with multiple validation errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 256, maxLength: 500 }), // Too long
            industry: fc.integer(), // Invalid type
            city: fc.string({ minLength: 101, maxLength: 200 }), // Too long
          }),
          async (requestBody) => {
            // Property: Multiple errors are all reported
            const result = validateUpdateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.errors).toBeDefined();
            
            // Property: At least 3 errors (one for each invalid field)
            expect(result.errors!.length).toBeGreaterThanOrEqual(3);
            
            // Property: Each error has field and message
            result.errors!.forEach(error => {
              expect(error.field).toBeTruthy();
              expect(error.message).toBeTruthy();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide descriptive error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.oneof(
              fc.integer(),
              fc.boolean(),
              fc.constant(null),
              fc.constant(undefined),
              fc.array(fc.string())
            ),
          }),
          async (requestBody) => {
            // Property: Error messages are descriptive
            const result = validateUpdateRequest(requestBody);
            
            if (!result.success) {
              expect(result.errors).toBeDefined();
              expect(result.errors!.length).toBeGreaterThan(0);
              
              // Property: Error message is not empty and provides context
              result.errors!.forEach(error => {
                expect(error.message.length).toBeGreaterThan(0);
                // Common Zod error message patterns
                const hasValidMessage = 
                  error.message.includes('Expected') ||
                  error.message.includes('Invalid') ||
                  error.message.includes('Required') ||
                  error.message.includes('String must contain');
                expect(hasValidMessage).toBe(true);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-Endpoint Validation Consistency', () => {
    it('should apply same validation rules for shared fields across POST and PUT', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 256, maxLength: 500 }), // Exceeds limit
            industry: fc.string({ minLength: 101, maxLength: 200 }), // Exceeds limit
          }),
          async (requestBody) => {
            // Property: Same invalid data is rejected by both endpoints
            const createResult = validateCreateRequest({
              organizationId: 'org-1',
              ...requestBody,
            });
            const updateResult = validateUpdateRequest(requestBody);
            
            // Both should fail validation
            expect(createResult.success).toBe(false);
            expect(updateResult.success).toBe(false);
            
            // Both should return 400
            expect(createResult.statusCode).toBe(400);
            expect(updateResult.statusCode).toBe(400);
            
            // Both should have errors for the same fields
            expect(createResult.errors).toBeDefined();
            expect(updateResult.errors).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate all fields consistently regardless of order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }),
            industry: fc.string({ maxLength: 100 }),
            city: fc.string({ maxLength: 100 }),
          }),
          async (fields) => {
            // Create different orderings of the same fields
            const order1 = { organizationId: 'org-1', ...fields };
            const order2 = {
              organizationId: 'org-1',
              city: fields.city,
              name: fields.name,
              industry: fields.industry,
            };
            
            // Property: Field order doesn't affect validation
            const result1 = validateCreateRequest(order1);
            const result2 = validateCreateRequest(order2);
            
            expect(result1.success).toBe(result2.success);
            expect(result1.statusCode).toBe(result2.statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error Response Format', () => {
    it('should always return structured error format with field and message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            organizationId: fc.uuid(),
            name: fc.oneof(
              fc.integer(),
              fc.constant(null),
              fc.string({ minLength: 256, maxLength: 500 })
            ),
          }),
          async (requestBody) => {
            // Property: Error format is consistent
            const result = validateCreateRequest(requestBody);
            
            if (!result.success) {
              expect(result.errors).toBeDefined();
              expect(Array.isArray(result.errors)).toBe(true);
              
              // Property: Each error has required structure
              result.errors!.forEach(error => {
                expect(error).toHaveProperty('field');
                expect(error).toHaveProperty('message');
                expect(typeof error.field).toBe('string');
                expect(typeof error.message).toBe('string');
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 400 status for any validation failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Missing required field
            fc.record({
              organizationId: fc.uuid(),
              website: fc.webUrl(),
            }),
            // Invalid type
            fc.record({
              organizationId: fc.uuid(),
              name: fc.integer(),
            }),
            // Length violation
            fc.record({
              organizationId: fc.uuid(),
              name: fc.string({ minLength: 256, maxLength: 500 }),
            })
          ),
          async (requestBody) => {
            // Property: All validation failures return 400
            const result = validateCreateRequest(requestBody);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
