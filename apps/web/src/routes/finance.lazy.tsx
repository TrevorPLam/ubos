import { createLazyFileRoute } from '@tanstack/react-router'

import FinancePage from '@/pages/Finance'

export const Route = createLazyFileRoute('/finance')({
  component: FinancePage,
})