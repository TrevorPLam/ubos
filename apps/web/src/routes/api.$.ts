import { createFileRoute } from '@tanstack/react-router'

import { apiApp } from '@/server/api'

async function handleApiRequest({ request }: { request: Request }) {
  return apiApp.fetch(request)
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handleApiRequest,
      POST: handleApiRequest,
      PUT: handleApiRequest,
      PATCH: handleApiRequest,
      DELETE: handleApiRequest,
      HEAD: handleApiRequest,
      OPTIONS: handleApiRequest,
    },
  },
})