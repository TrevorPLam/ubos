import { createLazyFileRoute } from '@tanstack/react-router'

import SettingsPage from '@/pages/Settings'

export const Route = createLazyFileRoute('/settings')({
  component: SettingsPage,
})