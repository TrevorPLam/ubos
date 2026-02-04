// AI-META-BEGIN
// AI-META: Test file for frontend.setup.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Frontend test setup file.
 * 
 * This file runs before all frontend tests to:
 * - Configure DOM testing environment
 * - Set up React Testing Library
 * - Configure global test utilities
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required by some Radix UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver (required by some UI components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
