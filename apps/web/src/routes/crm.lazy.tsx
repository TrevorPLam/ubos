import { createLazyFileRoute } from '@tanstack/react-router'

import CrmPage from '@/pages/CRM'

export const Route = createLazyFileRoute('/crm')({
  component: CrmPage,
})