import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { getAuth } from '@ubos/auth'
import { tenant } from '@ubos/db'
import { trpcServer } from '@hono/trpc-server'
import { createHonoMiddleware } from '@usebetterdev/tenant/hono'
import { generateOpenAPIDocument } from '@trpc/openapi'
import { Hono, type Context } from 'hono'

import { listLeadBoard } from './crm/repository'
import { createTrpcContext } from './trpc/context'
import { appRouter } from './trpc/router'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const routerSourcePath = path.resolve(__dirname, './trpc/router.ts')

export const apiApp = new Hono().basePath('/api')

if (tenant) {
  const tenantMiddleware = createHonoMiddleware(tenant)

  apiApp.use('/crm/*', tenantMiddleware)
  apiApp.use('/rest/crm/*', tenantMiddleware)
  apiApp.use('/trpc/*', tenantMiddleware)
}

apiApp.get('/health', (c) => c.json({ ok: true }))

apiApp.get('/crm/leads', async (c) => {
  const data = await listLeadBoard(c.req.header('x-tenant-id') ?? null)
  return c.json(data)
})

apiApp.get('/rest/crm/leads', async (c) => {
  const data = await listLeadBoard(c.req.header('x-tenant-id') ?? null)
  return c.json(data)
})

apiApp.use(
  '/trpc/*',
  trpcServer({
    endpoint: '/api/trpc',
    router: appRouter,
    createContext: async (_opts: FetchCreateContextFnOptions, c: Context) => {
      return createTrpcContext({
        headers: c.req.raw.headers,
        tenantId: c.req.header('x-tenant-id') ?? null,
      })
    },
  })
)

apiApp.get('/openapi.json', async (c) => {
  const document = await generateOpenAPIDocument(routerSourcePath, {
    exportName: 'appRouter',
    title: 'UBOS API',
    version: '0.1.0',
  })

  return c.json(document)
})

apiApp.all('/auth/*', async (c) => {
  const auth = getAuth()

  if (!auth) {
    return c.json(
      {
        error: 'Auth is unavailable because DATABASE_URL is not configured.',
      },
      503
    )
  }

  return auth.handler(c.req.raw)
})