// AI-META-BEGIN
// AI-META: Production static file serving
// OWNERSHIP: server/static
// ENTRYPOINTS: server/index.ts (prod)
// DEPENDENCIES: express
// DANGER: Directory traversal risk
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: manual testing
// AI-META-END

/**
 * Production static file server.
 *
 * In production we serve the built client from `server/public`.
 * Any unknown route falls through to `index.html` to support client-side routing.
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { getSecureFilePath } from "./services/file-storage";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve built client files
  app.use(express.static(distPath));

  // Serve uploaded files with security validation
  // 2026 best practice: Secure file serving with path traversal prevention
  app.use('/uploads', (req, res, _next) => {
    try {
      // Extract path components: /uploads/category/organizationId/filename
      const pathParts = req.path.split('/').filter(Boolean);
      
      if (pathParts.length !== 3) {
        return res.status(400).json({ error: 'Invalid file path format' });
      }

      const [category, organizationId, filename] = pathParts;
      
      // Validate path components using the FileStorageService security function
      const securePath = getSecureFilePath(category as any, organizationId, filename);
      
      // Check if file exists
      if (!fs.existsSync(securePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Serve the file with proper MIME type
      res.sendFile(securePath);
    } catch (error) {
      console.error('File serving error:', error);
      res.status(400).json({ error: 'Invalid file request' });
    }
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
