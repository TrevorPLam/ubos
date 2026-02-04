/**
 * Vitest configuration for backend and shared code tests.
 * 
 * This config handles:
 * - Server-side tests (Express routes, storage layer, utilities)
 * - Shared code tests (schema validation, types)
 * - Node.js environment (no DOM)
 * 
 * Path aliases match tsconfig.json for consistent imports.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    name: 'backend',
    environment: 'node',
    include: [
      'server/**/*.test.ts',
      'shared/**/*.test.ts',
      'tests/backend/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'client/**/*',
      '*.config.*',
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['server/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        'server/**/*.test.ts',
        'shared/**/*.test.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/node_modules/**',
      ],
    },
    setupFiles: ['./tests/setup/backend.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(currentDir, 'client', 'src'),
      '@shared': path.resolve(currentDir, 'shared'),
    },
  },
});
