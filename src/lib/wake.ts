type WakeLockNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }

/**
 * Keeps the screen on while the QR is showing. Browsers drop the lock when the tab is hidden,
 * so it is taken again whenever the page becomes visible. Returns a function that releases it.
 */
export function keepAwake(): () => void {
  let lock: { release: () => Promise<void> } | undefined
  let stopped = false
  const take = async () => {
    if (stopped || document.visibilityState !== 'visible') return
    try {
      lock = await (navigator as WakeLockNav).wakeLock?.request('screen')
    } catch {
      /* not supported or refused: the screen may sleep, nothing else breaks */
    }
  }
  take()
  document.addEventListener('visibilitychange', take)
  return () => {
    stopped = true
    document.removeEventListener('visibilitychange', take)
    lock?.release().catch(() => {})
  }
}
