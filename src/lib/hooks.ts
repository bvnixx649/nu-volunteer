import { useEffect, useRef, useState } from 'react'
import { now as serverNow } from '../data/api'

/** Server time that re-renders every `ms`, so "live" and countdown states stay current. */
export function useNow(ms = 30_000) {
  const [t, setT] = useState(serverNow)
  useEffect(() => {
    const id = setInterval(() => setT(serverNow()), ms)
    return () => clearInterval(id)
  }, [ms])
  return t
}

/** Calls `load` now and then every `ms` while the tab is visible. Chat uses this instead of realtime. */
export function usePoll(load: () => void, ms: number) {
  const ref = useRef(load)
  ref.current = load
  useEffect(() => {
    ref.current()
    const id = setInterval(() => document.visibilityState === 'visible' && ref.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}
