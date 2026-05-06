import { TRPCError, initTRPC } from '@trpc/server'

import type { TrpcContext } from './context'

const t = initTRPC.context<TrpcContext>().create()

const requireSession = t.middleware(({ ctx, next }) => {
	if (ctx.authEnabled && !ctx.session) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'Authentication is required.',
		})
	}

	return next()
})

const requireTenant = t.middleware(({ ctx, next }) => {
	if (ctx.authEnabled && !ctx.tenantId) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'An active organization is required.',
		})
	}

	return next()
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(requireSession)
export const tenantProcedure = protectedProcedure.use(requireTenant)