import * as React from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { MainLayout } from '@/components/layout/MainLayout'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth/client'
import { getAuthState } from '@/lib/auth/session.functions'
import NotFoundPage from '@/pages/not-found'
import appCss from '../styles.css?url'

const publicPaths = ['/signin', '/signup']

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const authState = await getAuthState()
    const isPublicPath = publicPaths.some((path) => location.pathname.startsWith(path))

    if (!authState.authEnabled) {
      return
    }

    if (!authState.isAuthenticated && !isPublicPath) {
      throw redirect({
        to: '/signin',
      })
    }

    if (authState.isAuthenticated && isPublicPath) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Apex Unified Suite',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootApp,
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootApp() {
  const [queryClient] = React.useState(() => new QueryClient())
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const session = authClient.useSession()
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  React.useEffect(() => {
    if (typeof window === 'undefined' || import.meta.env.VITE_ENABLE_MSW !== 'true') {
      return
    }

    void import('@/mocks/browser').then(({ startMockWorker }) => startMockWorker())
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (session.isPending) {
      return
    }

    const activeOrganizationId = session.data?.session?.activeOrganizationId

    if (activeOrganizationId) {
      window.localStorage.setItem('tenantId', activeOrganizationId)
      return
    }

    if (!session.data?.session) {
      window.localStorage.removeItem('tenantId')
    }
  }, [session.data?.session, session.data?.session?.activeOrganizationId, session.isPending])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isPublicPath ? (
          <Outlet />
        ) : (
          <MainLayout>
            <Outlet />
          </MainLayout>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
