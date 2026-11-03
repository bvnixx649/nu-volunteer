import { CANCEL_DAYS, QR_INTERVAL_DEFAULT, RADIUS_DEFAULT } from '../config'
import { categoryOf } from '../data/categories'
import type { Activity, ActivityEdit, CategoryKey, LocMode, NewActivity, QrMode } from '../data/types'

/** Everything the create and edit flow holds while the supervisor types. Numbers stay strings until they are checked. */
export interface Draft {
  categoryKey: CategoryKey | null
  title: string
  poster: string
  description: string
  date: string
  startT: string
  endT: string
  place: string
  lat?: number
  lng?: number
  /** From the GPS button only; not saved with the activity. */
  accuracy?: number
  hours: string
  capLimit: boolean
  capacity: string
  walkIn: boolean
  scheduled: boolean
  openDate: string
  openT: string
  hideUntilOpen: boolean
  cancelDays: string
  qrMode: QrMode
  qrInterval: number
  locMode: LocMode
  radius: number
  supName: string
  phone: string
  chatEnabled: boolean
  openChatUrl: string
}

/** Fields a category fills in. Once the supervisor edits one, picking another category leaves it alone. */
export const DEFAULT_KEYS = ['poster', 'description', 'hours', 'capLimit', 'capacity', 'walkIn', 'qrMode', 'qrInterval', 'locMode', 'radius'] as const
export type DefaultKey = (typeof DEFAULT_KEYS)[number]

/** Template photos of a category. Categories without any (recycling) borrow the ones of "อื่น ๆ". */
export const posterChoices = (key: CategoryKey) => categoryOf(key).posters

export function blankDraft(supName = ''): Draft {
  return {
    categoryKey: null,
    title: '',
    poster: '',
    description: '',
    date: '',
    startT: '09:00',
    endT: '16:00',
    place: '',
    hours: '',
    capLimit: false,
    capacity: '30',
    walkIn: false,
    scheduled: false,
    openDate: '',
    openT: '',
    hideUntilOpen: false,
    cancelDays: String(CANCEL_DAYS),
    qrMode: 'dynamic',
    qrInterval: QR_INTERVAL_DEFAULT,
    locMode: 'on',
    radius: RADIUS_DEFAULT,
    supName,
    phone: '',
    chatEnabled: false,
    openChatUrl: '',
  }
}

/** Sets the category and fills every default field the supervisor has not touched. */
export function applyCategory(d: Draft, key: CategoryKey, touched: ReadonlySet<string>): Draft {
  const c = categoryOf(key)
  const defaults: Pick<Draft, DefaultKey> = {
    poster: posterChoices(key)[0],
    description: c.description,
    hours: String(c.hours),
    capLimit: c.capLimit,
    capacity: String(c.capacity > 0 ? c.capacity : 30),
    walkIn: c.walkIn,
    qrMode: c.qrMode,
    qrInterval: c.qrInterval,
    locMode: c.locMode,
    radius: c.radius,
  }
  const next: Draft = { ...d, categoryKey: key }
  for (const k of DEFAULT_KEYS) if (!touched.has(k)) Object.assign(next, { [k]: defaults[k] })
  return next
}

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const hm = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** Local date and time inputs to epoch ms, NaN when either is empty or malformed. */
export const toMs = (date: string, time: string) => (date && time ? new Date(`${date}T${time}`).getTime() : NaN)

export function draftOf(a: Activity): Draft {
  return {
    categoryKey: a.categoryKey,
    title: a.title,
    poster: a.poster,
    description: a.description,
    date: ymd(a.start),
    startT: hm(a.start),
    endT: hm(a.end),
    place: a.place,
    lat: a.lat,
    lng: a.lng,
    hours: String(a.hours),
    capLimit: a.capLimit,
    capacity: String(a.capacity > 0 ? a.capacity : 30),
    walkIn: a.walkIn,
    scheduled: !!a.opensAt,
    openDate: a.opensAt ? ymd(a.opensAt) : '',
    openT: a.opensAt ? hm(a.opensAt) : '',
    hideUntilOpen: !!a.hideUntilOpen,
    cancelDays: String(a.cancelDays ?? CANCEL_DAYS),
    qrMode: a.qrMode,
    qrInterval: a.qrInterval || QR_INTERVAL_DEFAULT,
    locMode: a.locMode === 'off' ? 'off' : 'on',
    radius: a.radius || RADIUS_DEFAULT,
    supName: a.supervisor.name,
    phone: a.supervisor.phone,
    chatEnabled: a.chatEnabled,
    openChatUrl: a.openChatUrl ?? '',
  }
}

export const STEP_COUNT = 7

