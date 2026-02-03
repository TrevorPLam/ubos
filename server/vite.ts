/**
 * Development-only Vite integration.
 *
 * In dev we mount Vite in middleware mode, and let it serve/transform `client/index.html`.
 * This keeps the server as the single origin for both API + client while still supporting HMR.
 *
 * Important: this file installs a catch-all `app.use("*")` handler, so it must be mounted
 * AFTER all API routes (see `server/index.ts`).
 */

import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,

    // Re-use the same HTTP server so HMR uses the existing listener/port.
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // Always read index.html from disk so edits are reflected without restarting.
      // (Vite transforms the template after this.)
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Cache-bust the entrypoint so the browser picks up changes reliably.
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
