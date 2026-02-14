/**
 * @ai-pattern API Route
 * @ai-security Input Validated
 * @ai-performance Server Only
 * @ai-tests Required
 * @ai-reference /ai/patterns/api-route-pattern.md
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { createMiddleware, requireAuth, validateRequest, errorHandler } from '@/lib/middleware';

// Request/Response schemas
const CreateUserRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user'),
});

const CreateUserResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    createdAt: z.string(),
  }),
  message: z.string(),
});

const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string(),
  details: z.any().optional(),
  code: z.string(),
});

// Route handler factory
function createRouteHandler<TRequest, TResponse>({
  method,
  requestSchema,
  responseSchema,
  handler,
  middleware = [],
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestSchema?: z.ZodSchema<TRequest>;
  responseSchema: z.ZodSchema<TResponse>;
  handler: (req: NextRequest, data: TRequest) => Promise<TResponse>;
  middleware?: Function[];
}) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Method validation
    if (req.method !== method) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: `Method ${req.method} not allowed`,
          code: 'METHOD_NOT_ALLOWED',
        }),
        { status: 405 }
      );
    }

    try {
      // Apply middleware chain
      const middlewareChain = createMiddleware(
        rateLimit,
        ...middleware,
        errorHandler
      );

      const res = new NextResponse();
      await middlewareChain(req, res);

      // Check if middleware failed
      if (res.headers.get('content-type') === 'application/json') {
        return res; // Error response from middleware
      }

      // Parse and validate request
      let requestData: TRequest = {} as TRequest;
      
      if (requestSchema && method !== 'GET') {
        const body = await req.json();
        requestData = requestSchema.parse(body);
      } else if (method === 'GET') {
        const url = new URL(req.url);
        const params = Object.fromEntries(url.searchParams);
        requestData = requestSchema?.parse(params) ?? ({} as TRequest);
      }

      // Execute business logic
      const result = await handler(req, requestData);

      // Validate response
      const validatedResponse = responseSchema.parse(result);

      return NextResponse.json(validatedResponse, { status: 200 });

    } catch (error) {
      console.error('Route handler error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          ErrorResponseSchema.parse({
            error: 'Validation failed',
            details: error.errors,
            code: 'VALIDATION_ERROR',
          }),
          { status: 400 }
        );
      }

      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        }),
        { status: 500 }
      );
    }
  };
}

// Business logic functions
async function createUser(req: NextRequest, data: CreateUserRequestSchema): Promise<z.infer<typeof CreateUserResponseSchema>> {
  const userId = req.headers.get('x-user-id')!;
  
  // Business logic here
  const user = await userService.create({
    name: data.name,
    email: data.email,
    role: data.role,
    createdBy: userId,
  });

  return {
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    message: 'User created successfully',
  };
}

async function getUsers(req: NextRequest, data: any): Promise<any> {
  const { page = 1, limit = 10, search = '' } = data;
  
  const users = await userService.list({
    page: parseInt(page),
    limit: parseInt(limit),
    search,
  });

  return {
    success: true,
    data: users,
    message: 'Users retrieved successfully',
  };
}

// Export route handlers
export const POST = createRouteHandler({
  method: 'POST',
  requestSchema: CreateUserRequestSchema,
  responseSchema: CreateUserResponseSchema,
  handler: createUser,
  middleware: [requireAuth],
});

export const GET = createRouteHandler({
  method: 'GET',
  requestSchema: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional().default(''),
  }),
  responseSchema: z.object({
    success: z.boolean(),
    data: z.object({
      users: z.array(CreateUserResponseSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
    message: z.string(),
  }),
  handler: getUsers,
  middleware: [requireAuth],
});
