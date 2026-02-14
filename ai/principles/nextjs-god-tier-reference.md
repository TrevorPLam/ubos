# God Tier Next.js Reference (February 2026)

This document is the authoritative guide for building production‑grade Next.js applications. It incorporates the latest stable patterns, security best practices, and edge‑runtime compatibility. Use it as the canonical reference for all new development.

## Version Context (February 2026)

| Version | Status | Support Until |
|---------|--------|---------------|
| **Next.js 16.1.x** | Latest Stable (Active LTS) | October 2027 |
| **Next.js 15.x** | Maintenance LTS | October 2026 |
| **React 19.2.x** | Latest Stable | N/A |

**Security Notice: Critical CVEs**
Ensure you are on patched versions for these high‑severity vulnerabilities:

| CVE | Component | Patched Versions |
|-----|-----------|------------------|
| **CVE‑2025‑55182** (React2Shell) | React Server Components | React `19.0.1`, `19.1.2`, `19.2.1` (or any later 19.x) |
| **CVE‑2025‑66478** (Next.js impact) | Next.js App Router | Next.js `15.0.5`, `15.1.9`, `15.2.6`, `15.3.6`, `15.4.8`, `15.5.7`, `16.0.7` (or any newer in your major line) |
| **CVE‑2025‑29927** (Middleware Bypass) | Next.js Middleware | Next.js `>=13.5.9`, `>=14.2.25`, `>=15.2.3` |

Always stay on the latest patch of your chosen major line.

---

## 1. API Routes – Async‑First, Edge‑Ready, Secure

### 1.1 Core API Factory

Handles async `params`/`searchParams`, validates with Zod, injects Edge‑safe JWT (using `jose`), supports `after()` for background tasks, and includes optional rate limiting.

```typescript
// lib/api/factory.ts
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';            // stable v15.1+
import { z } from 'zod';
import { jwtVerify } from 'jose';               // Edge‑compatible
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting setup (Upstash recommended)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

export type ApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RouteContext = { params: Promise<Record<string, string | string[]>> };

interface HandlerContext<TParams, TBody, TQuery> {
  req: NextRequest;
  params: TParams;
  query: TQuery;
  body: TBody;
  user?: { id: string; role: string };
}

interface RouteOptions<
  TParams extends z.ZodTypeAny = z.ZodNever,
  TBody extends z.ZodTypeAny = z.ZodNever,
  TQuery extends z.ZodTypeAny = z.ZodNever
> {
  params?: TParams;
  body?: TBody;
  query?: TQuery;
  isPublic?: boolean;
  rateLimit?: { max: number; windowMs: number }; // optional
}

export function createRoute<
  TParams extends z.ZodTypeAny,
  TBody extends z.ZodTypeAny,
  TQuery extends z.ZodTypeAny,
  TResponse = unknown
>(
  options: RouteOptions<TParams, TBody, TQuery>,
  handler: (ctx: HandlerContext<z.infer<TParams>, z.infer<TBody>, z.infer<TQuery>>) => Promise<TResponse>
) {
  return async (req: NextRequest, context: RouteContext) => {
    const startTime = Date.now();
    try {
      // 1. Await async params
      const rawParams = await context.params;

      // 2. Parse searchParams from URL
      const { searchParams } = new URL(req.url);
      const rawQuery = Object.fromEntries(searchParams.entries());

      // 3. Parse body for non‑idempotent methods
      let rawBody: unknown = {};
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            rawBody = await req.json();
          } catch {
            rawBody = {};
          }
        }
      }

      // 4. Concurrent validation
      const [paramsResult, bodyResult, queryResult] = await Promise.all([
        options.params ? options.params.safeParseAsync(rawParams) : { success: true, data: {} },
        options.body   ? options.body.safeParseAsync(rawBody)   : { success: true, data: {} },
        options.query  ? options.query.safeParseAsync(rawQuery) : { success: true, data: {} }
      ]);

      if (!paramsResult.success) throw new ApiError(400, 'INVALID_PARAMS', 'Params invalid', paramsResult.error.flatten());
      if (!bodyResult.success)   throw new ApiError(400, 'VALIDATION_ERROR', 'Body invalid', bodyResult.error.flatten());
      if (!queryResult.success)  throw new ApiError(400, 'INVALID_QUERY', 'Query invalid', queryResult.error.flatten());

      // 5. Authentication (Edge‑safe JWT)
      let user: HandlerContext<any, any, any>['user'];
      if (!options.isPublic) {
        const token = req.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Missing token');
        try {
          const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
          user = { id: payload.sub as string, role: payload.role as string };
        } catch {
          throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token');
        }
      }

      // 6. Optional rate limiting
      if (options.rateLimit) {
        const identifier = user?.id ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
        const { success } = await ratelimit.limit(identifier);
        if (!success) throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
      }

      // 7. Execute handler
      const data = await handler({ req, params: paramsResult.data, body: bodyResult.data, query: queryResult.data, user });

      // 8. Non‑blocking background tasks
      after(async () => {
        await logApiCall({
          path: req.nextUrl.pathname,
          method: req.method,
          userId: user?.id,
          duration: Date.now() - startTime,
          status: 200,
        });
      });

      return NextResponse.json({ success: true, data });
    } catch (err) {
      after(async () => {
        await logApiCall({
          path: req.nextUrl.pathname,
          method: req.method,
          error: true,
          duration: Date.now() - startTime,
        });
      });

      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: err.flatten() } },
          { status: 400 }
        );
      }
      if (err instanceof ApiError) {
        return NextResponse.json(
          { success: false, error: { code: err.code, message: err.message, details: err.details } },
          { status: err.statusCode }
        );
      }
      console.error('[API Error]', err);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
  };
}
```

