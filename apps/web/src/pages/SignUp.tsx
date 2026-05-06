import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'
import { toast } from '@/hooks/use-toast'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [organizationName, setOrganizationName] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const session = authClient.useSession()
  const authUnavailable = session.error?.status === 503

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const signUpResult = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (signUpResult.error) {
        toast({
          title: 'Sign-up failed',
          description: signUpResult.error.message,
          variant: 'destructive',
        })
        return
      }

      const createOrganizationResult = await authClient.organization.create({
        name: organizationName,
        slug: toSlug(organizationName),
      })

      if (createOrganizationResult.error) {
        toast({
          title: 'Workspace creation failed',
          description: createOrganizationResult.error.message,
          variant: 'destructive',
        })
        return
      }

      const activeOrganizationId = createOrganizationResult.data?.id
      if (typeof window !== 'undefined') {
        if (activeOrganizationId) {
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
          <CardTitle className="text-2xl font-display">Create your workspace</CardTitle>
          <CardDescription className="text-muted-foreground">
            Create the first user and organization for your tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="signup-name">
                Full name
              </label>
              <Input
                id="signup-name"
                className="border-white/10 bg-white/5"
                onChange={(event) => setName(event.target.value)}
                placeholder="Jordan Smith"
                value={name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="signup-org">
                Organization name
              </label>
              <Input
                id="signup-org"
                className="border-white/10 bg-white/5"
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder="Apex Unified Suite"
                value={organizationName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="signup-email">
                Email
              </label>
              <Input
                id="signup-email"
                autoComplete="email"
                className="border-white/10 bg-white/5"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="signup-password">
                Password
              </label>
              <Input
                id="signup-password"
                autoComplete="new-password"
                className="border-white/10 bg-white/5"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Choose a strong password"
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
              {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="text-primary hover:text-primary/80" to="/signin">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}