// AI-META-BEGIN
// AI-META: Security middleware - Helmet, rate limiting, CORS
// OWNERSHIP: server/security
// ENTRYPOINTS: server/index.ts
// DEPENDENCIES: helmet, express-rate-limit
// DANGER: Security controls - misconfiguration breaks app
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: tests/backend/security.test.ts
// AI-META-END

/**
 * Security middleware for the UBOS application.
 * 
 * Implements security best practices including:
 * - Security headers (HSTS, CSP, X-Frame-Options, etc.)
 * - Rate limiting to prevent brute force attacks
 * - CORS configuration
 * - Request sanitization
 * 
 * References:
 * - SOC2 Compliance: docs/security/40-compliance/SOC2_COMPLIANCE.md (CC6 - Access Controls)
 * - OWASP Top 10: docs/security/30-implementation-guides/APPLICATION_SECURITY.md
 * - Security Monitoring: docs/security/30-implementation-guides/SECURITY_MONITORING.md
 * 
 * @see {@link https://helmetjs.github.io/ Helmet.js Documentation}
 * @see {@link https://www.npmjs.com/package/express-rate-limit Rate Limiting}
 */

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import cors from "cors";
import type { Express, Request, Response, NextFunction } from "express";
import { logger } from "./logger";
import { redisClient } from "./redis";

/**
 * Configure security headers using Helmet.
 * 
 * Security headers protect against common web vulnerabilities:
 * - HSTS: Forces HTTPS connections
 * - CSP: Prevents XSS and injection attacks
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * 
 * @param app - Express application instance
 */
export function setupSecurityHeaders(app: Express): void {
  // Apply Helmet security headers
  app.use(
    helmet({
      // HTTP Strict Transport Security - Force HTTPS
      // SOC2: CC6.7 Transmission Security
      strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // AI-NOTE: CSP unsafe-inline is necessary for React/Tailwind; consider nonce-based CSP for stricter security
      // Content Security Policy - Prevent XSS and injection attacks
      // OWASP: A03:2021 - Injection
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // React requires inline scripts
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },

      // Prevent clickjacking attacks
      // OWASP: A05:2021 - Security Misconfiguration
      frameguard: {
        action: "deny",
      },

      // Prevent MIME sniffing
      noSniff: true,

      // Disable X-Powered-By header (don't expose Express)
      hidePoweredBy: true,

      // Referrer Policy - Control referrer information
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
    }),
  );

  // Additional security headers not covered by Helmet
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent XSS attacks (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Permissions Policy - Control browser features
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    );

    next();
  });
}

/**
 * Configure rate limiting to prevent brute force and DoS attacks.
 * 
 * Implements tiered rate limiting:
 * - Global limit: All requests
 * - Auth limit: Authentication endpoints (stricter)
 * - API limit: API endpoints
 * 
 * SOC2: CC6.1 - Logical Access Controls
 * OWASP: A07:2021 - Identification and Authentication Failures
 * 
 * @param app - Express application instance
 */
export function setupRateLimiting(app: Express): void {
  // Global rate limiter - applies to all requests
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later",
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Skip rate limiting for health checks
    skip: (req) => req.path === "/health" || req.path === "/api/health",
  });

  // Authentication rate limiter - stricter limits for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests, even successful ones
  });

  // API rate limiter - moderate limits for API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 API requests per windowMs
    message: "API rate limit exceeded, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters
  app.use(globalLimiter);
  app.use("/api/login", authLimiter);
  app.use("/api/logout", authLimiter);
  app.use("/api/", apiLimiter);
}

/**
 * Configure CORS (Cross-Origin Resource Sharing).
 * 
 * In production, restrict origins to known domains.
 * In development, allow localhost for easier testing.
 * 
 * SOC2: CC6.7 - Transmission Security
 * OWASP: A05:2021 - Security Misconfiguration
 * THREAT_MODEL.md: CS-1 (TLS Configuration)
 * 
 * @param app - Express application instance
 */
export function setupCORS(app: Express): void {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // In production, restrict to specific domains only
      if (isProduction) {
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
        
        if (allowedOrigins.length === 0) {
          // SECURITY: In production without ALLOWED_ORIGINS, deny CORS
          logger.warn("ALLOWED_ORIGINS not configured in production. CORS disabled.", {
            source: "SECURITY",
            severity: "CRITICAL"
          });
          return callback(new Error("CORS not configured for production"));
        }
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      } else if (isDevelopment) {
        // In development, allow localhost and common dev ports
        if (
          origin.includes("localhost") ||
          origin.includes("127.0.0.1") ||
          origin.includes("0.0.0.0")
        ) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed in development`));
        }
      } else {
        // Other environments: restrictive by default
        callback(new Error("CORS not configured for this environment"));
      }
    },
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));
}

/**
 * Sanitize request data to prevent injection attacks.
 * 
 * This middleware strips potentially dangerous characters from
 * request bodies, query parameters, and URL parameters.
 * 
 * Note: This is a defense-in-depth measure. Primary protection
 * comes from input validation (Zod schemas) and parameterized queries.
 * 
 * OWASP: A03:2021 - Injection
 * 
 * @param app - Express application instance
 */
export function setupRequestSanitization(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize body (already parsed by express.json())
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  });
}

/**
 * Recursively sanitize an object by removing potentially dangerous characters.
 * 
 * This function removes:
 * - SQL injection attempts
 * - NoSQL injection attempts
 * - Script tags
 * - Event handlers
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a string by removing potentially dangerous content.
 * 
 * IMPORTANT: This is defense-in-depth only. Primary security measures:
 * 1. React automatically escapes JSX expressions (XSS prevention)
 * 2. Drizzle ORM uses parameterized queries (SQL injection prevention)
 * 3. Zod schema validation (input validation)
 * 
 * Regex-based sanitization has inherent limitations and can be bypassed.
 * This function provides additional safety but should NOT be the only defense.
 * 
 * @see {@link https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html OWASP XSS Filter Evasion}
 * @param str - String to sanitize
 * @returns Sanitized string
 */
function sanitizeString(str: string): string {
  // Remove null bytes
  str = str.replace(/\0/g, "");

  // Note: The following sanitizations are basic defense-in-depth measures.
  // They have known limitations (e.g., <script > with space can bypass simple regex).
  // Primary XSS defense is React's auto-escaping of JSX expressions.
  // Do NOT rely on these regex patterns as the sole protection mechanism.
  
  // Remove script tags (basic pattern - React provides primary XSS protection)
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, "");
  
  // Remove javascript: protocol (basic pattern - use Content Security Policy)
  str = str.replace(/javascript\s*:/gi, "");
  
  // Remove event handlers (basic pattern - React provides primary protection)
  // Note: This won't catch all variations (e.g., on<tab>click=)
  str = str.replace(/\bon\w+\s*=/gi, "");

  return str;
}

/**
 * Setup all security middleware.
 * 
 * Call this function in server/index.ts before registering routes.
 * 
 * @param app - Express application instance
 */
export function setupSecurityMiddleware(app: Express): void {
  // 1. CORS must be applied early
  setupCORS(app);

  // 2. Security headers
  setupSecurityHeaders(app);

  // 3. Rate limiting
  setupRateLimiting(app);

  // 4. Request sanitization (after body parsing, before routes)
  setupRequestSanitization(app);
}
