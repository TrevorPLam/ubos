import { queryOptions } from '@tanstack/react-query'

import { crmLeads } from '@/data/mockData'
import { type CreateLeadInput, hydrateLeadBoard, type UpdateLeadInput } from '@/lib/crm/schema'

import { getTrpcClient } from './client'

export const crmLeadBoardQueryKey = ['crm', 'lead-board'] as const

export function crmLeadBoardQueryOptions() {
  return queryOptions({
    queryKey: crmLeadBoardQueryKey,
    queryFn: () => getTrpcClient().crm.listLeadBoard.query(),
    placeholderData: hydrateLeadBoard(crmLeads),
    staleTime: 30_000,
  })
}

export function createLeadMutation(input: CreateLeadInput) {
  return getTrpcClient().crm.createLead.mutate(input)
}

export function updateLeadMutation(input: UpdateLeadInput) {
  return getTrpcClient().crm.updateLead.mutate(input)
}

export function deleteLeadMutation(id: string) {
  return getTrpcClient().crm.deleteLead.mutate({ id })
}