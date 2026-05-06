import { createLazyFileRoute } from '@tanstack/react-router'

import PortalPage from '@/pages/Portal'

export const Route = createLazyFileRoute('/portal')({
  component: PortalPage,
})