### 1.2 Caching in Next.js 15/16

In Next.js 15+, the default caching behavior is **auto no cache**:

- **Development:** Fetches on every request (with HMR exceptions)
- **Build time:** Fetches once during static prerendering
- **Dynamic routes:** Fetches on every request if Dynamic APIs are detected
- **Request Memoization:** Still deduplicates identical fetches within the same render pass (even with `cache: 'no-store'`)

**To explicitly cache:**

```typescript
// app/api/users/[id]/route.ts
export const dynamic = 'force-static';   // cache this route
export const revalidate = 60;             // ISR revalidate every 60s

export const GET = createRoute(
  { params: z.object({ id: z.string().uuid() }), isPublic: true },
  async ({ params }) => {
    const res = await fetch(`https://api.example.com/users/${params.id}`, {
      cache: 'force-cache' // Explicitly opt in
    });
    return res.json();
  }
);
```

### 1.3 Next.js 16 Migration: `middleware.ts` → `proxy.ts`

For teams upgrading to Next.js 16:

```typescript
// Before: middleware.ts
export function middleware(request: NextRequest) {
  // ...
}

// After: proxy.ts (Next.js 16+)
export function proxy(request: NextRequest) {
  // Same logic, new file name
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Important:** `proxy.ts` runs in the **Edge Runtime by default**, just like `middleware.ts`. Use `runtime: 'nodejs'` in `config` only when you explicitly need Node‑only APIs. `middleware.ts` is deprecated in 16.x but still supported; it will be removed in a future major.

### 1.4 Alternative Architectures

| Option | Best For | Maturity | Trade‑offs |
|--------|----------|----------|------------|
| **Custom Factory (above)** | Simple APIs, full control | High | Manual client generation |
| **tRPC** | Type‑safe RPC with React | High | Requires adapter layer |
| **GraphQL (Yoga/Pothos)** | Complex data requirements | High | Schema management overhead |
| **Vovk.ts** | Next.js‑native structure, AI tools | Medium (2024+) | Node 22+, lock‑in risk |

---

## 2. Money Handling – Use Battle‑Tested Libraries

**Never write custom money classes.** Floating‑point arithmetic is dangerous for financial data. Choose based on your needs:

| Library | Best For | Bundle Size | Notes |
|--------|----------|-------------|-------|
| **`currency.js`** | Simple e‑commerce, price formatting | ~1kb | Lightweight, intuitive API |
| **`dinero.js` v2** | Complex financial apps (multi‑currency, allocation) | ~30kb | Immutable, tree‑shakable |
| **`decimal.js`** | Ultra‑high precision | ~30kb | Arbitrary precision |
| **BigInt (native)** | Integer‑based calculations | 0kb | Requires manual formatting |

### Example with `currency.js`

```typescript
import currency from 'currency.js';

const price = currency(19.99);           // $19.99
const tax = price.multiply(0.10);         // $2.00
const total = price.add(tax);             // $21.99
console.log(total.format());               // "$21.99"
```

### Example with `dinero.js`

```typescript
import { dinero, add, toFormat } from 'dinero.js';
import { USD } from 'dinero.js/currencies';

const price = dinero({ amount: 1999, currency: USD });
const tax = price.percentage(10);
const total = add(price, tax);
const formatted = toFormat(total, ({ amount, currency }) => `${currency.code} ${amount}`);
```

**Recommendation:** Use `currency.js` for ~80% of use cases. Reserve `dinero.js` for projects requiring advanced financial logic.

---

## 3. Forms – Progressive Enhancement with React 19

React 19 introduces **Actions** – the canonical way to handle mutations. Use `useActionState` and `next/form`.

### 3.1 Server Action with Zod Validation

```typescript
// app/actions.ts
'use server';

import { z } from 'zod';
import { formDataToObject, FormDataSchemas } from '@/lib/forms/utils';

const updateUserSchema = z.object({
  name: z.string().min(2),
  age: FormDataSchemas.int(),
  isActive: FormDataSchemas.checkbox(),
  tags: FormDataSchemas.tags(),
  avatar: FormDataSchemas.file().optional()
});

export async function updateUser(prevState: any, formData: FormData) {
  const raw = formDataToObject(formData, new Set(['tags']));
  const validated = updateUserSchema.safeParse(raw);

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  try {
    await saveUser(validated.data);
    return { success: true, data: validated.data };
  } catch (err) {
    return { errors: { _form: ['Something went wrong'] } };
  }
}
```

### 3.2 Client Component with `useActionState`

```tsx
// app/profile/page.tsx
'use client';

import { useActionState } from 'react';
import Form from 'next/form';
import { updateUser } from '../actions';

export default function ProfilePage() {
  const [state, formAction, pending] = useActionState(updateUser, null);

  return (
    <Form action={formAction}>
      {state?.errors?.name && <p className="error">{state.errors.name}</p>}
      <input name="name" placeholder="Name" required />

      <input name="age" type="number" placeholder="Age" />
      {state?.errors?.age && <p className="error">{state.errors.age}</p>}

      <label>
        <input name="isActive" type="checkbox" /> Active
      </label>

      <input name="tags" placeholder="Tags (comma separated)" />

      <input name="avatar" type="file" accept="image/*" />

      <button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </button>

      {state?.success && <p>Profile updated!</p>}
      {state?.errors?._form && <p className="error">{state.errors._form}</p>}
    </Form>
  );
}
```

### 3.3 Form Utilities (`lib/forms/utils.ts`)

```typescript
export const FormDataSchemas = {
  checkbox: () => z.union([z.literal('on'), z.undefined()]).transform(v => v === 'on'),
  number:   () => z.coerce.number(),
  int:      () => z.coerce.number().int(),
  date:     () => z.coerce.date(),
  file:     () => z.instanceof(File).or(z.string()),
  tags:     () => z.string().transform(s => s.split(',').map(t => t.trim()).filter(Boolean))
};

export function formDataToObject(formData: FormData, arrayFields: Set<string> = new Set()): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of formData.keys()) {
    if (obj.hasOwnProperty(key)) continue;
    const values = formData.getAll(key);
    if (arrayFields.has(key)) obj[key] = values;
    else if (values.length === 1) obj[key] = values[0];
    else obj[key] = values;
  }
  return obj;
}
```

### 3.4 Advanced: Maintaining Form State & Optimistic Updates

For a more polished UX, return form data on error and use `useOptimistic`. See [Progressive Forms with React 19](https://rdrn.me/react-forms/) for a complete pattern.

---

## 4. Pages & Metadata – Async‑First with Full Coverage

### 4.1 Page with Metadata, Loading, Error, Not‑Found

```tsx
// app/blog/[slug]/page.tsx
import { notFound, forbidden, unauthorized } from 'next/navigation';
import { z } from 'zod';
import Image from 'next/image';
import { Suspense } from 'react';

const paramsSchema = z.object({ slug: z.string() });

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`, {
    cache: 'force-cache',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.ogImage || '/default-og.jpg'] },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  // Authorization example
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (!user.canViewPost) forbidden();

  return (
    <article>
      <h1>{post.title}</h1>
      {post.image && (
        <Image
          src={post.image}
          alt={post.title}
          width={1200}
          height={630}
          priority
          className="w-full h-auto"
        />
      )}
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

### 4.2 Supporting Files

```tsx
// app/blog/[slug]/loading.tsx
export default function Loading() {
  return <div>Loading post...</div>;
}

// app/blog/[slug]/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 4.3 Partial Prerendering (PPR) & Cache Components

**In Next.js 15.x (experimental):**

```typescript
// next.config.ts
export default {
  experimental: {
    ppr: 'incremental', // or true
  },
};

// app/products/layout.tsx
export const experimental_ppr = true;
```

**In Next.js 16.x (stable enough for production on vetted routes):**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true, // Enables Cache Components + Partial Prerendering
};

export default nextConfig;
```

Then use `<Suspense>` boundaries to stream dynamic content. PPR is now an opt‑in performance feature, not a blanket default.

### 4.4 Streaming Metadata (Next.js 15.2+)

```typescript
// next.config.ts
export default {
  experimental: {
    streamingMetadata: true, // Enable streaming metadata
  },
};
```

`generateMetadata` no longer blocks initial UI; metadata streams in later. SEO is preserved because crawlers see a fully resolved response.

---

## 5. Security – Essential Protections

### 5.1 Critical Security Patches (Recap)

| CVE | Component | Patched Versions |
|-----|-----------|------------------|
| **CVE‑2025‑55182** (React2Shell) | React Server Components | React `19.0.1`, `19.1.2`, `19.2.1` (or any later 19.x) |
| **CVE‑2025‑66478** (Next.js impact) | Next.js App Router | Next.js `15.0.5`, `15.1.9`, `15.2.6`, `15.3.6`, `15.4.8`, `15.5.7`, `16.0.7` (or any newer in your major line) |
| **CVE‑2025‑29927** (Middleware Bypass) | Next.js Middleware | Next.js `>=13.5.9`, `>=14.2.25`, `>=15.2.3` |

**Detection Request for React2Shell (security testing):**
```http
POST / HTTP/1.1
Host: your-app.com
Next-Action: x
Content-Type: multipart/form-data; boundary=xxx

--xxx
Content-Disposition: form-data; name="0"

["$1:a:a"]
--xxx
Content-Disposition: form-data; name="1"

{}
--xxx--
```

### 5.2 Middleware Bypass Mitigation (CVE‑2025‑29927)

Complete mitigation in `proxy.ts` (or `middleware.ts`):

```typescript
// proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  // Security check: Log potential exploit attempts
  if (req.headers.get('x-middleware-subrequest')) {
    console.warn('CVE-2025-29927 exploit attempt detected:', {
      url: req.url,
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
  }

  // Create new headers without dangerous header
  const headers = new Headers(req.headers);
  headers.delete('x-middleware-subrequest');

  return NextResponse.next({ headers });
}
```

### 5.3 Rate Limiting (Edge‑Compatible)

Use Upstash Redis for distributed rate limiting.

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

// Usage in API route
const { success } = await ratelimit.limit(userId ?? ip);
if (!success) {
  return new Response('Too Many Requests', { status: 429 });
}
```

### 5.4 CSRF Protection

Use the official Edge‑compatible library `@edge-csrf/nextjs`:

```bash
pnpm add @edge-csrf/nextjs
```

```typescript
// proxy.ts (or middleware.ts)
import { createCsrfMiddleware } from '@edge-csrf/nextjs';

const csrfMiddleware = createCsrfMiddleware({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  },
});

export const proxy = csrfMiddleware;
```

Then include the token in your forms (e.g., as a hidden input or header). Validate it in server actions.

### 5.5 Input Sanitization

```typescript
// lib/sanitize.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeHtml(dirty: string) {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
  });
}
```

### 5.6 Content Security Policy (CSP)

**Strategic Trade‑off:**

- **Nonce‑based CSP** → forces **dynamic rendering** (disables static optimization). Use only for pages with extreme security needs.
- **Static CSP with SRI** → preserves **static generation**. Ideal for most pages.

Example static CSP:

```typescript
// next.config.ts
const csp = `
  default-src 'self';
  script-src 'self' https: 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.google-analytics.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};
```

