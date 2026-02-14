import { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../db";
import { activityEvents } from "@shared/schema";

/**
 * Rate limiting middleware for 2026 security standards
 * 
 * Features:
 * - Configurable rate limits per endpoint
 * - Client fingerprinting for bot detection
 * - Sliding window rate limiting
 * - Audit logging for abuse detection
 * - AI-ready analytics data structure
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
  keyGenerator?: (_req: Request) => string; // Custom key generator
}

interface ClientInfo {
  ip: string;
  userAgent: string;
  fingerprint: string;
  userId?: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
};

// In-memory store for rate limits (in production, use Redis)
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
  lastAccess: number;
}>();

/**
 * Generate client fingerprint for bot detection
 */
function generateClientFingerprint(req: Request): string {
// 2026 Best Practice: Use modern Node.js API with proper null safety
  // req.connection is deprecated since Node.js v13.0.0
  // Primary: Express req.ip (handles X-Forwarded-For when trust proxy is enabled)
  // Fallback: req.socket?.remoteAddress (modern replacement for req.connection.remoteAddress)
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const acceptLanguage = req.get('Accept-Language') || 'unknown';
  const acceptEncoding = req.get('Accept-Encoding') || 'unknown';
  
  // Create a hash of client characteristics
  const fingerprint = Buffer.from(`${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`).toString('base64');
  return fingerprint.substring(0, 32); // Truncate for storage efficiency
}

/**
 * Check if request exceeds rate limit
 */
function checkRateLimit(key: string, config: RateLimitConfig): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  
  let record = rateLimitStore.get(key);
  
  if (!record || record.resetTime <= now) {
    // Create new record or reset expired record
    record = {
      count: 1,
      resetTime: now + config.windowMs,
      lastAccess: now,
    };
    rateLimitStore.set(key, record);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: record.resetTime,
    };
  }
  
  // Update existing record
  record.count++;
  record.lastAccess = now;
  
  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  
  return {
    allowed,
    remaining,
    resetTime: record.resetTime,
  };
}

/**
 * Log rate limit violation for audit and AI analysis
 */
async function logRateLimitViolation(
  clientInfo: ClientInfo,
  req: Request,
  config: RateLimitConfig,
  remaining: number
): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      organizationId: 'system',
      entityType: 'rate_limit_violation',
      entityId: req.path,
      actorId: clientInfo.userId || 'anonymous',
      actorName: clientInfo.userId || 'anonymous',
      type: 'rejected',
      description: `Rate limit exceeded on ${req.method} ${req.path}`,
      metadata: {
        clientIp: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        fingerprint: clientInfo.fingerprint,
        reqPath: req.path,
        reqMethod: req.method,
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        remaining,
        timestamp: new Date().toISOString(),
        // AI-ready analytics data
        riskScore: calculateRiskScore(clientInfo, req),
        anomalyIndicators: getAnomalyIndicators(clientInfo, req),
      },
    });
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}

/**
 * Calculate risk score for AI-driven analysis
 */
function calculateRiskScore(clientInfo: ClientInfo, req: Request): number {
  let score = 0;
  
  // High-frequency requests increase risk
  const key = `${clientInfo.fingerprint}:${req.path}`;
  const record = rateLimitStore.get(key);
  if (record && record.count > 50) {
    score += 30;
  }
  
  // Suspicious user agents
  const suspiciousAgents = ['bot', 'crawler', 'scraper', 'automated'];
  if (suspiciousAgents.some(agent => 
    clientInfo.userAgent.toLowerCase().includes(agent)
  )) {
    score += 40;
  }
  
  // Admin endpoints are higher risk
  if (req.path.includes('/admin') || req.path.includes('/api/roles')) {
    score += 20;
  }
  
  // Anonymous requests are higher risk
  if (!clientInfo.userId) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Get anomaly indicators for AI analysis
 */
function getAnomalyIndicators(clientInfo: ClientInfo, _req: Request): string[] {
  const indicators: string[] = [];
  
  // Check for automated patterns
  if (clientInfo.userAgent.length < 10) {
    indicators.push('short_user_agent');
  }
  
  // Check for headless browsers
  if (clientInfo.userAgent.includes('HeadlessChrome') || 
      clientInfo.userAgent.includes('PhantomJS')) {
    indicators.push('headless_browser');
  }
  
  // Check for unusual request timing
  const key = clientInfo.fingerprint;
  const record = rateLimitStore.get(key);
  if (record && record.lastAccess > Date.now() - 100) {
    indicators.push('rapid_requests');
  }
  
  return indicators;
}

/**
 * Cleanup expired rate limit records
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [_key, record] of rateLimitStore.entries()) {
    if (record.resetTime <= now) {
      rateLimitStore.delete(_key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

/**
 * Rate limiting middleware factory
 */
export function createRateLimit(config: Partial<RateLimitConfig> = {}): RequestHandler {
  const finalConfig = { ...defaultConfig, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientInfo: ClientInfo = {
      // 2026 Best Practice: Use modern Node.js API with proper null safety
      // req.connection is deprecated since Node.js v13.0.0
      // Primary: Express req.ip (handles X-Forwarded-For when trust proxy is enabled)
      // Fallback: req.socket?.remoteAddress (modern replacement for req.connection.remoteAddress)
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      fingerprint: generateClientFingerprint(req),
    };
    
    // Extract user ID from authenticated request
    const authReq = req as any;
    if (authReq.user?.claims?.sub) {
      clientInfo.userId = authReq.user.claims.sub;
    }
    
    // Generate rate limit key
    const key = config.keyGenerator 
      ? config.keyGenerator(req)
      : `${clientInfo.fingerprint}:${req.path}`;
    
    const result = checkRateLimit(key, finalConfig);
    
    // Add rate limit headers for 2026 API standards
    res.set({
      'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });
    
    if (!result.allowed) {
      // Log violation for audit and AI analysis
      logRateLimitViolation(clientInfo, req, finalConfig, result.remaining);
      
      res.status(429).json({
        message: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }
    
    next();
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
});

export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  maxRequests: 100, // 100 requests per 15 minutes
});

export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 admin requests per 15 minutes
});

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 uploads per hour
});
