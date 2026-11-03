import type { Api } from '../data/api'
import type { Activity } from '../data/types'

/** Bottle exchange: whole hours earned from a bottle count, never above `max`. The one place this rule lives. */
export function bottleHours(items: number, perHour: number, max: number): number {
  if (!(perHour > 0) || !(items > 0)) return 0
  return Math.min(Math.floor(items / perHour), max)
}

/** Bottles still needed for the next hour, or null once the maximum is reached. */
export function bottleRemainder(items: number, perHour: number, max: number): number | null {
  if (!(perHour > 0) || bottleHours(items, perHour, max) >= max) return null
  return perHour - (Math.max(0, items) % perHour)
}

/** An activity takes bottles at a desk instead of QR scans. */
export const isBottle = (a: Pick<Activity, 'categoryKey' | 'itemsPerHour'>) => a.categoryKey === 'bottle' && !!a.itemsPerHour

type Student = { id: string; name: string }

/**
 * Adds bottles to a student's count at the desk. The first save creates the credit (method 'manual', the same path
 * as adding someone by hand); later saves change its hours. Hours always come from the total through bottleHours.
 */
export async function addBottles(api: Api, a: Activity, student: Student, add: number, by: string): Promise<{ items: number; hours: number }> {
  const perHour = a.itemsPerHour ?? 0
  for (let attempt = 0; attempt < 2; attempt++) {
    const cur = await api.getCredit(a.id, student.id)
    const items = (cur?.items ?? 0) + add
    const hours = bottleHours(items, perHour, a.hours)
    if (!cur) {
      const r = await api.claim({ activityId: a.id, student, hours, method: 'manual', flags: [], by })
      if (!r.ok) {
        // Someone else saved first: read again and add to theirs.
        if (r.reason === 'already') continue
        throw new Error('offline')
      }
    } else {
      await api.setHours(a.id, student.id, hours, '', by)
    }
    await api.setItems(a.id, student.id, items)
    return { items, hours }
  }
  throw new Error('conflict')
}