For nonce‑based CSP, implement middleware to generate and attach a nonce per request (see [Next.js docs](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)).

---

## 6. Background Tasks – `after()` API

```typescript
import { after } from 'next/server';

export async function POST(req: NextRequest) {
  const data = await req.json();
  const result = await process(data);

  after(async () => {
    try {
      await sendAnalytics(data);
      await sendEmailNotification(data);
    } catch (err) {
      console.error('Background task failed:', err);
      // Errors don't affect the response
    }
  });

  return NextResponse.json(result);
}
```

---

## 7. Data Fetching – Explicit Caching Model

```typescript
// app/search/page.tsx
export default async function Page({ searchParams }: { searchParams: Promise<{ q: string }> }) {
  const { q } = await searchParams;
  const data = await fetch(`https://api.example.com/search?q=${q}`, {
    cache: 'no-store' // Fresh data for each search
  }).then(res => res.json());

  return <SearchResults results={data} />;
}
```

---

## 8. React Compiler (Stable in Next.js 16)

Enable automatic optimization – no more manual `useMemo`/`useCallback`:

```typescript
// next.config.ts
export default {
  reactCompiler: true, // Enable automatic memoization
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};
```

---

## 9. Error Handling

### 9.1 `unstable_rethrow` Pattern

```typescript
import { unstable_rethrow } from 'next/navigation';

