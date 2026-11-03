import type { Activity, CreditFlag, Registration } from '../data/types'
import { allowedRadius, distanceM, type Fix, type GeoError } from './geo'
import type { Verified } from './qr'

export type FailReason = 'invalid' | 'expired' | 'early' | 'late' | 'already' | 'notRegistered' | 'far' | 'locDenied'

export type Precheck =
  | { ok: true; flags: CreditFlag[]; distance?: number; accuracy?: number }
  | { ok: false; reason: FailReason; distance?: number; radius?: number }

type Input = {
  verified: Verified
  activity: Pick<Activity, 'walkIn' | 'locMode'>
  hasCredit: boolean
  registration: Registration | null
  /** The student's position, the reason it is missing, or null when the activity does not check location. */
  fix: Fix | GeoError | null
}

/** Checks a claim in the order SPEC 8.3 lists. The write itself still has to re-check for a credit. */
export function precheck({ verified, activity, hasCredit, registration, fix }: Input): Precheck {
  if (!verified.ok) return { ok: false, reason: verified.reason }
  if (hasCredit) return { ok: false, reason: 'already' }
  if (!activity.walkIn && (!registration || registration.cancelledAt)) return { ok: false, reason: 'notRegistered' }
  if (activity.locMode === 'off') return { ok: true, flags: [] }

  const strict = activity.locMode === 'strict'
  if (!fix || typeof fix === 'string') {
    return strict ? { ok: false, reason: 'locDenied' } : { ok: true, flags: ['location'] }
  }
  const { la, lo, ac = 0 } = verified.p
  // The QR screen had no GPS yet, so there is nothing to compare against. Let it through and flag it.
  if (la === undefined || lo === undefined) return { ok: true, flags: ['location'], accuracy: fix.acc }

  const distance = distanceM({ lat: la, lng: lo }, fix)
  const radius = Math.round(allowedRadius(ac, fix.acc))
  if (distance <= radius) return { ok: true, flags: [], distance, accuracy: fix.acc }
  return strict ? { ok: false, reason: 'far', distance, radius } : { ok: true, flags: ['location'], distance, accuracy: fix.acc }
}

/** What each failure tells the student: what happened, then what to do next. */
export const CLAIM_COPY: Record<FailReason | 'offline', { title: string; action: string }> = {
  invalid: { title: 'QR นี้ใช้รับชั่วโมงไม่ได้', action: 'สแกน QR จากจอของผู้คุมกิจกรรม' },
  expired: { title: 'QR หมดอายุ', action: 'สแกนใหม่จากจอของผู้คุม' },
  early: { title: 'ยังไม่ถึงเวลารับชั่วโมง', action: 'สแกนอีกครั้งเมื่อกิจกรรมเริ่ม' },
  late: { title: 'หมดเวลารับชั่วโมงแล้ว', action: 'ติดต่อผู้คุมกิจกรรม' },
  already: { title: 'ได้รับชั่วโมงกิจกรรมนี้แล้ว', action: '' },
  notRegistered: { title: 'ไม่ได้ลงทะเบียน', action: 'ติดต่อผู้คุมให้เพิ่มชื่อ' },
  far: { title: 'อยู่ห่างจุดกิจกรรม {distance} ม.', action: 'เข้าไปใกล้จุดกิจกรรมภายใน {radius} ม. แล้วลองอีกครั้ง' },
  locDenied: { title: 'ยังไม่ได้เปิดตำแหน่ง', action: 'เปิดสิทธิ์ตำแหน่งให้เบราว์เซอร์แล้วลองอีกครั้ง' },
  offline: { title: 'บันทึกไม่ได้เพราะไม่มีอินเทอร์เน็ต', action: 'เชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง' },
}

/** Fills {distance} and {radius} in a CLAIM_COPY string. */
export const fillCopy = (s: string, v: { distance?: number; radius?: number }) =>
  s.replace('{distance}', String(Math.round(v.distance ?? 0))).replace('{radius}', String(v.radius ?? 0))
