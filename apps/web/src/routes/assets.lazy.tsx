import { createLazyFileRoute } from '@tanstack/react-router'

import AssetsPage from '@/pages/Assets'

export const Route = createLazyFileRoute('/assets')({
  component: AssetsPage,
})