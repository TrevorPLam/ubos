import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

const worker = setupWorker(...handlers)

let started = false

export async function startMockWorker() {
  if (started) {
    return
  }

  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })

  started = true
}