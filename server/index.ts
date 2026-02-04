/**
 * Server entrypoint.
 *
 * Responsibilities:
 * - Create the Express app + HTTP server
 * - Install security middleware (headers, rate limiting, CORS)
 * - Install request body parsers (including `rawBody` capture for signature/webhook use cases)
 * - Install API routes via `registerRoutes()`
 * - Install the client handler:
 *   - production: serve built static assets
 *   - development: proxy through Vite middleware + HMR
 *
 * Security:
 * - Security headers (HSTS, CSP, X-Frame-Options, etc.) via Helmet
 * - Rate limiting to prevent brute force and DoS attacks
 * - CORS configuration for cross-origin requests
 * - Request sanitization to prevent injection attacks
 * - See docs/security/APPLICATION_SECURITY.md for details
 *
 * AI iteration notes:
 * - Add new API endpoints in `server/routes.ts` (keep auth + org scoping consistent).
 * - Anything that must run before the Vite/static catch-all should be mounted before that block.
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupSecurityMiddleware } from "./security";
import { 
  sanitizeRequestForLog, 
  sanitizeResponseForLog, 
  createSafeErrorLog 
} from "./security-utils";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// Environment check
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security middleware must be applied before body parsers
// This includes CORS, security headers, and rate limiting
// See server/security.ts for implementation details
setupSecurityMiddleware(app);

// Request parsing with security limits
// OWASP: Prevent JSON bombs and large payload DoS
// THREAT_MODEL.md: T5.3 (JSON Bomb / Payload Attack)
app.use(
  express.json({
    limit: '100kb', // Prevent large payloads
    verify: (req, _res, buf) => {
      // Keep the exact bytes around for webhook signature verification.
      // This is intentionally set before JSON parsing mutates the payload.
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '100kb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Enhanced request logging with PII redaction
// SOC2: CC7.1 (System Monitoring), GDPR Art 32 (Security of Processing)
// THREAT_MODEL.md: T4.2 (Sensitive Data in Logs), T3.1 (Action Repudiation)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Basic log line (always safe)
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // In production: no response bodies in logs (only in dev for debugging)
      // In dev: log sanitized response for debugging
      if (isDevelopment && capturedJsonResponse) {
        const sanitizedResponse = sanitizeResponseForLog(res.statusCode, capturedJsonResponse);
        log(`${logLine} :: ${JSON.stringify(sanitizedResponse.body)}`);
      } else {
        // Production: just the basic log line
        log(logLine);
      }
      
      // For audit trail, always log sanitized request metadata
      if (res.statusCode >= 400) {
        const sanitizedReq = sanitizeRequestForLog(req);
        log(`Error context: ${JSON.stringify(sanitizedReq)}`, "audit");
      }
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Global error handler with secure logging
  // OWASP ASVS 7.2: Errors do not disclose sensitive information
  // THREAT_MODEL.md: T4.1 (Error Message Leakage)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Create safe error log with redaction
    const safeError = createSafeErrorLog(err, !isProduction);
    
    // Log full details internally (with redaction)
    if (!isProduction) {
      log(`Error: ${JSON.stringify(safeError)}`, "error");
    } else {
      // Production: minimal logging, no stack traces
      log(`Error ${status}: ${safeError.name} - ${safeError.message}`, "error");
    }
    
    // Always log sanitized request context for error investigation
    const sanitizedReq = sanitizeRequestForLog(req);
    log(`Error request: ${JSON.stringify(sanitizedReq)}`, "audit");

    // Send generic error to client (never expose internals)
    // OWASP A04:2021 - Insecure Design
    const clientMessage = status >= 500 ? "Internal Server Error" : message;
    res.status(status).json({ 
      message: clientMessage,
      // Include request ID for support (if implemented)
      ...(req.headers['x-request-id'] && { requestId: req.headers['x-request-id'] })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      // Windows doesn't support SO_REUSEPORT, and Node will throw ENOTSUP.
      ...(process.platform === "win32" ? {} : { reusePort: true }),
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
