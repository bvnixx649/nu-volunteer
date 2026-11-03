import { QR_INTERVAL_DEFAULT, RADIUS_DEFAULT } from '../config'
import type { Activity, LocMode } from '../data/types'

export interface Checkin {
  locMode: LocMode
  radius: number
  qrInterval: number
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && v > 0 ? v : fallback)

/** Reads the check-in settings with fallbacks, because data saved earlier may lack the new fields or hold old location modes. */
export function checkinOf(a: Partial<Pick<Activity, 'locMode' | 'radius' | 'qrInterval'>>): Checkin {
  return { locMode: a.locMode === 'off' ? 'off' : 'on', radius: num(a.radius, RADIUS_DEFAULT), qrInterval: num(a.qrInterval, QR_INTERVAL_DEFAULT) }
}

/** One line for the Manage page, e.g. "QR เปลี่ยนทุก 10 วิ ตรวจตำแหน่ง 150 ม.". */
export function checkinSummary(a: Partial<Pick<Activity, 'qrMode' | 'locMode' | 'radius' | 'qrInterval'>>) {
  const c = checkinOf(a)
  const qr = a.qrMode === 'static' ? 'QR แบบพิมพ์' : `QR เปลี่ยนทุก ${c.qrInterval} วิ`
  return `${qr} ${c.locMode === 'on' ? `ตรวจตำแหน่ง ${c.radius} ม.` : 'ไม่ตรวจตำแหน่ง'}`
}
