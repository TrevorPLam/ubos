/**
 * CRM-specific error handling utilities.
 * 
 * Provides consistent error formatting, logging, and response handling
 * for all CRM API endpoints (client companies, contacts, deals).
 * 
 * Standards Compliance:
 * - OWASP API Security Top 10
 * - SOC2 CC7.1 (System Monitoring)
 * - GDPR Article 32 (Security of Processing)
 * 
 * Requirements:
 * - 8.2: Field-level validation error messages
 * - 9.1: Error logging with context
 * - 9.2: Appropriate HTTP status codes
 * - 9.3: JSON error responses
 * - 9.4: No sensitive information exposure
 * - 10.6: Consistent error format
 */

import { Response } from "express";
import { ZodError } from "zod";
import { logger } from "../../logger";
import { createSafeErrorLog } from "../../security-utils";

/**
 * Validation error detail for a specific field.
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Dependency check result for cascade delete operations.
 */
export interface DependencyDetails {
  contacts?: number;
  deals?: number;
  engagements?: number;
  contracts?: number;
  proposals?: number;
  invoices?: number;
}

/**
 * Error logging context for structured logging.
 */
export interface ErrorContext {
  operation: string;
  userId?: string;
  orgId?: string;
  resourceId?: string;
  [key: string]: any;
}

/**
 * Format Zod validation errors into client-friendly field-level error messages.
 * 
 * Converts Zod's error format into a simple array of field/message pairs
 * that can be easily consumed by frontend applications.
 * 
 * @param error - Zod validation error
 * @returns Array of validation error details
 * 
 * @example
 * ```typescript
 * const validation = schema.safeParse(data);
 * if (!validation.success) {
 *   const details = formatZodErrors(validation.error);
 *   // [{ field: "name", message: "Required" }]
 * }
 * ```
 */
export function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

/**
 * Handle validation errors with 400 Bad Request response.
 * 
 * Formats Zod validation errors and returns a consistent error response
 * with field-level details. Logs the validation failure for monitoring.
 * 
 * @param res - Express response object
 * @param error - Zod validation error
 * @param context - Error context for logging
 * 
 * @example
 * ```typescript
 * const validation = schema.safeParse(req.body);
 * if (!validation.success) {
 *   return handleValidationError(res, validation.error, {
 *     operation: "create_client",
 *     userId,
 *     orgId
 *   });
 * }
 * ```
 */
export function handleValidationError(
  res: Response,
  error: ZodError,
  context: ErrorContext
): Response {
  const details = formatZodErrors(error);
  
  // Log validation failure (without sensitive data)
  logger.warn("Validation failed", {
    source: "crm",
    operation: context.operation,
    userId: context.userId,
    orgId: context.orgId,
    fieldCount: details.length,
    fields: details.map(d => d.field).join(", ")
  });
  
  return res.status(400).json({
    error: "Validation failed",
    details
  });
}

/**
 * Handle not found errors with 404 Not Found response.
 * 
 * Returns a consistent error response for resources that don't exist
 * or don't belong to the user's organization. Uses the same response
 * for both cases to prevent information leakage (security through obscurity).
 * 
 * @param res - Express response object
 * @param resourceType - Type of resource (e.g., "Client", "Contact")
 * @param context - Error context for logging
 * 
 * @example
 * ```typescript
 * const client = await storage.getClientCompany(id, orgId);
 * if (!client) {
 *   return handleNotFoundError(res, "Client", {
 *     operation: "get_client",
 *     userId,
 *     orgId,
 *     resourceId: id
 *   });
 * }
 * ```
 */
export function handleNotFoundError(
  res: Response,
  resourceType: string,
  context: ErrorContext
): Response {
  // Log not found (for monitoring and debugging)
  logger.info(`${resourceType} not found`, {
    source: "crm",
    operation: context.operation,
    userId: context.userId,
    orgId: context.orgId,
    resourceId: context.resourceId
  });
  
  return res.status(404).json({
    error: `${resourceType} not found`
  });
}

/**
 * Handle dependency/conflict errors with 409 Conflict response.
 * 
 * Returns a detailed error response when an operation cannot be completed
 * due to existing dependencies (e.g., cannot delete client with active deals).
 * Includes specific counts of each dependency type to help users understand
 * what needs to be cleaned up.
 * 
 * @param res - Express response object
 * @param message - Error message describing the conflict
 * @param dependencies - Details about dependent entities
 * @param context - Error context for logging
 * 
 * @example
 * ```typescript
 * const deps = await storage.checkClientCompanyDependencies(id, orgId);
 * if (deps.hasDependencies) {
 *   return handleDependencyError(
 *     res,
 *     "Cannot delete client with existing dependencies",
 *     deps.dependencies,
 *     { operation: "delete_client", userId, orgId, resourceId: id }
 *   );
 * }
 * ```
 */
export function handleDependencyError(
  res: Response,
  message: string,
  dependencies: DependencyDetails,
  context: ErrorContext
): Response {
  // Log dependency conflict
  logger.info("Dependency conflict", {
    source: "crm",
    operation: context.operation,
    userId: context.userId,
    orgId: context.orgId,
    resourceId: context.resourceId,
    dependencies
  });
  
  return res.status(409).json({
    error: message,
    dependencies
  });
}

/**
 * Handle unexpected server errors with 500 Internal Server Error response.
 * 
 * Logs the full error details server-side for debugging while returning
 * a generic error message to the client to avoid exposing sensitive
 * information (stack traces, database details, internal paths).
 * 
 * SECURITY: Never expose error.stack, error.message, or internal details
 * to clients in production. All sensitive data is logged server-side only.
 * 
 * @param res - Express response object
 * @param error - The error that occurred
 * @param context - Error context for logging
 * 
 * @example
 * ```typescript
 * try {
 *   const client = await storage.createClientCompany(data);
 *   res.status(201).json(client);
 * } catch (error) {
 *   return handleServerError(res, error, {
 *     operation: "create_client",
 *     userId,
 *     orgId
 *   });
 * }
 * ```
 */
export function handleServerError(
  res: Response,
  error: unknown,
  context: ErrorContext
): Response {
  // Create safe error log (redacts sensitive data)
  const safeError = createSafeErrorLog(error, process.env.NODE_ENV !== "production");
  
  // Log full error details server-side
  logger.error("Server error", {
    source: "crm",
    error: safeError,
    ...context
  });
  
  // Return generic error to client (no sensitive information)
  return res.status(500).json({
    error: "An unexpected error occurred"
  });
}

/**
 * Wrap an async route handler with error handling.
 * 
 * Provides a consistent try-catch wrapper for all route handlers,
 * ensuring that unexpected errors are properly logged and returned
 * as 500 responses instead of crashing the server.
 * 
 * @param handler - Async route handler function
 * @param operation - Operation name for logging
 * @returns Wrapped handler with error handling
 * 
 * @example
 * ```typescript
 * crmRoutes.get("/api/clients", requireAuth, withErrorHandling(
 *   async (req, res) => {
 *     const userId = getUserIdFromRequest(req)!;
 *     const orgId = await getOrCreateOrg(userId);
 *     const clients = await storage.getClientCompanies(orgId);
 *     res.json(clients);
 *   },
 *   "get_clients"
 * ));
 * ```
 */
export function withErrorHandling(
  handler: (req: any, res: Response) => Promise<any>,
  operation: string
) {
  return async (req: any, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      // Extract context from request
      const userId = req.user?.claims?.sub || req.user?.id;
      const orgId = req.orgId;
      const resourceId = req.params?.id;
      
      handleServerError(res, error, {
        operation,
        userId,
        orgId,
        resourceId
      });
    }
  };
}
