import { useSyncExternalStore } from 'react'

// Chrome/Edge/Samsung fire beforeinstallprompt; we keep it and show our own button.
// iOS has no API, so the button opens instructions instead.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'in-app' | 'manual'

const ua = navigator.userAgent
export const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const inApp = /\bLine\/|FBAN|FBAV|Instagram|TikTok/i.test(ua)

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

let deferred: InstallPromptEvent | null = null
let installed = standalone()
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  installed = true
  deferred = null
  emit()
})

function mode(): InstallMode {
  if (installed) return 'installed'
  if (deferred) return 'prompt'
  if (inApp) return 'in-app'
  if (isIOS) return 'ios'
  return 'manual'
}

export function useInstallMode() {
  return useSyncExternalStore((cb) => {
    subs.add(cb)
    return () => subs.delete(cb)
  }, mode)
}

/** Shows the browser's own install dialog. Resolves true when the user accepts. */
export async function promptInstall() {
  const e = deferred
  if (!e) return false
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') installed = true
  emit()
  return outcome === 'accepted'
}

/** LINE honours openExternalBrowser=1 and reopens the page in Chrome or Safari. */
export function openInBrowser() {
  const url = new URL(location.href)
  url.searchParams.set('openExternalBrowser', '1')
  location.href = url.toString()
}
