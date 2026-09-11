let reloading = false

function handleFailure() {
  if (reloading) return
  reloading = true
  window.location.reload()
}

export function installStaleChunkReload() {
  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message ?? ''
    if (message.includes('Failed to fetch dynamically imported module')) {
      handleFailure()
    }
  })

  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message =
        typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : ''
      if (message.includes('Failed to fetch dynamically imported module')) {
        handleFailure()
      }
    },
  )
}