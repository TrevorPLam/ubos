import { getServerSession, isAuthEnabled } from '@ubos/auth'

export async function createTrpcContext(options: {
  headers: Headers
  tenantId: string | null
}) {
  const session = await getServerSession(options.headers)
  const authEnabled = isAuthEnabled()

  return {
    authEnabled,
    headers: options.headers,
    session,
    tenantId: session?.session.activeOrganizationId ?? options.tenantId,
    userId: session?.user.id ?? null,
  }
}

export type TrpcContext = Awaited<ReturnType<typeof createTrpcContext>>