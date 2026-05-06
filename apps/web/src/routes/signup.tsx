import { createFileRoute } from '@tanstack/react-router'

import SignUpPage from '@/pages/SignUp'

export const Route = createFileRoute('/signup')({
  component: SignUpPage,
})