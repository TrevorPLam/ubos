import { createLogger, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger();
const originalWarnOnce = logger.warnOnce;

logger.warnOnce = (msg, options) => {
  if (
    typeof msg === "string" &&
    msg.includes("A PostCSS plugin did not pass the `from` option")
  ) {
    return;
  }

  return originalWarnOnce.call(logger, msg, options as any);
};

export default defineConfig({
  customLogger: logger,
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(currentDir, "client", "src"),
      "@shared": path.resolve(currentDir, "shared"),
    },
  },
  root: path.resolve(currentDir, "client"),
  build: {
    outDir: path.resolve(currentDir, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
