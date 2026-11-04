const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const pad = (n: number) => String(n).padStart(2, '0')

export const isStudentId = (s: string) => /^\d{8}$/.test(s)

export const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ')

export function thDate(ms: number) {
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

export function thTime(ms: number) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Hours as typed by the supervisor: whole numbers stay whole. */
export const fmtHours = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1))

const DAY = 24 * 3600_000
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)

/** "วันนี้", "พรุ่งนี้" or the date. */
export function relDay(ms: number, now: number) {
  const d = Math.round((startOfDay(ms) - startOfDay(now)) / DAY)
  if (d === 0) return 'วันนี้'
  if (d === 1) return 'พรุ่งนี้'
  return thDate(ms)
}

const WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

/** The date tile on an activity card: "วันนี้" or "พรุ่งนี้" over the day number when it applies, else the short weekday. */
export function dateTile(ms: number, now: number) {
  const d = new Date(ms)
  const rel = Math.round((startOfDay(ms) - startOfDay(now)) / DAY)
  return { dow: rel === 0 ? 'วันนี้' : rel === 1 ? 'พรุ่งนี้' : WEEKDAYS_SHORT[d.getDay()], day: d.getDate(), mon: MONTHS[d.getMonth()] }
}

/** How long ago, in words. Falls back to the date after a week. */
export function timeAgo(ms: number, now = Date.now()) {
  const m = Math.floor((now - ms) / 60_000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d} วันที่แล้ว` : thDate(ms)
}

/** "อีก 2 วัน 4 ชม." style countdown. */
export function countdown(ms: number) {
  const m = Math.max(1, Math.ceil(ms / 60_000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  if (d > 0) return `อีก ${d} วัน${h ? ` ${h} ชม.` : ''}`
  if (h > 0) return `อีก ${h} ชม. ${m % 60} นาที`
  return `อีก ${m} นาที`
}
