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
  const at = (locMode: Activity['locMode']) => ({ ...activity, locMode })
  it('strict: fails far away with distance and radius', () => {
    const r = run({ activity: at('strict'), fix: far })
    expect(r).toMatchObject({ ok: false, reason: 'far', radius: 170 })
    expect(!r.ok && r.distance).toBeGreaterThan(390)
  })
  it('strict: passes nearby and records distance', () => {
    const r = run({ activity: at('strict'), fix: near })
    expect(r.ok && r.flags).toEqual([])
    expect(r.ok && r.distance).toBeLessThan(30)
    expect(r.ok && r.accuracy).toBe(10)
  })
  it('strict: fails when location is denied', () => {
    expect(run({ activity: at('strict'), fix: 'denied' })).toMatchObject({ ok: false, reason: 'locDenied' })
  })
  it('flex: passes far away with a location flag', () => {
    const r = run({ activity: at('flex'), fix: far })
    expect(r.ok && r.flags).toEqual(['location'])
  })
  it('flex: passes with a flag when denied', () => {
    expect(run({ activity: at('flex'), fix: 'denied' })).toEqual({ ok: true, flags: ['location'] })
  })
  it('off: passes with no fix and no flag', () => {
    expect(run({ activity: at('off'), fix: null })).toEqual({ ok: true, flags: [] })
  })
  it('flex: a QR without coordinates cannot be checked, so it passes with a flag', () => {
    const verified: Verified = { ok: true, ref: 'R', p: { v: 2, a: 'a1', h: 6, w: 1 } }
    expect(run({ activity: at('flex'), fix: near, verified })).toEqual({ ok: true, flags: ['location'], accuracy: 10 })
  })
})
