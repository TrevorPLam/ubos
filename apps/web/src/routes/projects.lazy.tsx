import { createLazyFileRoute } from '@tanstack/react-router'

import ProjectsPage from '@/pages/Projects'

export const Route = createLazyFileRoute('/projects')({
  component: ProjectsPage,
})