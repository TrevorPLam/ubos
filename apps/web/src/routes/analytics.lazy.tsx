import { createLazyFileRoute } from '@tanstack/react-router'

import AnalyticsPage from '@/pages/Analytics'

export const Route = createLazyFileRoute('/analytics')({
  component: AnalyticsPage,
})