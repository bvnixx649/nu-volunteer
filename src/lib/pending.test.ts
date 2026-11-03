import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '../data/api'
import { resetLocal } from '../data/local'
import type { Activity } from '../data/types'
import { forgetPending, listPending, MAX_AGE_MS, onPendingOutcome, queueClaim, sendPending, type PendingOutcome } from './pending'

const T = Date.now()
const activity = { id: 'a1', title: 'บริจาคโลหิต', hours: 6, walkIn: true, start: T - 3600_000, end: T + 3600_000, regCount: 0, creditCount: 0 } as Activity
const entry = (id = '65000001', scannedAt = Date.now() - 60_000) => ({
  input: { activityId: 'a1', student: { id, name: `นิสิต ${id}` }, hours: 6, method: 'qr' as const, flags: [] },
  scannedAt,
  token: 'tok',
  title: 'บริจาคโลหิต',
})
const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })

let outcomes: PendingOutcome[]
beforeEach(() => {
  localStorage.clear()
  resetLocal({ activities: { a1: activity } })
  outcomes = []
  onPendingOutcome((o) => outcomes.push(o))
})
afterEach(() => setOnline(true))

describe('pending queue', () => {
  it('keeps one entry per activity and student', () => {
    queueClaim(entry())
    queueClaim(entry())
    queueClaim(entry('65000002'))
    expect(listPending().map((p) => p.input.student.id)).toEqual(['65000001', '65000002'])
  })

  it('stays queued with a later try time while the network is down', async () => {
    queueClaim(entry())
    setOnline(false)
    await sendPending(true)
    expect(listPending()).toHaveLength(1)
    expect(listPending()[0].tries).toBe(1)
    expect(await api.getCredit('a1', '65000001')).toBeNull()
  })

  it('sends with the original scan time and the offline flag, then empties the queue', async () => {
    const e = entry()
    queueClaim(e)
    await sendPending(true)
    expect(listPending()).toHaveLength(0)
    expect(await api.getCredit('a1', '65000001')).toMatchObject({ at: e.scannedAt, flags: ['offline'] })
    expect(outcomes[0]).toMatchObject({ kind: 'sent' })
  })

  it('treats an existing credit as sent', async () => {
    await api.claim({ ...entry().input, flags: [] })
    queueClaim(entry())
    await sendPending(true)
    expect(listPending()).toHaveLength(0)
    expect(outcomes[0]).toMatchObject({ kind: 'sent' })
  })

  it('drops a scan older than 48 hours', async () => {
    queueClaim(entry('65000003', Date.now() - MAX_AGE_MS - 60_000))
    await sendPending(true)
    expect(listPending()).toHaveLength(0)
    expect(outcomes[0]).toMatchObject({ kind: 'dropped', reason: 'expired' })
    expect(await api.getCredit('a1', '65000003')).toBeNull()
  })

  it('only tries due entries unless forced', async () => {
    queueClaim(entry())
    await sendPending()
    expect(listPending()).toHaveLength(1)
    await sendPending(true)
    expect(listPending()).toHaveLength(0)
  })

  it('forgetPending removes the entry', () => {
    queueClaim(entry())
    forgetPending('a1', '65000001')
    expect(listPending()).toHaveLength(0)
  })
})
