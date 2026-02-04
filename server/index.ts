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
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security middleware must be applied before body parsers
// This includes CORS, security headers, and rate limiting
// See server/security.ts for implementation details
setupSecurityMiddleware(app);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      // Keep the exact bytes around for webhook signature verification.
      // This is intentionally set before JSON parsing mutates the payload.
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log full error details internally for debugging
    // Never send stack traces or detailed errors to clients in production
    if (process.env.NODE_ENV !== "production") {
      log(`Error: ${message}\nStack: ${err.stack}`);
    } else {
      // In production, log errors but don't include sensitive details in response
      log(`Error ${status}: ${message}`);
    }

    // Send sanitized error to client (no stack traces, internal details)
    // Security: Prevent information disclosure (OWASP A01:2021)
    res.status(status).json({ 
      message: status >= 500 ? "Internal Server Error" : message 
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
