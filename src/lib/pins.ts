import { create } from 'zustand'

/**
 * Pinned activities for the supervisor home. Per device only: the ids live in localStorage under `nuv:pins`, with no
 * backend. Storage can be missing or blocked (private windows, cleared site data), so every access is guarded and the
 * app still works, only without remembering pins.
 */
export const PINS_KEY = 'nuv:pins'

/** The browser's localStorage, or undefined where the browser refuses to hand it out. */
function local(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** The stored activity ids; none when storage is missing, blocked, or holds something other than a list of ids. */
export function readPins(storage: Storage | undefined = local()): string[] {
  try {
    const v: unknown = JSON.parse(storage?.getItem(PINS_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Saves the ids. A full or blocked storage is ignored: the pin still works until the page closes. */
export function writePins(ids: string[], storage: Storage | undefined = local()): void {
  try {
    storage?.setItem(PINS_KEY, JSON.stringify(ids))
  } catch {
    // Storage full or blocked: nothing to do.
  }
}

/** The ids after pinning `id` when it was not pinned, or unpinning it when it was. Pure, so the store and the tests share it. */
export function togglePinned(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

interface PinState {
  ids: string[]
  toggle: (id: string) => void
}

/** Reactive pin list: components subscribe to `ids` so a toggle redraws them. */
export const usePins = create<PinState>((set, get) => ({
  ids: readPins(),
  toggle: (id) => {
    const next = togglePinned(get().ids, id)
    writePins(next)
    set({ ids: next })
  },
}))

/** Whether the activity is pinned on this device right now. */
export const isPinned = (id: string) => usePins.getState().ids.includes(id)

/** Pins or unpins the activity on this device. */
export const toggle = (id: string) => usePins.getState().toggle(id)
