import { http, HttpResponse } from 'msw'

import { crmLeads } from '@/data/mockData'

export const handlers = [
  http.get('/api/trpc/crm.listLeadBoard', () => {
    const mswLeadBoard = {
      ...crmLeads,
      new: crmLeads.new.map((lead, index) =>
        index === 0
          ? {
              ...lead,
              name: `MSW ${lead.name}`,
            }
          : lead
      ),
    }

    return HttpResponse.json([
      {
        result: {
          data: mswLeadBoard,
        },
      },
    ])
  }),
]