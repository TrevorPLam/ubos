import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['profile-validation-unit.test.ts'],
    setupFiles: [], // No setup files to avoid database dependency
  },
});
