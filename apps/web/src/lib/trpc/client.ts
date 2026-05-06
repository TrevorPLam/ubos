import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

import type { AppRouter } from '@/server/trpc/router'

let trpcClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | undefined

export function getTrpcClient() {
  if (!trpcClient) {
    trpcClient = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            if (typeof window === 'undefined') {
              return {}
            }

            const tenantId = window.localStorage.getItem('tenantId')
            return tenantId ? { 'x-tenant-id': tenantId } : {}
          },
        }),
      ],
    })
  }

  return trpcClient
}