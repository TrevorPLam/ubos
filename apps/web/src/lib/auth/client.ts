import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

function getAuthBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  const serverBaseUrl = process.env.BETTER_AUTH_URL ?? process.env.BASE_URL ?? 'http://localhost:3000'
  return serverBaseUrl.replace(/\/$/, '')
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [organizationClient()],
})