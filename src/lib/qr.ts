import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import { QR_AHEAD, QR_BACK, QR_WINDOW_MS, STATIC_SLACK_MS } from '../config'
import type { Activity, QrMode } from '../data/types'

// Signed on the client so several screens can show QR codes without talking to each other.
// Anyone who reads this bundle can forge a token; moving the check to a server is in SPEC section 16.
const SECRET = utf8ToBytes('nu-volunteer/2569')

export interface QrPayload {
  v: 2
  a: string
  h: number
  w?: number
  s?: 1
  la?: number
  lo?: number
  ac?: number
}

export type Verified = { ok: true; p: QrPayload; ref: string } | { ok: false; reason: 'invalid' | 'expired' | 'early' | 'late' }

const b64url = (bytes: Uint8Array) => {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const sign = (body: string) => b64url(hmac(sha256, SECRET, utf8ToBytes(body)).slice(0, 12))

export const windowOf = (t: number) => Math.floor(t / QR_WINDOW_MS)

/** `now` is server time: Date.now() + api.serverOffset(). */
export function makeToken(p: Omit<QrPayload, 'v' | 'w' | 's'>, mode: QrMode, now: number) {
  const payload: QrPayload = mode === 'static' ? { v: 2, ...p, s: 1 } : { v: 2, ...p, w: windowOf(now) }
  const body = b64url(utf8ToBytes(JSON.stringify(payload)))
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string, now: number, activity?: Pick<Activity, 'start' | 'end'>): Verified {
  const [body, sig, extra] = token.split('.')
  if (!body || !sig || extra !== undefined || sign(body) !== sig) return { ok: false, reason: 'invalid' }
  let p: QrPayload
  try {
    p = JSON.parse(new TextDecoder().decode(fromB64url(body)))
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (p.s === 1) {
    if (activity && now < activity.start - STATIC_SLACK_MS) return { ok: false, reason: 'early' }
    if (activity && now > activity.end + STATIC_SLACK_MS) return { ok: false, reason: 'late' }
  } else {
    const cur = windowOf(now)
    if (typeof p.w !== 'number' || p.w < cur - QR_BACK || p.w > cur + QR_AHEAD) return { ok: false, reason: 'expired' }
  }
  return { ok: true, p, ref: bytesToHex(sha256(utf8ToBytes(sig))).slice(0, 8).toUpperCase() }
}

export function extractToken(text: string): string | null {
  const t = text.trim()
  const i = t.indexOf('claim?t=')
  if (i >= 0) return decodeURIComponent(t.slice(i + 8).split('&')[0])
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t) ? t : null
}

export function claimUrl(token: string) {
  return `${location.origin}${location.pathname}#/claim?t=${token}`
}
