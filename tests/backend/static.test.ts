// AI-META-BEGIN
// AI-META: Test file for static.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for static file serving.
 * 
 * These tests validate the production static file server functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import { serveStatic } from '../../server/static';
import fs from 'fs';
import path from 'path';

// Mock fs and path
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

vi.mock('path', () => ({
  default: {
    resolve: vi.fn((...args: string[]) => args.join('/')),
  },
}));

describe('Static File Server', () => {
  let app: express.Express;
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    mockFs = vi.mocked(fs);
    mockPath = vi.mocked(path);
  });

  describe('serveStatic', () => {
    it('should throw error when build directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockPath.resolve.mockReturnValue('/server/public');

      expect(() => {
        serveStatic(app);
      }).toThrow('Could not find the build directory: /server/public, make sure to build the client first');
    });

    it('should configure static middleware when build directory exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockPath.resolve.mockReturnValue('/server/public');

      const staticSpy = vi.spyOn(app, 'use');

      serveStatic(app);

      expect(mockFs.existsSync).toHaveBeenCalledWith('/server/public');
      expect(staticSpy).toHaveBeenCalled();
    });

    it('should configure fallback to index.html', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockPath.resolve.mockReturnValue('/server/public');

      const useSpy = vi.spyOn(app, 'use');

      serveStatic(app);

      // Should be called twice: once for static middleware, once for fallback
      expect(useSpy).toHaveBeenCalledTimes(2);
      expect(useSpy).toHaveBeenCalledWith('*', expect.any(Function));
    });

    it('should resolve correct path', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockPath.resolve.mockReturnValue('/server/public');

      serveStatic(app);

      expect(mockPath.resolve).toHaveBeenCalledWith(expect.any(String), 'public');
    });
  });

  describe('Fallback handler', () => {
    it('should configure fallback middleware', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockPath.resolve.mockReturnValue('/server/public');

      const useSpy = vi.spyOn(app, 'use');

      serveStatic(app);

      // Should be called twice: once for static middleware, once for fallback
      expect(useSpy).toHaveBeenCalledTimes(2);
      
      // Check that the second call is for the fallback handler
      const fallbackCall = useSpy.mock.calls[1];
      expect(fallbackCall[0]).toBe('*');
      expect(typeof fallbackCall[1]).toBe('function');
    });
  });
});
