// AI-META-BEGIN
// AI-META: Module - vite.config.ts
// OWNERSHIP: root
// ENTRYPOINTS: various
// DEPENDENCIES: check imports
// DANGER: Review changes carefully
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm test
// AI-META-END

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
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
