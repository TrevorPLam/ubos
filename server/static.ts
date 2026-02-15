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

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve built client files
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
