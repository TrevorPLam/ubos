import { createLazyFileRoute } from '@tanstack/react-router'

import DashboardPage from '@/pages/Dashboard'

export const Route = createLazyFileRoute('/dashboard')({
  component: DashboardPage,
})