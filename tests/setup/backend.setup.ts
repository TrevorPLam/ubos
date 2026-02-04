/**
 * Backend test setup file.
 * 
 * This file runs before all backend tests to:
 * - Configure test environment variables
 * - Set up global test utilities
 * - Initialize test database helpers
 * - Validate console output (fail on unexpected errors/warnings)
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';

// Track console errors and warnings
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Global setup
beforeAll(async () => {
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
      !msg.includes('expected error')
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

