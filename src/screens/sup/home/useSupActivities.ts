import { useEffect, useMemo, useState } from 'react'
import { api, now as serverNow } from '../../../data/api'
import type { Activity } from '../../../data/types'
import { visibleTo } from '../../../lib/home'
import { useDevice } from '../../../store'

/**
 * The activities the signed-in supervisor may see, kept live, with a clock that moves every 30 seconds
 * because stages change with time. `list` is null until the first load.
 */
export function useSupActivities() {
  const sup = useDevice((s) => s.sup)
  const [list, setList] = useState<Activity[] | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => api.watchActivities(setList), [])
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = useMemo(() => serverNow(), [list, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => (sup && list ? visibleTo(list, sup) : []), [list, sup])
  return { sup, list, mine, now }
}
