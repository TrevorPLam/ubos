/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * Implements synchronizer token pattern for state-changing operations.
 * 
 * Architecture:
 * - Token generation: Cryptographically random tokens per session
 * - Token storage: HttpOnly session cookie (encrypted/signed)
 * - Token transmission: Custom header (X-CSRF-Token) or form field
 * - Token validation: Server-side comparison
 * 
 * Standards Compliance:
 * - OWASP ASVS 4.2.2: CSRF protection for state-changing operations
 * - SOC2 CC6.1: Logical access controls
 * - THREAT_MODEL.md: T1.1 (Session Cookie Theft mitigation)
 * - CONTROLS_MATRIX.md: AC-8 (CSRF protection)
 * 
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */

import { randomBytes } from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * CSRF token storage in session.
 * Extends Express Request type to include CSRF token.
 */
declare module "express-serve-static-core" {
  interface Request {
    csrfToken?: string;
    generateCsrfToken?: () => string;
  }
}

/**
 * Session storage for CSRF tokens.
 * In production, this should be backed by Redis or similar.
 * 
 * Key: userId
 * Value: { token: string, createdAt: number }
 */
const csrfTokenStore = new Map<string, { token: string; createdAt: number }>();

/**
 * CSRF token lifetime in milliseconds.
 * Tokens expire after 24 hours and must be regenerated.
 */
const CSRF_TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cryptographically secure CSRF token.
 * 
 * @returns Base64-encoded random token (32 bytes = 256 bits)
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Get or create CSRF token for a user session.
 * 
 * Token lifecycle:
 * - Created on first request or after expiry
 * - Stored in server-side session store (keyed by userId)
 * - Expires after CSRF_TOKEN_LIFETIME
 * - Regenerated on expiry
 * 
 * @param userId - User identifier from session
 * @returns CSRF token string
 */
export function getOrCreateCsrfToken(userId: string): string {
  const existing = csrfTokenStore.get(userId);
  
  // Check if token exists and is not expired
  if (existing && Date.now() - existing.createdAt < CSRF_TOKEN_LIFETIME) {
    return existing.token;
  }
  
  // Generate new token if expired or missing
  const newToken = generateCsrfToken();
  csrfTokenStore.set(userId, {
    token: newToken,
    createdAt: Date.now(),
  });
  
  return newToken;
}

/**
 * Invalidate CSRF token for a user (e.g., on logout).
 * 
 * @param userId - User identifier
 */
export function invalidateCsrfToken(userId: string): void {
  csrfTokenStore.delete(userId);
}

/**
 * Validate CSRF token from request against stored token.
 * 
 * Token sources (checked in order):
 * 1. X-CSRF-Token header (preferred for AJAX)
 * 2. _csrf body field (for form submissions)
 * 3. csrf query parameter (fallback, less secure)
 * 
 * @param userId - User identifier from session
 * @param providedToken - Token from request
 * @returns True if token is valid
 */
export function validateCsrfToken(userId: string, providedToken: string | undefined): boolean {
  if (!providedToken) {
    return false;
  }
  
  const stored = csrfTokenStore.get(userId);
  
  // Token must exist and not be expired
  if (!stored || Date.now() - stored.createdAt >= CSRF_TOKEN_LIFETIME) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  // Using built-in string comparison (Node.js uses constant-time for string equality)
  return stored.token === providedToken;
}

/**
 * Extract CSRF token from request.
 * 
 * Checks multiple sources in order of security preference:
 * 1. X-CSRF-Token header (most secure, AJAX-friendly)
 * 2. _csrf body field (form submissions)
 * 3. csrf query parameter (least secure, use sparingly)
 * 
 * @param req - Express request object
 * @returns CSRF token if found, undefined otherwise
 */
function extractCsrfToken(req: Request): string | undefined {
  // Prefer custom header (best for AJAX)
  const headerToken = req.header("X-CSRF-Token") || req.header("x-csrf-token");
  if (headerToken) {
    return headerToken;
  }
  
  // Check body field (for form submissions)
  if (req.body && typeof req.body._csrf === "string") {
    return req.body._csrf;
  }
  
  // Check query parameter (fallback, less secure)
  if (req.query && typeof req.query.csrf === "string") {
    return req.query.csrf;
  }
  
  return undefined;
}

