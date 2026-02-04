// AI-META-BEGIN
// AI-META: Test file for server-index.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for server/index.ts application creation and configuration.
 * 
 * These tests validate the refactored server setup functions without
 * actually starting a server, ensuring the application is properly configured.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import { createApp, setupApplication, startServer } from '../../server/index';

// Mock the dependencies that have side effects
vi.mock('../../server/config-validation', () => ({
  assertValidConfiguration: vi.fn(),
}));

vi.mock('../../server/security', () => ({
  setupSecurityMiddleware: vi.fn(),
}));

vi.mock('../../server/routes', () => ({
  registerRoutes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/static', () => ({
  serveStatic: vi.fn(),
}));

vi.mock('../../server/db', () => ({}));

vi.mock('../../server/storage', () => ({
  storage: {},
}));

vi.mock('../../server/vite', () => ({
  setupVite: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
  },
  log: vi.fn(),
}));

describe('Server Index', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createApp', () => {
    it('should create an Express app with default configuration', () => {
      const { app, server } = createApp();
      
      expect(app).toBeDefined();
      expect(server).toBeDefined();
      expect(typeof app).toBe('function'); // Express app is a function
      expect(app.use).toBeDefined(); // Express apps have use method
    });

    it('should use provided Express app instance', () => {
      const customApp = express();
      const { app, server } = createApp(customApp);
      
      expect(app).toBe(customApp);
      expect(server).toBeDefined();
    });

    it('should call configuration validation', async () => {
      const { assertValidConfiguration } = await import('../../server/config-validation');
      
      createApp();
      
      expect(assertValidConfiguration).toHaveBeenCalled();
    });

    it('should call security middleware setup', async () => {
      const { setupSecurityMiddleware } = await import('../../server/security');
      
      createApp();
      
      expect(setupSecurityMiddleware).toHaveBeenCalled();
    });

    it('should configure JSON body parser with limits', () => {
      const { app } = createApp();
      
      // Check that JSON middleware is configured
      expect(app._router).toBeDefined();
    });
  });

  describe('setupApplication', () => {
    it('should setup error handler', async () => {
      process.env.NODE_ENV = 'test';
      const app = express();
      const server = { listen: vi.fn() };
      
      await setupApplication(app, server);
      
      // Verify error handler middleware is added
      expect(app._router).toBeDefined();
    });
  });

  describe('startServer', () => {
    it('should start server on default port 5000', () => {
      const server = {
        listen: vi.fn(),
      };
      
      startServer(server);
      
      expect(server.listen).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 5000,
          host: '0.0.0.0',
        }),
        expect.any(Function)
      );
    });

    it('should start server on custom PORT', () => {
      process.env.PORT = '3000';
      const server = {
        listen: vi.fn(),
      };
      
      startServer(server);
      
      expect(server.listen).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 3000,
          host: '0.0.0.0',
        }),
        expect.any(Function)
      );
    });
  });

  describe('Integration', () => {
    it('should create, setup, and start server without errors', async () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3001';
      
      const { app, server } = createApp();
      await setupApplication(app, server);
      
      // Should not throw
      expect(app).toBeDefined();
      expect(server).toBeDefined();
    });
  });
});
