/**
 * @ai-pattern Middleware Pattern
 * @ai-security Input Validated
 * @ai-performance Server Only
 * @ai-tests Required
 * @ai-reference /ai/patterns/middleware-pattern.md
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// Middleware type definition
type Middleware = (
  req: NextRequest,
  res: NextResponse,
  next: () => Promise<void>
) => Promise<void>;

// Middleware factory for composition
function createMiddleware(...middlewares: Middleware[]) {
  return async (req: NextRequest, res: NextResponse): Promise<void> => {
    for (const middleware of middlewares) {
      await middleware(req, res, async () => {});
      if (res.headers.get('x-error')) {
        return; // Stop execution if error occurred
      }
    }
  };
}

// Authentication middleware
async function requireAuth(req: NextRequest, res: NextResponse): Promise<void> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    res.headers.set('x-error', 'Unauthorized');
    res.headers.set('x-error-status', '401');
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.headers.set('x-user-id', payload.sub);
    req.headers.set('x-user-role', payload.role);
  } catch {
    res.headers.set('x-error', 'Invalid token');
    res.headers.set('x-error-status', '401');
  }
}

// Role-based authorization middleware
function requireRole(requiredRole: string): Middleware {
  return async (req: NextRequest, res: NextResponse): Promise<void> => {
    const userRole = req.headers.get('x-user-role');
    
    if (!userRole || userRole !== requiredRole) {
      res.headers.set('x-error', 'Forbidden');
      res.headers.set('x-error-status', '403');
    }
  };
}

// Request validation middleware
function validateRequest<T>(schema: z.ZodSchema<T>): Middleware {
  return async (req: NextRequest, res: NextResponse): Promise<void> => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      req.headers.set('x-validated-body', JSON.stringify(validated));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.headers.set('x-error', 'Validation failed');
        res.headers.set('x-error-details', JSON.stringify(error.errors));
        res.headers.set('x-error-status', '400');
      } else {
        res.headers.set('x-error', 'Invalid request format');
        res.headers.set('x-error-status', '400');
      }
    }
  };
}

// Rate limiting middleware
async function rateLimit(req: NextRequest, res: NextResponse): Promise<void> {
  const clientId = req.ip || 'unknown';
  const key = `rate_limit:${clientId}`;
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  
  if (current > 100) { // 100 requests per minute
    res.headers.set('x-error', 'Rate limit exceeded');
    res.headers.set('x-error-status', '429');
    res.headers.set('x-retry-after', '60');
  }
}

// Error handling middleware
async function errorHandler(req: NextRequest, res: NextResponse): Promise<void> {
  const error = res.headers.get('x-error');
  const status = res.headers.get('x-error-status') || '500';
  const details = res.headers.get('x-error-details');
  
  if (error) {
    // Log error for debugging
    console.error('Request error:', {
      error,
      status,
      details,
      path: req.url,
      method: req.method,
    });
    
    // Return standardized error response
    const errorResponse = {
      error,
      status: parseInt(status),
      ...(details && { details: JSON.parse(details) }),
    };
    
    res.headers.set('content-type', 'application/json');
    res.headers.delete('x-error');
    res.headers.delete('x-error-status');
    res.headers.delete('x-error-details');
    
    return new Response(JSON.stringify(errorResponse), {
      status: parseInt(status),
      headers: res.headers,
    });
  }
}

// Export middleware functions
export {
  createMiddleware,
  requireAuth,
  requireRole,
  validateRequest,
  rateLimit,
  errorHandler,
};
