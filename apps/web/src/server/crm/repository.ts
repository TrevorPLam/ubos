import { randomUUID } from 'node:crypto'

import { desc, eq } from 'drizzle-orm'

import { crmLeadsTable, isDatabaseConfigured, withTenantDatabase } from '@ubos/db'

import {
  createLeadInputSchema,
  type CreateLeadInput,
  type LeadBoard,
  type LeadRecord,
  type LeadStage,
  type UpdateLeadInput,
  hydrateLeadBoard,
} from '@/lib/crm/schema'
import { crmLeads as mockLeadBoard } from '@/data/mockData'

const mockLeadsState: LeadRecord[] = Object.entries(hydrateLeadBoard(mockLeadBoard)).flatMap(
  ([stage, leads]) => leads.map((lead) => ({ ...lead, stage: stage as LeadStage }))
)

function emptyLeadBoard(): LeadBoard {
  return {
    new: [],
    contacted: [],
    qualified: [],
  }
}

function groupLeadRows(rows: LeadRecord[]): LeadBoard {
  return rows.reduce<LeadBoard>((board, row) => {
    board[row.stage].push({
      id: row.id,
      name: row.name,
      company: row.company,
      value: row.value,
      source: row.source,
      stage: row.stage,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
    })
    return board
  }, emptyLeadBoard())
}

function normalizeOptionalValue(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeLeadValue(value: string) {
  const normalized = value.trim()
  if (normalized.startsWith('$')) {
    return normalized
  }

  return `$${normalized}`
}

function mapLeadRow(row: {
  id: string
  name: string
  company: string
  value: string
  source: string
  stage: LeadStage
  email: string | null
  phone: string | null
  notes: string | null
}): LeadRecord {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    value: row.value,
    source: row.source,
    stage: row.stage,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export async function listLeadBoard(tenantId?: string | null): Promise<LeadBoard> {
  if (!isDatabaseConfigured()) {
    return groupLeadRows(mockLeadsState)
  }

  try {
    const rows = await withTenantDatabase(tenantId, async (database) => {
      return database
        .select({
          id: crmLeadsTable.id,
          name: crmLeadsTable.name,
          company: crmLeadsTable.company,
          value: crmLeadsTable.value,
          source: crmLeadsTable.source,
          stage: crmLeadsTable.stage,
          email: crmLeadsTable.email,
          phone: crmLeadsTable.phone,
          notes: crmLeadsTable.notes,
        })
        .from(crmLeadsTable)
        .orderBy(desc(crmLeadsTable.createdAt))
    })

    if (!rows.length) {
      return emptyLeadBoard()
    }

    return groupLeadRows(rows.map(mapLeadRow))
  } catch {
    return groupLeadRows(mockLeadsState)
  }
}

export async function createLead(input: CreateLeadInput, tenantId?: string | null): Promise<LeadRecord> {
  const parsed = createLeadInputSchema.parse(input)

  if (!isDatabaseConfigured()) {
    const nextLead: LeadRecord = {
      id: randomUUID(),
      name: parsed.name,
      company: parsed.company,
      value: normalizeLeadValue(parsed.value),
      source: parsed.source,
      stage: parsed.stage,
      email: parsed.email,
      phone: parsed.phone,
      notes: parsed.notes,
    }

    mockLeadsState.unshift(nextLead)
    return nextLead
  }

  const [createdLead] = await withTenantDatabase(tenantId, async (database) => {
    return database
      .insert(crmLeadsTable)
      .values({
        name: parsed.name,
        company: parsed.company,
        value: normalizeLeadValue(parsed.value),
        source: parsed.source,
        stage: parsed.stage,
        email: normalizeOptionalValue(parsed.email),
        phone: normalizeOptionalValue(parsed.phone),
        notes: normalizeOptionalValue(parsed.notes),
      })
      .returning({
        id: crmLeadsTable.id,
        name: crmLeadsTable.name,
        company: crmLeadsTable.company,
        value: crmLeadsTable.value,
        source: crmLeadsTable.source,
        stage: crmLeadsTable.stage,
        email: crmLeadsTable.email,
        phone: crmLeadsTable.phone,
        notes: crmLeadsTable.notes,
      })
  })

  return mapLeadRow(createdLead)
}

export async function updateLead(input: UpdateLeadInput, tenantId?: string | null): Promise<LeadRecord> {
  if (!isDatabaseConfigured()) {
    const leadIndex = mockLeadsState.findIndex((lead) => lead.id === input.id)

    if (leadIndex === -1) {
      throw new Error('Lead not found.')
    }

    const currentLead = mockLeadsState[leadIndex]
    const nextLead: LeadRecord = {
      ...currentLead,
      ...input,
      value: input.value ? normalizeLeadValue(input.value) : currentLead.value,
      stage: input.stage ?? currentLead.stage,
    }

    mockLeadsState[leadIndex] = nextLead
    return nextLead
  }

  const [updatedLead] = await withTenantDatabase(tenantId, async (database) => {
    return database
      .update(crmLeadsTable)
      .set({
        name: input.name,
        company: input.company,
        value: input.value ? normalizeLeadValue(input.value) : undefined,
        source: input.source,
        stage: input.stage,
        email: input.email === undefined ? undefined : normalizeOptionalValue(input.email),
        phone: input.phone === undefined ? undefined : normalizeOptionalValue(input.phone),
        notes: input.notes === undefined ? undefined : normalizeOptionalValue(input.notes),
        updatedAt: new Date(),
      })
      .where(eq(crmLeadsTable.id, input.id))
      .returning({
        id: crmLeadsTable.id,
        name: crmLeadsTable.name,
        company: crmLeadsTable.company,
        value: crmLeadsTable.value,
        source: crmLeadsTable.source,
        stage: crmLeadsTable.stage,
        email: crmLeadsTable.email,
        phone: crmLeadsTable.phone,
        notes: crmLeadsTable.notes,
      })
  })

  if (!updatedLead) {
    throw new Error('Lead not found.')
  }

  return mapLeadRow(updatedLead)
}

export async function deleteLead(id: string, tenantId?: string | null): Promise<{ id: string }> {
  if (!isDatabaseConfigured()) {
    const leadIndex = mockLeadsState.findIndex((lead) => lead.id === id)

    if (leadIndex === -1) {
      throw new Error('Lead not found.')
    }

    mockLeadsState.splice(leadIndex, 1)
    return { id }
  }

  const [deletedLead] = await withTenantDatabase(tenantId, async (database) => {
    return database
      .delete(crmLeadsTable)
      .where(eq(crmLeadsTable.id, id))
      .returning({
        id: crmLeadsTable.id,
      })
  })

  if (!deletedLead) {
    throw new Error('Lead not found.')
  }

  return deletedLead
}