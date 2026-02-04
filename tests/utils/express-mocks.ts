/**
 * Mock utilities for testing Express routes and middleware.
 * 
 * Provides helpers to create mock Request/Response objects and
 * test Express middleware without needing a real server.
 */

import type { Request, Response, NextFunction } from 'express';

interface MockRequestOptions {
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  user?: { id: string; email: string };
  orgId?: string;
}

/**
 * Create a mock Express Request object for testing.
 */
export function mockRequest(options: MockRequestOptions = {}): Partial<Request> {
  const req: Partial<Request> = {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    cookies: options.cookies || {},
    get: function (name: string): string | undefined {
      const headers = this.headers as Record<string, string>;
      return headers?.[name.toLowerCase()];
    } as any,
  };

  // Add user to request if provided (simulates auth middleware)
  if (options.user) {
    (req as any).user = options.user;
  }

  // Add orgId to request if provided (simulates org resolution)
  if (options.orgId) {
    (req as any).orgId = options.orgId;
  }

  return req;
}

/**
 * Create a mock Express Response object for testing.
 */
export function mockResponse(): Partial<Response> & {
  statusCode: number;
  body: any;
} {
  const res: any = {
    statusCode: 200,
    body: null,
    status: function (code: number) {
      this.statusCode = code;
      return this;
    },
    json: function (data: any) {
      this.body = data;
      return this;
    },
    send: function (data: any) {
      this.body = data;
      return this;
    },
    setHeader: function () {
      return this;
    },
    cookie: function () {
      return this;
    },
    clearCookie: function () {
      return this;
    },
  };

  return res;
}

/**
 * Create a mock Express NextFunction for testing middleware.
 */
export function mockNext(): NextFunction & { called: boolean; error: any } {
  let called = false;
  let error: any = null;

  const next = ((err?: any) => {
    called = true;
    if (err) {
      error = err;
    }
  }) as any;

  // Add properties for assertion
  Object.defineProperty(next, 'called', {
    get: () => called,
  });
  
  Object.defineProperty(next, 'error', {
    get: () => error,
  });

  return next;
}

/**
 * Helper to test middleware functions.
 */
export async function testMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void | Promise<void>,
  reqOptions: MockRequestOptions = {}
) {
  const req = mockRequest(reqOptions);
  const res = mockResponse();
  const next = mockNext();

  await middleware(req as Request, res as Response, next);

  return { req, res, next };
}
