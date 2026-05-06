import { getDb, isDatabaseConfigured } from '@ubos/db'
import {
  accountsTable,
  invitationsTable,
  membersTable,
  organizationsTable,
  sessionsTable,
  usersTable,
  verificationsTable,
} from '@ubos/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

const authSecret = process.env.BETTER_AUTH_SECRET ?? 'development-insecure-secret'
const authBaseUrl = (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const authSchema = {
  users: usersTable,
  sessions: sessionsTable,
  accounts: accountsTable,
  verifications: verificationsTable,
  organizations: organizationsTable,
  members: membersTable,
  invitations: invitationsTable,
} as const

function organizationPlugin() {
  return organization({
    allowUserToCreateOrganization: true,
    schema: {
      organization: {
        modelName: 'organizations',
      },
      member: {
        modelName: 'members',
      },
      invitation: {
        modelName: 'invitations',
      },
    },
  })
}

function buildAuth() {
  return betterAuth({
    baseURL: authBaseUrl,
    secret: authSecret,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: authSchema,
      camelCase: true,
    }),
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    user: {
      modelName: 'users',
    },
    session: {
      modelName: 'sessions',
    },
    account: {
      modelName: 'accounts',
    },
    verification: {
      modelName: 'verifications',
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      tanstackStartCookies(),
      organizationPlugin(),
    ],
  })
}

let authInstance: ReturnType<typeof buildAuth> | null | undefined

export function getAuth() {
  if (authInstance !== undefined) {
    return authInstance
  }

  if (!isDatabaseConfigured()) {
    authInstance = null
    return authInstance
  }

  authInstance = buildAuth()

  return authInstance
}

export function isAuthEnabled() {
  return getAuth() !== null
}

export async function getServerSession(headers: Headers) {
  const auth = getAuth()

  if (!auth) {
    return null
  }

  try {
    return await auth.api.getSession({ headers } as never)
  } catch {
    return null
  }
}

export async function getSessionSnapshot(headers: Headers) {
  if (!isAuthEnabled()) {
    return {
      authEnabled: false,
      isAuthenticated: false,
      activeOrganizationId: null,
      user: null,
    }
  }

  const session = await getServerSession(headers)

  return {
    authEnabled: true,
    isAuthenticated: session !== null,
    activeOrganizationId: session?.session.activeOrganizationId ?? null,
    user: session?.user ?? null,
  }
}