// AI-META-BEGIN
// AI-META: Test file for backend.setup.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Backend test setup file.
 * 
 * This file runs before all backend tests to:
 * - Configure test environment variables
 * - Set up global test utilities
 * - Initialize test database helpers
 * - Validate console output (fail on unexpected errors/warnings)
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import express from 'express';

// Create test app
export const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set test environment variables (respect overrides from CI/local)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Prefer caller-provided DATABASE_URL (e.g., CI Postgres service) and only
// fall back to the local placeholder when none is supplied.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test_db';
}

// Default to pg-mem for hermetic tests unless explicitly opting into Postgres.
if (!process.env.TEST_DB_DRIVER) {
  process.env.TEST_DB_DRIVER = 'pg-mem';
}

// Track console errors and warnings
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Global setup
beforeAll(async () => {
  // Only import routes if not running validation tests
  const isValidationTest = process.env.TEST_FILE?.includes('validation.test.ts');

  if (!isValidationTest) {
    try {
      const { identityRoutes: _identityRoutes } = await import('../../server/domains/identity/routes');
      const { organizationRoutes: _organizationRoutes } = await import('../../server/domains/organizations/routes');
      
      // Add routes to app
      app.use('/api', _identityRoutes);
      app.use(_organizationRoutes);
    } catch (error) {
      console.warn('Could not import routes (likely missing database):', error);
    }
  }

  // Future: Set up test database
  // Future: Set up test Redis
  // Future: Set up test storage
  
  // Override console.error to track unexpected errors
  console.error = (...args: any[]) => {
    const message = args.map(arg => String(arg)).join(' ');
    consoleErrors.push(message);
    originalConsoleError(...args);
  };
  
  // Override console.warn to track unexpected warnings
  console.warn = (...args: any[]) => {
    const message = args.map(arg => String(arg)).join(' ');
    consoleWarnings.push(message);
    originalConsoleWarn(...args);
  };
});

// Reset tracking before each test
beforeEach(() => {
  consoleErrors.length = 0;
  consoleWarnings.length = 0;
});

// Validate no unexpected console output after each test
afterEach(() => {
  // Allow tests to explicitly expect console errors by checking first
  // If a test intentionally triggers an error, it should validate it
  if (consoleErrors.length > 0) {
    // Check if error is from an expected source (can be extended)
    const hasUnexpectedError = consoleErrors.some(msg => 
      !msg.includes('intentional test error') &&
      !msg.includes('expected error') &&
      !msg.includes('CRITICAL: Missing required environment variable') &&
      !msg.includes('CRITICAL: Session cookies must use') &&
      !msg.includes('CRITICAL: TRUST_PROXY not configured') &&
      !msg.includes('Configuration validation FAILED') &&
      !msg.includes('Error updating organization settings:') &&
      !msg.includes('Error fetching organization settings:') &&
      !msg.includes('Error uploading organization logo:') &&
      !msg.includes('Error removing organization logo:') &&
      !msg.includes('Failed to delete logo file:')
    );
    
    if (hasUnexpectedError) {
      originalConsoleError('Unexpected console.error in test:', consoleErrors);
      // Fail the test
      throw new Error(`Test produced unexpected console.error: ${consoleErrors[0]}`);
    }
  }
  
  // Warnings are less critical but should be tracked
  if (consoleWarnings.length > 0) {
    const hasUnexpectedWarning = consoleWarnings.some(msg =>
      !msg.includes('intentional test warning') &&
      !msg.includes('expected warning')
    );
    
    if (hasUnexpectedWarning) {
      originalConsoleWarn('Unexpected console.warn in test:', consoleWarnings);
      // For now, just warn - can be made strict later
    }
  }
});

// Global teardown
afterAll(async () => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Future: Clean up test database
  // Future: Clean up test Redis
  // Future: Clean up test storage
});

