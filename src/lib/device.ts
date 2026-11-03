/** Short vibrations for touch feedback. No-ops where the Vibration API is missing (iOS Safari). */
export const haptic = {
  tap: () => navigator.vibrate?.(8),
  success: () => navigator.vibrate?.([14, 70, 28]),
  error: () => navigator.vibrate?.([30, 50, 30]),
}

export const notifySupported = () => 'Notification' in window

export async function askNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/** A device notification, only if the browser allows it. `hash` is the in-app route to open on tap. */
export async function systemNotify(title: string, body: string, hash?: string) {
  if (!notifySupported() || Notification.permission !== 'granted') return
  const opts: NotificationOptions = { body, data: { url: hash ? `${location.origin}${location.pathname}#${hash}` : undefined } }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
  } catch {
    /* some browsers block constructor-based notifications */
  }
}
