import { router } from './init'
import { crmRouter } from './routers/crm'

export const appRouter = router({
  crm: crmRouter,
})

export type AppRouter = typeof appRouter