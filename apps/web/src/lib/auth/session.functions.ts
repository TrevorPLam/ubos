import { getSessionSnapshot } from '@ubos/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getAuthState = createServerFn({ method: 'GET' }).handler(async () => {
  return getSessionSnapshot(getRequestHeaders())
})