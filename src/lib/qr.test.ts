import { describe, expect, it } from 'vitest'
import { extractToken, makeToken, verifyToken } from './qr'

const base = { a: 'act1', h: 6 }
const now = new Date(2026, 10, 20, 10, 0, 0).getTime()

describe('dynamic token', () => {
  const t = makeToken(base, 'dynamic', now)
  it('passes at creation time', () => {
    const v = verifyToken(t, now)
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.ref).toMatch(/^[0-9A-F]{8}$/)
  })
  it('still passes 60 seconds later', () => expect(verifyToken(t, now + 60_000).ok).toBe(true))
  it('expires after about 70 seconds', () => expect(verifyToken(t, now + 70_001)).toEqual({ ok: false, reason: 'expired' }))
  it('rejects a token from 20 seconds in the future', () => expect(verifyToken(t, now - 20_000)).toEqual({ ok: false, reason: 'expired' }))
  it('rejects a tampered body', () => {
    const tampered = (t[0] === 'A' ? 'B' : 'A') + t.slice(1)
    expect(verifyToken(tampered, now)).toEqual({ ok: false, reason: 'invalid' })
  })
  it('rejects garbage', () => expect(verifyToken('nope', now)).toEqual({ ok: false, reason: 'invalid' }))
})

describe('static token', () => {
  const at = (h: number, m: number) => new Date(2026, 10, 20, h, m).getTime()
  const activity = { start: at(10, 0), end: at(16, 0) }
  const t = makeToken(base, 'static', at(8, 0))
  it('has no time window', () => {
    const v = verifyToken(t, at(10, 0), activity)
    expect(v.ok && v.p.w).toBeUndefined()
    expect(v.ok && v.p.s).toBe(1)
  })
  it('opens 30 minutes before start', () => expect(verifyToken(t, at(9, 31), activity).ok).toBe(true))
  it('is too early before that', () => expect(verifyToken(t, at(9, 29), activity)).toEqual({ ok: false, reason: 'early' }))
  it('closes 30 minutes after end', () => expect(verifyToken(t, at(16, 31), activity)).toEqual({ ok: false, reason: 'late' }))
})

describe('extractToken', () => {
  it('reads the token from a claim URL', () => expect(extractToken('https://x.io/nu-volunteer/#/claim?t=abc.def')).toBe('abc.def'))
  it('accepts a bare token', () => expect(extractToken('abc.def')).toBe('abc.def'))
  it('returns null for other text', () => expect(extractToken('hello world')).toBeNull())
})