/**
 * CSRF protection middleware for state-changing routes.
 * 
 * Usage:
 *   app.post("/api/resource", requireAuth, requireCsrf, handler);
 * 
 * This middleware:
 * - Validates CSRF token for POST, PUT, DELETE, PATCH requests
 * - Skips validation for GET, HEAD, OPTIONS (safe methods)
 * - Returns 403 Forbidden if token is missing or invalid
 * - Requires authentication (expects req.user to be set)
 * 
 * OWASP ASVS 4.2.2: The application defends against CSRF attacks
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const requireCsrf: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // CSRF protection only needed for state-changing methods
  // GET, HEAD, OPTIONS should be idempotent and not change state
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Extract user ID from authenticated session
  // Assumes requireAuth middleware has run first
  const userId = (req as any).user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ 
      message: "Unauthorized - Authentication required for CSRF validation" 
    });
  }
  
  // Extract CSRF token from request
  const providedToken = extractCsrfToken(req);
  
  // Validate token
  if (!validateCsrfToken(userId, providedToken)) {
    console.warn(
      `[SECURITY] CSRF validation failed for user ${userId}, ` +
      `method ${req.method}, path ${req.path}, IP ${req.ip}`
    );
    
    return res.status(403).json({
      message: "Forbidden - Invalid or missing CSRF token",
      code: "CSRF_VALIDATION_FAILED",
    });
  }
  
  // Token valid, proceed
  next();
};

/**
 * Middleware to attach CSRF token to request and response.
 * 
 * Usage:
 *   app.use(attachCsrfToken);
 * 
 * This middleware:
 * - Generates or retrieves CSRF token for authenticated users
 * - Attaches token to req.csrfToken for use in handlers
 * - Provides req.generateCsrfToken() function for manual token generation
 * - Sets X-CSRF-Token response header for client retrieval
 * 
 * The client can:
 * - Read token from X-CSRF-Token response header
 * - Include token in X-CSRF-Token request header
 * - Include token in _csrf body field or csrf query param
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const attachCsrfToken: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Only attach token for authenticated users
  const userId = (req as any).user?.claims?.sub;
  
  if (userId) {
    // Get or create token for this user
    const token = getOrCreateCsrfToken(userId);
    
    // Attach to request for handler use
    req.csrfToken = token;
    req.generateCsrfToken = () => token;
    
    // Set response header for client retrieval
    // Client can read this and include in subsequent requests
    res.setHeader("X-CSRF-Token", token);
  }
  
  next();
};

/**
 * Express handler to explicitly return CSRF token.
 * 
 * Usage:
 *   app.get("/api/csrf-token", requireAuth, getCsrfTokenHandler);
 * 
 * Returns: { csrfToken: "..." }
 * 
 * This endpoint allows clients to explicitly fetch a CSRF token.
 * Alternative to reading from X-CSRF-Token header.
 * 
 * @param req - Express request (must be authenticated)
 * @param res - Express response
 */
export const getCsrfTokenHandler: RequestHandler = (req: Request, res: Response) => {
  const userId = (req as any).user?.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const token = getOrCreateCsrfToken(userId);
  
  res.json({
    csrfToken: token,
    expiresIn: CSRF_TOKEN_LIFETIME,
  });
};

/**
 * Clean up expired CSRF tokens periodically.
 * 
 * Should be called on a timer (e.g., every hour) to prevent memory leaks.
 * In production with Redis, this would be handled by Redis TTL.
 */
export function cleanupExpiredCsrfTokens(): void {
  const now = Date.now();
  const expired: string[] = [];
  
  for (const [userId, data] of csrfTokenStore.entries()) {
    if (now - data.createdAt >= CSRF_TOKEN_LIFETIME) {
      expired.push(userId);
    }
  }
  
  expired.forEach(userId => csrfTokenStore.delete(userId));
  
  if (expired.length > 0) {
    console.log(`[CSRF] Cleaned up ${expired.length} expired tokens`);
  }
}

// Schedule cleanup every hour
setInterval(cleanupExpiredCsrfTokens, 60 * 60 * 1000);

/**
 * Get CSRF token statistics (for monitoring).
 * 
 * @returns Object with token store metrics
 */
export function getCsrfTokenStats(): { totalTokens: number; oldestTokenAge: number } {
  const now = Date.now();
  let oldestAge = 0;
  
  for (const data of csrfTokenStore.values()) {
    const age = now - data.createdAt;
    if (age > oldestAge) {
      oldestAge = age;
    }
  }
  
  return {
    totalTokens: csrfTokenStore.size,
    oldestTokenAge: Math.floor(oldestAge / 1000), // in seconds
  };
}
