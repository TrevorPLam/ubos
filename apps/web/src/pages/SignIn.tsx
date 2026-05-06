import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'
import { toast } from '@/hooks/use-toast'

export default function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const session = authClient.useSession()
  const authUnavailable = session.error?.status === 503

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        toast({
          title: 'Sign-in failed',
          description: result.error.message,
          variant: 'destructive',
        })
        return
      }

      const organizationListResult = await authClient.organization.list()

      if (organizationListResult.error) {
        toast({
          title: 'Workspace restore failed',
          description: organizationListResult.error.message,
          variant: 'destructive',
        })
        return
      }

      const activeOrganizationId = organizationListResult.data?.[0]?.id

      if (typeof window !== 'undefined') {
        if (activeOrganizationId) {
          const setActiveOrganizationResult = await authClient.organization.setActive({
            organizationId: activeOrganizationId,
          })

          if (setActiveOrganizationResult.error) {
            toast({
              title: 'Workspace restore failed',
              description: setActiveOrganizationResult.error.message,
              variant: 'destructive',
            })
            return
          }

          window.localStorage.setItem('tenantId', activeOrganizationId)
        } else {
          window.localStorage.removeItem('tenantId')
        }
      }

      await navigate({ to: '/dashboard' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#E8EAED] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/10 bg-[#111317]/90 backdrop-blur-xl text-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-display">Sign in</CardTitle>
          <CardDescription className="text-muted-foreground">
            Continue into the UBOS workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="signin-email">
                Email
              </label>
              <Input
                id="signin-email"
                autoComplete="email"
                className="border-white/10 bg-white/5"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="signin-password">
                Password
              </label>
              <Input
                id="signin-password"
                autoComplete="current-password"
                className="border-white/10 bg-white/5"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </div>
            {authUnavailable ? (
              <p className="text-sm text-amber-300">
                Authentication is disabled until a database connection is configured.
              </p>
            ) : null}
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isSubmitting || authUnavailable}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Need an account?{' '}
            <Link className="text-primary hover:text-primary/80" to="/signup">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}