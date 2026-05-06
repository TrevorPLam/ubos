import { z } from 'zod'

export const crmLeadStageSchema = z.enum(['new', 'contacted', 'qualified'])

export const crmLeadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  company: z.string().min(1),
  value: z.string().min(1),
  source: z.string().min(1),
  stage: crmLeadStageSchema,
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export const leadBoardSchema = z.object({
  new: z.array(crmLeadSchema),
  contacted: z.array(crmLeadSchema),
  qualified: z.array(crmLeadSchema),
})

export const createLeadInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  company: z.string().trim().min(1, 'Company is required.'),
  value: z.string().trim().min(1, 'Value is required.'),
  source: z.string().trim().min(1, 'Source is required.'),
  stage: crmLeadStageSchema.default('new'),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const updateLeadInputSchema = createLeadInputSchema.partial().extend({
  id: z.string().min(1),
})

export const deleteLeadInputSchema = z.object({
  id: z.string().min(1),
})

export type LeadStage = z.infer<typeof crmLeadStageSchema>
export type LeadRecord = z.infer<typeof crmLeadSchema>
export type LeadBoard = z.infer<typeof leadBoardSchema>
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadInputSchema>

export function hydrateLeadBoard(board: {
  new: Array<Omit<LeadRecord, 'stage'>>
  contacted: Array<Omit<LeadRecord, 'stage'>>
  qualified: Array<Omit<LeadRecord, 'stage'>>
}): LeadBoard {
  return {
    new: board.new.map((lead) => ({ ...lead, stage: 'new' })),
    contacted: board.contacted.map((lead) => ({ ...lead, stage: 'contacted' })),
    qualified: board.qualified.map((lead) => ({ ...lead, stage: 'qualified' })),
  }
}