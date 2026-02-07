// AI-META-BEGIN
// AI-META: Session management with Redis
// OWNERSHIP: server/auth
// ENTRYPOINTS: server/routes.ts
// DEPENDENCIES: express-session, redis
// DANGER: Session hijacking if misconfigured
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: tests/backend/auth-middleware.test.ts
// AI-META-END

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
import { logger } from "./logger";
import { redisClient, isRedisConnected } from "./redis";

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
 * In-memory session store fallback.
 * Used when Redis is not available.
 */
const memoryStore = new Map<string, SessionData>();

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
  logger.info("Configuration updated", { source: "SESSION", config: JSON.stringify(sessionConfig) });
}

/**
 * Create a new session for a user.
 * 
 * Session lifecycle:
 * 1. Created on login with randomUUID()
 * 2. Stored in Redis (or memory) with timestamps
 * 3. Cookie set on response (HttpOnly, Secure, SameSite)
 * 4. Validated on each request
 * 5. Expired based on TTL or idle timeout
 * 6. Destroyed on logout
 * 
 * @param userId - User identifier
 * @param req - Express request (for IP/UA tracking)
 * @returns Session ID
 */
export async function createSession(userId: string, req: Request): Promise<string> {
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
  
  if (isRedisConnected()) {
    // Store in Redis with TTL equal to absoluteTTL
    // We serialize the session object to JSON
    await redisClient.set(
      `session:${sessionId}`, 
      JSON.stringify(session), 
      { PX: sessionConfig.absoluteTTL }
    );
  } else {
    memoryStore.set(sessionId, session);
  }
  
  logger.info(`Created session for user ${userId}`, { 
    source: "SESSION", 
    sessionId: sessionId.slice(0, 8),
    userId,
    ip: req.ip 
  });
  
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
export async function getSession(sessionId: string | undefined, req: Request): Promise<SessionData | null> {
  if (!sessionId) {
    return null;
  }
  
  let session: SessionData | null | undefined;

  if (isRedisConnected()) {
    const data = await redisClient.get(`session:${sessionId}`);
    if (data) {
      try {
        session = JSON.parse(data);
      } catch (e) {
        logger.error("Failed to parse session data", { sessionId, error: String(e) });
        return null;
      }
    }
  } else {
    session = memoryStore.get(sessionId);
  }
  
  if (!session) {
    return null;
  }
  
  const now = Date.now();
  
  // Check absolute TTL
  if (now - session.createdAt > sessionConfig.absoluteTTL) {
    logger.warn("Session expired (absolute TTL)", {
      source: "SESSION",
      sessionId: sessionId.slice(0, 8),
      ageSeconds: Math.floor((now - session.createdAt) / 1000)
    });
    await destroySession(sessionId);
    return null;
  }
  
  // Check idle timeout
  if (now - session.lastActivity > sessionConfig.idleTimeout) {
    logger.warn("Session expired (idle timeout)", {
      source: "SESSION",
      sessionId: sessionId.slice(0, 8),
      idleSeconds: Math.floor((now - session.lastActivity) / 1000)
    });
    await destroySession(sessionId);
    return null;
  }
  
  // Optional: Check for IP/UA changes (anomaly detection)
  // In production, consider whether to enforce or just log
  if (session.ipAddress && session.ipAddress !== req.ip) {
    logger.warn("IP address change detected", {
      source: "SESSION",
      sessionId: sessionId.slice(0, 8),
      oldIp: session.ipAddress,
      newIp: req.ip
    });
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
export async function touchSession(sessionId: string): Promise<void> {
  if (isRedisConnected()) {
    const data = await redisClient.get(`session:${sessionId}`);
    if (data) {
      try {
        const session = JSON.parse(data) as SessionData;
        session.lastActivity = Date.now();
        // Update Redis, resetting TTL to absoluteTTL (or remaining time?)
        // Usually we want to keep the absolute TTL constraint, so we should NOT extend the key TTL beyond original absoluteTTL.
        // However, redis SET resets TTL unless KEEPTTL is used.
        // But we want to enforce absoluteTTL.
        // Calculate remaining TTL
        const now = Date.now();
        const remainingTTL = Math.max(0, sessionConfig.absoluteTTL - (now - session.createdAt));
        
        if (remainingTTL > 0) {
            await redisClient.set(
                `session:${sessionId}`, 
                JSON.stringify(session), 
                { PX: remainingTTL }
            );
        } else {
            await destroySession(sessionId);
        }
      } catch (e) {
        // ignore
      }
    }
  } else {
    const session = memoryStore.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
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
export async function rotateSession(oldSessionId: string, req: Request): Promise<string | null> {
  let session: SessionData | null | undefined;

  if (isRedisConnected()) {
    const data = await redisClient.get(`session:${oldSessionId}`);
    if (data) {
       session = JSON.parse(data);
    }
  } else {
    session = memoryStore.get(oldSessionId);
  }

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
  
  if (isRedisConnected()) {
      // Calculate remaining TTL
      const now = Date.now();
      const remainingTTL = Math.max(0, sessionConfig.absoluteTTL - (now - session.createdAt));
      
      if (remainingTTL > 0) {
        await redisClient.set(
            `session:${newSessionId}`, 
            JSON.stringify(newSession), 
            { PX: remainingTTL }
        );
        await redisClient.del(`session:${oldSessionId}`);
      } else {
          // expired
          return null;
      }
  } else {
      memoryStore.set(newSessionId, newSession);
      memoryStore.delete(oldSessionId);
  }
  
  logger.info("Session rotated", {
    source: "SESSION",
    userId: session.userId,
    oldSessionId: oldSessionId.slice(0, 8),
    newSessionId: newSessionId.slice(0, 8)
  });
  
  return newSessionId;
}

/**
 * Destroy a session (logout).
 * 
 * Removes session from store and should be followed by clearing cookie.
 * 
 * @param sessionId - Session identifier to destroy
 */
export async function destroySession(sessionId: string): Promise<void> {
  if (isRedisConnected()) {
      // We also might want to log who destroyed it, but we don't have the session data here easily unless we fetch it first.
      // For performance, just delete.
      await redisClient.del(`session:${sessionId}`);
  } else {
      const session = memoryStore.get(sessionId);
      if (session) {
        memoryStore.delete(sessionId);
      }
  }
  logger.info("Session destroyed", {
      source: "SESSION",
      sessionId: sessionId.slice(0, 8)
  });
}

/**
 * Clean up expired sessions periodically.
 * 
 * Should be called on a timer to prevent memory leaks.
 * In production with Redis, use Redis TTL instead.
 */
export function cleanupExpiredSessions(): void {
  // If using Redis, TTL handles cleanup automatically.
  // If using memory store, we still need this.
  if (isRedisConnected()) {
      return; 
  }

  const now = Date.now();
  const expired: string[] = [];
  
  for (const [sessionId, session] of memoryStore.entries()) {
    const age = now - session.createdAt;
    const idle = now - session.lastActivity;
    
    if (age > sessionConfig.absoluteTTL || idle > sessionConfig.idleTimeout) {
      expired.push(sessionId);
    }
  }
  
  expired.forEach(sessionId => memoryStore.delete(sessionId));
  
  if (expired.length > 0) {
    logger.debug("Cleaned up expired sessions (memory)", {
      source: "SESSION",
      count: expired.length
    });
  }
}

// Schedule cleanup every 5 minutes (mostly for memory fallback)
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

/**
 * Get session store statistics (for monitoring).
 * 
 * @returns Object with session metrics
 */
export async function getSessionStats(): Promise<{
  totalSessions: number;
  oldestSessionAge: number;
  averageIdle: number;
}> {
  if (isRedisConnected()) {
      // Redis specific stats - tough to get exact "oldest age" without scanning all keys.
      // We can just return total count.
      // Use DBSIZE
      const size = await redisClient.dbSize();
      return {
          totalSessions: size,
          oldestSessionAge: 0, // Not easily available
          averageIdle: 0 // Not easily available
      };
  }

  const now = Date.now();
  let totalIdle = 0;
  let oldestAge = 0;
  
  for (const session of memoryStore.values()) {
    const age = now - session.createdAt;
    const idle = now - session.lastActivity;
    
    totalIdle += idle;
    if (age > oldestAge) {
      oldestAge = age;
    }
  }
  
  return {
    totalSessions: memoryStore.size,
    oldestSessionAge: Math.floor(oldestAge / 1000), // seconds
    averageIdle: memoryStore.size > 0 ? Math.floor(totalIdle / memoryStore.size / 1000) : 0,
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
export const sessionMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  // Extract session ID from cookie
  const cookies = parseCookies(req.header("cookie"));
  const sessionId = cookies[sessionConfig.cookieName];
  
  if (!sessionId) {
    // No session cookie, proceed without session
    return next();
  }
  
  // Validate session
  const session = await getSession(sessionId, req);
  if (!session) {
    // Session invalid/expired, clear cookie
    res.setHeader(
      "Set-Cookie",
      `${sessionConfig.cookieName}=; Path=/; HttpOnly; SameSite=${sessionConfig.sameSite}; Max-Age=0`
    );
    return next();
  }
  
  // Update activity timestamp
  await touchSession(sessionId);
  
  // Check if session needs rotation
  const now = Date.now();
  if (now - session.rotatedAt > sessionConfig.rotationInterval) {
    const newSessionId = await rotateSession(sessionId, req);
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
