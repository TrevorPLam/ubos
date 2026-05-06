import { describe, expect, it } from 'vitest'

import type { TrpcContext } from '../context'
import { appRouter } from '../router'

function createCaller() {
  const context: TrpcContext = {
    authEnabled: false,
    headers: new Headers(),
    session: null,
    tenantId: null,
    userId: null,
  }

  return appRouter.createCaller(context)
}

function flattenBoard(board: Awaited<ReturnType<ReturnType<typeof createCaller>['crm']['listLeadBoard']>>) {
  return [...board.new, ...board.contacted, ...board.qualified]
}

describe('crm router', () => {
  it('creates, updates, and deletes a lead', async () => {
    const caller = createCaller()

    const createdLead = await caller.crm.createLead({
      name: 'Morgan Lee',
      company: 'Northwind Advisory',
      value: '125k',
      source: 'Referral',
      stage: 'new',
      email: 'morgan@example.com',
      phone: '555-0100',
      notes: 'Interested in bundled services',
    })

    expect(createdLead.stage).toBe('new')
    expect(createdLead.value).toBe('$125k')

    const boardAfterCreate = await caller.crm.listLeadBoard()
    expect(boardAfterCreate.new.some((lead) => lead.id === createdLead.id)).toBe(true)

    const updatedLead = await caller.crm.updateLead({
      id: createdLead.id,
      company: 'Northwind Holdings',
      stage: 'qualified',
      value: '200k',
      notes: 'Budget approved',
    })

    expect(updatedLead.stage).toBe('qualified')
    expect(updatedLead.company).toBe('Northwind Holdings')
    expect(updatedLead.value).toBe('$200k')

    const boardAfterUpdate = await caller.crm.listLeadBoard()
    expect(boardAfterUpdate.new.some((lead) => lead.id === createdLead.id)).toBe(false)
    expect(boardAfterUpdate.qualified.some((lead) => lead.id === createdLead.id)).toBe(true)

    const deletedLead = await caller.crm.deleteLead({ id: createdLead.id })
    expect(deletedLead).toEqual({ id: createdLead.id })

    const boardAfterDelete = await caller.crm.listLeadBoard()
    expect(flattenBoard(boardAfterDelete).some((lead) => lead.id === createdLead.id)).toBe(false)
  })
})