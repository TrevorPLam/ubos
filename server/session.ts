/**
 * Session Management with Lifetime Controls
 * 
 * Implements secure session management with:
 * - Absolute session TTL (maximum lifetime)
 * - Idle timeout (activity-based expiry)
 * - Session rotation on login and privilege change
 * - Server-side session invalidation
 * 
 * Standards Compliance:
 * - OWASP ASVS 3.2: Session timeout and termination
 * - OWASP ASVS 3.3: Cookie-based session management
 * - SOC2 CC6.1: Logical access controls
 * - NIST SP 800-63B: Session management requirements
 * - THREAT_MODEL.md: T1.1 (Session Cookie Theft)
 * - CONTROLS_MATRIX.md: AC-3, AC-4 (Session controls)
 * 
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 */

import { randomUUID } from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Session data structure.
 */
export interface SessionData {
  userId: string;
  createdAt: number;  // Unix timestamp (ms) when session was created
  lastActivity: number;  // Unix timestamp (ms) of last request
  rotatedAt: number;  // Unix timestamp (ms) of last rotation
  ipAddress?: string;  // Client IP for anomaly detection
  userAgent?: string;  // Client user agent for anomaly detection
}

/**
 * Session configuration.
 */
export interface SessionConfig {
  absoluteTTL: number;  // Maximum session lifetime (ms)
  idleTimeout: number;  // Inactivity timeout (ms)
  rotationInterval: number;  // How often to rotate session IDs (ms)
  cookieName: string;  // Session cookie name
  secure: boolean;  // Require HTTPS for cookies
  sameSite: "strict" | "lax" | "none";  // SameSite cookie attribute
}

/**
 * Default session configuration.
 * 
 * Production values:
 * - Absolute TTL: 24 hours (86400000 ms)
 * - Idle timeout: 15 minutes (900000 ms)
 * - Rotation: 1 hour (3600000 ms)
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  absoluteTTL: 24 * 60 * 60 * 1000,  // 24 hours
  idleTimeout: 15 * 60 * 1000,  // 15 minutes
  rotationInterval: 60 * 60 * 1000,  // 1 hour
  cookieName: "ubos_session_id",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

/**
 * In-memory session store.
 * 
 * In production, replace with Redis or similar persistent store.
 * 
 * Key: sessionId (UUID)
 * Value: SessionData
 */
const sessionStore = new Map<string, SessionData>();

/**
 * Session configuration (can be overridden at startup).
 */
let sessionConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG };

/**
 * Update session configuration.
 * 
 * Call this at application startup to customize session behavior.
 * 
 * @param config - Partial configuration to override defaults
 */
export function configureSession(config: Partial<SessionConfig>): void {
  sessionConfig = { ...sessionConfig, ...config };
  console.log("[SESSION] Configuration updated:", sessionConfig);
}

/**
 * Create a new session for a user.
 * 
 * Session lifecycle:
 * 1. Created on login with randomUUID()
 * 2. Stored in session store with timestamps
 * 3. Cookie set on response (HttpOnly, Secure, SameSite)
 * 4. Validated on each request
 * 5. Expired based on TTL or idle timeout
 * 6. Destroyed on logout
 * 
 * @param userId - User identifier
 * @param req - Express request (for IP/UA tracking)
 * @returns Session ID
 */