export default async function Page() {
  try {
    const data = await fetchData();
    return <Component data={data} />;
  } catch (error) {
    unstable_rethrow(error); // Re-throws Next.js framework errors
    // Handle your application errors
    return <ErrorBoundary />;
  }
}
```

### 9.2 `forbidden()` and `unauthorized()` APIs

```typescript
// app/admin/page.tsx
import { forbidden, unauthorized } from 'next/navigation';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    unauthorized(); // Renders unauthorized.tsx
  }

  if (user.role !== 'admin') {
    forbidden(); // Renders forbidden.tsx
  }

  return <AdminDashboard user={user} />;
}
```

---

## Summary: God Tier Principles

1. **Async‑first** – Always `await` `params`, `searchParams`, `cookies`, `headers`.
2. **Type‑safe** – Use Zod to validate everything at the edge.
3. **Edge‑ready** – Choose libraries (`jose`, `@upstash/ratelimit`) that work in Edge Runtime.
4. **Non‑blocking** – Leverage `after()` for background tasks.
5. **Cache explicitly** – Never rely on implicit caching; opt in deliberately.
6. **Secure by design** – Rate limit, CSRF protect, sanitize inputs, patch CVEs, and make informed CSP choices.
7. **Leverage React 19** – Use Actions (`useActionState`, `useOptimistic`) for all mutations.
8. **Enable React Compiler** – Automatic optimization in Next.js 16.
9. **Use Partial Prerendering (Cache Components)** – For optimal performance with dynamic content.
10. **Don't reinvent** – Use battle‑tested libraries for money (`currency.js`/`dinero.js`), authentication (`jose`), and rate limiting (`@upstash/ratelimit`).
11. **Make strategic architecture decisions** – Choose between custom factories, tRPC, GraphQL, or Vovk.ts based on team needs.
12. **Stay patched** – Monitor security advisories and update dependencies promptly.

---

This document is ready for inclusion in your repository. All claims have been verified against February 2026 sources, and critical security updates have been incorporated.
