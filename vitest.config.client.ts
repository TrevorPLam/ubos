// AI-META-BEGIN
// AI-META: Test file for vitest.config.client.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Vitest configuration for frontend (React) tests.
 * 
 * This config handles:
 * - React component tests
 * - Hook tests
 * - Frontend utility tests
 * - Browser/DOM environment via happy-dom
 * 
 * Uses @testing-library/react for component testing.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'frontend',
    environment: 'happy-dom',
    include: [
      'client/**/*.test.ts',
      'client/**/*.test.tsx',
      'tests/frontend/**/*.test.ts',
      'tests/frontend/**/*.test.tsx',
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'server/**/*',
      '*.config.*',
    ],
    globals: true,
    // Fail if focused tests are found (prevents accidentally committing .only)
    allowOnly: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['client/src/**/*.{ts,tsx}'],
      exclude: [
        'client/**/*.test.{ts,tsx}',
        '**/*.d.ts',
        '**/*.config.*',
        '**/node_modules/**',
        'client/src/components/ui/**/*', // shadcn/ui components - tested by library
      ],
    },
    setupFiles: ['./tests/setup/frontend.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(currentDir, 'client', 'src'),
      '@shared': path.resolve(currentDir, 'shared'),
    },
  },
});