export interface Check {
  /** The step can move on. */
  ok: boolean
  /** Messages by field, only for values that are wrong (an empty required field blocks without a message). */
  errors: Record<string, string>
}

const whole = (s: string) => /^\d+$/.test(s.trim())
const isUrl = (s: string) => {
  try {
    return /^https?:$/.test(new URL(s).protocol)
  } catch {
    return false
  }
}

/** Checks one step (1 to 7; step 7 checks all of them). */
export function check(step: number, d: Draft): Check {
  if (step === 7) {
    const all = [1, 2, 3, 4, 5, 6].map((s) => check(s, d))
    return { ok: all.every((c) => c.ok), errors: Object.assign({}, ...all.map((c) => c.errors)) }
  }
  const errors: Record<string, string> = {}
  let ok = true
  const need = (cond: boolean) => {
    if (!cond) ok = false
  }
  const bad = (field: string, msg: string) => {
    errors[field] = msg
    ok = false
  }

  if (step === 1) need(d.categoryKey !== null)
  if (step === 2) need(d.title.trim().length > 0)
  if (step === 3) {
    need(!!d.date && !!d.startT && !!d.endT && d.place.trim().length > 0)
    const s = toMs(d.date, d.startT)
    const e = toMs(d.date, d.endT)
    if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) bad('endT', 'เวลาจบต้องหลังเวลาเริ่ม')
  }
  if (step === 4) {
    if (!d.hours.trim()) need(false)
    else if (!whole(d.hours) || +d.hours < 1 || +d.hours > 99) bad('hours', 'ใส่ตัวเลข 1 ถึง 99')
    if (d.capLimit) {
      if (!d.capacity.trim()) need(false)
      else if (!whole(d.capacity) || +d.capacity < 1 || +d.capacity > 9999) bad('capacity', 'ใส่จำนวนคน 1 ถึง 9999')
    }
    if (d.scheduled) {
      const o = toMs(d.openDate, d.openT)
      if (Number.isNaN(o)) need(false)
      else if (o >= toMs(d.date, d.startT)) bad('openDate', 'เวลาเปิดรับต้องก่อนเวลาเริ่มกิจกรรม')
    }
    if (!whole(d.cancelDays) || +d.cancelDays > 14) bad('cancelDays', 'ใส่ตัวเลข 0 ถึง 14')
  }
  if (step === 6) {
    need(d.supName.trim().length > 0)
    if (d.chatEnabled && d.openChatUrl.trim() && !isUrl(d.openChatUrl.trim())) bad('openChatUrl', 'ลิงก์ต้องขึ้นต้นด้วย https://')
  }
  return { ok, errors }
}

/** First step that is not ready, or 7 when all are. */
export function firstBlocked(d: Draft): number {
  for (let s = 1; s <= 6; s++) if (!check(s, d).ok) return s
  return 7
}

/** The activity the draft describes, ready for createActivity. Call only when check(7) is ok. */
export function toNewActivity(d: Draft, who: { orgCode: string; orgName: string }): NewActivity {
  const open = d.scheduled ? toMs(d.openDate, d.openT) : undefined
  return {
    title: d.title.trim(),
    categoryKey: d.categoryKey ?? 'blood',
    org: who.orgName,
    orgCode: who.orgCode,
    poster: d.poster,
    description: d.description.trim(),
    place: d.place.trim(),
    lat: d.lat,
    lng: d.lng,
    start: toMs(d.date, d.startT),
    end: toMs(d.date, d.endT),
    hours: Number(d.hours),
    capLimit: d.capLimit,
    capacity: d.capLimit ? Number(d.capacity) : 0,
    walkIn: d.walkIn,
    qrMode: d.qrMode,
    locMode: d.locMode,
    radius: d.radius,
    qrInterval: d.qrInterval,
    supervisor: { name: d.supName.trim(), phone: d.phone.trim() },
    chatEnabled: d.chatEnabled,
    openChatUrl: d.chatEnabled && d.openChatUrl.trim() ? d.openChatUrl.trim() : undefined,
    opensAt: open,
    cancelDays: Number(d.cancelDays),
    hideUntilOpen: d.scheduled && d.hideUntilOpen ? true : undefined,
  }
}

/** Same as toNewActivity without the owner, for updateActivity. Cleared optional fields stay as undefined keys. */
export function toEdit(d: Draft): ActivityEdit {
  const { org, orgCode, ...rest } = toNewActivity(d, { orgCode: '', orgName: '' })
  void org
  void orgCode
  return rest
}

/** Whether the supervisor changed anything since the flow opened. */
export const isDirty = (d: Draft, initial: Draft) => JSON.stringify(d) !== JSON.stringify(initial)
