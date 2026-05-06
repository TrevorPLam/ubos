import {
  createLeadInputSchema,
  crmLeadSchema,
  deleteLeadInputSchema,
  leadBoardSchema,
  updateLeadInputSchema,
} from '@/lib/crm/schema'
import { createLead, deleteLead, listLeadBoard, updateLead } from '@/server/crm/repository'

import { router, tenantProcedure } from '../init'

export const crmRouter = router({
  listLeadBoard: tenantProcedure.output(leadBoardSchema).query(async ({ ctx }) => {
    return listLeadBoard(ctx.tenantId)
  }),
  createLead: tenantProcedure
    .input(createLeadInputSchema)
    .output(crmLeadSchema)
    .mutation(async ({ ctx, input }) => {
      return createLead(input, ctx.tenantId)
    }),
  updateLead: tenantProcedure
    .input(updateLeadInputSchema)
    .output(crmLeadSchema)
    .mutation(async ({ ctx, input }) => {
      return updateLead(input, ctx.tenantId)
    }),
  deleteLead: tenantProcedure
    .input(deleteLeadInputSchema)
    .output(deleteLeadInputSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteLead(input.id, ctx.tenantId)
    }),
})