import { describe, expect, it } from 'vitest'
import { precheck } from './claim'
import type { Verified } from './qr'
import type { Activity, Registration } from '../data/types'

const site = { lat: 16.745, lng: 100.195 }
const okToken: Verified = { ok: true, ref: 'ABCD1234', p: { v: 2, a: 'a1', h: 6, w: 1, la: site.lat, lo: site.lng, ac: 10 } }
const activity = { walkIn: false, locMode: 'off', hours: 6 } as Activity
const reg: Registration = { studentId: '65012345', name: 'ก', at: 1 }
// About 400 m north of the site.
const far = { lat: site.lat + 0.0036, lng: site.lng, acc: 10, at: 0 }
const near = { lat: site.lat + 0.0002, lng: site.lng, acc: 10, at: 0 }

const run = (o: Partial<Parameters<typeof precheck>[0]>) =>
  precheck({ verified: okToken, activity, hasCredit: false, registration: reg, fix: null, ...o })

describe('precheck order', () => {
  it('reports a bad signature before anything else', () => {
    expect(run({ verified: { ok: false, reason: 'invalid' }, hasCredit: true })).toMatchObject({ ok: false, reason: 'invalid' })
  })
  it('reports expiry before an existing credit', () => {
    expect(run({ verified: { ok: false, reason: 'expired' }, hasCredit: true })).toMatchObject({ reason: 'expired' })
  })
  it('reports an existing credit before a missing registration', () => {
    expect(run({ hasCredit: true, registration: null })).toMatchObject({ ok: false, reason: 'already' })
  })
})

describe('registration', () => {
  it('needs a registration when walk-ins are off', () => {
    expect(run({ registration: null })).toMatchObject({ ok: false, reason: 'notRegistered' })
  })
  it('treats a cancelled registration as none', () => {
    expect(run({ registration: { ...reg, cancelledAt: 5 } })).toMatchObject({ reason: 'notRegistered' })
  })
  it('lets walk-ins through without one', () => {
    expect(run({ registration: null, activity: { ...activity, walkIn: true } })).toEqual({ ok: true, flags: [] })
  })
})

describe('location', () => {
  const at = (locMode: Activity['locMode'], radius?: number) => ({ ...activity, locMode, radius }) as Activity
  it('on: passes nearby and records distance', () => {
    const r = run({ activity: at('on'), fix: near })
    expect(r.ok && r.flags).toEqual([])
    expect(r.ok && r.distance).toBeLessThan(30)
    expect(r.ok && r.accuracy).toBe(10)
  })
  it('on: passes far away with a location flag and the distance', () => {
    const r = run({ activity: at('on'), fix: far })
    expect(r.ok && r.flags).toEqual(['location'])
    expect(r.ok && r.distance).toBeGreaterThan(390)
  })
  it('on: passes with a flag when denied', () => {
    expect(run({ activity: at('on'), fix: 'denied' })).toEqual({ ok: true, flags: ['location'] })
  })
  it('off: passes with no fix and no flag', () => {
    expect(run({ activity: at('off'), fix: null })).toEqual({ ok: true, flags: [] })
  })
  it('on: a QR without coordinates cannot be checked, so it passes with a flag', () => {
    const verified: Verified = { ok: true, ref: 'R', p: { v: 2, a: 'a1', h: 6, w: 1 } }
    expect(run({ activity: at('on'), fix: near, verified })).toEqual({ ok: true, flags: ['location'], accuracy: 10 })
  })
  // About 180 m north of the site: inside 150 + 10 + 10 only with a wider radius.
  const mid = { lat: site.lat + 0.0016, lng: site.lng, acc: 10, at: 0 }
  it('uses the activity radius', () => {
    expect(run({ activity: at('on', 150), fix: mid })).toMatchObject({ ok: true, flags: ['location'] })
    expect(run({ activity: at('on', 200), fix: mid })).toMatchObject({ ok: true, flags: [] })
  })
  it('falls back to 150 m and on for data saved before the fields existed', () => {
    expect(run({ activity: { ...activity, locMode: 'flex' } as never, fix: mid })).toMatchObject({ flags: ['location'] })
    expect(run({ activity: { ...activity, locMode: 'flex' } as never, fix: near })).toMatchObject({ flags: [] })
  })
})