export function createSession(userId: string, req: Request): string {
  const sessionId = randomUUID();
  const now = Date.now();
  
  const session: SessionData = {
    userId,
    createdAt: now,
    lastActivity: now,
    rotatedAt: now,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
  
  sessionStore.set(sessionId, session);
  
  console.log(`[SESSION] Created session ${sessionId} for user ${userId} from IP ${req.ip}`);
  
  return sessionId;
}

/**
 * Validate and retrieve session data.
 * 
 * Checks:
 * - Session exists in store
 * - Not expired (absolute TTL)
 * - Not idle (idle timeout)
 * - IP/UA match (optional anomaly detection)
 * 
 * @param sessionId - Session identifier from cookie
 * @param req - Express request (for IP/UA validation)
 * @returns SessionData if valid, null if invalid/expired
 */
export function getSession(sessionId: string | undefined, req: Request): SessionData | null {
  if (!sessionId) {
    return null;
  }
  
  const session = sessionStore.get(sessionId);
  if (!session) {
    return null;
  }
  
  const now = Date.now();
  
  // Check absolute TTL
  if (now - session.createdAt > sessionConfig.absoluteTTL) {
    console.warn(
      `[SESSION] Session ${sessionId} expired (absolute TTL), ` +
      `age: ${Math.floor((now - session.createdAt) / 1000)}s`
    );
    sessionStore.delete(sessionId);
    return null;
  }
  
  // Check idle timeout
  if (now - session.lastActivity > sessionConfig.idleTimeout) {
    console.warn(
      `[SESSION] Session ${sessionId} expired (idle timeout), ` +
      `idle: ${Math.floor((now - session.lastActivity) / 1000)}s`
    );
    sessionStore.delete(sessionId);
    return null;
  }
  
  // Optional: Check for IP/UA changes (anomaly detection)
  // In production, consider whether to enforce or just log
  if (session.ipAddress && session.ipAddress !== req.ip) {
    console.warn(
      `[SESSION] IP address change detected for session ${sessionId}: ` +
      `${session.ipAddress} -> ${req.ip}`
    );
    // For now, just log. Strict enforcement could break mobile users.
  }
  
  // Session is valid
  return session;
}

/**
 * Update session activity timestamp.
 * 
 * Called on each authenticated request to extend idle timeout.
 * 
 * @param sessionId - Session identifier
 */
export function touchSession(sessionId: string): void {
  const session = sessionStore.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

/**
 * Rotate session ID.
 * 
 * Creates a new session ID for the same user, invalidates old ID.
 * This mitigates session fixation attacks.
 * 
 * Should be called:
 * - After login
 * - After privilege escalation
 * - Periodically (e.g., every hour)
 * 
 * OWASP ASVS 3.3.1: Session tokens are generated using approved
 * cryptographic algorithms. IDs should change on authentication
 * state changes.
 * 
 * @param oldSessionId - Current session ID
 * @param req - Express request
 * @returns New session ID, or null if old session invalid
 */
export function rotateSession(oldSessionId: string, req: Request): string | null {
  const session = sessionStore.get(oldSessionId);
  if (!session) {
    return null;
  }
  
  // Create new session ID
  const newSessionId = randomUUID();
  
  // Copy session data to new ID
  const newSession: SessionData = {
    ...session,
    rotatedAt: Date.now(),
  };
  
  // Store under new ID
  sessionStore.set(newSessionId, newSession);
  
  // Delete old ID
  sessionStore.delete(oldSessionId);
  
  console.log(
    `[SESSION] Rotated session for user ${session.userId}: ` +
    `${oldSessionId.slice(0, 8)} -> ${newSessionId.slice(0, 8)}`
  );
  
  return newSessionId;
}

/**
 * Destroy a session (logout).
 * 
 * Removes session from store and should be followed by clearing cookie.
 * 
 * @param sessionId - Session identifier to destroy
 */
export function destroySession(sessionId: string): void {
  const session = sessionStore.get(sessionId);
  if (session) {
    console.log(`[SESSION] Destroyed session ${sessionId} for user ${session.userId}`);
    sessionStore.delete(sessionId);
  }
}

/**
 * Clean up expired sessions periodically.
 * 
 * Should be called on a timer to prevent memory leaks.
 * In production with Redis, use Redis TTL instead.
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  const expired: string[] = [];
  
  for (const [sessionId, session] of sessionStore.entries()) {
    const age = now - session.createdAt;
    const idle = now - session.lastActivity;
    
    if (age > sessionConfig.absoluteTTL || idle > sessionConfig.idleTimeout) {
      expired.push(sessionId);
    }
  }
  
  expired.forEach(sessionId => sessionStore.delete(sessionId));
  
  if (expired.length > 0) {
    console.log(`[SESSION] Cleaned up ${expired.length} expired sessions`);
  }
}

// Schedule cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

/**
 * Get session store statistics (for monitoring).
 * 
 * @returns Object with session metrics
 */
export function getSessionStats(): {
  totalSessions: number;
  oldestSessionAge: number;
  averageIdle: number;
} {
  const now = Date.now();
  let totalIdle = 0;
  let oldestAge = 0;
  
  for (const session of sessionStore.values()) {
    const age = now - session.createdAt;
    const idle = now - session.lastActivity;
    
    totalIdle += idle;
    if (age > oldestAge) {
      oldestAge = age;
    }
  }
  
  return {
    totalSessions: sessionStore.size,
    oldestSessionAge: Math.floor(oldestAge / 1000), // seconds
    averageIdle: sessionStore.size > 0 ? Math.floor(totalIdle / sessionStore.size / 1000) : 0,
  };
}

/**
 * Middleware to validate and manage sessions.
 * 
 * Usage:
 *   app.use(sessionMiddleware);
 *   app.use(requireAuth);  // Depends on session being validated
 * 
 * This middleware:
 * - Extracts session ID from cookie
 * - Validates session (TTL, idle timeout)
 * - Updates activity timestamp
 * - Rotates session if needed
 * - Attaches session data to request
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const sessionMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Extract session ID from cookie
  const cookies = parseCookies(req.header("cookie"));
  const sessionId = cookies[sessionConfig.cookieName];
  
  if (!sessionId) {
    // No session cookie, proceed without session
    return next();
  }
  
  // Validate session
  const session = getSession(sessionId, req);
  if (!session) {
    // Session invalid/expired, clear cookie
    res.setHeader(
      "Set-Cookie",
      `${sessionConfig.cookieName}=; Path=/; HttpOnly; SameSite=${sessionConfig.sameSite}; Max-Age=0`
    );
    return next();
  }
  
  // Update activity timestamp
  touchSession(sessionId);
  
  // Check if session needs rotation
  const now = Date.now();
  if (now - session.rotatedAt > sessionConfig.rotationInterval) {
    const newSessionId = rotateSession(sessionId, req);
    if (newSessionId) {
      // Set new session cookie
      setSessionCookie(res, newSessionId);
      // Attach new session ID to request
      (req as any).sessionId = newSessionId;
    }
  } else {
    // Attach existing session ID to request
    (req as any).sessionId = sessionId;
  }
  
  // Attach user info to request for requireAuth compatibility
  (req as any).user = {
    claims: {
      sub: session.userId,
    },
  };
  
  next();
};

/**
 * Helper: Parse cookie header into object.
 * 
 * @param header - Cookie header string
 * @returns Object mapping cookie names to values
 */
function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  
  for (const part of header.split(";")) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = decodeURIComponent(rawValueParts.join("=") ?? "");
  }
  
  return result;
}

/**
 * Helper: Set session cookie on response.
 * 
 * @param res - Express response
 * @param sessionId - Session identifier
 */
export function setSessionCookie(res: Response, sessionId: string): void {
  const maxAge = Math.floor(sessionConfig.absoluteTTL / 1000); // Convert to seconds
  const securePart = sessionConfig.secure ? "; Secure" : "";
  
  res.setHeader(
    "Set-Cookie",
    `${sessionConfig.cookieName}=${sessionId}; Path=/; HttpOnly; SameSite=${sessionConfig.sameSite}${securePart}; Max-Age=${maxAge}`
  );
}

/**
 * Helper: Clear session cookie on response.
 * 
 * @param res - Express response
 */
export function clearSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${sessionConfig.cookieName}=; Path=/; HttpOnly; SameSite=${sessionConfig.sameSite}; Max-Age=0`
  );
}
