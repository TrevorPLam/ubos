import { createLazyFileRoute } from '@tanstack/react-router'

import DocumentsPage from '@/pages/Documents'

export const Route = createLazyFileRoute('/documents')({
  component: DocumentsPage,
})